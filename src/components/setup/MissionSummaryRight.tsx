'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMissionStore } from '@/core/simulation/missionStore';
import { TERRAIN_PRESETS } from '@/core/terrain/TerrainPresets';
import {
  Activity,
  Play,
  RotateCcw,
  Zap,
  Battery,
  MapPin,
  Target,
  Compass,
  Mountain,
  AlertCircle,
  Cpu,
  ArrowRight,
  TrendingUp,
  Timer,
} from 'lucide-react';

export const MissionSummaryRight: React.FC = () => {
  const router = useRouter();
  const {
    missionName,
    terrain,
    roverConfig,
    selectedAlgorithm,
    startPoint,
    targetPoint,
    pathResult,
    computePath,
    regenerateTerrain,
    validateMission,
  } = useMissionStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const presetMeta = TERRAIN_PRESETS[terrain.type];

  // Start & Target cell details
  const startCell =
    startPoint.y >= 0 &&
    startPoint.y < terrain.height &&
    startPoint.x >= 0 &&
    startPoint.x < terrain.width
      ? terrain.cells[startPoint.y][startPoint.x]
      : null;

  const targetCell =
    targetPoint.y >= 0 &&
    targetPoint.y < terrain.height &&
    targetPoint.x >= 0 &&
    targetPoint.x < terrain.width
      ? terrain.cells[targetPoint.y][targetPoint.x]
      : null;

  // Real Euclidean straight-line distance
  const straightLineDistanceMeters = Math.hypot(
    (targetPoint.x - startPoint.x) * terrain.resolution,
    (targetPoint.y - startPoint.y) * terrain.resolution
  );

  // Computed or estimated trajectory distance
  const effectiveDistanceMeters = pathResult && pathResult.success
    ? pathResult.totalDistanceMeters
    : straightLineDistanceMeters * 1.25;

  // Estimated energy drain based on terrain characteristics and rover efficiency
  const avgSlopeEstimate = terrain.type === 'SOUTH_POLE' ? 18 : terrain.type === 'CRATER_FIELD' ? 12 : 5;
  const baseWatts = 180 + avgSlopeEstimate * 8;
  const estimatedSpeed = roverConfig.maxSpeed * 0.75;
  const estimatedTimeSec = effectiveDistanceMeters / Math.max(0.5, estimatedSpeed);
  const rawEnergyWh = (baseWatts * (estimatedTimeSec / 3600)) / roverConfig.movementEfficiency;
  const estimatedBatteryUsageWh = pathResult && pathResult.estimatedEnergyWh > 0
    ? pathResult.estimatedEnergyWh
    : Number(rawEnergyWh.toFixed(1));

  const batteryUsagePct = Math.min(
    100,
    Number(((estimatedBatteryUsageWh / roverConfig.batteryCapacityWh) * 100).toFixed(1))
  );

  // Handle Calculate Path Action
  const handleCalculatePath = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const res = computePath();
      setIsCalculating(false);
      if (!res || !res.success) {
        setValidationErrors([res?.failureReason || 'Path planning failed to find traversable route.']);
      } else {
        setValidationErrors([]);
      }
    }, 120);
  };

  // Handle Start Simulation Action
  const handleStartSimulation = () => {
    const validation = validateMission();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setShowValidationModal(true);
      return;
    }

    // If autonomous algorithm and path not computed yet, compute first
    if (selectedAlgorithm !== 'MANUAL' && (!pathResult || !pathResult.success)) {
      const res = computePath();
      if (!res || !res.success) {
        setValidationErrors([res?.failureReason || 'Path planning failed to find traversable route.']);
        setShowValidationModal(true);
        return;
      }
    }

    // Navigate to live simulator
    router.push('/simulator');
  };

  const isStartHazard = startCell ? startCell.isObstacle || startCell.slope >= 25 : false;
  const isTargetHazard = targetCell ? targetCell.isObstacle || targetCell.slope >= 25 : false;
  const hasHazardConflict = isStartHazard || isTargetHazard;

  return (
    <aside className="h-full flex flex-col bg-[#0b101b]/95 border-l border-slate-800 overflow-y-auto custom-scrollbar select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
              Mission Summary
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/30">
            {selectedAlgorithm}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Mission Title Card */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Target Mission</div>
          <div className="text-sm font-mono font-bold text-slate-100 truncate">{missionName || 'LunaRov Mission 01'}</div>
          <div className="text-[10px] font-mono text-slate-500">Sector ID: SEC-{(terrain.seed % 9999).toString().padStart(4, '0')}</div>
        </div>

        {/* Hazard Warning Banner if coordinate on obstacle */}
        {hasHazardConflict && (
          <div className="bg-rose-500/10 border border-rose-500/50 p-3 rounded-lg flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] font-mono leading-relaxed">
              <span className="font-bold block text-rose-200">Hazard Warning</span>
              {isStartHazard && 'Start coordinates are located on an impassable obstacle/cliff. '}
              {isTargetHazard && 'Destination coordinates are inside a hazardous crater/boulder.'}
            </div>
          </div>
        )}

        {/* 1. Terrain Summary */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-amber-400" /> Terrain Sector
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                presetMeta.traversabilityRating === 'EASY'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : presetMeta.traversabilityRating === 'MODERATE'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : presetMeta.traversabilityRating === 'DIFFICULT'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {presetMeta.traversabilityRating}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400 text-[11px]">Preset:</span>
              <span className="text-slate-200 font-semibold">{presetMeta.name}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Analogue:</span>
              <span className="text-slate-400 truncate max-w-[150px]" title={presetMeta.lunarAnalogue}>
                {presetMeta.lunarAnalogue.split('(')[0]}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Grid Bounds:</span>
              <span className="text-slate-300">{terrain.width}x{terrain.height} ({(terrain.width * terrain.resolution).toFixed(0)}m²)</span>
            </div>
          </div>
        </div>

        {/* 2. Rover Summary */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Rover Specifications
            </span>
            <span className="text-[10px] text-amber-400 font-mono">{roverConfig.name}</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono text-xs grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block">Max Speed:</span>
              <span className="text-cyan-300 font-semibold">{roverConfig.maxSpeed.toFixed(1)} m/s</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Capacity:</span>
              <span className="text-emerald-300 font-semibold">{roverConfig.batteryCapacityWh} Wh</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Acceleration:</span>
              <span className="text-amber-300 font-semibold">{roverConfig.acceleration.toFixed(1)} m/s²</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Efficiency:</span>
              <span className="text-purple-300 font-semibold">{roverConfig.movementEfficiency.toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* 3. Coordinates & Navigation Waypoints */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Navigation Waypoints
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">{selectedAlgorithm}</span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-mono text-xs space-y-2">
            {/* Start point */}
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-300 text-[11px]">Start:</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-300 font-semibold">[{startPoint.x}, {startPoint.y}]</span>
                <span className="text-[10px] text-slate-500 ml-1.5">({startCell ? startCell.elevation.toFixed(1) : 0}m)</span>
              </div>
            </div>

            {/* Target point */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-3 h-3 text-amber-400" />
                <span className="text-slate-300 text-[11px]">Destination:</span>
              </div>
              <div className="text-right">
                <span className="text-amber-300 font-semibold">[{targetPoint.x}, {targetPoint.y}]</span>
                <span className="text-[10px] text-slate-500 ml-1.5">({targetCell ? targetCell.elevation.toFixed(1) : 0}m)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Estimated Metrics */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Mission Projections
            </span>
            {pathResult?.success && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                VERIFIED
              </span>
            )}
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 font-mono space-y-2.5">
            {/* Distance */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-slate-500" /> Estimated Distance:
              </span>
              <span className="text-cyan-300 font-bold">{effectiveDistanceMeters.toFixed(1)} m</span>
            </div>

            {/* Battery Drain */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Battery className="w-3 h-3 text-emerald-400" /> Estimated Power Usage:
                </span>
                <span className="text-emerald-300 font-bold">
                  {estimatedBatteryUsageWh.toFixed(1)} Wh ({batteryUsagePct}%)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    batteryUsagePct > 80
                      ? 'bg-rose-500'
                      : batteryUsagePct > 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, batteryUsagePct)}%` }}
                />
              </div>
            </div>

            {/* Estimated Duration */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Timer className="w-3 h-3 text-slate-500" /> Estimated Duration:
              </span>
              <span className="text-slate-200">
                {Math.floor(estimatedTimeSec / 60)}m {Math.round(estimatedTimeSec % 60)}s
              </span>
            </div>

            {/* Path status if calculated */}
            {pathResult && (
              <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex justify-between">
                <span>Explored Nodes: {pathResult.nodesExploredCount}</span>
                <span>Compute: {pathResult.computeTimeMs}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Console */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 space-y-2.5 sticky bottom-0 z-10 backdrop-blur-md">
        {/* Generate Terrain Button */}
        <button
          onClick={() => regenerateTerrain()}
          className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>GENERATE TERRAIN</span>
        </button>

        {/* Calculate Path Button */}
        <button
          onClick={handleCalculatePath}
          disabled={isCalculating || selectedAlgorithm === 'MANUAL'}
          className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
            selectedAlgorithm === 'MANUAL'
              ? 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
              : isCalculating
              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800 animate-pulse'
              : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isCalculating ? 'CALCULATING TRAJECTORY...' : 'CALCULATE PATH'}</span>
        </button>

        {/* Start Simulation Button */}
        <button
          onClick={handleStartSimulation}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-[0.99] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>START SIMULATION</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>MISSION CONFIGURATION ERROR</span>
            </div>
            <div className="text-xs font-mono text-slate-300 space-y-2">
              <p className="text-slate-400">The mission cannot be launched due to the following constraint violations:</p>
              <ul className="list-disc pl-5 space-y-1 text-rose-300">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-all cursor-pointer"
              >
                Close & Modify Config
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
