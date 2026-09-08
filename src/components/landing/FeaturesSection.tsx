'use client';

import React from 'react';
import Link from 'next/link';
import { Sliders, Cpu, Mountain, Activity, Award, ArrowUpRight } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      id: 'planning',
      title: 'MISSION PLANNING',
      tagline: 'Configure rover and mission parameters.',
      description:
        'Tailor vehicle specifications including maximum velocity, acceleration limits, turning rates, battery capacity (Wh), payload mass, and forward LiDAR detection reach.',
      icon: Sliders,
      specs: ['Custom Rover Identifiers', 'Battery 400 - 3000 Wh', 'LiDAR Sensor Arc 90°'],
      href: '/simulator?mode=setup',
    },
    {
      id: 'pathfinding',
      title: 'SMART PATHFINDING',
      tagline: 'Compare multiple navigation algorithms.',
      description:
        'Benchmark interchangeable search strategies: A* (optimal slope-aware heuristic), Dijkstra (uniform cost baseline), Greedy BFS (heuristic speed), or take direct Manual Pilot steering.',
      icon: Cpu,
      specs: ['Octile & Euclidean Heuristics', 'Diagonal Corner Prevention', 'Local Detour Replanning'],
      href: '/simulator',
    },
    {
      id: 'terrain',
      title: 'TERRAIN ANALYSIS',
      tagline: 'Navigate craters, slopes and hazardous lunar terrain.',
      description:
        'Explore 6 scientifically modeled lunar sectors: Mare Plains, Crater Basin Field, Rocky Regolith, Rolling Highlands, Shackleton South Pole Rim, or build custom sectors with the terrain brush.',
      icon: Mountain,
      specs: ['Fractal Elevation Noise', 'Parabolic Crater Bowls', 'Critical Slopes >25° Impassable'],
      href: '/simulator',
    },
    {
      id: 'telemetry',
      title: 'REAL-TIME TELEMETRY',
      tagline: 'Monitor rover position, speed, battery and distance.',
      description:
        'Stream 50 Hz kinematic data with digital velocity meters, state-of-charge battery gauges, 3D pitch/roll artificial horizon inclinometers, and live SVG strip charts.',
      icon: Activity,
      specs: ['Power Draw (Watts)', 'Elevation Cross-Section', 'LiDAR Hazard Warning'],
      href: '/simulator',
    },
    {
      id: 'analytics',
      title: 'MISSION ANALYTICS',
      tagline: 'Review route efficiency and mission performance.',
      description:
        'Evaluate completed mission debriefs with efficiency indexes (0–100 score, A+ to F grades), autonomous reroute counts, persistent LocalStorage archiving, and JSON/CSV export.',
      icon: Award,
      specs: ['Efficiency Index Rating', 'LocalStorage Mission Archive', 'JSON & CSV Data Export'],
      href: '/simulator?view=missions',
    },
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-8 bg-[#040713]/75 backdrop-blur-md relative z-20 border-t border-cyan-950/70">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header - Dual Tone White & Galaxy Theme */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-cyan-950 pb-6 text-left">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              SYSTEM CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wide uppercase">
              <span className="text-white">AEROSPACE </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-400">
                SIMULATION MODULES
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-mono text-gray-400 max-w-md">
            Engineered with decoupled kinematic physics, procedural planetary geology, and modular pathfinding architectures.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="group bg-[#080d1e]/85 backdrop-blur-md border border-cyan-950/90 hover:border-cyan-500/50 rounded-xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/40 flex flex-col justify-between font-mono space-y-5 text-left"
              >
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-800/40 group-hover:border-cyan-400 text-cyan-400 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Link
                      href={feat.href}
                      className="text-gray-500 group-hover:text-cyan-400 transition-colors p-1"
                      title={`Open ${feat.title}`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-wider uppercase group-hover:text-cyan-300 transition-colors">
                      {feat.title}
                    </h3>
                    <div className="text-xs text-cyan-400/90 font-medium mt-0.5">
                      {feat.tagline}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Technical Bullet Spec Badges */}
                <div className="pt-4 border-t border-cyan-950/80 space-y-1.5 text-[10.5px]">
                  {feat.specs.map((spec, sIdx) => (
                    <div key={sIdx} className="flex items-center text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-cyan-500 mr-2 shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
