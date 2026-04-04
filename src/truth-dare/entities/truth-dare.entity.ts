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
import { ChallengeType } from '../../../types/enums/TruthDareChallengeType.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { TruthDareTranslation } from './truth-dare-translation.entity.js';

@Entity('truth-dare')
export class TruthDare extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: false,
    default: Gender.ALL,
  })
  gender: Gender;

  @Column({
    type: 'enum',
    enum: ChallengeType,
    nullable: false,
    default: ChallengeType.DARE,
  })
  type: ChallengeType;

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

  @OneToMany(() => TruthDareTranslation, (t) => t.truthDare)
  translations: TruthDareTranslation[];
}
