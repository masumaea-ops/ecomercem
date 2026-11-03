import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Customer } from './Customer';
import { User } from './User';
import { Order } from './Order';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED' // New status
}

export enum QuoteType {
  STANDARD = 'STANDARD',
  SOURCING = 'SOURCING'
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  quoteNumber!: string; 

  @ManyToOne(() => Customer, (customer) => customer.quotes)
  customer!: Customer;

  @ManyToOne(() => User, { nullable: true })
  createdBy!: User;

  // Link to the resulting Order once converted
  @OneToOne(() => Order, { nullable: true })
  @JoinColumn()
  convertedOrder?: Order;

  @Column('json')
  items!: { productId?: string; name: string; quantity: number; unitPrice: number; total: number }[];

  @Column({ nullable: true })
  vin?: string; 

  @Column('decimal', { precision: 16, scale: 2 })
  subtotal!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  tax!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  total!: number;

  @Column({
    type: 'simple-enum',
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT
  })
  status!: QuoteStatus;

  @Column({
    type: 'simple-enum',
    enum: QuoteType,
    default: QuoteType.STANDARD
  })
  requestType!: QuoteType;

  @Column({ type: 'date', nullable: true })
  validUntil?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}