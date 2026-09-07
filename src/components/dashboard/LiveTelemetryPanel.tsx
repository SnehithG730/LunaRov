'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import {
  Gauge,
  Battery,
  Route,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Activity,
  Layers,
  ShieldAlert,
  Radar,
  TrendingDown,
} from 'lucide-react';

export const LiveTelemetryPanel: React.FC = () => {
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const terrain = useMissionStore((s) => s.terrain);
  const activePath = useMissionStore((s) => s.activePath);
  const currentWaypointIndex = useMissionStore((s) => s.currentWaypointIndex);
  const pathResult = useMissionStore((s) => s.pathResult);
  const sensorScan = useMissionStore((s) => s.sensorScan);
  const rerouteCount = useMissionStore((s) => s.rerouteCount);

  // Discrete cell coordinates
  const curCellX = Math.max(0, Math.min(terrain.width - 1, Math.round(roverState.x)));
  const curCellY = Math.max(0, Math.min(terrain.height - 1, Math.round(roverState.y)));
  const currentCell = terrain.cells[curCellY]?.[curCellX];

  // Battery metrics
  const batteryPct = roverState.batteryPercentage;
  const isBatteryLow = batteryPct <= 20.0;
  const isBatteryCritical = batteryPct <= 10.0;

  // Heading calculation (0 to 360 deg)
  let headingDeg = (roverState.heading * 180) / Math.PI;
  headingDeg = ((headingDeg % 360) + 360) % 360;

  // Calculate Remaining Distance along activePath
  let remainingDistanceMeters = 0;
  if (activePath.length > 0 && currentWaypointIndex < activePath.length) {
    let prev = { x: roverState.x, y: roverState.y };
    for (let i = currentWaypointIndex; i < activePath.length; i++) {
      const pt = activePath[i];
      const segDist = Math.hypot(pt.x - prev.x, pt.y - prev.y) * terrain.resolution;
      remainingDistanceMeters += segDist;
      prev = pt;
    }
  } else if (pathResult && pathResult.totalDistanceMeters > 0) {
    remainingDistanceMeters = Math.max(0, pathResult.totalDistanceMeters - roverState.distanceTraveledMeters);
  }

  // Elapsed Time: T+HH:MM:SS
  const totalSeconds = Math.floor(roverState.elapsedTimeSeconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const timeStr = `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Terrain Type String & Movement Cost
  const terrainTypeLabel = currentCell?.isObstacle
    ? (currentCell.slope >= 25 ? 'STEEP SLOPE' : 'CRATER / BOULDER')
    : currentCell?.slope && currentCell.slope > 12
    ? 'SLOPE'
    : (currentCell?.cost ?? 1) >= 3
    ? 'ROCKY REGOLITH'
    : 'FLAT PLAINS';

  const movementCostLabel = currentCell?.isObstacle
    ? 'INFINITY (BLOCKED)'
    : `${(currentCell?.cost ?? 1.0).toFixed(1)}x`;

  return (
    <div className="w-full space-y-3 font-mono text-xs">
      {/* 1. Header & Downlink Status */}
      <div className="aerospace-panel rounded-xl p-3 shadow-xl flex items-center justify-between corner-reticle">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">LIVE ROVER TELEMETRY</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>DOWNLINK OK</span>
        </div>
      </div>

      {/* 2. Speed & Battery Primary Gauges */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Speed Card */}
        <div className="aerospace-panel rounded-xl p-3 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-[10.5px] text-gray-400">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              SPEED
            </span>
            <span className="text-gray-500 text-[9.5px]">MAX {roverConfig.maxSpeed}m/s</span>
          </div>

          <div className="text-xl font-black text-white flex items-baseline gap-1 tabular-nums">
            <AnimatedNumber value={roverState.velocity} decimals={2} />
            <span className="text-xs text-cyan-400 font-normal">m/s</span>
          </div>

          {/* Velocity Progress Bar */}
          <div className="w-full h-1.5 bg-black/70 rounded-full overflow-hidden border border-cyan-950">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-100"
              style={{ width: `${Math.min(100, (roverState.velocity / roverConfig.maxSpeed) * 100)}%` }}
            />
          </div>
        </div>

        {/* Battery Card */}
        <div className="aerospace-panel rounded-xl p-3 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-[10.5px] text-gray-400">
            <span className="flex items-center gap-1">
              <Battery
                className={`w-3.5 h-3.5 ${
                  isBatteryCritical ? 'text-red-400 animate-bounce' : isBatteryLow ? 'text-amber-400' : 'text-emerald-400'
                }`}
              />
              BATTERY
            </span>
            <span className="text-gray-400 text-[9.5px] tabular-nums font-bold">
              <AnimatedNumber value={roverState.batteryRemainingWh} decimals={0} suffix=" Wh" />
            </span>
          </div>

          <div
            className={`text-xl font-black flex items-baseline gap-1 tabular-nums ${
              isBatteryCritical ? 'text-red-400' : isBatteryLow ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            <AnimatedNumber value={batteryPct} decimals={1} />
            <span className="text-xs font-normal">%</span>
          </div>

          {/* Battery Level Bar */}
          <div className="w-full h-1.5 bg-black/70 rounded-full overflow-hidden border border-cyan-950">
            <div
              className={`h-full transition-all duration-100 ${
                isBatteryCritical ? 'bg-red-500' : isBatteryLow ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Battery Warning Banner if low */}
      {isBatteryLow && (
        <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-200 text-[10.5px] flex items-center gap-2 animate-pulse">
          <TrendingDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{isBatteryCritical ? 'CRITICAL: Battery power under 10% reserve!' : 'WARNING: Battery reserve below 20%.'}</span>
        </div>
      )}

      {/* 3. Distance & Mission Clock Strip */}
      <div className="aerospace-panel rounded-xl p-3 shadow-xl space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Distance Travelled */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-[9.5px] text-gray-400 mb-0.5">
              <Route className="w-3 h-3 text-cyan-400" />
              <span>DISTANCE TRAVELLED</span>
            </div>
            <div className="font-extrabold text-white text-sm tabular-nums">
              <AnimatedNumber value={roverState.distanceTraveledMeters} decimals={1} suffix=" m" />
            </div>
          </div>

          {/* Remaining Distance */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-[9.5px] text-gray-400 mb-0.5">
              <Compass className="w-3 h-3 text-amber-400" />
              <span>REMAINING DISTANCE</span>
            </div>
            <div className="font-extrabold text-amber-300 text-sm tabular-nums">
              <AnimatedNumber value={remainingDistanceMeters} decimals={1} suffix=" m" />
            </div>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="bg-[#0d1424] border border-cyan-950/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>ELAPSED MISSION TIME</span>
          </div>
          <span className="font-bold text-cyan-300 tracking-widest text-xs tabular-nums">{timeStr}</span>
        </div>
      </div>

      {/* 4. Spatial Position & Inclinometer */}
      <div className="aerospace-panel rounded-xl p-3 shadow-xl space-y-2.5 corner-reticle">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-1.5 text-[10.5px]">
          <span className="flex items-center gap-1 font-bold text-gray-300">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            SPATIAL TELEMETRY
          </span>
          <span className="text-gray-500">SECTOR GRID</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* X & Y Position */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg space-y-1">
            <div className="text-[9.5px] text-gray-400">SURFACE COORDS</div>
            <div className="flex items-center justify-between text-white font-bold tabular-nums">
              <span>X: <AnimatedNumber value={roverState.x} decimals={1} /></span>
              <span>Y: <AnimatedNumber value={roverState.y} decimals={1} /></span>
            </div>
          </div>

          {/* Heading */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg space-y-1">
            <div className="text-[9.5px] text-gray-400">AZIMUTH HEADING</div>
            <div className="text-white font-bold flex items-center justify-between tabular-nums">
              <AnimatedNumber value={headingDeg} decimals={1} suffix="°" />
              <Compass
                className="w-4 h-4 text-cyan-400 transition-transform duration-100"
                style={{ transform: `rotate(${headingDeg}deg)` }}
              />
            </div>
          </div>
        </div>

        {/* Local Elevation & Pitch/Roll Incline */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Elevation */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg">
            <div className="flex items-center gap-1 text-[9.5px] text-gray-400 mb-0.5">
              <Mountain className="w-3 h-3 text-cyan-400" />
              <span>ELEVATION</span>
            </div>
            <div className="font-bold text-white tabular-nums">
              <AnimatedNumber value={currentCell?.elevation ?? 0} decimals={1} suffix=" m" />
            </div>
          </div>

          {/* Inclinometer Pitch & Roll */}
          <div className="bg-[#0d1424] border border-cyan-950/80 p-2 rounded-lg">
            <div className="text-[9.5px] text-gray-400 mb-0.5">PITCH / ROLL</div>
            <div className="font-bold text-white flex justify-between text-[10.5px] tabular-nums">
              <span className={Math.abs(roverState.pitch) > 18 ? 'text-amber-400' : 'text-gray-200'}>
                P: {roverState.pitch > 0 ? `+${roverState.pitch}` : roverState.pitch}°
              </span>
              <span className={Math.abs(roverState.roll) > 18 ? 'text-amber-400' : 'text-gray-200'}>
                R: {roverState.roll > 0 ? `+${roverState.roll}` : roverState.roll}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Terrain Classification & Movement Cost */}
      <div className="aerospace-panel rounded-xl p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-cyan-900/40 pb-1.5">
          <span className="flex items-center gap-1 font-bold text-gray-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            TERRAIN ATTRIBUTES
          </span>
          <span>FRICTION & SLOPE</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center bg-[#0d1424] border border-cyan-950 px-2.5 py-1.5 rounded-lg">
            <span className="text-gray-400">CURRENT TERRAIN:</span>
            <strong className="text-cyan-300 font-bold">{terrainTypeLabel}</strong>
          </div>

          <div className="flex justify-between items-center bg-[#0d1424] border border-cyan-950 px-2.5 py-1.5 rounded-lg">
            <span className="text-gray-400">MOVEMENT COST:</span>
            <strong className="text-amber-300 font-bold">{movementCostLabel}</strong>
          </div>
        </div>

        {/* LiDAR Radar Scan State */}
        <div className="bg-[#0d1424] border border-cyan-950 px-2.5 py-2 rounded-lg flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            <span>LIDAR HAZARD:</span>
          </div>
          {sensorScan?.hasHazardAhead ? (
            <span className="text-amber-400 font-bold flex items-center gap-1 text-[10.5px]">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              HAZARD {sensorScan.closestHazardDistMeters}m (REROUTES: {rerouteCount})
            </span>
          ) : (
            <span className="text-emerald-400 font-bold text-[10.5px]">CLEAR</span>
          )}
        </div>
      </div>
    </div>
  );
};
