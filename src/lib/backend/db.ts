import fs from 'fs';
import path from 'path';
import { CloudMissionRecord, LeaderboardRecord } from '@/types/backend';
import { RoverConfig } from '@/types/rover';

interface DatabaseSchema {
  missions: CloudMissionRecord[];
  leaderboard: LeaderboardRecord[];
}

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'lunarov_db.json');

const DEFAULT_ROVER_CONFIG: RoverConfig = {
  name: 'LunaRov-Alpha',
  maxSpeed: 2.0,
  acceleration: 0.8,
  turningRate: 60,
  batteryCapacityWh: 1200,
  baselinePowerWatts: 45,
  motorPowerPerKg: 0.35,
  massKg: 180,
  sensorRangeMeters: 8,
  sensorFovDeg: 90,
  movementEfficiency: 1.0,
};

// Pre-seeded starter missions and community discoveries
const INITIAL_MISSIONS: CloudMissionRecord[] = [
  {
    id: 'mission-shackleton-survey',
    name: 'Artemis III: Shackleton Crater Rim Traverse',
    author: 'Commander Vance (NASA JPL)',
    isPublic: true,
    likes: 42,
    views: 310,
    forkCount: 15,
    tags: ['Artemis', 'Polar', 'Crater-Rim', 'High-Risk'],
    date: '2026-08-15',
    createdAt: new Date('2026-08-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-15T10:00:00Z').toISOString(),
    terrainType: 'CRATER_FIELD',
    seed: 42891,
    algorithm: 'ASTAR',
    start: { x: 5, y: 5 },
    target: { x: 45, y: 45 },
    roverConfig: {
      ...DEFAULT_ROVER_CONFIG,
      name: 'VIPER-II',
    },
    results: {
      missionId: 'mission-shackleton-survey',
      roverName: 'VIPER-II',
      terrainType: 'CRATER_FIELD',
      algorithmUsed: 'ASTAR',
      durationSeconds: 142,
      distanceTraveledMeters: 89.4,
      energyConsumedWh: 218.4,
      remainingBatteryPct: 78.16,
      averageSpeedMps: 0.63,
      maxSlopeEncounteredDeg: 24.1,
      rerouteCount: 1,
      outcome: 'SUCCESS',
      efficiencyScore: 94.2,
      telemetryLog: [],
    },
  },
  {
    id: 'mission-mare-tranquillitatis',
    name: 'Apollo Legacy: Sea of Tranquility Basalt Run',
    author: 'Dr. Elena Rostova (ESA)',
    isPublic: true,
    likes: 29,
    views: 185,
    forkCount: 8,
    tags: ['Mare', 'Basalt', 'Speed-Run', 'Optimal-Energy'],
    date: '2026-08-20',
    createdAt: new Date('2026-08-20T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-08-20T14:30:00Z').toISOString(),
    terrainType: 'FLAT',
    seed: 10092,
    algorithm: 'DIJKSTRA',
    start: { x: 2, y: 2 },
    target: { x: 48, y: 48 },
    roverConfig: {
      ...DEFAULT_ROVER_CONFIG,
      name: 'Selene-Explorer',
      maxSpeed: 2.5,
    },
    results: {
      missionId: 'mission-mare-tranquillitatis',
      roverName: 'Selene-Explorer',
      terrainType: 'FLAT',
      algorithmUsed: 'DIJKSTRA',
      durationSeconds: 98,
      distanceTraveledMeters: 72.1,
      energyConsumedWh: 135.2,
      remainingBatteryPct: 83.1,
      averageSpeedMps: 0.74,
      maxSlopeEncounteredDeg: 14.5,
      rerouteCount: 0,
      outcome: 'SUCCESS',
      efficiencyScore: 97.8,
      telemetryLog: [],
    },
  },
  {
    id: 'mission-highland-plateau',
    name: 'Lunar Highlands: Montes Apenninus Ridge Crossing',
    author: 'Astronav AI Group',
    isPublic: true,
    likes: 18,
    views: 140,
    forkCount: 5,
    tags: ['Highlands', 'Extreme-Slopes', 'Greedy-Path'],
    date: '2026-09-01',
    createdAt: new Date('2026-09-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-09-01T08:00:00Z').toISOString(),
    terrainType: 'HILLY',
    seed: 77123,
    algorithm: 'GREEDY_BFS',
    start: { x: 10, y: 40 },
    target: { x: 40, y: 10 },
    roverConfig: {
      ...DEFAULT_ROVER_CONFIG,
      name: 'Aegis-Heavy',
      massKg: 240,
    },
    results: {
      missionId: 'mission-highland-plateau',
      roverName: 'Aegis-Heavy',
      terrainType: 'HILLY',
      algorithmUsed: 'GREEDY_BFS',
      durationSeconds: 165,
      distanceTraveledMeters: 98.6,
      energyConsumedWh: 340.5,
      remainingBatteryPct: 71.6,
      averageSpeedMps: 0.60,
      maxSlopeEncounteredDeg: 31.8,
      rerouteCount: 3,
      outcome: 'SUCCESS',
      efficiencyScore: 88.5,
      telemetryLog: [],
    },
  },
];

