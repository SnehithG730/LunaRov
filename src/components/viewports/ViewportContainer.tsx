'use client';

import React, { useState } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { MapView2D } from './MapView2D';
import { Viewport3D } from './Viewport3D';
import {
  Minimize2,
  Layers,
  Box,
  MapPin,
  Flag,
  Paintbrush,
} from 'lucide-react';

export const ViewportContainer: React.FC = () => {
  const activeView = useMissionStore((s) => s.activeView);
  const setActiveView = useMissionStore((s) => s.setActiveView);
  const editorBrush = useMissionStore((s) => s.editorBrush);
  const setEditorBrush = useMissionStore((s) => s.setEditorBrush);

  const [clickMode, setClickMode] = useState<'NONE' | 'SET_START' | 'SET_TARGET' | 'BRUSH'>('NONE');

  const handleSetClickMode = (mode: 'NONE' | 'SET_START' | 'SET_TARGET' | 'BRUSH') => {
    setClickMode(mode);
    if (mode !== 'BRUSH') {
      setEditorBrush('NONE');
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#090d16] border border-cyan-950/80 rounded-xl overflow-hidden shadow-2xl">
      {/* Viewport Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0d1424] border-b border-cyan-900/40 text-xs font-mono">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('SPLIT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeView === 'SPLIT'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SPLIT VIEW</span>
          </button>
          <button
            onClick={() => setActiveView('2D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeView === '2D'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>2D TACTICAL</span>
          </button>
          <button
            onClick={() => setActiveView('3D')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
              activeView === '3D'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D SURFACE</span>
          </button>
        </div>

        {/* Right: Interactive Placement & Terrain Brush Tools */}
        <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
          <span className="text-gray-500 text-[10px] uppercase tracking-wider mr-1">GRID ACTIONS:</span>

          <button
            onClick={() => handleSetClickMode(clickMode === 'SET_START' ? 'NONE' : 'SET_START')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all ${
              clickMode === 'SET_START'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-sm'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20'
            }`}
            title="Click anywhere on the 2D grid to move rover start position"
          >
            <MapPin className="w-3 h-3" />
            <span>SET START</span>
          </button>

          <button
            onClick={() => handleSetClickMode(clickMode === 'SET_TARGET' ? 'NONE' : 'SET_TARGET')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all ${
              clickMode === 'SET_TARGET'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
            }`}
            title="Click anywhere on the 2D grid to place target destination"
          >
            <Flag className="w-3 h-3" />
            <span>SET TARGET</span>
          </button>

          {/* Custom Hazard Brush Dropdown */}
          <div className="flex items-center bg-black/40 border border-cyan-900/50 rounded px-1.5 py-0.5">
            <Paintbrush className="w-3 h-3 text-cyan-400 mr-1" />
            <select
              value={editorBrush}
              onChange={(e) => {
                const brush = e.target.value as 'NONE' | 'ELEVATE' | 'CRATER' | 'BOULDER' | 'CLEAR';
                setEditorBrush(brush);
                if (brush !== 'NONE') setClickMode('BRUSH');
                else setClickMode('NONE');
              }}
              className="bg-transparent text-cyan-300 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="NONE" className="bg-gray-900 text-gray-300">BRUSH: OFF</option>
              <option value="BOULDER" className="bg-gray-900 text-cyan-300">+ PLACE BOULDER (HAZARD)</option>
              <option value="CRATER" className="bg-gray-900 text-cyan-300">+ STAMP CRATER</option>
              <option value="ELEVATE" className="bg-gray-900 text-cyan-300">+ RAISE ELEVATION</option>
              <option value="CLEAR" className="bg-gray-900 text-cyan-300">- CLEAR HAZARD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Viewport Render Canvas Area */}
      <div className="flex-1 w-full p-2 min-h-[440px]">
        {activeView === 'SPLIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full w-full">
            <div className="h-full w-full min-h-[360px]">
              <MapView2D clickMode={clickMode} />
            </div>
            <div className="h-full w-full min-h-[360px]">
              <Viewport3D />
            </div>
          </div>
        )}

        {activeView === '2D' && (
          <div className="h-full w-full min-h-[500px]">
            <MapView2D clickMode={clickMode} />
          </div>
        )}

        {activeView === '3D' && (
          <div className="h-full w-full min-h-[500px]">
            <Viewport3D />
          </div>
        )}
      </div>
    </div>
  );
};
