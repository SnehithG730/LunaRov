import { SavedMission } from './mission';
import { AlgorithmType, Point2D } from './pathfinding';
import { TerrainType } from './terrain';

export interface CloudMissionRecord extends SavedMission {
  author: string;
  authorAvatar?: string;
  isPublic: boolean;
  likes: number;
  views: number;
  forkCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardRecord {
  id: string;
  missionId: string;
  missionName: string;
  author: string;
  algorithm: AlgorithmType;
  terrainType: TerrainType;
  efficiencyScore: number;
  distanceTraveledMeters: number;
  energyConsumedWh: number;
  durationSeconds: number;
  date: string;
}

export interface AiMissionAdviceRequest {
  terrainType: TerrainType;
  start: Point2D;
  target: Point2D;
  gridSize: number;
  obstacleCount: number;
  preferredAlgorithm?: AlgorithmType;
}

export interface AiMissionAdviceResponse {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedAlgorithm: AlgorithmType;
  strategicBriefing: string;
  tacticalRecommendations: string[];
  energyProfileAdvice: string;
  estimatedSuccessRatePct: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
