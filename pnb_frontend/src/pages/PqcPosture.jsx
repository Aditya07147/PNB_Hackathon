import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { CheckCircle2, XCircle, ShieldAlert, Info, ArrowUpRight, Lock, Globe, User } from 'lucide-react';

const MOCK_PQC = {
  stats: { elite: 37, critical: 2, standard: 4, total: 43, elitePct: 45, standardPct: 30, legacyPct: 15, criticalCount: 8 },
  assets_table: [
    { name: 'Digigrihavatika.pnbuat.bank.in (103.109.225.128)', pqc_support: 'Yes' },
    { name: 'wcw.pnb.bank.in (103.109.225.201)',               pqc_support: 'Yes' },
    { name: 'Wbbgb.pnbuk.bank.in (103.109.224.249)',           pqc_support: 'No'  },
    { name: 'retail.pnb.bank.in (103.109.226.11)',             pqc_support: 'Yes' },
    { name: 'api.pnbindia.in (103.109.227.55)',                pqc_support: 'Yes' },
    { name: 'portal.pnb.bank.in (103.109.228.99)',             pqc_support: 'No'  },
  ],
  selected_app: {
    name: 'App A', owner: 'Team 1', exposure: 'Internet',
    tls: 'RSA / ECC', score: 480, status: 'Legacy',
  },
  recommendations: [
    'Upgrade to TLS 1.3 with PQC',
    'Implement Kyber for Key Exchange',
    'Update Cryptographic Libraries',
    'Develop PQC Migration Plan',
  ],
};

// 3×3 Risk Matrix
const RISK_MATRIX = [
  ['high','high','high'],
  ['medium','high','high'],
  ['low','medium','high'],
];
const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

const PqcPosture = () => {
  const [data, setData] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    api.getPqc()
      .then(res => {
        setData(res.data);
        setSelectedApp(res.data.selected_app || MOCK_PQC.selected_app);
      })
      .catch(() => {
        setData(MOCK_PQC);
        setSelectedApp(MOCK_PQC.selected_app);
      });
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-pnb-maroon font-bold animate-pulse">Auditing PQC Posture...</p>
    </div>
  );

  const stats = data.stats || MOCK_PQC.stats;
  const assets = data.assets_table || MOCK_PQC.assets_table;
  const recs = data.recommendations || MOCK_PQC.recommendations;
  const app = selectedApp || MOCK_PQC.selected_app;

  const pieData = [
    { name: 'Elite-PQC Ready', value: stats.elitePct || 45, color: '#10b981' },
    { name: 'Standard',        value: stats.standardPct || 30, color: '#f59e0b' },
    { name: 'Legacy',          value: stats.legacyPct || 15,  color: '#f97316' },
    { name: 'Critical',        value: 10,                     color: '#ef4444' },
  ];

  const barData = [
    { label: 'Elite',    count: stats.elite    || 37, fill: '#10b981' },
    { label: 'Critical', count: stats.critical || 2,  fill: '#ef4444' },
    { label: 'Std',      count: stats.standard || 4,  fill: '#f59e0b' },
  ];

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-pnb-maroon">PQC Compliance Dashboard</h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Alignment with NIST FIPS 203/204/205 Standards</p>
        </div>
        <div className="flex gap-3 flex-wrap text-sm font-bold">
          <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700">Elite-PQC Ready: {stats.elitePct || 45}%</span>
          <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">Standard: {stats.standardPct || 30}%</span>
          <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700">Legacy: {stats.legacyPct || 15}%</span>
          <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700">Critical Apps: {stats.criticalCount || 8}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar: Assets by Classification Grade */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Assets by Classification Grade</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: Application Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Application Status</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={9} formatter={(v) => <span className="text-xs font-semibold text-gray-600">{v}</span>} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Matrix Heatmap */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Risk Overview Matrix</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {RISK_MATRIX.flat().map((level, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg flex items-center justify-center text-white text-[10px] font-black uppercase"
                style={{ background: RISK_COLORS[level], opacity: 0.85 }}
              >
                {level}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {Object.entries(RISK_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: v }} />
                <span className="text-[10px] font-bold text-gray-500 capitalize">{k} Risk</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assets Table + Recommendations + App Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Asset Table */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-bold text-gray-800">Assets — PQC Support</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {assets.map((a, i) => (
              <div
                key={i}
                onClick={() => setSelectedApp({ name: a.name.split(' ')[0], owner: 'Team 1', exposure: 'Internet', tls: 'RSA / ECC', score: a.pqc_support === 'Yes' ? 780 : 480, status: a.pqc_support === 'Yes' ? 'Elite-PQC' : 'Legacy' })}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <p className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">{a.name}</p>
                {a.pqc_support === 'Yes'
                  ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={18} className="text-red-500 flex-shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Improvement Recommendations */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-bold text-gray-800">Improvement Recommendations</h3>
          </div>
          <div className="p-5 space-y-3">
            {recs.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="p-1 bg-amber-200 rounded-lg flex-shrink-0 mt-0.5">
                  {i === 0 ? <ShieldAlert size={14} className="text-amber-700" /> : <ArrowUpRight size={14} className="text-amber-700" />}
                </div>
                <p className="text-xs font-semibold text-amber-900">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* App Detail Panel */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-bold text-gray-800">App Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Info size={16} className="text-blue-600" />
              </div>
              <span className="font-bold text-gray-800 text-sm">{app.name}</span>
            </div>
            {[
              { icon: <User size={14} />, label: 'Owner',    val: app.owner },
              { icon: <Globe size={14} />, label: 'Exposure', val: app.exposure },
              { icon: <Lock size={14} />, label: 'TLS',      val: app.tls },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">{row.icon}</div>
                <span className="text-gray-500 font-medium w-20">{row.label}:</span>
                <span className="font-bold text-gray-800">{row.val}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500"><ShieldAlert size={14} /></div>
              <span className="text-gray-500 font-medium w-20">Score:</span>
              <span className={`font-black text-lg ${app.score >= 700 ? 'text-green-600' : app.score >= 400 ? 'text-amber-600' : 'text-red-600'}`}>
                {app.score} <span className="text-xs font-bold">({app.status})</span>
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${app.score >= 700 ? 'bg-green-500' : app.score >= 400 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${(app.score / 1000) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-semibold">Score out of 1000 | Status: {app.status}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PqcPosture;