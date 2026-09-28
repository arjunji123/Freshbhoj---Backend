import { Module } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { PayoutsAdminController } from './payouts-admin.controller';
import { PayoutsService } from './payouts.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PayoutsController, PayoutsAdminController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
