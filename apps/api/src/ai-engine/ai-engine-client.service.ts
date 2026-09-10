import { HttpException, Injectable } from '@nestjs/common';

const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class AiEngineClient {
  private readonly baseUrl = (process.env.AI_ENGINE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
  private readonly sharedSecret = process.env.AI_ENGINE_SHARED_SECRET;

  get<T>(path: string, params: Record<string, string>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    return this.request<T>(`${path}?${new URLSearchParams(params)}`, { method: 'GET' }, timeoutMs);
  }

  post<T>(path: string, payload: Record<string, unknown>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    const body = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    return this.request<T>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  }

  private async request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          ...(this.sharedSecret ? { 'x-internal-secret': this.sharedSecret } : {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new HttpException(`Could not reach the AI analysis service: ${(error as Error).message}`, 502);
    } finally {
      clearTimeout(timeout);
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = (body && (body as { detail?: string }).detail) || `status ${response.status}`;
      throw new HttpException(detail, response.status);
    }
    return body as T;
  }
}
