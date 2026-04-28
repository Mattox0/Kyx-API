import { Gender } from '../enums/Gender.js';
import { ChallengeType } from '../enums/TruthDareChallengeType.js';
import { GameType } from '../enums/GameType.js';
import { QuizzDifficulty } from '../enums/QuizzDifficulty.js';

export interface FlatMode {
  id: string;
  icon: string | null;
  gameType: GameType;
  name: string;
  description: string;
}

interface FlatBase {
  id: string;
  mode: FlatMode | null;
  createdDate: Date;
  updatedDate: Date;
  mentionedUserGender: Gender | null;
}

export interface FlatNeverHave extends FlatBase {
  question: string;
}

export interface FlatPrefer extends FlatBase {
  choiceOne: string;
  choiceTwo: string;
}

export interface FlatTruthDare extends FlatBase {
  question: string;
  gender: Gender;
  type: ChallengeType;
}

export interface FlatMostLikelyTo extends FlatBase {
  question: string;
}

export interface FlatTenBut extends FlatBase {
  score: number;
  question: string;
}

export interface FlatQuizzAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface FlatQuizz extends FlatBase {
  question: string;
  difficulty: QuizzDifficulty;
  answers: FlatQuizzAnswer[];
}

export type FlatQuestion = FlatNeverHave | FlatPrefer | FlatTruthDare | FlatMostLikelyTo | FlatTenBut | FlatQuizz;
