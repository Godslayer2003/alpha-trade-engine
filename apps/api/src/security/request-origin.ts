import type { Request } from 'express';

export function isAllowedSessionWrite(request: Pick<Request, 'method' | 'headers'>, trustedOrigins: string[]): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || trustedOrigins.length === 0) return true;
  const hasSessionCookie = request.headers.cookie
    ?.split(';')
    .some((part) => part.trim().startsWith('alpha_trade_session='));
  if (!hasSessionCookie) return true;
  return typeof request.headers.origin === 'string' && trustedOrigins.includes(request.headers.origin);
}
