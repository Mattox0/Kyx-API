import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Report } from '../../report/entities/report.entity.js';
import { Suggestion } from '../../suggestion/entities/suggestion.entity.js';
import { Gender } from '../../../types/enums/Gender.js';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  name?: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  // for better auth schema, default true
  @Column({ type: 'boolean', default: true })
  emailVerified: boolean;

  // for better auth schema
  @Column({ type: 'varchar', nullable: true })
  image?: string;

  @Column({ type: 'enum', enum: Gender, default: Gender.MAN })
  gender: Gender;

  @Column({ type: 'jsonb', nullable: true })
  avatarOptions?: Record<string, unknown>;

  @Column({ type: 'integer', default: 0 })
  coins: number;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];

  @OneToMany(() => Suggestion, (suggestion) => suggestion.user)
  suggestions: Suggestion[];
}
