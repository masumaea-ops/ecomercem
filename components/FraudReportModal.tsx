import React, { useState } from 'react';
import { 
  AlertTriangle, X, ShieldAlert, CheckCircle2, 
  Info, Send, AlertCircle
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { FraudReportReason } from '../types';

interface FraudReportModalProps {
  listingId?: string;
  listingTitle?: string;
  onClose: () => void;
}

const FraudReportModal: React.FC<FraudReportModalProps> = ({ listingId, listingTitle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    reason: 'SCAM' as 'SCAM' | 'FAKE_MILEAGE' | 'STOLEN_VEHICLE' | 'MISLEADING_DESCRIPTION' | 'DEPOSIT_SCAM' | 'OTHER',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/fraud/report', {
        listingId,
        ...formData
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to submit report. Please ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Report Submitted</h3>
          <p className="text-gray-500">Thank you for helping keep Masuma safe. Our team will investigate this listing immediately.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-red-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center">
            <ShieldAlert className="w-6 h-6 mr-3" />
            <div>
              <h3 className="text-lg font-bold">Report Suspicious Activity</h3>
              {listingTitle && <p className="text-red-100 text-xs opacity-80 truncate max-w-[250px]">{listingTitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl mb-4 flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for reporting</label>
              <select 
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value as any })}
                className="w-full rounded-xl border-gray-200 focus:ring-red-500 focus:border-red-500 text-sm"
              >
                <option value="SCAM">Potential Scam / Fraud</option>
                <option value="DEPOSIT_SCAM">Seller asking for deposit before viewing</option>
                <option value="FAKE_MILEAGE">Suspected Mileage Tampering</option>
                <option value="STOLEN_VEHICLE">Suspected Stolen Vehicle</option>
                <option value="MISLEADING_DESCRIPTION">Misleading / Incorrect Information</option>
                <option value="OTHER">Other Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Details</label>
              <textarea 
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide specific details about why you are reporting this listing..."
                className="w-full rounded-xl border-gray-200 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start">
              <Info className="w-4 h-4 text-amber-600 mr-2 mt-0.5" />
              <p className="text-[11px] text-amber-800">
                <strong>Privacy Note:</strong> Your report is anonymous to the seller. We use these reports to maintain the integrity of our marketplace.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center justify-center text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Submit Report
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FraudReportModal;
