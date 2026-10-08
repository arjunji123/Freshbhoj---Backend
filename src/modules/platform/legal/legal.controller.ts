import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { LEGAL_DOCUMENTS } from './legal.constants';
import { LegalDocumentDto } from './dto/legal.response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { ApiEnvelope, ApiEnvelopeArray, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Platform · Legal')
@Controller('legal')
export class LegalController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Every legal document (Terms, Privacy, Content Policy) with its sections' })
  @ApiEnvelopeArray(LegalDocumentDto)
  list() {
    return { message: 'Legal documents fetched', data: Object.values(LEGAL_DOCUMENTS) };
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'One legal document' })
  @ApiParam({ name: 'key', enum: ['terms', 'privacy', 'content'] })
  @ApiEnvelope(LegalDocumentDto)
  @ApiEnvelopeError(404, 'Unknown document')
  getOne(@Param('key') key: string) {
    const doc = (LEGAL_DOCUMENTS as Record<string, (typeof LEGAL_DOCUMENTS)[keyof typeof LEGAL_DOCUMENTS]>)[key];
    if (!doc) throw new NotFoundException('That document does not exist');
    return { message: 'Legal document fetched', data: doc };
  }
}
