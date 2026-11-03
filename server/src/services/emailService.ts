import { Queue } from 'bullmq';
import nodemailer from 'nodemailer';
import { redis } from '../config/redis';
import { config } from '../config/env';

const smtpConfig = {
    host: config.SMTP_HOST || 'smtp.gmail.com',
    port: Number(config.SMTP_PORT) || 587,
    secure: Number(config.SMTP_PORT) === 465,
    auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false 
    }
};

const transporter = nodemailer.createTransport(smtpConfig);

const getFromAddress = () => {
    const from = config.FROM_EMAIL || config.SMTP_USER || 'noreply@masuma.africa';
    if (!from.includes('@')) {
        return `"${from}" <${config.SMTP_USER}>`;
    }
    return from;
};

if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ [SMTP] Connection Error:', error.message);
        } else {
            console.log('✅ [SMTP] Connection Verified. Server is ready.');
        }
    });
} else {
    console.log('⚠️ [SMTP] Credentials missing. Email service is running in offline mock/log mode.');
}

let emailQueue: Queue | null = null;
if (redis && process.env.DISABLE_EMAIL_QUEUE !== 'true') {
    emailQueue = new Queue('email-queue', { connection: redis as any });
}

export class EmailService {
    
    static async sendEmail(type: string, data: any) {
        // Direct execution for critical subscriber alerts, welcome messages, quotes with attachments, and receipts
        const isPriorityDirect = type === 'NEWSLETTER_WELCOME' || type === 'ADMIN_NEW_SUBSCRIBER' || type === 'PASSWORD_RESET' || type === 'QUOTE_PROPOSAL' || type === 'PAYMENT_RECEIPT';

        if (emailQueue && !isPriorityDirect) {
            try {
                console.log(`[EMAIL] Queuing ${type} to ${data.email || 'Admin'}...`);
                await emailQueue.add('send-email', { type, data });
                return true;
            } catch (err: any) {
                console.warn(`⚠️ [EMAIL] Failed to enqueue ${type}. Falling back to direct dispatch:`, err.message);
            }
        }

        console.log(`ℹ️ [EMAIL] Dispatching ${type} directly to ${data.email || 'Admin'}...`);
        try {
            return await this.processDirectEmail(type, data);
        } catch (error) {
            console.error('❌ [EMAIL] Direct Send Failed:', error);
            return false;
        }
    }

