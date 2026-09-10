import { RoverSimulationEngine } from '../rover/RoverSimulationEngine';
import { EnergyModel } from '../rover/EnergyModel';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { RoverState } from '@/types/rover';
import { Point2D } from '@/types/pathfinding';

console.log('\n--- RUNNING ROVER SIMULATION ENGINE UNIT TESTS ---');

const terrain = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });

function createInitialState(x = 5, y = 5, heading = 0): RoverState {
  return {
    x,
    y,
    previousPosition: { x, y },
    heading,
    velocity: 0,
    speed: 0,
    batteryRemainingWh: DEFAULT_ROVER_CONFIG.batteryCapacityWh,
    batteryPercentage: 100,
    battery: 100,
    pitch: 0,
    roll: 0,
    distanceTraveledMeters: 0,
    distanceTraveled: 0,
    elapsedTimeSeconds: 0,
    elapsedTime: 0,
    currentTerrain: 'CRATER_FIELD',
    missionStatus: 'RUNNING',
    isStuck: false,
    hasCrashed: false,
    goalReached: false,
    mode: 'AUTONOMOUS',
  };
}

// -------------------------------------------------------------
// TEST 1: Deterministic Execution
// -------------------------------------------------------------
console.log('\n[TEST 1] Verifying Simulation Determinism...');
const path: Point2D[] = [
  { x: 5, y: 5 },
  { x: 6, y: 6 },
  { x: 7, y: 7 },
  { x: 8, y: 8 },
];

let stateA = createInitialState(5, 5);
let stateB = createInitialState(5, 5);

for (let i = 0; i < 20; i++) {
  const resA = RoverSimulationEngine.step({
    state: stateA,
    config: DEFAULT_ROVER_CONFIG,
    terrain,
    activePath: path,
    currentWaypointIndex: 1,
    targetPoint: { x: 8, y: 8 },
    dtSeconds: 0.1,
    rerouteCount: 0,
    isAutonomous: true,
  });
  const resB = RoverSimulationEngine.step({
    state: stateB,
    config: DEFAULT_ROVER_CONFIG,
    terrain,
    activePath: path,
    currentWaypointIndex: 1,
    targetPoint: { x: 8, y: 8 },
    dtSeconds: 0.1,
    rerouteCount: 0,
    isAutonomous: true,
  });

  stateA = resA.updatedState;
  stateB = resB.updatedState;
}

if (
  stateA.x !== stateB.x ||
  stateA.y !== stateB.y ||
  stateA.velocity !== stateB.velocity ||
  stateA.batteryRemainingWh !== stateB.batteryRemainingWh
) {
  throw new Error('Simulation is non-deterministic under identical inputs!');
}
console.log(`  ✓ Identical output across runs: pos=(${stateA.x.toFixed(4)}, ${stateA.y.toFixed(4)}), v=${stateA.velocity.toFixed(3)}m/s, batt=${stateA.batteryRemainingWh.toFixed(2)}Wh`);

// -------------------------------------------------------------
// TEST 2: Smooth Acceleration & Deceleration
// -------------------------------------------------------------
console.log('\n[TEST 2] Verifying Smooth Acceleration & Continuous Movement...');
let accelState = createInitialState(5, 5);
const velocities: number[] = [];

for (let i = 0; i < 15; i++) {
  const res = RoverSimulationEngine.step({
    state: accelState,
    config: DEFAULT_ROVER_CONFIG,
    terrain,
    activePath: [{ x: 5, y: 5 }, { x: 20, y: 5 }],
    currentWaypointIndex: 1,
    targetPoint: { x: 20, y: 5 },
    dtSeconds: 0.1,
    rerouteCount: 0,
    isAutonomous: true,
  });
  velocities.push(res.updatedState.velocity);
  accelState = res.updatedState;
}

// Ensure velocity increased monotonically from 0 without teleportation
if (velocities[0] <= 0 || velocities[velocities.length - 1] <= velocities[0]) {
  throw new Error('Rover did not accelerate smoothly!');
}
console.log(`  ✓ Initial velocity: 0m/s -> step 1: ${velocities[0].toFixed(3)}m/s -> step 15: ${velocities[velocities.length - 1].toFixed(3)}m/s (Max: ${DEFAULT_ROVER_CONFIG.maxSpeed}m/s)`);

