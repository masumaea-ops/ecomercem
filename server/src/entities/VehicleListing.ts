import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

export enum ListingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED'
}

export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE'
}

@Entity('vehicle_listings')
export class VehicleListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column('int')
  year!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  price!: number;

  @Column('int', { nullable: true })
  mileage?: number;

  @Column({ nullable: true })
  fuelType?: string;

  @Column({ nullable: true })
  transmission?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  engineSize?: number;

  @Column({ nullable: true })
  bodyType?: string;

  @Column({ nullable: true })
  color?: string;

  @Column('simple-json', { nullable: true })
  images?: string[];

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'simple-enum',
    enum: VehicleType,
    default: VehicleType.CAR
  })
  vehicleType!: VehicleType;

  @ManyToOne(() => User)
  seller!: User;

  @Column({
    type: 'simple-enum',
    enum: ListingStatus,
    default: ListingStatus.PENDING
  })
  status!: ListingStatus;

  @Column({ default: false })
  isPaid!: boolean;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  vin?: string;

  @Column({ nullable: true })
  scanReportUrl?: string;

  @Column({ nullable: true })
  auctionSheetUrl?: string;

  @Column({ default: false })
  isImported!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
