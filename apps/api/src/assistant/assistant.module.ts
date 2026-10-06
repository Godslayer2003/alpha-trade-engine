import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [PaymentsModule, AuthModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
