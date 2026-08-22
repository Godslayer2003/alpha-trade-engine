import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('api/v1/assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  // Optional auth: anonymous dashboard chat must keep working, but a
  // signed-in user's resolved userId lets the agentic chatbot trigger
  // workflows (e.g. "run my daily briefing") — see AssistantService.chat().
  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: AuthenticatedUser | null) {
    return this.assistantService.chat(dto.messages, dto.model, dto.context, user?.userId);
  }

  @Post('feedback')
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    return this.assistantService.createFeedback(dto);
  }

  // Config editing, the chunk breakdown, and the eval results are all
  // "site operator" views rather than end-user chat — gated the same way
  // the rest of Settings is.
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    return this.assistantService.getConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard)
  async updateConfig(@Body() dto: UpdateConfigDto) {
    return this.assistantService.updateConfig(dto);
  }

  @Get('chunks')
  @UseGuards(JwtAuthGuard)
  async getChunks(@Query('chunkSize') chunkSize?: string) {
    return this.assistantService.getChunks(chunkSize ? Number(chunkSize) : undefined);
  }

  @Get('feedback')
  @UseGuards(JwtAuthGuard)
  async listFeedback() {
    return this.assistantService.listFeedback();
  }
}
