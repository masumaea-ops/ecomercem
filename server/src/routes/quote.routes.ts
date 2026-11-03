import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Quote, QuoteStatus, QuoteType } from '../entities/Quote';
import { Customer } from '../entities/Customer';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { EmailService } from '../services/emailService';
import { generateQuotePdfBuffer } from '../utils/quotePdfGenerator';
import { getPaymentSettings } from '../utils/paymentSettings';

const router = Router();
const getQuoteRepo = () => AppDataSource.getRepository(Quote);
const getCustomerRepo = () => AppDataSource.getRepository(Customer);
const getOrderRepo = () => AppDataSource.getRepository(Order);

// Schema
const createQuoteSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10),
    message: z.string().optional(),
    
    productId: z.string().optional(),
    productName: z.string().optional(),
    
    vin: z.string().min(5).optional(),
    partNumber: z.string().optional(),
    description: z.string().optional(),
    requestType: z.enum(['STANDARD', 'SOURCING']).default('STANDARD'),

    items: z.array(z.object({
        productId: z.string().optional(),
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number()
    })).optional()
});

// GET /api/quotes/my - Strictly isolated to authenticated user's own quotes
router.get('/my', authenticate, async (req: any, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const userEmail = req.user?.email;
        const userPhone = req.user?.phone;

        if (!userEmail && !userPhone) {
            return res.json([]);
        }

        const query = quoteRepo.createQueryBuilder('quote')
            .leftJoinAndSelect('quote.customer', 'customer')
            .orderBy('quote.createdAt', 'DESC');

        if (userEmail && userPhone) {
            query.where('customer.email = :userEmail OR customer.phone = :userPhone', { userEmail, userPhone });
        } else if (userEmail) {
            query.where('customer.email = :userEmail', { userEmail });
        } else {
            query.where('customer.phone = :userPhone', { userPhone });
        }

        const quotes = await query.take(50).getMany();
        const formatted = quotes.map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            customerName: q.customer?.name || req.user?.name || 'Valued Client',
            customerEmail: q.customer?.email || req.user?.email,
            customerPhone: q.customer?.phone || req.user?.phone,
            date: new Date(q.createdAt).toLocaleDateString(),
            total: Number(q.total || 0),
            status: q.status,
            type: q.requestType,
            vin: q.vin,
            itemsCount: q.items?.length || 0,
            items: q.items
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch your quotes' });
    }
});

router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const quotes = await quoteRepo.find({
            order: { createdAt: 'DESC' },
            take: 100,
            relations: ['customer']
        });
        
        const formatted = quotes.map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            customerName: q.customer?.name || 'Guest',
            customerEmail: q.customer?.email || 'N/A',
            customerPhone: q.customer?.phone || 'N/A',
            date: q.createdAt.toLocaleDateString(),
            total: Number(q.total),
            status: q.status,
            type: q.requestType,
            vin: q.vin,
            itemsCount: q.items?.length || 0,
            items: q.items 
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

router.post('/', validate(createQuoteSchema), async (req, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const customerRepo = getCustomerRepo();
        const { name, email, phone, message, productId, productName, items, vin, partNumber, description, requestType } = req.body;

        // 1. Find or Create Customer safely without picking profiles with blank emails or phones
        const conditions: any[] = [];
        if (email && typeof email === 'string' && email.trim() !== '') {
            conditions.push({ email: email.trim() });
        }
        if (phone && typeof phone === 'string' && phone.trim() !== '') {
            conditions.push({ phone: phone.trim() });
        }

        let customer = null;
        if (conditions.length > 0) {
            customer = await customerRepo.findOne({
                where: conditions
            });
        }

        if (!customer) {
            customer = new Customer();
            customer.name = name;
            customer.email = (email && typeof email === 'string' && email.trim() !== '') ? email.trim() : undefined;
            customer.phone = phone;
            customer.isWholesale = false;
            await customerRepo.save(customer);
        }

        // 2. Create Quote
        const quote = new Quote();
        quote.quoteNumber = `QT-${Date.now().toString().slice(-6)}`;
        quote.requestType = requestType as QuoteType;
        quote.vin = vin;
        quote.customer = customer; 

        let quoteItems = items || [];

        if (requestType === 'SOURCING' && quoteItems.length === 0) {
            const itemName = description || 'Special Order Part';
            const details = partNumber ? `${itemName} (PN: ${partNumber})` : itemName;
            
            quoteItems = [{
                name: details,
                quantity: 1,
                unitPrice: 0, 
                total: 0
            }];
        } 
        else if (!items && productId && productName) {
            quoteItems = [{
                productId,
                name: productName,
                quantity: 1,
                unitPrice: 0, 
                total: 0
            }];
        }

        // Authoritatively recompute all item totals and tax/total sums to prevent mismatches
        quote.items = quoteItems.map((item: any) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.unitPrice) || 0;
            return {
                ...item,
                quantity: qty,
                unitPrice: price,
                total: parseFloat((qty * price).toFixed(2))
            };
        });
        quote.subtotal = parseFloat(quote.items.reduce((acc: number, i: any) => acc + i.total, 0).toFixed(2));
        quote.tax = parseFloat((quote.subtotal * 0.16).toFixed(2));
        quote.total = parseFloat((quote.subtotal + quote.tax).toFixed(2));
        quote.status = QuoteStatus.DRAFT;
        
        await quoteRepo.save(quote);

        // 3. Send Notifications (Non-blocking)
        // Only send if it was a public request, not an admin creation
        if (!req.user) {
            const emailBody = requestType === 'SOURCING'
                ? `Customer: ${name}\nVIN: ${vin}\nPart: ${partNumber || 'N/A'}\nDesc: ${description}`
                : `Customer: ${name}\nProduct: ${productName}\nMessage: ${message}`;

            EmailService.sendEmail('QUOTE_REQUEST', {
                name, email, phone,
                message: emailBody,
                productName: requestType === 'SOURCING' ? 'Special Sourcing' : quoteItems[0]?.name 
            }).catch(err => console.error("Email dispatch error:", err));
        }

        res.status(201).json({ message: 'Quote created', quoteId: quote.id });
    } catch (error) {
        console.error("Quote Error:", error);
        res.status(500).json({ error: 'Failed to submit quote' });
    }
});

