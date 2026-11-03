import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ImportConciergeInvoice } from '../types';

export const formatKes = (amount: number | string | undefined): string => {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

export const getVehicleAge = (inv: Partial<ImportConciergeInvoice>, fallbackYear?: number): number => {
  if (inv.vehicleAge !== undefined && inv.vehicleAge !== null && !isNaN(Number(inv.vehicleAge))) {
    return Number(inv.vehicleAge);
  }
  const yom = inv.yearOfManufacture || fallbackYear || new Date().getFullYear();
  return Math.max(0, new Date().getFullYear() - Number(yom));
};

/**
 * Builds the clean, non-overlapping header banner for Masuma Concierge documents
 */
const drawDocumentHeader = (
  doc: jsPDF,
  badgeText: string,
  invoiceNumber: string,
  dateStr: string,
  statusStr?: string
) => {
  // Top Banner
  doc.setFillColor(26, 26, 26); // Dark Charcoal
  doc.rect(0, 0, 210, 42, 'F');

  // Masuma Orange Accent Stripe
  doc.setFillColor(255, 102, 0);
  doc.rect(0, 42, 210, 3, 'F');

  // Left Brand Block (constrained to left half)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MASUMA VEHICLE IMPORT CONCIERGE', 16, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(210, 210, 210);
  doc.text('Commercial Street, Industrial Area, Nairobi • P.O. Box 45892-00100', 16, 25);
  doc.text('Email: concierge@masuma.africa • Hotline: +254 700 000 000 / +254 792 506 590', 16, 31);
  doc.text('KRA Authorized Direct Vehicle Sourcing & Customs Brokerage', 16, 37);

  // Right Metadata Block (Right-aligned to 194mm)
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 102, 0);
  doc.text(badgeText, 194, 18, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(`Ref No: ${invoiceNumber}`, 194, 25, { align: 'right' });
  doc.text(`Date: ${dateStr}`, 194, 31, { align: 'right' });

  if (statusStr) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 102, 0);
    doc.text(`Status: ${statusStr.replace(/_/g, ' ')}`, 194, 37, { align: 'right' });
  }
};

/**
 * 1. OFFICIAL PROFORMA INVOICE (Page 1)
 */
