'use client';

import { motion } from 'framer-motion';

interface Stat {
  label: string;
  value: string | number;
  icon?: string;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="glass p-6 text-center hover:scale-105 transition-transform"
        >
          {stat.icon && <div className="text-3xl mb-2">{stat.icon}</div>}
          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {stat.value}
          </div>
          <div className="text-sm text-white/60 mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
