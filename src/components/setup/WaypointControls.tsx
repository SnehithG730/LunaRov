'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { MapPin, Flag, Shuffle, Compass } from 'lucide-react';

export const WaypointControls: React.FC = () => {
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const terrain = useMissionStore((s) => s.terrain);
  const setStartPoint = useMissionStore((s) => s.setStartPoint);
  const setTargetPoint = useMissionStore((s) => s.setTargetPoint);
  const computePath = useMissionStore((s) => s.computePath);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);

  const disabled = simulationStatus === 'RUNNING';

  const handleRandomize = () => {
    if (disabled) return;
    const findClearCell = () => {
      for (let i = 0; i < 200; i++) {
        const x = 3 + Math.floor(Math.random() * (terrain.width - 6));
        const y = 3 + Math.floor(Math.random() * (terrain.height - 6));
        if (!terrain.cells[y][x].isObstacle && terrain.cells[y][x].slope < 18) {
          return { x, y };
        }
      }
      return { x: 5, y: 5 };
    };

    const newStart = findClearCell();
    let newTarget = findClearCell();
    while (Math.hypot(newTarget.x - newStart.x, newTarget.y - newStart.y) < 15) {
      newTarget = findClearCell();
    }

    setStartPoint(newStart);
    setTargetPoint(newTarget);
    setTimeout(() => computePath(), 50);
  };

  return (
    <div className="bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-lg space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">MISSION COORDINATES</span>
        </div>

        <button
          onClick={handleRandomize}
          disabled={disabled}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131c33] hover:bg-[#1a284a] text-cyan-300 border border-cyan-800/40 transition-colors disabled:opacity-40"
          title="Randomize starting position and destination to safe regolith coordinates"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>RANDOMIZE WAYPOINTS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start Point */}
        <div className="bg-[#0e1628] border border-emerald-900/40 p-2.5 rounded-lg space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
            <MapPin className="w-3.5 h-3.5" />
            <span>START COORDINATES</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-gray-500 text-[10px]">GRID X:</span>
              <input
                type="number"
                min="0"
                max={terrain.width - 1}
                value={startPoint.x}
                disabled={disabled}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(terrain.width - 1, parseInt(e.target.value) || 0));
                  setStartPoint({ ...startPoint, x: val });
                }}
                className="w-full bg-black/60 border border-emerald-800/50 rounded px-2 py-1 text-white text-center"
              />
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">GRID Y:</span>
              <input
                type="number"
                min="0"
                max={terrain.height - 1}
                value={startPoint.y}
                disabled={disabled}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(terrain.height - 1, parseInt(e.target.value) || 0));
                  setStartPoint({ ...startPoint, y: val });
                }}
                className="w-full bg-black/60 border border-emerald-800/50 rounded px-2 py-1 text-white text-center"
              />
            </div>
          </div>
          <div className="text-[10px] text-gray-400">
            Surface Elev: <strong className="text-white">{terrain.cells[startPoint.y]?.[startPoint.x]?.elevation ?? 0}m</strong>
          </div>
        </div>

        {/* Target Destination */}
        <div className="bg-[#0e1628] border border-amber-900/40 p-2.5 rounded-lg space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
            <Flag className="w-3.5 h-3.5" />
            <span>TARGET DESTINATION</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-gray-500 text-[10px]">GRID X:</span>
              <input
                type="number"
                min="0"
                max={terrain.width - 1}
                value={targetPoint.x}
                disabled={disabled}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(terrain.width - 1, parseInt(e.target.value) || 0));
                  setTargetPoint({ ...targetPoint, x: val });
                }}
                className="w-full bg-black/60 border border-amber-800/50 rounded px-2 py-1 text-white text-center"
              />
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">GRID Y:</span>
              <input
                type="number"
                min="0"
                max={terrain.height - 1}
                value={targetPoint.y}
                disabled={disabled}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(terrain.height - 1, parseInt(e.target.value) || 0));
                  setTargetPoint({ ...targetPoint, y: val });
                }}
                className="w-full bg-black/60 border border-amber-800/50 rounded px-2 py-1 text-white text-center"
              />
            </div>
          </div>
          <div className="text-[10px] text-gray-400">
            Surface Elev: <strong className="text-white">{terrain.cells[targetPoint.y]?.[targetPoint.x]?.elevation ?? 0}m</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
