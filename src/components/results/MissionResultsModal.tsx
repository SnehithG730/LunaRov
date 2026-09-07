'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useMissionStore } from '@/core/simulation/missionStore';
import { MissionResultsView } from './MissionResultsView';
import { X } from 'lucide-react';

export const MissionResultsModal: React.FC = () => {
  const missionResults = useMissionStore((s) => s.missionResults);
  const dismissResults = useMissionStore((s) => s.dismissResults);

  useEffect(() => {
    if (missionResults?.outcome === 'SUCCESS') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#3b82f6', '#10b981', '#fbbf24'],
        });
      } catch {
        // Fallback if canvas-confetti fails
      }
    }
  }, [missionResults]);

  if (!missionResults) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl my-auto bg-[#070b16] border border-cyan-500/50 rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-black/40">
        {/* Close Button */}
        <button
          onClick={dismissResults}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-cyan-950 z-20"
          title="Close Report"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Full Scientific Debrief View */}
        <MissionResultsView onClose={dismissResults} />
      </div>
    </div>
  );
};
