export enum Category {
  ALL = 'All',
  FILTERS = 'Filters',
  BRAKES = 'Brakes',
  SUSPENSION = 'Suspension',
  ENGINE = 'Engine & Ignition',
  WIPERS = 'Wiper Blades',
  CHASSIS = 'Chassis',
  COOLING = 'Cooling System',
  BELTS = 'Drive Belts',
  FASTENERS = 'Clips & Bolts'
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  oemNumbers: string[];
  category: string; 
  price: number; 
  wholesalePrice?: number;
  costPrice?: number;
  description: string;
  compatibility: string[]; 
  image: string;
  images?: string[];
  videoUrl?: string;
  stock: boolean; 
  quantity?: number;
  lifecycleStatus?: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'COMING_SOON' | string;
  successorProductId?: string;
  successorProduct?: { id: string; name: string; sku: string; price: number; image: string; stock: boolean };
  canonicalMasterId?: string;
  canonicalMasterProduct?: { id: string; name: string; sku: string };
  expectedRestockDate?: string;
  specs?: Record<string, string | number>;
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  customerName: string;
  isVerifiedPurchase: boolean;
  orderNumber?: string;
  createdAt: string;
  helpfulCount?: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  verifiedCount: number;
  ratingDistribution: Record<number, number>;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  currentUsage: number;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; 
  image: string;
  date: string;
  readTime: string;
  category: string;
  relatedProductCategory: string; 
  isPublished?: boolean;
}

export type ViewState = 'HOME' | 'CATALOG' | 'PART_FINDER' | 'ABOUT' | 'CONTACT' | 'BLOG' | 'LOGIN' | 'DASHBOARD' | 'WARRANTY' | 'RETURNS' | 'RESET_PASSWORD' | 'PRIVACY' | 'TERMS' | 'COOKIES' | 'CHECKOUT' | 'MARKETPLACE' | 'IMPORT_CALCULATOR' | 'SELLER_DASHBOARD' | 'FAQ' | 'SITE_DIRECTORY' | 'BUYER_PORTAL';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'B2B_USER' | 'DEALER' | 'INDIVIDUAL_SELLER' | 'BUYER' | 'IMPORT_USER';
  branchId?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
}

export interface Payment {
    id: string;
    date: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress?: string;
    date: string;
    total: number;
    amountPaid: number;
    balance: number;
    status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    paymentMethod: string;
    items: { name: string; qty: number; price: number; sku?: string }[];
    payments?: Payment[];
    promoCodeUsed?: string;
    discountAmount?: number;
}

export interface Sale {
    id: string;
    receiptNumber: string;
    date: string;
    createdAt?: string;
    totalAmount: number;
    paymentMethod: string;
    cashierName: string;
    customerName?: string;
    customerPhone?: string;
    kraControlCode?: string;
    itemsCount: number;
    itemsSnapshot?: any[];
    discount?: number;
    discountType?: 'PERCENTAGE' | 'FIXED';
}

export interface MpesaLog {
    id: string;
    checkoutRequestID: string;
    phoneNumber: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    mpesaReceiptNumber?: string;
    resultDesc?: string;
    date: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    kraPin?: string;
    isWholesale: boolean;
    totalSpend: number;
    lastVisit: string;
    status?: 'PENDING_APPROVAL' | 'APPROVED' | 'DISABLED';
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  mediaType?: 'image' | 'video' | 'youtube';
  videoUrl?: string;
  ctaText: string;
  ctaLink: ViewState;
}

export interface DashboardStats {
  totalSales: number;
  lowStockItems: number;
  todaysOrders: number;
  pendingQuotes: number;
  monthlyRevenue: { name: string; value: number }[];
  categorySales: { name: string; value: number }[];
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED'
}

export interface Quote {
    id: string;
    quoteNumber: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    date: string;
    total: number;
    status: QuoteStatus;
    type: 'STANDARD' | 'SOURCING';
    vin?: string;
    itemsCount?: number;
    items: { productId: string; name: string; quantity: number; unitPrice: number; total: number }[];
}

// Fix for components/admin/GradingSystem.tsx import errors
export interface Student {
  id: string;
  fullName: string;
  studentId: string;
  currentAverage?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface GradeScale {
  id: string;
  minScore: number;
  maxScore: number;
  label: string;
  comment: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  title: string;
  score: number;
  date: string;
}

export enum ListingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED'
}

export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE'
}

export interface VehicleListing {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  engineSize?: number;
  bodyType?: string;
  color?: string;
  images?: string[];
  description?: string;
  vehicleType: 'CAR' | 'MOTORCYCLE';
  seller: User;
  status: 'PENDING' | 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'REJECTED';
  isPaid: boolean;
  location?: string;
  vin?: string;
  scanReportUrl?: string;
  auctionSheetUrl?: string;
  isImported: boolean;
  views?: number;
  createdAt: string;
}

