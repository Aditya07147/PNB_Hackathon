import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { FileCode, Lock, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const FALLBACK = {
  summary: { total_applications: 0, sites_surveyed: 0, active_certificates: 0, weak_cryptography: 0, certificate_issues: 0 },
  charts:  { key_length_distribution: [], cipher_usage: [], encryption_protocols: [], top_cas: [] },
  top_certificates: [],
};

const BAR_COLORS = ['#10b981','#3b82f6','#9b1c31','#f59e0b','#ef4444','#6366f1','#f97316'];

const StatBadge = ({ label, value, warn }) => (
  <div className={`flex-1 rounded-xl p-4 text-center min-w-[100px] ${warn ? 'bg-red-900/30 border border-red-700/40' : 'bg-white/10'}`}>
    <p className={`text-2xl font-black ${warn ? 'text-red-300' : 'text-white'}`}>{value ?? 0}</p>
    <p className="text-[10px] uppercase font-semibold opacity-70 mt-0.5">{label}</p>
  </div>
);

const EmptyChart = ({ label }) => (
  <div className="h-52 flex flex-col items-center justify-center text-gray-300">
    <div className="text-4xl mb-2">📊</div>
    <p className="text-sm font-medium text-gray-400">{label}</p>
    <p className="text-xs text-gray-300 mt-1">Run a scan to populate data</p>
  </div>
);

const Cbom = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getCbom()
      .then(res => setData(res.data))
      .catch(() => setData(FALLBACK));
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-pnb-maroon font-bold animate-pulse">Parsing Cryptographic Manifest...</p>
    </div>
  );

  const { summary, charts, top_certificates } = data;
  const s = summary || FALLBACK.summary;
  const c = charts  || FALLBACK.charts;

  // Normalise cipher_usage: backend sends {name, count, weak} — handle both shapes
  const cipherData = (c.cipher_usage || []).map(item => ({
    name:  item.name  || item.cipher || '—',
    count: item.count || 0,
    weak:  item.weak  || false,
  }));

  // Normalise encryption_protocols: backend sends {name, value, color}
  const protocolData = (c.encryption_protocols || []).map(item => ({
    name:  item.name    || item.version || '—',
    value: item.value   || item.count   || 0,
    color: item.color   || '#9b1c31',
  }));

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-pnb-maroon to-red-900 p-6 rounded-2xl shadow-xl text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-pnb-gold/20 rounded-lg"><FileCode size={24} className="text-pnb-gold" /></div>
          <div>
            <h2 className="text-xl font-black">Cryptographic Bill of Materials</h2>
            <p className="text-xs opacity-60">CERT-In Annexure-A compliant inventory of all cryptographic primitives</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <StatBadge label="Total Applications"  value={s.total_applications}  />
          <StatBadge label="Sites Surveyed"      value={s.sites_surveyed}      />
          <StatBadge label="Active Certificates" value={s.active_certificates} />
          <StatBadge label="Weak Cryptography"   value={s.weak_cryptography}   warn />
          <StatBadge label="Certificate Issues"  value={s.certificate_issues}  warn />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Key Length Distribution */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock size={16} className="text-pnb-gold" /> Key Length Distribution
          </h3>
          {c.key_length_distribution?.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={c.key_length_distribution} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="size" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {c.key_length_distribution.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart label="Key Length Distribution" />}
        </div>

        {/* Cipher Usage */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Cipher Usage</h3>
          {cipherData.length > 0 ? (
            <div className="space-y-2.5">
              {cipherData.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium truncate max-w-[200px] ${c.weak ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                      {c.weak && <span className="mr-1">⚠</span>}{c.name}
                    </span>
                    <span className="text-xs font-black text-gray-700 ml-2">{c.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${c.weak ? 'bg-red-500' : 'bg-pnb-maroon'}`}
                      style={{ width: `${Math.min((c.count / (cipherData[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart label="Cipher Usage" />}
        </div>

        {/* Top CAs + Encryption Protocols */}
        <div className="space-y-4">
          {/* Top CAs */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Top Certificate Authorities</h3>
            {(c.top_cas || []).length > 0 ? (
              <div className="space-y-2">
                {(c.top_cas || []).slice(0, 5).map((ca, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ca.color || BAR_COLORS[i] }} />
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((ca.count / ((c.top_cas[0]?.count) || 1)) * 100, 100)}%`, background: ca.color || BAR_COLORS[i] }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-20 text-right truncate">{ca.name}</span>
                    <span className="text-xs font-black text-gray-500 w-5 text-right">{ca.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No CA data yet</p>
            )}
          </div>

          {/* Encryption Protocols */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Encryption Protocols</h3>
            {protocolData.length > 0 ? (
              <div className="h-28">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={protocolData} cx="40%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                      {protocolData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                      formatter={(val) => <span className="text-[11px] font-semibold text-gray-600">{val}</span>} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No protocol data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Certificates Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
          <ShieldCheck size={18} className="text-pnb-gold" />
          <h3 className="text-sm font-bold text-gray-800">Certificate Authority — Application Detail</h3>
        </div>
        {(top_certificates || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Application</th>
                  <th className="px-6 py-4">Key Length</th>
                  <th className="px-6 py-4">Cipher</th>
                  <th className="px-6 py-4">Certificate Authority</th>
                  <th className="px-6 py-4">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(top_certificates || []).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">{row.app}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                        (row.keyLen || '').includes('1024') ? 'bg-red-100 text-red-600' :
                        (row.keyLen || '').includes('4096') ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{row.keyLen || '—'}</span>
                    </td>
                    <td className={`px-6 py-4 font-mono text-xs ${row.weak ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {row.weak && <AlertTriangle size={12} className="inline mr-1 text-red-500" />}{row.cipher || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.ca || '—'}</td>
                    <td className="px-6 py-4">
                      {row.weak
                        ? <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase">⚠ Weak</span>
                        : <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase flex items-center gap-1 w-fit"><CheckCircle2 size={10} /> Secure</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">No certificate data yet. Run a scan to populate the CBOM.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Cbom;