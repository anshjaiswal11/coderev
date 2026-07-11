import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import {
  AlertTriangle, XCircle, CheckCircle, ChevronDown, ChevronRight,
  Zap, Shield, Cpu, Brush, FlaskConical, Layers, GitPullRequest,
  ExternalLink, Copy, Check, Loader2, RefreshCw, Lock, TestTube,
  FileCode2, CheckSquare, Sparkles, Filter, Code2, Brain, GitBranch, Clock
} from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PatchPreviewModal from '../components/PatchPreviewModal';
import clsx from 'clsx';

const CATEGORY_META = {
  bug:           { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',     label: 'Defect' },
  security:      { icon: Shield,       color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',   label: 'Vulnerability' },
  performance:   { icon: Cpu,          color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',   label: 'Performance' },
  style:         { icon: Brush,        color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20',      label: 'Style' },
  'best-practice':{ icon: FlaskConical,color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',  label: 'Best Practice' },
  test:          { icon: TestTube,     color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20',     label: 'Test coverage' },
  complexity:    { icon: Layers,       color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',    label: 'Complexity' },
};

const SEV_COLORS = {
  error:   'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  info:    'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.1)]',
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function parseJSONSafe(s) {
  if (!s) return null;
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch (e) { return null; }
}

function formatNeuralSummary(text) {
  if (!text) return null;
  const parsed = parseJSONSafe(text);
  if (parsed && typeof parsed === 'object') {
    const candidates = [parsed.summary, parsed.summary_text, parsed.overview, parsed.message, parsed.result, parsed.conclusion, parsed.description];
    for (const c of candidates) if (c && String(c).trim().length > 5) return String(c).trim();
    if (Array.isArray(parsed.issues) && parsed.issues.length) return parsed.issues.slice(0,3).map(i => i.title || i.description || i.file).join(' | ');
    // fallback: pretty-print compact JSON
    try { return JSON.stringify(parsed, null, 2).slice(0, 2000); } catch (e) { return String(parsed).slice(0, 2000); }
  }
  // Strip markdown fences and collapse whitespace
  const cleaned = String(text).replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 2000);
}

function IssueCard({ issue, reviewId, onUpdate, onOpenPatchModal }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[issue.category] || CATEGORY_META.bug;
  const Icon = meta.icon;

  const acceptMutation = useMutation({
    mutationFn: (data) => api.patch(`/reviews/${reviewId}/issues/${issue._id}`, data),
    onSuccess: () => { onUpdate(); toast.success('Status updated'); },
  });

  const autoFixMutation = useMutation({
    mutationFn: () => api.post(`/reviews/${reviewId}/issues/${issue._id}/autofix`),
    onSuccess: () => { onUpdate(); toast.success('Auto-fix patch generated instantly'); },
    onError: () => toast.error('Failed to generate patch'),
  });

  return (
    <motion.div 
      layout
      className={clsx(
        'glass-card overflow-hidden transition-all duration-300 border',
        issue.dismissed ? 'opacity-40 border-white/5' : 
        issue.accepted === true ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)] bg-emerald-950/20' : 
        expanded ? `${meta.border} shadow-lg shadow-black/40` : 'border-white/[0.06] hover:border-white/10'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start sm:items-center gap-4 p-5 text-left group"
      >
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner border transition-all duration-300', meta.bg, meta.border, expanded ? "scale-110" : "group-hover:scale-110")}>
          <Icon size={18} className={meta.color} />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <span className={clsx("font-semibold text-[15px] truncate max-w-lg transition-colors", issue.accepted ? "text-emerald-400" : "text-slate-200 group-hover:text-white")}>
                {issue.title}
              </span>
              <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border', SEV_COLORS[issue.severity])}>
                {issue.severity}
              </span>
              {issue.owaspCategory && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                  {issue.owaspCategory}
                </span>
              )}
              {issue.accepted === true && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                  <CheckSquare size={10} /> RESOLVED
                </span>
              )}
            </div>
            {issue.file && (
              <p className="text-[13px] text-slate-500 flex items-center gap-2">
                <FileCode2 size={13} className="text-slate-600"/>
                <span className="font-mono text-slate-400">{issue.file}</span>
                {issue.line && <span className="font-mono text-slate-600 bg-surface-800 px-1 rounded border border-white/5">:{issue.line}</span>}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-end flex-shrink-0">
             <div className="w-8 h-8 rounded-full bg-surface-800 border border-white/5 flex items-center justify-center text-slate-500 transition-colors group-hover:bg-white/5 group-hover:text-white">
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <ChevronDown size={16} />
                </motion.div>
             </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.04] bg-surface-950/30">
              <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed mb-6 mt-4 font-light">
                {issue.description}
              </div>

              {issue.suggestion && (
                <div className="p-4 bg-surface-800 rounded-xl border border-white/[0.06] mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 bottom-0 bg-brand-500" />
                  <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <Sparkles size={12} className="text-brand-400" /> Resolution Logic
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{issue.suggestion}</p>
                </div>
              )}

              {issue.patchCode && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase px-1 flex items-center gap-2">
                      <Code2 size={12} className="text-emerald-400" /> Code Patch
                    </p>
                    <CopyButton text={issue.patchCode} />
                  </div>
                  <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-inner bg-[#282c34]">
                    <SyntaxHighlighter
                      language="diff"
                      style={atomOneDark}
                      customStyle={{ background: 'transparent', padding: '16px', fontSize: '13px', margin: 0, lineHeight: 1.5, fontFamily: '"Fira Code", monospace' }}
                    >
                      {issue.patchCode}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => acceptMutation.mutate({ accepted: true })}
                  disabled={issue.accepted === true || acceptMutation.isPending}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    issue.accepted === true
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-surface-800 text-slate-300 border border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/40 shadow-sm'
                  )}
                >
                  <CheckCircle size={15} />
                  {issue.accepted === true ? 'Marked as Resolved' : 'Mark Configured / Applied'}
                </button>
                
                <button
                  onClick={() => acceptMutation.mutate({ dismissed: true })}
                  disabled={issue.dismissed || acceptMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent text-slate-500 border border-transparent hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-xl text-sm font-semibold transition-all"
                >
                  Ignored
                </button>

                {issue.patchCode && (
                  <button
                    onClick={() => onOpenPatchModal(issue.file, issue.patchCode)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  >
                    <GitPullRequest size={15} />
                    Create Pull Request
                  </button>
                )}
                
                {!issue.patchCode && (
                  <button
                    onClick={() => autoFixMutation.mutate()}
                    disabled={autoFixMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-brand-600 to-purple-600 text-white rounded-xl text-sm font-semibold transition-all ml-auto hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 border border-white/10"
                  >
                    {autoFixMutation.isPending
                      ? <><Loader2 size={15} className="animate-spin" /> Compiling Matrix…</>
                      : <><Sparkles size={15} /> Generate Code Patch</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReviewDetailPage() {
  const { id } = useParams();
  const { socket } = useSocket();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('issues');
  const [patchModalOpen, setPatchModalOpen] = useState(false);
  const [currentPatch, setCurrentPatch] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleOpenPatchModal = (filePath, content) => {
    setCurrentPatch({ filePath, patch: content });
    setPatchModalOpen(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['review', id],
    queryFn: () => api.get(`/reviews/${id}`),
    // TanStack Query v5: refetchInterval callback receives { state } not data directly
    refetchInterval: ({ state }) => {
      const status = state?.data?.review?.status;
      return ['pending', 'processing'].includes(status) ? 4000 : false;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!socket) return;
    socket.emit('join-review', id);
    const handler = (d) => {
      if (d.reviewId === id) qc.invalidateQueries({ queryKey: ['review', id] });
    };
    socket.on('review:completed', handler);
    socket.on('review:failed', handler);
    return () => { socket.off('review:completed', handler); socket.off('review:failed', handler); };
  }, [socket, id, qc]);

  const refetch = () => qc.invalidateQueries({ queryKey: ['review', id] });

  const review = data?.review;

  if (isLoading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-surface-800 border-t-brand-500 animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"/>
      <h2 className="text-xl font-display font-medium text-slate-300 tracking-tight">Decoupling Telemetry...</h2>
    </div>
  );

  if (!review) return (
    <div className="p-12 text-center text-slate-500 mt-20">
      <h2 className="text-2xl font-display font-bold text-slate-300 mb-2">Review context lost.</h2>
      <p>The specified analysis payload could not be located in the database.</p>
    </div>
  );

  const isPending = ['pending', 'processing'].includes(review.status);

  const allIssues = review.issues || [];
  const filteredIssues = filter === 'all'
    ? allIssues.filter(i => !i.dismissed)
    : allIssues.filter(i => !i.dismissed && i.category === filter);

  const cats = [...new Set(allIssues.map(i => i.category))].filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-5xl mx-auto"
    >
      {/* Immersive Header */}
      <div className="mb-10 relative">
        <Link to="/reviews" className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 mb-6 inline-flex items-center gap-2 group transition-colors">
          <span className="bg-surface-800 p-1.5 rounded-md group-hover:bg-surface-700 transition-colors">←</span> Return Context
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold text-slate-100 tracking-tight mb-4">
              {review.prTitle || 'Manual Differential Analysis'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              {review.status === 'completed' && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <CheckCircle size={14} /> Completed successfully
                </span>
              )}
              {review.repository && (
                <span className="flex items-center gap-2 text-slate-400 bg-surface-800 px-3 py-1 rounded-full border border-white/5">
                  <GitBranch size={14} /> {review.repository.fullName}
                </span>
              )}
              {review.prNumber && (
                 <a href={review.prUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20 hover:bg-brand-500/20 hover:border-brand-500/40 transition-colors">
                   <GitPullRequest size={14} /> PR #{review.prNumber} 
                 </a>
              )}
              <span className="flex items-center gap-1.5 text-slate-500 px-3 py-1 bg-surface-800 rounded-full border border-white/5">
                <Clock size={14} /> {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:pt-2 flex-shrink-0">
            <button onClick={refetch} className="w-10 h-10 rounded-xl bg-surface-800 border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10 flex items-center justify-center text-slate-400 hover:text-brand-400 transition-colors shadow-sm">
              <RefreshCw size={16} />
            </button>
            {review.prUrl && (
              <a href={review.prUrl} target="_blank" rel="noreferrer" className="btn-primary rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20">
                <ExternalLink size={16} /> <span className="hidden sm:inline">Access Origin PR</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Processing state */}
      {isPending && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 text-center mb-8 relative overflow-hidden my-16 max-w-2xl mx-auto"
        >
          <div className="absolute inset-0 bg-brand-600/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-surface-800 to-surface-900 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-inner shadow-black/50">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-2xl font-display font-bold text-slate-100 mb-2">
              {review.status === 'pending' ? 'Scan Queued…' : 'AI Analyzing Repository…'}
            </h3>
            <p className="text-slate-400 font-light mb-2 max-w-sm mx-auto">AI is analyzing your repository files. For large repos this can take 1–3 minutes.</p>
            <p className="text-slate-500 text-xs font-light mb-8 max-w-sm mx-auto">This page auto-refreshes every 4 seconds. If it seems stuck, click the button below.</p>
            
            <div className="flex flex-col items-center gap-4">
              <div className="flex justify-center gap-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-slow shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                       style={{ animationDelay: `${i * 300}ms` }} />
                ))}
              </div>
              <button
                onClick={refetch}
                className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1.5 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20 bg-surface-900/50"
              >
                <RefreshCw size={12} /> Check status now
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <PatchPreviewModal
        open={patchModalOpen}
        onClose={() => setPatchModalOpen(false)}
        initial={currentPatch}
        defaultRepoFullName={review.repository?.fullName || ''}
        defaultBaseBranch={review.baseBranch || review.repository?.defaultBranch || 'main'}
        onCreatePR={async ({ filePath, content, targetRepoFullName, targetBaseBranch }) => {
          try {
            const branch = window.prompt('Branch name to create (e.g. code-rev/fix-1)', `code-rev/fix-${Date.now()}`);
            if (!branch) return toast.error('Branch required');
            const prTitle = window.prompt('PR title', `Automated fix`) || `Automated fix`;
            toast.loading('Creating pull request...', { id: 'create-pr' });
            const resp = await api.post(`/reviews/${review._id}/create-pr`, {
              filePath,
              content,
              branchName: branch,
              prTitle,
              targetRepoFullName,
              targetBaseBranch,
            });
            toast.dismiss('create-pr');
            toast.success('Pull request created');
            setPatchModalOpen(false);
            if (resp.pr && resp.pr.html_url) window.open(resp.pr.html_url, '_blank');
          } catch (err) {
            toast.dismiss('create-pr');
            const details = err?.response?.data?.details || err?.response?.data?.error;
            toast.error(details || err.message || 'Failed to create PR');
          }
        }}
      />

      {review.status === 'failed' && (
        <div className="glass-card p-8 mb-8 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 flex-shrink-0 mt-1">
              <XCircle size={24} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-rose-100 mb-2">Kernel Panic: Execution Terminated</h3>
              <p className="text-rose-200/70 font-mono text-sm p-4 bg-rose-950/30 rounded-lg border border-rose-500/20">{review.errorMessage || 'Unknown stack trace exception'}</p>
            </div>
          </div>
        </div>
      )}

      {review && review.rawAIError && (
        <div className="glass-card p-6 mb-8 border-amber-500/30 bg-amber-500/5 relative overflow-hidden my-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 flex-shrink-0 mt-1">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-amber-200 mb-1">AI Response Parsing Warning</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light font-sans">
                The AI completed the analysis, but its response was not in the expected structured JSON format. 
                You can still read the raw generated review details using the **Show Debug Response** button at the bottom of the page.
              </p>
            </div>
          </div>
        </div>
      )}

      {review.status === 'completed' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          
          {/* Executive Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(() => {
              const totalIssuesVal = (typeof review.totalIssues === 'number') ? review.totalIssues : (Array.isArray(review.issues) ? review.issues.length : null);
              const riskScoreNum = (typeof review.riskScore === 'number') ? review.riskScore : null;
              const errorCountVal = (typeof review.errorCount === 'number') ? review.errorCount : (Array.isArray(review.issues) ? review.issues.filter(i => i.severity === 'error').length : null);
              const resolutionRate = (totalIssuesVal && totalIssuesVal > 0) ? `${Math.round(((review.acceptedCount || 0) / Math.max(totalIssuesVal, 1)) * 100)}%` : '—';

              const stats = [
                { label: 'Total Diagnostics', val: totalIssuesVal, icon: AlertTriangle, color: 'text-brand-400', bg: 'bg-brand-500/10' },
                { label: 'Calculated Risk', val: (riskScoreNum !== null ? riskScoreNum : '—'), icon: Zap, color: (riskScoreNum === null ? 'text-slate-500' : (riskScoreNum >= 70 ? 'text-rose-400' : riskScoreNum >= 40 ? 'text-amber-400' : 'text-emerald-400')), bg: (riskScoreNum === null ? 'bg-surface-800' : (riskScoreNum >= 70 ? 'bg-rose-500/10' : riskScoreNum >= 40 ? 'bg-amber-500/10' : 'bg-emerald-500/10')) },
                { label: 'Critical Overrides', val: (errorCountVal !== null ? errorCountVal : '—'), icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { label: 'Resolution Rate', val: resolutionRate, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
              ];

              return stats.map((stat, i) => (
                <div key={i} className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-10 scale-150 transition-transform duration-500 group-hover:scale-110">
                    <stat.icon size={64} className={stat.color} />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
                    <div className={`text-3xl font-display font-bold ${stat.color}`}>{stat.val ?? '—'}</div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Neural Summary block */}
          {review.summary && (
            <div className="glass-card p-6 md:p-8 mb-8 border-brand-500/20 shadow-[0_0_30px_rgba(99,102,241,0.05)] bg-gradient-to-br from-surface-900 via-surface-900 to-brand-900/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                  <Brain size={16} className="text-brand-400" />
                </div>
                <h2 className="text-lg font-display font-bold text-slate-200">Neural Summary</h2>
              </div>
              <p className="text-base text-slate-300 leading-relaxed font-light">{formatNeuralSummary(review.summary) || review.summary}</p>
            </div>
          )}

          {/* Suggested Changes */}
          {review.suggestedChanges?.length > 0 && (
            <div className="glass-card p-6 mb-8">
              <h3 className="text-lg font-display font-bold text-slate-200 mb-4">AI Suggested Changes</h3>
              <div className="space-y-4">
                {review.suggestedChanges.map((s, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-surface-900">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-100">{s.title || `Suggestion ${idx+1}`}</div>
                        <div className="text-sm text-slate-400 mt-1">{s.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Generating patch...',{id:`gen-${idx}`});
                              const res = await api.post(`/reviews/${review._id}/suggest-change`, { suggestionIndex: idx });
                              toast.dismiss(`gen-${idx}`);
                              toast.success('Patch generated');
                              const patch = res.suggestion;
                              setCurrentPatch(patch);
                              setPatchModalOpen(true);
                            } catch (err) {
                              toast.dismiss(`gen-${idx}`);
                              const details = err?.response?.data?.details || err?.response?.data?.error;
                              toast.error(details || err.message || 'Failed to generate patch');
                            }
                          }}
                          className="px-3 py-1.5 bg-brand-500 text-white rounded-md text-sm"
                        >
                          Preview Patch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw AI response (debug) */}
          {(review.rawAIResponse || review.rawAIError) && (
            <div className="mt-8 mb-8">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1.5 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20 bg-surface-900/50"
              >
                {showDebug ? 'Hide Debug Response' : 'Show Debug Response'}
              </button>

              {showDebug && (
                <div className="glass-card p-6 mt-4 border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                      <Code2 size={16} className="text-slate-300" />
                    </div>
                    <h3 className="text-md font-display font-semibold text-slate-200">AI Raw Response (debug)</h3>
                  </div>
                  {review.rawAIError && (
                    <p className="text-sm font-mono text-rose-300 mb-3">Parse error: {review.rawAIError}</p>
                  )}
                  <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0b0c0e]">
                    <SyntaxHighlighter
                      language="text"
                      style={atomOneDark}
                      customStyle={{ background: 'transparent', padding: '16px', fontSize: '12px', margin: 0, lineHeight: 1.4, fontFamily: 'Fira Code, monospace' }}
                    >
                      {review.rawAIResponse || 'No raw response available'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zero-Day Secrets Alert */}
          {review.secretsDetected?.length > 0 && (
            <div className="glass-card p-6 mb-8 border-rose-500/40 bg-rose-950/20 shadow-[0_0_40px_rgba(244,63,94,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse">
                   <Lock size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-rose-400">Security Breach: Secrets Detected</h3>
                  <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider mt-1">{review.secretsDetected.length} occurrences demand immediate attention</p>
                </div>
              </div>
              
              <div className="space-y-3 relative z-10 bg-black/40 p-4 rounded-xl border border-rose-500/20">
                {review.secretsDetected.map((s, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-300">
                    <span className="w-full sm:w-auto px-3 py-1 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs tracking-wider whitespace-nowrap">
                       TYPE: {s.type}
                    </span>
                    <span className="font-mono bg-surface-950 px-3 py-1 rounded border border-white/10 shrink-0">
                       {s.file}:{s.line}
                    </span>
                    <span className="font-mono text-slate-500 truncate w-full">
                       {s.masked}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Matrix Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-surface-900 border border-white/[0.06] rounded-2xl mb-8 shadow-inner inline-flex">
            {[
              { id: 'issues', label: 'Matrix Findings', count: review.totalIssues, icon: Layers },
              { id: 'tests', label: 'Unit Coverage', count: review.suggestedTests?.length || 0, icon: TestTube },
              { id: 'compliance', label: 'Audit Trail', count: review.complianceFlags?.length || 0, icon: Shield },
            ].map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group',
                  activeTab === id ? 'text-white bg-surface-800 shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/5' : 'text-slate-500 hover:text-slate-200'
                )}
              >
                {activeTab === id && (
                  <motion.div layoutId="tab-bg" className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 opacity-50" />
                )}
                <Icon size={14} className="relative z-10" />
                <span className="relative z-10">{label}</span>
                <span className={clsx(
                  "relative z-10 ml-1.5 px-2 py-0.5 rounded-md text-[10px] bg-black/30 border border-white/5",
                  activeTab === id ? "text-brand-300" : "text-slate-600"
                )}>{count}</span>
              </button>
            ))}
          </div>

          {/* Content Views */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {activeTab === 'issues' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key="issues-tab"
                >
                  {/* Category Filter Pills */}
                  {cats.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6 bg-surface-900/50 p-3 rounded-xl border border-white/5">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mr-2 flex items-center gap-1.5"><Filter size={12}/> Filter:</div>
                      <button
                        onClick={() => setFilter('all')}
                        className={clsx('px-4 py-1.5 rounded-lg text-xs font-bold transition-all border', filter === 'all'
                          ? 'bg-slate-800 text-white border-white/20 shadow-md'
                          : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200')}
                      >
                        ALL VECTORS
                      </button>
                      {cats.map(cat => {
                        const m = CATEGORY_META[cat];
                        return (
                          <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={clsx('px-4 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm', filter === cat
                              ? `${m?.bg} ${m?.color} ${m?.border}`
                              : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200')}
                          >
                            <m.icon size={12} /> {m?.label || cat}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredIssues.length === 0 ? (
                    <div className="glass-card py-24 text-center border-dashed border-white/10">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                         <CheckCircle size={32} className="text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-slate-200 mb-1">Sector Clear</h3>
                      <p className="text-slate-400 text-sm font-light">No anomalous diagnostics remain in this domain.</p>
                    </div>
                  ) : (
                    <motion.div layout className="space-y-4">
                      {filteredIssues.map(issue => (
                        <IssueCard key={issue._id} issue={issue} reviewId={id} onUpdate={refetch} onOpenPatchModal={handleOpenPatchModal} />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === 'tests' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key="tests-tab"
                  className="space-y-6"
                >
                  {!review.suggestedTests?.length ? (
                    <div className="glass-card py-24 text-center border-dashed border-white/10">
                      <TestTube size={32} className="text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No unit coverage vectors synthesized for this payload.</p>
                    </div>
                  ) : review.suggestedTests.map((t, i) => (
                    <div key={i} className="glass-card border-pink-500/20 shadow-[0_4px_20px_rgba(236,72,153,0.05)] overflow-hidden">
                      <div className="flex items-center justify-between p-5 bg-surface-900 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                             <TestTube size={14} className="text-pink-400" />
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-200 bg-surface-800 px-3 py-1 rounded-md border border-white/5">{t.functionName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded bg-black/30 border border-white/5 text-xs font-bold uppercase tracking-widest text-slate-400">{t.framework}</span>
                          <CopyButton text={t.testCode} />
                        </div>
                      </div>
                      <div className="bg-[#282c34]">
                        <SyntaxHighlighter
                          language="javascript"
                          style={atomOneDark}
                          customStyle={{ background: 'transparent', padding: '24px', fontSize: '13px', margin: 0, fontFamily: '"Fira Code", monospace' }}
                        >
                          {t.testCode}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'compliance' && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key="compliance-tab"
                  className="space-y-4"
                >
                  {!review.complianceFlags?.length ? (
                    <div className="glass-card py-24 text-center border-emerald-500/20 bg-emerald-950/10">
                      <Shield size={32} className="text-emerald-500 mx-auto mb-4" />
                      <h3 className="text-xl font-display font-bold text-slate-200 mb-2">Audit Passed</h3>
                      <p className="text-slate-400 font-light">Codebase meets all configured compliance directives (PCI, HIPAA, SOC2).</p>
                    </div>
                  ) : review.complianceFlags.map((f, i) => (
                    <div key={i} className="glass-card p-6 flex flex-col sm:flex-row items-start gap-5 border-orange-500/20 bg-orange-950/10">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 shrink-0">
                         <Shield size={20} className="text-orange-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                            {f.standard}
                          </span>
                          <span className="text-base font-semibold text-slate-200">{f.rule}</span>
                        </div>
                        <p className="text-sm text-slate-400 font-mono bg-black/30 px-3 py-1.5 rounded-lg border border-white/5 inline-block mt-2">
                           {f.file}:{f.line}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
