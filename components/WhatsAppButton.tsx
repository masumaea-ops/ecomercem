import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { trackWhatsAppClick } from '../utils/analytics';

const WhatsAppButton: React.FC = () => {
    const [phone, setPhone] = useState('+254792506590');
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await apiClient.get('/settings');
                if (res.data.CMS_CONTACT_PHONE) {
                    // Clean phone number for WhatsApp link (remove spaces, plus, etc.)
                    const cleanPhone = res.data.CMS_CONTACT_PHONE.replace(/\D/g, '');
                    setPhone(cleanPhone);
                }
            } catch (e) {
                // Fallback to default
            }
        };
        fetchSettings();

        // Show button after a short delay
        const timer = setTimeout(() => setIsVisible(true), 2000);
        
        // Show tooltip after 5 seconds, then hide after 10
        const tooltipTimer = setTimeout(() => setShowTooltip(true), 5000);
        const hideTooltipTimer = setTimeout(() => setShowTooltip(false), 15000);

        return () => {
            clearTimeout(timer);
            clearTimeout(tooltipTimer);
            clearTimeout(hideTooltipTimer);
        };
    }, []);

    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Masuma East Africa, I am interested in genuine Japanese spare parts.')}`;

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-[1000] flex flex-col items-end gap-3 pointer-events-none">
            {showTooltip && (
                <div className="bg-white text-masuma-dark p-4 rounded-2xl shadow-2xl border border-gray-100 animate-scale-up pointer-events-auto relative max-w-[240px]">
                    <button 
                        onClick={() => setShowTooltip(false)}
                        className="absolute -top-2 -right-2 bg-masuma-dark text-white p-1 rounded-full hover:bg-masuma-orange transition shadow-md"
                        aria-label="Close WhatsApp prompt"
                    >
                        <X size={12} />
                    </button>
                    <p className="text-xs font-bold leading-tight">
                        Need help finding a part? <br/>
                        <span className="text-masuma-orange">Chat with our experts on WhatsApp!</span>
                    </p>
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"></div>
                </div>
            )}
            
            <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('Floating Button')}
                className="pointer-events-auto bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:rotate-12 active:scale-95 transition-all duration-300 group relative"
                aria-label="Chat on WhatsApp"
            >
                <MessageCircle size={28} fill="currentColor" />
                <span className="absolute right-full mr-4 bg-masuma-dark text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                    WhatsApp Support
                </span>
                
                {/* Pulse Effect */}
                <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></span>
            </a>
        </div>
    );
};

export default WhatsAppButton;
