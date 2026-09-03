import { IsMobilePhone, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KitchenSendOtpDto {
  @ApiProperty({ example: '+919876500011', description: 'Partner’s mobile number' })
  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('en-IN', {}, { message: 'Please enter a valid Indian mobile number' })
  phone: string;
}

export class KitchenVerifyOtpDto extends KitchenSendOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8, { message: 'OTP must be 4-8 digits' })
  @Matches(/^\d+$/, { message: 'OTP must contain only digits' })
  otp: string;
}

export class KitchenRefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