const updateQuoteSchema = z.object({
    status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED']).optional(),
    items: z.array(z.any()).optional(),
    total: z.number().optional(),
    email: z.string().optional(),
    sendEmail: z.boolean().optional()
});

router.patch('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validate(updateQuoteSchema), async (req, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const quote = await quoteRepo.findOne({
            where: { id: req.params.id as any },
            relations: ['customer']
        });
        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        if (req.body.status) quote.status = req.body.status;
        if (req.body.items) {
            const items = req.body.items.map((i: any) => {
                const qty = Number(i.quantity) || 1;
                const price = Number(i.unitPrice) || 0;
                return {
                    ...i,
                    quantity: qty,
                    unitPrice: price,
                    total: parseFloat((qty * price).toFixed(2))
                };
            });
            quote.items = items;
            quote.subtotal = parseFloat(items.reduce((acc: number, i: any) => acc + i.total, 0).toFixed(2));
            quote.tax = parseFloat((quote.subtotal * 0.16).toFixed(2));
            quote.total = parseFloat((quote.subtotal + quote.tax).toFixed(2));
        } else if (req.body.total !== undefined) {
            quote.total = req.body.total;
        }

        await quoteRepo.save(quote);

        // If status changed to SENT or sendEmail was explicitly requested, dispatch email with PDF
        if (req.body.status === 'SENT' || req.body.sendEmail) {
            const targetEmail = req.body.email || quote.customer?.email;
            if (targetEmail && targetEmail.includes('@')) {
                try {
                    const paymentSettings = await getPaymentSettings();
                    const pdfBuffer = generateQuotePdfBuffer({
                        quoteNumber: quote.quoteNumber,
                        date: quote.createdAt,
                        customerName: quote.customer?.name || 'Valued Customer',
                        customerEmail: targetEmail,
                        customerPhone: quote.customer?.phone,
                        type: quote.requestType,
                        vin: quote.vin,
                        items: quote.items || [],
                        subtotal: Number(quote.subtotal),
                        tax: Number(quote.tax),
                        total: Number(quote.total),
                        paymentDetails: paymentSettings
                    });

                    await EmailService.sendEmail('QUOTE_PROPOSAL', {
                        email: targetEmail,
                        customerName: quote.customer?.name || 'Valued Customer',
                        customerPhone: quote.customer?.phone,
                        quoteNumber: quote.quoteNumber,
                        date: quote.createdAt,
                        vin: quote.vin,
                        items: quote.items || [],
                        subtotal: Number(quote.subtotal),
                        tax: Number(quote.tax),
                        total: Number(quote.total),
                        pdfBuffer,
                        pdfFilename: `Quote-${quote.quoteNumber}.pdf`,
                        paybillNumber: paymentSettings.paybillNumber,
                        paybillAccount: paymentSettings.paybillAccount,
                        bankName: paymentSettings.bankName,
                        bankBranch: paymentSettings.bankBranch,
                        bankAccountNo: paymentSettings.bankAccountNo,
                        bankAccountName: paymentSettings.bankAccountName,
                        paymentInstructions: paymentSettings.instructions
                    });
                } catch (emailErr) {
                    console.error('Auto quote email send error:', emailErr);
                }
            }
        }

        res.json(quote);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

