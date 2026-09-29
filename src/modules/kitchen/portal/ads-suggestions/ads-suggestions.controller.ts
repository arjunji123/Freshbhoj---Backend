import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { AdsSuggestionsService } from './ads-suggestions.service';
import { ListSuggestionsQueryDto } from './dto/ads-suggestions.dto';
import { CampaignSuggestionDto, SuggestionListDto } from './dto/ads-suggestions.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

@ApiTags('Kitchen · Ads Suggestions')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/ads/suggestions')
export class AdsSuggestionsController {
  constructor(private readonly adsSuggestionsService: AdsSuggestionsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate (or re-fetch today’s already-generated) AI optimization suggestions',
    description: 'Capped to one real Gemini call per kitchen per IST calendar day — calling this again the same day returns the same batch.',
  })
  @ApiEnvelopeArray(CampaignSuggestionDto)
  @ApiEnvelopeError(400, 'Run at least one active ad campaign before generating suggestions')
  async generate(@CurrentKitchenAccount() account: KitchenAccount) {
    return { message: 'Suggestions generated', data: await this.adsSuggestionsService.generate(account.id) };
  }

  @Get()
  @ApiOperation({ summary: 'Your AI optimization suggestions' })
  @ApiEnvelope(SuggestionListDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: ListSuggestionsQueryDto) {
    return {
      message: 'Suggestions fetched',
      data: await this.adsSuggestionsService.list(account.id, query.status, query.q, query.page, query.limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single suggestion — impact, AI reasoning, applied changes' })
  @ApiEnvelope(CampaignSuggestionDto)
  async findOne(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Suggestion fetched', data: await this.adsSuggestionsService.findOne(account.id, id) };
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a suggestion — mechanically actionable types really change something, others just acknowledge' })
  @ApiEnvelope(CampaignSuggestionDto)
  @ApiEnvelopeError(400, 'Cannot apply a suggestion that is already APPLIED/DISMISSED, or insufficient wallet balance')
  async apply(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Suggestion applied', data: await this.adsSuggestionsService.apply(account.id, id) };
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a suggestion' })
  @ApiEnvelope(CampaignSuggestionDto)
  async dismiss(@CurrentKitchenAccount() account: KitchenAccount, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Suggestion dismissed', data: await this.adsSuggestionsService.dismiss(account.id, id) };
  }
}
