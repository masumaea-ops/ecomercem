import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { Security, strongPasswordSchema } from '../utils/security';
import { authenticate } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { authRateLimiter, passwordResetLimiter, registrationLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { AuditService } from '../services/auditService';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';

const router = Router();
const getUserRepo = () => AppDataSource.getRepository(User);

// POST /api/auth/login - Protected with strict 5 attempts/15min rate limiting
router.post('/login', authRateLimiter as any, validate(z.object({ email: z.string().email(), password: z.string().min(1) })), async (req, res) => {
    const userRepo = getUserRepo();
    const { email, password } = req.body;
    const user = await userRepo.findOne({ where: { email }, relations: ['branch'] });
    
    if (!user) {
        logger.warn(`Security Event: Failed login attempt (Unknown Email: ${email}) from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await Security.comparePassword(password, user.passwordHash);
    if (!isValid) {
        logger.warn(`Security Event: Failed login attempt (Invalid Password for ${email}) from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
        logger.warn(`Security Event: Login attempt to disabled account (${email}) from IP: ${req.ip}`);
        return res.status(403).json({ error: 'Account is disabled. Please contact support.' });
    }
    
    if (user.status !== UserStatus.APPROVED) {
        return res.status(403).json({ 
            error: user.status === UserStatus.PENDING 
                ? 'Your account is currently pending approval.' 
                : 'Your account has been rejected.' 
        });
    }

    const token = Security.generateToken({ id: user.id, email: user.email, role: user.role, branchId: user.branch?.id });
    
    logger.info(`User logged in successfully: ${user.email} (${user.role}) from IP: ${req.ip}`);

    res.json({ 
        token, 
        user: { 
            id: user.id, 
            name: user.fullName, 
            role: user.role, 
            email: user.email, 
            branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null 
        } 
    });
});

// POST /api/auth/register-b2b
router.post('/register-b2b', registrationLimiter as any, validate(z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: strongPasswordSchema,
    businessName: z.string().min(2),
    taxId: z.string().optional(),
    phone: z.string().min(8),
    address: z.string().min(5)
})), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const { fullName, email, password, businessName, taxId, phone, address } = req.body;
        
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User();
        user.fullName = fullName;
        user.email = email;
        user.passwordHash = await Security.hashPassword(password);
        user.role = UserRole.B2B_USER;
        user.status = UserStatus.PENDING;
        user.businessName = businessName;
        user.taxId = taxId;
        user.phone = phone;
        user.address = address;
        user.isActive = true;
        user.discountPercentage = 15; // Default discount for new B2B users

        await userRepo.save(user);

        logger.info(`New B2B registration pending approval: ${email} (${businessName})`);

        // Send email to applicant confirming submission
        try {
            await EmailService.sendEmail('B2B_APPLICATION_RECEIVED', {
                email: user.email,
                name: user.fullName,
                businessName: user.businessName
            });
            // Send email to internal admin/sales team
            await EmailService.sendEmail('ADMIN_NEW_B2B_APPLICATION', {
                applicantName: user.fullName,
                applicantEmail: user.email,
                businessName: user.businessName,
                phone: user.phone,
                taxId: user.taxId,
                address: user.address
            });
        } catch (mailErr: any) {
            logger.warn('Failed to send B2B registration emails:', mailErr.message);
        }

        res.status(201).json({ message: 'Registration successful. Your account is pending approval.' });
    } catch (error) {
        logger.error('B2B Registration Error:', error);
        res.status(500).json({ error: 'Failed to register business' });
    }
});

