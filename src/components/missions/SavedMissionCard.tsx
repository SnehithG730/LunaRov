'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SavedMission } from '@/types/mission';
import { useMissionStore } from '@/core/simulation/missionStore';
import { exportMissionAsJSON } from '@/lib/storage';
import {
  FolderOpen,
  Copy,
  Trash2,
  Download,
  Calendar,
  Compass,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Route,
  Zap,
} from 'lucide-react';

interface SavedMissionCardProps {
  mission: SavedMission;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCloseDrawer?: () => void;
}

export const SavedMissionCard: React.FC<SavedMissionCardProps> = ({
  mission,
  onDuplicate,
  onDelete,
  onCloseDrawer,
}) => {
  const router = useRouter();
  const loadMission = useMissionStore((s) => s.loadMission);

  const handleOpen = () => {
    // Load mission configuration atomically into store
    loadMission(mission);

    if (onCloseDrawer) onCloseDrawer();
    router.push('/simulator');
  };

  const getStatusBadge = () => {
    const outcome = mission.results?.outcome;
    const status = mission.status || (outcome === 'SUCCESS' ? 'COMPLETED' : outcome || 'SAVED CONFIG');

    if (status === 'COMPLETED' || outcome === 'SUCCESS') {
      return (
        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>COMPLETED</span>
        </span>
      );
    }
    if (status === 'ABORTED' || outcome === 'ABORTED') {
      return (
        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>ABORTED</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
        <Compass className="w-2.5 h-2.5" />
        <span>CONFIG</span>
      </span>
    );
  };

  return (
    <div className="bg-[#0a0f1d] border border-cyan-950/90 hover:border-cyan-500/60 rounded-xl p-3.5 shadow-xl transition-all space-y-3 font-mono text-xs group relative overflow-hidden">
      {/* Top Row: Mission ID, Date & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-cyan-900/30 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 font-extrabold bg-black/60 px-1.5 py-0.5 rounded border border-cyan-900/40">
            {mission.id.slice(0, 16)}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-500" />
            {mission.date}
          </span>
        </div>

        {getStatusBadge()}
      </div>

      {/* Middle Row: Mission Name & Terrain/Algorithm Details */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
          {mission.name}
        </h3>

        <div className="grid grid-cols-2 gap-2 text-[10.5px] text-gray-400">
          <div className="flex items-center gap-1.5 bg-[#0d1424] p-1.5 rounded">
            <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">Terrain: <strong className="text-gray-200">{mission.terrainType.replace('_', ' ')}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0d1424] p-1.5 rounded">
            <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">Algo: <strong className="text-gray-200">{mission.algorithm}</strong></span>
          </div>
        </div>

        {/* Results Preview If Available */}
        {mission.results && (
          <div className="flex items-center justify-between bg-black/40 border border-cyan-950 px-2 py-1.5 rounded text-[10px] text-gray-300">
            <span className="flex items-center gap-1">
              <Route className="w-3 h-3 text-cyan-400" />
              <span>{mission.results.distanceTraveledMeters} m</span>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{mission.results.energyConsumedWh} Wh</span>
            </span>
            <span className="text-emerald-400 font-bold">
              Score: {mission.results.efficiencyScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-cyan-900/30">
        <div className="flex items-center gap-1">
          {/* EXPORT */}
          <button
            onClick={() => exportMissionAsJSON(mission)}
            className="p-1.5 rounded bg-[#11192e] hover:bg-[#182645] text-gray-400 hover:text-cyan-300 border border-cyan-900/40 transition-colors"
            title="Export Mission as JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* DUPLICATE */}
          <button
            onClick={() => onDuplicate(mission.id)}
            className="p-1.5 rounded bg-[#11192e] hover:bg-[#182645] text-gray-400 hover:text-cyan-300 border border-cyan-900/40 transition-colors"
            title="Duplicate Mission"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* DELETE */}
          <button
            onClick={() => onDelete(mission.id)}
            className="p-1.5 rounded bg-[#11192e] hover:bg-red-950/80 text-gray-400 hover:text-red-400 border border-cyan-900/40 hover:border-red-800/50 transition-colors"
            title="Delete Saved Mission"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* OPEN BUTTON */}
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-950 text-[11px]"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>OPEN</span>
        </button>
      </div>
    </div>
  );
};
