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
import { NeverHaveTranslation } from './never-have-translation.entity.js';

@Entity('never-have')
export class NeverHave extends BaseEntity {
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

  @OneToMany(() => NeverHaveTranslation, (t) => t.neverHave)
  translations: NeverHaveTranslation[];
}
