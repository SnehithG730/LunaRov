'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { TERRAIN_PALETTES } from '@/lib/constants';

interface MapView2DProps {
  clickMode?: 'NONE' | 'SET_START' | 'SET_TARGET' | 'BRUSH';
}

export const MapView2D: React.FC<MapView2DProps> = ({ clickMode = 'NONE' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const terrain = useMissionStore((s) => s.terrain);
  const roverState = useMissionStore((s) => s.roverState);
  const roverConfig = useMissionStore((s) => s.roverConfig);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const activePath = useMissionStore((s) => s.activePath);
  const pathResult = useMissionStore((s) => s.pathResult);
  const currentWaypointIndex = useMissionStore((s) => s.currentWaypointIndex);
  const editorBrush = useMissionStore((s) => s.editorBrush);
  const sensorScan = useMissionStore((s) => s.sensorScan);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const setStartPoint = useMissionStore((s) => s.setStartPoint);
  const setTargetPoint = useMissionStore((s) => s.setTargetPoint);
  const applyBrushAt = useMissionStore((s) => s.applyBrushAt);

  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    elevation: number;
    slope: number;
    cost: number;
    isObstacle: boolean;
  } | null>(null);

  const isMouseDownRef = useRef(false);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / terrain.width;
    const cellH = height / terrain.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Terrain Elevation Cells
    const { minElevation, maxElevation } = terrain;
    const elevRange = Math.max(1, maxElevation - minElevation);

    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const cell = terrain.cells[y][x];
        const normElev = (cell.elevation - minElevation) / elevRange; // 0 to 1

        if (cell.isObstacle) {
          // Dark hazard zone with hazard hatch
          ctx.fillStyle = '#1e1014';
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);

          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x * cellW + cellW * 0.25, y * cellH + cellH * 0.25, cellW * 0.5, cellH * 0.5);
        } else {
          // Lunar monochromatic elevation gradient: dark crater floor to bright highland
          const brightness = Math.floor(18 + normElev * 95);
          const r = Math.min(255, Math.floor(brightness * 0.9));
          const g = Math.min(255, Math.floor(brightness * 0.95));
          const b = Math.min(255, Math.floor(brightness * 1.1));

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);

          // Slope hazard shading (yellow/amber tint if slope > 15°)
          if (cell.slope > 15.0) {
            const hazardAlpha = Math.min(0.65, (cell.slope - 15) / 10);
            ctx.fillStyle = `rgba(245, 158, 11, ${hazardAlpha})`;
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }
    }

    // 2. Subtle Grid Lines (every 5 cells)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
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

    // 3. Draw Explored Nodes (Frontier search visualization)
    if (pathResult && pathResult.exploredNodes && pathResult.exploredNodes.length > 0) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      for (const node of pathResult.exploredNodes) {
        ctx.fillRect(node.x * cellW + 1, node.y * cellH + 1, cellW - 2, cellH - 2);
      }
    }

    // 4. Draw Travelled Path (Secondary Line)
    const telemetryHistory = useMissionStore.getState().telemetryHistory;
    if (telemetryHistory.length > 1) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i < telemetryHistory.length; i++) {
        const pt = telemetryHistory[i];
        const px = (pt.x / terrain.resolution + 0.5) * cellW;
        const py = (pt.y / terrain.resolution + 0.5) * cellH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // 5. Draw Planned Path (Curved-and-Straight Aerospace Trajectory)
    if (activePath.length > 1) {
      // 5a. Traversal line: smooth curve interpolation along active path
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.2;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.75)';
      ctx.shadowBlur = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const p0 = activePath[0];
      ctx.moveTo((p0.x + 0.5) * cellW, (p0.y + 0.5) * cellH);

      for (let i = 1; i < activePath.length - 1; i++) {
        const pCurr = activePath[i];
        const pNext = activePath[i + 1];
        const currX = (pCurr.x + 0.5) * cellW;
        const currY = (pCurr.y + 0.5) * cellH;
        const nextX = (pNext.x + 0.5) * cellW;
        const nextY = (pNext.y + 0.5) * cellH;
        const midX = (currX + nextX) / 2;
        const midY = (currY + nextY) / 2;
        ctx.quadraticCurveTo(currX, currY, midX, midY);
      }

      const pLast = activePath[activePath.length - 1];
      ctx.lineTo((pLast.x + 0.5) * cellW, (pLast.y + 0.5) * cellH);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // 5b. Animated Flowing Directional Pulse Dash
      const dashOffset = (Date.now() * 0.02) % 16;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -dashOffset;

      ctx.beginPath();
      ctx.moveTo((p0.x + 0.5) * cellW, (p0.y + 0.5) * cellH);
      for (let i = 1; i < activePath.length - 1; i++) {
        const pCurr = activePath[i];
        const pNext = activePath[i + 1];
        const midX = ((pCurr.x + pNext.x) * 0.5 + 0.5) * cellW;
        const midY = ((pCurr.y + pNext.y) * 0.5 + 0.5) * cellH;
        ctx.quadraticCurveTo((pCurr.x + 0.5) * cellW, (pCurr.y + 0.5) * cellH, midX, midY);
      }
      ctx.lineTo((pLast.x + 0.5) * cellW, (pLast.y + 0.5) * cellH);
      ctx.stroke();
      ctx.restore();

      // 5c. Safe Waypoint Guidance Markers
      ctx.fillStyle = '#00f0ff';
      const step = Math.max(1, Math.floor(activePath.length / 25));
      for (let i = currentWaypointIndex; i < activePath.length; i += step) {
        const pt = activePath[i];
        ctx.beginPath();
        ctx.arc((pt.x + 0.5) * cellW, (pt.y + 0.5) * cellH, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // 6. LiDAR Sensor Vision Cone
    const roverPx = (roverState.x + 0.5) * cellW;
    const roverPy = (roverState.y + 0.5) * cellH;
    const sensorRangePx = (roverConfig.sensorRangeMeters / terrain.resolution) * cellW;
    const halfFovRad = ((roverConfig.sensorFovDeg * 0.5) * Math.PI) / 180;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(roverPx, roverPy);
    ctx.arc(
      roverPx,
      roverPy,
      sensorRangePx,
      roverState.heading - halfFovRad,
      roverState.heading + halfFovRad
    );
    ctx.closePath();
    ctx.fillStyle = sensorScan?.hasHazardAhead ? 'rgba(239, 68, 68, 0.22)' : 'rgba(0, 240, 255, 0.14)';
    ctx.fill();
    ctx.strokeStyle = sensorScan?.hasHazardAhead ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 6b. Active Hazard Detection & Tracking Reticle
    if (sensorScan?.hasHazardAhead && sensorScan.hazardCell) {
      const hzCell = sensorScan.hazardCell;
      const hzPx = (hzCell.x + 0.5) * cellW;
      const hzPy = (hzCell.y + 0.5) * cellH;

      const isCrater = sensorScan.hazardType === 'SUPER_INCLINED_CRATER' || sensorScan.hazardType === 'CRATER_RIM';
      const isSlope = sensorScan.hazardType === 'STEEP_SLOPE';
      const isGlitch = sensorScan.hazardType === 'GLITCHY_TERRAIN';
      const color = isCrater ? '#f43f5e' : isSlope ? '#f59e0b' : isGlitch ? '#a855f7' : '#ef4444';

      ctx.save();
      // Laser tracking dashed line from rover to hazard
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(roverPx, roverPy);
      ctx.lineTo(hzPx, hzPy);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Hazard reticle circle & crosshairs
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hzPx, hzPy, cellW * 0.75, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hzPx - cellW * 0.9, hzPy);
      ctx.lineTo(hzPx + cellW * 0.9, hzPy);
      ctx.moveTo(hzPx, hzPy - cellH * 0.9);
      ctx.lineTo(hzPx, hzPy + cellH * 0.9);
      ctx.stroke();

      // Hazard classification pill badge
      const label = `⚠️ ${sensorScan.hazardType?.replace(/_/g, ' ') || 'HAZARD'} (${sensorScan.closestHazardDistMeters}m)`;
      ctx.font = 'bold 9.5px monospace';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(8, 13, 26, 0.92)';
      ctx.fillRect(hzPx - textWidth / 2 - 5, hzPy - cellH * 1.3 - 11, textWidth + 10, 15);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(hzPx - textWidth / 2 - 5, hzPy - cellH * 1.3 - 11, textWidth + 10, 15);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(label, hzPx, hzPy - cellH * 1.3);
      ctx.restore();
    }

    // 6c. AI Autonomous Rerouting Status Banner
    if (simulationStatus === 'REROUTING') {
      ctx.save();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
      ctx.font = 'bold 10.5px monospace';
      const bannerText = '⚡ AI PATH REALIGNMENT ENGAGED: CALCULATING DETOUR...';
      const bWidth = ctx.measureText(bannerText).width;
      ctx.fillRect(width / 2 - bWidth / 2 - 8, 8, bWidth + 16, 20);
      ctx.fillStyle = '#040711';
      ctx.textAlign = 'center';
      ctx.fillText(bannerText, width / 2, 22);
      ctx.restore();
    }

    // 7. Draw Start Coordinate Beacon (Green)
    const startPx = (startPoint.x + 0.5) * cellW;
    const startPy = (startPoint.y + 0.5) * cellH;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(startPx, startPy, cellW * 0.65, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8. Draw Target Destination Beacon (Red)
    const targetPx = (targetPoint.x + 0.5) * cellW;
    const targetPy = (targetPoint.y + 0.5) * cellH;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, cellW * 0.65, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulse target ring (Red)
    const pulseRadius = cellW * 1.3;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(targetPx, targetPy, pulseRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // 9. Draw Rover Vehicle
    ctx.save();
    ctx.translate(roverPx, roverPy);
    ctx.rotate(roverState.heading);

    // Rover chassis body
    ctx.fillStyle = roverState.hasCrashed ? '#ef4444' : '#e2e8f0';
    ctx.fillRect(-cellW * 0.45, -cellH * 0.35, cellW * 0.9, cellH * 0.7);

    // Rover front nose accent (cyan)
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cellW * 0.25, -cellH * 0.2, cellW * 0.2, cellH * 0.4);

    // Wheels (4 corner treads)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-cellW * 0.45, -cellH * 0.5, cellW * 0.3, cellH * 0.18);
    ctx.fillRect(cellW * 0.15, -cellH * 0.5, cellW * 0.3, cellH * 0.18);
    ctx.fillRect(-cellW * 0.45, cellH * 0.32, cellW * 0.3, cellH * 0.18);
    ctx.fillRect(cellW * 0.15, cellH * 0.32, cellW * 0.3, cellH * 0.18);

    ctx.restore();
  }, [
    terrain,
    roverState,
    roverConfig,
    startPoint,
    targetPoint,
    activePath,
    pathResult,
    currentWaypointIndex,
    sensorScan,
  ]);

  useEffect(() => {
    let animId: number;
    const drawLoop = () => {
      render();
      animId = requestAnimationFrame(drawLoop);
    };
    animId = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  const handleCanvasAction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor(((e.clientX - rect.left) / rect.width) * terrain.width);
    const clickY = Math.floor(((e.clientY - rect.top) / rect.height) * terrain.height);

    if (clickX < 0 || clickX >= terrain.width || clickY < 0 || clickY >= terrain.height) return;

    if (clickMode === 'SET_START') {
      setStartPoint({ x: clickX, y: clickY });
    } else if (clickMode === 'SET_TARGET') {
      setTargetPoint({ x: clickX, y: clickY });
    } else if (clickMode === 'BRUSH' || editorBrush !== 'NONE') {
      applyBrushAt(clickX, clickY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * terrain.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * terrain.height);

    if (x >= 0 && x < terrain.width && y >= 0 && y < terrain.height) {
      const cell = terrain.cells[y][x];
      setHoverInfo({
        x,
        y,
        elevation: cell.elevation,
        slope: cell.slope,
        cost: cell.cost,
        isObstacle: cell.isObstacle,
      });

      if (isMouseDownRef.current && (clickMode === 'BRUSH' || editorBrush !== 'NONE')) {
        applyBrushAt(x, y);
      }
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#07090e] select-none overflow-hidden rounded-lg border border-cyan-950/60 shadow-2xl">
      {/* Tactical Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        onClick={handleCanvasAction}
        onMouseDown={(e) => {
          isMouseDownRef.current = true;
          handleCanvasAction(e);
        }}
        onMouseUp={() => {
          isMouseDownRef.current = false;
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          isMouseDownRef.current = false;
          setHoverInfo(null);
        }}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Crosshair coordinate HUD overlay */}
      {hoverInfo && (
        <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md border border-cyan-500/40 rounded px-2.5 py-1.5 text-[11px] font-mono text-cyan-400 space-y-0.5 shadow-lg pointer-events-none z-10">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">COORD:</span>
            <span className="font-bold">[{hoverInfo.x}, {hoverInfo.y}]</span>
            <span className="text-gray-500">({hoverInfo.x * terrain.resolution}m, {hoverInfo.y * terrain.resolution}m)</span>
          </div>
          <div className="flex items-center space-x-3 text-[10px]">
            <span>ELEV: <strong className="text-white">{hoverInfo.elevation.toFixed(1)}m</strong></span>
            <span>SLOPE: <strong className={hoverInfo.slope > 18 ? 'text-amber-400' : 'text-emerald-400'}>{hoverInfo.slope.toFixed(1)}°</strong></span>
            <span>COST: <strong className={hoverInfo.isObstacle ? 'text-red-400 font-bold' : 'text-cyan-300'}>{hoverInfo.isObstacle ? 'IMPASSABLE' : hoverInfo.cost.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      {/* Tactical Overlay Badges */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-emerald-500/30 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          START [S]
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-amber-500/30 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          TARGET [T]
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-red-500/30 text-red-400">
          <span className="w-2 h-2 rounded-sm bg-red-500" />
          HAZARD &gt;25°
        </div>
      </div>
    </div>
  );
};