// POST /api/auth/register
router.post('/register', registrationLimiter as any, validate(z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: strongPasswordSchema,
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).optional()
})), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const { fullName, email, password, phone, role } = req.body;
        
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User();
        user.fullName = fullName;
        user.email = email;
        user.passwordHash = await Security.hashPassword(password);
        user.phone = phone;
        
        // Strict Privilege Escalation Protection: non-admin public registration only
        const allowedRoles = [UserRole.INDIVIDUAL_SELLER, UserRole.BUYER, UserRole.IMPORT_USER];
        if (role && allowedRoles.includes(role)) {
            user.role = role;
        } else {
            user.role = UserRole.INDIVIDUAL_SELLER;
        }
        
        // Commercial dealers and wholesale B2B users require manual business review.
        // Individual car sellers, buyers, and import users are active immediately.
        if (user.role === UserRole.DEALER || user.role === UserRole.B2B_USER) {
            user.status = UserStatus.PENDING;
        } else {
            user.status = UserStatus.APPROVED;
        }
        
        user.isActive = true;

        await userRepo.save(user);

        if (user.status === UserStatus.PENDING) {
            return res.status(201).json({ 
                message: 'Registration successful. Your account is pending approval. You will be notified via email once approved.' 
            });
        }

        const token = Security.generateToken({ id: user.id, email: user.email, role: user.role });
        res.status(201).json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.fullName, 
                role: user.role, 
                email: user.email 
            } 
        });
    } catch (error) {
        logger.error('Registration Error:', error);
        res.status(500).json({ error: 'Failed to register' });
    }
});

// POST /api/auth/forgot-password - Rate limited & stores hashed reset token
router.post('/forgot-password', passwordResetLimiter as any, validate(z.object({ email: z.string().email() })), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const { email } = req.body;
        const user = await userRepo.findOne({ where: { email } });
        
        // Always return generic response to prevent user enumeration
        if (user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            // Store SHA-256 hash in DB to prevent plaintext exposure if DB is compromised
            user.resetPasswordToken = Security.hashToken(rawToken);
            user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
            await userRepo.save(user);

            await EmailService.sendEmail('PASSWORD_RESET', {
                email: user.email,
                token: rawToken, // Send the unhashed token to user's verified inbox only
                origin: req.headers.origin || 'https://masuma.africa'
            });

            logger.info(`Password reset token generated and sent to: ${email}`);
        }

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password - Hashes incoming token before DB verification
router.post('/reset-password', passwordResetLimiter as any, validate(z.object({ token: z.string().min(10), password: strongPasswordSchema })), async (req, res) => {
    try {
        const userRepo = getUserRepo();
        const { token, password } = req.body;
        const hashedToken = Security.hashToken(token);

        // Find user by hashed token, with backwards-compatibility check for legacy raw tokens
        const user = await userRepo.findOne({
            where: [
                {
                    resetPasswordToken: hashedToken,
                    resetPasswordExpires: MoreThan(new Date())
                },
                {
                    resetPasswordToken: token,
                    resetPasswordExpires: MoreThan(new Date())
                }
            ]
        });

        if (!user) {
            logger.warn(`Failed password reset attempt with invalid or expired token from IP: ${req.ip}`);
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        user.passwordHash = await Security.hashPassword(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await userRepo.save(user);

        await AuditService.log(
            'PASSWORD_RESET_SUCCESS',
            user.id,
            `Password successfully reset for user ${user.email}`,
            user,
            req.ip
        );

        logger.info(`Password successfully reset for user ${user.email}`);

        res.json({ message: 'Password has been updated successfully. You can now log in.' });
    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userRepo = getUserRepo();
    const freshUser = await userRepo.findOne({ 
        where: { id: req.user.id }, 
        relations: ['branch'],
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            phone: true,
            businessName: true,
            taxId: true,
            discountPercentage: true,
            isActive: true,
            createdAt: true,
            branch: { id: true, name: true } as any
        }
    });
    res.json(freshUser); 
});

// PUT /api/auth/profile
router.put('/profile', authenticate, validate(z.object({ 
    firstName: z.string().optional(), 
    lastName: z.string().optional(), 
    currentPassword: z.string().min(1).optional(), 
    newPassword: strongPasswordSchema.optional() 
})), async (req, res) => {
    const userRepo = getUserRepo();
    const { firstName, lastName, currentPassword, newPassword } = req.body;
    const user = await userRepo.findOneBy({ id: req.user!.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (firstName || lastName) user.fullName = `${firstName || ''} ${lastName || ''}`.trim() || user.fullName;
    
    if (newPassword) {
        if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password' });
        const isMatch = await Security.comparePassword(currentPassword, user.passwordHash);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });
        user.passwordHash = await Security.hashPassword(newPassword);
    }
    
    await userRepo.save(user);
    res.json({ message: 'Profile updated successfully' });
});

export default router;