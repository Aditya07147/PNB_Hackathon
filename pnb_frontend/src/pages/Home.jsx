import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Loader2, Server, Globe, Box, ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import ScanModal from '../components/ScanModal';

const Home = () => {
  const [data, setData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassScanning, setIsMassScanning] = useState(false);

  const loadData = () => api.getDashboard().then(res => setData(res.data)).catch(err => console.error(err));
  useEffect(() => { loadData(); }, []);

  const handleMassScan = async () => {
    setIsMassScanning(true);
    try { await api.scanAllPnb(); await loadData(); } 
    catch (err) { console.error("Mass scan failed", err); } 
    finally { setIsMassScanning(false); }
  };

  if (!data) return <div className="flex justify-center items-center h-full text-[#8b1528] font-black text-xl gap-3"><Loader2 className="animate-spin" size={30}/> Initializing Secure Data Grid...</div>;

  const riskData = [
    { name: 'Critical', count: data.risk_distribution['Critical'], color: '#ef4444' },
    { name: 'Legacy', count: data.risk_distribution['Legacy'], color: '#f97316' },
    { name: 'Standard', count: data.risk_distribution['Standard'], color: '#facc15' },
    { name: 'Elite-PQC', count: data.risk_distribution['Elite-PQC'], color: '#10b981' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-[1600px] mx-auto">
      <ScanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onScanComplete={loadData} />
      
      {/* CLEAN ACTION BAR (No Duplicate Logo) */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-black text-[#8b1528] uppercase tracking-wider">Quantum Risk Dashboard</h2>
        <div className="flex gap-3">
          <button onClick={() => setIsModalOpen(true)} className="bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-700 transition-all shadow-md">
            <Plus size={18} /> CUSTOM SCAN
          </button>
          <button onClick={handleMassScan} disabled={isMassScanning} className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-[#8b1528] px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
            {isMassScanning ? <><Loader2 size={18} className="animate-spin" /> SCANNING NETWORK...</> : <><RefreshCw size={18} /> SCAN ALL ASSETS</>}
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-blue-500 relative overflow-hidden">
          <Server className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Assets</p>
          <h3 className="text-4xl font-black">{data.kpis.total}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-emerald-500 relative overflow-hidden">
          <Globe className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Web Apps</p>
          <h3 className="text-4xl font-black">{data.kpis.web}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-blue-400 relative overflow-hidden">
          <Box className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">APIs</p>
          <h3 className="text-4xl font-black">{data.kpis.apis}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-indigo-500 relative overflow-hidden">
          <Server className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Servers</p>
          <h3 className="text-4xl font-black">{data.kpis.servers}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-red-500 relative overflow-hidden">
          <AlertTriangle className="absolute right-[-10px] bottom-[-10px] opacity-10 text-red-500" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Expiring Certs</p>
          <h3 className="text-4xl font-black text-red-400">{data.kpis.expiring_certs}</h3>
        </div>
        <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-md border-t-4 border-red-700 relative overflow-hidden">
          <ShieldAlert className="absolute right-[-10px] bottom-[-10px] opacity-10 text-red-500" size={80} />
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">High Risk</p>
          <h3 className="text-4xl font-black text-red-500">{data.kpis.high_risk}</h3>
        </div>
      </div>

      {/* FOUR DATA CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-2">Asset Type Dist.</h3>
          <div className="h-44"><ResponsiveContainer><PieChart><Pie data={data.asset_types} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={5}>{data.asset_types.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-2">Risk Distribution</h3>
          <div className="h-44"><ResponsiveContainer><BarChart data={riskData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill: '#f1f5f9'}}/><Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>{riskData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer></div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Cert Expiry Timeline</h3>
          <div className="space-y-4 w-full">
            {data.cert_expiry.map((item, i) => (
              <div key={i} className="flex items-center gap-3 w-full">
                <span className="text-xs font-bold text-gray-500 w-20">{item.range}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max((item.count / (data.kpis.total || 1)) * 100, 5)}%`, backgroundColor: item.color }}></div></div>
                <span className="text-xs font-black text-gray-800 w-6">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-2">IP Breakdown</h3>
          <div className="h-44"><ResponsiveContainer><PieChart><Pie data={[{name: 'IPv4', value: 100}]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" fill="#3b82f6" label/></PieChart></ResponsiveContainer></div>
        </div>
      </div>

      {/* LIVE INVENTORY TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50"><h3 className="text-sm font-black text-[#8b1528] uppercase tracking-widest">Live Asset Inventory</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">
              <tr><th className="px-6 py-4">Asset URL</th><th className="px-6 py-4">IPv4 Address</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Risk Tier</th><th className="px-6 py-4">Cert Status</th><th className="px-6 py-4">Key Length</th><th className="px-6 py-4">Last Scan</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-medium">
              {data.recent_scans.slice(0, 8).map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-blue-600 font-bold">{s.target_url}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{s.ip_address}</td>
                  <td className="px-6 py-4 text-gray-700">{s.type}</td>
                  <td className="px-6 py-4"><span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-white shadow-sm ${s.risk_tier.includes('Elite')?'bg-green-500':s.risk_tier.includes('Standard')?'bg-yellow-500':s.risk_tier.includes('Legacy')?'bg-orange-500':'bg-red-500'}`}>{s.risk_tier}</span></td>
                  <td className="px-6 py-4 flex items-center gap-2 font-bold text-xs">
                    {s.cert_status === 'Valid' ? <CheckCircle size={16} className="text-green-500"/> : s.cert_status === 'Expired' ? <XCircle size={16} className="text-red-500"/> : <AlertTriangle size={16} className="text-yellow-500"/>} {s.cert_status}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">{s.key_length}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(s.scan_date).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
export default Home;
