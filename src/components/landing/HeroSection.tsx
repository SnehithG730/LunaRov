'use client';

import React from 'react';
import Link from 'next/link';
import { CelestialSpaceBackground } from '@/components/background/CelestialSpaceBackground';
import { Play, Compass, ArrowRight, ShieldCheck, Zap, Mountain, Cpu } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 px-4 sm:px-8 overflow-hidden select-none">
      {/* 3D Celestial Environment with Interactive Spinning Moon, Comets, and Asteroids */}
      <CelestialSpaceBackground interactive={true} intensity="full" showControlsHint={true} />

      {/* Subtle radial depth overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-transparent to-[#040711]/70 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#040711_82%)] pointer-events-none z-10" />

      {/* Hero Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto text-center space-y-7 pointer-events-none">
        {/* System Designation Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#080d1a]/85 border border-cyan-500/40 text-cyan-300 text-xs font-mono backdrop-blur-md shadow-lg shadow-cyan-950/40 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-widest uppercase font-bold text-[11px]">
            AUTONOMOUS LUNAR SURFACE MOBILITY PLATFORM
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-mono tracking-tight text-white leading-tight uppercase">
            LunaRov <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-300 drop-shadow-[0_0_35px_rgba(0,240,255,0.35)]">
              PATH SIMULATOR
            </span>
          </h1>

          {/* Subtitle */}
          <div className="text-lg sm:text-2xl font-mono font-medium text-cyan-300/90 tracking-widest uppercase">
            Plan. Navigate. Explore.
          </div>
        </div>

        {/* Supporting Text */}
        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-gray-300 font-mono leading-relaxed pointer-events-auto">
          Design autonomous lunar missions, calculate energy-optimal paths across cratered regolith, navigate hazardous obstacles, and monitor 50 Hz real-time flight telemetry.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 font-mono text-xs pointer-events-auto">
          {/* Primary CTA: START MISSION */}
          <Link
            href="/setup"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:scale-[1.02] border border-cyan-300"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START MISSION</span>
          </Link>

          {/* Secondary CTA: EXPLORE SIMULATOR */}
          <Link
            href="/simulator"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#0c1426]/90 hover:bg-[#14203d] text-cyan-300 hover:text-white font-bold tracking-wider uppercase transition-all border border-cyan-800/60 hover:border-cyan-500/80 backdrop-blur-md shadow-lg"
          >
            <Compass className="w-4 h-4" />
            <span>EXPLORE SIMULATOR</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </Link>
        </div>

        {/* Aerospace Technical Telemetry Badges */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto font-mono text-left pointer-events-auto">
          <div className="aerospace-panel p-3 rounded-lg flex items-center gap-3">
            <Mountain className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">GRAVITY MODEL</div>
              <div className="text-xs font-bold text-white">1.62 m/s² (1/6 G)</div>
            </div>
          </div>

          <div className="aerospace-panel p-3 rounded-lg flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">SOLVER ENGINES</div>
              <div className="text-xs font-bold text-white">A*, Dijkstra, BFS</div>
            </div>
          </div>

          <div className="aerospace-panel p-3 rounded-lg flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">MAX INCLINE</div>
              <div className="text-xs font-bold text-white">25.0° Threshold</div>
            </div>
          </div>

          <div className="aerospace-panel p-3 rounded-lg flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">DOWNLINK RATE</div>
              <div className="text-xs font-bold text-white">50 Hz Telemetry</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
