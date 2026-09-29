import { Module } from '@nestjs/common';
import { CustomerWalletController } from './wallet.controller';
import { CustomerWalletAdminController } from './wallet-admin.controller';
import { CustomerWalletService } from './wallet.service';

@Module({
  controllers: [CustomerWalletController, CustomerWalletAdminController],
  providers: [CustomerWalletService],
  exports: [CustomerWalletService],
})
export class CustomerWalletModule {}
