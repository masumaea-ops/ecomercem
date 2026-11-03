import axios from 'axios';
import { Buffer } from 'buffer';
import { AppDataSource } from '../config/database';
import { MpesaTransaction } from '../entities/MpesaTransaction';
import { Order, OrderStatus } from '../entities/Order';
import { SystemSetting } from '../entities/SystemSetting';
import { CacheService } from '../lib/cache';
import { logger } from '../utils/logger';
import { SaleService } from './saleService';
import { EmailService } from './emailService';
import { Security } from '../utils/security';

export class MpesaService {
  private static transactionRepo = AppDataSource.getRepository(MpesaTransaction);
  private static orderRepo = AppDataSource.getRepository(Order);
  private static settingsRepo = AppDataSource.getRepository(SystemSetting);

  private static async getSetting(key: string, envKey?: string): Promise<string> {
    const setting = await this.settingsRepo.findOneBy({ key });
    if (setting && setting.value) return setting.value;
    return (envKey && process.env[envKey]) ? process.env[envKey]! : '';
  }

  private static formatPhoneNumber(phone: string): string {
    let p = phone.replace(/\D/g, ''); 
    if (p.startsWith('07') || p.startsWith('01')) {
      p = '254' + p.substring(1);
    } else if (p.startsWith('7') || p.startsWith('1')) {
        p = '254' + p;
    } else if (p.startsWith('+254')) {
        p = p.substring(1);
    }
    if (p.length === 9) p = '254' + p;
    return p;
  }

