import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purity } from './entities/purity.entity.js';
import { PurityTranslation } from './entities/purity-translations.entity.js';
import { PurityAnswer } from './entities/purity-answer.entity.js';
import { PurityAnswerTranslation } from './entities/purity-answer-translation.entity.js';
import { PurityService } from './service/purity.service.js';
import { PurityController } from './controllers/purity.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Purity, PurityTranslation, PurityAnswer, PurityAnswerTranslation])],
  controllers: [PurityController],
  providers: [PurityService],
  exports: [PurityService],
})
export class PurityModule {}
