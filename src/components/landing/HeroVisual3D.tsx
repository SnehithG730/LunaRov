'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const HeroVisual3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId: number;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 700;

    // 1. Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.009);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 600);
    camera.position.set(0, 16, 42);
    camera.lookAt(0, 4, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting: Dynamic Low-Azimuth Sunlight
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 3.2);
    sunLight.position.set(70, 35, -50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    const d = 50;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x162035, 0.45);
    scene.add(ambientLight);

    // Subtle blue horizon backlight
    const horizonLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    horizonLight.position.set(-60, 20, -100);
    scene.add(horizonLight);

    // 5. Stars Field
    const starCount = 900;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 500;
      starPos[i + 1] = Math.random() * 180 + 10;
      starPos[i + 2] = (Math.random() - 0.5) * 500;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.75, sizeAttenuation: true });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 6. Distant Earth in the deep space horizon
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(6.5, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x0f2e6e,
      emissiveIntensity: 0.3,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earth);

    // Earth atmosphere glow ring
    const atmosGeo = new THREE.SphereGeometry(6.75, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmos);

    earthGroup.position.set(-95, 45, -160);
    scene.add(earthGroup);

    // 7. Procedural Lunar Surface Mesh
    const gridW = 70;
    const gridH = 70;
    const terrainGeo = new THREE.PlaneGeometry(160, 160, gridW - 1, gridH - 1);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Craters on the landing hero terrain
    const heroCraters = [
      { x: -15, z: -10, r: 18, depth: 8, rim: 2.2 },
      { x: 25, z: -25, r: 14, depth: 6, rim: 1.8 },
      { x: -35, z: 20, r: 12, depth: 5, rim: 1.5 },
      { x: 10, z: 15, r: 8, depth: 3, rim: 1.0 },
    ];

    let vIdx = 0;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Base undulating regolith
      let vy =
        Math.sin(vx * 0.04) * Math.cos(vz * 0.04) * 4.5 +
        Math.sin(vx * 0.08 + 1.2) * Math.cos(vz * 0.08) * 2.0;

      // Apply craters
      for (const crater of heroCraters) {
        const dist = Math.hypot(vx - crater.x, vz - crater.z);
        if (dist < crater.r) {
          const t = dist / crater.r;
          vy -= crater.depth * (1.0 - t * t);
        } else if (dist < crater.r * 1.5) {
          const t = (dist - crater.r) / (crater.r * 0.5);
          vy += crater.rim * (1.0 - t) * (1.0 - t);
        }
      }

      pos.setY(i, vy);

      // Regolith monochromatic shading
      const normY = (vy + 8) / 16;
      colors[vIdx * 3] = 0.14 + normY * 0.35;
      colors[vIdx * 3 + 1] = 0.16 + normY * 0.38;
      colors[vIdx * 3 + 2] = 0.2 + normY * 0.45;
      vIdx++;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.12,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // 8. Ultra-Detailed 6-Wheel Rocker-Bogie Lunar Exploration Rover
    const roverGroup = new THREE.Group();

    // Composite Carbon-Titanium Core Chassis
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.65, 2.7);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.65,
      roughness: 0.25,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.85;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    roverGroup.add(chassis);

    // Multi-Layer Insulation (MLI) Thermal Gold Foil Under-Skirt
    const foilGeo = new THREE.BoxGeometry(1.85, 0.35, 2.5);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0xb45309,
      emissiveIntensity: 0.2,
    });
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.y = 0.45;
    foil.castShadow = true;
    roverGroup.add(foil);

    // High-Efficiency Photovoltaic Solar Array Deck
    const solarDeckGeo = new THREE.BoxGeometry(2.15, 0.06, 2.85);
    const solarDeckMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.92,
      roughness: 0.12,
      emissive: 0x0369a1,
      emissiveIntensity: 0.15,
    });
    const solarDeck = new THREE.Mesh(solarDeckGeo, solarDeckMat);
    solarDeck.position.y = 1.2;
    roverGroup.add(solarDeck);

    // Solar Cell Grid Lines
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    for (let g = -1.0; g <= 1.0; g += 0.4) {
      const lineGeo = new THREE.BoxGeometry(0.02, 0.07, 2.8);
      const lineMesh = new THREE.Mesh(lineGeo, gridMat);
      lineMesh.position.set(g, 1.21, 0);
      roverGroup.add(lineMesh);
    }

    // Rear Radioisotope Thermoelectric Generator (RTG)
    const rtgGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.75, 16);
    const rtgMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    });
    const rtg = new THREE.Mesh(rtgGeo, rtgMat);
    rtg.rotation.x = Math.PI / 2;
    rtg.position.set(0, 0.95, -1.55);
    rtg.castShadow = true;
    roverGroup.add(rtg);

    // RTG Heat Radiator Cooling Fins
    const finMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
    for (let f = 0; f < 6; f++) {
      const finGeo = new THREE.BoxGeometry(0.85, 0.03, 0.65);
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.rotation.z = (f * Math.PI) / 6;
      fin.position.set(0, 0.95, -1.55);
      roverGroup.add(fin);
    }

    // Earth-Facing High-Gain Parabolic Antenna Dish
    const antennaStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    const antennaStemMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const antennaStem = new THREE.Mesh(antennaStemGeo, antennaStemMat);
    antennaStem.position.set(0.65, 1.5, -0.75);
    antennaStem.rotation.z = -0.3;
    roverGroup.add(antennaStem);

    const dishGeo = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0.8, 1.85, -0.75);
    dish.rotation.x = -Math.PI / 3;
    dish.rotation.z = 0.4;
    roverGroup.add(dish);

    // Primary Sensor Mast Assembly
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.5, 12);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.25 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(-0.55, 1.95, 0.95);
    mast.castShadow = true;
    roverGroup.add(mast);

    // Pan-Tilt NavCam Stereo Vision Gimbal Head
    const camHeadGeo = new THREE.BoxGeometry(0.48, 0.22, 0.32);
    const camHeadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3,
    });
    const camHead = new THREE.Mesh(camHeadGeo, camHeadMat);
    camHead.position.set(-0.55, 2.7, 0.95);
    camHead.castShadow = true;
    roverGroup.add(camHead);

    // Dual Stereo Optical Lenses
    const lensGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0x0369a1,
      emissiveIntensity: 0.6,
    });
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.rotation.x = Math.PI / 2;
    leftLens.position.set(-0.7, 2.7, 1.12);
    roverGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.rotation.x = Math.PI / 2;
    rightLens.position.set(-0.4, 2.7, 1.12);
    roverGroup.add(rightLens);

    // 360-Degree Pulsing LiDAR Scanner Dome
    const lidarGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.18, 16);
    const lidarMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      metalness: 0.9,
    });
    const lidar = new THREE.Mesh(lidarGeo, lidarMat);
    lidar.position.set(-0.55, 2.9, 0.95);
    roverGroup.add(lidar);

    // Front Lunar Night Navigation Searchlights
    const headLight = new THREE.SpotLight(0xccf2ff, 5.0, 50, Math.PI / 4.5, 0.4, 1.2);
    headLight.position.set(0, 1.2, 1.4);
    headLight.target.position.set(0, 0, 30);
    headLight.castShadow = true;
    roverGroup.add(headLight);
    roverGroup.add(headLight.target);

    // 6-Wheel Rocker-Bogie Articulated Suspension
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 20);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.45,
    });
    const hubCapGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 12);
    const hubCapMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    const rockerArmMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });

    const wheelOffsets = [
      // Left side: Front, Mid, Rear
      [-1.3, 0.42, 1.05],
      [-1.38, 0.42, 0.0],
      [-1.3, 0.42, -1.05],
      // Right side: Front, Mid, Rear
      [1.3, 0.42, 1.05],
      [1.38, 0.42, 0.0],
      [1.3, 0.42, -1.05],
    ];

    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheelAssembly = new THREE.Group();

      const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.castShadow = true;
      wheelMesh.receiveShadow = true;
      wheelAssembly.add(wheelMesh);

      const hubCap = new THREE.Mesh(hubCapGeo, hubCapMat);
      hubCap.rotation.z = Math.PI / 2;
      wheelAssembly.add(hubCap);

      wheelAssembly.position.set(wx, wy, wz);
      roverGroup.add(wheelAssembly);

      // Rocker Struts
      const isLeft = wx < 0;
      const strutGeo = new THREE.BoxGeometry(0.08, 0.08, Math.abs(wz) > 0.1 ? 1.05 : 0.45);
      const strut = new THREE.Mesh(strutGeo, rockerArmMat);
      strut.position.set(isLeft ? -1.15 : 1.15, 0.6, wz * 0.5);
      strut.rotation.x = wz > 0 ? -0.2 : wz < 0 ? 0.2 : 0;
      roverGroup.add(strut);
    });

    // Position rover on scenic ridge
    roverGroup.position.set(4, 3.2, 6);
    roverGroup.rotation.y = -Math.PI / 5;
    roverGroup.rotation.x = 0.08;
    scene.add(roverGroup);

    // 9. Trajectory Laser Path
    const pathPoints = [
      new THREE.Vector3(-25, 0.4, -20),
      new THREE.Vector3(-12, 1.2, -10),
      new THREE.Vector3(-2, 2.0, -2),
      new THREE.Vector3(4, 3.3, 6),
      new THREE.Vector3(12, 2.8, 18),
      new THREE.Vector3(22, 1.5, 30),
    ];
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    scene.add(pathLine);

    // Animation Loop: Restrained orbital camera drift
    let time = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.003;

      // Slow orbital drift
      camera.position.x = Math.sin(time) * 4;
      camera.position.y = 16 + Math.cos(time * 0.7) * 1.5;
      camera.lookAt(0, 3.5, 0);

      // Earth slow rotation
      earthGroup.rotation.y += 0.001;

      // Subtle sunlight oscillation
      sunLight.position.x = 70 + Math.sin(time * 0.5) * 10;
      sunLight.position.z = -50 + Math.cos(time * 0.5) * 10;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      terrainGeo.dispose();
      (terrainMat as THREE.Material).dispose();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
};
