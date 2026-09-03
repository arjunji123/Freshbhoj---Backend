import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CustomerReviewsController } from '../../customer/reviews/customer-reviews.controller';

@Module({
  // Reviews are read publicly (discovery) and written by the signed-in customer,
  // so both controllers share one service rather than duplicating the rules.
  controllers: [ReviewsController, CustomerReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
