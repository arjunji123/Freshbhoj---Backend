import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StoryFeedQueryDto {
  @ApiPropertyOptional({
    example: 'Jaipur',
    description: 'City to scope the rail to. Defaults to the launch city.',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
