import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('crsp_data')
@Index(['make', 'model'])
export class CrspData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column({ nullable: true })
  modelNumber!: string; // Chassis code e.g. DBA-8XCHZ, 3BA-GBDAD, GDJ150

  @Column('int', { nullable: true, default: 2025 })
  year!: number; // Optional reference year or publication year

  @Column('decimal', { precision: 16, scale: 2 })
  crspValue!: number; // Current Retail Selling Price in KES from KRA benchmark

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  engineSize!: number; // In CC (e.g. 1500) or kW for EV

  @Column({ nullable: true })
  fuelType!: string; // GASOLINE, DIESEL, ELECTRIC, HYBRID, PLUG-IN HYBRID

  @Column({ nullable: true })
  category!: string; // e.g. SUV, SEDAN, HATCHBACK, WAGON, VAN, TRUCK

  @Column({ nullable: true })
  transmission!: string; // AT, MT, CVT, DCT

  @Column({ nullable: true })
  driveConfiguration!: string; // 2WD, 4WD, AWD, FWD, RWD

  @Column({ nullable: true })
  gvw!: string;

  @Column({ nullable: true })
  seating!: string;

  @Column({ default: '2025' })
  crspEdition!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
