import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { InvestmentStyle } from '@alpha-trade/shared-types';
import { UpdateProfileDto } from '../profile/dto/update-profile.dto';
import { CreateStrategyDto } from '../strategy/dto/create-strategy.dto';
import { UpdateStrategyDto } from '../strategy/dto/update-strategy.dto';
import { UpdateConfigDto } from '../assistant/dto/update-config.dto';
import { ChatRequestDto } from '../assistant/dto/chat.dto';

describe('Persisted input limits', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const validate = (metatype: new () => object, value: object) =>
    pipe.transform(value, { type: 'body', metatype });

  it('accepts normal profile text without damaging punctuation or Unicode', async () => {
    const profile = { firstName: 'Zoë', investmentGoal: "Long-term savings & family’s future" };
    expect(await validate(UpdateProfileDto, profile)).toEqual(profile);
  });

  it('rejects oversized profile text even within the larger image request allowance', async () => {
    for (const [field, limit] of Object.entries({ investmentGoal: 2000, experienceLevel: 100, firstName: 100, lastName: 100 })) {
      await expect(validate(UpdateProfileDto, { [field]: 'x'.repeat(limit + 1) })).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(validate(UpdateProfileDto, { firstName: { injected: true } })).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate(UpdateProfileDto, { dailyReportChannels: ['EMAIL', 'EMAIL', 'EMAIL'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies strategy limits to both creation and updates', async () => {
    for (const dto of [CreateStrategyDto, UpdateStrategyDto]) {
      const base = { name: 'Practice strategy', style: Object.values(InvestmentStyle)[0] };
      expect(await validate(dto, { ...base, preferredTickers: ['QQQ'], notes: 'Paper trades only.' })).toMatchObject(base);
      for (const invalid of [
        { name: 'x'.repeat(81) }, { notes: 'x'.repeat(2001) },
        { preferredTickers: Array(51).fill('QQQ') },
        { preferredTickers: ['x'.repeat(65)] }, { preferredTickers: [''] },
        { preferredTickers: [123] },
      ]) {
        await expect(validate(dto, { ...base, ...invalid })).rejects.toBeInstanceOf(BadRequestException);
      }
    }
  });

  it('bounds AI configuration and accepts a Unicode knowledge base at the engine byte limit', async () => {
    expect(await validate(UpdateConfigDto, { systemPrompt: 'Help with paper trading.', knowledgeBase: '😀'.repeat(25000) })).toHaveProperty('knowledgeBase');
    for (const invalid of [{ systemPrompt: 'x'.repeat(8001) }, { knowledgeBase: '😀'.repeat(25001) }]) {
      await expect(validate(UpdateConfigDto, invalid)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('strips client-supplied ownership and privilege fields', async () => {
    expect(await validate(UpdateProfileDto, { firstName: 'Test', userId: 'another-user', role: 'ADMIN' })).toEqual({ firstName: 'Test' });
  });
  it('allows only bounded research fields in AI context', async () => {
    const result = await validate(ChatRequestDto, { messages: [{ role: 'user', content: 'Explain the app' }], context: { symbol: 'QQQ', assetClass: 'EQUITY', timeframe: '1D', portfolio: { cash: 10000 }, userId: 'private' } });
    expect(result.context).toEqual({ symbol: 'QQQ', assetClass: 'EQUITY', timeframe: '1D' });
    await expect(validate(ChatRequestDto, { messages: [{ role: 'user', content: 'Hi' }], context: { symbol: 'x'.repeat(65) } })).rejects.toThrow();
  });
});
