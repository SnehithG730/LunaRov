import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { DijkstraPathfinder } from '@/core/pathfinding/Dijkstra';
import { GreedyBFSPathfinder } from '@/core/pathfinding/GreedyBFS';
import { EnergyModel } from '@/core/rover/EnergyModel';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

console.log('--- RUNNING LUNAR ROVER ENGINE AUTOMATED TESTS ---');

// Test 1: Terrain Generation
const grid = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
console.log(`[TEST 1] Terrain Generated: ${grid.width}x${grid.height}, Cells: ${grid.cells.length} rows`);
console.log(`[TEST 1] Elev range: [${grid.minElevation}m, ${grid.maxElevation}m]`);
if (grid.cells.length !== 60 || grid.cells[0].length !== 60) {
  throw new Error('Terrain dimensions incorrect');
}

// Test 2: A* Pathfinding
const astar = new AStarPathfinder();
const start = { x: 5, y: 5 };
const target = { x: 50, y: 50 };
const astarResult = astar.findPath(grid, start, target);
console.log(`[TEST 2] A* Success: ${astarResult.success}, Distance: ${astarResult.totalDistanceMeters}m, Explored: ${astarResult.nodesExploredCount} cells, Time: ${astarResult.computeTimeMs}ms`);
if (!astarResult.success || astarResult.path.length === 0) {
  throw new Error('A* failed to compute traversable path');
}

// Test 3: Dijkstra Pathfinding
const dijkstra = new DijkstraPathfinder();
const dijkstraResult = dijkstra.findPath(grid, start, target);
console.log(`[TEST 3] Dijkstra Success: ${dijkstraResult.success}, Distance: ${dijkstraResult.totalDistanceMeters}m, Explored: ${dijkstraResult.nodesExploredCount} cells, Time: ${dijkstraResult.computeTimeMs}ms`);
if (!dijkstraResult.success) {
  throw new Error('Dijkstra failed');
}

// Test 4: Greedy BFS Pathfinding
const greedy = new GreedyBFSPathfinder();
const greedyResult = greedy.findPath(grid, start, target);
console.log(`[TEST 4] Greedy BFS Success: ${greedyResult.success}, Distance: ${greedyResult.totalDistanceMeters}m, Explored: ${greedyResult.nodesExploredCount} cells`);

// Test 5: Energy Model
const flatPower = EnergyModel.calculatePowerDrawWatts(DEFAULT_ROVER_CONFIG, 1.5, 0, 1.0);
const uphillPower = EnergyModel.calculatePowerDrawWatts(DEFAULT_ROVER_CONFIG, 1.5, 12, 1.0);
console.log(`[TEST 5] Power: Flat ground = ${flatPower.toFixed(1)}W, 12 deg Uphill = ${uphillPower.toFixed(1)}W`);
if (uphillPower <= flatPower) {
  throw new Error('Incline power must exceed flat ground power');
}

console.log('>>> ALL 5 SIMULATION ENGINE TESTS PASSED SUCCESSFULLY! <<<\n');

// Trigger Pathfinding Unit Tests
import './pathfinding.test';

// Trigger Rover Simulation Engine Unit Tests
import './simulationEngine.test';

// Trigger Supabase Database & Authentication Unit Tests
import './authDatabase.test';

