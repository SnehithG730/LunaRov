'use client';

import React from 'react';
import Link from 'next/link';
import { Sliders, Mountain, Route, Play, FileCheck2, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Configure Mission',
      description: 'Define vehicle attributes, speed limits, battery capacity in Wh, and forward LiDAR obstacle detection radius.',
      icon: Sliders,
      actionText: 'Setup Vehicle',
      href: '/simulator?mode=setup',
    },
    {
      num: '02',
      title: 'Select Terrain',
      description: 'Load procedural lunar sectors (Mare Plains, Crater Basin, or Shackleton South Pole) or paint custom craters and boulders.',
      icon: Mountain,
      actionText: 'Choose Sector',
      href: '/simulator',
    },
    {
      num: '03',
      title: 'Calculate Route',
      description: 'Run A*, Dijkstra, or Greedy BFS solvers to calculate energy-optimal paths avoiding slopes >25° and impassable hazards.',
      icon: Route,
      actionText: 'Plan Trajectory',
      href: '/simulator',
    },
    {
      num: '04',
      title: 'Deploy Rover',
      description: 'Execute simulation in 2D and 3D with 50Hz kinematics, live incline resistance, battery drain, and autonomous detour replanning.',
      icon: Play,
      actionText: 'Deploy Vehicle',
      href: '/simulator',
    },
    {
      num: '05',
      title: 'Analyze Results',
      description: 'Review mission efficiency scoring, energy breakdown, peak slopes, telemetry strip charts, and export JSON/CSV mission logs.',
      icon: FileCheck2,
      actionText: 'Review Debrief',
      href: '/simulator?view=missions',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-8 bg-[#030611]/75 backdrop-blur-md relative z-20 border-t border-cyan-950/70">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header - Dual Tone White & Galaxy Theme */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-cyan-950 pb-6 text-left">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              OPERATIONAL LIFECYCLE
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-mono tracking-wide uppercase">
              <span className="text-white">HOW </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-400">
                LUNAROV OPERATES
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-mono text-gray-400 max-w-md">
            From pre-flight vehicle specification to autonomous surface path planning and post-mission debriefing.
          </p>
        </div>

        {/* 5-Step Process Timeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-[#080d1e]/80 border border-cyan-950/80 hover:border-cyan-500/50 rounded-xl p-5 flex flex-col justify-between font-mono space-y-4 hover:shadow-lg transition-all group text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                      {step.num}
                    </span>
                    <div className="p-2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 group-hover:border-cyan-400 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
                    {step.title}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-cyan-950/80">
                  <Link
                    href={step.href}
                    className="inline-flex items-center text-[11px] font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