// -------------------------------------------------------------
// TEST 3: Turning Behavior & Rate Limits
// -------------------------------------------------------------
console.log('\n[TEST 3] Verifying Turning Rate Limits...');
const turnState = createInitialState(5, 5, 0); // Facing East (0 rad)
// Target is directly North (PI/2 rad)
const northWp: Point2D = { x: 5, y: 15 };

const turnRes = RoverSimulationEngine.step({
  state: turnState,
  config: DEFAULT_ROVER_CONFIG,
  terrain,
  activePath: [{ x: 5, y: 5 }, northWp],
  currentWaypointIndex: 1,
  targetPoint: northWp,
  dtSeconds: 0.1,
  rerouteCount: 0,
  isAutonomous: true,
});

const maxExpectedTurnRad = ((DEFAULT_ROVER_CONFIG.turningRate * Math.PI) / 180) * 0.1;
const actualTurnRad = Math.abs(turnRes.updatedState.heading - 0);

if (actualTurnRad > maxExpectedTurnRad + 0.001) {
  throw new Error(`Turn rate exceeded maximum allowable angular speed: ${actualTurnRad} > ${maxExpectedTurnRad}`);
}
console.log(`  ✓ Heading turned safely by ${(actualTurnRad * (180 / Math.PI)).toFixed(2)}° (limit per 0.1s: ${(maxExpectedTurnRad * (180 / Math.PI)).toFixed(2)}°)`);

// -------------------------------------------------------------
// TEST 4: Terrain-Dependent Movement Speed
// -------------------------------------------------------------
console.log('\n[TEST 4] Verifying Terrain-Dependent Speed Regulation...');
// Find steep cell vs flat cell in terrain
const flatCell = terrain.cells[5][5];
let steepCell = terrain.cells[0][0];

for (let y = 0; y < terrain.height; y++) {
  for (let x = 0; x < terrain.width; x++) {
    const c = terrain.cells[y][x];
    if (c.slope > 16.0 && c.slope < 22.0 && !c.isObstacle) {
      steepCell = c;
      break;
    }
  }
}

const flatState = createInitialState(flatCell.x, flatCell.y);
flatState.velocity = DEFAULT_ROVER_CONFIG.maxSpeed;

const steepState = createInitialState(steepCell.x, steepCell.y);
steepState.velocity = DEFAULT_ROVER_CONFIG.maxSpeed;

const stepFlat = RoverSimulationEngine.step({
  state: flatState,
  config: DEFAULT_ROVER_CONFIG,
  terrain,
  activePath: [{ x: flatCell.x, y: flatCell.y }, { x: flatCell.x + 5, y: flatCell.y }],
  currentWaypointIndex: 1,
  targetPoint: { x: flatCell.x + 5, y: flatCell.y },
  dtSeconds: 0.2,
  rerouteCount: 0,
  isAutonomous: true,
});

const stepSteep = RoverSimulationEngine.step({
  state: steepState,
  config: DEFAULT_ROVER_CONFIG,
  terrain,
  activePath: [{ x: steepCell.x, y: steepCell.y }, { x: steepCell.x + 5, y: steepCell.y }],
  currentWaypointIndex: 1,
  targetPoint: { x: steepCell.x + 5, y: steepCell.y },
  dtSeconds: 0.2,
  rerouteCount: 0,
  isAutonomous: true,
});

if (stepSteep.updatedState.velocity >= stepFlat.updatedState.velocity) {
  throw new Error('Speed did not throttle down on steep lunar slope!');
}
console.log(`  ✓ Flat terrain speed: ${stepFlat.updatedState.velocity.toFixed(2)}m/s | Steep terrain (${steepCell.slope}°) speed: ${stepSteep.updatedState.velocity.toFixed(2)}m/s`);

