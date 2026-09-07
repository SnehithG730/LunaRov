'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Zap, TrendingUp } from 'lucide-react';

export const TelemetryCharts: React.FC = () => {
  const telemetryHistory = useMissionStore((s) => s.telemetryHistory);

  const points = telemetryHistory.slice(-60); // Show last 60 samples
  const hasData = points.length > 2;

  // Chart 1: Power Draw (Watts)
  const maxPower = Math.max(120, ...points.map((p) => p.powerDrawWatts));
  const powerPolyline = points
    .map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 300;
      const y = 80 - (p.powerDrawWatts / maxPower) * 70;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Chart 2: Elevation Profile (Meters)
  const minElev = Math.min(0, ...points.map((p) => p.elevation));
  const maxElev = Math.max(20, ...points.map((p) => p.elevation));
  const elevRange = Math.max(10, maxElev - minElev);

  const elevPolyline = points
    .map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 300;
      const y = 80 - ((p.elevation - minElev) / elevRange) * 70;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const latestPoint = points[points.length - 1];

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-lg space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">STRIP CHART ANALYTICS</span>
        </div>
        <span className="text-[10px] text-gray-400">ROLLING BUFFER (60 SAMPLES)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Power Draw Chart */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>POWER DRAW:</span>
            </span>
            <span className="text-amber-300 font-bold">
              {latestPoint ? `${latestPoint.powerDrawWatts.toFixed(1)} W` : '0 W'}
            </span>
          </div>

          <div className="h-24 w-full bg-black/50 rounded overflow-hidden relative border border-cyan-950">
            {hasData ? (
              <svg viewBox="0 0 300 85" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  points={powerPolyline}
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] text-gray-600">
                AWAITING MOTOR TELEMETRY
              </div>
            )}
            <div className="absolute top-1 right-2 text-[8px] text-gray-500">MAX {maxPower.toFixed(0)}W</div>
          </div>
        </div>

        {/* Elevation Profile Chart */}
        <div className="bg-[#0e1628] border border-cyan-950 p-2.5 rounded-lg space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span>ELEVATION PROFILE:</span>
            </span>
            <span className="text-cyan-300 font-bold">
              {latestPoint ? `${latestPoint.elevation.toFixed(1)} m` : '0 m'}
            </span>
          </div>

          <div className="h-24 w-full bg-black/50 rounded overflow-hidden relative border border-cyan-950">
            {hasData ? (
              <svg viewBox="0 0 300 85" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2"
                  points={elevPolyline}
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] text-gray-600">
                AWAITING TOPOGRAPHIC DATA
              </div>
            )}
            <div className="absolute top-1 right-2 text-[8px] text-gray-500">PEAK {maxElev.toFixed(0)}m</div>
          </div>
        </div>
      </div>
    </div>
  );
};
