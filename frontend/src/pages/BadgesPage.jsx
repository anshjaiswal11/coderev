import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Award, Shield, Cpu, Flame, CheckCircle2, Lock, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// Badge library visual metadata
const BADGE_META = {
  'First Blood':    { icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  'Security Pro':   { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  'Fix Machine':    { icon: Cpu, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/30' },
  'Clean Coder':    { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  default:          { icon: Award, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' }
};

export default function BadgesPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => api.get('/badges'),
  });

  const allBadges = data?.allBadges || [];
  const earned = data?.earnedBadges || [];
  
  const earnedNames = new Set(earned.map(b => b.name));
  const completionPct = allBadges.length ? Math.round((earned.length / allBadges.length) * 100) : 0;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } } };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div className="relative">
           <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-brand-500/20 rounded-full blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
           <h1 className="text-4xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3 relative z-10">
            <Award size={36} className="text-brand-400" />
            Achievements
          </h1>
          <p className="text-slate-400 text-sm mt-3 font-light relative z-10">
            Collect badges by demonstrating engineering superiority and security diligence.
          </p>
        </div>

        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost flex items-center gap-2 group whitespace-nowrap"
        >
          {isFetching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-brand-400 group-hover:animate-pulse" />} 
          Synthesize Progress
        </button>
      </motion.div>

      {/* Progress Bar Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 mb-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-brand-600/10 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-200">Collection Completion</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">{earned.length} of {allBadges.length} unlocked</p>
          </div>
          <div className="text-3xl font-display font-bold text-brand-400">{completionPct}%</div>
        </div>
        <div className="h-4 bg-surface-950 rounded-full overflow-hidden border border-white/5 shadow-inner relative z-10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-brand-600 to-purple-500 relative"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
          </motion.div>
        </div>
      </motion.div>

      {/* Badges Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
           <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          <AnimatePresence>
            {allBadges.map((badge) => {
              const unlocked = earnedNames.has(badge.name);
              const meta = BADGE_META[badge.name] || BADGE_META.default;
              const Icon = meta.icon;

              return (
                <motion.div 
                  variants={item}
                  key={badge.name} 
                  className={clsx(
                    "glass-card p-6 flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 group",
                    unlocked 
                      ? "border-brand-500/20 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(99,102,241,0.2)] bg-gradient-to-b from-surface-800 to-surface-900" 
                      : "opacity-60 grayscale hover:grayscale-0 border-white/5 bg-surface-900"
                  )}
                >
                  {/* Subtle glow effect for unlocked */}
                  {unlocked && (
                    <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />
                  )}

                  <div className={clsx(
                    "w-20 h-20 rounded-[20px] flex items-center justify-center mb-5 rotate-3 transition-transform duration-500",
                    unlocked ? `${meta.bg} shadow-lg shadow-black/50 group-hover:rotate-12 group-hover:scale-110` : "bg-surface-950 border border-white/10"
                  )}>
                    {unlocked ? (
                      <Icon size={32} className={clsx(meta.color, "drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]")} />
                    ) : (
                      <Lock size={32} className="text-slate-600" />
                    )}
                  </div>
                  
                  <h3 className="font-display font-bold text-slate-100 mb-2 truncate w-full text-lg">{badge.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">{badge.description}</p>
                  
                  {unlocked && (
                    <div className="mt-5 w-full pt-4 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest text-brand-400 flex items-center justify-center gap-1.5">
                      <Sparkles size={12}/> Verified
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
