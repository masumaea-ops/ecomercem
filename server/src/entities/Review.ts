import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Product } from './Product';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  product!: Product;

  @Column('int')
  rating!: number; // 1 - 5 stars

  @Column({ nullable: true })
  title?: string;

  @Column('text')
  comment!: string;

  @Column()
  customerName!: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ default: false })
  isVerifiedPurchase!: boolean;

  @Column({ nullable: true })
  orderNumber?: string;

  @Column({ default: 'APPROVED' })
  status!: string; // 'APPROVED', 'PENDING', 'REJECTED'

  @Column({ default: 0 })
  helpfulCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
