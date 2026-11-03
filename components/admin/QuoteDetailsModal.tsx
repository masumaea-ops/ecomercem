
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Send, Printer, Save, Plus, Trash2, AlertCircle, Plane, FileText, Loader2, Download } from 'lucide-react';
import { Quote, QuoteStatus } from '../../types';
import { apiClient } from '../../utils/apiClient';
import InvoiceTemplate from './InvoiceTemplate';
import { downloadPDF, printDocument } from '../../utils/pdfGenerator';

interface QuoteDetailsModalProps {
    quote: any; 
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const QuoteDetailsModal: React.FC<QuoteDetailsModalProps> = ({ quote, isOpen, onClose, onUpdate }) => {
    const [items, setItems] = useState<any[]>([]);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Printing
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (quote) {
            setItems(quote.items || []);
            setRecipientEmail(quote.customerEmail || '');
        }
    }, [quote]);

    if (!isOpen || !quote) return null;

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        // Recalc total
        newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        setItems(newItems);
    };

    const calculateGrandTotal = () => {
        return items.reduce((acc, item) => acc + (item.total || 0), 0);
    };

    const handleSendEmail = async () => {
        let emailToSend = recipientEmail?.trim();
        if (!emailToSend || !emailToSend.includes('@')) {
            const entered = prompt('Please enter the customer email address to send the quote and PDF to:', quote.customerEmail || '');
            if (!entered || !entered.includes('@')) {
                alert('A valid email address is required to dispatch the quotation.');
                return;
            }
            emailToSend = entered.trim();
            setRecipientEmail(emailToSend);
        }

        setIsSendingEmail(true);
        try {
            // First save any edited items
            const subtotal = Number(calculateGrandTotal().toFixed(2));
            const tax = Number((subtotal * 0.16).toFixed(2));
            await apiClient.patch(`/quotes/${quote.id}`, {
                items,
                total: Number((subtotal + tax).toFixed(2)),
                email: emailToSend
            });

            // Dispatch detailed quotation email with attached PDF
            const res = await apiClient.post(`/quotes/${quote.id}/send-email`, {
                email: emailToSend
            });

            alert(res.data?.message || `Quote #${quote.quoteNumber} successfully sent to ${emailToSend} with attached PDF!`);
            onUpdate();
            onClose();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to dispatch quotation email');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleSave = async (newStatus?: QuoteStatus) => {
        setIsSaving(true);
        try {
            const subtotal = Number(calculateGrandTotal().toFixed(2));
            const tax = Number((subtotal * 0.16).toFixed(2));
            const payload: any = {
                items: items,
                total: Number((subtotal + tax).toFixed(2))
            };
            if (newStatus) payload.status = newStatus;

            await apiClient.patch(`/quotes/${quote.id}`, payload);
            onUpdate();
            if (newStatus) onClose(); 
        } catch (error) {
            alert('Failed to save quote');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!confirm('Convert this Quote to an Invoice (Order)? This will finalize the items.')) return;
        
        setIsConverting(true);
        try {
            await apiClient.post(`/quotes/${quote.id}/convert`);
            alert('Quote successfully converted to Invoice!');
            onUpdate();
            onClose();
            // Optional: Redirect to OrderManager or open Order
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to convert quote');
        } finally {
            setIsConverting(false);
        }
    };

    const handlePrint = () => {
        if (printRef.current) {
            printDocument(printRef.current, { title: `Quote-${quote.quoteNumber || 'QT'}` });
        } else {
            window.print();
        }
    };

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;
        setIsDownloading(true);
        try {
            await downloadPDF(printRef.current, `Quote-${quote.quoteNumber || 'QT'}.pdf`);
        } finally {
            setIsDownloading(false);
        }
    };

    const isEditable = quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.SENT;
    const grandSubtotal = Number(calculateGrandTotal().toFixed(2));
    const grandTax = Number((grandSubtotal * 0.16).toFixed(2));
    const currentQuoteData = {
        ...quote,
        items,
        total: Number((grandSubtotal + grandTax).toFixed(2))
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Hidden Print Template */}
            <div className="hidden print-force-container">
                <InvoiceTemplate data={currentQuoteData} type="QUOTE" ref={printRef} />
            </div>

            <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up print:hidden">
                {/* Header */}
                <div className="bg-masuma-dark text-white p-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold font-display uppercase tracking-wider">Quote #{quote.quoteNumber}</h2>
                            {quote.type === 'SOURCING' && (
                                <span className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                                    <Plane size={10} className="transform -rotate-45" /> Sourcing Request
                                </span>
                            )}
                            {quote.status === QuoteStatus.CONVERTED && (
                                <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                                    <Check size={10} /> Converted
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm">Created on {quote.date}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {/* Status Banner */}
                    {quote.status === QuoteStatus.DRAFT && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-xs mb-6 flex items-center gap-2">
                            <AlertCircle size={16} />
                            This quote is in DRAFT. You can edit prices before sending to the customer.
                        </div>
                    )}

                    <div className="bg-white p-4 rounded shadow-sm border border-gray-200 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">Customer Information</p>
                                <p className="font-bold text-gray-800 text-sm">{quote.customerName}</p>
                                <p className="text-xs text-gray-500">{quote.customerPhone}</p>
                                <div className="mt-2 flex items-center gap-1.5">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Email:</label>
                                    <input 
                                        type="email" 
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        placeholder="customer@email.com"
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:border-masuma-orange outline-none bg-white text-gray-800 w-52"
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase">Quote Summary</p>
                                <div className="text-xs text-gray-500">
                                    <p>Subtotal: {grandSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p>VAT (16%): {grandTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <p className="font-bold text-masuma-orange text-lg mt-1 tracking-tight">Total: KES {(grandSubtotal + grandTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        
                        {quote.vin && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Vehicle Chassis (VIN)</p>
                                <p className="font-mono text-sm font-bold text-purple-700">{quote.vin}</p>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-4 py-3">Product / Description</th>
                                    <th className="px-4 py-3 w-20 text-center">Qty</th>
                                    <th className="px-4 py-3 w-32 text-right">Unit Price</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3">
                                            <textarea 
                                                value={item.name}
                                                disabled={!isEditable}
                                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                className="w-full p-1 border-b border-transparent focus:border-masuma-orange outline-none disabled:bg-transparent h-auto resize-y"
                                                rows={2}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                             <input 
                                                type="number" 
                                                value={item.quantity}
                                                disabled={!isEditable}
                                                onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                                className="w-full p-1 text-center border border-gray-200 rounded focus:border-masuma-orange outline-none disabled:bg-transparent disabled:border-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                             <input 
                                                type="number" 
                                                value={item.unitPrice}
                                                disabled={!isEditable}
                                                onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                                className="w-full p-1 text-right border border-gray-200 rounded focus:border-masuma-orange outline-none font-mono disabled:bg-transparent disabled:border-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">
                                            {(item.quantity * item.unitPrice).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-200 bg-white flex flex-wrap justify-between items-center gap-3">
                    <div className="flex gap-2">
                        <button 
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="bg-green-600 text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2 shadow-sm"
                        >
                            {isDownloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />} Download PDF Quote
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-bold uppercase text-xs hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Printer size={16} /> Print Quote
                        </button>
                    </div>
                    
                    <div className="flex gap-3">
                        {isEditable && (
                            <button 
                                onClick={() => handleSave()}
                                disabled={isSaving}
                                className="bg-white border border-masuma-dark text-masuma-dark px-4 py-2 rounded font-bold uppercase text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Save size={16} /> Save
                            </button>
                        )}
                        
                        {(quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.ACCEPTED) && (
                             <button 
                                onClick={handleSendEmail}
                                disabled={isSendingEmail || isSaving}
                                className="bg-blue-600 text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-blue-700 flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                                title="Send quote items breakdown with attached PDF via email"
                             >
                                {isSendingEmail ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />}
                                {quote.status === QuoteStatus.DRAFT ? 'Send to Customer (Email & PDF)' : 'Resend Email with PDF'}
                             </button>
                        )}

                        {/* Graduation Flow */}
                        {(quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.ACCEPTED) && (
                             <button 
                                onClick={handleConvertToInvoice}
                                disabled={isConverting}
                                className="bg-green-600 text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2"
                             >
                                {isConverting ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16} />}
                                Convert to Invoice
                             </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteDetailsModal;
