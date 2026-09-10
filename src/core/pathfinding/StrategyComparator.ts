import { TerrainGrid } from '@/types/terrain';
import {
  Point2D,
  PathfindingOptions,
  PathfindingResult,
  OptimizationStrategy,
  OPTIMIZATION_STRATEGY_PRESETS,
  StrategyComparisonItem,
  StrategyComparisonResult,
  STRATEGY_METADATA,
} from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { DijkstraPathfinder } from './Dijkstra';
import { GreedyBFSPathfinder } from './GreedyBFS';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

export class StrategyComparator {
  /**
   * Evaluates all 5 primary optimization strategy presets (+ custom if active)
   * on the current terrain grid and rover parameters.
   */
  public static compare(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options: PathfindingOptions = {},
    strategies: OptimizationStrategy[] = ['SHORTEST', 'MIN_ENERGY', 'SAFEST', 'FASTEST', 'BALANCED', 'SOLAR_OPTIMIZED']
  ): StrategyComparisonResult {
    const results: Record<OptimizationStrategy, PathfindingResult | null> = {
      SHORTEST: null,
      MIN_ENERGY: null,
      SAFEST: null,
      FASTEST: null,
      BALANCED: null,
      SOLAR_OPTIMIZED: null,
      CUSTOM: null,
    };

    const comparisons: StrategyComparisonItem[] = [];
    const solver = options.strategy === 'CUSTOM' || !options.heuristic ? new AStarPathfinder() : new AStarPathfinder();

    for (const strat of strategies) {
      const weights = strat === 'CUSTOM' && options.weights
        ? options.weights
        : OPTIMIZATION_STRATEGY_PRESETS[strat as Exclude<OptimizationStrategy, 'CUSTOM'>] || OPTIMIZATION_STRATEGY_PRESETS.BALANCED;

      const stratOptions: PathfindingOptions = {
        ...options,
        strategy: strat,
        weights,
        roverConfig: options.roverConfig ?? DEFAULT_ROVER_CONFIG,
      };

      const res = solver.findPath(grid, start, target, stratOptions);
      results[strat] = res;

      comparisons.push({
        strategy: strat,
        name: STRATEGY_METADATA[strat]?.label || strat,
        distanceMeters: res.totalDistanceMeters,
        estimatedEnergyWh: res.estimatedEnergyWh,
        solarEnergyGeneratedWh: res.solarEnergyGeneratedWh,
        netEnergyWh: res.netEnergyWh,
        minimumBatteryPct: res.minimumBatteryPct,
        timeInIlluminationSeconds: res.timeInIlluminationSeconds,
        timeInShadowSeconds: res.timeInShadowSeconds,
        estimatedTravelTimeSeconds: res.estimatedTravelTimeSeconds,
        averageSlopeDeg: res.averageSlopeDeg,
        maxSlopeDeg: res.maxSlopeDeg,
        riskScore: res.riskScore,
        batteryRemainingPct: res.batteryRemainingPct,
        feasibility: res.feasibility,
        totalCost: res.totalMovementCost,
        nodesExplored: res.nodesExploredCount,
        computeTimeMs: res.computeTimeMs,
        success: res.success,
        path: res.path,
      });
    }

    const successfulRuns = comparisons.filter((c) => c.success && c.path.length > 0);

    let lowestEnergyStrategy: OptimizationStrategy | undefined;
    let bestSolarStrategy: OptimizationStrategy | undefined;
    let safestStrategy: OptimizationStrategy | undefined;
    let shortestDistanceStrategy: OptimizationStrategy | undefined;
    let fastestStrategy: OptimizationStrategy | undefined;
    let balancedStrategy: OptimizationStrategy | undefined;

    if (successfulRuns.length > 0) {
      lowestEnergyStrategy = [...successfulRuns].sort((a, b) => a.estimatedEnergyWh - b.estimatedEnergyWh)[0].strategy;
      bestSolarStrategy = [...successfulRuns].sort((a, b) => (b.solarEnergyGeneratedWh ?? 0) - (a.solarEnergyGeneratedWh ?? 0))[0]?.strategy;
      safestStrategy = [...successfulRuns].sort((a, b) => a.riskScore - b.riskScore || a.maxSlopeDeg - b.maxSlopeDeg)[0].strategy;
      shortestDistanceStrategy = [...successfulRuns].sort((a, b) => a.distanceMeters - b.distanceMeters)[0].strategy;
      fastestStrategy = [...successfulRuns].sort((a, b) => a.estimatedTravelTimeSeconds - b.estimatedTravelTimeSeconds)[0].strategy;
      balancedStrategy = 'BALANCED';
    }

    return {
      results,
      comparisons,
      lowestEnergyStrategy,
      bestSolarStrategy,
      safestStrategy,
      shortestDistanceStrategy,
      fastestStrategy,
      balancedStrategy,
    };
  }
}
