import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MagicLinkStrategy } from './strategies/magic-link.strategy';
import { MailService } from './mail.service';
import { MAGIC_LINK_THROTTLERS } from './magic-link-throttle';
import {
  UsedMagicLink,
  UsedMagicLinkSchema,
} from './schemas/used-magic-link.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '1d' },
      }),
    }),
    MongooseModule.forFeature([
      { name: UsedMagicLink.name, schema: UsedMagicLinkSchema },
    ]),
    ThrottlerModule.forRoot(MAGIC_LINK_THROTTLERS),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MailService,
    GoogleStrategy,
    JwtStrategy,
    MagicLinkStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
