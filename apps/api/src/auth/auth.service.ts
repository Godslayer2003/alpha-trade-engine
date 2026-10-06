import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { STARTING_CASH_BALANCE } from '../common/constants';
import { MfaService } from './mfa.service';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mfa: MfaService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be no more than 72 UTF-8 bytes.');
    }
    const reservedAdminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    // Legacy operator addresses remain reserved, but never grant a role.
    if (reservedAdminEmails.includes(dto.email.toLowerCase())) {
      throw new ForbiddenException('This account cannot be created through public registration.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        termsAcceptedAt: new Date(),
        portfolios: {
          create: {
            name: 'Practice Portfolio',
            cashBalance: STARTING_CASH_BALANCE,
            totalValue: STARTING_CASH_BALANCE,
          },
        },
      },
    });

    return this.buildAuthResult(user.id, user.email, user.passwordHash, false);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.mfaEnabled) {
      if (!user.mfaSecret || !dto.otp) throw new UnauthorizedException('Enter your authenticator or recovery code.');
      await this.mfa.verify(user.id, user.mfaSecret, dto.otp);
    }
    return this.buildAuthResult(user.id, user.email, user.passwordHash, user.mfaEnabled);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null }, data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new BadRequestException('Password must be no more than 72 UTF-8 bytes.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  private async buildAuthResult(userId: string, email: string, passwordHash: string, mfaVerified: boolean): Promise<AuthResult> {
    const session = await this.prisma.$transaction(async tx => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current || current.passwordHash !== passwordHash || current.mfaEnabled !== mfaVerified) {
        throw new UnauthorizedException('Account security changed. Sign in again.');
      }
      return tx.authSession.create({
        data: { userId, mfaVerified, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
    }, { isolationLevel: 'Serializable' });
    const accessToken = this.jwtService.sign({ sub: userId, email, sid: session.id });
    return { accessToken, user: { id: userId, email } };
  }
}
