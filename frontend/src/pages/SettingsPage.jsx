import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { 
  Settings2, Bot, BellOff, ShieldAlert, Cpu, 
  Save, User, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('agent');

  const [aiPrompt, setAiPrompt] = useState(user?.settings?.customPrompt || '');
  const [mutedCategories, setMutedCategories] = useState(user?.settings?.mutedCategories || []);
  const [strictMode, setStrictMode] = useState(user?.settings?.strictMode || false);

  const saveMutation = useMutation({
    mutationFn: (settings) => api.patch('/auth/settings', settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-user'] }); // force context refresh
      toast.custom((t) => (
        <div className={clsx("glass-card px-4 py-3 flex items-center gap-3 border-emerald-500/30 bg-emerald-950/40", t.visible ? "animate-enter" : "animate-leave")}>
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-100">Telemetry configuration updated</span>
        </div>
      ));
    },
    onError: () => toast.error('Configuration save failed'),
  });

  const handleSave = () => {
    saveMutation.mutate({ customPrompt: aiPrompt, mutedCategories, strictMode });
  };

  const toggleCategory = (cat) => {
    setMutedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight flex items-center gap-3">
            <Settings2 size={28} className="text-slate-400" />
            Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light max-w-lg">
            Configure agent personality, notification filters, and strict mode compliance.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2 group shadow-lg shadow-brand-500/20 px-6 py-3"
        >
          <Save size={16} className="text-white/80 group-hover:text-white transition-colors" /> 
          {saveMutation.isPending ? 'Syncing...' : 'Commit Changes'}
        </button>
      </motion.div>

      <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Settings Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-3 flex flex-col gap-1 sticky top-8"
        >
          {[
            { id: 'profile', icon: User, label: 'Identity' },
            { id: 'agent', icon: Bot, label: 'Agent Persona' },
            { id: 'filters', icon: BellOff, label: 'Telemetry Filters' },
            { id: 'security', icon: ShieldAlert, label: 'Compliance' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
                activeTab === id 
                  ? "bg-surface-800 text-brand-400 shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/5" 
                  : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className={clsx("transition-colors", activeTab === id ? "text-brand-400" : "text-slate-500 group-hover:text-slate-400")} />
                {label}
              </div>
              {activeTab === id && <ChevronRight size={14} className="text-slate-600" />}
            </button>
          ))}
        </motion.div>

        {/* Content Panels */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="min-h-[500px]"
        >
          <AnimatePresence mode="popLayout">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass-card p-8"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                  <div className="relative">
                    <img src={user?.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-2xl ring-4 ring-surface-800 shadow-xl object-cover" />
                    <div className="absolute -bottom-2 -right-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded border-2 border-surface-950 uppercase tracking-widest shadow-md">
                      Pro
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-display font-bold text-slate-100">{user?.displayName || user?.username}</h2>
                    <p className="text-sm font-mono text-slate-400 mt-1">@{user?.username}</p>
                    <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                       <span className="px-3 py-1 bg-surface-800 rounded-lg text-xs font-semibold text-slate-300 border border-white/5">GitHub OAuth Linked</span>
                       <span className="px-3 py-1 bg-surface-800 rounded-lg text-xs font-semibold text-slate-300 border border-white/5">Member since {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'agent' && (
              <motion.div 
                key="agent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Cpu size={18} className="text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-slate-200">System Prompt Injection</h2>
                    <p className="text-xs text-slate-500 font-medium">Override the core reviewer model instructions.</p>
                  </div>
                </div>
                
                <div className="relative group rounded-xl overflow-hidden border border-white/10 focus-within:!border-brand-500/50 focus-within:ring-2 focus-within:ring-brand-500/50 transition-all shadow-inner">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'Only suggest functionally pure React components. Prefer absolute imports. Do not check for console.log.'"
                    className="w-full h-48 p-4 bg-surface-900/80 text-sm font-mono text-slate-300 placeholder:text-slate-700/50 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
                <p className="text-xs font-light text-slate-500 mt-3 inline-flex items-center gap-1.5">
                   <Bot size={12}/> The neural engine incorporates these directives verbatim on every request.
                </p>
              </motion.div>
            )}

            {activeTab === 'filters' && (
              <motion.div 
                key="filters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <BellOff size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-slate-200">Diagnostic Blacklist</h2>
                    <p className="text-xs text-slate-500 font-medium">Mute specific categories to focus on critical paths.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {['style', 'performance', 'complexity', 'test'].map(cat => (
                    <label key={cat} className={clsx(
                      "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group",
                      mutedCategories.includes(cat) 
                        ? "bg-rose-500/5 border-rose-500/30" 
                        : "bg-surface-800 border-white/5 hover:border-white/20"
                    )}>
                      {mutedCategories.includes(cat) && <div className="absolute inset-0 bg-rose-500/5" />}
                      <div className={clsx("w-5 h-5 rounded overflow-hidden border flex items-center justify-center shrink-0 transition-colors relative z-10", mutedCategories.includes(cat) ? "bg-rose-500 border-rose-600" : "bg-surface-950 border-white/20 group-hover:border-white/40")}>
                        {mutedCategories.includes(cat) && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className={clsx("text-sm font-semibold capitalize relative z-10", mutedCategories.includes(cat) ? "text-rose-300" : "text-slate-300")}>
                        Mute {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass-card p-8 border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.05)] overflow-hidden relative"
              >
                 <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
                 
                 <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-inner">
                    <ShieldAlert size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-slate-200">Regulatory Compliance Checks</h2>
                    <p className="text-xs text-orange-400/80 font-medium">Enforce strict data governance protocols globally.</p>
                  </div>
                </div>

                <label className="flex items-start gap-4 p-5 rounded-2xl bg-surface-900 border border-white/5 hover:border-white/10 transition-colors cursor-pointer relative z-10 group">
                  <div className="mt-1 relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={strictMode}
                      onChange={(e) => setStrictMode(e.target.checked)}
                    />
                    <div className={clsx("w-12 h-6 rounded-full transition-colors flex items-center px-1", strictMode ? "bg-emerald-500" : "bg-surface-700")}>
                       <div className={clsx("w-4 h-4 bg-white rounded-full shadow-md transition-transform transform", strictMode ? "translate-x-6" : "translate-x-0")} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm mb-1 group-hover:text-white transition-colors">Enforce SOC2 / PCI Strict Mode</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">
                      When active, the neural engine automatically flags all hardcoded secrets, PII exposures, and weak cryptographic primitives. Reviews containing these will auto-fail with a Kernel Panic.
                    </p>
                  </div>
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
