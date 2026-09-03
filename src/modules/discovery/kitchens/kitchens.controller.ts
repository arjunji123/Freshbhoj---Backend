import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { KitchensService } from './kitchens.service';
import { KitchenQueryDto } from './dto/kitchens.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OptionalUser } from '../../../common/decorators/optional-user.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { MealCardDto } from '../meals/dto/meals.response.dto';
import {
  FollowToggleDto,
  KitchenCardDto,
  KitchenDetailDto,
  KitchenMediaDto,
} from './dto/kitchens.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
  ApiEnvelopePaginated,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Kitchens')
@Controller('kitchens')
export class KitchensController {
  constructor(private readonly kitchensService: KitchensService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List curated kitchens',
    description: '`openOnly` is applied after pagination, so a page may return fewer than `limit`.',
  })
  @ApiEnvelopePaginated(KitchenCardDto)
  async list(@Query() query: KitchenQueryDto) {
    return { message: 'Kitchens fetched', data: await this.kitchensService.findAll(query) };
  }

  @Get('following')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Kitchens the current user follows' })
  @ApiEnvelopePaginated(KitchenCardDto)
  async following(@CurrentUser() user: User, @Query() query: PaginationQueryDto) {
    return {
      message: 'Followed kitchens fetched',
      data: await this.kitchensService.listFollowed(user.id, query.page, query.limit),
    };
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({
    summary: 'Kitchen profile (accepts id or slug)',
    description: 'Public, but fills in `isFollowing` when a bearer token is sent.',
  })
  @ApiEnvelope(KitchenDetailDto)
  @ApiEnvelopeError(404, 'Kitchen not found')
  async detail(@Param('idOrSlug') idOrSlug: string, @OptionalUser() user?: User) {
    return {
      message: 'Kitchen fetched',
      data: await this.kitchensService.findOne(idOrSlug, user?.id),
    };
  }

  @Public()
  @Get(':id/media')
  @ApiOperation({ summary: 'Kitchen photo/video gallery (Phase-1 lightweight grid)' })
  @ApiEnvelopeArray(KitchenMediaDto)
  @ApiEnvelopeError(404, 'Kitchen not found')
  async media(@Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Media fetched', data: await this.kitchensService.getMedia(id) };
  }

  @Public()
  @Get(':id/menu')
  @ApiOperation({
    summary: 'Meals offered by this kitchen',
    description: 'Same card shape as the Home feed, so both lists render identically.',
  })
  @ApiEnvelopePaginated(MealCardDto)
  @ApiEnvelopeError(404, 'Kitchen not found')
  async menu(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @OptionalUser() user?: User,
  ) {
    return {
      message: 'Menu fetched',
      data: await this.kitchensService.getMenu(id, query.page, query.limit ?? 30, user?.id),
    };
  }

  @Post(':id/follow')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Follow / unfollow a kitchen' })
  @ApiEnvelope(FollowToggleDto, { description: 'Follow state after the toggle' })
  @ApiEnvelopeError(404, 'Kitchen not found')
  async follow(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return {
      message: 'Follow state updated',
      data: await this.kitchensService.toggleFollow(user.id, id),
    };
  }
}
