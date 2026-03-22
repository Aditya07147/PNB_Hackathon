import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Wifi, Box } from 'lucide-react';

const AssetDiscovery = () => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="bg-gradient-to-r from-pnb-maroon to-red-900 p-8 rounded-3xl shadow-xl text-white">
        <h2 className="text-3xl font-black mb-2">Automated Asset Discovery</h2>
        <p className="opacity-80">Continuously mapping PNB's external attack surface and digital footprint.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: <Globe />, title: 'Domains', count: 24 },
          { icon: <Shield />, title: 'SSL Certs', count: 12 },
          { icon: <Wifi />, title: 'IP / Subnets', count: 45 },
          { icon: <Box />, title: 'Software', count: 89 }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer">
            <div className="p-4 bg-yellow-50 text-pnb-gold rounded-2xl">{item.icon}</div>
            <div><h3 className="text-sm font-bold text-gray-400 uppercase">{item.title}</h3><p className="text-3xl font-black text-gray-800">{item.count}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center">
        <div className="inline-block p-4 bg-gray-50 rounded-full mb-4 animate-pulse"><Globe size={40} className="text-gray-400" /></div>
        <h3 className="text-xl font-bold text-gray-800">Discovery Engine Active</h3>
        <p className="text-gray-500 mt-2">The scanner is currently monitoring Autonomous System Numbers (ASNs) and CIDR blocks associated with Punjab National Bank.</p>
      </div>
    </motion.div>
  );
};
export default AssetDiscovery;
