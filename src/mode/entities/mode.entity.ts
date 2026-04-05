import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameType } from '../../../types/enums/GameType.js';
import { Suggestion } from '../../suggestion/entities/suggestion.entity.js';
import { ModeTranslation } from './mode-translation.entity.js';

@Entity("mode")
export class Mode extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({
    type: 'enum',
    enum: GameType,
  })
  gameType: GameType;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @OneToMany(() => ModeTranslation, (t) => t.mode)
  translations: ModeTranslation[];

  @OneToMany(() => Suggestion, (suggestion) => suggestion.mode)
  suggestions: Suggestion[]
}
