import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EscalationStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ListBhojAiEscalationsQueryDto } from './dto/bhojai-admin.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { AdminSecretGuard } from '../../../../common/guards/admin-secret.guard';

/**
 * V0 ops tool — same shared-secret gate as every other admin controller in
 * this codebase. What `requestHumanEscalation` actually creates: a ticket
 * ops can see and close, not a real paging/notification system.
 */
@ApiTags('Kitchen · BhojAI Escalations (V0 ops tool)')
@ApiHeader({ name: 'x-admin-secret', required: true })
@Public()
@UseGuards(AdminSecretGuard)
@Controller('admin/bhojai-escalations')
export class BhojAiAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List escalations by status (defaults to OPEN)' })
  async list(@Query() query: ListBhojAiEscalationsQueryDto) {
    const escalations = await this.prisma.bhojAiEscalation.findMany({
      where: { status: query.status ?? EscalationStatus.OPEN },
      orderBy: { createdAt: 'asc' },
      include: { account: { select: { id: true, phone: true, ownerName: true } } },
    });
    return { message: `${escalations.length} escalation(s)`, data: escalations };
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Mark an escalation resolved' })
  async resolve(@Param('id') id: string) {
    const escalation = await this.prisma.bhojAiEscalation.update({
      where: { id },
      data: { status: EscalationStatus.RESOLVED, resolvedAt: new Date() },
    });
    return { message: 'Escalation resolved', data: escalation };
  }
}
