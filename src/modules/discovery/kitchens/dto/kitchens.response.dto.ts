import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';

export class OpeningHoursDto {
  @ApiProperty({ example: '08:00', description: 'HH:mm, IST' })
  opensAt: string;

  @ApiProperty({ example: '22:30' })
  closesAt: string;
}

export class SignatureDishDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-4978-8b6c-5d4e3f2a1b0c' })
  id: string;

  @ApiProperty({ example: 'Special North Indian Thali' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  image: string | null;

  @ApiProperty({ example: 249 })
  price: number;
}

export class KitchenCardDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiPropertyOptional({ nullable: true, example: 'Authentic Homemade North Indian' })
  tagline: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImage: string | null;

  @ApiProperty({ example: true, description: 'Inspected in person and FSSAI-checked' })
  isVerified: boolean;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 1243 })
  ratingCount: number;

  @ApiProperty({ example: 3820 })
  followerCount: number;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiProperty({ example: 25 })
  prepTimeMins: number;

  @ApiProperty({ type: OpeningHoursDto })
  openingHours: OpeningHoursDto;

  @ApiProperty({ example: true })
  isOpenNow: boolean;

  @ApiPropertyOptional({ type: SignatureDishDto, nullable: true })
  signatureDish: SignatureDishDto | null;
}

export class KitchenAddressDto {
  @ApiPropertyOptional({ nullable: true, example: '12, Shanti Path' })
  line: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Malviya Nagar' })
  locality: string | null;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiProperty({ example: 'Rajasthan' })
  state: string;

  @ApiPropertyOptional({ nullable: true, example: '302017' })
  pincode: string | null;

  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;
}

export class KitchenCountsDto {
  @ApiProperty({ example: 12 })
  meals: number;

  @ApiProperty({ example: 4 })
  reels: number;

  @ApiProperty({ example: 1243 })
  reviews: number;
}

export class KitchenDetailDto extends KitchenCardDto {
  @ApiPropertyOptional({ nullable: true, example: 'A family-run kitchen in Malviya Nagar…' })
  description: string | null;

  @ApiProperty({ type: KitchenAddressDto })
  address: KitchenAddressDto;

  @ApiPropertyOptional({ nullable: true, example: '+919876500011' })
  contactPhone: string | null;

  @ApiPropertyOptional({ nullable: true, example: '22823004000123' })
  fssaiLicense: string | null;

  @ApiPropertyOptional({ nullable: true, example: 4.9, description: 'Out of 5, audited monthly' })
  hygieneScore: number | null;

  @ApiProperty({ type: KitchenCountsDto })
  counts: KitchenCountsDto;

  @ApiProperty({ example: false, description: 'Personalised; always false when signed out' })
  isFollowing: boolean;

  @ApiProperty({ example: '2026-01-14T06:12:00.000Z' })
  memberSince: string;
}

export class KitchenMediaDto {
  @ApiProperty({ example: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' })
  id: string;

  @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
  type: MediaType;

  @ApiProperty({ example: 'https://images.example.com/kitchen/prep.jpg' })
  url: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Fresh produce sorted this morning' })
  caption: string | null;

  @ApiProperty({ example: '2026-09-01T04:30:00.000Z' })
  createdAt: string;
}

export class FollowToggleDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  kitchenId: string;

  @ApiProperty({ example: true, description: 'State after the toggle' })
  isFollowing: boolean;

  @ApiProperty({ example: 3821 })
  followerCount: number;
}
