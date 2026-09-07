import { SavedMission, MissionResults } from '@/types/mission';
import { RoverConfig } from '@/types/rover';
import { AlgorithmType, Point2D } from '@/types/pathfinding';
import { TerrainType, ObstacleToggles } from '@/types/terrain';

const STORAGE_KEYS = {
  SAVED_MISSIONS: 'lunar_sim_saved_missions_v2',
  SAVED_MISSIONS_LEGACY: 'lunar_sim_saved_missions_v1',
  ROVER_CONFIG: 'lunar_sim_rover_config_v1',
};

/**
 * Retrieve all saved missions from LocalStorage.
 * Also migrates legacy missions if found.
 */
export function getSavedMissions(): SavedMission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_MISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Check legacy storage key
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.SAVED_MISSIONS_LEGACY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed)) {
        localStorage.setItem(STORAGE_KEYS.SAVED_MISSIONS, JSON.stringify(legacyParsed));
        return legacyParsed;
      }
    }

    return [];
  } catch (err) {
    console.error('Failed to load saved missions from LocalStorage:', err);
    return [];
  }
}

/**
 * Save or update a mission in LocalStorage (compact without bloated full grids).
 */
export function saveMissionToStorage(mission: SavedMission): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedMissions();
    
    // Ensure lightweight storage: trim long telemetry histories in stored results
    const compactMission: SavedMission = {
      ...mission,
      results: mission.results
        ? {
            ...mission.results,
            telemetryLog: mission.results.telemetryLog ? mission.results.telemetryLog.slice(-100) : [],
          }
        : undefined,
    };

    const updated = [compactMission, ...existing.filter((m) => m.id !== compactMission.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.SAVED_MISSIONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save mission to LocalStorage:', err);
  }
}

/**
 * Delete a saved mission by ID.
 */
export function deleteSavedMission(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedMissions();
    const updated = existing.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_MISSIONS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete mission from LocalStorage:', err);
  }
}

/**
 * Duplicate an existing saved mission with a fresh ID and copy name.
 */
export function duplicateSavedMission(id: string): SavedMission | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getSavedMissions();
    const target = existing.find((m) => m.id === id);
    if (!target) return null;

    const cloned: SavedMission = {
      ...target,
      id: `MISS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${target.name} (Copy)`,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      status: target.status || (target.results ? 'COMPLETED' : 'SAVED CONFIG'),
    };

    saveMissionToStorage(cloned);
    return cloned;
  } catch (err) {
    console.error('Failed to duplicate mission:', err);
    return null;
  }
}

/**
 * Export a single mission or results as downloadable JSON.
 */
