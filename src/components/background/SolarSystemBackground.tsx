'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SOLAR_SYSTEM_PLANETS, PlanetData } from '@/lib/data/celestialData';
import { Globe, Eye } from 'lucide-react';

// Planet Waypoints in 3D Space (X, Y, Z coordinates for each of the 8 planets)
const PLANET_WAYPOINTS = [
  { id: 'mercury', pos: new THREE.Vector3(0, 18, -25), camPos: new THREE.Vector3(0, 20, -5), radius: 2.2 },
  { id: 'venus', pos: new THREE.Vector3(-18, 10, -60), camPos: new THREE.Vector3(-14, 12, -38), radius: 3.5 },
  { id: 'earth', pos: new THREE.Vector3(0, 0, -100), camPos: new THREE.Vector3(0, 4, -72), radius: 4.2 },
  { id: 'mars', pos: new THREE.Vector3(22, -12, -145), camPos: new THREE.Vector3(16, -9, -120), radius: 3.0 },
  { id: 'jupiter', pos: new THREE.Vector3(-28, -25, -200), camPos: new THREE.Vector3(-18, -20, -165), radius: 7.5 },
  { id: 'saturn', pos: new THREE.Vector3(30, -38, -260), camPos: new THREE.Vector3(20, -32, -220), radius: 6.2 },
  { id: 'uranus', pos: new THREE.Vector3(-24, -50, -320), camPos: new THREE.Vector3(-16, -45, -285), radius: 4.8 },
  { id: 'neptune', pos: new THREE.Vector3(0, -65, -380), camPos: new THREE.Vector3(0, -60, -345), radius: 4.6 },
];

interface SolarSystemBackgroundProps {
  onPlanetDoubleClick: (planet: PlanetData) => void;
  activePlanetId?: string;
}

