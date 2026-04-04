import { Gender } from '../enums/Gender.js';
import { ChallengeType } from '../enums/TruthDareChallengeType.js';
import { GameType } from '../enums/GameType.js';

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

export type FlatQuestion = FlatNeverHave | FlatPrefer | FlatTruthDare;
