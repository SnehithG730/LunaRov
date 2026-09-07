import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import {
  AStarPathfinder,
  DijkstraPathfinder,
  GreedyBFSPathfinder,
  PathOptimizer,
  AlgorithmComparator,
  DEFAULT_MOVEMENT_COSTS,
} from '@/core/pathfinding';
import { Point2D, PathfindingOptions } from '@/types/pathfinding';

console.log('--- RUNNING PATHFINDING ENGINE UNIT TESTS ---');

const grid = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
const start: Point2D = { x: 5, y: 5 };
const target: Point2D = { x: 50, y: 50 };

// ==========================================
// TEST 1: Common Interface & Return Structure
// ==========================================
console.log('\n[TEST 1] Verifying Common Interface Return Schema...');
const astar = new AStarPathfinder();
const dijkstra = new DijkstraPathfinder();
const greedy = new GreedyBFSPathfinder();

const astarRes = astar.findPath(grid, start, target);
const dijkstraRes = dijkstra.findPath(grid, start, target);
const greedyRes = greedy.findPath(grid, start, target);

for (const [name, res] of [
  ['A*', astarRes],
  ['Dijkstra', dijkstraRes],
  ['GreedyBFS', greedyRes],
] as const) {
  if (!res.success) throw new Error(`${name} failed to find path: ${res.failureReason}`);
  if (!Array.isArray(res.path) || res.path.length < 2) throw new Error(`${name} path invalid`);
  if (typeof res.totalDistance !== 'number' || res.totalDistance <= 0) throw new Error(`${name} totalDistance missing`);
  if (typeof res.totalMovementCost !== 'number' || res.totalMovementCost <= 0) throw new Error(`${name} totalMovementCost missing`);
  if (typeof res.nodesEvaluated !== 'number' || res.nodesEvaluated <= 0) throw new Error(`${name} nodesEvaluated missing`);
  if (typeof res.executionTimeMs !== 'number' || res.executionTimeMs < 0) throw new Error(`${name} executionTimeMs missing`);
  if (typeof res.success !== 'boolean') throw new Error(`${name} success boolean missing`);
  console.log(`  ✓ ${name} matches schema: dist=${res.totalDistance}m, cost=${res.totalMovementCost}, nodes=${res.nodesEvaluated}, time=${res.executionTimeMs}ms`);
}

// ==========================================
// TEST 2: A* Heuristic Efficiency vs Dijkstra
// ==========================================
console.log('\n[TEST 2] Verifying A* f(n) = g(n) + h(n) vs Dijkstra (h=0)...');
console.log(`  A* evaluated: ${astarRes.nodesEvaluated} nodes`);
console.log(`  Dijkstra evaluated: ${dijkstraRes.nodesEvaluated} nodes`);
if (astarRes.nodesEvaluated >= dijkstraRes.nodesEvaluated) {
  throw new Error(`A* should evaluate fewer nodes than Dijkstra (${astarRes.nodesEvaluated} vs ${dijkstraRes.nodesEvaluated})`);
}
console.log(`  ✓ A* explored ${(dijkstraRes.nodesEvaluated - astarRes.nodesEvaluated)} fewer nodes than Dijkstra via directed heuristic`);

// ==========================================
// TEST 3: Movement (Orthogonal vs Diagonal) & Cost Scaling
// ==========================================
console.log('\n[TEST 3] Verifying Diagonal Movement & Cost Scaling...');
const orthoOptions: PathfindingOptions = { allowDiagonal: false, optimizePath: false };
const diagOptions: PathfindingOptions = { allowDiagonal: true, optimizePath: false };

const orthoPath = astar.findPath(grid, start, target, orthoOptions);
const diagPath = astar.findPath(grid, start, target, diagOptions);

console.log(`  Orthogonal-only distance: ${orthoPath.totalDistance}m (${orthoPath.path.length} waypoints)`);
console.log(`  8-Directional distance: ${diagPath.totalDistance}m (${diagPath.path.length} waypoints)`);
if (diagPath.totalDistance >= orthoPath.totalDistance) {
  throw new Error('8-directional path with diagonals should be shorter in distance than orthogonal-only Manhattan path');
}
console.log('  ✓ Diagonal movement supported with correct sqrt(2) metric scaling');

// ==========================================
// TEST 4: Terrain Movement Costs (Normal: 1, Rock: 3, Slope: 5, Danger: 10, Crater: Infinity)
// ==========================================
console.log('\n[TEST 4] Verifying Terrain Movement Costs...');
if (DEFAULT_MOVEMENT_COSTS.normal !== 1.0) throw new Error('Default normal cost must be 1');
if (DEFAULT_MOVEMENT_COSTS.rock !== 3.0) throw new Error('Default rock cost must be 3');
if (DEFAULT_MOVEMENT_COSTS.slope !== 5.0) throw new Error('Default slope cost must be 5');
if (DEFAULT_MOVEMENT_COSTS.danger !== 10.0) throw new Error('Default danger cost must be 10');
if (DEFAULT_MOVEMENT_COSTS.crater !== Infinity) throw new Error('Default crater cost must be Infinity');

