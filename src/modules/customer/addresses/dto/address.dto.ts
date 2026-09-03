import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';

export class CreateAddressDto {
  @ApiPropertyOptional({ enum: AddressLabel, default: AddressLabel.HOME })
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @ApiPropertyOptional({ example: 'Mom’s place', description: 'Shown instead of the label when set' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customLabel?: string;

  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiverName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  receiverPhone?: string;

  @ApiProperty({ example: 'Flat 402, Green Valley Apartments' })
  @IsString()
  @MinLength(5, { message: 'Address line must be at least 5 characters' })
  @MaxLength(200)
  line1: string;

  @ApiPropertyOptional({ example: 'HSR Layout Sector 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional({ example: 'Opposite Central Park' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @ApiPropertyOptional({ example: 'Malviya Nagar' })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiPropertyOptional({ example: 'Jaipur', default: 'Jaipur' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Rajasthan', default: 'Rajasthan' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '302017' })
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode: string;

  @ApiPropertyOptional({ example: 26.8505 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 75.8065 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Make this the default delivery address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {
  @ApiPropertyOptional({ example: 'Flat 402, Green Valley Apartments' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  declare line1: string;

  @ApiPropertyOptional({ example: '302017' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  declare pincode: string;
}