export function exportMissionAsJSON(missionOrResults: SavedMission | MissionResults): void {
  if (typeof window === 'undefined') return;
  const fileName = 'id' in missionOrResults
    ? `lunar_mission_${missionOrResults.id}.json`
    : `lunar_mission_${missionOrResults.missionId}.json`;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(missionOrResults, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export all saved missions as a collective archive JSON.
 */
export function exportAllMissionsAsJSON(): void {
  if (typeof window === 'undefined') return;
  const allMissions = getSavedMissions();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allMissions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `lunar_missions_archive_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export mission telemetry logs as CSV.
 */
export function exportTelemetryCSV(results: MissionResults): void {
  if (typeof window === 'undefined' || !results.telemetryLog || !results.telemetryLog.length) return;
  const headers = ['Timestamp_ms', 'X_m', 'Y_m', 'Speed_mps', 'Battery_pct', 'Battery_Wh', 'Elevation_m', 'Slope_deg', 'Power_Watts', 'Heading_deg'];
  const rows = results.telemetryLog.map((t) => [
    t.timestamp,
    t.x.toFixed(2),
    t.y.toFixed(2),
    t.speed.toFixed(2),
    t.batteryPct.toFixed(1),
    t.batteryWh.toFixed(1),
    t.elevation.toFixed(2),
    t.slopeDeg.toFixed(1),
    t.powerDrawWatts.toFixed(1),
    t.headingDeg.toFixed(1),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `telemetry_${results.missionId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Helper to validate if an unknown object conforms to Point2D.
 */
function isValidPoint(p: unknown): p is Point2D {
  return typeof p === 'object' && p !== null && 'x' in p && 'y' in p && typeof (p as Point2D).x === 'number' && typeof (p as Point2D).y === 'number';
}

/**
 * Safely parse, validate, and import a single JSON mission file.
 * Handles malformed data gracefully with clear error messages.
 */
export function validateAndImportMissionJSON(jsonString: string): {
  success: boolean;
  mission?: SavedMission;
  error?: string;
} {
  try {
    const raw = JSON.parse(jsonString);

    // Check if array of missions
    if (Array.isArray(raw)) {
      if (raw.length === 0) return { success: false, error: 'Imported JSON array is empty.' };
      const first = raw[0];
      return validateAndImportMissionJSON(JSON.stringify(first));
    }

    if (typeof raw !== 'object' || raw === null) {
      return { success: false, error: 'Invalid JSON format: Expected a JSON object.' };
    }

    // Validate required fields with sensible fallbacks
    const validTerrainTypes: TerrainType[] = ['FLAT', 'CRATER_FIELD', 'ROCKY', 'HILLY', 'SOUTH_POLE', 'CUSTOM'];
    const validAlgorithms: AlgorithmType[] = ['ASTAR', 'DIJKSTRA', 'GREEDY_BFS', 'MANUAL'];

    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `MISS-${Date.now()}`;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : typeof raw.missionName === 'string' ? raw.missionName : 'Imported Mission';
    const date = typeof raw.date === 'string' ? raw.date : new Date().toLocaleDateString();
    const terrainType: TerrainType = validTerrainTypes.includes(raw.terrainType) ? raw.terrainType : 'CRATER_FIELD';
    const algorithm: AlgorithmType = validAlgorithms.includes(raw.algorithm) ? raw.algorithm : 'ASTAR';

    const start: Point2D = isValidPoint(raw.start) ? raw.start : { x: 5, y: 5 };
    const target: Point2D = isValidPoint(raw.target) ? raw.target : isValidPoint(raw.destination) ? raw.destination : { x: 54, y: 54 };

    const roverConfig: RoverConfig = {
      name: raw.roverConfig?.name || 'AEROSPACE ROVER-V2',
      maxSpeed: typeof raw.roverConfig?.maxSpeed === 'number' ? raw.roverConfig.maxSpeed : 2.0,
      acceleration: typeof raw.roverConfig?.acceleration === 'number' ? raw.roverConfig.acceleration : 0.8,
      turningRate: typeof raw.roverConfig?.turningRate === 'number' ? raw.roverConfig.turningRate : 60,
      batteryCapacityWh: typeof raw.roverConfig?.batteryCapacityWh === 'number' ? raw.roverConfig.batteryCapacityWh : 1200,
      baselinePowerWatts: typeof raw.roverConfig?.baselinePowerWatts === 'number' ? raw.roverConfig.baselinePowerWatts : 15,
      motorPowerPerKg: typeof raw.roverConfig?.motorPowerPerKg === 'number' ? raw.roverConfig.motorPowerPerKg : 0.35,
      massKg: typeof raw.roverConfig?.massKg === 'number' ? raw.roverConfig.massKg : 150,
      sensorRangeMeters: typeof raw.roverConfig?.sensorRangeMeters === 'number' ? raw.roverConfig.sensorRangeMeters : 12,
      sensorFovDeg: typeof raw.roverConfig?.sensorFovDeg === 'number' ? raw.roverConfig.sensorFovDeg : 90,
      movementEfficiency: typeof raw.roverConfig?.movementEfficiency === 'number' ? raw.roverConfig.movementEfficiency : 1.0,
    };

    const obstacles: ObstacleToggles = {
      enableCraters: raw.obstacles?.enableCraters ?? raw.obstacleToggles?.enableCraters ?? true,
      enableRocks: raw.obstacles?.enableRocks ?? raw.obstacleToggles?.enableRocks ?? true,
      enableSteepSlopes: raw.obstacles?.enableSteepSlopes ?? raw.obstacleToggles?.enableSteepSlopes ?? true,
      enableDangerZones: raw.obstacles?.enableDangerZones ?? raw.obstacleToggles?.enableDangerZones ?? true,
    };

    const calculatedPath: Point2D[] = Array.isArray(raw.calculatedPath) && raw.calculatedPath.every(isValidPoint)
      ? raw.calculatedPath
      : Array.isArray(raw.activePath) && raw.activePath.every(isValidPoint)
      ? raw.activePath
      : [];

    const validatedMission: SavedMission = {
      id,
      name,
      date,
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
      terrainType,
      seed: typeof raw.seed === 'number' ? raw.seed : 1042,
      algorithm,
      start,
      target,
      destination: target,
      roverConfig,
      obstacles,
      obstacleToggles: obstacles,
      calculatedPath,
      status: typeof raw.status === 'string' ? raw.status : raw.results ? 'COMPLETED' : 'SAVED CONFIG',
      results: raw.results ? raw.results : undefined,
    };

    saveMissionToStorage(validatedMission);
    return { success: true, mission: validatedMission };
  } catch {
    return { success: false, error: 'JSON Syntax Error: Unable to parse file content.' };
  }
}
