import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CouponDto } from '../../customer/cart/dto/cart.response.dto';
import { ApiEnvelopeArray } from '../../../common/decorators/api-envelope.decorator';
import { Public } from '../../../common/decorators/public.decorator';

class CouponListQueryDto {
  @ApiPropertyOptional({ example: 450, description: 'Current cart subtotal, to flag which offers apply' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  itemsTotal?: number;
}

@ApiTags('Platform · Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Offers available right now',
    description: 'Pass the cart subtotal to have each offer flagged with `isApplicable`.',
  })
  @ApiEnvelopeArray(CouponDto)
  async list(@Query() query: CouponListQueryDto) {
    return {
      message: 'Coupons fetched',
      data: await this.couponsService.listAvailable(query.itemsTotal ?? 0),
    };
  }
}
