import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AiEngineClient } from '../ai-engine/ai-engine-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessageDto } from './dto/chat.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { DEFAULT_KNOWLEDGE_BASE, DEFAULT_SYSTEM_PROMPT } from './assistant.defaults';

const CONFIG_ID = 'singleton';
const REQUEST_TIMEOUT_MS = 45_000;
const HISTORY_LIMIT = 6;
export const GEMINI_PROVIDER_ID = 'gemini';
const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';
// A provider selector rather than a model name: the concrete OpenAI model is
// owned by server configuration, so it can be changed without exposing a key
// or shipping billing-related choices to the browser.
export const OPENAI_MODEL_ID = 'openai';

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
  private readonly logger = new Logger(AssistantService.name);
  private gemini: GoogleGenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineClient,
  ) {}

  async getConfig() {
    return this.prisma.assistantConfig.upsert({
      where: { id: CONFIG_ID },
      update: {},
      create: { id: CONFIG_ID, systemPrompt: DEFAULT_SYSTEM_PROMPT, knowledgeBase: DEFAULT_KNOWLEDGE_BASE },
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

  async chat(
    messages: ChatMessageDto[],
    model?: string,
    context?: Record<string, unknown>,
  ): Promise<ChatResult> {
    const config = await this.getConfig();

    const contextNote = context
      ? `\n\nCurrent app state (for your reference, not necessarily to repeat verbatim):\n${JSON.stringify(context, null, 2)}`
      : '';

    const recent = messages.slice(-HISTORY_LIMIT - 1);
    const last = recent[recent.length - 1];
    const history = recent.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

    if (!model || model === GEMINI_PROVIDER_ID) {
      return this.chatWithGemini(last.content, history, config.systemPrompt + contextNote, config.knowledgeBase);
    }

    if (model === OPENAI_MODEL_ID) {
      return this.chatWithOpenAI(last.content, history, config.systemPrompt + contextNote, config.knowledgeBase);
    }

    throw new ServiceUnavailableException('The selected AI provider is not available. Choose Gemini or OpenAI.');
  }

  private async chatWithGemini(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    knowledgeBase: string,
  ): Promise<ChatResult> {
    const started = Date.now();
    const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
    try {
      const response = await this.getGeminiClient().models.generateContent({
        model,
        contents: [
          ...history.map((item) => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ],
        config: {
          systemInstruction:
            `${systemPrompt}\n\nApp knowledge base (use this for app-specific facts; do not invent missing details):\n${knowledgeBase}`,
          maxOutputTokens: 1024,
        },
      });
      const reply = response.text?.trim();
      if (!reply) throw new Error('Gemini returned no text.');
      return {
        reply,
        citations: [],
        model,
        inputTokens: 0,
        outputTokens: 0,
        responseTimeMs: Date.now() - started,
      };
    } catch (err) {
      this.logger.warn('Gemini AI Guide request failed.');
      throw new ServiceUnavailableException('Gemini AI Guide is temporarily unavailable. Please try again shortly.');
    }
  }

  private getGeminiClient(): GoogleGenAI {
    if (this.gemini) return this.gemini;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Gemini AI Guide is not configured on this server.');
    this.gemini = new GoogleGenAI({ apiKey });
    return this.gemini;
  }

  private async chatWithOpenAI(
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    knowledgeBase: string,
  ): Promise<ChatResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) {
      throw new ServiceUnavailableException('OpenAI is not configured on this server.');
    }

    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          store: false,
          instructions: `${systemPrompt}\n\nApp knowledge base (use this for app-specific facts; do not invent missing details):\n${knowledgeBase}`,
          input: [
            ...history.map((item) => ({ role: item.role, content: item.content })),
            { role: 'user', content: message },
          ],
          max_output_tokens: 1024,
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as {
        output_text?: string;
        error?: { message?: string };
        usage?: { input_tokens?: number; output_tokens?: number };
      } | null;

      if (!response.ok) {
        this.logger.warn(`OpenAI AI Guide request failed with status ${response.status}.`);
        throw new ServiceUnavailableException('OpenAI AI Guide is temporarily unavailable. Please try again shortly.');
      }
      const reply = body?.output_text?.trim();
      if (!reply) throw new Error('OpenAI returned no text.');
      return {
        reply,
        citations: [],
        model,
        inputTokens: body?.usage?.input_tokens ?? 0,
        outputTokens: body?.usage?.output_tokens ?? 0,
        responseTimeMs: Date.now() - started,
      };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.warn('OpenAI AI Guide request failed.');
      throw new ServiceUnavailableException('OpenAI AI Guide is temporarily unavailable. Please try again shortly.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async getChunks(chunkSize?: number) {
    const config = await this.getConfig();
    return this.aiEngine.post<{ index: number; text: string; tokens: number }[]>('/v1/assistant/chunks', {
      knowledge_base: config.knowledgeBase,
      chunk_size: chunkSize || undefined,
    }, REQUEST_TIMEOUT_MS);
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
}
