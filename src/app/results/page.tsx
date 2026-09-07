'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { MissionResultsView } from '@/components/results/MissionResultsView';
import { CelestialSpaceBackground } from '@/components/background/CelestialSpaceBackground';
import { Compass, Home, Play } from 'lucide-react';

function ResultsPageContent() {
  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-slate-100 selection:bg-cyan-500 selection:text-black font-mono relative">
      {/* 3D Celestial Background with Interactive Moon, Comets, and Asteroids */}
      <div className="fixed inset-0 pointer-events-auto opacity-35 z-0">
        <CelestialSpaceBackground interactive={true} intensity="ambient" showControlsHint={true} />
      </div>

      {/* Top Bar for Results Page */}
      <header className="w-full bg-[#080d1a]/90 backdrop-blur-md border-b border-cyan-950/70 px-4 py-3 flex items-center justify-between shadow-2xl z-20 relative text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wider text-white">
              LunaRov — MISSION DEBRIEF REPORT
            </h1>
            <p className="text-[11px] text-gray-400">
              POST-FLIGHT TELEMETRY & TRAJECTORY ANALYSIS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-gray-300 hover:text-white transition-all text-xs"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>BASE</span>
          </Link>

          <Link
            href="/simulator"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-950 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RETURN TO SIMULATOR</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1400px] mx-auto w-full z-10 relative">
        <MissionResultsView isStandalonePage />
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#040711] text-cyan-400 font-mono flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span>GENERATING SCIENTIFIC MISSION DEBRIEF...</span>
          </div>
        </div>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
