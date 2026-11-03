import React, { useState, useEffect } from 'react';
import { 
  Ship, Globe, User, Calendar, 
  DollarSign, Clock, Search, Filter,
  CheckCircle2, AlertCircle, ArrowRight,
  MessageSquare, Edit3, Save, X, FileText,
  Mail, Send, Download, Check, ShieldCheck,
  Printer, RefreshCw, KeyRound, Truck, Plus,
  Anchor, Package, Key, MapPin, Navigation
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { ImportRequest, ImportConciergeInvoice } from '../../types';
import { generateConciergeDocument, formatKes } from '../../utils/conciergeDocuments';

export interface MilestoneStopDef {
  id: string;
  step: number;
  label: string;
  location: string;
  desc: string;
  defaultNotes: string;
}

export const MILESTONE_STOPS: MilestoneStopDef[] = [
  { 
    id: 'PROFORMA', 
    step: 1, 
    label: 'Proforma & Buyer Account', 
    location: 'Nairobi HQ', 
    desc: 'Official Proforma raised; Buyer Portal account provisioned for live tracking.',
    defaultNotes: 'Proforma Invoice generated. Awaiting 30% sourcing commitment deposit.'
  },
  { 
    id: 'SOURCING_DEPOSIT_PAID', 
    step: 2, 
    label: '30% Deposit Confirmed — Auction Bidding', 
    location: 'USS / TAA Auction Bays (Tokyo / London)', 
    desc: '30% sourcing deposit verified. Auction bidding actively engaged across verified Japanese and UK portals.',
    defaultNotes: '30% deposit received. Sourcing specialists authorized to place live bids.'
  },
  { 
    id: 'VEHICLE_PURCHASED', 
    step: 3, 
    label: 'Vehicle Secured at Auction', 
    location: 'Auction Terminal Yard (Japan / UK)', 
    desc: 'Auction won! VIN/Chassis verified and unit transported to secure export terminal.',
    defaultNotes: 'Vehicle secured at auction. Foreign export certificate and chassis verification confirmed.'
  },
  { 
    id: 'EXPORT_INSPECTION', 
    step: 4, 
    label: 'KEBS KS 1515:2000 Inspection Passed', 
    location: 'Yokohama / Southampton Port Terminal', 
    desc: 'Pre-export inspection by QISJ/JEVIC completed. Roadworthiness and radiation safety certified.',
    defaultNotes: 'KEBS pre-export roadworthiness certificate issued. Radiation and odometer checks passed.'
  },
  { 
    id: 'IN_TRANSIT', 
    step: 5, 
    label: 'Ocean Ro-Ro Vessel Transit', 
    location: 'High Seas Marine Ro-Ro Line', 
    desc: 'Loaded onto ocean carrier. Bill of Lading (BL) issued and vessel sailing toward Port of Mombasa.',
    defaultNotes: 'Vehicle safely loaded onto Ro-Ro vessel. Ocean transit sailing under marine transit insurance.'
  },
  { 
    id: 'ARRIVED_MOMBASA', 
    step: 6, 
    label: 'Berthed at Port of Mombasa', 
    location: 'Kilindini Harbour / Port CFS, Mombasa', 
    desc: 'Vessel docked at Kilindini Harbour. Vehicle offloaded to secure Container Freight Station (CFS).',
    defaultNotes: 'Vessel berthed at Mombasa Port. CFS offload completed; customs tally verified.'
  },
  { 
    id: 'CUSTOMS_CLEARING', 
    step: 7, 
    label: 'KRA Taxes & Customs Clearing', 
    location: 'Mombasa Port CFS Terminal', 
    desc: 'Simba / ICMS customs entry lodged. Statutory taxes (Duty, Excise, VAT, IDF, RDL) assessed and cleared.',
    defaultNotes: 'KRA customs entry cleared. Port CFS delivery order processed.'
  },
  { 
    id: 'NTSA_REGISTRATION', 
    step: 8, 
    label: 'NTSA Inspection & Number Plates', 
    location: 'NTSA Inspection Centre (Likoni / Nairobi)', 
    desc: 'NTSA physical inspection completed. Metal embossed plates allocated and logbook transfer initialized.',
    defaultNotes: 'NTSA inspection passed. Number plates allocated; electronic logbook transfer in progress.'
  },
  { 
    id: 'READY_FOR_COLLECTION', 
    step: 9, 
    label: 'Arrived at Nairobi Hub (PDI Complete)', 
    location: 'Masuma Nairobi Hub (CBD / Industrial Area)', 
    desc: 'Transported to Nairobi Hub. Pre-delivery mechanical inspection (PDI), fluid check, and detailing completed.',
    defaultNotes: 'Vehicle has arrived at our Nairobi Hub. PDI inspection complete and ready for customer handover.'
  },
  { 
    id: 'RELEASED', 
    step: 10, 
    label: 'Official Handover & Delivery', 
    location: 'Masuma Showroom / Doorstep Delivery', 
    desc: 'Full 100% settlement confirmed. Handover Certificate signed; original logbook and keys delivered.',
    defaultNotes: 'Handover complete. 100% settlement acknowledged. Original logbook and 2 smart keys delivered to buyer.'
  }
];

export const getStopInfo = (status: string) => {
  const index = MILESTONE_STOPS.findIndex(s => s.id === status);
  if (index !== -1) return { index, stop: MILESTONE_STOPS[index] };
  if (status === 'COMPLETED' || status === 'FULLY_PAID') return { index: 9, stop: MILESTONE_STOPS[9] };
  if (status === 'CONFIRMED') return { index: 1, stop: MILESTONE_STOPS[1] };
  return { index: 0, stop: MILESTONE_STOPS[0] };
};

const ImportAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'REQUESTS'>('INVOICES');

  // Concierge Invoices State
  const [invoices, setInvoices] = useState<ImportConciergeInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [remailingId, setRemailingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Invoice Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ImportConciergeInvoice | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerPin: '',
    customerIdNumber: '',
    customerAddress: '',
    vehicleMake: '',
    vehicleModel: '',
    modelNumber: '',
    yearOfManufacture: 2018,
    engineSize: 1500,
    fuelType: 'GASOLINE',
    vehicleType: 'CAR',
    chassisNumber: '',
    engineNumber: '',
    exteriorColor: '',
    mileageKm: 0,
    registrationPlate: '',
    kraEntryNumber: '',
    portReleaseNumber: '',
    crspBenchmarkKes: 0,
    customsValueCifKes: 0,
    portChargesKes: 65000,
    sourcingCommissionKes: 0,
    grandTotalKes: 0,
    depositPaidKes: 0,
    cifPaidKes: 0,
    dutyPaidKes: 0,
    status: 'PROFORMA',
    notes: '',
    recalculate: true
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Release Vehicle Modal State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releasingInvoice, setReleasingInvoice] = useState<ImportConciergeInvoice | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    chassisNumber: '',
    engineNumber: '',
    registrationPlate: '',
    mileageKm: 0,
    kraEntryNumber: '',
    portReleaseNumber: '',
    releasedBy: '',
    releaseNotes: 'Vehicle inspected, verified against original foreign documents, and delivered in satisfactory condition.'
  });
  const [submittingRelease, setSubmittingRelease] = useState(false);

  // Milestone Tracking Progression Modal State
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneInvoice, setMilestoneInvoice] = useState<ImportConciergeInvoice | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string>('PROFORMA');
  const [milestoneForm, setMilestoneForm] = useState({
    currentLocation: '',
    chassisNumber: '',
    vesselName: '',
    voyageNumber: '',
    billOfLadingNumber: '',
    portOfLoading: 'Yokohama, Japan',
    portOfDischarge: 'Port of Mombasa, Kenya',
    etaDate: '',
    kraEntryNumber: '',
    registrationPlate: '',
    officerNotes: '',
    sendEmailNotification: true
  });
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  // Legacy Import Requests State
  const [requests, setRequests] = useState<ImportRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestEditData, setRequestEditData] = useState({ 
    status: '', 
    adminResponse: '',
    cifAmount: 0,
    balanceAmount: 0,
    vesselName: '',
    eta: '',
    quoteUrl: '',
    contractUrl: ''
  });

  useEffect(() => {
    if (activeTab === 'INVOICES') {
      fetchInvoices();
    } else {
      fetchRequests();
    }
  }, [activeTab]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // --- CONCIERGE INVOICES API CALLS ---
  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const params = new URLSearchParams();
      if (invoiceSearch) params.append('search', invoiceSearch);
      if (invoiceStatusFilter) params.append('status', invoiceStatusFilter);
      const res = await apiClient.get(`/import-calculator/invoices?${params.toString()}`);
      setInvoices(res.data.invoices || []);
    } catch (e: any) {
      console.error('Error fetching concierge invoices:', e);
      showFeedback('Failed to load concierge invoices.', 'error');
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleOpenEditModal = (inv: ImportConciergeInvoice) => {
    setEditingInvoice(inv);
    setEditForm({
      customerName: inv.customerName || '',
      customerEmail: inv.customerEmail || '',
      customerPhone: inv.customerPhone || '',
      customerPin: inv.customerPin || '',
      customerIdNumber: inv.customerIdNumber || '',
      customerAddress: inv.customerAddress || '',
      vehicleMake: inv.vehicleMake || '',
      vehicleModel: inv.vehicleModel || '',
      modelNumber: inv.modelNumber || '',
      yearOfManufacture: inv.yearOfManufacture || 2018,
      engineSize: inv.engineSize || 1500,
      fuelType: inv.fuelType || 'GASOLINE',
      vehicleType: inv.vehicleType || 'CAR',
      chassisNumber: inv.chassisNumber || '',
      engineNumber: inv.engineNumber || '',
      exteriorColor: inv.exteriorColor || '',
      mileageKm: inv.mileageKm || 0,
      registrationPlate: inv.registrationPlate || '',
      kraEntryNumber: inv.kraEntryNumber || '',
      portReleaseNumber: inv.portReleaseNumber || '',
      crspBenchmarkKes: Number(inv.crspBenchmarkKes || 0),
      customsValueCifKes: Number(inv.customsValueCifKes || 0),
      portChargesKes: Number(inv.portChargesKes || 65000),
      sourcingCommissionKes: Number(inv.sourcingCommissionKes || 0),
      grandTotalKes: Number(inv.grandTotalKes || 0),
      depositPaidKes: Number(inv.depositPaidKes || 0),
      cifPaidKes: Number(inv.cifPaidKes || 0),
      dutyPaidKes: Number(inv.dutyPaidKes || 0),
      status: inv.status || 'PROFORMA',
      notes: inv.notes || '',
      recalculate: true
    });
    setIsEditModalOpen(true);
  };

  const handleSaveInvoiceChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSavingInvoice(true);

    try {
      const res = await apiClient.patch(`/import-calculator/invoice/${editingInvoice.id}`, editForm);
      showFeedback(`Invoice ${res.data.invoiceNumber} updated successfully!`);
      setIsEditModalOpen(false);
      fetchInvoices();
    } catch (e: any) {
      console.error('Failed to update invoice:', e);
      showFeedback(e.response?.data?.error || 'Failed to update invoice data.', 'error');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleReEmailClient = async (inv: ImportConciergeInvoice) => {
    if (!confirm(`Re-email updated proforma invoice and payment breakdown to ${inv.customerEmail}?`)) return;
    setRemailingId(inv.id);

    try {
      const res = await apiClient.post(`/import-calculator/invoice/${inv.id}/email`);
      showFeedback(res.data.message || `Invoice sent to ${inv.customerEmail}!`);
      fetchInvoices();
    } catch (e: any) {
      console.error('Re-email error:', e);
      showFeedback(e.response?.data?.error || 'Failed to dispatch email.', 'error');
    } finally {
      setRemailingId(null);
    }
  };

  const handleOpenReleaseModal = (inv: ImportConciergeInvoice) => {
    setReleasingInvoice(inv);
    setReleaseForm({
      chassisNumber: inv.chassisNumber || '',
      engineNumber: inv.engineNumber || '',
      registrationPlate: inv.registrationPlate || '',
      mileageKm: inv.mileageKm || 0,
      kraEntryNumber: inv.kraEntryNumber || '',
      portReleaseNumber: inv.portReleaseNumber || '',
      releasedBy: 'Masuma Logistics Officer',
      releaseNotes: 'Vehicle fully paid, cleared through Mombasa CFS, and released to registered owner.'
    });
    setIsReleaseModalOpen(true);
  };

  const handleSubmitRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingInvoice) return;
    setSubmittingRelease(true);

    try {
      const res = await apiClient.post(`/import-calculator/invoice/${releasingInvoice.id}/release`, releaseForm);
      showFeedback(`Vehicle ${releasingInvoice.vehicleMake} ${releasingInvoice.vehicleModel} marked as officially RELEASED!`);
      setIsReleaseModalOpen(false);
      // Automatically generate the official Release Certificate
      generateConciergeDocument(res.data.invoice, 'RELEASE_ORDER');
      fetchInvoices();
    } catch (e: any) {
      console.error('Release error:', e);
      showFeedback(e.response?.data?.error || 'Failed to record vehicle release.', 'error');
    } finally {
      setSubmittingRelease(false);
    }
  };

  // --- MILESTONE TRACKING PROGRESSION API CALLS ---
  const handleOpenMilestoneModal = (inv: ImportConciergeInvoice) => {
    setMilestoneInvoice(inv);
    const { index } = getStopInfo(inv.status);
    const nextIdx = index < MILESTONE_STOPS.length - 1 ? index + 1 : index;
    const target = MILESTONE_STOPS[nextIdx];

    setSelectedStopId(target.id);
    setMilestoneForm({
      currentLocation: target.location,
      chassisNumber: inv.chassisNumber || '',
      vesselName: inv.vesselName || '',
      voyageNumber: inv.voyageNumber || '',
      billOfLadingNumber: inv.billOfLadingNumber || '',
      portOfLoading: inv.portOfLoading || 'Yokohama, Japan',
      portOfDischarge: inv.portOfDischarge || 'Port of Mombasa, Kenya',
      etaDate: inv.etaDate ? new Date(inv.etaDate).toISOString().split('T')[0] : '',
      kraEntryNumber: inv.kraEntryNumber || '',
      registrationPlate: inv.registrationPlate || '',
      officerNotes: target.defaultNotes,
      sendEmailNotification: true
    });
    setIsMilestoneModalOpen(true);
  };

  const handleSelectMilestoneStop = (stopId: string) => {
    setSelectedStopId(stopId);
    const target = MILESTONE_STOPS.find(s => s.id === stopId);
    if (target) {
      setMilestoneForm(prev => ({
        ...prev,
        currentLocation: target.location,
        officerNotes: target.defaultNotes
      }));
    }
  };

  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneInvoice) return;
    setSubmittingMilestone(true);

    try {
      const target = MILESTONE_STOPS.find(s => s.id === selectedStopId) || MILESTONE_STOPS[0];

      const payload = {
        status: selectedStopId,
        recordMilestoneStop: true,
        milestoneTitle: `Stop ${target.step}: ${target.label}`,
        currentLocation: milestoneForm.currentLocation,
        notes: milestoneForm.officerNotes,
        chassisNumber: milestoneForm.chassisNumber,
        vesselName: milestoneForm.vesselName,
        voyageNumber: milestoneForm.voyageNumber,
        billOfLadingNumber: milestoneForm.billOfLadingNumber,
        portOfLoading: milestoneForm.portOfLoading,
        portOfDischarge: milestoneForm.portOfDischarge,
        etaDate: milestoneForm.etaDate || null,
        kraEntryNumber: milestoneForm.kraEntryNumber,
        registrationPlate: milestoneForm.registrationPlate
      };

      const res = await apiClient.patch(`/import-calculator/invoice/${milestoneInvoice.id}`, payload);
      const updated = res.data;

      setInvoices(prev => prev.map(item => item.id === updated.id ? updated : item));
      showFeedback(`Order graduated to Stop ${target.step} (${target.label})! Automated milestone email dispatched to ${milestoneInvoice.customerEmail}.`);
      setIsMilestoneModalOpen(false);
    } catch (err: any) {
      console.error('Milestone update error:', err);
      showFeedback(err.response?.data?.error || 'Failed to update vehicle milestone.', 'error');
    } finally {
      setSubmittingMilestone(false);
    }
  };

  // --- LEGACY REQUESTS API CALLS ---
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await apiClient.get('/import-requests');
      setRequests(res.data);
    } catch (e) {
      console.error('Error fetching import requests', e);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleStartEditRequest = (req: ImportRequest) => {
    setEditingRequestId(req.id);
    setRequestEditData({ 
      status: req.status, 
      adminResponse: typeof req.adminResponse === 'string' ? req.adminResponse : JSON.stringify(req.adminResponse || ''),
      cifAmount: req.cifAmount || 0,
      balanceAmount: req.balanceAmount || 0,
      vesselName: req.vesselName || '',
      eta: req.eta ? new Date(req.eta).toISOString().split('T')[0] : '',
      quoteUrl: req.quoteUrl || '',
      contractUrl: req.contractUrl || ''
    });
  };

  const handleSaveRequest = async (id: string) => {
    try {
      await apiClient.patch(`/import-requests/${id}`, requestEditData);
      setEditingRequestId(null);
      fetchRequests();
      showFeedback('Sourcing request updated successfully.');
    } catch (e) {
      console.error('Error saving import request', e);
      showFeedback('Failed to save sourcing request.', 'error');
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PROFORMA':
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Proforma Quote</span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Confirmed</span>;
      case 'SOURCING_DEPOSIT_PAID':
        return <span className="bg-purple-100 text-purple-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Deposit Paid</span>;
      case 'VEHICLE_PURCHASED':
        return <span className="bg-indigo-100 text-indigo-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Auction Won</span>;
      case 'IN_TRANSIT':
        return <span className="bg-cyan-100 text-cyan-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">On Vessel</span>;
      case 'CUSTOMS_CLEARING':
        return <span className="bg-orange-100 text-orange-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Port CFS Clearing</span>;
      case 'FULLY_PAID':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">100% Fully Paid</span>;
      case 'RELEASED':
      case 'COMPLETED':
        return <span className="bg-green-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1"><Check size={12}/> Handed Over</span>;
      case 'CANCELLED':
        return <span className="bg-red-100 text-red-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">Cancelled</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-[11px] font-black px-2.5 py-1 rounded-full uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold shadow-md ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.25em] text-masuma-orange bg-masuma-orange/10 px-3 py-1 rounded-full inline-block mb-1.5">
            Vehicle Import Concierge Engine
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Import Invoices, Agreements & Handover</h1>
          <p className="text-sm text-gray-500 font-medium">
            Manage official KRA CRSP proforma quotations, modify costs, re-email clients, generate binding agreements, and execute vehicle releases.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'INVOICES' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={15} className="text-masuma-orange" />
            Concierge Invoices & Releases
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'REQUESTS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Ship size={15} className="text-blue-600" />
            Custom Sourcing Requests
          </button>
        </div>
      </div>

      {/* TAB 1: CONCIERGE PROFORMA INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          {/* Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchInvoices()}
                placeholder="Search by Invoice No, Customer, Phone, Vehicle Make/Model, or Chassis/VIN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-masuma-orange"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <select
                value={invoiceStatusFilter}
                onChange={e => setInvoiceStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700 focus:ring-2 focus:ring-masuma-orange"
              >
                <option value="">All Statuses</option>
                <option value="PROFORMA">Proforma</option>
                <option value="SOURCING_DEPOSIT_PAID">Deposit Paid</option>
                <option value="VEHICLE_PURCHASED">Vehicle Purchased</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="CUSTOMS_CLEARING">Customs Clearing</option>
                <option value="FULLY_PAID">Fully Paid</option>
                <option value="RELEASED">Released / Handed Over</option>
              </select>

              <button
                onClick={fetchInvoices}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-colors"
                title="Refresh List"
              >
                <RefreshCw size={16} className={invoicesLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Invoices List / Table */}
          {invoicesLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-200" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-black text-gray-900 mb-1">No Concierge Invoices Found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No proforma invoices match your search criteria. Customers can raise invoices from the Vehicle Import Concierge Calculator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {invoices.map(inv => {
                const totalPaid = Number(inv.depositPaidKes || 0) + Number(inv.cifPaidKes || 0) + Number(inv.dutyPaidKes || 0);
                const grandTotal = Number(inv.grandTotalKes || 0);
                const balance = Math.max(0, grandTotal - totalPaid);
                const isPaidInFull = totalPaid >= grandTotal && grandTotal > 0;
                const isReleased = inv.status === 'RELEASED' || inv.status === 'COMPLETED';

                return (
                  <div 
                    key={inv.id} 
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:border-gray-300 transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-black text-gray-900 tracking-tight">
                            {inv.invoiceNumber}
                          </span>
                          {getInvoiceStatusBadge(inv.status)}
                          <span className="text-xs text-gray-400 font-medium">
                            Created {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">
                          {inv.vehicleMake} {inv.vehicleModel} {inv.modelNumber ? `(${inv.modelNumber})` : ''} • {inv.yearOfManufacture} YOM
                        </h3>
                      </div>

                      {/* Payment Indicator */}
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Total Payable</span>
                        <span className="text-xl font-black text-masuma-orange">
                          {formatKes(grandTotal)}
                        </span>
                        {totalPaid > 0 && (
                          <span className="text-xs font-bold block text-emerald-600 mt-0.5">
                            Paid: {formatKes(totalPaid)} | Balance: {formatKes(balance)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl text-xs font-medium">
                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Customer Particulars</span>
                        <p className="font-black text-gray-900">{inv.customerName}</p>
                        <p className="text-gray-600">{inv.customerEmail}</p>
                        <p className="text-gray-600">{inv.customerPhone}</p>
                        {inv.customerPin && <p className="text-gray-500 font-mono">PIN: {inv.customerPin}</p>}
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Vehicle Specifications</span>
                        <p className="text-gray-800">Engine: {inv.engineSize} CC • {inv.fuelType}</p>
                        <p className="text-gray-800">Age: {inv.vehicleAge} Years Old</p>
                        <p className="text-gray-800 font-mono">VIN: {inv.chassisNumber || 'Pending Auction Win'}</p>
                        {inv.registrationPlate && <p className="text-masuma-orange font-bold">Plate: {inv.registrationPlate}</p>}
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Statutory Taxes & Port</span>
                        <p className="text-gray-800">KRA CRSP: {formatKes(inv.crspBenchmarkKes)}</p>
                        <p className="text-gray-800">CIF Landing: {formatKes(inv.customsValueCifKes)}</p>
                        <p className="text-gray-800">Total KRA Taxes: {formatKes(inv.totalKraTaxesKes)}</p>
                        <p className="text-gray-800">CFS Port Clearance: {formatKes(inv.portChargesKes)}</p>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Concierge Agency</span>
                        <p className="text-masuma-orange font-bold">Commission (3.5%): {formatKes(inv.sourcingCommissionKes)}</p>
                        <p className="text-gray-600">Landed Car Cost: {formatKes(inv.landedVehicleValueKes)}</p>
                        {inv.lastEmailedAt && (
                          <p className="text-emerald-700 text-[11px] font-bold mt-1">
                            Emailed: {new Date(inv.lastEmailedAt).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        {inv.releasedAt && (
                          <p className="text-green-700 text-[11px] font-black mt-1">
                            Released: {new Date(inv.releasedAt).toLocaleDateString('en-GB')} by {inv.releasedBy}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 10-Milestone Progress Segment Bar */}
                    {(() => {
                      const stopInfo = getStopInfo(inv.status);
                      return (
                        <div className="bg-gradient-to-r from-gray-50 to-orange-50/30 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <span className="font-bold text-gray-800 flex items-center gap-1.5">
                              <Ship size={14} className="text-masuma-orange" />
                              <span>Shipment Stage:</span>
                              <strong className="text-masuma-orange font-black">
                                Stop {stopInfo.index + 1} of 10 — {stopInfo.stop.label}
                              </strong>
                            </span>
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                              {Math.round(((stopInfo.index + 1) / 10) * 100)}% Journey Completed
                            </span>
                          </div>

                          {/* 10 Segment Progress Indicators */}
                          <div className="grid grid-cols-10 gap-1.5 h-2.5 rounded-full overflow-hidden bg-gray-200">
                            {MILESTONE_STOPS.map((st, sIdx) => {
                              const isDone = sIdx < stopInfo.index;
                              const isCurrent = sIdx === stopInfo.index;
                              return (
                                <div 
                                  key={st.id} 
                                  title={`Stop ${st.step}: ${st.label}`}
                                  className={`h-full transition-all rounded-sm ${
                                    isCurrent 
                                      ? 'bg-masuma-orange ring-2 ring-masuma-orange/40 animate-pulse' 
                                      : isDone 
                                      ? 'bg-emerald-500' 
                                      : 'bg-gray-200'
                                  }`}
                                />
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400" />
                              <span>Last Hub / Port: <strong className="text-gray-800">{stopInfo.stop.location}</strong></span>
                            </span>
                            {stopInfo.index < 9 ? (
                              <button
                                onClick={() => handleOpenMilestoneModal(inv)}
                                className="text-masuma-orange hover:text-orange-700 font-black uppercase text-[10px] tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>Graduate to Stop {stopInfo.index + 2} ({MILESTONE_STOPS[stopInfo.index + 1].label})</span>
                                <ArrowRight size={12} />
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Check size={12} /> Delivery Completed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Graduate Milestone & Track Button */}
                        <button
                          onClick={() => handleOpenMilestoneModal(inv)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Ship size={13} />
                          Graduate Milestone & Track
                        </button>

                        {/* Modify Invoice Button */}
                        <button
                          onClick={() => handleOpenEditModal(inv)}
                          className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Edit3 size={13} />
                          Modify Costs & Specs
                        </button>

                        {/* Re-Email to Client Button */}
                        <button
                          onClick={() => handleReEmailClient(inv)}
                          disabled={remailingId === inv.id}
                          className="px-3.5 py-2 bg-masuma-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                        >
                          {remailingId === inv.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Send size={13} />
                          )}
                          Re-Email to Client
                        </button>

                        {/* Vehicle Release Button (Active when paid) */}
                        {!isReleased && (
                          <button
                            onClick={() => handleOpenReleaseModal(inv)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Truck size={13} />
                            Release Vehicle (Handover)
                          </button>
                        )}
                      </div>

                      {/* Document Downloads Dropdown / Buttons */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">Documents:</span>
                        <button
                          onClick={() => generateConciergeDocument(inv, 'PROFORMA')}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Download Clean Proforma Invoice (No Overlays)"
                        >
                          <FileText size={12} className="text-masuma-orange" />
                          Proforma
                        </button>
                        <button
                          onClick={() => generateConciergeDocument(inv, 'AGREEMENT')}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Download Legally Binding Direct Import Agreement (Kenya)"
                        >
                          <ShieldCheck size={12} className="text-blue-600" />
                          Agreement
                        </button>
                        {isReleased && (
                          <button
                            onClick={() => generateConciergeDocument(inv, 'RELEASE_ORDER')}
                            className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="Download Official Vehicle Release Order & Handover Certificate"
                          >
                            <Check size={12} className="text-emerald-700" />
                            Release Order
                          </button>
                        )}
                        <button
                          onClick={() => generateConciergeDocument(inv, 'COMPLETE_DOCKET')}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          title="Download Multi-Page Complete Docket (Invoice + Agreement + Release)"
                        >
                          <Download size={12} />
                          All-in-One Docket
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEGACY CUSTOM SOURCING REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-base font-black text-gray-900">Custom Sourcing Requests Pipeline</h3>
              <p className="text-xs text-gray-500">Pipeline for custom vehicle import requests submitted via portal.</p>
            </div>
            <button onClick={fetchRequests} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600">
              <Clock className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {requestsLoading ? (
              [1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-200" />)
            ) : requests.length > 0 ? (
              requests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mr-4">
                          <Ship className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{req.make} {req.model} ({req.minYear}+)</h3>
                          <p className="text-sm text-gray-500 flex items-center">
                            <User className="w-3.5 h-3.5 mr-1" />
                            {req.user?.fullName} • {req.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-gray-100 text-gray-700">
                          {req.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-2">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Budget</p>
                        <p className="text-sm font-bold text-gray-900">KES {req.budgetKes.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Source</p>
                        <p className="text-sm font-bold text-gray-900">{req.sourceCountry}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Mileage Preference</p>
                        <p className="text-sm font-bold text-gray-900">{req.maxMileage?.toLocaleString() || 'Any'} KM</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Color</p>
                        <p className="text-sm font-bold text-gray-900">{req.colorPreference || 'Any'}</p>
                      </div>
                    </div>

                    {editingRequestId === req.id ? (
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
                            <input
                              type="text"
                              value={requestEditData.status}
                              onChange={e => setRequestEditData({ ...requestEditData, status: e.target.value })}
                              className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CIF Amount (KES)</label>
                            <input
                              type="number"
                              value={requestEditData.cifAmount}
                              onChange={e => setRequestEditData({ ...requestEditData, cifAmount: Number(e.target.value) })}
                              className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Balance Due (KES)</label>
                            <input
                              type="number"
                              value={requestEditData.balanceAmount}
                              onChange={e => setRequestEditData({ ...requestEditData, balanceAmount: Number(e.target.value) })}
                              className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingRequestId(null)}
                            className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveRequest(req.id)}
                            className="px-4 py-2 bg-masuma-orange text-white rounded-xl text-xs font-bold"
                          >
                            Save Request
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleStartEditRequest(req)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          Edit Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
                No custom sourcing requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT CONCIERGE INVOICE & COSTS */}
      {isEditModalOpen && editingInvoice && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-gray-200 relative my-8"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 text-masuma-orange rounded-2xl flex items-center justify-center font-bold">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                  Modify Invoice: {editingInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Update costs, customer details, chassis/VIN, or trigger recalculation of statutory tariffs.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveInvoiceChanges} className="space-y-6">
              {/* Cost Adjustment Section */}
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-masuma-orange" />
                    Statutory Costs & CIF Parameters
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-orange-900">
                    <input
                      type="checkbox"
                      checked={editForm.recalculate}
                      onChange={e => setEditForm({ ...editForm, recalculate: e.target.checked })}
                      className="rounded border-orange-300 text-masuma-orange focus:ring-masuma-orange"
                    />
                    <span>Auto-Recalculate Cascading Taxes (Duty, Excise, VAT, IDF, RDL)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">KRA Benchmark CRSP (KES)</label>
                    <input
                      type="number"
                      required
                      value={editForm.crspBenchmarkKes}
                      onChange={e => setEditForm({ ...editForm, crspBenchmarkKes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Customs Valuation (CIF KES)</label>
                    <input
                      type="number"
                      value={editForm.customsValueCifKes}
                      onChange={e => setEditForm({ ...editForm, customsValueCifKes: Number(e.target.value) })}
                      placeholder="Calculated or Custom CIF"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Port CFS Clearance (KES)</label>
                    <input
                      type="number"
                      value={editForm.portChargesKes}
                      onChange={e => setEditForm({ ...editForm, portChargesKes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Deposit Paid (KES)</label>
                    <input
                      type="number"
                      value={editForm.depositPaidKes}
                      onChange={e => setEditForm({ ...editForm, depositPaidKes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">CIF Freight Paid (KES)</label>
                    <input
                      type="number"
                      value={editForm.cifPaidKes}
                      onChange={e => setEditForm({ ...editForm, cifPaidKes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">KRA Duty Paid (KES)</label>
                    <input
                      type="number"
                      value={editForm.dutyPaidKes}
                      onChange={e => setEditForm({ ...editForm, dutyPaidKes: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Particulars Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">Customer Legal Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Customer Full Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.customerName}
                      onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editForm.customerEmail}
                      onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mobile Phone (M-Pesa)</label>
                    <input
                      type="text"
                      required
                      value={editForm.customerPhone}
                      onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">KRA PIN</label>
                    <input
                      type="text"
                      value={editForm.customerPin}
                      onChange={e => setEditForm({ ...editForm, customerPin: e.target.value.toUpperCase() })}
                      placeholder="e.g. A012345678B"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">National ID / Passport</label>
                    <input
                      type="text"
                      value={editForm.customerIdNumber}
                      onChange={e => setEditForm({ ...editForm, customerIdNumber: e.target.value })}
                      placeholder="e.g. 12345678"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Physical / Postal Address</label>
                    <input
                      type="text"
                      value={editForm.customerAddress}
                      onChange={e => setEditForm({ ...editForm, customerAddress: e.target.value })}
                      placeholder="P.O. Box 45000, Nairobi"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Particulars Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">Vehicle Identification & Logistics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Make</label>
                    <input
                      type="text"
                      required
                      value={editForm.vehicleMake}
                      onChange={e => setEditForm({ ...editForm, vehicleMake: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Model</label>
                    <input
                      type="text"
                      required
                      value={editForm.vehicleModel}
                      onChange={e => setEditForm({ ...editForm, vehicleModel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">YOM (Year)</label>
                    <input
                      type="number"
                      required
                      value={editForm.yearOfManufacture}
                      onChange={e => setEditForm({ ...editForm, yearOfManufacture: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Engine Size (CC)</label>
                    <input
                      type="number"
                      value={editForm.engineSize}
                      onChange={e => setEditForm({ ...editForm, engineSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Chassis / VIN Number</label>
                    <input
                      type="text"
                      value={editForm.chassisNumber}
                      onChange={e => setEditForm({ ...editForm, chassisNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. SJ5-048291"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Engine Serial Number</label>
                    <input
                      type="text"
                      value={editForm.engineNumber}
                      onChange={e => setEditForm({ ...editForm, engineNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. FB20-9481023"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Milestone Stop Status</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-800"
                    >
                      <option value="PROFORMA">Stop 1: PROFORMA (Raised)</option>
                      <option value="SOURCING_DEPOSIT_PAID">Stop 2: SOURCING_DEPOSIT_PAID (30% Received)</option>
                      <option value="VEHICLE_PURCHASED">Stop 3: VEHICLE_PURCHASED (Auction Won)</option>
                      <option value="EXPORT_INSPECTION">Stop 4: EXPORT_INSPECTION (KEBS Passed)</option>
                      <option value="IN_TRANSIT">Stop 5: IN_TRANSIT (Ocean Ro-Ro Vessel)</option>
                      <option value="ARRIVED_MOMBASA">Stop 6: ARRIVED_MOMBASA (Berthed at Port)</option>
                      <option value="CUSTOMS_CLEARING">Stop 7: CUSTOMS_CLEARING (KRA Taxes / CFS)</option>
                      <option value="NTSA_REGISTRATION">Stop 8: NTSA_REGISTRATION (Plates & Logbook)</option>
                      <option value="READY_FOR_COLLECTION">Stop 9: READY_FOR_COLLECTION (Nairobi Hub)</option>
                      <option value="FULLY_PAID">FULLY_PAID (100% Cleared)</option>
                      <option value="RELEASED">Stop 10: RELEASED (Delivered / Handed Over)</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>

                {/* Ocean Vessel & Carrier Logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ro-Ro Vessel Name</label>
                    <input
                      type="text"
                      value={(editForm as any).vesselName || ''}
                      onChange={e => setEditForm({ ...editForm, vesselName: e.target.value } as any)}
                      placeholder="e.g. HOEGH TRADER"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Bill of Lading (BL No)</label>
                    <input
                      type="text"
                      value={(editForm as any).billOfLadingNumber || ''}
                      onChange={e => setEditForm({ ...editForm, billOfLadingNumber: e.target.value } as any)}
                      placeholder="e.g. MOLU9283710"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Port Arrival ETA Date</label>
                    <input
                      type="date"
                      value={(editForm as any).etaDate ? new Date((editForm as any).etaDate).toISOString().split('T')[0] : ''}
                      onChange={e => setEditForm({ ...editForm, etaDate: e.target.value } as any)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes / Adjustments Audit</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Reason for cost revision or auction purchase specifics..."
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="px-6 py-2.5 bg-masuma-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {savingInvoice ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Invoice Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VEHICLE RELEASE & HANDOVER EXECUTION */}
      {isReleaseModalOpen && releasingInvoice && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsReleaseModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-emerald-200 relative my-8"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsReleaseModalOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                <Truck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                  Issue Official Vehicle Release Order
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Certify 100% full payment settlement, KRA customs clearance, and issue official Handover Certificate.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitRelease} className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold">
                  Vehicle: {releasingInvoice.vehicleMake} {releasingInvoice.vehicleModel} ({releasingInvoice.yearOfManufacture})
                </p>
                <p>
                  Customer: <strong>{releasingInvoice.customerName}</strong> ({releasingInvoice.customerEmail} • {releasingInvoice.customerPhone})
                </p>
                <p>
                  Total Landed Cost: <strong>{formatKes(releasingInvoice.grandTotalKes)}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Chassis Number / VIN</label>
                  <input
                    type="text"
                    required
                    value={releaseForm.chassisNumber}
                    onChange={e => setReleaseForm({ ...releaseForm, chassisNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. SJ5-048291"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Engine Number</label>
                  <input
                    type="text"
                    required
                    value={releaseForm.engineNumber}
                    onChange={e => setReleaseForm({ ...releaseForm, engineNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. FB20-9481023"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">NTSA Registration Mark / Interim Plate</label>
                  <input
                    type="text"
                    required
                    value={releaseForm.registrationPlate}
                    onChange={e => setReleaseForm({ ...releaseForm, registrationPlate: e.target.value.toUpperCase() })}
                    placeholder="e.g. KDG 482B or Interim Permit"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Verified Odometer (KM)</label>
                  <input
                    type="number"
                    value={releaseForm.mileageKm}
                    onChange={e => setReleaseForm({ ...releaseForm, mileageKm: Number(e.target.value) })}
                    placeholder="e.g. 48500"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">KRA Simba/ICMS Customs Entry No</label>
                  <input
                    type="text"
                    value={releaseForm.kraEntryNumber}
                    onChange={e => setReleaseForm({ ...releaseForm, kraEntryNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. 2026MBA0948271"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Port CFS Delivery Order No</label>
                  <input
                    type="text"
                    value={releaseForm.portReleaseNumber}
                    onChange={e => setReleaseForm({ ...releaseForm, portReleaseNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. CFS-MSA-84910"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Authorizing Handover Officer</label>
                <input
                  type="text"
                  required
                  value={releaseForm.releasedBy}
                  onChange={e => setReleaseForm({ ...releaseForm, releasedBy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Handover & Inspection Remarks</label>
                <textarea
                  rows={2}
                  value={releaseForm.releaseNotes}
                  onChange={e => setReleaseForm({ ...releaseForm, releaseNotes: e.target.value })}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRelease}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submittingRelease ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Authorize Release & Print Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GRADUATE SHIPMENT MILESTONE & NOTIFY BUYER */}
      {isMilestoneModalOpen && milestoneInvoice && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsMilestoneModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-200 relative overflow-hidden my-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  <Ship size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 leading-tight">
                    Graduate Shipment Milestone: {milestoneInvoice.invoiceNumber}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium line-clamp-1">
                    {milestoneInvoice.vehicleMake} {milestoneInvoice.vehicleModel} ({milestoneInvoice.yearOfManufacture}) • Client: {milestoneInvoice.customerName} ({milestoneInvoice.customerEmail})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsMilestoneModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Container with Scrollable Body and Pinned Footer */}
            <form onSubmit={handleSubmitMilestone} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                
                {/* 10-Milestone Stepper Selection */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-2">
                    Select Target Shipping Stage (Click to Graduate):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {MILESTONE_STOPS.map((st, idx) => {
                      const isCurrentInvoiceStop = milestoneInvoice.status === st.id;
                      const isSelected = selectedStopId === st.id;
                      const { index: currentInvIdx } = getStopInfo(milestoneInvoice.status);
                      const isPast = idx < currentInvIdx;

                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectMilestoneStop(st.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
                              : isCurrentInvoiceStop
                              ? 'bg-orange-50 border-orange-300 text-orange-950'
                              : isPast
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                            }`}>
                              Stop {st.step}
                            </span>
                            {isPast && <Check size={12} className={isSelected ? 'text-white' : 'text-emerald-600'} />}
                            {isCurrentInvoiceStop && !isPast && (
                              <span className="w-2 h-2 rounded-full bg-masuma-orange animate-ping" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold line-clamp-2 leading-tight">
                            {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Stage Summary Banner */}
                {(() => {
                  const targetObj = MILESTONE_STOPS.find(s => s.id === selectedStopId) || MILESTONE_STOPS[0];
                  return (
                    <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-2xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-md inline-block mb-1">
                            Graduating to Stop {targetObj.step} of 10
                          </span>
                          <h4 className="text-sm font-black text-indigo-950 uppercase">
                            {targetObj.label}
                          </h4>
                          <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                            {targetObj.desc}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block">Buyer Recipient</span>
                          <span className="text-xs font-black text-gray-900 block">{milestoneInvoice.customerEmail}</span>
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1 mt-0.5">
                            <Mail size={11} /> Branded Email Queued
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Operational Details Input Grid */}
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation size={14} className="text-indigo-600" />
                    Operational Logistics & Carrier Particulars
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Current Hub / Location *</label>
                      <input 
                        type="text"
                        required
                        value={milestoneForm.currentLocation}
                        onChange={e => setMilestoneForm({ ...milestoneForm, currentLocation: e.target.value })}
                        placeholder="e.g. Kilindini Port Berth 5, Mombasa"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Chassis Number / VIN</label>
                      <input 
                        type="text"
                        value={milestoneForm.chassisNumber}
                        onChange={e => setMilestoneForm({ ...milestoneForm, chassisNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. AXUH80-0012345"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Ro-Ro Vessel Name</label>
                      <input 
                        type="text"
                        value={milestoneForm.vesselName}
                        onChange={e => setMilestoneForm({ ...milestoneForm, vesselName: e.target.value })}
                        placeholder="e.g. Morning Post / MOL Cosmos"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Voyage Number</label>
                      <input 
                        type="text"
                        value={milestoneForm.voyageNumber}
                        onChange={e => setMilestoneForm({ ...milestoneForm, voyageNumber: e.target.value })}
                        placeholder="e.g. V.2410-E"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Bill of Lading (BL) No.</label>
                      <input 
                        type="text"
                        value={milestoneForm.billOfLadingNumber}
                        onChange={e => setMilestoneForm({ ...milestoneForm, billOfLadingNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. MOLU98765432"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Port of Loading</label>
                      <input 
                        type="text"
                        value={milestoneForm.portOfLoading}
                        onChange={e => setMilestoneForm({ ...milestoneForm, portOfLoading: e.target.value })}
                        placeholder="e.g. Yokohama Port, Japan"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Port of Discharge</label>
                      <input 
                        type="text"
                        value={milestoneForm.portOfDischarge}
                        onChange={e => setMilestoneForm({ ...milestoneForm, portOfDischarge: e.target.value })}
                        placeholder="e.g. Port of Mombasa, Kenya"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Port Arrival ETA Date</label>
                      <input 
                        type="date"
                        value={milestoneForm.etaDate}
                        onChange={e => setMilestoneForm({ ...milestoneForm, etaDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">KRA Simba / ICMS Entry No.</label>
                      <input 
                        type="text"
                        value={milestoneForm.kraEntryNumber}
                        onChange={e => setMilestoneForm({ ...milestoneForm, kraEntryNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. 25MBA-ICMS-12345"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">NTSA Number Plate (Allocated)</label>
                      <input 
                        type="text"
                        value={milestoneForm.registrationPlate}
                        onChange={e => setMilestoneForm({ ...milestoneForm, registrationPlate: e.target.value.toUpperCase() })}
                        placeholder="e.g. KDJ 789M"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                      Officer Status Remarks / Client Notification Message
                    </label>
                    <textarea 
                      rows={2}
                      value={milestoneForm.officerNotes}
                      onChange={e => setMilestoneForm({ ...milestoneForm, officerNotes: e.target.value })}
                      placeholder="Add specific details or updates that will appear in the client's automated email..."
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  {/* Notification Checkbox */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-200/80">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={milestoneForm.sendEmailNotification}
                        onChange={e => setMilestoneForm({ ...milestoneForm, sendEmailNotification: e.target.checked })}
                        className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black text-gray-900">
                        Dispatch Automated Milestone Notification Email to {milestoneInvoice.customerEmail}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Milestone History Log */}
                {(() => {
                  let history: any[] = [];
                  try {
                    history = JSON.parse(milestoneInvoice.trackingHistory || '[]');
                  } catch (e) {
                    history = [];
                  }

                  if (history.length === 0) return null;

                  return (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                        Logged Tracking History ({history.length} Stops Recorded)
                      </span>
                      <div className="divide-y divide-gray-200 max-h-36 overflow-y-auto pr-1 space-y-1">
                        {history.map((h, i) => (
                          <div key={i} className="pt-1.5 first:pt-0 flex items-start justify-between text-xs">
                            <div>
                              <p className="font-bold text-gray-900">{h.title || h.stop}</p>
                              <p className="text-[10px] text-gray-500">{h.location} • {h.notes}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 ml-2">
                              {h.timestamp ? new Date(h.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Pinned Action Footer */}
              <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur-sm px-6 py-3.5 border-t border-gray-100 flex items-center justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMilestone}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingMilestone ? <RefreshCw size={14} className="animate-spin" /> : <Ship size={14} />}
                  Confirm & Graduate Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportAdmin;