export const buildProformaInvoicePage = (doc: jsPDF, invoice: Partial<ImportConciergeInvoice>) => {
  const invNum = invoice.invoiceNumber || `INV-CON-${Date.now().toString().slice(-6)}`;
  const dateStr = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const vehicleAge = getVehicleAge(invoice);

  drawDocumentHeader(doc, 'PROFORMA INVOICE', invNum, dateStr, invoice.status || 'PROFORMA');

  // Customer & Vehicle Metadata Section
  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFORMA BILLED TO:', 16, 54);
  doc.text('VEHICLE SPECIFICATIONS:', 112, 54);

  // Grey Divider Line
  doc.setDrawColor(230, 230, 230);
  doc.line(16, 56, 194, 56);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  // Customer column
  const custName = invoice.customerName || 'Valued Client';
  const custEmail = invoice.customerEmail || 'N/A';
  const custPhone = invoice.customerPhone || 'N/A';
  const custPin = invoice.customerPin ? `PIN: ${invoice.customerPin}` : 'PIN: Client to provide for KRA clearance';
  const custId = invoice.customerIdNumber ? `ID/Passport: ${invoice.customerIdNumber}` : '';

  doc.text(`Customer: ${custName}`, 16, 63);
  doc.text(`Email: ${custEmail}`, 16, 69);
  doc.text(`Phone: ${custPhone}`, 16, 75);
  doc.text(`${custPin} ${custId ? `• ${custId}` : ''}`.trim(), 16, 81);
  doc.text('Import Origin: Japan / UK Certified Auction Direct', 16, 87);

  // Vehicle column
  const vehName = `${invoice.vehicleMake || ''} ${invoice.vehicleModel || ''} ${invoice.modelNumber ? `(${invoice.modelNumber})` : ''}`.trim();
  doc.text(`Vehicle: ${vehName}`, 112, 63);
  doc.text(`Year of Manufacture: ${invoice.yearOfManufacture || 'N/A'} (${vehicleAge} Years Old)`, 112, 69);
  doc.text(`Engine: ${invoice.engineSize || 1500} CC • Fuel: ${invoice.fuelType || 'GASOLINE'}`, 112, 75);
  doc.text(`Drive: ${invoice.driveConfiguration || '2WD / 4WD'} • Trans: ${invoice.transmission || 'Automatic (AT/CVT)'}`, 112, 81);
  doc.text(`Chassis / VIN: ${invoice.chassisNumber || 'To be assigned upon auction procurement'}`, 112, 87);

  // Financial Tabulation Table
  const crspBase = Number(invoice.crspBenchmarkKes || 0);
  const depRate = Number(invoice.depreciationRate || 0.65);
  const depAmt = crspBase * depRate;
  const cif = Number(invoice.customsValueCifKes || 0);
  const duty = Number(invoice.importDutyKes || 0);
  const excise = Number(invoice.exciseDutyKes || 0);
  const vat = Number(invoice.vatKes || 0);
  const idf = Number(invoice.idfFeeKes || 0);
  const rdl = Number(invoice.rdlFeeKes || 0);
  const port = Number(invoice.portChargesKes || 65000);
  const landed = Number(invoice.landedVehicleValueKes || (cif + duty + excise + vat + idf + rdl + port));
  const commission = Number(invoice.sourcingCommissionKes || (landed * 0.035));
  const grandTotal = Number(invoice.grandTotalKes || (landed + commission));

  const totalPaid = Number(invoice.depositPaidKes || 0) + Number(invoice.cifPaidKes || 0) + Number(invoice.dutyPaidKes || 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  autoTable(doc, {
    startY: 93,
    head: [['Line Item / Customs & Statutory Tariff', 'KRA Basis / Statutory Rate', 'Amount (KES)']],
    body: [
      ['KRA Benchmark Current Retail Selling Price (CRSP New)', 'Gazetted KRA Schedule', formatKes(crspBase)],
      [`Allowable Age Depreciation (${Math.round(depRate * 100)}%)`, 'KS 1515:2000 Direct Import Rule', `-${formatKes(depAmt)}`],
      ['Customs Valuation (CIF Landing Basis)', 'Deductive Valuation Rule', formatKes(cif)],
      [`Import Duty (${Math.round(Number(invoice.importDutyRate || 0.35) * 100)}%)`, 'Customs Value × Duty Rate', formatKes(duty)],
      [`Excise Duty (${invoice.exciseDutyRate ? Math.round(invoice.exciseDutyRate * 100) + '%' : 'Statutory Tier'})`, 'Excise Value (CIF + Duty) × Rate', formatKes(excise)],
      ['Value Added Tax (VAT 16%)', '(Excise Value + Excise Duty) × 16%', formatKes(vat)],
      ['Import Declaration Fee (IDF 2.5%)', 'Customs Value × 2.5%', formatKes(idf)],
      ['Railway Development Levy (RDL 2.0%)', 'Customs Value × 2.0%', formatKes(rdl)],
      ['Port Handling, CFS Storage & Agency Clearance', 'Standard Marine Port Assessment', formatKes(port)],
      ['TOTAL LANDED VEHICLE COST', 'CIF + Total KRA Taxes + CFS Port Clearance', formatKes(landed)],
      ['MASUMA CONCIERGE SOURCING COMMISSION (3.5%)', 'Verified Sourcing & Doorstep Delivery Fee', formatKes(commission)],
    ],
    foot: [
      ['TOTAL PROFORMA INVOICE PAYABLE', 'ALL STATUTORY TAXES & COMMISSION INCLUDED', formatKes(grandTotal)]
    ],
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [255, 102, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
    styles: { fontSize: 8, cellPadding: 2.4, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 50 },
      2: { cellWidth: 33, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 205;

  // Payment Tracking & Settlement Instructions Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, finalY + 5, 178, 42, 2.5, 2.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, finalY + 5, 178, 42, 2.5, 2.5, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26);
  doc.text('SETTLEMENT & PAYMENT INSTRUCTIONS:', 22, finalY + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`• Lipa Na M-Pesa Paybill: 247247  |  Account Number: ${invNum}`, 22, finalY + 20);
  doc.text('• Bank Wire: NCBA Bank Kenya PLC  |  Branch: Industrial Area, Nairobi', 22, finalY + 26);
  doc.text('• Account Name: Masuma Africa Concierge Ltd  |  Account No: 1002345892', 22, finalY + 32);

  // Settlement Status Indicators
  doc.setFont('helvetica', 'bold');
  if (totalPaid > 0) {
    doc.setTextColor(5, 150, 105);
    doc.text(`• Payments Credited: ${formatKes(totalPaid)}`, 22, finalY + 40);
    doc.setTextColor(185, 28, 28);
    doc.text(`• Balance Due: ${formatKes(balanceDue)}`, 115, finalY + 40);
  } else {
    doc.setTextColor(255, 102, 0);
    doc.text('• Sourcing commences immediately upon payment of initial 30% commitment deposit.', 22, finalY + 40);
  }

  // Footer Disclaimer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('Masuma Vehicle Import Concierge Ltd is a certified import logistics partner for Japanese & UK auctions. Proforma generated electronically.', 16, 286);
  doc.text('Subject to Kenya Revenue Authority valuation rules (KS 1515:2000). Page 1 of Concierge Docket.', 194, 286, { align: 'right' });
};

/**
 * 2. LEGALLY BINDING IMPORTATION & SOURCING AGREEMENT (KENYA)
 */
export const buildImportAgreementPage = (doc: jsPDF, invoice: Partial<ImportConciergeInvoice>) => {
  doc.addPage();

  const invNum = invoice.invoiceNumber || `INV-CON-${Date.now().toString().slice(-6)}`;
  const dateStr = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  drawDocumentHeader(doc, 'IMPORT AGREEMENT', invNum, dateStr, 'LEGALLY BINDING');

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('MOTOR VEHICLE SOURCING & DIRECT IMPORTATION SERVICE AGREEMENT', 16, 53);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Pursuant to the Law of Contract Act (Cap 23) and the Sale of Goods Act (Cap 31), Laws of Kenya', 16, 58);

  // Agreement Parties
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, 62, 178, 27, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26);
  doc.text('1. PARTIES TO THIS AGREEMENT:', 20, 68);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('AGENT / SERVICE PROVIDER: MASUMA AFRICA CONCIERGE LTD (PIN: P051234567Z), Commercial Street, Industrial Area, Nairobi.', 20, 74);
  doc.text(`BUYER / IMPORTER OF RECORD: ${invoice.customerName || 'Valued Client'} (Phone: ${invoice.customerPhone || 'N/A'}, Email: ${invoice.customerEmail || 'N/A'})`, 20, 80);
  if (invoice.customerPin || invoice.customerIdNumber) {
    doc.text(`KRA PIN: ${invoice.customerPin || 'N/A'} | National ID/Passport: ${invoice.customerIdNumber || 'N/A'}`, 20, 85);
  }

  // Contract Terms Sections
  let y = 94;
  const writeClause = (title: string, text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 26);
    doc.text(title, 16, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(text, 178);
    doc.text(lines, 16, y);
    y += lines.length * 3.6 + 3.5;
  };

  writeClause(
    '2. APPOINTMENT & SCOPE OF AGENCY:',
    `The Buyer hereby appoints Masuma Africa Concierge Ltd as its exclusive sourcing and logistics agent to inspect, bid, procure, marine-insure, ship, and customs-clear the designated motor vehicle: ${invoice.vehicleMake} ${invoice.vehicleModel} (${invoice.yearOfManufacture || '2018+'}) from certified Japanese (USS, TAA, CAA) or UK auctions, delivering the vehicle in sound roadworthy condition.`
  );

  writeClause(
    '3. TRANSPARENT SOURCING COMMISSION & CASCADING MILESTONES:',
    `Total consideration payable is ${formatKes(invoice.grandTotalKes)}, incorporating the actual vehicle CIF purchase price, mandatory statutory KRA taxes, Mombasa port CFS handling, and Masuma's transparent 3.5% concierge commission (${formatKes(invoice.sourcingCommissionKes)}). Sourcing proceeds via 4 clear milestones: (i) Initial 30% Sourcing Deposit, (ii) CIF & Ocean Freight Settlement within 3 business days of auction win, (iii) Statutory KRA Taxes & CFS Port Clearance prior to vessel berthing, and (iv) Remaining 3.5% balance prior to physical vehicle handover.`
  );

  writeClause(
    '4. STATUTORY STANDARDS & PRE-EXPORT ROADWORTHINESS (KS 1515:2000):',
    'The Agent covenants that the vehicle sourced shall strictly comply with the Kenya Bureau of Standards KS 1515:2000 Code of Practice (Right-hand drive, maximum 8-year age limit, certified pre-shipment inspection by QISJ or JEVIC for roadworthiness, odometer certification, and radioactive decontamination).'
  );

  writeClause(
    '5. TITLE, MARINE CARGO INSURANCE & NTSA TIMS REGISTRATION:',
    'Comprehensive marine cargo insurance shall cover the vehicle throughout ocean transit until vessel offloading at Mombasa Port. Full legal title and ownership registration shall be transferred directly into the Buyer’s name on the National Transport and Safety Authority (NTSA) TIMS/eCitizen portal upon clearance of all KRA customs assessments.'
  );

  writeClause(
    '6. VARIATIONS, DELAYS & GOVERNING LAW:',
    'Any government statutory tariff revisions or port CFS demurrage beyond the Agent\'s control shall be adjusted transparently with prior written customer notification. This Agreement is governed by the Laws of the Republic of Kenya. Any dispute not resolved amicably within 14 days shall be submitted to expedited arbitration under the Nairobi Centre for International Arbitration (NCIA) Act.'
  );

  // Execution & Signature Blocks
  y = Math.max(y + 2, 215);

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(16, y, 86, 52, 2, 2, 'F');
  doc.roundedRect(108, y, 86, 52, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(16, y, 86, 52, 2, 2, 'S');
  doc.roundedRect(108, y, 86, 52, 2, 2, 'S');

  // Agent Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 26, 26);
  doc.text('FOR: MASUMA AFRICA CONCIERGE LTD', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Authorized Signatory: Head of Direct Imports', 20, y + 15);
  doc.text('Signature: ______________________________', 20, y + 25);
  doc.text(`Date: ${dateStr}`, 20, y + 33);
  doc.text('Official Stamp: [ Masuma Certified Import seal ]', 20, y + 41);

  // Buyer Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 26, 26);
  doc.text('FOR: THE BUYER / PRINCIPAL', 112, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Full Name: ${invoice.customerName || 'Valued Client'}`, 112, y + 15);
  doc.text('Signature: ______________________________', 112, y + 25);
  doc.text(`Date: ${dateStr}`, 112, y + 33);
  doc.text('National ID / Passport: ____________________', 112, y + 41);

  // Agreement Footer
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text('Binding legal contract executed in Nairobi, Kenya. Retain a signed copy for NTSA TIMS logbook processing.', 16, 286);
  doc.text('Page 2 of Concierge Docket.', 194, 286, { align: 'right' });
};

/**
 * 3. OFFICIAL VEHICLE RELEASE ORDER & HANDOVER CERTIFICATE
 */
export const buildVehicleReleaseOrderPage = (doc: jsPDF, invoice: Partial<ImportConciergeInvoice>) => {
  doc.addPage();

  const invNum = invoice.invoiceNumber || `INV-CON-${Date.now().toString().slice(-6)}`;
  const releaseNum = `REL-${invNum}`;
  const releaseDate = invoice.releasedAt ? new Date(invoice.releasedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  drawDocumentHeader(doc, 'VEHICLE RELEASE ORDER', releaseNum, releaseDate, 'RELEASED & CLEARED');

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL VEHICLE RELEASE ORDER & HANDOVER CERTIFICATE', 16, 53);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Confirmation of 100% Full Payment Settlement, KRA Customs Clearance, and Customer Vehicle Handover', 16, 58);

  // Settlement Acknowledgment Box (Green theme)
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(16, 62, 178, 25, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(16, 62, 178, 25, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('FINANCIAL SETTLEMENT ACKNOWLEDGMENT: PAID IN FULL', 22, 70);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text(`Total Agreed Landed Vehicle Cost & Sourcing Fee: ${formatKes(invoice.grandTotalKes)} — CLEARED IN FULL`, 22, 76);
  doc.text('Outstanding Balance: KES 0.00 | Payment Receipt Verified via Lipa Na M-Pesa / Bank Wire Confirmation.', 22, 82);

  // Vehicle Specifics Table
  autoTable(doc, {
    startY: 91,
    head: [['Vehicle Specification Parameter', 'Certified Inspection Particulars']],
    body: [
      ['Vehicle Make & Model', `${invoice.vehicleMake} ${invoice.vehicleModel} ${invoice.modelNumber ? `(${invoice.modelNumber})` : ''}`],
      ['Year of Manufacture', `${invoice.yearOfManufacture || 'N/A'} (${getVehicleAge(invoice)} Years Old)`],
      ['Chassis Number / VIN', invoice.chassisNumber || 'Verified against Original Export Certificate'],
      ['Engine Number / Capacity', `${invoice.engineNumber || 'Engine Checked'} • ${invoice.engineSize || 1500} CC`],
      ['Exterior Color', invoice.exteriorColor || 'Metallic / Original Factory Spec'],
      ['Odometer Verification', invoice.mileageKm ? `${invoice.mileageKm.toLocaleString()} KM (Certified)` : 'Certified JEVIC/QISJ Mileage Verified'],
      ['NTSA Registration Mark', invoice.registrationPlate || 'Interim Movement Permit / Registered Plate Issued'],
      ['KRA Customs Simba/ICMS Entry No', invoice.kraEntryNumber || 'Official KRA Customs Clearance Certificate on File'],
      ['Port CFS Release / Delivery Order No', invoice.portReleaseNumber || 'Mombasa CFS Gate Pass Approved'],
      ['Registered Owner on Record', `${invoice.customerName} (${invoice.customerPin || 'KRA PIN Verified'})`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 108 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 165;

  // 8-Point Handover Checklist
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 26, 26);
  doc.text('OFFICIAL HANDOVER CHECKLIST (VERIFIED AT HANDOVER):', 16, finalY + 7);

  const checklist = [
    '[X] Physical bodywork & interior inspection completed satisfactorily without transit damage.',
    '[X] Original Foreign Export Certificate & certified English translation delivered.',
    '[X] Kenya Revenue Authority Customs Assessment & Payment Receipts handed over.',
    '[X] Kenya Bureau of Standards (KEBS) KS 1515:2000 Certificate of Roadworthiness provided.',
    '[X] 2 Original Remote Smart Keys / Alarm Transponders delivered.',
    '[X] Spare Wheel, Emergency Jack, Wheel Spanner, and Standard Warning Triangle inspected.',
    '[X] Masuma Comprehensive Pre-Delivery Inspection (PDI) and Fluid Top-Up completed.',
    '[X] NTSA TIMS / eCitizen electronic transfer of ownership initiated to the Buyer.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  let cy = finalY + 13;
  checklist.forEach((item) => {
    doc.text(item, 18, cy);
    cy += 4.2;
  });

  // Officer & Client Sign-Off Box
  cy += 3;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(16, cy, 86, 44, 2, 2, 'F');
  doc.roundedRect(108, cy, 86, 44, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(16, cy, 86, 44, 2, 2, 'S');
  doc.roundedRect(108, cy, 86, 44, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 26, 26);
  doc.text('RELEASED BY (MASUMA LOGISTICS):', 20, cy + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Officer Name: ${invoice.releasedBy || 'Masuma Handover Lead'}`, 20, cy + 14);
  doc.text('Signature: __________________________', 20, cy + 23);
  doc.text(`Date & Time: ${releaseDate}`, 20, cy + 31);
  doc.text('Security Clearance: GRANTED', 20, cy + 39);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 26, 26);
  doc.text('ACCEPTED & RECEIVED BY BUYER:', 112, cy + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Recipient Name: ${invoice.customerName || 'Valued Client'}`, 112, cy + 14);
  doc.text('Signature: __________________________', 112, cy + 23);
  doc.text(`Date: ${releaseDate}`, 112, cy + 31);
  doc.text('Condition: Received in Good Order & Condition', 112, cy + 39);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text('Official release docket issued by Masuma Vehicle Import Concierge Ltd. Valid with original signatures and stamps.', 16, 286);
  doc.text('Final Page of Concierge Docket.', 194, 286, { align: 'right' });
};

/**
 * Master PDF Generator: Supports Proforma Only, Legal Agreement Only, Release Order Only, or Complete Docket
 */
export const generateConciergeDocument = (
  invoice: Partial<ImportConciergeInvoice>,
  type: 'PROFORMA' | 'AGREEMENT' | 'RELEASE_ORDER' | 'COMPLETE_DOCKET' = 'COMPLETE_DOCKET'
) => {
  const doc = new jsPDF();
  const invNum = invoice.invoiceNumber || `INV-CON-${Date.now().toString().slice(-6)}`;
  const vehName = `${invoice.vehicleMake || 'Vehicle'}_${invoice.vehicleModel || 'Import'}`.replace(/\s+/g, '_');

  if (type === 'PROFORMA') {
    buildProformaInvoicePage(doc, invoice);
    doc.save(`Masuma_Proforma_Invoice_${invNum}_${vehName}.pdf`);
    return;
  }

  if (type === 'AGREEMENT') {
    // Only Agreement: Build on page 1
    const dummyDoc = new jsPDF();
    buildImportAgreementPage(dummyDoc, invoice);
    // Remove blank first page
    dummyDoc.deletePage(1);
    dummyDoc.save(`Masuma_Import_Agreement_${invNum}_${vehName}.pdf`);
    return;
  }

  if (type === 'RELEASE_ORDER') {
    const dummyDoc = new jsPDF();
    buildVehicleReleaseOrderPage(dummyDoc, invoice);
    dummyDoc.deletePage(1);
    dummyDoc.save(`Masuma_Vehicle_Release_Order_${invNum}_${vehName}.pdf`);
    return;
  }

  // COMPLETE DOCKET: Page 1 Proforma, Page 2 Agreement, Page 3 Release (if released)
  buildProformaInvoicePage(doc, invoice);
  buildImportAgreementPage(doc, invoice);

  if (invoice.status === 'RELEASED' || invoice.status === 'COMPLETED' || invoice.status === 'FULLY_PAID') {
    buildVehicleReleaseOrderPage(doc, invoice);
  }

  doc.save(`Masuma_Vehicle_Import_Docket_${invNum}_${vehName}.pdf`);
};
