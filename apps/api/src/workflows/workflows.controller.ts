import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { RunWorkflowDto } from './dto/run-workflow.dto';

@Controller('api/v1/workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  list() {
    return this.workflowsService.listWorkflows();
  }

  @Post(':id/run')
  run(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() input: RunWorkflowDto) {
    return this.workflowsService.run(id, user.userId, input);
  }
}
