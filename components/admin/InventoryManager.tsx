
import React, { useState, useEffect, useRef } from 'react';
import { Edit, AlertTriangle, Package, Loader2, RefreshCw, Plus, Minus, Save, X, ArrowRightLeft, Truck, Upload, Download, Search } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { Branch } from '../../types';

interface StockItem {
    id: string;
    product: {
        id: string;
        name: string;
        sku: string;
    };
    branch: {
        id: string;
        name: string;
    };
    quantity: number;
    lowStockThreshold: number;
}

const InventoryManager: React.FC = () => {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const [adjustment, setAdjustment] = useState<{quantity: string | number, operation: 'add' | 'subtract' | 'set'}>({ quantity: '', operation: 'add' });
    const [isTransferMode, setIsTransferMode] = useState(false);
    const [transferData, setTransferData] = useState<{toBranchId: string, quantity: string | number}>({ toBranchId: '', quantity: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Import States
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [stockRes, branchRes] = await Promise.all([
                apiClient.get('/inventory?limit=1000'), // Get all for client-side filtering or implement server search
                apiClient.get('/branches')
            ]);
            setStockItems(stockRes.data);
            setBranches(branchRes.data);
        } catch (error) {
             console.error("Failed to fetch inventory", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdjust = (item: StockItem) => {
        setSelectedItem(item);
        setIsTransferMode(false);
        setAdjustment({ quantity: '', operation: 'add' });
    };

    const handleTransfer = (item: StockItem) => {
        setSelectedItem(item);
        setIsTransferMode(true);
        setTransferData({ toBranchId: '', quantity: '' });
    };

    const saveAdjustment = async () => {
        if (!selectedItem) return;
        const qty = Number(adjustment.quantity);
        if (qty < 0 || isNaN(qty)) return alert("Invalid Quantity");
        
        setIsSaving(true);
        try {
            await apiClient.patch(`/inventory/${selectedItem.product.id}`, {
                branchId: selectedItem.branch.id,
                quantity: qty,
                operation: adjustment.operation
            });
            setSelectedItem(null);
            fetchData();
        } catch (error) {
            alert('Failed to update stock');
        } finally {
            setIsSaving(false);
        }
    };

    const executeTransfer = async () => {
        if (!selectedItem || !transferData.toBranchId) return;
        const qty = Number(transferData.quantity);
        if (qty <= 0 || isNaN(qty)) return alert("Invalid Quantity");

        setIsSaving(true);
        try {
            await apiClient.post('/inventory/transfer', {
                productId: selectedItem.product.id,
                fromBranchId: selectedItem.branch.id,
                toBranchId: transferData.toBranchId,
                quantity: qty
            });
            setSelectedItem(null);
            alert('Transfer successful');
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Transfer failed');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredItems = stockItems.filter(item => 
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.branch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Inventory Control</h2>
                    <p className="text-sm text-gray-500">Stock levels, adjustments, and inter-branch transfers.</p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-masuma-orange bg-white" 
                            placeholder="Search Product SKU, Name or Branch..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4">Branch</th>
                                    <th className="px-6 py-4">Quantity</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{item.product.name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{item.product.sku}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {item.branch.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.quantity <= item.lowStockThreshold ? (
                                                <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-fit">
                                                    <AlertTriangle size={12} /> {item.quantity} (Low)
                                                </span>
                                            ) : (
                                                <span className="font-bold text-masuma-dark">{item.quantity}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleAdjust(item)}
                                                    className="px-3 py-1 border border-gray-300 rounded text-xs font-bold uppercase hover:bg-gray-50 flex items-center gap-1"
                                                >
                                                    <Edit size={12} /> Adjust
                                                </button>
                                                <button 
                                                    onClick={() => handleTransfer(item)}
                                                    className="px-3 py-1 bg-masuma-dark text-white rounded text-xs font-bold uppercase hover:bg-masuma-orange flex items-center gap-1"
                                                >
                                                    <Truck size={12} /> Transfer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No inventory records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal for Adjust/Transfer */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-scale-up">
                        <div className="bg-masuma-dark text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold uppercase tracking-wider">
                                {isTransferMode ? 'Stock Transfer' : 'Stock Adjustment'}
                            </h3>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-6 bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase">Product</p>
                                <p className="font-bold text-masuma-dark">{selectedItem.product.name}</p>
                                <p className="text-xs text-gray-500 font-mono mb-2">{selectedItem.product.sku}</p>
                                
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Current Branch</p>
                                        <p className="text-sm font-bold text-gray-800">{selectedItem.branch.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-500 uppercase">On Hand</p>
                                        <p className="text-xl font-bold text-masuma-orange">{selectedItem.quantity}</p>
                                    </div>
                                </div>
                            </div>

                            {isTransferMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Transfer To</label>
                                        <select 
                                            className="w-full p-2 border rounded bg-white focus:border-masuma-orange outline-none"
                                            value={transferData.toBranchId}
                                            onChange={e => setTransferData({...transferData, toBranchId: e.target.value})}
                                        >
                                            <option value="">Select Destination Branch</option>
                                            {branches.filter(b => b.id !== selectedItem.branch.id).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity to Move</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border rounded focus:border-masuma-orange outline-none"
                                            value={transferData.quantity}
                                            onChange={e => setTransferData({...transferData, quantity: e.target.value})}
                                            placeholder="0"
                                            max={selectedItem.quantity}
                                        />
                                    </div>
                                    <button 
                                        onClick={executeTransfer} 
                                        disabled={isSaving}
                                        className="w-full bg-masuma-dark text-white py-3 rounded font-bold uppercase text-sm hover:bg-masuma-orange transition flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <ArrowRightLeft size={16}/>}
                                        Confirm Transfer
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Operation</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setAdjustment({...adjustment, operation: 'add'})}
                                                className={`flex-1 py-2 rounded border font-bold text-xs uppercase ${adjustment.operation === 'add' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white text-gray-600'}`}
                                            >
                                                Add
                                            </button>
                                            <button 
                                                onClick={() => setAdjustment({...adjustment, operation: 'subtract'})}
                                                className={`flex-1 py-2 rounded border font-bold text-xs uppercase ${adjustment.operation === 'subtract' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white text-gray-600'}`}
                                            >
                                                Subtract
                                            </button>
                                            <button 
                                                onClick={() => setAdjustment({...adjustment, operation: 'set'})}
                                                className={`flex-1 py-2 rounded border font-bold text-xs uppercase ${adjustment.operation === 'set' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white text-gray-600'}`}
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantity</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border rounded focus:border-masuma-orange outline-none"
                                            value={adjustment.quantity}
                                            onChange={e => setAdjustment({...adjustment, quantity: e.target.value})}
                                            placeholder="0"
                                        />
                                    </div>
                                    <button 
                                        onClick={saveAdjustment} 
                                        disabled={isSaving}
                                        className="w-full bg-masuma-dark text-white py-3 rounded font-bold uppercase text-sm hover:bg-masuma-orange transition flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManager;
