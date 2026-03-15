import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { WebWaitlistService } from './web-waitlist.service';
import { CreateWebUserDto, CreateWebKitchenDto } from './dto/web-waitlist.dto';

@ApiTags('Website Pre-Registration')
@Controller('web-waitlist')
export class WebWaitlistController {
  constructor(private readonly waitlistService: WebWaitlistService) {}

  @Public()
  @Post('user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register User from Website Landing Page' })
  @ApiResponse({ status: 201, description: 'User pre-registered successfully.' })
  @ApiBody({ type: CreateWebUserDto })
  async registerUser(@Body() dto: CreateWebUserDto) {
    const result = await this.waitlistService.registerUser(dto);
    return {
      message: 'Thank you for registering! We will notify you when we launch.',
      data: result,
    };
  }

  @Public()
  @Post('kitchen')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register Kitchen/Vendor from Website Landing Page' })
  @ApiResponse({ status: 201, description: 'Kitchen pre-registered successfully.' })
  @ApiBody({ type: CreateWebKitchenDto })
  async registerKitchen(@Body() dto: CreateWebKitchenDto) {
    const result = await this.waitlistService.registerKitchen(dto);
    return {
      message: 'Thank you for registering your kitchen! We will reach out soon.',
      data: result,
    };
  }
}
