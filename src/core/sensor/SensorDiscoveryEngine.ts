import { TerrainGrid, TerrainCell, UnknownTerrainConfig } from '@/types/terrain';
import { RoverState, RoverConfig, DiscoveryTelemetry } from '@/types/rover';
import { Point2D } from '@/types/pathfinding';
import { MissionEvent } from '@/types/mission';
import { CollisionSystem } from '@/core/simulation/CollisionSystem';

export interface NewlyDiscoveredHazard {
  x: number;
  y: number;
  hazardType: string;
  description: string;
  elevation: number;
  slope: number;
  roughness: number;
  distanceMeters: number;
}

export interface DiscoveryScanResult {
  newlyDiscoveredCells: Point2D[];
  newlyDiscoveredHazards: NewlyDiscoveredHazard[];
  scannedCellsInSweep: Point2D[];
  isPathObstructed: boolean;
  blockingHazard?: NewlyDiscoveredHazard;
  generatedEvents: MissionEvent[];
  telemetry: DiscoveryTelemetry;
}

export const DEFAULT_UNKNOWN_CONFIG: UnknownTerrainConfig = {
  enabled: true,
  initialExploredRadiusCells: 4,
  scanIntervalSec: 0.1,
  unknownCellCost: 1.0,
  unknownCellElevation: 0.0,
};

export class SensorDiscoveryEngine {
  /**
   * Initializes the Rover's subjective Known Map where only the immediate
   * landing/start zone is known, and the rest is hidden behind the Fog of War.
   */
  public static createInitialKnownTerrain(
    groundTruth: TerrainGrid,
    startPoint: Point2D,
    config: Partial<UnknownTerrainConfig> = {}
  ): TerrainGrid {
    const cfg = { ...DEFAULT_UNKNOWN_CONFIG, ...config };
    const radius = cfg.initialExploredRadiusCells;

    const knownCells: TerrainCell[][] = [];

    for (let y = 0; y < groundTruth.height; y++) {
      knownCells[y] = [];
      for (let x = 0; x < groundTruth.width; x++) {
        const distToStart = Math.hypot(x - startPoint.x, y - startPoint.y);
        const isInitiallyDiscovered = distToStart <= radius;
        const gtCell = groundTruth.cells[y][x];

        if (isInitiallyDiscovered) {
          // Landing zone cells are initially known
          const classification = CollisionSystem.classifyHazard(gtCell);
          knownCells[y][x] = {
            ...gtCell,
            discovered: true,
            discoveredAtSec: 0,
            hazardType: classification.isHazard ? classification.type : undefined,
          };
        } else {
          // Unknown shrouded cell: baseline prior assumptions (flat regolith, no obstacle)
          knownCells[y][x] = {
            x,
            y,
            elevation: cfg.unknownCellElevation,
            slope: 0,
            roughness: 1.0,
            isObstacle: false,
            cost: cfg.unknownCellCost,
            discovered: false,
            discoveredAtSec: undefined,
            hazardType: undefined,
          };
        }
      }
    }

    return {
      width: groundTruth.width,
      height: groundTruth.height,
      resolution: groundTruth.resolution,
      cells: knownCells,
      type: groundTruth.type,
      seed: groundTruth.seed,
      minElevation: groundTruth.minElevation,
      maxElevation: groundTruth.maxElevation,
    };
  }

