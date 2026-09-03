import { Module } from '@nestjs/common';
import { WebWaitlistController } from './web-waitlist.controller';
import { WebWaitlistService } from './web-waitlist.service';

@Module({
  controllers: [WebWaitlistController],
  providers: [WebWaitlistService],
  exports: [WebWaitlistService],
})
export class WebWaitlistModule {}
