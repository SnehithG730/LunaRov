import { TerrainGrid, TerrainCell, TerrainType, CraterSpec, BoulderSpec, ObstacleToggles } from '@/types/terrain';
import { Noise2D, createRNG } from '@/lib/math';
import { SolarModel } from '@/core/rover/SolarModel';
import {
  DEFAULT_GRID_SIZE,
  CELL_RESOLUTION_METERS,
  MAX_TRAVERSABLE_SLOPE,
  HAZARD_SLOPE_THRESHOLD,
} from '@/lib/constants';

export interface TerrainGenOptions {
  width?: number;
  height?: number;
  resolution?: number;
  seed?: number;
  baseAmplitude?: number;
  octaves?: number;
  craters?: CraterSpec[];
  boulders?: BoulderSpec[];
  roughnessBias?: number;
  obstacleToggles?: ObstacleToggles;
}

export class TerrainGenerator {
  public static generate(type: TerrainType, options: TerrainGenOptions = {}): TerrainGrid {
    const width = options.width ?? DEFAULT_GRID_SIZE;
    const height = options.height ?? DEFAULT_GRID_SIZE;
    const resolution = options.resolution ?? CELL_RESOLUTION_METERS;
    const seed = options.seed ?? Math.floor(Math.random() * 100000);
    const rng = createRNG(seed);
    const noise = new Noise2D(seed);

    let baseAmplitude = options.baseAmplitude ?? 15;
    let octaves = options.octaves ?? 4;
    let frequency = 0.05;
    const craters: CraterSpec[] = options.craters ? [...options.craters] : [];
    const boulders: BoulderSpec[] = options.boulders ? [...options.boulders] : [];
    let roughnessBias = options.roughnessBias ?? 1.0;

    // Helper to generate realistic non-circular, organic craters with randomized harmonics
    const makeOrganicCrater = (
      cx: number,
      cy: number,
      rad: number,
      depth: number,
      rimH: number
    ): CraterSpec => ({
      x: cx,
      y: cy,
      radius: rad,
      depth,
      rimHeight: rimH,
      eccentricity: 0.05 + rng() * 0.22,
      angle: rng() * Math.PI * 2,
      harmonics: [
        { freq: 2, amp: 0.06 + rng() * 0.10, phase: rng() * Math.PI * 2 },
        { freq: 3, amp: 0.03 + rng() * 0.07, phase: rng() * Math.PI * 2 },
        { freq: 4 + Math.floor(rng() * 2), amp: 0.02 + rng() * 0.04, phase: rng() * Math.PI * 2 },
      ],
    });

    // Apply preset characteristics
    switch (type) {
      case 'FLAT':
        baseAmplitude = 4;
        octaves = 2;
        frequency = 0.03;
        roughnessBias = 1.0;
        // Few subtle craters with organic contours
        if (!options.craters) {
          craters.push(
            makeOrganicCrater(Math.floor(width * 0.3), Math.floor(height * 0.4), 5, 3, 1),
            makeOrganicCrater(Math.floor(width * 0.75), Math.floor(height * 0.7), 4, 2.5, 0.8)
          );
        }
        break;

      case 'CRATER_FIELD':
        baseAmplitude = 8;
        octaves = 3;
        frequency = 0.035;
        roughnessBias = 1.2;
        if (!options.craters) {
          const count = 6 + Math.floor(rng() * 4);
          for (let i = 0; i < count; i++) {
            const rad = 3 + rng() * 6;
            craters.push(
              makeOrganicCrater(
                6 + rng() * (width - 12),
                6 + rng() * (height - 12),
                rad,
                4 + rad * 1.2,
                1.0 + rad * 0.3
              )
            );
          }
        }
        break;

      case 'ROCKY':
        baseAmplitude = 10;
        octaves = 4;
        frequency = 0.05;
        roughnessBias = 1.4;
        if (!options.boulders) {
          const count = 25 + Math.floor(rng() * 15);
          for (let i = 0; i < count; i++) {
            boulders.push({
              x: 4 + rng() * (width - 8),
              y: 4 + rng() * (height - 8),
              radius: 1.0 + rng() * 1.5,
              height: 1.8 + rng() * 2.5,
            });
          }
        }
        if (!options.craters) {
          craters.push(
            makeOrganicCrater(Math.floor(width * 0.5), Math.floor(height * 0.3), 5, 5, 1.5)
          );
        }
        break;

      case 'HILLY':
        baseAmplitude = 14;
        octaves = 3;
        frequency = 0.035;
        roughnessBias = 1.1;
        if (!options.craters) {
          craters.push(
            makeOrganicCrater(Math.floor(width * 0.25), Math.floor(height * 0.75), 7, 10, 2.5)
          );
        }
        break;

      case 'SOUTH_POLE':
        // Extreme Shackleton-inspired crater rim and deep permanently shadowed bowl
        baseAmplitude = 12;
        octaves = 3;
        frequency = 0.025;
        roughnessBias = 1.3;
        if (!options.craters) {
          // Dominant south pole crater rim feature
          craters.push(
            makeOrganicCrater(Math.floor(width * 0.45), Math.floor(height * 0.5), 13, 16, 4.0),
            makeOrganicCrater(Math.floor(width * 0.8), Math.floor(height * 0.2), 6, 7, 2.0)
          );
          // Boulder debris along ejecta blanket
          for (let i = 0; i < 16; i++) {
            boulders.push({
              x: 8 + rng() * (width - 16),
              y: 8 + rng() * (height - 16),
              radius: 1.2 + rng() * 1.5,
              height: 2.2 + rng() * 2.5,
            });
          }
        }
        break;

      case 'CUSTOM':
        baseAmplitude = 8;
        octaves = 2;
        frequency = 0.04;
        roughnessBias = 1.0;
        break;
    }

    const toggles = options.obstacleToggles ?? {
      enableCraters: true,
      enableRocks: true,
      enableSteepSlopes: true,
      enableDangerZones: true,
    };

    if (!toggles.enableSteepSlopes) {
      baseAmplitude *= 0.5;
    }

    // Step 1: Compute raw elevation matrix
    const elevations: number[][] = [];
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let y = 0; y < height; y++) {
      elevations[y] = [];
      for (let x = 0; x < width; x++) {
        // Base fractal noise
        let elev = noise.fractalNoise(x * frequency, y * frequency, octaves, 0.5, 2.0) * baseAmplitude;

        // Apply craters if enabled (with realistic irregular harmonic shapes)
        if (toggles.enableCraters) {
          for (const crater of craters) {
            const dx = x - crater.x;
            const dy = y - crater.y;
            const dist = Math.hypot(dx, dy);

            // Compute angular distortion for randomized, non-circular crater perimeter
            const angle = Math.atan2(dy, dx) - (crater.angle ?? 0);
            let radiusMod = 1.0;

            if (crater.eccentricity) {
              radiusMod += crater.eccentricity * Math.cos(2 * angle);
            }
            if (crater.harmonics) {
              for (const h of crater.harmonics) {
                radiusMod += h.amp * Math.cos(h.freq * angle + h.phase);
              }
            }

            // Organic edge variation
            const edgeNoise = noise.noise((x + crater.x) * 0.3, (y + crater.y) * 0.3) * 0.06;
            radiusMod += edgeNoise;

            const effectiveRadius = Math.max(1.0, crater.radius * radiusMod);
            const rimRadius = effectiveRadius * 1.65;

            if (dist < effectiveRadius) {
              // Interior parabolic bowl with natural floor curvature
              const t = dist / effectiveRadius;
              const bowl = -crater.depth * (1.0 - t * t);
              elev += bowl;
            } else if (dist < rimRadius) {
              // Raised crater rim and outer ejecta slope
              const t = (dist - effectiveRadius) / (rimRadius - effectiveRadius);
              const rim = crater.rimHeight * Math.pow(1.0 - t, 2.2);
              elev += rim;
            }
          }
        }

        elevations[y][x] = elev;
        if (elev < minElevation) minElevation = elev;
        if (elev > maxElevation) maxElevation = elev;
      }
    }

