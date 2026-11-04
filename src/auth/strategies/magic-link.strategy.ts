import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MagicLinkStrategy extends PassportStrategy(
  Strategy,
  'magic-link',
) {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {
    super();
  }

  async validate(req: Request) {
    const token = req.query.token;
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    const email = await this.authService.verifyMagicLinkToken(token);
    return this.usersService.findOrCreateByEmail(email);
  }
}