const INITIAL_LEADERBOARD: LeaderboardRecord[] = [
  {
    id: 'lb-1',
    missionId: 'mission-mare-tranquillitatis',
    missionName: 'Apollo Legacy: Sea of Tranquility Basalt Run',
    author: 'Dr. Elena Rostova (ESA)',
    algorithm: 'DIJKSTRA',
    terrainType: 'FLAT',
    efficiencyScore: 97.8,
    distanceTraveledMeters: 72.1,
    energyConsumedWh: 135.2,
    durationSeconds: 98,
    date: '2026-08-20',
  },
  {
    id: 'lb-2',
    missionId: 'mission-shackleton-survey',
    missionName: 'Artemis III: Shackleton Crater Rim Traverse',
    author: 'Commander Vance (NASA JPL)',
    algorithm: 'ASTAR',
    terrainType: 'CRATER_FIELD',
    efficiencyScore: 94.2,
    distanceTraveledMeters: 89.4,
    energyConsumedWh: 218.4,
    durationSeconds: 142,
    date: '2026-08-15',
  },
  {
    id: 'lb-3',
    missionId: 'mission-highland-plateau',
    missionName: 'Lunar Highlands: Montes Apenninus Ridge Crossing',
    author: 'Astronav AI Group',
    algorithm: 'GREEDY_BFS',
    terrainType: 'HILLY',
    efficiencyScore: 88.5,
    distanceTraveledMeters: 98.6,
    energyConsumedWh: 340.5,
    durationSeconds: 165,
    date: '2026-09-01',
  },
];

class DatabaseService {
  private memoryDb: DatabaseSchema | null = null;

  private initDatabase(): DatabaseSchema {
    if (this.memoryDb) {
      return this.memoryDb;
    }

    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.memoryDb = JSON.parse(raw);
        return this.memoryDb!;
      }

