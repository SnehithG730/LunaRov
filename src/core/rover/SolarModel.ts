import { RoverConfig } from '@/types/rover';
import { TerrainType } from '@/types/terrain';

export interface SolarModelOptions {
  sunAzimuthDeg?: number;    // 0 = East, 90 = North, 180 = West, 270 = South
  sunElevationDeg?: number;  // 2.5° for South Pole, 15° for standard lunar day
}

export class SolarModel {
  /**
   * Educational Lunar Solar Constant (W/m² in lunar vacuum at 1 AU)
   */
  public static readonly SOLAR_FLUX_WATTS_M2 = 1361;

  /**
   * Default rover solar array capacity at 1.0 illumination (Watts)
   */
  public static readonly DEFAULT_SOLAR_CAPACITY_WATTS = 150;

  /**
   * Computes terrain illumination matrix (0.0 to 1.0) using shadow-raymarching over DEM
   * @param elevations 2D elevation grid in meters
   * @param resolution Meters per cell
   * @param sunAzimuthDeg Sun azimuth angle (degrees)
   * @param sunElevationDeg Sun elevation above horizon (degrees)
   * @param terrainType Optional terrain type preset
   */
  public static computeTerrainIllumination(
    elevations: number[][],
    resolution: number,
    sunAzimuthDeg = 45,
    sunElevationDeg = 3.0,
    terrainType: TerrainType = 'SOUTH_POLE'
  ): number[][] {
    const height = elevations.length;
    if (height === 0) return [];
    const width = elevations[0].length;
    const illumination: number[][] = [];

    // South Pole environments feature low grazing sun angles (typically 1.5° - 4.0°)
    const effSunElevation = terrainType === 'SOUTH_POLE'
      ? Math.max(1.5, Math.min(4.5, sunElevationDeg))
      : Math.max(2.0, sunElevationDeg);

    const sunElevRad = (effSunElevation * Math.PI) / 180;
    const sunAzimuthRad = (sunAzimuthDeg * Math.PI) / 180;
    const tanElev = Math.tan(sunElevRad);

    // Sun vector in ground coordinates (pointing toward sun)
    const cosAz = Math.cos(sunAzimuthRad);
    const sinAz = Math.sin(sunAzimuthRad);

    // Rover solar panel mast height offset (meters above ground)
    const mastHeightMeters = 0.6;

    // Max shadow raycast distance in meters (e.g. 150m)
    const maxRaycastDistMeters = Math.min(250, Math.max(width, height) * resolution * 1.5);
    const stepSizeCells = 0.5;
    const stepDistMeters = stepSizeCells * resolution;

    for (let y = 0; y < height; y++) {
      illumination[y] = [];
      for (let x = 0; x < width; x++) {
        const originElev = elevations[y][x];
        const sensorZ = originElev + mastHeightMeters;

        // 1. Raymarch toward sun to detect terrain occlusion / casting shadows
        let inShadow = false;
        let currentDist = stepDistMeters;

        while (currentDist <= maxRaycastDistMeters) {
          const rayX = x + (currentDist / resolution) * cosAz;
          const rayY = y + (currentDist / resolution) * sinAz;

          // If ray leaves the map, no further terrain can occlude it
          if (rayX < 0 || rayX >= width - 1 || rayY < 0 || rayY >= height - 1) {
            break;
          }

          // Bilinear interpolation of terrain elevation at ray sample
          const x0 = Math.floor(rayX);
          const y0 = Math.floor(rayY);
          const fx = rayX - x0;
          const fy = rayY - y0;

          const e00 = elevations[y0][x0];
          const e10 = elevations[y0][x0 + 1];
          const e01 = elevations[y0 + 1][x0];
          const e11 = elevations[y0 + 1][x0 + 1];

          const terrainZ = (1 - fx) * (1 - fy) * e00 + fx * (1 - fy) * e10 + (1 - fx) * fy * e01 + fx * fy * e11;

          // Calculate ray altitude at this distance
          const rayZ = sensorZ + currentDist * tanElev;

          if (terrainZ > rayZ) {
            inShadow = true;
            break;
          }

          currentDist += stepDistMeters;
        }

        if (inShadow) {
          // Deep shadow / Permanently Shadowed Region (PSR)
          illumination[y][x] = 0.0;
        } else {
          // 2. Compute local surface normal gradient
          const left = x > 0 ? elevations[y][x - 1] : elevations[y][x];
          const right = x < width - 1 ? elevations[y][x + 1] : elevations[y][x];
          const top = y > 0 ? elevations[y - 1][x] : elevations[y][x];
          const bottom = y < height - 1 ? elevations[y + 1][x] : elevations[y][x];

          const dxScale = (x > 0 && x < width - 1) ? 2 * resolution : resolution;
          const dyScale = (y > 0 && y < height - 1) ? 2 * resolution : resolution;

          const dzdx = (right - left) / dxScale;
          const dzdy = (bottom - top) / dyScale;

          // Normal vector: (-dzdx, -dzdy, 1) normalized
          const normalLen = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1.0);
          const nx = -dzdx / normalLen;
          const ny = -dzdy / normalLen;
          const nz = 1.0 / normalLen;

          // Sun light vector: (cos(elev)*cos(az), cos(elev)*sin(az), sin(elev))
          const lx = Math.cos(sunElevRad) * cosAz;
          const ly = Math.cos(sunElevRad) * sinAz;
          const lz = Math.sin(sunElevRad);

          // Dot product: cosine of angle of incidence
          const dot = nx * lx + ny * ly + nz * lz;

          // Lunar surface illumination: direct solar flux + small diffuse earthshine/albedo factor
          const directFactor = Math.max(0, dot);
          const rawIllum = 0.08 + 0.92 * directFactor;
          illumination[y][x] = Number(Math.min(1.0, Math.max(0.0, rawIllum)).toFixed(2));
        }
      }
    }

    return illumination;
  }

  /**
   * Calculates instantaneous solar power generation in Watts
   * @param config Rover specification or peak solar capacity in Watts
   * @param illumination Illumination level at rover position (0.0 to 1.0)
   */
  public static calculateSolarPowerWatts(config: RoverConfig | number, illumination: number): number {
    const capacity = typeof config === 'number'
      ? config
      : (config.solarCapacityWatts ?? this.DEFAULT_SOLAR_CAPACITY_WATTS);
    const clampedIllum = Math.max(0, Math.min(1.0, illumination));
    return Number((capacity * clampedIllum).toFixed(1));
  }

  /**
   * Calculates net electrical power in Watts (Power Draw - Solar Input)
   * Positive value = net battery drain (draining)
   * Negative value = net battery charging (generating surplus)
   */
  public static calculateNetPowerWatts(powerDrawWatts: number, solarPowerWatts: number): number {
    return Number((powerDrawWatts - solarPowerWatts).toFixed(1));
  }

  /**
   * Calculates net energy delta over dtSeconds in Watt-hours
   */
  public static calculateEnergyStep(
    powerDrawWatts: number,
    solarPowerWatts: number,
    dtSeconds: number
  ): {
    energyDrainedWh: number;
    energyGeneratedWh: number;
    netEnergyWh: number;
  } {
    const energyDrainedWh = (powerDrawWatts * dtSeconds) / 3600;
    const energyGeneratedWh = (solarPowerWatts * dtSeconds) / 3600;
    const netEnergyWh = (this.calculateNetPowerWatts(powerDrawWatts, solarPowerWatts) * dtSeconds) / 3600;

    return {
      energyDrainedWh,
      energyGeneratedWh,
      netEnergyWh,
    };
  }
}
