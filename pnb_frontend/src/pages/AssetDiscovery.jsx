import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Shield, Wifi, Box, Search, Network } from 'lucide-react';

// ── Static mock data matching prototype ──────────────────────────────────────
const DOMAINS = [
  { detection: '03 Mar 2026', domain: 'www.cos.pnb.bank.in',     registered: '17 Feb 2005', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'New' },
  { detection: '17 Oct 2024', domain: 'www2.pnbrrbkiosk.in',     registered: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'New' },
  { detection: '17 Oct 2024', domain: 'upload.pnbuniv.net.in',   registered: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'New' },
  { detection: '17 Oct 2024', domain: 'postman.pnb.bank.in',     registered: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'False Positive' },
  { detection: '17 Nov 2024', domain: 'proxy.pnb.bank.in',       registered: '22 Mar 2021', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'Confirmed' },
  { detection: '05 Jan 2025', domain: 'netbanking.pnbindia.in',  registered: '10 Apr 2019', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'Confirmed' },
  { detection: '12 Feb 2025', domain: 'retail.pnb.bank.in',      registered: '15 Jun 2018', registrar: 'National Internet Exchange of India', company: 'PNB', status: 'New' },
];

const SSL_CERTS = [
  { detection: '10 Mar 2026', fingerprint: 'b7563b983bfd217d471f607c9bbc509034a6', validFrom: '08 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Symantac',   status: 'New' },
  { detection: '10 Mar 2026', fingerprint: 'd8527f5c3e99b37164a8f3274a914506c94',  validFrom: '07 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Digi-Cert',  status: 'New' },
  { detection: '10 Mar 2026', fingerprint: 'Abe3195b86704f88cb75c7bcd11c69b9e493', validFrom: '06 Feb 2026', commonName: 'Generic Cert for WF Ovrd', company: 'PNB', ca: 'Entrust',    status: 'New' },
  { detection: '15 Jan 2026', fingerprint: 'f3c91a2b774e35d290c8ab10f9d6e87451bc', validFrom: '10 Jan 2026', commonName: 'pnbindia.in',            company: 'PNB', ca: 'DigiCert',   status: 'Confirmed' },
  { detection: '20 Dec 2025', fingerprint: '9d1f2e3a4b5c6d7e8f90a1b2c3d4e5f60a1b', validFrom: '15 Dec 2025', commonName: 'api.pnb.bank.in',        company: 'PNB', ca: "Let's Encrypt", status: 'False/ignore' },
];

const IP_ADDRESSES = [
  { detection: '05 Mar 2026', ip: '40.104.62.216',  ports: '80',       subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'MSFT',            location: '—',             company: 'Punjab National Bank', status: 'New' },
  { detection: '17 Oct 2024', ip: '40.101.72.212',  ports: '80',       subnet: '103.107.224.0/22', asn: 'AS9583', netname: '—',               location: 'India',         company: 'Punjab National Bank', status: 'New' },
  { detection: '17 Oct 2024', ip: '103.25.151.22',  ports: '53, 80',   subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'Quantum-Link-Co', location: 'Nashik, India', company: 'Punjab National Bank', status: 'Confirmed' },
  { detection: '17 Nov 2024', ip: '181.65.122.92',  ports: '80, 443',  subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'E2E-Networks-IN', location: 'Chennai, India',company: 'Punjab National Bank', status: 'New' },
  { detection: '17 Nov 2024', ip: '20.153.63.72',   ports: '443',      subnet: '103.107.224.0/22', asn: 'AS9583', netname: '—',               location: 'Leh, India',    company: 'Punjab National Bank', status: 'False or ignore' },
  { detection: '17 Nov 2024', ip: '21.151.42.188',  ports: '22',       subnet: '103.107.224.0/22', asn: 'AS9583', netname: '—',               location: 'India',         company: 'Punjab National Bank', status: 'Confirmed' },
  { detection: '17 Nov 2024', ip: '402.11.22.153',  ports: '3997',     subnet: '103.107.224.0/22', asn: 'AS9583', netname: 'E2E-Networks-IN', location: 'India',         company: 'Punjab National Bank', status: 'New' },
];

