
import React, { useState } from 'react';
import { Search, Car, CheckCircle, AlertCircle, X, MessageCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface VinSearchProps {
  onVehicleIdentified: (vehicleName: string) => void;
}

const VinSearch: React.FC<VinSearchProps> = ({ onVehicleIdentified }) => {
  const [vin, setVin] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const [identifiedCar, setIdentifiedCar] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vin.trim().length < 3) return;

    setStatus('searching');
    try {
        const res = await apiClient.get(`/vehicles/decode/${encodeURIComponent(vin.trim())}`);
        const car = res.data.model;
        setIdentifiedCar(car);
        setStatus('found');
        onVehicleIdentified(car);
    } catch (error) {
        setStatus('error');
        onVehicleIdentified('');
    }
  };

  const clearSearch = () => {
      setVin('');
      setStatus('idle');
      setIdentifiedCar('');
      onVehicleIdentified('');
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-200 mb-6 font-sans">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Car className="text-masuma-orange" size={18} />
          <h3 className="font-bold text-masuma-dark uppercase text-xs sm:text-sm tracking-wider">
            Filter by Chassis / VIN
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-gray-400 hidden sm:inline">
          Accurate Fitment Guarantee
        </span>
      </div>
      
      <div className="relative">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
                <input 
                    type="text" 
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    placeholder="Enter Chassis Number or VIN (e.g. NZE141, SG5)"
                    className={`w-full pl-4 pr-10 py-3 border-2 rounded-xl outline-none font-mono text-base sm:text-sm uppercase transition ${
                        status === 'found' ? 'border-green-500 bg-green-50 text-green-700' :
                        status === 'error' ? 'border-amber-400 bg-amber-50/50' :
                        'border-gray-200 focus:border-masuma-orange bg-gray-50/50 focus:bg-white'
                    }`}
                    maxLength={25}
                />
                {vin && (
                    <button 
                        type="button"
                        onClick={clearSearch} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                        aria-label="Clear input"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
            <button 
                type="submit"
                disabled={status === 'searching' || !vin.trim()}
                className="bg-masuma-dark text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-masuma-orange transition disabled:opacity-50 shrink-0"
            >
                {status === 'searching' ? 'Checking...' : 'Check Fitment'}
            </button>
          </form>
      </div>

      {status === 'found' && (
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                <span className="font-bold">Vehicle Model: {identifiedCar}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">Filtering Compatible Parts</span>
          </div>
      )}

      {status === 'error' && (
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 animate-fade-in text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Chassis "{vin}" not in automated instant list.</span>
                  <span className="text-[11px] text-amber-700">Don't guess part numbers. Verify with our Nairobi technicians before ordering.</span>
                </div>
              </div>
              <a 
                href={`https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20please%20verify%20fitment%20for%20my%20chassis:%20${encodeURIComponent(vin)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 transition shadow-sm shrink-0 self-end sm:self-auto"
              >
                <MessageCircle size={13} fill="currentColor" /> Verify On WhatsApp
              </a>
          </div>
      )}
    </div>
  );
};

export default VinSearch;
