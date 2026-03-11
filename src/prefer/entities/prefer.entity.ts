import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Gender } from '../../../types/enums/Gender.js';
import { Mode } from '../../mode/entities/mode.entity.js';

@Entity("prefer")
@Unique(['choiceOne', 'choiceTwo', 'mode'])
export class Prefer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: false, nullable: false })
  choiceOne: string;

  @Column({ type: 'varchar', unique: false, nullable: false })
  choiceTwo: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    default: null,
  })
  mentionedUserOneGender: Gender | null;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    default: null,
  })
  mentionedUserTwoGender: Gender | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedDate: Date;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;
}
