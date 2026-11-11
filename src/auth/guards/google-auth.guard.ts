import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { isAllowedOrigin } from '../utils/frontend-origin';

/**
 * Google login that remembers which frontend started it (production, a Vercel
 * preview or localhost). The origin travels through Google in the OAuth
 * `state` parameter and is checked again, against the allowlist, when Google
 * calls back.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const redirect = req.query.redirect;

    return typeof redirect === 'string' && isAllowedOrigin(redirect)
      ? { state: redirect }
      : {};
  }
}
