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
import { PurityAnswer } from './purity-answer.entity.js';

@Entity('purity-answer-translation')
@Unique(['answer', 'locale'])
@Index(['answer', 'locale'])
export class PurityAnswerTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PurityAnswer, (answer) => answer.translations, { onDelete: 'CASCADE' })
  answer: Relation<PurityAnswer>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  text: string;
}
