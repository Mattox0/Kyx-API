import { GameStatus } from './GameStatus.js';
import { GameType } from '../enums/GameType.js';
import { NeverHave } from '../../src/never-have/entities/never-have.entity.js';
import { Prefer } from '../../src/prefer/entities/prefer.entity.js';
import { TruthDare } from '../../src/truth-dare/entities/truth-dare.entity.js';

export type Question = NeverHave | Prefer | TruthDare

export interface GameSession {
  gameId: string,
  gameType: GameType,
  status: GameStatus,
  hostId: string,
  modeIds: string[]
  previousQuestionsIds: string[],
  currentQuestion: Question | null;
  currentUserTargetId: string | null;
}