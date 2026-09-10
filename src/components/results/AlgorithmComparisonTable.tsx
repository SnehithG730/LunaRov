'use client';

import React, { useState } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { AlgorithmComparator } from '@/core/pathfinding/AlgorithmComparator';
import { AlgorithmComparisonResult, AlgorithmType } from '@/types/pathfinding';
import { Cpu, Zap, Play, Trophy } from 'lucide-react';

interface AlgorithmComparisonTableProps {
  initialAlgorithm?: AlgorithmType;
  onSelectAlgorithm?: (algo: AlgorithmType) => void;
}

export const AlgorithmComparisonTable: React.FC<AlgorithmComparisonTableProps> = ({
  initialAlgorithm,
  onSelectAlgorithm,
}) => {
  const terrain = useMissionStore((s) => s.terrain);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const setAlgorithm = useMissionStore((s) => s.setAlgorithm);
  const computePath = useMissionStore((s) => s.computePath);

  // Compute benchmark using useMemo so it evaluates reactively without setState cascading in effect
  const [manualOverride, setManualOverride] = useState<AlgorithmComparisonResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const calculatedBenchmark = React.useMemo(() => {
    return AlgorithmComparator.compare(
      terrain,
      startPoint,
      targetPoint,
      {},
      ['DSTAR_LITE', 'ASTAR', 'DIJKSTRA', 'GREEDY_BFS']
    );
  }, [terrain, startPoint, targetPoint]);

  const benchmarkData = manualOverride || calculatedBenchmark;

  const runBenchmark = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const results = AlgorithmComparator.compare(
        terrain,
        startPoint,
        targetPoint,
        {},
        ['DSTAR_LITE', 'ASTAR', 'DIJKSTRA', 'GREEDY_BFS']
      );
      setManualOverride(results);
      setIsEvaluating(false);
    }, 100);
  };

  const getAlgoDisplayName = (algo: AlgorithmType) => {
    switch (algo) {
      case 'DSTAR_LITE':
        return 'D* Lite (Dynamic Replanner)';
      case 'ASTAR':
        return 'A* Heuristic (f = g + h)';
      case 'DIJKSTRA':
        return 'Dijkstra (Uniform Cost)';
      case 'GREEDY_BFS':
        return 'Greedy Best-First';
      case 'MANUAL':
        return 'Manual Pilot';
      default:
        return algo;
    }
  };

  const currentAlgo = initialAlgorithm || selectedAlgorithm;

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">PATHFINDING ALGORITHM COMPARISON</span>
        </div>

        <button
          onClick={runBenchmark}
          disabled={isEvaluating}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold transition-all text-[11px] disabled:opacity-40"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isEvaluating ? 'COMPUTING BENCHMARK...' : 'RE-RUN BENCHMARK'}</span>
        </button>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-lg border border-cyan-950 bg-[#0d1424]">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-cyan-900/40 bg-[#080d1a] text-gray-400 uppercase tracking-wider text-[9.5px]">
              <th className="p-3">Algorithm</th>
              <th className="p-3">Distance (m)</th>
              <th className="p-3">Movement Cost</th>
              <th className="p-3">Nodes Evaluated</th>
              <th className="p-3">Execution Time</th>
              <th className="p-3 text-center">Status / Highlights</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-950/80">
            {benchmarkData?.comparison.map((item) => {
              const isSelected = currentAlgo === item.algorithm;
              const isFastest = benchmarkData.fastest === item.algorithm;
              const isFewestNodes = benchmarkData.fewestNodesExplored === item.algorithm;
              const isLowestCost = benchmarkData.lowestCost === item.algorithm;

              return (
                <tr
                  key={item.algorithm}
                  className={`transition-colors hover:bg-cyan-950/30 ${
                    isSelected ? 'bg-cyan-950/40 font-semibold' : ''
                  }`}
                >
                  {/* Algorithm Name */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-gray-200'}>
                        {getAlgoDisplayName(item.algorithm)}
                      </span>
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="p-3 text-white">
                    {item.distance ? `${item.distance.toFixed(1)} m` : 'N/A'}
                  </td>

                  {/* Cost */}
                  <td className="p-3">
                    <span className={isLowestCost ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                      {item.cost ? item.cost.toFixed(1) : 'N/A'}
                    </span>
                  </td>

                  {/* Nodes Evaluated */}
                  <td className="p-3">
                    <span className={isFewestNodes ? 'text-amber-400 font-bold' : 'text-gray-300'}>
                      {item.nodesExplored.toLocaleString()} cells
                    </span>
                  </td>

                  {/* Execution Time */}
                  <td className="p-3">
                    <span className={isFastest ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                      {item.computationTimeMs.toFixed(2)} ms
                    </span>
                  </td>

                  {/* Badges / Select Action */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {isLowestCost && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5" />
                          OPTIMAL
                        </span>
                      )}
                      {isFewestNodes && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          MIN NODES
                        </span>
                      )}
                      {isFastest && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                          FASTEST
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setAlgorithm(item.algorithm);
                          computePath();
                          if (onSelectAlgorithm) onSelectAlgorithm(item.algorithm);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          isSelected
                            ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                            : 'bg-black/50 text-gray-400 border-gray-700 hover:text-white hover:border-cyan-500'
                        }`}
                      >
                        {isSelected ? 'ACTIVE' : 'SELECT'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
