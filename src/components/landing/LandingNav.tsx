'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Play, Layers, FolderOpen, HelpCircle, Sliders, LogOut, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';

interface LandingNavProps {
  onOpenAbout?: () => void;
  onOpenLogin?: () => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({ onOpenAbout, onOpenLogin }) => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#040713]/90 backdrop-blur-md border-b border-cyan-950/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-gradient-to-br from-cyan-950/90 to-purple-950/80 border border-cyan-500/40 rounded-lg group-hover:border-cyan-300 transition-colors shadow-lg shadow-cyan-950/50">
            <Compass className="w-5 h-5 text-cyan-400 group-hover:animate-spin-slow transition-transform" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-black tracking-wider font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-fuchsia-400">
                LunaRov
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-mono">
                SYS-SIM
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
              AUTONOMOUS LUNAR EXPLORATION
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-1 font-mono text-xs">
          <Link
            href="/setup"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>SETUP</span>
          </Link>

          <Link
            href="/simulator"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>SIMULATOR</span>
          </Link>

          <Link
            href="/missions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>MISSIONS</span>
          </Link>

          <button
            onClick={() => {
              if (onOpenAbout) onOpenAbout();
              else {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-gray-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>ABOUT</span>
          </button>
        </div>

        {/* Action Button & User Profile */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 bg-cyan-950/60 border border-cyan-500/40 rounded-full py-1 px-2.5 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-mono text-cyan-200 font-semibold truncate max-w-[120px]">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-full transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono text-xs transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>SIGN IN</span>
            </button>
          )}

          <Link
            href="/setup"
            className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono font-bold text-xs transition-all shadow-lg shadow-cyan-950/50 hover:shadow-cyan-500/30 border border-cyan-300"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START MISSION</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};
