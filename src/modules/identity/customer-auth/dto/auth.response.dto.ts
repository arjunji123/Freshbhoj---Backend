import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class SendOtpResultDto {
  @ApiProperty({ example: 10 })
  expiresInMinutes: number;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Only returned while OTP_DEV_MODE=true, so the app can log in without SMS',
  })
  devOtp?: string;
}

export class UserDto {
  @ApiProperty({ example: '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e' })
  id: string;

  @ApiProperty({ example: '+919876543210' })
  phone: string;

  @ApiPropertyOptional({ nullable: true, example: 'Rahul Sharma' })
  fullName: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'rahul@example.com' })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImage: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'PENDING_PROFILE until the onboarding profile step completes',
  })
  status: UserStatus;

  @ApiProperty({ example: true })
  isPhoneVerified: boolean;

  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar, Jaipur' })
  address: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Jaipur' })
  city: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Rajasthan' })
  state: string | null;

  @ApiPropertyOptional({ nullable: true, example: '302017' })
  pincode: string | null;
}

export class TokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access-token lifetime in seconds' })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;
}

export class VerifyOtpResultDto {
  @ApiProperty({
    example: false,
    description: 'True on first login — the app then runs the profile + location steps',
  })
  isNewUser: boolean;

  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ type: TokenPairDto })
  tokens: TokenPairDto;
}
