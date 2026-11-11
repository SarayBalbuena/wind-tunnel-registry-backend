import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    generateToken: vi.fn().mockReturnValue('jwt'),
    generateMagicLinkToken: vi.fn().mockReturnValue('mtok'),
    buildMagicLink: vi.fn().mockReturnValue('http://x/cb?token=mtok'),
    verifyMagicLinkToken: vi.fn(),
  };
  const usersService = { findOrCreateByEmail: vi.fn() };
  const mailService = { sendMagicLink: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AuthController);
  });

  describe('requestMagicLink', () => {
    it('emails the link and returns a generic message', async () => {
      const result = await controller.requestMagicLink({ email: 'a@b.com' });

      expect(mailService.sendMagicLink).toHaveBeenCalledWith(
        'a@b.com',
        'http://x/cb?token=mtok',
      );
      expect(result.message).toBeDefined();
    });
  });

  describe('googleAuthRedirect', () => {
    const run = (query: Record<string, unknown>) => {
      const res = { cookie: vi.fn(), redirect: vi.fn() };
      const req = { user: { _id: 'u1' }, query };
      controller.googleAuthRedirect(req as any, res as any);
      return res;
    };

    beforeEach(() => {
      vi.stubEnv(
        'FRONTEND_URL',
        'https://wind-tunnel-registry-frontend.vercel.app',
      );
    });
    afterEach(() => vi.unstubAllEnvs());

    it('returns to the preview that started the login', () => {
      const preview =
        'https://wind-tunnel-registry-frontend-git-x-blue-butterfly1.vercel.app';

      expect(run({ state: preview }).redirect).toHaveBeenCalledWith(
        `${preview}/`,
      );
    });

    it('ignores a state that is not an allowed origin', () => {
      expect(run({ state: 'https://evil.com' }).redirect).toHaveBeenCalledWith(
        'https://wind-tunnel-registry-frontend.vercel.app',
      );
    });
  });

  describe('magicLinkRedirect', () => {
    it('sets the cookie and redirects', () => {
      const res = { cookie: vi.fn(), redirect: vi.fn() };
      const req = { user: { _id: 'u1', email: 'a@b.com' }, query: {} };

      controller.magicLinkRedirect(req as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.redirect).toHaveBeenCalled();
    });
  });

  describe('verifyMagicLink', () => {
    it('sets the cookie and returns the session without redirecting', async () => {
      authService.verifyMagicLinkToken.mockResolvedValue('a@b.com');
      usersService.findOrCreateByEmail.mockResolvedValue({
        _id: 'u1',
        email: 'a@b.com',
        displayName: 'a',
      });
      const res = { cookie: vi.fn() };

      const result = await controller.verifyMagicLink(
        { token: 'mtok' },
        res as any,
      );

      expect(authService.verifyMagicLinkToken).toHaveBeenCalledWith('mtok');
      expect(usersService.findOrCreateByEmail).toHaveBeenCalledWith('a@b.com');
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ authenticated: true, name: 'a' });
    });

    it('rejects an invalid, expired or used token without setting a cookie', async () => {
      authService.verifyMagicLinkToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired magic link'),
      );
      const res = { cookie: vi.fn() };

      await expect(
        controller.verifyMagicLink({ token: 'bad' }, res as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });
});
