'use client';

import React, { useRef } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Terminal, Info, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

export const MissionLogStream: React.FC = () => {
  const missionEvents = useMissionStore((s) => s.missionEvents);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'ALERT':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
  };

  const getEventClass = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-emerald-300 border-l-2 border-emerald-500 bg-emerald-950/20';
      case 'ALERT':
        return 'text-red-300 border-l-2 border-red-500 bg-red-950/30';
      case 'WARNING':
        return 'text-amber-300 border-l-2 border-amber-500 bg-amber-950/20';
      default:
        return 'text-gray-300 border-l-2 border-cyan-500/40 bg-cyan-950/10';
    }
  };

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/80 rounded-xl p-3 shadow-lg space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-gray-200">MISSION LOG CONSOLE</span>
        </div>
        <span className="text-[10px] text-gray-500">{missionEvents.length} EVENTS RECORDED</span>
      </div>

      <div
        ref={scrollRef}
        className="h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-black/40 text-[11px]"
      >
        {missionEvents.map((evt) => (
          <div
            key={evt.id}
            className={`flex items-start gap-2 p-1.5 rounded-r text-[10.5px] ${getEventClass(evt.type)}`}
          >
            {getEventIcon(evt.type)}
            <div className="flex-1 leading-tight">
              <span className="text-gray-500 font-bold mr-1.5">
                [T+{evt.simTimeSeconds.toFixed(1)}s]
              </span>
              <span>{evt.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
