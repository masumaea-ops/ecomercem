
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Loader2, Bell } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'success' | 'info';
    time: string;
    link?: string;
}

interface NotificationsPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (module: string) => void; // Callback to navigate
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ isOpen, onClose, onNavigate }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            // Fallback
            setNotifications([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemClick = (link?: string) => {
        if (link && onNavigate) {
            onNavigate(link);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-scale-up overflow-hidden">
            <div className="p-3 bg-masuma-dark text-white flex justify-between items-center border-b border-gray-700">
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <Bell size={14} /> System Alerts
                </h4>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={14} /></button>
            </div>
            
            <div className="max-h-64 overflow-y-auto bg-white">
                {isLoading ? (
                    <div className="flex justify-center items-center p-6 text-gray-400">
                        <Loader2 className="animate-spin" size={20} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">
                        <CheckCircle size={24} className="mx-auto mb-2 opacity-20" />
                        All systems normal. No new alerts.
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleItemClick(notif.link)}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer relative group`}
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1 ${
                                    notif.type === 'warning' ? 'text-orange-500' : 
                                    notif.type === 'success' ? 'text-green-500' : 'text-blue-500'
                                }`}>
                                    {notif.type === 'warning' ? <AlertTriangle size={16} /> : 
                                     notif.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-gray-800">{notif.title}</h5>
                                    <p className="text-xs text-gray-500 leading-tight my-1">{notif.message}</p>
                                    <p className="text-[10px] text-gray-400">{notif.time}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="p-2 text-center bg-gray-50 border-t border-gray-200">
                <button onClick={fetchNotifications} className="text-xs font-bold text-masuma-orange hover:text-masuma-dark uppercase">
                    Refresh Status
                </button>
            </div>
        </div>
    );
};

export default NotificationsPopover;
