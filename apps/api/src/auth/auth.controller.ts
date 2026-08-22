import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// Tighter than the app-wide default (see ThrottlerModule.forRoot in
// app.module.ts) — these two are the actual brute-force targets.
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
