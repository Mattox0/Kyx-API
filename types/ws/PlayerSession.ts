import { Gender } from '../enums/Gender.js';

export interface AvatarOptions {
  hair?: string;
  hairColor?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
  skinColor?: string;
  glasses?: string;
}

export interface PlayerSession {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  avatarOptions?: AvatarOptions;
  gender: Gender;
  hasAnswered: boolean;
  answer: string | null;
}