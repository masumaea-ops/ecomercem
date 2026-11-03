import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Branch } from './Branch';
import { User } from './User';
import { Customer } from './Customer';
import { ColumnNumericTransformer } from '../utils/transformer';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  receiptNumber!: string;

  @ManyToOne(() => Branch, (branch) => branch.sales)
  branch!: Branch;

  @ManyToOne(() => User)
  cashier!: User;

  @ManyToOne(() => Customer, { nullable: true })
  customer?: Customer;

  @Column({ nullable: true })
  customerName?: string;

  @Column('decimal', { precision: 16, scale: 2, transformer: new ColumnNumericTransformer() })
  totalAmount!: number;

  @Column('decimal', { precision: 16, scale: 2, transformer: new ColumnNumericTransformer() })
  taxAmount!: number;

  @Column('decimal', { precision: 16, scale: 2, transformer: new ColumnNumericTransformer() })
  netAmount!: number;

  @Column('decimal', { precision: 16, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  discount!: number;

  @Column({ default: 'FIXED' })
  discountType!: string; // 'FIXED' or 'PERCENTAGE'

  @Column({ default: 'CASH' })
  paymentMethod!: string; 

  @Column({ type: 'json', nullable: true })
  paymentDetails?: any;

  @Column({ type: 'json' })
  itemsSnapshot!: any[]; 

  @Column({ default: 0 })
  itemsCount!: number;

  @Column({ nullable: true })
  kraControlCode?: string;

  @Column({ nullable: true })
  kraQrCodeUrl?: string;

  @Column({ nullable: true })
  kraSignature?: string;

  @Column({ nullable: true })
  kraDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}