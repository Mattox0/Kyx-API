import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Mode } from '../../mode/entities/mode.entity.js';
import { GameType } from '../../../types/enums/GameType.js';

@Entity('game')
export class Game extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: GameType })
  gameType: GameType;

  @ManyToMany(() => Mode, { eager: true })
  @JoinTable()
  modes: Mode[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creatorId' })
  creator: User | null;

  @Column({ type: 'boolean', default: true })
  isLocal: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;
}
