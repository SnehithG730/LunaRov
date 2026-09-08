'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import {
  X,
  Compass,
  Sparkles,
  Play,
  Globe,
  Layers,
  Activity,
  Award,
} from 'lucide-react';
import { PlanetData, MoonData } from '@/lib/data/celestialData';

interface PlanetMoonExplorerModalProps {
  planet: PlanetData | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMoon?: (moon: MoonData) => void;
}

export const PlanetMoonExplorerModal: React.FC<PlanetMoonExplorerModalProps> = ({
  planet,
  isOpen,
  onClose,
  onSelectMoon,
}) => {
  const router = useRouter();
  const [activePlanetId, setActivePlanetId] = useState<string | null>(planet?.id ?? null);
  const [selectedMoonIndex, setSelectedMoonIndex] = useState<number>(0);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync moon index if planet changed
  if (planet && planet.id !== activePlanetId) {
    setActivePlanetId(planet.id);
    setSelectedMoonIndex(0);
  }

  const selectedMoon: MoonData | undefined = planet?.moons[selectedMoonIndex];

  // 3D Live WebGL Moon Renderer with Three.js
  useEffect(() => {
    if (!isOpen || !selectedMoon || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;

    // Clear previous canvas if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8.5);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0c1e38, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
    sunLight.position.set(10, 8, 12);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x00d2ff, 2.5);
    rimLight.position.set(-10, -5, -8);
    scene.add(rimLight);

    // 5. Procedural Moon Texture Generation based on Surface Type
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Base background
      ctx.fillStyle = selectedMoon.baseColor;
      ctx.fillRect(0, 0, 1024, 512);

      if (selectedMoon.surfaceType === 'CRATERED_REGOLITH') {
        // Lunar / Martian crater patterns
        for (let i = 0; i < 80; i++) {
          const cx = Math.random() * 1024;
          const cy = Math.random() * 512;
          const cr = 4 + Math.random() * 26;
          ctx.fillStyle = '#27272a';
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d4d4d8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (selectedMoon.surfaceType === 'ICE_CRUST') {
        // Europa / Enceladus fractured lineae & ice cracks
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 35; i++) {
          ctx.beginPath();
          ctx.moveTo(Math.random() * 1024, Math.random() * 512);
          ctx.bezierCurveTo(
            Math.random() * 1024,
            Math.random() * 512,
            Math.random() * 1024,
            Math.random() * 512,
            Math.random() * 1024,
            Math.random() * 512
          );
          ctx.stroke();
        }
      } else if (selectedMoon.surfaceType === 'VOLCANIC_SULFUR') {
        // Io sulfur calderas and lava flows
        for (let i = 0; i < 60; i++) {
          const cx = Math.random() * 1024;
          const cy = Math.random() * 512;
          const cr = 8 + Math.random() * 32;
          ctx.fillStyle = Math.random() > 0.5 ? '#b45309' : '#dc2626';
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (selectedMoon.surfaceType === 'METHANE_LAKES') {
        // Titan liquid hydrocarbon lakes and dunes
        ctx.fillStyle = '#0c4a6e';
        for (let i = 0; i < 25; i++) {
          const cx = Math.random() * 1024;
          const cy = 60 + Math.random() * 180;
          const cr = 20 + Math.random() * 50;
          ctx.beginPath();
          ctx.ellipse(cx, cy, cr, cr * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (selectedMoon.surfaceType === 'CHAOTIC_TERRAIN') {
        // Miranda extreme tectonic fault blocks
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4.0;
        for (let i = 0; i < 40; i++) {
          ctx.strokeRect(Math.random() * 1024, Math.random() * 512, 50 + Math.random() * 120, 30 + Math.random() * 80);
        }
      } else if (selectedMoon.surfaceType === 'NITROGEN_FROST') {
        // Triton cantaloupe terrain & nitrogen geyser deposits
        ctx.fillStyle = '#1e3a8a';
        for (let i = 0; i < 90; i++) {
          const cx = Math.random() * 1024;
          const cy = Math.random() * 512;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const moonGeo = new THREE.SphereGeometry(3.0, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: selectedMoon.roughness,
      metalness: 0.1,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // Glowing Atmospheric/Scatter Halo
    const haloGeo = new THREE.SphereGeometry(3.12, 48, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(selectedMoon.accentColor),
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // 6. Interactive Mouse Drag to Rotate in 3D
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - previousMouse.x;
      const dy = e.clientY - previousMouse.y;
      moonMesh.rotation.y += dx * 0.01;
      moonMesh.rotation.x += dy * 0.01;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 7. Render Loop
    let animId: number;
    const animate = () => {
      if (!isDragging) {
        moonMesh.rotation.y += 0.006;
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, selectedMoon]);

  if (!isOpen || !planet) return null;

  // Handle direct deployment to simulator
  const handleDeployToSimulator = () => {
    if (selectedMoon && onSelectMoon) {
      onSelectMoon(selectedMoon);
    }
    onClose();
    router.push('/simulator');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#080d1a]/95 via-[#040712]/95 to-[#02050c]/98 border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.35)] overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-950/80 bg-cyan-950/30">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-mono shadow-md border"
              style={{
                backgroundColor: `${planet.color}33`,
                borderColor: planet.accentColor,
                color: planet.accentColor,
              }}
            >
              {planet.orderFromSun}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-fuchsia-300">
                  {planet.name} Planetary System
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-mono">
                  {planet.moonsCount} {planet.moonsCount === 1 ? 'MOON' : 'MOONS'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {planet.latinName} • {planet.distanceFromSunAU} AU from Sun • Orbital Period: {planet.orbitalPeriodYears} Earth Years
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/80 border border-slate-700 hover:border-red-400 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
            title="Close Explorer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Moon Selector Tabs (If Planet has moons) */}
        {planet.moons.length > 0 ? (
          <div className="flex items-center space-x-2 px-6 py-2.5 border-b border-cyan-950/60 bg-[#030610] overflow-x-auto">
            <span className="text-xs font-mono text-slate-400 mr-2 flex items-center gap-1 shrink-0">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Satellite:</span>
            </span>
            {planet.moons.map((moon, idx) => (
              <button
                key={moon.id}
                onClick={() => setSelectedMoonIndex(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
                  selectedMoonIndex === idx
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/30 scale-105'
                    : 'bg-cyan-950/40 text-slate-300 hover:text-cyan-300 hover:bg-cyan-900/50 border border-cyan-800/40'
                }`}
              >
                <span>{moon.name}</span>
                <span className="text-[9px] opacity-75">({moon.radiusKm} km)</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-cyan-950/20 text-slate-400 font-mono text-sm">
            {planet.name} has no natural satellites. Explore its extreme surface and atmospheric telemetry below.
          </div>
        )}

        {/* Modal Main Content Body */}
        {selectedMoon ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
            {/* Left 3D Viewport Column */}
            <div className="lg:col-span-5 p-6 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-cyan-950/80 bg-gradient-to-b from-cyan-950/20 via-transparent to-black/40">
              <div className="w-full text-left">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  3D HYPER-REALISTIC SURFACE VIEW
                </span>
                <h3 className="text-2xl font-black font-mono text-white mt-1">
                  {selectedMoon.name}
                </h3>
                <p className="text-xs text-cyan-300/80 font-mono mt-0.5">
                  {selectedMoon.tagline}
                </p>
              </div>

              {/* 3D WebGL Canvas Container */}
              <div className="relative w-full aspect-square max-w-[300px] my-4">
                <div
                  ref={canvasContainerRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing rounded-full shadow-[0_0_50px_rgba(6,182,212,0.25)]"
                />
                <div className="absolute bottom-1 right-1 flex items-center space-x-1 text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded-full border border-slate-700 pointer-events-none">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  <span>360° Drag & Spin</span>
                </div>
              </div>

              {/* Action: Deploy Rover Simulator on this Moon */}
              <button
                onClick={handleDeployToSimulator}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-black font-mono font-bold text-xs tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Deploy Rover on {selectedMoon.name}</span>
              </button>
            </div>

            {/* Right Scientific Telemetry & History Column */}
            <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto">
              {/* Scientific Telemetry 6-Card Grid */}
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>NASA / ESA Astrophysical Specifications</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                  {/* Card 1: Radius */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">MEAN RADIUS</p>
                    <p className="text-sm font-bold text-slate-100">{selectedMoon.radiusKm} km</p>
                  </div>

                  {/* Card 2: Gravity */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">SURFACE GRAVITY</p>
                    <p className="text-sm font-bold text-cyan-300">{selectedMoon.surfaceGravity} m/s²</p>
                  </div>

                  {/* Card 3: Surface Temp */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">SURFACE TEMP</p>
                    <p className="text-xs font-bold text-amber-300 truncate">{selectedMoon.surfaceTempC}</p>
                  </div>

                  {/* Card 4: Orbital Distance */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">ORBITAL DISTANCE</p>
                    <p className="text-sm font-bold text-slate-100">{selectedMoon.orbitalDistanceKm.toLocaleString()} km</p>
                  </div>

                  {/* Card 5: Orbital Period */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">ORBITAL PERIOD</p>
                    <p className="text-sm font-bold text-slate-100">{selectedMoon.orbitalPeriodDays} Earth Days</p>
                  </div>

                  {/* Card 6: Mass */}
                  <div className="p-3 rounded-xl bg-[#0a1022]/80 border border-cyan-500/20 shadow-sm">
                    <p className="text-[10px] text-slate-400">MASS</p>
                    <p className="text-xs font-bold text-slate-100 truncate">{selectedMoon.massKg}</p>
                  </div>
                </div>
              </div>

              {/* Scientific Overview */}
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Scientific Profile & Mission Utility</span>
                </h4>
                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#0a1022]/50 p-3.5 rounded-xl border border-cyan-950">
                  {selectedMoon.scientificDescription}
                </p>
              </div>

              {/* Atmosphere */}
              <div className="bg-[#0a1022]/60 p-3.5 rounded-xl border border-cyan-500/20">
                <p className="text-[10px] text-slate-400 font-mono font-semibold">ATMOSPHERIC COMPOSITION</p>
                <p className="text-xs font-mono text-cyan-200 mt-1">{selectedMoon.atmosphere}</p>
              </div>

              {/* Geological Highlights */}
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Geological & Terrain Highlights</span>
                </h4>
                <ul className="space-y-1.5 font-mono text-xs text-slate-300">
                  {selectedMoon.geologicalHighlights.map((geo, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#0a1022]/40 p-2 rounded-lg border border-cyan-950/60">
                      <span className="text-cyan-400 shrink-0">•</span>
                      <span>{geo}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Historical Exploration Missions */}
              <div>
                <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>Historic Spacecraft & Future Exploration</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-slate-300">
                  {selectedMoon.historicalMissions.map((mis, i) => (
                    <div key={i} className="bg-gradient-to-r from-cyan-950/40 to-[#0a1022]/40 p-2.5 rounded-lg border border-cyan-900/40">
                      <p className="text-cyan-300 font-semibold">{mis}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Fallback for planets without moons (Mercury, Venus) */
          <div className="p-8 space-y-6 overflow-y-auto font-mono">
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <h3 className="text-lg font-bold text-white">{planet.name} Overview</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{planet.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#0a1022] border border-cyan-500/20">
                <p className="text-[10px] text-slate-400">MEAN RADIUS</p>
                <p className="text-sm font-bold text-slate-100">{planet.radiusKm} km</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a1022] border border-cyan-500/20">
                <p className="text-[10px] text-slate-400">DISTANCE FROM SUN</p>
                <p className="text-sm font-bold text-cyan-300">{planet.distanceFromSunAU} AU</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a1022] border border-cyan-500/20">
                <p className="text-[10px] text-slate-400">ORBITAL PERIOD</p>
                <p className="text-sm font-bold text-slate-100">{planet.orbitalPeriodYears} Yrs</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0a1022] border border-cyan-500/20">
                <p className="text-[10px] text-slate-400">NATURAL SATELLITES</p>
                <p className="text-sm font-bold text-slate-100">0</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0a1022] border border-cyan-500/20">
              <p className="text-[10px] text-slate-400 font-semibold">ATMOSPHERIC COMPOSITION</p>
              <p className="text-xs text-cyan-200 mt-1">{planet.atmosphereComposition}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
