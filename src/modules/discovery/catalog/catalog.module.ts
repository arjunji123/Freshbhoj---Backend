import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CuisinesService } from './cuisines.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CuisinesService],
  exports: [CatalogService, CuisinesService],
})
export class CatalogModule {}
