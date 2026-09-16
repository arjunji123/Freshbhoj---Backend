import { Module } from '@nestjs/common';
import { KitchenUploadController } from './kitchen-upload.controller';
import { UploadModule } from '../../../../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [KitchenUploadController],
})
export class KitchenUploadModule {}
