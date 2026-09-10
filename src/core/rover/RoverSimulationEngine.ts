import { RoverConfig, RoverState, TelemetryPoint, DiscoveryTelemetry } from '@/types/rover';
import { TerrainGrid, TerrainCell } from '@/types/terrain';
import { Point2D, PathfindingResult, AlgorithmType, ReplanTelemetry } from '@/types/pathfinding';
import { SimulationStatus, MissionEvent } from '@/types/mission';
import { RoverKinematics } from './RoverKinematics';
import { EnergyModel } from './EnergyModel';
import { SolarModel } from './SolarModel';
import { CollisionSystem, SensorScanResult } from '@/core/simulation/CollisionSystem';
import { DynamicReplanner } from '@/core/pathfinding/Replanner';
import { SensorDiscoveryEngine, NewlyDiscoveredHazard } from '@/core/sensor/SensorDiscoveryEngine';
import { clamp, normalizeAngle, angleDifference } from '@/lib/math';

export interface ManualControlsInput {
  throttle: number; // -1.0 to +1.0
  steering: number; // -1.0 to +1.0
  brake?: boolean;   // Emergency stop / space bar
}

export interface SimulationStepInput {
  state: RoverState;
  config: RoverConfig;
  terrain: TerrainGrid; // Known map
  groundTruthTerrain?: TerrainGrid; // Physical ground truth map
  sensorDiscoveryMode?: boolean;
  activePath: Point2D[];
  currentWaypointIndex: number;
  targetPoint: Point2D;
  dtSeconds: number;
  manualControls?: ManualControlsInput;
  rerouteCount: number;
  isAutonomous: boolean;
  algorithm?: AlgorithmType;
  hazardsDetectedTotal?: number;
}

export interface SimulationStepResult {
  updatedState: RoverState;
  nextWaypointIndex: number;
  activePath: Point2D[];
  newPathResult?: PathfindingResult;
  simulationStatus: SimulationStatus;
  sensorScan: SensorScanResult;
  newEvents: MissionEvent[];
  rerouteCount: number;
  telemetry: TelemetryPoint;
  isFinished: boolean;
  finishOutcome?: 'SUCCESS' | 'OBSTACLE_COLLISION' | 'BATTERY_DEPLETED' | 'ABORTED';
  replanTelemetry?: ReplanTelemetry;
  discoveryTelemetry?: DiscoveryTelemetry;
  newlyDiscoveredCells?: Point2D[];
  newlyDiscoveredHazards?: NewlyDiscoveredHazard[];
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

    const groundTruth = input.groundTruthTerrain || terrain;
    const knownTerrain = terrain;
    const isDiscoveryMode = !!input.sensorDiscoveryMode;

    let discoveryTelemetry: DiscoveryTelemetry | undefined = undefined;
    let newlyDiscoveredCells: Point2D[] | undefined = undefined;
    let newlyDiscoveredHazards: NewlyDiscoveredHazard[] | undefined = undefined;

    // 1. LiDAR Sensor Scan & Unknown Terrain Discovery
    let scan: SensorScanResult;

    if (isDiscoveryMode) {
      const discResult = SensorDiscoveryEngine.executeLiDARScan(
        updatedState,
        config,
        groundTruth,
        knownTerrain,
        updatedPath,
        nextWaypointIdx,
        input.hazardsDetectedTotal || 0,
        nextRerouteCount
      );

      discoveryTelemetry = discResult.telemetry;
      newlyDiscoveredCells = discResult.newlyDiscoveredCells;
      newlyDiscoveredHazards = discResult.newlyDiscoveredHazards;

      for (const ev of discResult.generatedEvents) {
        newEvents.push(ev);
      }

      // Convert to standard SensorScanResult for HUD compatibility
      scan = {
        hasHazardAhead: discResult.newlyDiscoveredHazards.length > 0,
        closestHazardDistMeters: discResult.newlyDiscoveredHazards.length > 0 ? discResult.newlyDiscoveredHazards[0].distanceMeters : Infinity,
        hazardCell: discResult.newlyDiscoveredHazards.length > 0 ? groundTruth.cells[discResult.newlyDiscoveredHazards[0].y]?.[discResult.newlyDiscoveredHazards[0].x] : undefined,
        hazardType: discResult.newlyDiscoveredHazards.length > 0 ? discResult.newlyDiscoveredHazards[0].hazardType as any : undefined,
        hazardDescription: discResult.newlyDiscoveredHazards.length > 0 ? discResult.newlyDiscoveredHazards[0].description : undefined,
        scannedCells: discResult.scannedCellsInSweep,
      };
    } else {
      scan = CollisionSystem.scanLiDAR(updatedState, config, terrain);
    }

