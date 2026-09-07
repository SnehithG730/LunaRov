'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { Gauge, Battery, Route, ChevronRight } from 'lucide-react';

interface MobileTelemetryBarProps {
  onOpenDetails: () => void;
}

export const MobileTelemetryBar: React.FC<MobileTelemetryBarProps> = ({ onOpenDetails }) => {
  const roverState = useMissionStore((s) => s.roverState);
  const activePath = useMissionStore((s) => s.activePath);
  const currentWaypointIndex = useMissionStore((s) => s.currentWaypointIndex);
  const terrain = useMissionStore((s) => s.terrain);
  const pathResult = useMissionStore((s) => s.pathResult);

  const batteryPct = roverState.batteryPercentage;
  const isBatteryLow = batteryPct <= 20.0;

  // Remaining Distance
  let remainingDistanceMeters = 0;
  if (activePath.length > 0 && currentWaypointIndex < activePath.length) {
    let prev = { x: roverState.x, y: roverState.y };
    for (let i = currentWaypointIndex; i < activePath.length; i++) {
      const pt = activePath[i];
      const segDist = Math.hypot(pt.x - prev.x, pt.y - prev.y) * terrain.resolution;
      remainingDistanceMeters += segDist;
      prev = pt;
    }
  } else if (pathResult && pathResult.totalDistanceMeters > 0) {
    remainingDistanceMeters = Math.max(0, pathResult.totalDistanceMeters - roverState.distanceTraveledMeters);
  }

  return (
    <div
      onClick={onOpenDetails}
      className="w-full bg-[#0a0f1d] border border-cyan-950/90 hover:border-cyan-500/50 rounded-xl p-2.5 shadow-xl font-mono text-xs cursor-pointer active:scale-[0.99] transition-all space-y-2 lg:hidden"
    >
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-cyan-900/30 pb-1">
        <span className="font-bold text-gray-200">ROVER LIVE TELEMETRY</span>
        <span className="text-cyan-400 flex items-center gap-0.5">
          <span>EXPAND DETAILS</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-[10.5px]">
        {/* Speed */}
        <div className="bg-[#0d1424] p-1.5 rounded space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] text-gray-400">
            <Gauge className="w-2.5 h-2.5 text-cyan-400" />
            <span>SPEED</span>
          </div>
          <div className="font-bold text-white text-xs">
            <AnimatedNumber value={roverState.velocity} decimals={1} suffix=" m/s" />
          </div>
        </div>

        {/* Battery */}
        <div className="bg-[#0d1424] p-1.5 rounded space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] text-gray-400">
            <Battery className={`w-2.5 h-2.5 ${isBatteryLow ? 'text-red-400' : 'text-amber-400'}`} />
            <span>BATT</span>
          </div>
          <div className={`font-bold text-xs ${isBatteryLow ? 'text-red-400' : 'text-amber-300'}`}>
            <AnimatedNumber value={batteryPct} decimals={0} suffix="%" />
          </div>
        </div>

        {/* Distance Travelled */}
        <div className="bg-[#0d1424] p-1.5 rounded space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] text-gray-400">
            <Route className="w-2.5 h-2.5 text-cyan-400" />
            <span>DIST</span>
          </div>
          <div className="font-bold text-white text-xs truncate">
            <AnimatedNumber value={roverState.distanceTraveledMeters} decimals={1} suffix="m" />
          </div>
        </div>

        {/* Remaining Distance */}
        <div className="bg-[#0d1424] p-1.5 rounded space-y-0.5">
          <div className="text-[9px] text-gray-400">REMAIN</div>
          <div className="font-bold text-amber-300 text-xs truncate">
            <AnimatedNumber value={remainingDistanceMeters} decimals={1} suffix="m" />
          </div>
        </div>
      </div>
    </div>
  );
};
