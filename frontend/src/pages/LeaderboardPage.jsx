import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, Zap, Code2, ShieldCheck, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function LeaderboardPage() {
  const { user: currentUser } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/analytics/leaderboard'),
  });

  const users = data?.leaderboard || [];
  
  // Extract top 3 for podium
  const top3 = [users[1], users[0], users[2]].filter(Boolean); // Reorder to: 2nd, 1st, 3rd for podium layout
  const rest = users.slice(3);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 text-center relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-amber-400 to-amber-600 border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30 relative z-10">
          <Trophy size={32} className="text-white fill-white/20" />
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-100 tracking-tight relative z-10">Engineering Excellence</h1>
        <p className="text-slate-400 text-lg mt-3 font-light max-w-lg mx-auto relative z-10">
          Global rankings based on AI-verified quality scores, successful fixes, and code reviews.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center p-12">
           <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
             <div className="flex items-end justify-center gap-4 md:gap-8 min-h-[400px] mb-16 px-4">
                {top3.map((u, i) => {
                  if (!u) return null;
                  const isFirst = i === 1;
                  const isSecond = i === 0;
                  const isThird = i === 2;
                  
                  const height = isFirst ? '220px' : isSecond ? '160px' : '120px';
                  const color = isFirst ? 'amber' : isSecond ? 'slate' : 'orange';
                  const glow = isFirst ? 'shadow-[0_0_60px_rgba(245,158,11,0.2)]' : isSecond ? 'shadow-[0_0_40px_rgba(148,163,184,0.15)]' : 'shadow-[0_0_40px_rgba(249,115,22,0.15)]';
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 20, delay: isFirst ? 0 : isSecond ? 0.1 : 0.2 }}
                      key={u._id} 
                      className="flex flex-col items-center flex-1 max-w-[200px]"
                    >
                      {/* Avatar & Info */}
                      <div className={clsx("relative mb-6 text-center transform transition-transform hover:-translate-y-2", isFirst && "scale-110")}>
                        {isFirst && <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>}
                        
                        <div className="relative inline-block">
                           <div className={clsx("absolute inset-0 rounded-full blur-md opacity-50", `bg-${color}-500`)} />
                           <img 
                            src={u.avatarUrl} 
                            alt={u.username} 
                            className={clsx("relative w-20 h-20 rounded-full border-4 object-cover", `border-${color}-400/50 bg-${color}-950`)}
                          />
                           <div className={clsx("absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-surface-950 border-2 border-surface-950 shadow-sm", `bg-${color}-400`)}>
                             {isFirst ? 1 : isSecond ? 2 : 3}
                           </div>
                        </div>
                        
                        <h3 className="mt-4 font-display font-bold text-slate-100 text-base">{u.username}</h3>
                        <p className="text-brand-400 font-mono text-xs font-bold mt-1 bg-brand-500/10 inline-block px-2 py-0.5 border border-brand-500/20 rounded-full">
                           {u.qualityScore} pts
                        </p>
                      </div>

                      {/* Pillar */}
                      <div 
                        className={clsx(
                          "w-full rounded-t-3xl border-t border-x border-white/10 relative overflow-hidden flex flex-col items-center justify-end pb-8", 
                          glow
                        )}
                        style={{ height, background: `linear-gradient(to top, rgba(2,6,23,0), var(--tw-colors-surface-800))` }}
                      >
                         <div className={clsx("absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-transparent opacity-50", `from-${color}-500 to-${color}-500`)} />
                         <div className="text-4xl font-display font-bold text-white/10 select-none">
                           {isFirst ? 'I' : isSecond ? 'II' : 'III'}
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
             </div>
          )}

          {/* List */}
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="glass-card overflow-hidden"
          >
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-900/80 border-b border-white/[0.04] text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-4">Engineer</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-3 text-center">Fixes Shipped</div>
              <div className="col-span-2 text-right">Badges</div>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {rest.map((u, i) => {
                const globalRank = i + 4;
                const isMe = u._id === currentUser?._id;
                
                return (
                  <motion.div 
                    variants={item}
                    key={u._id} 
                    className={clsx(
                      "grid grid-cols-12 gap-4 items-center px-6 py-4 transition-colors group relative",
                      isMe ? "bg-brand-500/5 hover:bg-brand-500/10" : "hover:bg-white/[0.02]"
                    )}
                  >
                    {isMe && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />}

                    <div className="col-span-1 text-center font-display font-bold text-slate-500">
                      {globalRank}
                    </div>

                    <div className="col-span-4 flex items-center gap-3">
                      <img src={u.avatarUrl} alt={u.username} className="w-8 h-8 rounded-full ring-2 ring-surface-800" />
                      <div>
                        <div className={clsx("font-semibold text-sm", isMe ? "text-brand-300" : "text-slate-200")}>
                          {u.displayName || u.username} {isMe && "(You)"}
                        </div>
                        <div className="text-[11px] text-slate-500">@{u.username}</div>
                      </div>
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <div className="font-mono text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm">
                        {u.qualityScore}
                      </div>
                    </div>

                    <div className="col-span-3 flex justify-center">
                      <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Code2 size={14} className="text-slate-500" /> {u.fixesAccepted || 0}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-1">
                      {u.badges?.slice(0, 3).map((b, bi) => (
                        <div key={bi} className="w-6 h-6 rounded bg-surface-800 border border-white/10 flex items-center justify-center text-[10px]" title={b}>
                          🌟
                        </div>
                      ))}
                      {(u.badges?.length || 0) > 3 && (
                        <div className="w-6 h-6 rounded bg-surface-900 border border-white/5 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          +{u.badges.length - 3}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              
              {rest.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-sm font-light">
                  No further ranking context available.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