    static async processDirectEmail(type: string, data: any) {
        let subject = '';
        let html = '';
        let to = data.email;
        let attachments: any[] | undefined = data.attachments;

        if (data.pdfBuffer) {
            attachments = [
                ...(attachments || []),
                {
                    filename: data.pdfFilename || `Quote-${data.quoteNumber || 'Document'}.pdf`,
                    content: data.pdfBuffer,
                    contentType: 'application/pdf'
                }
            ];
        }

        if (type === 'ORDER_CONFIRMATION') {
            subject = `Order Confirmation #${data.orderNumber} - Masuma Autoparts EA`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #E0621B;">Jambo ${data.customerName}!</h2>
                    <p>We've received your payment and your order is now being processed.</p>
                    <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
                        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                        <p><strong>Total Paid:</strong> KES ${Number(data.totalAmount).toLocaleString()}</p>
                        <p><strong>Status:</strong> PAID / PROCESSING</p>
                    </div>
                    <p>Our team at Ruby Mall is preparing your parts for dispatch. You will receive another email once your shipment is on the way.</p>
                    <p>Regards,<br/><strong>Masuma Autoparts East Africa Limited</strong></p>
                </div>
            `;
        } else if (type === 'SHIPMENT_DISPATCHED') {
            subject = `Your Order #${data.orderNumber} is on the way!`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #E0621B;">Good News!</h2>
                    <p>Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> has been dispatched from our Nairobi warehouse.</p>
                    <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #E0621B;">
                        <p><strong>Delivery Method:</strong> Standard Dispatch</p>
                        <p><strong>Destination:</strong> ${data.shippingAddress || 'Nairobi Region'}</p>
                    </div>
                    <p>Our rider/driver will contact you at <strong>${data.customerPhone}</strong> upon arrival.</p>
                    <p>Thank you for choosing Masuma Japanese precision.</p>
                    <p>Regards,<br/><strong>Masuma Logistics Team</strong></p>
                </div>
            `;
        } else if (type === 'QUOTE_REQUEST') {
            await this.sendRawEmail(
                config.SMTP_USER || 'sales@masuma.africa',
                `New Inquiry: ${data.productName}`,
                `<p><strong>Customer:</strong> ${data.name} (${data.phone})</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Product:</strong> ${data.productName}</p><p><strong>Message:</strong><br/>${data.message}</p>`
            );
            
            if (data.email && data.email.includes('@')) {
                to = data.email;
                subject = `We received your request: ${data.productName}`;
                html = `<p>Jambo ${data.name},</p><p>We have received your inquiry regarding <strong>${data.productName}</strong>.</p><br/><p>Regards,<br/>Masuma Autoparts EA Team</p>`;
            } else return true;
        } else if (type === 'PASSWORD_RESET') {
            subject = 'Reset Your Masuma ERP Password';
            const resetUrl = `${data.origin}/?view=RESET_PASSWORD&token=${data.token}`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #E0621B;">Password Reset</h2>
                    <p>You requested a password reset for the Masuma Autoparts ERP.</p>
                    <a href="${resetUrl}" style="background: #1A1A1A; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">Reset Password</a>
                    <p style="font-size: 10px; color: #999; margin-top: 20px;">Link: ${resetUrl}</p>
                </div>
            `;
        } else if (type === 'NEW_BLOG_POST') {
            subject = `New on Masuma Blog: ${data.title}`;
            const blogUrl = `${data.origin}/?view=BLOG_DETAIL&id=${data.id}`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
                        <h1 style="color: #E0621B; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Masuma Insights</h1>
                    </div>
                    <div style="padding: 30px;">
                        <img src="${data.image}" alt="${data.title}" style="width: 100%; height: auto; border-radius: 4px; margin-bottom: 20px;" />
                        <h2 style="color: #1A1A1A; margin-top: 0;">${data.title}</h2>
                        <p style="color: #666; line-height: 1.6;">${data.excerpt}</p>
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${blogUrl}" style="background: #E0621B; color: white; padding: 12px 25px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 4px; text-transform: uppercase; font-size: 14px;">Read Full Article</a>
                        </div>
                    </div>
                    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #999; margin: 0;">You are receiving this because you subscribed to Masuma Autoparts East Africa updates.</p>
                        <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
                            <a href="${data.origin}/api/newsletter/unsubscribe?email=${encodeURIComponent(data.email)}" style="color: #E0621B; text-decoration: underline;">Unsubscribe</a>
                        </p>
                        <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">&copy; 2026 Masuma Autoparts EA. Ruby Mall, Nairobi.</p>
                    </div>
                </div>
            `;
        } else if (type === 'CUSTOM_CAMPAIGN') {
            subject = data.subject || 'Masuma Africa Client Update';
            const actionText = data.actionText || 'Explore Catalog';
            const actionBtn = data.actionUrl 
                ? `
                <div style="margin-top: 30px; text-align: center;">
                    <a href="${data.actionUrl}" style="background: #E0621B; color: white; padding: 12px 25px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 4px; text-transform: uppercase; font-size: 14px;">${actionText}</a>
                </div>`
                : '';
            
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background: #1A1A1A; padding: 20px; text-align: center;">
                        <h1 style="color: #E0621B; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Masuma Africa</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #1A1A1A; margin-top: 0; font-size: 20px; border-bottom: 2px solid #E0621B; padding-bottom: 8px;">${data.title || 'Special Client Update'}</h2>
                        <div style="color: #444; line-height: 1.6; font-size: 15px; margin-top: 15px;">
                            ${String(data.body).replace(/\n/g, '<br/>')}
                        </div>
                        ${actionBtn}
                    </div>
                    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #999; margin: 0;">You are receiving this because you subscribed to Masuma Autoparts East Africa updates.</p>
                        <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
                            <a href="${data.origin}/api/newsletter/unsubscribe?email=${encodeURIComponent(data.email)}" style="color: #E0621B; text-decoration: underline;">Unsubscribe</a>
                        </p>
                        <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">&copy; 2026 Masuma Autoparts East Africa Limited. Ruby Mall, Nairobi.</p>
                    </div>
                </div>
            `;
        } else if (type === 'ADMIN_NEW_SUBSCRIBER') {
            subject = `[Masuma EA Lead] New VIP Subscriber: ${data.email}`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="background: #1A1A1A; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
                        <h2 style="color: #E0621B; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">New VIP Subscriber Joined</h2>
                    </div>
                    <div style="padding: 25px; background: #ffffff;">
                        <p style="font-size: 14px; color: #333; margin-top: 0;">A new customer has subscribed to the Masuma East Africa VIP list:</p>
                        <div style="background: #f8f9fa; padding: 16px; border-left: 4px solid #E0621B; margin: 15px 0; border-radius: 4px;">
                            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #111;">${data.email}</p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">Registered on: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</p>
                        </div>
                        <p style="font-size: 13px; color: #555; line-height: 1.5;">
                            They have received the VIP Welcome pack with voucher code <strong>KARIBU5</strong>. You can follow up or broadcast exclusive catalog specials anytime from the admin portal.
                        </p>
                        <div style="margin-top: 20px;">
                            <a href="${data.origin || 'https://masuma.africa'}" style="background: #E0621B; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 4px; text-transform: uppercase; font-size: 12px;">Open Admin Dashboard</a>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'NEWSLETTER_WELCOME') {
            subject = "Karibu to Masuma VIP! Your 5% Welcome Voucher & Japanese Catalog Access";
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background: #1A1A1A; padding: 25px; text-align: center;">
                        <h1 style="color: #E0621B; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 2px;">Masuma Africa</h1>
                        <p style="color: #bbb; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Japanese Precision • Kenyan Strength</p>
                    </div>
                    
                    <div style="padding: 30px; background: #ffffff;">
                        <h2 style="color: #1A1A1A; margin-top: 0; font-size: 20px; border-bottom: 2px solid #E0621B; padding-bottom: 10px;">
                            Jambo & Welcome to Masuma VIP! 🇰🇪
                        </h2>
                        
                        <p style="color: #444; line-height: 1.6; font-size: 15px;">
                            Thank you for subscribing to Masuma Autoparts East Africa. You are now officially enrolled in our VIP Priority Network.
                        </p>

                        {/* VIP WELCOME VOUCHER */}
                        <div style="background: #FFF7ED; border: 2px dashed #E0621B; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                            <span style="font-size: 11px; font-weight: bold; color: #E0621B; text-transform: uppercase; letter-spacing: 1.5px;">Your VIP Welcome Reward</span>
                            <div style="font-size: 28px; font-weight: 900; color: #1A1A1A; letter-spacing: 3px; margin: 10px 0;">KARIBU5</div>
                            <p style="margin: 0; font-size: 13px; color: #555;">
                                Enjoy <strong>5% OFF</strong> your first genuine Masuma brake pads, spark plugs, filters, or suspension components!
                            </p>
                            <p style="margin: 6px 0 0 0; font-size: 11px; color: #888;">
                                Present this code at Ruby Mall Nairobi or mention it when placing your order on WhatsApp.
                            </p>
                        </div>

                        <h3 style="color: #1A1A1A; font-size: 15px; margin-top: 25px; text-transform: uppercase;">What you will receive as a VIP:</h3>
                        <ul style="color: #444; line-height: 1.6; font-size: 14px; padding-left: 20px;">
                            <li style="margin-bottom: 8px;"><strong>Instant Stock Arrivals</strong>: Real-time alerts as shipments arrive from Tokyo at our Ruby Mall warehouse.</li>
                            <li style="margin-bottom: 8px;"><strong>12-Month Unlimited Mileage Warranty</strong>: Guaranteed authentic parts engineered for rough East African roads.</li>
                            <li style="margin-bottom: 8px;"><strong>Direct Technical Support</strong>: Instant fitment check by chassis/VIN number with our Nairobi engineering team.</li>
                        </ul>

                        {/* ACTION BUTTONS */}
                        <div style="margin-top: 30px; text-align: center; display: flex; flex-direction: column; gap: 10px;">
                            <a href="https://wa.me/254792506590?text=Hello%20Masuma%20Team,%20I%20am%20a%20new%20VIP%20subscriber.%20My%20code%20is%20KARIBU5." style="background: #25D366; color: white; padding: 14px 28px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 6px; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; margin-bottom: 8px;">
                                💬 Chat with Parts Specialist on WhatsApp
                            </a>
                            <br/>
                            <a href="${data.origin || 'https://masuma.africa'}/" style="background: #1A1A1A; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 6px; text-transform: uppercase; font-size: 12px;">
                                Explore Online Catalog
                            </a>
                        </div>
                    </div>

                    <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #777; margin: 0;">
                            <strong>Physical Shop:</strong> First Floor, Ruby Mall, Accra Road, Nairobi (Behind NCBA Bank)
                        </p>
                        <p style="font-size: 12px; color: #777; margin: 5px 0 0 0;">
                            Phone: <strong>+254 792 506 590</strong> | Email: <strong>sales@masuma.africa</strong>
                        </p>
                        <p style="font-size: 11px; color: #aaa; margin: 15px 0 0 0;">
                            You received this because you subscribed on masuma.africa. 
                            <a href="${data.origin || 'https://masuma.africa'}/api/newsletter/unsubscribe?email=${encodeURIComponent(data.email)}" style="color: #E0621B; text-decoration: underline; margin-left: 5px;">Unsubscribe</a>
                        </p>
                        <p style="font-size: 11px; color: #aaa; margin: 5px 0 0 0;">&copy; 2026 Masuma Autoparts East Africa Limited.</p>
                    </div>
                </div>
            `;
        } else if (type === 'B2B_APPLICATION_RECEIVED') {
            subject = `Application Received: Masuma B2B Wholesale Account (${data.businessName})`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="background: #1A1A1A; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
                        <h2 style="color: #E0621B; margin: 0; text-transform: uppercase;">Masuma B2B Wholesale</h2>
                    </div>
                    <div style="padding: 20px; background: #fff;">
                        <p>Jambo <strong>${data.name}</strong>,</p>
                        <p>Thank you for applying for a Masuma Wholesale &amp; Trade Account for <strong>${data.businessName}</strong>.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #E0621B; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Status:</strong> Under Review by Commercial Team</p>
                            <p style="margin: 5px 0 0 0; font-size: 13px; color: #555;">Our trade desk in Nairobi is verifying your business details and assigning your custom wholesale pricing tier.</p>
                        </div>
                        <p>You will receive an automated notification as soon as your account is approved.</p>
                        <p>For urgent bulk orders or trade credit inquiries, call us directly at <strong>+254 792 506 590</strong>.</p>
                        <p style="margin-top: 25px;">Regards,<br/><strong>Commercial Sales Team</strong><br/>Masuma Autoparts East Africa Limited</p>
                    </div>
                </div>
            `;
        } else if (type === 'ADMIN_NEW_B2B_APPLICATION') {
            to = config.SMTP_USER || 'sales@masuma.africa';
            subject = `🔔 Action Required: New B2B Wholesale Application - ${data.businessName}`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #E0621B;">New Wholesale Account Application</h2>
                    <p>A new trade customer has applied for B2B wholesale access on Masuma Africa:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Business:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.businessName}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Contact Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.applicantName}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.applicantEmail}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.phone}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">KRA / Tax ID:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.taxId || 'Not provided'}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.address}</td></tr>
                    </table>
                    <p>Please log in to the ERP Admin Dashboard &gt; <strong>User Management</strong> to review, set the wholesale discount %, and approve this account.</p>
                </div>
            `;
        } else if (type === 'B2B_APPLICATION_APPROVED') {
            subject = `🎉 Approved: Your Masuma B2B Wholesale Account is Ready! (${data.businessName || ''})`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="background: #1A1A1A; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
                        <h2 style="color: #E0621B; margin: 0; text-transform: uppercase;">Masuma B2B Wholesale Portal</h2>
                    </div>
                    <div style="padding: 25px; background: #fff;">
                        <h3 style="color: #2e7d32; margin-top: 0;">Congratulations, your trade account has been approved!</h3>
                        <p>Hi <strong>${data.name}</strong>,</p>
                        <p>Your wholesale account for <strong>${data.businessName}</strong> is now fully active with official trade privileges.</p>
                        
                        <div style="background: #e8f5e9; border: 2px dashed #4caf50; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
                            <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #2e7d32;">Your Active Trade Discount</span>
                            <div style="font-size: 26px; font-weight: bold; color: #1b5e20; margin: 5px 0;">${data.discountPercentage || 15}% OFF</div>
                            <span style="font-size: 12px; color: #555;">Applied automatically on bulk orders and B2B catalog items.</span>
                        </div>

                        <p><strong>What you can do now:</strong></p>
                        <ul style="color: #444; line-height: 1.6; font-size: 14px;">
                            <li>Access exclusive B2B wholesale pricing across 5,000+ Japanese genuine parts.</li>
                            <li>Upload bulk CSV orders for instant stock verification and checkout.</li>
                            <li>Place priority orders for pick up at Ruby Mall Nairobi or regional delivery.</li>
                        </ul>

                        <div style="margin: 25px 0; text-align: center;">
                            <a href="${data.origin || 'https://masuma.africa'}/login" style="background: #E0621B; color: white; padding: 14px 28px; text-decoration: none; display: inline-block; font-weight: bold; border-radius: 6px; text-transform: uppercase; font-size: 13px;">
                                Log In to B2B Portal
                            </a>
                        </div>

                        <p style="font-size: 12px; color: #777;">If you have any questions, reach out to your account manager at sales@masuma.africa or +254 792 506 590.</p>
                    </div>
                </div>
            `;
        } else if (type === 'B2B_APPLICATION_REJECTED') {
            subject = `Update Regarding Your Masuma Trade Account Application`;
            html = `
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #1A1A1A;">Application Status Update</h2>
                    <p>Dear ${data.name},</p>
                    <p>Thank you for your interest in a wholesale account for <strong>${data.businessName}</strong>. Following a review of your application, our commercial team is unable to approve trade credit terms at this time.</p>
                    <p>You can still purchase genuine Masuma parts directly through our retail catalog at <a href="https://masuma.africa">masuma.africa</a> or visit our Nairobi depot at Ruby Mall.</p>
                    <p>If you believe this was an error or would like to submit additional business documentation, please contact us at sales@masuma.africa.</p>
                </div>
            `;
        } else if (type === 'QUOTE_PROPOSAL') {
            subject = `Quotation #${data.quoteNumber} - Masuma Autoparts East Africa`;
            const itemsHtml = (data.items || []).map((item: any, idx: number) => {
                const qty = Number(item.quantity) || 1;
                const price = Number(item.unitPrice) || 0;
                const total = item.total !== undefined ? Number(item.total) : qty * price;
                return `
                    <tr style="border-bottom: 1px solid #eee; ${idx % 2 === 1 ? 'background-color: #fafafa;' : ''}">
                        <td style="padding: 10px 12px; font-size: 13px; color: #333;"><strong>${item.name}</strong></td>
                        <td style="padding: 10px 12px; font-size: 13px; text-align: center; color: #555;">${qty}</td>
                        <td style="padding: 10px 12px; font-size: 13px; text-align: right; font-family: monospace; color: #444;">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding: 10px 12px; font-size: 13px; text-align: right; font-weight: bold; font-family: monospace; color: #111;">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                `;
            }).join('');

            const subtotal = Number(data.subtotal || (data.total / 1.16));
            const tax = Number(data.tax || (data.total - subtotal));
            const total = Number(data.total);

            const vinHtml = data.vin ? `
                <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 12px 16px; margin: 15px 0;">
                    <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b21a8; letter-spacing: 0.5px;">Vehicle Identification (VIN / Chassis)</p>
                    <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #4c1d95;">${data.vin}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #7c3aed;">All items quoted are guaranteed to match this specific chassis specification.</p>
                </div>
            ` : '';

            html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff;">
                    <!-- Brand Header -->
                    <div style="background: #1A1A1A; padding: 24px 28px; text-align: left; border-bottom: 4px solid #E0621B;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Masuma Autoparts EA</h1>
                        <p style="color: #E0621B; margin: 4px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Genuine Japanese Precision • 12-Month Warranty</p>
                    </div>

                    <div style="padding: 28px;">
                        <div style="margin-bottom: 20px;">
                            <h2 style="color: #111827; margin: 0 0 6px 0; font-size: 18px;">Jambo ${data.customerName || 'Valued Customer'},</h2>
                            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
                                Thank you for choosing Masuma Autoparts East Africa. We have prepared quotation <strong>#${data.quoteNumber}</strong> with full pricing details below.
                            </p>
                        </div>

                        ${vinHtml}

                        <!-- Quote Meta -->
                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #374151;">
                            <table style="width: 100%;">
                                <tr>
                                    <td><strong>Quote Number:</strong> <span style="color: #E0621B; font-weight: bold;">${data.quoteNumber}</span></td>
                                    <td style="text-align: right;"><strong>Date:</strong> ${new Date(data.date || Date.now()).toLocaleDateString('en-GB')}</td>
                                </tr>
                                <tr>
                                    <td><strong>Customer:</strong> ${data.customerName || 'N/A'}</td>
                                    <td style="text-align: right;"><strong>Valid For:</strong> 14 Days</td>
                                </tr>
                                ${data.customerPhone ? `<tr><td><strong>Phone:</strong> ${data.customerPhone}</td><td></td></tr>` : ''}
                            </table>
                        </div>

                        <!-- Itemized Table -->
                        <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead>
                                    <tr style="background: #1A1A1A; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                                        <th style="padding: 10px 12px;">Product / Description</th>
                                        <th style="padding: 10px 12px; text-align: center; width: 60px;">Qty</th>
                                        <th style="padding: 10px 12px; text-align: right; width: 100px;">Unit Price (KES)</th>
                                        <th style="padding: 10px 12px; text-align: right; width: 110px;">Total (KES)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>

                        <!-- Totals Section -->
                        <div style="margin-bottom: 28px; text-align: right;">
                            <div style="display: inline-block; width: 280px; text-align: right; font-size: 13px;">
                                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #6b7280;">
                                    <span>Subtotal (Net):</span>
                                    <span style="font-family: monospace; color: #111827;">KES ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">
                                    <span>VAT (16%):</span>
                                    <span style="font-family: monospace; color: #111827;">KES ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold;">
                                    <span style="color: #111827;">Grand Total:</span>
                                    <span style="font-family: monospace; color: #E0621B;">KES ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment & Banking Instructions -->
                        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #E0621B; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                            <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #92400e;">Payment Instructions</h4>
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #78350f;">
                                • <strong>M-PESA Paybill:</strong> ${data.paybillNumber || '247247'} &nbsp;|&nbsp; <strong>Account Number:</strong> ${data.paybillAccount || '0792506590'}
                            </p>
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #78350f;">
                                • <strong>Bank:</strong> ${data.bankName || 'EQUITY BANK LTD'} (${data.bankBranch || 'Karen Branch'}) &nbsp;|&nbsp; <strong>A/C No:</strong> ${data.bankAccountNo || '1250285737086'}
                            </p>
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #78350f;">
                                • <strong>Account Name:</strong> ${data.bankAccountName || 'Masuma Autoparts East Africa'}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #b45309;">
                                ${data.paymentInstructions || `Please use <strong>${data.quoteNumber}</strong> as your payment reference.`}
                            </p>
                        </div>

                        <!-- PDF Attachment Notification -->
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #166534;">
                            <strong>Attached Document:</strong> An official PDF copy (<strong>Quote-${data.quoteNumber}.pdf</strong>) is attached to this email for your records and printing.
                        </div>

                        <!-- Contacts & Location -->
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280; line-height: 1.6;">
                            <p style="margin: 0 0 4px 0;"><strong>Depot Location:</strong> Ruby Mall, Shop FF25 First Floor, Accra Road, Nairobi.</p>
                            <p style="margin: 0 0 4px 0;"><strong>Phone / WhatsApp:</strong> +254 792 506 590 &nbsp;|&nbsp; <strong>Email:</strong> sales@masuma.africa</p>
                            <p style="margin: 0;"><strong>Operating Hours:</strong> Mon - Sat: 8:00 AM - 6:00 PM</p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f9fafb; padding: 16px 28px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
                        &copy; 2026 Masuma Autoparts East Africa Ltd. All rights reserved. • masuma.africa
                    </div>
                </div>
            `;
        } else if (type === 'PAYMENT_RECEIPT') {
            const isFullPayment = Number(data.balance) <= 0;
            subject = isFullPayment 
                ? `Official Payment Receipt #${data.receiptNumber || data.orderNumber} (Fully Paid) - Masuma Autoparts EA`
                : `Payment Receipt: Installment for Order #${data.orderNumber} - Masuma Autoparts EA`;
            
            html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff;">
                    <div style="background: #1A1A1A; padding: 24px; text-align: left; border-bottom: 4px solid #10B981;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">Masuma Autoparts EA</h1>
                        <p style="color: #10B981; margin: 4px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                            ${isFullPayment ? 'Official Receipt • Paid In Full' : 'Official Payment Voucher • Partial Installment'}
                        </p>
                    </div>
                    <div style="padding: 24px;">
                        <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 18px;">Jambo ${data.customerName || 'Customer'},</h2>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                            We have received and recorded your payment of <strong style="color: #10B981;">KES ${Number(data.amountPaidThisTime || data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> for Invoice/Order <strong>#${data.orderNumber}</strong>.
                        </p>

                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #6b7280;">Payment Method:</span>
                                <span style="font-weight: bold; color: #111827;">${data.paymentMethod || 'MANUAL'}</span>
                            </div>
                            ${data.reference ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #6b7280;">Transaction Ref:</span>
                                <span style="font-family: monospace; font-weight: bold; color: #111827;">${data.reference}</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #6b7280;">Total Invoice Amount:</span>
                                <span style="font-family: monospace; color: #111827;">KES ${Number(data.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #6b7280;">Total Amount Paid to Date:</span>
                                <span style="font-family: monospace; font-weight: bold; color: #10B981;">KES ${Number(data.totalAmountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 14px;">
                                <span style="font-weight: bold; color: #111827;">Remaining Balance:</span>
                                <span style="font-family: monospace; font-weight: bold; color: ${isFullPayment ? '#10B981' : '#E0621B'};">
                                    KES ${Number(data.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    ${isFullPayment ? ' (FULLY SETTLED)' : ''}
                                </span>
                            </div>
                        </div>

                        ${isFullPayment ? `
                            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #065f46;">
                                <strong>Payment Complete:</strong> Your invoice is now fully settled! Our dispatch team is preparing your parts for release or shipment.
                            </div>
                        ` : `
                            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
                                <strong>Next Step:</strong> Please settle the remaining balance of <strong>KES ${Number(data.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> to complete fulfillment.
                                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #d97706; font-size: 12px; line-height: 1.5;">
                                    <p style="margin: 0 0 4px 0; font-weight: bold; color: #78350f;">Orders and Payment should be made to:</p>
                                    <p style="margin: 0 0 3px 0;">• <strong>M-PESA Paybill:</strong> ${data.paybillNumber || '247247'} &nbsp;|&nbsp; <strong>ACC:</strong> ${data.paybillAccount || '0792506590'}</p>
                                    <p style="margin: 0 0 3px 0;">• <strong>BANK:</strong> ${data.bankName || 'EQUITY BANK LTD'} &nbsp;|&nbsp; <strong>Branch:</strong> ${data.bankBranch || 'Karen Branch'}</p>
                                    <p style="margin: 0 0 3px 0;">• <strong>Account No:</strong> ${data.bankAccountNo || '1250285737086'}</p>
                                    <p style="margin: 0;">• <strong>Account Name:</strong> ${data.bankAccountName || 'Masuma Autoparts East Africa'}</p>
                                </div>
                            </div>
                        `}

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #6b7280;">
                            <p style="margin: 0 0 4px 0;"><strong>Masuma Autoparts East Africa Ltd</strong> • Ruby Mall, Accra Rd, Nairobi</p>
                            <p style="margin: 0;">Tel: +254 792 506 590 &nbsp;|&nbsp; sales@masuma.africa</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (to && subject && html) {
            return await this.sendRawEmail(to, subject, html, attachments);
        }
        return false;
    }

    static async verifySmtp(): Promise<{ ok: boolean; message: string }> {
        if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
            return {
                ok: false,
                message: 'SMTP credentials missing in server .env (SMTP_HOST, SMTP_USER, or SMTP_PASS is unset).'
            };
        }
        try {
            await transporter.verify();
            return { 
                ok: true, 
                message: `SMTP connection successfully verified with ${config.SMTP_HOST}:${config.SMTP_PORT}. Ready for outbound notifications.` 
            };
        } catch (err: any) {
            return { 
                ok: false, 
                message: `SMTP Connection Failed: ${err.message}` 
            };
        }
    }

    static async testSend(targetEmail: string, origin: string): Promise<{ ok: boolean; message: string }> {
        try {
            const subject = "Masuma EA - SMTP Notification Diagnostic Test";
            const html = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #E0621B;">Masuma EA Notification Test</h2>
                    <p>This is a diagnostic test email confirming that your outbound email notification pipeline is operational.</p>
                    <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
                    <p><strong>Host:</strong> ${config.SMTP_HOST}</p>
                    <p><strong>Sender:</strong> ${getFromAddress()}</p>
                </div>
            `;
            await this.sendRawEmail(targetEmail, subject, html);
            return { ok: true, message: `Diagnostic email successfully delivered to ${targetEmail}!` };
        } catch (err: any) {
            return { ok: false, message: `Delivery failed: ${err.message}` };
        }
    }

    static async sendRawEmail(to: string, subject: string, html: string, attachments?: any[]) {
        if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
            console.error('⚠️ [SMTP] Missing credentials in .env');
            return false;
        }
        try {
            const from = getFromAddress();
            console.log(`📧 [SMTP] Delivering to: ${to} from: ${from}${attachments ? ` (${attachments.length} attachment(s))` : ''}`);
            const info = await transporter.sendMail({
                from,
                to,
                subject,
                html,
                attachments
            });
            console.log(`✅ [SMTP] Success: ${info.messageId}`);
            return true;
        } catch(e: any) {
             console.error(`❌ [SMTP] Delivery Failed to ${to}:`, e.message);
             throw e;
        }
    }
}