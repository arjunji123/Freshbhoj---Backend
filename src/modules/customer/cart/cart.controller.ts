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
import { CartService } from './cart.service';
import { AddCartItemDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CartCountDto, CartDto } from './dto/cart.response.dto';
import { ApiEnvelope, ApiEnvelopeError } from '../../../common/decorators/api-envelope.decorator';

@ApiTags('Customer · Cart')
@ApiBearerAuth('JWT-auth')
@Controller('customer/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Current cart with live pricing and checkout blockers',
    description:
      'Prices are computed server-side on every read, so a meal that was repriced or went unavailable is reflected immediately. `checkout.canCheckout` is the only flag the client needs.',
  })
  @ApiEnvelope(CartDto)
  async get(@CurrentUser() user: User) {
    return { message: 'Cart fetched', data: await this.cartService.getCart(user.id) };
  }

  @Get('count')
  @ApiOperation({ summary: 'Cart item count for the nav badge' })
  @ApiEnvelope(CartCountDto)
  async count(@CurrentUser() user: User) {
    return { message: 'Cart count fetched', data: await this.cartService.getCount(user.id) };
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a meal to the cart',
    description:
      'A cart holds meals from one kitchen only. Adding from a different kitchen returns 409 with `code: CART_KITCHEN_CONFLICT`; resend with `replaceCart: true` to start fresh.',
  })
  @ApiEnvelope(CartDto, { description: 'The full cart after the add' })
  @ApiEnvelopeError(400, 'Meal unavailable, or an add-on that is not offered')
  @ApiEnvelopeError(404, 'Meal not found')
  @ApiEnvelopeError(409, 'CART_KITCHEN_CONFLICT — cart already holds items from another kitchen')
  async addItem(@CurrentUser() user: User, @Body() dto: AddCartItemDto) {
    return { message: 'Added to cart', data: await this.cartService.addItem(user.id, dto) };
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Change quantity (0 removes the line)' })
  @ApiEnvelope(CartDto)
  @ApiEnvelopeError(404, 'Cart item not found')
  async updateItem(
    @CurrentUser() user: User,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return { message: 'Cart updated', data: await this.cartService.updateItem(user.id, itemId, dto) };
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove a line from the cart' })
  @ApiEnvelope(CartDto)
  @ApiEnvelopeError(404, 'Cart item not found')
  async removeItem(@CurrentUser() user: User, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return { message: 'Item removed', data: await this.cartService.removeItem(user.id, itemId) };
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiEnvelope(CartDto)
  async clear(@CurrentUser() user: User) {
    return { message: 'Cart cleared', data: await this.cartService.clear(user.id) };
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply a coupon code',
    description: 'The 400 message is written for the user and can be shown verbatim under the field.',
  })
  @ApiEnvelope(CartDto)
  @ApiEnvelopeError(400, 'Coupon invalid, expired, already used, or below the minimum order value')
  async applyCoupon(@CurrentUser() user: User, @Body() dto: ApplyCouponDto) {
    return { message: 'Coupon applied', data: await this.cartService.applyCoupon(user.id, dto.code) };
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove the applied coupon' })
  @ApiEnvelope(CartDto)
  async removeCoupon(@CurrentUser() user: User) {
    return { message: 'Coupon removed', data: await this.cartService.removeCoupon(user.id) };
  }
}