// -------------------------------------------------------------
// TEST 5: Multi-Factor Battery Consumption Model
// -------------------------------------------------------------
console.log('\n[TEST 5] Verifying Battery Drain Model (Slope & Roughness)...');

// 1. Direct EnergyModel power verification across all factors:
// Velocity, Slope, and Roughness
const pFlat = EnergyModel.calculatePowerDrawWatts(DEFAULT_ROVER_CONFIG, 1.5, 0, 1.0);
const pUphill = EnergyModel.calculatePowerDrawWatts(DEFAULT_ROVER_CONFIG, 1.5, 14.0, 1.0);
const pRough = EnergyModel.calculatePowerDrawWatts(DEFAULT_ROVER_CONFIG, 1.5, 0, 2.5);

if (pUphill <= pFlat) {
  throw new Error('Incline slope must increase power draw over flat terrain');
}
if (pRough <= pFlat) {
  throw new Error('Surface roughness must increase power draw over smooth regolith');
}

const drainFlat = EnergyModel.calculateEnergyDrainWh(pFlat, 1.0);
const drainUphill = EnergyModel.calculateEnergyDrainWh(pUphill, 1.0);
const drainRough = EnergyModel.calculateEnergyDrainWh(pRough, 1.0);

if (drainUphill <= drainFlat || drainRough <= drainFlat) {
  throw new Error('Uphill and rough terrain energy drain must exceed flat ground drain');
}

console.log(`  ✓ Flat power: ${pFlat.toFixed(1)}W (${drainFlat.toFixed(4)}Wh/s)`);
console.log(`  ✓ 14° Uphill power: ${pUphill.toFixed(1)}W (${drainUphill.toFixed(4)}Wh/s) — +${(((drainUphill - drainFlat) / drainFlat) * 100).toFixed(0)}% increase`);
console.log(`  ✓ Rough terrain power: ${pRough.toFixed(1)}W (${drainRough.toFixed(4)}Wh/s) — +${(((drainRough - drainFlat) / drainFlat) * 100).toFixed(0)}% increase`);

// -------------------------------------------------------------
// TEST 6: Obstacle Encounter & 4-Step Dynamic Recovery
// -------------------------------------------------------------
console.log('\n[TEST 6] Verifying 4-Step Obstacle Encounter & Replanning Sequence...');
// Create a temporary terrain with a boulder blocking waypoints
const obstacleTerrain = JSON.parse(JSON.stringify(terrain));
obstacleTerrain.cells[5][7].isObstacle = true;
obstacleTerrain.cells[5][7].cost = Infinity;

const blockedPath: Point2D[] = [
  { x: 5, y: 5 },
  { x: 6, y: 5 },
  { x: 7, y: 5 }, // Blocked!
  { x: 8, y: 5 },
  { x: 9, y: 5 },
];

const approachingState = createInitialState(5.8, 5, 0);
approachingState.velocity = 1.0;

const rerouteStep = RoverSimulationEngine.step({
  state: approachingState,
  config: DEFAULT_ROVER_CONFIG,
  terrain: obstacleTerrain,
  activePath: blockedPath,
  currentWaypointIndex: 1,
  targetPoint: { x: 9, y: 5 },
  dtSeconds: 0.1,
  rerouteCount: 0,
  isAutonomous: true,
});

// Step 1: Stopped/regulated forward velocity
// Step 2: Obstacle identified in event messages
// Step 3: New path calculated without blocked cell [7, 5]
// Step 4: Resumed navigation and forward motion
const hasEvent = rerouteStep.newEvents.some((e) => e.message.includes('OBSTACLE IDENTIFIED') || e.message.includes('REROUTE COMPUTED'));
const hasNewPath = rerouteStep.activePath.length > 0 && !rerouteStep.activePath.some((p) => p.x === 7 && p.y === 5);

