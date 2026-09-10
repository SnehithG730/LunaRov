import { TerrainGrid, TerrainCell } from '@/types/terrain';
import {
  Point2D,
  PathfindingOptions,
  PathfindingResult,
  MovementCosts,
  ObjectiveWeights,
  OptimizationStrategy,
  OPTIMIZATION_STRATEGY_PRESETS,
  CostBreakdown,
  MissionFeasibility,
  PathVisualizationData,
  PathVisualizationSegment,
} from '@/types/pathfinding';
import { RoverConfig } from '@/types/rover';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';
import { EnergyModel } from '@/core/rover/EnergyModel';
import { SolarModel } from '@/core/rover/SolarModel';

export interface IPathfinder {
  findPath(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options?: PathfindingOptions
  ): PathfindingResult;
}

export const DEFAULT_MOVEMENT_COSTS: MovementCosts = {
  normal: 1.0,
  rock: 3.0,
  slope: 5.0,
  danger: 10.0,
  crater: Infinity,
};

export function isCellBlocked(
  cell: TerrainCell,
  options?: PathfindingOptions
): boolean {
  if (cell.isObstacle || cell.cost === Infinity) return true;

  const blockedList = options?.customBlockedNodes || (Array.isArray(options?.blockedNodes) ? options?.blockedNodes : undefined);
  if (blockedList) {
    for (const pt of blockedList) {
      if (pt.x === cell.x && pt.y === cell.y) return true;
    }
  }

  if (options?.blockedNodes instanceof Set) {
    if (options.blockedNodes.has(`${cell.x},${cell.y}`)) return true;
  }

  return false;
}

export function resolveCellCost(
  cell: TerrainCell,
  options?: PathfindingOptions
): number {
  if (isCellBlocked(cell, options)) {
    return Infinity;
  }

  const costs = { ...DEFAULT_MOVEMENT_COSTS, ...options?.movementCosts };

  if (cell.cost && cell.cost !== 1.0) {
    return cell.cost;
  }

  if (cell.slope >= 22.0) {
    return costs.danger;
  }
  if (cell.slope >= 15.0) {
    return costs.slope;
  }
  if (cell.roughness > 1.3) {
    return costs.rock;
  }

  return costs.normal;
}

/**
 * Resolves the effective objective weights from PathfindingOptions
 */
export function resolveEffectiveWeights(options?: PathfindingOptions): {
  strategy: OptimizationStrategy;
  weights: ObjectiveWeights;
} {
  const strategy: OptimizationStrategy = options?.strategy ?? 'BALANCED';
  let baseWeights: ObjectiveWeights;

  if (strategy === 'CUSTOM' && options?.weights) {
    baseWeights = { ...options.weights };
  } else if (strategy in OPTIMIZATION_STRATEGY_PRESETS) {
    baseWeights = { ...OPTIMIZATION_STRATEGY_PRESETS[strategy as Exclude<OptimizationStrategy, 'CUSTOM'>] };
  } else {
    baseWeights = { ...OPTIMIZATION_STRATEGY_PRESETS.BALANCED };
  }

  if (options?.customWeights) {
    baseWeights = { ...baseWeights, ...options.customWeights };
  }

  return { strategy, weights: baseWeights };
}

/**
 * Computes the normalized multi-objective step cost for moving from fromCell to toCell.
 */
