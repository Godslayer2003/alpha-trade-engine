import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DealType } from '@alpha-trade/shared-types';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AiEngineClient } from '../src/ai-engine/ai-engine-client.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TelegramService } from '../src/telegram/telegram.service';

const candle = {
  time: '2026-09-09T00:00:00.000Z',
  open: 100,
  high: 105,
  low: 99,
  close: 104,
  volume: 1_000,
};

describe('market and analysis API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const aiEngine = {
      get: jest.fn().mockResolvedValue([candle]),
      post: jest.fn().mockResolvedValue({
        pattern_detected: 'Bullish trend',
        deal_type: DealType.LONG,
        entry_price: 104,
        stop_loss: 99,
        target_price: 114,
        confidence: 0.8,
        risk_reward_ratio: 2,
        data_source: 'test-fixture',
        disclaimer: 'Not financial advice.',
        generated_at: '2026-09-09T00:00:00.000Z',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiEngineClient)
      .useValue(aiEngine)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(TelegramService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a mapped, disclaimed trade signal', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analysis/signal')
      .send({ symbol: 'QQQ', assetClass: 'EQUITY', timeframe: '1D' })
      .expect(201);

    expect(response.body.dealType).toBe(DealType.LONG);
    expect(response.body.entryPrice).toBe(104);
    expect(response.body.disclaimer).toBe('Not financial advice.');
  });

  it('rejects an invalid asset class before reaching an upstream service', () =>
    request(app.getHttpServer())
      .post('/api/v1/analysis/signal')
      .send({ symbol: 'QQQ', assetClass: 'NOT_A_CLASS', timeframe: '1D' })
      .expect(400));

  it('rejects an unsupported timeframe before reaching an upstream service', () =>
    request(app.getHttpServer())
      .get('/api/v1/market/candles')
      .query({ symbol: 'BTCUSDT', assetClass: 'CRYPTO', timeframe: '2D' })
      .expect(400));

  it('returns OHLCV candles', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/market/candles')
      .query({ symbol: 'BTCUSDT', assetClass: 'CRYPTO', timeframe: '1D' })
      .expect(200);

    expect(response.body).toEqual([candle]);
  });
});
