import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublishReelDto {
  @ApiProperty({
    example: 'https://storage.googleapis.com/freshbhoj-media/kitchens/.../reel-video/abc.mp4',
    description: 'Upload via POST /upload (purpose=REEL_VIDEO) first, then send the URL',
  })
  @IsString()
  @MaxLength(500)
  videoUrl: string;

  @ApiPropertyOptional({ description: 'Upload via POST /upload (purpose=REEL_THUMBNAIL) first' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'Butter chicken, hand-tossed and fried to order' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional({ type: [String], example: ['butterchicken', 'streetfood'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ description: 'Attach a dish so the reel is shoppable' })
  @IsOptional()
  @IsUUID()
  mealId?: string;

  @ApiPropertyOptional({ example: 20, minimum: 3, maximum: 120, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(120)
  durationSec?: number;
}

export class UpdateReelDto {
  @ApiPropertyOptional({ example: 'Butter chicken, hand-tossed and fried to order — updated!' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional({ type: [String], example: ['butterchicken', 'streetfood'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  hashtags?: string[];
}
