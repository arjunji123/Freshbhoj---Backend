import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendOrderMessageDto {
  @ApiProperty({ example: 'Please leave it at the door, thanks!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;
}