export function calculateMultiObjectiveTransitionCost(
  fromCell: TerrainCell,
  toCell: TerrainCell,
  offsetCost: number, // 1.0 for orthogonal, SQRT2 for diagonal
  resolution: number,
  roverConfig: RoverConfig = DEFAULT_ROVER_CONFIG,
  weights: ObjectiveWeights,
  options?: PathfindingOptions
): { totalCost: number; breakdown: CostBreakdown } {
  // 1. Distance Cost: normalized step distance factor
  const distanceCost = offsetCost;

  // 2. Slope / Incline calculation
  const horizontalDist = offsetCost * resolution;
  const deltaElev = toCell.elevation - fromCell.elevation;
  const directInclineDeg = (Math.atan2(Math.abs(deltaElev), horizontalDist) * 180) / Math.PI;
  const effectiveSlopeDeg = Math.max(toCell.slope, directInclineDeg);

  // Normalized slope cost: quadratic penalty for steepness
  const slopeRatio = Math.min(1.5, effectiveSlopeDeg / 25.0);
  const uphillFactor = deltaElev > 0 ? (deltaElev / resolution) * 1.5 : 0;
  const slopeCost = (slopeRatio * slopeRatio * 3.5 + uphillFactor) * offsetCost;

  // 3. Energy Cost: gross power draw relative to flat baseline
  const cruiseSpeed = roverConfig.maxSpeed * 0.75;
  const basePowerWatts = EnergyModel.calculatePowerDrawWatts(roverConfig, cruiseSpeed, 0, 1.0);
  const directionalSlope = (Math.atan2(deltaElev, horizontalDist) * 180) / Math.PI;
  const stepPowerWatts = EnergyModel.calculatePowerDrawWatts(
    roverConfig,
    cruiseSpeed,
    directionalSlope,
    toCell.roughness
  );

  // Solar illumination factor at transition
  const fromIllum = fromCell.illumination ?? 0.8;
  const toIllum = toCell.illumination ?? 0.8;
  const stepIllum = (fromIllum + toIllum) / 2;
  const solarPowerWatts = SolarModel.calculateSolarPowerWatts(roverConfig, stepIllum);
  const netPowerWatts = Math.max(5, stepPowerWatts - solarPowerWatts * 0.75);

  const energyCost = (netPowerWatts / Math.max(10, basePowerWatts)) * offsetCost;

  // Solar Shadow Cost (penalizes cold shadow / PSR traversal, rewards sunlit ridge transit)
  const solarCost = (1.0 - stepIllum) * 3.0 * offsetCost;
  const solarReward = stepIllum * 2.0 * offsetCost;

  // 4. Hazard / Risk Cost
  let riskFactor = 0;
  if (toCell.slope >= 22.0) riskFactor += 3.5;
  else if (toCell.slope >= 15.0) riskFactor += 1.5;
  else if (toCell.slope >= 10.0) riskFactor += 0.5;

  if (toCell.roughness > 1.4) riskFactor += 2.0 * (toCell.roughness - 1.0);
  else if (toCell.roughness > 1.1) riskFactor += 0.8 * (toCell.roughness - 1.0);

  if (toCell.cost >= 10) riskFactor += 2.5;

  // Additional slope cost weight / roughness cost weight compatibility
  if (options?.slopeCostWeight && options.slopeCostWeight > 1) {
    riskFactor += (options.slopeCostWeight - 1) * (effectiveSlopeDeg / 20.0);
  }
  if (options?.roughnessCostWeight && options.roughnessCostWeight > 1) {
    riskFactor += (options.roughnessCostWeight - 1) * Math.max(0, toCell.roughness - 1.0);
  }

  const riskCost = riskFactor * offsetCost;

  // 5. Travel Time Cost
  const terrainSpeedFactor = Math.max(
    0.2,
    1.0 - (effectiveSlopeDeg / 30.0) * 0.5 - Math.max(0, toCell.roughness - 1.0) * 0.4
  );
  const timeCost = (1.0 / terrainSpeedFactor) * offsetCost;

  // Weighted Total
  const solarWeight = weights.solar ?? 0;
  const totalWeightedCost =
    weights.distance * distanceCost +
    weights.energy * energyCost +
    weights.slope * slopeCost +
    weights.risk * riskCost +
    weights.time * timeCost +
    solarWeight * solarCost;

  return {
    totalCost: totalWeightedCost,
    breakdown: {
      distanceCost: Number(distanceCost.toFixed(3)),
      energyCost: Number(energyCost.toFixed(3)),
      slopeCost: Number(slopeCost.toFixed(3)),
      riskCost: Number(riskCost.toFixed(3)),
      timeCost: Number(timeCost.toFixed(3)),
      solarCost: Number(solarCost.toFixed(3)),
      solarReward: Number(solarReward.toFixed(3)),
      totalWeightedCost: Number(totalWeightedCost.toFixed(3)),
    },
  };
}

/**
 * Computes complete multi-objective metrics across a full waypoint path
 */
