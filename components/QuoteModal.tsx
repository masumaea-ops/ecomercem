
import React, { useState } from 'react';
import { X, Send, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { Product } from '../types';
import { apiClient } from '../utils/apiClient';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, product }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await apiClient.post('/quotes', {
        ...formData,
        productId: product.id,
        productName: product.name
      });

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setFormData({ name: '', email: '', phone: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Quote submission failed:', error);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up font-sans">
        
        {/* Header */}
        <div className="bg-masuma-dark p-6 flex justify-between items-center border-b-4 border-masuma-orange">
          <h3 className="text-white font-bold text-xl uppercase tracking-tight flex items-center gap-3 font-display">
            <MessageSquare size={24} className="text-masuma-orange" />
            Request a Quote
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full focus-ring touch-target"
            aria-label="Close quote modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CheckCircle size={40} />
              </div>
              <h4 className="text-2xl font-bold text-masuma-dark mb-3 font-display uppercase tracking-tight">Request Sent!</h4>
              <p className="text-gray-600 text-base leading-relaxed">
                Our sales team at Industrial Area has received your request for the <strong>{product.name}</strong>. We will contact you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 group hover:border-masuma-orange/20 transition-colors">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Part Details</p>
                <p className="text-base font-bold text-masuma-dark uppercase tracking-tight">{product.name}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">SKU: {product.sku}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-masuma-dark uppercase tracking-wider">Full Name</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-masuma-orange outline-none text-sm font-medium transition-all focus-ring"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-masuma-dark uppercase tracking-wider">Phone</label>
                  <input 
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-masuma-orange outline-none text-sm font-medium transition-all focus-ring"
                    placeholder="07XX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-masuma-dark uppercase tracking-wider">Email</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-masuma-orange outline-none text-sm font-medium transition-all focus-ring"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-masuma-dark uppercase tracking-wider">Message / Specific Request</label>
                <textarea 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-masuma-orange outline-none text-sm font-medium transition-all h-32 resize-none focus-ring"
                  placeholder="e.g., Do you have this in stock for immediate pickup?"
                ></textarea>
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                  Failed to send request. Please check your connection and try again.
                </p>
              )}

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full bg-masuma-dark text-white font-bold uppercase tracking-widest py-5 rounded-xl hover:bg-masuma-orange transition duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-masuma-dark/20 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 focus-ring"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} /> Send Request
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
