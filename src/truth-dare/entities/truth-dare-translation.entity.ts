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
import { TruthDare } from './truth-dare.entity.js';

@Entity('truth-dare-translation')
@Unique(['truthDare', 'locale'])
@Index(['truthDare', 'locale'])
export class TruthDareTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TruthDare, (td) => td.translations, { onDelete: 'CASCADE' })
  truthDare: Relation<TruthDare>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  question: string;
}