  private static async getAccessToken(): Promise<string> {
    return CacheService.getOrSet('mpesa_access_token', async () => {
        const consumerKey = await this.getSetting('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_KEY');
        const consumerSecret = await this.getSetting('MPESA_CONSUMER_SECRET', 'MPESA_CONSUMER_SECRET');
        const env = process.env.MPESA_ENV || 'sandbox';
        const baseUrl = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

        if (!consumerKey || !consumerSecret) throw new Error('M-Pesa credentials not configured');

        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        try {
            const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { Authorization: `Basic ${auth}` }
            });
            return response.data.access_token;
        } catch (error: any) {
            throw new Error('Failed to authenticate with Safaricom');
        }
    }, 3300); 
  }

  static generateCallbackToken(orderId: string): string {
    return Security.hashToken(`${orderId}:${Security.getJwtSecret()}`);
  }

  static async initiateStkPush(orderId: string, phoneNumber: string, amount: number, options: { callbackUrl?: string, siteSource?: string } = {}) {
    try {
        const token = await this.getAccessToken();
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        
        const shortcode = await this.getSetting('MPESA_SHORTCODE', 'MPESA_SHORTCODE');
        const passkey = await this.getSetting('MPESA_PASSKEY', 'MPESA_PASSKEY');
        const settingCallbackUrl = await this.getSetting('MPESA_CALLBACK_URL', 'MPESA_CALLBACK_URL');
        const txType = await this.getSetting('MPESA_TRANSACTION_TYPE') || 'CustomerPayBillOnline'; 
        
        // Use dynamic callback if provided, append secret verification token to prevent webhook spoofing
        const callbackSecret = this.generateCallbackToken(orderId);
        let callbackUrl = options.callbackUrl || settingCallbackUrl;
        if (callbackUrl) {
            const separator = callbackUrl.includes('?') ? '&' : '?';
            callbackUrl = `${callbackUrl}${separator}token=${callbackSecret}`;
        }
        const siteSource = options.siteSource || 'masuma.africa';

        const env = process.env.MPESA_ENV || 'sandbox';
        const baseUrl = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

        if (!shortcode || !passkey || !callbackUrl) throw new Error('Missing M-Pesa Configuration');

        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        const sanitizedRef = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase();
        
        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: txType, 
            Amount: Math.round(amount), 
            PartyA: formattedPhone,
            PartyB: shortcode, 
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: sanitizedRef, 
            TransactionDesc: `Purchase from ${siteSource}` 
        };

        logger.info(`Sending STK Push [Ref: ${payload.AccountReference}] [Source: ${siteSource}] to ${formattedPhone}`);

        const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const order = await this.orderRepo.findOneBy({ id: orderId });
        if (order) {
            // Update order with site source
            order.siteSource = siteSource;
            await this.orderRepo.save(order);

            const tx = this.transactionRepo.create({
                order: order,
                merchantRequestID: response.data.MerchantRequestID,
                checkoutRequestID: response.data.CheckoutRequestID,
                amount: amount,
                phoneNumber: formattedPhone,
                status: 'PENDING',
                siteSource: siteSource
            });
            await this.transactionRepo.save(tx);
        }

        return response.data;
    } catch (error: any) {
        const apiMsg = error.response?.data?.errorMessage || error.message;
        logger.error('Daraja API Rejection:', apiMsg);
        throw new Error(`Safaricom rejected request: ${apiMsg}`);
    }
  }

  static async handleCallback(body: any, token?: string) {
    const { stkCallback } = body?.Body || {};
    if (!stkCallback) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    const transaction = await this.transactionRepo.findOne({
      where: { checkoutRequestID: CheckoutRequestID },
      relations: ['order']
    });

    if (!transaction || transaction.status !== 'PENDING') return;

    // Verify callback token if provided
    if (token && transaction.order) {
      const expectedToken = this.generateCallbackToken(transaction.order.id);
      if (token !== expectedToken) {
        logger.warn(`Untrusted M-Pesa Callback Attempt: Invalid token for Order ${transaction.order.id}`);
        return;
      }
    }

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receiptNumber = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const paidAmount = items.find((i: any) => i.Name === 'Amount')?.Value;

      transaction.mpesaReceiptNumber = receiptNumber;
      transaction.resultDesc = 'Success';
      transaction.amount = Number(paidAmount);
      transaction.status = 'COMPLETED';
      
      const orderTotal = Number(transaction.order.totalAmount);
      const numericPaid = Number(paidAmount);

      // Validate payment amount against order total with 1.0 KES tolerance for rounding
      if (numericPaid >= orderTotal - 1.0) {
        transaction.order.status = OrderStatus.PAID;
        transaction.order.amountPaid = numericPaid;
        transaction.order.balance = 0;
      } else {
        logger.warn(`Underpayment Alert: Order ${transaction.order.id} required KES ${orderTotal} but received KES ${numericPaid}`);
        transaction.order.status = OrderStatus.PARTIALLY_PAID;
        transaction.order.amountPaid = numericPaid;
        transaction.order.balance = Math.max(0, parseFloat((orderTotal - numericPaid).toFixed(2)));
      }
      
      await this.transactionRepo.save(transaction);
      await this.orderRepo.save(transaction.order);

      // Only convert to Sale and send receipt email if fully paid
      if (transaction.order.status === OrderStatus.PAID) {
        const fullOrder = await this.orderRepo.findOne({
          where: { id: transaction.order.id },
          relations: ['items', 'items.product']
        });
        
        if (fullOrder) {
          try {
            // 1. Convert to Sale for ERP tracking
            await SaleService.createSaleFromOrder(fullOrder);
            
            // 2. Send Customer Confirmation Email
            if (fullOrder.customerEmail && fullOrder.customerEmail.includes('@')) {
              await EmailService.sendEmail('ORDER_CONFIRMATION', {
                email: fullOrder.customerEmail,
                customerName: fullOrder.customerName,
                orderNumber: fullOrder.orderNumber,
                totalAmount: fullOrder.totalAmount
              });
            }
          } catch (e) {
            logger.error('Post-payment automation failed', e);
          }
        }
      }
    } else {
      transaction.status = 'FAILED';
      transaction.resultDesc = ResultDesc;
      await this.transactionRepo.save(transaction);
    }
  }
}