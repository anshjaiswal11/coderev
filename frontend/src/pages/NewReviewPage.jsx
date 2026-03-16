import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  GitBranch, GitPullRequest, Code2, ArrowRight, Loader2, Play, 
  FileText, Zap, ChevronRight, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function NewReviewPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('pr'); // 'pr' or 'diff'
  const [repoId, setRepoId] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [diffContent, setDiffContent] = useState('');

  const { data: reposData, isLoading: reposLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => api.get('/repos'),
  });

  const generateMutation = useMutation({
    mutationFn: (data) => api.post('/reviews', data),
    onSuccess: (data) => {
      toast.success('Matrix allocation successful', { icon: '🚀' });
      navigate(`/reviews/${data.review._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Compute kernel failed to initialize');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (method === 'pr') {
      if (!repoId || !prNumber) return toast.error('Repository and PR Number required');
      generateMutation.mutate({ repoId, prNumber });
    } else {
      if (!diffContent) return toast.error('Differential payload cannot be empty');
      // For manual diff, we need to manually call 'manual' route instead of standard one
      api.post('/reviews/manual', { repoId, diffContent })
        .then(res => {
          toast.success('Matrix allocation successful', { icon: '🚀' });
          navigate(`/reviews/${res.review?._id || res.data?.review?._id}`);
        })
        .catch(err => toast.error(err.response?.data?.error || 'Compute kernel failed to initialize'));
    }
  };

  const repos = reposData?.repos || [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center relative"
      >
        <div className="absolute top-0 right-1/2 translate-x-1/2 -z-10 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-surface-800 to-surface-900 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20">
          <Zap size={28} className="text-brand-400" />
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-100 tracking-tight">Initialize Auto-Review</h1>
        <p className="text-slate-400 text-lg mt-3 font-light max-w-lg mx-auto">
          Submit a Pull Request or raw differential code for deep neural analysis.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-4 mb-8"
        >
          {[
            { id: 'pr', label: 'GitHub Pull Request', icon: GitPullRequest },
            { id: 'diff', label: 'Raw Diff Payload', icon: Code2 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              className={clsx(
                "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300 font-semibold text-sm w-48 justify-center group relative overflow-hidden",
                method === id 
                  ? "bg-surface-800 border-brand-500 text-brand-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
                  : "bg-surface-900 border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300 hover:bg-white/[0.02]"
              )}
            >
              {method === id && <div className="absolute inset-0 bg-brand-500/10" />}
              <Icon size={18} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </motion.div>

        <motion.div 
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 max-w-2xl mx-auto shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-purple-600 to-brand-600 opacity-50" />
          
          <AnimatePresence mode="popLayout">
            {method === 'pr' ? (
              <motion.div 
                key="pr"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 px-1">Target Repository</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none">
                      <GitBranch size={16} />
                    </div>
                    {reposLoading ? (
                      <div className="w-full px-12 py-3.5 bg-surface-900 border border-white/5 rounded-xl text-sm text-slate-500 flex items-center shadow-inner">
                         <Loader2 size={16} className="animate-spin mr-2" /> Syncing repositories...
                      </div>
                    ) : (
                      <select
                        value={repoId}
                        onChange={(e) => setRepoId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-900/80 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none shadow-inner transition-all cursor-pointer"
                        required
                      >
                        <option value="" disabled className="text-slate-500">Select connected workspace...</option>
                        {repos.map((r) => (
                          <option key={r._id} value={r._id}>{r.fullName}</option>
                        ))}
                      </select>
                    )}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronRight size={16} className="rotate-90 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                  {repos.length === 0 && !reposLoading && (
                    <p className="mt-2 text-xs text-amber-400/80 font-medium px-1 flex items-center gap-1.5">
                      <CheckCircle2 size={12}/> Connect a repository in settings first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2 px-1">Pull Request Number</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors pointer-events-none font-mono">
                      #
                    </div>
                    <input
                      type="number"
                      value={prNumber}
                      onChange={(e) => setPrNumber(e.target.value)}
                      placeholder="e.g. 42"
                      className="w-full pl-9 pr-4 py-3.5 bg-surface-900/80 border border-white/10 hover:border-white/20 rounded-xl text-sm font-medium text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner transition-all font-mono"
                      required
                      min="1"
                    />
                  </div>
                  <p className="mt-2 text-xs font-light text-slate-500 px-1">Ensure the PR is open on GitHub.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="diff"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <label className="text-sm font-semibold text-slate-300">Differential Payload</label>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Raw git diff</span>
                </div>
                <div className="relative group rounded-xl overflow-hidden border border-white/10 hover:border-white/20 focus-within:!border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/50 transition-all shadow-inner">
                  <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50 border border-rose-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50 border border-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 border border-emerald-500" />
                  </div>
                  <textarea
                    value={diffContent}
                    onChange={(e) => setDiffContent(e.target.value)}
                    placeholder={`diff --git a/backend/server.js b/backend/server.js\nindex c9d24a5..d3a8e9b 100644\n--- a/backend/server.js\n+++ b/backend/server.js\n@@ -10,3 +10,4 @@\n- const slowFunction = () => { ... }\n+ const optimizedFx = React.useCallback(() => { ... })`}
                    className="w-full h-[280px] pt-10 px-4 pb-4 bg-surface-900/80 text-sm font-mono text-slate-300 placeholder:text-slate-700/50 focus:outline-none resize-none leading-relaxed"
                    required
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-light text-slate-500 px-1">
                  <span className="flex items-center gap-1"><FileText size={12}/> Supported: Unified Diff format</span>
                  <span>{diffContent.length} chars</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t border-white/[0.04] flex items-center justify-end">
             <button
              type="submit"
              disabled={generateMutation.isPending || (method === 'pr' && (!repoId || !prNumber))}
              className={clsx(
                "btn-primary px-8 py-3.5 flex items-center gap-2 group text-[15px]",
                generateMutation.isPending && "opacity-75 cursor-not-allowed"
              )}
            >
              {generateMutation.isPending ? (
                <><Loader2 size={18} className="animate-spin" /> Transmitting...</>
              ) : (
                <><Play size={18} className="fill-white/80" /> Execute Deep Scan <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform ml-1" /></>
              )}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
