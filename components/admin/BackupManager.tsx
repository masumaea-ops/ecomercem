import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  HardDrive, 
  Layers, 
  Clock, 
  FileCode, 
  CheckCircle2, 
  FileSpreadsheet, 
  ShieldAlert,
  Server,
  Package,
  ShoppingCart,
  Users,
  Smartphone,
  Info
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface BackupItem {
  filename: string;
  size: number;
  formattedSize: string;
  createdAt: string;
  format: 'SQL' | 'JSON';
}

interface DatabaseStats {
  success: boolean;
  dbType: string;
  database: string;
  totalTables: number;
  totalRecords: number;
  tables: Record<string, number>;
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupFormat, setBackupFormat] = useState<'sql' | 'json'>('sql');
  const [lastBackupResult, setLastBackupResult] = useState<any>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Migration & Seeding State
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [migrationAlert, setMigrationAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, listRes, migRes] = await Promise.all([
        apiClient.get('/backup/stats'),
        apiClient.get('/backup/list'),
        apiClient.get('/backup/migration-status')
      ]);
      setStats(statsRes.data);
      setBackups(listRes.data.backups || []);
      setMigrationStatus(migRes.data);
    } catch (err: any) {
      console.error('Failed to load backup data:', err);
      setError(err.response?.data?.error || 'Failed to connect to backup service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationAlert(null);
    try {
      const res = await apiClient.post('/backup/migrate');
      setMigrationAlert({
        type: 'success',
        message: `Schema synchronized: ${res.data.totalTables} active entity tables verified.`
      });
      await fetchData();
    } catch (err: any) {
      setMigrationAlert({
        type: 'error',
        message: err.response?.data?.error || 'Failed to synchronize schema.'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRunSeed = async () => {
    setIsSeeding(true);
    setMigrationAlert(null);
    try {
      const res = await apiClient.post('/backup/seed');
      setMigrationAlert({
        type: 'success',
        message: `Baseline seeding complete: ${res.data.branch} verified, ${res.data.categoriesCreated} categories created, ${res.data.productsCreated} catalog items created.`
      });
      await fetchData();
    } catch (err: any) {
      setMigrationAlert({
        type: 'error',
        message: err.response?.data?.error || 'Failed to seed baseline data.'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateBackup = async (format: 'sql' | 'json') => {
    setIsBackingUp(true);
    setBackupFormat(format);
    setError(null);
    setLastBackupResult(null);

    try {
      const res = await apiClient.post(`/backup/create?format=${format}`);
      if (res.data && res.data.success) {
        setLastBackupResult(res.data.backup);
        await fetchData(); // Refresh list and stats
      }
    } catch (err: any) {
      console.error('Backup creation error:', err);
      setError(err.response?.data?.error || 'Failed to create database backup snapshot');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const response = await apiClient.get(`/backup/download/${filename}`, {
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { 
        type: filename.endsWith('.sql') ? 'application/sql' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to download backup file. Check server permissions.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete backup snapshot "${filename}"?`)) {
      return;
    }

    setDeletingFile(filename);
    try {
      await apiClient.delete(`/backup/${filename}`);
      setBackups(prev => prev.filter(b => b.filename !== filename));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.response?.data?.error || 'Failed to delete backup file');
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-masuma-dark text-masuma-orange rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-masuma-dark font-display uppercase tracking-tight">
                Database Backup & Disaster Recovery
              </h1>
              <p className="text-xs text-gray-500">
                Create full on-demand SQL snapshots, download offsite archives, and protect your store against data loss.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full font-mono text-[11px]">
              <Server size={12} className="text-masuma-orange" />
              Engine: <strong className="text-masuma-dark">{stats?.dbType || 'MySQL 8.0'}</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full font-mono text-[11px]">
              <HardDrive size={12} className="text-blue-600" />
              Database: <strong className="text-masuma-dark">{stats?.database || 'masuma_db'}</strong>
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleCreateBackup('sql')}
            disabled={isBackingUp}
            className="bg-masuma-dark hover:bg-masuma-orange text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isBackingUp && backupFormat === 'sql' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Initiate SQL Backup
          </button>

          <button
            onClick={() => handleCreateBackup('json')}
            disabled={isBackingUp}
            className="bg-white border-2 border-gray-200 hover:border-masuma-dark text-masuma-dark px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition flex items-center gap-2 disabled:opacity-50"
          >
            {isBackingUp && backupFormat === 'json' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileCode size={16} className="text-gray-500" />
            )}
            JSON Export
          </button>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
            title="Refresh database stats and backup list"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Success Banner when a backup was just created */}
      {lastBackupResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in text-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">
                Backup Successfully Generated!
              </h3>
              <p className="text-emerald-800 mt-0.5">
                Snapshot <code className="font-mono font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded">{lastBackupResult.filename}</code> ({lastBackupResult.formattedSize}) containing <strong>{lastBackupResult.totalRows} records</strong> across <strong>{lastBackupResult.tablesCount} tables</strong> is ready.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(lastBackupResult.filename)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-sm shrink-0"
          >
            <Download size={14} /> Download File Now
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Database Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Catalog Parts</span>
            <Package size={16} className="text-masuma-orange" />
          </div>
          <p className="text-2xl font-bold text-masuma-dark font-display">
            {stats?.tables?.['products'] !== undefined ? stats.tables['products'].toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-500">Active SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Total Orders</span>
            <ShoppingCart size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-masuma-dark font-display">
            {stats?.tables?.['orders'] !== undefined ? stats.tables['orders'].toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-500">Customer Purchases</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">M-Pesa Logs</span>
            <Smartphone size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-masuma-dark font-display">
            {stats?.tables?.['mpesa_transactions'] !== undefined ? stats.tables['mpesa_transactions'].toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-500">Payment Audit Trails</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Customers</span>
            <Users size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-masuma-dark font-display">
            {stats?.tables?.['customers'] !== undefined ? stats.tables['customers'].toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-500">Registered CRM</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-400">Inventory Stock</span>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-masuma-dark font-display">
            {stats?.tables?.['product_stocks'] !== undefined ? stats.tables['product_stocks'].toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-500">Branch Quantities</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm bg-gradient-to-br from-masuma-dark to-gray-900 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-gray-300">Total Records</span>
            <Database size={16} className="text-masuma-orange" />
          </div>
          <p className="text-2xl font-bold text-white font-display">
            {stats?.totalRecords !== undefined ? stats.totalRecords.toLocaleString() : '...'}
          </p>
          <span className="text-[10px] text-gray-400">Across {stats?.totalTables || 0} Tables</span>
        </div>
      </div>

      {/* Migration & Seeding Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-masuma-orange/10 text-masuma-orange rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Layers size={14} /> Schema & Baseline State
            </div>
            <h2 className="text-lg font-bold text-masuma-dark font-display uppercase tracking-tight">
              Automatic Database Migration & Seeding Engine
            </h2>
            <p className="text-xs text-gray-500 max-w-xl">
              The server automatically migrates schema and seeds missing baseline entities on startup. You can also trigger a non-destructive refresh on-demand.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunMigration}
              disabled={isMigrating}
              className="bg-masuma-dark hover:bg-masuma-orange text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isMigrating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Run Schema Sync
            </button>

            <button
              onClick={handleRunSeed}
              disabled={isSeeding}
              className="bg-masuma-orange hover:bg-masuma-dark text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Seed Baseline Data
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {migrationAlert && (
          <div className={`mt-4 p-4 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in ${
            migrationAlert.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {migrationAlert.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{migrationAlert.message}</span>
          </div>
        )}

        {/* Live Integrity Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Schema Status</span>
              <strong className="text-xs text-masuma-dark font-mono">{migrationStatus?.totalTables || stats?.totalTables || 0} Tables Synced</strong>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Server size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Headquarters Branch</span>
              <strong className="text-xs text-masuma-dark truncate block max-w-[130px]" title="Ruby Mall (NBI-HQ)">
                {migrationStatus?.branchCount ? 'Ruby Mall (HQ)' : 'Not Found'}
              </strong>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Super Administrator</span>
              <strong className="text-xs text-masuma-dark font-mono truncate block max-w-[130px]">
                {migrationStatus?.adminExists ? 'admin@masuma.africa' : 'Missing'}
              </strong>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Categories & SKUs</span>
              <strong className="text-xs text-masuma-dark">
                {migrationStatus?.categoryCount || 0} Cats / {migrationStatus?.productCount || 0} Parts
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Table & 3-2-1 Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Backup History Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold uppercase tracking-tight text-masuma-dark font-display">
                Available Backup Snapshots
              </h2>
              <p className="text-xs text-gray-500">
                Snapshots stored on the server file system. Click "Download" to save offsite.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
              {backups.length} Saved {backups.length === 1 ? 'File' : 'Files'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 size={32} className="animate-spin text-masuma-orange mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Scanning Backup Archives...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Database size={24} />
              </div>
              <h3 className="font-bold text-sm text-masuma-dark uppercase tracking-wide">No Backups Generated Yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                You do not have any saved database snapshots on this server. Click below to take your first full backup now.
              </p>
              <button
                onClick={() => handleCreateBackup('sql')}
                disabled={isBackingUp}
                className="bg-masuma-dark hover:bg-masuma-orange text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition shadow-md inline-flex items-center gap-2"
              >
                <Download size={14} /> Take Initial Backup Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Snapshot File</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Created Date (EAT)</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backups.map((item) => (
                    <tr key={item.filename} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          <FileCode size={18} className="text-masuma-orange shrink-0" />
                          <span className="font-mono font-bold text-gray-800 text-[11px] truncate max-w-xs">
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          item.format === 'SQL' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.format}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-600 font-semibold">
                        {item.formattedSize}
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400" />
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(item.filename)}
                            disabled={downloadingFile === item.filename}
                            className="p-2 bg-gray-100 hover:bg-masuma-dark hover:text-white rounded-lg transition text-gray-700 disabled:opacity-50"
                            title="Download to your computer"
                          >
                            {downloadingFile === item.filename ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(item.filename)}
                            disabled={deletingFile === item.filename}
                            className="p-2 bg-gray-100 hover:bg-red-600 hover:text-white rounded-lg transition text-gray-400 disabled:opacity-50"
                            title="Delete snapshot"
                          >
                            {deletingFile === item.filename ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: 3-2-1 Strategy & Safe Recovery Protocol */}
        <div className="space-y-6">
          
          {/* 3-2-1 Rule Card */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm">
            <div className="flex items-center gap-2 text-masuma-orange mb-3">
              <ShieldCheck size={20} />
              <h3 className="font-bold text-xs uppercase tracking-wider text-masuma-dark font-display">
                The 3-2-1 Backup Strategy
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              To guarantee complete zero-loss protection against hardware faults, ransomware, or unexpected deletions:
            </p>
            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <span className="font-bold text-masuma-orange text-sm font-mono">3</span>
                <div>
                  <strong className="block text-masuma-dark">Copies of Data:</strong>
                  <span className="text-[11px] text-gray-500">Live production DB, server snapshots, and offsite copies.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <span className="font-bold text-masuma-orange text-sm font-mono">2</span>
                <div>
                  <strong className="block text-masuma-dark">Different Storage Media:</strong>
                  <span className="text-[11px] text-gray-500">Server SSD drive and external admin physical storage.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                <span className="font-bold text-masuma-orange text-sm font-mono">1</span>
                <div>
                  <strong className="block text-masuma-dark">Offsite Location:</strong>
                  <span className="text-[11px] text-gray-500">Download the SQL file and store it in Google Drive or encrypted cloud.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Disaster Recovery Checklist */}
          <div className="bg-masuma-dark text-white p-6 rounded-3xl shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-masuma-orange font-display mb-3 flex items-center gap-2">
              <Info size={16} /> How To Restore In An Emergency
            </h3>
            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <p>
                <strong>1. Download:</strong> Keep a regular weekly or daily downloaded copy of <code className="font-mono text-masuma-orange">masuma_backup_*.sql</code>.
              </p>
              <p>
                <strong>2. Standard Import:</strong> The downloaded SQL file is standard MySQL 8.0 syntax. In any new MySQL host or cPanel/phpMyAdmin, simply run:
              </p>
              <div className="bg-black/50 p-2.5 rounded-lg font-mono text-[10px] text-green-400 overflow-x-auto">
                mysql -u [user] -p masuma_db &lt; masuma_backup.sql
              </div>
              <p className="text-[11px] text-gray-400 pt-2 border-t border-white/10">
                All foreign key constraints, table structures, and record associations will be restored cleanly without data loss.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default BackupManager;
