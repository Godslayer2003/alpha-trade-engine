import { Body, Controller, Post } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';

@Controller('api/v1/assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto) {
    const reply = await this.assistantService.chat(dto.messages, dto.context);
    return { reply };
  }
}
