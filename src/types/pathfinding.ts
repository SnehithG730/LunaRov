import { RoverConfig } from '@/types/rover';

export type AlgorithmType = 'ASTAR' | 'DIJKSTRA' | 'GREEDY_BFS' | 'MANUAL';
export type HeuristicType = 'EUCLIDEAN' | 'OCTILE' | 'MANHATTAN';

export type OptimizationStrategy =
  | 'SHORTEST'
  | 'MIN_ENERGY'
  | 'SAFEST'
  | 'FASTEST'
  | 'BALANCED'
  | 'CUSTOM';

export interface ObjectiveWeights {
  distance: number; // 0..1
  energy: number;   // 0..1
  slope: number;    // 0..1
  risk: number;     // 0..1
  time: number;     // 0..1
}

export const OPTIMIZATION_STRATEGY_PRESETS: Record<
  Exclude<OptimizationStrategy, 'CUSTOM'>,
  ObjectiveWeights
> = {
  SHORTEST: { distance: 1.0, energy: 0.0, slope: 0.1, risk: 0.1, time: 0.0 },
  MIN_ENERGY: { distance: 0.2, energy: 1.0, slope: 0.8, risk: 0.3, time: 0.1 },
  SAFEST: { distance: 0.1, energy: 0.2, slope: 0.9, risk: 1.0, time: 0.0 },
  FASTEST: { distance: 0.4, energy: 0.1, slope: 0.3, risk: 0.2, time: 1.0 },
  BALANCED: { distance: 0.5, energy: 0.5, slope: 0.5, risk: 0.5, time: 0.5 },
};

export const STRATEGY_METADATA: Record<
  OptimizationStrategy,
  { label: string; shortDesc: string; tag: string; color: string }
> = {
  SHORTEST: {
    label: 'Shortest Distance',
    shortDesc: 'Minimizes spatial travel distance; accepts steep slopes for direct path.',
    tag: 'DISTANCE',
    color: '#06b6d4', // cyan-500
  },
  MIN_ENERGY: {
    label: 'Minimum Energy',
    shortDesc: 'Contours around elevation changes to preserve battery capacity.',
    tag: 'EFFICIENCY',
    color: '#10b981', // emerald-500
  },
  SAFEST: {
    label: 'Safest Route',
    shortDesc: 'Maximizes obstacle clearance and strictly avoids high slopes/craters.',
    tag: 'MAX SAFETY',
    color: '#3b82f6', // blue-500
  },
  FASTEST: {
    label: 'Fastest Route',
    shortDesc: 'Optimizes travel time by picking smooth high-speed regolith corridors.',
    tag: 'HIGH SPEED',
    color: '#f59e0b', // amber-500
  },
  BALANCED: {
    label: 'Balanced',
    shortDesc: 'Equal weighting across distance, energy, slope, risk, and travel time.',
    tag: 'RECOMMENDED',
    color: '#a855f7', // purple-500
  },
  CUSTOM: {
    label: 'Custom Weights',
    shortDesc: 'User-tailored multi-objective weighting coefficients.',
    tag: 'OPERATOR',
    color: '#ec4899', // pink-500
  },
};

export interface Point2D {
  x: number;
  y: number;
}

export interface PathNode {
  x: number;
  y: number;
  elevation: number;
  gCost: number;        // Accumulated actual cost from start
  hCost: number;        // Heuristic estimated cost to target
  fCost: number;        // Total cost f = g + h
  parent?: PathNode;
  openedAtStep?: number;
}

export interface MovementCosts {
  normal: number;    // Normal regolith (default: 1)
  rock: number;      // Boulder / rock debris (default: 3)
  slope: number;     // Moderate slope (default: 5)
  danger: number;    // High danger / steep slope (default: 10)
  crater: number;    // Crater / obstacle (default: Infinity / blocked)
}

export interface PathfindingOptions {
  heuristic?: HeuristicType;
  allowDiagonal?: boolean;
  movementCosts?: Partial<MovementCosts>;
  blockedNodes?: Set<string> | Point2D[];
  customBlockedNodes?: Point2D[];
  optimizePath?: boolean;
  slopeCostWeight?: number;
  roughnessCostWeight?: number;
  strategy?: OptimizationStrategy;
  weights?: ObjectiveWeights;
  customWeights?: Partial<ObjectiveWeights>;
  roverConfig?: RoverConfig;
}

export interface PathVisualizationSegment {
  from: Point2D;
  to: Point2D;
  cost: number;
  distanceMeters: number;
  slopeDeg?: number;
  energyWh?: number;
}

export interface PathVisualizationData {
  waypoints: Point2D[];
  exploredSequence: Point2D[];
  segments: PathVisualizationSegment[];
}

export type MissionFeasibility = 'FEASIBLE' | 'WARNING' | 'INFEASIBLE';

export interface CostBreakdown {
  distanceCost: number;
  energyCost: number;
  slopeCost: number;
  riskCost: number;
  timeCost: number;
  totalWeightedCost: number;
}

export interface PathfindingResult {
  algorithm: AlgorithmType;
  strategy?: OptimizationStrategy;
  weights?: ObjectiveWeights;
  path: Point2D[];
  rawPath?: Point2D[];
  optimizedPath?: Point2D[];
  exploredNodes: Point2D[];
  totalDistanceMeters: number;
  totalDistance: number;              // Standard alias
  totalMovementCost: number;          // Accumulated movement cost
  nodesEvaluated: number;             // Total nodes evaluated
  nodesExploredCount: number;         // Backwards-compatible alias
  executionTimeMs: number;            // Total execution time in ms
  computeTimeMs: number;              // Backwards-compatible alias
  success: boolean;
  failureReason?: string;
  estimatedEnergyWh: number;
  estimatedTravelTimeSeconds: number;
  averageSlopeDeg: number;
  maxSlopeDeg: number;
  riskScore: number;                  // 0..100
  batteryRemainingPct: number;
  feasibility: MissionFeasibility;
  feasibilityWarning?: string;
  costBreakdown?: CostBreakdown;
  visualizationData?: PathVisualizationData;
}

export interface AlgorithmComparisonItem {
  algorithm: AlgorithmType;
  distance: number;
  cost: number;
  nodesExplored: number;
  computationTimeMs: number;
  success: boolean;
  pathLength: number;
  failureReason?: string;
}

export interface AlgorithmComparisonResult {
  results: Partial<Record<AlgorithmType, PathfindingResult>>;
  comparison: AlgorithmComparisonItem[];
  fastest?: AlgorithmType;
  shortestDistance?: AlgorithmType;
  lowestCost?: AlgorithmType;
  fewestNodesExplored?: AlgorithmType;
}

export interface StrategyComparisonItem {
  strategy: OptimizationStrategy;
  name: string;
  distanceMeters: number;
  estimatedEnergyWh: number;
  estimatedTravelTimeSeconds: number;
  averageSlopeDeg: number;
  maxSlopeDeg: number;
  riskScore: number;
  batteryRemainingPct: number;
  feasibility: MissionFeasibility;
  totalCost: number;
  nodesExplored: number;
  computeTimeMs: number;
  success: boolean;
  path: Point2D[];
}

export interface StrategyComparisonResult {
  results: Record<OptimizationStrategy, PathfindingResult | null>;
  comparisons: StrategyComparisonItem[];
  lowestEnergyStrategy?: OptimizationStrategy;
  safestStrategy?: OptimizationStrategy;
  shortestDistanceStrategy?: OptimizationStrategy;
  fastestStrategy?: OptimizationStrategy;
  balancedStrategy?: OptimizationStrategy;
}

