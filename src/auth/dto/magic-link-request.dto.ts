import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'pilot@example.com' })
  @IsEmail()
  email: string;
}
