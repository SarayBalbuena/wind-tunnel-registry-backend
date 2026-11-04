import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import {
  UsedMagicLink,
  UsedMagicLinkDocument,
} from './schemas/used-magic-link.schema';

const MAGIC_LINK_AUDIENCE = 'magic-link';
const MAGIC_LINK_TTL = '15m';
const DUPLICATE_KEY_ERROR = 11000;

interface MagicLinkPayload {
  email?: string;
  jti?: string;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(UsedMagicLink.name)
    private usedMagicLinkModel: Model<UsedMagicLinkDocument>,
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
        jwtid: randomUUID(),
      },
    );
  }

  /** Verifies the token and marks it as used. A token is accepted only once. */
  async verifyMagicLinkToken(token: string): Promise<string> {
    const payload = await this.decodeMagicLinkToken(token);

    try {
      await this.usedMagicLinkModel.create({
        jti: payload.jti,
        expiresAt: new Date(payload.exp * 1000),
      });
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY_ERROR) {
        throw new UnauthorizedException('Invalid or expired magic link');
      }
      throw error;
    }

    return payload.email;
  }

  buildMagicLink(token: string): string {
    const base = this.configService.getOrThrow<string>(
      'MAGIC_LINK_CALLBACK_URL',
    );
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async decodeMagicLinkToken(
    token: string,
  ): Promise<Required<MagicLinkPayload>> {
    let payload: MagicLinkPayload;
    try {
      payload = await this.jwtService.verifyAsync<MagicLinkPayload>(token, {
        secret: this.magicLinkSecret(),
        audience: MAGIC_LINK_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    if (!payload.email || !payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }
    return payload as Required<MagicLinkPayload>;
  }

  // Distinct from the session secret so a magic-link token can never be used as an access_token.
  private magicLinkSecret(): string {
    return `${this.configService.get<string>('JWT_SECRET') || 'secret'}:magic-link`;
  }
}
