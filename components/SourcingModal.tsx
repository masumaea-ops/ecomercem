
import React, { useState } from 'react';
import { X, Send, CheckCircle, Loader2, Plane, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface SourcingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SourcingModal: React.FC<SourcingModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vin: '',
    partNumber: '',
    description: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await apiClient.post('/quotes', {
        ...formData,
        requestType: 'SOURCING'
      });

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setFormData({ name: '', email: '', phone: '', vin: '', partNumber: '', description: '' });
      }, 4000);
    } catch (error) {
      console.error('Sourcing request failed:', error);
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

      <div className="relative bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden animate-scale-up font-sans">
        
        {/* Header */}
        <div className="bg-masuma-dark p-5 flex justify-between items-center border-b-4 border-masuma-orange">
          <div>
            <h3 className="text-white font-bold text-lg uppercase tracking-wider flex items-center gap-2">
                <Plane size={20} className="text-masuma-orange transform -rotate-45" />
                Special Import Request
            </h3>
            <p className="text-gray-400 text-xs mt-1">We source hard-to-find parts directly from Japan.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-xl font-bold text-masuma-dark mb-2">Request Received!</h4>
              <p className="text-gray-600 text-sm mb-4">
                Our sourcing team is now looking for a compatible part for Chassis <strong>{formData.vin}</strong>.
              </p>
              <p className="text-xs text-gray-500">
                  We typically reply within 24 hours with a price and lead time.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Vehicle Info Section */}
              <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-masuma-dark uppercase border-b border-gray-200 pb-2 mb-2">Vehicle Details</h4>
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-masuma-dark uppercase">Chassis Number (VIN) <span className="text-red-500">*</span></label>
                    <input 
                        required
                        type="text"
                        value={formData.vin}
                        onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                        className="w-full p-3 border-2 border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm font-mono uppercase"
                        placeholder="e.g. JTN..."
                        minLength={10}
                    />
                    <p className="text-[10px] text-gray-500">Required to guarantee the part fits your exact car.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-masuma-dark uppercase">Part Description <span className="text-red-500">*</span></label>
                        <textarea 
                            required
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm h-20 resize-none"
                            placeholder="Describe the part you need (e.g. Rear Left ABS Sensor)..."
                        ></textarea>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-masuma-dark uppercase">Part Number (Optional)</label>
                        <input 
                            type="text"
                            value={formData.partNumber}
                            onChange={e => setFormData({...formData, partNumber: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm font-mono"
                            placeholder="If known"
                        />
                    </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div>
                  <h4 className="text-xs font-bold text-masuma-dark uppercase border-b border-gray-200 pb-2 mb-3">Your Contact Info</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-masuma-dark uppercase">Name</label>
                        <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                        <label className="text-xs font-bold text-masuma-dark uppercase">Phone</label>
                        <input 
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm"
                        />
                        </div>
                        <div className="space-y-1">
                        <label className="text-xs font-bold text-masuma-dark uppercase">Email</label>
                        <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm"
                        />
                        </div>
                    </div>
                  </div>
              </div>

              {status === 'error' && (
                <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded flex items-center gap-2">
                  <AlertCircle size={14} /> Failed to send request. Check connection.
                </p>
              )}

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full bg-masuma-dark text-white font-bold uppercase tracking-widest py-4 rounded-sm hover:bg-masuma-orange transition duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Submit Request
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

export default SourcingModal;
