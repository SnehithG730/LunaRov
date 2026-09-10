import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult, AlgorithmType, ReplanTelemetry } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { DStarLitePathfinder, DStarLiteEngine } from './DStarLite';
import { TrajectoryPlanner } from './TrajectoryPlanner';

export class DynamicReplanner {
  private static astar = new AStarPathfinder();
  private static dstarLite = new DStarLitePathfinder();

  public static replan(
    grid: TerrainGrid,
    currentPos: Point2D,
    remainingPath: Point2D[],
    target: Point2D,
    hazardPos?: Point2D,
    algorithm: AlgorithmType = 'DSTAR_LITE',
    replanCount: number = 1
  ): PathfindingResult {
    const roundedPos: Point2D = {
      x: Math.max(0, Math.min(grid.width - 1, Math.round(currentPos.x))),
      y: Math.max(0, Math.min(grid.height - 1, Math.round(currentPos.y))),
    };

    // Calculate length of the remaining path before replanning
    let pathLengthBeforeMeters = 0;
    for (let i = 0; i < remainingPath.length - 1; i++) {
      pathLengthBeforeMeters += Math.hypot(
        remainingPath[i + 1].x - remainingPath[i].x,
        remainingPath[i + 1].y - remainingPath[i].y
      ) * grid.resolution;
    }

    // Prepare blocked nodes array including the detected hazard and safety margin
    const blockedNodes: Point2D[] = [];
    let nodesUpdated = 0;

    if (hazardPos) {
      blockedNodes.push(hazardPos);
      nodesUpdated++;
      // Include 1-cell safety margin around the hazard if impassable or steep
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
              blockedNodes.push({ x: bx, y: by });
              nodesUpdated++;
            }
          }
        }
      }
    }

    const pathfindingOptions = {
      blockedNodes: blockedNodes.length > 0 ? blockedNodes : undefined,
      optimizePath: true,
    };

    let result: PathfindingResult;

    // Use D* Lite if requested or as primary dynamic solver
    if (algorithm === 'DSTAR_LITE') {
      const solverResult = this.dstarLite.findPath(grid, roundedPos, target, pathfindingOptions);
      if (solverResult.success && solverResult.path.length > 0) {
        const curvedPath = TrajectoryPlanner.generateCurvedTrajectory(grid, solverResult.path);
        result = {
          ...solverResult,
          path: curvedPath.length >= 2 ? curvedPath : solverResult.path,
        };
      } else {
        result = solverResult;
      }
    } else {
      // 1. Try local reconnection to a downstream waypoint strictly AFTER the hazard
      let obstacleIdxInRemaining = -1;
      if (hazardPos && remainingPath.length > 0) {
        obstacleIdxInRemaining = remainingPath.findIndex((p) => {
          return Math.hypot(p.x - hazardPos.x, p.y - hazardPos.y) <= 1.8;
        });
      }

      const startSearchIdx = obstacleIdxInRemaining !== -1
        ? Math.min(obstacleIdxInRemaining + 2, remainingPath.length - 1)
        : Math.min(4, Math.max(1, remainingPath.length - 1));

      let bestDetour: PathfindingResult | null = null;
      let reconnectIndex = -1;

      for (let i = startSearchIdx; i < remainingPath.length; i++) {
        const waypoint = remainingPath[i];
        const cell = grid.cells[waypoint.y]?.[waypoint.x];
        if (!cell || cell.isObstacle || cell.slope >= 20.0 || cell.roughness >= 1.8) continue;
        if (hazardPos && Math.hypot(waypoint.x - hazardPos.x, waypoint.y - hazardPos.y) <= 1.8) continue;

        const localResult = this.astar.findPath(grid, roundedPos, waypoint, pathfindingOptions);
        if (localResult.success && localResult.path.length > 0) {
          bestDetour = localResult;
          reconnectIndex = i;
          break;
        }
      }

      if (bestDetour && reconnectIndex !== -1) {
        const concatenatedPath = [
          ...bestDetour.path,
          ...remainingPath.slice(reconnectIndex + 1),
        ];
        const curvedPath = TrajectoryPlanner.generateCurvedTrajectory(grid, concatenatedPath);
        result = {
          ...bestDetour,
          path: curvedPath.length >= 2 ? curvedPath : concatenatedPath,
        };
      } else {
        const globalResult = this.astar.findPath(grid, roundedPos, target, pathfindingOptions);
        if (globalResult.success && globalResult.path.length > 0) {
          const curvedPath = TrajectoryPlanner.generateCurvedTrajectory(grid, globalResult.path);
          result = {
            ...globalResult,
            path: curvedPath.length >= 2 ? curvedPath : globalResult.path,
          };
        } else {
          result = globalResult;
        }
      }
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