export interface CrspData {
  id: string;
  make: string;
  model: string;
  modelNumber?: string;
  year?: number;
  crspValue: number;
  engineSize?: number;
  fuelType?: string;
  category?: string;
  transmission?: string;
  driveConfiguration?: string;
  gvw?: string;
  seating?: string;
  crspEdition?: string;
}

export interface ImportCalculationResult {
  vehicleName?: string;
  cif: number;
  importDuty: number;
  exciseDuty: number;
  vat: number;
  idf: number;
  rdl: number;
  totalTaxes: number;
  portCharges?: number;
  landedVehicleValue?: number;
  sourcingCommissionRate?: number;
  sourcingCommission?: number;
  grandTotal?: number;
  totalCost: number;
  breakdown: {
    crspBenchmarkKes?: number;
    vehicleAge?: number;
    age: number;
    depreciationRate: number;
    depreciatedCrspKes?: number;
    customsValueCifKes?: number;
    importDutyRate: number;
    exciseDutyRate: number;
    fixedExcise?: number;
    vatRate: number;
    sourcingCommissionRate?: number;
    categoryRule?: string;
  };
}

export interface ImportConciergeInvoice {
  id: string;
  invoiceNumber: string;
  userId?: string;
  includeRegistration?: boolean;
  registrationFeeKes?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerPin?: string;
  customerIdNumber?: string;
  customerAddress?: string;
  crspId?: string;
  vehicleMake: string;
  vehicleModel: string;
  modelNumber?: string;
  yearOfManufacture: number;
  vehicleAge: number;
  engineSize: number;
  fuelType: string;
  vehicleType: string;
  transmission?: string;
  driveConfiguration?: string;
  chassisNumber?: string;
  engineNumber?: string;
  exteriorColor?: string;
  mileageKm?: number;
  registrationPlate?: string;
  kraEntryNumber?: string;
  portReleaseNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  billOfLadingNumber?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  etaDate?: string;
  trackingHistory?: string;
  crspBenchmarkKes: number;
  depreciationRate: number;
  depreciatedCrspKes: number;
  customsValueCifKes: number;
  importDutyRate?: number;
  importDutyKes: number;
  exciseDutyRate?: number;
  exciseDutyKes: number;
  vatKes: number;
  idfFeeKes: number;
  rdlFeeKes: number;
  totalKraTaxesKes: number;
  portChargesKes: number;
  landedVehicleValueKes: number;
  sourcingCommissionRate?: number;
  sourcingCommissionKes: number;
  grandTotalKes: number;
  depositPaidKes?: number;
  cifPaidKes?: number;
  dutyPaidKes?: number;
  balanceDueKes?: number;
  status: string;
  notes?: string;
  releasedBy?: string;
  releasedAt?: string;
  releaseNotes?: string;
  lastEmailedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum FraudReportReason {
  SCAM = 'SCAM',
  FAKE_MILEAGE = 'FAKE_MILEAGE',
  STOLEN_VEHICLE = 'STOLEN_VEHICLE',
  MISLEADING_DESCRIPTION = 'MISLEADING_DESCRIPTION',
  DEPOSIT_SCAM = 'DEPOSIT_SCAM',
  OTHER = 'OTHER'
}

export interface FraudReport {
  id: string;
  listingId?: string;
  listing?: VehicleListing;
  reporterId: string;
  reporter?: User;
  reason: 'SCAM' | 'FAKE_MILEAGE' | 'STOLEN_VEHICLE' | 'MISLEADING_DESCRIPTION' | 'DEPOSIT_SCAM' | 'OTHER';
  description: string;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  adminNotes?: string;
  createdAt: string;
}

export interface ImportRequest {
  id: string;
  userId: string;
  user?: User;
  make: string;
  model: string;
  minYear: number;
  colorPreference?: string;
  maxMileage?: number;
  budgetKes: number;
  sourceCountry: string;
  additionalNotes?: string;
  status: 'PENDING' | 'SOURCING' | 'QUOTED' | 'CIF_PAID' | 'SHIPPING_LOADED' | 'IN_TRANSIT' | 'ARRIVED' | 'CLEARING' | 'BALANCE_DUE' | 'READY_FOR_COLLECTION' | 'COMPLETED' | 'CANCELLED';
  cifAmount?: number;
  balanceAmount?: number;
  quoteUrl?: string;
  contractUrl?: string;
  vesselName?: string;
  eta?: string;
  adminResponse?: any;
  createdAt: string;
  updatedAt: string;
}
