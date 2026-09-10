export interface RoverConfig {
  name: string;
  maxSpeed: number;           // Max velocity in m/s (e.g. 0.5 - 5.0 m/s)
  acceleration: number;       // Acceleration in m/s²
  turningRate: number;        // Turning rate in deg/s
  batteryCapacityWh: number;  // Total energy storage in Watt-hours
  baselinePowerWatts: number; // Constant power draw for avionics/sensors/heating
  motorPowerPerKg: number;    // Mechanical conversion factor (W per kg at 1 m/s on flat ground)
  massKg: number;             // Rover mass in kg
  sensorRangeMeters: number;  // LiDAR obstacle detection distance
  sensorFovDeg: number;       // Sensor field-of-view angle (e.g., 90°)
  movementEfficiency: number; // Mechanical efficiency multiplier (0.5 to 2.0, 1.0 = standard)
  solarCapacityWatts?: number;      // Maximum solar array generation at 1.0 illumination (W, default 150W)
  minimumBatteryReservePct?: number;// Safety floor threshold for low battery warnings (%, default 20%)
}

import { Point2D } from './pathfinding';
import { TerrainType } from './terrain';
import { SimulationStatus } from './mission';

export interface RoverState {
  x: number;                  // Fractional position in grid coordinates
  y: number;
  previousPosition?: Point2D; // Previous frame position in grid coordinates
  heading: number;            // Current heading angle in radians [0, 2π)
  velocity: number;           // Current velocity in m/s
  speed?: number;             // Alias for velocity magnitude in m/s
  batteryRemainingWh: number; // Current battery charge in Wh
  batteryPercentage: number;  // Battery percentage (0% - 100%)
  battery?: number;           // Alias for batteryPercentage
  pitch: number;              // Forward pitch incline in degrees (-90° to +90°)
  roll: number;               // Lateral tilt in degrees
  distanceTraveledMeters: number;
  distanceTraveled?: number;  // Alias for distanceTraveledMeters
  elapsedTimeSeconds: number;
  elapsedTime?: number;       // Alias for elapsedTimeSeconds
  currentTerrain?: TerrainType; // Terrain type of the cell currently occupied
  missionStatus?: SimulationStatus; // Active status of the rover mission
  isStuck: boolean;           // Unable to navigate out of high slope or obstacle
  hasCrashed: boolean;        // Collided with impassable obstacle
  goalReached: boolean;       // Target destination achieved
  mode: 'AUTONOMOUS' | 'MANUAL';
  activeAlert?: string;       // Active mission alert string if any
  currentSolarPowerWatts?: number;    // Current instantaneous solar generation (W)
  totalSolarEnergyGeneratedWh?: number;// Cumulative solar energy gained (Wh)
  totalEnergyConsumedWh?: number;      // Cumulative gross energy consumed (Wh)
  netEnergyWh?: number;                // Cumulative net energy balance (Wh = consumed - generated)
  timeInIlluminationSeconds?: number;  // Seconds spent under illumination > 0.3
  timeInShadowSeconds?: number;        // Seconds spent under deep shadow <= 0.3
  minimumBatteryRecordedPct?: number;  // Lowest battery percentage reached during run
}

export interface TelemetryPoint {
  timestamp: number;
  x: number;
  y: number;
  speed: number;
  batteryPct: number;
  batteryWh: number;
  elevation: number;
  slopeDeg: number;
  powerDrawWatts: number;
  headingDeg: number;
  solarPowerWatts?: number;
  netPowerWatts?: number;
  illumination?: number;
}

