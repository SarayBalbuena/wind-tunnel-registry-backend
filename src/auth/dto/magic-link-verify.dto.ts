import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MagicLinkVerifyDto {
  @ApiProperty({ description: 'Single-use token from the emailed link.' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
