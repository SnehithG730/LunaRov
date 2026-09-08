'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Orbit, Compass, Navigation, Globe } from 'lucide-react';

export interface CelestialBodyInfo {
  id: string;
  name: string;
  type: 'moon' | 'planet' | 'overview';
  subtitle: string;
  diameter: string;
  gravity: string;
  surface: string;
  distance: string;
  position: THREE.Vector3;
  camOffset: THREE.Vector3;
}

interface CelestialSpaceBackgroundProps {
  interactive?: boolean;
  intensity?: 'full' | 'subtle' | 'ambient';
  showControlsHint?: boolean;
  onSelectBody?: (body: CelestialBodyInfo) => void;
}

export const CelestialSpaceBackground: React.FC<CelestialSpaceBackgroundProps> = ({
  interactive = true,
  intensity = 'full',
  showControlsHint = true,
  onSelectBody,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeBodyId, setActiveBodyId] = useState<string>('luna');
  const [activeBodyData, setActiveBodyData] = useState<CelestialBodyInfo | null>(null);
  const [rotationInfo, setRotationInfo] = useState({ yaw: 0, pitch: 0 });
  const [jumpNotice, setJumpNotice] = useState<string | null>(null);

  // Jump trigger ref to bridge UI buttons with Three.js camera controller
  const jumpToBodyRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // -------------------------------------------------------------
    // 1. Scene & Camera Setup
    // -------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.0015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    const initialCamPos = new THREE.Vector3(intensity === 'ambient' ? 10 : 8, 4, 52);
    const initialLookAt = new THREE.Vector3(intensity === 'ambient' ? 14 : 12, -2, 0);
    camera.position.copy(initialCamPos);
    camera.lookAt(initialLookAt);

    // -------------------------------------------------------------
    // 2. High-Performance WebGL Renderer
    // -------------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // 3. Deep Space Solar & Galactic Lighting
    // -------------------------------------------------------------
    const sunLight = new THREE.DirectionalLight(0xfffbf0, 4.2);
    sunLight.position.set(180, 70, 110);
    scene.add(sunLight);

    // Secondary earthshine / nebula bounce
    const galaxyBounceLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    galaxyBounceLight.position.set(-140, -30, -70);
    scene.add(galaxyBounceLight);

    // Cosmic purple/cyan rim fill
    const nebulaRimLight = new THREE.DirectionalLight(0xa855f7, 0.85);
    nebulaRimLight.position.set(40, -90, -120);
    scene.add(nebulaRimLight);

    const ambientLight = new THREE.AmbientLight(0x0d1629, 0.4);
    scene.add(ambientLight);

    // -------------------------------------------------------------
    // 4. Multi-Layer Dynamic Deep Space Starfield & Cosmic Dust
    // -------------------------------------------------------------
    const starCount = 3600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0x93c5fd), // Pale blue giant
      new THREE.Color(0xa5f3fc), // Cyan
      new THREE.Color(0xfef08a), // Solar yellow
      new THREE.Color(0xfbcfe8), // Nebula rose
      new THREE.Color(0xc4b5fd), // Galactic violet
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 850;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: intensity === 'ambient' ? 0.5 : 0.9,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // -------------------------------------------------------------
    // 5. Celestial Bodies Registry & Interactive Meshes
    // -------------------------------------------------------------
    const clickableObjects: THREE.Object3D[] = [];
    const celestialGroups: Map<string, THREE.Group> = new Map();

    const celestialMetadata: CelestialBodyInfo[] = [
      {
        id: 'luna',
        name: 'Luna',
        type: 'moon',
        subtitle: "Earth's Primary Moon // Target Sector",
        diameter: '3,474.8 km',
        gravity: '1.62 m/s² (0.166 g)',
        surface: 'Basaltic Maria & Anorthosite Regolith',
        distance: '384,400 km from Earth',
        position: new THREE.Vector3(intensity === 'ambient' ? 18 : 15, -2, 0),
        camOffset: new THREE.Vector3(0, 3, 38),
      },
      {
        id: 'europa',
        name: 'Europa',
        type: 'moon',
        subtitle: 'Jovian Ocean Moon // Ice Shell',
        diameter: '3,121.6 km',
        gravity: '1.315 m/s² (0.134 g)',
        surface: 'Water-Ice Crust & Linear Fractures',
        distance: '628.3M km from Earth',
        position: new THREE.Vector3(-68, -12, -75),
        camOffset: new THREE.Vector3(0, 2, 22),
      },
      {
        id: 'titan',
        name: 'Titan',
        type: 'moon',
        subtitle: 'Saturnian Haze Moon // Methane Seas',
        diameter: '5,149.5 km',
        gravity: '1.352 m/s² (0.138 g)',
        surface: 'Liquid Hydrocarbon Lakes & Nitrogen Smog',
        distance: '1.4B km from Earth',
        position: new THREE.Vector3(-125, -36, -115),
        camOffset: new THREE.Vector3(0, 2.5, 26),
      },
      {
        id: 'io',
        name: 'Io',
        type: 'moon',
        subtitle: 'Volcanic Moon // Extreme Tidal Heating',
        diameter: '3,643.2 km',
        gravity: '1.796 m/s² (0.183 g)',
        surface: 'Sulfur Frost & Active Calderas',
        distance: '628.3M km from Earth',
        position: new THREE.Vector3(-88, 14, -85),
        camOffset: new THREE.Vector3(0, 2, 20),
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        type: 'moon',
        subtitle: 'Largest Moon in Solar System',
        diameter: '5,268.2 km',
        gravity: '1.428 m/s² (0.146 g)',
        surface: 'Grooved Terrain & Magnetosphere Ice',
        distance: '628.3M km from Earth',
        position: new THREE.Vector3(-42, -32, -95),
        camOffset: new THREE.Vector3(0, 2.5, 28),
      },
      {
        id: 'phobos',
        name: 'Phobos',
        type: 'moon',
        subtitle: 'Martian Inner Moon // Craggy Asteroid',
        diameter: '22.5 km',
        gravity: '0.0057 m/s² (0.0006 g)',
        surface: 'Carbonaceous Regolith & Stickney Crater',
        distance: '78.3M km from Earth',
        position: new THREE.Vector3(68, 32, -80),
        camOffset: new THREE.Vector3(0, 1.5, 14),
      },
      {
        id: 'earth',
        name: 'Earth (Terra)',
        type: 'planet',
        subtitle: 'The Blue Marble // Mission Origin',
        diameter: '12,742 km',
        gravity: '9.807 m/s² (1.000 g)',
        surface: 'Nitrogen-Oxygen Atmosphere & Liquid Oceans',
        distance: 'Origin Base',
        position: new THREE.Vector3(-75, 26, -95),
        camOffset: new THREE.Vector3(0, 3, 34),
      },
      {
        id: 'mars',
        name: 'Mars (Ares)',
        type: 'planet',
        subtitle: 'The Red Planet // Future Frontier',
        diameter: '6,779 km',
        gravity: '3.721 m/s² (0.379 g)',
        surface: 'Iron-Oxide Basalt, Canyons & Polar Ice',
        distance: '78.3M km from Earth',
        position: new THREE.Vector3(82, 25, -100),
        camOffset: new THREE.Vector3(0, 3, 30),
      },
      {
        id: 'kronos',
        name: 'Gas Giant (Kronos)',
        type: 'planet',
        subtitle: 'Ringed Majesty // Saturnian System',
        diameter: '116,460 km',
        gravity: '10.44 m/s² (1.065 g)',
        surface: 'Hydrogen-Helium Atmosphere & Ring Complex',
        distance: '1.4B km from Earth',
        position: new THREE.Vector3(-110, -32, -150),
        camOffset: new THREE.Vector3(0, 6, 68),
      },
    ];

    setActiveBodyData(celestialMetadata[0]);

    // -------------------------------------------------------------
    // 6. Realistic Procedural Texture Generators
    // -------------------------------------------------------------

    // A. Hyper-Realistic Moon Canvas (Luna) with Layered Craters, Ray Systems & Maria
    const createRealisticLunaCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Base anorthosite highland tone
      ctx.fillStyle = '#222838';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fine grain regolith noise (90,000 particles)
      for (let i = 0; i < 90000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.8 + 0.4;
        const bright = Math.floor(Math.random() * 120 + 55);
        ctx.fillStyle = `rgb(${bright}, ${bright + 2}, ${bright + 8})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Major Dark Basalt Maria (Oceanus Procellarum, Mare Tranquillitatis, Imbrium, Serenitatis, Crisium)
      const mariaBasins = [
        { x: 550, y: 440, rx: 280, ry: 180, angle: 0.1 },
        { x: 920, y: 380, rx: 220, ry: 150, angle: -0.15 },
        { x: 1300, y: 520, rx: 190, ry: 140, angle: 0.2 },
        { x: 380, y: 680, rx: 160, ry: 120, angle: 0 },
        { x: 1620, y: 410, rx: 240, ry: 160, angle: -0.1 },
        { x: 740, y: 260, rx: 180, ry: 110, angle: 0.05 },
        { x: 1100, y: 620, rx: 140, ry: 95, angle: -0.2 },
      ];

      mariaBasins.forEach((m) => {
        const grad = ctx.createRadialGradient(m.x, m.y, 20, m.x, m.y, m.rx);
        grad.addColorStop(0, 'rgba(14, 18, 28, 0.95)');
        grad.addColorStop(0.5, 'rgba(20, 26, 38, 0.85)');
        grad.addColorStop(0.85, 'rgba(28, 36, 52, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.rx, m.ry, m.angle, 0, Math.PI * 2);
        ctx.fill();
      });

      // Complex Impact Craters with Prominent Radiating Ejecta Rays (Tycho, Copernicus, Kepler, Aristarchus)
      const prominentCraters = [
        { x: 760, y: 720, r: 42, rays: 24, name: 'Tycho' },
        { x: 580, y: 480, r: 34, rays: 18, name: 'Copernicus' },
        { x: 440, y: 460, r: 26, rays: 14, name: 'Kepler' },
        { x: 380, y: 380, r: 24, rays: 12, name: 'Aristarchus' },
        { x: 1040, y: 320, r: 30, rays: 16, name: 'Posidonius' },
        { x: 1380, y: 640, r: 38, rays: 20, name: 'Theophilus' },
        { x: 1720, y: 480, r: 32, rays: 14, name: 'Langrenus' },
      ];

      prominentCraters.forEach((c) => {
        // High-Albedo Ejecta Rays (bright streaks across dark maria)
        ctx.strokeStyle = 'rgba(220, 240, 255, 0.32)';
        ctx.lineWidth = 1.8;
        for (let a = 0; a < c.rays; a++) {
          const angle = (a / c.rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
          const rayLen = c.r * (4 + Math.random() * 6);
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + Math.cos(angle) * rayLen, c.y + Math.sin(angle) * rayLen);
          ctx.stroke();
        }

        // Bright Raised Rim
        ctx.fillStyle = 'rgba(240, 248, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();

        // Inner Shadow Terraced Bowl
        ctx.fillStyle = '#0a0d14';
        ctx.beginPath();
        ctx.arc(c.x + 3, c.y + 2, c.r * 0.78, 0, Math.PI * 2);
        ctx.fill();

        // Sunlit Central Uplift Peak
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x + 3, c.y + 2, c.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      });

      // Medium and Micro Crater Field (Over 250 craters)
      for (let i = 0; i < 260; i++) {
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * canvas.height;
        const cr = Math.random() * 12 + 2.5;

        // Rim
        ctx.fillStyle = 'rgba(215, 230, 248, 0.75)';
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();

        // Shadow bowl
        ctx.fillStyle = '#080b12';
        ctx.beginPath();
        ctx.arc(cx + cr * 0.15, cy + cr * 0.1, cr * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // B. Europa (Ice Shell with Red/Brown Linear Fractures)
    const createEuropaCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Pure ice base
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ice frost texture
      for (let i = 0; i < 30000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(186,230,253,0.3)';
        ctx.fillRect(x, y, 2, 2);
      }

      // Chaotic Lineae (cracking fracture rifts from tidal flexure)
      ctx.strokeStyle = 'rgba(168, 85, 47, 0.75)';
      for (let i = 0; i < 38; i++) {
        ctx.lineWidth = Math.random() * 3 + 1;
        ctx.beginPath();
        let curX = Math.random() * canvas.width;
        let curY = Math.random() * canvas.height;
        ctx.moveTo(curX, curY);
        for (let s = 0; s < 6; s++) {
          curX += (Math.random() - 0.5) * 220;
          curY += (Math.random() - 0.5) * 140;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      }

      return canvas;
    };

    // C. Titan (Golden Nitrogen Photochemical Haze + Methane Lakes)
    const createTitanCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Golden amber base
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Thick atmospheric bands
      for (let y = 0; y < canvas.height; y += 8) {
        const shade = Math.sin(y * 0.05) * 25;
        ctx.fillStyle = `rgba(${230 + shade}, ${130 + shade * 0.6}, ${30}, 0.6)`;
        ctx.fillRect(0, y, canvas.width, 8);
      }

      // Polar Methane Lakes (Kraken Mare)
      ctx.fillStyle = '#1c1917';
      for (let i = 0; i < 14; i++) {
        const lx = Math.random() * canvas.width;
        const ly = Math.random() > 0.5 ? Math.random() * 90 : canvas.height - Math.random() * 90;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 45 + Math.random() * 50, 20 + Math.random() * 25, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // D. Io (Volcanic Sulfur & Lava Calderas)
    const createIoCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Sulfur yellow base
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Red/Orange sulfur dioxide frost deposits
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const grad = ctx.createRadialGradient(x, y, 5, x, y, 60);
        grad.addColorStop(0, '#dc2626');
        grad.addColorStop(0.6, '#f97316');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Black Volcanic Calderas (Loki Patera)
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 35; i++) {
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + Math.random() * 10, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // E. Ganymede (Grooved Terrain & Dark Ancient Crater Blocks)
    const createGanymedeCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Light Grooved Terrain Bands
      ctx.strokeStyle = '#94a3b8';
      for (let y = 20; y < canvas.height - 20; y += 14) {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.lineTo(x, y + (Math.random() - 0.5) * 12);
        }
        ctx.stroke();
      }

      // Bright impact craters
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(x, y, 4 + Math.random() * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // F. Earth Texture (Blue oceans, continents, swirling cloud atmosphere)
    const createEarthCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Ocean blue
      ctx.fillStyle = '#0f3a7e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Continents
      ctx.fillStyle = '#1e683b';
      const landmasses = [
        { x: 260, y: 190, rx: 110, ry: 75 },
        { x: 340, y: 340, rx: 70, ry: 100 },
        { x: 580, y: 170, rx: 95, ry: 80 },
        { x: 620, y: 310, rx: 120, ry: 110 },
        { x: 800, y: 190, rx: 150, ry: 90 },
        { x: 880, y: 360, rx: 90, ry: 70 },
      ];
      landmasses.forEach((l) => {
        ctx.beginPath();
        ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Swirling Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      for (let i = 0; i < 45; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 60 + Math.random() * 80, 12 + Math.random() * 18, Math.random() * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    // G. Mars Canvas (Rust red, canyon rifts, polar ice caps)
    const createMarsCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#991b1b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dark basalt plains (Syrtis Major)
      ctx.fillStyle = '#450a0a';
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 70 + Math.random() * 80, 40 + Math.random() * 50, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Valles Marineris Canyon Rift
      ctx.strokeStyle = '#2d0606';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(250, 260);
      ctx.lineTo(650, 275);
      ctx.stroke();

      // North & South Polar Ice Caps
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, 18, 180, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(canvas.width / 2, canvas.height - 18, 160, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      return canvas;
    };

    // H. Saturnian Gas Giant Canvas (Kronos)
    const createKronosCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Banded cloud layers
      const colors = ['#fde68a', '#f59e0b', '#d97706', '#b45309', '#fef3c7', '#fef9c3'];
      for (let y = 0; y < canvas.height; y += 4) {
        const cIdx = Math.floor((y / canvas.height) * colors.length + Math.sin(y * 0.08) * 1.5) % colors.length;
        ctx.fillStyle = colors[Math.max(0, cIdx)];
        ctx.fillRect(0, y, canvas.width, 4);
      }

      return canvas;
    };

    // -------------------------------------------------------------
    // 7. Instantiate 3D Meshes & Groups
    // -------------------------------------------------------------

    // Helper: Create Textured Celestial Sphere
    const createBodyMesh = (
      id: string,
      canvas: HTMLCanvasElement | null,
      radius: number,
      pos: THREE.Vector3,
      glowColor?: number,
      bumpScale = 0.5
    ) => {
      const group = new THREE.Group();
      group.position.copy(pos);

      const texture = canvas ? new THREE.CanvasTexture(canvas) : null;
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      }

      const geo = new THREE.SphereGeometry(radius, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: bumpScale,
        roughness: 0.88,
        metalness: 0.12,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { bodyId: id };
      group.add(mesh);
      clickableObjects.push(mesh);

      // Atmospheric Glow (if applicable)
      if (glowColor) {
        const glowGeo = new THREE.SphereGeometry(radius * 1.03, 36, 36);
        const glowMat = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        group.add(glowMesh);
      }

      scene.add(group);
      celestialGroups.set(id, group);
      return { group, mesh };
    };

    // 1. Primary Lunar Rover Target Moon (Luna)
    const lunaRadius = intensity === 'ambient' ? 14 : 17;
    const lunaCanvas = createRealisticLunaCanvas();
    createBodyMesh(
      'luna',
      lunaCanvas,
      lunaRadius,
      celestialMetadata[0].position,
      0x38bdf8,
      0.85
    );

    // 2. Europa
    const europaCanvas = createEuropaCanvas();
    createBodyMesh('europa', europaCanvas, 6, celestialMetadata[1].position, 0x60a5fa, 0.4);

    // 3. Titan
    const titanCanvas = createTitanCanvas();
    createBodyMesh('titan', titanCanvas, 8, celestialMetadata[2].position, 0xf59e0b, 0.3);

    // 4. Io
    const ioCanvas = createIoCanvas();
    createBodyMesh('io', ioCanvas, 5.5, celestialMetadata[3].position, 0xef4444, 0.6);

    // 5. Ganymede
    const ganymedeCanvas = createGanymedeCanvas();
    createBodyMesh('ganymede', ganymedeCanvas, 9, celestialMetadata[4].position, 0x818cf8, 0.5);

    // 6. Phobos (Craggy, deformed shape)
    const phobosGeo = new THREE.DodecahedronGeometry(3.4, 2);
    const posAttr = phobosGeo.attributes.position;
    for (let v = 0; v < posAttr.count; v++) {
      const vx = posAttr.getX(v) * (0.8 + Math.random() * 0.4);
      const vy = posAttr.getY(v) * (0.7 + Math.random() * 0.35);
      const vz = posAttr.getZ(v) * (0.85 + Math.random() * 0.3);
      posAttr.setXYZ(v, vx, vy, vz);
    }
    phobosGeo.computeVertexNormals();
    const phobosMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    const phobosMesh = new THREE.Mesh(phobosGeo, phobosMat);
    phobosMesh.userData = { bodyId: 'phobos' };
    const phobosGroup = new THREE.Group();
    phobosGroup.position.copy(celestialMetadata[5].position);
    phobosGroup.add(phobosMesh);
    scene.add(phobosGroup);
    clickableObjects.push(phobosMesh);
    celestialGroups.set('phobos', phobosGroup);

    // 7. Earth
    const earthCanvas = createEarthCanvas();
    createBodyMesh('earth', earthCanvas, 12, celestialMetadata[6].position, 0x3b82f6, 0.4);

    // 8. Mars
    const marsCanvas = createMarsCanvas();
    createBodyMesh('mars', marsCanvas, 8.5, celestialMetadata[7].position, 0xf97316, 0.6);

    // 9. Kronos (Ringed Gas Giant)
    const kronosCanvas = createKronosCanvas();
    const { group: kronosGroup } = createBodyMesh(
      'kronos',
      kronosCanvas,
      22,
      celestialMetadata[8].position,
      0xfcd34d,
      0.2
    );

    // Saturnian Ring System with Cassini Division
    const ringInner = 28;
    const ringOuter = 52;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);
    ringGeo.rotateX(Math.PI / 2);

    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 512;
    ringCanvas.height = 32;
    const rCtx = ringCanvas.getContext('2d');
    if (rCtx) {
      const grad = rCtx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      grad.addColorStop(0.45, 'rgba(217, 119, 6, 0.7)');
      grad.addColorStop(0.52, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.58, 'rgba(245, 158, 11, 0.65)');
      grad.addColorStop(0.9, 'rgba(254, 243, 199, 0.3)');
      grad.addColorStop(1, 'transparent');
      rCtx.fillStyle = grad;
      rCtx.fillRect(0, 0, 512, 32);
    }
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      roughness: 0.7,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = 0.35;
    ringMesh.rotation.z = 0.15;
    kronosGroup.add(ringMesh);

    // -------------------------------------------------------------
    // 8. Passing Dynamic Comets & Asteroid Field
    // -------------------------------------------------------------
    const asteroidCount = 45;
    const asteroidMeshes: THREE.Mesh[] = [];
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.95,
      flatShading: true,
    });

    for (let i = 0; i < asteroidCount; i++) {
      const radius = 0.6 + Math.random() * 2.2;
      const rockGeo = new THREE.DodecahedronGeometry(radius, 1);
      const rPos = rockGeo.attributes.position;
      for (let v = 0; v < rPos.count; v++) {
        rPos.setXYZ(
          v,
          rPos.getX(v) * (0.8 + Math.random() * 0.4),
          rPos.getY(v) * (0.8 + Math.random() * 0.4),
          rPos.getZ(v) * (0.8 + Math.random() * 0.4)
        );
      }
      rockGeo.computeVertexNormals();

      const rock = new THREE.Mesh(rockGeo, asteroidMat);
      const angle = (i / asteroidCount) * Math.PI * 2;
      const dist = 55 + Math.random() * 75;
      rock.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 45, Math.sin(angle) * dist - 30);
      rock.userData = {
        rotX: (Math.random() - 0.5) * 0.015,
        rotY: (Math.random() - 0.5) * 0.015,
        orbitSpeed: 0.0004 + Math.random() * 0.0006,
        orbitAngle: angle,
        orbitDist: dist,
      };
      scene.add(rock);
      asteroidMeshes.push(rock);
    }

    // Comets
    interface Comet {
      mesh: THREE.Line;
      head: THREE.Mesh;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      active: boolean;
    }
    const comets: Comet[] = [];
    const cometHeadGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const cometHeadMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

    for (let c = 0; c < 3; c++) {
      const tailPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-15, -6, -8)];
      const tailGeo = new THREE.BufferGeometry().setFromPoints(tailPoints);
      const tailMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const tailLine = new THREE.Line(tailGeo, tailMat);
      const head = new THREE.Mesh(cometHeadGeo, cometHeadMat);
      scene.add(tailLine);
      scene.add(head);
      tailLine.visible = false;
      head.visible = false;
      comets.push({
        mesh: tailLine,
        head,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 160,
        active: false,
      });
    }

    const spawnComet = (comet: Comet) => {
      comet.active = true;
      comet.life = 0;
      comet.maxLife = 120 + Math.random() * 90;
      comet.pos.set((Math.random() - 0.5) * 160, 50 + Math.random() * 30, -50 - Math.random() * 70);
      const spd = 0.9 + Math.random() * 0.7;
      comet.vel.set((Math.random() > 0.5 ? -1 : 1) * spd * 1.3, -spd * 0.75, (Math.random() - 0.5) * spd * 0.6);
      comet.mesh.visible = true;
      comet.head.visible = true;
    };

    // -------------------------------------------------------------
    // 9. Camera Tweening & Moon-to-Moon Jump System
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const cameraTarget = {
      startPos: camera.position.clone(),
      targetPos: camera.position.clone(),
      startLookAt: initialLookAt.clone(),
      targetLookAt: initialLookAt.clone(),
      currentLookAt: initialLookAt.clone(),
      progress: 1,
      duration: 75,
      elapsed: 75,
    };

    const jumpToBody = (targetId: string) => {
      const meta = celestialMetadata.find((m) => m.id === targetId);
      if (!meta) return;

      const group = celestialGroups.get(targetId);
      const worldPos = group ? group.position.clone() : meta.position.clone();
      const destPos = worldPos.clone().add(meta.camOffset);

      cameraTarget.startPos.copy(camera.position);
      cameraTarget.targetPos.copy(destPos);
      cameraTarget.startLookAt.copy(cameraTarget.currentLookAt);
      cameraTarget.targetLookAt.copy(worldPos);
      cameraTarget.elapsed = 0;
      cameraTarget.progress = 0;

      setActiveBodyId(targetId);
      setActiveBodyData(meta);
      if (onSelectBody) onSelectBody(meta);

      setJumpNotice(`WARP JUMP: ${meta.name.toUpperCase()}`);
      setTimeout(() => setJumpNotice(null), 2400);
    };

    jumpToBodyRef.current = jumpToBody;

    // Double-Click Raycasting Handler
    const onDoubleClick = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableObjects, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const bodyId = hit.userData.bodyId;
        if (bodyId) {
          jumpToBody(bodyId);
        }
      }
    };

    // -------------------------------------------------------------
    // 10. Interactive Drag & Spin Physics
    // -------------------------------------------------------------
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const angularVelocity = { x: 0.001, y: 0.002 };
    const friction = 0.965;

    const onMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      setIsInteracting(true);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !interactive) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      angularVelocity.y = deltaX * 0.004;
      angularVelocity.x = deltaY * 0.004;

      const activeGroup = celestialGroups.get(activeBodyId);
      if (activeGroup) {
        activeGroup.rotation.y += angularVelocity.y;
        activeGroup.rotation.x += angularVelocity.x;
        setRotationInfo({
          yaw: Math.round(((activeGroup.rotation.y * 180) / Math.PI) % 360),
          pitch: Math.round(((activeGroup.rotation.x * 180) / Math.PI) % 360),
        });
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 800);
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactive) return;
      angularVelocity.y += e.deltaY * 0.00018;
      angularVelocity.x += e.deltaX * 0.00018;
      const activeGroup = celestialGroups.get(activeBodyId);
      if (activeGroup) {
        setRotationInfo({
          yaw: Math.round(((activeGroup.rotation.y * 180) / Math.PI) % 360),
          pitch: Math.round(((activeGroup.rotation.x * 180) / Math.PI) % 360),
        });
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!interactive || e.touches.length === 0) return;
      isDragging = true;
      setIsInteracting(true);
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !interactive || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      angularVelocity.y = deltaX * 0.004;
      angularVelocity.x = deltaY * 0.004;

      const activeGroup = celestialGroups.get(activeBodyId);
      if (activeGroup) {
        activeGroup.rotation.y += angularVelocity.y;
        activeGroup.rotation.x += angularVelocity.x;
      }
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 800);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('dblclick', onDoubleClick);
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: true });
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // -------------------------------------------------------------
    // 11. Main Render & Physics Animation Loop
    // -------------------------------------------------------------
    let clock = 0;
    let nextCometSpawn = 80;

    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.005;

      if (cameraTarget.progress < 1) {
        cameraTarget.elapsed++;
        const rawT = Math.min(1, cameraTarget.elapsed / cameraTarget.duration);
        const easeT = easeInOutCubic(rawT);

        camera.position.lerpVectors(cameraTarget.startPos, cameraTarget.targetPos, easeT);
        cameraTarget.currentLookAt.lerpVectors(cameraTarget.startLookAt, cameraTarget.targetLookAt, easeT);
        camera.lookAt(cameraTarget.currentLookAt);

        if (rawT >= 1) {
          cameraTarget.progress = 1;
        }
      }

      celestialGroups.forEach((grp, id) => {
        if (id === activeBodyId && isDragging) return;
        if (id === 'luna') grp.rotation.y += 0.0012;
        else if (id === 'europa') grp.rotation.y += 0.002;
        else if (id === 'titan') grp.rotation.y += 0.0015;
        else if (id === 'io') grp.rotation.y += 0.0025;
        else if (id === 'ganymede') grp.rotation.y += 0.0018;
        else if (id === 'earth') grp.rotation.y += 0.0022;
        else if (id === 'mars') grp.rotation.y += 0.0019;
        else if (id === 'kronos') grp.rotation.y += 0.001;
        else grp.rotation.y += 0.0015;
      });

      if (!isDragging) {
        const activeGroup = celestialGroups.get(activeBodyId);
        if (activeGroup) {
          activeGroup.rotation.y += angularVelocity.y;
          activeGroup.rotation.x += angularVelocity.x;
          angularVelocity.x *= friction;
          angularVelocity.y = angularVelocity.y * friction + 0.0006 * (1 - friction);
        }
      }

      starField.rotation.y = clock * 0.01;
      starField.rotation.x = Math.sin(clock * 0.008) * 0.015;

      asteroidMeshes.forEach((rock) => {
        rock.rotation.x += rock.userData.rotX;
        rock.rotation.y += rock.userData.rotY;
        rock.userData.orbitAngle += rock.userData.orbitSpeed;
        rock.position.x = Math.cos(rock.userData.orbitAngle) * rock.userData.orbitDist;
        rock.position.z = Math.sin(rock.userData.orbitAngle) * rock.userData.orbitDist - 30;
      });

      nextCometSpawn--;
      if (nextCometSpawn <= 0) {
        const inactiveComet = comets.find((c) => !c.active);
        if (inactiveComet) spawnComet(inactiveComet);
        nextCometSpawn = 200 + Math.floor(Math.random() * 250);
      }

      comets.forEach((comet) => {
        if (!comet.active) return;
        comet.life++;
        comet.pos.add(comet.vel);
        comet.head.position.copy(comet.pos);

        const tailLen = 18;
        const tailEnd = comet.pos.clone().sub(comet.vel.clone().normalize().multiplyScalar(tailLen));
        const pArr = new Float32Array([comet.pos.x, comet.pos.y, comet.pos.z, tailEnd.x, tailEnd.y, tailEnd.z]);
        comet.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(pArr, 3));

        const prog = comet.life / comet.maxLife;
        (comet.mesh.material as THREE.LineBasicMaterial).opacity = Math.sin(prog * Math.PI) * 0.8;

        if (comet.life >= comet.maxLife) {
          comet.active = false;
          comet.mesh.visible = false;
          comet.head.visible = false;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('dblclick', onDoubleClick);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [interactive, intensity, onSelectBody, activeBodyId]);

  const handleSelectPill = (id: string) => {
    if (jumpToBodyRef.current) {
      jumpToBodyRef.current(id);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto select-none z-0">
      {/* 3D Celestial Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Warp Jump Notice Overlay */}
      {jumpNotice && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/80 border border-cyan-400 text-cyan-300 font-mono text-sm font-bold shadow-[0_0_40px_rgba(0,240,255,0.5)] backdrop-blur-xl animate-pulse">
          <Compass className="w-5 h-5 text-cyan-400 animate-spin" />
          <span>{jumpNotice}</span>
        </div>
      )}

      {/* Interactive Celestial Navigator HUD */}
      {showControlsHint && (
        <div className="absolute top-20 right-4 sm:right-8 z-20 flex flex-col items-end gap-2.5 font-mono pointer-events-auto">
          {/* Target Body Status Card */}
          <div className="p-3.5 rounded-xl bg-[#060a14]/85 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs shadow-xl shadow-cyan-950/50 space-y-2 max-w-xs transition-all">
            <div className="flex items-center justify-between gap-3 border-b border-cyan-950/80 pb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  {activeBodyData?.name || 'Luna'}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-800/60 uppercase font-bold">
                {activeBodyData?.type || 'Moon'}
              </span>
            </div>

            <div className="space-y-1 text-[10.5px] text-gray-300">
              <div className="text-cyan-400/90 font-medium">{activeBodyData?.subtitle}</div>
              <div className="flex justify-between">
                <span className="text-gray-500">DIAMETER:</span>
                <span className="font-bold text-white">{activeBodyData?.diameter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SURFACE GRAVITY:</span>
                <span className="font-bold text-amber-300">{activeBodyData?.gravity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ROTATION [Y/P]:</span>
                <span className="font-bold text-cyan-400">[{rotationInfo.yaw}°, {rotationInfo.pitch}°]</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-cyan-950/60 flex items-center justify-between text-[10px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <Orbit className={`w-3.5 h-3.5 text-cyan-400 ${isInteracting ? 'animate-spin' : ''}`} />
                <span>Drag to spin • Scroll zoom</span>
              </div>
            </div>
          </div>

          {/* Quick Jump Moons & Planets Selector */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-xs">
            {[
              { id: 'luna', label: 'Luna' },
              { id: 'europa', label: 'Europa' },
              { id: 'titan', label: 'Titan' },
              { id: 'io', label: 'Io' },
              { id: 'ganymede', label: 'Ganymede' },
              { id: 'phobos', label: 'Phobos' },
              { id: 'earth', label: 'Earth' },
              { id: 'mars', label: 'Mars' },
              { id: 'kronos', label: 'Kronos' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectPill(item.id)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold tracking-wider transition-all border ${
                  activeBodyId === item.id
                    ? 'bg-gradient-to-r from-cyan-500/80 to-purple-600/80 text-white border-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-105'
                    : 'bg-[#060b18]/80 text-gray-400 border-cyan-950/80 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-[#0c1428]'
                }`}
                title={`Jump camera to ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Double Click Instruction Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/40 text-[10px] text-cyan-300/80 backdrop-blur-md">
            <Navigation className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Double-click any celestial body in space to jump</span>
          </div>
        </div>
      )}
    </div>
  );
};