      const initialData: DatabaseSchema = {
        missions: INITIAL_MISSIONS,
        leaderboard: INITIAL_LEADERBOARD,
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      this.memoryDb = initialData;
      return this.memoryDb;
    } catch (err) {
      console.warn('Filesystem persistence unavailable, falling back to memory store:', err);
      this.memoryDb = {
        missions: INITIAL_MISSIONS,
        leaderboard: INITIAL_LEADERBOARD,
      };
      return this.memoryDb;
    }
  }

  private saveDatabase(): void {
    if (!this.memoryDb) return;
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.memoryDb, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist database to disk:', err);
    }
  }

  public getMissions(options?: {
    isPublic?: boolean;
    search?: string;
    tag?: string;
    sortBy?: 'latest' | 'popular' | 'score';
    limit?: number;
    offset?: number;
  }): { items: CloudMissionRecord[]; total: number } {
    const db = this.initDatabase();
    let list = [...db.missions];

    if (options?.isPublic !== undefined) {
      list = list.filter((m) => m.isPublic === options.isPublic);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (options?.tag) {
      const tagLower = options.tag.toLowerCase();
      list = list.filter((m) => m.tags?.some((t) => t.toLowerCase() === tagLower));
    }

    if (options?.sortBy === 'popular') {
      list.sort((a, b) => b.likes - a.likes);
    } else if (options?.sortBy === 'score') {
      list.sort((a, b) => (b.results?.efficiencyScore || 0) - (a.results?.efficiencyScore || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = list.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const items = list.slice(offset, offset + limit);

    return { items, total };
  }

  public getMissionById(id: string): CloudMissionRecord | null {
    const db = this.initDatabase();
    const mission = db.missions.find((m) => m.id === id);
    if (mission) {
      mission.views = (mission.views || 0) + 1;
      this.saveDatabase();
      return mission;
    }
    return null;
  }

  public createMission(data: Partial<CloudMissionRecord>): CloudMissionRecord {
    const db = this.initDatabase();
    const id = data.id || `mission-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newRecord: CloudMissionRecord = {
      id,
      name: data.name || 'Untitled Lunar Mission',
      author: data.author || 'Anonymous Astro-Explorer',
      authorAvatar: data.authorAvatar,
      isPublic: data.isPublic ?? true,
      likes: 0,
      views: 1,
      forkCount: 0,
      tags: data.tags || ['Custom'],
      date: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
      terrainType: data.terrainType || 'CRATER_FIELD',
      seed: data.seed ?? Math.floor(Math.random() * 100000),
      algorithm: data.algorithm || 'ASTAR',
      start: data.start || { x: 5, y: 5 },
      target: data.target || { x: 45, y: 45 },
      roverConfig: data.roverConfig || DEFAULT_ROVER_CONFIG,
      obstacles: data.obstacles,
      obstacleToggles: data.obstacleToggles,
      calculatedPath: data.calculatedPath,
      results: data.results,
    };

    db.missions.unshift(newRecord);
    this.saveDatabase();

    if (newRecord.results && newRecord.results.outcome === 'SUCCESS') {
      this.addLeaderboardEntry({
        id: `lb-${newRecord.id}`,
        missionId: newRecord.id,
        missionName: newRecord.name,
        author: newRecord.author,
        algorithm: newRecord.algorithm,
        terrainType: newRecord.terrainType,
        efficiencyScore: newRecord.results.efficiencyScore,
        distanceTraveledMeters: newRecord.results.distanceTraveledMeters,
        energyConsumedWh: newRecord.results.energyConsumedWh,
        durationSeconds: newRecord.results.durationSeconds,
        date: newRecord.date,
      });
    }

    return newRecord;
  }

  public updateMission(id: string, updates: Partial<CloudMissionRecord>): CloudMissionRecord | null {
    const db = this.initDatabase();
    const index = db.missions.findIndex((m) => m.id === id);
    if (index === -1) return null;

    db.missions[index] = {
      ...db.missions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveDatabase();
    return db.missions[index];
  }

  public deleteMission(id: string): boolean {
    const db = this.initDatabase();
    const index = db.missions.findIndex((m) => m.id === id);
    if (index === -1) return false;

    db.missions.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  public likeMission(id: string): { likes: number } | null {
    const db = this.initDatabase();
    const mission = db.missions.find((m) => m.id === id);
    if (!mission) return null;

    mission.likes = (mission.likes || 0) + 1;
    this.saveDatabase();
    return { likes: mission.likes };
  }

  public getLeaderboard(options?: {
    algorithm?: string;
    terrainType?: string;
    limit?: number;
  }): LeaderboardRecord[] {
    const db = this.initDatabase();
    let entries = [...db.leaderboard];

    if (options?.algorithm) {
      entries = entries.filter((e) => e.algorithm === options.algorithm);
    }
    if (options?.terrainType) {
      entries = entries.filter((e) => e.terrainType === options.terrainType);
    }

    entries.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    const limit = options?.limit || 20;
    return entries.slice(0, limit);
  }

  public addLeaderboardEntry(entry: LeaderboardRecord): void {
    const db = this.initDatabase();
    const existingIndex = db.leaderboard.findIndex((e) => e.missionId === entry.missionId);
    if (existingIndex >= 0) {
      if (entry.efficiencyScore > db.leaderboard[existingIndex].efficiencyScore) {
        db.leaderboard[existingIndex] = entry;
      }
    } else {
      db.leaderboard.push(entry);
    }
    this.saveDatabase();
  }
}

export const dbService = new DatabaseService();
