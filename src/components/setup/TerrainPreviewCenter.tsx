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
  Palette,
} from 'lucide-react';

type InteractionMode = 'SET_START' | 'SET_TARGET' | 'BRUSH_ELEVATE' | 'BRUSH_CRATER' | 'BRUSH_BOULDER' | 'BRUSH_CLEAR';
type ColorScheme = 'NAVY_BLUE' | 'MAROON_RED';

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
    originalPlannedPath,
    setEditorBrush,
    applyBrushAt,
  } = useMissionStore();

  const [mode, setMode] = useState<InteractionMode>('SET_START');
  const [hoverCoord, setHoverCoord] = useState<Point2D | null>(null);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('NAVY_BLUE');
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

  // Render High-Definition Continuous Cartographic Topographic Map
  const drawTerrain = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = terrain.width;
    const height = terrain.height;
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    ctx.clearRect(0, 0, canvasW, canvasH);

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

    // High-resolution raster buffer for continuous bilinear surface rendering
    // This eliminates blocky "pixel by pixel" squares and creates a smooth USGS/NASA topographic survey map
    const rasterDim = mapResolution === '4K' ? 512 : mapResolution === '2K' ? 384 : 256;
    const offscreen = document.createElement('canvas');
    offscreen.width = rasterDim;
    offscreen.height = rasterDim;
    const offCtx = offscreen.getContext('2d');

    if (offCtx) {
      const imgData = offCtx.createImageData(rasterDim, rasterDim);
      const data = imgData.data;

      // Directional illumination from North-West (sun azimuth 315°, altitude 45°)
      const sunDx = -0.707;
      const sunDy = -0.707;

      for (let py = 0; py < rasterDim; py++) {
        // Continuous normalized coordinate in grid space
        const gy = (py / (rasterDim - 1)) * (height - 1);
        const y0 = Math.floor(gy);
        const y1 = Math.min(height - 1, y0 + 1);
        const ty = gy - y0;

        for (let px = 0; px < rasterDim; px++) {
          const gx = (px / (rasterDim - 1)) * (width - 1);
          const x0 = Math.floor(gx);
          const x1 = Math.min(width - 1, x0 + 1);
          const tx = gx - x0;

          // Bilinear interpolation of elevation
          const e00 = terrain.cells[y0][x0].elevation;
          const e10 = terrain.cells[y0][x1].elevation;
          const e01 = terrain.cells[y1][x0].elevation;
          const e11 = terrain.cells[y1][x1].elevation;
          const elev = (1 - tx) * (1 - ty) * e00 + tx * (1 - ty) * e10 + (1 - tx) * ty * e01 + tx * ty * e11;

          // Bilinear interpolation of slope
          const s00 = terrain.cells[y0][x0].slope;
          const s10 = terrain.cells[y0][x1].slope;
          const s01 = terrain.cells[y1][x0].slope;
          const s11 = terrain.cells[y1][x1].slope;
          const slope = (1 - tx) * (1 - ty) * s00 + tx * (1 - ty) * s10 + (1 - tx) * ty * s01 + tx * ty * s11;

          // Obstacle check
          const isObs00 = terrain.cells[y0][x0].isObstacle ? 1 : 0;
          const isObs10 = terrain.cells[y0][x1].isObstacle ? 1 : 0;
          const isObs01 = terrain.cells[y1][x0].isObstacle ? 1 : 0;
          const isObs11 = terrain.cells[y1][x1].isObstacle ? 1 : 0;
          const obsProximity = (1 - tx) * (1 - ty) * isObs00 + tx * (1 - ty) * isObs10 + (1 - tx) * ty * isObs01 + tx * ty * isObs11;

          // Calculate surface gradient for smooth directional hillshading
          const delta = 0.5;
          const gxL = Math.max(0, gx - delta);
          const gxR = Math.min(width - 1, gx + delta);
          const gyU = Math.max(0, gy - delta);
          const gyD = Math.min(height - 1, gy + delta);

          const eL = terrain.cells[Math.floor(gy)][Math.floor(gxL)].elevation;
          const eR = terrain.cells[Math.floor(gy)][Math.floor(gxR)].elevation;
          const eU = terrain.cells[Math.floor(gyU)][Math.floor(gx)].elevation;
          const eD = terrain.cells[Math.floor(gyD)][Math.floor(gx)].elevation;

          const gradX = (eR - eL) / (gxR - gxL || 1);
          const gradY = (eD - eU) / (gyD - gyU || 1);

          // Hillshade factor (0.5 to 1.5)
          const hillshade = 1.0 - (gradX * sunDx + gradY * sunDy) * 0.08;
          const clampedShade = Math.max(0.45, Math.min(1.55, hillshade));

          // Elevation normalization (0.0 to 1.0)
          const normElev = (elev - minEl) / elRange;

          // Subtle procedural mineral grain
          const grain = (((Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1) * 6 - 3);

          let r = 0;
          let g = 0;
          let b = 0;

          // COLOR SCHEME LOGIC:
          // 1. Surface on which the rover can move on (flat / nominal regolith): Base shade
          // 2. Inclined parts: One shade lighter than the normal surface
          // 3. Slopes: One shade darker than the normal surface
          // Both applied in Navy-Blue or Maroon-Red palettes.

          if (colorScheme === 'NAVY_BLUE') {
            // --- NAVY BLUE PALETTE ---
            // Base Navy (Traversable): rgb(24, 42, 78)
            // Inclined Parts (+1 shade lighter): rgb(55, 88, 150) -> rgb(85, 130, 210)
            // Slopes (-1 shade darker): rgb(8, 14, 28) -> rgb(5, 9, 18)

            // Base nominal traversable regolith
            let baseR = 24 + grain;
            let baseG = 42 + grain;
            let baseB = 78 + grain;

            // Incline factor (elevated ridges & gentle inclines)
            const inclineFactor = Math.max(0, Math.min(1, (normElev - 0.45) * 2.0));
            const gentleInclineBonus = (slope >= 4 && slope < 16) ? 0.35 : 0.0;
            const totalIncline = Math.min(1, inclineFactor + gentleInclineBonus);

            // Slope factor (steep slopes, hazardous drops, crater interior cliffs)
            const steepSlopeFactor = Math.max(0, Math.min(1, (slope - 14) / 12));

            // Start with base navy traversable color
            r = baseR;
            g = baseG;
            b = baseB;

            // Blend lighter for inclined parts (elevated rims, hills, gentle upward slopes)
            r = r * (1 - totalIncline) + (65 + normElev * 40) * totalIncline;
            g = g * (1 - totalIncline) + (95 + normElev * 50) * totalIncline;
            b = b * (1 - totalIncline) + (160 + normElev * 60) * totalIncline;

            // Blend darker for steep slopes / hazardous cliff gradients
            r = r * (1 - steepSlopeFactor) + 8 * steepSlopeFactor;
            g = g * (1 - steepSlopeFactor) + 14 * steepSlopeFactor;
            b = b * (1 - steepSlopeFactor) + 28 * steepSlopeFactor;

            // Apply directional hillshading illumination
            r = Math.round(r * clampedShade);
            g = Math.round(g * clampedShade);
            b = Math.round(b * clampedShade);
          } else {
            // --- MAROON RED PALETTE ---
            // Base Maroon (Traversable): rgb(76, 20, 36)
            // Inclined Parts (+1 shade lighter): rgb(145, 52, 78) -> rgb(195, 75, 108)
            // Slopes (-1 shade darker): rgb(28, 6, 12) -> rgb(16, 3, 7)

            let baseR = 76 + grain;
            let baseG = 20 + grain;
            let baseB = 36 + grain;

            const inclineFactor = Math.max(0, Math.min(1, (normElev - 0.45) * 2.0));
            const gentleInclineBonus = (slope >= 4 && slope < 16) ? 0.35 : 0.0;
            const totalIncline = Math.min(1, inclineFactor + gentleInclineBonus);

            const steepSlopeFactor = Math.max(0, Math.min(1, (slope - 14) / 12));

            r = baseR;
            g = baseG;
            b = baseB;

            // Blend lighter for inclined parts
            r = r * (1 - totalIncline) + (148 + normElev * 55) * totalIncline;
            g = g * (1 - totalIncline) + (48 + normElev * 35) * totalIncline;
            b = b * (1 - totalIncline) + (75 + normElev * 40) * totalIncline;

            // Blend darker for steep slopes
            r = r * (1 - steepSlopeFactor) + 28 * steepSlopeFactor;
            g = g * (1 - steepSlopeFactor) + 6 * steepSlopeFactor;
            b = b * (1 - steepSlopeFactor) + 12 * steepSlopeFactor;

            // Apply directional hillshading
            r = Math.round(r * clampedShade);
            g = Math.round(g * clampedShade);
            b = Math.round(b * clampedShade);
          }

          // Boulder / Discrete obstacle highlight (high-visibility danger glow)
          if (obsProximity > 0.45) {
            r = Math.round(r * 0.3 + 239 * 0.7);
            g = Math.round(g * 0.3 + 68 * 0.7);
            b = Math.round(g * 0.3 + 68 * 0.7);
          }

          // Topographic Contour Isolines
          if (showContours) {
            const contourInterval = 5.0; // 5 meters contour interval
            const contourMod = Math.abs(elev % contourInterval);
            if (contourMod < 0.28 || contourMod > (contourInterval - 0.28)) {
              // Highlight contour line
              const lineAlpha = colorScheme === 'NAVY_BLUE' ? 35 : 40;
              r = Math.min(255, r + lineAlpha);
              g = Math.min(255, g + lineAlpha + 10);
              b = Math.min(255, b + lineAlpha + 20);
            }
          }

          const idx = (py * rasterDim + px) * 4;
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
          data[idx + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Smoothly draw offscreen interpolated map to main canvas
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offscreen, 0, 0, canvasW, canvasH);
    }

    const cw = canvasW / width;
    const ch = canvasH / height;

    // 2. Draw Subtle Scientific Graticule Grid Lines & Ticks
    if (showGridLines) {
      ctx.strokeStyle = colorScheme === 'NAVY_BLUE' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(251, 113, 133, 0.08)';
      ctx.lineWidth = 0.75;
      for (let x = 0; x <= width; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x * cw, 0);
        ctx.lineTo(x * cw, canvasH);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y * ch);
        ctx.lineTo(canvasW, y * ch);
        ctx.stroke();
      }
    }

    // 3. Highlight discrete boulder hazard markers
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = terrain.cells[y][x];
        if (cell.isObstacle && cell.slope < 25) {
          // Boulder marker with radar crosshair
          const bx = x * cw + cw / 2;
          const by = y * ch + ch / 2;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, cw * 0.45, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Draw Explored Nodes (Pathfinding search sweep)
    if (pathResult && pathResult.exploredNodes.length > 0) {
      ctx.fillStyle = colorScheme === 'NAVY_BLUE' ? 'rgba(34, 211, 238, 0.12)' : 'rgba(251, 146, 60, 0.12)';
      for (const node of pathResult.exploredNodes) {
        ctx.fillRect(node.x * cw, node.y * ch, cw, ch);
      }
    }

    // 4.5. Draw Original Ghost Trajectory if replanned (Visually distinguish original vs replanned path)
    if (
      originalPlannedPath &&
      originalPlannedPath.length > 1 &&
      activePath &&
      (originalPlannedPath.length !== activePath.length || originalPlannedPath[0] !== activePath[0] || originalPlannedPath !== activePath)
    ) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(originalPlannedPath[0].x * cw + cw / 2, originalPlannedPath[0].y * ch + ch / 2);
      for (let i = 1; i < originalPlannedPath.length; i++) {
        ctx.lineTo(originalPlannedPath[i].x * cw + cw / 2, originalPlannedPath[i].y * ch + ch / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Active Smooth Path Trajectory
    if (activePath && activePath.length > 1) {
      // Glow underlay
      ctx.strokeStyle = colorScheme === 'NAVY_BLUE' ? 'rgba(6, 182, 212, 0.45)' : 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(activePath[0].x * cw + cw / 2, activePath[0].y * ch + ch / 2);
      for (let i = 1; i < activePath.length; i++) {
        ctx.lineTo(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2);
      }
      ctx.stroke();

      // Sharp Core Trajectory Line
      ctx.strokeStyle = colorScheme === 'NAVY_BLUE' ? '#22d3ee' : '#fb7185';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(activePath[0].x * cw + cw / 2, activePath[0].y * ch + ch / 2);
      for (let i = 1; i < activePath.length; i++) {
        ctx.lineTo(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Smooth Waypoint nodes
      ctx.fillStyle = colorScheme === 'NAVY_BLUE' ? '#67e8f9' : '#fda4af';
      for (let i = 3; i < activePath.length - 1; i += 3) {
        ctx.beginPath();
        ctx.arc(activePath[i].x * cw + cw / 2, activePath[i].y * ch + ch / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Draw Start Beacon (Emerald Green)
    const sx = startPoint.x * cw + cw / 2;
    const sy = startPoint.y * ch + ch / 2;

    // Pulse ring
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, cw * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Start text badge
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText(`START [${startPoint.x}, ${startPoint.y}]`, sx + 10, sy - 6);

    // 7. Draw Destination Beacon (Amber/Gold)
    const tx = targetPoint.x * cw + cw / 2;
    const ty = targetPoint.y * ch + ch / 2;

    // Crosshair rings
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 1.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(tx, ty, cw * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Destination text badge
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`DEST [${targetPoint.x}, ${targetPoint.y}]`, tx + 10, ty - 6);

    // 8. Hover Cursor Reticle
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
      ctx.lineWidth = 1.8;
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
    colorScheme,
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
            title="Stamp organic impact crater"
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

        {/* Display & Palette Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Color Palette Switcher (Navy-Blue vs Maroon-Red) */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setColorScheme('NAVY_BLUE')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                colorScheme === 'NAVY_BLUE'
                  ? 'bg-blue-600/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Navy Blue Theme: Base Navy for traversable regolith, 1 shade lighter for inclined parts, 1 shade darker for slopes"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" />
              <span>NAVY BLUE</span>
            </button>

            <button
              onClick={() => setColorScheme('MAROON_RED')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                colorScheme === 'MAROON_RED'
                  ? 'bg-rose-900/40 text-rose-300 border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Maroon Red Theme: Base Maroon for traversable regolith, 1 shade lighter for inclined parts, 1 shade darker for slopes"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-[0_0_5px_#e11d48]" />
              <span>MAROON RED</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block" />

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

          {/* Map HD Quality & Resolution Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 rounded border border-slate-800 px-1.5 py-0.5" title="Cartographic Raster Sampling">
            <Layers className="w-3 h-3 text-cyan-400" />
            <select
              value={mapResolution}
              onChange={(e) => setMapResolution(e.target.value as '4K' | '2K' | '1K')}
              className="bg-transparent text-cyan-300 text-[11px] font-mono focus:outline-none cursor-pointer"
            >
              <option value="4K" className="bg-slate-900 text-cyan-300">RES: 4K (512-SMP)</option>
              <option value="2K" className="bg-slate-900 text-slate-200">RES: 2K (384-SMP)</option>
              <option value="1K" className="bg-slate-900 text-slate-400">RES: 1K (256-SMP)</option>
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
          <div className="absolute top-3 right-3 pointer-events-none bg-slate-950/80 backdrop-blur-md p-1.5 rounded border border-slate-800 flex flex-col items-center shadow-lg">
            <span className="text-[9px] font-mono font-bold text-amber-400">N</span>
            <Compass className="w-5 h-5 text-slate-400 my-0.5" />
            <span className="text-[8px] font-mono text-slate-500">2.5m/px</span>
          </div>

          {/* Color Scheme Incline/Slope Legend Bar (Top Left) */}
          <div className="absolute top-3 left-3 pointer-events-none bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded border border-slate-800 text-[9px] font-mono space-y-1 shadow-lg">
            <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className={colorScheme === 'NAVY_BLUE' ? 'text-cyan-400' : 'text-rose-400'}>
                {colorScheme === 'NAVY_BLUE' ? 'NAVY BLUE CARTOGRAPHY' : 'MAROON RED CARTOGRAPHY'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block border border-white/20"
                  style={{
                    backgroundColor: colorScheme === 'NAVY_BLUE' ? 'rgb(24, 42, 78)' : 'rgb(76, 20, 36)',
                  }}
                />
                <span className="text-slate-300">Normal (Moveable)</span>
              </div>

              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block border border-white/20"
                  style={{
                    backgroundColor: colorScheme === 'NAVY_BLUE' ? 'rgb(75, 120, 200)' : 'rgb(175, 60, 95)',
                  }}
                />
                <span className="text-slate-300">Inclined (+1 Lighter)</span>
              </div>

              <div className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block border border-white/20"
                  style={{
                    backgroundColor: colorScheme === 'NAVY_BLUE' ? 'rgb(8, 14, 28)' : 'rgb(28, 6, 12)',
                  }}
                />
                <span className="text-slate-300">Slopes (-1 Darker)</span>
              </div>
            </div>
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
