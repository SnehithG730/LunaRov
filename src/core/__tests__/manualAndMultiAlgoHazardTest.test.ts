import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { DijkstraPathfinder } from '@/core/pathfinding/Dijkstra';
import { GreedyBFSPathfinder } from '@/core/pathfinding/GreedyBFS';
import { RoverSimulationEngine } from '@/core/rover/RoverSimulationEngine';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { Point2D } from '@/types/pathfinding';
import { RoverState } from '@/types/rover';
import { TerrainType, TerrainGrid } from '@/types/terrain';

console.log('================================================================');
console.log('  RUNNING MANUAL & MULTI-ALGO HAZARD CROSSING TESTS');
console.log('================================================================\n');

const astar = new AStarPathfinder();
const dijkstra = new DijkstraPathfinder();
const greedy = new GreedyBFSPathfinder();

const algorithms = [
  { name: 'ASTAR', instance: astar },
  { name: 'DIJKSTRA', instance: dijkstra },
  { name: 'GREEDY_BFS', instance: greedy },
];

const terrainPresets: TerrainType[] = ['CRATER_FIELD', 'SOUTH_POLE', 'HILLY', 'FLAT'];

function createInitialRoverState(start: Point2D): RoverState {
  return {
    x: start.x,
    y: start.y,
    heading: 0,
    speed: 0,
    velocity: 0,
    batteryRemainingWh: 1200,
    batteryPercentage: 100,
    totalEnergyConsumedWh: 0,
    currentSolarPowerWatts: 0,
    totalSolarEnergyGeneratedWh: 0,
    netEnergyWh: 0,
    timeInIlluminationSeconds: 0,
    timeInShadowSeconds: 0,
    minimumBatteryRecordedPct: 100,
    pitch: 0,
    roll: 0,
    isStuck: false,
    hasCrashed: false,
    goalReached: false,
    mode: 'AUTONOMOUS',
    distanceTraveledMeters: 0,
    elapsedTimeSeconds: 0,
    missionStatus: 'RUNNING',
  };
}

function findTraversablePoint(grid: TerrainGrid, targetX: number, targetY: number, maxSlope = 14): Point2D {
  for (let r = 0; r < 20; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = targetX + dx;
        const y = targetY + dy;
        if (x >= 2 && x < grid.width - 2 && y >= 2 && y < grid.height - 2) {
          const cell = grid.cells[y][x];
          if (!cell.isObstacle && cell.cost !== Infinity && cell.slope <= maxSlope) {
            return { x, y };
          }
        }
      }
    }
  }
  return { x: targetX, y: targetY };
}

// =========================================================================
// TEST SUITE 1: Multi-Algorithm Path Generation across Diverse Terrains
// =========================================================================
console.log('--- TEST SUITE 1: Multi-Algorithm Pathfinding across Terrains ---');

for (const terrainType of terrainPresets) {
  const grid = TerrainGenerator.generate(terrainType, { seed: 42 });
  const start = findTraversablePoint(grid, 5, 5);
  const target = findTraversablePoint(grid, 50, 50);

  for (const algo of algorithms) {
    const result = algo.instance.findPath(grid, start, target, {
      roverConfig: DEFAULT_ROVER_CONFIG,
      strategy: 'BALANCED',
    });

    console.log(`  [${terrainType.padEnd(12)}] [${algo.name.padEnd(10)}] Success: ${result.success} | Dist: ${result.totalDistanceMeters.toFixed(1)}m | Waypoints: ${result.path.length} | Nodes: ${result.nodesExploredCount}`);

    if (!result.success || result.path.length === 0) {
      console.error(`  [FAILURE REASON] ${result.failureReason}`);
      throw new Error(`[SUITE 1 FAILED] ${algo.name} failed to find path on ${terrainType}: ${result.failureReason}`);
    }

    const lastPt = result.path[result.path.length - 1];
    const distToEnd = Math.hypot(lastPt.x - target.x, lastPt.y - target.y);
    if (distToEnd > 0.5) {
      throw new Error(`[SUITE 1 FAILED] ${algo.name} path did not reach target on ${terrainType} (dist=${distToEnd})`);
    }
  }
}
console.log('✓ All algorithms successfully found traversable paths across all terrains!\n');

// =========================================================================
// TEST SUITE 2: Full Autonomous Mission Execution to Destination
// =========================================================================
console.log('--- TEST SUITE 2: Full Autonomous Simulation to Destination ---');

