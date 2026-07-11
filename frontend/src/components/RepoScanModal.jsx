import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { X, Loader2, GitBranch, Zap, FileCode, ArrowRight } from 'lucide-react';

export default function RepoScanModal({ repo, onClose, onComplete }) {
  const [ref, setRef] = useState(repo?.defaultBranch || 'main');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: ({ repoId, ref }) => api.post('/reviews/repo-scan', { repoId, ref }),
    onSuccess: (data) => {
      toast.success(`Scan queued — ${data.totalFiles} files indexed`);
      onComplete && onComplete(data);
    },
    onError: (e) => {
      const msg = e?.error || e?.message || 'Scan failed';
      toast.error(msg);
    },
  });

  const handleViewReview = () => {
    navigate(`/reviews/${mutation.data?.review?._id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-card overflow-hidden shadow-2xl border border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Zap size={16} className="text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Repo Scan</h3>
              <p className="text-[11px] text-white/40 mt-0.5 truncate max-w-[260px]">{repo.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-white/50 mb-5 leading-relaxed">
            Analyze the entire repository and produce a repo-wide AI review with security, quality, and architecture insights.
          </p>

          <div className="mb-5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">Branch or ref</label>
            <div className="relative">
              <GitBranch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="main"
                disabled={mutation.isPending || mutation.isSuccess}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-900 border border-white/10 hover:border-white/20 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Progress state */}
          {mutation.isPending && (
            <div className="mb-5 p-4 rounded-xl bg-brand-500/5 border border-brand-500/15">
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-brand-400 shrink-0" />
                <div>
                  <div className="text-sm text-brand-300 font-medium">Scanning repository…</div>
                  <div className="text-xs text-white/40 mt-0.5">Fetching files and running AI analysis. This may take 1–3 minutes.</div>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {mutation.isSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <FileCode size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-emerald-300">Scan queued successfully</div>
                  <div className="text-xs text-white/40 mt-1 leading-relaxed">
                    {mutation.data?.totalFiles} files indexed — AI analysis running in background.
                  </div>
                  {mutation.data?.summary && (
                    <div className="text-xs text-white/60 mt-2">{mutation.data.summary}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!mutation.isSuccess ? (
              <>
                <button
                  onClick={() => mutation.mutate({ repoId: repo._id, ref })}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center"
                  disabled={mutation.isPending || !ref.trim()}
                >
                  {mutation.isPending ? (
                    <><Loader2 className="animate-spin" size={14} /> Scanning…</>
                  ) : (
                    <><Zap size={14} /> Start Scan</>
                  )}
                </button>
                <button onClick={onClose} className="btn-ghost" disabled={mutation.isPending}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleViewReview}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center"
                >
                  View Review <ArrowRight size={14} />
                </button>
                <button onClick={onClose} className="btn-ghost">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