  /**
   * Executes a simulated LiDAR scan from the rover's current physical position,
   * revealing ground truth data within sensor range and copying it into the Known Map.
   */
  public static executeLiDARScan(
    state: RoverState,
    config: RoverConfig,
    groundTruth: TerrainGrid,
    knownTerrain: TerrainGrid,
    activePath: Point2D[] = [],
    currentWaypointIndex: number = 0,
    hazardsDetectedTotal: number = 0,
    replansTotal: number = 0
  ): DiscoveryScanResult {
    const rangeCells = Math.ceil(config.sensorRangeMeters / groundTruth.resolution);
    const scannedCellsInSweep: Point2D[] = [];
    const newlyDiscoveredCells: Point2D[] = [];
    const newlyDiscoveredHazards: NewlyDiscoveredHazard[] = [];
    const generatedEvents: MissionEvent[] = [];

    const minX = Math.max(0, Math.floor(state.x - rangeCells));
    const maxX = Math.min(groundTruth.width - 1, Math.ceil(state.x + rangeCells));
    const minY = Math.max(0, Math.floor(state.y - rangeCells));
    const maxY = Math.min(groundTruth.height - 1, Math.ceil(state.y + rangeCells));

    let newHazardsInThisSweep = 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - state.x;
        const dy = y - state.y;
        const distGrid = Math.hypot(dx, dy);
        const distMeters = distGrid * groundTruth.resolution;

        if (distMeters > config.sensorRangeMeters) continue;

        scannedCellsInSweep.push({ x, y });

        const knownCell = knownTerrain.cells[y]?.[x];
        const gtCell = groundTruth.cells[y]?.[x];
        if (!knownCell || !gtCell) continue;

        // If this cell was previously hidden in fog-of-war, reveal it!
        if (!knownCell.discovered) {
          knownCell.discovered = true;
          knownCell.discoveredAtSec = Number(state.elapsedTimeSeconds.toFixed(1));
          knownCell.elevation = gtCell.elevation;
          knownCell.slope = gtCell.slope;
          knownCell.roughness = gtCell.roughness;
          knownCell.isObstacle = gtCell.isObstacle;
          knownCell.cost = gtCell.cost;

          newlyDiscoveredCells.push({ x, y });

          const classification = CollisionSystem.classifyHazard(gtCell);
          if (classification.isHazard) {
            knownCell.hazardType = classification.type;
            newHazardsInThisSweep++;
            const hazardItem: NewlyDiscoveredHazard = {
              x,
              y,
              hazardType: classification.type || 'OBSTACLE',
              description: classification.desc || 'Detected terrain hazard',
              elevation: gtCell.elevation,
              slope: gtCell.slope,
              roughness: gtCell.roughness,
              distanceMeters: Number(distMeters.toFixed(1)),
            };
            newlyDiscoveredHazards.push(hazardItem);
          }
        }
      }
    }

    // Generate discovery events
    if (newlyDiscoveredHazards.length > 0) {
      const topHazard = newlyDiscoveredHazards[0];
      let eventMsg = `LiDAR detected obstacle at [${topHazard.x}, ${topHazard.y}] (${topHazard.description}) ${topHazard.distanceMeters}m away.`;
      if (topHazard.hazardType === 'CRATER_WALL') {
        eventMsg = `New crater detected in sensor arc at [${topHazard.x}, ${topHazard.y}] (Depth ${Math.abs(topHazard.elevation).toFixed(1)}m).`;
      } else if (topHazard.hazardType === 'STEEP_SLOPE') {
        eventMsg = `Steep slope detected ahead at [${topHazard.x}, ${topHazard.y}] (Incline ${topHazard.slope.toFixed(1)}°).`;
      }

      generatedEvents.push({
        id: `evt-disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(state.elapsedTimeSeconds.toFixed(1)),
        type: 'WARNING',
        message: eventMsg,
      });
    }

    // Check if the rover's upcoming active route is obstructed by ANY discovered hazard
    let isPathObstructed = false;
    let blockingHazard: NewlyDiscoveredHazard | undefined = undefined;

    if (activePath.length > 0) {
      const upcomingWaypoints = activePath.slice(
        currentWaypointIndex,
        Math.min(activePath.length, currentWaypointIndex + 12)
      );

      for (const wp of upcomingWaypoints) {
        const gx = Math.round(wp.x);
        const gy = Math.round(wp.y);
        const cell = knownTerrain.cells[gy]?.[gx];

        if (cell && cell.discovered && cell.isObstacle) {
          isPathObstructed = true;
          blockingHazard = {
            x: cell.x,
            y: cell.y,
            hazardType: cell.hazardType || 'OBSTACLE',
            description: 'Impassable Obstacle blocking path',
            elevation: cell.elevation,
            slope: cell.slope,
            roughness: cell.roughness,
            distanceMeters: Number((Math.hypot(cell.x - state.x, cell.y - state.y) * groundTruth.resolution).toFixed(1)),
          };
          break;
        }

        // Check proximity (within 1.6m radius of any newly revealed hazard)
        for (const hz of newlyDiscoveredHazards) {
          const dMeters = Math.hypot(wp.x - hz.x, wp.y - hz.y) * groundTruth.resolution;
          if (dMeters <= 1.6) {
            isPathObstructed = true;
            blockingHazard = hz;
            break;
          }
        }
        if (isPathObstructed) break;
      }
    }

    if (isPathObstructed && blockingHazard) {
      generatedEvents.push({
        id: `evt-block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        simTimeSeconds: Number(state.elapsedTimeSeconds.toFixed(1)),
        type: 'ALERT',
        message: `Route blocked by newly discovered hazard at [${blockingHazard.x}, ${blockingHazard.y}]. Replanning route...`,
      });
    }

    // Compute complete exploration telemetry metrics
    let discoveredCount = 0;
    const totalCells = groundTruth.width * groundTruth.height;

    for (let y = 0; y < knownTerrain.height; y++) {
      for (let x = 0; x < knownTerrain.width; x++) {
        if (knownTerrain.cells[y][x].discovered) {
          discoveredCount++;
        }
      }
    }

    const explorationPercentage = Number(((discoveredCount / totalCells) * 100).toFixed(1));
    const unknownCellsRemaining = totalCells - discoveredCount;
    const updatedHazardsTotal = hazardsDetectedTotal + newHazardsInThisSweep;

    const telemetry: DiscoveryTelemetry = {
      lidarRangeMeters: config.sensorRangeMeters,
      cellsScannedTotal: scannedCellsInSweep.length,
      cellsDiscoveredCount: discoveredCount,
      totalCellsInGrid: totalCells,
      explorationPercentage,
      hazardsDetectedCount: updatedHazardsTotal,
      unknownCellsRemaining,
      replansCount: replansTotal,
      lastDiscoveryMessage: generatedEvents.length > 0 ? generatedEvents[0].message : undefined,
    };

    return {
      newlyDiscoveredCells,
      newlyDiscoveredHazards,
      scannedCellsInSweep,
      isPathObstructed,
      blockingHazard,
      generatedEvents,
      telemetry,
    };
  }
}
