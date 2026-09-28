import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendBhojAiMessageDto {
  @ApiProperty({ example: 'How long does FSSAI registration usually take?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}
