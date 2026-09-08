'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Mountain,
  Cpu,
  Orbit,
  Globe,
  ChevronDown,
  ChevronsDown,
  Radio,
  Layers,
  Crosshair,
} from 'lucide-react';
import { PlanetData, SOLAR_SYSTEM_PLANETS } from '@/lib/data/celestialData';

interface HeroSectionProps {
  onOpenPlanetInspector?: (planet: PlanetData) => void;
  activePlanetIndex?: number;
  onScrollToPlanet?: (index: number) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenPlanetInspector,
  activePlanetIndex = 0,
  onScrollToPlanet,
}) => {
  const currentPlanet = SOLAR_SYSTEM_PLANETS[activePlanetIndex] || SOLAR_SYSTEM_PLANETS[0];
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const statusPillRef = useRef<HTMLDivElement | null>(null);
  const [isPastInitialWaypoint, setIsPastInitialWaypoint] = useState(false);

  // High-performance scroll tracking directly updating DOM with 0 React reconciler overhead
  useEffect(() => {
    let animId: number;

    const onScroll = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        const track = document.getElementById('solar-voyage');
        if (!track) return;
        const totalTrackScroll = track.offsetHeight - window.innerHeight;
        if (totalTrackScroll <= 0) return;

        const progress = Math.min(Math.max(window.scrollY / totalTrackScroll, 0), 1);
        const percent = Math.min(Math.max(progress * 100, 4), 100);

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${percent}%`;
        }

        const pastInitial = progress > 0.05;
        setIsPastInitialWaypoint(pastInitial);

        if (statusPillRef.current) {
          if (progress >= 0.96) {
            statusPillRef.current.innerHTML = `
              <span class="flex items-center gap-1.5 text-fuchsia-300">
                <span>TRANSIT COMPLETE</span>
                <svg class="w-3.5 h-3.5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
              </span>
            `;
            statusPillRef.current.className = 'flex items-center text-[10px] font-bold bg-fuchsia-950/60 px-2.5 py-1 rounded-lg border border-fuchsia-500/40 animate-pulse';
          } else {
            statusPillRef.current.innerHTML = `
              <span class="flex items-center gap-1 text-cyan-300">
                <span>SCROLL PLANETS</span>
                <svg class="w-3.5 h-3.5 text-cyan-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              </span>
            `;
            statusPillRef.current.className = 'flex items-center text-[10px] font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-700/50';
          }
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="relative min-h-[96vh] flex flex-col justify-between pt-24 pb-8 px-4 sm:px-8 md:px-12 overflow-hidden select-none">
      {/* Multi-Coloured Depth Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020511]/95 via-[#020511]/65 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020511] via-transparent to-[#020511]/60 pointer-events-none z-10" />

      {/* Main Content Area */}
      <div className="relative z-20 max-w-3xl text-left space-y-6 pointer-events-none pl-2 sm:pl-4 pt-2">
        {/* Multi-Coloured Galaxy Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#080f24]/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono backdrop-blur-md shadow-lg shadow-cyan-950/50 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-widest uppercase font-bold text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 via-fuchsia-300 to-amber-300">
            AUTONOMOUS SURFACE MOBILITY & SOLAR SYSTEM EXPLORATION
          </span>
          <Orbit className="w-3.5 h-3.5 text-fuchsia-400 animate-spin-slow" />
        </div>

        {/* Multi-Tone Headline (White + Galaxy Gradient) */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-mono tracking-tight text-left leading-[1.04] uppercase">
            <span className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]">
              LUNAROV
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 via-indigo-300 via-purple-400 to-fuchsia-400 drop-shadow-[0_0_40px_rgba(192,132,252,0.55)]">
              PATH SIMULATOR
            </span>
          </h1>

          {/* Galaxy Theme Subtitle */}
          <div className="flex items-center gap-2.5 text-sm sm:text-lg md:text-xl font-mono font-bold tracking-widest uppercase">
            <span className="text-white">PLAN.</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-sky-200">NAVIGATE.</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400">EXPLORE.</span>
          </div>
        </div>

        {/* Dynamic Celestial Waypoint Card or Mission Briefing */}
        {isPastInitialWaypoint ? (
          <div className="max-w-xl p-4 rounded-2xl bg-[#040816]/90 border border-cyan-500/40 backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.15)] space-y-3 font-mono pointer-events-auto transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-[0_0_14px_currentColor] animate-pulse"
                  style={{ backgroundColor: currentPlanet.color, color: currentPlanet.color }}
                />
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>WAYPOINT {activePlanetIndex + 1}/8:</span>
                  <span className="text-cyan-300">{currentPlanet.name}</span>
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                  {currentPlanet.distanceFromSunAU} AU
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span>{currentPlanet.moonsCount} Moons</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
              {currentPlanet.description}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 text-[10.5px] border-t border-cyan-950/80">
              <div className="bg-[#060c22]/60 p-1.5 rounded-lg border border-cyan-900/40">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Radius</span>
                <span className="text-cyan-300 font-bold">{currentPlanet.radiusKm.toLocaleString()} km</span>
              </div>
              <div className="bg-[#060c22]/60 p-1.5 rounded-lg border border-cyan-900/40">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Atmosphere</span>
                <span className="text-cyan-300 font-bold truncate max-w-[120px] block" title={currentPlanet.atmosphereComposition}>
                  {currentPlanet.atmosphereComposition}
                </span>
              </div>
              <div className="bg-[#060c22]/60 p-1.5 rounded-lg border border-cyan-900/40">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Orbit Period</span>
                <span className="text-cyan-300 font-bold">{currentPlanet.orbitalPeriodYears} yr</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="max-w-xl text-xs sm:text-sm text-slate-300 font-mono leading-relaxed pointer-events-auto">
            High-fidelity aerospace simulation modeling autonomous surface mobility, evaluating heuristic pathfinding algorithms (A*, Dijkstra, Greedy BFS), and analyzing energy consumption across hazardous planetary surfaces and moons.
          </p>
        )}

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3.5 pt-1 font-mono text-xs pointer-events-auto">
          {/* Primary CTA: START MISSION */}
          <Link
            href="/setup"
            className="flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(0,240,255,0.45)] hover:shadow-[0_0_40px_rgba(0,240,255,0.7)] hover:scale-[1.02] border border-cyan-200 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START MISSION</span>
          </Link>

          {/* Secondary CTA: EXPLORE PLANETS & MOONS */}
          <button
            onClick={() => {
              if (onOpenPlanetInspector) {
                onOpenPlanetInspector(currentPlanet);
              }
            }}
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#0a1024]/90 hover:bg-[#121c3d] text-cyan-200 hover:text-white font-bold tracking-wider uppercase transition-all border border-cyan-700 hover:border-cyan-400/80 backdrop-blur-md shadow-lg cursor-pointer"
          >
            <Globe className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>INSPECT {currentPlanet.name.toUpperCase()} MOONS</span>
          </button>

          {/* Tertiary CTA: SIMULATOR */}
          <Link
            href="/simulator"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 font-bold transition-all border border-slate-700/60"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>SIMULATOR</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Aerospace Technical Telemetry Badges */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl font-mono text-left pointer-events-auto">
          <div className="p-2.5 rounded-xl bg-[#080e22]/80 border border-cyan-900/60 hover:border-cyan-500/50 backdrop-blur-md transition-colors flex items-center gap-2.5">
            <Mountain className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-bold">LUNAR GRAVITY</div>
              <div className="text-xs font-bold text-white">1.62 m/s²</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080e22]/80 border border-cyan-900/60 hover:border-purple-500/50 backdrop-blur-md transition-colors flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-bold">SOLVER ENGINES</div>
              <div className="text-xs font-bold text-white">A*, Dijkstra, BFS</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080e22]/80 border border-cyan-900/60 hover:border-amber-500/50 backdrop-blur-md transition-colors flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-bold">MAX INCLINE</div>
              <div className="text-xs font-bold text-white">25.0° Slope</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#080e22]/80 border border-cyan-900/60 hover:border-emerald-500/50 backdrop-blur-md transition-colors flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase font-bold">DOWNLINK RATE</div>
              <div className="text-xs font-bold text-white">50 Hz Telemetry</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Pinned Transit HUD & Scroll Guidance */}
      <div className="relative z-20 w-full max-w-4xl mx-auto pt-4 pointer-events-auto font-mono select-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-2.5 rounded-2xl bg-[#040816]/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl">
          {/* Planetary Milestones */}
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Voyage:
            </span>
            <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto py-1">
              {SOLAR_SYSTEM_PLANETS.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => onScrollToPlanet && onScrollToPlanet(idx)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                    activePlanetIndex === idx
                      ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/50 scale-110'
                      : activePlanetIndex > idx
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                      : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'
                  }`}
                  title={`Jump to ${p.name}`}
                >
                  {p.name.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar & Scroll Status Guidance */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-800/80 overflow-hidden shrink-0 border border-cyan-950">
              <div
                ref={progressBarRef}
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 transition-all duration-75 ease-out"
                style={{ width: '4%' }}
              />
            </div>

            <div ref={statusPillRef} className="flex items-center text-[10px] font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-700/50">
              <span className="flex items-center gap-1 text-cyan-300">
                <span>SCROLL PLANETS</span>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

