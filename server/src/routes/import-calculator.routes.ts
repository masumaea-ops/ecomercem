import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { CrspData } from '../entities/CrspData';
import { ImportConciergeInvoice, ConciergeInvoiceStatus } from '../entities/ImportConciergeInvoice';
import { SystemSetting } from '../entities/SystemSetting';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { calculateKraVehicleImport, DIRECT_IMPORT_DEPRECIATION } from '../utils/kraValuationEngine';
import { parseCrspWorkbook } from '../utils/crspWorkbookParser';
import { parseCrspCsvText } from '../utils/crspCsvParser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { User, UserRole, UserStatus } from '../entities/User';
import { Security } from '../utils/security';
import { ConciergeNotifier } from '../utils/conciergeNotifier';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB ceiling

// 1. POST /api/import-calculator/calculate - KRA 2025 Reverse Valuation Engine
const calculateSchema = z.object({
  crspId: z.string().optional(),
  customCrsp: z.coerce.number().optional(),
  yearOfManufacture: z.coerce.number().int().min(2010).max(2035),
  engineSize: z.coerce.number().optional(),
  fuelType: z.string().optional(),
  vehicleType: z.string().optional().default('CAR'),
  cifValue: z.coerce.number().optional(),
  portCharges: z.coerce.number().optional()
});

router.post('/calculate', async (req, res) => {
  try {
    const data = calculateSchema.parse(req.body);
    let crspBenchmark = 0;
    let engineCc = data.engineSize || 1500;
    let fuelType = data.fuelType || 'GASOLINE';
    let vehicleType = data.vehicleType || 'CAR';
    let resolvedVehicleName = '';

    if (data.crspId) {
      const crspRepo = AppDataSource.getRepository(CrspData);
      const record = await crspRepo.findOneBy({ id: data.crspId });
      if (record) {
        crspBenchmark = Number(record.crspValue);
        if (record.engineSize) engineCc = Number(record.engineSize);
        if (record.fuelType) fuelType = record.fuelType;
        if (record.category) vehicleType = record.category;
        resolvedVehicleName = `${record.make} ${record.model} ${record.modelNumber || ''}`.trim();
      }
    }

    if (data.customCrsp && data.customCrsp > 0) {
      crspBenchmark = data.customCrsp;
    }

    if (crspBenchmark <= 0 && (!data.cifValue || data.cifValue <= 0)) {
      return res.status(400).json({ error: 'Valid KRA CRSP benchmark or CIF value is required for calculation.' });
    }

    const breakdown = calculateKraVehicleImport({
      crspBenchmarkKes: crspBenchmark,
      yearOfManufacture: data.yearOfManufacture,
      engineCc,
      fuelType,
      vehicleType,
      cifValueKes: data.cifValue,
      portChargesKes: data.portCharges
    });

    res.json({
      vehicleName: resolvedVehicleName,
      cif: breakdown.customsValueCifKes,
      importDuty: breakdown.importDutyKes,
      exciseDuty: breakdown.exciseDutyKes,
      vat: breakdown.vatKes,
      idf: breakdown.idfFeeKes,
      rdl: breakdown.rdlFeeKes,
      totalTaxes: breakdown.totalKraTaxesKes,
      portCharges: breakdown.portChargesKes,
      landedVehicleValue: breakdown.landedVehicleValueKes,
      sourcingCommissionRate: breakdown.sourcingCommissionRate,
      sourcingCommission: breakdown.sourcingCommissionKes,
      grandTotal: breakdown.grandTotalKes,
      totalCost: breakdown.grandTotalKes,
      breakdown
    });
  } catch (error: any) {
    logger.error('CRSP Import Calculation Error:', error);
    res.status(400).json({ error: error.message || 'Calculation failed' });
  }
});

// 2. GET /api/import-calculator/crsp/search - Fast Live Autocomplete Search
router.get('/crsp/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').trim();
    const make = req.query.make as string;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const crspRepo = AppDataSource.getRepository(CrspData);

    const qb = crspRepo.createQueryBuilder('c');

    if (make) {
      qb.andWhere('c.make = :make', { make: make.toUpperCase() });
    }

    if (q) {
      const tokens = q.split(/\s+/).filter(t => t.length > 0).slice(0, 4);
      tokens.forEach((token, idx) => {
        qb.andWhere(
          `(c.make LIKE :t${idx} OR c.model LIKE :t${idx} OR c.modelNumber LIKE :t${idx})`,
          { [`t${idx}`]: `%${token}%` }
        );
      });
    }

    qb.orderBy('c.make', 'ASC')
      .addOrderBy('c.model', 'ASC')
      .take(limit);

    const results = await qb.getMany();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/import-calculator/crsp/makes - Unique Makes List
