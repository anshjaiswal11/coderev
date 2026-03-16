import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Github, Zap, Shield, Brain, Sparkles, Code2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, loginWithGitHub } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-surface-950 flex font-sans text-slate-100 selection:bg-brand-500/30">
      
      {/* Left panel - branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col w-[500px] xl:w-[600px] flex-shrink-0 bg-surface-900 border-r border-white/[0.04] p-16 relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.03] mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-transparent to-transparent" />
        <div className="absolute top-[20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-brand-600/20 blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[100px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-24">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">CodeRev AI</span>
          </div>

          <div className="mt-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl xl:text-5xl font-display font-bold text-white leading-[1.15] mb-6 tracking-tight"
            >
              Ship zero-defect code,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">at the speed of thought.</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-lg leading-relaxed mb-16 font-light max-w-md"
            >
              The AI reviewer that learns your architecture, hunts vulnerabilities, and writes exact auto-fixes.
            </motion.p>

            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
              }}
              className="space-y-6"
            >
              {[
                { icon: Brain, title: 'Contextual Intelligence', desc: 'Masters your patterns, dependencies, and conventions.' },
                { icon: Shield, title: 'Deep Vulnerability Scans', desc: 'OWASP mapping, static analysis, and secrets detection.' },
                { icon: Sparkles, title: 'Instant Auto-Fixes', desc: 'One-click exact code patches for every issue identified.' },
              ].map(({ icon: Icon, title, desc }) => (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    show: { opacity: 1, x: 0 }
                  }}
                  key={title} 
                  className="flex items-start gap-4 p-4 rounded-2xl glass hover:bg-white/[0.04] transition-colors border-transparent hover:border-white/[0.05]"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Icon size={18} className="text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-base">{title}</h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed font-light">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right panel - login */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Subtle mobile background */}
        <div className="lg:hidden absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-brand-500/10 blur-[100px]" />

        <div className="w-full max-w-[400px] relative z-10 flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center gap-3 mb-16"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap size={24} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-white">CodeRev AI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full glass-card p-10 mt-8"
          >
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Code2 size={24} className="text-slate-300" />
              </div>
              <h1 className="text-3xl font-display font-bold text-white mb-3">Welcome Back</h1>
              <p className="text-slate-400 text-sm font-light">Sign in to your dashboard to review pending PRs.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 font-medium"
              >
                <div className="w-1 h-10 bg-red-500 rounded-full" />
                {error === 'oauth_denied' ? 'GitHub access was denied.' : 'Authentication failed. Please try again.'}
              </motion.div>
            )}

            <button
              onClick={loginWithGitHub}
              className="relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-surface-950
                         rounded-xl font-bold text-base hover:bg-slate-100 transition-all duration-300
                         active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <Github size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
              <span>Continue with GitHub</span>
              <ArrowRight size={16} className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            
            <style>{`
              @keyframes shimmer {
                100% { transform: translateX(100%); }
              }
            `}</style>

            <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed font-light">
              By authenticating, you agree to our <a href="#" className="underline hover:text-slate-300 transition-colors">Terms of Service</a>.<br />
              CodeRev only uses read/write access for PR review interactions.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
