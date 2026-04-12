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
import { MostLikelyTo } from './most-likely-to.entity.js';

@Entity('most-likely-to-translation')
@Unique(['mostLikelyTo', 'locale'])
@Index(['mostLikelyTo', 'locale'])
export class MostLikelyToTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MostLikelyTo, (m) => m.translations, { onDelete: 'CASCADE' })
  mostLikelyTo: Relation<MostLikelyTo>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  question: string;
}
