'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { SavedMission } from '@/types/mission';
import { SavedMissionCard } from './SavedMissionCard';
import {
  getSavedMissions,
  deleteSavedMission,
  duplicateSavedMission,
  exportAllMissionsAsJSON,
  validateAndImportMissionJSON,
} from '@/lib/storage';
import {
  FolderOpen,
  Search,
  Download,
  Upload,
  PlusCircle,
  AlertOctagon,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';

interface SavedMissionsManagerProps {
  onCloseDrawer?: () => void;
  isCompactDrawer?: boolean;
}

export const SavedMissionsManager: React.FC<SavedMissionsManagerProps> = ({
  onCloseDrawer,
  isCompactDrawer = false,
}) => {
  const [missions, setMissions] = useState<SavedMission[]>(() => {
    if (typeof window === 'undefined') return [];
    return getSavedMissions();
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [terrainFilter, setTerrainFilter] = useState<string>('ALL');
  const [algorithmFilter, setAlgorithmFilter] = useState<string>('ALL');

  // Status message state
  const [toastMessage, setToastMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  // File input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMissions = () => {
    const list = getSavedMissions();
    setMissions(list);
  };

  const showToast = (type: 'SUCCESS' | 'ERROR', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this saved mission?')) {
      deleteSavedMission(id);
      loadMissions();
      showToast('SUCCESS', 'Mission removed from storage.');
    }
  };

  const handleDuplicate = (id: string) => {
    const cloned = duplicateSavedMission(id);
    if (cloned) {
      loadMissions();
      showToast('SUCCESS', `Duplicated as "${cloned.name}".`);
    }
  };

  const handleExportAll = () => {
    if (missions.length === 0) {
      showToast('ERROR', 'No saved missions available to export.');
      return;
    }
    exportAllMissionsAsJSON();
    showToast('SUCCESS', 'Exported all saved missions archive.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        showToast('ERROR', 'Selected file is empty.');
        return;
      }

      const result = validateAndImportMissionJSON(content);
      if (result.success && result.mission) {
        loadMissions();
        showToast('SUCCESS', `Successfully imported "${result.mission.name}".`);
      } else {
        showToast('ERROR', result.error || 'Failed to import mission: Malformed JSON structure.');
      }
    };
    reader.onerror = () => {
      showToast('ERROR', 'Failed to read file from disk.');
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtered mission list
  const filteredMissions = missions.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.terrainType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTerrain = terrainFilter === 'ALL' || m.terrainType === terrainFilter;
    const matchesAlgorithm = algorithmFilter === 'ALL' || m.algorithm === algorithmFilter;

    return matchesSearch && matchesTerrain && matchesAlgorithm;
  });

  return (
    <div className="w-full space-y-4 font-mono text-xs">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs shadow-lg animate-fadeIn ${
            toastMessage.type === 'SUCCESS'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/80 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Action Toolbar: IMPORT, EXPORT ALL, CREATE */}
      <div className="bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">SAVED MISSIONS CATALOG</span>
          <span className="text-[10px] text-gray-400 bg-black/60 px-2 py-0.5 rounded border border-cyan-950">
            {missions.length} saved
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* IMPORT MISSION */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-cyan-300 font-bold transition-all text-xs"
            title="Import Mission from JSON"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>IMPORT MISSION</span>
          </button>

          {/* EXPORT ALL */}
          <button
            onClick={handleExportAll}
            disabled={missions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192e] hover:bg-[#182645] border border-cyan-900/50 text-gray-300 hover:text-white font-semibold transition-all text-xs disabled:opacity-40"
            title="Export All Missions Archive"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT ALL</span>
          </button>

          {/* CREATE NEW */}
          <Link
            href="/setup"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-950 text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>NEW MISSION</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-3 shadow-xl">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search missions by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1424] border border-cyan-950 pl-8 pr-3 py-1.5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
          />
        </div>

        {/* Terrain Filter */}
        <div className="flex items-center gap-1.5 bg-[#0d1424] border border-cyan-950 px-2.5 py-1 rounded-lg">
          <span className="text-[10px] text-gray-500 shrink-0">TERRAIN:</span>
          <select
            value={terrainFilter}
            onChange={(e) => setTerrainFilter(e.target.value)}
            className="w-full bg-transparent text-gray-200 text-xs focus:outline-none font-mono cursor-pointer"
          >
            <option value="ALL" className="bg-[#0d1424]">All Terrains</option>
            <option value="FLAT" className="bg-[#0d1424]">Flat Plains</option>
            <option value="CRATER_FIELD" className="bg-[#0d1424]">Crater Field</option>
            <option value="ROCKY" className="bg-[#0d1424]">Rocky Basin</option>
            <option value="HILLY" className="bg-[#0d1424]">Hilly Highlands</option>
            <option value="SOUTH_POLE" className="bg-[#0d1424]">South Pole</option>
          </select>
        </div>

        {/* Algorithm Filter */}
        <div className="flex items-center gap-1.5 bg-[#0d1424] border border-cyan-950 px-2.5 py-1 rounded-lg">
          <span className="text-[10px] text-gray-500 shrink-0">ALGORITHM:</span>
          <select
            value={algorithmFilter}
            onChange={(e) => setAlgorithmFilter(e.target.value)}
            className="w-full bg-transparent text-gray-200 text-xs focus:outline-none font-mono cursor-pointer"
          >
            <option value="ALL" className="bg-[#0d1424]">All Solvers</option>
            <option value="ASTAR" className="bg-[#0d1424]">A* Heuristic</option>
            <option value="DIJKSTRA" className="bg-[#0d1424]">Dijkstra</option>
            <option value="GREEDY_BFS" className="bg-[#0d1424]">Greedy Best-First</option>
            <option value="MANUAL" className="bg-[#0d1424]">Manual Pilot</option>
          </select>
        </div>
      </div>

      {/* Mission Cards Grid */}
      {filteredMissions.length === 0 ? (
        <div className="bg-[#0a0f1d] border border-cyan-950/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">No Saved Missions Found</h4>
          <p className="text-gray-400 text-xs max-w-sm mx-auto font-sans">
            {searchQuery || terrainFilter !== 'ALL' || algorithmFilter !== 'ALL'
              ? 'No missions match your active search filters. Try resetting the filters.'
              : 'You have not saved any missions yet. Configure or complete a mission in the simulator, then click "SAVE MISSION".'}
          </p>
          <div className="pt-2">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>CONFIGURE NEW MISSION</span>
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3.5 ${
            isCompactDrawer
              ? 'grid-cols-1'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredMissions.map((m) => (
            <SavedMissionCard
              key={m.id}
              mission={m}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onCloseDrawer={onCloseDrawer}
            />
          ))}
        </div>
      )}
    </div>
  );
};
