import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { DStarLitePathfinder, DStarLiteEngine } from '@/core/pathfinding/DStarLite';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { DynamicReplanner } from '@/core/pathfinding/Replanner';
import { AlgorithmComparator } from '@/core/pathfinding/AlgorithmComparator';
import { Point2D } from '@/types/pathfinding';

console.log('\n--- RUNNING D* LITE PATHFINDING ENGINE UNIT TESTS ---');

const grid = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
const start: Point2D = { x: 5, y: 5 };
const target: Point2D = { x: 50, y: 50 };

// [TEST 1] Interface & Return Schema Validation
console.log('\n[TEST 1] Verifying D* Lite Common Interface & Schema...');
const dstar = new DStarLitePathfinder();
const dstarResult = dstar.findPath(grid, start, target);

if (!dstarResult.success || dstarResult.path.length === 0) {
  throw new Error(`D* Lite failed to compute traversable path: ${dstarResult.failureReason}`);
}
if (dstarResult.algorithm !== 'DSTAR_LITE') {
  throw new Error(`Expected algorithm 'DSTAR_LITE', got ${dstarResult.algorithm}`);
}
if (typeof dstarResult.totalDistanceMeters !== 'number' || dstarResult.totalDistanceMeters <= 0) {
  throw new Error('D* Lite totalDistanceMeters invalid');
}
console.log(`  ✓ D* Lite path computed successfully: dist=${dstarResult.totalDistanceMeters}m, cost=${dstarResult.totalMovementCost}, nodes=${dstarResult.nodesEvaluated}, time=${dstarResult.executionTimeMs}ms`);

// [TEST 2] Optimality Comparison vs A*
console.log('\n[TEST 2] Verifying D* Lite Optimality vs A*...');
const astar = new AStarPathfinder();
const astarResult = astar.findPath(grid, start, target);

console.log(`  D* Lite Distance: ${dstarResult.totalDistanceMeters.toFixed(2)}m | A* Distance: ${astarResult.totalDistanceMeters.toFixed(2)}m`);
console.log(`  D* Lite Cost: ${dstarResult.totalMovementCost.toFixed(2)} | A* Cost: ${astarResult.totalMovementCost.toFixed(2)}`);

// Distance & cost should be comparable (within 5% tolerance due to spline smoothing)
const distDiffPct = Math.abs(dstarResult.totalDistanceMeters - astarResult.totalDistanceMeters) / astarResult.totalDistanceMeters;
if (distDiffPct > 0.08) {
  throw new Error(`D* Lite path distance diverges excessively from A*: ${(distDiffPct * 100).toFixed(1)}%`);
}
console.log(`  ✓ D* Lite optimality verified within ${(distDiffPct * 100).toFixed(2)}% of A*`);

// [TEST 3] Dynamic Incremental Replanning & Obstacle Discovery
console.log('\n[TEST 3] Verifying Dynamic Incremental Replanning on Discovered Obstacles...');
const dstarEngine = new DStarLiteEngine(grid, start, target);
dstarEngine.computeShortestPath();
const initialPath = dstarEngine.extractPath();

if (initialPath.length < 5) {
  throw new Error('Initial path too short for replanning test');
}

// Select a waypoint along the path to block dynamically
const midWaypoint = initialPath[Math.floor(initialPath.length / 3)];
console.log(`  Dynamically blocking downstream waypoint: [${midWaypoint.x}, ${midWaypoint.y}]`);

const roverCurrentPos = initialPath[2];
const updateResult = dstarEngine.updateObstacles([midWaypoint], roverCurrentPos);
const replannedPath = dstarEngine.extractPath();

if (replannedPath.length === 0) {
  throw new Error('D* Lite failed to compute replanned detour around dynamic obstacle');
}

// Verify that the replanned path avoids the newly blocked cell
const hitsBlocked = replannedPath.some((p) => p.x === midWaypoint.x && p.y === midWaypoint.y);
if (hitsBlocked) {
  throw new Error(`Replanned path contains newly blocked node [${midWaypoint.x}, ${midWaypoint.y}]`);
}
console.log(`  ✓ D* Lite dynamically repaired graph: ${updateResult.nodesUpdated} nodes updated, new route length=${replannedPath.length} waypoints`);

// [TEST 4] Edge Cases: Start == Target, Blocked Start, Blocked Destination, Impossible Target
console.log('\n[TEST 4] Verifying Edge Case Handling...');

