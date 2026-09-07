'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { AlgorithmType } from '@/types/pathfinding';
import { TerrainType } from '@/types/terrain';
import {
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  Route,
  Cpu,
  Layers,
  Sparkles,
  MapPin,
  Compass,
  Zap,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

export const LeftMissionControls: React.FC = () => {
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const pathResult = useMissionStore((s) => s.pathResult);
  const terrain = useMissionStore((s) => s.terrain);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);

  const setAlgorithm = useMissionStore((s) => s.setAlgorithm);
  const computePath = useMissionStore((s) => s.computePath);
  const startSimulation = useMissionStore((s) => s.startSimulation);
  const pauseSimulation = useMissionStore((s) => s.pauseSimulation);
  const resumeSimulation = useMissionStore((s) => s.resumeSimulation);
  const resetSimulation = useMissionStore((s) => s.resetSimulation);
  const abortMission = useMissionStore((s) => s.abortMission);
  const setTerrainType = useMissionStore((s) => s.setTerrainType);
  const regenerateTerrain = useMissionStore((s) => s.regenerateTerrain);

  const algorithms: { id: AlgorithmType; label: string; tag: string; desc: string }[] = [
    { id: 'ASTAR', label: 'A* HEURISTIC', tag: 'OPTIMAL', desc: 'Slope-aware octile heuristic. Guaranteed shortest cost.' },
    { id: 'DIJKSTRA', label: 'DIJKSTRA', tag: 'UNIFORM', desc: 'Explores cost contours uniformly without directional heuristic.' },
    { id: 'GREEDY_BFS', label: 'GREEDY BFS', tag: 'SPEED', desc: 'Prioritizes Euclidean/Octile distance directly to target.' },
    { id: 'MANUAL', label: 'MANUAL PILOT', tag: 'DIRECT', desc: 'Direct operator steering using W/A/S/D or virtual controls.' },
  ];

  const terrainOptions: { id: TerrainType; label: string }[] = [
    { id: 'FLAT', label: 'Flat Plains' },
    { id: 'CRATER_FIELD', label: 'Crater Field' },
    { id: 'ROCKY', label: 'Rocky Basin' },
    { id: 'HILLY', label: 'Hilly Highlands' },
    { id: 'SOUTH_POLE', label: 'South Pole' },
  ];

  const isRunning = simulationStatus === 'RUNNING' || simulationStatus === 'REROUTING' || simulationStatus === 'HAZARD_REROUTING';
  const isPaused = simulationStatus === 'PAUSED';
  const isFinished = simulationStatus === 'COMPLETED' || simulationStatus === 'FAILED' || simulationStatus === 'ABORTED';

  return (
    <div className="w-full space-y-3 font-mono text-xs">
      {/* 1. Primary Mission Execution Controls Card */}
      <div className="aerospace-panel rounded-xl p-3.5 shadow-xl space-y-3 relative overflow-hidden corner-reticle">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-white tracking-wider text-xs">MISSION COMMANDS</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-800/40 text-cyan-400 font-bold">
            MASTER DECK
          </span>
        </div>

        {/* Primary Action Buttons: START, PAUSE, RESUME, RESET, ABORT */}
        <div className="grid grid-cols-2 gap-2">
          {/* Main Action (START / RESUME / PAUSE) */}
          {!isRunning ? (
            <button
              onClick={() => {
                if (isPaused) resumeSimulation();
                else startSimulation();
              }}
              disabled={simulationStatus === 'CALCULATING' || isFinished}
              className={`col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-950/50 font-black'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Launch or Resume autonomous progression [Space]"
              aria-label={isPaused ? 'Resume Mission' : 'Start Simulation'}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPaused ? 'RESUME MISSION' : simulationStatus === 'READY' ? 'START MISSION' : 'START SIMULATION'}</span>
              <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-current font-normal ml-1">Space</kbd>
            </button>
          ) : (
            <button
              onClick={pauseSimulation}
              className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-950/50"
              title="Pause rover physical progress [Space]"
              aria-label="Pause Simulation"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE SIMULATION</span>
              <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-white font-normal ml-1">Space</kbd>
            </button>
          )}

          {/* Reset Button */}
          <button
            onClick={resetSimulation}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#0e1628] hover:bg-[#16233f] text-gray-200 border border-cyan-900/50 transition-all shadow-sm font-semibold"
            title="Reset rover telemetry and return to start waypoint"
            aria-label="Reset Mission"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESET</span>
          </button>

          {/* Abort Button */}
          <button
            onClick={abortMission}
            disabled={!isRunning && !isPaused}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-red-950/70 hover:bg-red-900/90 text-red-200 border border-red-800/60 transition-all shadow-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            title="Abort active mission"
            aria-label="Abort Mission"
          >
            <StopCircle className="w-3.5 h-3.5 text-red-400" />
            <span>ABORT</span>
          </button>
        </div>

        {/* Calculate Trajectory Quick Trigger */}
        {selectedAlgorithm !== 'MANUAL' && (
          <button
            onClick={() => computePath()}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#0e172a] hover:bg-[#152342] text-cyan-300 border border-cyan-800/60 transition-all text-xs font-bold disabled:opacity-40"
            title="Compute optimal path using active solver [C]"
            aria-label="Calculate Trajectory"
          >
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>CALCULATE TRAJECTORY</span>
          </button>
        )}
      </div>

      {/* 2. Pathfinding Algorithm Selection Card */}
      <div className="aerospace-panel rounded-xl p-3.5 shadow-xl space-y-2.5 corner-reticle">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-white tracking-wider text-xs">PATHFINDING ENGINE</span>
          </div>
          <span className="text-[10px] text-gray-400">SOLVER</span>
        </div>

        <div className="space-y-1.5" role="radiogroup" aria-label="Pathfinding Algorithm">
          {algorithms.map((algo) => {
            const isSelected = selectedAlgorithm === algo.id;
            return (
              <button
                key={algo.id}
                onClick={() => setAlgorithm(algo.id)}
                disabled={isRunning}
                role="radio"
                aria-checked={isSelected}
                className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-200'
                    : 'bg-[#0d1424] border-cyan-950/60 text-gray-400 hover:text-gray-200 hover:bg-[#121c33]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {algo.label}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      isSelected
                        ? 'bg-cyan-400 text-black'
                        : 'bg-black/50 text-gray-500'
                    }`}
                  >
                    {algo.tag}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 leading-tight font-sans">
                  {algo.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Path Stats or Diagnostic Error State */}
        {selectedAlgorithm !== 'MANUAL' && (
          pathResult ? (
            pathResult.success ? (
              <div className="p-2 rounded bg-black/60 border border-cyan-900/40 text-[10.5px] space-y-1 text-gray-300">
                <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-cyan-950 pb-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    PATH STATUS:
                  </span>
                  <span>OPTIMAL ROUTE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Distance:</span>
                  <strong className="text-cyan-300">{pathResult.totalDistanceMeters} m</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Explored Nodes:</span>
                  <strong className="text-white">{pathResult.nodesExploredCount} cells</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Est. Energy:</span>
                  <strong className="text-amber-300">{pathResult.estimatedEnergyWh} Wh</strong>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded bg-red-950/50 border border-red-500/50 text-[10.5px] space-y-1 text-red-200">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>NO TRAJECTORY FOUND</span>
                </div>
                <p className="text-[10px] text-gray-300 font-sans leading-relaxed">
                  Target is blocked by steep slopes (&gt;25°) or dense boulders. Try randomizing the terrain seed or picking a new target point.
                </p>
              </div>
            )
          ) : (
            <div className="p-2.5 rounded bg-[#0d1424] border border-cyan-950 text-[10.5px] text-gray-500 text-center italic">
              Click &quot;Calculate Trajectory&quot; to inspect path costs.
            </div>
          )
        )}
      </div>

      {/* 3. Terrain & Environment Preset Switcher */}
      <div className="aerospace-panel rounded-xl p-3.5 shadow-xl space-y-2.5 corner-reticle">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-extrabold text-white tracking-wider text-xs">LUNAR TERRAIN</span>
          </div>
          <button
            onClick={() => regenerateTerrain()}
            disabled={isRunning}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors disabled:opacity-40"
            title="Randomize sector seed [G]"
            aria-label="Randomize Terrain"
          >
            <Sparkles className="w-3 h-3" />
            <span>RANDOMIZE</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {terrainOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTerrainType(opt.id)}
              disabled={isRunning}
              className={`p-1.5 rounded text-[11px] font-semibold transition-all text-center border ${
                terrain.type === opt.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                  : 'bg-[#0d1424] text-gray-400 border-cyan-950 hover:text-white hover:bg-[#121c33]'
              } disabled:opacity-40`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Waypoints Summary */}
        <div className="pt-2 border-t border-cyan-900/30 text-[10.5px] text-gray-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            START: <strong className="text-white">[{startPoint.x}, {startPoint.y}]</strong>
          </span>
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-red-400" />
            TARGET: <strong className="text-white">[{targetPoint.x}, {targetPoint.y}]</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
