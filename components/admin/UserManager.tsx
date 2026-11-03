import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, Shield, Key, Trash2, 
  Edit, Loader2, Building, CheckCircle2, 
  AlertCircle, X, Check, Power, RefreshCw,
  Phone, Mail, Lock, UserCheck, UserX, Tag
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { Branch } from '../../types';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  discountPercentage: number;
  businessName?: string;
  taxId?: string;
  phone?: string;
  address?: string;
  branch?: {
    id: string;
    name: string;
  };
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<'ALL' | 'STAFF' | 'BUYERS' | 'B2B' | 'DISABLED'>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create User State
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    phone: '',
    role: 'CASHIER',
    branchId: ''
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit User Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'CASHIER',
    status: 'APPROVED',
    isActive: true,
    branchId: '',
    businessName: '',
    taxId: '',
    discountPercentage: 0,
    newPassword: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/branches')
      ]);
      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (error) {
      console.error(error);
      showFeedback('Failed to load user accounts.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Enable / Disable Account Toggle
  const handleToggleActive = async (user: UserData) => {
    const action = user.isActive ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} user account "${user.email}"?`)) return;

    setTogglingId(user.id);
    try {
      const res = await apiClient.patch(`/users/${user.id}/toggle-active`);
      showFeedback(res.data.message || `Account ${action}d successfully.`);
      fetchData();
    } catch (error: any) {
      showFeedback(error.response?.data?.error || `Failed to ${action} account.`, 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'CASHIER',
      status: user.status || 'APPROVED',
      isActive: user.isActive !== false,
      branchId: user.branch?.id || '',
      businessName: user.businessName || '',
      taxId: user.taxId || '',
      discountPercentage: Number(user.discountPercentage || 0),
      newPassword: ''
    });
    setIsEditing(true);
  };

  // Submit Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmittingEdit(true);

    try {
      const payload: any = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.toLowerCase().trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        status: editForm.status,
        isActive: editForm.isActive,
        branchId: editForm.branchId || null,
        businessName: editForm.businessName.trim() || null,
        taxId: editForm.taxId.trim() || null,
        discountPercentage: editForm.discountPercentage
      };

      if (editForm.newPassword && editForm.newPassword.trim().length >= 6) {
        payload.newPassword = editForm.newPassword.trim();
      }

      await apiClient.patch(`/users/${editingUser.id}`, payload);
      showFeedback(`User account ${editForm.email} updated successfully!`);
      setIsEditing(false);
      fetchData();
    } catch (error: any) {
      showFeedback(error.response?.data?.error || 'Failed to update user account.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      alert('Please fill in Full Name, Email, and Password.');
      return;
    }
    setIsSubmittingCreate(true);

    try {
      const payload = {
        fullName: newUser.fullName.trim(),
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password.trim(),
        phone: newUser.phone.trim() || undefined,
        role: newUser.role,
        branchId: newUser.branchId || undefined
      };

      await apiClient.post('/users', payload);
      setIsCreating(false);
      setNewUser({ fullName: '', email: '', password: '', phone: '', role: 'CASHIER', branchId: '' });
      showFeedback('User account created successfully!');
      fetchData();
    } catch (error: any) {
      showFeedback(error.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Delete User
  const handleDelete = async (user: UserData) => {
    if (!confirm(`CAUTION: Are you sure you want to PERMANENTLY DELETE user account "${user.fullName} (${user.email})"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(user.id);
    try {
      await apiClient.delete(`/users/${user.id}`);
      showFeedback(`User ${user.email} deleted successfully.`);
      fetchData();
    } catch (error: any) {
      showFeedback(error.response?.data?.error || 'Failed to delete user account.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    // 1. Quick Category Tab Filter
    if (categoryTab === 'STAFF' && !['ADMIN', 'MANAGER', 'CASHIER'].includes(u.role)) return false;
    if (categoryTab === 'BUYERS' && !['BUYER', 'IMPORT_USER'].includes(u.role)) return false;
    if (categoryTab === 'B2B' && !['B2B_USER', 'DEALER', 'INDIVIDUAL_SELLER'].includes(u.role)) return false;
    if (categoryTab === 'DISABLED' && u.isActive && u.status === 'APPROVED') return false;

    // 2. Search Query Matching
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.businessName || '').toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Dropdown Role Filter
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    // 4. Status Filter
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = u.isActive === true && u.status === 'APPROVED';
    } else if (statusFilter === 'DISABLED') {
      matchesStatus = u.isActive === false || u.status === 'REJECTED';
    } else if (statusFilter === 'PENDING') {
      matchesStatus = u.status === 'PENDING';
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter(u => u.isActive && u.status === 'APPROVED').length;
  const disabledCount = users.filter(u => !u.isActive || u.status === 'REJECTED').length;
  const buyerCount = users.filter(u => u.role === 'BUYER' || u.role === 'IMPORT_USER').length;
  const staffCount = users.filter(u => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'CASHIER').length;
  const b2bCount = users.filter(u => ['B2B_USER', 'DEALER', 'INDIVIDUAL_SELLER'].includes(u.role)).length;

  return (
    <div className="space-y-4 max-w-full pb-16">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-slide-up ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-masuma-orange bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full inline-block">
              Super Administrator Control
            </span>
            <span className="text-xs text-gray-300 font-bold">•</span>
            <span className="text-xs text-gray-500 font-bold">{users.length} Registered Accounts</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-masuma-dark tracking-tight uppercase">User & Account Management</h2>
        </div>

        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-masuma-dark text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-masuma-orange transition-all shadow-md shadow-black/10 shrink-0"
        >
          <UserPlus size={15} /> {isCreating ? 'Close Form' : 'Add New User'}
        </button>
      </div>

      {/* Metrics Row - Compact & Modern */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div 
          onClick={() => setCategoryTab('ALL')}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
            categoryTab === 'ALL' ? 'bg-orange-50/70 border-masuma-orange ring-2 ring-masuma-orange/30' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Total Users</span>
          <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">{users.length}</span>
          <span className="text-[10px] text-gray-500 block mt-1">Platform-wide</span>
        </div>

        <div 
          onClick={() => setCategoryTab('STAFF')}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
            categoryTab === 'STAFF' ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Staff / Admins</span>
          <span className="text-xl sm:text-2xl font-black text-blue-600 leading-none">{staffCount}</span>
          <span className="text-[10px] text-gray-500 block mt-1">Console Access</span>
        </div>

        <div 
          onClick={() => setCategoryTab('BUYERS')}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
            categoryTab === 'BUYERS' ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">Vehicle Buyers</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">{buyerCount}</span>
          <span className="text-[10px] text-gray-500 block mt-1">Import Clients</span>
        </div>

        <div 
          onClick={() => setCategoryTab('B2B')}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
            categoryTab === 'B2B' ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/30' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block mb-0.5">B2B & Dealers</span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none">{b2bCount}</span>
          <span className="text-[10px] text-gray-500 block mt-1">Wholesale Terms</span>
        </div>

        <div 
          onClick={() => setCategoryTab('DISABLED')}
          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
            categoryTab === 'DISABLED' ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/30' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block mb-0.5">Suspended</span>
          <span className="text-xl sm:text-2xl font-black text-red-600 leading-none">{disabledCount}</span>
          <span className="text-[10px] text-gray-500 block mt-1">Login Blocked</span>
        </div>
      </div>

      {/* Create User Collapsible Drawer */}
      {isCreating && (
        <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-2xl shadow-lg border border-orange-200 animate-slide-up space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="font-black text-sm text-masuma-dark uppercase tracking-tight flex items-center gap-2">
              <UserPlus size={16} className="text-masuma-orange" />
              Provision New User Account
            </h3>
            <button type="button" onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Full Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Samuel Mutua" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.fullName}
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email Address *</label>
              <input 
                type="email" 
                required
                placeholder="user@masuma.africa" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Initial Password *</label>
              <input 
                type="password" 
                required
                placeholder="Minimum 6 characters" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mobile Phone</label>
              <input 
                type="tel" 
                placeholder="0712 345 678" 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.phone}
                onChange={e => setNewUser({...newUser, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assigned Role</label>
              <select 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="CASHIER">Cashier / POS Staff</option>
                <option value="MANAGER">Branch Manager</option>
                <option value="ADMIN">System Administrator</option>
                <option value="B2B_USER">B2B Wholesale Buyer</option>
                <option value="BUYER">Vehicle Import Buyer</option>
                <option value="DEALER">Motor Dealer</option>
                <option value="INDIVIDUAL_SELLER">Individual Seller</option>
                <option value="IMPORT_USER">Import Client</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Branch Location</label>
              <select 
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                value={newUser.branchId}
                onChange={e => setNewUser({...newUser, branchId: e.target.value})}
              >
                <option value="">Global / Headquarters (Nairobi)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmittingCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSubmittingCreate ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              Create Account
            </button>
          </div>
        </form>
      )}

      {/* Search & Segmented Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3.5">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { id: 'ALL', label: 'All Accounts', count: users.length },
            { id: 'STAFF', label: 'Staff & Admins', count: staffCount },
            { id: 'BUYERS', label: 'Vehicle Buyers', count: buyerCount },
            { id: 'B2B', label: 'Wholesale & Dealers', count: b2bCount },
            { id: 'DISABLED', label: 'Suspended Accounts', count: disabledCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap shadow-sm active:scale-95 ${
                categoryTab === tab.id
                  ? 'bg-masuma-dark text-white shadow-masuma-dark/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                categoryTab === tab.id ? 'bg-masuma-orange text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input and Advanced Selectors */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
          <div className="flex-1 w-full relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search user name, email, phone number, or business..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-masuma-orange focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-masuma-orange"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Administrators</option>
              <option value="MANAGER">Managers</option>
              <option value="CASHIER">Cashiers</option>
              <option value="BUYER">Vehicle Buyers</option>
              <option value="B2B_USER">B2B Wholesale</option>
              <option value="DEALER">Dealers</option>
              <option value="INDIVIDUAL_SELLER">Sellers</option>
            </select>

            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-masuma-orange"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Enabled)</option>
              <option value="DISABLED">Suspended (Disabled)</option>
              <option value="PENDING">Pending Review</option>
            </select>

            <button 
              onClick={fetchData}
              title="Refresh list"
              className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-colors shadow-sm active:scale-95"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* User Table Card - Natural Full Expansion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3 text-gray-400">
            <Loader2 className="animate-spin text-masuma-orange" size={36} />
            <span className="text-xs font-bold uppercase tracking-wider">Loading user database...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 px-6 text-center text-gray-400">
            <UserX size={48} className="mx-auto mb-3 text-gray-300" />
            <h4 className="text-base font-black text-gray-800 uppercase tracking-tight">No Users Found</h4>
            <p className="text-xs font-medium text-gray-500 mt-1 max-w-sm mx-auto">
              No registered user accounts match the current search filters or category.
            </p>
            {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || categoryTab !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                  setCategoryTab('ALL');
                }}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm min-w-[1100px] border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[11px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-[34%]">User Identity & Contact</th>
                  <th className="px-5 py-4 w-[16%]">Role & Clearance</th>
                  <th className="px-5 py-4 w-[18%]">Branch / Wholesale</th>
                  <th className="px-5 py-4 w-[14%]">Account State</th>
                  <th className="px-5 py-4 w-[10%]">Registered</th>
                  <th className="px-6 py-4 w-[8%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => {
                  const isActive = user.isActive && user.status === 'APPROVED';

                  return (
                    <tr key={user.id} className="hover:bg-orange-50/30 transition-colors group">
                      {/* Name, Avatar & Contact Details */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative shrink-0">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-105 ${
                              isActive 
                                ? 'bg-gradient-to-br from-orange-400 to-masuma-orange text-white shadow-orange-500/20' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`} title={isActive ? 'Active User' : 'Disabled User'}></span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-gray-900 group-hover:text-masuma-orange transition-colors tracking-tight">
                                {user.fullName || 'Unnamed Account'}
                              </span>
                              {!isActive && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">
                                  Suspended
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 hover:text-masuma-orange transition-colors font-medium">
                                <Mail size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate max-w-[220px]">{user.email}</span>
                              </a>
                              {user.phone && (
                                <span className="flex items-center gap-1 text-gray-500 font-mono text-[11px]">
                                  <Phone size={11} className="text-gray-400 shrink-0" />
                                  <span>{user.phone}</span>
                                </span>
                              )}
                            </div>

                            {user.businessName && (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-50 text-masuma-orange border border-orange-200/60">
                                <Building size={10} /> {user.businessName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge & Explanatory Tag */}
                      <td className="px-5 py-4.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                            user.role === 'MANAGER' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                            user.role === 'CASHIER' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                            user.role === 'B2B_USER' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                            user.role === 'DEALER' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                            user.role === 'INDIVIDUAL_SELLER' ? 'bg-pink-100 text-pink-900 border border-pink-200' :
                            user.role === 'BUYER' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                            user.role === 'IMPORT_USER' ? 'bg-teal-100 text-teal-900 border border-teal-200' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <Shield size={12} className="shrink-0" /> {user.role.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium pl-0.5">
                            {user.role === 'ADMIN' ? 'Superadmin • Full Access' :
                             user.role === 'MANAGER' ? 'Branch Management' :
                             user.role === 'CASHIER' ? 'POS & Counter Sales' :
                             user.role === 'BUYER' ? 'Vehicle Concierge Client' :
                             user.role === 'B2B_USER' ? 'Wholesale Garage Partner' :
                             user.role === 'DEALER' ? 'Certified Dealership' : 'Direct User'}
                          </span>
                        </div>
                      </td>

                      {/* Branch / Wholesale Discount */}
                      <td className="px-5 py-4.5">
                        {user.role === 'B2B_USER' || user.role === 'DEALER' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-masuma-orange flex items-center gap-1">
                              <Tag size={12} /> {user.discountPercentage || 0}% Trade Discount
                            </span>
                            {user.taxId && <span className="text-[10px] text-gray-400 font-mono font-medium">KRA PIN: {user.taxId}</span>}
                          </div>
                        ) : user.branch ? (
                          <div className="flex items-center gap-1.5 text-gray-800 text-xs font-bold">
                            <Building size={13} className="text-masuma-orange shrink-0" />
                            <span>{user.branch.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                            <Building size={12} /> Global / HQ (Accra Rd)
                          </span>
                        )}
                      </td>

                      {/* Account State Toggle Switch */}
                      <td className="px-5 py-4.5">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          title={isActive ? 'Click to Suspend Account' : 'Click to Activate Account'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                          <Power size={12} className={togglingId === user.id ? 'animate-spin' : ''} />
                          <span>{isActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-4.5 text-gray-500 text-xs font-medium">
                        <span className="font-semibold text-gray-700 block">
                          {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(user)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-masuma-orange hover:text-white text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                            title="Edit User Details, Role & Password"
                          >
                            <Edit size={13} />
                            <span>Edit</span>
                          </button>

                          <button 
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                            title="Permanently Delete User"
                          >
                            {deletingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer Stats */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Showing <strong className="text-gray-900">{filteredUsers.length}</strong> of <strong className="text-gray-900">{users.length}</strong> user accounts</span>
            <span className="text-[11px] uppercase tracking-wider font-mono text-gray-400">Masuma EA Ltd • RBAC Enforcement Active</span>
          </div>
        )}
      </div>

      {/* EDIT USER MODAL (Responsive & Scrollable) */}
      {isEditing && editingUser && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsEditing(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-200 relative overflow-hidden my-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white px-6 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-masuma-orange rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 leading-tight">
                    Edit User Account: {editingUser.email}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Modify profile details, role permissions, active status, or reset credentials.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Container with Scrollable Body and Pinned Footer */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.fullName}
                    onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={editForm.email}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Phone</label>
                  <input 
                    type="tel" 
                    value={editForm.phone}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="0712 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">System Role</label>
                  <select 
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  >
                    <option value="ADMIN">System Administrator (Full Access)</option>
                    <option value="MANAGER">Branch Manager</option>
                    <option value="CASHIER">Cashier / POS Terminal</option>
                    <option value="B2B_USER">B2B Wholesale Partner</option>
                    <option value="BUYER">Vehicle Import Buyer</option>
                    <option value="DEALER">Motor Dealer</option>
                    <option value="INDIVIDUAL_SELLER">Individual Seller</option>
                    <option value="IMPORT_USER">Import Client</option>
                  </select>
                </div>
              </div>

              {/* Status & Account Activation Toggle */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                  Account Activation & Access Control
                </span>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={e => setEditForm({
                        ...editForm, 
                        isActive: e.target.checked,
                        status: e.target.checked ? 'APPROVED' : 'REJECTED'
                      })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Account Enabled (Active Access)</span>
                      <span className="text-[11px] text-gray-500 block">Uncheck to immediately disable and prevent user login.</span>
                    </div>
                  </label>

                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({
                      ...editForm, 
                      status: e.target.value,
                      isActive: e.target.value === 'APPROVED'
                    })}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800"
                  >
                    <option value="APPROVED">APPROVED (Active)</option>
                    <option value="PENDING">PENDING (Awaiting Review)</option>
                    <option value="REJECTED">REJECTED (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Branch Assignment</label>
                  <select 
                    value={editForm.branchId}
                    onChange={e => setEditForm({...editForm, branchId: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  >
                    <option value="">Global / Headquarters (Nairobi)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Wholesale Discount %</label>
                  <input 
                    type="number" 
                    min={0}
                    max={100}
                    value={editForm.discountPercentage}
                    onChange={e => setEditForm({...editForm, discountPercentage: Number(e.target.value)})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                  />
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200">
                <label className="block text-xs font-bold text-orange-950 uppercase mb-1 flex items-center gap-1.5">
                  <Key size={14} className="text-masuma-orange" />
                  Reset User Password (Optional)
                </label>
                <input 
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={editForm.newPassword}
                  onChange={e => setEditForm({...editForm, newPassword: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-orange-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
                />
                <span className="text-[10px] text-orange-900 mt-1 block">
                  Entering a new password will immediately override the user's password hash.
                </span>
              </div>
            </div>

            {/* Pinned Action Footer */}
            <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 border-t border-gray-100 flex justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit}
                className="px-6 py-2.5 bg-masuma-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20 disabled:opacity-50"
              >
                {isSubmittingEdit ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
};

export default UserManager;
