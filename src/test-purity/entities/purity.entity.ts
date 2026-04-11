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
import { Mode } from '../../mode/entities/mode.entity.js';
import { PurityTranslation } from './purity-translations.entity.js';
import { PurityAnswer } from './purity-answer.entity.js';

@Entity('purity')
export class Purity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @OneToMany(() => PurityTranslation, (purityTranslation) => purityTranslation.purity)
  translations: PurityTranslation[];

  @OneToMany(() => PurityAnswer, (answer) => answer.purity)
  answers: PurityAnswer[];
}
