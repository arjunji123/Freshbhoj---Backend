import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceabilityQueryDto {
  @ApiPropertyOptional({ example: 'Malviya Nagar', description: 'Locality name typed by the user' })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiPropertyOptional({ example: '302017', description: '6-digit pincode' })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Pincode must be exactly 6 digits' })
  pincode?: string;
}

export class AreaSearchQueryDto {
  @ApiPropertyOptional({ example: 'malv', description: 'Free-text search over locality names' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'Jaipur' })
  @IsOptional()
  @IsString()
  city?: string;
}
