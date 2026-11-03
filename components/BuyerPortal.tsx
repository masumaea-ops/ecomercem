import React, { useState, useEffect } from 'react';
import { 
  Car, Ship, FileText, ShieldCheck, Download, 
  Clock, CheckCircle2, AlertCircle, ArrowRight, 
  MapPin, User, Mail, Phone, Key, Package, 
  DollarSign, RefreshCw, LogOut, Check, ChevronRight,
  ExternalLink, Building2, Truck, Shield, AlertTriangle, Save
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { ImportConciergeInvoice } from '../types';
import { generateConciergeDocument, formatKes } from '../utils/conciergeDocuments';
import { MILESTONE_STOPS, getStopInfo } from './admin/ImportAdmin';

interface BuyerPortalProps {
  user: any;
  setView: (view: any) => void;
  onLogout?: () => void;
}

interface PersonalOrder {
  id: string;
  orderNumber: string;
  date: string;
  total: number;
  status: string;
  paymentMethod: string;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    qty: number;
    price: number;
    image?: string;
  }>;
}

interface PersonalQuote {
  id: string;
  quoteNumber: string;
  date: string;
  total: number;
  status: string;
  type: string;
  vin?: string;
  itemsCount: number;
}

const BuyerPortal: React.FC<BuyerPortalProps> = ({ user, setView, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'INVOICES' | 'PARTS' | 'PROFILE'>('VEHICLES');

  // Invoices & Vehicles
  const [invoices, setInvoices] = useState<ImportConciergeInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<ImportConciergeInvoice | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Orders & Quotes
  const [orders, setOrders] = useState<PersonalOrder[]>([]);
  const [quotes, setQuotes] = useState<PersonalQuote[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    taxId: user?.taxId || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchOrdersAndQuotes();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await apiClient.get('/import-calculator/my-invoices');
      const data = res.data || [];
      setInvoices(data);
      if (data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(data[0]);
      }
    } catch (err) {
      console.error('Failed to load buyer invoices:', err);
      showFeedback('Could not retrieve your import orders.', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchOrdersAndQuotes = async () => {
    setLoadingOrders(true);
    try {
      const [ordersRes, quotesRes] = await Promise.allSettled([
        apiClient.get('/orders/my'),
        apiClient.get('/quotes/my')
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data || []);
      }
      if (quotesRes.status === 'fulfilled') {
        setQuotes(quotesRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load orders or quotes:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      showFeedback('New passwords do not match!', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        address: profileForm.address,
        taxId: profileForm.taxId,
        newPassword: profileForm.newPassword || undefined
      });

      showFeedback('Profile particulars updated successfully!');
      setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Metrics summary
  const totalLandedValue = invoices.reduce((sum, inv) => sum + Number(inv.grandTotalKes || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => 
    sum + Number(inv.depositPaidKes || 0) + Number(inv.cifPaidKes || 0) + Number(inv.dutyPaidKes || 0), 0
  );
  const totalBalanceDue = Math.max(0, totalLandedValue - totalPaid);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md transition-all ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        )}

        {/* TOP WELCOME BANNER & STATS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} /> Verified Buyer Portal
                </span>
                <span className="text-xs text-gray-400 font-bold">•</span>
                <span className="text-xs text-gray-500 font-medium">{user.email}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900">
                Karibu, {user.fullName || user.name || 'Valued Client'}
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Manage your motor vehicle concierge imports, official invoices, legal agreements, and live 10-milestone shipment tracking.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setView('IMPORT_CALCULATOR')}
                className="flex-1 md:flex-none px-4 py-2.5 bg-masuma-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <Car size={14} /> Calculate New Import
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  title="Sign out of account"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              )}
            </div>
          </div>

          {/* FINANCIAL STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Active Imports</span>
              <span className="text-xl font-black text-gray-900">{invoices.length} Vehicles</span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Total Invoiced</span>
              <span className="text-xl font-black text-gray-900">{formatKes(totalLandedValue)}</span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">Settled Amount</span>
              <span className="text-xl font-black text-emerald-700">{formatKes(totalPaid)}</span>
            </div>
            <div className="bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-900 block mb-0.5">Balance Due</span>
              <span className="text-xl font-black text-masuma-orange">{formatKes(totalBalanceDue)}</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex overflow-x-auto gap-2 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm scrollbar-none">
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'VEHICLES' ? 'bg-masuma-orange text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Ship size={14} /> My Vehicle Imports & Tracking ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'INVOICES' ? 'bg-masuma-orange text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <FileText size={14} /> Proforma Invoices & Agreements
          </button>
          <button
            onClick={() => setActiveTab('PARTS')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'PARTS' ? 'bg-masuma-orange text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Package size={14} /> Spare Parts Orders ({orders.length + quotes.length})
          </button>
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'PROFILE' ? 'bg-masuma-orange text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <User size={14} /> Account Profile & PIN
          </button>
        </div>

        {/* TAB 1: VEHICLES & LIVE TRACKING */}
        {activeTab === 'VEHICLES' && (
          <div className="space-y-6">
            {loadingInvoices ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <RefreshCw size={24} className="animate-spin text-masuma-orange mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-bold">Loading your vehicle records...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200">
                <Car size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-black text-gray-900 uppercase">No Active Vehicle Imports Yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
                  You have not raised any vehicle concierge import invoices yet. Use our KRA CRSP 2025 Calculator to tabulate duties and request a vehicle sourcing invoice.
                </p>
                <button
                  onClick={() => setView('IMPORT_CALCULATOR')}
                  className="px-6 py-3 bg-masuma-orange text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-orange-600 transition"
                >
                  Open Import Concierge Calculator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Vehicle Selector List */}
                <div className="lg:col-span-1 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block px-1">
                    Select Vehicle to Track ({invoices.length}):
                  </span>
                  {invoices.map(inv => {
                    const stopInfo = getStopInfo(inv.status);
                    const isSelected = selectedInvoice?.id === inv.id;

                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50/70 border-masuma-orange shadow-sm ring-2 ring-masuma-orange/30'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-mono text-[11px] font-black text-gray-900">{inv.invoiceNumber}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-masuma-orange/10 text-masuma-orange">
                            Stop {stopInfo.index + 1} / 10
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900">
                          {inv.vehicleMake} {inv.vehicleModel}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {inv.yearOfManufacture} YOM • {inv.engineSize} CC • {inv.fuelType}
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-[10px]">
                          <span className="text-gray-400 font-bold">{stopInfo.stop.location}</span>
                          <span className="text-masuma-orange font-bold flex items-center gap-1">
                            Live Tracking <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Detailed Live 10-Milestone Tracking Dashboard */}
                {selectedInvoice && (() => {
                  const stopInfo = getStopInfo(selectedInvoice.status);
                  let history: any[] = [];
                  try {
                    history = JSON.parse(selectedInvoice.trackingHistory || '[]');
                  } catch (e) {
                    history = [];
                  }

                  const totalPaid = Number(selectedInvoice.depositPaidKes || 0) + Number(selectedInvoice.cifPaidKes || 0) + Number(selectedInvoice.dutyPaidKes || 0);
                  const balance = Math.max(0, Number(selectedInvoice.grandTotalKes || 0) - totalPaid);

                  return (
                    <div className="lg:col-span-2 space-y-5">
                      
                      {/* Active Status Banner */}
                      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-masuma-orange bg-orange-100 px-3 py-1 rounded-full">
                              Stop {stopInfo.index + 1} of 10: {stopInfo.stop.label}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase mt-2">
                              {selectedInvoice.vehicleMake} {selectedInvoice.vehicleModel} ({selectedInvoice.yearOfManufacture})
                            </h2>
                            <p className="text-xs text-gray-500 font-medium">
                              VIN/Chassis: <strong className="font-mono text-gray-900">{selectedInvoice.chassisNumber || 'Verified at Auction'}</strong> • Engine: {selectedInvoice.engineSize} CC
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <span className="text-[10px] font-black uppercase text-gray-400 block">Settlement Progress</span>
                            <span className="text-lg font-black text-emerald-700 block">{formatKes(totalPaid)} Paid</span>
                            <span className="text-[11px] text-gray-500 font-bold">Balance: {formatKes(balance)}</span>
                          </div>
                        </div>

                        {/* 10-Segment Interactive Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-gray-600">Transit Stage Completion</span>
                            <span className="text-masuma-orange font-black">{Math.round(((stopInfo.index + 1) / 10) * 100)}%</span>
                          </div>
                          <div className="grid grid-cols-10 gap-0.5 sm:gap-1.5 h-2.5 sm:h-3 rounded-full overflow-hidden bg-gray-100">
                            {MILESTONE_STOPS.map((st, idx) => {
                              const isDone = idx < stopInfo.index;
                              const isCurrent = idx === stopInfo.index;
                              return (
                                <div
                                  key={st.id}
                                  title={`Stop ${st.step}: ${st.label}`}
                                  className={`h-full rounded-sm transition-all ${
                                    isCurrent ? 'bg-masuma-orange ring-1 sm:ring-2 ring-inset ring-white animate-pulse' : isDone ? 'bg-emerald-500' : 'bg-gray-200'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Logistics Summary Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs font-medium">
                          <div>
                            <span className="text-gray-400 font-bold uppercase text-[10px] block">Carrier / Ro-Ro</span>
                            <p className="font-black text-gray-900 mt-0.5">{selectedInvoice.vesselName || 'Ocean Ro-Ro Vessel'}</p>
                            <p className="text-gray-500 text-[10px]">{selectedInvoice.voyageNumber || 'Direct Route'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase text-[10px] block">Bill of Lading (BL)</span>
                            <p className="font-mono font-bold text-gray-900 mt-0.5">{selectedInvoice.billOfLadingNumber || 'MOLU-Assigned'}</p>
                            <p className="text-gray-500 text-[10px]">Port of Loading: {selectedInvoice.portOfLoading || 'Yokohama'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase text-[10px] block">Port Arrival (ETA)</span>
                            <p className="font-bold text-gray-900 mt-0.5">
                              {selectedInvoice.etaDate ? new Date(selectedInvoice.etaDate).toLocaleDateString('en-GB') : 'Approx 30-35 Days'}
                            </p>
                            <p className="text-gray-500 text-[10px]">Port of Mombasa</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase text-[10px] block">NTSA Number Plate</span>
                            <p className="font-mono font-black text-masuma-orange mt-0.5">{selectedInvoice.registrationPlate || 'Pending Inspection'}</p>
                            <p className="text-gray-500 text-[10px]">KRA Entry: {selectedInvoice.kraEntryNumber || 'Simba/ICMS'}</p>
                          </div>
                        </div>

                        {/* Document Downloads Actions */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-bold text-gray-600">Official Legal Documents:</span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => generateConciergeDocument(selectedInvoice, 'PROFORMA')}
                              className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-masuma-orange text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <FileText size={13} /> Proforma Invoice
                            </button>
                            <button
                              onClick={() => generateConciergeDocument(selectedInvoice, 'AGREEMENT')}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <ShieldCheck size={13} /> Legal Agreement
                            </button>
                            {selectedInvoice.status === 'RELEASED' && (
                              <button
                                onClick={() => generateConciergeDocument(selectedInvoice, 'RELEASE_ORDER')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5"
                              >
                                <Check size={13} /> Handover Certificate
                              </button>
                            )}
                            <button
                              onClick={() => generateConciergeDocument(selectedInvoice, 'COMPLETE_DOCKET')}
                              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-black uppercase transition flex items-center gap-1.5"
                            >
                              <Download size={13} /> Complete Docket
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 10-Stop Visual Timeline */}
                      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <Clock size={16} className="text-masuma-orange" />
                          Complete 10-Milestone Journey Timeline
                        </h3>

                        <div className="relative border-l-2 border-orange-200 ml-4 pl-6 space-y-6">
                          {MILESTONE_STOPS.map((st, sIdx) => {
                            const isDone = sIdx < stopInfo.index;
                            const isCurrent = sIdx === stopInfo.index;
                            const histMatch = history.find(h => h.stop === st.id);

                            return (
                              <div key={st.id} className="relative">
                                {/* Dot Indicator */}
                                <div className={`absolute -left-[31px] top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isCurrent
                                    ? 'bg-masuma-orange border-white ring-4 ring-orange-200 text-white'
                                    : isDone
                                    ? 'bg-emerald-500 border-white text-white'
                                    : 'bg-white border-gray-300 text-gray-300'
                                }`}>
                                  {isDone ? <Check size={10} /> : <span className="text-[9px] font-bold">{st.step}</span>}
                                </div>

                                <div>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h4 className={`text-xs font-black uppercase ${isCurrent ? 'text-masuma-orange' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                                      Stop {st.step}: {st.label}
                                    </h4>
                                    {histMatch?.timestamp && (
                                      <span className="text-[10px] font-mono text-gray-400">
                                        {new Date(histMatch.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                    {histMatch?.notes || st.desc}
                                  </p>
                                  <span className="text-[10px] font-bold text-gray-400 mt-1 inline-flex items-center gap-1">
                                    <MapPin size={10} /> {histMatch?.location || st.location}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVOICES & SETTLEMENT BREAKDOWN */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">
                  Vehicle Import Invoices & Statutory Tariff Schedule
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  All official reverse valuation proformas raised for your account under the East African Community Customs Management Act (EACCMA).
                </p>
              </div>

              {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-bold">
                  No invoices currently raised.
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map(inv => {
                    const totalPaid = Number(inv.depositPaidKes || 0) + Number(inv.cifPaidKes || 0) + Number(inv.dutyPaidKes || 0);
                    const grandTotal = Number(inv.grandTotalKes || 0);
                    const balance = Math.max(0, grandTotal - totalPaid);

                    return (
                      <div key={inv.id} className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-200">
                          <div>
                            <span className="font-mono text-xs font-black text-masuma-orange">{inv.invoiceNumber}</span>
                            <h4 className="text-base font-black text-gray-900">
                              {inv.vehicleMake} {inv.vehicleModel} ({inv.yearOfManufacture})
                            </h4>
                            <span className="text-[11px] text-gray-500 font-medium">
                              Created on {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Payable</span>
                            <span className="text-xl font-black text-gray-900">{formatKes(grandTotal)}</span>
                            <span className="text-xs font-bold text-emerald-700 block">Paid: {formatKes(totalPaid)}</span>
                          </div>
                        </div>

                        {/* Line items summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">KRA Tariff Benchmark</span>
                            <p className="font-bold text-gray-900">{formatKes(inv.crspBenchmarkKes)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Customs CIF Landing</span>
                            <p className="font-bold text-gray-900">{formatKes(inv.customsValueCifKes)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Total KRA Taxes (Simba)</span>
                            <p className="font-bold text-gray-900">{formatKes(inv.totalKraTaxesKes)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block text-[10px] uppercase">Masuma Concierge Fee (3.5%)</span>
                            <p className="font-black text-masuma-orange">{formatKes(inv.sourcingCommissionKes)}</p>
                          </div>
                        </div>

                        {/* Payment Instructions Callout */}
                        <div className="bg-orange-50/70 border border-orange-200 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-xs">
                            <span className="font-black text-masuma-orange uppercase tracking-wider block">
                              Settlement Instructions:
                            </span>
                            <span className="text-gray-700 font-medium">
                              Lipa Na M-Pesa Paybill: <strong>247247</strong> • Account Number: <strong>{inv.invoiceNumber}</strong>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => generateConciergeDocument(inv, 'PROFORMA')}
                              className="px-3 py-1.5 bg-masuma-orange hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Download size={13} /> PDF Invoice
                            </button>
                            <button
                              onClick={() => generateConciergeDocument(inv, 'AGREEMENT')}
                              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <ShieldCheck size={13} /> Kenya Agreement
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SPARE PART ORDERS & QUOTES */}
        {activeTab === 'PARTS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">
                  Genuine Spare Part Orders & Quote Requests
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Spare parts purchased online or fitment quotation requests submitted for your registered vehicle(s).
                </p>
              </div>

              {loadingOrders ? (
                <div className="p-8 text-center text-gray-400 text-xs font-bold">
                  <RefreshCw size={20} className="animate-spin text-masuma-orange mx-auto mb-2" />
                  Loading parts orders...
                </div>
              ) : orders.length === 0 && quotes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl">
                  No spare parts orders or quote requests found for your account.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Orders */}
                  {orders.map(ord => (
                    <div key={ord.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-black text-gray-900">Order #{ord.orderNumber}</span>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          {ord.status}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {ord.items.map(it => (
                          <div key={it.id} className="py-2 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-gray-900">{it.name}</p>
                              <p className="text-[10px] text-gray-400">SKU: {it.sku} • Qty: {it.qty}</p>
                            </div>
                            <span className="font-black text-gray-900">{formatKes(it.price * it.qty)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs font-black">
                        <span>Total Paid:</span>
                        <span className="text-masuma-orange">{formatKes(ord.total)}</span>
                      </div>
                    </div>
                  ))}

                  {/* Quotes */}
                  {quotes.map(q => (
                    <div key={q.id} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-blue-900">Quote Request #{q.quoteNumber}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                          {q.status}
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium">Type: {q.type} • Items: {q.itemsCount} {q.vin ? `• VIN: ${q.vin}` : ''}</p>
                      <div className="flex justify-between items-center pt-1 border-t border-blue-100">
                        <span className="text-gray-500 font-bold">Estimated Cost:</span>
                        <span className="font-black text-blue-950">{formatKes(q.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & SETTINGS */}
        {activeTab === 'PROFILE' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase">
                  Buyer Profile & Account Credentials
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Keep your phone number and delivery location updated for prompt SMS/WhatsApp and carrier delivery notifications.
                </p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Phone (M-Pesa)</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="0712 345 678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Physical Delivery Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="e.g. Kilimani, Nairobi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">KRA PIN Number</label>
                    <input
                      type="text"
                      value={profileForm.taxId}
                      onChange={e => setProfileForm({ ...profileForm, taxId: e.target.value.toUpperCase() })}
                      placeholder="e.g. A012345678B"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-xs font-black uppercase text-gray-700 block mb-2">Change Account Password (Optional)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="password"
                      placeholder="New Password"
                      value={profileForm.newPassword}
                      onChange={e => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={profileForm.confirmPassword}
                      onChange={e => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-masuma-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Account Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BuyerPortal;
