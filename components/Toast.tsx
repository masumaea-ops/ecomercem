
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 md:top-auto md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-[2500] animate-slide-down md:animate-slide-up pointer-events-auto">
      <div className={`flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
        type === 'success' 
          ? 'bg-masuma-dark/95 text-white border-masuma-orange/40 shadow-masuma-dark/30' 
          : 'bg-white/95 text-red-600 border-red-200 shadow-red-500/10'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          {type === 'success' ? (
            <div className="w-8 h-8 rounded-xl bg-masuma-orange/20 text-masuma-orange flex items-center justify-center shrink-0">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <XCircle size={18} strokeWidth={2.5} />
            </div>
          )}
          <span className="font-semibold text-xs tracking-tight truncate">{message}</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors focus-ring touch-target"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
