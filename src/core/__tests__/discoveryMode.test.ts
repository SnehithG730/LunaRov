import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { SensorDiscoveryEngine } from '@/core/sensor/SensorDiscoveryEngine';
import { RoverSimulationEngine } from '@/core/rover/RoverSimulationEngine';
import { DStarLitePathfinder } from '@/core/pathfinding/DStarLite';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { Point2D } from '@/types/pathfinding';
import { RoverState } from '@/types/rover';

console.log('\n--- RUNNING SENSOR DISCOVERY & UNKNOWN TERRAIN ENGINE UNIT TESTS ---');

const groundTruth = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
const startPoint: Point2D = { x: 5, y: 5 };
const targetPoint: Point2D = { x: 50, y: 50 };

// [TEST 1] Dual-Map Separation & Initial Known Map Fog of War
console.log('\n[TEST 1] Verifying Dual-Map Separation & Initial Fog of War Shroud...');
const knownTerrain = SensorDiscoveryEngine.createInitialKnownTerrain(groundTruth, startPoint, {
  initialExploredRadiusCells: 4,
});

if (knownTerrain.width !== groundTruth.width || knownTerrain.height !== groundTruth.height) {
  throw new Error('Known terrain dimensions mismatch ground truth');
}

// Check landing zone cells (within 4 cells) are discovered
const startCell = knownTerrain.cells[startPoint.y][startPoint.x];
if (!startCell.discovered) {
  throw new Error('Start cell must be discovered in initial landing zone');
}

// Check far cells are unknown and shrouded
const farCell = knownTerrain.cells[targetPoint.y][targetPoint.x];
if (farCell.discovered) {
  throw new Error('Destination cell far from spawn must initially be hidden in Fog of War');
}
if (farCell.isObstacle) {
  throw new Error('Rover must not know about distant obstacles before sensor scan');
}
console.log('  ✓ Dual-map architecture verified: Ground Truth separated from subjective Known Map');

// [TEST 2] LiDAR Sensor Discovery & Reveal Mechanics
console.log('\n[TEST 2] Verifying LiDAR Sensor Range Sweep & Fog-of-War Reveal...');
const testRoverState: RoverState = {
  x: 10,
  y: 10,
  heading: 0,
  velocity: 0,
  batteryRemainingWh: 1200,
  batteryPercentage: 100,
  pitch: 0,
  roll: 0,
  distanceTraveledMeters: 10,
  elapsedTimeSeconds: 5,
  isStuck: false,
  hasCrashed: false,
  goalReached: false,
  mode: 'AUTONOMOUS',
};

const beforeDiscoveredCount = knownTerrain.cells.flat().filter((c) => c.discovered).length;

const scanResult = SensorDiscoveryEngine.executeLiDARScan(
  testRoverState,
  DEFAULT_ROVER_CONFIG,
  groundTruth,
  knownTerrain,
  [{ x: 10, y: 10 }, { x: 25, y: 10 }]
);

const afterDiscoveredCount = knownTerrain.cells.flat().filter((c) => c.discovered).length;

if (afterDiscoveredCount <= beforeDiscoveredCount) {
  throw new Error('LiDAR scan failed to uncover new cells within sensor reach');
}
if (scanResult.scannedCellsInSweep.length === 0) {
  throw new Error('Scanned cells sweep count is zero');
}
console.log(`  ✓ LiDAR revealed ${afterDiscoveredCount - beforeDiscoveredCount} cells (Total explored: ${scanResult.telemetry.explorationPercentage}%)`);

// [TEST 3] Obstacle & Hazard Discovery Events & Classification
console.log('\n[TEST 3] Verifying Multi-Hazard Discovery & Event Classification...');
// Place a known crater/boulder right in front of the rover in unexplored territory
const testObstaclePos: Point2D = { x: 22, y: 10 };
groundTruth.cells[testObstaclePos.y][testObstaclePos.x].isObstacle = true;
groundTruth.cells[testObstaclePos.y][testObstaclePos.x].cost = Infinity;
groundTruth.cells[testObstaclePos.y][testObstaclePos.x].slope = 28.5;
groundTruth.cells[testObstaclePos.y][testObstaclePos.x].roughness = 2.5;

const forwardRoverState: RoverState = {
  ...testRoverState,
  x: 18,
  y: 10,
};

const hazardScanResult = SensorDiscoveryEngine.executeLiDARScan(
  forwardRoverState,
  DEFAULT_ROVER_CONFIG,
  groundTruth,
  knownTerrain,
  [forwardRoverState, testObstaclePos, { x: 35, y: 10 }]
);

if (hazardScanResult.newlyDiscoveredHazards.length === 0) {
  throw new Error('LiDAR failed to identify newly discovered hazard within sensor range');
}
if (!hazardScanResult.isPathObstructed) {
  throw new Error('Path obstruction was not flagged when route intersects discovered hazard');
}
if (hazardScanResult.generatedEvents.length === 0) {
  throw new Error('Expected mission discovery events to be generated');
}
console.log(`  ✓ Discovered hazard identified: "${hazardScanResult.generatedEvents[0].message}"`);

