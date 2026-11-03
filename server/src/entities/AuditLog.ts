
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  action!: string; // e.g. CREATE_PRODUCT, LOGIN, UPDATE_STOCK

  @Column()
  resourceId!: string; // The ID of the item affected

  @Column('text', { nullable: true })
  details?: string; // JSON string or description

  @Column({ nullable: true })
  ipAddress?: string;

  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @CreateDateColumn()
  createdAt!: Date;
}
