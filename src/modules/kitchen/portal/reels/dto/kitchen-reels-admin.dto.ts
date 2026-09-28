import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetReelSponsoredDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isSponsored: boolean;
}
