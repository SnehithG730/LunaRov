export type TerrainType = 'FLAT' | 'CRATER_FIELD' | 'ROCKY' | 'HILLY' | 'SOUTH_POLE' | 'CUSTOM';

export interface TerrainCell {
  x: number;
  y: number;
  elevation: number;       // Elevation in meters (-50m to +200m)
  slope: number;           // Gradient angle in degrees (0° to 90°)
  roughness: number;       // Surface friction factor (1.0 = smooth regolith, 3.0 = boulder field)
  isObstacle: boolean;     // Impassable terrain (cliff slope > 25°, crater rim, or boulder)
  cost: number;            // Traversal cost multiplier: 1.0 (baseline) to Infinity (impassable)
  discovered: boolean;     // Sensor visibility / Fog of war state
  discoveredAtSec?: number; // Simulation time when cell was revealed by LiDAR
  hazardType?: string;     // Identified hazard classification ('BOULDER' | 'STEEP_SLOPE' | 'CRATER_WALL' | 'ROUGH_TERRAIN')
}

export interface UnknownTerrainConfig {
  enabled: boolean;
  initialExploredRadiusCells: number; // e.g. 4 cells around start
  scanIntervalSec: number;            // e.g. 0.1s
  unknownCellCost: number;            // e.g. 1.0 baseline regolith prior
  unknownCellElevation: number;       // e.g. 0m prior
}

export interface TerrainGrid {
  width: number;           // Grid dimensions (e.g., 60x60)
  height: number;
  resolution: number;      // Meters per cell (e.g., 2.0 meters)
  cells: TerrainCell[][];
  type: TerrainType;
  seed: number;
  minElevation: number;
  maxElevation: number;
}

export interface CraterHarmonic {
  freq: number;
  amp: number;
  phase: number;
}

export interface CraterSpec {
  x: number;
  y: number;
  radius: number;          // Radius in grid cells
  depth: number;           // Depth in meters
  rimHeight: number;       // Rim height in meters
  eccentricity?: number;   // Elliptical elongation (0.0 = circle, 0.4 = elongated)
  angle?: number;          // Orientation angle in radians
  harmonics?: CraterHarmonic[]; // Harmonic perturbations for organic irregular rims
  roughness?: number;      // Micro-roughness on ejecta blanket
}

export interface BoulderSpec {
  x: number;
  y: number;
  radius: number;
  height: number;
}

export interface ObstacleToggles {
  enableCraters: boolean;
  enableRocks: boolean;
  enableSteepSlopes: boolean;
  enableDangerZones: boolean;
}
