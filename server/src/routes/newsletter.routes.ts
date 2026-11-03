import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Subscriber } from '../entities/Subscriber';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { AuditService } from '../services/auditService';
import { logger } from '../utils/logger';
import { EmailService } from '../services/emailService';

const router = Router();

const subscribeSchema = z.object({
    email: z.string().email("Please provide a valid email address.")
});

// GET /api/newsletter - Admin Only
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const subscriberRepo = AppDataSource.getRepository(Subscriber);
        const subscribers = await subscriberRepo.find({
            order: { createdAt: 'DESC' }
        });
        res.json(subscribers);
    } catch (error: any) {
        logger.error('Newsletter Fetch Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
});

// POST /api/newsletter/subscribe - Public
router.post('/subscribe', validate(subscribeSchema), async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const subscriberRepo = AppDataSource.getRepository(Subscriber);
        
        const emailLower = email.toLowerCase().trim();
        const existing = await subscriberRepo.findOneBy({ email: emailLower as any });
        
        if (existing) {
            return res.status(200).json({ 
                message: 'Jambo! You are already on our VIP list.',
                alreadySubscribed: true 
            });
        }

        const subscriber = subscriberRepo.create({ email: emailLower });
        await subscriberRepo.save(subscriber);

        await AuditService.log('NEWSLETTER_SIGNUP', subscriber.id, `New subscriber joined: ${emailLower}`);

        const origin = req.get('origin') || req.get('referer') || 'https://masuma.africa';

        // 1. Dispatch VIP Welcome email to the subscriber
        EmailService.sendEmail('NEWSLETTER_WELCOME', {
            email: emailLower,
            origin
        }).catch(err => {
            logger.error('Failed to send newsletter welcome email:', err.message);
        });

        // 2. Dispatch New Lead notification to Admin/Sales desk
        const adminEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'sales@masuma.africa';
        EmailService.sendEmail('ADMIN_NEW_SUBSCRIBER', {
            email: emailLower,
            origin
        }).catch(err => {
            logger.warn('Failed to notify admin of new subscriber:', err.message);
        });

        res.status(201).json({ 
            message: 'Karibu to Masuma VIP! A welcome pack and 5% voucher code (KARIBU5) have been sent to your email.',
            voucherCode: 'KARIBU5',
            success: true 
        });
    } catch (error: any) {
        logger.error('Newsletter Subscribe Error:', {
            name: error.name,
            message: error.message
        });

        res.status(500).json({ 
            error: 'Subscription failed. Please try again later.',
            details: error.message
        });
    }
});

// DELETE /api/newsletter/:id - Admin Only
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const subscriberRepo = AppDataSource.getRepository(Subscriber);
        await subscriberRepo.delete(req.params.id as any);
        res.json({ message: 'Subscriber removed.' });
    } catch (error: any) {
        logger.error('Newsletter Delete Error:', error.message);
        res.status(500).json({ error: 'Failed to remove subscriber' });
    }
});

// GET /api/newsletter/unsubscribe - Public
router.get('/unsubscribe', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).send('Email is required');
        
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const subscriberRepo = AppDataSource.getRepository(Subscriber);
        
        const subscriber = await subscriberRepo.findOneBy({ email: String(email).toLowerCase().trim() as any });
        if (subscriber) {
            subscriber.isActive = false;
            await subscriberRepo.save(subscriber);
            await AuditService.log('NEWSLETTER_UNSUBSCRIBE', subscriber.id, `Subscriber left: ${email}`);
        }
        
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #1A1A1A;">Unsubscribed Successfully</h1>
                <p style="color: #666;">You will no longer receive our newsletter. Jambo!</p>
                <a href="/" style="color: #E0621B; text-decoration: none; font-weight: bold;">Return to Masuma Africa</a>
            </div>
        `);
    } catch (error: any) {
        logger.error('Newsletter Unsubscribe Error:', error.message);
        res.status(500).send('Failed to unsubscribe. Please try again later.');
    }
});

const campaignSchema = z.object({
    subject: z.string().min(5, "Subject must be at least 5 characters"),
    title: z.string().min(5, "Title must be at least 5 characters"),
    body: z.string().min(10, "Body must be at least 10 characters"),
    actionUrl: z.string().optional().or(z.literal('')),
    actionText: z.string().optional().or(z.literal(''))
});

// POST /api/newsletter/campaign - Admin/Manager Broadcast
router.post('/campaign', authenticate, authorize(['ADMIN', 'MANAGER']), validate(campaignSchema), async (req, res) => {
    try {
        const { subject, title, body, actionUrl, actionText } = req.body;
        
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const subscriberRepo = AppDataSource.getRepository(Subscriber);
        const subscribers = await subscriberRepo.find({ where: { isActive: true } });
        
        if (subscribers.length === 0) {
            return res.status(400).json({ error: 'There are no active subscribers in your list to broadcast to.' });
        }
        
        const origin = req.get('origin') || req.get('referer') || 'https://masuma.africa';
        
        logger.info(`[CAMPAIGN] Dispatching newsletter to ${subscribers.length} subscribers: ${subject}`);
        
        const emailPromises = subscribers.map(sub => 
            EmailService.sendEmail('CUSTOM_CAMPAIGN', {
                email: sub.email,
                subject,
                title,
                body,
                actionUrl,
                actionText,
                origin
            })
        );
        
        await Promise.all(emailPromises);
        
        res.json({ message: `Successfully broadcasted campaign to ${subscribers.length} active subscribers!` });
    } catch (error: any) {
        logger.error('Campaign Dispatch Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to dispatch newsletter campaign' });
    }
});

// GET /api/newsletter/smtp-status - Admin Diagnostic Check
router.get('/smtp-status', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const result = await EmailService.verifySmtp();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// POST /api/newsletter/test-smtp - Admin Send Diagnostic Test
router.post('/test-smtp', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const targetEmail = req.body.email || process.env.SMTP_USER || 'sales@masuma.africa';
        const origin = req.get('origin') || req.get('referer') || 'https://masuma.africa';
        const result = await EmailService.testSend(targetEmail, origin);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

export default router;