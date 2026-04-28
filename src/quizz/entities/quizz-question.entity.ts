import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { QuizzDifficulty } from '../../../types/enums/QuizzDifficulty.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { QuizzQuestionTranslation } from './quizz-question-translation.entity.js';
import { QuizzAnswer } from './quizz-answer.entity.js';

@Entity('quizz-question')
export class QuizzQuestion extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: QuizzDifficulty,
    default: QuizzDifficulty.MEDIUM,
  })
  difficulty: QuizzDifficulty;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @OneToMany(() => QuizzQuestionTranslation, (t) => t.quizzQuestion)
  translations: QuizzQuestionTranslation[];

  @OneToMany(() => QuizzAnswer, (a) => a.quizzQuestion)
  answers: QuizzAnswer[];
}
