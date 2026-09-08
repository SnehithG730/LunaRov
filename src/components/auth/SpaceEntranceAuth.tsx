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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe,
  Compass,
} from 'lucide-react';

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
  const isNameValid = name.trim().length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

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

    // Engine Nozzle & Glowing Thruster Plume
    const nozzleGeo = new THREE.CylinderGeometry(1.0, 1.45, 1.2, 32);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.35,
    });
    const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzleMesh.position.y = -4.5;
    rocketGroup.add(nozzleMesh);

    const plumeGeo = new THREE.ConeGeometry(1.1, 4.8, 32);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    });
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    plumeMesh.position.y = -6.9;
    plumeMesh.rotation.x = Math.PI;
    rocketGroup.add(plumeMesh);

    const thrusterLight = new THREE.PointLight(0x00e5ff, 3.5, 20);
    thrusterLight.position.set(0, -5.5, 0);
    rocketGroup.add(thrusterLight);

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

    // 13. Warp Hyperspace Light Streaks (Phase 7)
    const warpCount = 1400;
    const warpGeo = new THREE.BufferGeometry();
    const warpPos = new Float32Array(warpCount * 3);
    for (let i = 0; i < warpCount; i++) {
      warpPos[i * 3] = (Math.random() - 0.5) * 90;
      warpPos[i * 3 + 1] = (Math.random() - 0.5) * 90;
      warpPos[i * 3 + 2] = (Math.random() - 0.5) * 320;
    }
    warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
    const warpMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 2.2,
      transparent: true,
      opacity: 0.0,
    });
    const warpStars = new THREE.Points(warpGeo, warpMat);
    scene.add(warpStars);

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

      // Thruster Flicker
      if (plumeMesh) {
        const flicker = 0.9 + Math.sin(t * 35) * 0.15;
        plumeMesh.scale.set(flicker, flicker * 1.2, flicker);
      }

      // ----------------------------------------------------
      // PHASE CAMERA & SPACECRAFT ORCHESTRATION
      // ----------------------------------------------------
      if (p === 'INITIAL') {
        const progress = Math.min(sceneT / 3.0, 1.0);
        camera.position.set(0, 16 - progress * 2, 65 - progress * 10);
        camera.lookAt(0, 2, 0);

        if (rocketGroup) {
          rocketGroup.position.set(0, 3.5 + Math.sin(t * 2) * 0.4, 18);
          rocketGroup.rotation.set(0, 0, Math.sin(t * 1.5) * 0.03);
        }
        if (orbitalRing) (orbitalRing.material as THREE.LineBasicMaterial).opacity = 0.2;
        if (warpStars) (warpStars.material as THREE.PointsMaterial).opacity = 0;
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

          if (plumeMesh) {
            plumeMesh.scale.set(2.5, 4.0, 2.5);
            (plumeMesh.material as THREE.MeshBasicMaterial).color.setHex(0xfb923c);
          }
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
        const warpProgress = Math.min(sceneT / 2.5, 1.0);
        camera.position.set(0, 0, 20);
        camera.lookAt(0, 0, -100);

        if (warpStars) {
          const wMat = warpStars.material as THREE.PointsMaterial;
          wMat.opacity = warpProgress < 0.8 ? 0.95 : (1.0 - warpProgress) * 4;

          const positions = warpStars.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < warpCount; i++) {
            positions[i * 3 + 2] += delta * 480;
            if (positions[i * 3 + 2] > 50) {
              positions[i * 3 + 2] = -270;
            }
          }
          warpStars.geometry.attributes.position.needsUpdate = true;
        }

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

  // Handle Step 4 -> 5 -> 6 -> 7 -> 8: Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setPhase('AUTHENTICATING');

    setTimeout(() => {
      setPhase('LAUNCHING');

      setTimeout(() => {
        setPhase('WARP_TRANSITION');

        setTimeout(() => {
          const user: AuthUserData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            isAuthenticated: true,
            avatarSeed: name.trim().toLowerCase(),
            loginTimestamp: Date.now(),
          };
          onLoginSuccess(user);
        }, 2600);
      }, 1800);
    }, 1800);
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
        <Sparkles className="w-3 h-3 text-cyan-400" />
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
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>LunaRov Space Gateway</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm font-medium text-cyan-700 font-mono mt-1">
                  Sign in to continue your journey
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
                    Please wait while we verify your details
                  </p>
                </div>
                <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Field 1: Name */}
                <div>
                  <label htmlFor={nameInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={nameInputId}
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                      required
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

                {/* Field 2: Email */}
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={emailInputId}
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                </div>

                {/* Field 3: Password */}
                <div>
                  <label htmlFor={passwordInputId} className="block text-xs font-bold text-slate-700 font-mono mb-1">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-cyan-600" />
                    <input
                      id={passwordInputId}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                    <span>All fields are valid!</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`w-full py-3.5 rounded-full font-mono font-bold text-sm tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg cursor-pointer ${
                    isFormValid
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-white shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                  }`}
                >
                  <span>SUBMIT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. WARP-SPEED TRANSITION & "WELCOME ABOARD!" OVERLAY */}
      {/* ========================================================= */}
      {phase === 'WARP_TRANSITION' && (
        <div className="relative z-50 flex flex-col items-center justify-center text-center px-4 animate-zoom-in pointer-events-none">
          {/* Holographic Glowing Central Planet */}
          <div className="relative w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_100px_rgba(56,189,248,0.9)] flex items-center justify-center mb-6 animate-pulse-slow">
            <Globe className="w-24 h-24 text-white animate-spin-slow" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-200/60 animate-ping" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400 tracking-wider">
            Welcome Aboard!
          </h1>
          <p className="mt-3 text-base sm:text-lg text-cyan-200 font-mono tracking-widest uppercase animate-pulse">
            You are now entering your space journey...
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
