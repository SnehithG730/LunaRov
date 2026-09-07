import { RoverConfig, RoverState, TelemetryPoint } from '@/types/rover';
import { TerrainGrid, TerrainCell } from '@/types/terrain';
import { Point2D } from '@/types/pathfinding';
import { SimulationStatus, MissionEvent } from '@/types/mission';
import { RoverKinematics } from './RoverKinematics';
import { EnergyModel } from './EnergyModel';
import { CollisionSystem, SensorScanResult } from '@/core/simulation/CollisionSystem';
import { DynamicReplanner } from '@/core/pathfinding/Replanner';
import { clamp } from '@/lib/math';

export interface ManualControlsInput {
  throttle: number; // -1.0 to +1.0
  steering: number; // -1.0 to +1.0
  brake?: boolean;   // Emergency stop / space bar
}

export interface SimulationStepInput {
  state: RoverState;
  config: RoverConfig;
  terrain: TerrainGrid;
  activePath: Point2D[];
  currentWaypointIndex: number;
  targetPoint: Point2D;
  dtSeconds: number;
  manualControls?: ManualControlsInput;
  rerouteCount: number;
  isAutonomous: boolean;
}

export interface SimulationStepResult {
  updatedState: RoverState;
  nextWaypointIndex: number;
  activePath: Point2D[];
  simulationStatus: SimulationStatus;
  sensorScan: SensorScanResult;
  newEvents: MissionEvent[];
  rerouteCount: number;
  telemetry: TelemetryPoint;
  isFinished: boolean;
  finishOutcome?: 'SUCCESS' | 'OBSTACLE_COLLISION' | 'BATTERY_DEPLETED' | 'ABORTED';
}

/**
 * Standalone Rover Simulation Engine
 * Completely decoupled from React and Three.js rendering loops.
 * Deterministic for identical terrain, configuration, and time delta.
 */
