import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Complete profile after OTP login (new user onboarding)
 */
export class CompleteProfileDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name of the user', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  fullName: string;

  @ApiPropertyOptional({ example: 'rahul@example.com', description: 'Optional email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;
}

/**
 * Update user location (from device GPS)
 */
export class UpdateLocationDto {
  @ApiProperty({ example: 28.6139, description: 'Latitude mapped from GPS' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 77.2090, description: 'Longitude mapped from GPS' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: '123, Model Town', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'New Delhi', description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi', description: 'State name' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '110009', description: 'Postal/Zip Code' })
  @IsOptional()
  @IsString()
  pincode?: string;
}

/**
 * Update FCM Token
 */
export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fcm-token-xyz-123', description: 'Firebase Cloud Messaging token for push notifications' })
  @IsString()
  fcmToken: string;
}
