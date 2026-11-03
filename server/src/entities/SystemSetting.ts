
import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn()
  key!: string; // e.g. 'COMPANY_NAME', 'TAX_RATE'

  @Column('text')
  value!: string;

  @Column({ nullable: true })
  description?: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}
