import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { FileCode, Lock, ShieldCheck, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

const BAR_COLORS =['#10b981','#3b82f6','#9b1c31','#f59e0b','#ef4444','#6366f1','#f97316'];

const StatBadge = ({ label, value, warn }) => (
  <div className={`flex-1 rounded-2xl p-5 text-center min-w-[120px] shadow-sm border ${warn ? 'bg-red-900/30 border-red-700/40' : 'bg-white/10 border-white/20'}`}>
    <p className={`text-4xl font-black ${warn ? 'text-red-400' : 'text-white'}`}>{value ?? 0}</p>
    <p className="text-[10px] uppercase font-bold opacity-70 mt-2 tracking-widest text-gray-300">{label}</p>
  </div>
);

const Cbom = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/api/export/all')
      .then(res => {
        setScans(res.data.scans ||[]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  },[]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <FileCode size={40} className="text-[#8b1528] animate-bounce" />
      <p className="text-[#8b1528] font-black tracking-widest uppercase animate-pulse">Compiling Cryptographic Manifest...</p>
    </div>
  );

  // --- 100% DYNAMIC CALCULATIONS ---
  const summary = {
    total: scans.length,
    weak: scans.filter(s => ['Legacy', 'Critical'].includes(s.risk_tier)).length,
    issues: scans.filter(s => ['Expired', 'Expiring'].includes(s.cert_status)).length
  };

  // Group Key Sizes
  const keyMap = scans.reduce((acc, s) => {
    const size = s.key_size ? `${s.key_size}-bit` : 'Unknown';
    acc[size] = (acc[size] || 0) + 1;
    return acc;
  }, {});
  const keyData = Object.entries(keyMap).map(([size, count]) => ({ size, count })).sort((a,b) => b.count - a.count);

  // Group Ciphers
  const cipherMap = scans.reduce((acc, s) => {
    const name = s.cipher_suite || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const cipherData = Object.entries(cipherMap).map(([name, count]) => ({
    name, count, weak: /RC4|DES|NULL|MD5|SHA1/i.test(name)
  })).sort((a,b) => b.count - a.count).slice(0, 6);

  // Group Protocols
  const tlsMap = scans.reduce((acc, s) => {
    const name = s.tls_version || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const tlsColors = { "TLSv1.3": "#10b981", "TLSv1.2": "#f59e0b", "TLSv1.1": "#ef4444", "SSLv3": "#991b1b" };
  const protocolData = Object.entries(tlsMap).map(([name, value]) => ({
    name, value, color: tlsColors[name] || '#94a3b8'
  }));

  // Group CAs
  const caMap = scans.reduce((acc, s) => {
    const ca = s.issuer ? s.issuer.split(',')[0].replace('CN=', '') : 'Unknown CA';
    acc[ca] = (acc[ca] || 0) + 1;
    return acc;
  }, {});
  const topCAs = Object.entries(caMap).map(([name, count], i) => ({
    name, count, color: BAR_COLORS[i % BAR_COLORS.length]
  })).sort((a,b) => b.count - a.count).slice(0, 5);

  const filteredScans = scans.filter(s => s.target_url.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-[#8b1528] to-red-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <FileCode size={200} className="absolute -right-10 -bottom-10 opacity-5 text-white" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-black mb-1">Cryptographic Bill of Materials</h2>
            <p className="text-sm font-bold opacity-70 uppercase tracking-widest">CERT-In Annexure-A Compliant Inventory</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-4 flex-wrap">
          <StatBadge label="Total Applications"  value={summary.total}  />
          <StatBadge label="Active Certificates" value={summary.total} />
          <StatBadge label="Weak Cryptography"   value={summary.weak}   warn={summary.weak > 0} />
          <StatBadge label="Certificate Issues"  value={summary.issues}  warn={summary.issues > 0} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Key Length Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Lock size={14} className="text-[#d9a05b]" /> Key Length Distribution
          </h3>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={keyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="size" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {keyData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cipher Usage */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Top Cipher Suites</h3>
          <div className="space-y-4">
            {cipherData.map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-mono truncate max-w-[200px] ${c.weak ? 'text-red-600 font-bold' : 'text-gray-600 font-semibold'}`}>
                    {c.weak && <AlertTriangle size={10} className="inline mr-1" />}{c.name}
                  </span>
                  <span className="text-xs font-black text-gray-800">{c.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${c.weak ? 'bg-red-500' : 'bg-[#8b1528]'}`} style={{ width: `${(c.count / summary.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Protocols & CAs */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Encryption Protocols</h3>
            <div className="h-28">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={protocolData} cx="30%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={4}>
                    {protocolData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs font-bold text-gray-600">{val}</span>} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Top Certificate Authorities</h3>
            <div className="space-y-3">
              {topCAs.map((ca, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: ca.color }} />
                  <span className="text-xs font-bold text-gray-600 flex-1 truncate">{ca.name}</span>
                  <span className="text-xs font-black text-gray-800">{ca.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 100% COMPLETE INVENTORY TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[#d9a05b]" />
            <h3 className="text-sm font-black text-[#8b1528] uppercase tracking-widest">Complete App Cryptography Roster</h3>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-2 text-gray-400" size={16} />
            <input type="text" placeholder="Search Application..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#d9a05b] outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white">
              <tr className="text-[11px] font-black uppercase tracking-widest">
                <th className="px-8 py-4">Application</th>
                <th className="px-8 py-4">Key Spec</th>
                <th className="px-8 py-4">Negotiated Cipher</th>
                <th className="px-8 py-4">Issuer Authority</th>
                <th className="px-8 py-4">Crypto Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredScans.map((row, i) => {
                const weak =['Legacy', 'Critical'].includes(row.risk_tier);
                return (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-blue-600">{row.target_url}</td>
                    <td className="px-8 py-5">
                      <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        (row.key_size < 2048) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>{row.public_key_algo || 'RSA'} {row.key_size ? `${row.key_size}-bit` : ''}</span>
                    </td>
                    <td className="px-8 py-5 font-mono text-[10px] text-gray-600 font-semibold max-w-[200px] truncate">
                      {weak && <AlertTriangle size={12} className="inline mr-1 text-red-500 mb-0.5" />}{row.cipher_suite || '—'}
                    </td>
                    <td className="px-8 py-5 text-xs font-semibold text-gray-500">{row.issuer ? row.issuer.split(',')[0].replace('CN=','') : '—'}</td>
                    <td className="px-8 py-5">
                      {weak 
                        ? <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase shadow-sm">Vulnerable</span>
                        : <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase flex items-center gap-1 w-fit shadow-sm"><CheckCircle2 size={12} /> Secure</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredScans.length === 0 && <p className="text-center p-10 text-gray-400 font-bold">No assets found matching your search.</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default Cbom;