export class RoverSimulationEngine {
  /**
   * Performs a single discrete deterministic simulation step
   */
  public static step(input: SimulationStepInput): SimulationStepResult {
    const {
      state,
      config,
      terrain,
      activePath,
      currentWaypointIndex,
      targetPoint,
      dtSeconds,
      manualControls,
      rerouteCount,
      isAutonomous,
    } = input;

    const newEvents: MissionEvent[] = [];
    let updatedPath = [...activePath];
    let nextWaypointIdx = currentWaypointIndex;
    let nextRerouteCount = rerouteCount;
    let currentStatus: SimulationStatus = state.missionStatus || 'RUNNING';

    // Store previous position before updating coordinates
    const prevPos: Point2D = { x: state.x, y: state.y };
    let updatedState: RoverState = {
      ...state,
      previousPosition: prevPos,
    };

    // 1. Continuous LiDAR Sensor Scan
    const scan = CollisionSystem.scanLiDAR(updatedState, config, terrain);

    // 2. Collision & Rollover Verification (rover must not pass through blocked terrain)
    const collision = CollisionSystem.checkCollision(updatedState, terrain);
    if (collision.isCrashed) {
      updatedState.hasCrashed = true;
      updatedState.velocity = 0;
      updatedState.speed = 0;
      updatedState.missionStatus = 'FAILED';

      newEvents.push({
        id: `evt-crash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'ALERT',
        message: `COLLISION HALT: ${collision.reason || 'Impassable terrain encountered.'}`,
      });

      const currentCell = this.getCellAt(updatedState.x, updatedState.y, terrain);
      const telemetry = this.createTelemetryPoint(updatedState, currentCell, 0, terrain);

      return {
        updatedState,
        nextWaypointIndex: nextWaypointIdx,
        activePath: updatedPath,
        simulationStatus: 'FAILED',
        sensorScan: scan,
        newEvents,
        rerouteCount: nextRerouteCount,
        telemetry,
        isFinished: true,
        finishOutcome: 'OBSTACLE_COLLISION',
      };
    }

    // 3. 4-Step Obstacle Encounter & Dynamic Recovery (Autonomous Mode)
    // If the path ahead is blocked by an obstacle or impassable slope:
    //   Step 1: STOP forward motion
    //   Step 2: IDENTIFY obstacle details
    //   Step 3: CALCULATE a new path around the hazard
    //   Step 4: RESUME navigation towards destination
    if (isAutonomous && scan.hasHazardAhead && scan.closestHazardDistMeters < config.sensorRangeMeters * 0.85) {
      const upcomingWaypoints = updatedPath.slice(nextWaypointIdx, nextWaypointIdx + 6);
      const blockingCell = upcomingWaypoints
        .map((p) => terrain.cells[p.y]?.[p.x])
        .find((c) => c && (c.isObstacle || c.slope >= 22.0));

      if (blockingCell) {
        // Step 1: STOP
        updatedState.velocity = 0;
        updatedState.speed = 0;
        currentStatus = 'REROUTING';

        // Step 2: IDENTIFY OBSTACLE
        const obstacleDesc = blockingCell.isObstacle
          ? (blockingCell.roughness > 2.0 ? 'Boulder / Rock Hazard' : 'Crater Rim Depression')
          : `Excessive Slope Gradient (${blockingCell.slope.toFixed(1)}°)`;

        newEvents.push({
          id: `evt-obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
          type: 'WARNING',
          message: `OBSTACLE IDENTIFIED at [${blockingCell.x}, ${blockingCell.y}] (${obstacleDesc}) ${scan.closestHazardDistMeters}m ahead. Halting rover for replanning.`,
        });

        // Step 3: CALCULATE A NEW PATH
        const replanResult = DynamicReplanner.replan(
          terrain,
          { x: updatedState.x, y: updatedState.y },
          updatedPath.slice(nextWaypointIdx),
          targetPoint
        );

        // Step 4: RESUME NAVIGATION
        if (replanResult.success && replanResult.path.length > 0) {
          updatedPath = replanResult.path;
          nextWaypointIdx = 0;
          nextRerouteCount += 1;
          currentStatus = 'RUNNING';

          newEvents.push({
            id: `evt-replan-ok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
            type: 'SUCCESS',
            message: `REROUTE COMPUTED: Detour path (${replanResult.totalDistanceMeters.toFixed(1)}m) safe around obstacle. Resuming mission navigation.`,
          });
        } else {
          // Path completely obstructed
          currentStatus = 'PAUSED';
          newEvents.push({
            id: `evt-replan-fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
            type: 'ALERT',
            message: 'REPLAN FAILED: No traversable detour exists around detected barrier. Standing by in HOLD state.',
          });
        }
      }
    }

    // 4. Kinematics Movement Update
    if (!isAutonomous) {
      // MANUAL MODE
      let throttle = manualControls?.throttle ?? 0;
      const steering = manualControls?.steering ?? 0;
      const brake = manualControls?.brake ?? false;

      // Space bar / Emergency Brake
      if (brake) {
        throttle = 0;
        updatedState.velocity = Math.max(0, updatedState.velocity - config.acceleration * 3.0 * dtSeconds);
      }

      updatedState = RoverKinematics.updateManual(
        updatedState,
        config,
        throttle,
        steering,
        terrain,
        dtSeconds
      );

      // Check proximity to target in manual mode (within 1.5 grid cells)
      const distToGoal = Math.hypot(updatedState.x - targetPoint.x, updatedState.y - targetPoint.y);
      if (distToGoal <= 1.5) {
        updatedState.goalReached = true;
        updatedState.velocity = 0;
      }
    } else {
      // AUTONOMOUS MODE
      if (nextWaypointIdx < updatedPath.length) {
        const currentTargetWp = updatedPath[nextWaypointIdx];
        const res = RoverKinematics.updateAutonomous(
          updatedState,
          config,
          currentTargetWp,
          terrain,
          dtSeconds
        );
        updatedState = res.updatedState;
        if (res.reachedWaypoint) {
          nextWaypointIdx += 1;
        }
      } else {
        // Trajectory complete
        updatedState.goalReached = true;
        updatedState.velocity = 0;
      }
    }

    // Update alias state fields
    updatedState.speed = Math.abs(updatedState.velocity);
    updatedState.distanceTraveled = updatedState.distanceTraveledMeters;
    updatedState.elapsedTime = updatedState.elapsedTimeSeconds;
    const currentCell = this.getCellAt(updatedState.x, updatedState.y, terrain);
    updatedState.currentTerrain = terrain.type;
    updatedState.missionStatus = currentStatus;

