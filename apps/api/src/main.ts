import './env';
import 'reflect-metadata';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // No WEB_ORIGIN set (e.g. local dev) reflects any origin, same as before —
  // in production it's set to the real site so a browser on some other
  // domain can't call this API using a visitor's cookies/session.
  const origins = (process.env.WEB_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('WEB_ORIGIN must list at least one trusted browser origin in production.');
  }
  app.enableCors(origins.length > 0 ? { origin: origins } : undefined);
  app.use((_: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });
  // Express's default body-parser limit (100kb) would otherwise reject a
  // base64-encoded 10MB profile picture before it ever reaches validation.
  app.use(json({ limit: '15mb' }));
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
