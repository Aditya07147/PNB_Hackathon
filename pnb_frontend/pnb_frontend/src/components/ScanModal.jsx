import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Loader2 } from 'lucide-react';

const ScanModal = ({ isOpen, onClose, onScanComplete }) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScan = async () => {
    if (!targetUrl) {
      setError('Please enter a target URL.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.scanUrl(targetUrl);
      onScanComplete(response.data.data); // Pass new scan data back to parent
      setTargetUrl(''); // Reset form
      onClose(); // Close modal on success
    } catch (err) {
      setError(err.response?.data?.detail || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-pnb-maroon">Run New On-Demand Scan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              Target URL (e.g., pnbindia.in)
            </label>
            <input
              type="text"
              id="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pnb-gold focus:border-pnb-gold"
              placeholder="Enter domain or API endpoint"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleScan}
              disabled={loading}
              className="bg-pnb-gold text-white font-bold py-2 px-4 rounded shadow hover:bg-yellow-600 flex items-center disabled:bg-gray-400"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Scanning...
                </>
              ) : (
                'Start Scan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanModal;
