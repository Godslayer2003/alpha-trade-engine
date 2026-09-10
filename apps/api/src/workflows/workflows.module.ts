import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MoversModule } from '../movers/movers.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
@Module({
  imports: [NotificationsModule, MoversModule, AnalysisModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
