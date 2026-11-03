import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Loader2, AlertTriangle, 
  CheckCircle2, RefreshCw, Info, Percent
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

const ImportSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local state for the rates
  const [depreciationRates, setDepreciationRates] = useState<Record<string, number>>({});
  const [vatRate, setVatRate] = useState('0.16');
  const [idfRate, setIdfRate] = useState('0.025');
  const [rdlRate, setRdlRate] = useState('0.02');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/import-calculator/settings');
      const data: SystemSetting[] = response.data;
      setSettings(data);

      // Map settings to local state
      const depSetting = data.find(s => s.key === 'IMPORT_DEPRECIATION_RATES');
      if (depSetting) setDepreciationRates(JSON.parse(depSetting.value));
      else setDepreciationRates({
        "0": 0.05, "1": 0.10, "2": 0.20, "3": 0.30, 
        "4": 0.40, "5": 0.50, "6": 0.55, "7": 0.60, "8": 0.65
      });

      const vat = data.find(s => s.key === 'IMPORT_VAT_RATE');
      if (vat) setVatRate(vat.value);

      const idf = data.find(s => s.key === 'IMPORT_IDF_RATE');
      if (idf) setIdfRate(idf.value);

      const rdl = data.find(s => s.key === 'IMPORT_RDL_RATE');
      if (rdl) setRdlRate(rdl.value);

    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updates = [
        { key: 'IMPORT_DEPRECIATION_RATES', value: JSON.stringify(depreciationRates), description: 'Depreciation rates by year (0-8)' },
        { key: 'IMPORT_VAT_RATE', value: vatRate, description: 'Standard VAT rate for imports' },
        { key: 'IMPORT_IDF_RATE', value: idfRate, description: 'Import Declaration Fee rate' },
        { key: 'IMPORT_RDL_RATE', value: rdlRate, description: 'Railway Development Levy rate' }
      ];

      for (const update of updates) {
        await apiClient.post('/import-calculator/settings', update);
      }

      setSuccess('Settings updated successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-masuma-orange" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Calculator Settings</h1>
          <p className="text-gray-500">Configure tax rates and depreciation schedules used by the calculation engine.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-masuma-dark text-white rounded-lg font-bold hover:bg-black transition-all disabled:bg-gray-400"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700">
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tax Rates */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Percent className="text-masuma-orange" size={20} />
            Standard Tax Rates
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (e.g. 0.16)</label>
              <input 
                type="text" 
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-xl border-gray-200 focus:ring-masuma-orange focus:border-masuma-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IDF Rate (e.g. 0.025)</label>
              <input 
                type="text" 
                value={idfRate}
                onChange={(e) => setIdfRate(e.target.value)}
                className="w-full rounded-xl border-gray-200 focus:ring-masuma-orange focus:border-masuma-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RDL Rate (e.g. 0.02)</label>
              <input 
                type="text" 
                value={rdlRate}
                onChange={(e) => setRdlRate(e.target.value)}
                className="w-full rounded-xl border-gray-200 focus:ring-masuma-orange focus:border-masuma-orange"
              />
            </div>
          </div>
        </div>

        {/* Depreciation Schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="text-masuma-orange" size={20} />
            Depreciation Schedule
          </h2>
          <p className="text-xs text-gray-500">Enter the depreciation rate for each year of age (0 to 8 years).</p>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(depreciationRates).sort().map((year) => (
              <div key={year}>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Year {year}</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={depreciationRates[year]}
                  onChange={(e) => setDepreciationRates({
                    ...depreciationRates,
                    [year]: parseFloat(e.target.value)
                  })}
                  className="w-full rounded-xl border-gray-200 focus:ring-masuma-orange focus:border-masuma-orange text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
        <Info className="text-blue-600 shrink-0" size={24} />
        <div>
          <h3 className="text-sm font-bold text-blue-900 mb-1">Pro Tip: Accuracy Matters</h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            These settings directly affect the calculation results for your customers. 
            Always verify the latest KRA Finance Act before making changes to these rates.
            Depreciation rates should be expressed as decimals (e.g., 0.20 for 20%).
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportSettings;
