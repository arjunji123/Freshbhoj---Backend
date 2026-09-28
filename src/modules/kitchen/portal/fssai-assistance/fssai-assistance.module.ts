import { Module } from '@nestjs/common';
import { FssaiAssistanceController } from './fssai-assistance.controller';
import { FssaiAssistanceAdminController } from './fssai-assistance-admin.controller';
import { FssaiAssistanceService } from './fssai-assistance.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FssaiAssistanceController, FssaiAssistanceAdminController],
  providers: [FssaiAssistanceService],
  exports: [FssaiAssistanceService],
})
export class FssaiAssistanceModule {}
