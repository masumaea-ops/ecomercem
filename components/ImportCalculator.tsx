import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, Info, AlertTriangle, CheckCircle2, 
  ChevronRight, Download, Share2, Car, Search,
  ArrowRight, ShieldCheck, TrendingUp, Settings,
  Ship, Settings2, FileText, Check, DollarSign, X,
  User, Mail, Phone, Loader2, Sparkles, Building2
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { CrspData, ImportCalculationResult, Product, ImportConciergeInvoice } from '../types';
import { formatPrice } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from './SEO';
import { generateConciergeDocument, formatKes } from '../utils/conciergeDocuments';
import ImportServiceForm from './ImportServiceForm';
import ImportTracking from './ImportTracking';

const DIRECT_IMPORT_DEPRECIATION: Record<number, number> = {
  0: 0.10,
  1: 0.10,
  2: 0.20,
  3: 0.30,
  4: 0.40,
  5: 0.50,
  6: 0.55,
  7: 0.60,
  8: 0.65
};

interface ImportCalculatorProps {
  user?: any;
  setView?: (view: any) => void;
  setAdminModule?: (module: string) => void;
}

const ImportCalculator: React.FC<ImportCalculatorProps> = ({ user, setView, setAdminModule }) => {
  // Makes & Models
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  
  // Quick Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CrspData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected Vehicle State
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCrsp, setSelectedCrsp] = useState<CrspData | null>(null);
  const [crspVariants, setCrspVariants] = useState<CrspData[]>([]);
  const [customCrsp, setCustomCrsp] = useState<number>(0);

  // Vehicle Parameters
  const currentYear = new Date().getFullYear();
  const allowedYears = Array.from({ length: 9 }, (_, i) => currentYear - i); // 8-year age rule
  const [selectedYear, setSelectedYear] = useState<number>(currentYear - 7); // Default 7-year old (popular import age)
  const [vehicleType, setVehicleType] = useState('CAR');
  const [engineSize, setEngineSize] = useState<number>(1500);
  const [fuelType, setFuelType] = useState('GASOLINE');
  const [cifValue, setCifValue] = useState<number>(0);

  // Result & Calculation
  const [result, setResult] = useState<ImportCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommendations & Tabs
  const [recommendedParts, setRecommendedParts] = useState<Product[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isImportServiceOpen, setIsImportServiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'TRACKING'>('CALCULATOR');

  // Proforma Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pin: '',
    nationalId: '',
    address: '',
    includeRegistration: true,
    notes: ''
  });
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<ImportConciergeInvoice | null>(null);

  useEffect(() => {
    fetchMakes();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMakes = async () => {
    try {
      const res = await apiClient.get('/import-calculator/crsp/makes');
      setMakes(res.data);
    } catch (e) {
      console.error('Error fetching CRSP makes', e);
    }
  };

  // Live Auto-complete Search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/import-calculator/crsp/search?q=${encodeURIComponent(searchQuery.trim())}&limit=12`);
        setSearchResults(res.data || []);
        setShowSearchDropdown(true);
      } catch (e) {
        console.error('CRSP search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When Make changes, fetch its models
  useEffect(() => {
    if (selectedMake) {
      const fetchModels = async () => {
        try {
          const res = await apiClient.get(`/import-calculator/crsp/models?make=${encodeURIComponent(selectedMake)}`);
          setModels(res.data);
        } catch (e) {
          console.error('Error fetching CRSP models', e);
        }
      };
      fetchModels();
    } else {
      setModels([]);
    }
  }, [selectedMake]);

  // When Make and Model are selected, fetch all variants in CRSP
  useEffect(() => {
    if (selectedMake && selectedModel) {
      const fetchCrspVariants = async () => {
        try {
          const res = await apiClient.get(`/import-calculator/crsp?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&limit=100`);
          const variants = res.data.results || [];
          setCrspVariants(variants);

          if (variants.length > 0) {
            const first = variants[0];
            setSelectedCrsp(first);
            if (first.engineSize) setEngineSize(Number(first.engineSize));
            if (first.fuelType) setFuelType(first.fuelType);
            if (first.category) setVehicleType(first.category);
            setCustomCrsp(0);
          } else {
            setSelectedCrsp(null);
          }
        } catch (e) {
          console.error('Error fetching CRSP variants', e);
          setCrspVariants([]);
          setSelectedCrsp(null);
        }
      };
      fetchCrspVariants();
    } else {
      setCrspVariants([]);
      setSelectedCrsp(null);
    }
  }, [selectedMake, selectedModel]);

  const handleSelectSearchResult = (car: CrspData) => {
    setSelectedMake(car.make);
    setSelectedModel(car.model);
    setSelectedCrsp(car);
    if (car.engineSize) setEngineSize(Number(car.engineSize));
    if (car.fuelType) setFuelType(car.fuelType);
    if (car.category) setVehicleType(car.category);
    setCustomCrsp(0);
    setSearchQuery(`${car.make} ${car.model}`);
    setShowSearchDropdown(false);
  };

  const handleVariantChange = (crspId: string) => {
    const variant = crspVariants.find(v => v.id === crspId);
    if (variant) {
      setSelectedCrsp(variant);
      if (variant.engineSize) setEngineSize(Number(variant.engineSize));
      if (variant.fuelType) setFuelType(variant.fuelType);
      if (variant.category) setVehicleType(variant.category);
      setCustomCrsp(0);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/import-calculator/calculate', {
        crspId: selectedCrsp?.id,
        customCrsp: customCrsp > 0 ? customCrsp : undefined,
        yearOfManufacture: selectedYear,
        engineSize,
        fuelType,
        vehicleType,
        cifValue: cifValue > 0 ? cifValue : undefined
      });
      setResult(res.data);
      fetchRecommendations();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Calculation failed. Please verify vehicle parameters.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await apiClient.get(`/products?q=${encodeURIComponent(selectedMake + ' ' + selectedModel)}&limit=4`);
      setRecommendedParts(res.data.data || res.data || []);
    } catch (e) {
      console.error('Error fetching recommendations', e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Submit Proforma Invoice Request
  const handleRaiseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    setSubmittingInvoice(true);

    try {
      const payload = {
        customerName: invoiceForm.name,
        customerEmail: invoiceForm.email,
        customerPhone: invoiceForm.phone,
        customerPin: invoiceForm.pin || undefined,
        customerIdNumber: invoiceForm.nationalId || undefined,
        customerAddress: invoiceForm.address || undefined,
        crspId: selectedCrsp?.id,
        vehicleMake: selectedMake || 'Custom Import',
        vehicleModel: selectedModel || 'Custom Specification',
        modelNumber: selectedCrsp?.modelNumber || '',
        yearOfManufacture: selectedYear,
        engineSize,
        fuelType,
        vehicleType,
        transmission: selectedCrsp?.transmission || 'AT',
        driveConfiguration: selectedCrsp?.driveConfiguration || '2WD',
        customCrsp: customCrsp > 0 ? customCrsp : undefined,
        includeRegistration: invoiceForm.includeRegistration,
        notes: invoiceForm.notes
      };

      const res = await apiClient.post('/import-calculator/invoice', payload);
      const invoiceData = res.data.invoice || res.data;
      setSavedInvoice(invoiceData);
      setIsInvoiceModalOpen(false);

      if (res.data.accountCreated) {
        alert(`Your Concierge Buyer Account has been created!\nWe have sent your login credentials and tracking access to ${invoiceForm.email}.`);
      }

      handleDownloadDocument('COMPLETE_DOCKET', invoiceData);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to raise proforma invoice.');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Download Boardroom-Grade Masuma Proforma Invoice / Agreement / Complete Docket PDF (Zero Overlays)
  const handleDownloadDocument = (
    type: 'PROFORMA' | 'AGREEMENT' | 'COMPLETE_DOCKET' = 'COMPLETE_DOCKET',
    inv: ImportConciergeInvoice | null = savedInvoice
  ) => {
    if (!result && !inv) return;

    const crspBase = inv?.crspBenchmarkKes ?? (result ? result.cif / (1 - result.breakdown.depreciationRate) : 0);
    const depAmt = inv ? (Number(inv.crspBenchmarkKes) - Number(inv.depreciatedCrspKes)) : (result ? crspBase * result.breakdown.depreciationRate : 0);
    const cif = inv?.customsValueCifKes ?? result?.cif ?? 0;
    const duty = inv?.importDutyKes ?? result?.importDuty ?? 0;
    const excise = inv?.exciseDutyKes ?? result?.exciseDuty ?? 0;
    const vat = inv?.vatKes ?? result?.vat ?? 0;
    const idf = inv?.idfFeeKes ?? result?.idf ?? 0;
    const rdl = inv?.rdlFeeKes ?? result?.rdl ?? 0;
    const port = inv?.portChargesKes ?? result?.portCharges ?? 65000;
    const landed = inv?.landedVehicleValueKes ?? result?.landedVehicleValue ?? (cif + (result?.totalTaxes || 0) + port);
    const commission = inv?.sourcingCommissionKes ?? result?.sourcingCommission ?? (landed * 0.035);
    const grandTotal = inv?.grandTotalKes ?? result?.grandTotal ?? (landed + commission);
    const age = inv?.vehicleAge ?? result?.breakdown?.vehicleAge ?? (new Date().getFullYear() - selectedYear);

    const docInvoice: Partial<ImportConciergeInvoice> = {
      invoiceNumber: inv?.invoiceNumber || `INV-CON-${Date.now().toString().slice(-6)}`,
      customerName: inv?.customerName || invoiceForm.name || (user?.name || 'Valued Client'),
      customerEmail: inv?.customerEmail || invoiceForm.email || (user?.email || 'N/A'),
      customerPhone: inv?.customerPhone || invoiceForm.phone || (user?.phone || 'N/A'),
      customerPin: inv?.customerPin || invoiceForm.pin || '',
      customerIdNumber: inv?.customerIdNumber || invoiceForm.nationalId || '',
      customerAddress: inv?.customerAddress || invoiceForm.address || '',
      vehicleMake: inv?.vehicleMake || selectedMake || 'Custom Import',
      vehicleModel: inv?.vehicleModel || selectedModel || 'Custom Specification',
      modelNumber: inv?.modelNumber || selectedCrsp?.modelNumber || '',
      yearOfManufacture: inv?.yearOfManufacture || selectedYear,
      vehicleAge: age,
      engineSize: inv?.engineSize || engineSize,
      fuelType: inv?.fuelType || fuelType,
      vehicleType: inv?.vehicleType || vehicleType,
      transmission: inv?.transmission || selectedCrsp?.transmission || 'AT',
      driveConfiguration: inv?.driveConfiguration || selectedCrsp?.driveConfiguration || '2WD',
      crspBenchmarkKes: crspBase,
      depreciationRate: inv?.depreciationRate ?? (result?.breakdown?.depreciationRate || 0.65),
      depreciatedCrspKes: inv?.depreciatedCrspKes ?? (crspBase - depAmt),
      customsValueCifKes: cif,
      importDutyRate: inv?.importDutyRate ?? (result?.breakdown?.importDutyRate || 0.35),
      importDutyKes: duty,
      exciseDutyRate: inv?.exciseDutyRate ?? (result?.breakdown?.exciseDutyRate || 0.25),
      exciseDutyKes: excise,
      vatKes: vat,
      idfFeeKes: idf,
      rdlFeeKes: rdl,
      totalKraTaxesKes: duty + excise + vat + idf + rdl,
      portChargesKes: port,
      landedVehicleValueKes: landed,
      sourcingCommissionRate: 0.035,
      sourcingCommissionKes: commission,
      grandTotalKes: grandTotal,
      depositPaidKes: inv?.depositPaidKes || 0,
      cifPaidKes: inv?.cifPaidKes || 0,
      dutyPaidKes: inv?.dutyPaidKes || 0,
      balanceDueKes: inv?.balanceDueKes ?? grandTotal,
      status: inv?.status || 'PROFORMA',
      createdAt: inv?.createdAt || new Date().toISOString()
    };

    generateConciergeDocument(docInvoice, type);
  };

  const formatCurrency = (amount: number) => {
    return formatKes(amount);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <SEO 
        title={result ? `Import Tax for ${selectedMake} ${selectedModel} | Masuma Kenya Concierge` : "KRA CRSP Vehicle Import Duty Calculator & Concierge Kenya"}
        description={result ? `Official KRA import duty and landed cost for ${selectedMake} ${selectedModel} (${selectedYear}). Total estimated landed cost: ${formatCurrency(result.totalCost)}.` : "Accurate Kenya Revenue Authority CRSP 2025 vehicle import tax calculation. Sourcing, clearance, and 3.5% concierge commission."}
        keywords="KRA CRSP 2025, vehicle import duty Kenya, car import concierge Nairobi, import duty calculator"
      />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-masuma-orange bg-masuma-orange/10 px-3 py-1 rounded-full inline-block mb-2">
          Official KRA 2025 Tariff Schedule
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">
          Vehicle Import Concierge
        </h1>
        <p className="text-gray-500 font-medium text-xs sm:text-sm">
          Accurate KRA reverse valuation, duty tabulation, auction sourcing, and door-to-door vehicle delivery with transparent 3.5% concierge commission.
        </p>

        {/* Navigation Tabs */}
        <div className="inline-flex bg-gray-100 p-1 rounded-xl mt-4 border border-gray-200">
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center ${
              activeTab === 'CALCULATOR' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Calculator size={14} className="mr-1.5 text-masuma-orange" />
            Duty Calculator & Invoicing
          </button>
          <button
            onClick={() => setActiveTab('TRACKING')}
            className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center ${
              activeTab === 'TRACKING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Ship size={14} className="mr-1.5 text-blue-600" />
            Shipment Tracking
          </button>
        </div>
      </div>

      {activeTab === 'CALCULATOR' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center">
                <Car className="w-4 h-4 mr-2 text-masuma-orange" />
                Select Vehicle
              </h2>

              {/* Fast Autocomplete Search */}
              <div ref={searchRef} className="relative mb-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>Instant Catalog Search</span>
                  <span className="text-masuma-orange text-[9px] font-bold">5,700+ KRA Benchmarks</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                    placeholder="Search Make, Model, or Chassis..."
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-semibold focus:ring-2 focus:ring-masuma-orange focus:bg-white transition-all"
                  />
                  {isSearching && (
                    <Loader2 size={14} className="animate-spin text-masuma-orange absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {searchResults.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectSearchResult(item)}
                        className="p-3 hover:bg-orange-50/50 cursor-pointer transition-colors flex justify-between items-center"
                      >
                        <div>
                          <p className="font-black text-gray-900 text-xs">{item.make} {item.model}</p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {[item.modelNumber, item.engineSize ? `${item.engineSize}cc` : '', item.fuelType].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                        <span className="text-xs font-black text-masuma-orange shrink-0">
                          {formatCurrency(item.crspValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black text-gray-300 uppercase">Or Select Manually</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <div className="space-y-4">
                {/* Make & Model Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Make</label>
                    <select 
                      value={selectedMake}
                      onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel(''); }}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-bold focus:ring-2 focus:ring-masuma-orange"
                    >
                      <option value="">Select Make</option>
                      {makes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Model</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!selectedMake}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-bold focus:ring-2 focus:ring-masuma-orange disabled:opacity-40"
                    >
                      <option value="">Select Model</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Specific Variant Picker */}
                {crspVariants.length > 1 && (
                  <div className="bg-orange-50/60 border border-orange-200/60 rounded-2xl p-3.5">
                    <label className="block text-[10px] font-black text-masuma-orange uppercase tracking-widest mb-1.5 flex items-center">
                      <Settings2 className="w-3 h-3 mr-1" />
                      Select Variant / Trim
                    </label>
                    <select
                      value={selectedCrsp?.id || ''}
                      onChange={e => handleVariantChange(e.target.value)}
                      className="w-full rounded-xl border-orange-200 bg-white p-2 text-xs font-bold text-gray-800"
                    >
                      {crspVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.model} {v.modelNumber ? `(${v.modelNumber})` : ''} - {v.engineSize ? `${v.engineSize}cc` : ''} {v.fuelType} ({formatCurrency(v.crspValue)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Year of Manufacture (YOM) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Year of Manufacture (YOM)
                    </label>
                    <span className="text-[10px] font-black text-masuma-orange">
                      Age: {currentYear - selectedYear} Yrs
                    </span>
                  </div>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs font-black text-gray-900 focus:ring-2 focus:ring-masuma-orange"
                  >
                    {allowedYears.map(y => (
                      <option key={y} value={y}>
                        {y} (Depreciation: {Math.round((DIRECT_IMPORT_DEPRECIATION[currentYear - y] || 0.65) * 100)}%)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[9px] text-gray-400 font-medium">
                    Kenya 8-year statutory age ceiling: Vehicles older than {currentYear - 8} cannot be cleared by KRA.
                  </p>
                </div>

                {/* Engine Size & Fuel Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Engine (CC)</label>
                    <input 
                      type="number"
                      value={engineSize}
                      onChange={e => setEngineSize(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fuel Type</label>
                    <select
                      value={fuelType}
                      onChange={e => setFuelType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2 text-xs font-bold"
                    >
                      <option value="GASOLINE">Petrol</option>
                      <option value="DIESEL">Diesel</option>
                      <option value="ELECTRIC">Electric (EV)</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="PLUG-IN HYBRID">Plug-in Hybrid</option>
                    </select>
                  </div>
                </div>

                {/* Manual CRSP fallback if needed */}
                {!selectedCrsp && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs">
                    <label className="block text-[10px] font-black text-masuma-orange uppercase mb-1">Manual KRA CRSP (KES)</label>
                    <input
                      type="number"
                      value={customCrsp || ''}
                      onChange={e => setCustomCrsp(Number(e.target.value))}
                      placeholder="e.g. 6500000"
                      className="w-full p-2 bg-white rounded-lg border border-orange-200 text-xs font-bold"
                    />
                  </div>
                )}

                {/* Calculate Trigger Button */}
                <button
                  onClick={handleCalculate}
                  disabled={loading || (!selectedCrsp && !customCrsp)}
                  className="w-full bg-masuma-orange text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-40 shadow-md shadow-orange-500/20"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <>
                      <Calculator size={16} className="mr-2" />
                      Tabulate KRA Duties & Costs
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Benefits Card */}
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-masuma-orange rounded-full blur-3xl opacity-20" />
              <div className="relative z-10 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-masuma-orange flex items-center">
                  <ShieldCheck size={13} className="mr-1.5" /> Full Concierge Sourcing
                </span>
                <h3 className="text-base font-black uppercase tracking-tight">Direct Japan & UK Sourcing</h3>
                <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                  We verify vehicle condition at auction, inspect chassis, book sea freight, manage KRA clearance, and deliver registered vehicle to your door for a fixed 3.5% fee.
                </p>
              </div>
            </div>
          </div>

          {/* Results & Breakdown Section */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-bold">
                <AlertTriangle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            {!result && !error && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-full min-h-[360px] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                  <Calculator size={24} className="text-gray-300" />
                </div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight mb-1">Ready to Tabulate</h3>
                <p className="text-xs text-gray-500 max-w-sm font-medium">
                  Search or select any vehicle from the 2025 KRA CRSP schedule to inspect customs duties, statutory taxes, and generate an official proforma invoice.
                </p>
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary Banner */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 p-5 sm:p-6 text-white relative">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-masuma-orange mb-0.5 block">
                          Total Landed Cost (Turnkey)
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                          {formatCurrency(result.grandTotal || result.totalCost)}
                        </h2>
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">
                          {result.vehicleName || `${selectedMake} ${selectedModel}`} ({selectedYear} YOM • {result.breakdown.age} Yrs)
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5 block">
                          KRA Taxes + Sourcing Fee
                        </span>
                        <p className="text-lg sm:text-xl font-black text-masuma-orange">
                          {formatCurrency((result.totalTaxes || 0) + (result.sourcingCommission || 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabulated Line Items */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-500 text-[11px]">Official KRA Benchmark CRSP (New)</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {formatCurrency(result.cif / (1 - result.breakdown.depreciationRate))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 bg-orange-50/50 -mx-3 px-3 py-1.5 rounded-lg">
                      <span className="font-bold text-masuma-orange flex items-center text-[11px]">
                        Allowable Age Depreciation ({Math.round(result.breakdown.depreciationRate * 100)}%)
                        <Info size={11} className="ml-1 cursor-help" />
                      </span>
                      <span className="font-bold text-masuma-orange text-xs">
                        -{formatCurrency((result.cif / (1 - result.breakdown.depreciationRate)) * result.breakdown.depreciationRate)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <div>
                        <span className="font-bold text-gray-900 block text-[11px]">Deductive Customs CIF Value</span>
                        <span className="text-[9px] text-gray-400">{result.breakdown.categoryRule}</span>
                      </div>
                      <span className="font-black text-gray-900 text-xs">{formatCurrency(result.cif)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">Import Duty ({Math.round(result.breakdown.importDutyRate * 100)}%)</span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.importDuty)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">
                        Excise Duty ({result.breakdown.fixedExcise ? 'Fixed KES 12,953' : `${Math.round(result.breakdown.exciseDutyRate * 100)}%`})
                      </span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.exciseDuty)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">Value Added Tax (VAT 16%)</span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.vat)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">Import Declaration Fee (IDF 2.5%)</span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.idf)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">Railway Development Levy (RDL 2.0%)</span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.rdl)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600 text-[11px]">Port Handling & CFS Clearance</span>
                      <span className="font-bold text-gray-900 text-xs">{formatCurrency(result.portCharges || 65000)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200 font-bold bg-gray-50 -mx-3 px-3 py-2 rounded-lg">
                      <span className="text-gray-900 uppercase tracking-wider text-[10px]">Total Landed Vehicle Value</span>
                      <span className="text-gray-900 text-xs font-black">{formatCurrency(result.landedVehicleValue || (result.cif + result.totalTaxes + 65000))}</span>
                    </div>

                    {/* Concierge Sourcing Fee (3.5%) */}
                    <div className="flex justify-between items-center text-xs py-2.5 bg-orange-50/70 border border-orange-200/80 -mx-3 px-3 rounded-lg">
                      <div>
                        <span className="font-black text-masuma-orange uppercase tracking-wider block text-[11px]">
                          Masuma Sourcing Commission (3.5%)
                        </span>
                        <span className="text-[9px] text-gray-500">Includes Japanese inspection, auction bidding, shipping, and doorstep handoff</span>
                      </div>
                      <span className="font-black text-masuma-orange text-xs">
                        {formatCurrency(result.sourcingCommission || (result.totalCost * 0.035))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="flex-1 bg-masuma-orange text-white py-3 px-5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center shadow-md shadow-orange-500/20"
                    >
                      <FileText size={16} className="mr-2" />
                      Raise Official Proforma Invoice
                    </button>
                    <button
                      onClick={() => handleDownloadDocument('COMPLETE_DOCKET', savedInvoice)}
                      className="sm:w-auto bg-gray-900 text-white py-3 px-5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center shadow-md shadow-black/10"
                    >
                      <Download size={16} className="mr-2" />
                      Download Docket (Invoice & Agreement)
                    </button>
                  </div>

                  {savedInvoice && (
                    <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                      <span className="text-xs font-bold text-gray-500 self-center mr-2">Download Individual Docs:</span>
                      <button
                        onClick={() => handleDownloadDocument('PROFORMA', savedInvoice)}
                        className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                      >
                        <FileText size={13} className="mr-1 text-masuma-orange" />
                        Proforma Invoice
                      </button>
                      <button
                        onClick={() => handleDownloadDocument('AGREEMENT', savedInvoice)}
                        className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                      >
                        <ShieldCheck size={13} className="mr-1 text-blue-600" />
                        Kenya Import Agreement
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <ImportTracking setView={setView} />
        </div>
      )}

      {/* Proforma Invoice Modal (Sleek, Compact & Responsive) */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
            onClick={() => setIsInvoiceModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 relative overflow-hidden my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Sticky Top Header - Guaranteed Visible Above Nav */}
              <div className="flex-shrink-0 bg-white px-4 sm:px-5 py-2.5 sm:py-3 border-b border-gray-100 flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-100 text-masuma-orange rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-gray-900 leading-tight">
                      Raise Proforma Invoice
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium line-clamp-1">
                      Official quotation, Lipa Na M-Pesa & Kenyan Direct Import Agreement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors flex-shrink-0 ml-2 shadow-sm touch-target"
                  aria-label="Close modal"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Form with Scrollable Body and Pinned Sticky Footer */}
              <form onSubmit={handleRaiseInvoice} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">Full Name / Company *</label>
                    <div className="relative">
                      <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={invoiceForm.name}
                        onChange={e => setInvoiceForm({...invoiceForm, name: e.target.value})}
                        placeholder="e.g. John Kamau"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-masuma-orange"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">Email Address *</label>
                      <div className="relative">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={invoiceForm.email}
                          onChange={e => setInvoiceForm({...invoiceForm, email: e.target.value})}
                          placeholder="john@example.com"
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-masuma-orange"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">Mobile Phone (M-Pesa) *</label>
                      <div className="relative">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={invoiceForm.phone}
                          onChange={e => setInvoiceForm({...invoiceForm, phone: e.target.value})}
                          placeholder="0712 345 678"
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-masuma-orange"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">KRA PIN (Optional)</label>
                      <input
                        type="text"
                        value={invoiceForm.pin}
                        onChange={e => setInvoiceForm({...invoiceForm, pin: e.target.value.toUpperCase()})}
                        placeholder="e.g. A012345678B"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold uppercase focus:ring-1 focus:ring-masuma-orange"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">National ID / Passport (Optional)</label>
                      <input
                        type="text"
                        value={invoiceForm.nationalId}
                        onChange={e => setInvoiceForm({...invoiceForm, nationalId: e.target.value})}
                        placeholder="e.g. 12345678"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-masuma-orange"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">Physical / Delivery Address</label>
                    <input
                      type="text"
                      value={invoiceForm.address}
                      onChange={e => setInvoiceForm({...invoiceForm, address: e.target.value})}
                      placeholder="e.g. Kilimani, Nairobi / P.O. Box 45000-00100"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:ring-1 focus:ring-masuma-orange"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-0.5 tracking-wider">Vehicle Specs / Special Preferences</label>
                    <textarea
                      rows={2}
                      value={invoiceForm.notes}
                      onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                      placeholder="e.g. White exterior, leather seats, sunroof, low mileage..."
                      className="w-full p-2 rounded-lg border border-gray-200 text-xs font-medium focus:ring-1 focus:ring-masuma-orange"
                    />
                  </div>

                  {/* NTSA Registration Package Toggle */}
                  <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invoiceForm.includeRegistration}
                        onChange={e => setInvoiceForm({...invoiceForm, includeRegistration: e.target.checked})}
                        className="mt-0.5 rounded border-orange-300 text-masuma-orange focus:ring-masuma-orange text-xs"
                      />
                      <div>
                        <span className="text-[11px] font-black text-gray-900 block">
                          Include Kenyan Registration & Logbook Package (KES 25,000)
                        </span>
                        <span className="text-[10px] text-gray-600 block mt-0.5 leading-tight">
                          NTSA inspection, metal plates, safety permit & direct logbook transfer.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Buyer Account Provisioning Notice */}
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg text-[10px] text-blue-900 flex items-center gap-1.5">
                    <User size={13} className="text-blue-600 flex-shrink-0" />
                    <span>A secure <strong>Buyer Account</strong> will be created automatically to track your vehicle on every stop.</span>
                  </div>

                  {/* Price Breakdown Summary */}
                  <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-gray-600">Total Landed Amount:</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(result?.landedVehicleValue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-masuma-orange">Concierge Sourcing Fee (3.5%):</span>
                      <span className="text-masuma-orange font-bold">{formatCurrency(result?.sourcingCommission || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-black pt-1.5 border-t border-orange-200">
                      <span className="text-gray-900">Total Proforma Payable:</span>
                      <span className="text-masuma-orange text-sm">{formatCurrency(result?.grandTotal || result?.totalCost || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Pinned Sticky Action Footer - Always Visible */}
                <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur-sm border-t border-gray-100 px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-end gap-2.5 z-10">
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-bold text-xs uppercase hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInvoice}
                    className="flex-1 sm:flex-none px-4 py-2 bg-masuma-orange text-white rounded-lg font-black text-xs uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-50 shadow-md shadow-orange-500/20"
                  >
                    {submittingInvoice ? (
                      <Loader2 size={15} className="animate-spin mr-1.5" />
                    ) : (
                      <>
                        <Check size={15} className="mr-1.5" />
                        Confirm & Generate PDF Invoice
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImportCalculator;
