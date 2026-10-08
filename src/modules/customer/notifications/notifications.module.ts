import { Module } from '@nestjs/common';
import { CustomerNotificationsController } from './notifications.controller';
import { CustomerNotificationsService } from './notifications.service';

@Module({
  controllers: [CustomerNotificationsController],
  providers: [CustomerNotificationsService],
})
export class CustomerNotificationsModule {}
