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
      return {
        updatedState: { ...state, x: targetPoint.x, y: targetPoint.y },
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
    let newVelocity = state.velocity;
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
    const newHeading = normalizeAngle(state.heading + steering * turnRateRad * dt);

    // Throttle acceleration
    const targetVelocity = throttle * config.maxSpeed;
    let newVelocity = state.velocity;

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

    const newX = clamp(state.x + Math.cos(newHeading) * moveDistGrid, 0, grid.width - 1);
    const newY = clamp(state.y + Math.sin(newHeading) * moveDistGrid, 0, grid.height - 1);

    const { pitch, roll } = this.calculatePitchRoll(newX, newY, newHeading, grid);

    return {
      ...state,
      x: newX,
      y: newY,
      heading: newHeading,
      velocity: newVelocity,
      pitch,
      roll,
      distanceTraveledMeters: state.distanceTraveledMeters + Math.abs(moveDistMeters),
    };
  }

  private static calculatePitchRoll(
    x: number,
    y: number,
    heading: number,
    grid: TerrainGrid
  ): { pitch: number; roll: number } {
    const r = 0.5; // Sampling radius in grid cells
    const fx = clamp(Math.round(x + Math.cos(heading) * r), 0, grid.width - 1);
    const fy = clamp(Math.round(y + Math.sin(heading) * r), 0, grid.height - 1);
    const bx = clamp(Math.round(x - Math.cos(heading) * r), 0, grid.width - 1);
    const by = clamp(Math.round(y - Math.sin(heading) * r), 0, grid.height - 1);

    const lx = clamp(Math.round(x + Math.cos(heading - Math.PI / 2) * r), 0, grid.width - 1);
    const ly = clamp(Math.round(y + Math.sin(heading - Math.PI / 2) * r), 0, grid.height - 1);
    const rx = clamp(Math.round(x + Math.cos(heading + Math.PI / 2) * r), 0, grid.width - 1);
    const ry = clamp(Math.round(y + Math.sin(heading + Math.PI / 2) * r), 0, grid.height - 1);

    const fElev = grid.cells[fy][fx].elevation;
    const bElev = grid.cells[by][bx].elevation;
    const lElev = grid.cells[ly][lx].elevation;
    const rElev = grid.cells[ry][rx].elevation;

    const pitchRad = Math.atan2(fElev - bElev, 2 * r * grid.resolution);
    const rollRad = Math.atan2(rElev - lElev, 2 * r * grid.resolution);

    return {
      pitch: Number(((pitchRad * 180) / Math.PI).toFixed(1)),
      roll: Number(((rollRad * 180) / Math.PI).toFixed(1)),
    };
  }
}
