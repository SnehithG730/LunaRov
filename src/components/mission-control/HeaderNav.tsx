'use client';

import React from 'react';
import Link from 'next/link';
import { useMissionStore } from '@/core/simulation/missionStore';
import {
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  FolderOpen,
  Radio,
  Home,
} from 'lucide-react';

interface HeaderNavProps {
  onOpenHelp: () => void;
  onOpenSavedMissions: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onOpenHelp,
  onOpenSavedMissions,
}) => {
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const terrain = useMissionStore((s) => s.terrain);

  // Format Elapsed Time: T+HH:MM:SS
  const totalSeconds = Math.floor(roverState.elapsedTimeSeconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const getStatusBadge = () => {
    switch (simulationStatus) {
      case 'CALCULATING':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 animate-pulse">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            <span className="font-semibold tracking-wider">CALCULATING PATH</span>
          </div>
        );
      case 'READY':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-900/30 border border-cyan-400/60 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            <span className="font-semibold tracking-wider">TRAJECTORY READY</span>
          </div>
        );
      case 'RUNNING':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">ACTIVE TRAVERSAL</span>
          </div>
        );
      case 'REROUTING':
      case 'HAZARD_REROUTING':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">AUTO-REROUTING</span>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/15 border border-yellow-500/40 text-yellow-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">STANDBY / PAUSED</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">OBJECTIVE ACHIEVED</span>
          </div>
        );
      case 'ABORTED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/50 border border-purple-600/50 text-purple-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">MISSION ABORTED</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/20 border border-red-400/50 text-red-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-semibold tracking-wider">MISSION FAILED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-800/60 border border-gray-700 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="font-semibold tracking-wider">SYSTEM IDLE</span>
          </div>
        );
    }
  };

  return (
    <header className="w-full bg-[#080d18] border-b border-cyan-950/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
      {/* Title & Mission Callsign */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-cyan-950/70 border border-cyan-500/40 rounded-lg shadow-cyan-900/30 shadow-md">
          <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-white font-mono">
              LunaRov — MISSION CONTROL
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">
              v2.4-AEROSPACE
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
            <span>CALLSIGN: <strong className="text-cyan-300">{roverConfig.name}</strong></span>
            <span>•</span>
            <span>SECTOR: <strong className="text-gray-300">{terrain.type}</strong></span>
          </p>
        </div>
      </div>

      {/* Center: Mission Clock & Status */}
      <div className="flex items-center gap-3 font-mono text-xs">
        {/* Mission Elapsed Time */}
        <div className="bg-black/60 border border-cyan-900/50 rounded px-3 py-1 text-center">
          <div className="text-[9px] text-gray-500 uppercase tracking-widest">MISSION CLOCK</div>
          <div className="text-cyan-400 font-bold tracking-widest">{timeStr}</div>
        </div>

        {/* Status Pill */}
        {getStatusBadge()}
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-gray-300 hover:text-white transition-colors"
          title="Return to Landing Page"
        >
          <Home className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">BASE / HOME</span>
        </Link>

        <button
          onClick={onOpenSavedMissions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-cyan-300 transition-colors"
          title="Open saved missions directory"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SAVED MISSIONS</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-gray-300 hover:text-white transition-colors"
          title="Educational Guide & Documentation"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">SYSTEM DOCS</span>
        </button>
      </div>
    </header>
  );
};