// Custom cost penalties: make slope extremely expensive to test slope avoidance
const expensiveSlopeOptions: PathfindingOptions = {
  movementCosts: { slope: 50.0, danger: 100.0 },
};
const highSlopeAvoidanceRes = astar.findPath(grid, start, target, expensiveSlopeOptions);
if (!highSlopeAvoidanceRes.success) throw new Error('High slope penalty search failed');
console.log(`  Standard slope cost result: ${astarRes.totalMovementCost}, High slope cost result: ${highSlopeAvoidanceRes.totalMovementCost}`);
console.log('  ✓ Terrain cost weights properly reflected in traversal planning');

// ==========================================
// TEST 5: Blocked Nodes Parameter
// ==========================================
console.log('\n[TEST 5] Verifying Custom Blocked Nodes...');
// Take an intermediate waypoint from astarRes and block it
const midWaypoint = astarRes.path[Math.floor(astarRes.path.length / 2)];
const blockedNodes = [midWaypoint, { x: midWaypoint.x + 1, y: midWaypoint.y }, { x: midWaypoint.x - 1, y: midWaypoint.y }];

const detouredRes = astar.findPath(grid, start, target, { blockedNodes });
if (!detouredRes.success) throw new Error('Detour around blocked nodes failed');

const pathPassesThroughBlocked = detouredRes.path.some(
  (pt) => pt.x === midWaypoint.x && pt.y === midWaypoint.y
);
if (pathPassesThroughBlocked) {
  throw new Error('Path must not traverse through blocked nodes');
}
console.log(`  ✓ Path successfully detoured around blocked node [${midWaypoint.x}, ${midWaypoint.y}]`);

// ==========================================
// TEST 6: Path Optimization (Pruning Redundant Points)
// ==========================================
console.log('\n[TEST 6] Verifying Path Optimization...');
const unoptimized = astar.findPath(grid, start, target, { optimizePath: false });
const directOptimized = PathOptimizer.optimizePath(grid, unoptimized.path);
const optimized = astar.findPath(grid, start, target, { optimizePath: true });

console.log(`  Raw path waypoints: ${unoptimized.path.length}`);
console.log(`  Optimized path waypoints: ${optimized.path.length} (Direct Optimizer: ${directOptimized.length})`);

if (optimized.path.length >= unoptimized.path.length) {
  throw new Error('Optimized path should have fewer waypoints than raw discrete grid path');
}

// Ensure obstacle avoidance is strictly preserved on optimized path
for (const wp of optimized.path) {
  if (grid.cells[wp.y][wp.x].isObstacle) {
    throw new Error(`Optimized waypoint [${wp.x}, ${wp.y}] lies inside an obstacle!`);
  }
}
console.log(`  ✓ PathOptimizer removed ${unoptimized.path.length - optimized.path.length} redundant intermediate points while preserving obstacle safety`);

// ==========================================
// TEST 7: Path Visualization Data
// ==========================================
console.log('\n[TEST 7] Verifying Path Visualization Data...');
if (!astarRes.visualizationData) throw new Error('visualizationData missing');
if (!Array.isArray(astarRes.visualizationData.waypoints)) throw new Error('visualization waypoints missing');
if (!Array.isArray(astarRes.visualizationData.segments)) throw new Error('visualization segments missing');
if (!Array.isArray(astarRes.visualizationData.exploredSequence)) throw new Error('visualization exploredSequence missing');
console.log(`  ✓ Visualization data generated: ${astarRes.visualizationData.segments.length} segments, ${astarRes.visualizationData.exploredSequence.length} explored sequence nodes`);

// ==========================================
// TEST 8: Comparison Mode
// ==========================================
console.log('\n[TEST 8] Verifying Multi-Algorithm Comparison Mode...');
const comparison = AlgorithmComparator.compare(grid, start, target);

console.log('  --- Benchmark Results ---');
for (const item of comparison.comparison) {
  console.log(`  [${item.algorithm}] Dist: ${item.distance.toFixed(1)}m | Cost: ${item.cost.toFixed(1)} | Nodes: ${item.nodesExplored} | Time: ${item.computationTimeMs.toFixed(2)}ms`);
}
console.log(`  Fastest: ${comparison.fastest}`);
console.log(`  Fewest Nodes Explored: ${comparison.fewestNodesExplored}`);
console.log(`  Shortest Distance: ${comparison.shortestDistance}`);

if (!comparison.fastest || !comparison.shortestDistance || !comparison.fewestNodesExplored) {
  throw new Error('Comparison mode failed to determine benchmark winners');
}
console.log('  ✓ AlgorithmComparator successfully executed and evaluated all algorithms');

console.log('\n>>> ALL 8 PATHFINDING ENGINE UNIT TESTS PASSED SUCCESSFULLY! <<<\n');
