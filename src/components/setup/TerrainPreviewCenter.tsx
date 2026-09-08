'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Point2D } from '@/types/pathfinding';
import {
  Target,
  Compass,
  Info,
  Flag,
  Mountain,
  CircleDot,
  Brush,
  Ban,
  Sparkles,
  Layers,
} from 'lucide-react';

type InteractionMode = 'SET_START' | 'SET_TARGET' | 'BRUSH_ELEVATE' | 'BRUSH_CRATER' | 'BRUSH_BOULDER' | 'BRUSH_CLEAR';

export const TerrainPreviewCenter: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    terrain,
    startPoint,
    setStartPoint,
    targetPoint,
    setTargetPoint,
    pathResult,
    activePath,
    setEditorBrush,
    applyBrushAt,
  } = useMissionStore();

  const [mode, setMode] = useState<InteractionMode>('SET_START');
  const [hoverCoord, setHoverCoord] = useState<Point2D | null>(null);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [mapResolution, setMapResolution] = useState<'4K' | '2K' | '1K'>('2K');

  // Sync mode with editor brush if brush tool selected
  const handleModeChange = (newMode: InteractionMode) => {
    setMode(newMode);
    if (newMode === 'BRUSH_ELEVATE') setEditorBrush('ELEVATE');
    else if (newMode === 'BRUSH_CRATER') setEditorBrush('CRATER');
    else if (newMode === 'BRUSH_BOULDER') setEditorBrush('BOULDER');
    else if (newMode === 'BRUSH_CLEAR') setEditorBrush('CLEAR');
    else setEditorBrush('NONE');
  };

  // Convert canvas click to grid coordinates
  const getGridCoordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const gx = Math.floor(clientX / (rect.width / terrain.width));
    const gy = Math.floor(clientY / (rect.height / terrain.height));

    if (gx >= 0 && gx < terrain.width && gy >= 0 && gy < terrain.height) {
      return { x: gx, y: gy };
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getGridCoordsFromEvent(e);
    if (!coord) return;

    if (mode === 'SET_START') {
      setStartPoint(coord);
    } else if (mode === 'SET_TARGET') {
      setTargetPoint(coord);
    } else {
      applyBrushAt(coord.x, coord.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getGridCoordsFromEvent(e);
    setHoverCoord(coord);

    // If mouse is held down and in brush mode
    if (e.buttons === 1 && coord && mode.startsWith('BRUSH_')) {
      applyBrushAt(coord.x, coord.y);
    }
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
  };

  // Render Topographic Map onto Canvas
  const drawTerrain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = terrain.width;
    const height = terrain.height;
    const cw = canvas.width / width;
    const ch = canvas.height / height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find min/max elevation for normalization
    let minEl = Infinity;
    let maxEl = -Infinity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const el = terrain.cells[y][x].elevation;
        if (el < minEl) minEl = el;
        if (el > maxEl) maxEl = el;
      }
    }
    const elRange = Math.max(1, maxEl - minEl);

    // 1. Draw Cell Elevations with Realistic Directional Hillshading (Sun azimuth from North-West)
    const sunDx = -0.707;
    const sunDy = -0.707;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = terrain.cells[y][x];
        const norm = (cell.elevation - minEl) / elRange;

        // Calculate surface slope gradient for hillshading
        const eLeft = terrain.cells[y][Math.max(0, x - 1)].elevation;
        const eRight = terrain.cells[y][Math.min(width - 1, x + 1)].elevation;
        const eUp = terrain.cells[Math.max(0, y - 1)][x].elevation;
        const eDown = terrain.cells[Math.min(height - 1, y + 1)][x].elevation;

        const gradX = (eRight - eLeft) / 2;
        const gradY = (eDown - eUp) / 2;

        // Lambertian directional hillshade factor (0.5 to 1.5)
        const hillshade = 1.0 - (gradX * sunDx + gradY * sunDy) * 0.12;
        const clampedShade = Math.max(0.4, Math.min(1.6, hillshade));

        // Subtle micro-regolith mineral variation
        const grain = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 8 - 4;

        // Base lunar gray gradient from dark mare basalt to bright anorthosite highlands
        let r = Math.round((22 + norm * 145 + grain) * clampedShade);
        let g = Math.round((26 + norm * 150 + grain) * clampedShade);
        let b = Math.round((34 + norm * 170 + grain) * clampedShade);

        // Slope shading / hazard coloration
        if (cell.isObstacle) {
          // Discrete Boulder hazard: dark basalt core with crisp highlight
          r = 239;
          g = 68;
          b = 68;
        } else if (cell.slope >= 22) {
          // Dangerous steep slope
          r = Math.min(255, Math.round((r + 90) * clampedShade));
          g = Math.round(g * 0.6);
          b = Math.round(b * 0.5);
        } else if (cell.roughness > 1.3) {
          // Rough boulder field
          r = Math.round(r * 0.85);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 50);
        }

        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
        ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);

        // Contour interval lines
        if (showContours) {
          const contourInterval = 5.0;
          if (Math.abs(cell.elevation % contourInterval) < 0.35) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
          }
        }
      }
    }

    // 2. Draw Subtle Grid Lines
    if (showGridLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x * cw, 0);
        ctx.lineTo(x * cw, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y * ch);
        ctx.lineTo(canvas.width, y * ch);
        ctx.stroke();
      }
    }

    // 3. Draw Explored Nodes if path calculated
    if (pathResult && pathResult.exploredNodes.length > 0) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      for (const node of pathResult.exploredNodes) {
        ctx.fillRect(node.x * cw, node.y * ch, cw, ch);
      }
    }

    // 4. Draw Active Path Trajectory
    if (activePath && activePath.length > 1) {
      // Glow underlay
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(activePath[0].x * cw + cw / 2, activePath[0].y * ch + ch / 2);
      for (let i = 1; i < activePath.length; i++) {
        ctx.lineTo(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2);
      }
      ctx.stroke();

      // Sharp Core Trajectory Line
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(activePath[0].x * cw + cw / 2, activePath[0].y * ch + ch / 2);
      for (let i = 1; i < activePath.length; i++) {
        ctx.lineTo(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Draw small waypoints
      ctx.fillStyle = '#67e8f9';
      for (let i = 4; i < activePath.length - 1; i += 4) {
        ctx.beginPath();
        ctx.arc(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Draw Start Beacon (Green)
    const sx = startPoint.x * cw + cw / 2;
    const sy = startPoint.y * ch + ch / 2;

    // Pulse ring
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 1.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Start text badge
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText(`START [${startPoint.x}, ${startPoint.y}]`, sx + 8, sy - 6);

    // 6. Draw Destination Beacon (Amber)
    const tx = targetPoint.x * cw + cw / 2;
    const ty = targetPoint.y * ch + ch / 2;

    // Crosshair rings
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Destination text badge
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`DEST [${targetPoint.x}, ${targetPoint.y}]`, tx + 8, ty - 6);

    // 7. Hover Cursor Reticle
    if (hoverCoord) {
      const hx = hoverCoord.x * cw;
      const hy = hoverCoord.y * ch;

      ctx.strokeStyle =
        mode === 'SET_START'
          ? '#22c55e'
          : mode === 'SET_TARGET'
          ? '#f59e0b'
          : mode.startsWith('BRUSH_')
          ? '#a855f7'
          : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - 1, hy - 1, cw + 2, ch + 2);
    }
  }, [
    terrain,
    startPoint,
    targetPoint,
    pathResult,
    activePath,
    showContours,
    showGridLines,
    hoverCoord,
    mode,
    mapResolution,
  ]);

  useEffect(() => {
    drawTerrain();
  }, [drawTerrain]);

  // Handle preset waypoint pairs
  const setPresetWaypoints = (preset: 'DIAGONAL' | 'CRATER_BYPASS' | 'CENTER_SUMMIT') => {
    const w = terrain.width;
    const h = terrain.height;

    if (preset === 'DIAGONAL') {
      setStartPoint({ x: 4, y: 4 });
      setTargetPoint({ x: w - 5, y: h - 5 });
    } else if (preset === 'CRATER_BYPASS') {
      setStartPoint({ x: 6, y: Math.floor(h / 2) });
      setTargetPoint({ x: w - 6, y: Math.floor(h / 2) });
    } else if (preset === 'CENTER_SUMMIT') {
      setStartPoint({ x: 5, y: h - 6 });
      setTargetPoint({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
    }
  };

  const hoverCell =
    hoverCoord &&
    hoverCoord.y >= 0 &&
    hoverCoord.y < terrain.height &&
    hoverCoord.x >= 0 &&
    hoverCoord.x < terrain.width
      ? terrain.cells[hoverCoord.y][hoverCoord.x]
      : null;

  return (
    <section className="h-full flex flex-col bg-[#050811] relative overflow-hidden select-none">
      {/* Top Map Toolbar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-10 flex-wrap gap-2">
        {/* Interaction Mode Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleModeChange('SET_START')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
              mode === 'SET_START'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Start Position</span>
          </button>

          <button
            onClick={() => handleModeChange('SET_TARGET')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
              mode === 'SET_TARGET'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Destination</span>
          </button>

          {/* Brush Tools Divider */}
          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          <button
            onClick={() => handleModeChange('BRUSH_ELEVATE')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
              mode === 'BRUSH_ELEVATE'
                ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Elevate terrain (+6m)"
          >
            <Mountain className="w-3 h-3 text-purple-400" />
            <span>Elevate</span>
          </button>

          <button
            onClick={() => handleModeChange('BRUSH_CRATER')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
              mode === 'BRUSH_CRATER'
                ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Stamp impact crater"
          >
            <CircleDot className="w-3 h-3 text-purple-400" />
            <span>Crater</span>
          </button>

          <button
            onClick={() => handleModeChange('BRUSH_BOULDER')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
              mode === 'BRUSH_BOULDER'
                ? 'bg-rose-500/20 text-rose-300 border-rose-400'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Place boulder obstacle"
          >
            <Ban className="w-3 h-3 text-rose-400" />
            <span>Boulder</span>
          </button>

          <button
            onClick={() => handleModeChange('BRUSH_CLEAR')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
              mode === 'BRUSH_CLEAR'
                ? 'bg-slate-700/50 text-slate-200 border-slate-500'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Clear hazards and flatten cell"
          >
            <Brush className="w-3 h-3 text-slate-400" />
            <span>Clear</span>
          </button>
        </div>

        {/* Display Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContours(!showContours)}
            className={`text-[11px] font-mono px-2 py-1 rounded border transition-all cursor-pointer ${
              showContours
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Contours
          </button>
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`text-[11px] font-mono px-2 py-1 rounded border transition-all cursor-pointer ${
              showGridLines
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Grid
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Map HD Quality & Resolution Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 rounded border border-slate-800 px-1.5 py-0.5" title="Cartographic Raster Resolution">
            <Layers className="w-3 h-3 text-cyan-400" />
            <select
              value={mapResolution}
              onChange={(e) => setMapResolution(e.target.value as '4K' | '2K' | '1K')}
              className="bg-transparent text-cyan-300 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="4K" className="bg-slate-900 text-cyan-300">RES: 4K ULTRA (2048px)</option>
              <option value="2K" className="bg-slate-900 text-slate-200">RES: 2K RETINA (1536px)</option>
              <option value="1K" className="bg-slate-900 text-slate-400">RES: 1K STANDARD (1024px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-4 bg-[#030712] overflow-hidden"
      >
        <div className="relative shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border border-slate-800/80 bg-black">
          <canvas
            ref={canvasRef}
            width={mapResolution === '4K' ? 2048 : mapResolution === '2K' ? 1536 : 1024}
            height={mapResolution === '4K' ? 2048 : mapResolution === '2K' ? 1536 : 1024}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-[min(640px,78vh)] h-[min(640px,78vh)] aspect-square cursor-crosshair block"
          />

          {/* Map Compass Rose Overlay */}
          <div className="absolute top-3 right-3 pointer-events-none bg-slate-950/70 backdrop-blur-md p-1.5 rounded border border-slate-800 flex flex-col items-center">
            <span className="text-[9px] font-mono font-bold text-amber-400">N</span>
            <Compass className="w-5 h-5 text-slate-400 my-0.5" />
            <span className="text-[8px] font-mono text-slate-500">2.5m/px</span>
          </div>

          {/* Quick preset waypoints overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded border border-slate-800 text-[10px] font-mono">
            <span className="text-slate-500">Presets:</span>
            <button
              onClick={() => setPresetWaypoints('DIAGONAL')}
              className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Diagonal
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setPresetWaypoints('CRATER_BYPASS')}
              className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Bypass
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setPresetWaypoints('CENTER_SUMMIT')}
              className="text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Summit
            </button>
          </div>
        </div>

        {/* Hover Coordinate Telemetry HUD (Bottom Right) */}
        {hoverCell && hoverCoord && (
          <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 font-mono text-xs shadow-2xl z-20 pointer-events-none w-56 space-y-1">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-1 mb-1">
              <span className="text-amber-400 font-bold text-[11px]">SURFACE HUD</span>
              <span className="text-[10px] text-slate-500">
                [{hoverCoord.x}, {hoverCoord.y}]
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Real Position:</span>
              <span className="text-slate-200">
                {(hoverCoord.x * terrain.resolution).toFixed(1)}m, {(hoverCoord.y * terrain.resolution).toFixed(1)}m
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Elevation:</span>
              <span className="text-cyan-300 font-bold">{hoverCell.elevation.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Slope Incline:</span>
              <span
                className={`font-bold ${
                  hoverCell.slope >= 22
                    ? 'text-rose-400'
                    : hoverCell.slope >= 12
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {hoverCell.slope.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Traversability:</span>
              <span
                className={`font-bold ${
                  hoverCell.isObstacle
                    ? 'text-rose-400'
                    : hoverCell.slope >= 25
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {hoverCell.isObstacle ? 'IMPASSABLE' : hoverCell.slope >= 25 ? 'STEEP SLOPE' : 'SAFE REGOLITH'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions Hint */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            {mode === 'SET_START' && 'Click anywhere on the topographic grid to place the Rover Starting Beacon.'}
            {mode === 'SET_TARGET' && 'Click anywhere on the topographic grid to place the Mission Destination Target.'}
            {mode.startsWith('BRUSH_') && 'Click or drag across terrain to sculpt lunar elevations and obstacles.'}
          </span>
        </div>
        <span className="text-slate-600 hidden sm:inline">Grid: {terrain.width}x{terrain.height} ({terrain.width * terrain.resolution}m²)</span>
      </div>
    </section>
  );
};
