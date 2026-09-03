import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ReelsService } from './reels.service';
import { ReelFeedQueryDto } from './dto/reels.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalUser } from '../../../common/decorators/optional-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
  ReelDto,
  ReelEngagementAckDto,
  ReelLikeDto,
  ReelSaveDto,
} from './dto/reels.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Reels')
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Food Feed — vertical reels',
    description:
      '`for_you` (recent, engagement breaks ties), `trending` (last 7 days by engagement) or `following` (kitchens the user follows — empty when signed out). A reel with a `meal` is shoppable and renders an Add to cart CTA in-feed.',
  })
  @ApiEnvelopePaginated(ReelDto)
  async feed(@Query() query: ReelFeedQueryDto, @OptionalUser() user?: User) {
    return { message: 'Feed fetched', data: await this.reelsService.getFeed(query, user?.id) };
  }

  @Get('saved')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reels the user saved' })
  @ApiEnvelopePaginated(ReelDto)
  async saved(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return {
      message: 'Saved reels fetched',
      data: await this.reelsService.listSaved(user.id, query.page, query.limit),
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Single reel (deep link target)' })
  @ApiEnvelope(ReelDto)
  @ApiEnvelopeError(404, 'Reel not found')
  async detail(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() user?: User) {
    return { message: 'Reel fetched', data: await this.reelsService.findOne(id, user?.id) };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Like / unlike a reel' })
  @ApiEnvelope(ReelLikeDto, { description: 'Like state and count after the toggle' })
  @ApiEnvelopeError(404, 'Reel not found')
  async like(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Like updated', data: await this.reelsService.toggleLike(user.id, id) };
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Save / unsave a reel' })
  @ApiEnvelope(ReelSaveDto)
  @ApiEnvelopeError(404, 'Reel not found')
  async save(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Save updated', data: await this.reelsService.toggleSave(user.id, id) };
  }

  @Public()
  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record a view',
    description: 'Fire-and-forget from the player — a dropped ping is not worth surfacing.',
  })
  @ApiEnvelope(ReelEngagementAckDto)
  async view(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'View recorded', data: await this.reelsService.recordView(id) };
  }

  @Public()
  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a share' })
  @ApiEnvelope(ReelEngagementAckDto)
  async share(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Share recorded', data: await this.reelsService.recordShare(id) };
  }
}
