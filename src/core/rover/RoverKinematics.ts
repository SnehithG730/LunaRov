import { RoverConfig, RoverState } from '@/types/rover';
import { TerrainGrid } from '@/types/terrain';
import { Point2D } from '@/types/pathfinding';
import { clamp, normalizeAngle, angleDifference } from '@/lib/math';

export class RoverKinematics {
  /**
   * Advances the rover state towards a target point along the planned trajectory
   */
  public static updateAutonomous(
    state: RoverState,
    config: RoverConfig,
    targetPoint: Point2D,
    grid: TerrainGrid,
    dt: number
  ): { updatedState: RoverState; reachedWaypoint: boolean } {
    const gridRes = grid.resolution;
    const targetMeters = {
      x: targetPoint.x * gridRes,
      y: targetPoint.y * gridRes,
    };
    const currentMeters = {
      x: state.x * gridRes,
      y: state.y * gridRes,
    };

    const dx = targetMeters.x - currentMeters.x;
    const dy = targetMeters.y - currentMeters.y;
    const distToTarget = Math.hypot(dx, dy);

    // Waypoint capture radius (within 0.35 cell resolution)
    if (distToTarget < gridRes * 0.35) {
      const { pitch, roll } = this.calculatePitchRoll(targetPoint.x, targetPoint.y, state.heading, grid);
      return {
        updatedState: {
          ...state,
          x: targetPoint.x,
          y: targetPoint.y,
          pitch,
          roll,
        },
        reachedWaypoint: true,
      };
    }

    // Desired heading angle
    const targetHeading = normalizeAngle(Math.atan2(dy, dx));
    const headingDiff = angleDifference(targetHeading, state.heading);

    // Turn rate limit
    const maxTurnRad = (config.turningRate * Math.PI) / 180 * dt;
    const turnAmount = clamp(headingDiff, -maxTurnRad, maxTurnRad);
    const newHeading = normalizeAngle(state.heading + turnAmount);

    // Speed scaling: slow down during sharp turns
    const turnSharpness = Math.abs(headingDiff) / Math.PI; // 0 (straight) to 1 (reversal)
    const turnSpeedFactor = Math.max(0.25, 1.0 - turnSharpness * 0.7);

    // Current cell terrain
    const curX = clamp(Math.round(state.x), 0, grid.width - 1);
    const curY = clamp(Math.round(state.y), 0, grid.height - 1);
    const cell = grid.cells[curY][curX];

    // Wheel slippage on steep terrain (> 14°)
    let slipFactor = 1.0;
    if (cell.slope > 14.0) {
      slipFactor = Math.max(0.4, 1.0 - (cell.slope - 14.0) * 0.04);
    }

    const targetSpeed = config.maxSpeed * turnSpeedFactor * slipFactor;

    // Linear acceleration
    let currentVel = isNaN(state.velocity) || state.velocity === undefined ? (state.speed ?? 0) : state.velocity;
    let newVelocity = currentVel;
    if (newVelocity < targetSpeed) {
      newVelocity = Math.min(targetSpeed, newVelocity + config.acceleration * dt);
    } else if (newVelocity > targetSpeed) {
      newVelocity = Math.max(targetSpeed, newVelocity - config.acceleration * 1.5 * dt);
    }

    // Advance position
    const moveDistMeters = newVelocity * dt;
    const moveDistGrid = moveDistMeters / gridRes;

    const newX = clamp(state.x + Math.cos(newHeading) * moveDistGrid, 0, grid.width - 1);
    const newY = clamp(state.y + Math.sin(newHeading) * moveDistGrid, 0, grid.height - 1);

    // Inclinometer: calculate pitch (along heading) and roll (orthogonal to heading)
    const { pitch, roll } = this.calculatePitchRoll(newX, newY, newHeading, grid);

    return {
      updatedState: {
        ...state,
        x: newX,
        y: newY,
        heading: newHeading,
        velocity: newVelocity,
        speed: newVelocity,
        pitch,
        roll,
        distanceTraveledMeters: state.distanceTraveledMeters + moveDistMeters,
      },
      reachedWaypoint: false,
    };
  }

