import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { FileSearch, Plus, ArrowRight, Clock, AlertTriangle, CheckCircle, XCircle, Loader2, ListFilter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const STATUS_META = {
  pending:    { label: 'Queued',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]', icon: Clock },
  processing: { label: 'Analyzing', color: 'text-brand-400 bg-brand-500/10 border-brand-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]', icon: Loader2 },
  completed:  { label: 'Completed',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]', icon: CheckCircle },
  failed:     { label: 'Failed',     color: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]', icon: XCircle },
};

function RiskBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 
                score >= 40 ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 
                              'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${color}`}>
      Risk {score}
    </span>
  );
}

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const setlimit = 5;

const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export default function ReviewsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', page],
    queryFn: () => api.get(`/reviews?page=${page}&limit=20`),
    keepPreviousData: true,
  });

  const reviews = data?.reviews || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <FileSearch size={28} className="text-brand-400" />
            Review Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Viewing {reviews.length} of {data?.total ?? '0'} automated reviews across all connected repositories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-4 py-2.5 flex items-center gap-2">
            <ListFilter size={14} /> Filter
          </button>
          <Link to="/reviews/new" className="btn-primary flex items-center gap-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <Plus size={15} /> Initialize Review
          </Link>
        </div>
      </motion.div>

      {isLoading && reviews.length === 0 ? (
        <div className="glass-card p-20 text-center flex flex-col items-center justify-center gap-4 border border-white/5">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"/>
          <p className="text-slate-400 font-medium animate-pulse">Querying ledger records...</p>
        </div>
      ) : reviews.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-20 text-center relative overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="w-20 h-20 rounded-2xl bg-surface-800 border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
            <FileSearch size={32} className="text-slate-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-200 mb-2 relative z-10">No Reviews Executed</h3>
          <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto font-light relative z-10">
            Your ledger is currently empty. Start by initializing a new Pull Request review or conducting a manual differential analysis.
          </p>
          <Link to="/reviews/new" className="btn-primary mx-auto inline-flex items-center gap-2 relative z-10">
            <Plus size={15} /> Initialize First Review
          </Link>
        </motion.div>
      ) : (
        <>
          <motion.div 
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="glass-card overflow-hidden border border-white/5 shadow-2xl shadow-black/50"
          >
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-surface-900/80 border-b border-white/[0.04] text-[11px] font-semibold text-slate-500 uppercase tracking-widest hidden md:grid">
              <div className="col-span-5">Context / Reference</div>
              <div className="col-span-2 text-center">Repository</div>
              <div className="col-span-3 text-center">Diagnostics</div>
              <div className="col-span-2 text-right">Status / Time</div>
            </div>

            <div className="divide-y divide-white/[0.03]">
              {reviews.map((review) => {
                const meta = STATUS_META[review.status] || STATUS_META.pending;
                const StatusIcon = meta.icon;
                
                return (
                  <motion.div variants={listItem} key={review._id}>
                    <Link
                      to={`/reviews/${review._id}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors group relative"
                    >
                      {/* Hover line */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Name & Branch */}
                      <div className="md:col-span-5 flex flex-col min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-200 text-[15px] truncate group-hover:text-brand-300 transition-colors">
                            {review.prTitle || 'Manual Direct Analysis'}
                          </span>
                          {review.prNumber && (
                            <span className="font-mono text-[10px] text-brand-300 px-1.5 py-0.5 bg-brand-500/10 border border-brand-500/20 rounded">
                              #{review.prNumber}
                            </span>
                          )}
                        </div>
                        {review.filesChanged?.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                             {review.filesChanged.length} files analyzed
                          </div>
                        )}
                      </div>

                      {/* Repository */}
                      <div className="md:col-span-2 md:text-center text-xs text-slate-400 font-medium">
                        {review.repository?.fullName ? (
                           <span className="truncate block mx-auto">{review.repository.fullName.split('/')[1] || review.repository.fullName}</span>
                        ) : (
                           <span className="italic text-slate-600">No context</span>
                        )}
                      </div>

                      {/* Diagnostics */}
                      <div className="md:col-span-3 flex items-center md:justify-center gap-2 flex-wrap">
                        <RiskBadge score={review.riskScore} />
                        
                        {review.totalIssues > 0 ? (
                          <div className="flex items-center gap-2 px-2 py-0.5 bg-surface-800 rounded border border-white/5 text-[11px] font-semibold">
                            {review.errorCount > 0 && (
                              <span className="flex items-center gap-1 text-rose-400">
                                <AlertTriangle size={10} className="fill-rose-400/20" /> {review.errorCount}
                              </span>
                            )}
                            {review.warningCount > 0 && (
                              <span className={clsx(review.errorCount > 0 ? "border-l border-white/10 pl-2" : "", "text-amber-400 flex items-center gap-1")}>
                                <AlertTriangle size={10} className="fill-amber-400/20" /> {review.warningCount}
                              </span>
                            )}
                          </div>
                        ) : review.status === 'completed' ? (
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle size={10} /> Clean Code
                          </span>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2 flex items-center md:justify-end gap-3 justify-between">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${meta.color}`}>
                            <StatusIcon size={10} className={review.status === 'processing' ? 'animate-spin' : ''} />
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-800 border border-white/5 flex items-center justify-center text-slate-500 group-hover:bg-brand-500/20 group-hover:text-brand-300 group-hover:border-brand-500/30 transition-all flex-shrink-0">
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <AnimatePresence>
            {totalPages > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mt-6 px-2"
              >
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost px-4 py-2 text-sm disabled:opacity-30 disabled:hover:border-white/[0.08]"
                >
                  ← Previous
                </button>
                <div className="flex gap-1 bg-surface-900 border border-white/5 rounded-xl p-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={clsx(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                        page === i + 1 ? "bg-brand-500 text-white shadow" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost px-4 py-2 text-sm disabled:opacity-30 disabled:hover:border-white/[0.08]"
                >
                  Next →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
