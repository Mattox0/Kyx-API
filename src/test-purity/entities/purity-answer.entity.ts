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
import { Purity } from './purity.entity.js';
import { PurityAnswerTranslation } from './purity-answer-translation.entity.js';

@Entity('purity-answer')
export class PurityAnswer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', default: 0 })
  weight: number;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({ type: 'integer', default: 0 })
  skipCount: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Purity, (purity) => purity.answers, { onDelete: 'CASCADE' })
  purity: Relation<Purity>;

  @OneToMany(() => PurityAnswerTranslation, (t) => t.answer)
  translations: PurityAnswerTranslation[];
}
