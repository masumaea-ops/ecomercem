import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './env'; 

import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { AuditLog } from '../entities/AuditLog';
import { BlogPost } from '../entities/BlogPost';
import { Branch } from '../entities/Branch';
import { Category } from '../entities/Category';
import { CrspData } from '../entities/CrspData';
import { Customer } from '../entities/Customer';
import { Expense } from '../entities/Expense';
import { FraudReport } from '../entities/FraudReport';
import { ImportRequest } from '../entities/ImportRequest';
import { ImportConciergeInvoice } from '../entities/ImportConciergeInvoice';
import { MpesaTransaction } from '../entities/MpesaTransaction';
import { OemNumber } from '../entities/OemNumber';
import { OrderItem } from '../entities/OrderItem';
import { Order } from '../entities/Order';
import { Payment } from '../entities/Payment';
import { ProductStock } from '../entities/ProductStock';
import { Product } from '../entities/Product';
import { PromoCode } from '../entities/PromoCode';
import { Quote } from '../entities/Quote';
import { ReturnItem } from '../entities/ReturnItem';
import { ReturnRequest } from '../entities/ReturnRequest';
import { Review } from '../entities/Review';
import { Sale } from '../entities/Sale';
import { Subscriber } from '../entities/Subscriber';
import { StockAlert } from '../entities/StockAlert';
import { SystemSetting } from '../entities/SystemSetting';
import { User } from '../entities/User';
import { VehicleListing } from '../entities/VehicleListing';
import { Vehicle } from '../entities/Vehicle';
import { ProductSubscriber } from '../subscribers/ProductSubscriber';

const entities = [
  AnalyticsEvent,
  AuditLog,
  BlogPost,
  Branch,
  Category,
  CrspData,
  Customer,
  Expense,
  FraudReport,
  ImportRequest,
  ImportConciergeInvoice,
  MpesaTransaction,
  OemNumber,
  OrderItem,
  Order,
  Payment,
  ProductStock,
  Product,
  PromoCode,
  Quote,
  ReturnItem,
  ReturnRequest,
  Review,
  Sale,
  Subscriber,
  StockAlert,
  SystemSetting,
  User,
  VehicleListing,
  Vehicle,
];

// MySQL Database is the sole source of truth configured strictly from environment variables (.env)
export const mysqlDataSource = new DataSource({
  type: 'mysql',
  host: config.DB_HOST,
  port: Number(config.DB_PORT) || 3306,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  synchronize: config.NODE_ENV === 'development' && process.env.DB_SYNC === 'true', // Never alter existing prod DB schema
  logging: config.NODE_ENV === 'development',
  entities,
  subscribers: [ProductSubscriber],
  migrations: [],
  extra: {
    connectionLimit: 50,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  }
});

export const AppDataSource = mysqlDataSource;

