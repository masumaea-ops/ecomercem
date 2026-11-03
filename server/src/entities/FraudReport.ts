import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { VehicleListing } from './VehicleListing';

export enum FraudReportReason {
  SCAM = 'SCAM',
  FAKE_MILEAGE = 'FAKE_MILEAGE',
  STOLEN_VEHICLE = 'STOLEN_VEHICLE',
  MISLEADING_DESCRIPTION = 'MISLEADING_DESCRIPTION',
  DEPOSIT_SCAM = 'DEPOSIT_SCAM',
  OTHER = 'OTHER'
}

export enum FraudReportStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

@Entity('fraud_reports')
export class FraudReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  listingId!: string;

  @ManyToOne(() => VehicleListing, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing!: VehicleListing;

  @Column()
  reporterId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter!: User;

  @Column({
    type: 'simple-enum',
    enum: FraudReportReason,
    default: FraudReportReason.OTHER
  })
  reason!: FraudReportReason;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'simple-enum',
    enum: FraudReportStatus,
    default: FraudReportStatus.PENDING
  })
  status!: FraudReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
