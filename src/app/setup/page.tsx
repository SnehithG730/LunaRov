'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MissionConfigPanel } from '@/components/setup/MissionConfigPanel';
import { TerrainPreviewCenter } from '@/components/setup/TerrainPreviewCenter';
import { MissionSummaryRight } from '@/components/setup/MissionSummaryRight';
import { CelestialSpaceBackground } from '@/components/background/CelestialSpaceBackground';
import { useMissionStore } from '@/core/simulation/missionStore';
import {
  ArrowLeft,
  Play,
  Keyboard,
  Compass,
} from 'lucide-react';

export default function MissionSetupPage() {
  const router = useRouter();
  const {
    missionName,
    terrain,
    selectedAlgorithm,
    computePath,
    regenerateTerrain,
    validateMission,
  } = useMissionStore();

  const [timeUtc, setTimeUtc] = useState<string>('');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeUtc(now.toUTCString().split(' ')[4] + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        regenerateTerrain();
      } else if (e.key === 'c' || e.key === 'C') {
        computePath();
      } else if (e.key === 'Enter') {
        const val = validateMission();
        if (val.valid) {
          router.push('/simulator');
        }
      } else if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [regenerateTerrain, computePath, validateMission, router]);

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#040711] text-slate-100 overflow-y-auto lg:overflow-hidden select-none font-mono relative">
      {/* Background Celestial Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-25 z-0">
        <CelestialSpaceBackground interactive={false} intensity="ambient" />
      </div>

      {/* Top Mission Control Setup Header */}
      <header className="min-h-14 border-b border-cyan-950/80 bg-[#080d1a]/95 px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 backdrop-blur-md shadow-xl relative">
        {/* Left: Brand & Return link */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-white transition-colors px-2.5 py-1 rounded bg-[#0d1527] border border-cyan-900/60 hover:border-cyan-500/80 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BASE</span>
          </button>

          <div className="h-4 w-[1px] bg-cyan-900/60 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-extrabold tracking-wider text-white flex items-center gap-2">
                <span>LunaRov — FLIGHT PLANNER</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold">
                  MISSION CONFIG
                </span>
              </h1>
              <p className="text-[10px] text-gray-400 hidden sm:block">
                {missionName} • SECTOR: {terrain.type.replace('_', ' ')} • ALGORITHM: {selectedAlgorithm}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Clock, Shortcuts & Simulator Launch */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-gray-300 bg-black/60 px-2.5 py-1 rounded-lg border border-cyan-900/60 shadow-inner">
            <span className="text-[10px] text-gray-500 font-bold">UTC:</span>
            <span className="text-cyan-300 font-bold">{timeUtc || '00:00:00 UTC'}</span>
          </div>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-lg bg-[#0e1628] text-gray-400 hover:text-cyan-300 border border-cyan-900/60 hover:border-cyan-500/60 transition-all cursor-pointer shadow-sm"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => router.push('/simulator')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-cyan-950 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>LAUNCH SIMULATOR</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Mission Setup Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr_340px] xl:grid-cols-[380px_1fr_380px] overflow-y-auto lg:overflow-hidden gap-3 lg:gap-0 z-10 relative">
        {/* Left Column: Mission Configuration Panel */}
        <div className="h-full overflow-y-auto lg:overflow-hidden">
          <MissionConfigPanel />
        </div>

        {/* Center Column: Interactive Lunar Terrain Preview */}
        <div className="h-full min-h-[380px] lg:min-h-0 overflow-y-auto lg:overflow-hidden border-t lg:border-t-0 border-cyan-950/70">
          <TerrainPreviewCenter />
        </div>

        {/* Right Column: Mission Summary & Launch Actions */}
        <div className="h-full overflow-y-auto lg:overflow-hidden border-t lg:border-t-0 border-cyan-950/70">
          <MissionSummaryRight />
        </div>
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0f1d] border border-cyan-500/50 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>HOTKEYS & SHORTCUTS</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-500 hover:text-gray-300 text-xs font-mono"
              >
                ESC
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#0d1424] p-2 rounded-lg border border-cyan-950">
                <span className="text-gray-400">Regenerate Terrain:</span>
                <kbd className="px-2 py-0.5 bg-black/60 rounded text-cyan-300 border border-cyan-900 font-bold">G</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0d1424] p-2 rounded-lg border border-cyan-950">
                <span className="text-gray-400">Calculate Trajectory:</span>
                <kbd className="px-2 py-0.5 bg-black/60 rounded text-cyan-300 border border-cyan-900 font-bold">C</kbd>
              </div>
              <div className="flex justify-between items-center bg-[#0d1424] p-2 rounded-lg border border-cyan-950">
                <span className="text-gray-400">Launch Simulation:</span>
                <kbd className="px-2 py-0.5 bg-black/60 rounded text-emerald-400 border border-cyan-900 font-bold">Enter</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 bg-[#11192e] hover:bg-[#182645] text-cyan-300 rounded-lg font-bold border border-cyan-800/60 transition-all cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
