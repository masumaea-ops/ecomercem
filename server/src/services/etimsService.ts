import axios from 'axios';
import { AppDataSource } from '../config/database';
import { SystemSetting } from '../entities/SystemSetting';
import { logger } from '../utils/logger';

interface FiscalItem {
  hsCode: string;
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: 16 | 0 | 8; 
}

export class EtimsService {
  private static settingsRepo = AppDataSource.getRepository(SystemSetting);

  private static async getSetting(key: string): Promise<string> {
      const s = await this.settingsRepo.findOneBy({ key });
      return s?.value || '';
  }
  
  static async signInvoice(invoiceId: string, items: FiscalItem[], total: number) {
    try {
      // 1. Fetch Production Config
      const deviceSerial = await this.getSetting('DEVICE_SERIAL') || process.env.KRA_DEVICE_SERIAL;
      const pin = await this.getSetting('KRA_PIN') || process.env.COMPANY_PIN;
      const deviceUrl = await this.getSetting('KRA_API_URL'); // e.g., http://192.168.1.20:8080/api/v1/invoice

      // If no device URL is configured, we cannot sign. Return null or throw based on strictness.
      if (!deviceUrl || !pin) {
          logger.warn('[eTIMS] Configuration missing. Skipping fiscal signature.');
          return null;
      }

      logger.info(`[eTIMS] Sending Invoice ${invoiceId} to VSCU Device (${deviceSerial})`);

      // 2. Construct Regulatory Payload (Standard Type C / OSCU JSON)
      const payload = {
          senderId: pin,
          invoiceType: "Original",
          relevantInvoiceNumber: invoiceId,
          traderSystemInvoiceNumber: invoiceId,
          items: items.map(item => ({
              hsCode: item.hsCode || "8708.99.00", // Default Auto Parts HS Code
              description: item.name,
              quantity: item.qty,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              taxAmount: (item.unitPrice * item.qty * (item.taxRate / 100))
          })),
          totalAmount: total,
          paymentMethod: "Cash/Mpesa", 
          date: new Date().toISOString().split('T')[0]
      };

      // 3. Send to Device (Timeout 5s to prevent hanging POS)
      const response = await axios.post(deviceUrl, payload, { timeout: 5000 });

      if (response.data && response.data.controlCode) {
          logger.info(`[eTIMS] Invoice Signed Successfully: ${response.data.controlCode}`);
          return {
              controlCode: response.data.controlCode,
              qrCode: response.data.qrCodeUrl,
              signature: response.data.signature,
              fiscalDate: new Date()
          };
      } else {
          throw new Error('Invalid response structure from eTIMS Device');
      }

    } catch (error: any) {
      // Log the specific error from the device
      logger.error('[eTIMS] Device Error:', error.message);
      if (error.response) {
          logger.error('[eTIMS] Device Response Data:', error.response.data);
      }
      // Return null so the sale can proceed locally (Offline Fiscal Mode)
      return null; 
    }
  }
}