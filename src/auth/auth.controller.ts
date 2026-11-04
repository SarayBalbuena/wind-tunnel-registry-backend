import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { MagicLinkRequestDto } from './dto/magic-link-request.dto';
import { MagicLinkVerifyDto } from './dto/magic-link-verify.dto';
import { MagicLinkExceptionFilter } from './filters/magic-link-exception.filter';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const isProduction = process.env.NODE_ENV === 'production';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private mailService: MailService,
    private usersService: UsersService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Login with Google',
    description: 'Redirects to Google for authentication.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google login page.' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth Callback',
    description:
      'Handles the redirection from Google and sets the session cookie.',
  })
  @ApiResponse({
    status: 302,
    description: 'Sets access_token cookie and redirects to frontend.',
  })
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return this.loginAndRedirect(req, res);
  }

  @Post('magic-link')
  @UseGuards(ThrottlerGuard)
  @HttpCode(202)
  @ApiOperation({
    summary: 'Request a magic login link',
    description:
      'Emails a single-use login link valid for 15 minutes. Always answers 202 so it does not reveal whether an email is registered. Limited to 3 requests per email every 15 minutes.',
  })
  @ApiResponse({
    status: 202,
    description: 'Magic link sent if the email is valid.',
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    const token = this.authService.generateMagicLinkToken(dto.email);
    await this.mailService.sendMagicLink(
      dto.email,
      this.authService.buildMagicLink(token),
    );
    return { message: 'If the email is valid, a login link has been sent.' };
  }

  @Get('magic-link/callback')
  @UseGuards(AuthGuard('magic-link'))
  @UseFilters(MagicLinkExceptionFilter)
  @ApiOperation({
    summary: 'Magic link callback',
    description:
      'Validates the single-use token from the emailed link and sets the session cookie.',
  })
  @ApiResponse({
    status: 302,
    description:
      'Valid link: sets access_token cookie and redirects to FRONTEND_URL. Invalid, expired or already used link: redirects to the frontend root with ?error=magic_link_invalid.',
  })
  magicLinkRedirect(@Req() req: Request, @Res() res: Response) {
    return this.loginAndRedirect(req, res);
  }

  @Post('magic-link/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify a magic link token',
    description:
      'Called by the frontend confirm page when the user clicks "Continue". Validates the single-use token, sets the session cookie and returns the session. Using POST means mail scanners that prefetch the emailed link cannot use up the token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token accepted: sets access_token cookie.',
    schema: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean', example: true },
        name: { type: 'string', example: 'John Doe' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired or already used link.',
  })
  async verifyMagicLink(
    @Body() dto: MagicLinkVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = await this.authService.verifyMagicLinkToken(dto.token);
    const user = await this.usersService.findOrCreateByEmail(email);

    this.setSessionCookie(res, user);

    return { authenticated: true, name: user.displayName };
  }

  private setSessionCookie(res: Response, user: UserDocument) {
    const token = this.authService.generateToken(user);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  private loginAndRedirect(req: Request, res: Response) {
    this.setSessionCookie(res, req.user as UserDocument);

    return res.redirect(process.env.FRONTEND_URL ?? '');
  }

  @Get('logout')
  @ApiOperation({ summary: 'Log out' })
  @ApiResponse({ status: 200, description: 'Cookie cleared.' })
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });

    return res.json({
      message: 'Logout successful',
    });
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Check session status',
    description: 'Returns the authentication status of the current session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the user is authenticated.',
    schema: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean', example: true },
        name: { type: 'string', example: 'John Doe' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  session(@Req() req: Request) {
    const user = req.user as UserDocument;
    return { authenticated: true, name: user.displayName };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  me(@Req() req: Request) {
    return req.user;
  }
}
