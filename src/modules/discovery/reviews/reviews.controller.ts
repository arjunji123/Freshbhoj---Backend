import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto/reviews.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { ReviewDto, ReviewSummaryDto } from './dto/reviews.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('kitchens/:kitchenId/reviews')
  @ApiOperation({ summary: 'Reviews for a kitchen' })
  @ApiEnvelopePaginated(ReviewDto)
  async kitchenReviews(
    @Param('kitchenId', ParseUUIDPipe) kitchenId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return {
      message: 'Reviews fetched',
      data: await this.reviewsService.findForKitchen(kitchenId, query),
    };
  }

  @Public()
  @Get('kitchens/:kitchenId/reviews/summary')
  @ApiOperation({
    summary: 'Average rating and star distribution',
    description: 'The 5→1 histogram the review header draws as bars.',
  })
  @ApiEnvelope(ReviewSummaryDto)
  async summary(@Param('kitchenId', ParseUUIDPipe) kitchenId: string) {
    return { message: 'Summary fetched', data: await this.reviewsService.getSummary(kitchenId) };
  }

  @Public()
  @Get('meals/:mealId/reviews')
  @ApiOperation({ summary: 'Reviews for one dish' })
  @ApiEnvelopePaginated(ReviewDto)
  async mealReviews(
    @Param('mealId', ParseUUIDPipe) mealId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return { message: 'Reviews fetched', data: await this.reviewsService.findForMeal(mealId, query) };
  }

}
