import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Shield, Brain, GitPullRequest, BarChart2, Trophy, ArrowRight, Github, Check, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const FEATURES = [
  { icon: Brain, title: 'Codebase Memory', desc: 'AI learns your patterns, conventions, and architecture over time — reviews get smarter with every PR.' },
  { icon: Shield, title: 'Security Scanner', desc: 'OWASP Top 10, CVE mapping, secret detection, and compliance checks (HIPAA, PCI, SOC2) built in.' },
  { icon: Sparkles, title: 'One-Click Auto-Fix', desc: 'AI generates ready-to-merge patches for every issue found. Apply fixes directly from the review.' },
  { icon: BarChart2, title: 'Risk Scoring', desc: 'Every PR scored by blast radius, complexity delta, and file churn — prioritise what matters.' },
  { icon: GitPullRequest, title: 'PR Risk Heatmap', desc: 'Visual map of your riskiest files based on historical review data and issue frequency.' },
  { icon: Trophy, title: 'Team Gamification', desc: 'Badges, streaks, leaderboards and quality scores keep teams engaged and improving.' },
];

const STATS = [
  { value: '94%', label: 'Issue detection rate' },
  { value: '3.2×', label: 'Faster code reviews' },
  { value: '67%', label: 'Reduction in security bugs' },
  { value: '< 30s', label: 'Average review time' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function LandingPage() {
  const { user, loginWithGitHub } = useAuth();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  return (
    <div className="min-h-screen gradient-bg text-slate-100 overflow-x-hidden selection:bg-brand-500/30">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brand-600/20 blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute top-[40%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Nav */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.04] bg-surface-950/60 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-all duration-300">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">CodeRev AI</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
          {user ? (
            <Link to="/dashboard" className="btn-primary flex items-center gap-2">
              Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <button onClick={loginWithGitHub} className="btn-primary flex items-center gap-2">
              <Github size={15} /> <span className="hidden sm:inline">Sign in with GitHub</span>
              <span className="sm:hidden">Sign in</span>
            </button>
          )}
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6 text-center z-10 flex flex-col items-center justify-center min-h-[90vh]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative max-w-5xl mx-auto w-full"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Sparkles size={13} className="animate-pulse" /> Code Reviews that Actually Learn
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.1] tracking-tight mb-8"
          >
            Review Code Like<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-400 to-brand-300 animate-glow">
              A 10x Engineer.
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12 font-light">
            AI that understands your architecture, enforces your team's standards, and ships auto-fixes directly to your pull requests.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={loginWithGitHub}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-surface-950 rounded-2xl font-bold text-base hover:bg-slate-100 transition-all duration-300 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] group"
            >
              <Github size={20} className="group-hover:rotate-12 transition-transform duration-300" />
              Continue with GitHub
            </button>
            <a href="#features" className="w-full sm:w-auto btn-ghost px-8 py-4 text-base rounded-2xl flex justify-center items-center gap-2 group">
              Explore Platform <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
          
          {/* Mockup UI representation */}
          <motion.div 
            variants={itemVariants}
            className="mt-24 relative mx-auto w-full max-w-4xl"
            style={{ y }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent z-10 bottom-[-20px]" />
            <div className="glass-card p-2 rounded-t-3xl border-b-0 shadow-2xl overflow-hidden aspect-video bg-surface-900/80">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
                <div className="flex gap-1.5 border-r border-white/10 pr-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="text-xs font-mono text-slate-500 flex-1 text-center">github.com/your-org/core-api/pull/42</div>
              </div>
              <div className="p-6 flex flex-col gap-4 h-full relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" style={{backgroundSize: '100px'}}>
                <div className="w-3/4 h-8 bg-white/5 rounded-lg animate-pulse" />
                <div className="w-1/2 h-4 bg-white/5 rounded-md animate-pulse" />
                <div className="w-full h-32 bg-white/5 rounded-xl border border-white/10 mt-4 relative overflow-hidden flex flex-col justify-center px-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="text-amber-400" size={16} /> <span className="text-sm font-medium text-amber-400">Security Vulnerability Detected</span>
                  </div>
                  <div className="w-[90%] h-3 bg-white/10 rounded" />
                  <div className="w-[60%] h-3 bg-white/10 rounded mt-2" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <button className="px-4 py-2 bg-brand-500/20 text-brand-300 text-xs font-bold rounded-lg border border-brand-500/30">Auto-Fix</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/[0.04] bg-surface-950/40 relative z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 text-center">
          {STATS.map((s, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1 }}
              key={s.label}
              className="flex flex-col items-center justify-center p-6 glass rounded-2xl hover:border-brand-500/30 transition-colors"
            >
              <div className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-2">{s.value}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Built for elite engineering teams</h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light">From zero-day vulnerability detection to enforcing stylistic purity, CodeRev handles the noise so you can focus on architecture.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                key={title} 
                className="glass-card p-8 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 group cursor-default"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-brand-500/50 group-hover:scale-110 transition-all duration-300 shadow-inner">
                  <Icon size={22} className="text-brand-400 group-hover:text-brand-300 transition-colors" />
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-3 tracking-tight">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center relative z-10">
        <div className="absolute inset-0 bg-brand-600/5 blur-[100px] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto glass-card p-12 md:p-20 relative overflow-hidden"
        >
          {/* Decorative gradients inside CTA card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight">Stop reviewing syntax.<br />Start shipping logic.</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-light">Connect your GitHub workspace in seconds. Automatically review every pull request with supreme accuracy.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button onClick={loginWithGitHub} className="w-full sm:w-auto btn-primary px-10 py-5 text-lg rounded-2xl flex items-center justify-center gap-3 group">
                <Github size={22} /> Get Started Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 font-medium">
              {['Free forever for open source', 'No credit card required', 'Takes 60 seconds'].map(f => (
                <span key={f} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                    <Check size={12} className="text-brand-400" />
                  </div>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10 text-center text-slate-500 text-sm relative z-10 bg-surface-950/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 font-medium">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-brand-500" />
            <span className="text-slate-300 font-semibold tracking-tight">CodeRev AI</span>
          </div>
          <span className="hidden md:inline text-slate-700">•</span>
          <span>OpenRouter Integration</span>
          <span className="hidden md:inline text-slate-700">•</span>
          <span>GitHub Actions Native</span>
          <span className="hidden md:inline text-slate-700">•</span>
          <span>Real-time Socket.io</span>
        </div>
        <p className="mt-8 text-xs font-light text-slate-600">Built for elite teams. Not a toy.</p>
      </footer>
    </div>
  );
}
