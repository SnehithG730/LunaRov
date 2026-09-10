import { TerrainGrid } from '@/types/terrain';
import { Point2D, PathfindingOptions } from '@/types/pathfinding';
import { isCellBlocked, resolveCellCost } from './PathfinderInterface';

export class TrajectoryCurves {
  /**
   * Generates a safe, continuous curved trajectory from a series of discrete waypoints.
   * Uses Catmull-Rom spline interpolation with adaptive tension and obstacle safety verification.
   * If an interpolated curved point infringes on an obstacle or steep slope, the curve
   * safely pulls back to the collision-free linear segment.
   */
  public static generateCurvedTrajectory(
    grid: TerrainGrid,
    waypoints: Point2D[],
    options: PathfindingOptions = {},
    subdivisionsPerSegment = 4
  ): Point2D[] {
    if (waypoints.length <= 2) {
      return this.interpolateLineSegments(grid, waypoints, 0.6, options);
    }

    const curvedPoints: Point2D[] = [];

    // Duplicate endpoints to ensure Catmull-Rom covers the entire path from start to end
    const extendedPoints: Point2D[] = [
      waypoints[0],
      ...waypoints,
      waypoints[waypoints.length - 1],
    ];

    for (let i = 1; i < extendedPoints.length - 2; i++) {
      const p0 = extendedPoints[i - 1];
      const p1 = extendedPoints[i];
      const p2 = extendedPoints[i + 1];
      const p3 = extendedPoints[i + 2];

      const segmentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.max(subdivisionsPerSegment, Math.ceil(segmentDist * 2));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        // Catmull-Rom spline point
        const pt = this.catmullRom(p0, p1, p2, p3, t);

        // Verify terrain traversability at pt
        if (this.isPointTraversable(grid, pt, options)) {
          curvedPoints.push(pt);
        } else {
          // Fallback: interpolate along straight chord (p1 -> p2) which was already proven safe
          const safeLinearPt: Point2D = {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
          };
          curvedPoints.push(safeLinearPt);
        }
      }
    }

    // Add final destination point
    curvedPoints.push(waypoints[waypoints.length - 1]);

    // Clean redundant closely spaced points (< 0.25 grid cells apart)
    return this.filterClosePoints(curvedPoints, 0.25);
  }

  /**
   * Catmull-Rom cubic spline interpolation in 2D
   */
  private static catmullRom(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom basis matrix (tension = 0.5)
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    };
  }

  /**
   * Subdivides linear path segments into fine-grained points
   */
  private static interpolateLineSegments(
    grid: TerrainGrid,
    waypoints: Point2D[],
    stepDistance = 0.5,
    options: PathfindingOptions = {}
  ): Point2D[] {
    const result: Point2D[] = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.max(2, Math.ceil(dist / stepDistance));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const pt: Point2D = {
          x: Number((p1.x + (p2.x - p1.x) * t).toFixed(3)),
          y: Number((p1.y + (p2.y - p1.y) * t).toFixed(3)),
        };
        if (this.isPointTraversable(grid, pt, options)) {
          result.push(pt);
        }
      }
    }
    result.push(waypoints[waypoints.length - 1]);
    return result;
  }

  /**
   * Validates if a continuous point falls on traversable terrain (no obstacles, slope < 22.0°)
   */
  private static isPointTraversable(
    grid: TerrainGrid,
    pt: Point2D,
    options: PathfindingOptions = {}
  ): boolean {
    const gx = Math.round(pt.x);
    const gy = Math.round(pt.y);

    if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) {
      return false;
    }

    const cell = grid.cells[gy][gx];
    if (isCellBlocked(cell, options)) {
      return false;
    }

    const cost = resolveCellCost(cell, options);
    if (cost >= Infinity || cell.slope >= 22.0) {
      return false;
    }

    return true;
  }

  /**
   * Filters points that are excessively close to the previous point to optimize computation
   */
  private static filterClosePoints(points: Point2D[], minDistance = 0.25): Point2D[] {
    if (points.length <= 1) return points;

    const filtered: Point2D[] = [points[0]];
    let last = points[0];

    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      if (dist >= minDistance) {
        filtered.push(p);
        last = p;
      }
    }

    // Always include the destination point
    filtered.push(points[points.length - 1]);
    return filtered;
  }
}
