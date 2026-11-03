import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

export enum ImportRequestStatus {
  PENDING = 'PENDING',
  SOURCING = 'SOURCING',
  QUOTED = 'QUOTED',
  CIF_PAID = 'CIF_PAID',
  SHIPPING_LOADED = 'SHIPPING_LOADED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  CLEARING = 'CLEARING',
  BALANCE_DUE = 'BALANCE_DUE',
  READY_FOR_COLLECTION = 'READY_FOR_COLLECTION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('import_requests')
export class ImportRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar' })
  make!: string;

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ type: 'int' })
  minYear!: number;

  @Column({ type: 'varchar', nullable: true })
  colorPreference!: string;

  @Column({ type: 'int', nullable: true })
  maxMileage!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  budgetKes!: number;

  @Column({ type: 'varchar', default: 'Japan' })
  sourceCountry!: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes!: string;

  @Column({
    type: 'simple-enum',
    enum: ImportRequestStatus,
    default: ImportRequestStatus.PENDING
  })
  status!: ImportRequestStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cifAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  balanceAmount!: number;

  @Column({ type: 'varchar', nullable: true })
  quoteUrl!: string;

  @Column({ type: 'varchar', nullable: true })
  contractUrl!: string;

  @Column({ type: 'varchar', nullable: true })
  vesselName!: string;

  @Column({ type: 'datetime', nullable: true })
  eta!: Date;

  @Column({ type: 'json', nullable: true })
  adminResponse!: any; 

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
