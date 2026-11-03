import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, ShieldX, Clock, 
  Search, Filter, ExternalLink, MessageSquare,
  AlertTriangle, CheckCircle2, MoreVertical
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { FraudReport } from '../../types';

const FraudAdmin: React.FC = () => {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/fraud/reports');
      setReports(res.data);
    } catch (e) {
      console.error('Error fetching fraud reports', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/fraud/reports/${id}`, { status });
      fetchReports();
    } catch (e) {
      console.error('Error updating report status', e);
    }
  };

  const filteredReports = reports.filter(r => filter === 'ALL' || r.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'INVESTIGATING': return 'bg-blue-100 text-blue-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'DISMISSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud & Safety Center</h1>
          <p className="text-gray-500">Monitor and investigate suspicious marketplace activity.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border-gray-300 text-sm"
          >
            <option value="ALL">All Reports</option>
            <option value="PENDING">Pending</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
          <button onClick={fetchReports} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Clock className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reported Listing</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reporter</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-8 bg-gray-50/50"></td>
                </tr>
              ))
            ) : filteredReports.length > 0 ? (
              filteredReports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{report.listing?.title || 'Unknown Listing'}</p>
                        <p className="text-xs text-gray-500">ID: {report.listingId?.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      {report.reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{report.reporter?.fullName}</p>
                    <p className="text-xs text-gray-500">{report.reporter?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {report.status === 'PENDING' && (
                        <button 
                          onClick={() => handleUpdateStatus(report.id, 'INVESTIGATING')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Investigate"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Resolve"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Dismiss"
                      >
                        <ShieldX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p>No reports found for this filter.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FraudAdmin;
