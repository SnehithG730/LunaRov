import { RoverConfig } from '@/types/rover';

export const LUNAR_GRAVITY = 1.62; // m/s²
export const REGOLITH_ROLLING_RESISTANCE = 0.06;
export const MAX_TRAVERSABLE_SLOPE = 25.0; // Degrees
export const HAZARD_SLOPE_THRESHOLD = 18.0; // Degrees
export const CRITICAL_BATTERY_THRESHOLD = 15.0; // Percent

export const DEFAULT_GRID_SIZE = 60; // 60x60 cells
export const CELL_RESOLUTION_METERS = 2.0; // 2 meters per cell (120m x 120m sector)

export const DEFAULT_ROVER_CONFIG: RoverConfig = {
  name: 'ARTEMIS VIPER-IV',
  maxSpeed: 2.0,            // m/s
  acceleration: 0.8,        // m/s²
  turningRate: 60.0,        // deg/s
  batteryCapacityWh: 1200,  // Wh (1.2 kWh)
  baselinePowerWatts: 40,   // Avionics, telemetry, thermal heaters
  motorPowerPerKg: 1.25,    // Watts per kg at base velocity
  massKg: 160,              // 160 kg lunar exploration vehicle
  sensorRangeMeters: 12.0,  // 12m LiDAR reach (6 cells)
  sensorFovDeg: 90.0,       // 90° forward vision cone
  movementEfficiency: 1.0,  // 100% baseline mechanical efficiency
};

export const TERRAIN_PALETTES = {
  REGOLITH_DEEP: '#080a0e',
  REGOLITH_BASE: '#1c2230',
  REGOLITH_HIGHLAND: '#5a6882',
  CRATER_FLOOR: '#06080c',
  CRATER_RIM: '#7d8fa8',
  BOULDER: '#a0b3cc',
  HAZARD_ZONE: '#ef4444',
  PATH_PLANNED: '#00f0ff',
  PATH_TRAVELED: '#22c55e',
  SENSOR_CONE: 'rgba(0, 240, 255, 0.15)',
};