export const SolarSystemBackground: React.FC<SolarSystemBackgroundProps> = ({
  onPlanetDoubleClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetData | null>(null);
  const [activePlanetIndex, setActivePlanetIndex] = useState<number>(2); // Default Earth

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const planetMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Scroll tracking
  const scrollProgressRef = useRef<number>(0);
  const targetScrollProgressRef = useRef<number>(0);

  // Jump to specific planet on button click
  const scrollToPlanet = (index: number) => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const targetY = (index / (SOLAR_SYSTEM_PLANETS.length - 1)) * totalHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.0012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 4, -72); // Starts at Earth
    cameraRef.current = camera;

    // 3. Renderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0c1e38, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
    sunLight.position.set(120, 60, 100);
    scene.add(sunLight);

    const cyanCosmicLight = new THREE.PointLight(0x00e5ff, 2.5, 300);
    cyanCosmicLight.position.set(-80, 20, -150);
    scene.add(cyanCosmicLight);

    const magentaNebulaLight = new THREE.PointLight(0xd946ef, 2.0, 300);
    magentaNebulaLight.position.set(80, -40, -250);
    scene.add(magentaNebulaLight);

    // 5. Multi-Coloured Cosmic Starfield (3,000 stars)
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 1600;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 1600;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 1600;

      const p = Math.random();
      if (p > 0.8) {
        // Cyan
        starColors[i * 3] = 0.2;
        starColors[i * 3 + 1] = 0.9;
        starColors[i * 3 + 2] = 1.0;
      } else if (p > 0.6) {
        // Magenta / Violet
        starColors[i * 3] = 0.85;
        starColors[i * 3 + 1] = 0.35;
        starColors[i * 3 + 2] = 1.0;
      } else if (p > 0.45) {
        // Solar Amber
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 0.4;
      } else {
        // White
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. Build All 8 Procedural 3D Planets
    const planetMeshes = new Map<string, THREE.Mesh>();

    PLANET_WAYPOINTS.forEach((wp) => {
      const pData = SOLAR_SYSTEM_PLANETS.find((p) => p.id === wp.id);
      if (!pData) return;

      const geo = new THREE.SphereGeometry(wp.radius, 48, 48);

      // Procedural Texture Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = pData.color;
        ctx.fillRect(0, 0, 512, 256);

        if (wp.id === 'mercury') {
          // Mercury craters
          for (let i = 0; i < 40; i++) {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 12, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (wp.id === 'venus') {
          // Venus sulfuric bands
          for (let i = 0; i < 20; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#ca8a04' : '#eab308';
            ctx.fillRect(0, i * 13, 512, 13);
          }
        } else if (wp.id === 'earth') {
          // Earth continents & city lights
          ctx.fillStyle = '#1e3a8a'; // Deep ocean
          ctx.fillRect(0, 0, 512, 256);
          ctx.fillStyle = '#15803d'; // Land
          for (let i = 0; i < 25; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 512, 40 + Math.random() * 170, 20 + Math.random() * 40, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#fef08a'; // Lights
          for (let i = 0; i < 90; i++) {
            ctx.fillRect(Math.random() * 512, 50 + Math.random() * 150, 2, 2);
          }
        } else if (wp.id === 'mars') {
          // Mars dark volcanic plains and white ice caps
          ctx.fillStyle = '#991b1b';
          for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 256, 15 + Math.random() * 30, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff'; // Polar cap
          ctx.fillRect(0, 0, 512, 25);
          ctx.fillRect(0, 230, 512, 26);
        } else if (wp.id === 'jupiter') {
          // Jupiter storm bands & Great Red Spot
          for (let i = 0; i < 30; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#9a3412' : '#d97706';
            ctx.fillRect(0, i * 9, 512, 9);
          }
          ctx.fillStyle = '#dc2626'; // Great Red Spot
          ctx.beginPath();
          ctx.ellipse(320, 160, 35, 20, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (wp.id === 'saturn') {
          // Saturn subtle bands
          for (let i = 0; i < 24; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#ca8a04' : '#fef08a';
            ctx.fillRect(0, i * 11, 512, 11);
          }
        } else if (wp.id === 'uranus') {
          // Uranus cyan gradient
          const uGrad = ctx.createLinearGradient(0, 0, 0, 256);
          uGrad.addColorStop(0, '#0891b2');
          uGrad.addColorStop(1, '#06b6d4');
          ctx.fillStyle = uGrad;
          ctx.fillRect(0, 0, 512, 256);
        } else if (wp.id === 'neptune') {
          // Neptune deep azure with storm vortex
          const nGrad = ctx.createLinearGradient(0, 0, 0, 256);
          nGrad.addColorStop(0, '#1d4ed8');
          nGrad.addColorStop(1, '#1e40af');
          ctx.fillStyle = nGrad;
          ctx.fillRect(0, 0, 512, 256);
          ctx.fillStyle = '#0f172a'; // Dark Spot
          ctx.beginPath();
          ctx.ellipse(220, 120, 30, 15, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.65,
        metalness: 0.15,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(wp.pos);
      mesh.userData = { planetId: wp.id, planetData: pData };
      scene.add(mesh);
      planetMeshes.set(wp.id, mesh);

      // Atmospheric Rayleigh Halo Glow
      const haloGeo = new THREE.SphereGeometry(wp.radius * 1.05, 32, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pData.accentColor),
        transparent: true,
        opacity: 0.28,
        side: THREE.BackSide,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      mesh.add(haloMesh);

      // Saturn Rings
      if (wp.id === 'saturn') {
        const ringGeo = new THREE.RingGeometry(wp.radius * 1.35, wp.radius * 2.3, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        mesh.add(ringMesh);
      }

      // Uranus Rings
      if (wp.id === 'uranus') {
        const uRingGeo = new THREE.RingGeometry(wp.radius * 1.3, wp.radius * 1.6, 48);
        const uRingMat = new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const uRingMesh = new THREE.Mesh(uRingGeo, uRingMat);
        uRingMesh.rotation.y = Math.PI / 2.1;
        mesh.add(uRingMesh);
      }
    });

    planetMeshesRef.current = planetMeshes;

    // 7. Raycasting for Planet Hover & Double Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(planetMeshes.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const p = hit.userData.planetData as PlanetData;
        setHoveredPlanet(p);
        document.body.style.cursor = 'pointer';
      } else {
        setHoveredPlanet(null);
        document.body.style.cursor = 'default';
      }
    };

    const onDblClick = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(planetMeshes.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const p = hit.userData.planetData as PlanetData;
        onPlanetDoubleClick(p);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('dblclick', onDblClick);

    // 8. Scroll-Driven Position Interpolation Handler
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      targetScrollProgressRef.current = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
    };
    window.addEventListener('scroll', handleScroll);

    // 9. Resize Handler
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Main Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const currentCamPos = new THREE.Vector3().copy(PLANET_WAYPOINTS[2].camPos);
    const currentLookTarget = new THREE.Vector3().copy(PLANET_WAYPOINTS[2].pos);

    const animate = () => {
      const delta = clock.getDelta();

      // Rotate planets
      planetMeshes.forEach((mesh) => {
        mesh.rotation.y += delta * 0.15;
      });

      // Smooth scroll lerping
      scrollProgressRef.current += (targetScrollProgressRef.current - scrollProgressRef.current) * 0.06;
      const progress = scrollProgressRef.current;

      // Determine active planet index along the spline
      const segmentCount = PLANET_WAYPOINTS.length - 1;
      const scaled = progress * segmentCount;
      const idx = Math.min(Math.floor(scaled), segmentCount - 1);
      const frac = scaled - idx;

      setActivePlanetIndex(Math.round(scaled));

      // Interpolate camera position and lookAt target between waypoints
      const pA = PLANET_WAYPOINTS[idx];
      const pB = PLANET_WAYPOINTS[idx + 1];

      const targetCamPos = new THREE.Vector3().lerpVectors(pA.camPos, pB.camPos, frac);
      const targetLook = new THREE.Vector3().lerpVectors(pA.pos, pB.pos, frac);

      currentCamPos.lerp(targetCamPos, 0.08);
      currentLookTarget.lerp(targetLook, 0.08);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookTarget);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onPlanetDoubleClick]);

  const activePlanet = SOLAR_SYSTEM_PLANETS[activePlanetIndex] || SOLAR_SYSTEM_PLANETS[2];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* Top Planetary Transit HUD */}
      <div className="absolute top-20 left-4 sm:left-8 z-20 hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#030712]/80 border border-cyan-500/30 backdrop-blur-md shadow-xl pointer-events-auto">
        <span className="text-[10px] font-mono text-slate-400 mr-1 flex items-center gap-1">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>Planetary Orbit:</span>
        </span>
        {SOLAR_SYSTEM_PLANETS.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => scrollToPlanet(idx)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
              activePlanetIndex === idx
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md shadow-cyan-500/40 scale-105'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
            }`}
            title={`Scroll to ${p.name}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Hover Tooltip & Double-Click Hint */}
      {hoveredPlanet && (
        <div className="absolute top-36 right-8 z-30 p-4 rounded-2xl bg-[#040713]/90 border border-cyan-400/60 shadow-[0_0_40px_rgba(6,182,212,0.4)] backdrop-blur-xl pointer-events-auto animate-fade-in max-w-xs font-mono text-slate-100">
          <div className="flex items-center space-x-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: hoveredPlanet.color }}
            />
            <h4 className="text-sm font-black text-white">{hoveredPlanet.name}</h4>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              {hoveredPlanet.moonsCount} MOONS
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1.5 leading-snug line-clamp-3">
            {hoveredPlanet.description}
          </p>
          <div className="mt-3 pt-2.5 border-t border-cyan-950 flex items-center justify-between text-[10px] text-cyan-300">
            <span className="flex items-center gap-1 font-bold">
              <Eye className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Double-Click to Inspect Moons</span>
            </span>
          </div>
        </div>
      )}

      {/* Floating Active Planet Widget at Bottom Right */}
      <div className="absolute bottom-6 right-6 z-20 hidden lg:flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-[#040713]/85 border border-cyan-500/30 backdrop-blur-md shadow-2xl pointer-events-auto font-mono">
        <div
          className="w-4 h-4 rounded-full shadow-lg"
          style={{ backgroundColor: activePlanet.color }}
        />
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-100">{activePlanet.name}</span>
            <span className="text-[9px] text-slate-400">({activePlanet.distanceFromSunAU} AU)</span>
          </div>
          <p className="text-[9px] text-cyan-400">
            {activePlanet.moonsCount > 0 ? `${activePlanet.moonsCount} natural satellites available` : 'Airless terrestrial planet'}
          </p>
        </div>
        <button
          onClick={() => onPlanetDoubleClick(activePlanet)}
          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
        >
          Inspect Moons &rarr;
        </button>
      </div>
    </div>
  );
};
