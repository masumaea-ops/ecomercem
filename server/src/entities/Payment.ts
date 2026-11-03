import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Order } from './Order';
import { User } from './User';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.payments)
  order!: Order;

  @Column('decimal', { precision: 16, scale: 2 })
  amount!: number;

  @Column()
  method!: string; // CASH, MPESA, CHEQUE, BANK_TRANSFER

  @Column({ nullable: true })
  reference?: string; // Cheque No, M-Pesa Code

  @Column('text', { nullable: true })
  notes?: string;

  @ManyToOne(() => User, { nullable: true })
  recordedBy?: User;

  @CreateDateColumn()
  date!: Date;
}