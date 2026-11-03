
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { Quote } from '../entities/Quote';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const getCustomerRepo = () => AppDataSource.getRepository(Customer);

const customerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10),
    address: z.string().optional(),
    kraPin: z.string().optional(),
    isWholesale: z.boolean().optional(),
    status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'DISABLED']).optional()
});

const updateCustomerSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional().or(z.literal('')).nullable(),
    phone: z.string().min(10).optional(),
    address: z.string().optional().nullable(),
    kraPin: z.string().optional().nullable(),
    isWholesale: z.boolean().optional(),
    status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'DISABLED']).optional()
});

// GET /api/customers
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), async (req, res) => {
    try {
        const customerRepo = getCustomerRepo();
        const search = req.query.search as string;
        
        // Use QueryBuilder to calculate Total Spend and Last Visit dynamically
        const query = customerRepo.createQueryBuilder('customer')
            .leftJoin('customer.sales', 'sale')
            .select('customer.id', 'id')
            .addSelect('customer.name', 'name')
            .addSelect('customer.email', 'email')
            .addSelect('customer.phone', 'phone')
            .addSelect('customer.kraPin', 'kraPin')
            .addSelect('customer.address', 'address')
            .addSelect('customer.isWholesale', 'isWholesale')
            .addSelect('customer.status', 'status')
            .addSelect('customer.createdAt', 'createdAt')
            .addSelect('COALESCE(SUM(sale.totalAmount), 0)', 'totalSpend')
            .addSelect('MAX(sale.createdAt)', 'lastVisit')
            .groupBy('customer.id');

        if (search) {
            query.where('customer.name LIKE :search OR customer.phone LIKE :search', { search: `%${search}%` });
        }
        
        const results = await query.getRawMany();
        
        // Map raw results to clean JSON objects
        const customers = results.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            kraPin: r.kraPin,
            address: r.address,
            isWholesale: !!r.isWholesale, // Convert 1/0 to boolean
            status: r.status || 'APPROVED',
            createdAt: r.createdAt,
            totalSpend: Number(r.totalSpend),
            lastVisit: r.lastVisit ? new Date(r.lastVisit).toLocaleDateString() : 'Never'
        }));

        res.json(customers);
    } catch (error) {
        console.error('Fetch Customers Error:', error);
        res.status(500).json({ error: 'Error fetching customers' });
    }
});

// POST /api/customers
router.post('/', authenticate, validate(customerSchema), async (req, res) => {
    try {
        const customerRepo = getCustomerRepo();
        const customer = customerRepo.create(req.body);
        await customerRepo.save(customer);
        res.status(201).json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// PATCH /api/customers/:id
router.patch('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validate(updateCustomerSchema), async (req, res) => {
    try {
        const customerRepo = getCustomerRepo();
        const id = String(req.params.id);
        const customer = await customerRepo.findOneBy({ id });
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Apply changes
        Object.assign(customer, req.body);
        await customerRepo.save(customer);

        res.json(customer);
    } catch (error) {
        console.error('Update Customer Error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const customerRepo = getCustomerRepo();
        const id = String(req.params.id);
        const customer = await customerRepo.findOne({
            where: { id },
            relations: ['quotes', 'sales']
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Integrity safeguard: check if user has active transaction history
        if (customer.sales && customer.sales.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete customer because they have existing sales or orders on record. You can modify their profile instead to prevent breaking financial trail logs.' 
            });
        }

        // Delete quotes linked to them or allow it
        const quoteRepo = AppDataSource.getRepository(Quote);
        if (customer.quotes && customer.quotes.length > 0) {
            await quoteRepo.remove(customer.quotes);
        }

        await customerRepo.remove(customer);
        res.json({ message: 'Customer successfully deleted' });
    } catch (error) {
        console.error('Delete Customer Error:', error);
        res.status(550).json({ error: 'Failed to delete customer' });
    }
});

export default router;
