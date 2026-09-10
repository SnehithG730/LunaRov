'use client';

import React, { useEffect, useState } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import {
  OptimizationStrategy,
  STRATEGY_METADATA,
  OPTIMIZATION_STRATEGY_PRESETS,
  StrategyComparisonResult,
} from '@/types/pathfinding';
import {
  X,
  Zap,
  Battery,
  ShieldCheck,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Sun,
} from 'lucide-react';

interface StrategyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyComparisonModal: React.FC<StrategyComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    terrain,
    startPoint,
    targetPoint,
    roverConfig,
    optimizationStrategy,
    setOptimizationStrategy,
    compareAllStrategies,
    strategyComparisonResult,
    computePath,
  } = useMissionStore();

  const [comparison, setComparison] = useState<StrategyComparisonResult | null>(strategyComparisonResult);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRADE_OFFS'>('OVERVIEW');

  useEffect(() => {
    if (isOpen) {
      const res = compareAllStrategies();
      setComparison(res);
    }
  }, [isOpen, terrain, startPoint, targetPoint, roverConfig]);

  if (!isOpen) return null;

  const strategies: OptimizationStrategy[] = ['SHORTEST', 'MIN_ENERGY', 'SOLAR_OPTIMIZED', 'SAFEST', 'FASTEST', 'BALANCED'];

  const handleSelectStrategy = (strat: OptimizationStrategy) => {
    setOptimizationStrategy(strat);
    computePath();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1220] border border-cyan-800/80 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200 font-mono">
        {/* Header */}
        <div className="p-4 border-b border-cyan-900/60 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-700/50 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  MULTI-OBJECTIVE STRATEGY COMPARISON DECK
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  REAL-TIME EVALUATION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Compare autonomous trajectories across distance, battery draw, solar harvesting, slope, safety, and time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const res = compareAllStrategies();
                setComparison(res);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Re-evaluate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Educational Banner */}
        <div className="bg-cyan-950/40 border-b border-cyan-900/40 px-4 py-2.5 flex items-center justify-between text-xs text-cyan-200/90">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Engineering Principle:</strong> Lunar traversal is inherently multi-objective. Minimizing distance often forces steep slope climbs that drain battery or pass through dark PSRs devoid of solar energy.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Metrics Grid
            </button>
            <button
              onClick={() => setActiveTab('TRADE_OFFS')}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                activeTab === 'TRADE_OFFS'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Weight Trade-offs
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {activeTab === 'OVERVIEW' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {strategies.map((strat) => {
                const meta = STRATEGY_METADATA[strat];
                const item = comparison?.comparisons.find((c) => c.strategy === strat);
                const isCurrent = optimizationStrategy === strat;
                const isBestEnergy = comparison?.lowestEnergyStrategy === strat;
                const isBestSolar = comparison?.bestSolarStrategy === strat;
                const isSafest = comparison?.safestStrategy === strat;
                const isShortest = comparison?.shortestDistanceStrategy === strat;
                const isFastest = comparison?.fastestStrategy === strat;

                return (
                  <div
                    key={strat}
                    className={`rounded-xl p-3 border flex flex-col justify-between transition-all relative ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Active Ribbon */}
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-2 px-1.5 py-0.2 rounded bg-cyan-400 text-black text-[8.5px] font-black uppercase tracking-wider shadow-sm">
                        Active Route
                      </div>
                    )}

                    <div className="space-y-2">
                      {/* Strategy Title & Tag */}
                      <div className="flex items-start justify-between gap-1 pt-1">
                        <div>
                          <h3 className="text-xs font-bold text-white leading-tight">
                            {meta.label}
                          </h3>
                          <span
                            className="text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase inline-block mt-0.5"
                            style={{ backgroundColor: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}50` }}
                          >
                            {meta.tag}
                          </span>
                        </div>
                        {item && (
                          <span
                            className={`text-[8.5px] px-1 py-0.2 rounded font-bold uppercase ${
                              item.feasibility === 'FEASIBLE'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : item.feasibility === 'WARNING'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {item.feasibility}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-2">
                        {meta.shortDesc}
                      </p>

                      {/* Highlight Badges */}
                      <div className="flex flex-wrap gap-1">
                        {isBestSolar && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-semibold flex items-center gap-0.5">
                            <Sun className="w-2.5 h-2.5" /> Best Solar
                          </span>
                        )}
                        {isBestEnergy && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> Low Wh
                          </span>
                        )}
                        {isSafest && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> Safest
                          </span>
                        )}
                        {isShortest && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-0.5">
                            <TrendingDown className="w-2.5 h-2.5" /> Shortest
                          </span>
                        )}
                        {isFastest && (
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Fastest
                          </span>
                        )}
                      </div>

                      {/* Metrics Table */}
                      {item && item.success ? (
                        <div className="space-y-1 pt-1.5 border-t border-slate-800 text-[10.5px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Distance:</span>
                            <span className="text-cyan-300 font-bold">{item.distanceMeters} m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Consumed:</span>
                            <span className="text-amber-300 font-bold">{item.estimatedEnergyWh} Wh</span>
                          </div>
                          {item.solarEnergyGeneratedWh !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-yellow-400">Solar Gen:</span>
                              <span className="text-yellow-300 font-bold">+{item.solarEnergyGeneratedWh} Wh</span>
                            </div>
                          )}
                          {item.netEnergyWh !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Net Energy:</span>
                              <span className="text-emerald-300 font-bold">{item.netEnergyWh} Wh</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Battery Rem.:</span>
                            <span className={`font-bold ${item.batteryRemainingPct < 20 ? 'text-red-400' : 'text-slate-200'}`}>
                              {item.batteryRemainingPct}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Time:</span>
                            <span className="text-amber-300 font-bold">{item.estimatedTravelTimeSeconds} s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Max Slope:</span>
                            <span className={`font-bold ${item.maxSlopeDeg >= 20 ? 'text-rose-400' : 'text-slate-200'}`}>
                              {item.maxSlopeDeg}°
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-red-950/40 text-red-400 text-xs italic">
                          No traversable route
                        </div>
                      )}
                    </div>

                    {/* Deploy Button */}
                    <button
                      onClick={() => handleSelectStrategy(strat)}
                      className={`w-full mt-2.5 py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-950 font-black'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <span>{isCurrent ? 'Active Route' : 'Select'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Multi-Objective Mathematical Weight Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Each preset assigns specific objective weights (0.0 - 1.0) into the normalized cost function:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Strategy</th>
                      <th className="py-2 px-3 text-cyan-400">Distance (w_dist)</th>
                      <th className="py-2 px-3 text-emerald-400">Energy (w_energy)</th>
                      <th className="py-2 px-3 text-yellow-400">Solar (w_solar)</th>
                      <th className="py-2 px-3 text-rose-400">Slope (w_slope)</th>
                      <th className="py-2 px-3 text-blue-400">Risk (w_risk)</th>
                      <th className="py-2 px-3 text-amber-400">Time (w_time)</th>
                      <th className="py-2 px-3">Optimal Traversal Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strat) => {
                      const w = OPTIMIZATION_STRATEGY_PRESETS[strat as Exclude<OptimizationStrategy, 'CUSTOM'>];
                      const meta = STRATEGY_METADATA[strat];
                      return (
                        <tr key={strat} className="border-b border-slate-900/60 hover:bg-slate-900/30 font-mono">
                          <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                            {meta.label}
                          </td>
                          <td className="py-2.5 px-3 text-cyan-300 font-bold">{w.distance.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-emerald-300 font-bold">{w.energy.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-yellow-300 font-bold">{(w.solar ?? 0.0).toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-rose-300 font-bold">{w.slope.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-blue-300 font-bold">{w.risk.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{w.time.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{meta.shortDesc}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-cyan-900/40 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span>Rover Battery Capacity: <strong className="text-white">{roverConfig.batteryCapacityWh} Wh</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close Deck
          </button>
        </div>
      </div>
    </div>
  );
};
