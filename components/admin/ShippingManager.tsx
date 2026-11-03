import React, { useState, useEffect, useRef } from 'react';
import { Truck, MapPin, CheckCircle, Printer, Search, Package, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import InvoiceTemplate from './InvoiceTemplate';
import { printDocument } from '../../utils/pdfGenerator';

interface Shipment {
    id: string;
    orderNumber: string;
    customerName: string;
    date: string;
    total: number;
    status: string;
    items: any[];
}

const ShippingManager: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, PAID, SHIPPED
    
    // Print State
    const [printShipment, setPrintShipment] = useState<any | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const fetchShipments = async () => {
        setIsLoading(true);
        try {
            // Fetch orders relevant to shipping
            const res = await apiClient.get(`/orders?status=${activeTab}`);
            setShipments(res.data);
        } catch (error) {
            console.error("Failed to fetch shipments", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, [activeTab]);

    const handleDispatch = async (id: string) => {
        try {
            await apiClient.patch(`/orders/${id}/status`, { status: 'SHIPPED' });
            fetchShipments(); 
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handlePrintWaybill = (shipment: any) => {
        setPrintShipment(shipment);
        setTimeout(() => {
            if (printRef.current) {
                printDocument(printRef.current, { title: `Waybill-${shipment.orderNumber || 'SHIPMENT'}` });
            } else {
                window.print();
            }
        }, 150);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Processing</span>;
            case 'PAID': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Ready for Dispatch</span>;
            case 'SHIPPED': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase">In Transit</span>;
            case 'DELIVERED': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Delivered</span>;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col">
             {/* Hidden Print Template - Uses print-force-container */}
             {printShipment && (
                <div className="hidden print-force-container">
                    <InvoiceTemplate data={printShipment} type="WAYBILL" ref={printRef} />
                </div>
             )}

             <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Logistics & Dispatch</h2>
                    <p className="text-sm text-gray-500">Manage delivery queues, assign drivers, and print waybills.</p>
                </div>
                <button onClick={fetchShipments} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500">
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 print:hidden">
                {['PENDING', 'PAID', 'SHIPPED'].map(status => (
                    <button 
                        key={status}
                        onClick={() => setActiveTab(status)}
                        className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                            activeTab === status 
                                ? 'bg-masuma-orange text-white shadow-md' 
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        {status === 'PAID' ? 'Ready to Ship' : status}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden print:hidden">
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                         </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Order Ref</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Destination</th>
                                    <th className="px-6 py-4">Items</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {shipments.map(ship => (
                                    <tr key={ship.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono font-bold text-masuma-dark">{ship.orderNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{ship.customerName}</div>
                                            <div className="text-[10px] text-gray-500">{ship.date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <MapPin size={12} /> Nairobi, Kenya (Default)
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">{ship.items.length} Items</td>
                                        <td className="px-6 py-4">{getStatusBadge(ship.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handlePrintWaybill(ship)}
                                                    className="p-1 text-gray-400 hover:text-masuma-dark" 
                                                    title="Print Waybill"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                {ship.status === 'PAID' && (
                                                    <button 
                                                        onClick={() => handleDispatch(ship.id)}
                                                        className="bg-masuma-dark text-white px-3 py-1 rounded text-[10px] font-bold uppercase hover:bg-masuma-orange transition"
                                                    >
                                                        Dispatch
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {shipments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            <Package size={48} className="mx-auto mb-2 opacity-20" />
                                            No shipments found in '{activeTab}' queue.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShippingManager;