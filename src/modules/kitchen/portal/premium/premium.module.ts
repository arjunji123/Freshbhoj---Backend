import { Module } from '@nestjs/common';
import { PremiumController } from './premium.controller';
import { PremiumService } from './premium.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [PremiumController],
  providers: [PremiumService],
  exports: [PremiumService],
})
export class PremiumModule {}
