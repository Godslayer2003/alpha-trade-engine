import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DealType } from '@alpha-trade/shared-types';
import { AppModule } from '../src/app.module';

// These are live integration tests: they call through to the ai-engine
// service (packages/ai-engine), which fetches real market data over the
// internet. Requires the ai-engine to be running on AI_ENGINE_URL (default
// http://localhost:8000) and outbound network access. Assertions check shape
// and plausible ranges rather than exact values, since real prices change.
describe('AnalysisController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/analysis/signal (POST) returns a real, disclaimed trade signal for a real equity', () => {
    return request(app.getHttpServer())
      .post('/api/v1/analysis/signal')
      .send({ symbol: 'QQQ', assetClass: 'EQUITY', timeframe: '1D' })
      .expect(201)
      .expect((res) => {
        expect(Object.values(DealType)).toContain(res.body.dealType);
        expect(res.body.entryPrice).toBeGreaterThan(0);
        expect(res.body.confidence).toBeGreaterThanOrEqual(0);
        expect(res.body.confidence).toBeLessThanOrEqual(1);
        expect(typeof res.body.dataSource).toBe('string');
        // Must always carry a disclaimer — a real computed signal is still not financial advice.
        expect(res.body.disclaimer.length).toBeGreaterThan(0);
      });
  }, 15000);

  it('/api/v1/analysis/signal (POST) rejects an invalid asset class', () => {
    return request(app.getHttpServer())
      .post('/api/v1/analysis/signal')
      .send({ symbol: 'QQQ', assetClass: 'NOT_A_CLASS', timeframe: '1D' })
      .expect(400);
  });

  it('/api/v1/market/candles (GET) returns real OHLCV data', () => {
    return request(app.getHttpServer())
      .get('/api/v1/market/candles')
      .query({ symbol: 'BTCUSDT', assetClass: 'CRYPTO', timeframe: '1D' })
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty('close');
      });
  }, 15000);
});
