'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Battery, Gauge, Compass, Radar, ShieldAlert, Activity } from 'lucide-react';

export const TelemetryHUD: React.FC = () => {
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const terrain = useMissionStore((s) => s.terrain);
  const sensorScan = useMissionStore((s) => s.sensorScan);
  const rerouteCount = useMissionStore((s) => s.rerouteCount);

  const curCellX = Math.max(0, Math.min(terrain.width - 1, Math.round(roverState.x)));
  const curCellY = Math.max(0, Math.min(terrain.height - 1, Math.round(roverState.y)));
  const currentCell = terrain.cells[curCellY]?.[curCellX];

  const batteryPct = roverState.batteryPercentage;
  const isBatteryLow = batteryPct <= 15.0;

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-xl space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">LIVE TELEMETRY STREAM</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-semibold animate-pulse">50 Hz TELEMETRY LINK</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Speedometer */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              SPEED
            </span>
            <span className="text-gray-500">MAX {roverConfig.maxSpeed}m/s</span>
          </div>
          <div className="text-lg font-bold text-white">
            {roverState.velocity.toFixed(2)} <span className="text-xs text-cyan-400 font-normal">m/s</span>
          </div>
          {/* Velocity Progress Bar */}
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-75"
              style={{ width: `${Math.min(100, (roverState.velocity / roverConfig.maxSpeed) * 100)}%` }}
            />
          </div>
        </div>

        {/* Battery State of Charge */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Battery className={`w-3 h-3 ${isBatteryLow ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
              BATTERY
            </span>
            <span className="text-gray-500">{roverState.batteryRemainingWh.toFixed(0)} Wh</span>
          </div>
          <div className={`text-lg font-bold ${isBatteryLow ? 'text-red-400' : 'text-amber-300'}`}>
            {batteryPct.toFixed(1)} <span className="text-xs font-normal">%</span>
          </div>
          {/* Battery Bar */}
          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isBatteryLow ? 'bg-red-500' : batteryPct < 35 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>

        {/* Pitch & Roll Inclinometer */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              INCLINE
            </span>
            <span className={Math.abs(roverState.pitch) > 18 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {roverState.pitch > 0 ? `+${roverState.pitch}°` : `${roverState.pitch}°`}
            </span>
          </div>
          <div className="text-xs text-gray-300 flex justify-between">
            <span>PITCH: <strong className="text-white">{roverState.pitch}°</strong></span>
            <span>ROLL: <strong className="text-white">{roverState.roll}°</strong></span>
          </div>
          {/* Artificial Horizon Tilt Line */}
          <div className="w-full h-1.5 bg-black/60 rounded-full relative overflow-hidden flex items-center justify-center">
            <div
              className={`h-0.5 w-8 transition-transform ${
                Math.abs(roverState.roll) > 18 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ transform: `rotate(${roverState.roll}deg)` }}
            />
          </div>
        </div>

        {/* LiDAR Proximity Radar */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Radar className="w-3 h-3 text-cyan-400" />
              LIDAR PROXIMITY
            </span>
            <span>REROUTES: <strong className="text-white">{rerouteCount}</strong></span>
          </div>
          <div className="text-lg font-bold">
            {sensorScan?.hasHazardAhead ? (
              <span className="text-amber-400 flex items-center gap-1 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                HAZARD {sensorScan.closestHazardDistMeters}m
              </span>
            ) : (
              <span className="text-emerald-400 text-sm">SECTOR CLEAR</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">
            Sensor Arc: {roverConfig.sensorRangeMeters}m @ {roverConfig.sensorFovDeg}° FOV
          </div>
        </div>
      </div>

      {/* Traversal Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-cyan-950 text-[10px] text-gray-400">
        <div>DISTANCE TRAVELED: <strong className="text-white">{roverState.distanceTraveledMeters.toFixed(1)} m</strong></div>
        <div>LOCAL ELEVATION: <strong className="text-white">{currentCell?.elevation.toFixed(1) ?? 0} m</strong></div>
        <div>TERRAIN SLOPE: <strong className="text-white">{currentCell?.slope.toFixed(1) ?? 0}°</strong></div>
        <div>HEADING: <strong className="text-white">{((roverState.heading * 180) / Math.PI).toFixed(1)}°</strong></div>
      </div>
    </div>
  );
};
