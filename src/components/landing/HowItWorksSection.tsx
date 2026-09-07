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
    <section className="py-20 px-4 sm:px-8 bg-[#04060d] relative z-20 border-t border-cyan-950/70">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            OPERATIONAL LIFECYCLE
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-mono text-white tracking-wide uppercase">
            HOW IT WORKS
          </h2>
          <p className="text-xs sm:text-sm font-mono text-gray-400 max-w-xl mx-auto">
            From vehicle parameterization to autonomous polar execution and debriefing.
          </p>
        </div>

        {/* 5-Step Horizontal Grid Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 font-mono">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-[#090e1c]/90 border border-cyan-950 hover:border-cyan-500/60 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 group space-y-4 relative shadow-lg"
              >
                {/* Step Index Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800/50">
                    PHASE {step.num}
                  </span>
                  <div className="p-2 rounded-lg bg-black/40 text-gray-400 group-hover:text-cyan-300 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase group-hover:text-cyan-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Action Link */}
                <div className="pt-3 border-t border-cyan-950 flex items-center justify-between text-[11px]">
                  <Link
                    href={step.href}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-[#0b1324] border border-cyan-900/60 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1 text-center sm:text-left font-mono">
            <h3 className="text-lg sm:text-xl font-bold text-white uppercase">
              Ready to deploy your lunar exploration mission?
            </h3>
            <p className="text-xs text-gray-400">
              Launch into the high-precision 2D/3D mission control deck and test path algorithms across extreme lunar terrain.
            </p>
          </div>

          <Link
            href="/simulator?mode=setup"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START MISSION NOW</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
