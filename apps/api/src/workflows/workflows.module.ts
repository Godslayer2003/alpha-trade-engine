import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WORKFLOWS_SERVICE } from './workflows.tokens';

// Deliberately NOT imported by AssistantModule (would close a
// AssistantModule -> WorkflowsModule -> NotificationsModule -> TelegramModule
// -> AssistantModule cycle, since TelegramModule already imports
// AssistantModule for /ask). AssistantService resolves WorkflowsService
// lazily via ModuleRef instead — see assistant.service.ts and
// workflows.tokens.ts.
@Module({
  imports: [NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, { provide: WORKFLOWS_SERVICE, useExisting: WorkflowsService }],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
