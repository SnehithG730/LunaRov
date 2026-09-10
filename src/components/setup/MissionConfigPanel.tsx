'use client';

import React, { useState } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { TERRAIN_PRESETS } from '@/core/terrain/TerrainPresets';
import { TerrainType } from '@/types/terrain';
import { AlgorithmType, OptimizationStrategy } from '@/types/pathfinding';
import { StrategyComparisonModal } from '@/components/dashboard/StrategyComparisonModal';
import {
  Rocket,
  Gauge,
  BatteryCharging,
  Zap,
  Activity,
  Layers,
  Compass,
  Mountain,
  RotateCcw,
  Sparkles,
  Cpu,
  Sun,
  ShieldAlert,
} from 'lucide-react';

const PRESET_ROVER_NAMES = [
  'Artemis Explorer VII',
  'Viper-Alpha',
  'Apollo LRN-1',
  'Chariot-X',
  'Lunokhod Neo',
];

export const MissionConfigPanel: React.FC = () => {
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const {
    missionName,
    setMissionName,
    roverConfig,
    setRoverConfig,
    terrain,
    setTerrainType,
    regenerateTerrain,
    selectedAlgorithm,
    setAlgorithm,
    optimizationStrategy,
    setOptimizationStrategy,
    objectiveWeights,
    setObjectiveWeights,
    obstacleToggles,
    setObstacleToggles,
  } = useMissionStore();

  const handleRoverPreset = (name: string) => {
    let speed = 2.0;
    let battery = 1200;
    let accel = 1.0;
    let eff = 1.0;

    if (name.includes('Viper')) {
      speed = 1.5;
      battery = 1800;
      accel = 0.8;
      eff = 1.2;
    } else if (name.includes('Apollo')) {
      speed = 2.8;
      battery = 950;
      accel = 1.4;
      eff = 0.85;
    } else if (name.includes('Chariot')) {
      speed = 3.5;
      battery = 2400;
      accel = 1.6;
      eff = 1.1;
    } else if (name.includes('Lunokhod')) {
      speed = 1.2;
      battery = 2000;
      accel = 0.6;
      eff = 1.3;
    }

    setRoverConfig({
      name,
      maxSpeed: speed,
      batteryCapacityWh: battery,
      acceleration: accel,
      movementEfficiency: eff,
    });
  };

  return (
    <aside className="h-full flex flex-col bg-[#0b101b]/95 border-r border-slate-800 overflow-y-auto custom-scrollbar select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
              Mission Parameters
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
            CONFIG-MODE
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 1. Mission Name */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Mission Designation
          </label>
          <div className="relative">
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g. LunaRov Mission 01"
              maxLength={40}
              className="w-full bg-slate-950/80 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all placeholder:text-slate-600"
            />
            <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500">
              ID: LUN-{(terrain.seed % 999).toString().padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* 2. Rover Specifications */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                Rover Kinematics & Power
              </label>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Class IV Mobile</span>
          </div>

          {/* Preset rover select */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Rover Vehicle Model:</span>
              <span className="text-amber-400 font-semibold">{roverConfig.name}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROVER_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handleRoverPreset(name)}
                  className={`text-[10px] font-mono px-2 py-1 rounded transition-all border ${
                    roverConfig.name === name
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.15)]'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
            {/* Max Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Maximum Speed:
                </span>
                <span className="text-cyan-300 font-bold">{roverConfig.maxSpeed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={roverConfig.maxSpeed}
                onChange={(e) => setRoverConfig({ maxSpeed: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>0.5 m/s (Survey)</span>
                <span>5.0 m/s (Sprint)</span>
              </div>
            </div>

            {/* Battery Capacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" /> Battery Capacity:
                </span>
                <span className="text-emerald-300 font-bold">{roverConfig.batteryCapacityWh} Wh</span>
              </div>
              <input
                type="range"
                min={200}
                max={3000}
                step={50}
                value={roverConfig.batteryCapacityWh}
                onChange={(e) => setRoverConfig({ batteryCapacityWh: parseInt(e.target.value) })}
                className="w-full accent-emerald-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>200 Wh</span>
                <span>3000 Wh (Heavy Pack)</span>
              </div>
            </div>

            {/* Acceleration */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-400" /> Acceleration:
                </span>
                <span className="text-amber-300 font-bold">{roverConfig.acceleration.toFixed(1)} m/s²</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={roverConfig.acceleration}
                onChange={(e) => setRoverConfig({ acceleration: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>0.2 m/s²</span>
                <span>3.0 m/s²</span>
              </div>
            </div>

            {/* Movement Efficiency */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Movement Efficiency:
                </span>
                <span className="text-purple-300 font-bold">{roverConfig.movementEfficiency.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.8}
                step={0.05}
                value={roverConfig.movementEfficiency}
                onChange={(e) => setRoverConfig({ movementEfficiency: parseFloat(e.target.value) })}
                className="w-full accent-purple-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>0.5x (High Drag)</span>
                <span>1.8x (Ultra Efficient)</span>
              </div>
            </div>

            {/* Solar Array Peak Capacity */}
            <div className="space-y-1 pt-1 border-t border-slate-900">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> Solar Array Peak Capacity:
                </span>
                <span className="text-amber-300 font-bold">{roverConfig.solarCapacityWatts ?? 250} W</span>
              </div>
              <input
                type="range"
                min={50}
                max={600}
                step={25}
                value={roverConfig.solarCapacityWatts ?? 250}
                onChange={(e) => setRoverConfig({ solarCapacityWatts: parseInt(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>50 W (Compact Panel)</span>
                <span>600 W (Dual Deployable Array)</span>
              </div>
            </div>

            {/* Minimum Reserve Warning Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" /> Minimum Battery Reserve:
                </span>
                <span className="text-rose-300 font-bold">{roverConfig.minimumBatteryReservePct ?? 15}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={1}
                value={roverConfig.minimumBatteryReservePct ?? 15}
                onChange={(e) => setRoverConfig({ minimumBatteryReservePct: parseInt(e.target.value) })}
                className="w-full accent-rose-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>5% (Aggressive)</span>
                <span>40% (Conservative)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Terrain Preset Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                Lunar Terrain Sector
              </label>
            </div>
            <button
              onClick={() => regenerateTerrain()}
              className="text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Generate new random seed"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Re-seed
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TERRAIN_PRESETS) as TerrainType[]).map((type) => {
              const meta = TERRAIN_PRESETS[type];
              const isSelected = terrain.type === type;
              return (
                <button
                  key={type}
                  onClick={() => setTerrainType(type)}
                  className={`text-left p-2.5 rounded-lg border transition-all relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-semibold ${
                        isSelected ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {type === 'CRATER_FIELD' ? 'Crater Field' : type === 'SOUTH_POLE' ? 'South Pole' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                        meta.traversabilityRating === 'EASY'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : meta.traversabilityRating === 'MODERATE'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : meta.traversabilityRating === 'DIFFICULT'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {meta.traversabilityRating}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {meta.description}
                  </p>
                  <div className="mt-1.5 text-[9px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Slope: {meta.averageSlope}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Multi-Objective Optimization Strategy */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                Optimization Objective
              </label>
            </div>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/60 hover:bg-cyan-900 transition-colors cursor-pointer"
            >
              <Layers className="w-2.5 h-2.5" /> Compare All
            </button>
          </div>

          {/* Strategy preset pills */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'BALANCED' as OptimizationStrategy, label: 'Balanced', color: '#a855f7' },
              { id: 'MIN_ENERGY' as OptimizationStrategy, label: 'Min Energy', color: '#10b981' },
              { id: 'SOLAR_OPTIMIZED' as OptimizationStrategy, label: 'Solar Opt', color: '#f59e0b' },
              { id: 'SAFEST' as OptimizationStrategy, label: 'Safest', color: '#3b82f6' },
              { id: 'SHORTEST' as OptimizationStrategy, label: 'Shortest', color: '#06b6d4' },
              { id: 'FASTEST' as OptimizationStrategy, label: 'Fastest', color: '#f59e0b' },
              { id: 'CUSTOM' as OptimizationStrategy, label: 'Custom', color: '#ec4899' },
            ].map((st) => {
              const isSelected = optimizationStrategy === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setOptimizationStrategy(st.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10.5px] font-mono font-bold transition-all border text-center cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Active Weights Display & Custom Sliders */}
          <div className="space-y-2.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-900 pb-1.5">
              <span>ACTIVE WEIGHT COEFFICIENTS:</span>
              <span className="text-amber-400 font-bold">{optimizationStrategy}</span>
            </div>

            {/* Distance Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-cyan-400">Distance Weight (w_dist):</span>
                <span className="text-cyan-300 font-bold">{objectiveWeights.distance.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.distance}
                onChange={(e) => setObjectiveWeights({ distance: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Energy Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-emerald-400">Energy Weight (w_energy):</span>
                <span className="text-emerald-300 font-bold">{objectiveWeights.energy.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.energy}
                onChange={(e) => setObjectiveWeights({ energy: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Solar Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-yellow-400 flex items-center gap-1">
                  <Sun className="w-2.5 h-2.5" /> Solar Shadow Avoidance (w_solar):
                </span>
                <span className="text-yellow-300 font-bold">{(objectiveWeights.solar ?? 0.0).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.solar ?? 0.0}
                onChange={(e) => setObjectiveWeights({ solar: parseFloat(e.target.value) })}
                className="w-full accent-yellow-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Slope Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-rose-400">Slope Weight (w_slope):</span>
                <span className="text-rose-300 font-bold">{objectiveWeights.slope.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.slope}
                onChange={(e) => setObjectiveWeights({ slope: parseFloat(e.target.value) })}
                className="w-full accent-rose-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Risk Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-blue-400">Safety / Risk Weight (w_risk):</span>
                <span className="text-blue-300 font-bold">{objectiveWeights.risk.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.risk}
                onChange={(e) => setObjectiveWeights({ risk: parseFloat(e.target.value) })}
                className="w-full accent-blue-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Time Weight */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-amber-400">Time Weight (w_time):</span>
                <span className="text-amber-300 font-bold">{objectiveWeights.time.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={objectiveWeights.time}
                onChange={(e) => setObjectiveWeights({ time: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. Pathfinding Algorithm */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                Autonomous Solver
              </label>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Heuristic Engine</span>
          </div>

          <div className="space-y-1.5">
            {[
              {
                id: 'ASTAR' as AlgorithmType,
                name: 'A* Search Algorithm',
                desc: 'Optimal multi-objective path with directed heuristic. Best performance.',
                tag: 'OPTIMAL',
              },
              {
                id: 'DIJKSTRA' as AlgorithmType,
                name: 'Dijkstra Exploration',
                desc: 'Uniform-cost exhaustive node expansion without directional heuristic.',
                tag: 'EXHAUSTIVE',
              },
              {
                id: 'GREEDY_BFS' as AlgorithmType,
                name: 'Greedy Best-First Search',
                desc: 'Prioritizes heuristic directly for rapid initial trajectory calculation.',
                tag: 'FASTEST',
              },
              {
                id: 'MANUAL' as AlgorithmType,
                name: 'Manual Tele-operation',
                desc: 'Human-in-the-loop manual throttle and steering control via on-screen directional pad / keyboard.',
                tag: 'MANUAL',
              },
            ].map((algo) => {
              const isSelected = selectedAlgorithm === algo.id;
              return (
                <button
                  key={algo.id}
                  onClick={() => setAlgorithm(algo.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${
                        isSelected ? 'text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      <Cpu className="w-3 h-3 text-cyan-400" />
                      {algo.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {algo.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{algo.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Obstacles & Hazards Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                Hazard Layers & Obstacles
              </label>
            </div>
            <span className="text-[10px] font-mono text-amber-400">4 Filters</span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            {/* Craters */}
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={obstacleToggles.enableCraters}
                onChange={(e) => setObstacleToggles({ enableCraters: e.target.checked })}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer accent-amber-400"
              />
              <div className="text-[11px] font-mono text-slate-300">
                <span>Craters</span>
                <span className="block text-[9px] text-slate-500">Depressions & rims</span>
              </div>
            </label>

            {/* Rocks */}
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={obstacleToggles.enableRocks}
                onChange={(e) => setObstacleToggles({ enableRocks: e.target.checked })}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer accent-amber-400"
              />
              <div className="text-[11px] font-mono text-slate-300">
                <span>Rocks</span>
                <span className="block text-[9px] text-slate-500">Boulders & debris</span>
              </div>
            </label>

            {/* Steep Slopes */}
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={obstacleToggles.enableSteepSlopes}
                onChange={(e) => setObstacleToggles({ enableSteepSlopes: e.target.checked })}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer accent-amber-400"
              />
              <div className="text-[11px] font-mono text-slate-300">
                <span>Steep Slopes</span>
                <span className="block text-[9px] text-slate-500">Incline &gt; 25°</span>
              </div>
            </label>

            {/* Danger Zones */}
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-900/60 transition-colors">
              <input
                type="checkbox"
                checked={obstacleToggles.enableDangerZones}
                onChange={(e) => setObstacleToggles({ enableDangerZones: e.target.checked })}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer accent-amber-400"
              />
              <div className="text-[11px] font-mono text-slate-300">
                <span>Danger Zones</span>
                <span className="block text-[9px] text-slate-500">PSR shadow areas</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <StrategyComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
      />
    </aside>
  );
};
