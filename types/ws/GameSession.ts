import { GameStatus } from './GameStatus.js';
import { GameType } from '../enums/GameType.js';
import { FlatQuestion } from './FlatQuestion.js';

export type Question = FlatQuestion;

export interface CustomQuestionEntry {
  entity: Question;
  questionType: string;
}

export interface GameSession {
  gameId: string,
  gameType: GameType,
  status: GameStatus,
  hostId: string,
  modeIds: string[],
  locale: string,
  previousQuestionsIds: string[],
  currentQuestion: Question | null;
  currentUserTargetId: string | null;
  currentUserMentionedId: string | null;
  customQuestionsPool: CustomQuestionEntry[];
  remainingCustomQuestions: CustomQuestionEntry[];
  quizzDifficulties?: string[];
  questionStartedAt: number | null;
}