    // 2. Collision & Rollover Verification (rover must not pass through physical ground truth terrain)
    const collision = CollisionSystem.checkCollision(updatedState, groundTruth);
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

      const currentCell = this.getCellAt(updatedState.x, updatedState.y, groundTruth);
      const telemetry = this.createTelemetryPoint(updatedState, currentCell, 0, 0, groundTruth, discoveryTelemetry);

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
        discoveryTelemetry,
        newlyDiscoveredCells,
        newlyDiscoveredHazards,
      };
    }

    // 3. 4-Step Obstacle Encounter & Dynamic Hazard Avoidance (Autonomous Mode)
    // If the path ahead is blocked by an obstacle or impassable slope/glitchy terrain:
    //   Step 1: STOP forward motion immediately
    //   Step 2: IDENTIFY obstacle & hazard details
    //   Step 3: CALCULATE a new path safely around the hazard
    //   Step 4: RESUME navigation towards destination
    let didReplanInThisStep = false;
    let newPathResult = undefined;
    let latestReplanTelemetry: ReplanTelemetry | undefined = undefined;

    // Clear avoidedHazard if the rover has moved sufficiently far from it or passed it
    if (updatedState.avoidedHazard) {
      const distToAvoided = Math.hypot(
        updatedState.x - updatedState.avoidedHazard.x,
        updatedState.y - updatedState.avoidedHazard.y
      ) * groundTruth.resolution;
      if (distToAvoided > Math.max(4.5, config.sensorRangeMeters * 0.75)) {
        updatedState.avoidedHazard = undefined;
      }
    }

    if (isAutonomous) {
      const upcomingWaypoints = updatedPath
        .slice(nextWaypointIdx)
        .filter((wp) => Math.hypot(wp.x - updatedState.x, wp.y - updatedState.y) * knownTerrain.resolution <= config.sensorRangeMeters * 1.2)
        .slice(0, 8);

      // Check if any upcoming waypoint directly intersects an impassable hazard cell in known map
      let blockingCell = upcomingWaypoints
        .map((p) => knownTerrain.cells[Math.round(p.y)]?.[Math.round(p.x)])
        .find((c) => {
          if (!c || !c.discovered) return false;
          if (
            updatedState.avoidedHazard &&
            Math.hypot(updatedState.avoidedHazard.x - c.x, updatedState.avoidedHazard.y - c.y) <= 1.2
          ) {
            return false;
          }
          return CollisionSystem.classifyHazard(c).isHazard;
        });

      // In discovery mode: also check newly discovered hazards
      if (!blockingCell && isDiscoveryMode && newlyDiscoveredHazards && newlyDiscoveredHazards.length > 0) {
        for (const hz of newlyDiscoveredHazards) {
          const isAlreadyAvoided = !!(updatedState.avoidedHazard &&
            Math.hypot(updatedState.avoidedHazard.x - hz.x, updatedState.avoidedHazard.y - hz.y) <= 1.2);
          if (!isAlreadyAvoided) {
            const isPathClose = upcomingWaypoints.some((wp) => {
              const d = Math.hypot(wp.x - hz.x, wp.y - hz.y) * knownTerrain.resolution;
              return d <= 1.6;
            });
            if (isPathClose) {
              blockingCell = knownTerrain.cells[hz.y]?.[hz.x];
              break;
            }
          }
        }
      }

      // Standard mode lookahead check
      if (!blockingCell && !isDiscoveryMode && scan.hasHazardAhead && scan.closestHazardDistMeters < config.sensorRangeMeters * 0.85 && scan.hazardCell) {
        const hz = scan.hazardCell;
        const isAlreadyAvoided = !!(updatedState.avoidedHazard &&
          Math.hypot(updatedState.avoidedHazard.x - hz.x, updatedState.avoidedHazard.y - hz.y) <= 1.2);

        if (!isAlreadyAvoided) {
          const isPathTooClose = upcomingWaypoints.some((wp) => {
            const d = Math.hypot(wp.x - hz.x, wp.y - hz.y) * terrain.resolution;
            return d <= 1.6;
          });

          if (isPathTooClose) {
            blockingCell = hz;
          }
        }
      }

      if (blockingCell) {
        // Step 1: STOP forward motion immediately
        updatedState.velocity = 0;
        updatedState.speed = 0;
        currentStatus = 'REROUTING';
        didReplanInThisStep = true;

        // Step 2: IDENTIFY OBSTACLE & HAZARD
        const classification = CollisionSystem.classifyHazard(blockingCell);
        const obstacleDesc = classification.desc || (
          blockingCell.isObstacle
            ? (blockingCell.roughness > 2.0 ? 'Boulder / Rock Hazard' : 'Crater Rim Depression')
            : `Excessive Slope Gradient (${blockingCell.slope.toFixed(1)}°)`
        );

        newEvents.push({
          id: `evt-obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
          type: 'WARNING',
          message: `OBSTACLE IDENTIFIED at [${blockingCell.x}, ${blockingCell.y}] (${obstacleDesc}) ${scan.closestHazardDistMeters < Infinity ? scan.closestHazardDistMeters + 'm ahead' : 'in path corridor'}. Halting rover for replanning.`,
        });

        // Collect custom blocked nodes around the hazard with safety buffer
        const blockedNodes: Point2D[] = [
          { x: blockingCell.x, y: blockingCell.y },
          { x: blockingCell.x + 1, y: blockingCell.y },
          { x: blockingCell.x - 1, y: blockingCell.y },
          { x: blockingCell.x, y: blockingCell.y + 1 },
          { x: blockingCell.x, y: blockingCell.y - 1 },
        ].filter((p) => {
          if (p.x < 0 || p.x >= terrain.width || p.y < 0 || p.y >= terrain.height) return false;
          if (p.x === targetPoint.x && p.y === targetPoint.y && !terrain.cells[targetPoint.y]?.[targetPoint.x]?.isObstacle) {
            return false;
          }
          return true;
        });

        // Step 3: CALCULATE A NEW PATH SAFELY AROUND THE HAZARD on knownTerrain (using D* Lite / Dynamic Replanner)
        const replanResult = DynamicReplanner.replan(
          knownTerrain,
          { x: updatedState.x, y: updatedState.y },
          updatedPath.slice(nextWaypointIdx),
          targetPoint,
          {
            customBlockedNodes: blockedNodes,
            roverConfig: config,
          },
          input.algorithm || 'DSTAR_LITE',
          nextRerouteCount + 1
        );

        // Step 4: RESUME NAVIGATION ALONG DETOUR
        if (replanResult.success && replanResult.path.length > 0) {
          updatedPath = replanResult.path;
          newPathResult = replanResult;
          updatedState.avoidedHazard = { x: blockingCell.x, y: blockingCell.y };
          latestReplanTelemetry = replanResult.replanTelemetry;

          // Target the first forward waypoint along the detour curve that is distinct from current rover location
          let nextIdx = 1;
          while (
            nextIdx < updatedPath.length - 1 &&
            Math.hypot(updatedPath[nextIdx].x - updatedState.x, updatedPath[nextIdx].y - updatedState.y) < 0.4
          ) {
            nextIdx++;
          }
          nextWaypointIdx = nextIdx;
          nextRerouteCount += 1;
          currentStatus = 'RUNNING';

          const telemetryMetrics = replanResult.replanTelemetry;
          const deltaMsg = telemetryMetrics && telemetryMetrics.additionalDistanceMeters > 0
            ? ` (+${telemetryMetrics.additionalDistanceMeters.toFixed(1)}m added)`
            : '';
          const nodesMsg = telemetryMetrics ? ` | ${telemetryMetrics.nodesUpdated} nodes updated` : '';

          newEvents.push({
            id: `evt-replan-ok-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
            type: 'SUCCESS',
            message: `ROUTE REPLANNED (${input.algorithm === 'DSTAR_LITE' ? 'D* Lite' : 'Dynamic Solver'}): Detour path (${replanResult.totalDistanceMeters.toFixed(1)}m${deltaMsg}${nodesMsg}) safe around obstacle. Resuming mission navigation.`,
          });
        } else {
          // Path completely obstructed / impossible route
          currentStatus = 'FAILED';
          updatedState.missionStatus = 'FAILED';
          newEvents.push({
            id: `evt-replan-fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
            type: 'ALERT',
            message: 'REPLAN FAILED: Route completely obstructed. No traversable detour exists.',
          });
        }
      }
    }

    // 4. Motion Update
    const prevCell = this.getCellAt(state.x, state.y, terrain);
    const prevIllum = prevCell.illumination ?? 1.0;

    if (!isAutonomous) {
      // Manual Piloting Mode
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
    } else if (currentStatus === 'RUNNING') {
      // Autonomous Waypoint Trajectory Following
      if (!didReplanInThisStep) {
        if (nextWaypointIdx < updatedPath.length) {
          const currentTarget = updatedPath[nextWaypointIdx];
          const motion = RoverKinematics.updateAutonomous(
            updatedState,
            config,
            currentTarget,
            terrain,
            dtSeconds
          );

          updatedState = motion.updatedState;

          if (motion.reachedWaypoint) {
            nextWaypointIdx += 1;
            if (nextWaypointIdx >= updatedPath.length) {
              updatedState.goalReached = true;
              updatedState.velocity = 0;
            }
          }
        } else {
          updatedState.goalReached = true;
          updatedState.velocity = 0;
        }
      }
    }

    // Update alias state fields
    updatedState.speed = Math.abs(updatedState.velocity);
    updatedState.distanceTraveled = updatedState.distanceTraveledMeters;
    updatedState.elapsedTime = updatedState.elapsedTimeSeconds;
    const currentCell = this.getCellAt(updatedState.x, updatedState.y, terrain);
    updatedState.currentTerrain = terrain.type;
    updatedState.missionStatus = currentStatus;

    // 5. Battery Power, Solar Energy Generation & Net Balance
    const powerDrawWatts = EnergyModel.calculatePowerDrawWatts(
      config,
      updatedState.velocity,
      updatedState.pitch,
      currentCell.roughness
    );
    const energyDrainWh = EnergyModel.calculateEnergyDrainWh(powerDrawWatts, dtSeconds);

    const currentIllum = currentCell.illumination ?? 1.0;
    const solarPowerWatts = SolarModel.calculateSolarPowerWatts(config, currentIllum);
    const solarEnergyGeneratedWh = (solarPowerWatts * dtSeconds) / 3600;
    const netPowerWatts = SolarModel.calculateNetPowerWatts(powerDrawWatts, solarPowerWatts);
    const netEnergyDeltaWh = (netPowerWatts * dtSeconds) / 3600;

    // Update battery with upper ceiling clamping (cannot exceed capacity)
    updatedState.batteryRemainingWh = Math.min(
      config.batteryCapacityWh,
      Math.max(0, updatedState.batteryRemainingWh - netEnergyDeltaWh)
    );
    updatedState.batteryPercentage = Number(
      ((updatedState.batteryRemainingWh / config.batteryCapacityWh) * 100).toFixed(1)
    );
    updatedState.battery = updatedState.batteryPercentage;
    updatedState.elapsedTimeSeconds += dtSeconds;
    updatedState.elapsedTime = updatedState.elapsedTimeSeconds;

    // Track cumulative solar metrics (preserve raw precision during integration)
    updatedState.currentSolarPowerWatts = solarPowerWatts;
    updatedState.totalSolarEnergyGeneratedWh = (updatedState.totalSolarEnergyGeneratedWh || 0) + solarEnergyGeneratedWh;
    updatedState.totalEnergyConsumedWh = (updatedState.totalEnergyConsumedWh || 0) + energyDrainWh;
    updatedState.netEnergyWh = updatedState.totalEnergyConsumedWh - updatedState.totalSolarEnergyGeneratedWh;

    if (currentIllum > 0.3) {
      updatedState.timeInIlluminationSeconds = (updatedState.timeInIlluminationSeconds || 0) + dtSeconds;
    } else {
      updatedState.timeInShadowSeconds = (updatedState.timeInShadowSeconds || 0) + dtSeconds;
    }

    updatedState.minimumBatteryRecordedPct = Math.min(
      updatedState.minimumBatteryRecordedPct ?? 100,
      updatedState.batteryPercentage
    );

    // 6. Illumination & Energy Transition Events
    if (prevIllum <= 0.3 && currentIllum > 0.6) {
      newEvents.push({
        id: `evt-solar-enter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'SUCCESS',
        message: `Entering high illumination region. Solar charging active (+${solarPowerWatts}W).`,
      });
    } else if (prevIllum > 0.3 && currentIllum <= 0.3) {
      newEvents.push({
        id: `evt-solar-exit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'WARNING',
        message: 'Entering shadowed terrain / Permanently Shadowed Region (PSR). Solar input: 0W.',
      });
    }

    const minReserveThreshold = config.minimumBatteryReservePct ?? 20;
    if (state.batteryPercentage >= minReserveThreshold && updatedState.batteryPercentage < minReserveThreshold) {
      newEvents.push({
        id: `evt-batt-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'WARNING',
        message: `Low battery warning: Battery level (${updatedState.batteryPercentage}%) dropped below ${minReserveThreshold}% reserve safety margin.`,
      });
    } else if (state.batteryPercentage >= 10 && updatedState.batteryPercentage < 10) {
      newEvents.push({
        id: `evt-batt-crit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'ALERT',
        message: 'CRITICAL ENERGY RESERVE: Battery under 10%! Rover entering power preservation mode.',
      });
    }

    // 7. Battery Depletion Evaluation
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

      const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, solarPowerWatts, terrain);
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

    // 8. Goal Destination Arrival Check
    if (updatedState.goalReached) {
      updatedState.missionStatus = 'COMPLETED';
      newEvents.push({
        id: `evt-goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(updatedState.elapsedTimeSeconds.toFixed(1)),
        type: 'SUCCESS',
        message: 'MISSION ACCOMPLISHED: Target coordinates reached within safe operational margins!',
      });

      const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, solarPowerWatts, terrain);
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

    // 9. Continuous Telemetry Generation
    const telemetry = this.createTelemetryPoint(updatedState, currentCell, powerDrawWatts, solarPowerWatts, terrain, discoveryTelemetry);

    return {
      updatedState,
      nextWaypointIndex: nextWaypointIdx,
      activePath: updatedPath,
      newPathResult,
      simulationStatus: currentStatus,
      sensorScan: scan,
      newEvents,
      rerouteCount: nextRerouteCount,
      telemetry,
      isFinished: false,
      replanTelemetry: latestReplanTelemetry,
      discoveryTelemetry,
      newlyDiscoveredCells,
      newlyDiscoveredHazards,
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
    solarPowerWatts: number,
    terrain: TerrainGrid,
    discovery?: DiscoveryTelemetry
  ): TelemetryPoint {
    const illum = cell.illumination ?? 1.0;
    const netWatts = Number((powerDrawWatts - (solarPowerWatts || 0)).toFixed(1));
    const vel = state.velocity ?? state.speed ?? 0;
    const pitch = state.pitch ?? 0;
    const heading = state.heading ?? 0;
    const battWh = state.batteryRemainingWh ?? 0;
    const battPct = state.batteryPercentage ?? 0;

    return {
      timestamp: Date.now(),
      x: Number((state.x * terrain.resolution).toFixed(2)),
      y: Number((state.y * terrain.resolution).toFixed(2)),
      speed: Number(vel.toFixed(2)),
      batteryPct: battPct,
      batteryWh: Number(battWh.toFixed(1)),
      elevation: Number((cell.elevation ?? 0).toFixed(2)),
      slopeDeg: Number(pitch.toFixed(1)),
      powerDrawWatts: Number(powerDrawWatts.toFixed(1)),
      solarPowerWatts: Number((solarPowerWatts || 0).toFixed(1)),
      netPowerWatts: netWatts,
      illumination: Number(illum.toFixed(2)),
      headingDeg: Number(((heading * 180) / Math.PI).toFixed(1)),
      discoveredCellsCount: discovery?.cellsDiscoveredCount,
      explorationPct: discovery?.explorationPercentage,
    };
  }
}
