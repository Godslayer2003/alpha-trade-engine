import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Like JwtAuthGuard, but never rejects — anonymous requests (no/invalid
// token) get request.user = null instead of a 401. Used on the assistant
// chat route so the public dashboard chat keeps working while a signed-in
// user's token still resolves to a real userId (needed for workflow
// triggering, see AssistantService.chat()).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user || null) as TUser;
  }
}
