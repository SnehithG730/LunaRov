import { SolarModel } from '@/core/rover/SolarModel';
import { TerrainGenerator } from '@/core/terrain/TerrainGenerator';
import { AStarPathfinder } from '@/core/pathfinding/AStar';
import { RoverSimulationEngine } from '@/core/rover/RoverSimulationEngine';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { OPTIMIZATION_STRATEGY_PRESETS } from '@/types/pathfinding';
import { RoverState } from '@/types/rover';

console.log('--- RUNNING SOLAR-AWARE PATHFINDING & ENERGY MODEL TESTS ---');

// Test 1: Solar Generation in Full Light vs Shadow
{
  const peakCapacity = 300; // 300W array
  const fullSunPower = SolarModel.calculateSolarPowerWatts(peakCapacity, 1.0);
  const halfSunPower = SolarModel.calculateSolarPowerWatts(peakCapacity, 0.5);
  const shadowPower = SolarModel.calculateSolarPowerWatts(peakCapacity, 0.0);

  console.log(`[SOLAR TEST 1] 300W Array Generation -> Full Sun: ${fullSunPower}W, Half Sun: ${halfSunPower}W, Shadow (PSR): ${shadowPower}W`);

  if (fullSunPower !== 300 || halfSunPower !== 150 || shadowPower !== 0) {
    throw new Error(`[SOLAR TEST 1 FAILED] Unexpected power generation: full=${fullSunPower}, half=${halfSunPower}, shadow=${shadowPower}`);
  }
}

// Test 2: South Pole DEM Shadow Raymarching & Illumination Field
{
  const grid = TerrainGenerator.generate('SOUTH_POLE', { seed: 101 });
  let fullSunCount = 0;
  let shadowCount = 0;

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const illum = grid.cells[y][x].illumination;
      if (illum >= 0.7) fullSunCount++;
      if (illum <= 0.2) shadowCount++;
    }
  }

  console.log(`[SOLAR TEST 2] South Pole Sector: ${grid.width}x${grid.height} cells. Highly illuminated cells: ${fullSunCount}, Shadow/PSR cells: ${shadowCount}`);

  if (fullSunCount === 0 || shadowCount === 0) {
    throw new Error(`[SOLAR TEST 2 FAILED] South Pole DEM did not produce both illuminated ridges and shadowed regions`);
  }
}

// Test 3: Multi-Objective Solar-Optimized Path Planning
{
  const grid = TerrainGenerator.generate('CRATER_FIELD', { seed: 42 });
  const astar = new AStarPathfinder();
  const start = { x: 5, y: 5 };
  const target = { x: 50, y: 50 };

  const shortestWeights = OPTIMIZATION_STRATEGY_PRESETS.SHORTEST;
  const solarWeights = OPTIMIZATION_STRATEGY_PRESETS.SOLAR_OPTIMIZED;

  const shortestResult = astar.findPath(grid, start, target, {
    roverConfig: DEFAULT_ROVER_CONFIG,
    strategy: 'SHORTEST',
    weights: shortestWeights,
  });
  const solarResult = astar.findPath(grid, start, target, {
    roverConfig: DEFAULT_ROVER_CONFIG,
    strategy: 'SOLAR_OPTIMIZED',
    weights: solarWeights,
  });

  console.log(`[SOLAR TEST 3] Shortest Path: ${shortestResult.totalDistanceMeters}m, Solar Gen: ${shortestResult.solarEnergyGeneratedWh}Wh, Net: ${shortestResult.netEnergyWh}Wh`);
  console.log(`[SOLAR TEST 3] Solar-Optimized: ${solarResult.totalDistanceMeters}m, Solar Gen: ${solarResult.solarEnergyGeneratedWh}Wh, Net: ${solarResult.netEnergyWh}Wh`);

  if (!shortestResult.success || !solarResult.success) {
    throw new Error(`[SOLAR TEST 3 FAILED] Pathfinding failed on test sector`);
  }

  if (solarResult.solarEnergyGeneratedWh === undefined || solarResult.netEnergyWh === undefined) {
    throw new Error(`[SOLAR TEST 3 FAILED] Solar metrics missing from PathfindingResult`);
  }
}

