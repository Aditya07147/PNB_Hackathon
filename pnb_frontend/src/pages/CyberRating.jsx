import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Trophy } from 'lucide-react';

const CyberRating = () => {
  const [score, setScore] = useState(null);
  
  useEffect(() => { 
    api.get('/api/export/all')
      .then(res => setScore(res.data.summary.cumulative_score))
      .catch(err => console.error(err)); 
  }, []);

  if (score === null) return <div className="p-10 font-bold text-pnb-maroon">Calculating Enterprise Rating...</div>;

  const gaugeData = [{ value: score }, { value: 10 - score }];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center space-y-10 py-10">
      <div className="text-center">
        <Trophy size={60} className="mx-auto text-pnb-gold mb-4" />
        <h2 className="text-4xl font-black text-pnb-maroon">Consolidated PQC Rating</h2>
        <p className="text-gray-400 mt-2 font-medium">Enterprise-Wide Security Posture Assessment</p>
      </div>

      <div className="relative w-80 h-80">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={gaugeData} innerRadius={100} outerRadius={130} startAngle={180} endAngle={0} dataKey="value" stroke="none">
              <Cell fill="#9b1c31" />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
          <span className="text-7xl font-black text-gray-800 tracking-tighter">{score}</span>
          <span className="text-xl font-bold text-gray-400 uppercase tracking-widest">Score / 10</span>
        </div>
      </div>
    </motion.div>
  );
};
export default CyberRating;