    // 5. Battery Power & Energy Consumption Model
    // Dependent on:
    // - Distance moved (proportional to velocity * dt)
    // - Terrain roughness & friction
    // - Rover speed
    // - Slope gradient (positive = uphill power draw, negative = reduced draw)
    // - Obstacle rerouting (energy penalty applied during replan)
    const powerDrawWatts = EnergyModel.calculatePowerDrawWatts(
      config,
      updatedState.velocity,
      updatedState.pitch,
      currentCell.roughness
    );
    const energyDrainWh = EnergyModel.calculateEnergyDrainWh(powerDrawWatts, dtSeconds);

    updatedState.batteryRemainingWh = Math.max(0, updatedState.batteryRemainingWh - energyDrainWh);
    updatedState.batteryPercentage = Number(
      ((updatedState.batteryRemainingWh / config.batteryCapacityWh) * 100).toFixed(1)
    );
    updatedState.battery = updatedState.batteryPercentage;
    updatedState.elapsedTimeSeconds += dtSeconds;
    updatedState.elapsedTime = updatedState.elapsedTimeSeconds;

    // 6. Battery Depletion Evaluation
    if (updatedState.batteryRemainingWh <= 0) {
      updatedState.velocity = 0;
      updatedState.speed = 0;
      updatedState.missionStatus = 'FAILED';

      newEvents.push({
        id: `evt-power-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'ALERT',
        message: 'POWER EXHAUSTION: Battery capacity completely depleted. Rover shut down.',
      });

      const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, terrain);
      return {
        updatedState,
        nextWaypointIndex: nextWaypointIdx,
        activePath: updatedPath,
        simulationStatus: 'FAILED',
        sensorScan: scan,
        newEvents,
        rerouteCount: nextRerouteCount,
        telemetry,
        isFinished: true,
        finishOutcome: 'BATTERY_DEPLETED',
      };
    }

    // 7. Goal Destination Arrival Check
    if (updatedState.goalReached) {
      updatedState.missionStatus = 'COMPLETED';
      newEvents.push({
        id: `evt-goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'SUCCESS',
        message: 'MISSION ACCOMPLISHED: Target coordinates reached within safe operational margins!',
      });

      const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, terrain);
      return {
        updatedState,
        nextWaypointIndex: nextWaypointIdx,
        activePath: updatedPath,
        simulationStatus: 'COMPLETED',
        sensorScan: scan,
        newEvents,
        rerouteCount: nextRerouteCount,
        telemetry,
        isFinished: true,
        finishOutcome: 'SUCCESS',
      };
    }

    // 8. Continuous Telemetry Generation
    const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, terrain);

    return {
      updatedState,
      nextWaypointIndex: nextWaypointIdx,
      activePath: updatedPath,
      simulationStatus: currentStatus,
      sensorScan: scan,
      newEvents,
      rerouteCount: nextRerouteCount,
      telemetry,
      isFinished: false,
    };
  }

  private static getCellAt(x: number, y: number, terrain: TerrainGrid): TerrainCell {
    const cx = clamp(Math.round(x), 0, terrain.width - 1);
    const cy = clamp(Math.round(y), 0, terrain.height - 1);
    return terrain.cells[cy][cx];
  }

  private static createTelemetryPoint(
    state: RoverState,
    cell: TerrainCell,
    powerDrawWatts: number,
    terrain: TerrainGrid
  ): TelemetryPoint {
    return {
      timestamp: Date.now(),
      x: Number((state.x * terrain.resolution).toFixed(2)),
      y: Number((state.y * terrain.resolution).toFixed(2)),
      speed: Number(state.velocity.toFixed(2)),
      batteryPct: state.batteryPercentage,
      batteryWh: Number(state.batteryRemainingWh.toFixed(1)),
      elevation: Number(cell.elevation.toFixed(2)),
      slopeDeg: Number(state.pitch.toFixed(1)),
      powerDrawWatts: Number(powerDrawWatts.toFixed(1)),
      headingDeg: Number(((state.heading * 180) / Math.PI).toFixed(1)),
    };
  }
}
