'use client';

import React, { useRef, useEffect } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Map, Flag, Target, Compass } from 'lucide-react';

export const FinalLunarMapPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrain = useMissionStore((s) => s.terrain);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const activePath = useMissionStore((s) => s.activePath);
  const telemetryHistory = useMissionStore((s) => s.telemetryHistory);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / terrain.width;
    const cellH = height / terrain.height;

    // 1. Render Topographic Terrain Background
    let minElev = Infinity;
    let maxElev = -Infinity;
    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const e = terrain.cells[y][x].elevation;
        if (e < minElev) minElev = e;
        if (e > maxElev) maxElev = e;
      }
    }
    const elevSpan = Math.max(1, maxElev - minElev);

    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const cell = terrain.cells[y][x];
        const normElev = (cell.elevation - minElev) / elevSpan;

        if (cell.isObstacle) {
          ctx.fillStyle = cell.slope >= 25 ? '#3b1212' : '#221818'; // Impassable crater or boulder
        } else {
          const shade = Math.floor(12 + normElev * 48);
          ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 12})`;
        }
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // 2. Draw Subtle Grid Overlay
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= terrain.width; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, height);
      ctx.stroke();
    }
    for (let y = 0; y <= terrain.height; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(width, y * cellH);
      ctx.stroke();
    }

    // 3. Draw Planned Route (Cyan Technical Line)
    if (activePath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;

      ctx.moveTo((activePath[0].x + 0.5) * cellW, (activePath[0].y + 0.5) * cellH);
      for (let i = 1; i < activePath.length; i++) {
        ctx.lineTo((activePath[i].x + 0.5) * cellW, (activePath[i].y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow
    }

    // 4. Draw Actual Traversed Trajectory (Emerald/Yellow Trail)
    if (telemetryHistory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]); // Dashed line for actual trajectory
      ctx.moveTo((telemetryHistory[0].x + 0.5) * cellW, (telemetryHistory[0].y + 0.5) * cellH);
      for (let i = 1; i < telemetryHistory.length; i++) {
        ctx.lineTo((telemetryHistory[i].x + 0.5) * cellW, (telemetryHistory[i].y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // 5. Draw Start Marker (Green Ring & Node)
    const startX = (startPoint.x + 0.5) * cellW;
    const startY = (startPoint.y + 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(startX, startY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Draw Target Destination Marker (Red Target Ring)
    const targetX = (targetPoint.x + 0.5) * cellW;
    const targetY = (targetPoint.y + 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  }, [terrain, startPoint, targetPoint, activePath, telemetryHistory]);

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">FINAL LUNAR TRAJECTORY MAP</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5 text-gray-300">
            <span className="w-3 h-0.5 bg-cyan-400 shadow-sm shadow-cyan-400 inline-block" />
            <span>Planned Path</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            <span className="w-3 h-0.5 bg-emerald-400 border-b border-dashed inline-block" />
            <span>Actual Route</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Flag className="w-3 h-3" />
            <span>Start [{startPoint.x}, {startPoint.y}]</span>
          </div>
          <div className="flex items-center gap-1 text-red-400">
            <Target className="w-3 h-3" />
            <span>Target [{targetPoint.x}, {targetPoint.y}]</span>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full aspect-square sm:aspect-[16/10] max-h-[360px] bg-black/80 rounded-xl overflow-hidden border border-cyan-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={380}
          className="w-full h-full object-contain"
        />

        {/* Top-Right Sector Compass */}
        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 border border-cyan-900/50 flex items-center gap-1.5 text-[9.5px] text-cyan-300">
          <Compass className="w-3.5 h-3.5" />
          <span>NORTH 000°</span>
        </div>
      </div>
    </div>
  );
};
