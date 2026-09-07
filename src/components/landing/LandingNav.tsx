'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Play, Layers, FolderOpen, HelpCircle, Sliders } from 'lucide-react';

interface LandingNavProps {
  onOpenAbout?: () => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({ onOpenAbout }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060911]/85 backdrop-blur-md border-b border-cyan-950/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded-lg group-hover:border-cyan-400 transition-colors shadow-lg shadow-cyan-950/50">
            <Compass className="w-5 h-5 text-cyan-400 group-hover:animate-spin-slow transition-transform" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm sm:text-base font-black tracking-wider text-white font-mono">
                LunaRov
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">
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

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          <Link
            href="/setup"
            className="flex items-center gap-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition-all shadow-lg shadow-amber-950/50 hover:shadow-amber-500/30 border border-amber-400/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START MISSION</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};
