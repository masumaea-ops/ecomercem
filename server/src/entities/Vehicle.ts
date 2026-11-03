import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, Index } from 'typeorm';
import { Product } from './Product';

@Entity('vehicles')
@Index(['make', 'model'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  make!: string;

  @Index()
  @Column()
  model!: string;

  @ManyToMany(() => Product, (product) => product.vehicles)
  products!: Product[];
}
