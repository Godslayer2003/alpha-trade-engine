import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from './mfa.service';
import { AccountConfirmationDto } from './dto/account-management.dto';

@Injectable()
export class AccountManagementService {
  constructor(private readonly prisma: PrismaService, private readonly mfa: MfaService) {}
  private async confirm(userId: string, dto: AccountConfirmationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await bcrypt.compare(dto.password, user.passwordHash)) throw new UnauthorizedException('Password is incorrect.');
    if (user.mfaEnabled) {
      if (!user.mfaSecret || !dto.otp) throw new UnauthorizedException('Enter an authenticator or recovery code.');
      await this.mfa.verify(userId, user.mfaSecret, dto.otp);
    }
    return user;
  }

  async exportData(userId: string, dto: AccountConfirmationDto) {
    await this.confirm(userId, dto);
    // An explicit allowlist prevents credentials and security tokens entering downloads.
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: {
      id: true, email: true, createdAt: true, termsAcceptedAt: true, emailVerifiedAt: true,
      chatAccessPaid: true, stripePaymentIntentId: true, profile: true, strategies: true,
      portfolios: { include: { holdings: true, trades: true } }, savedAnalyses: true, recommendations: true,
      brokerAccounts: { select: { id: true, brokerName: true, isApiConnected: true, supportedStyles: true, createdAt: true } },
      telegramLink: { select: { chatId: true, linkedAt: true } },
      assistantFeedback: { select: { question: true, answer: true, rating: true, model: true, createdAt: true } },
    } });
  }

  async deleteAccount(userId: string, dto: AccountConfirmationDto) {
    const confirmed = await this.confirm(userId, dto);
    await this.prisma.$transaction(async tx => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current || current.passwordHash !== confirmed.passwordHash || current.mfaEnabled !== confirmed.mfaEnabled || current.mfaSecret !== confirmed.mfaSecret) {
        throw new UnauthorizedException('Account security changed. Try again.');
      }
      // Foreign keys cascade to profiles, uploads, sessions, tokens, portfolios and owned feedback.
      await tx.user.delete({ where: { id: userId } });
    }, { isolationLevel: 'Serializable' });
  }

  async removePicture(userId: string) {
    await this.prisma.userProfile.updateMany({ where: { userId }, data: { profilePictureUrl: null } });
  }
}
