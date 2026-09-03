import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ReviewsService } from '../../discovery/reviews/reviews.service';
import { CreateReviewDto } from '../../discovery/reviews/dto/reviews.dto';
import {
  PendingReviewDto,
  ReviewDto,
  ReviewHelpfulDto,
} from '../../discovery/reviews/dto/reviews.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../common/decorators/api-envelope.decorator';

/**
 * The write side of reviews, scoped to the signed-in customer.
 * Reading reviews is public and lives in `Discovery · Reviews`.
 */
@ApiTags('Customer · Reviews')
@ApiBearerAuth('JWT-auth')
@Controller('customer/reviews')
export class CustomerReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('kitchens/:kitchenId')
  @ApiOperation({
    summary: 'Write a review',
    description:
      'Passing the `orderId` of one of your own delivered orders earns the Verified badge and is enforced one-per-order. Writing a review recomputes the kitchen and meal rating averages.',
  })
  @ApiEnvelope(ReviewDto, { status: 201, description: 'Review created' })
  @ApiEnvelopeError(400, 'Order not delivered yet, from a different kitchen, or already reviewed')
  @ApiEnvelopeError(403, 'That order belongs to another user')
  @ApiEnvelopeError(404, 'Kitchen or order not found')
  async create(
    @CurrentUser() user: User,
    @Param('kitchenId', ParseUUIDPipe) kitchenId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return {
      message: 'Thanks for your feedback!',
      data: await this.reviewsService.create(user.id, kitchenId, dto),
    };
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Delivered orders still awaiting a rating',
    description: 'Drives the rating prompt on Order History.',
  })
  @ApiEnvelopeArray(PendingReviewDto)
  async pending(@CurrentUser() user: User) {
    return {
      message: 'Pending reviews fetched',
      data: await this.reviewsService.getPendingReviewPrompts(user.id),
    };
  }

  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a review as helpful' })
  @ApiEnvelope(ReviewHelpfulDto)
  @ApiEnvelopeError(404, 'Review not found')
  async helpful(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Marked as helpful', data: await this.reviewsService.toggleHelpful(id) };
  }
}