// POST /api/quotes/:id/send-email
// Explicitly send detailed quotation email with attached PDF to the customer
router.post('/:id/send-email', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const quote = await quoteRepo.findOne({
            where: { id: req.params.id as any },
            relations: ['customer']
        });

        if (!quote) return res.status(404).json({ error: 'Quote not found' });

        const targetEmail = req.body.email || quote.customer?.email;
        if (!targetEmail || !targetEmail.includes('@')) {
            return res.status(400).json({ error: 'A valid customer email is required to send the quote' });
        }

        // Update customer email if provided
        if (req.body.email && quote.customer && quote.customer.email !== req.body.email) {
            quote.customer.email = req.body.email;
            await getCustomerRepo().save(quote.customer);
        }

        // Generate high-fidelity vector PDF
        const paymentSettings = await getPaymentSettings();
        const pdfBuffer = generateQuotePdfBuffer({
            quoteNumber: quote.quoteNumber,
            date: quote.createdAt,
            customerName: quote.customer?.name || 'Valued Customer',
            customerEmail: targetEmail,
            customerPhone: quote.customer?.phone,
            type: quote.requestType,
            vin: quote.vin,
            items: quote.items || [],
            subtotal: Number(quote.subtotal),
            tax: Number(quote.tax),
            total: Number(quote.total),
            paymentDetails: paymentSettings
        });

        // Dispatch Email with itemized breakdown and attached PDF
        const emailSent = await EmailService.sendEmail('QUOTE_PROPOSAL', {
            email: targetEmail,
            customerName: quote.customer?.name || 'Valued Customer',
            customerPhone: quote.customer?.phone,
            quoteNumber: quote.quoteNumber,
            date: quote.createdAt,
            vin: quote.vin,
            items: quote.items || [],
            subtotal: Number(quote.subtotal),
            tax: Number(quote.tax),
            total: Number(quote.total),
            pdfBuffer,
            pdfFilename: `Quote-${quote.quoteNumber}.pdf`,
            paybillNumber: paymentSettings.paybillNumber,
            paybillAccount: paymentSettings.paybillAccount,
            bankName: paymentSettings.bankName,
            bankBranch: paymentSettings.bankBranch,
            bankAccountNo: paymentSettings.bankAccountNo,
            bankAccountName: paymentSettings.bankAccountName,
            paymentInstructions: paymentSettings.instructions
        });

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to deliver quotation email. Please check server SMTP configuration.' });
        }

        // Update status to SENT if it was DRAFT
        if (quote.status === QuoteStatus.DRAFT) {
            quote.status = QuoteStatus.SENT;
            await quoteRepo.save(quote);
        }

        res.json({
            message: `Quotation #${quote.quoteNumber} successfully sent to ${targetEmail} with PDF attachment!`,
            quote
        });
    } catch (error: any) {
        console.error('Error dispatching quote email:', error);
        res.status(500).json({ error: error.message || 'Failed to send quote email' });
    }
});

// POST /api/quotes/:id/convert
// Convert a Quote to an Order (Invoice)
router.post('/:id/convert', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const quoteRepo = getQuoteRepo();
        const orderRepo = getOrderRepo();
        const quote = await quoteRepo.findOne({ 
            where: { id: req.params.id as any },
            relations: ['customer']
        });

        if (!quote) return res.status(404).json({ error: 'Quote not found' });
        if (quote.status === QuoteStatus.CONVERTED) return res.status(400).json({ error: 'Quote already converted' });

        // Create Order
        const order = new Order();
        order.orderNumber = `INV-${Date.now().toString().slice(-6)}`; // INV prefix for Invoices
        order.customerName = quote.customer.name;
        order.customerEmail = quote.customer.email || '';
        order.customerPhone = quote.customer.phone || '';
        order.shippingAddress = quote.customer.address || 'Pickup';
        order.totalAmount = quote.total;
        
        // FIX: Explicitly initialize payment and discount fields
        order.amountPaid = 0;
        order.balance = quote.total;
        order.discountAmount = 0;

        order.status = OrderStatus.PENDING; // Unpaid Invoice
        order.sourceQuote = quote;

        // Map Items
        order.items = quote.items.map((qi: any) => {
            const item = new OrderItem();
            if (qi.productId) item.product = { id: qi.productId } as any;
            item.quantity = qi.quantity;
            item.price = qi.unitPrice;
            // Fallback description logic if product link missing is handled in frontend view
            return item;
        });

        await orderRepo.save(order);

        // Update Quote
        quote.status = QuoteStatus.CONVERTED;
        quote.convertedOrder = order;
        await quoteRepo.save(quote);

        res.status(201).json({ message: 'Converted to Invoice', orderId: order.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Conversion failed' });
    }
});

export default router;