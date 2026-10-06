import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecurityQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async consume(scope: string, identity: string, limit: number, windowMs: number): Promise<void> {
    const window = Math.floor(Date.now() / windowMs);
    const id = createHash('sha256').update(`${scope}:${identity}:${window}`).digest('hex');
    const expiresAt = new Date((window + 1) * windowMs);
    // Database increments are atomic across processes and survive service restarts.
    const bucket = await this.prisma.securityQuota.upsert({
      where: { id }, create: { id, count: 1, expiresAt }, update: { count: { increment: 1 } },
    });
    if (bucket.count > limit) throw new HttpException('Request limit reached. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    // Keep only active windows; identities are hashed and never stored in plaintext.
    await this.prisma.securityQuota.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } });
  }
}