  /**
   * Advances rover state in manual control mode given steering & throttle inputs
   */
  public static updateManual(
    state: RoverState,
    config: RoverConfig,
    throttle: number, // -1.0 (reverse) to +1.0 (forward)
    steering: number, // -1.0 (left) to +1.0 (right)
    grid: TerrainGrid,
    dt: number
  ): RoverState {
    const gridRes = grid.resolution;

    // Steering rotation
    const turnRateRad = (config.turningRate * Math.PI) / 180;
    const currentHeading = isNaN(state.heading) || state.heading === undefined ? 0 : state.heading;
    const newHeading = normalizeAngle(currentHeading + steering * turnRateRad * dt);

    // Throttle acceleration
    const targetVelocity = throttle * config.maxSpeed;
    let currentVel = isNaN(state.velocity) || state.velocity === undefined ? (state.speed ?? 0) : state.velocity;
    let newVelocity = currentVel;

    if (throttle !== 0) {
      if (Math.sign(throttle) === Math.sign(newVelocity) || newVelocity === 0) {
        newVelocity += Math.sign(throttle) * config.acceleration * dt;
        if (Math.abs(newVelocity) > Math.abs(targetVelocity)) {
          newVelocity = targetVelocity;
        }
      } else {
        // Braking / reversing
        newVelocity += Math.sign(throttle) * config.acceleration * 2.0 * dt;
      }
    } else {
      // Natural rolling deceleration
      const frictionDecel = 0.8 * dt;
      if (Math.abs(newVelocity) <= frictionDecel) {
        newVelocity = 0;
      } else {
        newVelocity -= Math.sign(newVelocity) * frictionDecel;
      }
    }

    const moveDistMeters = newVelocity * dt;
    const moveDistGrid = moveDistMeters / gridRes;

    const currentX = isNaN(state.x) || state.x === undefined ? 0 : state.x;
    const currentY = isNaN(state.y) || state.y === undefined ? 0 : state.y;
    const newX = clamp(currentX + Math.cos(newHeading) * moveDistGrid, 0, grid.width - 1);
    const newY = clamp(currentY + Math.sin(newHeading) * moveDistGrid, 0, grid.height - 1);

    const { pitch, roll } = this.calculatePitchRoll(newX, newY, newHeading, grid);

    return {
      ...state,
      x: newX,
      y: newY,
      heading: newHeading,
      velocity: newVelocity,
      speed: newVelocity,
      pitch,
      roll,
      distanceTraveledMeters: (state.distanceTraveledMeters || 0) + Math.abs(moveDistMeters),
    };
  }

  private static getInterpolatedElevation(x: number, y: number, grid: TerrainGrid): number {
    const gx = clamp(x, 0, grid.width - 1);
    const gy = clamp(y, 0, grid.height - 1);
    const x0 = Math.floor(gx);
    const x1 = Math.min(grid.width - 1, x0 + 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(grid.height - 1, y0 + 1);

    const tx = gx - x0;
    const ty = gy - y0;

    const e00 = grid.cells[y0]?.[x0]?.elevation ?? 0;
    const e10 = grid.cells[y0]?.[x1]?.elevation ?? 0;
    const e01 = grid.cells[y1]?.[x0]?.elevation ?? 0;
    const e11 = grid.cells[y1]?.[x1]?.elevation ?? 0;

    const top = e00 * (1 - tx) + e10 * tx;
    const bottom = e01 * (1 - tx) + e11 * tx;

    return top * (1 - ty) + bottom * ty;
  }

  private static calculatePitchRoll(
    x: number,
    y: number,
    heading: number,
    grid: TerrainGrid
  ): { pitch: number; roll: number } {
    const validX = isNaN(x) || !isFinite(x) ? 0 : x;
    const validY = isNaN(y) || !isFinite(y) ? 0 : y;
    const validH = isNaN(heading) || !isFinite(heading) ? 0 : heading;

    const r = 0.75; // Sampling radius in grid cells (1.5m baseline for rover chassis)
    const fx = validX + Math.cos(validH) * r;
    const fy = validY + Math.sin(validH) * r;
    const bx = validX - Math.cos(validH) * r;
    const by = validY - Math.sin(validH) * r;

    const lx = validX + Math.cos(validH - Math.PI / 2) * r;
    const ly = validY + Math.sin(validH - Math.PI / 2) * r;
    const rx = validX + Math.cos(validH + Math.PI / 2) * r;
    const ry = validY + Math.sin(validH + Math.PI / 2) * r;

    const fElev = this.getInterpolatedElevation(fx, fy, grid);
    const bElev = this.getInterpolatedElevation(bx, by, grid);
    const lElev = this.getInterpolatedElevation(lx, ly, grid);
    const rElev = this.getInterpolatedElevation(rx, ry, grid);

    const distBaseline = 2 * r * grid.resolution;
    const pitchRad = Math.atan2(fElev - bElev, distBaseline);
    const rollRad = Math.atan2(rElev - lElev, distBaseline);

    return {
      pitch: Number(((pitchRad * 180) / Math.PI).toFixed(1)),
      roll: Number(((rollRad * 180) / Math.PI).toFixed(1)),
    };
  }
}
