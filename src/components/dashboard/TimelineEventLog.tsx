'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import {
  Terminal,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';

export const TimelineEventLog: React.FC = () => {
  const missionEvents = useMissionStore((s) => s.missionEvents);
  const [filter, setFilter] = useState<'ALL' | 'ALERTS' | 'SUCCESS' | 'INFO'>('ALL');
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      case 'ALERT':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
            SUCCESS
          </span>
        );
      case 'ALERT':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/50">
            ALERT
          </span>
        );
      case 'WARNING':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50">
            WARNING
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            TELEMETRY
          </span>
        );
    }
  };

  const filteredEvents = missionEvents.filter((evt) => {
    if (filter === 'ALL') return true;
    if (filter === 'ALERTS') return evt.type === 'ALERT' || evt.type === 'WARNING';
    if (filter === 'SUCCESS') return evt.type === 'SUCCESS';
    if (filter === 'INFO') return evt.type === 'INFO';
    return true;
  });

  // Auto-scroll on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [missionEvents.length]);

  return (
    <div className="w-full aerospace-panel rounded-xl p-3 shadow-xl space-y-2.5 font-mono text-xs corner-reticle">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-extrabold text-white tracking-wider text-xs">MISSION TIMELINE & EVENT LOG</span>
          <span className="text-[10px] text-gray-400 font-normal">({missionEvents.length} records)</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-gray-500" />
          {(['ALL', 'SUCCESS', 'ALERTS', 'INFO'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                filter === f
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60'
                  : 'text-gray-400 hover:text-white bg-[#0d1424] border border-cyan-950'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Event Stream List */}
      <div
        ref={scrollRef}
        className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-black/40"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-xs italic bg-[#0d1424]/60 rounded-lg border border-cyan-950/60">
            No telemetry events match the active filter criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all text-xs ${
                evt.type === 'SUCCESS'
                  ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                  : evt.type === 'ALERT'
                  ? 'bg-red-950/30 border-red-500/50 text-red-200'
                  : evt.type === 'WARNING'
                  ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                  : 'bg-[#0d1424]/90 border-cyan-950/70 text-gray-300'
              }`}
            >
              {getEventIcon(evt.type)}

              {/* Timestamp format: 08:42:15 and T+0.0s */}
              <div className="flex items-center gap-1.5 text-gray-400 font-bold shrink-0 text-[10.5px] tabular-nums">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-cyan-300">{formatClockTime(evt.timestamp)}</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400 text-[10px]">T+{evt.simTimeSeconds.toFixed(1)}s</span>
              </div>

              {/* Badge */}
              <div className="shrink-0">{getEventBadge(evt.type)}</div>

              {/* Message */}
              <div className="flex-1 text-[11px] leading-relaxed font-sans font-medium text-gray-200">
                {evt.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
