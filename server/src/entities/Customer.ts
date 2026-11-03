import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Quote } from './Quote';
import { Sale } from './Sale';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  kraPin?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ default: false })
  isWholesale!: boolean; // Triggers B2B pricing

  @Column({ type: 'varchar', default: 'APPROVED' })
  status!: string; // 'PENDING_APPROVAL', 'APPROVED', 'DISABLED'

  @OneToMany(() => Quote, (quote) => quote.customer)
  quotes!: Quote[];

  @OneToMany(() => Sale, (sale) => sale.customer)
  sales!: Sale[];

  @CreateDateColumn()
  createdAt!: Date;
}