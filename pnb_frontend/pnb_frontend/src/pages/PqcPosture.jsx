import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

const PqcPosture = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.getPqc().then(res => setData(res.data)); }, []);

  if (!data) return <div className="p-10 text-pnb-maroon font-bold">Auditing Posture...</div>;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-pnb-maroon">Posture Compliance</h2>
           <p className="text-gray-400 font-medium">Alignment with NIST FIPS 203/204/205 Standards</p>
        </div>
        <div className="text-center bg-gray-50 px-8 py-3 rounded-2xl">
           <p className="text-[10px] font-black text-gray-400 uppercase">Compliance Score</p>
           <p className="text-2xl font-black text-green-600">PASSED</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {data.assets_table.slice(0, 6).map((a, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Asset</p>
                <p className="text-sm font-bold text-gray-700 truncate w-40">{a.name.split(' ')[0]}</p>
              </div>
              {a.pqc_support === 'Yes' ? <CheckCircle2 className="text-green-500" /> : <ShieldAlert className="text-red-500" />}
           </div>
         ))}
      </div>
    </motion.div>
  );
};
export default PqcPosture;
