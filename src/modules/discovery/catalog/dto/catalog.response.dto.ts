import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalTag, MealSlot } from '@prisma/client';

export class MealCategoryDto {
  @ApiProperty({ example: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 'lunch' })
  slug: string;

  @ApiProperty({ example: 'Lunch' })
  name: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.freshbhoj.com/cat/lunch.png' })
  iconUrl: string | null;

  @ApiPropertyOptional({ enum: MealSlot, nullable: true, example: MealSlot.LUNCH })
  slot: MealSlot | null;
}

export class GoalTagDto {
  @ApiProperty({ enum: GoalTag, example: GoalTag.HIGH_PROTEIN })
  key: GoalTag;

  @ApiProperty({ example: 'High Protein' })
  label: string;

  @ApiProperty({ example: 'dumbbell', description: 'lucide icon slug the app renders' })
  icon: string;

  @ApiProperty({ example: '25g+ protein per serving' })
  description: string;
}

export class ServiceableAreaDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiProperty({ example: 'Rajasthan' })
  state: string;

  @ApiProperty({ example: 'Malviya Nagar' })
  locality: string;

  @ApiProperty({ example: '302017' })
  pincode: string;

  @ApiPropertyOptional({ nullable: true, example: 26.8505 })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, example: 75.8065 })
  longitude: number | null;
}

export class NearbyAreaDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
  id: string;

  @ApiProperty({ example: 'Vaishali Nagar' })
  locality: string;

  @ApiProperty({ example: 'Jaipur' })
  city: string;

  @ApiPropertyOptional({ example: '302021' })
  pincode?: string;
}

export class ServiceabilityResultDto {
  @ApiProperty({
    example: false,
    description: 'Never 404s — an unserviceable area comes back as false with suggestions',
  })
  serviceable: boolean;

  @ApiPropertyOptional({ type: ServiceableAreaDto, nullable: true })
  area: ServiceableAreaDto | null;

  @ApiProperty({ type: [NearbyAreaDto], description: 'Areas to offer instead when serviceable is false' })
  nearbyAreas: NearbyAreaDto[];

  @ApiPropertyOptional({
    example: 'We are not live in your area yet — but we are expanding fast across Jaipur.',
  })
  message?: string;
}
