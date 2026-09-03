import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenStatus } from '@prisma/client';

/**
 * The partner's own view of their kitchen — a superset of what customers see
 * on `Discovery · Kitchens`, with operational fields (status, followerCount
 * source of truth) a customer response never exposes.
 */
export class KitchenProfileDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  tagline: string | null;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverImage: string | null;

  @ApiProperty({ enum: KitchenStatus, example: KitchenStatus.ACTIVE })
  status: KitchenStatus;

  @ApiProperty({ example: true, description: 'Set by the FreshBhoj team on approval' })
  isVerified: boolean;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 1243 })
  ratingCount: number;

  @ApiProperty({ example: 3820 })
  followerCount: number;

  @ApiPropertyOptional({ nullable: true })
  addressLine: string | null;

  @ApiPropertyOptional({ nullable: true })
  locality: string | null;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiPropertyOptional({ nullable: true })
  pincode: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 25 })
  prepTimeMins: number;

  @ApiProperty({ example: '08:00' })
  opensAt: string;

  @ApiProperty({ example: '22:30' })
  closesAt: string;

  @ApiProperty({ example: true, description: 'The pause-new-orders toggle' })
  isAcceptingOrders: boolean;

  @ApiPropertyOptional({ nullable: true })
  contactPhone: string | null;

  @ApiPropertyOptional({ nullable: true })
  fssaiLicense: string | null;

  @ApiPropertyOptional({ nullable: true })
  hygieneScore: number | null;

  @ApiProperty({ type: [String], example: ['thali', 'north-indian'] })
  cuisines: string[];

  @ApiProperty({ example: '2026-01-14T06:12:00.000Z' })
  createdAt: string;
}
