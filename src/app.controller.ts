import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { HealthDto } from './common/dto/misc.response.dto';
import { ApiEnvelope } from './common/decorators/api-envelope.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiEnvelope(HealthDto)
  health() {
    return this.appService.getHealth();
  }
}
