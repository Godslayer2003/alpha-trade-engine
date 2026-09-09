import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetClass } from '@alpha-trade/shared-types';
import { NotificationsService } from '../notifications/notifications.service';
import { MoversService } from '../movers/movers.service';
import { AnalysisService } from '../analysis/analysis.service';
import { RunWorkflowDto } from './dto/run-workflow.dto';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
}

// Single source of truth for what a workflow is, used both by the Workflows
// dashboard/API and by the agentic chatbot's intent classifier — add new
// runnable workflows here and in run() below.
export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  {
    id: 'daily-briefing',
    name: 'Daily Portfolio Briefing',
    description:
      'Sends the current portfolio value, performance, and best/worst trade via the user\'s configured Telegram/Email channels.',
  },
  {
    id: 'unusual-movers',
    name: 'Unusual Movers Alert',
    description: 'Scans the market watchlist for statistically unusual moves and sends the current results to your enabled channels.',
  },
  {
    id: 'signal-check',
    name: 'Signal Check on Demand',
    description: 'Builds a current daily technical signal for a ticker and sends the result to your enabled channels.',
  },
];

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly moversService: MoversService,
    private readonly analysisService: AnalysisService,
  ) {}

  listWorkflows(): WorkflowDefinition[] {
    return WORKFLOW_REGISTRY;
  }

  async run(workflowId: string, userId: string, input: RunWorkflowDto = {}): Promise<{ sent: string[]; errors: string[] }> {
    if (workflowId === 'daily-briefing') return this.notificationsService.runBriefingForUser(userId);

    if (workflowId === 'unusual-movers') {
      const movers = await this.moversService.getOrScan();
      const lines = ['Unusual Movers Alert', ''];
      if (movers.length === 0) lines.push('No symbols in the current watchlist cleared the unusual-move threshold today.');
      else {
        lines.push(...movers.map((m) => `${m.symbol}: ${m.pctChange >= 0 ? '+' : ''}${m.pctChange.toFixed(2)}% (z-score ${m.zScore.toFixed(2)})`));
      }
      lines.push('', 'Market data is delayed and this is not financial advice.');
      return this.notificationsService.sendWorkflowMessage(userId, 'Alpha-Trade: Unusual Movers', lines.join('\n'));
    }

    if (workflowId === 'signal-check') {
      const symbol = input.symbol?.trim().toUpperCase();
      if (!symbol) throw new BadRequestException('Enter a stock or ETF ticker before running Signal Check.');
      const signal = await this.analysisService.getTradeSignal({ symbol, assetClass: AssetClass.EQUITY, timeframe: '1D' });
      const lines = [
        `${symbol} Signal Check`,
        '',
        `${signal.patternDetected} (${signal.dealType})`,
        `Entry ${signal.entryPrice}${signal.stopLoss !== null ? ` · Stop ${signal.stopLoss}` : ''}${signal.targetPrice !== null ? ` · Target ${signal.targetPrice}` : ''}`,
        `Confidence ${Math.round(signal.confidence * 100)}%`,
        '',
        signal.disclaimer,
      ];
      return this.notificationsService.sendWorkflowMessage(userId, `Alpha-Trade: ${symbol} Signal Check`, lines.join('\n'));
    }

    throw new NotFoundException(`Unknown workflow "${workflowId}".`);
  }
}
