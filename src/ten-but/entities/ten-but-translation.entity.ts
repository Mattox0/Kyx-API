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
import { TenBut } from './ten-but.entity.js';

@Entity('ten-but-translation')
@Unique(['tenBut', 'locale'])
@Index(['tenBut', 'locale'])
export class TenButTranslation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TenBut, (t) => t.translations, { onDelete: 'CASCADE' })
  tenBut: Relation<TenBut>;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  question: string;
}
