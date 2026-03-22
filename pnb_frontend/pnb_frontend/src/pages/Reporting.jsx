import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

const Reporting = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/export/all').then(res => setData(res.data));
  }, []);

  const handleDownloadCsv = () => {
    if (!data) return;
    const headers = ["Target URL", "IP Address", "TLS Version", "Risk Tier", "Score"];
    const rows = data.scans.map(s => [s.target_url, s.ip_address, s.tls_version, s.risk_tier, s.simple_score]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `PNB_PQC_Report.csv`;
    link.click();
  };

  if (!data) return <div className="p-10 font-bold text-pnb-maroon">Generating Reports...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-pnb-maroon flex items-center gap-3"><FileText /> Compliance Reporting</h2>
          <p className="text-gray-500 mt-2">Generate and download official CERT-In compliant audit reports.</p>
        </div>
        <button onClick={handleDownloadCsv} className="bg-pnb-gold hover:bg-yellow-500 text-pnb-maroon font-black py-4 px-8 rounded-2xl flex items-center gap-3 shadow-lg shadow-yellow-500/20 transition-all">
          <Download /> EXPORT CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="text-xl font-bold text-gray-800 mb-6">Report Inclusions</h3>
           <ul className="space-y-4">
             {['Asset Inventory Map', 'Cryptographic Bill of Materials (CBOM)', 'NIST PQC Posture Grades', 'Remediation Action Plan'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-medium text-gray-600"><CheckCircle2 className="text-green-500" /> {item}</li>
             ))}
           </ul>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-center items-center text-center">
            <h3 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pnb-gold to-yellow-200">{data.summary.cumulative_score}/10</h3>
            <p className="uppercase tracking-widest text-xs font-bold text-gray-400 mt-4">Official Organization Score</p>
        </div>
      </div>
    </motion.div>
  );
};
export default Reporting;
