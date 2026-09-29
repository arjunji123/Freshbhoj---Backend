import { Module } from '@nestjs/common';
import { KitchenAdsController } from './kitchen-ads.controller';
import { KitchenAdsService } from './kitchen-ads.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [KitchenAdsController],
  providers: [KitchenAdsService],
  exports: [KitchenAdsService],
})
export class KitchenAdsModule {}
