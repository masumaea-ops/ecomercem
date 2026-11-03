import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Product } from './Product';

@Entity('oem_numbers')
export class OemNumber {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index() // Critical for fast search by OEM
  @Column()
  code!: string;

  @ManyToOne(() => Product, (product) => product.oemNumbers)
  product!: Product;
}
