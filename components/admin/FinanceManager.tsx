
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Calendar, Save, Loader2, PieChart } from 'lucide-react';
import { apiClient, formatCurrency } from '../../utils/apiClient';
import { PieChart as RePie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#E0621B', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#EF4444', '#8B5CF6'];

const FinanceManager: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), // Start of year
        end: new Date().toISOString().slice(0, 10)
    });

    const [newExpense, setNewExpense] = useState<{title: string, amount: string | number, category: string, date: string, notes: string}>({
        title: '',
        amount: '',
        category: 'OTHER',
        date: new Date().toISOString().slice(0, 10),
        notes: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [sumRes, expRes] = await Promise.all([
                apiClient.get(`/finance/summary?startDate=${dateRange.start}&endDate=${dateRange.end}`),
                apiClient.get('/finance/expenses')
            ]);
            setSummary(sumRes.data);
            setExpenses(expRes.data);
        } catch (error) {
            console.error('Failed to fetch finance data', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/finance/expenses', {
                ...newExpense,
                amount: Number(newExpense.amount)
            });
            setIsAddingExpense(false);
            setNewExpense({ title: '', amount: '', category: 'OTHER', date: new Date().toISOString().slice(0, 10), notes: '' });
            fetchData();
            alert('Expense recorded successfully');
        } catch (error) {
            alert('Failed to record expense');
        }
    };

    const expenseCategories = ['RENT', 'SALARIES', 'UTILITIES', 'MARKETING', 'LOGISTICS', 'OFFICE_SUPPLIES', 'MAINTENANCE', 'OTHER'];

    const pieData = summary?.expenseBreakdown ? Object.entries(summary.expenseBreakdown).map(([key, val]) => ({ name: key, value: val })) : [];

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Financial Overview</h2>
                    <p className="text-sm text-gray-500">Profit & Loss Analysis and Expense Tracking.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-2">
                         <Calendar size={16} className="text-gray-500"/>
                         <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="text-xs outline-none"/>
                         <span className="text-gray-400">-</span>
                         <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="text-xs outline-none"/>
                    </div>
                    <button 
                        onClick={() => setIsAddingExpense(!isAddingExpense)}
                        className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm uppercase flex items-center gap-2 hover:bg-red-700 transition shadow-md"
                    >
                        <Plus size={16} /> {isAddingExpense ? 'Cancel' : 'Record Expense'}
                    </button>
                </div>
            </div>

            {isAddingExpense && (
                <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500 mb-6 animate-slide-up">
                    <h3 className="font-bold text-masuma-dark uppercase mb-4">New Expense Entry</h3>
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Title</label>
                            <input required type="text" className="w-full p-2 border rounded" placeholder="e.g. Rent Payment" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Amount</label>
                            <input required type="number" className="w-full p-2 border rounded" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Category</label>
                            <select className="w-full p-2 border rounded bg-white" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                                {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
                            <input required type="date" className="w-full p-2 border rounded" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                        </div>
                        <div className="md:col-span-4">
                             <button type="submit" className="bg-red-600 text-white px-8 py-2 rounded font-bold uppercase text-xs hover:bg-red-700 w-full md:w-auto flex items-center justify-center gap-2">
                                 <Save size={16}/> Save Record
                             </button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading && !summary ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-masuma-orange" size={40}/></div>
            ) : (
                <div className="flex-1 flex flex-col gap-6">
                    {/* P&L Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.revenue || 0)}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                            <p className="text-xs text-gray-500 font-bold uppercase">Cost of Goods (COGS)</p>
                            <p className="text-2xl font-bold text-gray-600">{formatCurrency(summary?.cogs || 0)}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                            <p className="text-xs text-gray-500 font-bold uppercase">Gross Profit</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.grossProfit || 0)}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                            <p className="text-xs text-gray-500 font-bold uppercase">Op. Expenses</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.expenses || 0)}</p>
                        </div>
                        <div className={`bg-white p-4 rounded shadow-sm border-l-4 ${(summary?.netProfit || 0) >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                            <p className="text-xs text-gray-500 font-bold uppercase">Net Profit</p>
                            <p className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(summary?.netProfit || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                        {/* Expense List */}
                        <div className="lg:col-span-2 bg-white rounded shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-200 font-bold text-masuma-dark uppercase text-sm bg-gray-50">Expense History</div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-gray-500 font-bold text-xs border-b">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Title</th>
                                            <th className="px-4 py-3">Category</th>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {expenses.map(ex => (
                                            <tr key={ex.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-500">{new Date(ex.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-bold text-gray-700">{ex.title}</td>
                                                <td className="px-4 py-3"><span className="text-[10px] bg-gray-100 px-2 py-1 rounded uppercase font-bold">{ex.category}</span></td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{ex.recordedBy}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">-{formatCurrency(Number(ex.amount))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Expense Breakdown Chart */}
                        <div className="bg-white rounded shadow-sm border border-gray-200 p-6 flex flex-col">
                            <h4 className="font-bold text-masuma-dark uppercase text-sm mb-4">Expense Breakdown</h4>
                            <div className="flex-1 min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePie>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                    </RePie>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
