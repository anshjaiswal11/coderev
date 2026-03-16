import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { FileSearch, GitBranch, AlertTriangle, CheckCircle, TrendingUp, Plus, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

function StatCard({ icon: Icon, label, value, color = 'brand', trend, delay = 0 }) {
  const colors = {
    brand: 'text-brand-400 bg-brand-500/10 border-brand-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    red: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay }}
      className="glass-card p-6 flex flex-col group hover:-translate-y-1 transition-transform duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[color]} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <TrendingUp size={12} strokeWidth={3} /> {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-display font-bold text-slate-100 tracking-tight">{value ?? '—'}</div>
        <div className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  );
}

const statusColors = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  processing: 'bg-brand-500/10 text-brand-400 border-brand-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get('/analytics/summary'),
  });

  const { data: trendsData } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => api.get('/analytics/trends?days=14'),
  });

  const s = summary || {};
  const trends = trendsData?.trends || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight">
            Good {getTimeOfDay()}, {user?.displayName?.split(' ')[0] || user?.username} <span className="inline-block hover:animate-bounce cursor-default">👋</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light">Here's your comprehensive code quality overview.</p>
        </div>
        <Link to="/reviews/new" className="btn-primary flex items-center gap-2 group whitespace-nowrap">
          <Sparkles size={16} className="group-hover:animate-pulse" /> Force AI Review
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={FileSearch} label="Total Reviews" value={s.totalReviews} color="brand" delay={0.1} />
        <StatCard icon={GitBranch} label="Repositories" value={s.totalRepos} color="purple" delay={0.2} />
        <StatCard icon={AlertTriangle} label="Issues Found" value={s.totalIssues} color="amber" delay={0.3} />
        <StatCard icon={CheckCircle} label="Fixes Shipped" value={s.acceptedFixes} color="green" trend="+12%" delay={0.4} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 glass-card p-7 relative overflow-hidden"
        >
          {/* Subtle bg glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="font-display font-bold text-slate-200 text-lg">Velocity & Health</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">14-Day Trajectory</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-surface-800 border border-white/10 text-xs font-semibold text-slate-300">
              Issues Found
            </div>
          </div>
          
          {trends.length > 0 ? (
            <div className="h-[220px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="issuesGradColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="90%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={12}
                    minTickGap={20}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickMargin={12} 
                  />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.9)', 
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px', 
                      fontSize: '13px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 700 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="issues" 
                    stroke="#818cf8" 
                    strokeWidth={3} 
                    fill="url(#issuesGradColor)" 
                    dot={{ r: 4, strokeWidth: 2, fill: '#1e1b4b', stroke: '#818cf8' }} 
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#818cf8', stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-slate-500 text-sm">
              <ActivityIcon className="mb-2 opacity-50" />
              <span>Awaiting telemetry data</span>
            </div>
          )}
        </motion.div>

        {/* Quality score */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-7 flex flex-col items-center relative overflow-hidden text-center"
        >
          {/* Subtle bg glow */}
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none translate-y-1/2 -translate-x-1/2" />
          
          <div className="w-full text-left mb-6 relative z-10">
            <h2 className="font-display font-bold text-slate-200 text-lg">Aggregate Score</h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">Holistic Code Quality</p>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
            <QualityRing score={s.qualityScore || 0} />
            
            <div className="mt-8 w-full grid grid-cols-2 gap-3 pb-2">
               <div className="bg-surface-800/50 border border-white/5 rounded-xl py-3 px-4 text-center">
                 <div className="text-xl font-display font-bold text-slate-200">{s.reviewCount || 0}</div>
                 <div className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Total PRs</div>
               </div>
               <div className="bg-surface-800/50 border border-white/5 rounded-xl py-3 px-4 text-center">
                 <div className="text-xl font-display font-bold text-slate-200">{s.avgRiskScore || 0}</div>
                 <div className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Avg Risk</div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.04] bg-surface-900/50">
          <h2 className="font-display font-bold text-slate-200 text-lg">Live Reviews</h2>
          <Link to="/reviews" className="btn-ghost px-4 py-2 text-xs flex items-center gap-2 group">
            View Ledger <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
             <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"/>
             <span className="text-slate-500 text-sm font-medium tracking-wide">Querying database...</span>
          </div>
        ) : !s.recentReviews?.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-white/5 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FileSearch size={28} className="text-slate-500" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-2">No Reviews Queued</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto font-light">Connect a repository and push a commit, or submit a manual diff to see AI analysis here.</p>
            <Link to="/reviews/new" className="btn-primary text-sm px-6 py-2.5 inline-flex">
              Initialize first review
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {s.recentReviews.map((r, i) => (
              <Link
                key={r._id}
                to={`/reviews/${r._id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-4 px-7 py-5 hover:bg-white/[0.02] transition-colors group relative"
              >
                {/* Active indicator bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="text-[15px] font-semibold text-slate-200 truncate group-hover:text-brand-300 transition-colors">
                      {r.prTitle || 'Manual Direct Analysis'}
                    </p>
                    {r.prNumber && (
                      <span className="font-mono text-xs text-slate-500 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                        #{r.prNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
                    <span className="flex items-center gap-1.5"><GitBranch size={13}/> {r.repository?.fullName || 'Untitled Context'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} /> {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 sm:justify-end flex-wrap">
                  {r.totalIssues > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 border border-white/5 text-xs font-semibold">
                      <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={12}/> {r.totalIssues} Issues</span>
                    </div>
                  )}
                  <span className={`badge border ${statusColors[r.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-0.5" />
                    <span className="capitalize">{r.status}</span>
                  </span>
                  <div className="w-8 h-8 rounded-full bg-surface-800 border border-white/5 flex items-center justify-center text-slate-500 group-hover:bg-brand-500/20 group-hover:text-brand-300 group-hover:border-brand-500/30 transition-all">
                     <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function QualityRing({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  // Interpolated colors for a smoother gradient look based on score
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  const glowColor = pct >= 80 ? 'rgba(16, 185, 129, 0.4)' : pct >= 50 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(244, 63, 94, 0.4)';
  
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Glow behind the ring */}
      <div 
        className="absolute inset-0 rounded-full blur-[20px] opacity-50 transition-colors duration-1000"
        style={{ backgroundColor: color }}
      />
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 relative z-10 drop-shadow-xl">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 42}`}
          strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-4xl font-display font-bold text-slate-100 tabular-nums tracking-tighter">{pct}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Grade</span>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function ActivityIcon(props) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
