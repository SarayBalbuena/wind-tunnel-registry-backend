import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from '../users/schemas/user.schema';

const MAGIC_LINK_AUDIENCE = 'magic-link';
const MAGIC_LINK_TTL = '15m';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateToken(user: UserDocument): string {
    const payload = {
      email: user.email,
      sub: user._id.toString(),
    };
    return this.jwtService.sign(payload);
  }

  generateMagicLinkToken(email: string): string {
    return this.jwtService.sign(
      { email: email.trim().toLowerCase() },
      {
        secret: this.magicLinkSecret(),
        audience: MAGIC_LINK_AUDIENCE,
        expiresIn: MAGIC_LINK_TTL,
      },
    );
  }

  async verifyMagicLinkToken(token: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<{ email?: string }>(
        token,
        { secret: this.magicLinkSecret(), audience: MAGIC_LINK_AUDIENCE },
      );
      if (!payload.email) throw new Error('missing email');
      return payload.email;
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  buildMagicLink(token: string): string {
    const base = this.configService.getOrThrow<string>(
      'MAGIC_LINK_CALLBACK_URL',
    );
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  }

  // Distinct from the session secret so a magic-link token can never be used as an access_token.
  private magicLinkSecret(): string {
    return `${this.configService.get<string>('JWT_SECRET') || 'secret'}:magic-link`;
  }
}
