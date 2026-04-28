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
import { QuizzQuestion } from './quizz-question.entity.js';

@Entity('quizz-question-translation')
@Unique(['quizzQuestion', 'locale'])
@Index(['quizzQuestion', 'locale'])
export class QuizzQuestionTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizzQuestion, (q) => q.translations, { onDelete: 'CASCADE' })
  quizzQuestion: Relation<QuizzQuestion>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  text: string;
}
