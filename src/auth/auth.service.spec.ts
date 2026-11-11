import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService magic link', () => {
  const config = {
    get: vi.fn().mockReturnValue('s3cret'),
    getOrThrow: vi.fn().mockReturnValue('http://localhost:3000/cb'),
  };
  const jwt = new JwtService({ secret: 's3cret' });
  const usedJtis = new Set<string>();
  const usedMagicLinkModel = {
    create: vi.fn(({ jti }: { jti: string; expiresAt: Date }) => {
      if (usedJtis.has(jti)) {
        return Promise.reject(Object.assign(new Error('dup'), { code: 11000 }));
      }
      usedJtis.add(jti);
      return Promise.resolve({});
    }),
  };
  const service = new AuthService(
    jwt,
    config as any,
    usedMagicLinkModel as any,
  );

  beforeEach(() => {
    usedJtis.clear();
    vi.clearAllMocks();
  });

  describe('verifyMagicLinkToken', () => {
    it('returns the lowercased email for a valid token', async () => {
      const token = service.generateMagicLinkToken(' A@B.com ');
      await expect(service.verifyMagicLinkToken(token)).resolves.toBe(
        'a@b.com',
      );
      const [record] = usedMagicLinkModel.create.mock.calls[0];
      expect(typeof record.jti).toBe('string');
      expect(record.expiresAt).toBeInstanceOf(Date);
    });

    it('rejects a link used a second time', async () => {
      const token = service.generateMagicLinkToken('a@b.com');
      await service.verifyMagicLinkToken(token);

      await expect(service.verifyMagicLinkToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('gives each link its own id', async () => {
      const first = service.generateMagicLinkToken('a@b.com');
      const second = service.generateMagicLinkToken('a@b.com');
      await service.verifyMagicLinkToken(first);

      await expect(service.verifyMagicLinkToken(second)).resolves.toBe(
        'a@b.com',
      );
    });

    it('rethrows unexpected database errors', async () => {
      usedMagicLinkModel.create.mockRejectedValueOnce(new Error('db down'));
      const token = service.generateMagicLinkToken('a@b.com');

      await expect(service.verifyMagicLinkToken(token)).rejects.toThrow(
        'db down',
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
      expect(usedMagicLinkModel.create).not.toHaveBeenCalled();
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

    it('opens the confirm page of an allowed preview origin', () => {
      const preview =
        'https://wind-tunnel-registry-frontend-git-x-blue-butterfly1.vercel.app';

      expect(service.buildMagicLink('abc', preview)).toBe(
        `${preview}/auth/magic-link?token=abc`,
      );
    });

    it.each([
      'https://evil.com',
      'https://wind-tunnel-registry-frontend.vercel.app.evil.com',
      undefined,
      42,
    ])('ignores an origin that is not allowed (%s)', (origin) => {
      expect(service.buildMagicLink('abc', origin)).toBe(
        'http://localhost:3000/cb?token=abc',
      );
    });
  });
});
