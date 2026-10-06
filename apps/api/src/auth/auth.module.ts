import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SecurityQuotaService } from './security-quota.service';
import { MfaService } from './mfa.service';
import { AccountTokenService } from './account-token.service';
import { EmailModule } from '../email/email.module';
import { AccountManagementController } from './account-management.controller';
import { AccountManagementService } from './account-management.service';
import { RetentionService } from './retention.service';

@Module({
  imports: [
    PassportModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, AccountManagementController],
  providers: [AuthService, JwtStrategy, SecurityQuotaService, MfaService, AccountTokenService, AccountManagementService, RetentionService],
  exports: [JwtModule, SecurityQuotaService],
})
export class AuthModule {}
