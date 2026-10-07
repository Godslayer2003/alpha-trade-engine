import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PaymentsService } from './payments.service';
import { VerifySessionDto } from './dto/verify-session.dto';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getStatus(user.userId);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.createCheckoutSession(user.userId, user.email);
  }

  @Get('verify')
  verify(@CurrentUser() user: AuthenticatedUser, @Query() query: VerifySessionDto) {
    return this.paymentsService.verifySession(user.userId, query.session_id);
  }

  // Site-operator-only view, same gate as the assistant config/feedback routes.
  @Get('paid-users')
  @UseGuards(AdminGuard)
  paidUsers() {
    return this.paymentsService.listPaidUsers();
  }
}
