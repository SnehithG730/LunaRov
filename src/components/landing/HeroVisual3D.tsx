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

    // 8. 3D Rover Model perched on a ridge
    const roverGroup = new THREE.Group();

    // Chassis body
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.1, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdde6ed,
      metalness: 0.5,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    body.receiveShadow = true;
    roverGroup.add(body);

    // Solar Panel Deck
    const panelGeo = new THREE.BoxGeometry(2.2, 0.08, 2.8);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x091322,
      metalness: 0.85,
      roughness: 0.15,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = 1.6;
    roverGroup.add(panel);

    // Sensor Gimbal / Mast
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 2.2, 1.1);
    roverGroup.add(mast);

    const sensorHeadGeo = new THREE.BoxGeometry(0.6, 0.35, 0.45);
    const sensorHeadMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x006688,
      emissiveIntensity: 0.6,
    });
    const sensorHead = new THREE.Mesh(sensorHeadGeo, sensorHeadMat);
    sensorHead.position.set(0, 3.0, 1.1);
    roverGroup.add(sensorHead);

    // Headlight Spotlight Cones
    const headLight = new THREE.SpotLight(0xccf2ff, 4.0, 45, Math.PI / 4.5, 0.5, 1.2);
    headLight.position.set(0, 2.8, 1.2);
    headLight.target.position.set(0, 0, 25);
    roverGroup.add(headLight);
    roverGroup.add(headLight.target);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const wheelOffsets = [
      [-1.4, 0.5, 1.1],
      [1.4, 0.5, 1.1],
      [-1.4, 0.5, -1.1],
      [1.4, 0.5, -1.1],
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      roverGroup.add(wheel);
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
