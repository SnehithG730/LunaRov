import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingResult } from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';

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

    // 1. Try local reconnection to a downstream waypoint on the original trajectory
    // Search from index 4 forward to avoid rerouting right into the obstacle
    let bestDetour: PathfindingResult | null = null;
    let reconnectIndex = -1;

    for (let i = Math.min(5, remainingPath.length - 1); i < remainingPath.length; i++) {
      const waypoint = remainingPath[i];
      const cell = grid.cells[waypoint.y]?.[waypoint.x];
      if (!cell || cell.isObstacle || cell.slope >= 20.0 || cell.roughness >= 1.8) continue;
      if (hazardPos && waypoint.x === hazardPos.x && waypoint.y === hazardPos.y) continue;

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

      return {
        ...bestDetour,
        path: concatenatedPath,
      };
    }

    // 3. Fallback: Full global replan from current position to goal with blocked hazard
    return this.astar.findPath(grid, roundedPos, target, pathfindingOptions);
  }
}
