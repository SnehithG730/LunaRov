'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useMissionStore } from '@/core/simulation/missionStore';
import { Point2D } from '@/types/pathfinding';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Flag,
  Target,
  Plus,
  Minus,
  Eye,
  Compass,
  Info,
} from 'lucide-react';

export type MapInteractionMode =
  | 'INSPECT'
  | 'SET_START'
  | 'SET_TARGET'
  | 'PLACE_OBSTACLE'
  | 'REMOVE_OBSTACLE';

export type CameraViewMode = 'FOLLOW' | 'ORBIT' | 'TOP_DOWN' | 'FREE_PAN';

interface InteractiveLunarMapProps {
  initialMode?: MapInteractionMode;
  onSelectCell?: (point: Point2D) => void;
}

export const InteractiveLunarMap: React.FC<InteractiveLunarMapProps> = ({
  initialMode = 'INSPECT',
  onSelectCell,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store subscriptions
  const terrain = useMissionStore((s) => s.terrain);
  const roverState = useMissionStore((s) => s.roverState);
  const startPoint = useMissionStore((s) => s.startPoint);
  const targetPoint = useMissionStore((s) => s.targetPoint);
  const activePath = useMissionStore((s) => s.activePath);
  const telemetryHistory = useMissionStore((s) => s.telemetryHistory);
  const setStartPoint = useMissionStore((s) => s.setStartPoint);
  const setTargetPoint = useMissionStore((s) => s.setTargetPoint);
  const applyBrushAt = useMissionStore((s) => s.applyBrushAt);
  const setEditorBrush = useMissionStore((s) => s.setEditorBrush);

  // Local interaction state
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>(initialMode);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('ORBIT');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showObstacles, setShowObstacles] = useState<boolean>(true);
  const [showDust] = useState<boolean>(true);
  const [contourMode, setContourMode] = useState<boolean>(false);

  // Hover & Selected Cell state for HUD
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    elevation: number;
    slope: number;
    roughness: number;
    cost: number;
    isObstacle: boolean;
  } | null>(null);

  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
    elevation: number;
    slope: number;
    roughness: number;
    cost: number;
    isObstacle: boolean;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const roverGroupRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const lidarDishRef = useRef<THREE.Mesh | null>(null);
  const plannedPathLineRef = useRef<THREE.Line | null>(null);
  const travelledPathLineRef = useRef<THREE.Line | null>(null);
  const startMarkerRef = useRef<THREE.Group | null>(null);
  const destMarkerRef = useRef<THREE.Group | null>(null);
  const bouldersGroupRef = useRef<THREE.Group | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);
  const cursorReticleRef = useRef<THREE.Mesh | null>(null);
  const hazardMarkersGroupRef = useRef<THREE.Group | null>(null);

  // Camera Orbit & Pan physics state
  const isPointerDownRef = useRef<boolean>(false);
  const pointerButtonRef = useRef<number>(0);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraFocusRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const cameraAnglesRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
    radius: 65,
  });

  // Raycaster for mouse interaction
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseVecRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // 1. Initialize Three.js Scene, Lighting, Camera, and Atmosphere
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040711);
    scene.fog = new THREE.FogExp2(0x040711, 0.005);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 600);
    camera.position.set(45, 40, 55);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- Lunar Lighting ---
    // Harsh, low-angle directional sunlight (creates authentic lunar shadows)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.2);
    sunLight.position.set(120, 60, -90);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 350;
    const shadowBound = 90;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0008;
    scene.add(sunLight);

    // Deep-space starlight ambient fill
    const spaceAmbient = new THREE.AmbientLight(0x182238, 0.55);
    scene.add(spaceAmbient);

    // Earth in the sky
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(6, 32, 32);
    const earthMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth atmosphere glow
    const glowGeo = new THREE.SphereGeometry(6.4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    earthGroup.add(glowMesh);

    earthGroup.position.set(-180, 120, -220);
    scene.add(earthGroup);

    // Starfield background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 800;
      starPositions[i + 1] = Math.random() * 350 + 20;
      starPositions[i + 2] = (Math.random() - 0.5) * 800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Subtle Lunar Dust Particles hovering over the surface
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 400;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 140;
      dustPositions[i + 1] = Math.random() * 8 + 0.5;
      dustPositions[i + 2] = (Math.random() - 0.5) * 140;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.4,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);
    dustParticlesRef.current = dustParticles;

    // Hover Selection Cursor Reticle Box
    const reticleGeo = new THREE.BoxGeometry(2.5, 0.6, 2.5);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.visible = false;
    scene.add(reticleMesh);
    cursorReticleRef.current = reticleMesh;

    // --- Detailed 3D Rover Assembly ---
    const roverGroup = new THREE.Group();

    // Chassis / Body (Aerospace Gold Foil & Composite White)
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.75, 2.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.5,
      roughness: 0.35,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    body.receiveShadow = true;
    roverGroup.add(body);

    // Thermal Insulation Gold Foil Trim
    const foilGeo = new THREE.BoxGeometry(1.82, 0.25, 2.42);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.2,
    });
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.y = 0.4;
    roverGroup.add(foil);

    // Top Solar Array Deck
    const solarDeckGeo = new THREE.BoxGeometry(1.65, 0.06, 2.15);
    const solarDeckMat = new THREE.MeshStandardMaterial({
      color: 0x091428,
      metalness: 0.9,
      roughness: 0.1,
    });
    const solarDeck = new THREE.Mesh(solarDeckGeo, solarDeckMat);
    solarDeck.position.y = 1.06;
    solarDeck.castShadow = true;
    roverGroup.add(solarDeck);

    // Sensor Mast
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 1.55, 0.8);
    roverGroup.add(mast);

    // LiDAR Scanner Head
    const lidarHeadGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16);
    const lidarHeadMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
    });
    const lidarHead = new THREE.Mesh(lidarHeadGeo, lidarHeadMat);
    lidarHead.position.set(0, 2.15, 0.8);
    roverGroup.add(lidarHead);
    lidarDishRef.current = lidarHead;

    // Headlights
    const headLightLeft = new THREE.SpotLight(0xe0f2fe, 4.0, 35, Math.PI / 4.5, 0.35, 1.2);
    headLightLeft.position.set(-0.6, 0.9, 1.2);
    headLightLeft.target.position.set(-0.6, 0, 12);
    roverGroup.add(headLightLeft);
    roverGroup.add(headLightLeft.target);

    const headLightRight = new THREE.SpotLight(0xe0f2fe, 4.0, 35, Math.PI / 4.5, 0.35, 1.2);
    headLightRight.position.set(0.6, 0.9, 1.2);
    headLightRight.target.position.set(0.6, 0, 12);
    roverGroup.add(headLightRight);
    roverGroup.add(headLightRight.target);

    // 4 Articulated Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.8,
    });
    const wheelOffsets = [
      [-1.1, 0.38, 0.85],
      [1.1, 0.38, 0.85],
      [-1.1, 0.38, -0.85],
      [1.1, 0.38, -0.85],
    ];

    wheelsRef.current = [];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      roverGroup.add(wheel);
      wheelsRef.current.push(wheel);
    });

    scene.add(roverGroup);
    roverGroupRef.current = roverGroup;

    // Groups for Markers & Boulders
    const bouldersGroup = new THREE.Group();
    scene.add(bouldersGroup);
    bouldersGroupRef.current = bouldersGroup;

    const hazardMarkersGroup = new THREE.Group();
    scene.add(hazardMarkersGroup);
    hazardMarkersGroupRef.current = hazardMarkersGroup;

    // Resize Handler
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
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // 2. Build / Update 3D Terrain Heightfield & Boulders
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Dispose old terrain mesh
    if (terrainMeshRef.current) {
      scene.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      (terrainMeshRef.current.material as THREE.Material).dispose();
      terrainMeshRef.current = null;
    }

    // Dispose old grid
    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.dispose();
      gridHelperRef.current = null;
    }

    // Clear old boulders
    if (bouldersGroupRef.current) {
      while (bouldersGroupRef.current.children.length > 0) {
        const obj = bouldersGroupRef.current.children[0] as THREE.Mesh;
        bouldersGroupRef.current.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }
    }

    // Clear old hazard markers
    if (hazardMarkersGroupRef.current) {
      while (hazardMarkersGroupRef.current.children.length > 0) {
        const obj = hazardMarkersGroupRef.current.children[0] as THREE.Mesh;
        hazardMarkersGroupRef.current.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }
    }

    const { width, height, resolution, cells, minElevation, maxElevation } = terrain;
    const halfW = (width * resolution) / 2;
    const halfH = (height * resolution) / 2;
    const elevRange = Math.max(1, maxElevation - minElevation);

    // Plane geometry subdivided per grid cell
    const geometry = new THREE.PlaneGeometry(
      width * resolution,
      height * resolution,
      width - 1,
      height - 1
    );
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Shared Boulder geometries for performance
    const boulderGeo1 = new THREE.DodecahedronGeometry(1.2, 1);
    const boulderGeo2 = new THREE.IcosahedronGeometry(0.9, 0);
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = cells[y][x];
        pos.setY(idx, cell.elevation);

        const normElev = (cell.elevation - minElevation) / elevRange;

        // Base lunar gray tones: dark basalt floor to bright highland crest
        let r = 0.12 + normElev * 0.42;
        let g = 0.14 + normElev * 0.44;
        let b = 0.18 + normElev * 0.48;

        // Contour interval highlights
        if (contourMode) {
          const contourInterval = 5.0;
          if (Math.abs(cell.elevation % contourInterval) < 0.35) {
            r += 0.25;
            g += 0.25;
            b += 0.3;
          }
        }

        // Color coding for hazards
        if (cell.isObstacle) {
          // Crimson hazard tint
          r = 0.55;
          g = 0.12;
          b = 0.12;

          // Place 3D Boulder Object
          if (showObstacles && bouldersGroupRef.current) {
            const boulderMesh = new THREE.Mesh(
              (x + y) % 2 === 0 ? boulderGeo1 : boulderGeo2,
              boulderMat
            );
            const bx = x * resolution - halfW;
            const bz = y * resolution - halfH;
            boulderMesh.position.set(bx, cell.elevation + 0.6, bz);
            boulderMesh.rotation.set((x * 17) % 3, (y * 23) % 3, (x * y) % 3);
            boulderMesh.scale.set(
              0.8 + ((x * 7) % 5) * 0.15,
              0.8 + ((y * 11) % 5) * 0.2,
              0.8 + ((x * y) % 5) * 0.15
            );
            boulderMesh.castShadow = true;
            boulderMesh.receiveShadow = true;
            bouldersGroupRef.current.add(boulderMesh);
          }
        } else if (cell.slope >= 22.0) {
          // Dangerous steep slope amber tint
          r = 0.48;
          g = 0.32;
          b = 0.08;
        } else if (cell.roughness > 1.3) {
          // Rough rock debris
          r = 0.25;
          g = 0.28;
          b = 0.35;
        }

        colors[idx * 3] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;

        idx++;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // Add optional 3D navigation grid
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(
        width * resolution,
        width,
        0x06b6d4,
        0x1e293b
      );
      gridHelper.position.y = minElevation - 0.1;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
    }
  }, [terrain, contourMode, showGrid, showObstacles]);

  // 3. Build / Update Start (Green) & Destination (Red) 3D Beacons
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const { width, height, resolution, cells } = terrain;
    const halfW = (width * resolution) / 2;
    const halfH = (height * resolution) / 2;

    // --- Green Start Beacon ---
    if (startMarkerRef.current) {
      scene.remove(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    const startGroup = new THREE.Group();
    const sx = startPoint.x * resolution - halfW;
    const sz = startPoint.y * resolution - halfH;
    const startElev = cells[startPoint.y]?.[startPoint.x]?.elevation ?? 0;
    startGroup.position.set(sx, startElev, sz);

    // Green beacon pin
    const startPinGeo = new THREE.CylinderGeometry(0.4, 0.05, 3.5, 16);
    const startPinMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.9,
    });
    const startPin = new THREE.Mesh(startPinGeo, startPinMat);
    startPin.position.y = 2.0;
    startGroup.add(startPin);

    // Pulsing laser light beam
    const startBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, 40, 8);
    const startBeamMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.45,
    });
    const startBeam = new THREE.Mesh(startBeamGeo, startBeamMat);
    startBeam.position.y = 22;
    startGroup.add(startBeam);

    // Ground radar ring
    const startRingGeo = new THREE.RingGeometry(0.8, 1.4, 32);
    const startRingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const startRing = new THREE.Mesh(startRingGeo, startRingMat);
    startRing.rotation.x = -Math.PI / 2;
    startRing.position.y = 0.1;
    startGroup.add(startRing);

    scene.add(startGroup);
    startMarkerRef.current = startGroup;

    // --- Red Destination Beacon ---
    if (destMarkerRef.current) {
      scene.remove(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    const destGroup = new THREE.Group();
    const tx = targetPoint.x * resolution - halfW;
    const tz = targetPoint.y * resolution - halfH;
    const destElev = cells[targetPoint.y]?.[targetPoint.x]?.elevation ?? 0;
    destGroup.position.set(tx, destElev, tz);

    // Red target diamond head
    const destHeadGeo = new THREE.OctahedronGeometry(1.0);
    const destHeadMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.9,
    });
    const destHead = new THREE.Mesh(destHeadGeo, destHeadMat);
    destHead.position.y = 3.2;
    destGroup.add(destHead);

    // Red vertical laser beam
    const destBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, 45, 8);
    const destBeamMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.5,
    });
    const destBeam = new THREE.Mesh(destBeamGeo, destBeamMat);
    destBeam.position.y = 24;
    destGroup.add(destBeam);

    // Concentric target rings on ground
    const destRingGeo = new THREE.RingGeometry(1.2, 1.8, 32);
    const destRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const destRing = new THREE.Mesh(destRingGeo, destRingMat);
    destRing.rotation.x = -Math.PI / 2;
    destRing.position.y = 0.1;
    destGroup.add(destRing);

    scene.add(destGroup);
    destMarkerRef.current = destGroup;
  }, [terrain, startPoint, targetPoint]);

  // 4. Build / Update Planned Path & Travelled Path Trajectory Lines
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const { resolution, cells, width, height } = terrain;
    const halfW = (width * resolution) / 2;
    const halfH = (height * resolution) / 2;

    // --- Planned Path (Bright Cyan Technical Line) ---
    if (plannedPathLineRef.current) {
      scene.remove(plannedPathLineRef.current);
      plannedPathLineRef.current.geometry.dispose();
      (plannedPathLineRef.current.material as THREE.Material).dispose();
      plannedPathLineRef.current = null;
    }

    if (activePath.length >= 2) {
      const points: THREE.Vector3[] = [];
      activePath.forEach((pt) => {
        const px = pt.x * resolution - halfW;
        const pz = pt.y * resolution - halfH;
        const py = (cells[pt.y]?.[pt.x]?.elevation ?? 0) + 0.35;
        points.push(new THREE.Vector3(px, py, pz));
      });

      // Smooth curve interpolation
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.15);
      const smoothPoints = curve.getPoints(Math.max(50, points.length * 3));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(smoothPoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        linewidth: 3,
      });
      const plannedLine = new THREE.Line(lineGeo, lineMat);
      scene.add(plannedLine);
      plannedPathLineRef.current = plannedLine;
    }

    // --- Travelled Path (Secondary Amber Trail from Telemetry) ---
    if (travelledPathLineRef.current) {
      scene.remove(travelledPathLineRef.current);
      travelledPathLineRef.current.geometry.dispose();
      (travelledPathLineRef.current.material as THREE.Material).dispose();
      travelledPathLineRef.current = null;
    }

    if (telemetryHistory.length >= 2) {
      const travelledPoints: THREE.Vector3[] = [];
      telemetryHistory.forEach((t) => {
        const tx = t.x - halfW;
        const tz = t.y - halfH;
        const ty = t.elevation + 0.25;
        travelledPoints.push(new THREE.Vector3(tx, ty, tz));
      });

      const trailGeo = new THREE.BufferGeometry().setFromPoints(travelledPoints);
      const trailMat = new THREE.LineBasicMaterial({
        color: 0xf59e0b,
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      scene.add(trailLine);
      travelledPathLineRef.current = trailLine;
    }
  }, [activePath, telemetryHistory, terrain]);

  // 5. High-Frequency Animation & Camera Tracking Loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const rover = roverGroupRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const dust = dustParticlesRef.current;
      const destHead = destMarkerRef.current;

      if (!rover || !camera || !renderer || !scene) return;

      const { resolution, cells, width, height } = terrain;
      const halfW = (width * resolution) / 2;
      const halfH = (height * resolution) / 2;

      // Position rover in world coordinates
      const rx = roverState.x * resolution - halfW;
      const rz = roverState.y * resolution - halfH;
      const cy = Math.max(0, Math.min(height - 1, Math.round(roverState.y)));
      const cx = Math.max(0, Math.min(width - 1, Math.round(roverState.x)));
      const rElevation = cells[cy]?.[cx]?.elevation ?? 0;

      rover.position.set(rx, rElevation, rz);
      rover.rotation.y = -roverState.heading + Math.PI / 2;
      rover.rotation.x = (roverState.pitch * Math.PI) / 180;
      rover.rotation.z = -(roverState.roll * Math.PI) / 180;

      // Rotate wheels with speed
      if (roverState.velocity > 0.01) {
        wheelsRef.current.forEach((wheel) => {
          wheel.rotation.x += roverState.velocity * 0.12;
        });
      }

      // Rotate LiDAR dish head
      if (lidarDishRef.current) {
        lidarDishRef.current.rotation.y += 0.06;
      }

      // Subtle float/rotation on destination diamond
      if (destHead) {
        destHead.rotation.y += 0.02;
      }

      // Dust particles gentle drift
      if (dust && showDust) {
        dust.rotation.y += 0.0008;
      }

      // Camera Tracking Modes
      if (cameraMode === 'FOLLOW') {
        const offsetDist = 20;
        const offsetHeight = 9;
        const camX = rx - Math.sin(rover.rotation.y) * offsetDist;
        const camZ = rz - Math.cos(rover.rotation.y) * offsetDist;
        const camY = rElevation + offsetHeight;

        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
        camera.lookAt(rx, rElevation + 1.2, rz);
      } else if (cameraMode === 'TOP_DOWN') {
        camera.position.lerp(new THREE.Vector3(rx, 75, rz + 0.1), 0.08);
        camera.lookAt(rx, rElevation, rz);
      } else if (cameraMode === 'ORBIT') {
        const { theta, phi, radius } = cameraAnglesRef.current;
        const ox = rx + radius * Math.sin(phi) * Math.sin(theta);
        const oy = rElevation + radius * Math.cos(phi);
        const oz = rz + radius * Math.sin(phi) * Math.cos(theta);

        camera.position.lerp(new THREE.Vector3(ox, oy, oz), 0.1);
        camera.lookAt(rx, rElevation + 1.2, rz);
      } else if (cameraMode === 'FREE_PAN') {
        const { theta, phi, radius } = cameraAnglesRef.current;
        const focus = cameraFocusRef.current;
        const px = focus.x + radius * Math.sin(phi) * Math.sin(theta);
        const py = focus.y + radius * Math.cos(phi);
        const pz = focus.z + radius * Math.sin(phi) * Math.cos(theta);

        camera.position.lerp(new THREE.Vector3(px, py, pz), 0.12);
        camera.lookAt(focus.x, focus.y, focus.z);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [terrain, roverState, cameraMode, showDust]);

  // 6. Raycasting & Grid Cell Intersection Calculation (Universal for Mouse & Touch)
  const getIntersectedGridCellFromCoords = (clientX: number, clientY: number): Point2D | null => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const terrainMesh = terrainMeshRef.current;
    if (!container || !camera || !terrainMesh) return null;

    const rect = container.getBoundingClientRect();
    const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

    mouseVecRef.current.set(mouseX, mouseY);
    raycasterRef.current.setFromCamera(mouseVecRef.current, camera);

    const intersects = raycasterRef.current.intersectObject(terrainMesh);
    if (intersects.length > 0) {
      const hit = intersects[0].point;
      const { resolution, width, height } = terrain;
      const halfW = (width * resolution) / 2;
      const halfH = (height * resolution) / 2;

      const gx = Math.floor((hit.x + halfW + resolution / 2) / resolution);
      const gy = Math.floor((hit.z + halfH + resolution / 2) / resolution);

      if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
        return { x: gx, y: gy };
      }
    }
    return null;
  };

  const getIntersectedGridCell = (e: React.MouseEvent): Point2D | null => {
    return getIntersectedGridCellFromCoords(e.clientX, e.clientY);
  };

  // Pointer Interaction Handlers (Orbit, Pan, Zoom, Reticle)
  const handlePointerDown = (e: React.MouseEvent) => {
    isPointerDownRef.current = true;
    pointerButtonRef.current = e.button;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    // 1. Update Hover HUD and Reticle
    const cellCoord = getIntersectedGridCell(e);
    if (cellCoord) {
      const cell = terrain.cells[cellCoord.y]?.[cellCoord.x];
      if (cell) {
        setHoveredCell({
          x: cellCoord.x,
          y: cellCoord.y,
          elevation: cell.elevation,
          slope: cell.slope,
          roughness: cell.roughness,
          cost: cell.cost,
          isObstacle: cell.isObstacle,
        });

        // Position 3D Reticle
        if (cursorReticleRef.current) {
          const halfW = (terrain.width * terrain.resolution) / 2;
          const halfH = (terrain.height * terrain.resolution) / 2;
          const rx = cellCoord.x * terrain.resolution - halfW;
          const rz = cellCoord.y * terrain.resolution - halfH;
          cursorReticleRef.current.position.set(rx, cell.elevation + 0.3, rz);
          cursorReticleRef.current.visible = true;
        }
      }
    } else {
      if (cursorReticleRef.current) cursorReticleRef.current.visible = false;
    }

    // 2. Camera Drag Handling
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    // Right-Click (Button 2) or Shift + Left-Click = Pan Focus Point
    if (pointerButtonRef.current === 2 || e.shiftKey) {
      setCameraMode('FREE_PAN');
      const panSpeed = 0.08 * (cameraAnglesRef.current.radius / 50);
      const theta = cameraAnglesRef.current.theta;
      const forwardX = -Math.sin(theta);
      const forwardZ = -Math.cos(theta);
      const rightX = Math.cos(theta);
      const rightZ = -Math.sin(theta);

      cameraFocusRef.current.x += (rightX * -dx + forwardX * dy) * panSpeed;
      cameraFocusRef.current.z += (rightZ * -dx + forwardZ * dy) * panSpeed;
    } else if (pointerButtonRef.current === 0) {
      // Left-Click = Orbit Camera Angles
      if (cameraMode !== 'FREE_PAN' && cameraMode !== 'ORBIT') {
        setCameraMode('ORBIT');
      }
      cameraAnglesRef.current.theta -= dx * 0.009;
      cameraAnglesRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraAnglesRef.current.phi - dy * 0.009)
      );
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const coord = getIntersectedGridCell(e);
    if (!coord) return;

    const cell = terrain.cells[coord.y]?.[coord.x];
    if (cell) {
      setSelectedCell({
        x: coord.x,
        y: coord.y,
        elevation: cell.elevation,
        slope: cell.slope,
        roughness: cell.roughness,
        cost: cell.cost,
        isObstacle: cell.isObstacle,
      });
    }

    if (onSelectCell) {
      onSelectCell(coord);
    }

    // Handle Active Tool Action
    if (interactionMode === 'SET_START') {
      setStartPoint(coord);
    } else if (interactionMode === 'SET_TARGET') {
      setTargetPoint(coord);
    } else if (interactionMode === 'PLACE_OBSTACLE') {
      setEditorBrush('BOULDER');
      applyBrushAt(coord.x, coord.y);
    } else if (interactionMode === 'REMOVE_OBSTACLE') {
      setEditorBrush('CLEAR');
      applyBrushAt(coord.x, coord.y);
    }
  };

  // --- Multi-Touch Gestures for Touch Devices (Orbit, Pinch Zoom, Pan, Tap) ---
  const touchStateRef = useRef<{
    touches: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
    startPinchDist: number;
    startRadius: number;
  }>({
    touches: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    startPinchDist: 0,
    startRadius: 65,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        touches: 1,
        startX: t.clientX,
        startY: t.clientY,
        currentX: t.clientX,
        currentY: t.clientY,
        startTime: Date.now(),
        startPinchDist: 0,
        startRadius: cameraAnglesRef.current.radius,
      };

      // Hover feedback
      const coord = getIntersectedGridCellFromCoords(t.clientX, t.clientY);
      if (coord) {
        const cell = terrain.cells[coord.y]?.[coord.x];
        if (cell) {
          setHoveredCell({
            x: coord.x,
            y: coord.y,
            elevation: cell.elevation,
            slope: cell.slope,
            roughness: cell.roughness,
            cost: cell.cost,
            isObstacle: cell.isObstacle,
          });
        }
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      touchStateRef.current = {
        touches: 2,
        startX: midX,
        startY: midY,
        currentX: midX,
        currentY: midY,
        startTime: Date.now(),
        startPinchDist: dist,
        startRadius: cameraAnglesRef.current.radius,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStateRef.current.touches === 1) {
      // 1-Finger Drag: Camera Orbit Rotation
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.currentX;
      const dy = t.clientY - touchStateRef.current.currentY;
      touchStateRef.current.currentX = t.clientX;
      touchStateRef.current.currentY = t.clientY;

      if (cameraMode !== 'FREE_PAN' && cameraMode !== 'ORBIT') {
        setCameraMode('ORBIT');
      }
      cameraAnglesRef.current.theta -= dx * 0.009;
      cameraAnglesRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraAnglesRef.current.phi - dy * 0.009)
      );
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      // Pinch to Zoom
      if (touchStateRef.current.startPinchDist > 0) {
        const pinchDelta = touchStateRef.current.startPinchDist - dist;
        cameraAnglesRef.current.radius = Math.max(
          8,
          Math.min(140, touchStateRef.current.startRadius + pinchDelta * 0.15)
        );
      }

      // 2-Finger Drag to Pan
      const dx = midX - touchStateRef.current.currentX;
      const dy = midY - touchStateRef.current.currentY;
      touchStateRef.current.currentX = midX;
      touchStateRef.current.currentY = midY;

      setCameraMode('FREE_PAN');
      const panSpeed = 0.08 * (cameraAnglesRef.current.radius / 50);
      const theta = cameraAnglesRef.current.theta;
      const forwardX = -Math.sin(theta);
      const forwardZ = -Math.cos(theta);
      const rightX = Math.cos(theta);
      const rightZ = -Math.sin(theta);

      cameraFocusRef.current.x += (rightX * -dx + forwardX * dy) * panSpeed;
      cameraFocusRef.current.z += (rightZ * -dx + forwardZ * dy) * panSpeed;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Tap detection: single touch, moved less than 8px, lasted less than 300ms
    const isQuickTap =
      touchStateRef.current.touches === 1 &&
      Date.now() - touchStateRef.current.startTime < 300 &&
      Math.hypot(
        touchStateRef.current.currentX - touchStateRef.current.startX,
        touchStateRef.current.currentY - touchStateRef.current.startY
      ) < 8;

    if (isQuickTap && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const coord = getIntersectedGridCellFromCoords(t.clientX, t.clientY);
      if (coord) {
        const cell = terrain.cells[coord.y]?.[coord.x];
        if (cell) {
          setSelectedCell({
            x: coord.x,
            y: coord.y,
            elevation: cell.elevation,
            slope: cell.slope,
            roughness: cell.roughness,
            cost: cell.cost,
            isObstacle: cell.isObstacle,
          });
        }
        if (onSelectCell) onSelectCell(coord);

        if (interactionMode === 'SET_START') {
          setStartPoint(coord);
        } else if (interactionMode === 'SET_TARGET') {
          setTargetPoint(coord);
        } else if (interactionMode === 'PLACE_OBSTACLE') {
          setEditorBrush('BOULDER');
          applyBrushAt(coord.x, coord.y);
        } else if (interactionMode === 'REMOVE_OBSTACLE') {
          setEditorBrush('CLEAR');
          applyBrushAt(coord.x, coord.y);
        }
      }
    }
    touchStateRef.current.touches = 0;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    cameraAnglesRef.current.radius = Math.max(
      8,
      Math.min(140, cameraAnglesRef.current.radius + e.deltaY * 0.06)
    );
  };

  // Zoom Button Controls
  const handleZoomIn = () => {
    cameraAnglesRef.current.radius = Math.max(8, cameraAnglesRef.current.radius - 10);
  };

  const handleZoomOut = () => {
    cameraAnglesRef.current.radius = Math.min(140, cameraAnglesRef.current.radius + 10);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    setCameraMode('ORBIT');
    cameraAnglesRef.current = {
      theta: Math.PI / 4,
      phi: Math.PI / 3.2,
      radius: 65,
    };
    cameraFocusRef.current.set(0, 0, 0);
  };

  // Active inspector cell data (selected or hovered)
  const activeInspector = selectedCell || hoveredCell;

  const getTerrainDescriptor = (cell: { isObstacle: boolean; slope: number; roughness: number; elevation: number }) => {
    if (cell.isObstacle) return 'Hazardous Boulder Field';
    if (cell.slope >= 22) return 'Steep Massif Ridge';
    if (cell.slope >= 12) return 'Undulating Regolith Slope';
    if (cell.elevation < -10) return 'Deep Impact Crater Floor';
    return 'Basaltic Mare Plain';
  };

  return (
    <div className="relative w-full h-full min-h-[440px] bg-[#040711] overflow-hidden rounded-xl border border-slate-800/90 shadow-2xl flex flex-col select-none">
      {/* 1. Main Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 flex-wrap gap-2 pointer-events-none">
        {/* Left: Interaction Mode Tools */}
        <div className="flex items-center gap-1.5 bg-[#080d1a]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl pointer-events-auto">
          <button
            onClick={() => setInteractionMode('INSPECT')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer border ${
              interactionMode === 'INSPECT'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Inspect Coordinates & Telemetry"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>INSPECT</span>
          </button>

          <button
            onClick={() => setInteractionMode('SET_START')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer border ${
              interactionMode === 'SET_START'
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.25)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Place Green Starting Beacon"
          >
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span>START</span>
          </button>

          <button
            onClick={() => setInteractionMode('SET_TARGET')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer border ${
              interactionMode === 'SET_TARGET'
                ? 'bg-rose-500/25 text-rose-300 border-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Place Red Destination Target"
          >
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>DESTINATION</span>
          </button>

          <button
            onClick={() => setInteractionMode('PLACE_OBSTACLE')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer border ${
              interactionMode === 'PLACE_OBSTACLE'
                ? 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Place 3D Boulder Hazard"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>OBSTACLE</span>
          </button>

          <button
            onClick={() => setInteractionMode('REMOVE_OBSTACLE')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all cursor-pointer border ${
              interactionMode === 'REMOVE_OBSTACLE'
                ? 'bg-slate-700/50 text-slate-200 border-slate-500'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Remove Obstacle / Clear Hazard"
          >
            <Minus className="w-3 h-3 text-slate-400" />
            <span>CLEAR</span>
          </button>
        </div>

        {/* Right: Camera Modes & Display Toggles */}
        <div className="flex items-center gap-1.5 bg-[#080d1a]/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-800 shadow-xl pointer-events-auto">
          {/* Zoom Buttons */}
          <button
            onClick={handleZoomIn}
            className="p-1 rounded bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1 rounded bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-amber-400 hover:text-amber-300 text-[11px] font-mono border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Reset Camera Framing"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
              showGrid
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle 3D Navigation Grid"
          >
            GRID
          </button>

          {/* Terrain / Contour Mode Toggle */}
          <button
            onClick={() => setContourMode(!contourMode)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
              contourMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Topographic Elevation Contours"
          >
            CONTOURS
          </button>

          {/* Obstacles Visibility Toggle */}
          <button
            onClick={() => setShowObstacles(!showObstacles)}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer ${
              showObstacles
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle 3D Boulders Visibility"
          >
            ROCKS
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Camera Perspective Mode Dropdown */}
          <select
            value={cameraMode}
            onChange={(e) => setCameraMode(e.target.value as CameraViewMode)}
            className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono focus:outline-none cursor-pointer"
          >
            <option value="ORBIT">CAM: ORBIT (360°)</option>
            <option value="FOLLOW">CAM: ROVER FOLLOW</option>
            <option value="TOP_DOWN">CAM: TOP DOWN (90°)</option>
            <option value="FREE_PAN">CAM: FREE PAN</option>
          </select>
        </div>
      </div>

      {/* 2. WebGL 3D Mount Container */}
      <div
        ref={mountRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className="w-full h-full flex-1 cursor-crosshair relative touch-none"
      />

      {/* 3. Compass Rose Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-2 flex items-center gap-2 pointer-events-none z-10 text-[11px] font-mono text-slate-400">
        <Compass className="w-4 h-4 text-amber-400" />
        <span>SECTOR: {terrain.width}x{terrain.height} ({(terrain.width * terrain.resolution).toFixed(0)}m²)</span>
      </div>

      {/* 4. Real-time Coordinates & Cell Inspection HUD (Bottom Right) */}
      {activeInspector && (
        <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 font-mono text-xs shadow-2xl z-20 pointer-events-none w-64 space-y-1.5 border-l-2 border-l-cyan-400">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
            <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> SURFACE TELEMETRY
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
              [{activeInspector.x}, {activeInspector.y}]
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>X:</span>
            <span className="text-slate-200">
              {activeInspector.x} ({((activeInspector.x - terrain.width / 2) * terrain.resolution).toFixed(1)}m)
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Y:</span>
            <span className="text-slate-200">
              {activeInspector.y} ({((activeInspector.y - terrain.height / 2) * terrain.resolution).toFixed(1)}m)
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Elevation:</span>
            <span className="text-cyan-300 font-bold">{activeInspector.elevation.toFixed(2)} m</span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Terrain Type:</span>
            <span className="text-amber-300 text-right truncate max-w-[125px]">
              {getTerrainDescriptor(activeInspector)}
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Movement Cost:</span>
            <span
              className={`font-bold ${
                activeInspector.isObstacle
                  ? 'text-rose-400'
                  : activeInspector.slope >= 22
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {activeInspector.isObstacle
                ? 'IMPASSABLE (∞)'
                : `${activeInspector.cost.toFixed(2)}x (Slope ${activeInspector.slope.toFixed(1)}°)`}
            </span>
          </div>
        </div>
      )}

      {/* 5. Bottom Instructions Hint Bar */}
      <div className="px-3 py-1.5 bg-[#060a14]/90 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold uppercase">Controls:</span>
          <span>Left-Click Drag: Rotate Orbit • Right-Click Drag: Pan Sector • Scroll: Zoom • Left-Click: {interactionMode}</span>
        </div>
        <span className="text-slate-500 hidden md:inline">Renderer: WebGL 2.0 (PCF Soft Shadows)</span>
      </div>
    </div>
  );
};
