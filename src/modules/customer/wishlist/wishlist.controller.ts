import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { WishlistService } from './wishlist.service';
import { WishlistCountsDto } from './dto/wishlist.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { MealCardDto, FavoriteToggleDto } from '../../discovery/meals/dto/meals.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Wishlist')
@ApiBearerAuth('JWT-auth')
@Controller('customer/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('counts')
  @ApiOperation({ summary: 'Saved meals / reels / kitchens counts for the Saved tab' })
  @ApiEnvelope(WishlistCountsDto)
  async counts(@CurrentUser() user: User) {
    return { message: 'Counts fetched', data: await this.wishlistService.getCounts(user.id) };
  }

  @Get('meals')
  @ApiOperation({ summary: 'Saved meals' })
  @ApiEnvelopePaginated(MealCardDto)
  async meals(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return {
      message: 'Wishlist fetched',
      data: await this.wishlistService.listMeals(user.id, query.page, query.limit),
    };
  }

  @Post('meals/:mealId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save / unsave a meal' })
  @ApiEnvelope(FavoriteToggleDto, { description: 'State after the toggle' })
  @ApiEnvelopeError(404, 'Meal not found')
  async toggleMeal(@CurrentUser() user: User, @Param('mealId', ParseUUIDPipe) mealId: string) {
    return {
      message: 'Wishlist updated',
      data: await this.wishlistService.toggleMeal(user.id, mealId),
    };
  }
}
