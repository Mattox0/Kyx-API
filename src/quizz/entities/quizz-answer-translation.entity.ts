import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { QuizzAnswer } from './quizz-answer.entity.js';

@Entity('quizz-answer-translation')
@Unique(['quizzAnswer', 'locale'])
@Index(['quizzAnswer', 'locale'])
export class QuizzAnswerTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizzAnswer, (a) => a.translations, { onDelete: 'CASCADE' })
  quizzAnswer: Relation<QuizzAnswer>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  text: string;
}
