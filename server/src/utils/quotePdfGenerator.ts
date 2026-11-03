import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export interface QuotePdfData {
    quoteNumber: string;
    date?: string | Date;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    type?: string;
    vin?: string;
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total?: number;
    }>;
    subtotal?: number;
    tax?: number;
    total: number;
    paymentDetails?: {
        paybillNumber?: string;
        paybillAccount?: string;
        bankName?: string;
        bankBranch?: string;
        bankAccountNo?: string;
        bankAccountName?: string;
        instructions?: string;
    };
}

export function generateQuotePdfBuffer(data: QuotePdfData): Buffer {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor: [number, number, number] = [26, 26, 26]; // #1A1A1A (Masuma Dark)
    const orangeColor: [number, number, number] = [224, 98, 27]; // #E0621B (Masuma Orange)
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightGray: [number, number, number] = [245, 245, 245];

    // --- Header Top Bar ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 5, 'F');

    // --- Company Title & Contact Info ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('MASUMA AUTOPARTS EAST AFRICA LTD', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...orangeColor);
    doc.text('GENUINE JAPANESE SPARE PARTS • 12-MONTH WARRANTY', 14, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...grayColor);
    doc.text('Ruby Mall, Shop FF25 First Floor, Accra Road, Nairobi, Kenya', 14, 28);
    doc.text('Tel: +254 792 506 590  |  Email: sales@masuma.africa  |  Web: www.masuma.africa', 14, 33);
    doc.text('PIN: P051234567Z  |  VAT Reg: 0123456V', 14, 38);

    // --- Document Meta Box (Top Right) ---
    const isSourcing = data.type === 'SOURCING' || !!data.vin;
    const docTitle = isSourcing ? 'SOURCING PROFORMA' : 'PROFORMA QUOTATION';

    doc.setFillColor(...lightGray);
    doc.roundedRect(130, 12, 66, 30, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(docTitle, 134, 19);

    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text('Quote No:', 134, 25);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text(data.quoteNumber || 'QT-DRAFT', 155, 25);

    const issueDate = data.date ? new Date(data.date) : new Date();
    const formattedIssueDate = issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const expiryDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const formattedExpiryDate = expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Date:', 134, 31);
    doc.text(formattedIssueDate, 155, 31);

    doc.text('Valid Until:', 134, 37);
    doc.text(formattedExpiryDate, 155, 37);

    // --- Customer Details & VIN Info Box ---
    let currentY = 46;

    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, currentY, 182, data.vin ? 26 : 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('QUOTATION PREPARED FOR:', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(`Customer Name: ${data.customerName || 'Valued Customer'}`, 18, currentY + 12);
    
    const contactParts: string[] = [];
    if (data.customerPhone) contactParts.push(`Phone: ${data.customerPhone}`);
    if (data.customerEmail) contactParts.push(`Email: ${data.customerEmail}`);
    doc.text(contactParts.join('   |   ') || 'Contact: Upon request', 18, currentY + 17);

    if (data.vin) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(112, 26, 179); // Purple
        doc.text(`Vehicle Chassis (VIN): ${data.vin}`, 18, currentY + 23);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...grayColor);
        doc.text('(Parts specified are exact OEM matches for this vehicle chassis)', 90, currentY + 23);
        currentY += 32;
    } else {
        currentY += 26;
    }

    // --- Items Table via autoTable ---
    const tableBody = (data.items || []).map((item, index) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        const total = item.total !== undefined ? Number(item.total) : qty * price;
        return [
            String(index + 1),
            item.name,
            String(qty),
            price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ];
    });

    (doc as any).autoTable({
        startY: currentY,
        head: [['#', 'Part Description / Specification', 'Qty', 'Unit Price (KES)', 'Total (KES)']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 92 },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 32, halign: 'right', font: 'courier' },
            4: { cellWidth: 32, halign: 'right', font: 'courier', fontStyle: 'bold' }
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            lineColor: [225, 225, 225],
            lineWidth: 0.2
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },
        margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // --- Financial Summary Box ---
    const itemsTotal = (data.items || []).reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)), 0);
    const calculatedSubtotal = data.subtotal !== undefined ? Number(data.subtotal) : parseFloat((itemsTotal / 1.16).toFixed(2));
    const calculatedTax = data.tax !== undefined ? Number(data.tax) : parseFloat((itemsTotal - calculatedSubtotal).toFixed(2));
    const grandTotal = data.total !== undefined ? Number(data.total) : itemsTotal;

    const summaryX = 116;
    const summaryWidth = 80;

    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(215, 215, 215);
    doc.roundedRect(summaryX, finalY, summaryWidth, 32, 1.5, 1.5, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Subtotal (Net Excl. VAT):', summaryX + 4, finalY + 7);
    doc.setFont('courier', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`KES ${calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, finalY + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Kenya VAT (16%):', summaryX + 4, finalY + 15);
    doc.setFont('courier', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`KES ${calculatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, finalY + 15, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(summaryX + 3, finalY + 19, summaryX + summaryWidth - 3, finalY + 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text('Grand Total:', summaryX + 4, finalY + 26);
    doc.setFont('courier', 'bold');
    doc.setTextColor(...orangeColor);
    doc.text(`KES ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryX + summaryWidth - 4, finalY + 26, { align: 'right' });

    // --- Payment & Banking Instructions (Left Box) ---
    const paybill = data.paymentDetails?.paybillNumber || '247247';
    const paybillAcc = data.paymentDetails?.paybillAccount || '0792506590';
    const bankName = data.paymentDetails?.bankName || 'EQUITY BANK LTD';
    const bankBranch = data.paymentDetails?.bankBranch || 'Karen Branch';
    const bankAccNo = data.paymentDetails?.bankAccountNo || '1250285737086';
    const bankAccName = data.paymentDetails?.bankAccountName || 'Masuma Autoparts East Africa';

    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(14, finalY, 96, 32, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...orangeColor);
    doc.text('PAYMENT & BANKING DETAILS', 18, finalY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`• M-PESA Paybill: ${paybill}   |   Account: ${paybillAcc}`, 18, finalY + 11.5);
    doc.text(`• Bank: ${bankName} (${bankBranch})`, 18, finalY + 17);
    doc.text(`• A/C No: ${bankAccNo}   |   ${bankAccName}`, 18, finalY + 22.5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`• Use Quote #${data.quoteNumber} as your payment reference`, 18, finalY + 28);

    // --- Terms & Quality Guarantee ---
    const termsY = finalY + 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('TERMS & CONDITIONS', 14, termsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...grayColor);
    doc.text('1. This quotation is valid for 14 calendar days from date of issue.', 14, termsY + 5);
    doc.text('2. All prices are in Kenya Shillings (KES) and include 16% Value Added Tax (VAT).', 14, termsY + 10);
    doc.text('3. Guaranteed 100% Genuine Masuma Japan parts with 12-Month unlimited mileage warranty.', 14, termsY + 15);
    doc.text('4. Dispatch available countrywide via courier or pickup at Ruby Mall Accra Road, Nairobi.', 14, termsY + 20);

    // --- Stamp / Signature Box ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('AUTHORIZED SIGNATURE & STAMP', 130, termsY);
    
    doc.setDrawColor(180, 180, 180);
    doc.line(130, termsY + 16, 196, termsY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...grayColor);
    doc.text('For Masuma Autoparts East Africa Ltd', 130, termsY + 20);

    // --- Footer Band ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 287, 210, 10, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 220, 220);
    doc.text('Masuma Autoparts East Africa Ltd • Ruby Mall, Accra Rd, Nairobi • www.masuma.africa • +254 792 506 590', 105, 293, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
}
