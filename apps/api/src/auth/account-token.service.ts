import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AccountTokenService {
  private readonly logger = new Logger(AccountTokenService.name);
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }

  private requireDelivery(): string {
    const origin = process.env.WEB_ORIGIN?.split(',')[0]?.trim();
    if (!origin || !process.env.EMAIL_FROM || !process.env.RESEND_API_KEY) {
      throw new ServiceUnavailableException('Account email delivery is not configured. Contact the site operator.');
    }
    return origin.replace(/\/$/, '');
  }

  async request(email: string, purpose: 'reset' | 'verify'): Promise<void> {
    const origin = this.requireDelivery();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || (purpose === 'verify' && user.emailVerifiedAt)) return;
    const token = randomBytes(32).toString('hex');
    await this.prisma.accountToken.create({ data: {
      id: this.hash(token), userId: user.id, purpose, expiresAt: new Date(Date.now() + 30 * 60_000),
    } });
    const title = purpose === 'reset' ? 'Reset your Alpha Trade password' : 'Verify your Alpha Trade email';
    // A fragment keeps the bearer secret out of HTTP access logs and Referer headers.
    const link = `${origin}/account-recovery#${purpose}=${token}`;
    try {
      await this.email.sendAccountEmail(user.email, title,
        `<p>${title} using the link below. It expires in 30 minutes and can only be used once.</p><p><a href="${link}">Continue securely</a></p><p>If you did not request this, ignore this email.</p>`);
    } catch {
      // Keep the public response identical for existing and unknown accounts.
      this.logger.warn('Account email delivery failed.');
    }
  }

  async consume(token: string, purpose: 'reset' | 'verify', password?: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException('Invalid or expired account link.');
    if (purpose === 'reset' && (!password || Buffer.byteLength(password, 'utf8') > 72)) {
      throw new BadRequestException('Password must be no more than 72 UTF-8 bytes.');
    }
    const passwordHash = purpose === 'reset' ? await bcrypt.hash(password!, 12) : undefined;
    await this.prisma.$transaction(async tx => {
      const record = await tx.accountToken.findUnique({ where: { id: this.hash(token) } });
      if (!record || record.purpose !== purpose || record.consumedAt || record.expiresAt <= new Date()) {
        throw new BadRequestException('Invalid or expired account link.');
      }
      const claimed = await tx.accountToken.updateMany({
        where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('Invalid or expired account link.');
      await tx.user.update({ where: { id: record.userId }, data: purpose === 'reset' ? { passwordHash } : { emailVerifiedAt: new Date() } });
      if (purpose === 'reset') {
        await tx.user.updateMany({ where: { id: record.userId, mfaEnabled: false }, data: { mfaSecret: null, mfaLastStep: -1 } });
        await tx.authSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.accountToken.updateMany({ where: { userId: record.userId, purpose: 'reset', consumedAt: null }, data: { consumedAt: new Date() } });
      }
    });
  }
}
