
import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Branch } from '../entities/Branch';
import { User, UserRole } from '../entities/User';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductStock } from '../entities/ProductStock';
import { OemNumber } from '../entities/OemNumber';
import { Vehicle } from '../entities/Vehicle';
import { BlogPost } from '../entities/BlogPost';
import { SystemSetting } from '../entities/SystemSetting';
import { Customer } from '../entities/Customer';
import { Sale } from '../entities/Sale';
import { Order, OrderStatus } from '../entities/Order';
import { Review } from '../entities/Review';
import { Security } from '../utils/security';

// --- 10 Sample Masuma Products ---
const PRODUCTS_DATA = [
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

const seed = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected. Starting seed / recovery...');

    // 1. Create Branch
    const branchRepo = AppDataSource.getRepository(Branch);
    let hq = await branchRepo.findOneBy({ code: 'NBI-HQ' });
    if (!hq) {
        hq = branchRepo.create({
            name: 'Ruby Mall Branch',
            code: 'NBI-HQ',
            address: 'Ruby Mall, Shop FF25 First Floor Behind NCBA Bank Accra Road',
            phone: '+254 792 506 590'
        });
        await branchRepo.save(hq);
        console.log('Branch created.');
    }

    // 2. Setup Default System Admin (safe for existing databases)
    const userRepo = AppDataSource.getRepository(User);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@masuma.africa';
    let admin = await userRepo.findOne({ where: { email: adminEmail } });
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
    const passwordHash = await Security.hashPassword(defaultPassword);

    if (!admin) {
        admin = userRepo.create({
            email: adminEmail,
            fullName: 'System Admin',
            passwordHash: passwordHash, 
            role: UserRole.ADMIN,
            branch: hq,
            discountPercentage: 0
        });
        await userRepo.save(admin);
        console.log(`Admin user created (${adminEmail}).`);
    } else {
        console.log(`Admin user already exists (${adminEmail}).`);
    }


    // 3. Create Categories & Products
    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);
    const stockRepo = AppDataSource.getRepository(ProductStock);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    const savedProducts: Product[] = [];

    for (const pData of PRODUCTS_DATA) {
        let cat = await categoryRepo.findOneBy({ name: pData.category });
        if (!cat) {
            cat = categoryRepo.create({ name: pData.category });
            await categoryRepo.save(cat);
        }

        let product = await productRepo.findOneBy({ sku: pData.sku });
        if (!product) {
            product = new Product();
            product.name = pData.name;
            product.sku = pData.sku;
            product.price = pData.price;
            product.costPrice = pData.costPrice || 0;
            product.description = `Genuine Masuma ${pData.name}. Engineered for reliability.`;
            product.category = cat;
            product.imageUrl = pData.image;
            
            product.oemNumbers = pData.oems.map(code => {
                const o = new OemNumber();
                o.code = code;
                return o;
            });

            const vehicles = [];
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
                branch: hq,
                quantity: 100,
                lowStockThreshold: 10
            });
            await stockRepo.save(stock);
            
            console.log(`Sync product: ${product.sku}`);
        }
        savedProducts.push(product);
    }

    // Seed sample authentic customer reviews for products
    const reviewRepo = AppDataSource.getRepository(Review);
    const sampleReviewsData = [
      {
        rating: 5,
        title: 'Perfect Japanese OE fitment and silent performance',
        comment: 'Installed this directly on my vehicle last week. Precise fit, flawless build quality, zero vibration or noise. Delivery to Westlands within 2 hours was super convenient.',
        customerName: 'Kariuki M.',
        orderNumber: 'ORD-10942',
        isVerifiedPurchase: true,
        helpfulCount: 6
      },
      {
        rating: 5,
        title: 'Top notch durability on Kenyan rough roads',
        comment: 'Daily commute between Nairobi and Nakuru puts huge strain on suspension and brakes. Masuma parts have consistently lasted twice as long as generic Kirinyaga road spares.',
        customerName: 'Eng. Peter Omondi',
        orderNumber: 'ORD-10815',
        isVerifiedPurchase: true,
        helpfulCount: 4
      },
      {
        rating: 4,
        title: 'Genuine OEM standard with official warranty',
        comment: 'Solid build quality. Mechanic confirmed authentic OE specs. The 12-month warranty certificate and receipt gave me total confidence.',
        customerName: 'Brian Kiprop',
        orderNumber: 'ORD-10773',
        isVerifiedPurchase: true,
        helpfulCount: 3
      }
    ];

    for (const prod of savedProducts) {
      const existingReviews = await reviewRepo.count({ where: { product: { id: prod.id } } });
      if (existingReviews === 0) {
        for (let i = 0; i < 2; i++) {
          const sample = sampleReviewsData[(savedProducts.indexOf(prod) + i) % sampleReviewsData.length];
          const rev = reviewRepo.create({
            product: prod,
            rating: sample.rating,
            title: sample.title,
            comment: sample.comment,
            customerName: sample.customerName,
            orderNumber: sample.orderNumber,
            isVerifiedPurchase: sample.isVerifiedPurchase,
            status: 'APPROVED',
            helpfulCount: sample.helpfulCount
          });
          await reviewRepo.save(rev);
        }
      }
    }
    console.log('Seeded sample authentic customer reviews');

    // Final Sync Message
    console.log('\n✅ SYNC COMPLETE');
    console.log('--------------------------');
    console.log(`Admin Email: ${adminEmail}`);
    console.log('--------------------------');
    
    (process as any).exit(0);
  } catch (error) {
    console.error('Seeding / Recovery failed:', error);
    (process as any).exit(1);
  }
};

seed();
