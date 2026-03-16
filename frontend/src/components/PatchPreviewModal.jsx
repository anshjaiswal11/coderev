import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function PatchPreviewModal({ open, onClose, onCreatePR, initial }) {
  const [content, setContent] = useState(initial?.patch || initial?.content || '');
  const [filePath, setFilePath] = useState(initial?.filePath || initial?.path || 'autofix/patch.txt');

  useEffect(() => {
    setContent(initial?.patch || initial?.content || '');
    setFilePath(initial?.filePath || initial?.path || 'autofix/patch.txt');
  }, [initial]);

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
          <div className="p-4 space-y-3">
            <label className="text-xs text-slate-400">Target file path</label>
            <input value={filePath} onChange={e => setFilePath(e.target.value)} className="input w-full" />
            <label className="text-xs text-slate-400">Patch / File content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} className="w-full bg-black/5 p-3 rounded text-sm font-mono" />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => onCreatePR({ filePath, content })} className="px-4 py-2 bg-emerald-500 text-white rounded">Create PR</button>
              <button onClick={onClose} className="px-4 py-2 bg-white/5 text-slate-200 rounded">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
