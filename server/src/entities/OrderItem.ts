import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;

  @ManyToOne(() => Product, (product) => product.orderItems)
  product!: Product;

  @Column()
  quantity!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  price!: number;
}