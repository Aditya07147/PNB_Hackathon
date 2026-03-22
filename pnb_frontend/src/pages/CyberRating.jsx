import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react';

const TIERS = [
  { icon: <XCircle size={18} className="text-red-500" />,      label: 'Legacy',    range: '< 400',     desc: 'Weak but still operational',   bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700' },
  { icon: <AlertCircle size={18} className="text-amber-500" />, label: 'Standard',  range: '400 – 700', desc: 'Acceptable enterprise config', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700' },
  { icon: <CheckCircle2 size={18} className="text-green-500" />,label: 'Elite-PQC', range: '> 700',     desc: 'Modern best-practise posture', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700' },
  { icon: <Trophy size={18} className="text-blue-500" />,       label: 'Max Score', range: '1000',      desc: 'Maximum after normalisation',  bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
];

const ScoreGauge = ({ score }) => {
  // score is 0–1000
  const pct  = Math.min((score / 1000) * 100, 100);
  const tier = score >= 700 ? 'Elite-PQC' : score >= 400 ? 'Standard' : 'Legacy';
  const color = score >= 700 ? '#10b981' : score >= 400 ? '#f59e0b' : '#ef4444';

  const toRad = (d) => (d * Math.PI) / 180;
  const cx = 110, cy = 110, R = 90;
  const arcPath = (startDeg, sweepDeg) => {
    const e = { x: cx + R * Math.cos(toRad(startDeg + sweepDeg)), y: cy + R * Math.sin(toRad(startDeg + sweepDeg)) };
    const s = { x: cx + R * Math.cos(toRad(startDeg)),           y: cy + R * Math.sin(toRad(startDeg)) };
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const trackPath = arcPath(130, 260);
  const fillPath  = arcPath(130, (pct / 100) * 260);

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="160" viewBox="0 0 220 160">
        <path d={trackPath} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        {pct > 0 && <path d={fillPath} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />}
        <text x="110" y="112" textAnchor="middle" style={{ fontSize: 38, fontWeight: 900, fill: '#1e293b' }}>{score}</text>
        <text x="110" y="135" textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700, letterSpacing: 2 }}>OUT OF 1000</text>
      </svg>
      <span className={`-mt-2 px-5 py-1.5 rounded-full text-sm font-black ${
        tier === 'Elite-PQC' ? 'bg-green-100 text-green-700' :
        tier === 'Standard'  ? 'bg-amber-100 text-amber-700' :
                               'bg-red-100 text-red-700'
      }`}>
        {tier} — {tier === 'Elite-PQC' ? 'Stronger security posture' : tier === 'Standard' ? 'Acceptable configuration' : 'Remediation required'}
      </span>
    </div>
  );
};

const CyberRating = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/export/all')
      .then(res => {
        const raw = res.data;
        // cumulative_score from backend is already 0–1000
        const score = raw.summary?.cumulative_score ?? 0;

        const perUrl = (raw.scans || []).map(s => ({
          url:   s.target_url,
          // risk_score is 0–1000; fall back to simple_score * 100
          score: s.risk_score ?? Math.round((s.simple_score || 0) * 100),
          tier:  s.risk_tier,
        }));

        setData({ cumulative_score: score, per_url: perUrl });
      })
      .catch(() => setData({ cumulative_score: 0, per_url: [] }));
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-pnb-maroon font-bold animate-pulse">Calculating Enterprise Rating...</p>
    </div>
  );

  const score  = data.cumulative_score;
  const perUrl = data.per_url;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Hero */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={36} className="text-pnb-gold" />
          <div>
            <h2 className="text-2xl font-black text-pnb-maroon">Consolidated Enterprise-Level Cyber Rating</h2>
            <p className="text-gray-400 text-sm">Enterprise-Wide PQC Security Posture Assessment</p>
          </div>
        </div>
        <ScoreGauge score={score} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tier Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <TrendingUp size={16} className="text-pnb-gold" />
            <h3 className="text-sm font-bold text-gray-800">PQC Rating Tiers for Enterprise</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {TIERS.map((t, i) => (
              <div key={i} className={`flex items-center gap-4 px-6 py-4 ${t.bg} border-l-4 ${t.border}`}>
                <div className="flex-shrink-0">{t.icon}</div>
                <div className="flex-1">
                  <span className={`font-black text-sm ${t.text}`}>{t.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{t.desc}</span>
                </div>
                <span className={`font-black text-sm ${t.text}`}>{t.range}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold">* Maximum Score after normalisation: <span className="font-black text-gray-600">1000</span></p>
          </div>
        </div>

        {/* Per-URL Scores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-sm font-bold text-gray-800">Per-URL PQC Scores</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {perUrl.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No scans yet. Run a scan from the Home page.</p>
            )}
            {perUrl.map((u, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <span className="text-sm font-semibold text-blue-600 flex-1 truncate">{u.url}</span>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${u.score >= 700 ? 'bg-green-500' : u.score >= 400 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(u.score / 10, 100)}%` }}
                  />
                </div>
                <span className="font-black text-gray-800 text-sm w-10 text-right">{u.score}</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                  u.tier === 'Elite-PQC' ? 'bg-green-100 text-green-700' :
                  u.tier === 'Standard'  ? 'bg-amber-100 text-amber-700' :
                  u.tier === 'Legacy'    ? 'bg-orange-100 text-orange-700' :
                                          'bg-red-100 text-red-700'
                }`}>{u.tier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CyberRating;