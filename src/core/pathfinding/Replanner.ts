import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult, PathfindingOptions, AlgorithmType, ReplanTelemetry } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { DStarLitePathfinder } from './DStarLite';
import { TrajectoryCurves } from './TrajectoryCurves';
import { computeMultiObjectiveMetrics, resolveEffectiveWeights } from './PathfinderInterface';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

export class DynamicReplanner {
  private static astar = new AStarPathfinder();
  private static dstarLite = new DStarLitePathfinder();

  public static replan(
    grid: TerrainGrid,
    currentPos: Point2D,
    remainingPath: Point2D[],
    target: Point2D,
    optionsOrHazard?: PathfindingOptions | Point2D,
    algorithm: AlgorithmType = 'ASTAR',
    replanCount: number = 1
  ): PathfindingResult {
    const roundedPos: Point2D = {
      x: Math.min(Math.max(0, Math.round(currentPos.x)), grid.width - 1),
      y: Math.min(Math.max(0, Math.round(currentPos.y)), grid.height - 1),
    };

    let options: PathfindingOptions = {};
    let hazardPos: Point2D | undefined = undefined;

    if (optionsOrHazard) {
      if ('x' in optionsOrHazard && 'y' in optionsOrHazard && typeof optionsOrHazard.x === 'number' && typeof optionsOrHazard.y === 'number' && !('roverConfig' in optionsOrHazard)) {
        hazardPos = optionsOrHazard as Point2D;
      } else {
        options = optionsOrHazard as PathfindingOptions;
      }
    }

    const roverConfig = options.roverConfig ?? DEFAULT_ROVER_CONFIG;
    const { weights } = resolveEffectiveWeights(options);

    // Calculate length of the remaining path before replanning
    let pathLengthBeforeMeters = 0;
    for (let i = 0; i < remainingPath.length - 1; i++) {
      pathLengthBeforeMeters += Math.hypot(
        remainingPath[i + 1].x - remainingPath[i].x,
        remainingPath[i + 1].y - remainingPath[i].y
      ) * grid.resolution;
    }

    // Prepare blocked nodes array
    const customBlocked: Point2D[] = options.customBlockedNodes ? [...options.customBlockedNodes] : [];
    let nodesUpdated = 0;

    if (hazardPos) {
      customBlocked.push(hazardPos);
      nodesUpdated++;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const bx = hazardPos.x + dx;
          const by = hazardPos.y + dy;
          if (
            bx >= 0 && bx < grid.width &&
            by >= 0 && by < grid.height &&
            !(bx === roundedPos.x && by === roundedPos.y) &&
            !(bx === target.x && by === target.y)
          ) {
            const c = grid.cells[by][bx];
            if (c.isObstacle || c.slope >= 20.0 || c.roughness >= 1.8) {
              customBlocked.push({ x: bx, y: by });
              nodesUpdated++;
            }
          }
        }
      }
    }

    const cleanBlocked = customBlocked.filter(
      (b) => !(b.x === roundedPos.x && b.y === roundedPos.y) &&
             !(b.x === target.x && b.y === target.y && !grid.cells[target.y]?.[target.x]?.isObstacle)
    );

    const replanOptions: PathfindingOptions = {
      ...options,
      customBlockedNodes: cleanBlocked,
      blockedNodes: cleanBlocked.length > 0 ? cleanBlocked : undefined,
      roverConfig,
    };

    let result: PathfindingResult;

    if (algorithm === 'DSTAR_LITE') {
      const solverResult = this.dstarLite.findPath(grid, roundedPos, target, replanOptions);
      if (solverResult.success && solverResult.path.length > 0) {
        const curvedPath = TrajectoryCurves.generateCurvedTrajectory(grid, solverResult.path, replanOptions);
        const metrics = computeMultiObjectiveMetrics(grid, curvedPath, roverConfig, weights, replanOptions);
        result = {
          ...solverResult,
          path: curvedPath,
          optimizedPath: curvedPath,
          totalDistanceMeters: metrics.totalDistanceMeters,
          totalDistance: metrics.totalDistanceMeters,
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
        };
      } else {
        result = solverResult;
      }
    } else {
      // 1. Try local reconnection to a downstream waypoint
      let obstacleIdxInRemaining = -1;
      if (hazardPos && remainingPath.length > 0) {
        obstacleIdxInRemaining = remainingPath.findIndex((p) => {
          return Math.hypot(p.x - hazardPos.x, p.y - hazardPos.y) <= 1.8;
        });
      }

      const startSearchIdx = obstacleIdxInRemaining !== -1
        ? Math.min(obstacleIdxInRemaining + 2, remainingPath.length - 1)
        : Math.min(2, remainingPath.length - 1);

      let bestDetour: PathfindingResult | null = null;
      let reconnectIndex = -1;

      const spliceLookahead = Math.min(remainingPath.length - 1, startSearchIdx + 8);
      for (let i = startSearchIdx; i <= spliceLookahead; i++) {
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
      if (bestDetour && reconnectIndex !== -1) {
        finalRawPath = [
          ...bestDetour.path,
          ...remainingPath.slice(reconnectIndex + 1),
        ];
      } else {
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

      const curvedPath = TrajectoryCurves.generateCurvedTrajectory(grid, finalRawPath, replanOptions);
      const metrics = computeMultiObjectiveMetrics(grid, curvedPath, roverConfig, weights, replanOptions);

      result = {
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

    // Calculate length of the new path after replanning
    let pathLengthAfterMeters = 0;
    if (result.success && result.path.length > 1) {
      for (let i = 0; i < result.path.length - 1; i++) {
        pathLengthAfterMeters += Math.hypot(
          result.path[i + 1].x - result.path[i].x,
          result.path[i + 1].y - result.path[i].y
        ) * grid.resolution;
      }
    }

    const additionalDistanceMeters = Math.max(0, Number((pathLengthAfterMeters - pathLengthBeforeMeters).toFixed(2)));

    const replanTelemetry: ReplanTelemetry = {
      replansCount: replanCount,
      nodesUpdated,
      pathLengthBeforeMeters: Number(pathLengthBeforeMeters.toFixed(2)),
      pathLengthAfterMeters: Number(pathLengthAfterMeters.toFixed(2)),
      additionalDistanceMeters,
      hazardLocation: hazardPos,
      timestamp: Date.now(),
    };

    return {
      ...result,
      replanTelemetry,
    };
  }
}
