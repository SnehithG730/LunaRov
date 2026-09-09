import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { TrajectoryPlanner } from './TrajectoryPlanner';

export class DynamicReplanner {
  private static astar = new AStarPathfinder();

  public static replan(
    grid: TerrainGrid,
    currentPos: Point2D,
    remainingPath: Point2D[],
    target: Point2D,
    hazardPos?: Point2D
  ): PathfindingResult {
    const roundedPos: Point2D = {
      x: Math.round(currentPos.x),
      y: Math.round(currentPos.y),
    };

    // Prepare blocked nodes array including the detected hazard and adjacent impassable cells
    const blockedNodes: Point2D[] = [];
    if (hazardPos) {
      blockedNodes.push(hazardPos);
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
            }
          }
        }
      }
    }

    const pathfindingOptions = {
      blockedNodes: blockedNodes.length > 0 ? blockedNodes : undefined,
    };

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

    // 2. If a local splice was found, concatenate detour with the remainder of the path
    if (bestDetour && reconnectIndex !== -1) {
      const concatenatedPath = [
        ...bestDetour.path,
        ...remainingPath.slice(reconnectIndex + 1),
      ];

      // Smooth corners into safe curves along with straight segments
      const curvedPath = TrajectoryPlanner.generateCurvedTrajectory(grid, concatenatedPath);

      return {
        ...bestDetour,
        path: curvedPath.length >= 2 ? curvedPath : concatenatedPath,
      };
    }

    // 3. Fallback: Full global replan from current position to goal with blocked hazard
    const globalResult = this.astar.findPath(grid, roundedPos, target, pathfindingOptions);
    if (globalResult.success && globalResult.path.length > 0) {
      const curvedPath = TrajectoryPlanner.generateCurvedTrajectory(grid, globalResult.path);
      return {
        ...globalResult,
        path: curvedPath.length >= 2 ? curvedPath : globalResult.path,
      };
    }

    return globalResult;
  }
}
