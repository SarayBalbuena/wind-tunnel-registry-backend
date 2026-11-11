import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'pilot@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'https://wind-tunnel-registry-frontend.vercel.app',
    description:
      "Origin of the frontend that asks for the link. Only production, localhost and this project's Vercel previews are honoured: the emailed link then opens that frontend. Any other value is ignored.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  origin?: string;
}
