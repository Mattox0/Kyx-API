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
import { TenButTranslation } from './ten-but-translation.entity.js';
import { Gender } from '../../../types/enums/Gender.js';

@Entity('ten-but')
export class TenBut extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'enum', enum: Gender, nullable: true, default: null })
  mentionedUserGender: Gender | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @OneToMany(() => TenButTranslation, (t) => t.tenBut)
  translations: TenButTranslation[];
}
