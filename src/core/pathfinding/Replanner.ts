import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';

export class DynamicReplanner {
  private static astar = new AStarPathfinder();

  public static replan(
    grid: TerrainGrid,
    currentPos: Point2D,
    remainingPath: Point2D[],
    target: Point2D
  ): PathfindingResult {
    const roundedPos: Point2D = {
      x: Math.round(currentPos.x),
      y: Math.round(currentPos.y),
    };

    // 1. Try local reconnection to a downstream waypoint on the original trajectory
    // Search from index 4 forward to avoid rerouting right into the obstacle
    let bestDetour: PathfindingResult | null = null;
    let reconnectIndex = -1;

    for (let i = Math.min(5, remainingPath.length - 1); i < remainingPath.length; i++) {
      const waypoint = remainingPath[i];
      if (grid.cells[waypoint.y][waypoint.x].isObstacle) continue;

      const localResult = this.astar.findPath(grid, roundedPos, waypoint);
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

      return {
        ...bestDetour,
        path: concatenatedPath,
      };
    }

    // 3. Fallback: Full global replan from current position to goal
    return this.astar.findPath(grid, roundedPos, target);
  }
}
