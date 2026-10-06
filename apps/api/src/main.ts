import './env';
import 'reflect-metadata';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { AppModule } from './app.module';
import { isAllowedSessionWrite } from './security/request-origin';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && Buffer.from(process.env.MFA_ENCRYPTION_KEY ?? '', 'base64').length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must encode 32 random bytes in production.');
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // No WEB_ORIGIN set (e.g. local dev) reflects any origin, same as before —
  // in production it's set to the real site so a browser on some other
  // domain can't call this API using a visitor's cookies/session.
  const origins = (process.env.WEB_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('WEB_ORIGIN must list at least one trusted browser origin in production.');
  }
  app.enableCors(origins.length > 0 ? { origin: origins } : undefined);
  app.use((request: Request, _: Response, next: NextFunction) => {
    if (!isAllowedSessionWrite(request, origins)) {
      return next(new ForbiddenException('Request origin is not allowed.'));
    }
    next();
  });
  app.use((_: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });
  // Express's default body-parser limit (100kb) would otherwise reject a
  // base64-encoded 10MB profile picture before it ever reaches validation.
  app.use('/api/v1/profile', json({ limit: '15mb' }));
  app.use(json({ limit: '100kb' }));
  // Without this, onModuleDestroy never fires on SIGTERM — during a rolling
  // deploy the old container's Telegram long-poll can stay open until
  // force-killed, guaranteeing a 409 conflict for the new container.
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Alpha-Trade API listening on http://localhost:${port}`);
}

bootstrap();
