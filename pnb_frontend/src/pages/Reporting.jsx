import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, FileText, CheckCircle2, Users, Calendar, Search,
  Mail, MapPin, Link, Slack, ChevronDown, Clock,
  BarChart2, Layers, Shield, Star, Settings2
} from 'lucide-react';

// ── Shared helpers ─────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)}
    className={`w-11 h-6 rounded-full transition-all relative ${on ? 'bg-pnb-gold' : 'bg-gray-300'}`}>
    <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-all ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

const Select = ({ value, onChange, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-pnb-gold">
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
  </div>
);

const Checkbox = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${checked ? 'bg-pnb-gold border-pnb-gold' : 'border-gray-300'}`}>
      {checked && <CheckCircle2 size={10} className="text-white" />}
    </div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

// ── Mode 1: Executive Reporting ────────────────────────────────────────────────
const ExecutivePanel = ({ data }) => {
  // cumulative_score from backend is 0–1000
  const score = data?.summary?.cumulative_score ?? 0;

  const handleDownloadCsv = () => {
    if (!data?.scans) return;
    const headers = ["Target URL", "IP Address", "TLS Version", "Cipher", "Key Size", "Risk Tier", "Score (0-1000)", "Cert Status"];
    const rows = data.scans.map(s => [
      s.target_url, s.ip_address, s.tls_version, s.cipher_suite,
      s.key_size, s.risk_tier,
      s.risk_score ?? Math.round((s.simple_score || 0) * 100),
      s.cert_status
    ]);
    const csv = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(r => r.map(v => `"${v ?? ''}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `PNB_PQC_Executive_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
            <FileText size={18} className="text-pnb-gold" /> Report Inclusions
          </h3>
          <ul className="space-y-3">
            {['Asset Inventory Map','Cryptographic Bill of Materials (CBOM)','NIST PQC Posture Grades','Remediation Action Plan','Geographic Asset Distribution','Certificate Expiry Timeline'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Score card — shows X/1000 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl text-white flex flex-col justify-center items-center text-center space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Official Organization Score</p>
          <h3 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pnb-gold to-yellow-200">
            {score}<span className="text-2xl">/1000</span>
          </h3>
          <p className="text-xs text-gray-400 font-semibold">PQC Readiness Index — Enterprise Level</p>
          <span className={`px-4 py-1.5 rounded-full text-xs font-black mt-2 ${
            score >= 700 ? 'bg-green-900 text-green-300' :
            score >= 400 ? 'bg-amber-900 text-amber-300' :
                           'bg-red-900 text-red-300'
          }`}>
            {score >= 700 ? '✓ Elite-PQC' : score >= 400 ? '⚠ Standard' : '✗ Legacy / Critical'}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> Generate Executive Report</h3>
          <p className="text-sm text-gray-500 mt-1">Download a CERT-In compliant audit report with all sections included.</p>
        </div>
        <button onClick={handleDownloadCsv}
          className="bg-pnb-gold hover:bg-yellow-500 text-pnb-maroon font-black py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg transition-all whitespace-nowrap">
          <Download size={18} /> EXPORT CSV
        </button>
      </div>
    </motion.div>
  );
};

// ── Mode 2: Scheduled Reporting ────────────────────────────────────────────────
const ScheduledPanel = () => {
  const [enabled, setEnabled]     = useState(true);
  const [reportType, setReportType] = useState('Executive Summary Report');
  const [freq, setFreq]           = useState('Weekly');
  const [assets, setAssets]       = useState('All Assets');
  const [sections, setSections]   = useState({ Discovery: true, Inventory: true, CBOM: true, 'PQC Posture': true, 'Cyber Rating': true });
  const [email, setEmail]         = useState('executives@org.com');
  const [saved, setSaved]         = useState(false);

  const handleSchedule = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-pnb-gold" />
            <h3 className="text-base font-bold text-gray-800">Schedule Reporting</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Enable Schedule</span>
            <Toggle on={enabled} onChange={setEnabled} />
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Report Type</label>
              <Select value={reportType} onChange={setReportType}
                options={['Executive Summary Report','Asset Discovery Report','CBOM Report','PQC Posture Report','Cyber Rating Report']} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Frequency</label>
              <Select value={freq} onChange={setFreq} options={['Daily','Weekly','Monthly','Quarterly']} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Select Assets</label>
              <Select value={assets} onChange={setAssets}
                options={['All Assets','PNB Core Banking','PNB APIs','PNB Web Apps']} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Include Sections</label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(sections).map(([k, v]) => (
                  <Checkbox key={k} checked={v} onChange={val => setSections(s => ({ ...s, [k]: val }))} label={k} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Date</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5">
                <Calendar size={14} className="text-gray-400" />
                <input type="date" defaultValue="2026-04-25"
                  className="text-sm font-medium text-gray-700 outline-none flex-1 bg-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Time</label>
              <Select value="09:00 AM (IST)" onChange={() => {}} options={['09:00 AM (IST)','12:00 PM (IST)','06:00 PM (IST)']} />
              <p className="text-[11px] text-gray-400 font-medium mt-1">Time Zone: Asia/Kolkata</p>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Delivery Options</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pnb-gold" />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <input defaultValue="/Reports/Quarterly/"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pnb-gold font-mono" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
          <button onClick={handleSchedule}
            className="bg-pnb-gold hover:bg-yellow-500 text-pnb-maroon font-black py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg">
            {saved ? <><CheckCircle2 size={18} /> SCHEDULED!</> : <><Calendar size={18} /> SCHEDULE REPORT</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Mode 3: On-Demand Reporting ────────────────────────────────────────────────
const ON_DEMAND_TYPES = [
  { icon: <BarChart2 size={15} />, label: 'Executive Reporting' },
  { icon: <Search size={15} />,    label: 'Assets Discovery' },
  { icon: <Layers size={15} />,    label: 'Assets Inventory' },
  { icon: <FileText size={15} />,  label: 'CBOM' },
  { icon: <Shield size={15} />,    label: 'Posture of PQC' },
  { icon: <Star size={15} />,      label: 'Cyber Rating (Tiers 1–4)' },
];

const OnDemandPanel = () => {
  const [selected, setSelected]       = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sendEmail, setSendEmail]     = useState(true);
  const [saveLocation, setSaveLocation] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [format, setFormat]           = useState('PDF');
  const [generating, setGenerating]   = useState(false);
  const [done, setDone]               = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDone(true); setTimeout(() => setDone(false), 2500); }, 1800);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
          <Search size={20} className="text-pnb-gold" />
          <div>
            <h3 className="text-base font-bold text-gray-800">On-Demand Reporting</h3>
            <p className="text-xs text-gray-400">Request reports as needed</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Report Type</label>
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-left flex items-center justify-between">
                  <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{selected || 'Select Report'}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {ON_DEMAND_TYPES.map((t, i) => (
                        <button key={i} onClick={() => { setSelected(t.label); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-pnb-maroon transition-colors">
                          <span className="text-pnb-gold">{t.icon}</span>{t.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={14} className="text-gray-500" />
                <span className="text-xs font-black text-gray-500 uppercase">Advanced Settings</span>
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">File Format</p>
                  <Select value={format} onChange={setFormat} options={['PDF','CSV','Excel','JSON']} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] text-gray-400 font-bold">Include Charts</p>
                  <Toggle on={includeCharts} onChange={setIncludeCharts} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] text-gray-400 font-bold">Password Protect</p>
                  <Toggle on={passwordProtect} onChange={setPasswordProtect} />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-4">Delivery Options</label>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2"><Mail size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-700">Send via Email</span></div>
                <Toggle on={sendEmail} onChange={setSendEmail} />
              </div>
              {sendEmail && <input type="email" placeholder="Enter Email Addresses"
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-pnb-gold" />}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-700">Save to Location</span></div>
                <Toggle on={saveLocation} onChange={setSaveLocation} />
              </div>
              {saveLocation && <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5">
                <input defaultValue="/Reports/OnDemand/" className="flex-1 text-sm font-mono text-gray-600 outline-none bg-transparent" />
              </div>}
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl opacity-50">
                <div className="flex items-center gap-2"><Link size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-500">Download Link</span></div>
                <Toggle on={false} onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl opacity-50">
                <div className="flex items-center gap-2"><Slack size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-500">Slack Notification</span></div>
                <Toggle on={false} onChange={() => {}} />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
          <button onClick={handleGenerate} disabled={!selected || generating}
            className="bg-pnb-gold hover:bg-yellow-500 text-pnb-maroon font-black py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {generating ? <><Clock className="animate-spin" size={18} /> GENERATING...</>
             : done      ? <><CheckCircle2 size={18} /> GENERATED!</>
                         : <><BarChart2 size={18} /> GENERATE REPORT</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const MODES = [
  { id: 'executive', label: 'Executive Reporting',  icon: <Users size={20} /> },
  { id: 'scheduled', label: 'Scheduled Reporting',  icon: <Calendar size={20} /> },
  { id: 'ondemand',  label: 'On-Demand Reporting',  icon: <Search size={20} /> },
];

const Reporting = () => {
  const [mode, setMode] = useState('executive');
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/export/all').then(res => setData(res.data)).catch(() => {});
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-gradient-to-r from-pnb-maroon to-red-900 p-6 rounded-2xl shadow-xl text-white">
        <h2 className="text-2xl font-black flex items-center gap-3 mb-1"><FileText /> Compliance Reporting</h2>
        <p className="opacity-70 text-sm">Generate and download official CERT-In compliant audit reports.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
              mode === m.id
                ? 'border-pnb-gold bg-amber-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-pnb-gold/50 hover:bg-amber-50/50'
            }`}>
            <div className={`p-4 rounded-full ${mode === m.id ? 'bg-pnb-gold text-white' : 'bg-gray-100 text-gray-500'}`}>
              {m.icon}
            </div>
            <span className={`text-sm font-black text-center ${mode === m.id ? 'text-pnb-maroon' : 'text-gray-600'}`}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {mode === 'executive' && <ExecutivePanel data={data} />}
          {mode === 'scheduled' && <ScheduledPanel />}
          {mode === 'ondemand'  && <OnDemandPanel />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default Reporting;