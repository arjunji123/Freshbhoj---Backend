import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SupportService } from './support.service';
import { FaqQueryDto, UpdateNotificationPreferencesDto } from './dto/support.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  FaqItemDto,
  NotificationPreferencesDto,
  ProfileStatsDto,
  SupportContactDto,
} from './dto/support.response.dto';
import { ApiEnvelope, ApiEnvelopeArray } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Platform · Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Public()
  @Get('contact')
  @ApiOperation({ summary: 'Support contact channels (WhatsApp deep link, email, hours)' })
  @ApiEnvelope(SupportContactDto)
  contact() {
    return { message: 'Contact channels fetched', data: this.supportService.getContactChannels() };
  }

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'FAQ accordion content' })
  @ApiEnvelopeArray(FaqItemDto)
  async faqs(@Query() query: FaqQueryDto) {
    return { message: 'FAQs fetched', data: await this.supportService.getFaqs(query) };
  }

  @Get('notification-preferences')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Notification settings (created on first read)' })
  @ApiEnvelope(NotificationPreferencesDto)
  async getPreferences(@CurrentUser() user: User) {
    return {
      message: 'Preferences fetched',
      data: await this.supportService.getNotificationPreferences(user.id),
    };
  }

  @Patch('notification-preferences')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiEnvelope(NotificationPreferencesDto)
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return {
      message: 'Preferences updated',
      data: await this.supportService.updateNotificationPreferences(user.id, dto),
    };
  }

  @Get('profile-stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Counts shown on the Profile header' })
  @ApiEnvelope(ProfileStatsDto)
  async stats(@CurrentUser() user: User) {
    return { message: 'Stats fetched', data: await this.supportService.getProfileStats(user.id) };
  }
}