// Test 4: Continuous Battery Solar Charging & Capacity Clamping
{
  const config = {
    ...DEFAULT_ROVER_CONFIG,
    batteryCapacityWh: 500,
    solarCapacityWatts: 400,
  };

  let currentState: RoverState = {
    x: 10,
    y: 10,
    heading: 0,
    speed: 0, // parked
    velocity: 0,
    batteryRemainingWh: 499.5, // nearly full
    batteryPercentage: 99.9,
    totalEnergyConsumedWh: 0,
    currentSolarPowerWatts: 0,
    totalSolarEnergyGeneratedWh: 0,
    netEnergyWh: 0,
    timeInIlluminationSeconds: 0,
    timeInShadowSeconds: 0,
    minimumBatteryRecordedPct: 99.9,
    pitch: 0,
    roll: 0,
    isStuck: false,
    hasCrashed: false,
    goalReached: false,
    mode: 'MANUAL',
    distanceTraveledMeters: 0,
    elapsedTimeSeconds: 0,
  };

  const grid = TerrainGenerator.generate('FLAT', { seed: 1 });
  // Ensure starting cell is 100% illuminated
  grid.cells[10][10].illumination = 1.0;

  // Run 100 simulation steps (2 seconds)
  for (let i = 0; i < 100; i++) {
    const res = RoverSimulationEngine.step({
      state: currentState,
      config,
      terrain: grid,
      activePath: [{ x: 10, y: 10 }],
      currentWaypointIndex: 0,
      targetPoint: { x: 10, y: 10 },
      dtSeconds: 0.02,
      isAutonomous: false,
      rerouteCount: 0,
    });
    currentState = res.updatedState;
  }

  console.log(`[SOLAR TEST 4] Battery after solar charging: ${currentState.batteryRemainingWh.toFixed(2)}Wh (Max: ${config.batteryCapacityWh}Wh), Solar Gen: ${(currentState.totalSolarEnergyGeneratedWh ?? 0).toFixed(3)}Wh`);

  // Battery should be capped exactly at 500Wh, never exceeding capacity
  if (currentState.batteryRemainingWh > config.batteryCapacityWh) {
    throw new Error(`[SOLAR TEST 4 FAILED] Battery exceeded maximum capacity ceiling: ${currentState.batteryRemainingWh} > ${config.batteryCapacityWh}`);
  }

  if ((currentState.totalSolarEnergyGeneratedWh ?? 0) <= 0) {
    throw new Error(`[SOLAR TEST 4 FAILED] Solar generation not accumulated during simulation`);
  }
}

// Test 5: Battery Reserve Warning & Critical Event Emission
{
  const config = {
    ...DEFAULT_ROVER_CONFIG,
    batteryCapacityWh: 100,
    minimumBatteryReservePct: 20, // 20% warning threshold
  };

  let currentState: RoverState = {
    x: 0,
    y: 0,
    heading: 0,
    speed: 1.0,
    velocity: 1.0,
    batteryRemainingWh: 20.00, // 20.0% (exact threshold)
    batteryPercentage: 20.0,
    totalEnergyConsumedWh: 0,
    currentSolarPowerWatts: 0,
    totalSolarEnergyGeneratedWh: 0,
    netEnergyWh: 0,
    timeInIlluminationSeconds: 0,
    timeInShadowSeconds: 0,
    minimumBatteryRecordedPct: 20.0,
    pitch: 0,
    roll: 0,
    isStuck: false,
    hasCrashed: false,
    goalReached: false,
    mode: 'AUTONOMOUS',
    distanceTraveledMeters: 0,
    elapsedTimeSeconds: 0,
  };

  const grid = TerrainGenerator.generate('FLAT', { seed: 1 });
  grid.cells[0][0].illumination = 0.0; // in shadow

  const collectedEvents = [];

  // Simulate discharge past 20%
  for (let i = 0; i < 1500; i++) {
    const res = RoverSimulationEngine.step({
      state: currentState,
      config,
      terrain: grid,
      activePath: [{ x: 0, y: 0 }, { x: 5, y: 5 }],
      currentWaypointIndex: 0,
      targetPoint: { x: 5, y: 5 },
      dtSeconds: 0.02,
      isAutonomous: true,
      rerouteCount: 0,
    });
    currentState = res.updatedState;
    if (res.newEvents && res.newEvents.length > 0) {
      collectedEvents.push(...res.newEvents);
    }
  }

  const hasLowBatteryEvent = collectedEvents.some((e) => e.message.toLowerCase().includes('battery') || e.message.toLowerCase().includes('reserve'));

  console.log(`[SOLAR TEST 5] Discharge event count: ${collectedEvents.length}, Low battery warning triggered: ${hasLowBatteryEvent}`);

  if (!hasLowBatteryEvent) {
    throw new Error(`[SOLAR TEST 5 FAILED] Minimum battery reserve warning event was not emitted`);
  }
}

console.log('>>> ALL 5 SOLAR-AWARE PATHFINDING & ENERGY TESTS PASSED! <<<\n');
