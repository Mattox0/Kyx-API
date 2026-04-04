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
import { Prefer } from './prefer.entity.js';

@Entity('prefer-translation')
@Unique(['prefer', 'locale'])
@Index(['prefer', 'locale'])
export class PreferTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Prefer, (p) => p.translations, { onDelete: 'CASCADE' })
  prefer: Relation<Prefer>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  choiceOne: string;

  @Column({ type: 'text' })
  choiceTwo: string;
}
