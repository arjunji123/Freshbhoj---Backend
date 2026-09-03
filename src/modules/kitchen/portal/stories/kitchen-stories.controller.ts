import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenStoriesService } from './kitchen-stories.service';
import { PublishStoryDto } from './dto/kitchen-stories.dto';
import { DeletedStoryDto, KitchenStoryDto } from './dto/kitchen-stories.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Stories')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/stories')
export class KitchenStoriesController {
  constructor(private readonly kitchenStoriesService: KitchenStoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Your published stories, including expired ones' })
  @ApiEnvelopeArray(KitchenStoryDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Stories fetched', data: await this.kitchenStoriesService.list(account.id) };
  }

  @Post()
  @ApiOperation({
    summary: 'Publish a story',
    description:
      'Upload the clip via POST /upload first. The story appears in your city’s customer-facing rail for 24 hours. Attach a mealId to make it shoppable.',
  })
  @ApiEnvelope(KitchenStoryDto, { status: 201, description: 'Story published' })
  @ApiEnvelopeError(400, 'That dish does not belong to your kitchen, or onboarding is not complete')
  async publish(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: PublishStoryDto) {
    return {
      message: 'Story published',
      data: await this.kitchenStoriesService.publish(account.id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Pull a story down early' })
  @ApiEnvelope(DeletedStoryDto)
  @ApiEnvelopeError(403, 'This story belongs to another kitchen')
  @ApiEnvelopeError(404, 'Story not found')
  async deactivate(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      message: 'Story removed',
      data: await this.kitchenStoriesService.deactivate(account.id, id),
    };
  }
}
