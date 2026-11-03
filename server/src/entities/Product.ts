import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './Category';
import { OemNumber } from './OemNumber';
import { Vehicle } from './Vehicle';
import { OrderItem } from './OrderItem';
import { ProductStock } from './ProductStock';
import { Review } from './Review';
import { ColumnNumericTransformer } from '../utils/transformer';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 500 }) 
  name!: string;

  @Index({ unique: true })
  @Column()
  sku!: string;

  @Column('decimal', { precision: 16, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  costPrice!: number;

  @Index()
  @Column('decimal', { precision: 16, scale: 2, transformer: new ColumnNumericTransformer() })
  price!: number;

  @Column('decimal', { precision: 16, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  wholesalePrice?: number;

  @Column('text')
  description!: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column('json', { nullable: true })
  images?: string[];

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ nullable: true })
  importBatchId?: string; // Tracks bulk import groups

  @Column({ type: 'varchar', default: 'ACTIVE' })
  lifecycleStatus!: string; // 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'COMING_SOON'

  @Column({ nullable: true })
  successorProductId?: string; // Direct successor replacement for EOL 301 redirection

  @Column({ nullable: true })
  canonicalMasterId?: string; // Master parent product for keyword cannibalization prevention

  @Column({ nullable: true })
  expectedRestockDate?: string; // Expected arrival for waitlist

  @ManyToOne(() => Category, (category) => category.products)
  category!: Category;

  @OneToMany(() => OemNumber, (oem) => oem.product, { cascade: true })
  oemNumbers!: OemNumber[];

  @ManyToMany(() => Vehicle, (vehicle) => vehicle.products, { cascade: true })
  @JoinTable({ name: 'product_vehicles' })
  vehicles!: Vehicle[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[];

  @OneToMany(() => ProductStock, (stock) => stock.product)
  stock!: ProductStock[];

  @OneToMany(() => Review, (review) => review.product)
  reviews!: Review[];

  @Index()
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}