router.get('/crsp/makes', async (req, res) => {
  try {
    const crspRepo = AppDataSource.getRepository(CrspData);
    const makes = await crspRepo.createQueryBuilder('c')
      .select('DISTINCT c.make', 'make')
      .orderBy('make', 'ASC')
      .getRawMany();
    res.json(makes.map(m => m.make));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/import-calculator/crsp/models - Unique Models for Make
router.get('/crsp/models', async (req, res) => {
  try {
    const { make } = req.query;
    if (!make) return res.status(400).json({ error: 'Make is required' });
    
    const crspRepo = AppDataSource.getRepository(CrspData);
    const models = await crspRepo.createQueryBuilder('c')
      .select('DISTINCT c.model', 'model')
      .where('c.make = :make', { make: String(make).toUpperCase() })
      .orderBy('model', 'ASC')
      .getRawMany();
    res.json(models.map(m => m.model));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/import-calculator/crsp - List / filter CRSP records
router.get('/crsp', async (req, res) => {
  try {
    const { make, model, search, page = 1, limit = 50 } = req.query;
    const crspRepo = AppDataSource.getRepository(CrspData);
    
    const query = crspRepo.createQueryBuilder('c');

    if (make) query.andWhere('c.make = :make', { make: String(make).toUpperCase() });
    if (model) query.andWhere('c.model = :model', { model: String(model) });
    
    if (search) {
      query.andWhere('(c.make LIKE :search OR c.model LIKE :search OR c.modelNumber LIKE :search)', { search: `%${search}%` });
    }

    const [results, total] = await query
      .orderBy('c.make', 'ASC')
      .addOrderBy('c.model', 'ASC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({ results, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/import-calculator/invoice - Raise Official Concierge Proforma Invoice & Auto-Provision Buyer Account
const createInvoiceSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(8, 'Valid phone number is required'),
  customerPin: z.string().optional(),
  customerIdNumber: z.string().optional(),
  customerAddress: z.string().optional(),
  crspId: z.string().optional(),
  vehicleMake: z.string().min(1),
  vehicleModel: z.string().min(1),
  modelNumber: z.string().optional(),
  yearOfManufacture: z.coerce.number().int().min(2010).max(2035),
  engineSize: z.coerce.number().optional().default(1500),
  fuelType: z.string().optional().default('GASOLINE'),
  vehicleType: z.string().optional().default('CAR'),
  transmission: z.string().optional(),
  driveConfiguration: z.string().optional(),
  customCrsp: z.coerce.number().optional(),
  includeRegistration: z.boolean().optional().default(true),
  notes: z.string().optional()
});

router.post('/invoice', async (req, res) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    let crspBenchmark = 0;

    if (data.crspId) {
      const crspRepo = AppDataSource.getRepository(CrspData);
      const record = await crspRepo.findOneBy({ id: data.crspId });
      if (record) {
        crspBenchmark = Number(record.crspValue);
      }
    }

    if (data.customCrsp && data.customCrsp > 0) {
      crspBenchmark = data.customCrsp;
    }

    if (crspBenchmark <= 0) {
      return res.status(400).json({ error: 'Valid CRSP benchmark is required to generate a Proforma Invoice.' });
    }

    const calc = calculateKraVehicleImport({
      crspBenchmarkKes: crspBenchmark,
      yearOfManufacture: data.yearOfManufacture,
      engineCc: data.engineSize,
      fuelType: data.fuelType,
      vehicleType: data.vehicleType
    });

    // 1. Check or Auto-Provision Buyer Account
    const userRepo = AppDataSource.getRepository(User);
    const normalizedEmail = data.customerEmail.toLowerCase().trim();
    let buyerUser = await userRepo.findOneBy({ email: normalizedEmail });
    let tempPassword: string | undefined = undefined;

    if (!buyerUser) {
      buyerUser = new User();
      buyerUser.email = normalizedEmail;
      buyerUser.fullName = data.customerName.trim();
      buyerUser.phone = data.customerPhone.trim();
      buyerUser.role = UserRole.BUYER;
      buyerUser.status = UserStatus.APPROVED;
      tempPassword = `Masuma@${Math.floor(1000 + Math.random() * 9000)}`;
      buyerUser.passwordHash = await Security.hashPassword(tempPassword);
      await userRepo.save(buyerUser);
      logger.info(`Auto-provisioned buyer account for ${buyerUser.email} (ID: ${buyerUser.id})`);
    }

    // 2. Prepare Concierge Invoice
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const invoice = new ImportConciergeInvoice();
    invoice.invoiceNumber = `INV-CON-${Date.now().toString().slice(-6)}`;
    invoice.userId = buyerUser.id;
    invoice.includeRegistration = data.includeRegistration !== false;
    invoice.registrationFeeKes = invoice.includeRegistration ? 25000 : 0;
    invoice.customerName = data.customerName.trim();
    invoice.customerEmail = normalizedEmail;
    invoice.customerPhone = data.customerPhone.trim();
    invoice.customerPin = data.customerPin?.trim() || '';
    invoice.customerIdNumber = data.customerIdNumber?.trim() || '';
    invoice.customerAddress = data.customerAddress?.trim() || '';
    invoice.crspId = data.crspId || '';
    invoice.vehicleMake = data.vehicleMake.trim().toUpperCase();
    invoice.vehicleModel = data.vehicleModel.trim();
    invoice.modelNumber = data.modelNumber?.trim() || '';
    invoice.yearOfManufacture = data.yearOfManufacture;
    invoice.vehicleAge = calc.vehicleAge;
    invoice.engineSize = data.engineSize;
    invoice.fuelType = data.fuelType;
    invoice.vehicleType = data.vehicleType;
    invoice.transmission = data.transmission || '';
    invoice.driveConfiguration = data.driveConfiguration || '';
    invoice.crspBenchmarkKes = calc.crspBenchmarkKes;
    invoice.depreciationRate = calc.depreciationRate;
    invoice.depreciatedCrspKes = calc.depreciatedCrspKes;
    invoice.customsValueCifKes = calc.customsValueCifKes;
    invoice.importDutyRate = calc.importDutyRate;
    invoice.importDutyKes = calc.importDutyKes;
    invoice.exciseDutyRate = calc.exciseDutyRate;
    invoice.exciseDutyKes = calc.exciseDutyKes;
    invoice.vatKes = calc.vatKes;
    invoice.idfFeeKes = calc.idfFeeKes;
    invoice.rdlFeeKes = calc.rdlFeeKes;
    invoice.totalKraTaxesKes = calc.totalKraTaxesKes;
    invoice.portChargesKes = calc.portChargesKes;
    invoice.landedVehicleValueKes = calc.landedVehicleValueKes;
    invoice.sourcingCommissionRate = calc.sourcingCommissionRate;
    invoice.sourcingCommissionKes = calc.sourcingCommissionKes;
    invoice.grandTotalKes = calc.grandTotalKes;
    invoice.status = ConciergeInvoiceStatus.PROFORMA;
    invoice.notes = data.notes || '';

    // Initial Stop 1 Tracking History
    const initialTracking = [
      {
        stop: ConciergeInvoiceStatus.PROFORMA,
        title: 'Stop 1: Proforma Invoice Raised & Buyer Account Provisioned',
        location: 'Masuma Concierge Hub, Nairobi',
        timestamp: new Date().toISOString(),
        notes: `Proforma generated with Lipa Na M-Pesa & Bank Wire settlement details. ${invoice.includeRegistration ? 'NTSA Registration & Number Plates package included.' : ''}`
      }
    ];
    invoice.trackingHistory = JSON.stringify(initialTracking);

    await invoiceRepo.save(invoice);

    // 3. Dispatch Automated Stop 1 Email Notification to Buyer
    ConciergeNotifier.notifyMilestone({
      invoice,
      stop: ConciergeInvoiceStatus.PROFORMA,
      tempPassword,
      notes: 'Your concierge request and proforma have been generated. Review and deposit the initial 30% sourcing commitment.'
    }).catch(e => logger.warn('Failed to dispatch Stop 1 notification:', e.message));

    res.status(201).json({
      invoice,
      accountCreated: !!tempPassword,
      buyerEmail: normalizedEmail
    });
  } catch (error: any) {
    logger.error('Failed to create concierge invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

// 7. GET /api/import-calculator/invoices - List Invoices with Search & Filter
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status } = req.query;
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const qb = invoiceRepo.createQueryBuilder('inv');

    if (search) {
      qb.andWhere(
        '(inv.invoiceNumber LIKE :s OR inv.customerName LIKE :s OR inv.customerEmail LIKE :s OR inv.customerPhone LIKE :s OR inv.vehicleMake LIKE :s OR inv.vehicleModel LIKE :s OR inv.chassisNumber LIKE :s)',
        { s: `%${search}%` }
      );
    }

    if (status) {
      qb.andWhere('inv.status = :status', { status });
    }

    qb.orderBy('inv.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit));

    const [invoices, total] = await qb.getManyAndCount();
    res.json({ invoices, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/import-calculator/invoice/:identifier - Lookup Invoice by ID or Invoice Number
router.get('/invoice/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const invoice = await invoiceRepo.findOne({
      where: [
        { invoiceNumber: identifier },
        { id: identifier }
      ]
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. PATCH /api/import-calculator/invoice/:id - Modify Invoice Data & Costs
router.patch('/invoice/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const invoice = await invoiceRepo.findOne({
      where: [{ id }, { invoiceNumber: id }]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const b = req.body;
    const previousStatus = invoice.status;

    // Editable customer details
    if (b.customerName !== undefined) invoice.customerName = b.customerName.trim();
    if (b.customerEmail !== undefined) invoice.customerEmail = b.customerEmail.trim();
    if (b.customerPhone !== undefined) invoice.customerPhone = b.customerPhone.trim();
    if (b.customerPin !== undefined) invoice.customerPin = b.customerPin.trim();
    if (b.customerIdNumber !== undefined) invoice.customerIdNumber = b.customerIdNumber.trim();
    if (b.customerAddress !== undefined) invoice.customerAddress = b.customerAddress.trim();

    // Editable vehicle specs & carrier tracking
    if (b.vehicleMake !== undefined) invoice.vehicleMake = b.vehicleMake.trim().toUpperCase();
    if (b.vehicleModel !== undefined) invoice.vehicleModel = b.vehicleModel.trim();
    if (b.modelNumber !== undefined) invoice.modelNumber = b.modelNumber.trim();
    if (b.yearOfManufacture !== undefined) invoice.yearOfManufacture = Number(b.yearOfManufacture);
    if (b.engineSize !== undefined) invoice.engineSize = Number(b.engineSize);
    if (b.fuelType !== undefined) invoice.fuelType = b.fuelType;
    if (b.vehicleType !== undefined) invoice.vehicleType = b.vehicleType;
    if (b.transmission !== undefined) invoice.transmission = b.transmission;
    if (b.driveConfiguration !== undefined) invoice.driveConfiguration = b.driveConfiguration;
    if (b.chassisNumber !== undefined) invoice.chassisNumber = b.chassisNumber.trim();
    if (b.engineNumber !== undefined) invoice.engineNumber = b.engineNumber.trim();
    if (b.exteriorColor !== undefined) invoice.exteriorColor = b.exteriorColor.trim();
    if (b.mileageKm !== undefined) invoice.mileageKm = Number(b.mileageKm);
    if (b.registrationPlate !== undefined) invoice.registrationPlate = b.registrationPlate.trim();
    if (b.kraEntryNumber !== undefined) invoice.kraEntryNumber = b.kraEntryNumber.trim();
    if (b.portReleaseNumber !== undefined) invoice.portReleaseNumber = b.portReleaseNumber.trim();
    if (b.vesselName !== undefined) invoice.vesselName = b.vesselName.trim();
    if (b.voyageNumber !== undefined) invoice.voyageNumber = b.voyageNumber.trim();
    if (b.billOfLadingNumber !== undefined) invoice.billOfLadingNumber = b.billOfLadingNumber.trim();
    if (b.portOfLoading !== undefined) invoice.portOfLoading = b.portOfLoading.trim();
    if (b.portOfDischarge !== undefined) invoice.portOfDischarge = b.portOfDischarge.trim();
    if (b.etaDate !== undefined) invoice.etaDate = b.etaDate ? new Date(b.etaDate) : null as any;
    if (b.includeRegistration !== undefined) invoice.includeRegistration = !!b.includeRegistration;
    if (b.registrationFeeKes !== undefined) invoice.registrationFeeKes = Number(b.registrationFeeKes);
    if (b.status !== undefined) invoice.status = b.status;
    if (b.notes !== undefined) invoice.notes = b.notes;

    // If cost parameters are adjusted and recalculation is requested
    const shouldRecalculate = b.recalculate === true || b.recalculate === 'true';
    if (shouldRecalculate && (b.crspBenchmarkKes || invoice.crspBenchmarkKes)) {
      const crspToUse = Number(b.crspBenchmarkKes || invoice.crspBenchmarkKes);
      const yomToUse = Number(b.yearOfManufacture || invoice.yearOfManufacture);
      const calc = calculateKraVehicleImport({
        crspBenchmarkKes: crspToUse,
        yearOfManufacture: yomToUse,
        engineCc: Number(b.engineSize || invoice.engineSize),
        fuelType: b.fuelType || invoice.fuelType,
        vehicleType: b.vehicleType || invoice.vehicleType,
        cifValueKes: b.customsValueCifKes ? Number(b.customsValueCifKes) : undefined,
        portChargesKes: b.portChargesKes ? Number(b.portChargesKes) : undefined
      });

      invoice.vehicleAge = calc.vehicleAge;
      invoice.crspBenchmarkKes = calc.crspBenchmarkKes;
      invoice.depreciationRate = calc.depreciationRate;
      invoice.depreciatedCrspKes = calc.depreciatedCrspKes;
      invoice.customsValueCifKes = calc.customsValueCifKes;
      invoice.importDutyRate = calc.importDutyRate;
      invoice.importDutyKes = calc.importDutyKes;
      invoice.exciseDutyRate = calc.exciseDutyRate;
      invoice.exciseDutyKes = calc.exciseDutyKes;
      invoice.vatKes = calc.vatKes;
      invoice.idfFeeKes = calc.idfFeeKes;
      invoice.rdlFeeKes = calc.rdlFeeKes;
      invoice.totalKraTaxesKes = calc.totalKraTaxesKes;
      invoice.portChargesKes = calc.portChargesKes;
      invoice.landedVehicleValueKes = calc.landedVehicleValueKes;
      invoice.sourcingCommissionRate = calc.sourcingCommissionRate;
      invoice.sourcingCommissionKes = calc.sourcingCommissionKes;
      invoice.grandTotalKes = calc.grandTotalKes;
    } else {
      // Direct explicit manual cost overrides
      if (b.crspBenchmarkKes !== undefined) invoice.crspBenchmarkKes = Number(b.crspBenchmarkKes);
      if (b.customsValueCifKes !== undefined) invoice.customsValueCifKes = Number(b.customsValueCifKes);
      if (b.importDutyKes !== undefined) invoice.importDutyKes = Number(b.importDutyKes);
      if (b.exciseDutyKes !== undefined) invoice.exciseDutyKes = Number(b.exciseDutyKes);
      if (b.vatKes !== undefined) invoice.vatKes = Number(b.vatKes);
      if (b.idfFeeKes !== undefined) invoice.idfFeeKes = Number(b.idfFeeKes);
      if (b.rdlFeeKes !== undefined) invoice.rdlFeeKes = Number(b.rdlFeeKes);
      if (b.totalKraTaxesKes !== undefined) invoice.totalKraTaxesKes = Number(b.totalKraTaxesKes);
      if (b.portChargesKes !== undefined) invoice.portChargesKes = Number(b.portChargesKes);
      if (b.landedVehicleValueKes !== undefined) invoice.landedVehicleValueKes = Number(b.landedVehicleValueKes);
      if (b.sourcingCommissionRate !== undefined) invoice.sourcingCommissionRate = Number(b.sourcingCommissionRate);
      if (b.sourcingCommissionKes !== undefined) invoice.sourcingCommissionKes = Number(b.sourcingCommissionKes);
      if (b.grandTotalKes !== undefined) invoice.grandTotalKes = Number(b.grandTotalKes);
    }

    // Payment updates
    if (b.depositPaidKes !== undefined) invoice.depositPaidKes = Number(b.depositPaidKes);
    if (b.cifPaidKes !== undefined) invoice.cifPaidKes = Number(b.cifPaidKes);
    if (b.dutyPaidKes !== undefined) invoice.dutyPaidKes = Number(b.dutyPaidKes);

    const totalPaid = Number(invoice.depositPaidKes || 0) + Number(invoice.cifPaidKes || 0) + Number(invoice.dutyPaidKes || 0);
    invoice.balanceDueKes = Math.max(0, Number(invoice.grandTotalKes || 0) - totalPaid);

    if (totalPaid >= Number(invoice.grandTotalKes) && Number(invoice.grandTotalKes) > 0) {
      if (invoice.status === ConciergeInvoiceStatus.PROFORMA || invoice.status === ConciergeInvoiceStatus.CONFIRMED || invoice.status === ConciergeInvoiceStatus.CUSTOMS_CLEARING) {
        invoice.status = ConciergeInvoiceStatus.FULLY_PAID;
      }
    }

    // Record milestone stop & notify buyer if status changed
    const statusChanged = b.status && b.status !== previousStatus;
    if (statusChanged || b.recordMilestoneStop) {
      let history: any[] = [];
      try {
        history = JSON.parse(invoice.trackingHistory || '[]');
      } catch (e) {
        history = [];
      }
      history.push({
        stop: invoice.status,
        title: b.milestoneTitle || `Stop: ${invoice.status.replace(/_/g, ' ')}`,
        location: b.currentLocation || (invoice.status.includes('MOMBASA') ? 'Port of Mombasa, Kenya' : (invoice.status.includes('TRANSIT') ? 'Ocean Ro-Ro Vessel' : 'Nairobi Concierge Hub')),
        timestamp: new Date().toISOString(),
        notes: b.notes || b.statusNotes || `Vehicle updated to ${invoice.status}.`
      });
      invoice.trackingHistory = JSON.stringify(history);

      // Automated email notification on this stop!
      ConciergeNotifier.notifyMilestone({
        invoice,
        stop: invoice.status,
        notes: b.notes || b.statusNotes
      }).catch(e => logger.warn(`Milestone notification error for ${invoice.status}:`, e.message));
    }

    await invoiceRepo.save(invoice);
    res.json(invoice);
  } catch (error: any) {
    logger.error('Failed to update concierge invoice:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/import-calculator/track/:query - Live Public Vehicle Tracking Lookup
router.get('/track/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const cleanQuery = query.trim();
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);

    const invoice = await invoiceRepo.findOne({
      where: [
        { invoiceNumber: cleanQuery },
        { customerPhone: cleanQuery },
        { chassisNumber: cleanQuery }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'No vehicle import record found for this tracking reference.' });
    }

    let history: any[] = [];
    try {
      history = JSON.parse(invoice.trackingHistory || '[]');
    } catch (e) {
      history = [];
    }

    res.json({
      invoice,
      trackingHistory: history,
      currentStop: invoice.status
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/import-calculator/my-invoices - Buyer's Vehicle Invoices & Tracking Records
router.get('/my-invoices', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const whereConditions: any[] = [
      { userId: user.id },
      { customerEmail: user.email }
    ];
    if (user.phone) {
      whereConditions.push({ customerPhone: user.phone });
    }
    const invoices = await invoiceRepo.find({
      where: whereConditions,
      order: { createdAt: 'DESC' }
    });

    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/import-calculator/invoice/:id/email - Re-email Proforma Invoice to Client
router.post('/invoice/:id/email', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const invoice = await invoiceRepo.findOne({
      where: [{ id }, { invoiceNumber: id }]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const totalPaid = Number(invoice.depositPaidKes || 0) + Number(invoice.cifPaidKes || 0) + Number(invoice.dutyPaidKes || 0);
    const balance = Math.max(0, Number(invoice.grandTotalKes) - totalPaid);

    const formatKes = (amt: number) => `KES ${Number(amt || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const subject = `[MASUMA CONCIERGE] Updated Proforma Invoice: ${invoice.invoiceNumber} - ${invoice.vehicleMake} ${invoice.vehicleModel}`;

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #1a1a1a; padding: 28px 32px; border-bottom: 4px solid #ff6600;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">MASUMA VEHICLE IMPORT CONCIERGE</h1>
          <p style="color: #ff6600; margin: 6px 0 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase;">Official Proforma Invoice & Statutory Tariff Schedule</p>
        </div>

        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Dear <strong>${invoice.customerName}</strong>,
          </p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            Please find your updated vehicle import quotation and statutory tax assessment for <strong>${invoice.vehicleMake} ${invoice.vehicleModel} (${invoice.yearOfManufacture})</strong>.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Vehicle Description:</td>
                <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.vehicleMake} ${invoice.vehicleModel} ${invoice.modelNumber ? `(${invoice.modelNumber})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Chassis / VIN:</td>
                <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.chassisNumber || 'To be assigned upon auction procurement'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Year of Manufacture:</td>
                <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.yearOfManufacture} (${invoice.vehicleAge} Years Old)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Current Status:</td>
                <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #ff6600;">${invoice.status}</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 15px; font-weight: 800; color: #111827; margin: 24px 0 12px 0; text-transform: uppercase;">Statutory Cost Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 10px 12px; border: 1px solid #e5e7eb;">Line Item / Customs Tariff</th>
                <th style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">KRA Benchmark CRSP (New)</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${formatKes(invoice.crspBenchmarkKes)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Allowable Age Depreciation (${Math.round((invoice.depreciationRate || 0.65) * 100)}%)</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right; color: #059669;">-${formatKes(Number(invoice.crspBenchmarkKes) - Number(invoice.depreciatedCrspKes))}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Customs Valuation (CIF Basis)</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${formatKes(invoice.customsValueCifKes)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Total KRA Taxes (Duty, Excise, VAT, IDF, RDL)</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${formatKes(invoice.totalKraTaxesKes)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Port Handling & CFS Clearance</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${formatKes(invoice.portChargesKes)}</td>
              </tr>
              <tr style="background: #fdf2e9; font-weight: 700;">
                <td style="padding: 8px 12px; border: 1px solid #fed7aa; color: #9a3412;">TOTAL LANDED VEHICLE COST</td>
                <td style="padding: 8px 12px; border: 1px solid #fed7aa; text-align: right; color: #9a3412;">${formatKes(invoice.landedVehicleValueKes)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #4b5563;">Masuma Concierge Sourcing Commission (3.5%)</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${formatKes(invoice.sourcingCommissionKes)}</td>
              </tr>
              <tr style="background: #1a1a1a; color: #ffffff; font-weight: 800; font-size: 14px;">
                <td style="padding: 12px 12px;">TOTAL PROFORMA INVOICE PAYABLE</td>
                <td style="padding: 12px 12px; text-align: right; color: #ff6600;">${formatKes(invoice.grandTotalKes)}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
            <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 14px; font-weight: 700;">Payment Summary & Settlement</h4>
            <p style="margin: 4px 0; font-size: 13px; color: #047857;">Total Paid to Date: <strong>${formatKes(totalPaid)}</strong></p>
            <p style="margin: 4px 0; font-size: 14px; color: #b91c1c; font-weight: 800;">Current Balance Due: <strong>${formatKes(balance)}</strong></p>
          </div>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 18px 20px; margin: 24px 0; font-size: 13px; line-height: 1.6; color: #374151;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #111827;">OFFICIAL PAYMENT INSTRUCTIONS:</p>
            <p style="margin: 4px 0;">• <strong>Lipa Na M-Pesa Paybill:</strong> 247247 | <strong>Account Number:</strong> ${invoice.invoiceNumber}</p>
            <p style="margin: 4px 0;">• <strong>Bank Wire:</strong> NCBA Bank Kenya PLC | Industrial Area Branch</p>
            <p style="margin: 4px 0;">• <strong>Account Name:</strong> Masuma Africa Concierge Ltd | <strong>Account No:</strong> 1002345892</p>
          </div>

          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            This proforma invoice is generated under the laws of Kenya (Cap 23 & 31) and includes genuine auction sourcing, KEBS KS 1515:2000 roadworthiness verification, and door-to-door delivery.
          </p>
        </div>
      </div>
    `;

    await EmailService.sendRawEmail(invoice.customerEmail, subject, htmlContent);

    invoice.lastEmailedAt = new Date();
    await invoiceRepo.save(invoice);

    res.json({ message: `Updated proforma invoice successfully dispatched to ${invoice.customerEmail}` });
  } catch (error: any) {
    logger.error('Failed to email invoice to client:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch email' });
  }
});

// 11. POST /api/import-calculator/invoice/:id/release - Official Vehicle Release & Handover
router.post('/invoice/:id/release', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      chassisNumber,
      engineNumber,
      registrationPlate,
      mileageKm,
      kraEntryNumber,
      portReleaseNumber,
      releasedBy,
      releaseNotes
    } = req.body;

    const invoiceRepo = AppDataSource.getRepository(ImportConciergeInvoice);
    const invoice = await invoiceRepo.findOne({
      where: [{ id }, { invoiceNumber: id }]
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    invoice.status = ConciergeInvoiceStatus.RELEASED;
    invoice.releasedAt = new Date();
    invoice.releasedBy = releasedBy || (req as any).user?.fullName || 'Masuma Logistics Officer';
    invoice.releaseNotes = releaseNotes || 'Vehicle cleared all inspections and handed over in clean condition.';
    if (chassisNumber) invoice.chassisNumber = chassisNumber.trim();
    if (engineNumber) invoice.engineNumber = engineNumber.trim();
    if (registrationPlate) invoice.registrationPlate = registrationPlate.trim();
    if (mileageKm) invoice.mileageKm = Number(mileageKm);
    if (kraEntryNumber) invoice.kraEntryNumber = kraEntryNumber.trim();
    if (portReleaseNumber) invoice.portReleaseNumber = portReleaseNumber.trim();
    invoice.balanceDueKes = 0;

    await invoiceRepo.save(invoice);

    // Send official Vehicle Release notification email
    const subject = `[MASUMA CONCIERGE] Official Vehicle Release Order: ${invoice.vehicleMake} ${invoice.vehicleModel} - ${invoice.invoiceNumber}`;
    const releaseHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #10b981; border-radius: 12px; overflow: hidden;">
        <div style="background: #064e3b; padding: 28px 32px; border-bottom: 4px solid #10b981;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">OFFICIAL VEHICLE RELEASE ORDER & HANDOVER</h1>
          <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px; font-weight: 700;">Masuma Vehicle Import Concierge Kenya</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #111827;">Dear <strong>${invoice.customerName}</strong>,</p>
          <p style="font-size: 14px; color: #374151;">
            We are pleased to certify that your vehicle <strong>${invoice.vehicleMake} ${invoice.vehicleModel}</strong> has cleared all KRA customs assessments, KEBS inspections, and port CFS procedures. Full settlement of <strong>KES ${Number(invoice.grandTotalKes).toLocaleString()}</strong> has been acknowledged.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin: 24px 0; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Chassis / VIN:</strong> ${invoice.chassisNumber || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Engine Number:</strong> ${invoice.engineNumber || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Registration Mark / Plate:</strong> ${invoice.registrationPlate || 'Pending Registration'}</p>
            <p style="margin: 4px 0;"><strong>KRA Customs Entry:</strong> ${invoice.kraEntryNumber || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Port CFS Delivery Order:</strong> ${invoice.portReleaseNumber || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Handover Officer:</strong> ${invoice.releasedBy}</p>
            <p style="margin: 4px 0;"><strong>Handover Date:</strong> ${invoice.releasedAt.toLocaleString()}</p>
            <p style="margin: 4px 0; color: #059669; font-weight: 800;">Outstanding Balance: KES 0.00 (CLEARED IN FULL)</p>
          </div>

          <p style="font-size: 13px; color: #4b5563;">
            You may present your National ID / Passport and this release certificate at our showroom or delivery hub to finalize logbook transfer on the NTSA TIMS / eCitizen portal.
          </p>
        </div>
      </div>
    `;

    try {
      await EmailService.sendRawEmail(invoice.customerEmail, subject, releaseHtml);
    } catch (e: any) {
      logger.warn('Could not dispatch release email:', e.message);
    }

    res.json({ message: 'Vehicle successfully marked as released and handover recorded.', invoice });
  } catch (error: any) {
    logger.error('Failed to release vehicle:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. POST /api/import-calculator/upload-crsp-file - Direct Multipart Upload for CSV/Excel
router.post('/upload-crsp-file', authenticate, authorize(['ADMIN']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const buffer = req.file.buffer;
    const edition = (req.body.edition || '2025').trim();
    let records: any[] = [];

    const filename = req.file.originalname.toLowerCase();
    if (filename.endsWith('.csv') || req.file.mimetype.includes('csv')) {
      records = parseCrspCsvText(buffer.toString('utf8'), edition);
    } else {
      records = parseCrspWorkbook(buffer, edition);
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid CRSP records could be parsed from the file.' });
    }

    const crspRepo = AppDataSource.getRepository(CrspData);
    if (req.body.replace === 'true' || req.body.replace === true) {
      await crspRepo.createQueryBuilder().delete().where('crspEdition = :edition', { edition }).execute();
    }

    const entities = crspRepo.create(records);
    await crspRepo.save(entities, { chunk: 500 });

    res.json({
      message: `Successfully uploaded and indexed ${entities.length} CRSP records for edition ${edition}.`,
      totalIndexed: entities.length
    });
  } catch (error: any) {
    logger.error('CRSP File Upload Error:', error);
    res.status(500).json({ error: error.message || 'File upload failed.' });
  }
});

// 9. POST /api/import-calculator/upload-crsp - JSON Array Upload (for backward compatibility)
router.post('/upload-crsp', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data must be a non-empty array of CRSP records' });
    }

    const crspRepo = AppDataSource.getRepository(CrspData);
    const cleaned = data.map((d: any) => ({
      make: String(d.make || '').toUpperCase().trim(),
      model: String(d.model || '').trim(),
      modelNumber: d.modelNumber ? String(d.modelNumber).trim() : undefined,
      transmission: d.transmission || undefined,
      driveConfiguration: d.driveConfiguration || undefined,
      engineSize: d.engineSize ? Number(d.engineSize) : undefined,
      category: d.category || d.bodyType || 'SUV',
      fuelType: String(d.fuelType || d.fuel || 'GASOLINE').toUpperCase(),
      crspValue: Number(d.crspValue || d.crsp || 0),
      crspEdition: d.crspEdition || '2025'
    })).filter(d => d.make && d.model && d.crspValue > 0);

    const entities = crspRepo.create(cleaned);
    await crspRepo.save(entities, { chunk: 500 });

    res.json({ message: `Successfully uploaded ${entities.length} CRSP records.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/import-calculator/seed-2025-crsp - Auto-seeding 2025 Schedule
router.post('/seed-2025-crsp', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../data/crsp_2025_template.xlsx'),
      path.resolve(__dirname, '../../src/data/crsp_2025_template.xlsx'),
      path.resolve(process.cwd(), 'server', 'src', 'data', 'crsp_2025_template.xlsx'),
      path.resolve(process.cwd(), 'src', 'data', 'crsp_2025_template.xlsx'),
      path.resolve(process.cwd(), 'server', 'dist', 'data', 'crsp_2025_template.xlsx'),
      path.resolve(process.cwd(), 'dist', 'data', 'crsp_2025_template.xlsx')
    ];

    const xlsxPath = candidatePaths.find(p => fs.existsSync(p));
    if (!xlsxPath) {
      logger.error('2025 CRSP template file not found on disk. Checked candidates: ' + candidatePaths.join(', '));
      return res.status(404).json({ error: '2025 CRSP template file not found on disk. Please upload via the upload button.' });
    }

    const buffer = fs.readFileSync(xlsxPath);
    const records = parseCrspWorkbook(buffer, '2025');

    const crspRepo = AppDataSource.getRepository(CrspData);
    await crspRepo.createQueryBuilder().delete().where('crspEdition = :edition', { edition: '2025' }).execute();

    const entities = crspRepo.create(records);
    await crspRepo.save(entities, { chunk: 500 });

    res.json({
      message: `Seeded ${entities.length} vehicles from official KRA 2025 CRSP schedule into active inventory database.`,
      count: entities.length
    });
  } catch (error: any) {
    logger.error('Failed to seed 2025 CRSP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Single CRSP delete
router.delete('/crsp/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const crspRepo = AppDataSource.getRepository(CrspData);
    await crspRepo.delete(id);
    res.json({ message: 'Record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
