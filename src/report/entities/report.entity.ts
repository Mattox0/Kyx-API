import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { TruthDare } from '../../truth-dare/entities/truth-dare.entity.js';
import { NeverHave } from '../../never-have/entities/never-have.entity.js';
import { Prefer } from '../../prefer/entities/prefer.entity.js';
import { MostLikelyTo } from '../../most-likely-to/entities/most-likely-to.entity.js';
import { TenBut } from '../../ten-but/entities/ten-but.entity.js';
import { QuizzQuestion } from '../../quizz/entities/quizz-question.entity.js';
import { ReportReason } from '../../../types/enums/ReportReason.js';

@Entity("report")
export class Report extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: 'varchar', nullable: false })
  comment: string;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @ManyToOne('User', { onDelete: 'CASCADE', nullable: true })
  user: Relation<User>;

  @ManyToOne(() => TruthDare, { nullable: true, onDelete: 'CASCADE' })
  truthDare: TruthDare | null;

  @ManyToOne(() => NeverHave, { nullable: true, onDelete: 'CASCADE' })
  neverHave: NeverHave | null;

  @ManyToOne(() => Prefer, { nullable: true, onDelete: 'CASCADE' })
  prefer: Prefer | null;

  @ManyToOne(() => MostLikelyTo, { nullable: true, onDelete: 'CASCADE' })
  mostLikelyTo: MostLikelyTo | null;

  @ManyToOne(() => TenBut, { nullable: true, onDelete: 'CASCADE' })
  tenBut: TenBut | null;

  @ManyToOne(() => QuizzQuestion, { nullable: true, onDelete: 'CASCADE' })
  quizzQuestion: QuizzQuestion | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}