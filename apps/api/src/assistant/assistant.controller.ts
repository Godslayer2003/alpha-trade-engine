import { Body, Controller, ForbiddenException, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PaymentsService } from '../payments/payments.service';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('api/v1/assistant')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // Login is required so the $5 paywall below actually means something —
  // anonymous chat used to be allowed, but that let anyone dodge payment by
  // just logging out. Tighter throttle than the app-wide default — every
  // call here spends real OpenRouter/Gemini budget.
  @Post('chat')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatRequestDto, @CurrentUser() user: AuthenticatedUser) {
    const { paid } = await this.paymentsService.getStatus(user.userId);
    if (!paid) {
      throw new ForbiddenException('AI Guide chat access requires a one-time $5 payment.');
    }
    return this.assistantService.chat(dto.messages, dto.model, dto.context, user.userId);
  }

  @Post('feedback')
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    return this.assistantService.createFeedback(dto);
  }

  // Config editing, the chunk breakdown, and the eval results are all
  // "site operator" views rather than end-user chat — gated the same way
  // the rest of Settings is.
  @Get('config')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getConfig() {
    return this.assistantService.getConfig();
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateConfig(@Body() dto: UpdateConfigDto) {
    return this.assistantService.updateConfig(dto);
  }

  @Get('chunks')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getChunks(@Query('chunkSize') chunkSize?: string) {
    return this.assistantService.getChunks(chunkSize ? Number(chunkSize) : undefined);
  }

  @Get('feedback')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listFeedback() {
    return this.assistantService.listFeedback();
  }
}
