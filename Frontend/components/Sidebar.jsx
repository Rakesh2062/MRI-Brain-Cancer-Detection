"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UploadCloud, FileText, ClipboardList, Settings, LogOut, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ className = "" }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Upload MRI', href: '/upload', icon: UploadCloud },
    { name: 'Results', href: '/results', icon: FileText },
    { name: 'History', href: '/history', icon: ClipboardList },
  ];

  return (
    <div className={`flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/10 ${className}`}>
      {/* Brand */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <BrainCircuit className="w-8 h-8 text-cyan-400 group-hover:text-purple-400 transition-colors" />
          <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
            VaidyaNetra
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Main Menu</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith('/results') && item.href === '/results');
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group overflow-hidden ${
                  isActive 
                    ? 'text-white bg-white/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 z-0 border border-white/10 rounded-xl"
                  />
                )}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.5)] z-10" />
                )}
                <Icon className={`w-5 h-5 z-10 ${isActive ? 'text-cyan-400' : 'group-hover:text-slate-300'}`} />
                <span className="font-medium z-10">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer / Account */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="flex flex-col gap-1">
          <Link href="/settings">
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${pathname === '/settings' ? 'text-white bg-white/10 border-white/10 border' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
              <Settings className="w-4 h-4" /> Settings
            </button>
          </Link>
          <button 
            onClick={() => alert("Logout simulated successfully.")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium border border-transparent"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
        
        {/* User Profile Mock */}
        <div className="mt-4 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
            DR
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200 leading-tight">Dr. Rakesh</span>
            <span className="text-[10px] text-cyan-400 font-medium tracking-wide uppercase">Oncologist</span>
          </div>
        </div>
      </div>
    </div>
  );
}
