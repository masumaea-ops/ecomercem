import { EmailService } from '../services/emailService';
import { ImportConciergeInvoice, ConciergeInvoiceStatus } from '../entities/ImportConciergeInvoice';
import { logger } from './logger';

export interface MilestoneEmailParams {
  invoice: ImportConciergeInvoice;
  stop: ConciergeInvoiceStatus | string;
  notes?: string;
  tempPassword?: string;
}

export class ConciergeNotifier {
  /**
   * Dispatches automated email notification on EVERY STOP of the vehicle importation journey
   */
  static async notifyMilestone(params: MilestoneEmailParams): Promise<boolean> {
    const { invoice, stop, notes, tempPassword } = params;
    if (!invoice.customerEmail) return false;

    const formatKes = (amt: number | string) =>
      `KES ${Number(amt || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const totalPaid = Number(invoice.depositPaidKes || 0) + Number(invoice.cifPaidKes || 0) + Number(invoice.dutyPaidKes || 0);
    const balance = Math.max(0, Number(invoice.grandTotalKes || 0) - totalPaid);

    let stageTitle = 'Concierge Import Update';
    let stageColor = '#ff6600';
    let stageDescription = 'Your vehicle import request has progressed to the next operational phase.';
    let actionTip = 'You can track this vehicle live using your Invoice Reference.';

    switch (stop) {
      case ConciergeInvoiceStatus.PROFORMA:
        stageTitle = 'Stop 1: Concierge Proforma Raised & Buyer Account Created';
        stageColor = '#ff6600';
        stageDescription = `Official Proforma Invoice ${invoice.invoiceNumber} has been raised for your ${invoice.vehicleMake} ${invoice.vehicleModel} (${invoice.yearOfManufacture}). Your personal Concierge Buyer Account has been provisioned.`;
        actionTip = 'Please review your proforma and deposit the initial 30% sourcing commitment to authorize auction bidding.';
        break;

      case ConciergeInvoiceStatus.SOURCING_DEPOSIT_PAID:
        stageTitle = 'Stop 2: 30% Sourcing Deposit Confirmed — Auction Bidding Active';
        stageColor = '#7c3aed';
        stageDescription = `Your 30% commitment deposit has been confirmed. Our sourcing team in Japan (USS, TAA) and the UK has activated live bidding for your specified ${invoice.vehicleMake} ${invoice.vehicleModel}.`;
        actionTip = 'You will be notified as soon as a prime, verified-grade vehicle is secured.';
        break;

      case ConciergeInvoiceStatus.VEHICLE_PURCHASED:
        stageTitle = 'Stop 3: Vehicle Successfully Secured at Auction!';
        stageColor = '#2563eb';
        stageDescription = `Great news! Your ${invoice.vehicleMake} ${invoice.vehicleModel} has been won at certified auction. The foreign export certificate and physical condition sheet have been verified.`;
        actionTip = `Chassis / VIN: ${invoice.chassisNumber || 'Verified'}. Vehicle is moving to the export terminal for KEBS inspection.`;
        break;

      case ConciergeInvoiceStatus.EXPORT_INSPECTION:
        stageTitle = 'Stop 4: KEBS KS 1515:2000 Export Roadworthiness Passed';
        stageColor = '#0891b2';
        stageDescription = `Pre-export inspection by QISJ/JEVIC completed in Yokohama/UK. Roadworthiness, odometer genuineness, and radiation safety certified under Kenya Bureau of Standards (KS 1515:2000).`;
        actionTip = 'Vehicle is cleared for vessel loading.';
        break;

      case ConciergeInvoiceStatus.IN_TRANSIT:
        stageTitle = 'Stop 5: Vessel Loaded & Ocean Ro-Ro Transit Underway';
        stageColor = '#0284c7';
        stageDescription = `Your vehicle has been loaded onto the Ro-Ro vessel ${invoice.vesselName || 'Ocean Carrier'} (Voyage: ${invoice.voyageNumber || 'Direct Line'}). Bill of Lading BL: ${invoice.billOfLadingNumber || 'MOLU-Assigned'}.`;
        actionTip = `Vessel is sailing toward Port of Mombasa. Estimated Port Arrival (ETA): ${invoice.etaDate ? new Date(invoice.etaDate).toLocaleDateString('en-GB') : 'Approx 30-35 Days'}.`;
        break;

      case ConciergeInvoiceStatus.ARRIVED_MOMBASA:
        stageTitle = 'Stop 6: Vessel Berthed at Port of Mombasa (Kilindini Harbour)';
        stageColor = '#0d9488';
        stageDescription = `The ocean vessel has safely docked at Mombasa Port. Offloading to secure Container Freight Station (CFS) is underway.`;
        actionTip = 'Port CFS tally and KRA physical verification commence immediately.';
        break;

      case ConciergeInvoiceStatus.CUSTOMS_CLEARING:
        stageTitle = 'Stop 7: KRA Customs Taxes Assessed & Port Clearance in Progress';
        stageColor = '#ea580c';
        stageDescription = `KRA Simba / ICMS Customs Entry lodged. Import Duty, Excise Duty, VAT 16%, IDF, and RDL statutory assessments are undergoing customs clearance.`;
        actionTip = `KRA Entry No: ${invoice.kraEntryNumber || 'Simba/ICMS Lodged'}. CFS delivery order will be issued upon tax clearance.`;
        break;

      case ConciergeInvoiceStatus.NTSA_REGISTRATION:
        stageTitle = 'Stop 8: NTSA Inspection & Kenya Number Plates Processing';
        stageColor = '#4f46e5';
        stageDescription = `Vehicle is undergoing NTSA physical inspection and registration. Registration marks (Number Plates: ${invoice.registrationPlate || 'Allocated'}) and electronic logbook transfer to your name are in progress.`;
        actionTip = 'Interim movement permit issued for transport from Mombasa to Nairobi.';
        break;

      case ConciergeInvoiceStatus.READY_FOR_COLLECTION:
        stageTitle = 'Stop 9: Arrived at Nairobi Hub — Pre-Delivery Inspection (PDI) Complete';
        stageColor = '#059669';
        stageDescription = `Your vehicle has safely arrived at our Nairobi Hub (Industrial Area). Masuma comprehensive mechanical inspection, fluid top-up, and full detailing have been completed.`;
        actionTip = 'Vehicle is ready for showroom collection or scheduled doorstep flatbed delivery.';
        break;

      case ConciergeInvoiceStatus.RELEASED:
      case ConciergeInvoiceStatus.COMPLETED:
        stageTitle = 'Stop 10: Official Vehicle Release & Handover Complete!';
        stageColor = '#15803d';
        stageDescription = `Congratulations! Full settlement acknowledged. Your ${invoice.vehicleMake} ${invoice.vehicleModel} has been officially released with original logbook, 2 smart keys, and Handover Certificate.`;
        actionTip = 'Welcome to the Masuma family! Retain your Handover Certificate for your records.';
        break;
    }

    const subject = `[MASUMA CONCIERGE] ${stageTitle} - ${invoice.vehicleMake} ${invoice.vehicleModel} (${invoice.invoiceNumber})`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
        <div style="background: #1a1a1a; padding: 26px 32px; border-bottom: 4px solid ${stageColor};">
          <span style="color: ${stageColor}; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Masuma Vehicle Import Concierge Kenya</span>
          <h1 style="color: #ffffff; margin: 6px 0 0 0; font-size: 19px; font-weight: 800;">${stageTitle}</h1>
        </div>

        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #111827; margin-top: 0;">
            Dear <strong>${invoice.customerName}</strong>,
          </p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            ${stageDescription}
          </p>

          ${notes ? `
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #1e40af;"><strong>Operation Notes:</strong> ${notes}</p>
            </div>
          ` : ''}

          ${tempPassword ? `
            <div style="background: #fdf2e9; border: 2px dashed #ff6600; padding: 18px 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px 0; color: #c2410c; font-size: 14px; font-weight: 800; text-transform: uppercase;">Your Buyer Account Credentials</h3>
              <p style="margin: 4px 0; font-size: 13px; color: #431407;">We have created a personal Concierge Buyer Account for you to monitor your vehicle import:</p>
              <p style="margin: 6px 0; font-size: 13px; color: #111827;"><strong>Login Email:</strong> ${invoice.customerEmail}</p>
              <p style="margin: 6px 0; font-size: 13px; color: #111827;"><strong>Temporary Password:</strong> <code style="background: #fed7aa; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: bold;">${tempPassword}</code></p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #7c2d12;">You can log in to view your live transit map, invoices, and signed Kenyan direct import agreements.</p>
            </div>
          ` : ''}

          <!-- Vehicle Particulars Card -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px; margin: 20px 0; font-size: 13px;">
            <h4 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Vehicle & Transit Profile</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Vehicle:</td>
                <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.vehicleMake} ${invoice.vehicleModel} (${invoice.yearOfManufacture})</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Chassis / VIN:</td>
                <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.chassisNumber || 'Verified Foreign Spec'}</td>
              </tr>
              ${invoice.vesselName ? `
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Ro-Ro Vessel:</td>
                  <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #111827;">${invoice.vesselName} (Voyage ${invoice.voyageNumber || '1'})</td>
                </tr>
              ` : ''}
              ${invoice.registrationPlate ? `
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">NTSA Registration Mark:</td>
                  <td style="padding: 5px 0; font-weight: 800; text-align: right; color: #ff6600;">${invoice.registrationPlate}</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Total Agreed Landed Cost:</td>
                <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #111827;">${formatKes(invoice.grandTotalKes)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Total Paid to Date:</td>
                <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #059669;">${formatKes(totalPaid)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Outstanding Balance:</td>
                <td style="padding: 5px 0; font-weight: 800; text-align: right; color: ${balance === 0 ? '#059669' : '#dc2626'};">
                  ${balance === 0 ? 'KES 0.00 (PAID IN FULL)' : formatKes(balance)}
                </td>
              </tr>
            </table>
          </div>

          <!-- Settlement Instructions -->
          ${balance > 0 ? `
            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 0 0 6px 0; font-weight: 800; color: #111827; text-transform: uppercase;">Official Settlement Options:</p>
              <p style="margin: 3px 0; color: #374151;">• <strong>Lipa Na M-Pesa Paybill:</strong> 247247 | <strong>Account:</strong> ${invoice.invoiceNumber}</p>
              <p style="margin: 3px 0; color: #374151;">• <strong>NCBA Bank Wire:</strong> Industrial Area Branch | <strong>Account No:</strong> 1002345892</p>
            </div>
          ` : ''}

          <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 24px;">
            ${actionTip}
          </p>

          <p style="font-size: 11px; color: #9ca3af; margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            Masuma Vehicle Import Concierge Ltd • Commercial Street, Industrial Area, Nairobi • Tel: +254 700 000 000 / +254 792 506 590
          </p>
        </div>
      </div>
    `;

    try {
      await EmailService.sendRawEmail(invoice.customerEmail, subject, html);
      return true;
    } catch (e: any) {
      logger.error(`Failed to dispatch milestone notification for ${stop}:`, e.message);
      return false;
    }
  }
}
