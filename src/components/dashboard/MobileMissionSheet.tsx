'use client';

import React from 'react';
import { LiveTelemetryPanel } from './LiveTelemetryPanel';
import { TimelineEventLog } from './TimelineEventLog';
import { TerrainSelector } from '@/components/setup/TerrainSelector';
import { WaypointControls } from '@/components/setup/WaypointControls';
import { RoverConfigPanel } from '@/components/setup/RoverConfigPanel';
import { TelemetryCharts } from '@/components/telemetry/TelemetryCharts';
import { X, Activity, SlidersHorizontal, Terminal } from 'lucide-react';

export type MobileSheetTab = 'NONE' | 'TELEMETRY' | 'SETTINGS' | 'EVENT_LOG';

interface MobileMissionSheetProps {
  activeTab: MobileSheetTab;
  onClose: () => void;
  onSelectTab: (tab: MobileSheetTab) => void;
}

export const MobileMissionSheet: React.FC<MobileMissionSheetProps> = ({
  activeTab,
  onClose,
  onSelectTab,
}) => {
  if (activeTab === 'NONE') return null;

  const getTitle = () => {
    switch (activeTab) {
      case 'TELEMETRY':
        return 'COMPREHENSIVE TELEMETRY & STRIP CHARTS';
      case 'SETTINGS':
        return 'MISSION SETUP & ROVER SETTINGS';
      case 'EVENT_LOG':
        return 'MISSION EVENT LOG & CHRONOLOGY';
      default:
        return 'PANEL';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fadeIn lg:hidden font-mono text-xs">
      {/* Backdrop Click Dismiss */}
      <div className="flex-1 w-full" onClick={onClose} />

      {/* Bottom Sheet Modal Body */}
      <div className="w-full max-h-[85vh] bg-[#070b16] border-t-2 border-cyan-500/70 rounded-t-3xl p-4 flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        {/* Drag Handle Bar */}
        <div className="w-12 h-1 bg-cyan-900/80 rounded-full mx-auto mb-3" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-950 mb-3">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs tracking-wider">
            {activeTab === 'TELEMETRY' && <Activity className="w-4 h-4 text-cyan-400" />}
            {activeTab === 'SETTINGS' && <SlidersHorizontal className="w-4 h-4 text-cyan-400" />}
            {activeTab === 'EVENT_LOG' && <Terminal className="w-4 h-4 text-cyan-400" />}
            <span>{getTitle()}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-cyan-950"
            title="Close Sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 mb-3 bg-[#0c1324] p-1 rounded-xl border border-cyan-950">
          <button
            onClick={() => onSelectTab('TELEMETRY')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all ${
              activeTab === 'TELEMETRY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>TELEMETRY</span>
          </button>

          <button
            onClick={() => onSelectTab('SETTINGS')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all ${
              activeTab === 'SETTINGS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={() => onSelectTab('EVENT_LOG')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all ${
              activeTab === 'EVENT_LOG'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>EVENT LOG</span>
          </button>
        </div>

        {/* Sheet Content Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-black/40">
          {activeTab === 'TELEMETRY' && (
            <div className="space-y-3">
              <LiveTelemetryPanel />
              <TelemetryCharts />
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="space-y-3">
              <TerrainSelector />
              <WaypointControls />
              <RoverConfigPanel />
            </div>
          )}

          {activeTab === 'EVENT_LOG' && (
            <div>
              <TimelineEventLog />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