    // Step 2: Compute slopes, roughness, obstacle status, and solar illumination matrix
    const sunAzimuthDeg = 45;
    const sunElevationDeg = type === 'SOUTH_POLE' ? 2.5 : (type === 'HILLY' ? 8.0 : 15.0);
    const illuminationMatrix = SolarModel.computeTerrainIllumination(
      elevations,
      resolution,
      sunAzimuthDeg,
      sunElevationDeg,
      type
    );

    const cells: TerrainCell[][] = [];

    for (let y = 0; y < height; y++) {
      cells[y] = [];
      for (let x = 0; x < width; x++) {
        // Calculate slope using central difference gradient
        const left = x > 0 ? elevations[y][x - 1] : elevations[y][x];
        const right = x < width - 1 ? elevations[y][x + 1] : elevations[y][x];
        const top = y > 0 ? elevations[y - 1][x] : elevations[y][x];
        const bottom = y < height - 1 ? elevations[y + 1][x] : elevations[y][x];

        const dxScale = (x > 0 && x < width - 1) ? 2 * resolution : resolution;
        const dyScale = (y > 0 && y < height - 1) ? 2 * resolution : resolution;

        const dzdx = (right - left) / dxScale;
        const dzdy = (bottom - top) / dyScale;
        const gradMag = Math.sqrt(dzdx * dzdx + dzdy * dzdy);

        // Slope in degrees: arctan(gradient) * 180 / PI
        const slopeDeg = (Math.atan(gradMag) * 180) / Math.PI;

        // Micro-roughness factor
        let roughness = toggles.enableDangerZones
          ? roughnessBias + (noise.noise(x * 0.2, y * 0.2) + 1.0) * 0.2
          : 1.0;

        // Check if inside any boulder footprint
        let isBoulder = false;
        if (toggles.enableRocks) {
          for (const boulder of boulders) {
            const dist = Math.hypot(x - boulder.x, y - boulder.y);
            if (dist <= boulder.radius * 0.85) {
              isBoulder = true;
              roughness = 3.5;
              break;
            }
          }
        }

        // Impassability
        const isImpassableSlope = toggles.enableSteepSlopes && slopeDeg >= MAX_TRAVERSABLE_SLOPE;
        const isImpassable = isImpassableSlope || isBoulder;

        // Cost computation
        let cost = 1.0;
        if (isImpassable) {
          cost = Infinity;
        } else {
          const slopeRatio = slopeDeg / HAZARD_SLOPE_THRESHOLD;
          const slopeCost = toggles.enableDangerZones ? Math.pow(slopeRatio, 2.0) * 3.5 : slopeRatio * 1.5;
          const roughnessCost = (roughness - 1.0) * 1.2;
          cost = 1.0 + Math.max(0, slopeCost) + Math.max(0, roughnessCost);
        }

        const cellIllumination = illuminationMatrix[y]?.[x] ?? 1.0;

        cells[y][x] = {
          x,
          y,
          elevation: elevations[y][x],
          slope: Number(slopeDeg.toFixed(1)),
          roughness: Number(roughness.toFixed(2)),
          isObstacle: isImpassable,
          cost: cost === Infinity ? Infinity : Number(cost.toFixed(2)),
          discovered: true, // Initial full visibility, sensor cone updates real-time scan
          illumination: cellIllumination,
        };
      }
    }

    return {
      width,
      height,
      resolution,
      cells,
      type,
      seed,
      minElevation: Number(minElevation.toFixed(1)),
      maxElevation: Number(maxElevation.toFixed(1)),
      sunAzimuthDeg,
      sunElevationDeg,
    };
  }
}
