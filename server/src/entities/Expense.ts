import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { Branch } from './Branch';

export enum ExpenseCategory {
  RENT = 'RENT',
  SALARIES = 'SALARIES',
  UTILITIES = 'UTILITIES',
  MARKETING = 'MARKETING',
  LOGISTICS = 'LOGISTICS',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER'
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('decimal', { precision: 16, scale: 2 })
  amount!: number;

  @Column({
    type: 'simple-enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER
  })
  category!: ExpenseCategory;

  @Column({ type: 'date' })
  date!: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @ManyToOne(() => User)
  recordedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}