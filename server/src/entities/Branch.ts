import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { ProductStock } from './ProductStock';
import { User } from './User';
import { Sale } from './Sale';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  code!: string; // e.g., NBI-001

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => ProductStock, (stock) => stock.branch)
  stock!: ProductStock[];

  @OneToMany(() => User, (user) => user.branch)
  users!: User[];

  @OneToMany(() => Sale, (sale) => sale.branch)
  sales!: Sale[];

  @CreateDateColumn()
  createdAt!: Date;
}