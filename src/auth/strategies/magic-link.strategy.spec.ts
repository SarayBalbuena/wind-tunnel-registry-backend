import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { MagicLinkStrategy } from './magic-link.strategy';

describe('MagicLinkStrategy', () => {
  const user = { _id: 'u1', email: 'a@b.com' };
  const authService = { verifyMagicLinkToken: vi.fn() };
  const usersService = { findOrCreateByEmail: vi.fn() };
  let strategy: MagicLinkStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new MagicLinkStrategy(authService as any, usersService as any);
  });

  describe('validate', () => {
    it('returns the user for a valid token', async () => {
      authService.verifyMagicLinkToken.mockResolvedValue('a@b.com');
      usersService.findOrCreateByEmail.mockResolvedValue(user);

      const result = await strategy.validate({
        query: { token: 'tok' },
      } as unknown as Request);

      expect(authService.verifyMagicLinkToken).toHaveBeenCalledWith('tok');
      expect(usersService.findOrCreateByEmail).toHaveBeenCalledWith('a@b.com');
      expect(result).toBe(user);
    });

    it('throws when the token is missing', async () => {
      await expect(
        strategy.validate({ query: {} } as unknown as Request),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates an invalid token error', async () => {
      authService.verifyMagicLinkToken.mockRejectedValue(
        new UnauthorizedException(),
      );
      await expect(
        strategy.validate({ query: { token: 'bad' } } as unknown as Request),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
