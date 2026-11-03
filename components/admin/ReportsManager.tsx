
import React, { useState } from 'react';
import { FileBarChart, Download, Calendar, TrendingUp, Package, DollarSign, PieChart, Loader2, FileText } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

const ReportsManager: React.FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleExport = async (reportType: string, format: 'csv' | 'pdf') => {
        setIsDownloading(true);
        try {
            // Determine Endpoint
            let endpoint = '';
            if (reportType === 'Sales_Summary') endpoint = 'reports/sales';
            else if (reportType === 'Inventory_Valuation') endpoint = 'reports/inventory';
            else {
                alert('This report type is currently being engineered.');
                setIsDownloading(false);
                return;
            }

            const params = new URLSearchParams();
            if (reportType === 'Sales_Summary') params.append('startDate', '2023-01-01');

            // CSV Download
            if (format === 'csv') {
                params.append('format', 'csv');
                const token = localStorage.getItem('masuma_auth_token');
                
                // Robust URL Construction
                const apiBase = apiClient.defaults.baseURL || '/api';
                
                // Determine the absolute base URL
                const baseUrl = apiBase.startsWith('http') 
                    ? apiBase 
                    : `${window.location.origin}${apiBase.startsWith('/') ? '' : '/'}${apiBase}`;
                
                // Construct full URL safely handling slashes
                const url = new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
                
                // Append query parameters
                params.forEach((value, key) => url.searchParams.append(key, value));

                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(url.toString(), {
                    headers: headers
                });

                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `${reportType}_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
            } 
            // PDF Generation
            else if (format === 'pdf') {
                params.append('format', 'json');
                const res = await apiClient.get(`/${endpoint}?${params.toString()}`);
                const data = res.data;

                if (!Array.isArray(data) || data.length === 0) {
                    alert('No data available to generate PDF');
                    return;
                }

                generatePdf(reportType.replace(/_/g, ' '), data);
            }

        } catch (error) {
            console.error("Report Generation Error:", error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const generatePdf = (title: string, data: any[]) => {
        try {
            // Use imported jsPDF constructor
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text("MASUMA AUTOPARTS E.A.", 14, 15);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text("Official Management Report", 14, 22);
            
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(title, 14, 32);
            
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

            if (data.length > 0) {
                const headers = Object.keys(data[0]).map(key => key.replace(/([A-Z])/g, ' $1').toUpperCase());
                const rows = data.map(obj => Object.values(obj));

                autoTable(doc, {
                    startY: 45,
                    head: [headers],
                    body: rows as any[],
                    theme: 'grid',
                    headStyles: { fillColor: [224, 98, 27] },
                    styles: { fontSize: 8, cellPadding: 2 },
                });
            }

            doc.save(`${title.replace(/\s/g, '_')}_Report.pdf`);
        } catch (e) {
            console.error("PDF Generation Error:", e);
            alert("Could not generate PDF. Ensure libraries are loaded.");
        }
    };

    const reports = [
        { title: 'Sales Summary', desc: 'Daily, weekly, and monthly sales revenue breakdown.', icon: TrendingUp, color: 'bg-blue-500' },
        { title: 'Inventory Valuation', desc: 'Current stock value based on cost vs retail price.', icon: Package, color: 'bg-purple-500' },
        { title: 'VAT / Tax Report', desc: 'KRA output tax (16%) summary for filing returns.', icon: FileBarChart, color: 'bg-green-500' },
        { title: 'Product Performance', desc: 'Best selling items and slow-moving inventory.', icon: PieChart, color: 'bg-orange-500' },
        { title: 'Profit & Loss', desc: 'Estimated gross profit based on sales cost.', icon: DollarSign, color: 'bg-red-500' },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Reports Center</h2>
                    <p className="text-sm text-gray-500">Generate financial and operational insights.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report, i) => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition group flex flex-col">
                        <div className={`w-12 h-12 rounded-lg ${report.color} text-white flex items-center justify-center mb-4 shadow-sm`}>
                            <report.icon size={24} />
                        </div>
                        <h3 className="font-bold text-masuma-dark text-lg mb-2">{report.title}</h3>
                        <p className="text-sm text-gray-500 mb-6 flex-1">{report.desc}</p>
                        
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 relative">
                                <Calendar size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                <select className="w-full pl-7 py-2 border border-gray-200 rounded text-xs font-bold text-gray-600 bg-gray-50 outline-none">
                                    <option>Last 7 Days</option>
                                    <option>This Month</option>
                                    <option>Last Month</option>
                                    <option>Year to Date</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button 
                                onClick={() => handleExport(report.title.replace(/\s/g, '_'), 'csv')}
                                disabled={isDownloading}
                                className="w-full py-2 border border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase text-[10px] rounded hover:bg-gray-100 transition flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} 
                                CSV
                            </button>
                            <button 
                                onClick={() => handleExport(report.title.replace(/\s/g, '_'), 'pdf')}
                                disabled={isDownloading}
                                className="w-full py-2 border border-red-100 bg-red-50 text-red-600 font-bold uppercase text-[10px] rounded hover:bg-red-100 transition flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} 
                                PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4">Scheduled Reports</h3>
                <div className="overflow-hidden rounded border border-gray-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-3">Report Name</th>
                                <th className="px-6 py-3">Frequency</th>
                                <th className="px-6 py-3">Recipients</th>
                                <th className="px-6 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="px-6 py-4 font-bold">Daily Sales EOD</td>
                                <td className="px-6 py-4">Daily @ 6:00 PM</td>
                                <td className="px-6 py-4 text-gray-500">director@masuma.africa, accounts@masuma.africa</td>
                                <td className="px-6 py-4 text-right"><span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Active</span></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 font-bold">Monthly Stocktake</td>
                                <td className="px-6 py-4">Monthly (Last Day)</td>
                                <td className="px-6 py-4 text-gray-500">inventory@masuma.africa</td>
                                <td className="px-6 py-4 text-right"><span className="text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded">Active</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsManager;
