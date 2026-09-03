import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';

export class PublishStoryDto {
  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiProperty({
    example: 'https://cdn.freshbhoj.com/stories/annapurna-morning.mp4',
    description: 'Upload via POST /upload first, then send the URL',
  })
  @IsString()
  @MaxLength(500)
  mediaUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'Today’s dal, on the stove since 6am' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  caption?: string;

  @ApiPropertyOptional({ description: 'Attach a dish so the story is shoppable' })
  @IsOptional()
  @IsUUID()
  mealId?: string;

  @ApiPropertyOptional({ example: 15, minimum: 3, maximum: 60, default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(60)
  durationSec?: number;
}
