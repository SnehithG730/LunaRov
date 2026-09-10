import { TerrainGrid } from '@/types/terrain';
import { Point2D } from '@/types/pathfinding';

export interface TrajectoryPlannerOptions {
  curveSubdivisions?: number;
  maxFilletRadius?: number;
  safetyMarginMeters?: number;
}

export class TrajectoryPlanner {
  /**
   * Generates a hybrid lunar rover trajectory that blends straight-line paths
   * across open regolith with smooth, safe curvature arcs around obstacles,
   * crater rims, and direction changes.
   */
  public static generateCurvedTrajectory(
    grid: TerrainGrid,
    path: Point2D[],
    options: TrajectoryPlannerOptions = {}
  ): Point2D[] {
    if (!path || path.length < 3) {
      return path ? [...path] : [];
    }

    const maxRadius = options.maxFilletRadius ?? 1.5;
    const subdivisions = options.curveSubdivisions ?? 3;
    const result: Point2D[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const pPrev = path[i - 1];
      const pCurr = path[i];
      const pNext = path[i + 1];

      // Vectors into and out of current corner
      const vInX = pCurr.x - pPrev.x;
      const vInY = pCurr.y - pPrev.y;
      const dIn = Math.hypot(vInX, vInY);

      const vOutX = pNext.x - pCurr.x;
      const vOutY = pNext.y - pCurr.y;
      const dOut = Math.hypot(vOutX, vOutY);

      if (dIn < 0.001 || dOut < 0.001) {
        result.push(pCurr);
        continue;
      }

      // Unit vectors
      const uInX = vInX / dIn;
      const uInY = vInY / dIn;

      const uOutX = vOutX / dOut;
      const uOutY = vOutY / dOut;

      // Collinear check (dot product close to 1 means straight line)
      const dot = uInX * uOutX + uInY * uOutY;
      if (dot > 0.97) {
        // Straight line, no curve required
        result.push(pCurr);
        continue;
      }

      // Reverse direction check (dot close to -1)
      if (dot < -0.95) {
        result.push(pCurr);
        continue;
      }

      // Compute safe fillet radius (cannot exceed 42% of adjacent segment lengths)
      const r = Math.min(maxRadius, dIn * 0.42, dOut * 0.42);
      if (r < 0.3) {
        result.push(pCurr);
        continue;
      }

      // Curve entry point A and exit point B
      const pA: Point2D = {
        x: Number((pCurr.x - uInX * r).toFixed(3)),
        y: Number((pCurr.y - uInY * r).toFixed(3)),
      };
      const pB: Point2D = {
        x: Number((pCurr.x + uOutX * r).toFixed(3)),
        y: Number((pCurr.y + uOutY * r).toFixed(3)),
      };

      // Generate intermediate Bézier curve arc points: B(t) = (1-t)^2 A + 2(1-t)t C + t^2 B
      const curvePoints: Point2D[] = [];
      let isCurveSafe = true;

      const step = 1 / (subdivisions + 1);
      for (let s = 1; s <= subdivisions; s++) {
        const t = s * step;
        const oneMinusT = 1 - t;
        const b0 = oneMinusT * oneMinusT;
        const b1 = 2 * oneMinusT * t;
        const b2 = t * t;

        const cx = b0 * pA.x + b1 * pCurr.x + b2 * pB.x;
        const cy = b0 * pA.y + b1 * pCurr.y + b2 * pB.y;

        // Verify terrain obstacle and slope safety for this curved arc point
        const gridX = Math.round(cx);
        const gridY = Math.round(cy);

        if (gridX < 0 || gridX >= grid.width || gridY < 0 || gridY >= grid.height) {
          isCurveSafe = false;
          break;
        }

        const cell = grid.cells[gridY][gridX];
        if (cell.isObstacle || cell.slope >= 22.0 || cell.cost === Infinity) {
          isCurveSafe = false;
          break;
        }

        // Verify clearance from nearby obstacle/hazard cells (minimum clearance margin)
        const minClearanceMeters = options.safetyMarginMeters ?? 1.5;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
              const nCell = grid.cells[ny][nx];
              if (nCell.isObstacle || nCell.slope >= 22.0 || nCell.cost === Infinity) {
                const distToObs = Math.hypot(cx - nx, cy - ny) * grid.resolution;
                if (distToObs < minClearanceMeters) {
                  isCurveSafe = false;
                  break;
                }
              }
            }
          }
          if (!isCurveSafe) break;
        }

        curvePoints.push({
          x: Number(cx.toFixed(3)),
          y: Number(cy.toFixed(3)),
        });
      }

      if (isCurveSafe && curvePoints.length > 0) {
        // Add entry point, curved points, and exit point
        result.push(pA);
        result.push(...curvePoints);
        result.push(pB);
      } else {
        // Fall back safely to original corner waypoint if curve encroaches on an obstacle
        result.push(pCurr);
      }
    }

    result.push(path[path.length - 1]);
    return result;
  }
}
