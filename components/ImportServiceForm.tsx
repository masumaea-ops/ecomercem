import React, { useState } from 'react';
import { 
  Plane, Ship, Globe, DollarSign, Calendar, 
  Car, Info, CheckCircle2, AlertCircle, ArrowRight,
  ShieldCheck, Clock, MapPin
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { motion } from 'framer-motion';

interface ImportServiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ImportServiceForm: React.FC<ImportServiceFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    minYear: new Date().getFullYear() - 7,
    budgetKes: 0,
    sourceCountry: 'Japan',
    additionalNotes: '',
    colorPreference: '',
    maxMileage: 100000
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/import-requests', formData);
      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit import request. Please ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
        <p className="text-gray-500 mb-6">Our import specialists will source the best options for you and contact you within 24 hours.</p>
        <button 
          onClick={onCancel}
          className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto border border-gray-100">
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2 flex items-center">
            <Ship className="w-8 h-8 mr-3 text-blue-400" />
            Concierge Import Service
          </h2>
          <p className="text-blue-100 opacity-80 max-w-xl">
            Let Masuma handle the entire import process for you. From sourcing in Japan/UK to customs clearance and delivery to your doorstep.
          </p>
        </div>
        <Globe className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
      </div>

      <form onSubmit={handleSubmit} className="p-8">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vehicle Requirements */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
              <Car className="w-5 h-5 mr-2 text-blue-600" />
              Vehicle Requirements
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input 
                  type="text"
                  required
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g. Toyota"
                  className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input 
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. Harrier"
                  className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Year</label>
                <input 
                  type="number"
                  required
                  min={new Date().getFullYear() - 8}
                  max={new Date().getFullYear()}
                  value={formData.minYear}
                  onChange={(e) => setFormData({ ...formData, minYear: Number(e.target.value) })}
                  className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Mileage (KM)</label>
                <input 
                  type="number"
                  value={formData.maxMileage}
                  onChange={(e) => setFormData({ ...formData, maxMileage: Number(e.target.value) })}
                  className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color Preference</label>
              <input 
                type="text"
                value={formData.colorPreference}
                onChange={(e) => setFormData({ ...formData, colorPreference: e.target.value })}
                placeholder="e.g. Pearl White, Black"
                className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Logistics & Budget */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
              Budget & Source
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (KES)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">KES</span>
                <input 
                  type="number"
                  required
                  value={formData.budgetKes}
                  onChange={(e) => setFormData({ ...formData, budgetKes: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full pl-14 rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Include all taxes, duties, and our service fee.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Country</label>
              <select 
                value={formData.sourceCountry}
                onChange={(e) => setFormData({ ...formData, sourceCountry: e.target.value })}
                className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Japan">Japan (Most Popular)</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Thailand">Thailand (Pickups)</option>
                <option value="South Africa">South Africa</option>
              </select>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
                100% Insured Transit
              </div>
              <div className="flex items-center text-xs text-blue-800">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                45-60 Days Delivery Time
              </div>
              <div className="flex items-center text-xs text-blue-800">
                <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                Doorstep Delivery in East Africa
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes / Special Features</label>
          <textarea 
            rows={3}
            value={formData.additionalNotes}
            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
            placeholder="e.g. Sunroof, Leather seats, 4WD required..."
            className="w-full rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:bg-gray-400 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Submit Import Request
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ImportServiceForm;
