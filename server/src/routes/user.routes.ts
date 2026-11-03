
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { Customer } from '../entities/Customer';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuditService } from '../services/auditService';
import { EmailService } from '../services/emailService';
import { Security, strongPasswordSchema } from '../utils/security';
import { adminRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';

const router = Router();
const getUserRepo = () => AppDataSource.getRepository(User);

// Apply admin rate limiting to user management endpoints
router.use(adminRateLimiter as any);

const createUserSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: strongPasswordSchema,
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'B2B_USER', 'DEALER', 'INDIVIDUAL_SELLER', 'BUYER', 'IMPORT_USER']),
    branchId: z.string().optional()
});


// GET /api/users
router.get('/', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const users = await userRepo.find({
            relations: ['branch'],
            select: {
                id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true,
                status: true, discountPercentage: true, businessName: true, taxId: true, phone: true, address: true,
                branch: { id: true, name: true } as any
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PATCH /api/users/:id - Update User Account (Super Admin)
router.patch('/:id', authenticate, authorize(['ADMIN']), async (req: any, res) => {
    try {
        const userRepo = getUserRepo();
        const { id } = req.params;
        const user = await userRepo.findOne({ where: { id }, relations: ['branch'] });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const b = req.body;

        // Security check: admin cannot disable or demote their own account
        const isSelf = req.user?.id === id;
        if (isSelf) {
            if (b.isActive === false || b.status === 'REJECTED' || (b.role && b.role !== UserRole.ADMIN)) {
                return res.status(400).json({ error: 'Security constraint: You cannot disable, reject, or demote your own administrator account.' });
            }
        }

        if (b.fullName !== undefined) user.fullName = b.fullName.trim();
        if (b.email !== undefined && b.email.toLowerCase().trim() !== user.email) {
            const emailClean = b.email.toLowerCase().trim();
            const existing = await userRepo.findOneBy({ email: emailClean });
            if (existing && existing.id !== user.id) {
                return res.status(400).json({ error: 'Email address already in use by another user.' });
            }
            user.email = emailClean;
        }
        if (b.phone !== undefined) user.phone = b.phone.trim();
        if (b.role !== undefined) user.role = b.role;
        if (b.status !== undefined) user.status = b.status;
        if (b.isActive !== undefined) user.isActive = Boolean(b.isActive);
        if (b.businessName !== undefined) user.businessName = b.businessName ? b.businessName.trim() : null as any;
        if (b.taxId !== undefined) user.taxId = b.taxId ? b.taxId.trim() : null as any;
        if (b.discountPercentage !== undefined) user.discountPercentage = Number(b.discountPercentage || 0);

        if (b.branchId !== undefined) {
            user.branch = b.branchId ? ({ id: b.branchId } as any) : null as any;
        }

        // Optional password reset by Super Admin
        if (b.newPassword && b.newPassword.trim().length >= 6) {
            user.passwordHash = await Security.hashPassword(b.newPassword.trim());
        }

        await userRepo.save(user);

        await AuditService.log(
            'UPDATE_USER',
            user.id,
            `Admin ${req.user.email} updated user account ${user.email} (Role: ${user.role}, Status: ${user.status}, Active: ${user.isActive})`,
            req.user,
            req.ip
        );

        res.json({ message: 'User updated successfully', user });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update user' });
    }
});

// PATCH /api/users/:id/toggle-active - Quick Enable / Disable Account (Super Admin)
router.patch('/:id/toggle-active', authenticate, authorize(['ADMIN']), async (req: any, res) => {
    try {
        const userRepo = getUserRepo();
        const { id } = req.params;
        if (req.user?.id === id) {
            return res.status(400).json({ error: 'Security constraint: You cannot disable your own administrator account.' });
        }

        const user = await userRepo.findOneBy({ id });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isActive = !user.isActive;
        user.status = user.isActive ? ('APPROVED' as any) : ('REJECTED' as any);
        await userRepo.save(user);

        await AuditService.log(
            'TOGGLE_USER_ACTIVE',
            user.id,
            `Admin ${req.user.email} ${user.isActive ? 'enabled' : 'disabled'} user account ${user.email}`,
            req.user,
            req.ip
        );

        res.json({
            message: `User account ${user.isActive ? 'enabled' : 'disabled'} successfully`,
            isActive: user.isActive,
            status: user.status
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to toggle user status' });
    }
});

// PATCH /api/users/:id/status
router.patch('/:id/status', authenticate, authorize(['ADMIN']), validate(z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) })), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const user = await userRepo.findOneBy({ id: req.params.id as any });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = req.body.status;
        await userRepo.save(user);

        // Handle B2B Wholesale post-approval workflow
        if (user.role === UserRole.B2B_USER || user.role === UserRole.DEALER) {
            const origin = req.headers.origin || 'https://masuma.africa';

            if (user.status === 'APPROVED') {
                // 1. Send Congratulations & Login notification email
                try {
                    await EmailService.sendEmail('B2B_APPLICATION_APPROVED', {
                        email: user.email,
                        name: user.fullName,
                        businessName: user.businessName,
                        discountPercentage: user.discountPercentage || 15,
                        origin
                    });
                } catch (e: any) {
                    console.warn('Failed to send B2B approval email:', e.message);
                }

                // 2. Auto-sync or create wholesale Customer entity for POS counter & Sales CRM
                try {
                    const customerRepo = AppDataSource.getRepository(Customer);
                    let customer = await customerRepo.findOne({ where: { email: user.email } });
                    if (!customer) {
                        customer = new Customer();
                    }
                    customer.name = user.businessName || user.fullName;
                    customer.email = user.email;
                    customer.phone = user.phone || undefined;
                    customer.address = user.address || undefined;
                    customer.kraPin = user.taxId || undefined;
                    customer.isWholesale = true;
                    customer.status = 'APPROVED';
                    await customerRepo.save(customer);
                } catch (custErr: any) {
                    console.warn('Failed to auto-sync B2B customer to CRM:', custErr.message);
                }
            } else if (user.status === 'REJECTED') {
                try {
                    await EmailService.sendEmail('B2B_APPLICATION_REJECTED', {
                        email: user.email,
                        name: user.fullName,
                        businessName: user.businessName
                    });
                } catch (e: any) {
                    console.warn('Failed to send B2B rejection email:', e.message);
                }
            }
        }

        await AuditService.log(
            'UPDATE_USER_STATUS',
            user.id,
            `Updated status of ${user.email} to ${user.status}`,
            req.user,
            req.ip
        );

        res.json({ message: 'User status updated', status: user.status });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// PATCH /api/users/:id/discount
router.patch('/:id/discount', authenticate, authorize(['ADMIN']), validate(z.object({ discount: z.number().min(0).max(100) })), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const user = await userRepo.findOneBy({ id: req.params.id as any });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.discountPercentage = req.body.discount;
        await userRepo.save(user);

        await AuditService.log(
            'UPDATE_USER_DISCOUNT',
            user.id,
            `Updated discount of ${user.email} to ${user.discountPercentage}%`,
            req.user,
            req.ip
        );

        res.json({ message: 'User discount updated', discount: user.discountPercentage });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user discount' });
    }
});

// POST /api/users
router.post('/', authenticate, authorize(['ADMIN']), validate(createUserSchema), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const { fullName, email, password, role, branchId } = req.body;
        
        const existing = await userRepo.findOneBy({ email });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const user = new User();
        user.fullName = fullName;
        user.email = email;
        user.passwordHash = await Security.hashPassword(password);
        user.role = role;
        if (branchId) user.branch = { id: branchId } as any;

        await userRepo.save(user);

        // Log action
        await AuditService.log(
            'CREATE_USER', 
            user.id, 
            `Created user ${email} with role ${role}`, 
            req.user, 
            req.ip
        );

        res.status(201).json({ message: 'User created', id: user.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: any, res) => {
    try {
        const userRepo = getUserRepo();
        if (req.user?.id === req.params.id) {
            return res.status(400).json({ error: 'Security constraint: You cannot delete your own administrative account.' });
        }

        const user = await userRepo.findOneBy({ id: req.params.id as any });
        if (!user) return res.status(404).json({ error: 'User not found' });

        await userRepo.remove(user);
        
        await AuditService.log(
            'DELETE_USER', 
            req.params.id as any, 
            `Deleted user ${user.email}`, 
            req.user, 
            req.ip
        );

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;

