import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  LayoutDashboard, GitBranch, FileSearch, BarChart3,
  Trophy, Award, Settings, LogOut, Wifi, WifiOff, Zap, Plus,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/repositories', icon: GitBranch, label: 'Repositories' },
  { to: '/reviews', icon: FileSearch, label: 'Reviews' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/badges', icon: Award, label: 'Badges' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden text-slate-100 font-sans selection:bg-brand-500/30">
      
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-500/5 blur-[120px] mix-blend-screen" />
         <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-500/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-white/[0.04] bg-surface-950/40 backdrop-blur-xl relative z-20">
        
        {/* Subtle glass rim lighting */}
        <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
            <Zap size={18} className="text-white fill-white/20" />
          </div>
          <span className="font-display font-bold text-[17px] tracking-tight text-slate-100">CodeRev AI</span>
        </div>

        {/* New Review CTA */}
        <div className="px-4 mb-4">
          <NavLink
            to="/reviews/new"
            className="flex items-center justify-between w-full px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-all duration-300 group shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] ring-1 ring-white/10 overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <div className="flex items-center gap-2.5 relative z-10">
              <Plus size={16} className="text-white/80 group-hover:text-white transition-colors" />
              New Review
            </div>
            <div className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center relative z-10">
              <span className="text-[10px] font-mono opacity-60 font-medium">N</span>
            </div>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx('nav-link group', isActive && 'active')}
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    size={18} 
                    className={clsx(
                      "transition-all duration-300", 
                      isActive ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"
                    )} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={clsx("font-medium tracking-wide", isActive ? "text-slate-100" : "text-slate-400")}>{label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavTab" 
                      className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r-md shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.04] p-3 mx-2 mb-2 bg-white/[0.02] rounded-2xl mt-4">
          <NavLink to="/settings" className={({ isActive }) => clsx('nav-link mb-2 group', isActive && 'active')}>
            <Settings size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            <span className="font-medium">Settings</span>
          </NavLink>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group border border-transparent hover:border-white/[0.05]">
            <div className="relative">
              <img
                src={user?.avatarUrl}
                alt={user?.username}
                className="w-8 h-8 rounded-full ring-2 ring-surface-800"
              />
              <div className={clsx(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-900 flex items-center justify-center",
                connected ? "bg-green-500" : "bg-red-500"
              )}>
                {connected ? <Wifi size={6} className="text-green-950" /> : <WifiOff size={6} className="text-red-950" />}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{user?.displayName || user?.username}</p>
              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{connected ? 'Connected to stream' : 'Disconnected'}</p>
            </div>
            
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }} 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
        <div className="min-h-full pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
