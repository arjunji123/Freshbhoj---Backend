import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { StoriesService } from './stories.service';
import { StoryFeedQueryDto } from './dto/stories.dto';
import {
  KitchenStoryGroupDto,
  StoryLikeDto,
  StorySeenDto,
  StoryShareDto,
} from './dto/stories.response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalUser } from '../../../common/decorators/optional-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../common/decorators/api-envelope.decorator';

const DEFAULT_CITY = 'Jaipur';

@ApiTags('Discovery · Stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Kitchen Stories rail, scoped to the viewer’s city',
    description:
      'A customer in Jaipur only sees Jaipur kitchens. Grouped one entry per kitchen, newest-unseen first, and each story expires 24 hours after publishing.',
  })
  @ApiEnvelopeArray(KitchenStoryGroupDto)
  async feed(@Query() query: StoryFeedQueryDto, @OptionalUser() user?: User) {
    const city = query.city ?? user?.city ?? DEFAULT_CITY;
    return {
      message: 'Stories fetched',
      data: await this.storiesService.getCityFeed(city, user?.id),
    };
  }

  @Public()
  @Get('kitchens/:kitchenId')
  @ApiOperation({ summary: 'Live stories for one kitchen' })
  @ApiEnvelope(KitchenStoryGroupDto)
  @ApiEnvelopeError(404, 'Kitchen not found')
  async forKitchen(
    @Param('kitchenId', ParseUUIDPipe) kitchenId: string,
    @OptionalUser() user?: User,
  ) {
    return {
      message: 'Stories fetched',
      data: await this.storiesService.getForKitchen(kitchenId, user?.id),
    };
  }

  @Public()
  @Post(':id/seen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a story watched',
    description: 'Counts one view per customer, so the number means reach, not replays.',
  })
  @ApiEnvelope(StorySeenDto)
  @ApiEnvelopeError(404, 'Story not found')
  async seen(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() user?: User) {
    return { message: 'Story marked seen', data: await this.storiesService.markSeen(id, user?.id) };
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a story (toggle)' })
  @ApiEnvelope(StoryLikeDto)
  @ApiEnvelopeError(404, 'Story not found')
  async like(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return { message: 'Like updated', data: await this.storiesService.toggleLike(id, user.id) };
  }

  @Public()
  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a share (fire-and-forget counter)' })
  @ApiEnvelope(StoryShareDto)
  @ApiEnvelopeError(404, 'Story not found')
  async share(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Share recorded', data: await this.storiesService.registerShare(id) };
  }
}
