import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FssaiAssistanceService } from './fssai-assistance.service';
import { ApproveFssaiAssistanceDto, ListFssaiAssistanceQueryDto, RejectFssaiAssistanceDto } from './dto/fssai-assistance-admin.dto';
import { FssaiAssistanceStatusDto } from './dto/fssai-assistance.response.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../../common/guards/admin-secret.guard';
import { ApiEnvelope } from '../../../../common/decorators/api-envelope.decorator';

/**
 * V0 ops tool — same shared-secret gate as `KitchenAdminController`. FreshBhoj
 * staff move a request through the real government-filing stages here; there
 * is no real admin panel/auth system yet.
 */
@ApiTags('Kitchen · FSSAI Assistance Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/fssai-assistance-requests')
export class FssaiAssistanceAdminController {
  constructor(private readonly fssaiAssistanceService: FssaiAssistanceService) {}

  @Get()
  @ApiOperation({ summary: 'List requests by status (defaults to the in-progress queue)' })
  async list(@Query() query: ListFssaiAssistanceQueryDto) {
    const requests = await this.fssaiAssistanceService.adminList(query.status);
    return { message: `${requests.length} request(s)`, data: requests };
  }

  @Post(':id/file')
  @ApiOperation({ summary: 'Mark the government application as filed' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async file(@Param('id') id: string) {
    return { message: 'Application marked as filed', data: await this.fssaiAssistanceService.adminFile(id) };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve — records the issued licence number and validity' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async approve(@Param('id') id: string, @Body() dto: ApproveFssaiAssistanceDto) {
    return { message: 'FSSAI assistance request approved', data: await this.fssaiAssistanceService.adminApprove(id, dto) };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject — the partner sees your reason and can start a new request' })
  @ApiEnvelope(FssaiAssistanceStatusDto)
  async reject(@Param('id') id: string, @Body() dto: RejectFssaiAssistanceDto) {
    return { message: 'FSSAI assistance request rejected', data: await this.fssaiAssistanceService.adminReject(id, dto.reason) };
  }
}