// [TEST 4] Dynamic Replanning with D* Lite on Known Map
console.log('\n[TEST 4] Verifying Autonomous Dynamic Replanning on Known Terrain...');
const dstar = new DStarLitePathfinder();
const initialKnownRoute = dstar.findPath(knownTerrain, startPoint, targetPoint);

if (!initialKnownRoute.success || initialKnownRoute.path.length === 0) {
  throw new Error(`Failed to compute initial path on known terrain: ${initialKnownRoute.failureReason}`);
}

const stepInput = {
  state: {
    ...testRoverState,
    x: 18,
    y: 10,
  },
  config: DEFAULT_ROVER_CONFIG,
  terrain: knownTerrain,
  groundTruthTerrain: groundTruth,
  sensorDiscoveryMode: true,
  activePath: [{ x: 18, y: 10 }, testObstaclePos, { x: 35, y: 10 }],
  currentWaypointIndex: 0,
  targetPoint: { x: 35, y: 10 },
  dtSeconds: 0.1,
  rerouteCount: 0,
  isAutonomous: true,
  algorithm: 'DSTAR_LITE' as const,
};

const stepResult = RoverSimulationEngine.step(stepInput);

if (stepResult.rerouteCount !== 1) {
  throw new Error(`Expected rerouteCount to increment on discovered obstacle, got ${stepResult.rerouteCount}`);
}
if (stepResult.activePath.some((p) => p.x === testObstaclePos.x && p.y === testObstaclePos.y)) {
  throw new Error('Replanned detour path still contains the discovered blocked cell');
}
console.log(`  ✓ Rover autonomously replanned safe detour around discovered obstacle (${stepResult.activePath.length} waypoints)`);

// [TEST 5] Destination Initially Unknown vs Discovered
console.log('\n[TEST 5] Verifying Unknown Destination Handling...');
const freshKnown = SensorDiscoveryEngine.createInitialKnownTerrain(groundTruth, startPoint);
const destCellBefore = freshKnown.cells[targetPoint.y][targetPoint.x];
if (destCellBefore.discovered) {
  throw new Error('Destination should not be discovered before rover reaches proximity');
}

// Rover moves near target and scans
const nearTargetState: RoverState = {
  ...testRoverState,
  x: targetPoint.x - 2,
  y: targetPoint.y - 2,
};
SensorDiscoveryEngine.executeLiDARScan(nearTargetState, DEFAULT_ROVER_CONFIG, groundTruth, freshKnown);

const destCellAfter = freshKnown.cells[targetPoint.y][targetPoint.x];
if (!destCellAfter.discovered) {
  throw new Error('Destination should be revealed when rover LiDAR comes within range');
}
console.log('  ✓ Destination cell discovery lifecycle validated');

// [TEST 6] Impossible Route Detection in Discovery Mode
console.log('\n[TEST 6] Verifying Impossible Walled Target Detection in Discovery Mode...');
const walledGT = TerrainGenerator.generate('FLAT', { seed: 1 });
const trappedTarget: Point2D = { x: 20, y: 20 };
for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
    if (dx !== 0 || dy !== 0) {
      walledGT.cells[trappedTarget.y + dy][trappedTarget.x + dx].isObstacle = true;
      walledGT.cells[trappedTarget.y + dy][trappedTarget.x + dx].cost = Infinity;
    }
  }
}
const walledKnown = SensorDiscoveryEngine.createInitialKnownTerrain(walledGT, { x: 19, y: 19 });
// Rover scans the walled off region
SensorDiscoveryEngine.executeLiDARScan(
  { ...testRoverState, x: 19, y: 19 },
  DEFAULT_ROVER_CONFIG,
  walledGT,
  walledKnown
);

const trappedResult = dstar.findPath(walledKnown, { x: 19, y: 19 }, trappedTarget);
if (trappedResult.success) {
  throw new Error('D* Lite should fail when destination is completely walled off by discovered barriers');
}
console.log(`  ✓ Impossible route correctly identified: "${trappedResult.failureReason}"`);

// [TEST 7] Exploration Summary Metrics Calculation
console.log('\n[TEST 7] Verifying Exploration Summary & Discovery Telemetry Metrics...');
const discTelem = scanResult.telemetry;
if (typeof discTelem.explorationPercentage !== 'number' || discTelem.explorationPercentage <= 0) {
  throw new Error('Invalid exploration percentage');
}
if (discTelem.totalCellsInGrid !== 3600) {
  throw new Error(`Expected 3600 total grid cells, got ${discTelem.totalCellsInGrid}`);
}
if (discTelem.cellsDiscoveredCount + discTelem.unknownCellsRemaining !== discTelem.totalCellsInGrid) {
  throw new Error('Discovered cells + unknown remaining must sum to total grid cells');
}
console.log(`  Explored: ${discTelem.explorationPercentage}% (${discTelem.cellsDiscoveredCount} / ${discTelem.totalCellsInGrid} cells)`);
console.log(`  Hazards tracked: ${discTelem.hazardsDetectedCount}`);
console.log('  ✓ Exploration telemetry metrics verified');

console.log('\n>>> ALL 7 SENSOR DISCOVERY & UNKNOWN TERRAIN UNIT TESTS PASSED! <<<\n');
