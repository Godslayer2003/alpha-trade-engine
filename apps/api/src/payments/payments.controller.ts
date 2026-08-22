import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { PaymentsService } from './payments.service';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getStatus(user.userId);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Body('returnUrl') returnUrl: string) {
    return this.paymentsService.createCheckoutSession(user.userId, user.email, returnUrl);
  }

  @Get('verify')
  verify(@CurrentUser() user: AuthenticatedUser, @Query('session_id') sessionId: string) {
    return this.paymentsService.verifySession(user.userId, sessionId);
  }

  // Site-operator-only view, same gate as the assistant config/feedback routes.
  @Get('paid-users')
  @UseGuards(AdminGuard)
  paidUsers() {
    return this.paymentsService.listPaidUsers();
  }
}
