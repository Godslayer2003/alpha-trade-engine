import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessageDto } from './dto/chat.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { DEFAULT_KNOWLEDGE_BASE, DEFAULT_SYSTEM_PROMPT } from './assistant.defaults';

const CONFIG_ID = 'singleton';
// Free-tier reasoning models (e.g. deepseek-r1:free) can genuinely take
// 30s+ to respond even when everything is warm — longer than the old 30s
// budget, which caused false-negative timeouts on real, in-flight replies.
const REQUEST_TIMEOUT_MS = 45_000;
const HISTORY_LIMIT = 6;

export interface ChatResult {
  reply: string;
  citations: { index: number; chunkText: string; similarity: number }[];
  model: string;
  inputTokens: number;
  outputTokens: number;
  responseTimeMs: number;
}

@Injectable()
export class AssistantService {
  private readonly aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const existing = await this.prisma.assistantConfig.findUnique({ where: { id: CONFIG_ID } });
    if (existing) return existing;

    // Materialize the defaults on first read so the Settings page always has
    // something to show and edit, and later reads/writes are plain upserts.
    return this.prisma.assistantConfig.create({
      data: { id: CONFIG_ID, systemPrompt: DEFAULT_SYSTEM_PROMPT, knowledgeBase: DEFAULT_KNOWLEDGE_BASE },
    });
  }

  async updateConfig(dto: UpdateConfigDto) {
    const current = await this.getConfig();
    return this.prisma.assistantConfig.update({
      where: { id: CONFIG_ID },
      data: {
        systemPrompt: dto.systemPrompt ?? current.systemPrompt,
        knowledgeBase: dto.knowledgeBase ?? current.knowledgeBase,
      },
    });
  }

  async chat(messages: ChatMessageDto[], model?: string, context?: Record<string, unknown>): Promise<ChatResult> {
    const config = await this.getConfig();

    const contextNote = context
      ? `\n\nCurrent app state (for your reference, not necessarily to repeat verbatim):\n${JSON.stringify(context, null, 2)}`
      : '';

    const recent = messages.slice(-HISTORY_LIMIT - 1);
    const last = recent[recent.length - 1];
    const history = recent.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

    const body = await this.fetchJson<{
      reply: string;
      citations: { index: number; chunk_text: string; similarity: number }[];
      model: string;
      input_tokens: number;
      output_tokens: number;
      response_time_ms: number;
    }>('/v1/assistant/chat', {
      message: last.content,
      history,
      model: model || undefined,
      system_prompt: config.systemPrompt + contextNote,
      knowledge_base: config.knowledgeBase,
    });

    return {
      reply: body.reply,
      citations: body.citations.map((c) => ({ index: c.index, chunkText: c.chunk_text, similarity: c.similarity })),
      model: body.model,
      inputTokens: body.input_tokens,
      outputTokens: body.output_tokens,
      responseTimeMs: body.response_time_ms,
    };
  }

  async getChunks(chunkSize?: number) {
    const config = await this.getConfig();
    return this.fetchJson<{ index: number; text: string; tokens: number }[]>('/v1/assistant/chunks', {
      knowledge_base: config.knowledgeBase,
      chunk_size: chunkSize || undefined,
    });
  }

  async createFeedback(dto: CreateFeedbackDto) {
    return this.prisma.assistantFeedback.create({ data: dto });
  }

  async listFeedback() {
    const rows = await this.prisma.assistantFeedback.findMany({ orderBy: { createdAt: 'desc' } });
    const up = rows.filter((r) => r.rating === 'UP').length;
    const down = rows.filter((r) => r.rating === 'DOWN').length;
    const total = up + down;
    return {
      rows,
      stats: { up, down, total, positivePct: total > 0 ? Math.round((up / total) * 1000) / 10 : 0 },
    };
  }

  private async fetchJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Strip undefined so FastAPI's model defaults (e.g. default model,
    // default chunk size) kick in rather than a JSON `null` colliding with them.
    const body = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));

    let res: Response;
    try {
      res = await fetch(`${this.aiEngineUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new HttpException(
        `Could not reach the AI engine at ${this.aiEngineUrl}: ${(err as Error).message}`,
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = (json && (json as { detail?: string }).detail) || `status ${res.status}`;
      throw new HttpException(detail, res.status);
    }

    return json as T;
  }
}
