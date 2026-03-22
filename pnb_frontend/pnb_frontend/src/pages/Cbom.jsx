import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileCode, Lock, ShieldCheck } from 'lucide-react';

const Cbom = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.getCbom().then(res => setData(res.data)); }, []);

  if (!data) return <div className="p-10 font-bold text-pnb-maroon">Parsing Cryptographic Manifest...</div>;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Lock className="text-pnb-gold"/> Key Length Distribution</h3>
          <div className="h-64"><ResponsiveContainer>
            <BarChart data={data.charts.key_length_distribution}>
              <XAxis dataKey="size" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="count" fill="#9b1c31" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </div>

        <div className="bg-pnb-maroon p-8 rounded-3xl shadow-xl text-white">
          <ShieldCheck size={40} className="mb-4 text-pnb-gold" />
          <h3 className="text-2xl font-bold mb-2">Manifest Summary</h3>
          <p className="opacity-70 text-sm mb-6">CERT-In Annexure-A compliant inventory of all discovered cryptographic primitives.</p>
          <div className="space-y-4">
             <div className="flex justify-between border-b border-white/10 pb-2"><span>Active Primitives</span><span className="font-bold">{data.summary.total_applications}</span></div>
             <div className="flex justify-between border-b border-white/10 pb-2"><span>Vulnerable Configs</span><span className="font-bold text-pnb-gold">{data.summary.weak_cryptography}</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default Cbom;
