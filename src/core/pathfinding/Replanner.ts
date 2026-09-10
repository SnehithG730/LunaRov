import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult, PathfindingOptions } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { TrajectoryCurves } from './TrajectoryCurves';
import { computeMultiObjectiveMetrics, resolveEffectiveWeights } from './PathfinderInterface';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

export class DynamicReplanner {
  private static astar = new AStarPathfinder();

  public static replan(
    grid: TerrainGrid,
    currentPos: Point2D,
    remainingPath: Point2D[],
    target: Point2D,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const roundedPos: Point2D = {
      x: Math.min(Math.max(0, Math.round(currentPos.x)), grid.width - 1),
      y: Math.min(Math.max(0, Math.round(currentPos.y)), grid.height - 1),
    };

    const roverConfig = options.roverConfig ?? DEFAULT_ROVER_CONFIG;
    const { weights } = resolveEffectiveWeights(options);

    // Build custom blocked nodes set including any detected hazards and a 1-cell safety margin
    const customBlocked = options.customBlockedNodes ? [...options.customBlockedNodes] : [];

    // Ensure start node itself is not considered blocked for replan origin
    const cleanBlocked = customBlocked.filter(
      (b) => !(b.x === roundedPos.x && b.y === roundedPos.y)
    );

    const replanOptions: PathfindingOptions = {
      ...options,
      customBlockedNodes: cleanBlocked,
      roverConfig,
    };

    // 1. Try to find a quick local detour spliced back into the original path 3-8 waypoints ahead
    let bestDetour: PathfindingResult | null = null;
    let reconnectIndex = -1;

    const spliceLookahead = Math.min(remainingPath.length - 1, 8);
    for (let i = Math.min(2, remainingPath.length - 1); i <= spliceLookahead; i++) {
      const candidateTarget = remainingPath[i];
      const cell = grid.cells[candidateTarget.y]?.[candidateTarget.x];
      if (!cell || cell.isObstacle || cell.slope >= 22.0) continue;
      if (cleanBlocked.some((b) => b.x === candidateTarget.x && b.y === candidateTarget.y)) continue;

      const localResult = this.astar.findPath(grid, roundedPos, candidateTarget, {
        ...replanOptions,
        optimizePath: false,
      });

      if (localResult.success && localResult.path.length > 0) {
        bestDetour = localResult;
        reconnectIndex = i;
        break;
      }
    }

    let finalRawPath: Point2D[] = [];

    // 2. If a local splice was found, concatenate detour with the remainder of the path
    if (bestDetour && reconnectIndex !== -1) {
      finalRawPath = [
        ...bestDetour.path,
        ...remainingPath.slice(reconnectIndex + 1),
      ];
    } else {
      // 3. Fallback: Full global replan from current position to goal
      const globalResult = this.astar.findPath(grid, roundedPos, target, replanOptions);
      if (globalResult.success && globalResult.path.length > 0) {
        finalRawPath = globalResult.path;
      }
    }

    if (finalRawPath.length === 0) {
      return {
        algorithm: 'ASTAR',
        path: [],
        rawPath: [],
        optimizedPath: [],
        exploredNodes: [],
        totalDistanceMeters: 0,
        totalDistance: 0,
        totalMovementCost: 0,
        nodesEvaluated: 0,
        nodesExploredCount: 0,
        executionTimeMs: 0,
        computeTimeMs: 0,
        success: false,
        failureReason: 'No traversable detour route exists around obstacle.',
        estimatedEnergyWh: 0,
        estimatedTravelTimeSeconds: 0,
        averageSlopeDeg: 0,
        maxSlopeDeg: 0,
        riskScore: 0,
        batteryRemainingPct: 100,
        feasibility: 'INFEASIBLE',
        feasibilityWarning: 'No valid replan detour found.',
        costBreakdown: {
          distanceCost: 0,
          energyCost: 0,
          slopeCost: 0,
          riskCost: 0,
          timeCost: 0,
          totalWeightedCost: 0,
        },
      };
    }

    // 4. Generate smooth curved detour trajectory
    const curvedPath = TrajectoryCurves.generateCurvedTrajectory(grid, finalRawPath, replanOptions);

    const metrics = computeMultiObjectiveMetrics(grid, curvedPath, roverConfig, weights, replanOptions);

    return {
      algorithm: 'ASTAR',
      path: curvedPath,
      rawPath: finalRawPath,
      optimizedPath: curvedPath,
      exploredNodes: bestDetour ? bestDetour.exploredNodes : [],
      totalDistanceMeters: metrics.totalDistanceMeters,
      totalDistance: metrics.totalDistanceMeters,
      totalMovementCost: metrics.totalMovementCost,
      nodesEvaluated: bestDetour ? bestDetour.nodesEvaluated : 0,
      nodesExploredCount: bestDetour ? bestDetour.nodesExploredCount : 0,
      executionTimeMs: bestDetour ? bestDetour.executionTimeMs : 0,
      computeTimeMs: bestDetour ? bestDetour.computeTimeMs : 0,
      success: true,
      estimatedEnergyWh: metrics.estimatedEnergyWh,
      solarEnergyGeneratedWh: metrics.solarEnergyGeneratedWh,
      netEnergyWh: metrics.netEnergyWh,
      minimumBatteryPct: metrics.minimumBatteryPct,
      timeInIlluminationSeconds: metrics.timeInIlluminationSeconds,
      timeInShadowSeconds: metrics.timeInShadowSeconds,
      estimatedTravelTimeSeconds: metrics.estimatedTravelTimeSeconds,
      averageSlopeDeg: metrics.averageSlopeDeg,
      maxSlopeDeg: metrics.maxSlopeDeg,
      riskScore: metrics.riskScore,
      batteryRemainingPct: metrics.batteryRemainingPct,
      feasibility: metrics.feasibility,
      feasibilityWarning: metrics.feasibilityWarning,
      costBreakdown: metrics.costBreakdown,
      visualizationData: {
        waypoints: curvedPath,
        exploredSequence: bestDetour ? bestDetour.exploredNodes : [],
        segments: metrics.segments,
      },
    };
  }
}
