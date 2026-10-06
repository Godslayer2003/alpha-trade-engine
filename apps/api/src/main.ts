import './env';
import 'reflect-metadata';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const origins = (process.env.WEB_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('WEB_ORIGIN must list at least one trusted browser origin in production.');
  }
  app.enableCors(origins.length > 0 ? { origin: origins, credentials: true } : undefined);
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (process.env.NODE_ENV === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Cookie-authenticated state-changing requests must originate from the
    // configured web app. Bearer-token API clients are unaffected.
    const hasSessionCookie = request.headers.cookie?.includes('alpha_trade_session=');
    if (hasSessionCookie && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && origins.length > 0) {
      const origin = request.headers.origin;
      if (!origin || !origins.includes(origin)) {
        response.status(403).json({ message: 'Cross-site request rejected.' });
        return;
      }
    }
    next();
  });
  app.use(json({ limit: '15mb' }));
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Alpha-Trade API listening on http://localhost:${port}`);
}

bootstrap();