export function computeMultiObjectiveMetrics(
  grid: TerrainGrid,
  path: Point2D[],
  roverConfig: RoverConfig = DEFAULT_ROVER_CONFIG,
  weights: ObjectiveWeights,
  options?: PathfindingOptions
): {
  totalDistanceMeters: number;
  totalMovementCost: number;
  estimatedEnergyWh: number;
  solarEnergyGeneratedWh: number;
  netEnergyWh: number;
  minimumBatteryPct: number;
  timeInIlluminationSeconds: number;
  timeInShadowSeconds: number;
  estimatedTravelTimeSeconds: number;
  averageSlopeDeg: number;
  maxSlopeDeg: number;
  riskScore: number;
  batteryRemainingPct: number;
  feasibility: MissionFeasibility;
  feasibilityWarning?: string;
  costBreakdown: CostBreakdown;
  segments: PathVisualizationSegment[];
} {
  if (!path || path.length < 2) {
    return {
      totalDistanceMeters: 0,
      totalMovementCost: 0,
      estimatedEnergyWh: 0,
      solarEnergyGeneratedWh: 0,
      netEnergyWh: 0,
      minimumBatteryPct: 100,
      timeInIlluminationSeconds: 0,
      timeInShadowSeconds: 0,
      estimatedTravelTimeSeconds: 0,
      averageSlopeDeg: 0,
      maxSlopeDeg: 0,
      riskScore: 0,
      batteryRemainingPct: 100,
      feasibility: 'FEASIBLE',
      costBreakdown: {
        distanceCost: 0,
        energyCost: 0,
        slopeCost: 0,
        riskCost: 0,
        timeCost: 0,
        solarCost: 0,
        solarReward: 0,
        totalWeightedCost: 0,
      },
      segments: [],
    };
  }

  let totalDist = 0;
  let totalCostSum = 0;
  let totalEnergyWh = 0;
  let totalSolarWh = 0;
  let totalTimeSec = 0;
  let totalSunSec = 0;
  let totalShadowSec = 0;
  let slopeSum = 0;
  let maxSlope = 0;
  let totalRiskAcc = 0;
  const segments: PathVisualizationSegment[] = [];

  const sumBreakdown: CostBreakdown = {
    distanceCost: 0,
    energyCost: 0,
    slopeCost: 0,
    riskCost: 0,
    timeCost: 0,
    solarCost: 0,
    solarReward: 0,
    totalWeightedCost: 0,
  };

  let simulatedBatteryWh = roverConfig.batteryCapacityWh;
  let minBatteryRecordedWh = roverConfig.batteryCapacityWh;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    const x1 = Math.min(grid.width - 1, Math.max(0, Math.round(p1.x)));
    const y1 = Math.min(grid.height - 1, Math.max(0, Math.round(p1.y)));
    const x2 = Math.min(grid.width - 1, Math.max(0, Math.round(p2.x)));
    const y2 = Math.min(grid.height - 1, Math.max(0, Math.round(p2.y)));

    const c1 = grid.cells[y1][x1];
    const c2 = grid.cells[y2][x2];

    const dx = (p2.x - p1.x) * grid.resolution;
    const dy = (p2.y - p1.y) * grid.resolution;
    const dz = c2.elevation - c1.elevation;
    const stepDist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
    totalDist += stepDist3D;

    const horizDist = Math.hypot(dx, dy) || grid.resolution;
    const offsetFactor = horizDist / grid.resolution;
    const stepSlopeDeg = (Math.atan2(Math.abs(dz), horizDist) * 180) / Math.PI;
    const effSlope = Math.max(c2.slope, stepSlopeDeg);
    slopeSum += effSlope;
    if (effSlope > maxSlope) maxSlope = effSlope;

    const { totalCost, breakdown } = calculateMultiObjectiveTransitionCost(
      c1,
      c2,
      offsetFactor,
      grid.resolution,
      roverConfig,
      weights,
      options
    );

    totalCostSum += totalCost;
    sumBreakdown.distanceCost += breakdown.distanceCost;
    sumBreakdown.energyCost += breakdown.energyCost;
    sumBreakdown.slopeCost += breakdown.slopeCost;
    sumBreakdown.riskCost += breakdown.riskCost;
    sumBreakdown.timeCost += breakdown.timeCost;
    sumBreakdown.solarCost = (sumBreakdown.solarCost || 0) + (breakdown.solarCost || 0);
    sumBreakdown.solarReward = (sumBreakdown.solarReward || 0) + (breakdown.solarReward || 0);
    sumBreakdown.totalWeightedCost += breakdown.totalWeightedCost;

    // Segment speed and energy
    const terrainSpeedFactor = Math.max(
      0.2,
      1.0 - (effSlope / 30.0) * 0.5 - Math.max(0, c2.roughness - 1.0) * 0.4
    );
    const segSpeed = Math.max(0.3, roverConfig.maxSpeed * terrainSpeedFactor);
    const segDurationSec = stepDist3D / segSpeed;
    totalTimeSec += segDurationSec;

    const stepIllum = ((c1.illumination ?? 0.8) + (c2.illumination ?? 0.8)) / 2;
    if (stepIllum > 0.3) {
      totalSunSec += segDurationSec;
    } else {
      totalShadowSec += segDurationSec;
    }

    const directionalSlope = (Math.atan2(dz, horizDist) * 180) / Math.PI;
    const powerWatts = EnergyModel.calculatePowerDrawWatts(
      roverConfig,
      segSpeed,
      directionalSlope,
      c2.roughness
    );
    const segEnergyWh = EnergyModel.calculateEnergyDrainWh(powerWatts, segDurationSec);
    totalEnergyWh += segEnergyWh;

    const solarPowerWatts = SolarModel.calculateSolarPowerWatts(roverConfig, stepIllum);
    const segSolarWh = (solarPowerWatts * segDurationSec) / 3600;
    totalSolarWh += segSolarWh;

    // Continuous simulated battery state along trajectory (clamped at capacity)
    simulatedBatteryWh = Math.min(
      roverConfig.batteryCapacityWh,
      Math.max(0, simulatedBatteryWh - segEnergyWh + segSolarWh)
    );
    if (simulatedBatteryWh < minBatteryRecordedWh) {
      minBatteryRecordedWh = simulatedBatteryWh;
    }

    let segRisk = 0;
    if (effSlope >= 22.0) segRisk += 30;
    else if (effSlope >= 15.0) segRisk += 15;
    else if (effSlope >= 10.0) segRisk += 5;
    if (c2.roughness > 1.3) segRisk += 15 * (c2.roughness - 1.0);
    totalRiskAcc += segRisk;

    segments.push({
      from: p1,
      to: p2,
      cost: Number(totalCost.toFixed(2)),
      distanceMeters: Number(stepDist3D.toFixed(2)),
      slopeDeg: Number(effSlope.toFixed(1)),
      energyWh: Number(segEnergyWh.toFixed(3)),
    });
  }

  const segmentCount = path.length - 1;
  const avgSlope = Number((slopeSum / segmentCount).toFixed(1));
  const normalizedRiskScore = Math.min(
    100,
    Math.round((totalRiskAcc / segmentCount) * 2.5 + (maxSlope >= 22 ? 25 : 0))
  );

  const netEnergyWh = Number((totalEnergyWh - totalSolarWh).toFixed(1));
  const batteryRemainingPct = Number(
    Math.max(0, Math.min(100, (simulatedBatteryWh / roverConfig.batteryCapacityWh) * 100)).toFixed(1)
  );
  const minimumBatteryPct = Number(
    Math.max(0, Math.min(100, (minBatteryRecordedWh / roverConfig.batteryCapacityWh) * 100)).toFixed(1)
  );

  const minReserveThresholdPct = roverConfig.minimumBatteryReservePct ?? 20.0;

  let feasibility: MissionFeasibility = 'FEASIBLE';
  let feasibilityWarning: string | undefined = undefined;

  if (minBatteryRecordedWh <= 0.01 || netEnergyWh > roverConfig.batteryCapacityWh || ((roverConfig.solarCapacityWatts ?? 0) === 0 && totalEnergyWh > roverConfig.batteryCapacityWh)) {
    feasibility = 'INFEASIBLE';
    feasibilityWarning = `Mission requires ${totalEnergyWh.toFixed(1)} Wh (Net: ${netEnergyWh} Wh) on a ${roverConfig.batteryCapacityWh} Wh battery. Battery will deplete to 0% before target.`;
  } else if (maxSlope >= 25.0) {
    feasibility = 'INFEASIBLE';
    feasibilityWarning = `Path crosses extreme hazard zone with ${maxSlope.toFixed(1)}° slope exceeding safety limits.`;
  } else if (minimumBatteryPct < minReserveThresholdPct) {
    feasibility = 'WARNING';
    feasibilityWarning = `Reserve violation: Minimum battery drops to ${minimumBatteryPct}%, below the ${minReserveThresholdPct}% safety floor. Recommend Solar-Optimized route.`;
  } else if (netEnergyWh > roverConfig.batteryCapacityWh * 0.75) {
    feasibility = 'WARNING';
    feasibilityWarning = `High net energy route: Net ${netEnergyWh} Wh consumes ${((netEnergyWh / roverConfig.batteryCapacityWh) * 100).toFixed(0)}% of battery capacity.`;
  } else if (maxSlope >= 20.0) {
    feasibility = 'WARNING';
    feasibilityWarning = `Elevated pitch risk: encounters ${maxSlope.toFixed(1)}° slopes requiring maximum tractive torque.`;
  }

  return {
    totalDistanceMeters: Number(totalDist.toFixed(2)),
    totalMovementCost: Number(totalCostSum.toFixed(2)),
    estimatedEnergyWh: Number(totalEnergyWh.toFixed(1)),
    solarEnergyGeneratedWh: Number(totalSolarWh.toFixed(1)),
    netEnergyWh,
    minimumBatteryPct,
    timeInIlluminationSeconds: Number(totalSunSec.toFixed(1)),
    timeInShadowSeconds: Number(totalShadowSec.toFixed(1)),
    estimatedTravelTimeSeconds: Number(totalTimeSec.toFixed(1)),
    averageSlopeDeg: avgSlope,
    maxSlopeDeg: Number(maxSlope.toFixed(1)),
    riskScore: normalizedRiskScore,
    batteryRemainingPct,
    feasibility,
    feasibilityWarning,
    costBreakdown: {
      distanceCost: Number(sumBreakdown.distanceCost.toFixed(2)),
      energyCost: Number(sumBreakdown.energyCost.toFixed(2)),
      slopeCost: Number(sumBreakdown.slopeCost.toFixed(2)),
      riskCost: Number(sumBreakdown.riskCost.toFixed(2)),
      timeCost: Number(sumBreakdown.timeCost.toFixed(2)),
      solarCost: Number((sumBreakdown.solarCost || 0).toFixed(2)),
      solarReward: Number((sumBreakdown.solarReward || 0).toFixed(2)),
      totalWeightedCost: Number(sumBreakdown.totalWeightedCost.toFixed(2)),
    },
    segments,
  };
}

