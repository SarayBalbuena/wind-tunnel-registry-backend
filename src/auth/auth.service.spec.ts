import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService magic link', () => {
  const config = {
    get: vi.fn().mockReturnValue('s3cret'),
    getOrThrow: vi.fn().mockReturnValue('http://localhost:3000/cb'),
  };
  const jwt = new JwtService({ secret: 's3cret' });
  const service = new AuthService(jwt, config as any);

  describe('verifyMagicLinkToken', () => {
    it('returns the lowercased email for a valid token', async () => {
      const token = service.generateMagicLinkToken(' A@B.com ');
      await expect(service.verifyMagicLinkToken(token)).resolves.toBe(
        'a@b.com',
      );
    });

    it('rejects a session token used as a magic link', async () => {
      const session = service.generateToken({
        _id: { toString: () => 'u1' },
        email: 'a@b.com',
      } as any);
      await expect(service.verifyMagicLinkToken(session)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects garbage', async () => {
      await expect(service.verifyMagicLinkToken('nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('buildMagicLink', () => {
    it('appends the token to the callback url', () => {
      expect(service.buildMagicLink('abc')).toBe(
        'http://localhost:3000/cb?token=abc',
      );
    });
  });
});
