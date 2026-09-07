'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { TERRAIN_PRESETS } from '@/core/terrain/TerrainPresets';
import { TerrainType } from '@/types/terrain';
import { Mountain, Dices } from 'lucide-react';

export const TerrainSelector: React.FC = () => {
  const terrain = useMissionStore((s) => s.terrain);
  const setTerrainType = useMissionStore((s) => s.setTerrainType);
  const regenerateTerrain = useMissionStore((s) => s.regenerateTerrain);
  const simulationStatus = useMissionStore((s) => s.simulationStatus);

  const presetList = Object.values(TERRAIN_PRESETS);

  const handleSelect = (type: TerrainType) => {
    setTerrainType(type);
  };

  const handleRandomSeed = () => {
    const seed = Math.floor(Math.random() * 100000);
    regenerateTerrain(seed);
  };

  const currentMeta = TERRAIN_PRESETS[terrain.type];

  return (
    <div className="bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-lg space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">LUNAR TERRAIN SECTOR</span>
        </div>

        <button
          onClick={handleRandomSeed}
          disabled={simulationStatus === 'RUNNING'}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#131c33] hover:bg-[#1a284a] text-cyan-300 border border-cyan-800/40 transition-colors disabled:opacity-40"
          title="Regenerate sector with a new procedural seed"
        >
          <Dices className="w-3.5 h-3.5" />
          <span>RANDOM SEED ({terrain.seed})</span>
        </button>
      </div>

      {/* Preset Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presetList.map((preset) => {
          const isSelected = terrain.type === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id)}
              disabled={simulationStatus === 'RUNNING'}
              className={`p-2.5 rounded-lg text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-200 shadow-md shadow-cyan-950/40'
                  : 'bg-[#0f172a]/70 border-cyan-950 text-gray-400 hover:text-white hover:bg-[#131e36]'
              } disabled:opacity-40`}
            >
              <div>
                <div className="font-bold text-xs text-white flex items-center justify-between">
                  <span>{preset.name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{preset.description}</div>
              </div>

              <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-[9px]">
                <span className="text-gray-500">HAZARD:</span>
                <span
                  className={
                    preset.traversabilityRating === 'EXTREME'
                      ? 'text-red-400 font-bold'
                      : preset.traversabilityRating === 'DIFFICULT'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {preset.traversabilityRating}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Analogue Info Card */}
      {currentMeta && (
        <div className="bg-[#060a12] border border-cyan-950 p-2.5 rounded text-[11px] space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span>HISTORICAL / SCIENTIFIC ANALOGUE:</span>
            <strong className="text-cyan-300">{currentMeta.lunarAnalogue}</strong>
          </div>
          <div className="flex items-center justify-between text-gray-400 text-[10px]">
            <span>TYPICAL REGOLITH SLOPE: <strong className="text-white">{currentMeta.averageSlope}</strong></span>
            <span>RECOMMENDED SPEED: <strong className="text-white">{currentMeta.recommendedRoverSpeed}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
