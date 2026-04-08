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
import { Purity } from './purity.entity.js';

@Entity('purity-translation')
@Unique(['purity', 'locale'])
@Index(['purity', 'locale'])
export class PurityTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Purity, (purity) => purity.translations, { onDelete: 'CASCADE' })
  purity: Relation<Purity>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  question: string;
}