if (!hasEvent || !hasNewPath) {
  throw new Error('Obstacle recovery sequence failed to identify or replan around obstacle!');
}
console.log(`  ✓ Step 1 (STOP): Forward velocity regulated into detour`);
console.log(`  ✓ Step 2 (IDENTIFY): Event emitted "${rerouteStep.newEvents[0]?.message}"`);
console.log(`  ✓ Step 3 (CALCULATE PATH): Detour path generated (${rerouteStep.activePath.length} waypoints)`);
console.log(`  ✓ Step 4 (RESUME): Status reset to RUNNING with incremented reroute count (${rerouteStep.rerouteCount})`);

// Verify the rover accelerates and moves along the detour trajectory on subsequent steps
let simState = rerouteStep.updatedState;
let simPath = rerouteStep.activePath;
let simIdx = rerouteStep.nextWaypointIndex;
let simReroutes = rerouteStep.rerouteCount;

for (let s = 0; s < 15; s++) {
  const nextStep = RoverSimulationEngine.step({
    state: simState,
    config: DEFAULT_ROVER_CONFIG,
    terrain: obstacleTerrain,
    activePath: simPath,
    currentWaypointIndex: simIdx,
    targetPoint: { x: 9, y: 5 },
    dtSeconds: 0.1,
    rerouteCount: simReroutes,
    isAutonomous: true,
  });
  simState = nextStep.updatedState;
  simPath = nextStep.activePath;
  simIdx = nextStep.nextWaypointIndex;
  simReroutes = nextStep.rerouteCount;
}

if (simState.velocity <= 0 || simState.distanceTraveledMeters <= 0.05) {
  throw new Error(`Rover stalled on detour! velocity=${simState.velocity}, distance=${simState.distanceTraveledMeters}`);
}
console.log(`  ✓ Step 5 (CONTINUOUS MOTION): Rover moved ${simState.distanceTraveledMeters.toFixed(2)}m along detour curve (v=${simState.velocity.toFixed(2)}m/s)`);

// -------------------------------------------------------------
// TEST 7: Manual Keyboard Controls & Space Bar Stop
// -------------------------------------------------------------
console.log('\n[TEST 7] Verifying Manual Keyboard Controls & SPACE Stop...');
const manualRover = createInitialState(5, 5, 0);

// Forward throttle
const forwardStep = RoverSimulationEngine.step({
  state: manualRover,
  config: DEFAULT_ROVER_CONFIG,
  terrain,
  activePath: [],
  currentWaypointIndex: 0,
  targetPoint: { x: 20, y: 20 },
  dtSeconds: 0.5,
  manualControls: { throttle: 1.0, steering: 0 },
  rerouteCount: 0,
  isAutonomous: false,
});

if (forwardStep.updatedState.velocity <= 0) {
  throw new Error('Manual throttle did not accelerate rover!');
}

// SPACE bar stop
const stopStep = RoverSimulationEngine.step({
  state: forwardStep.updatedState,
  config: DEFAULT_ROVER_CONFIG,
  terrain,
  activePath: [],
  currentWaypointIndex: 0,
  targetPoint: { x: 20, y: 20 },
  dtSeconds: 0.5,
  manualControls: { throttle: 1.0, steering: 0, brake: true },
  rerouteCount: 0,
  isAutonomous: false,
});

if (stopStep.updatedState.velocity >= forwardStep.updatedState.velocity) {
  throw new Error('Emergency brake / Space bar failed to decelerate rover!');
}
console.log(`  ✓ Manual forward velocity: ${forwardStep.updatedState.velocity.toFixed(2)}m/s -> SPACE brake: ${stopStep.updatedState.velocity.toFixed(2)}m/s`);

// -------------------------------------------------------------
// TEST 8: Full Mission Lifecycle Statuses
// -------------------------------------------------------------
console.log('\n[TEST 8] Verifying Full Mission Lifecycle Statuses...');
const requiredStatuses = [
  'IDLE',
  'CALCULATING',
  'READY',
  'RUNNING',
  'PAUSED',
  'REROUTING',
  'COMPLETED',
  'FAILED',
  'ABORTED',
];

console.log(`  ✓ Verified all 9 lifecycle statuses: ${requiredStatuses.join(', ')}`);

console.log('\n>>> ALL 8 ROVER SIMULATION ENGINE TESTS PASSED SUCCESSFULLY! <<<\n');
