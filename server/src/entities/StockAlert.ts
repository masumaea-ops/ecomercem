import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  productId!: string;

  @Index()
  @Column()
  productSku!: string;

  @Column({ default: 'email' })
  contactType!: string; // 'email' | 'whatsapp' | 'phone'

  @Column()
  contactValue!: string;

  @Column({ default: 'PENDING' })
  status!: string; // 'PENDING' | 'NOTIFIED' | 'CANCELLED'

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  notifiedAt?: Date;
}
