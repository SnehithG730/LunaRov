import { create } from 'zustand';
import { TerrainGrid, TerrainType, ObstacleToggles } from '@/types/terrain';
import { RoverConfig, RoverState, TelemetryPoint } from '@/types/rover';
import { AlgorithmType, Point2D, PathfindingResult } from '@/types/pathfinding';
import { SimulationStatus, MissionEvent, MissionResults, SavedMission } from '@/types/mission';
import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { DijkstraPathfinder } from '@/core/pathfinding/Dijkstra';
import { GreedyBFSPathfinder } from '@/core/pathfinding/GreedyBFS';
import { RoverSimulationEngine } from '@/core/rover/RoverSimulationEngine';
import { SensorScanResult } from '@/core/simulation/CollisionSystem';
import { DEFAULT_ROVER_CONFIG, DEFAULT_GRID_SIZE } from '@/lib/constants';
import { saveMissionToStorage } from '@/lib/storage';

export interface MissionStoreState {
  missionName: string;
  terrain: TerrainGrid;
  roverConfig: RoverConfig;
  roverState: RoverState;
  startPoint: Point2D;
  targetPoint: Point2D;
  selectedAlgorithm: AlgorithmType;
  obstacleToggles: ObstacleToggles;
  pathResult: PathfindingResult | null;
  activePath: Point2D[];
  currentWaypointIndex: number;
  simulationStatus: SimulationStatus;
  playbackSpeed: number; // 1, 2, 5, 10
  telemetryHistory: TelemetryPoint[];
  missionEvents: MissionEvent[];
  missionResults: MissionResults | null;
  manualInput: { throttle: number; steering: number };
  sensorScan: SensorScanResult | null;
  rerouteCount: number;
  activeView: 'SPLIT' | '2D' | '3D';
  editorBrush: 'NONE' | 'ELEVATE' | 'CRATER' | 'BOULDER' | 'CLEAR';

  // Actions
  setMissionName: (name: string) => void;
  setObstacleToggles: (toggles: Partial<ObstacleToggles>) => void;
  setTerrainType: (type: TerrainType, seed?: number) => void;
  regenerateTerrain: (seed?: number) => void;
  setRoverConfig: (config: Partial<RoverConfig>) => void;
  setStartPoint: (p: Point2D) => void;
  setTargetPoint: (p: Point2D) => void;
  setAlgorithm: (algo: AlgorithmType) => void;
  validateMission: () => { valid: boolean; errors: string[] };
  computePath: () => PathfindingResult | null;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stepSimulation: () => void;
  resetSimulation: () => void;
  abortMission: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setActiveView: (view: 'SPLIT' | '2D' | '3D') => void;
  setManualInput: (input: { throttle: number; steering: number }) => void;
  setEditorBrush: (brush: 'NONE' | 'ELEVATE' | 'CRATER' | 'BOULDER' | 'CLEAR') => void;
  applyBrushAt: (x: number, y: number) => void;
  addMissionEvent: (type: MissionEvent['type'], message: string) => void;
  tick: (dtSeconds: number, forceStep?: boolean) => void;
  dismissResults: () => void;
  loadMission: (mission: SavedMission) => void;
}

const defaultObstacleToggles: ObstacleToggles = {
  enableCraters: true,
  enableRocks: true,
  enableSteepSlopes: true,
  enableDangerZones: true,
};

const initialGrid = TerrainGenerator.generate('CRATER_FIELD', { seed: 1042, obstacleToggles: defaultObstacleToggles });
const defaultStart: Point2D = { x: 5, y: 5 };
const defaultTarget: Point2D = { x: DEFAULT_GRID_SIZE - 6, y: DEFAULT_GRID_SIZE - 6 };

