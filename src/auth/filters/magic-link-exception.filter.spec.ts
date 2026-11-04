import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { MagicLinkExceptionFilter } from './magic-link-exception.filter';

describe('MagicLinkExceptionFilter', () => {
  const makeHost = () => {
    const res = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => res }),
    } as unknown as ArgumentsHost;
    return { res, host };
  };

  describe('catch', () => {
    it('redirects to the frontend root with an error code', () => {
      const config = {
        get: vi.fn().mockReturnValue('https://app.example.com/dashboard'),
      };
      const filter = new MagicLinkExceptionFilter(config as any);
      const { res, host } = makeHost();

      filter.catch(new UnauthorizedException(), host);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/?error=magic_link_invalid',
      );
    });

    it('falls back to the 401 JSON when FRONTEND_URL is not set', () => {
      const filter = new MagicLinkExceptionFilter({
        get: vi.fn().mockReturnValue(undefined),
      } as any);
      const { res, host } = makeHost();

      filter.catch(new UnauthorizedException(), host);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
