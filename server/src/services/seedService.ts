import { AppDataSource } from '../config/database';
import { Branch } from '../entities/Branch';
import { User, UserRole } from '../entities/User';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductStock } from '../entities/ProductStock';
import { OemNumber } from '../entities/OemNumber';
import { Vehicle } from '../entities/Vehicle';
import { SystemSetting } from '../entities/SystemSetting';
import { Review } from '../entities/Review';
import { Security } from '../utils/security';
import { logger } from '../utils/logger';

export interface SeedResult {
  success: boolean;
  message: string;
  schemaSynced: boolean;
  branch: string;
  adminEmail: string;
  adminCreated: boolean;
  categoriesCreated: number;
  productsCreated: number;
  settingsCreated: number;
  totalTables: number;
}

const DEFAULT_CATEGORIES = [
  'Filters',
  'Brakes',
  'Suspension',
  'Engine & Ignition',
  'Wiper Blades',
  'Chassis',
  'Cooling System',
  'Drive Belts',
  'Clips & Bolts',
  'Oils & Lubricants'
];

const BASELINE_PRODUCTS = [
  {
    name: 'Oil Filter (Spin-on)',
    sku: 'MFC-112',
    category: 'Filters',
    price: 850,
    costPrice: 450,
    oems: ['90915-10001', '90915-YZZE1'],
    fits: [{ make: 'Toyota', model: 'Corolla' }, { make: 'Toyota', model: 'Vitz' }, { make: 'Toyota', model: 'Premio' }],
    image: '/images/parts/MFC-112.jpg'
  },
  {
    name: 'Disc Brake Pads (Front)',
    sku: 'MS-2444',
    category: 'Brakes',
    price: 4500,
    costPrice: 2800,
    oems: ['26296-SA031', '26296-FG010'],
    fits: [{ make: 'Subaru', model: 'Forester SG5' }, { make: 'Subaru', model: 'Impreza' }],
    image: '/images/parts/MS-2444.jpg'
  },
  {
    name: 'Air Filter (Safari Spec)',
    sku: 'MFA-1146',
    category: 'Filters',
    price: 2200,
    costPrice: 1100,
    oems: ['17801-30040'],
    fits: [{ make: 'Toyota', model: 'Land Cruiser Prado' }, { make: 'Toyota', model: 'Hilux' }],
    image: '/images/parts/MFA-1146.jpg'
  },
  {
    name: 'Stabilizer Link (Front)',
    sku: 'ML-3320',
    category: 'Suspension',
    price: 1800,
    costPrice: 950,
    oems: ['48820-42020'],
    fits: [{ make: 'Toyota', model: 'RAV4' }, { make: 'Toyota', model: 'Vanguard' }],
    image: '/images/parts/ML-3320.jpg'
  },
  {
    name: 'Iridium Spark Plug',
    sku: 'S-102',
    category: 'Engine & Ignition',
    price: 1200,
    costPrice: 600,
    oems: ['90919-01210'],
    fits: [{ make: 'Toyota', model: 'Camry' }, { make: 'Lexus', model: 'RX' }, { make: 'Nissan', model: 'X-Trail' }],
    image: '/images/parts/S-102.jpg'
  },
  {
    name: 'Hybrid Wiper Blade (26")',
    sku: 'MU-026',
    category: 'Wiper Blades',
    price: 1500,
    costPrice: 800,
    oems: ['85222-53070'],
    fits: [{ make: 'Toyota', model: 'Harrier' }, { make: 'Honda', model: 'CR-V' }, { make: 'Nissan', model: 'Murano' }],
    image: '/images/parts/MU-026.jpg'
  },
  {
    name: 'Fuel Filter (In-Tank)',
    sku: 'MFF-T103',
    category: 'Filters',
    price: 3500,
    costPrice: 1900,
    oems: ['23300-21010'],
    fits: [{ make: 'Toyota', model: 'NZE' }, { make: 'Toyota', model: 'Fielder' }, { make: 'Toyota', model: 'Runx' }],
    image: '/images/parts/MFF-T103.jpg'
  },
  {
    name: 'Control Arm Bushing',
    sku: 'RU-388',
    category: 'Suspension',
    price: 1200,
    costPrice: 550,
    oems: ['48655-12170'],
    fits: [{ make: 'Toyota', model: 'Corolla AE100' }, { make: 'Toyota', model: 'Sprinter' }],
    image: '/images/parts/RU-388.jpg'
  },
  {
    name: 'Ignition Coil',
    sku: 'MIC-110',
    category: 'Engine & Ignition',
    price: 4800,
    costPrice: 2400,
    oems: ['90919-02240'],
    fits: [{ make: 'Toyota', model: 'Vitz' }, { make: 'Toyota', model: 'Yaris' }, { make: 'Toyota', model: 'FunCargo' }],
    image: '/images/parts/MIC-110.jpg'
  },
  {
    name: 'Drive Belt (Serpentine)',
    sku: '5PK1100',
    category: 'Drive Belts',
    price: 1600,
    costPrice: 750,
    oems: ['90916-02556'],
    fits: [{ make: 'Toyota', model: 'Premio' }, { make: 'Toyota', model: 'Allion' }],
    image: '/images/parts/5PK1100.jpg'
  }
];

