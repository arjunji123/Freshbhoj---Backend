import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AddressDto, DeletedAddressDto } from './dto/address.response.dto';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Addresses')
@ApiBearerAuth('JWT-auth')
@Controller('customer/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List saved delivery addresses (default first)' })
  @ApiEnvelopeArray(AddressDto)
  async list(@CurrentUser() user: User) {
    return { message: 'Addresses fetched', data: await this.addressesService.findAll(user.id) };
  }

  @Get('default')
  @ApiOperation({ summary: 'Address pre-selected at checkout' })
  @ApiEnvelope(AddressDto, { description: 'null when the user has saved none yet' })
  async getDefault(@CurrentUser() user: User) {
    return { message: 'Default address fetched', data: await this.addressesService.getDefault(user.id) };
  }

  @Post()
  @ApiOperation({
    summary: 'Add a new delivery address',
    description: 'The first address a user saves automatically becomes their default.',
  })
  @ApiEnvelope(AddressDto, { status: 201, description: 'Address created' })
  @ApiEnvelopeError(400, 'Validation failed (line1 too short, pincode not 6 digits, …)')
  async create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return { message: 'Address added', data: await this.addressesService.create(user.id, dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a saved address' })
  @ApiEnvelope(AddressDto)
  @ApiEnvelopeError(403, 'This address belongs to another user')
  @ApiEnvelopeError(404, 'Address not found')
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return { message: 'Address updated', data: await this.addressesService.update(user.id, id, dto) };
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make this the default address' })
  @ApiEnvelope(AddressDto)
  @ApiEnvelopeError(404, 'Address not found')
  async setDefault(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Default address updated', data: await this.addressesService.setDefault(user.id, id) };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a saved address',
    description: 'Deleting the default promotes the next most recent, so one always exists.',
  })
  @ApiEnvelope(DeletedAddressDto)
  @ApiEnvelopeError(404, 'Address not found')
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return { message: 'Address deleted', data: await this.addressesService.remove(user.id, id) };
  }
}
