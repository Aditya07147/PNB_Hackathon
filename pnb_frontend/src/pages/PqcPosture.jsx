import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircle2, XCircle, ShieldAlert, Info, ArrowUpRight, Lock, Globe, Cpu, Zap } from 'lucide-react';

const PqcPosture = () => {
  const[scans, setScans] = useState([]);
  const [pqcData, setPqcData] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch both the full scan list AND the backend's PQC recommendations
    Promise.all([api.get('/api/export/all'), api.getPqc()])
      .then(([exportRes, pqcRes]) => {
        const allScans = exportRes.data.scans ||[];
        setScans(allScans);
        setPqcData(pqcRes.data);
        if (allScans.length > 0) setSelectedApp(allScans[0]); // Select first by default
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  },[]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-64 gap-4 text-[#8b1528]">
      <Zap size={40} className="animate-pulse" />
      <span className="font-black text-xl tracking-widest uppercase animate-pulse">Evaluating NIST Posture...</span>
    </div>
  );

  const total = scans.length || 1;
  const tiers = { Elite: 0, Standard: 0, Legacy: 0, Critical: 0 };
  scans.forEach(s => { 
    if (s.risk_tier === 'Elite-PQC') tiers.Elite++;
    else if (s.risk_tier) tiers[s.risk_tier]++; 
  });

  const pieData =[
    { name: 'Elite-PQC Ready', value: tiers.Elite, color: '#10b981' },
    { name: 'Standard',        value: tiers.Standard, color: '#f59e0b' },
    { name: 'Legacy',          value: tiers.Legacy,  color: '#f97316' },
    { name: 'Critical',        value: tiers.Critical, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const barData =[
    { label: 'Elite', count: tiers.Elite, fill: '#10b981' },
    { label: 'Std', count: tiers.Standard, fill: '#f59e0b' },
    { label: 'Lgc', count: tiers.Legacy, fill: '#f97316' },
    { label: 'Crit', count: tiers.Critical, fill: '#ef4444' },
  ];

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">

      {/* Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#8b1528]">PQC Compliance Dashboard</h2>
          <p className="text-gray-500 text-sm font-bold tracking-wider uppercase mt-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500"/> Alignment with NIST FIPS 203/204/205
          </p>
        </div>
        <div className="flex gap-2 flex-wrap text-xs font-black uppercase tracking-widest">
          <span className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 shadow-sm">Elite: {Math.round((tiers.Elite/total)*100)}%</span>
          <span className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">Standard: {Math.round((tiers.Standard/total)*100)}%</span>
          <span className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 shadow-sm">Critical: {tiers.Critical} Apps</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar: Assets by Grade */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Assets by Classification Grade</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={40}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: App Status */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Enterprise Status</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={5}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] font-bold text-gray-600">{v}</span>} />
                <Tooltip formatter={(v) => `${v} Assets`} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic NIST Migration Progress */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">NIST Migration Progress</h3>
          <div className="space-y-4">
             <div className="p-4 bg-slate-800 rounded-2xl text-white shadow-inner">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Phase 1: Discovery & Inventory</p>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-full"></div></div>
                <p className="text-right text-[10px] font-black mt-1">100%</p>
             </div>
             <div className="p-4 bg-slate-800 rounded-2xl text-white shadow-inner">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Phase 2: Vulnerability Assessment</p>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{width: '100%'}}></div></div>
                <p className="text-right text-[10px] font-black mt-1">100%</p>
             </div>
             <div className="p-4 bg-slate-800 rounded-2xl text-white shadow-inner border border-[#d9a05b]/30">
                <p className="text-[10px] font-bold text-[#d9a05b] uppercase mb-1">Phase 3: PQC Execution</p>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="bg-[#d9a05b] h-full" style={{width: `${Math.max((tiers.Elite/total)*100, 2)}%`}}></div></div>
                <p className="text-right text-[10px] font-black mt-1 text-[#d9a05b]">{Math.round((tiers.Elite/total)*100)}%</p>
             </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Master Asset Select Table */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-black text-[#8b1528] uppercase tracking-widest">Select Asset to Analyze</h3>
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">{scans.length} Total</span>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50 p-2">
            {scans.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedApp(s)}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all mb-1 ${selectedApp?.id === s.id ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <div>
                  <p className={`text-sm font-bold truncate max-w-[180px] ${selectedApp?.id === s.id ? 'text-blue-800' : 'text-gray-700'}`}>{s.target_url}</p>
                  <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{s.ip_address}</p>
                </div>
                {s.risk_tier === 'Elite-PQC' ? <CheckCircle2 size={20} className="text-green-500" /> : <ShieldAlert size={20} className={['Legacy','Critical'].includes(s.risk_tier) ? 'text-red-500' : 'text-amber-500'} />}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic App Detail Panel */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 shrink-0">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Asset Security Profile</h3>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            {selectedApp ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100"><Cpu size={24} className="text-indigo-600" /></div>
                  <div>
                    <h4 className="font-black text-lg text-gray-800">{selectedApp.target_url}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase">{selectedApp.asset_type || 'Web Application'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase"><Globe size={14}/> Network IP</span>
                    <span className="font-mono text-sm font-bold text-gray-800">{selectedApp.ip_address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase"><Lock size={14}/> Context</span>
                    <span className="font-bold text-sm text-gray-800">{selectedApp.public_key_algo || 'RSA'} / {selectedApp.tls_version || 'TLS'}</span>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">PQC Readiness Score</span>
                      <span className={`font-black text-xl ${selectedApp.simple_score >= 8.5 ? 'text-green-600' : selectedApp.simple_score >= 6.5 ? 'text-amber-500' : 'text-red-600'}`}>
                        {selectedApp.simple_score} <span className="text-xs text-gray-400">/ 10</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${selectedApp.simple_score >= 8.5 ? 'bg-green-500' : selectedApp.simple_score >= 6.5 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${selectedApp.simple_score * 10}%` }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Status:</span>
                      <span className="text-[10px] font-black uppercase" style={{color: selectedApp.simple_score >= 8.5 ? '#10b981' : selectedApp.simple_score >= 6.5 ? '#f59e0b' : '#ef4444'}}>{selectedApp.risk_tier}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center mt-10 font-bold">Select an asset from the list to view profile.</p>
            )}
          </div>
        </div>

        {/* Dynamic Recommendations based on Selected App */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-800 to-gray-900 rounded-3xl shadow-xl border border-gray-700 flex flex-col h-[500px]">
          <div className="px-6 py-5 border-b border-gray-700 bg-black/20 shrink-0">
            <h3 className="text-xs font-black text-[#d9a05b] uppercase tracking-widest">Remediation Blueprint</h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {selectedApp?.remediation_actions?.length > 0 ? (
              selectedApp.remediation_actions.map((rec, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                  <div className="flex-shrink-0 mt-1 text-[#d9a05b]"><ArrowUpRight size={18} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{rec.action}</h4>
                    <p className="text-xs font-medium text-gray-400 leading-relaxed">{rec.description}</p>
                    <div className="mt-3 flex gap-2">
                      <span className="px-2 py-1 bg-black/30 rounded text-[9px] font-black text-gray-300 uppercase">{rec.timeline}</span>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${rec.priority === 'Critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>Priority: {rec.priority}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : selectedApp ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckCircle2 size={48} className="text-green-500 mb-4" />
                <p className="text-white font-bold">Asset is fully optimized.</p>
                <p className="text-sm text-gray-400 mt-2">No classical or quantum vulnerabilities detected.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center mt-10 font-bold">Select an asset to view specific remediation steps.</p>
            )}
            
            {/* Show global recommendations if no app is selected */}
            {!selectedApp && pqcData?.recommendations?.slice(0,3).map((rec, i) => (
               <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                 <div className="flex-shrink-0 mt-1 text-gray-500"><Info size={18} /></div>
                 <p className="text-xs font-medium text-gray-400 leading-relaxed">{rec}</p>
               </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PqcPosture;