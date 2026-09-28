import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenAdsService } from './kitchen-ads.service';
import { CreateCampaignDto, ListCampaignsQueryDto } from './dto/kitchen-ads.dto';
import { CampaignDto, EstimatedReachDto } from './dto/kitchen-ads.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Ads')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/ads/campaigns')
export class KitchenAdsController {
  constructor(private readonly kitchenAdsService: KitchenAdsService) {}

  @Get('estimate')
  @ApiOperation({ summary: 'Estimated reach range for a daily budget, before committing to a campaign' })
  @ApiQuery({ name: 'dailyBudgetRs', example: 200 })
  @ApiEnvelope(EstimatedReachDto)
  async estimate(@Query('dailyBudgetRs') dailyBudgetRs: string) {
    const parsed = Number(dailyBudgetRs);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('dailyBudgetRs must be a positive number');
    }
    return { message: 'Estimate computed', data: this.kitchenAdsService.estimateReach(parsed) };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Batch fetch, for the multi-campaign comparison view' })
  @ApiQuery({ name: 'ids', example: 'c9d0e1f2-...,a1b2c3d4-...', description: 'Comma-separated campaign ids' })
  @ApiEnvelopeArray(CampaignDto)
  async analytics(@CurrentKitchenAccount() account: KitchenAccount, @Query('ids') ids: string) {
    const idList = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!idList.length) throw new BadRequestException('ids is required');
    return { message: 'Campaign analytics fetched', data: await this.kitchenAdsService.analytics(account.id, idList) };
  }

  @Post()
  @ApiOperation({ summary: 'Start promoting a reel with a daily budget' })
  @ApiEnvelope(CampaignDto, { status: 201, description: 'Campaign created' })
  @ApiEnvelopeError(400, 'That reel does not belong to your kitchen, is not published, or already has an active campaign')
  async create(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: CreateCampaignDto) {
    return { message: 'Campaign created', data: await this.kitchenAdsService.create(account.id, dto) };
  }

  @Get()
  @ApiOperation({ summary: 'Your ad campaigns' })
  @ApiEnvelopeArray(CampaignDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: ListCampaignsQueryDto) {
    return { message: 'Campaigns fetched', data: await this.kitchenAdsService.list(account.id, query.status) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single campaign — spend, reach, CTR, orders, revenue, ROI, and the daily time series' })
  @ApiEnvelope(CampaignDto)
  @ApiEnvelopeError(403, 'This campaign belongs to another kitchen')
  @ApiEnvelopeError(404, 'Campaign not found')
  async findOne(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Campaign fetched', data: await this.kitchenAdsService.findOne(account.id, id) };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active campaign — spend stops accruing, resumable' })
  @ApiEnvelope(CampaignDto)
  async pause(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Campaign paused', data: await this.kitchenAdsService.pause(account.id, id) };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused campaign' })
  @ApiEnvelope(CampaignDto)
  async resume(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Campaign resumed', data: await this.kitchenAdsService.resume(account.id, id) };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a campaign for good — not resumable' })
  @ApiEnvelope(CampaignDto)
  async stop(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Campaign ended', data: await this.kitchenAdsService.stop(account.id, id) };
  }
}
