'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { AlgorithmType } from '@/types/pathfinding';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Cpu,
  Zap,
  Route,
  Timer,
  StopCircle,
} from 'lucide-react';

export const CommandDeck: React.FC = () => {
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const pathResult = useMissionStore((s) => s.pathResult);

  const setAlgorithm = useMissionStore((s) => s.setAlgorithm);
  const computePath = useMissionStore((s) => s.computePath);
  const startSimulation = useMissionStore((s) => s.startSimulation);
  const pauseSimulation = useMissionStore((s) => s.pauseSimulation);
  const resumeSimulation = useMissionStore((s) => s.resumeSimulation);
  const stepSimulation = useMissionStore((s) => s.stepSimulation);
  const resetSimulation = useMissionStore((s) => s.resetSimulation);
  const abortMission = useMissionStore((s) => s.abortMission);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);

  const algorithms: { id: AlgorithmType; label: string; desc: string }[] = [
    { id: 'ASTAR', label: 'A* HEURISTIC', desc: 'Optimal cost with slope-aware octile heuristic' },
    { id: 'DIJKSTRA', label: 'DIJKSTRA', desc: 'Uniform cost search exploring all cost contours' },
    { id: 'GREEDY_BFS', label: 'GREEDY BFS', desc: 'Speed-first search prioritizing pure heuristic distance' },
    { id: 'MANUAL', label: 'MANUAL PILOT', desc: 'Direct operator steering with collision/battery simulation' },
  ];

  const speeds = [1, 2, 5, 10];

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-xl space-y-3 font-mono text-xs">
      {/* Top Row: Algorithm Selection Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-gray-300">NAVIGATION ALGORITHM:</span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
          {algorithms.map((algo) => (
            <button
              key={algo.id}
              onClick={() => setAlgorithm(algo.id)}
              disabled={simulationStatus === 'RUNNING'}
              title={algo.desc}
              className={`px-3 py-1.5 rounded transition-all text-center ${
                selectedAlgorithm === algo.id
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-sm font-bold'
                  : 'bg-[#11192e] text-gray-400 hover:text-white hover:bg-[#162340] border border-cyan-900/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {algo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Row: Playback Controls & Speed Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          {selectedAlgorithm !== 'MANUAL' && (
            <button
              onClick={() => computePath()}
              disabled={simulationStatus === 'RUNNING'}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-900/30 disabled:opacity-40"
            >
              <Route className="w-4 h-4" />
              <span>CALCULATE TRAJECTORY</span>
            </button>
          )}

          {simulationStatus !== 'RUNNING' && simulationStatus !== 'REROUTING' && simulationStatus !== 'HAZARD_REROUTING' ? (
            <button
              onClick={() => {
                if (simulationStatus === 'PAUSED') resumeSimulation();
                else startSimulation();
              }}
              disabled={simulationStatus === 'COMPLETED' || simulationStatus === 'FAILED' || simulationStatus === 'CALCULATING'}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-900/30 disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulationStatus === 'PAUSED' ? 'RESUME' : simulationStatus === 'READY' ? 'DEPLOY ROVER' : 'EXECUTE MISSION'}</span>
            </button>
          ) : (
            <button
              onClick={() => pauseSimulation()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-md shadow-amber-900/30"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>HOLD / PAUSE</span>
            </button>
          )}

          <button
            onClick={() => stepSimulation()}
            disabled={simulationStatus === 'RUNNING' || simulationStatus === 'REROUTING' || simulationStatus === 'COMPLETED' || simulationStatus === 'FAILED' || simulationStatus === 'CALCULATING'}
            className="flex items-center gap-1 px-3 py-2 rounded bg-[#131c33] hover:bg-[#1a284a] text-gray-300 border border-cyan-900/40 disabled:opacity-40"
            title="Advance simulation by 0.1s"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>STEP</span>
          </button>

          <button
            onClick={() => resetSimulation()}
            className="flex items-center gap-1 px-3 py-2 rounded bg-[#131c33] hover:bg-[#1a284a] text-gray-300 border border-cyan-900/40 transition-colors"
            title="Reset rover to start position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          {(simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED' || simulationStatus === 'REROUTING') && (
            <button
              onClick={() => abortMission()}
              className="flex items-center gap-1 px-3 py-2 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/50 transition-colors"
              title="Abort current simulation run"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>ABORT</span>
            </button>
          )}
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1.5 bg-[#0e1628] border border-cyan-900/40 rounded px-2 py-1">
          <span className="text-[10px] text-gray-500 mr-1">TIME WARP:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                playbackSpeed === s
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Pathfinding Performance & Benchmark Stats */}
      {pathResult && selectedAlgorithm !== 'MANUAL' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-cyan-900/30 text-[11px]">
          <div className="flex items-center gap-2 bg-[#0c1322] border border-cyan-950 p-2 rounded">
            <Route className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] text-gray-500">TRAJECTORY DISTANCE</div>
              <div className="font-bold text-white">{pathResult.totalDistanceMeters} m</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0c1322] border border-cyan-950 p-2 rounded">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] text-gray-500">EXPLORED NODES</div>
              <div className="font-bold text-white">{pathResult.nodesExploredCount} cells</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0c1322] border border-cyan-950 p-2 rounded">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[9px] text-gray-500">EST. ENERGY DRAW</div>
              <div className="font-bold text-amber-300">{pathResult.estimatedEnergyWh} Wh</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0c1322] border border-cyan-950 p-2 rounded">
            <Timer className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] text-gray-500">SOLVER TIME</div>
              <div className="font-bold text-cyan-300">{pathResult.computeTimeMs} ms</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
