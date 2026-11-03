import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ConciergeInvoiceStatus {
  PROFORMA = 'PROFORMA',
  CONFIRMED = 'CONFIRMED',
  SOURCING_DEPOSIT_PAID = 'SOURCING_DEPOSIT_PAID',
  VEHICLE_PURCHASED = 'VEHICLE_PURCHASED',
  EXPORT_INSPECTION = 'EXPORT_INSPECTION',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_MOMBASA = 'ARRIVED_MOMBASA',
  CUSTOMS_CLEARING = 'CUSTOMS_CLEARING',
  NTSA_REGISTRATION = 'NTSA_REGISTRATION',
  READY_FOR_COLLECTION = 'READY_FOR_COLLECTION',
  FULLY_PAID = 'FULLY_PAID',
  RELEASED = 'RELEASED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('import_concierge_invoices')
export class ImportConciergeInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  invoiceNumber!: string; // e.g. INV-CON-2025-0142

  @Column({ nullable: true })
  userId!: string; // Linked Buyer Account ID

  @Column({ default: true })
  includeRegistration!: boolean; // Includes NTSA plates, inspection & logbook

  @Column('decimal', { precision: 16, scale: 2, default: 25000.00 })
  registrationFeeKes!: number; // NTSA Registration, plates, inspection & logbook transfer

  @Column()
  customerName!: string;

  @Column()
  customerEmail!: string;

  @Column({ nullable: true })
  customerPhone!: string;

  @Column({ nullable: true })
  customerPin!: string; // KRA PIN (e.g. A012345678B)

  @Column({ nullable: true })
  customerIdNumber!: string; // Kenyan National ID or Passport

  @Column({ nullable: true })
  customerAddress!: string; // Physical/Postal address in Kenya

  @Column({ nullable: true })
  crspId!: string;

  @Column()
  vehicleMake!: string;

  @Column()
  vehicleModel!: string;

  @Column({ nullable: true })
  modelNumber!: string; // Chassis/Model code

  @Column('int')
  yearOfManufacture!: number; // 2018-2025

  @Column('int')
  vehicleAge!: number; // e.g. 7

  @Column('decimal', { precision: 10, scale: 2, default: 1500 })
  engineSize!: number;

  @Column({ default: 'PETROL' })
  fuelType!: string;

  @Column({ default: 'CAR' })
  vehicleType!: string;

  @Column({ nullable: true })
  transmission!: string;

  @Column({ nullable: true })
  driveConfiguration!: string;

  @Column({ nullable: true })
  chassisNumber!: string; // VIN / Chassis e.g. SJ5-048291

  @Column({ nullable: true })
  engineNumber!: string; // Engine Serial e.g. FB20-9481023

  @Column({ nullable: true })
  exteriorColor!: string; // Vehicle color

  @Column('int', { nullable: true })
  mileageKm!: number; // Verified Odometer in KM

  @Column({ nullable: true })
  registrationPlate!: string; // NTSA Registration Mark or Interim

  @Column({ nullable: true })
  kraEntryNumber!: string; // KRA Simba / ICMS Customs Entry Number

  @Column({ nullable: true })
  portReleaseNumber!: string; // CFS Port Delivery Order / Release No

  @Column({ nullable: true })
  vesselName!: string; // Ocean Carrier Vessel e.g. HOEGH TRADER

  @Column({ nullable: true })
  voyageNumber!: string; // Voyage Identifier e.g. V-2026-08

  @Column({ nullable: true })
  billOfLadingNumber!: string; // B/L Number e.g. MOLU9283710

  @Column({ default: 'Yokohama Port, Japan' })
  portOfLoading!: string;

  @Column({ default: 'Port of Mombasa, Kenya' })
  portOfDischarge!: string;

  @Column({ type: 'datetime', nullable: true })
  etaDate!: Date; // Estimated Port Arrival Date

  @Column({ type: 'text', nullable: true })
  trackingHistory!: string; // JSON serialized array of milestone stops with timestamps

  @Column('decimal', { precision: 16, scale: 2 })
  crspBenchmarkKes!: number;

  @Column('decimal', { precision: 6, scale: 4 })
  depreciationRate!: number; // e.g. 0.6500

  @Column('decimal', { precision: 16, scale: 2 })
  depreciatedCrspKes!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  customsValueCifKes!: number;

  @Column('decimal', { precision: 6, scale: 4 })
  importDutyRate!: number; // 0.35 or 0.25

  @Column('decimal', { precision: 16, scale: 2 })
  importDutyKes!: number;

  @Column('decimal', { precision: 6, scale: 4 })
  exciseDutyRate!: number; // 0.20, 0.25, 0.35, 0.10

  @Column('decimal', { precision: 16, scale: 2 })
  exciseDutyKes!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  vatKes!: number; // 16%

  @Column('decimal', { precision: 16, scale: 2 })
  idfFeeKes!: number; // 2.5%

  @Column('decimal', { precision: 16, scale: 2 })
  rdlFeeKes!: number; // 2.0%

  @Column('decimal', { precision: 16, scale: 2 })
  totalKraTaxesKes!: number;

  @Column('decimal', { precision: 16, scale: 2, default: 65000.00 })
  portChargesKes!: number;

  @Column('decimal', { precision: 16, scale: 2 })
  landedVehicleValueKes!: number; // CIF + Taxes + Port

  @Column('decimal', { precision: 6, scale: 4, default: 0.0350 })
  sourcingCommissionRate!: number; // 3.5%

  @Column('decimal', { precision: 16, scale: 2 })
  sourcingCommissionKes!: number; // 3.5% of Landed Car Value

  @Column('decimal', { precision: 16, scale: 2 })
  grandTotalKes!: number; // Landed + Commission

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  depositPaidKes!: number;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  cifPaidKes!: number;

  @Column('decimal', { precision: 16, scale: 2, default: 0 })
  dutyPaidKes!: number;

  @Column('decimal', { precision: 16, scale: 2, nullable: true })
  balanceDueKes!: number;

  @Column({
    type: 'varchar',
    default: ConciergeInvoiceStatus.PROFORMA
  })
  status!: ConciergeInvoiceStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ nullable: true })
  releasedBy!: string; // Staff/officer name who released the vehicle

  @Column({ type: 'datetime', nullable: true })
  releasedAt!: Date; // Handover timestamp

  @Column({ type: 'text', nullable: true })
  releaseNotes!: string; // Handover remarks, inspection notes

  @Column({ type: 'datetime', nullable: true })
  lastEmailedAt!: Date; // Timestamp of latest email transmission

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
