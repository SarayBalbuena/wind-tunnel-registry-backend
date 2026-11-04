import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

export const MAGIC_LINK_ERROR = 'magic_link_invalid';

// Sends users with an invalid, expired or already-used link back to the
// frontend with ?error=magic_link_invalid instead of a raw 401 JSON page.
@Injectable()
@Catch(UnauthorizedException)
export class MagicLinkExceptionFilter implements ExceptionFilter {
  constructor(private configService: ConfigService) {}

  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const target = new URL('/', frontendUrl);
    target.searchParams.set('error', MAGIC_LINK_ERROR);
    res.redirect(target.toString());
  }
}
