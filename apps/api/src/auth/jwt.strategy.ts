import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  sid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    // No silent fallback — a guessable default secret here would let anyone
    // forge a valid login token. JWT_SECRET is documented as required in
    // .env.example, so a missing one is a misconfiguration, not a valid state.
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set (check your .env file).');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookie = request.headers.cookie
            ?.split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith('alpha_trade_session='));
          if (!cookie) return null;
          try {
            return decodeURIComponent(cookie.slice('alpha_trade_session='.length));
          } catch {
            return null;
          }
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new UnauthorizedException();
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }
    return { userId: session.user.id, email: session.user.email, role: session.user.role,
      mfaVerified: session.mfaVerified, sessionId: session.id };
  }
}
