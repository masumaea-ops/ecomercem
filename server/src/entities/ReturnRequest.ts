import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Order } from './Order';
import { User } from './User';
import { ReturnItem } from './ReturnItem';

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export enum ReturnType {
  REFUND = 'REFUND',
  EXCHANGE = 'EXCHANGE',
  STORE_CREDIT = 'STORE_CREDIT'
}

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  rmaNumber!: string;

  @ManyToOne(() => Order)
  order!: Order;

  @ManyToOne(() => User)
  user!: User;

  @Column({
    type: 'simple-enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING
  })
  status!: ReturnStatus;

  @Column({
    type: 'simple-enum',
    enum: ReturnType,
    default: ReturnType.REFUND
  })
  type!: ReturnType;

  @Column('text', { nullable: true })
  reason?: string;

  @Column('text', { nullable: true })
  adminNotes?: string;

  @OneToMany(() => ReturnItem, (item) => item.returnRequest, { cascade: true })
  items!: ReturnItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
