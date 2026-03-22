import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity("suggestion")
export class Suggestion extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  content: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'accepted' | 'refused';

  @Column({ type: 'varchar', nullable: true, default: null })
  adminComment: string | null;

  @ManyToOne(() => Mode, { onDelete: 'CASCADE' })
  mode: Relation<Mode>;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  user: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
