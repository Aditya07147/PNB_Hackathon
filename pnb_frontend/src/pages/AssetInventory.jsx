import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Search, Database, Trash2, AlertCircle } from 'lucide-react';

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
    if (window.confirm(`Permanently delete record for ${url}?`)) {
      try {
        await api.deleteScan(id);
        loadInventory();
      } catch (err) { alert("Delete failed."); }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("CRITICAL ACTION: Are you sure you want to delete ALL discovered assets? This cannot be undone.")) {
      try {
        await api.deleteAllScans();
        loadInventory();
      } catch (err) { alert("Bulk delete failed."); }
    }
  };

  if (!data) return <div className="p-10 font-bold text-pnb-maroon animate-pulse">Accessing Secure Vault...</div>;

  const filtered = (data.scans || []).filter(s => s.target_url.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pnb-maroon text-white rounded-2xl shadow-lg shadow-red-900/20">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-pnb-maroon">Master Inventory</h2>
            <p className="text-xs text-gray-400 font-bold uppercase">{filtered.length} Active Records</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <input 
              type="text" placeholder="Search Endpoint..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-none bg-gray-100 focus:ring-2 focus:ring-pnb-gold transition-all"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
          <button 
            onClick={handleDeleteAll}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-3 rounded-2xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm shadow-red-100"
          >
            <Trash2 size={18} /> <span className="hidden sm:inline">Delete All</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-8 py-5">Asset Endpoint</th>
              <th className="px-8 py-5">Network IP</th>
              <th className="px-8 py-5">Health Tier</th>
              <th className="px-8 py-5">Score</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-all group">
                <td className="px-8 py-5">
                  <div className="font-bold text-blue-600 flex items-center gap-2">
                    {s.target_url}
                  </div>
                </td>
                <td className="px-8 py-5 font-mono text-gray-500 text-xs">{s.ip_address}</td>
                <td className="px-8 py-5">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                     s.risk_tier === 'Elite-PQC' ? 'bg-green-100 text-green-700' : 
                     s.risk_tier === 'Standard' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-red-100 text-red-700'
                   }`}>{s.risk_tier}</span>
                </td>
                <td className="px-8 py-5">
                  <span className="font-black text-gray-700">{s.simple_score || '0'}/10</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleDelete(s.id, s.target_url)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-3">
             <AlertCircle size={48} className="text-gray-200" />
             <p className="text-gray-400 font-bold">No assets discovered in inventory.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
export default AssetInventory;