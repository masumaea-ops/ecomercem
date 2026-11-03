
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('promo_codes')
export class PromoCode {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    code!: string;

    @Column({
        type: 'simple-enum',
        enum: ['PERCENTAGE', 'FIXED'],
        default: 'PERCENTAGE'
    })
    type!: 'PERCENTAGE' | 'FIXED';

    @Column('decimal', { precision: 10, scale: 2 })
    value!: number;

    @Column()
    startDate!: string;

    @Column()
    endDate!: string;

    @Column({ default: 100 })
    usageLimit!: number;

    @Column({ default: 0 })
    currentUsage!: number;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
