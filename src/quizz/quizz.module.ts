import { Module } from '@nestjs/common';
import { QuizzController } from './controllers/quizz.controller.js';
import { QuizzQuestion } from './entities/quizz-question.entity.js';
import { QuizzService } from './service/quizz.service.js';
import { GameService } from '../game/service/game.service.js';

@Module({
  imports: [QuizzQuestion],
  controllers: [QuizzController],
  providers: [QuizzService, GameService],
  exports: [QuizzService],
})
export class QuizzModule {}
