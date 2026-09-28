import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenReelsService } from './kitchen-reels.service';
import { SetReelSponsoredDto } from './dto/kitchen-reels-admin.dto';
import { KitchenReelDto } from './dto/kitchen-reels.response.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../../common/guards/admin-secret.guard';
import { ApiEnvelope } from '../../../../common/decorators/api-envelope.decorator';

/**
 * V0 ops tool — same shared-secret gate as `FssaiAssistanceAdminController`.
 * `isSponsored` is a bare promotional flag: no self-serve toggle anywhere on
 * the partner-facing controller, and no spend/billing tracking exists.
 */
@ApiTags('Kitchen · Reels Admin (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/reels')
export class KitchenReelsAdminController {
  constructor(private readonly kitchenReelsService: KitchenReelsService) {}

  @Patch(':id/sponsor')
  @ApiOperation({ summary: 'Set/unset a reel as sponsored (ops-only promotional flag)' })
  @ApiEnvelope(KitchenReelDto)
  async setSponsored(@Param('id') id: string, @Body() dto: SetReelSponsoredDto) {
    return {
      message: dto.isSponsored ? 'Reel marked as sponsored' : 'Reel unmarked as sponsored',
      data: await this.kitchenReelsService.adminSetSponsored(id, dto.isSponsored),
    };
  }
}
