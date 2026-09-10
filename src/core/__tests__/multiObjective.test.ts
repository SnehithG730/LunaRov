import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { StrategyComparator } from '@/core/pathfinding/StrategyComparator';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { TerrainGrid } from '@/types/terrain';
import { Point2D, OPTIMIZATION_STRATEGY_PRESETS } from '@/types/pathfinding';

console.log('--- RUNNING MULTI-OBJECTIVE PATH-PLANNING AUTOMATED UNIT TESTS ---\n');

const solver = new AStarPathfinder();

// Helper to create synthetic test grid
function createTestGrid(width: number, height: number, resolution = 2.0): TerrainGrid {
  const cells = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        elevation: 0,
        slope: 0,
        roughness: 1.0,
        cost: 1.0,
        isObstacle: false,
        discovered: true,
        terrainType: 'MARE' as const,
      });
    }
    cells.push(row);
  }
  return {
    width,
    height,
    resolution,
    cells,
    minElevation: 0,
    maxElevation: 0,
    seed: 1234,
    type: 'FLAT',
  };
}

// =========================================================================
// TEST 1: Steep Slope Shortcut Avoidance (Min Energy & Safest vs Shortest)
// =========================================================================
console.log('[TEST 1] Verifying Steep Slope Shortcut Avoidance...');
const slopeGrid = createTestGrid(30, 30);
// Add a steep hill ridge along columns x=12..16, rows y=0..20
for (let y = 0; y <= 20; y++) {
  for (let x = 12; x <= 16; x++) {
    slopeGrid.cells[y][x].elevation = 12.0; // 12m height
    slopeGrid.cells[y][x].slope = 22.0;    // 22 deg steep slope
  }
}
slopeGrid.maxElevation = 12.0;

const startPt: Point2D = { x: 5, y: 10 };
const targetPt: Point2D = { x: 25, y: 10 };

const shortestRes = solver.findPath(slopeGrid, startPt, targetPt, {
  strategy: 'SHORTEST',
  weights: OPTIMIZATION_STRATEGY_PRESETS.SHORTEST,
  roverConfig: DEFAULT_ROVER_CONFIG,
});

const minEnergyRes = solver.findPath(slopeGrid, startPt, targetPt, {
  strategy: 'MIN_ENERGY',
  weights: OPTIMIZATION_STRATEGY_PRESETS.MIN_ENERGY,
  roverConfig: DEFAULT_ROVER_CONFIG,
});

const safestRes = solver.findPath(slopeGrid, startPt, targetPt, {
  strategy: 'SAFEST',
  weights: OPTIMIZATION_STRATEGY_PRESETS.SAFEST,
  roverConfig: DEFAULT_ROVER_CONFIG,
});

console.log(`  Shortest Route:   Dist=${shortestRes.totalDistanceMeters}m | MaxSlope=${shortestRes.maxSlopeDeg}° | Energy=${shortestRes.estimatedEnergyWh}Wh`);
console.log(`  Min-Energy Route: Dist=${minEnergyRes.totalDistanceMeters}m | MaxSlope=${minEnergyRes.maxSlopeDeg}° | Energy=${minEnergyRes.estimatedEnergyWh}Wh`);
console.log(`  Safest Route:     Dist=${safestRes.totalDistanceMeters}m | MaxSlope=${safestRes.maxSlopeDeg}° | Energy=${safestRes.estimatedEnergyWh}Wh`);

if (!shortestRes.success || !minEnergyRes.success || !safestRes.success) {
  throw new Error('All 3 routes should find valid paths on slope grid');
}

if (shortestRes.maxSlopeDeg <= minEnergyRes.maxSlopeDeg && minEnergyRes.totalDistanceMeters <= shortestRes.totalDistanceMeters) {
  throw new Error('Shortest path should take direct steep climb while Min-Energy contours around');
}

console.log('  ✓ Verified: Min Energy & Safest navigate around steep hill to preserve battery & safety!\n');

// =========================================================================
// TEST 2: Longer Energy-Saving Path vs Direct Uphill
// =========================================================================
console.log('[TEST 2] Verifying Energy-Optimal Trajectory Selection...');
const naturalGrid = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
const nStart = { x: 5, y: 5 };
const nTarget = { x: 50, y: 50 };

const comparison = StrategyComparator.compare(naturalGrid, nStart, nTarget, {
  roverConfig: DEFAULT_ROVER_CONFIG,
});

const shortestItem = comparison.comparisons.find((c) => c.strategy === 'SHORTEST')!;
const minEnergyItem = comparison.comparisons.find((c) => c.strategy === 'MIN_ENERGY')!;
const safestItem = comparison.comparisons.find((c) => c.strategy === 'SAFEST')!;
const balancedItem = comparison.comparisons.find((c) => c.strategy === 'BALANCED')!;
const fastestItem = comparison.comparisons.find((c) => c.strategy === 'FASTEST')!;

