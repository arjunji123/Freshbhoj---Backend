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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenAccount } from '@prisma/client';
import { KitchenMenuService } from './kitchen-menu.service';
import {
  MenuQueryDto,
  SetMealAvailabilityDto,
  UpdateMealDto,
  UpsertMealDto,
} from './dto/kitchen-menu.dto';
import { MealAvailabilityDto, MealMutationResultDto } from './dto/kitchen-menu.response.dto';
import { MealDetailDto } from '../../../discovery/meals/dto/meals.response.dto';
import { KitchenAuthGuard } from '../../../identity/kitchen-auth/guards/kitchen-auth.guard';
import { CurrentKitchenAccount } from '../../../identity/kitchen-auth/decorators/current-kitchen.decorator';
import {
  ApiEnvelope,
  ApiEnvelopeArray,
  ApiEnvelopeError,
} from '../../../../common/decorators/api-envelope.decorator';
import { KitchenScope } from '../../../../common/decorators/kitchen-scope.decorator';

/**
 * Full CRUD on the partner's own menu. Reuses `MealDetailDto` from the
 * customer-facing catalogue — a dish looks the same shape whether the kitchen
 * is editing it or a customer is browsing it, only the audience differs.
 */
@ApiTags('Kitchen · Menu')
@ApiBearerAuth('JWT-auth')
@UseGuards(KitchenAuthGuard)
@KitchenScope()
@Controller('partner/menu')
export class KitchenMenuController {
  constructor(private readonly kitchenMenuService: KitchenMenuService) {}

  @Get()
  @ApiOperation({ summary: 'Your full menu, including unpublished dishes' })
  @ApiEnvelopeArray(MealDetailDto)
  async list(@CurrentKitchenAccount() account: KitchenAccount, @Query() query: MenuQueryDto) {
    return {
      message: 'Menu fetched',
      data: await this.kitchenMenuService.list(account.id, query.includeUnavailable),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One dish, full detail' })
  @ApiEnvelope(MealDetailDto)
  @ApiEnvelopeError(403, 'This dish belongs to another kitchen')
  @ApiEnvelopeError(404, 'Dish not found')
  async findOne(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { message: 'Dish fetched', data: await this.kitchenMenuService.findOne(account.id, id) };
  }

  @Post()
  @ApiOperation({
    summary: 'Add a dish',
    description:
      'Upload images via POST /upload first and pass the URLs. Publishing (isAvailable: true) is refused without calories and protein set — that data is the platform’s core trust promise.',
  })
  @ApiEnvelope(MealDetailDto, { status: 201, description: 'Dish created' })
  @ApiEnvelopeError(400, 'Missing calories/protein while publishing, or onboarding not complete')
  async create(@CurrentKitchenAccount() account: KitchenAccount, @Body() dto: UpsertMealDto) {
    return { message: 'Dish added', data: await this.kitchenMenuService.create(account.id, dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a dish' })
  @ApiEnvelope(MealDetailDto)
  @ApiEnvelopeError(400, 'Missing calories/protein while publishing')
  @ApiEnvelopeError(403, 'This dish belongs to another kitchen')
  @ApiEnvelopeError(404, 'Dish not found')
  async update(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMealDto,
  ) {
    return { message: 'Dish updated', data: await this.kitchenMenuService.update(account.id, id, dto) };
  }

  @Patch(':id/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle a dish on/off without editing it' })
  @ApiEnvelope(MealAvailabilityDto)
  @ApiEnvelopeError(400, 'Missing calories/protein — cannot publish yet')
  async setAvailability(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMealAvailabilityDto,
  ) {
    return {
      message: 'Availability updated',
      data: await this.kitchenMenuService.setAvailability(account.id, id, dto.isAvailable),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a dish permanently' })
  @ApiEnvelope(MealMutationResultDto)
  @ApiEnvelopeError(403, 'This dish belongs to another kitchen')
  @ApiEnvelopeError(404, 'Dish not found')
  async remove(
    @CurrentKitchenAccount() account: KitchenAccount,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { message: 'Dish removed', data: await this.kitchenMenuService.remove(account.id, id) };
  }
}
