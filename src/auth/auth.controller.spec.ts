import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    generateToken: vi.fn().mockReturnValue('jwt'),
    generateMagicLinkToken: vi.fn().mockReturnValue('mtok'),
    buildMagicLink: vi.fn().mockReturnValue('http://x/cb?token=mtok'),
  };
  const mailService = { sendMagicLink: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();
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

  describe('magicLinkRedirect', () => {
    it('sets the cookie and redirects', () => {
      const res = { cookie: vi.fn(), redirect: vi.fn() };
      const req = { user: { _id: 'u1', email: 'a@b.com' } };

      controller.magicLinkRedirect(req as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.redirect).toHaveBeenCalled();
    });
  });
});
