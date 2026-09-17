import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAdminService } from './kitchen-admin.service';
import { ListKitchenAccountsQueryDto, RejectKitchenAccountDto } from './dto/kitchen-admin.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../common/guards/admin-secret.guard';
import { ApiEnvelope } from '../../../common/decorators/api-envelope.decorator';
import { OnboardingStatusDto } from '../onboarding/dto/onboarding.response.dto';

/**
 * V0 ops tool — a real admin panel/auth system doesn't exist yet, so this is
 * gated by a single shared secret (ADMIN_SECRET) instead of a user session.
 * Exists because kitchens reaching UNDER_REVIEW in production previously had
 * no path forward at all: the dev-only "simulate approve" shortcut is
 * correctly disabled once NODE_ENV=production, and nothing real replaced it.
 */
@ApiTags('Kitchen · Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/kitchen-accounts')
export class KitchenAdminController {
  constructor(private readonly adminService: KitchenAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List kitchen accounts by status (defaults to the UNDER_REVIEW approval queue)' })
  async list(@Query() query: ListKitchenAccountsQueryDto) {
    const accounts = await this.adminService.listAccounts(query.status);
    return { message: `${accounts.length} account(s)`, data: accounts };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a kitchen — goes live and can accept orders immediately' })
  @ApiEnvelope(OnboardingStatusDto)
  async approve(@Param('id') id: string) {
    return { message: 'Application approved', data: await this.adminService.approve(id) };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a kitchen — sends them back to onboarding with your reason shown in the app' })
  @ApiEnvelope(OnboardingStatusDto)
  async reject(@Param('id') id: string, @Body() dto: RejectKitchenAccountDto) {
    return { message: 'Application rejected', data: await this.adminService.reject(id, dto.reason) };
  }
}
