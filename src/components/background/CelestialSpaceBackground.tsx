'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Orbit } from 'lucide-react';

interface CelestialSpaceBackgroundProps {
  interactive?: boolean;
  intensity?: 'full' | 'subtle' | 'ambient';
  showControlsHint?: boolean;
}

export const CelestialSpaceBackground: React.FC<CelestialSpaceBackgroundProps> = ({
  interactive = true,
  intensity = 'full',
  showControlsHint = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [moonRotationInfo, setMoonRotationInfo] = useState({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030610, 0.002);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 5, 65);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting: Solar Sun directional beam + deep space ambient
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 3.8);
    sunLight.position.set(120, 40, 80);
    scene.add(sunLight);

    // Earthshine / Secondary galactic bounce
    const earthGlowLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    earthGlowLight.position.set(-100, -20, -50);
    scene.add(earthGlowLight);

    const ambientLight = new THREE.AmbientLight(0x0c152b, 0.35);
    scene.add(ambientLight);

    // 4. Multi-Layer Deep Space Starfield
    const starCount = 2400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xa5f3fc), // Cyan / Blue giant
      new THREE.Color(0xfef08a), // Yellow dwarf
      new THREE.Color(0xfecdd3), // Red giant
      new THREE.Color(0x93c5fd), // Pale blue
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 250 + Math.random() * 650;
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
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: intensity === 'ambient' ? 0.45 : 0.85,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Procedural High-Fidelity Celestial Moon
    const moonGroup = new THREE.Group();

    // Generate Procedural Cratered Texture on Canvas
    const createProceduralMoonCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Dark basalt lunar mare base
      ctx.fillStyle = '#1c2331';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Regolith highlands noise
      for (let i = 0; i < 45000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2.2 + 0.5;
        const brightness = Math.floor(Math.random() * 110 + 60);
        ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 10})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lunar Maria (dark basaltic plains: Oceanus Procellarum, Mare Tranquillitatis, Mare Imbrium)
      const maria = [
        { x: 300, y: 220, rx: 140, ry: 90 },
        { x: 480, y: 190, rx: 110, ry: 80 },
        { x: 650, y: 260, rx: 90, ry: 70 },
        { x: 220, y: 340, rx: 80, ry: 60 },
        { x: 780, y: 210, rx: 130, ry: 85 },
      ];

      maria.forEach((m) => {
        const grad = ctx.createRadialGradient(m.x, m.y, 10, m.x, m.y, m.rx);
        grad.addColorStop(0, 'rgba(16, 22, 34, 0.85)');
        grad.addColorStop(0.6, 'rgba(25, 33, 48, 0.7)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distinct Impact Craters with bright ejecta rays (Tycho, Copernicus, Kepler)
      const prominentCraters = [
        { x: 380, y: 360, r: 22, rays: 16 }, // Tycho
        { x: 290, y: 240, r: 18, rays: 12 }, // Copernicus
        { x: 220, y: 230, r: 14, rays: 8 },  // Kepler
        { x: 520, y: 160, r: 15, rays: 10 },
        { x: 670, y: 320, r: 20, rays: 14 },
      ];

      prominentCraters.forEach((c) => {
        // Ejecta rays
        ctx.strokeStyle = 'rgba(210, 230, 255, 0.25)';
        ctx.lineWidth = 1.2;
        for (let a = 0; a < c.rays; a++) {
          const angle = (a / c.rays) * Math.PI * 2;
          const len = c.r * (3 + Math.random() * 4);
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + Math.cos(angle) * len, c.y + Math.sin(angle) * len);
          ctx.stroke();
        }

        // Crater Rim
        ctx.fillStyle = 'rgba(230, 240, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();

        // Crater Floor Shadow
        ctx.fillStyle = '#0a0e17';
        ctx.beginPath();
        ctx.arc(c.x + 2, c.y + 1, c.r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Central Peak
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x + 2, c.y + 1, c.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      });

      return canvas;
    };

    const moonCanvas = createProceduralMoonCanvas();
    const moonTexture = moonCanvas ? new THREE.CanvasTexture(moonCanvas) : null;
    if (moonTexture) {
      moonTexture.wrapS = THREE.RepeatWrapping;
      moonTexture.wrapT = THREE.ClampToEdgeWrapping;
    }

    const moonRadius = intensity === 'ambient' ? 14 : 17;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.92,
      metalness: 0.08,
      bumpMap: moonTexture,
      bumpScale: 0.65,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Subtle Lunar Atmosphere / Limb Exosphere Glow
    const glowGeo = new THREE.SphereGeometry(moonRadius * 1.025, 48, 48);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x38bdf8) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.65 - dot(vNormal, vNormel), 2.2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor, intensity * 0.45);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const moonGlow = new THREE.Mesh(glowGeo, glowMat);
    moonGroup.add(moonGlow);

    // Initial Moon Placement
    moonGroup.position.set(intensity === 'ambient' ? 22 : 18, -4, -10);
    scene.add(moonGroup);

    // 6. Distant Earth in the Deep Celestial Void
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(7.5, 36, 36);

    // Procedural Earth Texture
    const createEarthCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Deep Ocean Blue
      ctx.fillStyle = '#0f387a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Continents (Green/Brown)
      ctx.fillStyle = '#1e5f38';
      const continents = [
        { x: 120, y: 90, r: 45 },
        { x: 150, y: 150, r: 35 },
        { x: 260, y: 80, r: 50 },
        { x: 320, y: 110, r: 65 },
        { x: 380, y: 180, r: 40 },
        { x: 420, y: 80, r: 35 },
      ];
      continents.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Swirling White Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let i = 0; i < 25; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 35 + Math.random() * 40, 8 + Math.random() * 12, Math.random() * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    const earthCanvas = createEarthCanvas();
    const earthTexture = earthCanvas ? new THREE.CanvasTexture(earthCanvas) : null;
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x051d42,
      emissiveIntensity: 0.25,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth Atmospheric Haze
    const earthHaloGeo = new THREE.SphereGeometry(7.85, 36, 36);
    const earthHaloMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const earthHalo = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthGroup.add(earthHalo);

    earthGroup.position.set(-65, 28, -90);
    scene.add(earthGroup);

    // 7. Drifting Asteroids Belt
    const asteroidCount = 32;
    const asteroidMeshes: THREE.Mesh[] = [];
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.95,
      metalness: 0.15,
      flatShading: true,
    });

    for (let i = 0; i < asteroidCount; i++) {
      const radius = 0.5 + Math.random() * 1.6;
      const detail = Math.random() > 0.5 ? 1 : 0;
      const rockGeo = new THREE.DodecahedronGeometry(radius, detail);

      // Deform vertices for jagged natural asteroid morphology
      const posAttr = rockGeo.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const vx = posAttr.getX(v) * (0.8 + Math.random() * 0.4);
        const vy = posAttr.getY(v) * (0.8 + Math.random() * 0.4);
        const vz = posAttr.getZ(v) * (0.8 + Math.random() * 0.4);
        posAttr.setXYZ(v, vx, vy, vz);
      }
      rockGeo.computeVertexNormals();

      const rock = new THREE.Mesh(rockGeo, asteroidMat);
      const angle = (i / asteroidCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 45 + Math.random() * 45;
      rock.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 35,
        Math.sin(angle) * dist - 20
      );

      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.015,
        rotSpeedY: (Math.random() - 0.5) * 0.015,
        rotSpeedZ: (Math.random() - 0.5) * 0.015,
        orbitSpeed: 0.0003 + Math.random() * 0.0005,
        orbitAngle: angle,
        orbitDist: dist,
      };

      scene.add(rock);
      asteroidMeshes.push(rock);
    }

    // 8. Passing Dynamic Comets / Shooting Stars System
    interface Comet {
      mesh: THREE.Line;
      headMesh: THREE.Mesh;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      active: boolean;
    }

    const comets: Comet[] = [];
    const cometHeadGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const cometHeadMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

    for (let c = 0; c < 3; c++) {
      const tailPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-12, -4, -6)];
      const tailGeo = new THREE.BufferGeometry().setFromPoints(tailPoints);
      const tailMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.7,
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
        headMesh: head,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 180,
        active: false,
      });
    }

    const spawnComet = (comet: Comet) => {
      comet.active = true;
      comet.life = 0;
      comet.maxLife = 120 + Math.random() * 90;

      // Spawn high left/right in background
      const startX = (Math.random() - 0.5) * 140;
      const startY = 40 + Math.random() * 30;
      const startZ = -40 - Math.random() * 60;
      comet.pos.set(startX, startY, startZ);

      // Trajectory vector
      const speed = 0.8 + Math.random() * 0.6;
      comet.vel.set(
        (Math.random() > 0.5 ? -1 : 1) * speed * 1.2,
        -speed * 0.7,
        (Math.random() - 0.5) * speed * 0.5
      );

      comet.mesh.visible = true;
      comet.headMesh.visible = true;
    };

    // 9. Interactive Moon Drag & Scroll Spin Physics
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

      moonGroup.rotation.y += angularVelocity.y;
      moonGroup.rotation.x += angularVelocity.x;

      previousMousePosition = { x: e.clientX, y: e.clientY };
      setMoonRotationInfo({
        yaw: Math.round(((moonGroup.rotation.y * 180) / Math.PI) % 360),
        pitch: Math.round(((moonGroup.rotation.x * 180) / Math.PI) % 360),
      });
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 800);
    };

    // Scroll Wheel Spin & Zoom
    const onWheel = (e: WheelEvent) => {
      if (!interactive) return;
      angularVelocity.y += e.deltaY * 0.00015;
      angularVelocity.x += e.deltaX * 0.00015;
      setMoonRotationInfo({
        yaw: Math.round(((moonGroup.rotation.y * 180) / Math.PI) % 360),
        pitch: Math.round(((moonGroup.rotation.x * 180) / Math.PI) % 360),
      });
    };

    // Touch Support for Mobile / Tablet Drag
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

      moonGroup.rotation.y += angularVelocity.y;
      moonGroup.rotation.x += angularVelocity.x;

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 800);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: true });
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 10. Main Celestial Animation Loop
    let clock = 0;
    let nextCometSpawn = 80;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.005;

      // Inertial Moon rotation dampening
      if (!isDragging) {
        moonGroup.rotation.y += angularVelocity.y;
        moonGroup.rotation.x += angularVelocity.x;
        angularVelocity.x *= friction;
        angularVelocity.y = angularVelocity.y * friction + 0.0006 * (1 - friction); // gentle natural spin floor
      }

      // Earth slow orbital rotation
      earthGroup.rotation.y += 0.0015;

      // Starfield subtle cosmic parallax drift
      starField.rotation.y = clock * 0.012;
      starField.rotation.x = Math.sin(clock * 0.008) * 0.02;

      // Asteroids tumbling & orbiting
      asteroidMeshes.forEach((rock) => {
        rock.rotation.x += rock.userData.rotSpeedX;
        rock.rotation.y += rock.userData.rotSpeedY;
        rock.rotation.z += rock.userData.rotSpeedZ;

        rock.userData.orbitAngle += rock.userData.orbitSpeed;
        rock.position.x = Math.cos(rock.userData.orbitAngle) * rock.userData.orbitDist;
        rock.position.z = Math.sin(rock.userData.orbitAngle) * rock.userData.orbitDist - 20;
      });

      // Comets update & spawn timer
      nextCometSpawn--;
      if (nextCometSpawn <= 0) {
        const inactiveComet = comets.find((c) => !c.active);
        if (inactiveComet) {
          spawnComet(inactiveComet);
        }
        nextCometSpawn = 220 + Math.floor(Math.random() * 260);
      }

      comets.forEach((comet) => {
        if (!comet.active) return;
        comet.life++;
        comet.pos.add(comet.vel);

        // Update head position
        comet.headMesh.position.copy(comet.pos);

        // Update tail geometry
        const tailLength = 16;
        const tailEnd = comet.pos.clone().sub(comet.vel.clone().normalize().multiplyScalar(tailLength));
        const posArr = new Float32Array([
          comet.pos.x, comet.pos.y, comet.pos.z,
          tailEnd.x, tailEnd.y, tailEnd.z,
        ]);
        comet.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

        // Fade out near end of life
        const progress = comet.life / comet.maxLife;
        (comet.mesh.material as THREE.LineBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.75;

        if (comet.life >= comet.maxLife) {
          comet.active = false;
          comet.mesh.visible = false;
          comet.headMesh.visible = false;
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
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animId);
      renderer.dispose();
      moonGeo.dispose();
      (moonMat as THREE.Material).dispose();
      container.innerHTML = '';
    };
  }, [interactive, intensity]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto select-none z-0">
      {/* 3D Celestial Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Interactive HUD Hint Badge */}
      {showControlsHint && (
        <div className="absolute top-20 right-6 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-300 font-mono text-[11px] shadow-lg animate-fadeIn">
          <Orbit className={`w-3.5 h-3.5 text-cyan-400 ${isInteracting ? 'animate-spin' : ''}`} />
          <span>Interactive Moon: <strong className="text-white">Drag or Scroll to spin</strong></span>
          <span className="text-gray-500 text-[10px] ml-1">
            [{moonRotationInfo.yaw}°, {moonRotationInfo.pitch}°]
          </span>
        </div>
      )}
    </div>
  );
};
