import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { VehicleListing, ListingStatus, VehicleType } from '../entities/VehicleListing';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createListingSchema = z.object({
  title: z.string().min(5),
  make: z.string(),
  model: z.string(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  price: z.number().positive(),
  mileage: z.number().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  engineSize: z.number().optional(),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  images: z.array(z.string()).optional(),
  description: z.string().optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  location: z.string().optional(),
  vin: z.string().optional(),
  scanReportUrl: z.string().optional(),
  auctionSheetUrl: z.string().optional(),
  isImported: z.boolean().optional(),
  status: z.nativeEnum(ListingStatus).optional()
});

// Get all active listings with filters
router.get('/', async (req, res) => {
  try {
    const { make, model, minYear, maxYear, minPrice, maxPrice, vehicleType, transmission, fuelType, location, search, page = 1, limit = 20 } = req.query;
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    
    const query = listingRepo.createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE });

    if (make) query.andWhere('listing.make LIKE :make', { make: `%${make}%` });
    if (model) query.andWhere('listing.model LIKE :model', { model: `%${model}%` });
    if (minYear) query.andWhere('listing.year >= :minYear', { minYear: Number(minYear) });
    if (maxYear) query.andWhere('listing.year <= :maxYear', { maxYear: Number(maxYear) });
    if (minPrice) query.andWhere('listing.price >= :minPrice', { minPrice: Number(minPrice) });
    if (maxPrice) query.andWhere('listing.price <= :maxPrice', { maxPrice: Number(maxPrice) });
    if (vehicleType) query.andWhere('listing.vehicleType = :vehicleType', { vehicleType });
    if (transmission) query.andWhere('LOWER(listing.transmission) = LOWER(:transmission)', { transmission });
    if (fuelType) query.andWhere('LOWER(listing.fuelType) = LOWER(:fuelType)', { fuelType });
    if (location) query.andWhere('listing.location LIKE :location', { location: `%${location}%` });
    
    if (search) {
      query.andWhere('(listing.title LIKE :search OR listing.make LIKE :search OR listing.model LIKE :search)', { search: `%${search}%` });
    }

    query.orderBy('listing.createdAt', 'DESC');

    const [results, total] = await query
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    res.json({ results, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get listing by ID
router.get('/:id', async (req, res) => {
  try {
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    const listing = await listingRepo.findOne({
      where: { id: req.params.id },
      relations: ['seller']
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create listing (Authenticated)
router.post('/', authenticate, async (req: any, res) => {
  try {
    const validatedData = createListingSchema.parse(req.body);
    const listingRepo = AppDataSource.getRepository(VehicleListing);

    const listing = listingRepo.create({
      ...validatedData,
      seller: req.user,
      status: ListingStatus.PENDING // Admin might need to approve
    });

    await listingRepo.save(listing);
    res.status(201).json(listing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update listing (Owner or Admin)
router.patch('/:id', authenticate, validate(createListingSchema.partial()), async (req: any, res) => {
  try {
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    const listing = await listingRepo.findOne({
      where: { id: req.params.id },
      relations: ['seller']
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if ((!listing.seller || listing.seller.id !== req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to modify this listing.' });
    }

    // Only Admin can change status
    if (req.body.status && req.user.role !== 'ADMIN') {
      delete req.body.status;
    }

    listingRepo.merge(listing, req.body);
    await listingRepo.save(listing);
    res.json(listing);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete listing (Owner or Admin)
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    const listing = await listingRepo.findOne({
      where: { id: req.params.id },
      relations: ['seller']
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if ((!listing.seller || listing.seller.id !== req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to delete this listing.' });
    }


    await listingRepo.remove(listing);
    res.json({ message: 'Listing deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get my listings
router.get('/my/all', authenticate, async (req: any, res) => {
  try {
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    const listings = await listingRepo.find({
      where: { seller: { id: req.user.id } },
      order: { createdAt: 'DESC' }
    });
    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all listings across the platform
router.get('/admin/all', authenticate, authorize(['ADMIN']), async (req: any, res) => {
  try {
    const listingRepo = AppDataSource.getRepository(VehicleListing);
    const listings = await listingRepo.find({
      relations: ['seller'],
      order: { createdAt: 'DESC' }
    });
    res.json(listings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
