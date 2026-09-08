'use client';

import React, { useState } from 'react';
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
  Wifi,
  Zap,
  Edit2,
  Check,
} from 'lucide-react';

interface TopBarProps {
  onOpenHelp: () => void;
  onOpenSavedMissions: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenHelp,
  onOpenSavedMissions,
}) => {
  const missionName = useMissionStore((s) => s.missionName);
  const setMissionName = useMissionStore((s) => s.setMissionName);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const terrain = useMissionStore((s) => s.terrain);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(missionName);

  // Speed multiplier array
  const speedMultipliers = [0.5, 1, 2, 5, 10];

  // Format Elapsed Time: T+HH:MM:SS
  const totalSeconds = Math.floor(roverState.elapsedTimeSeconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleSaveName = () => {
    if (tempName.trim()) {
      setMissionName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const getStatusBadge = () => {
    switch (simulationStatus) {
      case 'CALCULATING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)] animate-pulse" role="status" aria-live="polite">
            <Compass className="w-3.5 h-3.5 animate-spin" />
            <span className="font-bold tracking-widest text-[11px]">CALCULATING</span>
          </div>
        );
      case 'READY':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-950/70 border border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]" role="status">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold tracking-widest text-[11px]">READY</span>
          </div>
        );
      case 'RUNNING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/80 border border-emerald-400/70 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]" role="status" aria-live="polite">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-widest text-[11px]">RUNNING</span>
          </div>
        );
      case 'REROUTING':
      case 'HAZARD_REROUTING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-950/85 border border-amber-400/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse" role="status" aria-live="polite">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold tracking-widest text-[11px]">REROUTING</span>
          </div>
        );
      case 'PAUSED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-yellow-950/70 border border-yellow-500/60 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.2)]" role="status">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold tracking-widest text-[11px]">PAUSED</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-900/70 border border-emerald-400/80 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.35)]" role="status">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold tracking-widest text-[11px]">COMPLETED</span>
          </div>
        );
      case 'ABORTED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-950/80 border border-purple-600/70 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]" role="status">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold tracking-widest text-[11px]">ABORTED</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950/85 border border-red-500/80 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.35)]" role="status" aria-live="assertive">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="font-bold tracking-widest text-[11px]">FAILED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-400" role="status">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="font-bold tracking-widest text-[11px]">IDLE</span>
          </div>
        );
    }
  };

  return (
    <header className="w-full bg-[#080d1a]/95 backdrop-blur-md border-b border-cyan-950/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl relative z-30 font-mono text-xs">
      {/* Left: Mission Name & Callsign Identification */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-cyan-950/70 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center justify-center">
          <Compass className="w-5 h-5 text-cyan-400" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            {isEditingName ? (
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="bg-black/80 border border-cyan-500 px-2 py-0.5 rounded text-white text-xs font-mono focus:outline-none"
                  autoFocus
                  aria-label="Mission Name"
                />
                <button
                  onClick={handleSaveName}
                  className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded"
                  aria-label="Save Name"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-white font-mono flex items-center gap-1.5">
                  {missionName.toUpperCase()}
                </h1>
                <button
                  onClick={() => {
                    setTempName(missionName);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-cyan-400 focus:opacity-100"
                  title="Rename Mission"
                  aria-label="Rename Mission"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-bold">
                  MISSION CONTROL
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span>ROVER: <strong className="text-cyan-300">{roverConfig.name}</strong></span>
            <span className="text-gray-600">•</span>
            <span>SECTOR: <strong className="text-gray-300">{terrain.type.replace('_', ' ')}</strong></span>
          </div>
        </div>
      </div>

      {/* Center: Mission Clock, Status & Telemetry Downlink Indicator */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mission Elapsed Time */}
        <div className="bg-black/70 border border-cyan-900/60 rounded-lg px-3 py-1 flex items-center gap-2 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-[8px] text-gray-500 uppercase tracking-wider font-bold">MISSION CLOCK</div>
            <div className="text-cyan-300 font-bold tracking-widest text-xs tabular-nums" suppressHydrationWarning>
              {timeStr}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Connection Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0d1527] border border-cyan-950 text-gray-300">
          <div className="relative flex items-center justify-center">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="leading-tight text-left">
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">TELEMETRY LINK</div>
            <div className="text-[10.5px] font-bold text-emerald-400 flex items-center gap-1">
              <span>50 Hz</span>
              <span className="text-gray-600">•</span>
              <span className="text-cyan-400 font-normal">38ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Simulation Speed Controls & Global Nav */}
      <div className="flex items-center gap-2">
        {/* Simulation Speed Pill */}
        <div className="flex items-center bg-[#0d1527] border border-cyan-900/50 rounded-lg p-1 space-x-1 shadow-inner">
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-gray-400 px-1 font-bold">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>WARP:</span>
          </div>
          {speedMultipliers.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all ${
                playbackSpeed === speed
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                  : 'text-gray-400 hover:text-white hover:bg-cyan-950/40'
              }`}
              title={`Set Simulation Speed to ${speed}x`}
              aria-label={`Simulation speed ${speed}x`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Home Link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-gray-300 hover:text-white transition-all shadow-sm"
          title="Return to Base"
        >
          <Home className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline text-[11px]">BASE</span>
        </Link>

        {/* Saved Missions */}
        <button
          onClick={onOpenSavedMissions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-cyan-300 transition-all shadow-sm"
          title="Saved Missions Catalog"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">LOGS</span>
        </button>

        {/* Help / Docs */}
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#162340] border border-cyan-900/50 text-gray-300 hover:text-white transition-all shadow-sm"
          title="Documentation & Guidance"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline text-[11px]">DOCS</span>
        </button>
      </div>
    </header>
  );
};
