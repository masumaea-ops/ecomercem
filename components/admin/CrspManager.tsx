import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, 
  Loader2, Download, Trash2, Search, Filter, Database,
  Edit2, X, Save, ChevronLeft, ChevronRight, Sparkles, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiClient } from '../../utils/apiClient';

const CrspManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('manage');
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [edition, setEdition] = useState<string>('2025');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manage State
  const [existingData, setExistingData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchExistingData();
    }
  }, [activeTab, page, search]);

  const fetchExistingData = async () => {
    setFetching(true);
    try {
      const response = await apiClient.get('/import-calculator/crsp', {
        params: { page, limit: 15, search }
      });
      setExistingData(response.data.results || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch CRSP data', err);
    } finally {
      setFetching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('edition', edition);
    formData.append('replace', String(replaceExisting));

    try {
      // Note: Do not pass explicit Content-Type header so browser automatically sets multipart/form-data with boundary
      const res = await apiClient.post('/import-calculator/upload-crsp-file', formData);
      setSuccess(res.data.message || 'CRSP file successfully uploaded and indexed.');
      setFile(null);
      fetchExistingData();
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Server endpoint not found (404). Please ensure the latest backend is compiled and PM2 is reloaded on your server.');
      } else if (err.response?.status === 413) {
        setError('File exceeds maximum upload size (413). Please increase Nginx client_max_body_size or upload the compressed CSV.');
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
        setError(errorMsg || 'Failed to upload CRSP file. Please verify columns and file format.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSeed2025 = async () => {
    if (!window.confirm('Seed official 2025 KRA CRSP schedule into the database? This indexes over 5,700 vehicles, motorcycles, and machinery.')) return;
    setSeeding(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post('/import-calculator/seed-2025-crsp');
      setSuccess(res.data.message || 'Seeded 2025 CRSP catalog successfully.');
      fetchExistingData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to seed 2025 CRSP.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await apiClient.delete(`/import-calculator/crsp/${id}`);
      fetchExistingData();
    } catch (err) {
      alert('Failed to delete record');
    }
  };

  const startEdit = (record: any) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const saveEdit = async () => {
    try {
      await apiClient.put(`/import-calculator/crsp/${editingId}`, editForm);
      setEditingId(null);
      fetchExistingData();
    } catch (err) {
      alert('Failed to save changes');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">KRA CRSP Management</h1>
          <p className="text-sm text-gray-500 font-medium">Manage and update official Current Retail Selling Price (CRSP) benchmarks for Kenya vehicle imports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeed2025}
            disabled={seeding}
            className="bg-masuma-orange text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all flex items-center shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
            {seeding ? 'Indexing 5,700+ Vehicles...' : 'Seed 2025 KRA CRSP'}
          </button>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Browse Catalog ({total.toLocaleString()})
            </button>
            <button 
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload Excel / CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold">
          <AlertTriangle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold">
          <CheckCircle2 size={20} className="shrink-0" />
          {success}
        </div>
      )}

      {activeTab === 'upload' ? (
        <div className="max-w-2xl bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
            <Upload size={20} className="text-masuma-orange" />
            Upload Official KRA CRSP Schedule
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Upload the official KRA Excel workbook (.xlsx/.xls) or CSV containing motor vehicles, motorcycles, and commercial equipment. The system will automatically map multiline headers and index all records.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">CRSP Schedule Edition</label>
              <input 
                type="text"
                value={edition}
                onChange={e => setEdition(e.target.value)}
                placeholder="2025"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center text-xs font-bold text-gray-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-gray-300 text-masuma-orange focus:ring-masuma-orange mr-2"
                />
                Replace existing {edition} records
              </label>
            </div>
          </div>

          <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${file ? 'border-green-300 bg-green-50/50' : 'border-gray-200 hover:border-masuma-orange'}`}>
            <input type="file" id="crsp-file-input" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
            <label htmlFor="crsp-file-input" className="cursor-pointer block">
              <FileSpreadsheet className={`w-14 h-14 mx-auto mb-3 ${file ? 'text-green-600' : 'text-gray-300'}`} />
              <p className="text-sm font-black text-gray-900 mb-1">{file ? file.name : 'Click to select CRSP Excel or CSV file'}</p>
              <p className="text-xs text-gray-400 font-medium">Accepts .xlsx, .xls, and .csv up to 50MB</p>
            </label>
          </div>

          {file && (
            <button
              onClick={handleUploadFile}
              disabled={uploading}
              className="w-full bg-masuma-dark text-white py-4 rounded-2xl font-black uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-black/10"
            >
              {uploading ? <Loader2 size={20} className="animate-spin mr-2" /> : <Database size={20} className="mr-2" />}
              {uploading ? 'Processing & Indexing Records...' : 'Start Ingestion'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Make, Model, or Chassis (e.g. Prado, AXUH80)..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-masuma-orange focus:border-masuma-orange"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Showing <b>{existingData.length}</b> of <b>{total.toLocaleString()}</b> records</span>
              <div className="flex items-center gap-1 ml-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="px-2">Page {page} of {Math.max(1, Math.ceil(total / 15))}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Make</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Model/Chassis #</th>
                  <th className="px-6 py-4">Engine (CC)</th>
                  <th className="px-6 py-4">Fuel</th>
                  <th className="px-6 py-4">Body / Drive</th>
                  <th className="px-6 py-4 text-right">CRSP Value (KES)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {fetching ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-masuma-orange" />Fetching catalog...</td></tr>
                ) : existingData.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold">No CRSP records found matching "{search}". Click "Seed 2025 KRA CRSP" to populate.</td></tr>
                ) : existingData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    {editingId === record.id ? (
                      <>
                        <td className="px-6 py-2"><input type="text" value={editForm.make} onChange={e => setEditForm({...editForm, make: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="text" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="text" value={editForm.modelNumber || ''} onChange={e => setEditForm({...editForm, modelNumber: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="number" value={editForm.engineSize || ''} onChange={e => setEditForm({...editForm, engineSize: parseFloat(e.target.value)})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="text" value={editForm.fuelType || ''} onChange={e => setEditForm({...editForm, fuelType: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="text" value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" /></td>
                        <td className="px-6 py-2"><input type="number" value={editForm.crspValue} onChange={e => setEditForm({...editForm, crspValue: parseFloat(e.target.value)})} className="w-full p-1.5 border rounded-lg text-xs text-right font-bold text-masuma-orange" /></td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-black text-gray-900">{record.make}</td>
                        <td className="px-6 py-4 font-bold text-gray-800">{record.model}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{record.modelNumber || '-'}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{record.engineSize ? `${record.engineSize} CC` : '-'}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{record.fuelType || 'GASOLINE'}</td>
                        <td className="px-6 py-4 text-gray-500 text-xs">{[record.category, record.driveConfiguration].filter(Boolean).join(' • ') || '-'}</td>
                        <td className="px-6 py-4 text-right font-black text-masuma-orange">{Number(record.crspValue || 0).toLocaleString()} KES</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                            <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrspManager;
