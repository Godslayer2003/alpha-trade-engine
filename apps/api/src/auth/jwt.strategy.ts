import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
