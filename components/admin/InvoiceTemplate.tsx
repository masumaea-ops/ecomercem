import React, { forwardRef, useState, useEffect } from 'react';
import { Sale, Order, Quote } from '../../types';
import { QrCode, Phone, Mail, MapPin, Calendar, ShieldCheck, Car, CheckCircle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface InvoiceTemplateProps {
  data: Sale | Order | Quote;
  type: 'TAX_INVOICE' | 'RECEIPT' | 'WAYBILL' | 'QUOTE';
}

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ data, type }, ref) => {
  // Dynamic Settings State
  const [settings, setSettings] = useState({
      companyName: 'MASUMA AUTOPARTS EAST AFRICA LTD',
      address: 'Ruby Mall, Shop FF25 First Floor Behind NCBA Bank Accra Road, Nairobi',
      phone: '+254 792 506 590',
      email: 'sales@masuma.africa',
      pin: 'P051234567Z',
      paybillNumber: '247247',
      paybillAccount: '0792506590',
      bankName: 'EQUITY BANK LTD',
      bankBranch: 'Karen Branch',
      bankAccountNo: '1250285737086',
      bankAccountName: 'Masuma Autoparts East Africa',
      paymentInstructions: 'Please use Quote / Order Number as payment reference.'
  });

  useEffect(() => {
      const loadSettings = async () => {
          const cached = localStorage.getItem('masuma_settings_cache');
          if (cached) {
              try {
                  updateState(JSON.parse(cached));
              } catch (e) {
                  // ignore
              }
          }
          try {
              const res = await apiClient.get('/settings');
              localStorage.setItem('masuma_settings_cache', JSON.stringify(res.data));
              updateState(res.data);
          } catch (e) {
              // Fail silently to defaults
          }
      };
      loadSettings();
  }, []);

  const updateState = (d: any) => {
      setSettings({
          companyName: d.COMPANY_NAME || 'MASUMA AUTOPARTS EAST AFRICA LTD',
          address: d.BRANCH_ADDRESS || d.CMS_CONTACT_ADDRESS || 'Ruby Mall, Shop FF25 First Floor Behind NCBA Bank Accra Road, Nairobi',
          phone: d.BRANCH_PHONE || d.CMS_CONTACT_PHONE || '+254 792 506 590',
          email: d.SUPPORT_EMAIL || d.CMS_CONTACT_EMAIL || 'sales@masuma.africa',
          pin: d.KRA_PIN || 'P051234567Z',
          paybillNumber: d.PAYMENT_PAYBILL_NUMBER || '247247',
          paybillAccount: d.PAYMENT_PAYBILL_ACCOUNT || '0792506590',
          bankName: d.PAYMENT_BANK_NAME || 'EQUITY BANK LTD',
          bankBranch: d.PAYMENT_BANK_BRANCH || 'Karen Branch',
          bankAccountNo: d.PAYMENT_BANK_ACCOUNT_NO || '1250285737086',
          bankAccountName: d.PAYMENT_BANK_ACCOUNT_NAME || 'Masuma Autoparts East Africa',
          paymentInstructions: d.PAYMENT_INSTRUCTIONS || 'Please use Quote / Order Number as payment reference.'
      });
  };

  const isSale = (d: any): d is Sale => 'receiptNumber' in d;
  const isQuote = (d: any): d is Quote => 'quoteNumber' in d;
  
  let docNumber = '';
  let date: any = '';
  let customer = 'Walk-in Customer';
  let customerPhone = '';
  let customerEmail = '';
  let shippingAddress = '';
  let items: any[] = [];
  let total = 0;
  let discount = 0;
  let vin = '';
  let paymentMethod = '';
  let paymentStatus = '';
  let kraControlCode = '';
  let amountPaid = 0;
  let balanceDue = 0;

  if (isSale(data)) {
      docNumber = data.receiptNumber || 'REC';
      date = data.createdAt || data.date;
      customer = data.customerName || 'Walk-in Customer';
      customerPhone = data.customerPhone || '';
      items = (data as any).itemsSnapshot || [];
      total = Number(data.totalAmount || 0);
      discount = Number(data.discount || 0);
      paymentMethod = data.paymentMethod || 'CASH';
      kraControlCode = data.kraControlCode || '';
  } else if (isQuote(data)) {
      docNumber = data.quoteNumber || 'QT';
      date = data.date || (data as any).createdAt;
      customer = data.customerName || 'Valued Customer';
      customerPhone = data.customerPhone || '';
      customerEmail = data.customerEmail || '';
      vin = data.vin || '';
      items = data.items || [];
      total = Number(data.total || 0);
      paymentStatus = data.status || '';
  } else {
      // Order
      docNumber = data.orderNumber || 'ORD';
      date = data.date || (data as any).createdAt;
      customer = data.customerName || 'Customer';
      customerPhone = data.customerPhone || '';
      customerEmail = data.customerEmail || '';
      shippingAddress = data.shippingAddress || '';
      items = data.items || [];
      total = Number(data.total || (data as any).totalAmount || 0);
      paymentMethod = data.paymentMethod || '';
      paymentStatus = data.status || '';
      amountPaid = Number((data as any).amountPaid || 0);
      balanceDue = (data as any).balance !== undefined ? Number((data as any).balance) : Math.max(0, total - amountPaid);
  }

  // Calculate items sum
  const itemSum = items.reduce((acc: number, item: any) => {
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || item.unitPrice || 0);
      const itemTotal = item.total ? Number(item.total) : qty * price;
      return acc + itemTotal;
  }, 0);
  
  // Clean financial totals without double VAT inflation
  let finalTotal = 0;
  let net = 0;
  let tax = 0;

  if (total > 0) {
      finalTotal = parseFloat(Number(total).toFixed(2));
      net = parseFloat((finalTotal / 1.16).toFixed(2));
      tax = parseFloat((finalTotal - net).toFixed(2));
  } else {
      net = parseFloat(Math.max(0, itemSum - discount).toFixed(2));
      tax = parseFloat((net * 0.16).toFixed(2));
      finalTotal = parseFloat((net + tax).toFixed(2));
  }

  // Format Dates
  const formattedDate = date 
    ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const validUntilDate = date
    ? new Date(new Date(date).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getTitle = () => {
      switch(type) {
          case 'TAX_INVOICE': return 'TAX INVOICE';
          case 'RECEIPT': return 'OFFICIAL RECEIPT';
          case 'WAYBILL': return 'WAYBILL / DELIVERY NOTE';
          case 'QUOTE': return vin ? 'SOURCING PROFORMA QUOTE' : 'PROFORMA QUOTATION';
          default: return 'DOCUMENT';
      }
  };

  // --- 80mm THERMAL RECEIPT LAYOUT ---
  if (type === 'RECEIPT') {
      return (
        <div ref={ref} className="bg-white text-black font-mono text-[11px] w-[76mm] p-2 mx-auto leading-tight shadow-none print:w-full print:shadow-none thermal-receipt">
            <div className="text-center mb-2">
                <h1 className="font-bold text-xs uppercase mb-0.5">{settings.companyName}</h1>
                <p className="text-[9px]">{settings.address}</p>
                <p className="text-[9px]">Tel: {settings.phone}</p>
                <p className="text-[9px]">PIN: {settings.pin} | VAT: 0123456V</p>
            </div>

            <div className="border-b border-dashed border-black my-1.5"></div>

            <div className="flex justify-between text-[10px] mb-0.5">
                <span>Receipt No:</span>
                <span className="font-bold">{docNumber}</span>
            </div>
            <div className="flex justify-between text-[10px] mb-0.5">
                <span>Date:</span>
                <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between text-[10px] mb-0.5">
                <span>Customer:</span>
                <span className="font-bold max-w-[140px] truncate text-right">{customer}</span>
            </div>
            {customerPhone && (
                <div className="flex justify-between text-[10px] mb-0.5">
                    <span>Phone:</span>
                    <span>{customerPhone}</span>
                </div>
            )}
            {paymentMethod && (
                <div className="flex justify-between text-[10px] mb-0.5">
                    <span>Payment:</span>
                    <span className="font-bold">{paymentMethod}</span>
                </div>
            )}

            <div className="border-b border-dashed border-black my-1.5"></div>

            <div className="mb-2">
                <div className="flex font-bold text-[10px] mb-1 border-b border-black pb-0.5">
                    <span className="flex-1">Item</span>
                    <span className="w-8 text-center">Qty</span>
                    <span className="w-14 text-right">Total</span>
                </div>
                {items.map((item: any, idx: number) => {
                    const q = Number(item.qty || item.quantity || 1);
                    const p = Number(item.price || item.unitPrice || 0);
                    const lTot = item.total ? Number(item.total) : q * p;
                    return (
                        <div key={idx} className="text-[10px] mb-1.5">
                            <div className="flex justify-between">
                                <span className="flex-1 font-bold leading-tight pr-1">{item.name}</span>
                                <span className="w-8 text-center">{q}</span>
                                <span className="w-14 text-right font-bold">{lTot.toLocaleString()}</span>
                            </div>
                            {(item.sku || item.productId || item.oem) && (
                                <div className="text-[9px] text-gray-600 pl-0.5">
                                    {item.sku || item.productId ? `SKU: ${item.sku || item.productId}` : ''} {item.oem ? `| OEM: ${item.oem}` : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="border-b border-dashed border-black my-1.5"></div>

            <div className="space-y-1 text-[10px]">
                {discount > 0 && (
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{itemSum.toLocaleString()}</span>
                    </div>
                )}
                {discount > 0 && (
                    <div className="flex justify-between font-bold text-red-600">
                        <span>Discount:</span>
                        <span>-{discount.toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Net Amount:</span>
                    <span>KES {net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between">
                    <span>VAT (16%):</span>
                    <span>KES {tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between font-bold text-xs mt-1 pt-1 border-t border-black">
                    <span>TOTAL:</span>
                    <span>KES {finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                {amountPaid > 0 && (
                    <div className="flex justify-between font-bold text-[10px] text-gray-800">
                        <span>AMOUNT PAID:</span>
                        <span>KES {amountPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                )}
                {amountPaid > 0 && (
                    <div className="flex justify-between font-bold text-[10px]">
                        <span>BALANCE DUE:</span>
                        <span>KES {balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                )}
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="text-[9px] text-center space-y-0.5 my-1.5 leading-tight">
                <p className="font-bold uppercase text-[9px]">Orders & Payments To:</p>
                <p>PAYBILL: <span className="font-bold">{settings.paybillNumber}</span> &nbsp;|&nbsp; ACC: <span className="font-bold">{settings.paybillAccount}</span></p>
                <p>BANK: <span className="font-bold">{settings.bankName}</span> ({settings.bankBranch})</p>
                <p>A/C NO: <span className="font-bold">{settings.bankAccountNo}</span></p>
                <p className="text-[8px] text-gray-600">{settings.bankAccountName}</p>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="text-center text-[10px] space-y-1">
                {kraControlCode && (
                    <>
                        <p className="font-bold">KRA Control: {kraControlCode}</p>
                        <div className="flex justify-center my-1.5">
                            <QrCode size={56} className="text-black" />
                        </div>
                    </>
                )}
                <p className="uppercase font-bold text-[10px]">Thank You For Choosing Masuma!</p>
                <p className="text-[9px]">Genuine Japanese Quality Parts • 12-Mo Warranty</p>
                <p className="text-[8px] text-gray-500 mt-1">Official Portal: masuma.africa</p>
            </div>
        </div>
      );
  }

  // --- A4 STANDARD LAYOUT (Clean, Multi-Page, No Overflow Cutoff) ---
  return (
    <div 
      ref={ref} 
      className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto p-6 md:p-8 min-h-0 flex flex-col justify-start relative shadow-lg print:shadow-none print:w-full print:max-w-none print:p-0 print:m-0 print:border-none print:min-h-0"
    >
      {/* Header Block */}
      <div className="header-block flex justify-between items-start border-b-4 border-masuma-orange pb-5 mb-6 print-break-avoid">
        <div className="max-w-[62%]">
            <h1 className="text-2xl md:text-3xl font-extrabold text-masuma-dark tracking-tight mb-1 font-display uppercase">
                {settings.companyName}
            </h1>
            <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={12} className="text-masuma-orange" />
                Official Distributor of Masuma Japan in Kenya
            </div>
            <div className="text-xs space-y-1 text-gray-600">
                <p className="flex items-start gap-1.5">
                    <MapPin size={12} className="text-masuma-orange mt-0.5 shrink-0"/> 
                    <span className="leading-tight">{settings.address}</span>
                </p>
                <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-masuma-orange shrink-0"/> 
                    <span>{settings.email}</span>
                    <span className="text-gray-300">|</span>
                    <Phone size={12} className="text-masuma-orange shrink-0"/> 
                    <span>{settings.phone}</span>
                </p>
                <p className="pt-0.5 font-bold text-gray-800 text-[11px]">
                    KRA PIN: <span className="font-mono">{settings.pin}</span> | VAT Registration: <span className="font-mono">0123456V</span>
                </p>
            </div>
        </div>

        <div className="text-right flex flex-col items-end">
            <h2 className="text-xl md:text-2xl font-black text-masuma-orange uppercase tracking-wider">
                {getTitle()}
            </h2>
            <div className="mt-3 bg-gray-50 border border-gray-200 p-2.5 rounded text-right min-w-[170px]">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Document No.</p>
                <p className="text-base md:text-lg font-black text-masuma-dark font-mono tracking-tight">{docNumber}</p>
                
                <div className="mt-1 pt-1 border-t border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Date Issued</p>
                    <p className="text-xs font-bold text-gray-800">{formattedDate}</p>
                </div>

                {type === 'QUOTE' && (
                    <div className="mt-1 pt-1 border-t border-gray-200">
                        <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider">Valid Until</p>
                        <p className="text-xs font-bold text-orange-700">{validUntilDate}</p>
                    </div>
                )}

                {paymentStatus && type !== 'QUOTE' && (
                    <div className="mt-1 pt-1 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Payment Status</p>
                        <p className="text-xs font-bold text-green-700 uppercase">{paymentStatus}</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Customer & Shipping / Vehicle Info Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print-break-avoid">
        {/* Billed To Box */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-xs font-bold text-masuma-orange uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {type === 'QUOTE' ? 'Quotation Prepared For' : 'Billed To'}
            </h3>
            <p className="font-bold text-base text-gray-900 leading-tight">{customer}</p>
            {customerPhone && (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400 shrink-0"/> {customerPhone}
                </p>
            )}
            {customerEmail && (
                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400 shrink-0"/> {customerEmail}
                </p>
            )}
            {shippingAddress && (
                <p className="text-xs text-gray-600 mt-1 flex items-start gap-1.5">
                    <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5"/> 
                    <span>{shippingAddress}</span>
                </p>
            )}
        </div>

        {/* Right Info Box: Vehicle VIN or Shipping Destination */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200 flex flex-col justify-between">
            {type === 'QUOTE' && vin ? (
                <div>
                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Car size={14} className="text-purple-600" /> Vehicle Identification (VIN / Chassis)
                    </h3>
                    <div className="bg-white p-2 rounded border border-purple-200 inline-block font-mono font-bold text-sm text-purple-900 tracking-wider">
                        {vin}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-normal">
                        Parts specified are OEM-matched to this exact vehicle chassis number.
                    </p>
                </div>
            ) : type === 'WAYBILL' ? (
                <div>
                    <h3 className="text-xs font-bold text-masuma-orange uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MapPin size={14} className="text-masuma-orange" /> Delivery Destination / Waybill
                    </h3>
                    <p className="font-bold text-sm text-gray-900">{shippingAddress || 'Nairobi Region / Branch Delivery'}</p>
                    <p className="text-xs text-gray-500 mt-1">Recipient: {customer} ({customerPhone})</p>
                </div>
            ) : (
                <div>
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                        Order & Dispatch Details
                    </h3>
                    <div className="text-xs text-gray-600 space-y-1">
                        {paymentMethod && <p><span className="font-semibold text-gray-800">Payment Method:</span> {paymentMethod}</p>}
                        {amountPaid > 0 && <p><span className="font-semibold text-gray-800">Amount Paid:</span> KES {amountPaid.toLocaleString()}</p>}
                        {balanceDue > 0 ? (
                            <p><span className="font-semibold text-gray-800">Balance Due:</span> <strong className="text-masuma-orange">KES {balanceDue.toLocaleString()}</strong></p>
                        ) : amountPaid > 0 ? (
                            <p><span className="font-semibold text-green-700 uppercase">Paid in Full</span></p>
                        ) : null}
                        {shippingAddress && <p><span className="font-semibold text-gray-800">Delivery Address:</span> {shippingAddress}</p>}
                        <p><span className="font-semibold text-gray-800">Dispatch Location:</span> Main Warehouse, Nairobi</p>
                    </div>
                </div>
            )}

            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                <span>Currency: <strong>KES (Kenyan Shillings)</strong></span>
                <span>Tax Status: <strong>16% VAT Inclusive</strong></span>
            </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6 overflow-hidden rounded border border-gray-200">
        <table className="w-full text-left border-collapse table-auto">
            <thead>
                <tr className="bg-masuma-dark text-white text-[11px] uppercase tracking-wider">
                    <th className="p-2.5 w-10 text-center font-bold">#</th>
                    <th className="p-2.5 font-bold">Description & Part Identification</th>
                    <th className="p-2.5 text-center w-16 font-bold">Qty</th>
                    {type !== 'WAYBILL' && (
                        <>
                            <th className="p-2.5 text-right w-28 font-bold">Unit Price</th>
                            <th className="p-2.5 text-right w-32 font-bold">Amount (KES)</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody className="text-xs text-gray-800 divide-y divide-gray-200">
                {items.length === 0 ? (
                    <tr>
                        <td colSpan={type === 'WAYBILL' ? 3 : 5} className="p-6 text-center text-gray-400 italic">
                            No line items recorded.
                        </td>
                    </tr>
                ) : (
                    items.map((item: any, idx: number) => {
                        const qty = Number(item.qty || item.quantity || 1);
                        const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
                        const lineTotal = item.total ? Number(item.total) : qty * unitPrice;
                        const sku = item.sku || item.productId || '';
                        const oem = item.oem || '';

                        return (
                            <tr key={idx} className="print-break-avoid hover:bg-gray-50/50">
                                <td className="p-2.5 text-center font-mono text-gray-400 align-top">{idx + 1}</td>
                                <td className="p-2.5 align-top">
                                    <span className="font-bold text-gray-900 block leading-snug">{item.name}</span>
                                    {(sku || oem) && (
                                        <div className="text-[11px] font-mono text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                            {sku && <span>SKU: <strong className="text-gray-700">{sku}</strong></span>}
                                            {oem && <span>OEM: <strong className="text-gray-700">{oem}</strong></span>}
                                        </div>
                                    )}
                                </td>
                                <td className="p-2.5 text-center font-bold text-gray-900 align-top">{qty}</td>
                                {type !== 'WAYBILL' && (
                                    <>
                                        <td className="p-2.5 text-right font-mono text-gray-700 align-top">
                                            {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-gray-900 align-top">
                                            {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
      </div>

      {/* Calculation Summary & Payment Instructions */}
      {type !== 'WAYBILL' && (
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 print-break-avoid totals-block">
              {/* Payment Details Box */}
              <div className="w-full md:w-7/12 bg-gray-50 border border-gray-200 rounded p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                      <h4 className="font-bold text-xs uppercase text-masuma-dark tracking-wider">
                          Orders & Payment Details
                      </h4>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase">Official Accounts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* M-PESA Box */}
                      <div className="bg-white p-2.5 rounded border border-gray-200">
                          <p className="text-[10px] font-bold uppercase text-green-700 tracking-wider">M-PESA PAYBILL</p>
                          <p className="text-gray-700 mt-0.5">PAYBILL: <strong className="font-mono text-gray-900 text-xs">{settings.paybillNumber}</strong></p>
                          <p className="text-gray-700">ACC: <strong className="font-mono text-gray-900 text-xs">{settings.paybillAccount}</strong></p>
                      </div>
                      {/* Bank Details */}
                      <div className="bg-white p-2.5 rounded border border-gray-200">
                          <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">BANK TRANSFER</p>
                          <p className="text-gray-800 mt-0.5 font-bold text-xs truncate" title={settings.bankName}>BANK: {settings.bankName}</p>
                          <p className="text-gray-600 text-[11px]">Branch: {settings.bankBranch}</p>
                          <p className="text-gray-700">Account No: <strong className="font-mono text-gray-900 text-xs">{settings.bankAccountNo}</strong></p>
                          <p className="text-gray-600 text-[10px] truncate" title={settings.bankAccountName}>Account Name: {settings.bankAccountName}</p>
                      </div>
                  </div>
                  {settings.paymentInstructions && (
                      <p className="text-[10px] text-gray-500 italic pt-0.5">
                          {settings.paymentInstructions}
                      </p>
                  )}
              </div>

              {/* Totals Summary */}
              <div className="w-full md:w-5/12 space-y-1.5 bg-gray-50 p-3.5 rounded border border-gray-200">
                  {discount > 0 && (
                      <div className="flex justify-between text-xs text-gray-600 border-b border-gray-200 pb-1.5">
                          <span>Gross Subtotal</span>
                          <span className="font-mono">KES {itemSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                  )}
                  {discount > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-bold border-b border-gray-200 pb-1.5">
                          <span>Promotional Discount</span>
                          <span className="font-mono">-KES {discount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-600 border-b border-gray-200 pb-1.5">
                      <span>Net Taxable (Excl. 16% VAT)</span>
                      <span className="font-mono">KES {net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 border-b border-gray-200 pb-1.5">
                      <span>VAT (16%)</span>
                      <span className="font-mono">KES {tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-masuma-dark pt-1">
                      <span>Total Amount Payable</span>
                      <span className="text-masuma-orange font-mono">KES {finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  {amountPaid > 0 && (
                      <div className="flex justify-between text-xs text-green-700 font-bold border-t border-gray-200 pt-1.5">
                          <span>Amount Paid to Date</span>
                          <span className="font-mono">KES {amountPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                  )}
                  {amountPaid > 0 && (
                      <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                          <span>Remaining Balance</span>
                          <span className={`font-mono ${balanceDue <= 0 ? 'text-green-600' : 'text-masuma-orange'}`}>
                              KES {balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              {balanceDue <= 0 ? ' (PAID IN FULL)' : ''}
                          </span>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Footer & Signature Section */}
      <div className="mt-4 pt-4 border-t-2 border-gray-200 print-break-avoid signature-block">
          <div className="grid grid-cols-2 gap-8 mb-4">
              <div>
                  {type === 'QUOTE' ? (
                      <div className="space-y-1 text-[11px] text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                          <h4 className="font-bold uppercase text-[10px] text-masuma-dark tracking-wider mb-1 flex items-center gap-1">
                              <ShieldCheck size={12} className="text-masuma-orange" /> Quotation Terms & Quality Guarantee
                          </h4>
                          <p>1. Quotation is valid for 14 calendar days from date of issue.</p>
                          <p>2. Prices are in KES and inclusive of 16% Kenya VAT.</p>
                          <p>3. 100% Genuine Masuma Japan auto parts with 12-month manufacturer warranty.</p>
                          <p>4. Delivery available countrywide via courier or pickup at Ruby Mall, Accra Rd.</p>
                      </div>
                  ) : (
                      <div>
                          <h4 className="font-bold text-xs uppercase text-masuma-dark mb-1.5">KRA ETR Fiscal Details</h4>
                          <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded border border-gray-200">
                              <QrCode size={48} className="text-black shrink-0" />
                              <div className="text-[10px] text-gray-600 space-y-0.5">
                                  <p><span className="font-semibold text-gray-800">Control Code:</span> {kraControlCode || (docNumber ? `KRA-${docNumber}` : 'VERIFIED')}</p>
                                  <p><span className="font-semibold text-gray-800">Device ID:</span> KRA-VSCU-001</p>
                                  <p><span className="font-semibold text-gray-800">Date/Time:</span> {formattedDate} {new Date().toLocaleTimeString()}</p>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
              <div className="text-right flex flex-col justify-end">
                  <h4 className="font-bold text-xs uppercase text-masuma-dark mb-1">
                      {type === 'QUOTE' ? 'Prepared & Authorized By' : 'Authorized Signature & Stamp'}
                  </h4>
                  <div className="h-10 border-b border-gray-400 mb-1.5 w-48 ml-auto"></div>
                  <p className="text-[11px] text-gray-600 font-medium">For {settings.companyName}</p>
                  <p className="text-[10px] text-gray-400">Official Distributor • Kenya</p>
              </div>
          </div>
          <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100 flex items-center justify-between">
              <span>Masuma ERP Document Management</span>
              <span>www.masuma.africa • +254 792 506 590</span>
              <span>Printed on {new Date().toLocaleDateString()}</span>
          </div>
      </div>
    </div>
  );
});

export default InvoiceTemplate;
