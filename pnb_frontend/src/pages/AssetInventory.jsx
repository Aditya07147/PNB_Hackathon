import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Search, Database, Trash2 } from 'lucide-react';

const AssetInventory = () => {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');

  const loadInventory = () => {
    api.get('/api/export/all')
       .then(res => setData(res.data))
       .catch(err => console.error(err));
  };

  useEffect(() => { loadInventory(); }, []);

  const handleDelete = async (id, url) => {
    if (window.confirm(`Are you sure you want to permanently delete the asset record for ${url}?`)) {
      try {
        await api.deleteScan(id);
        loadInventory(); // Refresh the table
      } catch (err) {
        alert("Failed to delete the asset.");
      }
    }
  };

  if (!data) return <div className="p-10 font-bold text-pnb-maroon animate-pulse">Accessing Secure Vault...</div>;

  const filtered = data.scans.filter(s => s.target_url.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-pnb-maroon flex items-center gap-3"><Database /> Master Inventory</h2>
        <div className="relative w-96">
          <input 
            type="text" placeholder="Search Asset..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-pnb-gold"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
              <th className="px-8 py-5">Asset Endpoint</th>
              <th className="px-8 py-5">Network IP</th>
              <th className="px-8 py-5">Crypto Health</th>
              <th className="px-8 py-5">Score (0-10)</th>
              <th className="px-8 py-5 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5 font-bold text-blue-600 italic">{s.target_url}</td>
                <td className="px-8 py-5 font-mono text-gray-500">{s.ip_address}</td>
                <td className="px-8 py-5">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                     s.risk_tier === 'Elite-PQC' ? 'bg-green-100 text-green-700' : 
                     s.risk_tier === 'Standard' ? 'bg-yellow-100 text-yellow-700' :
                     s.risk_tier === 'Legacy' ? 'bg-orange-100 text-orange-700' :
                     'bg-red-100 text-red-700'
                   }`}>{s.risk_tier}</span>
                </td>
                <td className="px-8 py-5 font-black text-gray-700 text-lg">{s.simple_score || '0'}</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleDelete(s.id, s.target_url)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default AssetInventory;
