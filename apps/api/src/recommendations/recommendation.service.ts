import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetClass, InvestmentStyle, RiskTolerance } from '@alpha-trade/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { SectorsService } from '../sectors/sectors.service';
import { AnalysisService } from '../analysis/analysis.service';

const CANDIDATE_COUNT = 5;

// Deterministic risk × horizon → style mapping. Recommendation ticker/entry/stop/target
// numbers all flow from this style through the existing rules-based sector matrix and
// TA signal engine — never from an LLM.
function mapToStyle(riskTolerance: RiskTolerance, timeHorizonYears: number): InvestmentStyle {
  if (timeHorizonYears >= 5) return InvestmentStyle.LONG_TERM_HOLD;
  if (timeHorizonYears >= 1) {
    return riskTolerance === RiskTolerance.CONSERVATIVE
      ? InvestmentStyle.WEEKEND_POSITIONING
      : InvestmentStyle.SWING_TRADING;
  }
  if (riskTolerance === RiskTolerance.CONSERVATIVE) return InvestmentStyle.OPTIONS_INCOME;
  if (riskTolerance === RiskTolerance.AGGRESSIVE) return InvestmentStyle.DAY_TRADING;
  return InvestmentStyle.SWING_TRADING;
}

const STYLE_TIMEFRAME: Record<InvestmentStyle, string> = {
  [InvestmentStyle.DAY_TRADING]: '1D',
  [InvestmentStyle.SWING_TRADING]: '1D',
  [InvestmentStyle.WEEKEND_POSITIONING]: '1W',
  [InvestmentStyle.OPTIONS_INCOME]: '1M',
  [InvestmentStyle.LONG_TERM_HOLD]: '1Y',
};

const STYLE_LABEL: Record<InvestmentStyle, string> = {
  [InvestmentStyle.DAY_TRADING]: 'day trading',
  [InvestmentStyle.SWING_TRADING]: 'swing trading',
  [InvestmentStyle.WEEKEND_POSITIONING]: 'weekend positioning',
  [InvestmentStyle.OPTIONS_INCOME]: 'options income',
  [InvestmentStyle.LONG_TERM_HOLD]: 'long-term holding',
};

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly sectorsService: SectorsService,
    private readonly analysisService: AnalysisService,
  ) {}

  list(userId: string) {
    return this.prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generate(userId: string) {
    const profile = await this.profileService.getProfile(userId);
    if (!this.profileService.isComplete(profile)) {
      throw new BadRequestException(
        'Complete the risk questionnaire first so recommendations can be tailored to you.',
      );
    }

    const style = mapToStyle(profile!.riskTolerance as unknown as RiskTolerance, profile!.timeHorizonYears!);
    const timeframe = STYLE_TIMEFRAME[style];
    const candidates = this.sectorsService.recommendAcrossSectors(style, CANDIDATE_COUNT);

    const results = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const signal = await this.analysisService.getTradeSignal({
          symbol: candidate.ticker,
          assetClass: AssetClass.EQUITY,
          timeframe,
        });

        const justification =
          `${candidate.reason} Current technical read: ${signal.patternDetected} ` +
          `(${signal.dealType.toLowerCase()}, ${Math.round(signal.confidence * 100)}% confidence). ` +
          `Matched to your ${profile!.riskTolerance.toLowerCase()} risk profile and ` +
          `~${profile!.timeHorizonYears}-year horizon via a ${STYLE_LABEL[style]} approach.`;

        return this.prisma.recommendation.create({
          data: {
            userId,
            ticker: candidate.ticker,
            assetClass: AssetClass.EQUITY,
            dealType: signal.dealType,
            horizonStyle: style,
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            targetPrice: signal.targetPrice,
            justification,
          },
        });
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof this.prisma.recommendation.create>>> => r.status === 'fulfilled')
      .map((r) => r.value);
  }
}