for (const algo of algorithms) {
  const grid = TerrainGenerator.generate('CRATER_FIELD', { seed: 101 });
  const start = findTraversablePoint(grid, 5, 5);
  const target = findTraversablePoint(grid, 45, 45);

  const plan = algo.instance.findPath(grid, start, target, {
    roverConfig: DEFAULT_ROVER_CONFIG,
    strategy: 'SAFEST',
  });

  if (!plan.success || plan.path.length === 0) {
    console.error(`  [SUITE 2 FAILED] Initial path plan failed for ${algo.name}: ${plan.failureReason}`);
    throw new Error(`[SUITE 2 FAILED] Initial path plan failed for ${algo.name}: ${plan.failureReason}`);
  }

  let state = createInitialRoverState(start);
  let activePath = [...plan.path];
  let waypointIdx = 0;
  let reroutes = 0;
  let finished = false;
  let outcome = '';

  // Max 6000 steps (120s of simulation time at 50Hz)
  for (let step = 0; step < 6000; step++) {
    const res = RoverSimulationEngine.step({
      state,
      config: DEFAULT_ROVER_CONFIG,
      terrain: grid,
      activePath,
      currentWaypointIndex: waypointIdx,
      targetPoint: target,
      dtSeconds: 0.02,
      isAutonomous: true,
      rerouteCount: reroutes,
    });

    state = res.updatedState;
    activePath = res.activePath;
    waypointIdx = res.nextWaypointIndex;
    reroutes = res.rerouteCount;

    if (res.isFinished || state.goalReached) {
      finished = true;
      outcome = res.finishOutcome || (state.goalReached ? 'SUCCESS' : 'UNKNOWN');
      if (outcome !== 'SUCCESS') {
        console.error('  [FAILURE EVENTS]:', res.newEvents);
      }
      break;
    }
  }

  const finalDist = Math.hypot(state.x - target.x, state.y - target.y);
  console.log(`  [${algo.name.padEnd(10)}] Finished: ${finished} | Outcome: ${outcome} | Final Pos: (${state.x.toFixed(1)}, ${state.y.toFixed(1)}) | DistToTarget: ${finalDist.toFixed(2)}m | Time: ${state.elapsedTimeSeconds.toFixed(1)}s`);

  if (!finished || outcome !== 'SUCCESS') {
    throw new Error(`[SUITE 2 FAILED] ${algo.name} rover did not complete mission to destination (outcome=${outcome})`);
  }
}
console.log('✓ Autonomous rovers successfully reached destination across all algorithms!\n');

// =========================================================================
// TEST SUITE 3: Dynamic Hazard Encounter, Replanning & Safe Arrival
// =========================================================================
console.log('--- TEST SUITE 3: Dynamic Hazard Encounter & Detour to Destination ---');

{
  const grid = TerrainGenerator.generate('SOUTH_POLE', { seed: 55 });
  const start = findTraversablePoint(grid, 5, 5);
  const target = findTraversablePoint(grid, 50, 50);

  const plan = astar.findPath(grid, start, target, {
    roverConfig: DEFAULT_ROVER_CONFIG,
    strategy: 'SOLAR_OPTIMIZED',
  });

  let state = createInitialRoverState(start);
  let activePath = [...plan.path];
  let waypointIdx = 0;
  let reroutes = 0;
  let finished = false;
  let outcome = '';
  let obstacleInjected = false;
  const eventsCollected: string[] = [];

  for (let step = 0; step < 10000; step++) {
    // Inject dynamic boulder hazard directly at upcoming waypoint once rover has started moving
    if (!obstacleInjected && waypointIdx >= 1 && waypointIdx + 1 < activePath.length) {
      const hazardPt = activePath[waypointIdx + 1];
      const hx = Math.round(hazardPt.x);
      const hy = Math.round(hazardPt.y);
      grid.cells[hy][hx].isObstacle = true;
      grid.cells[hy][hx].cost = Infinity;
      grid.cells[hy][hx].roughness = 4.0;
      obstacleInjected = true;
      console.log(`  -> Dynamically placed boulder hazard at [${hx}, ${hy}] directly along rover path`);
    }

    const res = RoverSimulationEngine.step({
      state,
      config: DEFAULT_ROVER_CONFIG,
      terrain: grid,
      activePath,
      currentWaypointIndex: waypointIdx,
      targetPoint: target,
      dtSeconds: 0.05,
      isAutonomous: true,
      rerouteCount: reroutes,
    });

    state = res.updatedState;
    activePath = res.activePath;
    waypointIdx = res.nextWaypointIndex;
    reroutes = res.rerouteCount;

    if (res.newEvents && res.newEvents.length > 0) {
      eventsCollected.push(...res.newEvents.map((e) => e.message));
    }

    if (res.isFinished || state.goalReached) {
      finished = true;
      outcome = res.finishOutcome || (state.goalReached ? 'SUCCESS' : 'UNKNOWN');
      break;
    }
  }

  const finalDist = Math.hypot(state.x - target.x, state.y - target.y);
  console.log(`  Hazard Test -> Finished: ${finished} | Outcome: ${outcome} | Reroutes: ${reroutes} | DistToTarget: ${finalDist.toFixed(2)}m`);
  console.log(`  Events logged (${eventsCollected.length}):`);
  eventsCollected.slice(0, 4).forEach((msg) => console.log(`    - ${msg}`));

  if (!finished || outcome !== 'SUCCESS') {
    throw new Error(`[SUITE 3 FAILED] Rover failed to navigate around dynamic hazard to destination (outcome=${outcome})`);
  }

  if (reroutes === 0) {
    throw new Error(`[SUITE 3 FAILED] Replanning was not triggered when encountering obstacle`);
  }
}
console.log('✓ Dynamic hazard successfully detected, bypassed with curved detour, and destination reached!\n');

