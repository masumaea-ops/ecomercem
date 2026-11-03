import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Product } from './Product';
import { Branch } from './Branch';

@Entity('product_stock')
@Unique(['product', 'branch'])
export class ProductStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.stock)
  product!: Product;

  @ManyToOne(() => Branch, (branch) => branch.stock)
  branch!: Branch;

  @Column({ default: 0 })
  quantity!: number;

  @Column({ default: 0 })
  lowStockThreshold!: number; // For alerts
}