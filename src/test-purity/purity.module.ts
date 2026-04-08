import { Module } from '@nestjs/common';
import { Purity } from './entities/purity.entity.js';

@Module({
  imports: [Purity],
  controllers: [],
  providers: [],
  exports: []
})
export class PurityModule {}