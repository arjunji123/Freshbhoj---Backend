import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { MealsService } from './meals.service';
import { MealQueryDto, TrendingNearbyQueryDto } from './dto/meals.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalUser } from '../../../common/decorators/optional-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
  FavoriteToggleDto,
  MealCardDto,
  MealDetailDto,
  NearbyMealCardDto,
} from './dto/meals.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Meals')
@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List / search / filter meals (Home feed + Search)',
    description:
      'Public, but personalises `isFavorite` when a bearer token is sent. `openOnly` is applied after pagination, so a page may return fewer than `limit` items.',
  })
  @ApiEnvelopePaginated(MealCardDto, { description: 'Paginated meal cards' })
  async list(@Query() query: MealQueryDto, @OptionalUser() user?: User) {
    return { message: 'Meals fetched', data: await this.mealsService.findAll(query, user?.id) };
  }

  @Public()
  @Get('trending-nearby')
  @ApiOperation({
    summary: 'Trending Near You — demand-ranked meals within a radius',
    description:
      'Ranked by real order volume among kitchens that can actually deliver to the given coordinates. `lat`/`lng` are required: without them there is no "near you". Each card carries its exact distance.',
  })
  @ApiEnvelopePaginated(NearbyMealCardDto)
  @ApiEnvelopeError(400, 'Missing or invalid coordinates')
  async trendingNearby(@Query() query: TrendingNearbyQueryDto, @OptionalUser() user?: User) {
    return {
      message: 'Trending meals fetched',
      data: await this.mealsService.findTrendingNearby(query, user?.id),
    };
  }

  @Get('favorites')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Meals the current user has favourited' })
  @ApiEnvelopePaginated(MealCardDto)
  async favorites(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return {
      message: 'Favorites fetched',
      data: await this.mealsService.listFavorites(user.id, query.page, query.limit),
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Meal detail with full nutrition, ingredients and allergens',
    description: 'Includes a pre-computed macro split so the detail page renders without maths.',
  })
  @ApiEnvelope(MealDetailDto)
  @ApiEnvelopeError(404, 'Meal not found')
  async detail(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() user?: User) {
    return { message: 'Meal fetched', data: await this.mealsService.findOne(id, user?.id) };
  }

  @Public()
  @Get(':id/similar')
  @ApiOperation({ summary: 'Similar meals for the detail page' })
  @ApiEnvelopeArray(MealCardDto)
  @ApiEnvelopeError(404, 'Meal not found')
  async similar(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() user?: User) {
    return { message: 'Similar meals fetched', data: await this.mealsService.findSimilar(id, 6, user?.id) };
  }

  @Post(':id/favorite')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle favourite on a meal' })
  @ApiEnvelope(FavoriteToggleDto, { description: 'Favourite state after the toggle' })
  @ApiEnvelopeError(404, 'Meal not found')
  async toggleFavorite(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return {
      message: 'Favorite updated',
      data: await this.mealsService.toggleFavorite(user.id, id),
    };
  }
}
