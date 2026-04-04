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
import { NeverHave } from './never-have.entity.js';

@Entity('never-have-translation')
@Unique(['neverHave', 'locale'])
@Index(['neverHave', 'locale'])
export class NeverHaveTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NeverHave, (nh) => nh.translations, { onDelete: 'CASCADE' })
  neverHave: Relation<NeverHave>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  question: string;
}
