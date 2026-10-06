import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RetentionService {
  constructor(private readonly prisma: PrismaService) {}
  @Cron('0 3 * * *')
  async purgeExpired() {
    const expired = new Date(Date.now() - 86_400_000);
    const feedback = new Date(Date.now() - 30 * 86_400_000);
    await this.prisma.$transaction([
      this.prisma.authSession.deleteMany({ where: { expiresAt: { lt: expired } } }),
      this.prisma.accountToken.deleteMany({ where: { expiresAt: { lt: expired } } }),
      this.prisma.securityQuota.deleteMany({ where: { expiresAt: { lt: expired } } }),
      this.prisma.assistantFeedback.deleteMany({ where: { createdAt: { lt: feedback } } }),
    ]);
  }
}
