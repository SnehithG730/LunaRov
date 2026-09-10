'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import * as THREE from 'three';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Orbit,
  ArrowRight,
  ShieldCheck,
  Globe,
  Compass,
  KeyRound,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { SupabaseAuthService } from '@/lib/supabase/client';

export interface AuthUserData {
  name: string;
  email: string;
  isAuthenticated: boolean;
  avatarSeed?: string;
  loginTimestamp?: number;
}

interface SpaceEntranceAuthProps {
  onLoginSuccess: (user: AuthUserData) => void;
  onSkip?: () => void;
}

type AuthPhase =
  | 'INITIAL'           // 1. Initial Screen: Floating 3D rocket, Earth, Moon & Satellite, "ENTER ->"
  | 'ORBITING'          // 2. Rocket enters 3D orbital path around Earth
  | 'FORM_ACTIVE'       // 3 & 4. 3D Cloud login form with real-time validation
  | 'AUTHENTICATING'   // 5. Holographic Authenticating spinner & energy pulse
  | 'LAUNCHING'         // 6. Rocket ignites hyper-thrust flame plume and launches
  | 'WARP_TRANSITION';  // 7. Warp-speed hyperspace tunnel & "Welcome Aboard!"

export const SpaceEntranceAuth: React.FC<SpaceEntranceAuthProps> = ({
  onLoginSuccess,
  onSkip,
}) => {
  const [phase, setPhase] = useState<AuthPhase>('INITIAL');
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteredUser, setIsRegisteredUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form touched states for validation
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<AuthPhase>('INITIAL');
  const animTimeRef = useRef<number>(0);
  const phaseStartTimeRef = useRef<number>(0);

  // Validation logic
  const isNameValid = authMode === 'SIGN_IN' ? true : name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid && !isSubmitting;

  useEffect(() => {
    phaseRef.current = phase;
    phaseStartTimeRef.current = animTimeRef.current;
  }, [phase]);

  // =========================================================================
  // HYPER-REALISTIC THREE.JS 3D CELESTIAL & SPACECRAFT ENGINE
  // =========================================================================
  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.0006);

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2500
    );
    camera.position.set(0, 14, 65);

    // 3. WebGL Renderer with High-End Lighting & ACES Color Grading
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0c1e38, 1.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(90, 45, 80);
    scene.add(sunLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00d2ff, 3.2);
    cyanRimLight.position.set(-80, -20, -50);
    scene.add(cyanRimLight);

    const purpleCosmicLight = new THREE.PointLight(0xa855f7, 2.5, 180);
    purpleCosmicLight.position.set(30, 40, -40);
    scene.add(purpleCosmicLight);

    // 5. Deep Space Starfield (2,200 stars)
    const starCount = 2200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 1400;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 1400;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 1400;

      const isCyan = Math.random() > 0.85;
      const isBlue = Math.random() > 0.65;
      starColors[i * 3] = isCyan ? 0.2 : isBlue ? 0.6 : 1.0;
      starColors[i * 3 + 1] = isCyan ? 0.9 : isBlue ? 0.8 : 1.0;
      starColors[i * 3 + 2] = 1.0;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 6. Hyper-Realistic 3D Earth (Day/Night Texture & Rayleigh Atmosphere)
    const earthRadius = 26;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);

    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 1024;
    earthCanvas.height = 512;
    const eCtx = earthCanvas.getContext('2d');
    if (eCtx) {
      const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 512);
      oceanGrad.addColorStop(0, '#061b3b');
      oceanGrad.addColorStop(0.5, '#0b2e61');
      oceanGrad.addColorStop(1, '#031124');
      eCtx.fillStyle = oceanGrad;
      eCtx.fillRect(0, 0, 1024, 512);

      // Continents with topographic detail
      eCtx.fillStyle = '#1c4a2b';
      for (let i = 0; i < 45; i++) {
        const cx = Math.random() * 1024;
        const cy = 90 + Math.random() * 332;
        const cr = 35 + Math.random() * 90;
        eCtx.beginPath();
        eCtx.arc(cx, cy, cr, 0, Math.PI * 2);
        eCtx.fill();
      }
      // Glowing Night-Side City Lights
      eCtx.fillStyle = '#ffdf78';
      for (let i = 0; i < 180; i++) {
        const cx = Math.random() * 1024;
        const cy = 110 + Math.random() * 300;
        eCtx.fillRect(cx, cy, 2.5, 2.5);
      }
    }
    const earthTexture = new THREE.CanvasTexture(earthCanvas);

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.6,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, -34, 0);
    scene.add(earthMesh);

    // Glowing Atmospheric Halo
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.045, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.32,
      side: THREE.BackSide,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.position.copy(earthMesh.position);
    scene.add(atmoMesh);

    // 7. Hyper-Realistic 3D Moon with Procedural Craters
    const moonRadius = 6.5;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 48, 48);

    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 512;
    moonCanvas.height = 256;
    const mCtx = moonCanvas.getContext('2d');
    if (mCtx) {
      mCtx.fillStyle = '#71717a';
      mCtx.fillRect(0, 0, 512, 256);
      // Realistic Craters
      for (let i = 0; i < 60; i++) {
        const cx = Math.random() * 512;
        const cy = Math.random() * 256;
        const cr = 4 + Math.random() * 18;
        mCtx.fillStyle = '#3f3f46';
        mCtx.beginPath();
        mCtx.arc(cx, cy, cr, 0, Math.PI * 2);
        mCtx.fill();
        mCtx.strokeStyle = '#a1a1aa';
        mCtx.lineWidth = 1.5;
        mCtx.stroke();
      }
    }
    const moonTexture = new THREE.CanvasTexture(moonCanvas);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-28, 20, -15);
    scene.add(moonMesh);

    // 8. Distant Ringed Planet (Saturn/Kronos)
    const planetGeo = new THREE.SphereGeometry(4.5, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.7,
    });
    const ringedPlanet = new THREE.Mesh(planetGeo, planetMat);
    ringedPlanet.position.set(38, 24, -35);

    const planetRingGeo = new THREE.RingGeometry(5.8, 9.2, 48);
    const planetRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const planetRing = new THREE.Mesh(planetRingGeo, planetRingMat);
    planetRing.rotation.x = Math.PI / 2.3;
    ringedPlanet.add(planetRing);
    scene.add(ringedPlanet);

    // 9. Interactive Mouse Drag for 3D Moon & Celestial Bodies
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (moonMesh) {
        moonMesh.rotation.y += deltaX * 0.01;
        moonMesh.rotation.x += deltaY * 0.01;
      }
      if (earthMesh) {
        earthMesh.rotation.y += deltaX * 0.005;
      }

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 10. Sleek 3D Spacecraft Model
    const rocketGroup = new THREE.Group();

    // Fuselage
    const bodyGeo = new THREE.CylinderGeometry(1.25, 1.45, 7.8, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.85,
      roughness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    rocketGroup.add(bodyMesh);

    // Aerodynamic Nose Cone
    const noseGeo = new THREE.ConeGeometry(1.25, 3.4, 32);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.75,
      roughness: 0.2,
    });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.position.y = 5.6;
    rocketGroup.add(noseMesh);

    // Cockpit Visor (Glowing Cyan)
    const visorGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 2.4, 1.05);
    rocketGroup.add(visorMesh);

    // Stabilizer Fins (3 fins)
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const finGeo = new THREE.BoxGeometry(0.2, 3.2, 1.6);
      const finMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        metalness: 0.8,
        roughness: 0.2,
      });
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.position.set(Math.cos(angle) * 1.55, -2.4, Math.sin(angle) * 1.55);
      finMesh.rotation.y = -angle;
      rocketGroup.add(finMesh);
    }

    // Engine Nozzle
    const nozzleGeo = new THREE.CylinderGeometry(1.0, 1.45, 1.2, 32);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.35,
    });
    const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleMesh.position.y = -4.5;
    rocketGroup.add(nozzleMesh);

    // =========================================================================
    // REALISTIC MULTI-LAYERED ROCKET EXHAUST FIRE SYSTEM
    // =========================================================================
    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, -5.1, 0);

    // 1. Ultra-Hot Superheated Inner Plasma Core Cone (Brilliant White/Cyan)
    const innerCoreGeo = new THREE.ConeGeometry(0.75, 4.5, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    innerCoreMesh.position.y = -2.25;
    innerCoreMesh.rotation.x = Math.PI;
    fireGroup.add(innerCoreMesh);

    // 2. Intermediate Solar Incandescent Combustion Cone (Golden Yellow/Solar Amber)
    const midFlameGeo = new THREE.ConeGeometry(1.3, 7.5, 32);
    const midFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const midFlameMesh = new THREE.Mesh(midFlameGeo, midFlameMat);
    midFlameMesh.position.y = -3.75;
    midFlameMesh.rotation.x = Math.PI;
    fireGroup.add(midFlameMesh);

    // 3. Outer Supersonic Turbulent Flame Envelope (Blazing Orange & Crimson)
    const outerFlameGeo = new THREE.CylinderGeometry(0.9, 2.2, 10.5, 32, 16, true);
    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const outerFlameMesh = new THREE.Mesh(outerFlameGeo, outerFlameMat);
    outerFlameMesh.position.y = -5.25;
    fireGroup.add(outerFlameMesh);

    // 4. Wide Vacuum Exhaust Expansion Bell (Flared Translucent Shield)
    const expansionBellGeo = new THREE.ConeGeometry(3.2, 12.0, 32, 1, true);
    const expansionBellMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const expansionBellMesh = new THREE.Mesh(expansionBellGeo, expansionBellMat);
    expansionBellMesh.position.y = -6.0;
    expansionBellMesh.rotation.x = Math.PI;
    fireGroup.add(expansionBellMesh);

    // 5. Mach Shock Diamonds (5 stacked diamond shock cells along plume axis)
    const machDiamonds: THREE.Mesh[] = [];
    const machDiamondCount = 5;
    for (let i = 0; i < machDiamondCount; i++) {
      const diamondGeo = new THREE.OctahedronGeometry(0.42 - i * 0.05, 0);
      const diamondMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
      diamondMesh.position.y = -(1.2 + i * 1.5);
      diamondMesh.scale.set(1.0, 1.8, 1.0);
      fireGroup.add(diamondMesh);
      machDiamonds.push(diamondMesh);
    }

    // 6. Dynamic High-Speed Sparks & Incandescent Ember Particle System (450 sparks)
    const sparkCount = 450;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);
    const sparkLifetimes = new Float32Array(sparkCount);
    const sparkMaxLifetimes = new Float32Array(sparkCount);
    const sparkColors = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * 0.8;
      sparkPositions[i * 3 + 1] = -Math.random() * 8.0;
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      sparkVelocities[i * 3] = (Math.random() - 0.5) * 2.5;
      sparkVelocities[i * 3 + 1] = -(15 + Math.random() * 35);
      sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2.5;

      sparkLifetimes[i] = Math.random();
      sparkMaxLifetimes[i] = 0.4 + Math.random() * 0.8;

      sparkColors[i * 3] = 1.0;
      sparkColors[i * 3 + 1] = 0.9;
      sparkColors[i * 3 + 2] = 0.5;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    const sparkMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const sparkParticles = new THREE.Points(sparkGeo, sparkMat);
    fireGroup.add(sparkParticles);

    // 7. Dynamic Multi-Spectral Engine Lighting Rig
    const coreLight = new THREE.PointLight(0xffffff, 4.0, 25);
    coreLight.position.set(0, -1.0, 0);
    fireGroup.add(coreLight);

    const flameLight = new THREE.PointLight(0xff6600, 6.0, 45);
    flameLight.position.set(0, -4.0, 0);
    fireGroup.add(flameLight);

    rocketGroup.add(fireGroup);

    rocketGroup.position.set(0, 4, 18);
    scene.add(rocketGroup);

    // 11. Glowing Blue Orbital Ring
    const ringCurve = new THREE.EllipseCurve(0, -34, 38, 22, 0, 2 * Math.PI, false, 0);
    const ringPoints = ringCurve.getPoints(120).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.35,
    });
    const orbitalRing = new THREE.Line(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 4.5;
    orbitalRing.rotation.z = -Math.PI / 12;
    scene.add(orbitalRing);

    // 12. Orbiting Satellite
    const satGroup = new THREE.Group();
    const satBodyGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const satBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.1,
    });
    const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
    satGroup.add(satBody);

    const wingGeo = new THREE.BoxGeometry(2.8, 0.8, 0.08);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const wing1 = new THREE.Mesh(wingGeo, wingMat);
    wing1.position.x = 2.0;
    const wing2 = new THREE.Mesh(wingGeo, wingMat);
    wing2.position.x = -2.0;
    satGroup.add(wing1, wing2);
    satGroup.position.set(28, 12, -10);
    scene.add(satGroup);

    // =========================================================================
    // 13.5 MAJESTIC 3D GLOWING COMETS WITH DYNAMIC TRAILING LIGHT RIBBONS
    // =========================================================================
    interface CometData {
      meshGroup: THREE.Group;
      coreMesh: THREE.Mesh;
      haloMesh: THREE.Mesh;
      pointLight?: THREE.PointLight;
      trailLine: THREE.Line;
      trailGeo: THREE.BufferGeometry;
      trailPositions: Float32Array;
      history: THREE.Vector3[];
      colorHex: number;
      radiusX: number;
      radiusY: number;
      radiusZ: number;
      speed: number;
      phaseOffset: number;
      tiltX: number;
      tiltY: number;
      tiltZ: number;
      flySpreadX: number;
      flySpreadY: number;
    }

    const cometsGroup = new THREE.Group();
    const cometDefs = [
      { color: 0x00ffff, haloColor: 0x38bdf8, radX: 18, radY: 11, radZ: 14, speed: 2.1, offset: 0, tiltX: 0.35, tiltY: 0.2, tiltZ: 0.4, spreadX: -26, spreadY: 16, light: true },
      { color: 0xffb703, haloColor: 0xfbbf24, radX: 21, radY: 14, radZ: 17, speed: 1.8, offset: Math.PI * 0.4, tiltX: -0.4, tiltY: 0.6, tiltZ: -0.3, spreadX: 28, spreadY: -14, light: true },
      { color: 0xc084fc, haloColor: 0xa855f7, radX: 15, radY: 12, radZ: 13, speed: 2.4, offset: Math.PI * 0.85, tiltX: 0.6, tiltY: -0.3, tiltZ: 0.5, spreadX: -20, spreadY: -18, light: false },
      { color: 0x34d399, haloColor: 0x10b981, radX: 23, radY: 15, radZ: 19, speed: 1.6, offset: Math.PI * 1.25, tiltX: -0.3, tiltY: -0.5, tiltZ: 0.2, spreadX: 22, spreadY: 20, light: false },
      { color: 0xf43f5e, haloColor: 0xfb7185, radX: 19, radY: 13, radZ: 16, speed: 2.2, offset: Math.PI * 1.65, tiltX: 0.5, tiltY: 0.4, tiltZ: -0.6, spreadX: -18, spreadY: 24, light: false },
      { color: 0xffffff, haloColor: 0x93c5fd, radX: 25, radY: 17, radZ: 21, speed: 1.5, offset: Math.PI * 0.15, tiltX: -0.5, tiltY: 0.2, tiltZ: 0.7, spreadX: 30, spreadY: -22, light: true },
    ];

    const TRAIL_LENGTH = 55;
    const comets: CometData[] = [];

    cometDefs.forEach((def) => {
      const cGroup = new THREE.Group();

      // Nucleus (Bright additive sphere)
      const coreGeo = new THREE.SphereGeometry(0.65, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      cGroup.add(coreMesh);

      // Volumetric Corona Halo
      const haloGeo = new THREE.SphereGeometry(1.6, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: def.haloColor,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      cGroup.add(haloMesh);

      // Dynamic Point Light attached to brightest comets
      let pointLight: THREE.PointLight | undefined;
      if (def.light) {
        pointLight = new THREE.PointLight(def.color, 0.0, 45);
        cGroup.add(pointLight);
      }

      // Dynamic Trailing Light Ribbon / Line
      const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
      const trailColors = new Float32Array(TRAIL_LENGTH * 3);
      const baseColor = new THREE.Color(def.color);

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const alpha = Math.pow(1 - i / TRAIL_LENGTH, 1.8);
        trailColors[i * 3] = baseColor.r * alpha;
        trailColors[i * 3 + 1] = baseColor.g * alpha;
        trailColors[i * 3 + 2] = baseColor.b * alpha;
      }

      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const trailMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        linewidth: 3,
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      cometsGroup.add(trailLine);
      cometsGroup.add(cGroup);

      const history: THREE.Vector3[] = [];
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        history.push(new THREE.Vector3(0, -999, 0));
      }

      comets.push({
        meshGroup: cGroup,
        coreMesh,
        haloMesh,
        pointLight,
        trailLine,
        trailGeo,
        trailPositions,
        history,
        colorHex: def.color,
        radiusX: def.radX,
        radiusY: def.radY,
        radiusZ: def.radZ,
        speed: def.speed,
        phaseOffset: def.offset,
        tiltX: def.tiltX,
        tiltY: def.tiltY,
        tiltZ: def.tiltZ,
        flySpreadX: def.spreadX,
        flySpreadY: def.spreadY,
      });
    });
    scene.add(cometsGroup);

    // Glowing Comet Stardust Sparks
    const cometDustCount = 300;
    const cometDustGeo = new THREE.BufferGeometry();
    const cometDustPos = new Float32Array(cometDustCount * 3);
    const cometDustVel = new Float32Array(cometDustCount * 3);
    const cometDustLife = new Float32Array(cometDustCount);
    const cometDustMaxLife = new Float32Array(cometDustCount);
    const cometDustColors = new Float32Array(cometDustCount * 3);

    for (let i = 0; i < cometDustCount; i++) {
      cometDustPos[i * 3] = 0;
      cometDustPos[i * 3 + 1] = -999;
      cometDustPos[i * 3 + 2] = 0;
      cometDustLife[i] = 1.0;
      cometDustMaxLife[i] = 0.4 + Math.random() * 0.6;
    }
    cometDustGeo.setAttribute('position', new THREE.BufferAttribute(cometDustPos, 3));
    cometDustGeo.setAttribute('color', new THREE.BufferAttribute(cometDustColors, 3));

    const cometDustMat = new THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const cometDustPoints = new THREE.Points(cometDustGeo, cometDustMat);
    scene.add(cometDustPoints);

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 14. 60 FPS Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const render = () => {
      const delta = clock.getDelta();
      animTimeRef.current += delta;
      const t = animTimeRef.current;
      const sceneT = t - phaseStartTimeRef.current;
      const p = phaseRef.current;

      // Rotate Earth & celestial bodies
      if (earthMesh) earthMesh.rotation.y += delta * 0.04;
      if (moonMesh && !isDragging) moonMesh.rotation.y += delta * 0.03;
      if (ringedPlanet) ringedPlanet.rotation.y += delta * 0.05;

      // Orbit Satellite
      if (satGroup) {
        const satAngle = t * 0.35;
        satGroup.position.x = Math.cos(satAngle) * 36;
        satGroup.position.z = Math.sin(satAngle) * 28;
        satGroup.position.y = Math.sin(satAngle * 1.5) * 6 + 6;
        satGroup.rotation.y = -satAngle;
      }

      // =======================================================================
      // REALISTIC ENGINE FLAME TURBULENCE & DYNAMIC MULTI-SHAPE PHYSICS
      // =======================================================================
      const isLaunching = p === 'LAUNCHING';
      const isAuthenticating = p === 'AUTHENTICATING';
      const combustionFlicker = 1.0 + Math.sin(t * 55) * 0.12 + Math.cos(t * 85) * 0.08;

      if (isLaunching) {
        // Full Hyper-Thrust Launch Firestorm
        const launchThrust = 1.7 + Math.sin(t * 40) * 0.25;

        innerCoreMesh.scale.set(1.4 * combustionFlicker, launchThrust * 1.8, 1.4 * combustionFlicker);
        innerCoreMat.color.setHex(0xffffff);
        innerCoreMat.opacity = 0.95;

        midFlameMesh.scale.set(1.8 * combustionFlicker, launchThrust * 2.2, 1.8 * combustionFlicker);
        midFlameMat.color.setHex(0xff9900);
        midFlameMat.opacity = 0.9;

        outerFlameMesh.scale.set(2.2 * combustionFlicker, launchThrust * 2.5, 2.2 * combustionFlicker);
        outerFlameMesh.rotation.y += delta * 12;
        outerFlameMat.color.setHex(0xff2a00);
        outerFlameMat.opacity = 0.75;

        expansionBellMesh.scale.set(2.6 * combustionFlicker, launchThrust * 2.8, 2.6 * combustionFlicker);
        expansionBellMat.color.setHex(0xef4444);
        expansionBellMat.opacity = 0.35;

        machDiamonds.forEach((dm, idx) => {
          const dScale = (1.2 + Math.sin(t * 30 + idx * 1.2) * 0.35) * combustionFlicker;
          dm.scale.set(dScale, dScale * 2.2, dScale);
          (dm.material as THREE.MeshBasicMaterial).color.setHex(0xfff0bb);
          (dm.material as THREE.MeshBasicMaterial).opacity = 0.95;
        });

        coreLight.intensity = 8.0 * combustionFlicker;
        coreLight.color.setHex(0xffffff);
        flameLight.intensity = 12.0 * combustionFlicker;
        flameLight.color.setHex(0xff5500);

        sparkMat.size = 3.2;
        sparkMat.opacity = 1.0;
      } else if (isAuthenticating) {
        // Pre-Ignition Spool-up Mode
        const spool = 0.8 + Math.sin(t * 25) * 0.2;
        innerCoreMesh.scale.set(spool, spool * 1.1, spool);
        innerCoreMat.color.setHex(0x38bdf8);
        midFlameMesh.scale.set(spool, spool * 1.2, spool);
        midFlameMat.color.setHex(0x0ea5e9);
        outerFlameMesh.scale.set(spool, spool * 1.2, spool);
        outerFlameMat.color.setHex(0x0284c7);
        expansionBellMat.opacity = 0.15;

        machDiamonds.forEach((dm, idx) => {
          const dScale = 0.7 + Math.sin(t * 20 + idx) * 0.2;
          dm.scale.set(dScale, dScale * 1.5, dScale);
          (dm.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        });

        coreLight.intensity = 4.0 * spool;
        coreLight.color.setHex(0x38bdf8);
        flameLight.intensity = 5.0 * spool;
        flameLight.color.setHex(0x0284c7);
      } else {
        // Idle Ion Thruster Mode
        const idlePulse = 0.7 + Math.sin(t * 6) * 0.1;
        innerCoreMesh.scale.set(idlePulse, idlePulse * 0.9, idlePulse);
        innerCoreMat.color.setHex(0x67e8f9);
        midFlameMesh.scale.set(idlePulse, idlePulse * 0.9, idlePulse);
        midFlameMat.color.setHex(0x06b6d4);
        outerFlameMesh.scale.set(idlePulse, idlePulse * 0.8, idlePulse);
        outerFlameMat.color.setHex(0x0284c7);
        expansionBellMat.opacity = 0.1;

        machDiamonds.forEach((dm) => {
          dm.scale.set(0.5, 0.8, 0.5);
          (dm.material as THREE.MeshBasicMaterial).color.setHex(0x67e8f9);
        });

        coreLight.intensity = 2.5 * idlePulse;
        coreLight.color.setHex(0x67e8f9);
        flameLight.intensity = 3.0 * idlePulse;
        flameLight.color.setHex(0x00e5ff);
      }

      // Update Spark Ember Particles in World / Fire Space
      const sparkPosArray = sparkGeo.attributes.position.array as Float32Array;
      const sparkColorArray = sparkGeo.attributes.color.array as Float32Array;
      const speedMultiplier = isLaunching ? 2.8 : isAuthenticating ? 1.4 : 0.8;

      for (let i = 0; i < sparkCount; i++) {
        sparkLifetimes[i] += delta * speedMultiplier;

        if (sparkLifetimes[i] > sparkMaxLifetimes[i]) {
          // Reset spark at nozzle origin
          sparkLifetimes[i] = 0;
          sparkPosArray[i * 3] = (Math.random() - 0.5) * (isLaunching ? 1.2 : 0.4);
          sparkPosArray[i * 3 + 1] = -0.2;
          sparkPosArray[i * 3 + 2] = (Math.random() - 0.5) * (isLaunching ? 1.2 : 0.4);

          sparkVelocities[i * 3] = (Math.random() - 0.5) * (isLaunching ? 5.0 : 1.5);
          sparkVelocities[i * 3 + 1] = -(isLaunching ? (25 + Math.random() * 45) : (10 + Math.random() * 20));
          sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * (isLaunching ? 5.0 : 1.5);
        } else {
          // Progress spark movement
          sparkPosArray[i * 3] += sparkVelocities[i * 3] * delta;
          sparkPosArray[i * 3 + 1] += sparkVelocities[i * 3 + 1] * delta;
          sparkPosArray[i * 3 + 2] += sparkVelocities[i * 3 + 2] * delta;

          // Color transition: White -> Gold -> Orange -> Red -> Fade
          const lifeRatio = sparkLifetimes[i] / sparkMaxLifetimes[i];
          if (isLaunching) {
            if (lifeRatio < 0.25) {
              sparkColorArray[i * 3] = 1.0;
              sparkColorArray[i * 3 + 1] = 1.0;
              sparkColorArray[i * 3 + 2] = 0.8;
            } else if (lifeRatio < 0.6) {
              sparkColorArray[i * 3] = 1.0;
              sparkColorArray[i * 3 + 1] = 0.6;
              sparkColorArray[i * 3 + 2] = 0.1;
            } else {
              sparkColorArray[i * 3] = 0.9;
              sparkColorArray[i * 3 + 1] = 0.15;
              sparkColorArray[i * 3 + 2] = 0.05;
            }
          } else {
            sparkColorArray[i * 3] = 0.2;
            sparkColorArray[i * 3 + 1] = 0.8;
            sparkColorArray[i * 3 + 2] = 1.0;
          }
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;

      // ----------------------------------------------------
      // PHASE CAMERA, SPACECRAFT & COMETS ORCHESTRATION
      // ----------------------------------------------------
      if (p !== 'WARP_TRANSITION') {
        // Guarantee comets and trails are dormant during pre-warp phases
        comets.forEach((cmt) => {
          (cmt.coreMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          (cmt.haloMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          (cmt.trailLine.material as THREE.LineBasicMaterial).opacity = 0;
          if (cmt.pointLight) cmt.pointLight.intensity = 0;
          cmt.meshGroup.position.set(0, -999, 0);
        });
        cometDustMat.opacity = 0;
      }

      if (p === 'INITIAL') {
        const progress = Math.min(sceneT / 3.0, 1.0);
        camera.position.set(0, 16 - progress * 2, 65 - progress * 10);
        camera.lookAt(0, 2, 0);

        if (rocketGroup) {
          rocketGroup.position.set(0, 3.5 + Math.sin(t * 2) * 0.4, 18);
          rocketGroup.rotation.set(0, 0, Math.sin(t * 1.5) * 0.03);
        }
        if (orbitalRing) (orbitalRing.material as THREE.LineBasicMaterial).opacity = 0.2;
      } else if (p === 'ORBITING') {
        const orbitAngle = sceneT * 1.3;
        const orbitRadiusX = 26;
        const orbitRadiusZ = 18;

        if (rocketGroup) {
          rocketGroup.position.x = Math.sin(orbitAngle) * orbitRadiusX;
          rocketGroup.position.z = Math.cos(orbitAngle) * orbitRadiusZ;
          rocketGroup.position.y = Math.sin(orbitAngle * 0.8) * 4 + 2;
          rocketGroup.rotation.y = orbitAngle + Math.PI / 2;
          rocketGroup.rotation.z = -0.3; // Banking
        }

        camera.position.x = Math.sin(orbitAngle - 0.4) * 38;
        camera.position.z = Math.cos(orbitAngle - 0.4) * 34;
        camera.position.y = 12;
        camera.lookAt(
          rocketGroup?.position.x || 0,
          rocketGroup?.position.y || 0,
          rocketGroup?.position.z || 0
        );

        if (orbitalRing) (orbitalRing.material as THREE.LineBasicMaterial).opacity = 0.7;
      } else if (p === 'FORM_ACTIVE' || p === 'AUTHENTICATING') {
        camera.position.set(0, 6, 42);
        camera.lookAt(0, 0, 0);

        if (rocketGroup) {
          const bgAngle = t * 0.3;
          rocketGroup.position.set(Math.cos(bgAngle) * 30, 8 + Math.sin(bgAngle) * 3, -15);
          rocketGroup.rotation.set(0.2, -bgAngle, 0.2);
        }
      } else if (p === 'LAUNCHING') {
        const launchProgress = Math.min(sceneT / 2.0, 1.0);
        const easeLaunch = launchProgress * launchProgress * 120;

        if (rocketGroup) {
          rocketGroup.position.set(
            easeLaunch * 0.3,
            easeLaunch * 0.8 - 4,
            18 - easeLaunch * 0.6
          );
          rocketGroup.rotation.set(-0.6, 0.4, -0.4);
        }

        camera.position.set(
          (rocketGroup?.position.x || 0) * 0.5,
          (rocketGroup?.position.y || 0) * 0.4 + 4,
          (rocketGroup?.position.z || 0) + 30
        );
        camera.lookAt(
          rocketGroup?.position.x || 0,
          rocketGroup?.position.y || 0,
          rocketGroup?.position.z || 0
        );
      } else if (p === 'WARP_TRANSITION') {
        const totalWarpTime = 3.6;
        const warpProgress = Math.min(sceneT / totalWarpTime, 1.0);

        // Perspective Camera positioned to view revolving comets and fly-through
        camera.position.set(0, 0, 22);
        camera.lookAt(0, 0, -80);

        // =====================================================================
        // COMETS ORCHESTRATION: REVOLVING AROUND WELCOME SIGN -> FLYING PAST USER
        // =====================================================================
        // Stage 1 (0 to 1.8s): Comets orbit and revolve in 3D around the Welcome Sign
        // Stage 2 (1.8s to 3.5s): Comets break orbit, stream luminous trails towards
        //                         camera, zoom past Z = 22, and disappear behind user (+Z)
        const isOrbitingWelcome = sceneT < 1.8;
        const breakoutT = Math.max(0, sceneT - 1.8);
        const flyProgress = Math.min(breakoutT / 1.7, 1.0);
        const flyEase = Math.pow(flyProgress, 2.4); // Exponential acceleration towards user

        const cometGlobalOpacity = warpProgress < 0.9 ? Math.min(sceneT * 2.2, 1.0) : (1.0 - warpProgress) * 10;
        cometDustMat.opacity = cometGlobalOpacity * 0.9;

        const dustPositions = cometDustGeo.attributes.position.array as Float32Array;
        const dustColors = cometDustGeo.attributes.color.array as Float32Array;

        comets.forEach((cmt, idx) => {
          // 1. Orbital revolution coordinates around the central Welcome beacon
          const angle = t * cmt.speed + cmt.phaseOffset;
          const rawX = Math.cos(angle) * cmt.radiusX;
          const rawY = Math.sin(angle * 1.25) * cmt.radiusY;
          const rawZ = Math.sin(angle) * cmt.radiusZ - 6;

          const orbitPos = new THREE.Vector3(rawX, rawY, rawZ);
          const euler = new THREE.Euler(cmt.tiltX, cmt.tiltY + t * 0.12, cmt.tiltZ, 'XYZ');
          orbitPos.applyEuler(euler);

          let currentX = orbitPos.x;
          let currentY = orbitPos.y;
          let currentZ = orbitPos.z;

          if (!isOrbitingWelcome) {
            // Hyperbolic slingshot towards the user / camera perspective (+Z)
            currentX = orbitPos.x * (1 + 2.6 * flyEase) + cmt.flySpreadX * flyEase;
            currentY = orbitPos.y * (1 + 2.6 * flyEase) + cmt.flySpreadY * flyEase;
            // Z rushes from orbit depth (-6..+6) all the way past camera (Z=22) to Z=+85 (behind user's back)
            currentZ = orbitPos.z + (90 - orbitPos.z) * flyEase;
          }

          cmt.meshGroup.position.set(currentX, currentY, currentZ);

          // Dynamic comet core and halo pulse
          const cometPulse = 1.0 + Math.sin(t * 14 + idx * 1.5) * 0.25;
          cmt.coreMesh.scale.set(cometPulse, cometPulse, cometPulse);
          cmt.haloMesh.scale.set(cometPulse * 1.3, cometPulse * 1.3, cometPulse * 1.3);

          // Alpha fade when comet rushes past the user's perspective (Z > 24)
          let cmtAlpha = cometGlobalOpacity;
          if (currentZ > 24) {
            cmtAlpha *= Math.max(0, 1.0 - (currentZ - 24) / 45);
          }

          (cmt.coreMesh.material as THREE.MeshBasicMaterial).opacity = cmtAlpha * 0.95;
          (cmt.haloMesh.material as THREE.MeshBasicMaterial).opacity = cmtAlpha * 0.65;
          (cmt.trailLine.material as THREE.LineBasicMaterial).opacity = cmtAlpha * 0.95;
          if (cmt.pointLight) {
            cmt.pointLight.intensity = cmtAlpha * (isOrbitingWelcome ? 3.5 : 7.5);
          }

          // Update Trail Position History
          cmt.history.unshift(new THREE.Vector3(currentX, currentY, currentZ));
          if (cmt.history.length > TRAIL_LENGTH) {
            cmt.history.pop();
          }

          // Update dynamic trail line buffer geometry
          for (let i = 0; i < TRAIL_LENGTH; i++) {
            const pos = cmt.history[i] || cmt.history[cmt.history.length - 1];
            cmt.trailPositions[i * 3] = pos.x;
            cmt.trailPositions[i * 3 + 1] = pos.y;
            cmt.trailPositions[i * 3 + 2] = pos.z;
          }
          cmt.trailGeo.attributes.position.needsUpdate = true;

          // Emit comet stardust particles
          if (Math.random() < (isOrbitingWelcome ? 0.35 : 0.8)) {
            const dustIdx = (idx * 50 + Math.floor(Math.random() * 50)) % cometDustCount;
            dustPositions[dustIdx * 3] = currentX + (Math.random() - 0.5) * 0.7;
            dustPositions[dustIdx * 3 + 1] = currentY + (Math.random() - 0.5) * 0.7;
            dustPositions[dustIdx * 3 + 2] = currentZ - (isOrbitingWelcome ? 0.4 : 2.8);

            const bCol = new THREE.Color(cmt.colorHex);
            dustColors[dustIdx * 3] = bCol.r;
            dustColors[dustIdx * 3 + 1] = bCol.g;
            dustColors[dustIdx * 3 + 2] = bCol.b;

            cometDustVel[dustIdx * 3] = (Math.random() - 0.5) * 1.5;
            cometDustVel[dustIdx * 3 + 1] = (Math.random() - 0.5) * 1.5;
            cometDustVel[dustIdx * 3 + 2] = isOrbitingWelcome ? (Math.random() - 0.5) * 2 : -(20 + Math.random() * 35);
            cometDustLife[dustIdx] = 0;
          }
        });

        // Update Comet Dust Sparks
        for (let i = 0; i < cometDustCount; i++) {
          cometDustLife[i] += delta;
          if (cometDustLife[i] < cometDustMaxLife[i]) {
            dustPositions[i * 3] += cometDustVel[i * 3] * delta;
            dustPositions[i * 3 + 1] += cometDustVel[i * 3 + 1] * delta;
            dustPositions[i * 3 + 2] += cometDustVel[i * 3 + 2] * delta;
          } else {
            dustPositions[i * 3 + 1] = -999;
          }
        }
        cometDustGeo.attributes.position.needsUpdate = true;
        cometDustGeo.attributes.color.needsUpdate = true;

        if (rocketGroup) rocketGroup.position.set(0, -999, 0);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    render();

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
  }, []);

  // Handle Step 1 -> 2 & 3: Click "ENTER ->"
  const handleEnterClick = () => {
    setPhase('ORBITING');
    setTimeout(() => {
      setPhase('FORM_ACTIVE');
    }, 2200);
  };

  // Handle Step 4 -> 5 -> 6 -> 7 -> 8: Submit Form with Supabase Authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setAuthError(null);
    setIsSubmitting(true);

    try {
      let authResult;
      if (authMode === 'SIGN_IN') {
        authResult = await SupabaseAuthService.authenticateUser(email, password);
      } else {
        authResult = await SupabaseAuthService.registerUser(name, email, password);
      }

      if (!authResult.success) {
        setAuthError(
          authResult.error ||
            'ACCESS DENIED: The password entered does not match the password registered for this astronaut email.'
        );
        setIsSubmitting(false);
        return;
      }

      // Step 5: Holographic Authenticating pulse
      setPhase('AUTHENTICATING');

      setTimeout(() => {
        // Step 6: Rocket ignition and launch plume
        setPhase('LAUNCHING');

        setTimeout(() => {
          // Step 7: Hyperspace warp-speed transition
          setPhase('WARP_TRANSITION');

          setTimeout(() => {
            const user: AuthUserData = {
              name: authResult.user?.fullName || name.trim() || email.split('@')[0],
              email: authResult.user?.email || email.trim().toLowerCase(),
              isAuthenticated: true,
              avatarSeed: authResult.user?.avatarSeed || name.trim().toLowerCase(),
              loginTimestamp: Date.now(),
            };
            onLoginSuccess(user);
          }, 3600);
        }, 1800);
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication system error.';
      setAuthError(`Authentication error: ${msg}`);
      setIsSubmitting(false);
    }
  };

  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#030712] font-sans select-none">
      {/* 1. Full-Screen Hyper-Realistic Three.js 3D WebGL Canvas */}
      <div ref={threeContainerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive Drag Hint */}
      <div className="absolute top-4 left-6 z-20 pointer-events-none hidden sm:flex items-center space-x-2 text-[10px] font-mono text-cyan-400/70 bg-[#040713]/60 px-3 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-sm">
        <Orbit className="w-3 h-3 text-cyan-400" />
        <span>3D Space Canvas: Click & Drag to Rotate Moon and Celestial Bodies</span>
      </div>

      {/* ========================================================= */}
      {/* 1. INITIAL PHASE: "ENTER ->" GLOWING CLOUD BUTTON */}
      {/* ========================================================= */}
      {phase === 'INITIAL' && (
        <div className="relative z-20 flex flex-col items-center mt-52 sm:mt-64 animate-fade-in pointer-events-auto">
          <div className="relative group">
            {/* Luminous Cloud Glow Aura */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/60 via-blue-500/50 to-cyan-400/60 rounded-full blur-xl group-hover:blur-2xl transition-all opacity-80 group-hover:opacity-100 animate-pulse-slow" />

            <button
              onClick={handleEnterClick}
              className="relative flex items-center space-x-3 px-11 py-4.5 rounded-full bg-gradient-to-b from-cyan-400 via-cyan-500 to-blue-600 text-white font-mono font-black text-lg tracking-wider border-2 border-white/80 shadow-[0_0_40px_rgba(56,189,248,0.9)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <span>ENTER</span>
              <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>

          <div className="mt-6 flex items-center space-x-2 text-cyan-300 font-mono text-xs tracking-widest uppercase">
            <Orbit className="w-3.5 h-3.5 text-cyan-400" />
            <span>LunaRov Space Gateway</span>
            <Orbit className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-4 text-xs font-mono text-gray-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer transition-colors"
            >
              Direct Guest Exploration &rarr;
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3, 4, 5. 3D CLOUD-SHAPED LOGIN FORM (With Validation) */}
      {/* ========================================================= */}
      {(phase === 'FORM_ACTIVE' || phase === 'AUTHENTICATING') && (
        <div className="relative z-40 w-full max-w-md px-4 animate-cloud-rise pointer-events-auto">
          <div className="relative p-8 sm:p-10 rounded-[42px] bg-gradient-to-b from-white/95 via-white/90 to-cyan-50/95 text-slate-900 shadow-[0_0_70px_rgba(56,189,248,0.8),_0_25px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl border-4 border-white">
            {/* 3D Volumetric Cloud Spheres */}
            <div className="absolute -top-7 -left-7 w-22 h-22 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -top-9 left-1/3 w-32 h-32 bg-white/95 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -top-7 -right-7 w-26 h-26 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -bottom-7 -left-5 w-22 h-22 bg-cyan-50/90 rounded-full blur-[1px] -z-10 shadow-lg" />
            <div className="absolute -bottom-9 right-1/4 w-32 h-32 bg-white/90 rounded-full blur-[1px] -z-10 shadow-lg" />

            {phase === 'FORM_ACTIVE' && (
              <div className="text-center mb-5">
                {/* Mode Selector Tabs */}
                <div className="inline-flex p-1 bg-slate-200/70 rounded-full border border-cyan-200/80 mb-3 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('SIGN_IN');
                      setAuthError(null);
                    }}
                    className={`flex items-center space-x-1.5 py-1.5 px-4 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                      authMode === 'SIGN_IN'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>SIGN IN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('REGISTER');
                      setAuthError(null);
                    }}
                    className={`flex items-center space-x-1.5 py-1.5 px-4 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                      authMode === 'REGISTER'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>REGISTER</span>
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {authMode === 'SIGN_IN' ? 'Mission Sign In' : 'Astronaut Registration'}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-cyan-700 font-mono mt-1">
                  {authMode === 'SIGN_IN'
                    ? 'Enter your registered email and password'
                    : 'Create your permanent astronaut credentials'}
                </p>
              </div>
            )}

            {phase === 'AUTHENTICATING' ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="relative flex items-center justify-center w-22 h-22">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-500 animate-spin-slow" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <CheckCircle2 className="w-9 h-9 text-white animate-bounce-slow" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-mono">Authenticating...</h3>
                  <p className="text-xs text-slate-600 font-mono mt-1">
                    Verifying credentials with Supabase Database
                  </p>
                </div>
                <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Error Banner */}
                {authError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs font-mono flex items-start space-x-2.5 animate-shake shadow-md">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 font-semibold leading-relaxed">{authError}</div>
                  </div>
                )}

                {/* Field 1: Name (Required only for Registration) */}
                {authMode === 'REGISTER' && (
                  <div>
                    <label htmlFor={nameInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                      Astronaut Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                      <input
                        id={nameInputId}
                        type="text"
                        placeholder="Enter your callsign / full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                        required={authMode === 'REGISTER'}
                        className={`w-full pl-10 pr-10 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                          touched.name && !isNameValid
                            ? 'border-red-400 bg-red-50/50'
                            : isNameValid
                            ? 'border-emerald-500 bg-white shadow-sm'
                            : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                        }`}
                      />
                      {isNameValid && (
                        <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                      )}
                      {touched.name && !isNameValid && (
                        <AlertCircle className="absolute right-3.5 w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                )}

                {/* Field 2: Email */}
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={emailInputId}
                      type="email"
                      placeholder="commander@lunarov.space"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setAuthError(null);
                        const trimmed = e.target.value.trim().toLowerCase();
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                          const reg = SupabaseAuthService.isEmailRegistered(trimmed);
                          setIsRegisteredUser(reg);
                        } else {
                          setIsRegisteredUser(false);
                        }
                      }}
                      onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                      required
                      className={`w-full pl-10 pr-10 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                        touched.email && !isEmailValid
                          ? 'border-red-400 bg-red-50/50'
                          : isEmailValid
                          ? 'border-emerald-500 bg-white shadow-sm'
                          : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                      }`}
                    />
                    {isEmailValid && (
                      <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                    )}
                    {touched.email && !isEmailValid && (
                      <AlertCircle className="absolute right-3.5 w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {isRegisteredUser && authMode === 'SIGN_IN' && (
                    <div className="text-[11px] font-mono text-cyan-700 flex items-center space-x-1.5 mt-1.5 bg-cyan-100/70 py-1 px-3 rounded-full border border-cyan-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Account identified in database. Enter your password.</span>
                    </div>
                  )}
                </div>

                {/* Field 3: Password */}
                <div>
                  <label htmlFor={passwordInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Password {authMode === 'REGISTER' && <span className="text-slate-400 font-normal">(min 6 chars)</span>}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={passwordInputId}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError(null);
                      }}
                      onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                      required
                      className={`w-full pl-10 pr-16 py-3 text-sm font-medium rounded-full bg-cyan-50/70 border-2 transition-all outline-none text-slate-900 placeholder:text-slate-400 ${
                        touched.password && !isPasswordValid
                          ? 'border-red-400 bg-red-50/50'
                          : isPasswordValid
                          ? 'border-emerald-500 bg-white shadow-sm'
                          : 'border-cyan-200 focus:border-cyan-500 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-9 text-slate-400 hover:text-cyan-600 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {isPasswordValid && (
                      <CheckCircle2 className="absolute right-3.5 w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Validation Feedback Confirmation */}
                {isFormValid && (
                  <div className="flex items-center justify-center space-x-2 py-1.5 px-3 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold animate-fade-in">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Credentials format valid</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`w-full py-3.5 rounded-full font-mono font-bold text-sm tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg cursor-pointer ${
                    isFormValid && !isSubmitting
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Orbit className="w-4 h-4 animate-spin" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : authMode === 'SIGN_IN' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>AUTHENTICATE & ENTER</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>REGISTER & ENTER</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Mode Toggle Link */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'SIGN_IN' ? 'REGISTER' : 'SIGN_IN');
                      setAuthError(null);
                    }}
                    className="text-xs font-mono text-slate-600 hover:text-cyan-600 underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    {authMode === 'SIGN_IN'
                      ? 'New Astronaut? Create a mission account ->'
                      : 'Already registered? Sign in with your password ->'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. HYPER-THRUST LAUNCH PHASE TELEMETRY OVERLAY */}
      {/* ========================================================= */}
      {phase === 'LAUNCHING' && (
        <div className="relative z-50 flex flex-col items-center justify-center text-center px-4 animate-fade-in pointer-events-none font-mono">
          <div className="px-5 py-2 rounded-full bg-[#030712]/85 border border-orange-500/50 backdrop-blur-md shadow-[0_0_35px_rgba(249,115,22,0.65)] flex items-center space-x-2.5 text-orange-400 text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
            <span className="tracking-widest">MAIN ENGINE IGNITION // FULL THRUST 100%</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-300 tracking-widest uppercase bg-[#030712]/60 px-3 py-1 rounded-lg border border-cyan-900/40 backdrop-blur-sm">
            ORBITAL ESCAPE VELOCITY: 11.2 KM/S &bull; ACCELERATION: 4.8 G
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. WARP-SPEED TRANSITION & "WELCOME ABOARD!" OVERLAY */}
      {/* ========================================================= */}
      {phase === 'WARP_TRANSITION' && (
        <div className="relative z-50 flex flex-col items-center justify-center text-center px-4 animate-zoom-in pointer-events-none">
          {/* Holographic Glowing Central Beacon */}
          <div className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_120px_rgba(56,189,248,0.95)] flex items-center justify-center mb-6 animate-pulse-slow">
            <Globe className="w-24 h-24 text-white animate-spin-slow" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-200/60 animate-ping" />
            <div className="absolute -inset-3 rounded-full border border-dashed border-cyan-400/40 animate-spin" style={{ animationDuration: '18s' }} />
          </div>

          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 backdrop-blur-md mb-3">
            <Orbit className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              CELESTIAL COMET TRAJECTORIES SYNCHRONIZED
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 tracking-wider drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]">
            Welcome Aboard!
          </h1>
          <p className="mt-3 text-base sm:text-lg text-cyan-200 font-mono tracking-widest uppercase animate-pulse">
            Accelerating towards deep space exploration...
          </p>

          <div className="mt-6 flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>INITIALIZING LUNAROV MISSION DASHBOARD</span>
          </div>
        </div>
      )}
    </div>
  );
};
