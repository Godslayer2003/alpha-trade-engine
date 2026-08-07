import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('api/v1/assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto) {
    return this.assistantService.chat(dto.messages, dto.model, dto.context);
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