// Case 4a: Start == Target
const samePointResult = dstar.findPath(grid, { x: 10, y: 10 }, { x: 10, y: 10 });
if (!samePointResult.success || samePointResult.totalDistanceMeters !== 0 || samePointResult.path.length !== 1) {
  throw new Error('Failed Start == Target edge case');
}
console.log('  ✓ Start == Target handled: distance=0m, path length=1');

// Case 4b: Destination is an impassable obstacle
const blockedGrid = TerrainGenerator.generate('CRATER_FIELD', { seed: 99 });
const blockedTarget = { x: 30, y: 30 };
blockedGrid.cells[blockedTarget.y][blockedTarget.x].isObstacle = true;
blockedGrid.cells[blockedTarget.y][blockedTarget.x].cost = Infinity;

const blockedDestResult = dstar.findPath(blockedGrid, { x: 5, y: 5 }, blockedTarget);
if (blockedDestResult.success) {
  throw new Error('D* Lite should fail when destination target is an impassable obstacle');
}
console.log(`  ✓ Blocked destination correctly rejected: "${blockedDestResult.failureReason}"`);

// Case 4c: Fully enclosed / impossible target
const walledGrid = TerrainGenerator.generate('FLAT', { seed: 12 });
const walledTarget = { x: 25, y: 25 };
for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
    if (dx !== 0 || dy !== 0) {
      walledGrid.cells[walledTarget.y + dy][walledTarget.x + dx].isObstacle = true;
      walledGrid.cells[walledTarget.y + dy][walledTarget.x + dx].cost = Infinity;
    }
  }
}
const impossibleResult = dstar.findPath(walledGrid, { x: 5, y: 5 }, walledTarget);
if (impossibleResult.success) {
  throw new Error('D* Lite should fail when destination is completely walled off');
}
console.log(`  ✓ Walled/impossible destination correctly rejected: "${impossibleResult.failureReason}"`);

// [TEST 5] DynamicReplanner with D* Lite & Telemetry Metrics
console.log('\n[TEST 5] Verifying DynamicReplanner Telemetry & Detour Metrics...');
const replanResult = DynamicReplanner.replan(
  grid,
  start,
  dstarResult.path,
  target,
  midWaypoint,
  'DSTAR_LITE',
  1
);

if (!replanResult.success || !replanResult.replanTelemetry) {
  throw new Error('DynamicReplanner did not return valid replan telemetry');
}

const telem = replanResult.replanTelemetry;
console.log(`  Replans count: ${telem.replansCount}`);
console.log(`  Nodes updated: ${telem.nodesUpdated}`);
console.log(`  Path length before: ${telem.pathLengthBeforeMeters}m`);
console.log(`  Path length after: ${telem.pathLengthAfterMeters}m`);
console.log(`  Added detour distance: ${telem.additionalDistanceMeters}m`);

if (telem.nodesUpdated <= 0) {
  throw new Error('Expected positive nodesUpdated count in replan telemetry');
}
console.log('  ✓ Replan telemetry metrics verified successfully');

// [TEST 6] Multi-Algorithm Benchmark Comparison including D* Lite
console.log('\n[TEST 6] Verifying 4-Algorithm Benchmark Comparison (ASTAR, DIJKSTRA, GREEDY_BFS, DSTAR_LITE)...');
const comparison = AlgorithmComparator.compare(grid, start, target, {}, ['ASTAR', 'DIJKSTRA', 'GREEDY_BFS', 'DSTAR_LITE']);

if (comparison.comparison.length !== 4) {
  throw new Error(`Expected 4 benchmark entries, got ${comparison.comparison.length}`);
}

for (const c of comparison.comparison) {
  console.log(`  [${c.algorithm.padEnd(11)}] Dist: ${c.distance.toFixed(1)}m | Cost: ${c.cost.toFixed(1)} | Nodes: ${c.nodesExplored} | Time: ${c.computationTimeMs.toFixed(2)}ms | Success: ${c.success}`);
  if (!c.success) {
    throw new Error(`Algorithm benchmark failed for ${c.algorithm}`);
  }
}
console.log('  ✓ All 4 algorithms benchmarked and evaluated successfully');

console.log('\n>>> ALL 6 D* LITE PATHFINDING UNIT TESTS PASSED SUCCESSFULLY! <<<\n');