const SOFTWARE = [
  { detection: '05 Mar 2026', product: 'http_server', version: '—',      type: 'WebServer', port: '443', host: '49.51.98.173',  company: 'PNB', status: 'New' },
  { detection: '17 Oct 2024', product: 'http_server', version: '—',      type: 'WebServer', port: '587', host: '49.52.123.215', company: 'PNB', status: 'New' },
  { detection: '17 Oct 2024', product: 'Apache',      version: '—',      type: 'WebServer', port: '443', host: '40.59.99.173',  company: 'PNB', status: 'Confirmed' },
  { detection: '17 Oct 2024', product: 'IIS',         version: '10.0',   type: 'WebServer', port: '80',  host: '40.101.27.212', company: 'PNB', status: 'Confirmed' },
  { detection: '17 Nov 2024', product: 'Microsoft IIS',version: '10.0',  type: 'WebServer', port: '80',  host: '401.10.274.14', company: 'PNB', status: 'False or ignore' },
  { detection: '06 Mar 2026', product: 'OpenResty',   version: '1.27.1.1',type: 'Web Server',port: '2087',host: '66.68.262.93', company: 'PNB', status: 'Confirmed' },
];

// ── Sub-filter pill ───────────────────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
      active
        ? 'bg-pnb-maroon text-white shadow'
        : 'bg-white/60 text-gray-600 hover:bg-white border border-gray-200'
    }`}
  >
    {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'New':           'bg-blue-100 text-blue-700',
    'Confirmed':     'bg-green-100 text-green-700',
    'False Positive':'bg-gray-100 text-gray-500',
    'False/ignore':  'bg-gray-100 text-gray-500',
    'False or ignore':'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
};

// ── Tab panels ────────────────────────────────────────────────────────────────
const DomainsPanel = () => {
  const filters = ['New (5)', 'False Positive (10)', 'Confirmed (2)', 'All (3)'];
  const [active, setActive] = useState('All (3)');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <FilterPill key={f} label={f} active={active === f} onClick={() => setActive(f)} />)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-5 py-4">Detection Date</th>
              <th className="px-5 py-4">Domain Name</th>
              <th className="px-5 py-4">Registration Date</th>
              <th className="px-5 py-4">Registrar</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {DOMAINS.map((d, i) => (
              <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-4 text-sm text-gray-500 font-medium">{d.detection}</td>
                <td className="px-5 py-4 text-sm font-bold text-blue-600">{d.domain}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{d.registered}</td>
                <td className="px-5 py-4 text-xs text-gray-600">{d.registrar}</td>
                <td className="px-5 py-4 text-sm font-bold text-pnb-maroon">{d.company}</td>
                <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SSLPanel = () => {
  const filters = ['New (3)', 'False/ignore (9)', 'Confirmed', 'All (3)'];
  const [active, setActive] = useState('New (3)');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <FilterPill key={f} label={f} active={active === f} onClick={() => setActive(f)} />)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-5 py-4">Detection Date</th>
              <th className="px-5 py-4">SSL SHA Fingerprint</th>
              <th className="px-5 py-4">Valid From</th>
              <th className="px-5 py-4">Common Name</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Certificate Authority</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {SSL_CERTS.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-4 text-sm text-gray-500 font-medium">{s.detection}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-600 max-w-[180px] truncate">{s.fingerprint}</td>
                <td className="px-5 py-4 text-sm text-gray-500">{s.validFrom}</td>
                <td className="px-5 py-4 text-sm text-gray-700 font-medium">{s.commonName}</td>
                <td className="px-5 py-4 text-sm font-bold text-pnb-maroon">{s.company}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{s.ca}</td>
                <td className="px-5 py-4"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const IPPanel = () => {
  const filters = ['New (15)', 'False or ignore (10)', 'Confirmed (9)', 'All (34)'];
  const [active, setActive] = useState('All (34)');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <FilterPill key={f} label={f} active={active === f} onClick={() => setActive(f)} />)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-5 py-4">Detection Date</th>
              <th className="px-5 py-4">IP Address</th>
              <th className="px-5 py-4">Ports</th>
              <th className="px-5 py-4">Subnet</th>
              <th className="px-5 py-4">ASN</th>
              <th className="px-5 py-4">Netname</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {IP_ADDRESSES.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-4 text-sm text-gray-500 font-medium">{item.detection}</td>
                <td className="px-5 py-4 font-mono text-sm font-bold text-gray-800">{item.ip}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{item.ports}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{item.subnet}</td>
                <td className="px-5 py-4 text-xs font-semibold text-indigo-600">{item.asn}</td>
                <td className="px-5 py-4 text-xs text-gray-600">{item.netname}</td>
                <td className="px-5 py-4 text-xs text-gray-600">{item.location}</td>
                <td className="px-5 py-4 text-xs font-bold text-pnb-maroon">{item.company}</td>
                <td className="px-5 py-4"><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SoftwarePanel = () => {
  const filters = ['New (10)', 'False or ignore (6)', 'Confirmed (36)', 'All (52)'];
  const [active, setActive] = useState('All (52)');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => <FilterPill key={f} label={f} active={active === f} onClick={() => setActive(f)} />)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-left bg-white">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-5 py-4">Detection Date</th>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Version</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Port</th>
              <th className="px-5 py-4">Host</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {SOFTWARE.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-5 py-4 text-sm text-gray-500 font-medium">{s.detection}</td>
                <td className="px-5 py-4 text-sm font-bold text-gray-800">{s.product}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-500">{s.version}</td>
                <td className="px-5 py-4 text-xs text-gray-600">{s.type}</td>
                <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-600">{s.port}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-600">{s.host}</td>
                <td className="px-5 py-4 text-xs font-bold text-pnb-maroon">{s.company}</td>
                <td className="px-5 py-4"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'domains', label: 'Domains',           count: 20,  icon: <Globe size={16} />,   panel: <DomainsPanel /> },
  { id: 'ssl',     label: 'SSL',               count: 15,  icon: <Shield size={16} />,  panel: <SSLPanel /> },
  { id: 'ip',      label: 'IP Address/Subnets',count: 34,  icon: <Wifi size={16} />,    panel: <IPPanel /> },
  { id: 'software',label: 'Software',          count: 52,  icon: <Box size={16} />,     panel: <SoftwarePanel /> },
];

const AssetDiscovery = () => {
  const [activeTab, setActiveTab] = useState('domains');
  const [search, setSearch] = useState('');

  const currentPanel = TABS.find(t => t.id === activeTab)?.panel;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-pnb-maroon to-red-900 p-6 rounded-2xl shadow-xl text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black mb-1">Asset Discovery</h2>
          <p className="opacity-75 text-sm">Continuously mapping PNB's external attack surface and digital footprint.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-white/60" size={16} />
          <input
            type="text"
            placeholder="Search domain, URL, IoC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl bg-white/20 text-white placeholder-white/60 text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-pnb-gold w-72"
          />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${
                activeTab === tab.id
                  ? 'text-pnb-maroon bg-amber-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.id ? 'bg-pnb-maroon text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pnb-maroon" />
              )}
            </button>
          ))}
        </div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-6"
          >
            {currentPanel}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Network Graph teaser */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="p-3 bg-amber-50 text-pnb-gold rounded-xl"><Network size={28} /></div>
        <div>
          <h3 className="font-bold text-gray-800">Attack Surface Graph</h3>
          <p className="text-sm text-gray-500">Interactive network topology view of all discovered assets and their relationships — monitoring ASNs and CIDR blocks associated with Punjab National Bank.</p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-black rounded-full animate-pulse">● ENGINE ACTIVE</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AssetDiscovery;