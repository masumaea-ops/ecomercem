import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Branch } from './Branch';
import { ColumnNumericTransformer } from '../utils/transformer';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  B2B_USER = 'B2B_USER',
  DEALER = 'DEALER',
  INDIVIDUAL_SELLER = 'INDIVIDUAL_SELLER',
  BUYER = 'BUYER',
  IMPORT_USER = 'IMPORT_USER'
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  fullName!: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.CASHIER
  })
  role!: UserRole;

  @Column({
    type: 'simple-enum',
    enum: UserStatus,
    default: UserStatus.APPROVED // Default to APPROVED for staff created by admin
  })
  status!: UserStatus;

  @Column('decimal', { precision: 5, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  discountPercentage: number = 0;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ nullable: true })
  taxId?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @ManyToOne(() => Branch, (branch) => branch.users, { nullable: true })
  branch?: Branch;

  @Column({ default: true })
  isActive: boolean = true;

  @Column({ nullable: true, select: false })
  resetPasswordToken?: string;

  @Column({ type: 'datetime', nullable: true, select: false })
  resetPasswordExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}