import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Server, Globe, Zap, Plus, RefreshCw, Loader2,
  Trash2, AlertTriangle, Monitor, Lock, LayoutGrid
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, PieChart, Pie, Legend
} from 'recharts';
import ScanModal from '../components/ScanModal';

const StatCard = ({ label, val, icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.04, y: -2 }}
    className={`p-5 rounded-2xl shadow-lg bg-gradient-to-br ${color} text-white relative overflow-hidden`}
  >
    <div className="absolute -top-4 -right-4 opacity-10">{React.cloneElement(icon, { size: 80 })}</div>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-xs opacity-80 font-semibold uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-3xl font-black mt-1">{val}</h3>
      </div>
      <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">{icon}</div>
    </div>
  </motion.div>
);

const RiskBadge = ({ tier }) => {
  const styles = {
    'Elite-PQC': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'Standard':  'bg-amber-100 text-amber-700 border border-amber-200',
    'Legacy':    'bg-orange-100 text-orange-700 border border-orange-200',
    'Critical':  'bg-red-100 text-red-700 border border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${styles[tier] || styles['Critical']}`}>
      {tier}
    </span>
  );
};

const Home = () => {
  const [data, setData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassScanning, setIsMassScanning] = useState(false);

  const loadData = () =>
    api.getDashboard().then(res => setData(res.data)).catch(err => console.error(err));

  useEffect(() => { loadData(); }, []);

  const handleMassScan = async () => {
    setIsMassScanning(true);
    try { await api.scanAllPnb(); await loadData(); }
    catch (err) { console.error('Mass scan failed', err); }
    finally { setIsMassScanning(false); }
  };

  const handleDelete = async (id, url) => {
    if (window.confirm(`Delete scan record for ${url}?`)) {
      try { await api.deleteScan(id); await loadData(); }
      catch (err) { alert('Failed to delete the scan.'); }
    }
  };

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="animate-spin text-pnb-maroon mx-auto mb-3" size={36} />
        <p className="text-pnb-maroon font-bold text-lg animate-pulse">Initializing Secure Environment...</p>
      </div>
    </div>
  );

  const riskData = [
    { name: 'Elite-PQC', count: data.risk_distribution['Elite-PQC'] || 0, color: '#10b981' },
    { name: 'Standard',  count: data.risk_distribution['Standard']  || 0, color: '#f59e0b' },
    { name: 'Legacy',    count: data.risk_distribution['Legacy']    || 0, color: '#f97316' },
    { name: 'Critical',  count: data.risk_distribution['Critical']  || 0, color: '#ef4444' },
  ];

  const pieData = riskData.filter(d => d.count > 0);

  const statCards = [
    { label: 'Total Assets',        val: data.total_assets_scanned,          icon: <Server size={20} />,       color: 'from-pnb-maroon to-red-800',     delay: 0 },
    { label: 'Public Web Apps',     val: data.public_web_apps ?? '—',         icon: <Monitor size={20} />,      color: 'from-blue-600 to-blue-800',      delay: 0.05 },
    { label: 'APIs',                val: data.exposed_apis,                   icon: <Globe size={20} />,        color: 'from-violet-600 to-violet-800',  delay: 0.1 },
    { label: 'Servers',             val: data.servers ?? '—',                 icon: <LayoutGrid size={20} />,   color: 'from-cyan-600 to-cyan-800',      delay: 0.15 },
    { label: 'Expiring Certs',      val: data.expiring_certs ?? '—',          icon: <Lock size={20} />,         color: 'from-amber-500 to-amber-700',    delay: 0.2 },
    { label: 'High Risk Assets',    val: data.risk_distribution['Critical'] || 0, icon: <AlertTriangle size={20} />, color: 'from-rose-600 to-rose-800', delay: 0.25 },
    { label: 'PQC Ready',           val: data.risk_distribution['Elite-PQC'] || 0, icon: <ShieldCheck size={20} />, color: 'from-emerald-500 to-emerald-700', delay: 0.3 },
    { label: 'Avg PQC Score',       val: `${data.avg_score}/10`,              icon: <Zap size={20} />,           color: 'from-indigo-500 to-indigo-700',  delay: 0.35 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <ScanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onScanComplete={loadData} />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((w, i) => <StatCard key={i} {...w} />)}
      </div>

      {/* Charts + Scanner Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-4">Asset Risk Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontWeight: 600, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-4">Asset Type Breakdown</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="count" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} formatter={(val) => <span className="text-xs font-semibold text-gray-600">{val}</span>} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scanner Console */}
        <div className="bg-pnb-maroon p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10"><ShieldCheck size={120} /></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">Scanner Console</h3>
            <p className="opacity-70 text-sm mb-5">Validate infrastructure against Shor's Algorithm threats.</p>
            <div className="space-y-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-white hover:bg-gray-100 text-pnb-maroon font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm"
              >
                <Plus size={18} /> CUSTOM TARGET SCAN
              </button>
              <button
                onClick={handleMassScan}
                disabled={isMassScanning}
                className="w-full bg-pnb-gold hover:bg-yellow-500 text-pnb-maroon font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-yellow-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {isMassScanning
                  ? <><Loader2 className="animate-spin" size={18} /> SCANNING PNB NETWORK...</>
                  : <><RefreshCw size={18} /> SCAN ALL PNB ASSETS</>}
              </button>
            </div>
          </div>
          {/* Mini legend */}
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            {riskData.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <span className="text-xs font-semibold opacity-90">{r.name}</span>
                <span className="text-xs font-black ml-auto">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Infrastructure Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800">Live Infrastructure Monitoring</h3>
          <span className="text-xs text-gray-400 font-medium">{data.recent_scans?.length || 0} assets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Target Asset</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Risk Tier</th>
                <th className="px-6 py-4">PQC Score</th>
                <th className="px-6 py-4">Cert Status</th>
                <th className="px-6 py-4">Last Scan</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data.recent_scans || []).map((s, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-gray-50/80 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-pnb-maroon text-sm">{s.target_url}</td>
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs">{s.ip_address || '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-medium">{s.asset_type || 'Web App'}</td>
                  <td className="px-6 py-4"><RiskBadge tier={s.risk_tier} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-pnb-gold h-full rounded-full transition-all" style={{ width: `${(s.simple_score || 0) * 10}%` }} />
                      </div>
                      <span className="font-black text-gray-700 text-sm">{s.simple_score || '0'}/10</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold ${s.cert_status === 'Expired' ? 'text-red-500' : s.cert_status === 'Expiring' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {s.cert_status || '✓ Valid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                    {new Date(s.scan_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(s.id, s.target_url)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Home;