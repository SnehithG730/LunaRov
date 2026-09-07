'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Clock, CheckCircle2, AlertTriangle, AlertOctagon, Info, ListOrdered } from 'lucide-react';

export const MissionTimelineView: React.FC = () => {
  const missionEvents = useMissionStore((s) => s.missionEvents);

  // Format timestamp into HH:MM:SS
  const formatClockTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ALERT':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getEventBorder = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-emerald-500/50 bg-emerald-950/20';
      case 'ALERT':
        return 'border-red-500/50 bg-red-950/30';
      case 'WARNING':
        return 'border-amber-500/50 bg-amber-950/20';
      default:
        return 'border-cyan-900/50 bg-[#0d1424]';
    }
  };

  // Reverse so events display in chronological order from start to end
  const chronologicalEvents = [...missionEvents].reverse();

  return (
    <div className="w-full bg-[#0a0f1d] border border-cyan-950/90 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">MISSION EVENT TIMELINE</span>
        </div>
        <span className="text-[10px] text-gray-500">CHRONOLOGICAL MILESTONES</span>
      </div>

      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-950">
        {chronologicalEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline Node Dot */}
            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[#0a0f1d] border-2 border-cyan-400 flex items-center justify-center group-hover:scale-125 transition-transform">
              <span className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>

            {/* Event Item Box */}
            <div className={`p-2.5 rounded-lg border ${getEventBorder(evt.type)} space-y-1`}>
              <div className="flex items-center justify-between text-[10.5px]">
                <div className="flex items-center gap-1.5">
                  {getEventIcon(evt.type)}
                  <span className="font-bold text-cyan-300">{formatClockTime(evt.timestamp)}</span>
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    T+{evt.simTimeSeconds.toFixed(1)}s
                  </span>
                </div>

                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    evt.type === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-300'
                      : evt.type === 'ALERT'
                      ? 'bg-red-950 text-red-300'
                      : evt.type === 'WARNING'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-cyan-950 text-cyan-300'
                  }`}
                >
                  {evt.type}
                </span>
              </div>

              <p className="text-[11px] text-gray-200 leading-relaxed font-sans font-medium">
                {evt.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
