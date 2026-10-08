import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  private otp(): typeof import('otplib') { return require('otplib'); }

  private key(): Buffer {
    if (process.env.MFA_ENCRYPTION_KEY) {
      const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'base64');
      if (key.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must encode 32 random bytes.');
      return key;
    }
    if (process.env.NODE_ENV === 'production') throw new Error('MFA_ENCRYPTION_KEY is required in production.');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
    return createHash('sha256').update(`alpha-trade-mfa-v1:${process.env.JWT_SECRET}`).digest();
  }

  private encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
  }

  private decrypt(encoded: string): string {
    const data = Buffer.from(encoded, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
  }

  async begin(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException('Password is incorrect.');
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled.');
    const secret = this.otp().generateSecret();
    const updated = await this.prisma.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash, mfaEnabled: false },
      data: { mfaSecret: this.encrypt(secret), mfaLastStep: -1 } });
    if (updated.count !== 1) throw new BadRequestException('MFA is already enabled.');
    return { secret, uri: this.otp().generateURI({ issuer: 'Alpha Trade', label: user.email, secret }) };
  }

  async confirm(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled || !user.mfaSecret) throw new BadRequestException('Start MFA enrollment first.');
    await this.verify(userId, user.mfaSecret, token, false);
    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(16).toString('hex'));
    await this.prisma.$transaction(async tx => {
      const updated = await tx.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash, mfaEnabled: false, mfaSecret: user.mfaSecret }, data: {
        mfaEnabled: true, mfaRecoveryHashes: recoveryCodes.map(code => this.hashRecovery(code)),
      } });
      if (updated.count !== 1) throw new BadRequestException('Enrollment changed. Start again.');
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { recoveryCodes };
  }

  private hashRecovery(code: string) { return createHash('sha256').update(code).digest('hex'); }

  async verify(userId: string, encryptedSecret: string, token: string, allowRecovery = true): Promise<void> {
    if (allowRecovery && /^[a-f0-9]{32}$/.test(token)) {
      const hash = this.hashRecovery(token);
      // Row locking consumes a recovery code exactly once, including concurrent requests.
      const used = await this.prisma.$executeRaw`
        UPDATE "User" SET "mfaRecoveryHashes" = array_remove("mfaRecoveryHashes", ${hash})
        WHERE "id" = ${userId} AND ${hash} = ANY("mfaRecoveryHashes")`;
      if (used === 1) return;
      throw new UnauthorizedException('Invalid authentication code.');
    }
    if (!/^\d{6}$/.test(token)) throw new UnauthorizedException('Enter an authenticator code or recovery code.');
    const result = await this.otp().verify({ secret: this.decrypt(encryptedSecret), token, epochTolerance: 30 });
    if (!result.valid || !('timeStep' in result)) throw new UnauthorizedException('Invalid authentication code.');
    const used = await this.prisma.user.updateMany({
      where: { id: userId, mfaSecret: encryptedSecret, mfaLastStep: { lt: result.timeStep } }, data: { mfaLastStep: result.timeStep },
    });
    if (used.count !== 1) throw new UnauthorizedException('Authentication code was already used. Wait for the next code.');
  }
}
