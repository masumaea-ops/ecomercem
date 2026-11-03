import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Order } from './Order';

@Entity('mpesa_transactions')
export class MpesaTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.mpesaTransactions)
  order!: Order;

  @Column()
  merchantRequestID!: string;

  @Index({ unique: true })
  @Column()
  checkoutRequestID!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  phoneNumber!: string;

  @Column()
  status!: string; // PENDING, COMPLETED, FAILED

  @Column({ nullable: true })
  mpesaReceiptNumber?: string;

  @Column({ nullable: true })
  resultDesc?: string;

  @Column({ nullable: true })
  siteSource?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
