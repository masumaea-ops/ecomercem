import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ReturnRequest } from './ReturnRequest';
import { Product } from './Product';

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ReturnRequest, (request) => request.items)
  returnRequest!: ReturnRequest;

  @ManyToOne(() => Product)
  product!: Product;

  @Column()
  quantity!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  priceAtPurchase!: number;

  @Column('text', { nullable: true })
  condition?: string;
}
