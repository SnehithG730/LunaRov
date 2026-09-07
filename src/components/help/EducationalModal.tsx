'use client';

import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ALGORITHMS' | 'PHYSICS' | 'ROVERS'>('OVERVIEW');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0a1020] border border-cyan-500/50 rounded-2xl shadow-2xl p-6 font-mono text-xs space-y-4 relative max-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-cyan-950">
          <div className="p-2.5 bg-cyan-950 border border-cyan-500/40 rounded-lg">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              LunaRov — OPERATIONAL GUIDE & ARCHITECTURE
            </h2>
            <p className="text-[11px] text-gray-400">
              Theoretical foundation of lunar topography, pathfinding, and vehicle energetics
            </p>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="flex items-center gap-2 border-b border-cyan-950 pb-2">
          {(['OVERVIEW', 'ALGORITHMS', 'PHYSICS', 'ROVERS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-[11.5px] leading-relaxed text-gray-300 scrollbar-thin scrollbar-thumb-cyan-950">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-3">
              <h3 className="text-cyan-400 font-bold text-xs uppercase">Welcome to LunaRov Mission Control</h3>
              <p>
                <strong>LunaRov</strong> is an aerospace-grade simulation platform designed to study autonomous ground navigation across hazardous lunar terrain. Users plan and evaluate trajectories by considering realistic slope resistance, battery drainage, boulder fields, and impact craters.
              </p>

              <div className="bg-[#0e172e] border border-cyan-900/40 p-3 rounded-xl space-y-2">
                <div className="font-bold text-white text-xs">How to Operate:</div>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li><strong>Select Sector:</strong> Choose a preset (e.g. Mare Plains, Crater Basin, or South Pole Rim).</li>
                  <li><strong>Configure Waypoints:</strong> Click <em>Set Start</em> or <em>Set Target</em> to reposition on the 2D map, or use <em>Randomize Waypoints</em>.</li>
                  <li><strong>Choose Algorithm:</strong> Compare A*, Dijkstra, Greedy BFS, or take manual steering control.</li>
                  <li><strong>Execute Simulation:</strong> Press <em>Execute Mission</em>. Watch the rover navigate in 2D and 3D with forward LiDAR scanning and automatic obstacle avoidance!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'ALGORITHMS' && (
            <div className="space-y-3">
              <h3 className="text-cyan-400 font-bold text-xs uppercase">Pathfinding Engine Comparison</h3>

              <div className="space-y-2">
                <div className="bg-[#0e172e] border border-cyan-900/40 p-3 rounded-lg">
                  <div className="font-bold text-cyan-300">1. A* (A-Star) with Slope Heuristic</div>
                  <p className="text-gray-400 mt-1">
                    Combines the exact accumulated path cost \(g(n)\) (incorporating distance, slope angle, and surface friction) with an admissible octile distance heuristic \(h(n)\). It guarantees an optimal trajectory while minimizing the total number of explored cells.
                  </p>
                </div>

                <div className="bg-[#0e172e] border border-cyan-900/40 p-3 rounded-lg">
                  <div className="font-bold text-cyan-300">2. Dijkstra (Uniform Cost Search)</div>
                  <p className="text-gray-400 mt-1">
                    Expands nodes strictly in order of lowest accumulated cost with no forward-looking heuristic (\(h(n) = 0\)). It guarantees finding the mathematical lowest cost path across the entire grid, serving as the benchmark to show the search pruning efficiency of A*.
                  </p>
                </div>

                <div className="bg-[#0e172e] border border-cyan-900/40 p-3 rounded-lg">
                  <div className="font-bold text-amber-300">3. Greedy Best-First Search</div>
                  <p className="text-gray-400 mt-1">
                    Evaluates nodes based solely on the estimated distance to the target \(f(n) = h(n)\). While very fast in wide open plains, it completely ignores terrain difficulty and often drives directly into impassable crater walls or dead ends.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PHYSICS' && (
            <div className="space-y-3">
              <h3 className="text-cyan-400 font-bold text-xs uppercase">Lunar Physics & Vehicle Energetics</h3>
              <p>
                Unlike Earth driving, lunar surface mobility operates in extreme environmental conditions:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#0e172e] border border-cyan-950 p-2.5 rounded">
                  <div className="text-cyan-400 font-bold">Lunar Gravity (1.62 m/s²)</div>
                  <div className="text-gray-400 mt-0.5">Roughly 1/6th Earth gravity. Vehicles have significantly less traction and higher propensity for wheel slip on steep regolith slopes.</div>
                </div>
                <div className="bg-[#0e172e] border border-cyan-950 p-2.5 rounded">
                  <div className="text-cyan-400 font-bold">Critical Slope Limit (25°)</div>
                  <div className="text-gray-400 mt-0.5">The angle of repose for loose lunar regolith is roughly 30°-35°. To prevent catastrophic vehicle roll-over or wheel spinning, slopes &gt;25° are classified impassable.</div>
                </div>
                <div className="bg-[#0e172e] border border-cyan-950 p-2.5 rounded">
                  <div className="text-amber-400 font-bold">Gravitational Incline Work</div>
                  <div className="text-gray-400 mt-0.5">Driving uphill requires extra mechanical motor power \(P = m \cdot g \cdot v \cdot \sin(\theta)\), rapidly draining battery reserves.</div>
                </div>
                <div className="bg-[#0e172e] border border-cyan-950 p-2.5 rounded">
                  <div className="text-cyan-400 font-bold">Dynamic Rerouting</div>
                  <div className="text-gray-400 mt-0.5">Forward LiDAR sensors detect unmapped obstacles within 12m. When an obstruction blocks the trajectory, autonomous local replanning splices a safe detour.</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ROVERS' && (
            <div className="space-y-3">
              <h3 className="text-cyan-400 font-bold text-xs uppercase">Historic & Future Lunar Exploration Vehicles</h3>
              <div className="space-y-2">
                <div className="bg-[#0e172e] border border-cyan-950 p-3 rounded">
                  <strong className="text-white">Apollo LRV (1971–1972)</strong>
                  <div className="text-gray-400 mt-1">
                    The Apollo Lunar Roving Vehicle was manually driven by astronauts on Apollo 15, 16, and 17. Powered by non-rechargeable silver-zinc batteries, it achieved a top speed of 3.6 m/s (13 km/h).
                  </div>
                </div>

                <div className="bg-[#0e172e] border border-cyan-950 p-3 rounded">
                  <strong className="text-white">NASA VIPER (Volatiles Investigating Polar Exploration Rover)</strong>
                  <div className="text-gray-400 mt-1">
                    Designed for the Lunar South Pole with stereo vision and headlights to navigate permanently shadowed craters in search of water ice deposits.
                  </div>
                </div>

                <div className="bg-[#0e172e] border border-cyan-950 p-3 rounded">
                  <strong className="text-white">Artemis LTV (Lunar Terrain Vehicle)</strong>
                  <div className="text-gray-400 mt-1">
                    Next-generation dual-mode rover capable of both crewed driving and fully autonomous operations for Artemis polar exploration missions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-cyan-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