const DEFAULT_SETTINGS: Record<string, string> = {
  'COMPANY_NAME': 'Masuma Autoparts East Africa Limited',
  'CMS_HEADER_PHONE': '+254 792 506 590',
  'CMS_CONTACT_PHONE': '+254 792 506 590',
  'CMS_CONTACT_EMAIL': 'sales@masuma.africa',
  'CMS_CONTACT_ADDRESS': 'Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya',
  'CMS_FOOTER_ABOUT': 'Masuma Autoparts East Africa is the distributor and regional brand builder for Masuma Japan. Brand new, genuine-quality replacement parts engineered in Tokyo for Kenyan roads — without the dealer markup.',
  'BRANCH_NAME': 'Ruby Mall Head Office',
  'BRANCH_ADDRESS': 'Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya',
  'BRANCH_PHONE': '+254 792 506 590',
  'DEFAULT_CURRENCY': 'KES',
  'SUPPORT_EMAIL': 'sales@masuma.africa',
  'AUTO_SEED_VERSION': '2026.09.22'
};

export class SeedService {
  /**
   * 1. Safely sync database schema without dropping existing tables or data
   */
  static async syncDatabaseSchema(): Promise<boolean> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      logger.info('🔄 [MIGRATION] Checking and synchronizing database schema...');
      // Safe synchronize (dropBeforeSync = false)
      await AppDataSource.synchronize(false);

      // Run pending migrations if defined
      if (AppDataSource.migrations && AppDataSource.migrations.length > 0) {
        logger.info('🔄 [MIGRATION] Running pending TypeORM migrations...');
        await AppDataSource.runMigrations();
      }

