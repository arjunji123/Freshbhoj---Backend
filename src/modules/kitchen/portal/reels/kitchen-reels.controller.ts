import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenReelsService } from './kitchen-reels.service';
import { PublishReelDto, UpdateReelDto } from './dto/kitchen-reels.dto';
import { DeletedReelDto, KitchenReelDto } from './dto/kitchen-reels.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Reels')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/reels')
export class KitchenReelsController {
  constructor(private readonly kitchenReelsService: KitchenReelsService) {}

  @Get()
  @ApiOperation({ summary: 'Your reels — draft, published and archived' })
  @ApiEnvelopeArray(KitchenReelDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Reels fetched', data: await this.kitchenReelsService.list(account.id) };
  }

  @Post()
  @ApiOperation({
    summary: 'Publish a reel',
    description:
      'Upload the video via POST /upload (purpose=REEL_VIDEO) first, and the thumbnail (purpose=REEL_THUMBNAIL) if you have one — then send both URLs here. The reel appears in the customer Food Feed immediately. Attach a mealId to make it shoppable.',
  })
  @ApiEnvelope(KitchenReelDto, { status: 201, description: 'Reel published' })
  @ApiEnvelopeError(400, 'That dish does not belong to your kitchen, or onboarding is not complete')
  async publish(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: PublishReelDto) {
    return {
      message: 'Reel published',
      data: await this.kitchenReelsService.publish(account.id, dto),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: "Edit a reel's caption or hashtags" })
  @ApiEnvelope(KitchenReelDto)
  @ApiEnvelopeError(403, 'This reel belongs to another kitchen')
  @ApiEnvelopeError(404, 'Reel not found')
  async update(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReelDto,
  ) {
    return {
      message: 'Reel updated',
      data: await this.kitchenReelsService.update(account.id, id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Pull a reel down' })
  @ApiEnvelope(DeletedReelDto)
  @ApiEnvelopeError(403, 'This reel belongs to another kitchen')
  @ApiEnvelopeError(404, 'Reel not found')
  async archive(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return {
      message: 'Reel removed',
      data: await this.kitchenReelsService.archive(account.id, id),
    };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Temporarily hide a reel from the public feed — resumable, unlike delete' })
  @ApiEnvelopeError(403, 'This reel belongs to another kitchen')
  @ApiEnvelopeError(404, 'Reel not found')
  async pause(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Reel paused', data: await this.kitchenReelsService.pause(account.id, id) };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make a paused reel visible in the public feed again' })
  @ApiEnvelopeError(403, 'This reel belongs to another kitchen')
  @ApiEnvelopeError(404, 'Reel not found')
  async resume(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Reel resumed', data: await this.kitchenReelsService.resume(account.id, id) };
  }
}
