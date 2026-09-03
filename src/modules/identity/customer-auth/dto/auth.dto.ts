import {
  IsString,
  IsMobilePhone,
  IsNotEmpty,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Step 1: Send OTP to phone number
 */
export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Valid Indian mobile number with country code' })
  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('en-IN', {}, { message: 'Please enter a valid Indian mobile number' })
  phone: string;
}

/**
 * Step 2: Verify OTP and get tokens
 */
export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Valid Indian mobile number with country code' })
  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('en-IN', {}, { message: 'Please enter a valid Indian mobile number' })
  phone: string;

  @ApiProperty({ example: '123456', description: 'The 4-8 digit OTP sent to the user' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 8, { message: 'OTP must be 4-8 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  otp: string;
}

/**
 * Refresh access token using refresh token
 */
export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...', description: 'The valid refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
