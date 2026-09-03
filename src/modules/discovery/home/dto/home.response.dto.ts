import { ApiProperty } from '@nestjs/swagger';
import { MealSlot } from '@prisma/client';
import { GoalTagDto, MealCategoryDto } from '../../catalog/dto/catalog.response.dto';
import { KitchenCardDto } from '../../kitchens/dto/kitchens.response.dto';
import { MealCardDto } from '../../meals/dto/meals.response.dto';
import { ReelDto } from '../../reels/dto/reels.response.dto';
import { OrderDetailDto } from '../../../customer/orders/dto/orders.response.dto';

export class HomeFeedDto {
  @ApiProperty({ example: 'Good afternoon', description: 'Time-of-day greeting in IST' })
  greeting: string;

  @ApiProperty({
    enum: MealSlot,
    example: MealSlot.LUNCH,
    description: 'The slot to lead with, so Home differs at 8am vs 8pm',
  })
  currentSlot: MealSlot;

  @ApiProperty({ type: [GoalTagDto], description: 'Goal chips rendered above the feed' })
  goalTags: GoalTagDto[];

  @ApiProperty({ type: [MealCategoryDto] })
  categories: MealCategoryDto[];

  @ApiProperty({ type: [KitchenCardDto], description: 'Verified kitchens rail' })
  featuredKitchens: KitchenCardDto[];

  @ApiProperty({ type: [MealCardDto], description: 'First page; the feed paginates via GET /meals' })
  recommendedMeals: MealCardDto[];

  @ApiProperty({ type: [ReelDto] })
  trendingReels: ReelDto[];

  @ApiProperty({
    type: [OrderDetailDto],
    description: 'Orders in flight, for the Home strip. Empty when signed out.',
  })
  activeOrders: OrderDetailDto[];
}

export class PopularKitchenDto {
  @ApiProperty({ example: 'd4c3b2a1-f6e5-4b7a-9c8d-1e0f3a2b5c4d' })
  id: string;

  @ApiProperty({ example: 'Annapurna Kitchen' })
  name: string;

  @ApiProperty({ example: 'annapurna-kitchen' })
  slug: string;

  @ApiProperty({ nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: true })
  isVerified: boolean;
}

export class SearchSuggestionsDto {
  @ApiProperty({ type: [String], example: ['Special North Indian Thali', 'Paneer Butter Masala'] })
  trendingSearches: string[];

  @ApiProperty({ type: [PopularKitchenDto] })
  popularKitchens: PopularKitchenDto[];

  @ApiProperty({ type: [GoalTagDto] })
  goalTags: GoalTagDto[];
}