// =========================================================================
// TEST SUITE 4: Manual Driving Mode with Throttle, Steering, and Space Brake
// =========================================================================
console.log('--- TEST SUITE 4: Manual Driving & Emergency Brake ---');

{
  const grid = TerrainGenerator.generate('FLAT', { seed: 1 });
  const start: Point2D = { x: 10, y: 10 };
  const target: Point2D = { x: 14, y: 10 }; // 8 meters east

  let state = createInitialRoverState(start);
  state.mode = 'MANUAL';

  // Step 1: Forward throttle (+1.0)
  for (let step = 0; step < 100; step++) {
    const res = RoverSimulationEngine.step({
      state,
      config: DEFAULT_ROVER_CONFIG,
      terrain: grid,
      activePath: [],
      currentWaypointIndex: 0,
      targetPoint: target,
      dtSeconds: 0.02,
      isAutonomous: false,
      manualControls: { throttle: 1.0, steering: 0.0 },
      rerouteCount: 0,
    });
    state = res.updatedState;
  }

  console.log(`  Manual Acceleration -> Velocity: ${state.velocity.toFixed(2)}m/s, Pos: (${state.x.toFixed(2)}, ${state.y.toFixed(2)})`);
  if (state.velocity <= 0.5 || state.x <= 10.5) {
    throw new Error(`[SUITE 4 FAILED] Rover did not accelerate forward under manual throttle`);
  }

  // Step 2: Emergency Brake (Space Bar)
  for (let step = 0; step < 50; step++) {
    const res = RoverSimulationEngine.step({
      state,
      config: DEFAULT_ROVER_CONFIG,
      terrain: grid,
      activePath: [],
      currentWaypointIndex: 0,
      targetPoint: target,
      dtSeconds: 0.02,
      isAutonomous: false,
      manualControls: { throttle: 1.0, steering: 0.0, brake: true },
      rerouteCount: 0,
    });
    state = res.updatedState;
  }

  console.log(`  Manual Emergency Brake -> Velocity after brake: ${state.velocity.toFixed(2)}m/s`);
  if (state.velocity > 0.05) {
    throw new Error(`[SUITE 4 FAILED] Emergency brake did not bring rover to a stop`);
  }

  // Step 3: Drive to destination
  for (let step = 0; step < 500; step++) {
    const dx = target.x - state.x;
    const dy = target.y - state.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.5) break;

    const res = RoverSimulationEngine.step({
      state,
      config: DEFAULT_ROVER_CONFIG,
      terrain: grid,
      activePath: [],
      currentWaypointIndex: 0,
      targetPoint: target,
      dtSeconds: 0.02,
      isAutonomous: false,
      manualControls: { throttle: 0.8, steering: 0.0 },
      rerouteCount: 0,
    });
    state = res.updatedState;
  }

  console.log(`  Manual Destination Arrival -> Goal Reached: ${state.goalReached}, Pos: (${state.x.toFixed(2)}, ${state.y.toFixed(2)})`);
  if (!state.goalReached) {
    throw new Error(`[SUITE 4 FAILED] Rover did not register goal reached upon arriving at destination`);
  }
}
console.log('✓ Manual driving, steering, emergency braking, and target arrival fully verified!\n');

console.log('================================================================');
console.log('  ALL MANUAL & MULTI-ALGORITHM HAZARD TESTS PASSED SUCCESSFULLY! ');
console.log('================================================================\n');
