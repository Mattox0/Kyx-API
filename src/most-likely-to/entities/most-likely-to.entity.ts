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
import { Gender } from '../../../types/enums/Gender.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { MostLikelyToTranslation } from './most-likely-to-translation.entity.js';

@Entity('most-likely-to')
export class MostLikelyTo extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    default: null,
  })
  mentionedUserGender: Gender | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @OneToMany(() => MostLikelyToTranslation, (t) => t.mostLikelyTo)
  translations: MostLikelyToTranslation[];
}
