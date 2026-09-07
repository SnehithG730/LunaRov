'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Cpu, Route, Layers, Bot, Globe, Radio } from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const terrain = useMissionStore((s) => s.terrain);
  const pathResult = useMissionStore((s) => s.pathResult);
  const roverState = useMissionStore((s) => s.roverState);

  // Algorithm format
  const getAlgoName = () => {
    switch (selectedAlgorithm) {
      case 'ASTAR':
        return 'A* HEURISTIC';
      case 'DIJKSTRA':
        return 'DIJKSTRA';
      case 'GREEDY_BFS':
        return 'GREEDY BEST-FIRST';
      case 'MANUAL':
        return 'MANUAL PILOT';
      default:
        return selectedAlgorithm;
    }
  };

  // Path Status
  const getPathStatus = () => {
    if (simulationStatus === 'REROUTING' || simulationStatus === 'HAZARD_REROUTING') {
      return { text: 'RE-ROUTING', color: 'text-amber-400 bg-amber-950/60 border-amber-500/50' };
    }
    if (simulationStatus === 'CALCULATING') {
      return { text: 'CALCULATING', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/50' };
    }
    if (simulationStatus === 'FAILED') {
      return { text: 'BLOCKED / FAILED', color: 'text-red-400 bg-red-950/60 border-red-500/50' };
    }
    if (simulationStatus === 'COMPLETED') {
      return { text: 'REACHED TARGET', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50' };
    }
    if (simulationStatus === 'RUNNING') {
      return { text: 'IN TRANSIT', color: 'text-cyan-300 bg-cyan-950/60 border-cyan-500/50' };
    }
    if (pathResult && pathResult.success) {
      return { text: 'OPTIMAL', color: 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40' };
    }
    return { text: 'STANDBY', color: 'text-gray-400 bg-black/40 border-gray-800' };
  };

  // Rover Status
  const getRoverStatus = () => {
    if (roverState.batteryPercentage <= 0) {
      return { text: 'DEPLETED', color: 'text-red-400' };
    }
    if (simulationStatus === 'RUNNING') {
      return { text: 'ACTIVE', color: 'text-emerald-400' };
    }
    if (simulationStatus === 'REROUTING') {
      return { text: 'EVADING HAZARD', color: 'text-amber-400' };
    }
    if (simulationStatus === 'PAUSED') {
      return { text: 'STANDBY', color: 'text-yellow-400' };
    }
    if (simulationStatus === 'COMPLETED') {
      return { text: 'ARRIVED', color: 'text-cyan-400' };
    }
    return { text: 'ONLINE', color: 'text-cyan-300' };
  };

  const pathStatus = getPathStatus();
  const roverStatus = getRoverStatus();

  return (
    <footer className="w-full bg-[#060a14] border-t border-cyan-950/90 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xl relative z-20">
      {/* 4 Main Status Indicators */}
      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        {/* 1. Algorithm */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Algorithm:</span>
          <strong className="text-white bg-[#0e1628] px-2 py-0.5 rounded border border-cyan-950">
            {getAlgoName()}
          </strong>
        </div>

        {/* 2. Path Status */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Route className="w-3.5 h-3.5 text-cyan-400" />
          <span>Path Status:</span>
          <strong className={`px-2 py-0.5 rounded border font-bold text-[10px] ${pathStatus.color}`}>
            {pathStatus.text}
          </strong>
        </div>

        {/* 3. Terrain */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Terrain:</span>
          <strong className="text-gray-200 bg-[#0e1628] px-2 py-0.5 rounded border border-cyan-950">
            {terrain.type.replace('_', ' ')}
          </strong>
        </div>

        {/* 4. Rover */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Rover:</span>
          <strong className={`bg-[#0e1628] px-2 py-0.5 rounded border border-cyan-950 font-bold ${roverStatus.color}`}>
            {roverStatus.text}
          </strong>
        </div>
      </div>

      {/* Downlink Location & Link Coordinates */}
      <div className="hidden lg:flex items-center gap-3 text-[10.5px] text-gray-400">
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>LUNAR SOUTH POLE (SHACKLETON CRATER CRUST)</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-1 text-cyan-400 font-semibold">
          <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
          <span>TELEMETRY SECURE</span>
        </div>
      </div>
    </footer>
  );
};
