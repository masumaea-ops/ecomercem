import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AnalyticsEventType {
  PAGE_VIEW = 'PAGE_VIEW',
  CLICK = 'CLICK',
  SEARCH = 'SEARCH',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  ADD_TO_CART = 'ADD_TO_CART',
  CHECKOUT_START = 'CHECKOUT_START',
  CHECKOUT_COMPLETE = 'CHECKOUT_COMPLETE',
  SESSION_START = 'SESSION_START'
}

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'simple-enum',
    enum: AnalyticsEventType
  })
  @Index()
  type!: AnalyticsEventType;

  @Column({ type: 'json', nullable: true })
  data?: any;

  @Column({ nullable: true })
  @Index()
  visitorId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  pageUrl?: string;

  @Column({ nullable: true })
  referrer?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
