'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Terminal, Shield, BookOpen, Layers } from 'lucide-react';

interface LandingFooterProps {
  onOpenAbout?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenAbout }) => {
  return (
    <footer className="bg-[#03050a] border-t border-cyan-950 px-4 sm:px-8 py-12 font-mono text-xs text-gray-400 relative z-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Overview */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Compass className="w-5 h-5 text-cyan-400" />
              <span>LunaRov — LUNAR ROVER PATH SIMULATOR</span>
            </div>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              An aerospace-grade educational platform for modeling autonomous surface mobility, evaluating heuristic pathfinding algorithms, and analyzing energy consumption across hazardous lunar topography.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SIMULATION ENGINE STATUS: NOMINAL (50 HZ)</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              NAVIGATION
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/simulator" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-cyan-500" />
                  <span>Mission Simulator</span>
                </Link>
              </li>
              <li>
                <Link href="/simulator?mode=setup" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-cyan-500" />
                  <span>Mission Setup</span>
                </Link>
              </li>
              <li>
                <Link href="/simulator?view=missions" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-cyan-500" />
                  <span>Saved Missions</span>
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onOpenAbout) onOpenAbout();
                    else {
                      const el = document.getElementById('features');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-left"
                >
                  <BookOpen className="w-3 h-3 text-cyan-500" />
                  <span>System Architecture Docs</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Scientific Constants */}
          <div className="space-y-2.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider">
              PHYSICAL ENVIRONMENT
            </div>
            <div className="space-y-1 text-[10.5px] text-gray-500">
              <div>LUNAR GRAVITY: <strong className="text-gray-300">1.62 m/s²</strong></div>
              <div>REGOLITH FRICTION: <strong className="text-gray-300">0.06 Crr</strong></div>
              <div>MAX TRAVERSABLE SLOPE: <strong className="text-gray-300">25.0°</strong></div>
              <div>CRITICAL BATTERY ALARM: <strong className="text-amber-400">15.0%</strong></div>
              <div>SAMPLING FREQUENCY: <strong className="text-cyan-400">50 Hz</strong></div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-cyan-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-500">
          <div>
            © {new Date().getFullYear()} LunaRov. Educational & Aerospace Research Platform.
          </div>
          <div className="flex items-center space-x-4">
            <span>Next.js 16</span>
            <span>•</span>
            <span>Three.js WebGL</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
