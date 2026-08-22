import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

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
];

@Injectable()
export class WorkflowsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  listWorkflows(): WorkflowDefinition[] {
    return WORKFLOW_REGISTRY;
  }

  async run(workflowId: string, userId: string): Promise<{ sent: string[]; errors: string[] }> {
    if (workflowId !== 'daily-briefing') {
      throw new NotFoundException(`Unknown workflow "${workflowId}".`);
    }
    return this.notificationsService.runBriefingForUser(userId);
  }
}
