import { Module } from '@nestjs/common';
import { RevenueCatController } from './revenuecat.controller.js';
import { RevenueCatService } from './revenuecat.service.js';

@Module({
  controllers: [RevenueCatController],
  providers: [RevenueCatService],
})
export class RevenueCatModule {}
