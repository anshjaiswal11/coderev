import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  GitBranch, Search, Plus, Trash2, Github, ExternalLink, 
  Loader2, CheckCircle, ShieldAlert, GitCommit, Play, X, Lock
} from 'lucide-react';
import RepoScanModal from '../components/RepoScanModal';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function RepositoriesPage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => api.get('/repos'),
  });

  const { data: ghRepos, isLoading: ghLoading } = useQuery({
    queryKey: ['github-repos', searchQuery],
    queryFn: () => api.get(`/repos/github/search?q=${searchQuery}`),
    enabled: searchQuery.length > 2,
  });

  const connectMutation = useMutation({
    mutationFn: (repoInfo) => api.post('/repos/connect', repoInfo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repositories'] });
      setSearchQuery('');
      toast.success('Repository connection established');
    },
    onError: () => toast.error('Failed to establish connection'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/repos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repositories'] });
      toast.success('Repository connection severed');
    },
  });

  const repos = data?.repos || [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <Github size={28} className="text-white" />
            Connected Workspaces
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light">
            Manage synchronized GitHub repositories and trigger entire codebase memory scans.
          </p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Connected repos list */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="lg:col-span-2 space-y-6"
        >
          {isLoading ? (
             <div className="glass-card p-16 flex justify-center">
                 <Loader2 size={32} className="text-brand-500 animate-spin" />
             </div>
          ) : repos.length === 0 ? (
            <div className="glass-card p-16 text-center border-dashed border-white/10">
              <div className="w-16 h-16 rounded-full bg-surface-800 border border-white/5 mx-auto flex items-center justify-center mb-4">
                <GitBranch size={24} className="text-slate-500" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-200 mb-2">No Connected Contexts</h3>
              <p className="text-slate-400 text-sm font-light max-w-sm mx-auto">
                Search for a GitHub repository in the panel to synchronize it with the neural engine.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {repos.map((repo) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={repo._id} 
                    className="glass-card overflow-hidden group hover:border-brand-500/30 transition-all duration-300"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-900 border border-white/10 flex items-center justify-center shadow-inner group-hover:bg-brand-500/10 group-hover:border-brand-500/20 transition-all">
                            <Github size={18} className="text-slate-300 group-hover:text-brand-300" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-100 truncate flex items-center gap-2 text-[15px]">
                              {repo.name} 
                              {repo.isPrivate && <Lock size={12} className="text-amber-400" />}
                            </h3>
                            <div className="text-xs text-slate-500 truncate mt-0.5">{repo.owner}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(repo._id)}
                          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-rose-500/20"
                          title="Disconnect Workspace"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-6">
                         <div className="flex items-center gap-1.5"><GitCommit size={14} className="text-slate-400"/> {repo.reviewCount || 0} PRs</div>
                         <div className="flex items-center gap-1.5"><ShieldAlert size={14} className="text-slate-400"/> {repo.totalIssuesFound || 0} Fixes</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/[0.04]">
                        <button
                          onClick={() => { if (!scanModalOpen) { setSelectedRepo(repo); setScanModalOpen(true); } }}
                          disabled={scanModalOpen && selectedRepo?._id === repo._id}
                          className="px-3 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 rounded-lg text-xs font-semibold flex items-center gap-2 justify-center transition-colors border border-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play size={13} className="fill-brand-400" /> Base Scan
                        </button>
                        <a
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 justify-center transition-colors border border-white/5"
                        >
                          <ExternalLink size={13} /> Origin
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Right Column - Connect new repo */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="glass-card p-6 sticky top-8">
            <h2 className="font-display font-bold text-slate-100 text-lg mb-1">Index New Workspace</h2>
            <p className="text-slate-400 text-xs font-light mb-6">Search your GitHub account to establish a new context connection.</p>

            <div className="relative mb-6">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find e.g. 'core-api'..."
                className="w-full pl-10 pr-4 py-3 bg-surface-900 border border-white/10 hover:border-white/20 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-inner transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-surface-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X size={12}/>
                </button>
              )}
            </div>

            {searchQuery.length > 2 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {ghLoading ? (
                  <div className="py-8 text-center flex flex-col items-center">
                    <Loader2 size={24} className="text-brand-500 animate-spin mb-3" />
                     <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Querying GitHub API...</span>
                  </div>
                ) : ghRepos?.items?.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8 font-light">No matching repositories surfaced.</p>
                ) : (
                  ghRepos?.items?.map((repo) => {
                    const isConnected = repos.some(r => r.githubId === repo.id.toString());
                    return (
                      <div key={repo.id} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-900 border border-white/5 hover:border-white/10 transition-colors group">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-200 text-sm truncate">{repo.name}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">{repo.owner.login}</p>
                        </div>
                        <button
                          onClick={() => connectMutation.mutate({
                            githubId: repo.id.toString(),
                            name: repo.name,
                            fullName: repo.full_name,
                            owner: repo.owner.login,
                            isPrivate: repo.private,
                          })}
                          disabled={isConnected || connectMutation.isPending}
                          className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                            isConnected 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : "bg-brand-500 text-white hover:bg-brand-400 shadow-md shadow-brand-500/20 active:scale-95"
                          )}
                        >
                          {isConnected ? <CheckCircle size={14} /> : <Plus size={16} strokeWidth={2.5} />}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
            {!searchQuery && (
              <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs text-brand-300 leading-relaxed font-light mt-4">
                 Note: Indexing a workspace establishes it in CodeRev's memory. Neural insight quality increases exponentially with successful scan volume.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {scanModalOpen && selectedRepo && (
        <RepoScanModal
          repo={selectedRepo}
          onClose={() => setScanModalOpen(false)}
          onComplete={() => qc.invalidateQueries({ queryKey: ['repositories'] })}
        />
      )}
    </div>
  );
}
