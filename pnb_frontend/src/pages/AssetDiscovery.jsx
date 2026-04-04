import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Shield, Wifi, Box, Search, Network, Info } from 'lucide-react';

const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
      active
        ? 'bg-pnb-maroon text-white shadow-lg shadow-red-900/20'
        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
    }`}
  >
    {label}
  </button>
);

// --- HELPER FUNCTIONS TO PARSE REAL TLS CERTIFICATE DATA ---
const extractField = (dnString, field) => {
  if (!dnString) return 'Unknown';
  // Matches O=Organization Name, CN=Common Name, etc., ignoring commas inside the value
  const regex = new RegExp(`${field}=([^,]+)`);
  const match = dnString.match(regex);
  return match ? match[1].trim() : 'Unknown';
};

const getOrganization = (subjectStr) => {
  const org = extractField(subjectStr, 'O');
  return org !== 'Unknown' ? org : 'Unknown Organization';
};

const getCommonName = (str, fallback) => {
  const cn = extractField(str, 'CN');
  return cn !== 'Unknown' ? cn : fallback;
};

const AssetDiscovery = () => {
  const [activeTab, setActiveTab] = useState('domains');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ domains: [], ssl: [], ip:[], software: [] });
  const [loading, setLoading] = useState(true);
  const[filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/api/export/all').then(res => {
      const scans = res.data.scans ||[];
      const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      setData({
        domains: scans.map(s => ({
          detection: formatDate(s.scan_date),
          domain: s.target_url,
          // Dynamically pull the Issuer Organization, fallback to Issuer Common Name
          registrar: getOrganization(s.issuer) !== 'Unknown Organization' ? getOrganization(s.issuer) : getCommonName(s.issuer, 'Unknown CA'),
          // Dynamically pull the Subject Organization
          company: getOrganization(s.subject),
          status: s.risk_tier
        })),
        ssl: scans.map(s => ({
          detection: formatDate(s.scan_date),
          fingerprint: s.cipher_suite || 'Unknown Cipher',
          validFrom: formatDate(s.valid_from),
          commonName: getCommonName(s.subject, s.target_url),
          ca: getOrganization(s.issuer) !== 'Unknown Organization' ? getOrganization(s.issuer) : getCommonName(s.issuer, 'Unknown CA'),
          status: s.risk_tier
        })),
        ip: scans.map(s => ({
          detection: formatDate(s.scan_date),
          ip: s.ip_address || 'Unknown',
          ports: '443', // Scanner primarily hits 443
          asn: 'Unknown', // Requires external WHOIS integration
          netname: 'Unknown',
          location: 'Unknown',
          status: s.risk_tier
        })),
        software: scans.map(s => ({
          detection: formatDate(s.scan_date),
          product: s.asset_type || 'Web Server',
          version: s.tls_version || 'Unknown',
          type: 'HTTPS',
          host: s.target_url,
          status: s.risk_tier
        })),
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const TABS =[
    { id: 'domains',  label: 'Domains',  icon: <Globe size={18} /> },
    { id: 'ssl',      label: 'SSL',      icon: <Shield size={18} /> },
    { id: 'ip',       label: 'Network',  icon: <Wifi size={18} /> },
    { id: 'software', label: 'Software', icon: <Box size={18} /> },
  ];

  const getFilteredData = () => {
    let currentSet = data[activeTab] ||[];
    if (filter !== 'All') {
      currentSet = currentSet.filter(item => item.status === filter);
    }
    if (search) {
      currentSet = currentSet.filter(item => 
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
      );
    }
    return currentSet;
  };

  const filteredItems = getFilteredData();
  const filters =['All', 'Elite-PQC', 'Standard', 'Legacy', 'Critical'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      
      {/* Dynamic Header */}
      <div className="bg-[#8b1528] p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10"><Network size={200}/></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Asset Discovery Engine</h2>
          <p className="opacity-70 max-w-lg">Mapping digital attack surfaces. Data is dynamically extracted from live X.509 certificate parsing.</p>
        </div>
        <div className="relative z-10 w-full md:w-96">
          <Search className="absolute left-4 top-4 text-white/50" size={20} />
          <input
            type="text"
            placeholder="Filter discovered assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:ring-2 focus:ring-pnb-gold focus:bg-white/20 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center font-bold text-[#8b1528] animate-pulse text-xl">Synchronizing with Discovery Engine...</div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100 gap-2 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setFilter('All'); }}
                className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-[#8b1528] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {tab.icon} {tab.label}
                <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {data[tab.id].length}
                </span>
              </button>
            ))}
          </div>

          {/* Sub-Filters */}
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <FilterPill 
                key={f} 
                label={f} 
                active={filter === f} 
                onClick={() => setFilter(f)} 
              />
            ))}
          </div>

          {/* Data Grid */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Discovery Date</th>
                    {activeTab === 'domains' && <><th>Domain Name</th><th>Certificate Authority</th><th>Organization</th></>}
                    {activeTab === 'ssl' && <><th>Common Name</th><th>Cipher Artifact</th><th>Issuer Authority</th></>}
                    {activeTab === 'ip' && <><th>IP Address</th><th>Active Ports</th><th>ASN / Netname</th></>}
                    {activeTab === 'software' && <><th>Product</th><th>TLS Context</th><th>Host Link</th></>}
                    <th className="px-6 py-5">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-5 text-xs font-bold text-gray-400">{item.detection}</td>
                      
                      {activeTab === 'domains' && <>
                        <td className="font-bold text-blue-600">{item.domain}</td>
                        <td className="text-sm text-gray-500">{item.registrar}</td>
                        <td className="text-sm font-black text-[#8b1528]">{item.company}</td>
                      </>}

                      {activeTab === 'ssl' && <>
                        <td className="font-bold text-gray-700">{item.commonName}</td>
                        <td className="font-mono text-[10px] text-gray-500 max-w-[200px] truncate">{item.fingerprint}</td>
                        <td className="text-sm text-gray-600">{item.ca}</td>
                      </>}

                      {activeTab === 'ip' && <>
                        <td className="font-mono font-bold text-gray-800">{item.ip}</td>
                        <td className="text-xs text-indigo-600 font-bold">{item.ports}</td>
                        <td className="text-xs">
                          <div className="font-bold text-gray-700">{item.netname}</div>
                          <div className="text-gray-400">{item.asn}</div>
                        </td>
                      </>}

                      {activeTab === 'software' && <>
                        <td className="font-black text-gray-700">{item.product}</td>
                        <td className="font-mono text-xs text-amber-600 font-bold">{item.version}</td>
                        <td className="text-xs text-blue-500 underline">{item.host}</td>
                      </>}

                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'Elite-PQC' ? 'bg-green-100 text-green-700' : 
                          item.status === 'Standard' ? 'bg-yellow-100 text-yellow-700' :
                          item.status === 'Legacy' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="p-20 text-center text-gray-400 font-bold italic">No discovered assets match your filters.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Info size={24}/></div>
        <p className="text-xs text-gray-500 leading-relaxed">
          <b>Discovery Logic:</b> This engine extracts organization names (O) and common names (CN) dynamically from X.509 TLS certificate payloads. Network/ASN data is marked "Unknown" unless connected to an active WHOIS API plugin.
        </p>
      </div>
    </motion.div>
  );
};

export default AssetDiscovery;