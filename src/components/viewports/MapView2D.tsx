'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { TERRAIN_PALETTES } from '@/lib/constants';
import { calculateMultiObjectiveTransitionCost } from '@/core/pathfinding/PathfinderInterface';
import { STRATEGY_METADATA } from '@/types/pathfinding';
import { Flame, ShieldCheck, Zap, Sun } from 'lucide-react';

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
  const optimizationStrategy = useMissionStore((s) => s.optimizationStrategy);
  const objectiveWeights = useMissionStore((s) => s.objectiveWeights);
  const costHeatmapActive = useMissionStore((s) => s.costHeatmapActive);
  const illuminationOverlayActive = useMissionStore((s) => s.illuminationOverlayActive);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);
  const setStartPoint = useMissionStore((s) => s.setStartPoint);
  const setTargetPoint = useMissionStore((s) => s.setTargetPoint);
  const applyBrushAt = useMissionStore((s) => s.applyBrushAt);

  const sensorDiscoveryMode = useMissionStore((s) => s.sensorDiscoveryMode);
  const originalPlannedPath = useMissionStore((s) => s.originalPlannedPath);

  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    elevation: number;
    slope: number;
    cost: number;
    illumination: number;
    isObstacle: boolean;
    discovered?: boolean;
    hazardType?: string;
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

    // 1. Draw Terrain Elevation Cells (with Fog-of-War, Illumination, and Cost Heatmap support)
    const { minElevation, maxElevation } = terrain;
    const elevRange = Math.max(1, maxElevation - minElevation);

    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const cell = terrain.cells[y][x];

        // Fog of War: Unknown cell rendering in Discovery Mode
        if (sensorDiscoveryMode && !cell.discovered) {
          ctx.fillStyle = '#050a14';
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);

          // Subtle unmapped grid hash
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
          continue;
        }

        const illum = cell.illumination ?? 0.8;

        if (illuminationOverlayActive) {
          if (cell.isObstacle) {
            ctx.fillStyle = '#1e1014';
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x * cellW + cellW * 0.25, y * cellH + cellH * 0.25, cellW * 0.5, cellH * 0.5);
          } else {
            // Illumination visual map:
            // 0.0 -> Deep Navy Shadow / PSR (rgb(10, 16, 32))
            // 0.5 -> Muted Amber Partial Sun (rgb(140, 95, 25))
            // 1.0 -> Brilliant Gold Peak of Eternal Light (rgb(250, 205, 45))
            let r = 0, g = 0, b = 0;
            if (illum < 0.3) {
              const t = illum / 0.3;
              r = Math.floor(10 + t * 45);
              g = Math.floor(16 + t * 40);
              b = Math.floor(32 - t * 12);
            } else if (illum < 0.75) {
              const t = (illum - 0.3) / 0.45;
              r = Math.floor(55 + t * 135);
              g = Math.floor(56 + t * 90);
              b = Math.floor(20 - t * 10);
            } else {
              const t = (illum - 0.75) / 0.25;
              r = Math.floor(190 + t * 65);
              g = Math.floor(146 + t * 75);
              b = Math.floor(10 + t * 40);
            }
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          }
        } else if (costHeatmapActive) {
          if (cell.isObstacle) {
            ctx.fillStyle = '#1e1014';
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x * cellW + cellW * 0.25, y * cellH + cellH * 0.25, cellW * 0.5, cellH * 0.5);
          } else {
            // Calculate multi-objective transition cost from flat baseline
            const { totalCost } = calculateMultiObjectiveTransitionCost(
              cell,
              cell,
              1.0,
              terrain.resolution,
              roverConfig,
              objectiveWeights
            );
            const normalizedCost = Math.min(1.0, Math.max(0, (totalCost - 0.5) / 4.0));

            // Heatmap color: Blue (0.0) -> Green (0.3) -> Yellow (0.6) -> Red (1.0)
            let r = 0, g = 0, b = 0;
            if (normalizedCost < 0.33) {
              const t = normalizedCost / 0.33;
              r = 10;
              g = Math.floor(40 + t * 180);
              b = Math.floor(180 - t * 40);
            } else if (normalizedCost < 0.66) {
              const t = (normalizedCost - 0.33) / 0.33;
              r = Math.floor(20 + t * 220);
              g = 220;
              b = Math.floor(140 * (1 - t));
            } else {
              const t = (normalizedCost - 0.66) / 0.34;
              r = 240;
              g = Math.floor(220 * (1 - t));
              b = 20;
            }

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          }
        } else {
          // Standard Lunar Monochromatic + Subtle Sun Shading + Slope Tint
          const normElev = (cell.elevation - minElevation) / elevRange; // 0 to 1

          if (cell.isObstacle) {
            ctx.fillStyle = '#1e1014';
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x * cellW + cellW * 0.25, y * cellH + cellH * 0.25, cellW * 0.5, cellH * 0.5);
          } else {
            const baseBrightness = 18 + normElev * 95;
            const illumMod = 0.5 + illum * 0.5; // subtle shadow in natural mode
            const brightness = Math.floor(baseBrightness * illumMod);
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

        // Recent discovery highlight glow
        if (cell.discoveredAtSec !== undefined && Math.abs(roverState.elapsedTimeSeconds - cell.discoveredAtSec) < 1.5) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
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

    // 4b. Draw Original Planned Route (Ghost Trail if replanned)
    if (
      originalPlannedPath &&
      originalPlannedPath.length > 1 &&
      activePath &&
      (originalPlannedPath.length !== activePath.length || originalPlannedPath !== activePath)
    ) {
      ctx.save();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo((originalPlannedPath[0].x + 0.5) * cellW, (originalPlannedPath[0].y + 0.5) * cellH);
      for (let i = 1; i < originalPlannedPath.length; i++) {
        ctx.lineTo((originalPlannedPath[i].x + 0.5) * cellW, (originalPlannedPath[i].y + 0.5) * cellH);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Planned Path (Curved-and-Straight Aerospace Trajectory with Strategy Color Glow)
    if (activePath.length > 1) {
      const stratColor = STRATEGY_METADATA[optimizationStrategy]?.color || '#00f0ff';

      // 5a. Glow underlay
      ctx.strokeStyle = `${stratColor}66`;
      ctx.lineWidth = 5.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const firstPx = (activePath[0].x + 0.5) * cellW;
      const firstPy = (activePath[0].y + 0.5) * cellH;
      ctx.moveTo(firstPx, firstPy);

      for (let i = 1; i < activePath.length - 1; i++) {
        const xc = ((activePath[i].x + activePath[i + 1].x) * 0.5 + 0.5) * cellW;
        const yc = ((activePath[i].y + activePath[i + 1].y) * 0.5 + 0.5) * cellH;
        const cpx = (activePath[i].x + 0.5) * cellW;
        const cpy = (activePath[i].y + 0.5) * cellH;
        ctx.quadraticCurveTo(cpx, cpy, xc, yc);
      }
      const lastPt = activePath[activePath.length - 1];
      ctx.lineTo((lastPt.x + 0.5) * cellW, (lastPt.y + 0.5) * cellH);
      ctx.stroke();

      // Sharp foreground laser line
      ctx.strokeStyle = stratColor;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = stratColor;
      ctx.shadowBlur = 10;
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
      ctx.moveTo(firstPx, firstPy);
      for (let i = 1; i < activePath.length - 1; i++) {
        const pCurr = activePath[i];
        const pNext = activePath[i + 1];
        const midX = ((pCurr.x + pNext.x) * 0.5 + 0.5) * cellW;
        const midY = ((pCurr.y + pNext.y) * 0.5 + 0.5) * cellH;
        ctx.quadraticCurveTo((pCurr.x + 0.5) * cellW, (pCurr.y + 0.5) * cellH, midX, midY);
      }
      ctx.lineTo((lastPt.x + 0.5) * cellW, (lastPt.y + 0.5) * cellH);
      ctx.stroke();
      ctx.restore();

      // 5c. Safe Waypoint Guidance Markers
      ctx.fillStyle = stratColor;
      const step = Math.max(1, Math.floor(activePath.length / 25));
      for (let i = currentWaypointIndex; i < activePath.length; i += step) {
        const pt = activePath[i];
        ctx.beginPath();
        ctx.arc((pt.x + 0.5) * cellW, (pt.y + 0.5) * cellH, 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // 6. LiDAR Sensor Range Ring & Vision Cone
    const roverPx = (roverState.x + 0.5) * cellW;
    const roverPy = (roverState.y + 0.5) * cellH;
    const sensorRangePx = (roverConfig.sensorRangeMeters / terrain.resolution) * cellW;
    const halfFovRad = ((roverConfig.sensorFovDeg * 0.5) * Math.PI) / 180;

    ctx.save();
    // 360° LiDAR Detection Perimeter Circle
    ctx.beginPath();
    ctx.arc(roverPx, roverPy, sensorRangePx, 0, Math.PI * 2);
    ctx.strokeStyle = sensorDiscoveryMode ? 'rgba(6, 182, 212, 0.35)' : 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Forward Directional LiDAR Arc
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
    optimizationStrategy,
    objectiveWeights,
    costHeatmapActive,
    illuminationOverlayActive,
    simulationStatus,
    originalPlannedPath,
    sensorDiscoveryMode,
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
        illumination: cell.illumination ?? 0.8,
        isObstacle: cell.isObstacle,
        discovered: cell.discovered,
        hazardType: cell.hazardType,
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
            <span>ILLUM: <strong className={hoverInfo.illumination < 0.25 ? 'text-blue-400' : hoverInfo.illumination > 0.75 ? 'text-yellow-300' : 'text-amber-400'}>{(hoverInfo.illumination * 100).toFixed(0)}%{hoverInfo.illumination < 0.2 ? ' (PSR)' : ''}</strong></span>
            <span>COST: <strong className={hoverInfo.isObstacle ? 'text-red-400 font-bold' : 'text-cyan-300'}>{hoverInfo.isObstacle ? 'IMPASSABLE' : hoverInfo.cost.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      {/* Strategy Indicator Badge (Top Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-cyan-700/50 rounded-lg px-2.5 py-1 text-[10.5px] font-mono text-white shadow-lg pointer-events-none z-10">
        <span className="text-slate-400">OBJECTIVE:</span>
        <strong className="text-cyan-300 font-bold">{STRATEGY_METADATA[optimizationStrategy]?.label || optimizationStrategy}</strong>
        {pathResult && (
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ml-1 ${
              pathResult.feasibility === 'FEASIBLE'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : pathResult.feasibility === 'WARNING'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-red-950 text-red-300 border border-red-800'
            }`}
          >
            {pathResult.feasibility}
          </span>
        )}
      </div>

      {/* Tactical Overlay Badges (Bottom Left) */}
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
        {costHeatmapActive && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-cyan-300">
            <Flame className="w-3 h-3 text-cyan-400" />
            COST HEATMAP
          </div>
        )}
        {illuminationOverlayActive && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 text-amber-300">
            <Sun className="w-3 h-3 text-amber-400" />
            ILLUMINATION MAP
          </div>
        )}
      </div>
    </div>
  );
};

