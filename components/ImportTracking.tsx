import React, { useState, useEffect } from 'react';
import { 
  Ship, Package, CheckCircle2, Clock, 
  MapPin, FileText, DollarSign, Calendar,
  ChevronRight, AlertCircle, ExternalLink,
  Anchor, Truck, Key, Search, Download,
  Printer, ShieldCheck, Check, RefreshCw,
  Phone, User, Car
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { ImportConciergeInvoice } from '../types';
import { generateConciergeDocument, formatKes } from '../utils/conciergeDocuments';
import { printDocument } from '../utils/pdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportTrackingProps {
  setView?: (view: any) => void;
}

export const CONCIERGE_STOPS = [
  { id: 'PROFORMA', label: 'Proforma & Account Provisioned', location: 'Nairobi HQ', icon: FileText },
  { id: 'SOURCING_DEPOSIT_PAID', label: '30% Sourcing Deposit Confirmed', location: 'Tokyo / London Auction', icon: DollarSign },
  { id: 'VEHICLE_PURCHASED', label: 'Vehicle Secured at Auction', location: 'Foreign Yard', icon: Car },
  { id: 'EXPORT_INSPECTION', label: 'KEBS KS 1515:2000 Inspection Passed', location: 'Yokohama / UK Port', icon: ShieldCheck },
  { id: 'IN_TRANSIT', label: 'Ocean Ro-Ro Vessel Transit', location: 'High Seas Voyage', icon: Ship },
  { id: 'ARRIVED_MOMBASA', label: 'Berthed at Port of Mombasa', location: 'Kilindini Harbour', icon: Anchor },
  { id: 'CUSTOMS_CLEARING', label: 'KRA Taxes & CFS Port Clearance', location: 'Mombasa CFS', icon: Package },
  { id: 'NTSA_REGISTRATION', label: 'NTSA Inspection & Number Plates', location: 'NTSA Station', icon: Key },
  { id: 'READY_FOR_COLLECTION', label: 'Arrived at Nairobi Delivery Hub', location: 'Industrial Area Hub', icon: Truck },
  { id: 'RELEASED', label: 'Official Handover & Delivery', location: 'Client Doorstep', icon: CheckCircle2 }
];

