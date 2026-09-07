'use client';

import React from 'react';
import Link from 'next/link';
import { CelestialSpaceBackground } from '@/components/background/CelestialSpaceBackground';
import { Play, Compass, ArrowRight, ShieldCheck, Zap, Mountain, Cpu, Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[96vh] flex items-center justify-start pt-24 pb-16 px-4 sm:px-8 md:px-12 overflow-hidden select-none">
      {/* 3D Celestial Environment with Interactive Realistic Moon, Craters, Multi-Moons & Planets */}
      <CelestialSpaceBackground interactive={true} intensity="full" showControlsHint={true} />

      {/* Subtle radial & linear depth gradient overlay configured to keep left side readable and right side vivid */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030611]/95 via-[#030611]/60 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#030611] via-transparent to-[#030611]/60 pointer-events-none z-10" />

      {/* Hero Content Container - Aligned to the Left Side */}
      <div className="relative z-20 max-w-3xl text-left space-y-7 pointer-events-none pl-2 sm:pl-4">
        {/* Dual-Tone System Designation Tag */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#080d1e]/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono backdrop-blur-md shadow-lg shadow-cyan-950/50 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-widest uppercase font-bold text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-400">
            AUTONOMOUS LUNAR MOBILITY & SURFACE EXPLORATION
          </span>
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
        </div>

        {/* Dual-Tone Headline (Pure White + Galaxy Theme) */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-mono tracking-tight text-left leading-[1.04] uppercase">
            <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]">
              LUNAROV
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 via-indigo-300 via-purple-400 to-fuchsia-400 drop-shadow-[0_0_40px_rgba(192,132,252,0.55)]">
              PATH SIMULATOR
            </span>
          </h1>

          {/* Dual-Tone Subtitle */}
          <div className="flex items-center gap-3 text-base sm:text-xl md:text-2xl font-mono font-bold tracking-widest uppercase">
            <span className="text-white">PLAN.</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-sky-200">NAVIGATE.</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400">EXPLORE.</span>
          </div>
        </div>

        {/* Supporting Text */}
        <p className="max-w-xl text-xs sm:text-sm text-gray-300 font-mono leading-relaxed pointer-events-auto">
          High-fidelity aerospace simulation modeling autonomous surface mobility, evaluating heuristic pathfinding algorithms (A*, Dijkstra, Greedy BFS), and analyzing energy consumption across hazardous lunar topography.
        </p>

        {/* Call-to-Action Buttons - Left-Aligned */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4 pt-2 font-mono text-xs pointer-events-auto">
          {/* Primary CTA: START MISSION */}
          <Link
            href="/setup"
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(0,240,255,0.45)] hover:shadow-[0_0_40px_rgba(0,240,255,0.7)] hover:scale-[1.02] border border-cyan-200"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START MISSION</span>
          </Link>

          {/* Secondary CTA: EXPLORE SIMULATOR */}
          <Link
            href="/simulator"
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#0a1024]/90 hover:bg-[#121c3d] text-cyan-200 hover:text-white font-bold tracking-wider uppercase transition-all border border-cyan-800/70 hover:border-cyan-400/80 backdrop-blur-md shadow-lg"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>EXPLORE SIMULATOR</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </Link>
        </div>

        {/* Aerospace Technical Telemetry Badges - Left-Aligned */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl font-mono text-left pointer-events-auto">
          <div className="p-3 rounded-lg bg-[#070c1c]/80 border border-cyan-950 hover:border-cyan-500/50 backdrop-blur-md transition-colors flex items-center gap-3">
            <Mountain className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">GRAVITY MODEL</div>
              <div className="text-xs font-bold text-white">1.62 m/s²</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#070c1c]/80 border border-cyan-950 hover:border-purple-500/50 backdrop-blur-md transition-colors flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">SOLVER ENGINES</div>
              <div className="text-xs font-bold text-white">A*, Dijkstra, BFS</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#070c1c]/80 border border-cyan-950 hover:border-amber-500/50 backdrop-blur-md transition-colors flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold">MAX INCLINE</div>
              <div className="text-xs font-bold text-white">25.0° Slope</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#070c1c]/80 border border-cyan-950 hover:border-emerald-500/50 backdrop-blur-md transition-colors flex items-center gap-3">
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
