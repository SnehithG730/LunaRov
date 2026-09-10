import { TerrainType, ObstacleToggles } from './terrain';
import { RoverConfig, TelemetryPoint } from './rover';
import { AlgorithmType, Point2D } from './pathfinding';

export type SimulationStatus = 
  | 'IDLE' 
  | 'CALCULATING'
  | 'READY'
  | 'RUNNING' 
  | 'PAUSED' 
  | 'REROUTING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'ABORTED'
  // Legacy aliases for backward compatibility
  | 'PLANNING'
  | 'HAZARD_REROUTING';

export interface MissionEvent {
  id: string;
  timestamp: number;
  simTimeSeconds: number;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  message: string;
}

export interface MissionResults {
  missionId: string;
  roverName: string;
  terrainType: TerrainType;
  algorithmUsed: AlgorithmType;
  durationSeconds: number;
  distanceTraveledMeters: number;
  energyConsumedWh: number;
  solarEnergyGeneratedWh?: number;
  netEnergyWh?: number;
  remainingBatteryPct: number;
  minimumBatteryPct?: number;
  timeInIlluminationSeconds?: number;
  timeInShadowSeconds?: number;
  energyEfficiencyWhPerMeter?: number;
  solarOffsetPct?: number;
  averageSpeedMps: number;
  maxSlopeEncounteredDeg: number;
  rerouteCount: number;
  outcome: 'SUCCESS' | 'BATTERY_DEPLETED' | 'OBSTACLE_COLLISION' | 'ABORTED';
  efficiencyScore: number; // 0 to 100
  telemetryLog: TelemetryPoint[];
}

export interface SavedMission {
  id: string;
  name: string;
  date: string;
  timestamp?: number;
  terrainType: TerrainType;
  seed?: number;
  algorithm: AlgorithmType;
  start: Point2D;
  target: Point2D;
  destination?: Point2D; // alias
  roverConfig: RoverConfig;
  obstacles?: ObstacleToggles;
  obstacleToggles?: ObstacleToggles;
  calculatedPath?: Point2D[];
  status?: string;
  results?: MissionResults;
}
