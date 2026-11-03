
import React, { useState, useEffect } from 'react';
import { Clock, User, AlertCircle, Activity, Loader2 } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface LogItem {
    id: string;
    action: string;
    user: string;
    detail: string;
    time: string;
    type: 'info' | 'warning' | 'error';
}

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await apiClient.get('/audit-logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 15000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: string) => {
        switch(type) {
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            case 'warning': return <AlertCircle size={16} className="text-orange-500" />;
            default: return <Activity size={16} className="text-blue-500" />;
        }
    };

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Audit Logs</h2>
                    <p className="text-sm text-gray-500">Security and operational activity trail.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                             <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Activity</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getIcon(log.type)}
                                                <span className="font-bold text-masuma-dark text-xs uppercase">{log.action.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <User size={14} /> {log.user}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{log.detail}</td>
                                        <td className="px-6 py-4 text-right text-gray-400 flex items-center justify-end gap-1">
                                            <Clock size={14} /> {log.time}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400">No audit logs found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
