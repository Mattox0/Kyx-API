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
import { Mode } from './mode.entity.js';

@Entity('mode-translation')
@Unique(['mode', 'locale'])
@Index(['mode', 'locale'])
export class ModeTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Mode, (m) => m.translations, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;
}
