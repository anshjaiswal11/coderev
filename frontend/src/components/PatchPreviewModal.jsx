import { useState, useEffect } from 'react';
import { GitBranch, Github, X } from 'lucide-react';

export default function PatchPreviewModal({ open, onClose, onCreatePR, initial, defaultRepoFullName = '', defaultBaseBranch = 'main' }) {
  const [content, setContent] = useState(initial?.patch || initial?.content || '');
  const [filePath, setFilePath] = useState(initial?.filePath || initial?.path || 'autofix/patch.txt');
  const [targetRepoFullName, setTargetRepoFullName] = useState(defaultRepoFullName);
  const [targetBaseBranch, setTargetBaseBranch] = useState(defaultBaseBranch);

  useEffect(() => {
    setContent(initial?.patch || initial?.content || '');
    setFilePath(initial?.filePath || initial?.path || 'autofix/patch.txt');
    setTargetRepoFullName(initial?.targetRepoFullName || defaultRepoFullName || '');
    setTargetBaseBranch(initial?.targetBaseBranch || defaultBaseBranch || 'main');
  }, [initial, defaultRepoFullName, defaultBaseBranch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-surface-900 rounded-xl border border-white/6 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/6">
            <div className="font-semibold">Preview Patch</div>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-[1fr_180px] gap-3">
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Github size={13} /> Target repository
                </label>
                <input
                  value={targetRepoFullName}
                  onChange={e => setTargetRepoFullName(e.target.value)}
                  placeholder="owner/repo"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <GitBranch size={13} /> Base branch
                </label>
                <input
                  value={targetBaseBranch}
                  onChange={e => setTargetBaseBranch(e.target.value)}
                  placeholder="main"
                  className="input w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Target file path</label>
              <input value={filePath} onChange={e => setFilePath(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Patch / File content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} className="w-full bg-black/5 p-3 rounded text-sm font-mono" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => onCreatePR({ filePath, content, targetRepoFullName, targetBaseBranch })}
                className="px-4 py-2 bg-emerald-500 text-white rounded"
              >
                Create Pull Request
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-white/5 text-slate-200 rounded">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
