
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { EmailService } from '../services/emailService';

const router = Router();

const contactSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10).optional(),
    subject: z.string().min(3),
    message: z.string().min(10)
});

// POST /api/contact
router.post('/', validate(contactSchema), async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        await EmailService.sendEmail('QUOTE_REQUEST', { 
            name, 
            email, 
            phone: phone || 'N/A', 
            message: `Subject: ${subject}\n\n${message}`, 
            productName: 'General Inquiry' 
        });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact API Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
