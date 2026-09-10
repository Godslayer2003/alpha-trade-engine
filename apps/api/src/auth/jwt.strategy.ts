import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
