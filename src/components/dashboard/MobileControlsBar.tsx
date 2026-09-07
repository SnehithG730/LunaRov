'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import {
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  Route,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react';

interface MobileControlsBarProps {
  onOpenSettings: () => void;
  onOpenLogs: () => void;
}

export const MobileControlsBar: React.FC<MobileControlsBarProps> = ({
  onOpenSettings,
  onOpenLogs,
}) => {
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const computePath = useMissionStore((s) => s.computePath);
  const startSimulation = useMissionStore((s) => s.startSimulation);
  const pauseSimulation = useMissionStore((s) => s.pauseSimulation);
  const resumeSimulation = useMissionStore((s) => s.resumeSimulation);
  const resetSimulation = useMissionStore((s) => s.resetSimulation);
  const abortMission = useMissionStore((s) => s.abortMission);

  const isRunning = simulationStatus === 'RUNNING' || simulationStatus === 'REROUTING' || simulationStatus === 'HAZARD_REROUTING';
  const isPaused = simulationStatus === 'PAUSED';
  const isFinished = simulationStatus === 'COMPLETED' || simulationStatus === 'FAILED' || simulationStatus === 'ABORTED';

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-3 shadow-xl space-y-2.5 font-mono text-xs lg:hidden">
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {/* Main Start / Resume / Pause Button (Spans 2 cols) */}
        {!isRunning ? (
          <button
            onClick={() => {
              if (isPaused) resumeSimulation();
              else startSimulation();
            }}
            disabled={simulationStatus === 'CALCULATING' || isFinished}
            className={`col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold text-xs transition-all shadow-md ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950'
            } disabled:opacity-40`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? 'RESUME' : simulationStatus === 'READY' ? 'START' : 'EXECUTE'}</span>
          </button>
        ) : (
          <button
            onClick={pauseSimulation}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-md shadow-amber-950"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE</span>
          </button>
        )}

        {/* Reset Button */}
        <button
          onClick={resetSimulation}
          className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-[#11192e] hover:bg-[#182645] text-gray-200 border border-cyan-900/40 text-[11px] font-semibold"
          title="Reset Rover"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>RESET</span>
        </button>

        {/* Abort Button */}
        <button
          onClick={abortMission}
          disabled={!isRunning && !isPaused}
          className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/50 text-[11px] font-semibold disabled:opacity-30"
          title="Abort Simulation"
        >
          <StopCircle className="w-3.5 h-3.5 text-red-400" />
          <span>ABORT</span>
        </button>
      </div>

      {/* Secondary Bottom Sheets & Path Trigger */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-cyan-900/30 text-[10.5px]">
        {selectedAlgorithm !== 'MANUAL' && (
          <button
            onClick={() => computePath()}
            disabled={isRunning}
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-[#0d1424] hover:bg-[#131e36] text-cyan-300 border border-cyan-900/40 font-semibold disabled:opacity-40"
          >
            <Route className="w-3 h-3 text-cyan-400" />
            <span>CALC PATH</span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-[#0d1424] hover:bg-[#131e36] text-gray-300 hover:text-white border border-cyan-900/40 font-semibold"
        >
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          <span>SETTINGS</span>
        </button>

        <button
          onClick={onOpenLogs}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-[#0d1424] hover:bg-[#131e36] text-gray-300 hover:text-white border border-cyan-900/40 font-semibold"
        >
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>LOGS</span>
        </button>
      </div>
    </div>
  );
};
