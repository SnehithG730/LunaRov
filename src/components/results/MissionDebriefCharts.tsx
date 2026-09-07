'use client';

import React, { useState } from 'react';
import { TelemetryPoint } from '@/types/rover';
import { Battery, Gauge, Route } from 'lucide-react';

interface MissionDebriefChartsProps {
  telemetryLog: TelemetryPoint[];
  batteryCapacityWh?: number;
}

export const MissionDebriefCharts: React.FC<MissionDebriefChartsProps> = ({
  telemetryLog,
  batteryCapacityWh = 1200,
}) => {
  const [activeChart, setActiveChart] = useState<'ALL' | 'BATTERY' | 'SPEED' | 'DISTANCE'>('ALL');

  const points = telemetryLog && telemetryLog.length > 0 ? telemetryLog : [];
  const hasData = points.length > 1;

  // Chart 1: Battery Over Time (Wh and %)
  const minBattery = points.length > 0 ? Math.min(...points.map((p) => p.batteryPct)) : 100;
  const maxBattery = 100;
  const batteryPolyline = points
    .map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 360;
      const y = 90 - ((p.batteryPct - Math.max(0, minBattery - 10)) / (maxBattery - Math.max(0, minBattery - 10) || 1)) * 75;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Chart 2: Rover Speed Over Time (m/s)
  const maxSpeed = Math.max(2.5, ...points.map((p) => p.speed));
  const speedPolyline = points
    .map((p, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 360;
      const y = 90 - (p.speed / (maxSpeed || 1)) * 75;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const speedAreaPoints = hasData
    ? `0,90 ${speedPolyline} 360,90`
    : '';

  // Chart 3: Distance Over Time (Meters)
  // Calculate cumulative distance from xy points if needed
  let cumDist = 0;
  const distPoints: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const prev = points[i - 1];
      const curr = points[i];
      cumDist += Math.hypot(curr.x - prev.x, curr.y - prev.y) * 2.0; // 2m resolution
    }
    distPoints.push(cumDist);
  }

  const maxDistance = Math.max(10, ...distPoints);
  const distPolyline = distPoints
    .map((d, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 360;
      const y = 90 - (d / (maxDistance || 1)) * 75;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const distAreaPoints = hasData
    ? `0,90 ${distPolyline} 360,90`
    : '';

  const finalPoint = points[points.length - 1];
  const initialBattery = points[0]?.batteryPct ?? 100;
  const finalBattery = finalPoint?.batteryPct ?? 100;
  const batteryUsedPct = Math.max(0, initialBattery - finalBattery);
  const batteryUsedWh = (batteryUsedPct / 100) * batteryCapacityWh;

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-4 shadow-xl space-y-4 font-mono text-xs">
      {/* Header & View Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">MISSION TELEMETRY CHARTS</span>
          <span className="text-[10px] text-gray-500 font-normal">({points.length} telemetry samples)</span>
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'BATTERY', 'SPEED', 'DISTANCE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveChart(tab)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                activeChart === tab
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60'
                  : 'text-gray-400 hover:text-white bg-[#0d1424] border border-cyan-950'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Main Charts Grid */}
      <div className={`grid gap-3 ${activeChart === 'ALL' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
        {/* 1. BATTERY OVER TIME */}
        {(activeChart === 'ALL' || activeChart === 'BATTERY') && (
          <div className="bg-[#0d1424] border border-cyan-950 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-bold flex items-center gap-1.5 text-[11px]">
                <Battery className="w-3.5 h-3.5 text-amber-400" />
                BATTERY OVER TIME
              </span>
              <span className="text-amber-300 font-bold text-[11px]">
                {finalPoint ? `${finalPoint.batteryPct.toFixed(1)}%` : '100%'}
              </span>
            </div>

            <div className="h-32 w-full bg-black/60 rounded-lg p-1.5 relative border border-cyan-950 overflow-hidden flex flex-col justify-between">
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
              </div>

              {hasData ? (
                <svg viewBox="0 0 360 95" className="w-full h-full relative z-10" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={batteryPolyline}
                  />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-gray-500">
                  NO TELEMETRY RECORDED
                </div>
              )}

              <div className="flex justify-between text-[9px] text-gray-500 relative z-10 px-1">
                <span>Start: 100%</span>
                <span>Used: {batteryUsedWh.toFixed(1)} Wh</span>
                <span>Final: {finalBattery.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. ROVER SPEED OVER TIME */}
        {(activeChart === 'ALL' || activeChart === 'SPEED') && (
          <div className="bg-[#0d1424] border border-cyan-950 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-bold flex items-center gap-1.5 text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                ROVER SPEED OVER TIME
              </span>
              <span className="text-cyan-300 font-bold text-[11px]">
                {finalPoint ? `${finalPoint.speed.toFixed(2)} m/s` : '0.00 m/s'}
              </span>
            </div>

            <div className="h-32 w-full bg-black/60 rounded-lg p-1.5 relative border border-cyan-950 overflow-hidden flex flex-col justify-between">
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
              </div>

              {hasData ? (
                <svg viewBox="0 0 360 95" className="w-full h-full relative z-10" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon fill="url(#speedGrad)" points={speedAreaPoints} />
                  <polyline
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={speedPolyline}
                  />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-gray-500">
                  NO TELEMETRY RECORDED
                </div>
              )}

              <div className="flex justify-between text-[9px] text-gray-500 relative z-10 px-1">
                <span>0.0 m/s</span>
                <span>Peak: {maxSpeed.toFixed(2)} m/s</span>
                <span>Live Active</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. DISTANCE OVER TIME */}
        {(activeChart === 'ALL' || activeChart === 'DISTANCE') && (
          <div className="bg-[#0d1424] border border-cyan-950 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-bold flex items-center gap-1.5 text-[11px]">
                <Route className="w-3.5 h-3.5 text-emerald-400" />
                DISTANCE OVER TIME
              </span>
              <span className="text-emerald-300 font-bold text-[11px]">
                {maxDistance.toFixed(1)} m
              </span>
            </div>

            <div className="h-32 w-full bg-black/60 rounded-lg p-1.5 relative border border-cyan-950 overflow-hidden flex flex-col justify-between">
              {/* Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none opacity-20">
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
                <div className="border-b border-cyan-500 border-dashed" />
              </div>

              {hasData ? (
                <svg viewBox="0 0 360 95" className="w-full h-full relative z-10" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon fill="url(#distGrad)" points={distAreaPoints} />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={distPolyline}
                  />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-gray-500">
                  NO TELEMETRY RECORDED
                </div>
              )}

              <div className="flex justify-between text-[9px] text-gray-500 relative z-10 px-1">
                <span>0.0 m</span>
                <span>Cumulative</span>
                <span>Total: {maxDistance.toFixed(1)} m</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
