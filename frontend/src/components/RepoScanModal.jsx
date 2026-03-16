import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

export default function RepoScanModal({ repo, onClose, onComplete }) {
  const [ref, setRef] = useState(repo?.defaultBranch || 'main');

  const mutation = useMutation({
    mutationFn: ({ repoId, ref }) => api.post('/reviews/repo-scan', { repoId, ref }),
    onSuccess: (data) => {
      toast.success('Repo scan completed');
      onComplete && onComplete(data);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Scan failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl glass-card overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="font-medium text-white">Repo scan: {repo.fullName}</h3>
            <p className="text-xs text-white/40 mt-0.5">Analyze the repository and produce a repo-wide AI review.</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18} /></button>
        </div>

        <div className="p-5">
          <label className="text-xs text-white/40">Branch or ref</label>
          <input value={ref} onChange={e => setRef(e.target.value)} className="input mt-2 w-full" />

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => mutation.mutate({ repoId: repo._id, ref })}
              className="btn-primary flex items-center gap-2"
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Start scan'}
            </button>
            <button onClick={onClose} className="btn-ghost">Cancel</button>
          </div>

          {mutation.isLoading && (
            <div className="mt-4 text-sm text-white/40">Scanning repository — this may take a minute…</div>
          )}

          {mutation.isSuccess && (
            <div className="mt-4 p-3 rounded border border-white/[0.06] bg-white/3">
              <div className="text-sm text-white/80">Summary</div>
              <div className="text-sm text-white/60 mt-1">{mutation.data.summary || 'No summary'}</div>
              <div className="mt-3 text-xs text-white/40">Files scanned: {mutation.data.totalFiles}</div>
              <div className="mt-3">
                <a href={`/reviews/${mutation.data.review._id}`} className="btn-primary text-xs py-1.5">View Review</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
