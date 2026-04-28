import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { QuizzQuestion } from './quizz-question.entity.js';
import { QuizzAnswerTranslation } from './quizz-answer-translation.entity.js';

@Entity('quizz-answer')
export class QuizzAnswer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QuizzQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  quizzQuestion: Relation<QuizzQuestion>;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @OneToMany(() => QuizzAnswerTranslation, (t) => t.quizzAnswer)
  translations: QuizzAnswerTranslation[];
}
