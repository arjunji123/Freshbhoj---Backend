import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenDocumentType } from '@prisma/client';

/** Step 1 — who is running this kitchen. */
export class OwnerDetailsDto {
  @ApiProperty({ example: 'Meena Sharma' })
  @IsString()
  @MinLength(2, { message: 'Please enter the owner’s full name' })
  @MaxLength(100)
  ownerName: string;

  @ApiPropertyOptional({ example: 'partner@annapurna.in' })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;
}

/** Step 2 — the kitchen's public identity. */
export class KitchenDetailsDto {
  @ApiProperty({ example: 'Annapurna Kitchen' })
  @IsString()
  @MinLength(3, { message: 'Kitchen name must be at least 3 characters' })
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Authentic Homemade North Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @ApiPropertyOptional({ example: 'A family-run kitchen serving slow-cooked North Indian thalis.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.freshbhoj.com/kitchens/logo.jpg' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.freshbhoj.com/kitchens/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: '+919876500011' })
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Enter a valid Indian number with +91' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 25, description: 'Typical prep time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  prepTimeMins?: number;

  @ApiPropertyOptional({ example: '08:00', description: 'HH:mm, IST' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use HH:mm, e.g. 08:00' })
  opensAt?: string;

  @ApiPropertyOptional({ example: '22:30' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use HH:mm, e.g. 22:30' })
  closesAt?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['thali', 'north-indian'],
    description: 'Cuisine slugs this kitchen cooks',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisineSlugs?: string[];
}

/** Step 3 — where it cooks and delivers from. */
export class KitchenLocationDto {
  @ApiProperty({ example: '12, Shanti Path' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  addressLine: string;

  @ApiProperty({ example: 'Malviya Nagar' })
  @IsString()
  locality: string;

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

  @ApiProperty({ example: 26.8505 })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 75.8065 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;
}

/** Step 4 — compliance paperwork. */
export class UploadDocumentDto {
  @ApiProperty({ enum: KitchenDocumentType, example: KitchenDocumentType.FSSAI })
  @IsEnum(KitchenDocumentType)
  type: KitchenDocumentType;

  @ApiPropertyOptional({ example: '22823004000123', description: 'Licence / GSTIN / PAN number' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @ApiProperty({
    example: 'https://cdn.freshbhoj.com/docs/fssai-annapurna.pdf',
    description: 'Upload the file via POST /upload first, then send the returned URL',
  })
  @IsString()
  @MinLength(5)
  fileUrl: string;
}

/** Step 5 — where payouts land. */
export class BankDetailsDto {
  @ApiProperty({ example: 'Meena Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountHolderName: string;

  @ApiProperty({
    example: '00112233445566',
    description: 'Stored as the last 4 digits only — the full number is never persisted',
  })
  @Matches(/^\d{9,18}$/, { message: 'Enter a valid bank account number' })
  accountNumber: string;

  @ApiProperty({ example: 'HDFC0001234' })
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Enter a valid IFSC code' })
  ifsc: string;

  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'annapurna@okhdfcbank' })
  @IsOptional()
  @IsString()
  upiId?: string;
}
