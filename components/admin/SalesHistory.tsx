
import React, { useState, useRef, useEffect } from 'react';
import { Search, Eye, Printer, FileText, Filter, Download, Loader2, ChevronLeft, ChevronRight, X, Receipt } from 'lucide-react';
import { Sale } from '../../types';
import InvoiceTemplate from './InvoiceTemplate';
import { apiClient } from '../../utils/apiClient';
import { downloadPDF, printDocument } from '../../utils/pdfGenerator';

const SalesHistory: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Print & View State
    const [printSale, setPrintSale] = useState<Sale | null>(null);
    const [printType, setPrintType] = useState<'TAX_INVOICE' | 'RECEIPT'>('TAX_INVOICE');
    const [viewSale, setViewSale] = useState<Sale | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    const fetchSales = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', pagination.limit.toString());
            if (searchTerm) params.append('search', searchTerm);
            if (filterDate) params.append('date', filterDate);

            const response = await apiClient.get(`/sales?${params.toString()}`);
            
            if (response.data.data) {
                setSales(response.data.data);
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch sales", error);
            setSales([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => fetchSales(1), 500);
        return () => clearTimeout(delay);
    }, [searchTerm, filterDate]);

    const handlePrint = (sale: Sale, type: 'TAX_INVOICE' | 'RECEIPT' = 'TAX_INVOICE') => {
        setPrintSale(sale);
        setPrintType(type);
        setTimeout(() => {
            if (printRef.current) {
                printDocument(printRef.current, { isReceipt: type === 'RECEIPT', title: `${type === 'RECEIPT' ? 'Receipt' : 'Invoice'}-${sale.receiptNumber || 'MASUMA'}` });
            } else {
                window.print();
            }
        }, 150);
    };

    const handleDownload = async (sale: Sale, type: 'TAX_INVOICE' | 'RECEIPT' = 'TAX_INVOICE') => {
        setIsDownloading(true);
        setPrintSale(sale);
        setPrintType(type);
        setTimeout(async () => {
            if (printRef.current) {
                const filename = `${type === 'RECEIPT' ? 'Receipt' : 'Invoice'}-${sale.receiptNumber || 'MASUMA'}.pdf`;
                await downloadPDF(printRef.current, filename);
            }
            setIsDownloading(false);
        }, 300);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchSales(newPage);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Hidden Print / PDF Template */}
            {printSale && (
                <div className="hidden print-force-container">
                    <InvoiceTemplate data={printSale} type={printType} ref={printRef} />
                </div>
            )}

            {/* View Modal - Z-Index 110 */}
            {viewSale && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewSale(null)}>
                    <div className="bg-white h-[90vh] w-full max-w-4xl overflow-hidden rounded shadow-2xl flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                            <h3 className="font-bold text-lg text-masuma-dark uppercase">Invoice & Receipt View</h3>
                            <button onClick={() => setViewSale(null)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center">
                             <div className="w-full max-w-[210mm]" ref={pdfContainerRef}>
                                <InvoiceTemplate data={viewSale} type="TAX_INVOICE" />
                             </div>
                        </div>
                        <div className="p-4 border-t bg-white flex flex-wrap justify-between items-center gap-3">
                            <button onClick={() => handlePrint(viewSale, 'RECEIPT')} className="px-4 py-2 border border-gray-300 rounded font-bold uppercase text-xs hover:bg-gray-50 flex items-center gap-2">
                                <Receipt size={16}/> Thermal (80mm)
                            </button>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDownload(viewSale, 'TAX_INVOICE')} 
                                    disabled={isDownloading}
                                    className="px-5 py-2 bg-green-600 text-white rounded font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2 shadow-sm"
                                >
                                    {isDownloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>} Download PDF
                                </button>
                                <button onClick={() => handlePrint(viewSale, 'TAX_INVOICE')} className="px-5 py-2 bg-masuma-dark text-white rounded font-bold uppercase text-xs hover:bg-masuma-orange flex items-center gap-2">
                                    <Printer size={16}/> Print A4 Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Sales History</h2>
                    <p className="text-sm text-gray-500">Audit trail of all POS transactions.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden print:hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-masuma-orange bg-white" 
                            placeholder="Search Receipt # or Customer..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <div className="flex items-center gap-2 w-full md:w-auto">
                         <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-2">
                             <Filter size={16} className="text-gray-400" />
                             <input 
                                type="date" 
                                className="text-sm text-gray-600 outline-none" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                             />
                         </div>
                         {filterDate && (
                            <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:underline">Clear</button>
                         )}
                     </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4">Receipt #</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Items</th>
                                    <th className="px-6 py-4">Total (KES)</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4">KRA Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setViewSale(sale)}>
                                        <td className="px-6 py-4 font-mono font-bold text-masuma-dark">{sale.receiptNumber}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(sale.createdAt || sale.date).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {sale.customerName ? (
                                                <span className="font-bold text-gray-800">{sale.customerName}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Walk-in</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{sale.itemsCount || (sale.itemsSnapshot?.length || 0)}</td>
                                        <td className="px-6 py-4 font-bold text-masuma-dark">{Number(sale.totalAmount).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                                sale.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 
                                                sale.paymentMethod === 'MPESA' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {sale.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {sale.kraControlCode ? (
                                                <span className="flex items-center gap-1 text-green-600 font-bold text-[10px] uppercase">
                                                    <FileText size={12} /> Signed
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-bold text-[10px] uppercase">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => setViewSale(sale)}
                                                    className="p-2 text-gray-400 hover:text-masuma-orange" 
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(sale, 'TAX_INVOICE')}
                                                    className="p-2 text-gray-400 hover:text-green-600" 
                                                    title="Download PDF Invoice"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handlePrint(sale, 'TAX_INVOICE')}
                                                    className="p-2 text-gray-400 hover:text-masuma-dark" 
                                                    title="Print Invoice"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-gray-500">No sales found matching your criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        Showing page {pagination.page} of {pagination.pages} ({pagination.total} records)
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesHistory;
