import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mode } from './entities/mode.entity.js';
import { ModeTranslation } from './entities/mode-translation.entity.js';
import { ModeController } from './controllers/mode.controller.js';
import { ModeService } from './service/mode.service.js';
import { TruthDare } from '../truth-dare/entities/truth-dare.entity.js';
import { Prefer } from '../prefer/entities/prefer.entity.js';
import { NeverHave } from '../never-have/entities/never-have.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Mode, ModeTranslation, TruthDare, Prefer, NeverHave])],
  controllers: [ModeController],
  providers: [ModeService],
  exports: [ModeService],
})
export class ModeModule {}
