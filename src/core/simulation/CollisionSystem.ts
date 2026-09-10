import { RoverState, RoverConfig } from '@/types/rover';
import { TerrainGrid, TerrainCell } from '@/types/terrain';
import { Point2D } from '@/types/pathfinding';
import { normalizeAngle, angleDifference } from '@/lib/math';

export interface SensorScanResult {
  hasHazardAhead: boolean;
  closestHazardDistMeters: number;
  hazardCell?: TerrainCell;
  scannedCells: Point2D[];
}

export class CollisionSystem {
  /**
   * Scans forward LiDAR cone from rover position
   */
  public static scanLiDAR(
    state: RoverState,
    config: RoverConfig,
    grid: TerrainGrid
  ): SensorScanResult {
    const rangeCells = Math.ceil(config.sensorRangeMeters / grid.resolution);
    const halfFovRad = ((config.sensorFovDeg * 0.5) * Math.PI) / 180;
    const scannedCells: Point2D[] = [];

    let hasHazardAhead = false;
    let closestHazardDistMeters = Infinity;
    let hazardCell: TerrainCell | undefined = undefined;

    const minX = Math.max(0, Math.floor(state.x - rangeCells));
    const maxX = Math.min(grid.width - 1, Math.ceil(state.x + rangeCells));
    const minY = Math.max(0, Math.floor(state.y - rangeCells));
    const maxY = Math.min(grid.height - 1, Math.ceil(state.y + rangeCells));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - state.x;
        const dy = y - state.y;
        const distGrid = Math.hypot(dx, dy);
        const distMeters = distGrid * grid.resolution;

        if (distGrid === 0 || distMeters > config.sensorRangeMeters) continue;

        // Angle check against heading
        const angleToCell = normalizeAngle(Math.atan2(dy, dx));
        const diff = Math.abs(angleDifference(angleToCell, state.heading));

        if (diff <= halfFovRad) {
          scannedCells.push({ x, y });
          const cell = grid.cells[y][x];

          if (cell.isObstacle || cell.cost === Infinity || cell.slope >= 25.0) {
            hasHazardAhead = true;
            if (distMeters < closestHazardDistMeters) {
              closestHazardDistMeters = distMeters;
              hazardCell = cell;
            }
          }
        }
      }
    }

    return {
      hasHazardAhead,
      closestHazardDistMeters: hasHazardAhead ? Number(closestHazardDistMeters.toFixed(1)) : Infinity,
      hazardCell,
      scannedCells,
    };
  }

  /**
   * Checks for immediate bumper collision or rollover
   */
  public static checkCollision(
    state: RoverState,
    grid: TerrainGrid
  ): { isCrashed: boolean; isRollover: boolean; reason?: string } {
    const rx = Math.round(state.x);
    const ry = Math.round(state.y);

    if (rx < 0 || rx >= grid.width || ry < 0 || ry >= grid.height) {
      return { isCrashed: true, isRollover: false, reason: 'Rover traversed out of exploration bounds' };
    }

    const cell = grid.cells[ry][rx];
    if (cell.isObstacle) {
      return { isCrashed: true, isRollover: false, reason: 'Rover collided with impassable boulder or crater rim' };
    }

    // Rollover angle check (> 32° tilt)
    if (Math.abs(state.pitch) > 32.0 || Math.abs(state.roll) > 32.0) {
      return { isCrashed: true, isRollover: true, reason: 'Vehicle rollover on extreme slope gradient (> 32°)' };
    }

    return { isCrashed: false, isRollover: false };
  }
}