      logger.info('✅ [MIGRATION] Database schema is fully up-to-date.');
      return true;
    } catch (error: any) {
      logger.error('❌ [MIGRATION] Schema sync warning:', error.message);
      return false;
    }
  }

  /**
   * 2. Ensure Headquarters Branch exists
   */
  static async seedHQBranch(): Promise<Branch> {
    const branchRepo = AppDataSource.getRepository(Branch);
    let hq = await branchRepo.findOneBy({ code: 'NBI-HQ' });

    if (!hq) {
      hq = branchRepo.create({
        name: 'Ruby Mall Branch',
        code: 'NBI-HQ',
        address: 'Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya',
        phone: '+254 792 506 590'
      });
      await branchRepo.save(hq);
      logger.info('🏢 [SEED] Created Headquarters Branch: Ruby Mall (NBI-HQ)');
    } else if (!hq.address || hq.address.includes('NCBA Bank')) {
      // Ensure standardized address
      hq.name = 'Ruby Mall Branch';
      hq.address = 'Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya';
      hq.phone = '+254 792 506 590';
      await branchRepo.save(hq);
      logger.info('🏢 [SEED] Standardized Headquarters Branch address.');
    }

    return hq;
  }

  /**
   * 3. Ensure Default System Admin user exists
   */
  static async seedAdminUser(hqBranch: Branch): Promise<{ admin: User; created: boolean }> {
    const userRepo = AppDataSource.getRepository(User);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@masuma.africa';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });

    if (!admin) {
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
      const passwordHash = await Security.hashPassword(defaultPassword);

      admin = userRepo.create({
        email: adminEmail,
        fullName: 'System Administrator',
        passwordHash,
        role: UserRole.ADMIN,
        branch: hqBranch,
        discountPercentage: 0
      });

      await userRepo.save(admin);
      logger.info(`👤 [SEED] Created default administrator: ${adminEmail}`);
      return { admin, created: true };
    }

    return { admin, created: false };
  }

  /**
   * 4. Ensure all standard product categories exist
   */
  static async seedCategories(): Promise<number> {
    const categoryRepo = AppDataSource.getRepository(Category);
    let createdCount = 0;

    for (const catName of DEFAULT_CATEGORIES) {
      const existing = await categoryRepo.findOneBy({ name: catName });
      if (!existing) {
        const cat = categoryRepo.create({ name: catName });
        await categoryRepo.save(cat);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      logger.info(`🏷️ [SEED] Seeded ${createdCount} missing product categories.`);
    }

    return createdCount;
  }

  /**
   * 5. Ensure baseline Masuma products & stock exist (idempotent)
   */
  static async seedBaselineProducts(hqBranch: Branch): Promise<number> {
    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);
    const stockRepo = AppDataSource.getRepository(ProductStock);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    let createdCount = 0;

    for (const pData of BASELINE_PRODUCTS) {
      let product = await productRepo.findOneBy({ sku: pData.sku });
      if (!product) {
        let cat = await categoryRepo.findOneBy({ name: pData.category });
        if (!cat) {
          cat = categoryRepo.create({ name: pData.category });
          await categoryRepo.save(cat);
        }

        product = new Product();
        product.name = pData.name;
        product.sku = pData.sku;
        product.price = pData.price;
        product.costPrice = pData.costPrice;
        product.description = `Genuine Masuma ${pData.name}. Engineered to Japanese OEM standards for East African road conditions. 12-month defect replacement warranty.`;
        product.category = cat;
        product.imageUrl = pData.image;

        product.oemNumbers = pData.oems.map(code => {
          const o = new OemNumber();
          o.code = code;
          return o;
        });

        const vehicles: Vehicle[] = [];
        for (const vData of pData.fits) {
          let v = await vehicleRepo.findOneBy({ make: vData.make, model: vData.model });
          if (!v) {
            v = vehicleRepo.create(vData);
            await vehicleRepo.save(v);
          }
          vehicles.push(v);
        }
        product.vehicles = vehicles;

        await productRepo.save(product);

        const stock = stockRepo.create({
          product,
          branch: hqBranch,
          quantity: 100,
          lowStockThreshold: 10
        });
        await stockRepo.save(stock);

        createdCount++;
      }
    }

    if (createdCount > 0) {
      logger.info(`📦 [SEED] Seeded ${createdCount} core catalog parts with stock.`);
    }

    return createdCount;
  }

  /**
   * 6. Ensure default system settings exist
   */
  static async seedSystemSettings(): Promise<number> {
    const settingRepo = AppDataSource.getRepository(SystemSetting);
    let createdCount = 0;

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await settingRepo.findOneBy({ key });
      if (!existing) {
        const s = settingRepo.create({ key, value });
        await settingRepo.save(s);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      logger.info(`⚙️ [SEED] Populated ${createdCount} baseline system settings.`);
    }

    return createdCount;
  }

  /**
   * 7. Master Orchestrator: Safe Migration + Idempotent Seeding
   */
  static async runAutoMigrationAndSeed(): Promise<SeedResult> {
    try {
      logger.info('🚀 [SYSTEM] Initializing Automatic Database Migration & Seeding...');

      // Step 1: Schema Sync
      const schemaSynced = await this.syncDatabaseSchema();

      // Step 2: Seed HQ Branch
      const hq = await this.seedHQBranch();

      // Step 3: Seed Admin User
      const adminResult = await this.seedAdminUser(hq);

      // Step 4: Seed Categories
      const categoriesCreated = await this.seedCategories();

      // Step 5: Seed Baseline Products & Stock
      const productsCreated = await this.seedBaselineProducts(hq);

      // Step 6: Seed System Settings
      const settingsCreated = await this.seedSystemSettings();

      const totalTables = AppDataSource.entityMetadatas.length;

      logger.info(`🎉 [SYSTEM] Auto-migration & seeding complete. Active tables: ${totalTables}`);

      return {
        success: true,
        message: 'Database auto-migration and baseline seeding completed successfully',
        schemaSynced,
        branch: `${hq.name} (${hq.code})`,
        adminEmail: adminResult.admin.email,
        adminCreated: adminResult.created,
        categoriesCreated,
        productsCreated,
        settingsCreated,
        totalTables
      };
    } catch (error: any) {
      logger.error('❌ [SYSTEM] Auto-migration/seeding error:', error);
      return {
        success: false,
        message: error.message || 'Auto-migration and seeding failed',
        schemaSynced: false,
        branch: 'Error',
        adminEmail: 'Error',
        adminCreated: false,
        categoriesCreated: 0,
        productsCreated: 0,
        settingsCreated: 0,
        totalTables: 0
      };
    }
  }
}