// Binary Min-Heap Priority Queue for O(log N) node extraction
export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  public push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].item;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (node.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIdx] = node;
      index = parentIdx;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const node = this.heap[index];

    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;
      let minPriority = node.priority;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < minPriority) {
          swapIdx = leftChildIdx;
          minPriority = this.heap[leftChildIdx].priority;
        }
      }

      if (rightChildIdx < length) {
        if (this.heap[rightChildIdx].priority < minPriority) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = node;
      index = swapIdx;
    }
  }
}

// 8-direction transitions with diagonal cost sqrt(2) and corner-cutting prevention
export const NEIGHBOR_OFFSETS = [
  { dx: 0, dy: -1, cost: 1.0, isDiag: false }, // North
  { dx: 1, dy: 0, cost: 1.0, isDiag: false },  // East
  { dx: 0, dy: 1, cost: 1.0, isDiag: false },  // South
  { dx: -1, dy: 0, cost: 1.0, isDiag: false }, // West
  { dx: 1, dy: -1, cost: Math.SQRT2, isDiag: true, adj1: { dx: 1, dy: 0 }, adj2: { dx: 0, dy: -1 } }, // NE
  { dx: 1, dy: 1, cost: Math.SQRT2, isDiag: true, adj1: { dx: 1, dy: 0 }, adj2: { dx: 0, dy: 1 } },   // SE
  { dx: -1, dy: 1, cost: Math.SQRT2, isDiag: true, adj1: { dx: -1, dy: 0 }, adj2: { dx: 0, dy: 1 } },  // SW
  { dx: -1, dy: -1, cost: Math.SQRT2, isDiag: true, adj1: { dx: -1, dy: 0 }, adj2: { dx: 0, dy: -1 } },// NW
];