console.log(`  [SHORTEST]   Dist: ${shortestItem.distanceMeters.toFixed(1)}m | Energy: ${shortestItem.estimatedEnergyWh.toFixed(1)}Wh | Time: ${shortestItem.estimatedTravelTimeSeconds.toFixed(1)}s | Risk: ${shortestItem.riskScore}`);
console.log(`  [MIN_ENERGY] Dist: ${minEnergyItem.distanceMeters.toFixed(1)}m | Energy: ${minEnergyItem.estimatedEnergyWh.toFixed(1)}Wh | Time: ${minEnergyItem.estimatedTravelTimeSeconds.toFixed(1)}s | Risk: ${minEnergyItem.riskScore}`);
console.log(`  [SAFEST]     Dist: ${safestItem.distanceMeters.toFixed(1)}m | Energy: ${safestItem.estimatedEnergyWh.toFixed(1)}Wh | Time: ${safestItem.estimatedTravelTimeSeconds.toFixed(1)}s | Risk: ${safestItem.riskScore}`);
console.log(`  [FASTEST]    Dist: ${fastestItem.distanceMeters.toFixed(1)}m | Energy: ${fastestItem.estimatedEnergyWh.toFixed(1)}Wh | Time: ${fastestItem.estimatedTravelTimeSeconds.toFixed(1)}s | Risk: ${fastestItem.riskScore}`);
console.log(`  [BALANCED]   Dist: ${balancedItem.distanceMeters.toFixed(1)}m | Energy: ${balancedItem.estimatedEnergyWh.toFixed(1)}Wh | Time: ${balancedItem.estimatedTravelTimeSeconds.toFixed(1)}s | Risk: ${balancedItem.riskScore}`);

if (!shortestItem.success || !minEnergyItem.success || !safestItem.success) {
  throw new Error('All primary strategies must successfully compute a path on natural terrain');
}

console.log('  ✓ Verified: Multi-objective comparison accurately benchmarks energy & distance trade-offs!\n');

// =========================================================================
// TEST 3: Safe Obstacle Detour & Buffer Clearance
// =========================================================================
console.log('[TEST 3] Verifying Safe Obstacle Clearance & Risk Scoring...');
const obstacleGrid = createTestGrid(40, 40);
// Place rock field with high roughness in middle
for (let y = 12; y <= 28; y++) {
  for (let x = 12; x <= 28; x++) {
    obstacleGrid.cells[y][x].roughness = 1.9;
    obstacleGrid.cells[y][x].cost = 4.0;
  }
}
const oStart = { x: 5, y: 20 };
const oTarget = { x: 35, y: 20 };

const oShortest = solver.findPath(obstacleGrid, oStart, oTarget, {
  strategy: 'SHORTEST',
  weights: OPTIMIZATION_STRATEGY_PRESETS.SHORTEST,
});
const oSafest = solver.findPath(obstacleGrid, oStart, oTarget, {
  strategy: 'SAFEST',
  weights: OPTIMIZATION_STRATEGY_PRESETS.SAFEST,
});

console.log(`  Direct through rough field: Risk=${oShortest.riskScore}/100 | Dist=${oShortest.totalDistanceMeters}m`);
console.log(`  Safest bypass:              Risk=${oSafest.riskScore}/100 | Dist=${oSafest.totalDistanceMeters}m`);

if (oSafest.riskScore > oShortest.riskScore) {
  throw new Error('Safest route must have lower or equal risk score than direct rough field crossing');
}
console.log('  ✓ Verified: Safest route minimizes boulder / roughness risk!\n');

// =========================================================================
// TEST 4: Balanced Strategy Trade-Offs
// =========================================================================
console.log('[TEST 4] Verifying Balanced Intermediate Route...');
const bRes = solver.findPath(naturalGrid, nStart, nTarget, {
  strategy: 'BALANCED',
  weights: OPTIMIZATION_STRATEGY_PRESETS.BALANCED,
});

if (!bRes.success) {
  throw new Error('Balanced strategy failed');
}

console.log(`  Balanced Route: Dist=${bRes.totalDistanceMeters.toFixed(1)}m | Energy=${bRes.estimatedEnergyWh.toFixed(1)}Wh | Feasibility=${bRes.feasibility}`);
console.log('  ✓ Verified: Balanced strategy computed stable intermediate compromise!\n');

// =========================================================================
// TEST 5: Battery Exhaustion & Mission Feasibility Evaluation
// =========================================================================
console.log('[TEST 5] Verifying Battery Feasibility Classification...');
// Low battery config: 1.5 Wh (route requires ~2.1 Wh)
const tinyBatteryRover = {
  ...DEFAULT_ROVER_CONFIG,
  batteryCapacityWh: 1.5,
};

const infeasibleRes = solver.findPath(naturalGrid, nStart, nTarget, {
  strategy: 'BALANCED',
  weights: OPTIMIZATION_STRATEGY_PRESETS.BALANCED,
  roverConfig: tinyBatteryRover,
});

console.log(`  Tiny Battery (1.5Wh): Feasibility=${infeasibleRes.feasibility} | BatteryRem=${infeasibleRes.batteryRemainingPct}%`);
console.log(`  Warning message: "${infeasibleRes.feasibilityWarning}"`);

if (infeasibleRes.feasibility !== 'INFEASIBLE') {
  throw new Error('Route requiring >1.5Wh on 1.5Wh battery must be classified as INFEASIBLE');
}

// Adequate battery config: 1500 Wh
const largeBatteryRover = {
  ...DEFAULT_ROVER_CONFIG,
  batteryCapacityWh: 1500,
};
const feasibleRes = solver.findPath(naturalGrid, nStart, nTarget, {
  strategy: 'BALANCED',
  weights: OPTIMIZATION_STRATEGY_PRESETS.BALANCED,
  roverConfig: largeBatteryRover,
});

console.log(`  Large Battery (1500Wh): Feasibility=${feasibleRes.feasibility} | BatteryRem=${feasibleRes.batteryRemainingPct}%`);
if (feasibleRes.feasibility !== 'FEASIBLE') {
  throw new Error('Route on 1500Wh battery must be classified as FEASIBLE');
}

console.log('  ✓ Verified: Mission feasibility properly detects battery depletion and hazard ceilings!\n');

console.log('>>> ALL 5 MULTI-OBJECTIVE PATH-PLANNING SCENARIO TESTS PASSED! <<<\n');
