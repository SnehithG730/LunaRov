'use client';

import React from 'react';
import { useMissionStore } from '@/core/simulation/missionStore';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CircleDot } from 'lucide-react';

export const ManualControlPad: React.FC = () => {
  const selectedAlgorithm = useMissionStore((s) => s.selectedAlgorithm);
  const manualInput = useMissionStore((s) => s.manualInput);
  const setManualInput = useMissionStore((s) => s.setManualInput);

  if (selectedAlgorithm !== 'MANUAL') return null;

  const handlePress = (throttle: number, steering: number) => {
    setManualInput({ throttle, steering });
  };

  const handleRelease = () => {
    setManualInput({ throttle: 0, steering: 0 });
  };

  return (
    <div className="w-full bg-[#0a1020] border border-cyan-900/60 rounded-xl p-3 shadow-lg font-mono text-xs">
      <div className="flex items-center justify-between border-b border-cyan-950 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-gray-200">MANUAL ROVER PILOT DECK</span>
        </div>
        <span className="text-[10px] text-gray-500">KEYBOARD: [W,A,S,D] or [ARROWS]</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
        {/* Virtual D-Pad */}
        <div className="relative w-36 h-36 flex items-center justify-center bg-black/50 border border-cyan-950 rounded-full p-2">
          {/* Forward */}
          <button
            onMouseDown={() => handlePress(1.0, 0)}
            onMouseUp={handleRelease}
            onTouchStart={() => handlePress(1.0, 0)}
            onTouchEnd={handleRelease}
            className={`absolute top-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              manualInput.throttle > 0
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50 scale-95'
                : 'bg-[#152038] text-gray-300 hover:bg-[#1f2f52] border border-cyan-800/40'
            }`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* Reverse */}
          <button
            onMouseDown={() => handlePress(-0.7, 0)}
            onMouseUp={handleRelease}
            onTouchStart={() => handlePress(-0.7, 0)}
            onTouchEnd={handleRelease}
            className={`absolute bottom-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              manualInput.throttle < 0
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50 scale-95'
                : 'bg-[#152038] text-gray-300 hover:bg-[#1f2f52] border border-cyan-800/40'
            }`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {/* Turn Left */}
          <button
            onMouseDown={() => handlePress(manualInput.throttle, -1.0)}
            onMouseUp={handleRelease}
            onTouchStart={() => handlePress(manualInput.throttle, -1.0)}
            onTouchEnd={handleRelease}
            className={`absolute left-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              manualInput.steering < 0
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50 scale-95'
                : 'bg-[#152038] text-gray-300 hover:bg-[#1f2f52] border border-cyan-800/40'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Turn Right */}
          <button
            onMouseDown={() => handlePress(manualInput.throttle, 1.0)}
            onMouseUp={handleRelease}
            onTouchStart={() => handlePress(manualInput.throttle, 1.0)}
            onTouchEnd={handleRelease}
            className={`absolute right-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              manualInput.steering > 0
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50 scale-95'
                : 'bg-[#152038] text-gray-300 hover:bg-[#1f2f52] border border-cyan-800/40'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Center Stop indicator */}
          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-[9px] text-cyan-400 font-bold">
            STOP
          </div>
        </div>

        {/* Manual Pilot Telemetry Guidance */}
        <div className="flex-1 space-y-2 text-[11px] text-gray-400">
          <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-cyan-950">
            <span>THROTTLE COMMAND:</span>
            <strong className={manualInput.throttle > 0 ? 'text-emerald-400' : manualInput.throttle < 0 ? 'text-amber-400' : 'text-gray-300'}>
              {manualInput.throttle > 0 ? 'FORWARD (100%)' : manualInput.throttle < 0 ? 'REVERSE (70%)' : 'NEUTRAL (0%)'}
            </strong>
          </div>
          <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-cyan-950">
            <span>STEERING ANGLE:</span>
            <strong className={manualInput.steering !== 0 ? 'text-cyan-400' : 'text-gray-300'}>
              {manualInput.steering < 0 ? 'LEFT (-100%)' : manualInput.steering > 0 ? 'RIGHT (+100%)' : 'CENTER (0°)'}
            </strong>
          </div>
          <div className="text-[10px] text-gray-500 italic">
            * Note: Manual steering on slopes &gt;18° requires careful throttle management to prevent wheel slip and battery exhaustion.
          </div>
        </div>
      </div>
    </div>
  );
};
