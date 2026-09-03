import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { PaymentMethodsService } from './payment-methods.service';
import { SaveCardDto } from './dto/payment-method.dto';
import { DeletedCardDto, SavedCardDto } from './dto/payment-method.response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Payment Methods')
@ApiBearerAuth('JWT-auth')
@Controller('customer/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'Saved cards (default first)' })
  @ApiEnvelopeArray(SavedCardDto)
  async list(@CurrentUser() user: User) {
    return { message: 'Cards fetched', data: await this.paymentMethodsService.findAll(user.id) };
  }

  @Post()
  @ApiOperation({
    summary: 'Save a tokenised card',
    description:
      'Send the gateway’s network token plus the display fragments. We never receive or store a card number, CVV or full expiry — that keeps FreshBhoj out of PCI-DSS scope.',
  })
  @ApiEnvelope(SavedCardDto, { status: 201, description: 'Card saved' })
  @ApiEnvelopeError(400, 'Validation failed')
  async save(@CurrentUser() user: User, @Body() dto: SaveCardDto) {
    return { message: 'Card saved', data: await this.paymentMethodsService.save(user.id, dto) };
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pre-select this card at checkout' })
  @ApiEnvelope(SavedCardDto)
  @ApiEnvelopeError(404, 'Card not found')
  async setDefault(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return {
      message: 'Default card updated',
      data: await this.paymentMethodsService.setDefault(user.id, id),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a saved card' })
  @ApiEnvelope(DeletedCardDto)
  @ApiEnvelopeError(403, 'This card belongs to another user')
  @ApiEnvelopeError(404, 'Card not found')
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Card removed', data: await this.paymentMethodsService.remove(user.id, id) };
  }
}
