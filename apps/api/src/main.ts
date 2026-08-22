import 'reflect-metadata';
import { json } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // No WEB_ORIGIN set (e.g. local dev) reflects any origin, same as before —
  // in production it's set to the real site so a browser on some other
  // domain can't call this API using a visitor's cookies/session.
  const webOrigin = process.env.WEB_ORIGIN;
  app.enableCors(webOrigin ? { origin: webOrigin.split(',').map((o) => o.trim()) } : undefined);
  // Express's default body-parser limit (100kb) would otherwise reject a
  // base64-encoded 10MB profile picture before it ever reaches validation.
  app.use(json({ limit: '15mb' }));
  // Without this, onModuleDestroy never fires on SIGTERM — on every Railway
  // rolling deploy the old container's Telegram long-poll stays open until
  // force-killed, guaranteeing a 409 conflict for the new container.
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Alpha-Trade API listening on http://localhost:${port}`);
}

bootstrap();
