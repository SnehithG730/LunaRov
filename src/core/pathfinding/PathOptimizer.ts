import { TerrainGrid, TerrainCell } from '@/types/terrain';
import { Point2D, PathfindingOptions } from '@/types/pathfinding';
import { isCellBlocked, resolveCellCost } from './PathfinderInterface';
import { TrajectoryCurves } from './TrajectoryCurves';

export class PathOptimizer {
  /**
   * Optimizes a discrete grid path by pruning unnecessary intermediate points
   * using line-of-sight raycasting while strictly preserving obstacle avoidance
   * and terrain slope constraints.
   */
  public static optimizePath(
    grid: TerrainGrid,
    rawPath: Point2D[],
    options: PathfindingOptions = {}
  ): Point2D[] {
    if (rawPath.length <= 2) {
      return [...rawPath];
    }

    const optimized: Point2D[] = [rawPath[0]];
    let currentIdx = 0;

    while (currentIdx < rawPath.length - 1) {
      // Find the furthest reachable waypoint along direct line-of-sight
      let furthestIdx = currentIdx + 1;

      for (let testIdx = rawPath.length - 1; testIdx > currentIdx + 1; testIdx--) {
        if (this.hasLineOfSight(grid, rawPath[currentIdx], rawPath[testIdx], options)) {
          furthestIdx = testIdx;
          break;
        }
      }

      optimized.push(rawPath[furthestIdx]);
      currentIdx = furthestIdx;
    }

    return optimized;
  }

  /**
   * Generates a collision-safe, continuous curved trajectory from waypoints.
   */
  public static smoothCurvedPath(
    grid: TerrainGrid,
    waypoints: Point2D[],
    options: PathfindingOptions = {}
  ): Point2D[] {
    return TrajectoryCurves.generateCurvedTrajectory(grid, waypoints, options);
  }

  /**
   * Determines whether an unobstructed, traversable line-of-sight exists
   * between two points on the terrain grid using a Bresenham raycast.
   */
  public static hasLineOfSight(
    grid: TerrainGrid,
    from: Point2D,
    to: Point2D,
    options: PathfindingOptions = {}
  ): boolean {
    const x0 = from.x;
    const y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;
    let prevCell: TerrainCell | null = null;

    while (true) {
      // Check grid bounds
      if (cx < 0 || cx >= grid.width || cy < 0 || cy >= grid.height) {
        return false;
      }

      const cell = grid.cells[cy][cx];

      // 1. Check blocked nodes and obstacles (Craters / Boulders)
      if (isCellBlocked(cell, options)) {
        return false;
      }

      // 2. Check cost threshold (Danger cost 10 is acceptable if walkable, but slope > 22° is blocked for shortcuts)
      const cost = resolveCellCost(cell, options);
      if (cost >= Infinity || cell.slope >= 22.0) {
        return false;
      }

      // 3. Preserve elevation difference constraints between consecutive ray steps
      if (prevCell) {
        const elevationDiff = Math.abs(cell.elevation - prevCell.elevation);
        if (elevationDiff > 3.5) {
          return false; // Excessive vertical step along shortcut
        }
      }

      // Destination reached
      if (cx === x1 && cy === y1) {
        break;
      }

      prevCell = cell;

      const e2 = 2 * err;
      let stepX = false;
      let stepY = false;

      if (e2 > -dy) {
        err -= dy;
        cx += sx;
        stepX = true;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
        stepY = true;
      }

      // Check diagonal corner cutting: if stepping diagonally, both adjacent orthos must not be blocked
      if (stepX && stepY) {
        const adj1X = cx - sx;
        const adj1Y = cy;
        const adj2X = cx;
        const adj2Y = cy - sy;

        if (
          adj1X >= 0 && adj1X < grid.width && adj1Y >= 0 && adj1Y < grid.height &&
          adj2X >= 0 && adj2X < grid.width && adj2Y >= 0 && adj2Y < grid.height
        ) {
          const adj1 = grid.cells[adj1Y][adj1X];
          const adj2 = grid.cells[adj2Y][adj2X];
          if (isCellBlocked(adj1, options) && isCellBlocked(adj2, options)) {
            return false;
          }
        }
      }
    }

    return true;
  }
}