const initialRoverState: RoverState = {
  x: defaultStart.x,
  y: defaultStart.y,
  heading: Math.PI / 4,
  velocity: 0,
  batteryRemainingWh: DEFAULT_ROVER_CONFIG.batteryCapacityWh,
  batteryPercentage: 100,
  pitch: 0,
  roll: 0,
  distanceTraveledMeters: 0,
  elapsedTimeSeconds: 0,
  isStuck: false,
  hasCrashed: false,
  goalReached: false,
  mode: 'AUTONOMOUS',
};

export const useMissionStore = create<MissionStoreState>((set, get) => ({
  missionName: 'LunaRov Mission 01',
  terrain: initialGrid,
  roverConfig: { ...DEFAULT_ROVER_CONFIG },
  roverState: { ...initialRoverState },
  startPoint: defaultStart,
  targetPoint: defaultTarget,
  selectedAlgorithm: 'ASTAR',
  obstacleToggles: defaultObstacleToggles,
  pathResult: null,
  activePath: [],
  currentWaypointIndex: 0,
  simulationStatus: 'IDLE',
  playbackSpeed: 1, // 0.5, 1, 2, 5, 10
  telemetryHistory: [],
  missionEvents: [
    {
      id: 'evt-init',
      timestamp: Date.now(),
      simTimeSeconds: 0,
      type: 'INFO',
      message: 'Mission initialized',
    },
  ],
  missionResults: null,
  manualInput: { throttle: 0, steering: 0 },
  sensorScan: null,
  rerouteCount: 0,
  activeView: 'SPLIT',
  editorBrush: 'NONE',

  setMissionName: (name: string) => set({ missionName: name }),

  setObstacleToggles: (toggles: Partial<ObstacleToggles>) => {
    const updated = { ...get().obstacleToggles, ...toggles };
    set({ obstacleToggles: updated });
    const { terrain } = get();
    // Regenerate with updated toggles
    const newGrid = TerrainGenerator.generate(terrain.type, {
      seed: terrain.seed,
      obstacleToggles: updated,
    });
    set({
      terrain: newGrid,
      pathResult: null,
      activePath: [],
      currentWaypointIndex: 0,
      simulationStatus: 'IDLE',
    });
    get().addMissionEvent('INFO', 'Obstacle layers updated and terrain re-rendered.');
  },

  setTerrainType: (type: TerrainType, seed) => {
    const newSeed = seed ?? Math.floor(Math.random() * 100000);
    const newGrid = TerrainGenerator.generate(type, {
      seed: newSeed,
      obstacleToggles: get().obstacleToggles,
    });
    set({
      terrain: newGrid,
      pathResult: null,
      activePath: [],
      currentWaypointIndex: 0,
      simulationStatus: 'IDLE',
      missionResults: null,
    });
    get().addMissionEvent('INFO', `Terrain sector regenerated: ${type} (Seed: ${newSeed})`);
  },

  regenerateTerrain: (seed) => {
    const { terrain, obstacleToggles } = get();
    const newSeed = seed ?? Math.floor(Math.random() * 100000);
    const newGrid = TerrainGenerator.generate(terrain.type, {
      seed: newSeed,
      obstacleToggles,
    });
    set({
      terrain: newGrid,
      pathResult: null,
      activePath: [],
      currentWaypointIndex: 0,
      simulationStatus: 'IDLE',
      missionResults: null,
    });
    get().addMissionEvent('INFO', `Terrain sector randomized (Seed: ${newSeed})`);
  },

  setRoverConfig: (config) => {
    set((state) => ({
      roverConfig: { ...state.roverConfig, ...config },
      roverState: {
        ...state.roverState,
        batteryRemainingWh: config.batteryCapacityWh ?? state.roverState.batteryRemainingWh,
      },
    }));
  },

  setStartPoint: (p) => {
    set((state) => ({
      startPoint: p,
      roverState: {
        ...state.roverState,
        x: p.x,
        y: p.y,
        velocity: 0,
        isStuck: false,
        hasCrashed: false,
        goalReached: false,
      },
      pathResult: null,
      activePath: [],
      currentWaypointIndex: 0,
      simulationStatus: 'IDLE',
    }));
    get().addMissionEvent('INFO', `Start waypoint set to [${p.x}, ${p.y}]`);
  },

  setTargetPoint: (p) => {
    set({ targetPoint: p, pathResult: null, activePath: [], currentWaypointIndex: 0, simulationStatus: 'IDLE' });
    get().addMissionEvent('INFO', `Destination target set to [${p.x}, ${p.y}]`);
  },

  setAlgorithm: (algo) => {
    set({ selectedAlgorithm: algo });
    get().addMissionEvent('INFO', `Swapped pathfinding algorithm: ${algo}`);
    if (get().simulationStatus === 'IDLE' || get().simulationStatus === 'PLANNING') {
      get().computePath();
    }
  },

  validateMission: () => {
    const { terrain, startPoint, targetPoint, roverConfig } = get();
    const errors: string[] = [];

    // Check bounds
    if (startPoint.x < 0 || startPoint.x >= terrain.width || startPoint.y < 0 || startPoint.y >= terrain.height) {
      errors.push(`Start coordinate [${startPoint.x}, ${startPoint.y}] is out of sector bounds.`);
    }
    if (targetPoint.x < 0 || targetPoint.x >= terrain.width || targetPoint.y < 0 || targetPoint.y >= terrain.height) {
      errors.push(`Destination coordinate [${targetPoint.x}, ${targetPoint.y}] is out of sector bounds.`);
    }

    // Check start === target
    if (startPoint.x === targetPoint.x && startPoint.y === targetPoint.y) {
      errors.push('Start position and Destination position cannot be identical.');
    }

    // Check impassable start / target
    if (
      startPoint.x >= 0 &&
      startPoint.x < terrain.width &&
      startPoint.y >= 0 &&
      startPoint.y < terrain.height
    ) {
      const startCell = terrain.cells[startPoint.y][startPoint.x];
      if (startCell.isObstacle || startCell.slope >= 25) {
        errors.push(`Start position [${startPoint.x}, ${startPoint.y}] is located on an impassable hazard (${startCell.slope}° slope / boulder).`);
      }
    }

    if (
      targetPoint.x >= 0 &&
      targetPoint.x < terrain.width &&
      targetPoint.y >= 0 &&
      targetPoint.y < terrain.height
    ) {
      const targetCell = terrain.cells[targetPoint.y][targetPoint.x];
      if (targetCell.isObstacle || targetCell.slope >= 25) {
        errors.push(`Destination position [${targetPoint.x}, ${targetPoint.y}] is located on an impassable hazard (${targetCell.slope}° slope / boulder).`);
      }
    }

    // Check rover config
    if (roverConfig.maxSpeed <= 0 || roverConfig.maxSpeed > 10) {
      errors.push('Rover max speed must be between 0.1 and 10.0 m/s.');
    }
    if (roverConfig.batteryCapacityWh <= 0 || roverConfig.batteryCapacityWh > 5000) {
      errors.push('Battery capacity must be between 50 and 5000 Wh.');
    }
    if (roverConfig.acceleration <= 0 || roverConfig.acceleration > 5) {
      errors.push('Acceleration must be between 0.1 and 5.0 m/s².');
    }
    if (roverConfig.movementEfficiency <= 0 || roverConfig.movementEfficiency > 2) {
      errors.push('Movement efficiency factor must be between 0.1 and 2.0.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  computePath: () => {
    const { terrain, startPoint, targetPoint, selectedAlgorithm } = get();
    set({ simulationStatus: 'CALCULATING' });

    let result: PathfindingResult;

    if (selectedAlgorithm === 'ASTAR') {
      const solver = new AStarPathfinder();
      result = solver.findPath(terrain, startPoint, targetPoint);
    } else if (selectedAlgorithm === 'DIJKSTRA') {
      const solver = new DijkstraPathfinder();
      result = solver.findPath(terrain, startPoint, targetPoint);
    } else if (selectedAlgorithm === 'GREEDY_BFS') {
      const solver = new GreedyBFSPathfinder();
      result = solver.findPath(terrain, startPoint, targetPoint);
    } else {
      // Manual navigation
      result = {
        algorithm: 'MANUAL',
        path: [startPoint, targetPoint],
        exploredNodes: [],
        totalDistance: 0,
        totalDistanceMeters: 0,
        totalMovementCost: 0,
        estimatedEnergyWh: 0,
        nodesEvaluated: 0,
        nodesExploredCount: 0,
        executionTimeMs: 0,
        computeTimeMs: 0,
        success: true,
      };
    }

    if (result.success) {
      set({
        pathResult: result,
        activePath: result.path,
        currentWaypointIndex: 0,
        simulationStatus: 'READY',
      });
      get().addMissionEvent(
        'SUCCESS',
        `Optimal trajectory calculated (${result.algorithm}): ${result.totalDistanceMeters}m, ${result.nodesExploredCount} nodes explored in ${result.computeTimeMs}ms`
      );
    } else {
      set({ pathResult: result, activePath: [], simulationStatus: 'IDLE' });
      get().addMissionEvent('ALERT', `Path planning failure: ${result.failureReason}`);
    }

    return result;
  },

  startSimulation: () => {
    const { pathResult, selectedAlgorithm } = get();
    if (selectedAlgorithm !== 'MANUAL' && (!pathResult || !pathResult.success || pathResult.path.length === 0)) {
      const computed = get().computePath();
      if (!computed || !computed.success) return;
    }

    set({ simulationStatus: 'RUNNING' });
    get().addMissionEvent('INFO', 'Mission simulation initiated.');
  },

  pauseSimulation: () => {
    set({ simulationStatus: 'PAUSED' });
    get().addMissionEvent('INFO', 'Simulation paused by operator.');
  },

  resumeSimulation: () => {
    set({ simulationStatus: 'RUNNING' });
    get().addMissionEvent('INFO', 'Simulation resumed.');
  },

  stepSimulation: () => {
    get().tick(0.1, true);
  },

  resetSimulation: () => {
    const { startPoint, roverConfig } = get();
    set({
      simulationStatus: 'IDLE',
      roverState: {
        ...initialRoverState,
        x: startPoint.x,
        y: startPoint.y,
        previousPosition: { x: startPoint.x, y: startPoint.y },
        batteryRemainingWh: roverConfig.batteryCapacityWh,
        mode: get().selectedAlgorithm === 'MANUAL' ? 'MANUAL' : 'AUTONOMOUS',
        missionStatus: 'IDLE',
      },
      currentWaypointIndex: 0,
      telemetryHistory: [],
      missionResults: null,
      sensorScan: null,
      rerouteCount: 0,
    });
    get().addMissionEvent('INFO', 'Rover reset to starting coords.');
  },

  abortMission: () => {
    set({ simulationStatus: 'ABORTED' });
    get().addMissionEvent('ALERT', 'Mission aborted by operator.');
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setActiveView: (view) => set({ activeView: view }),
  setManualInput: (input) => set({ manualInput: input }),
  setEditorBrush: (brush) => set({ editorBrush: brush }),

  applyBrushAt: (x, y) => {
    const { terrain, editorBrush } = get();
    if (editorBrush === 'NONE' || x < 0 || x >= terrain.width || y < 0 || y >= terrain.height) return;

    // Clone cells
    const newCells = terrain.cells.map((row) => row.map((c) => ({ ...c })));
    const targetCell = newCells[y][x];

    if (editorBrush === 'ELEVATE') {
      targetCell.elevation += 6.0;
    } else if (editorBrush === 'CRATER') {
      // Small crater stamp
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cy = y + dy;
          const cx = x + dx;
          if (cy >= 0 && cy < terrain.height && cx >= 0 && cx < terrain.width) {
            const d = Math.hypot(dx, dy);
            if (d < 2) newCells[cy][cx].elevation -= 5.0 * (1 - d / 2);
            else if (d <= 2.5) newCells[cy][cx].elevation += 2.0;
          }
        }
      }
    } else if (editorBrush === 'BOULDER') {
      targetCell.isObstacle = true;
      targetCell.cost = Infinity;
      targetCell.elevation += 3.5;
    } else if (editorBrush === 'CLEAR') {
      targetCell.isObstacle = false;
      targetCell.cost = 1.0;
      targetCell.elevation = 0;
    }

    // Recalculate local cell slopes
    for (let py = Math.max(0, y - 3); py <= Math.min(terrain.height - 1, y + 3); py++) {
      for (let px = Math.max(0, x - 3); px <= Math.min(terrain.width - 1, x + 3); px++) {
        const c = newCells[py][px];
        const left = px > 0 ? newCells[py][px - 1].elevation : c.elevation;
        const right = px < terrain.width - 1 ? newCells[py][px + 1].elevation : c.elevation;
        const top = py > 0 ? newCells[py - 1][px].elevation : c.elevation;
        const bottom = py < terrain.height - 1 ? newCells[py + 1][px].elevation : c.elevation;
        const dzdx = (right - left) / (2 * terrain.resolution);
        const dzdy = (bottom - top) / (2 * terrain.resolution);
        const slopeDeg = (Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180) / Math.PI;
        c.slope = Number(slopeDeg.toFixed(1));
        if (c.slope >= 25.0) {
          c.isObstacle = true;
          c.cost = Infinity;
        }
      }
    }

    set({ terrain: { ...terrain, cells: newCells } });
    get().addMissionEvent('INFO', `Custom brush [${editorBrush}] applied at [${x}, ${y}]`);
    get().computePath();
  },

  addMissionEvent: (type, message) => {
    const newEvent: MissionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      simTimeSeconds: Number(get().roverState.elapsedTimeSeconds.toFixed(1)),
      type,
      message,
    };
    set((state) => ({ missionEvents: [newEvent, ...state.missionEvents].slice(0, 100) }));
  },

  dismissResults: () => set({ missionResults: null }),

  tick: (dtSeconds, forceStep = false) => {
    const state = get();
    if (
      !forceStep &&
      state.simulationStatus !== 'RUNNING' &&
      state.simulationStatus !== 'REROUTING' &&
      state.simulationStatus !== 'HAZARD_REROUTING'
    ) {
      return;
    }

    const isAutonomous = state.selectedAlgorithm !== 'MANUAL';

    const stepResult = RoverSimulationEngine.step({
      state: state.roverState,
      config: state.roverConfig,
      terrain: state.terrain,
      activePath: state.activePath,
      currentWaypointIndex: state.currentWaypointIndex,
      targetPoint: state.targetPoint,
      dtSeconds,
      manualControls: state.manualInput,
      rerouteCount: state.rerouteCount,
      isAutonomous,
    });

    // Add any newly emitted simulation events
    for (const evt of stepResult.newEvents) {
      state.addMissionEvent(evt.type, evt.message);
    }

    if (stepResult.isFinished) {
      const outcome = stepResult.finishOutcome || (stepResult.simulationStatus === 'COMPLETED' ? 'SUCCESS' : 'OBSTACLE_COLLISION');
      const duration = Number(stepResult.updatedState.elapsedTimeSeconds.toFixed(1));
      const distance = Number(stepResult.updatedState.distanceTraveledMeters.toFixed(1));
      const energyUsed = Number((state.roverConfig.batteryCapacityWh - stepResult.updatedState.batteryRemainingWh).toFixed(1));
      const efficiency = outcome === 'SUCCESS'
        ? Math.max(50, Math.min(100, Math.round(100 - (energyUsed / state.roverConfig.batteryCapacityWh) * 40 - stepResult.rerouteCount * 5)))
        : outcome === 'BATTERY_DEPLETED' ? 25 : 10;

      const results: MissionResults = {
        missionId: `MISS-${Date.now()}`,
        roverName: state.roverConfig.name,
        terrainType: state.terrain.type,
        algorithmUsed: state.selectedAlgorithm,
        durationSeconds: duration,
        distanceTraveledMeters: distance,
        energyConsumedWh: energyUsed,
        remainingBatteryPct: stepResult.updatedState.batteryPercentage,
        averageSpeedMps: Number((distance / Math.max(1, duration)).toFixed(2)),
        maxSlopeEncounteredDeg: Number(
          Math.max(...state.telemetryHistory.map((t) => t.slopeDeg), stepResult.updatedState.pitch, 0)
        ),
        rerouteCount: stepResult.rerouteCount,
        outcome,
        efficiencyScore: efficiency,
        telemetryLog: state.telemetryHistory,
      };

      if (outcome === 'SUCCESS') {
        saveMissionToStorage({
          id: results.missionId,
          name: `Mission to [${state.targetPoint.x}, ${state.targetPoint.y}]`,
          date: new Date().toLocaleDateString(),
          terrainType: state.terrain.type,
          algorithm: state.selectedAlgorithm,
          start: state.startPoint,
          target: state.targetPoint,
          roverConfig: state.roverConfig,
          results,
        });
      }

      set({
        roverState: stepResult.updatedState,
        simulationStatus: stepResult.simulationStatus,
        sensorScan: stepResult.sensorScan,
        rerouteCount: stepResult.rerouteCount,
        activePath: stepResult.activePath,
        currentWaypointIndex: stepResult.nextWaypointIndex,
        missionResults: results,
      });
      return;
    }

    set((s) => ({
      roverState: stepResult.updatedState,
      simulationStatus: stepResult.simulationStatus,
      activePath: stepResult.activePath,
      currentWaypointIndex: stepResult.nextWaypointIndex,
      sensorScan: stepResult.sensorScan,
      rerouteCount: stepResult.rerouteCount,
      telemetryHistory: [...s.telemetryHistory, stepResult.telemetry].slice(-300),
    }));
  },

  loadMission: (mission: SavedMission) => {
    const { obstacleToggles } = get();
    const targetObstacles = mission.obstacleToggles || mission.obstacles || obstacleToggles;
    const newGrid = TerrainGenerator.generate(mission.terrainType, {
      seed: mission.seed ?? 1042,
      obstacleToggles: targetObstacles,
    });

    const start = mission.start || { x: 5, y: 5 };
    const target = mission.target || mission.destination || { x: 54, y: 54 };
    const roverCfg = mission.roverConfig || get().roverConfig;

    set({
      missionName: mission.name,
      terrain: newGrid,
      obstacleToggles: targetObstacles,
      startPoint: start,
      targetPoint: target,
      selectedAlgorithm: mission.algorithm,
      roverConfig: roverCfg,
      roverState: {
        ...initialRoverState,
        x: start.x,
        y: start.y,
        previousPosition: { x: start.x, y: start.y },
        batteryRemainingWh: roverCfg.batteryCapacityWh,
        mode: mission.algorithm === 'MANUAL' ? 'MANUAL' : 'AUTONOMOUS',
        missionStatus: 'IDLE',
      },
      currentWaypointIndex: 0,
      activePath: [],
      pathResult: null,
      simulationStatus: 'IDLE',
      telemetryHistory: mission.results?.telemetryLog || [],
      missionResults: mission.results || null,
      rerouteCount: mission.results?.rerouteCount || 0,
    });

    get().addMissionEvent('INFO', `Loaded mission: "${mission.name}"`);
    get().computePath();
  },
}));