const ImportTracking: React.FC<ImportTrackingProps> = ({ setView }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedInvoice, setTrackedInvoice] = useState<ImportConciergeInvoice | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<any[]>([]);
  const [myInvoices, setMyInvoices] = useState<ImportConciergeInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('masuma_auth_token');
    if (token) {
      setIsAuthenticated(true);
      fetchMyInvoices();
    }
  }, []);

  const fetchMyInvoices = async () => {
    try {
      const res = await apiClient.get('/import-calculator/my-invoices');
      setMyInvoices(res.data || []);
      if (res.data && res.data.length > 0 && !trackedInvoice) {
        selectInvoiceToTrack(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to load my invoices:', e);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchError(null);

    try {
      const res = await apiClient.get(`/import-calculator/track/${encodeURIComponent(searchQuery.trim())}`);
      setTrackedInvoice(res.data.invoice);
      setTrackingHistory(res.data.trackingHistory || []);
    } catch (err: any) {
      setTrackedInvoice(null);
      setTrackingHistory([]);
      setSearchError(err.response?.data?.error || 'No vehicle import record found for this reference.');
    } finally {
      setLoading(false);
    }
  };

  const selectInvoiceToTrack = (inv: ImportConciergeInvoice) => {
    setTrackedInvoice(inv);
    let history: any[] = [];
    try {
      history = JSON.parse(inv.trackingHistory || '[]');
    } catch (e) {
      history = [];
    }
    setTrackingHistory(history);
  };

  const getStopIndex = (status: string) => {
    if (!status) return 0;
    const match = CONCIERGE_STOPS.findIndex(s => s.id === status);
    if (match !== -1) return match;
    if (status === 'COMPLETED' || status === 'FULLY_PAID') return CONCIERGE_STOPS.length - 1;
    if (status === 'CONFIRMED') return 1;
    return 0;
  };

  const currentStopIndex = trackedInvoice ? getStopIndex(trackedInvoice.status) : 0;

  const totalPaid = Number(trackedInvoice?.depositPaidKes || 0) + Number(trackedInvoice?.cifPaidKes || 0) + Number(trackedInvoice?.dutyPaidKes || 0);
  const grandTotal = Number(trackedInvoice?.grandTotalKes || 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  return (
    <div className="space-y-8">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 text-white rounded-3xl p-8 shadow-xl border border-gray-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-masuma-orange/10 rounded-full blur-3xl -z-0" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-masuma-orange bg-masuma-orange/20 px-3 py-1 rounded-full inline-block mb-3">
            Real-Time Vehicle Journey Portal
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">
            Track Vehicle Import on Every Stop
          </h2>
          <p className="text-gray-300 text-sm font-medium leading-relaxed mb-6">
            Instant tracking from Tokyo / UK auctions, ocean Ro-Ro voyage, Port of Mombasa CFS clearance, KRA customs, NTSA registration marks, to doorstep handover.
          </p>

          {/* Quick Lookup Form */}
          <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter Invoice Number (e.g. INV-CON-943349) or Phone / Chassis..."
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white placeholder-gray-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-masuma-orange"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-masuma-orange hover:bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              Track Vehicle
            </button>
          </form>

          {/* My Invoices Quick Pills (if logged in) */}
          {myInvoices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">Your Registered Imports:</span>
              {myInvoices.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => selectInvoiceToTrack(inv)}
                  className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                    trackedInvoice?.id === inv.id 
                      ? 'bg-masuma-orange text-white shadow-sm' 
                      : 'bg-white/10 text-gray-200 hover:bg-white/20'
                  }`}
                >
                  {inv.vehicleMake} {inv.vehicleModel} ({inv.invoiceNumber})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-2xl text-xs font-bold flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Tracking Content */}
      {trackedInvoice && (
        <div className="space-y-8" id="printable-tracking-sheet">
          {/* Main Status & Vehicle Card */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-gray-900 tracking-tight">
                    {trackedInvoice.invoiceNumber}
                  </span>
                  <span className="bg-masuma-orange/10 text-masuma-orange text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {CONCIERGE_STOPS[currentStopIndex]?.label || trackedInvoice.status}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  {trackedInvoice.vehicleMake} {trackedInvoice.vehicleModel} {trackedInvoice.modelNumber ? `(${trackedInvoice.modelNumber})` : ''}
                </h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">
                  Year of Manufacture: {trackedInvoice.yearOfManufacture} ({trackedInvoice.vehicleAge} Years Old) • Engine: {trackedInvoice.engineSize} CC
                </p>
              </div>

              {/* Financial Snapshot */}
              <div className="text-right">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Total Landed Amount</span>
                <span className="text-2xl font-black text-masuma-orange block">
                  {formatKes(grandTotal)}
                </span>
                <span className="text-xs font-bold text-emerald-600 mt-1 block">
                  Paid to Date: {formatKes(totalPaid)} | Balance: {formatKes(balanceDue)}
                </span>
              </div>
            </div>

            {/* Carrier & Legal Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-5 rounded-2xl text-xs">
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Chassis & Engine</span>
                <p className="font-mono font-black text-gray-900">{trackedInvoice.chassisNumber || 'Verified Foreign Spec'}</p>
                <p className="text-gray-600 font-mono">Engine: {trackedInvoice.engineNumber || 'Inspected'}</p>
                <p className="text-gray-600">Color: {trackedInvoice.exteriorColor || 'Factory Original'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Transit Carrier & Port</span>
                <p className="font-bold text-gray-900">Vessel: {trackedInvoice.vesselName || 'Ocean Ro-Ro Liner'}</p>
                <p className="text-gray-600">Origin: {trackedInvoice.portOfLoading || 'Yokohama Port, Japan'}</p>
                <p className="text-gray-600">Port of Discharge: {trackedInvoice.portOfDischarge || 'Port of Mombasa'}</p>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">KRA & NTSA Registration</span>
                <p className="font-bold text-gray-900">KRA Entry: {trackedInvoice.kraEntryNumber || 'Simba/ICMS Lodged'}</p>
                <p className="font-bold text-masuma-orange">
                  Plate: {trackedInvoice.registrationPlate || 'Pending Registration Mark'}
                </p>
                <p className="text-gray-600">Logbook: Transfer to Buyer</p>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Client Profile</span>
                <p className="font-bold text-gray-900">{trackedInvoice.customerName}</p>
                <p className="text-gray-600">{trackedInvoice.customerPhone}</p>
                {trackedInvoice.customerPin && <p className="text-gray-500 font-mono">PIN: {trackedInvoice.customerPin}</p>}
              </div>
            </div>

            {/* 10-STOP PROGRESS TIMELINE */}
            <div className="pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-6 flex items-center justify-between">
                <span>Consignment Milestone Progression (10 Stops):</span>
                <span className="text-masuma-orange font-bold">
                  Stop {currentStopIndex + 1} of {CONCIERGE_STOPS.length} ({Math.round(((currentStopIndex + 1) / CONCIERGE_STOPS.length) * 100)}% Complete)
                </span>
              </h4>

              <div className="space-y-4">
                {CONCIERGE_STOPS.map((stop, idx) => {
                  const Icon = stop.icon;
                  const isCompleted = idx < currentStopIndex;
                  const isCurrent = idx === currentStopIndex;
                  const isUpcoming = idx > currentStopIndex;

                  // Find historical audit entry if exists
                  const historyEntry = trackingHistory.find((h: any) => h.stop === stop.id);

                  return (
                    <div 
                      key={stop.id}
                      className={`flex items-start gap-4 p-4 rounded-2xl transition-all border ${
                        isCurrent 
                          ? 'bg-orange-50/70 border-orange-200 shadow-sm ring-1 ring-orange-300' 
                          : isCompleted 
                            ? 'bg-gray-50/70 border-gray-200' 
                            : 'bg-white border-dashed border-gray-200 opacity-60'
                      }`}
                    >
                      {/* Icon Circle */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
                        isCurrent 
                          ? 'bg-masuma-orange text-white shadow-md shadow-orange-500/30' 
                          : isCompleted 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h5 className={`text-xs font-black uppercase tracking-tight ${
                            isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                          }`}>
                            Stop {idx + 1}: {stop.label}
                          </h5>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${
                            isCurrent 
                              ? 'bg-masuma-orange text-white' 
                              : isCompleted 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCurrent ? 'Active Stop' : isCompleted ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{stop.location}</span>
                          {historyEntry?.timestamp && (
                            <>
                              <span>•</span>
                              <Calendar size={12} className="text-gray-400" />
                              <span>{new Date(historyEntry.timestamp).toLocaleString('en-GB')}</span>
                            </>
                          )}
                        </div>

                        {historyEntry?.notes && (
                          <p className="mt-2 text-xs text-gray-700 bg-white/80 p-2.5 rounded-xl border border-gray-200">
                            {historyEntry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Download & Print Bar */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => generateConciergeDocument(trackedInvoice, 'PROFORMA')}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <FileText size={14} className="text-masuma-orange" />
                  Download Proforma Invoice
                </button>
                <button
                  onClick={() => generateConciergeDocument(trackedInvoice, 'AGREEMENT')}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} className="text-blue-600" />
                  Download Kenyan Agreement
                </button>
                {(trackedInvoice.status === 'RELEASED' || trackedInvoice.status === 'COMPLETED') && (
                  <button
                    onClick={() => generateConciergeDocument(trackedInvoice, 'RELEASE_ORDER')}
                    className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Check size={14} className="text-emerald-700" />
                    Handover Certificate
                  </button>
                )}
                <button
                  onClick={() => generateConciergeDocument(trackedInvoice, 'COMPLETE_DOCKET')}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Download Full Docket
                </button>
              </div>

              {/* Settlement Instructions */}
              {balanceDue > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-xs font-medium text-orange-900 flex items-center gap-2">
                  <span className="font-bold">Lipa Na M-Pesa Paybill: 247247</span>
                  <span>|</span>
                  <span>Account: <strong>{trackedInvoice.invoiceNumber}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Login / Registration Callout (If Unauthenticated) */}
      {!isAuthenticated && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-orange-100 text-masuma-orange rounded-2xl flex items-center justify-center mx-auto font-bold">
            <User size={24} />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            Buyer Account Access
          </h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
            When you raise a vehicle concierge request, a buyer account is automatically provisioned for you. Sign in with your email and temporary password to see all your imports in one dashboard.
          </p>
          <button
            onClick={() => setView?.('LOGIN')}
            className="w-full bg-masuma-orange text-white py-3.5 rounded-xl font-black uppercase tracking-wider hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 text-xs"
          >
            Sign In to Buyer Portal
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportTracking;
