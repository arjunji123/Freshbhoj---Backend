import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CuisinesService } from './cuisines.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AreaSearchQueryDto, ServiceabilityQueryDto } from './dto/catalog.dto';
import {
  GoalTagDto,
  MealCategoryDto,
  ServiceabilityResultDto,
  ServiceableAreaDto,
} from './dto/catalog.response.dto';
import { CuisineDto } from './dto/cuisines.response.dto';
import { ApiEnvelope, ApiEnvelopeArray } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Discovery · Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly cuisinesService: CuisinesService,
  ) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Meal categories (Breakfast, Lunch, Dinner, Healthy Snacks)' })
  @ApiEnvelopeArray(MealCategoryDto, { description: 'Categories, in display order' })
  async categories() {
    return { message: 'Categories fetched', data: await this.catalogService.getCategories() };
  }

  @Public()
  @Get('cuisines')
  @ApiOperation({
    summary: 'Cuisines — the Home pill row and cover-flow carousel',
    description:
      'A cuisine is a style of food (Thali, Biryani); a category is a time slot (Lunch, Dinner). Home shows both, so they are separate lists.',
  })
  @ApiEnvelopeArray(CuisineDto)
  async cuisines() {
    return { message: 'Cuisines fetched', data: await this.cuisinesService.findAll() };
  }

  @Public()
  @Get('goal-tags')
  @ApiOperation({ summary: 'Goal-based quick filters shown as chips on Home' })
  @ApiEnvelopeArray(GoalTagDto, { description: 'Goal chips with labels, icons and descriptions' })
  goalTags() {
    return { message: 'Goal tags fetched', data: this.catalogService.getGoalTags() };
  }

  @Public()
  @Get('areas')
  @ApiOperation({ summary: 'Serviceable localities for the launch city' })
  @ApiEnvelopeArray(ServiceableAreaDto, { description: 'Localities we currently deliver to' })
  async areas(@Query() query: AreaSearchQueryDto) {
    return { message: 'Areas fetched', data: await this.catalogService.getServiceableAreas(query) };
  }

  @Public()
  @Get('serviceability')
  @ApiOperation({
    summary: 'Check whether a locality or pincode is serviceable',
    description:
      'Never 404s. An unserviceable area returns serviceable:false plus nearby areas, so the app can show a warm "not here yet" state instead of a dead end.',
  })
  @ApiEnvelope(ServiceabilityResultDto)
  async serviceability(@Query() query: ServiceabilityQueryDto) {
    return { message: 'Serviceability checked', data: await this.catalogService.checkServiceability(query) };
  }
}
