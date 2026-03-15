import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsMobilePhone,
  IsBoolean,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebUserDto {
  @ApiProperty({ example: 'USER', description: 'Selected role defaults to USER or VENDOR on web pre-reg', enum: ['USER', 'VENDOR'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['USER', 'VENDOR'])
  role: string;

  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+919876543210', description: 'Mobile Number' })
  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('en-IN', {}, { message: 'Please enter a valid Indian mobile number' })
  mobileNo: string;

  @ApiPropertyOptional({ example: 'rahul@example.com', description: 'Optional email' })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @ApiProperty({ example: 'Delhi', description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'New Delhi', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '110001', description: 'Area/Pincode' })
  @IsString()
  @IsNotEmpty()
  areaPincode: string;

  // Questionnaires
  @ApiProperty({ example: 'STUDENT', description: 'Tell us about yourself', enum: ['STUDENT', 'PROFESSIONAL', 'FAMILY', 'OTHER'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['STUDENT', 'PROFESSIONAL', 'FAMILY', 'OTHER'])
  aboutYourself: string;

  @ApiProperty({ example: 'VEG', description: 'Tell us your taste', enum: ['VEG', 'NON_VEG', 'BOTH'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['VEG', 'NON_VEG', 'BOTH'])
  taste: string;

  @ApiProperty({ example: 'DAILY_TIFFIN', description: 'What are you looking for', enum: ['DAILY_TIFFIN', 'OCCASIONAL', 'STREET_FOOD', 'HOME_STYLE'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DAILY_TIFFIN', 'OCCASIONAL', 'STREET_FOOD', 'HOME_STYLE'])
  lookingFor: string;
}

export class CreateWebKitchenDto {
  @ApiProperty({ example: 'Sharma Tiffin Center', description: 'Kitchen Name' })
  @IsString()
  @IsNotEmpty()
  kitchenName: string;

  @ApiProperty({ example: 'Ravi Sharma', description: 'Contact Person Name' })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({ example: '+919876543210', description: 'Mobile Number' })
  @IsString()
  @IsNotEmpty()
  @IsMobilePhone('en-IN', {}, { message: 'Please enter a valid Indian mobile number' })
  mobileNo: string;

  @ApiPropertyOptional({ example: 'ravi@example.com', description: 'Optional email' })
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email?: string;

  @ApiProperty({ example: 'TIFFIN_SERVICE', description: 'Vendor Type', enum: ['CLOUD_KITCHEN', 'TIFFIN_SERVICE', 'STREET_FOOD', 'RESTAURANT'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['CLOUD_KITCHEN', 'TIFFIN_SERVICE', 'STREET_FOOD', 'RESTAURANT'])
  vendorType: string;

  @ApiProperty({ example: '100-200', description: 'Average Meal Price Range', enum: ['50-100', '100-200', '200-350', '350+'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['50-100', '100-200', '200-350', '350+'])
  avgMealPrice: string;

  @ApiProperty({ example: 'Delhi', description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'New Delhi', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'REGISTERED', description: 'FSSAI Status', enum: ['REGISTERED', 'APPLIED', 'NOT_APPLIED'] })
  @IsString()
  @IsNotEmpty()
  fssaiStatus: string;

  @ApiPropertyOptional({ example: '12345678901234', description: 'FSSAI License No if registered' })
  @IsOptional()
  @IsString()
  fssaiLicenseNo?: string;

  @ApiPropertyOptional({ example: '07AAPCA1234K1Z2', description: 'GST Number Optional' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiProperty({ example: 'SELF', description: 'Delivery Capability', enum: ['SELF', 'FRESHBHOJ'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SELF', 'FRESHBHOJ'])
  deliveryCapability: string;

  @ApiProperty({ type: [String], example: ['BREAKFAST', 'LUNCH'], description: 'Service Timing (multiple allowed)', enum: ['BREAKFAST', 'LUNCH', 'DINNER'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  serviceTiming: string[];

  @ApiProperty({ example: true, description: 'Interested in making Kitchen Reels feature' })
  @IsBoolean()
  @IsNotEmpty()
  interestedInReels: boolean;

  @ApiProperty({ example: 'To reach a wider audience locally', description: 'Why do you want to join FreshBhoj' })
  @IsString()
  @IsNotEmpty()
  whyJoinFreshbhoj: string;
}
