import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
  AreaChart, Area, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  XAxis, YAxis, ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingDown, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORY_COLORS = {
  bug: '#f43f5e',           // rose-500
  security: '#f59e0b',      // amber-500
  performance: '#a855f7',   // purple-500
  style: '#0ea5e9',         // sky-500
  'best-practice': '#10b981',// emerald-500
  test: '#ec4899',          // pink-500
  complexity: '#f97316',    // orange-500
};

export default function AnalyticsPage() {
  const [repoFilter, setRepoFilter] = useState('');

  const { data: reposData } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => api.get('/repos'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', repoFilter],
    queryFn: () => api.get(`/analytics${repoFilter ? `?repoId=${repoFilter}` : ''}`),
  });

  const repos = reposData?.repos || [];
  const trends = data?.trends || [];
  const categoryDist = data?.categoryDist || [];
  const fileRisks = data?.fileRisks || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl shadow-black/50 text-sm">
          <p className="text-slate-400 font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 font-bold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-200">{entry.name}:</span>
              <span style={{ color: entry.color }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <BarChart3 size={28} className="text-brand-400" />
            Telemetry & Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light max-w-xl">
            Deep analysis of structural defects, security vectors, and resolution velocity.
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400 z-10 pointer-events-none" />
          <select
            value={repoFilter}
            onChange={e => setRepoFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-surface-800 border-brand-500/30 text-brand-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none shadow-inner border shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all relative z-0 cursor-pointer"
          >
            <option value="">Global Organization View</option>
            {repos.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 bg-surface-800 pointer-events-none flex items-center justify-center -mr-1">
             <div className="w-0 h-0 border-l-[3px] border-l-transparent border-t-[4px] border-t-brand-400 border-r-[3px] border-r-transparent"/>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
          <Loader2 size={32} className="text-brand-500 animate-spin" />
          <p className="text-slate-500 text-sm font-medium tracking-wide">Aggregating telemetry...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trends Area Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-200">Defect Discovery Velocity</h2>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">30-Day Resolution Timeline</p>
              </div>
            </div>

            <div className="h-[300px] w-full relative z-10 text-[11px] font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#334155" tick={{ fill: '#64748b' }} tickMargin={15} />
                  <YAxis stroke="#334155" tick={{ fill: '#64748b' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="found" name="Anomalies Found" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorFound)" activeDot={{ r: 6, strokeWidth: 2, fill: '#f43f5e', stroke: '#fff' }} />
                  <Area type="monotone" dataKey="fixed" name="Patches Shipped" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFixed)" activeDot={{ r: 6, strokeWidth: 2, fill: '#10b981', stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Category Pie Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-7 flex flex-col items-center relative overflow-hidden"
          >
            <div className="w-full text-left mb-6 relative z-10">
              <h2 className="text-lg font-display font-bold text-slate-200">Topology Breakdown</h2>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">Distribution across vectors</p>
            </div>

            <div className="h-[220px] w-full flex-shrink-0 relative z-10 mt-[-20px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    stroke="none"
                  >
                    {categoryDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry._id] || '#64748b'} className="drop-shadow-lg outline-none hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full flex-1 mt-6 space-y-2 relative z-10 pr-2 overflow-y-auto custom-scrollbar max-h-[140px]">
              {categoryDist.map((cat) => (
                <div key={cat._id} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[cat._id] || '#64748b' }} />
                    <span className="capitalize text-slate-300 font-medium group-hover:text-white transition-colors">{cat._id}</span>
                  </div>
                  <span className="font-mono text-slate-500 bg-surface-800 px-2 py-0.5 rounded border border-white/5 group-hover:border-white/20 transition-colors">{cat.count}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Risk Files */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 glass-card p-7"
          >
            <div className="flex items-center justify-between mb-8 cursor-default">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-200">Critical File Heatmap</h2>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mt-1">Modules ranked by technical debt</p>
              </div>
              <div className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-center gap-2">
                <TrendingDown size={14} /> Highest Risk
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fileRisks.map((file, i) => (
                <div key={i} className="bg-surface-900 border border-white/5 hover:border-brand-500/30 rounded-xl p-4 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-start justify-between mb-3 relative z-10">
                    <div className="font-mono text-xs text-brand-300 truncate pr-4" title={file._id}>{file._id.split('/').pop()}</div>
                    <div className="flex gap-1 shrink-0">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className={`w-1.5 h-4 rounded-sm ${j < Math.ceil(file.totalIssues / 10) ? 'bg-rose-500' : 'bg-surface-700'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 mt-2">Cumulative Issues</div>
                      <div className="text-2xl font-display font-bold text-rose-400">{file.totalIssues}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                      {file._id.split('/').slice(0,-1).join('/') || '/'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
