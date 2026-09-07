export type AlgorithmType = 'ASTAR' | 'DIJKSTRA' | 'GREEDY_BFS' | 'MANUAL';
export type HeuristicType = 'EUCLIDEAN' | 'OCTILE' | 'MANHATTAN';

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
  optimizePath?: boolean;
  slopeCostWeight?: number;
  roughnessCostWeight?: number;
}

export interface PathVisualizationSegment {
  from: Point2D;
  to: Point2D;
  cost: number;
  distanceMeters: number;
}

export interface PathVisualizationData {
  waypoints: Point2D[];
  exploredSequence: Point2D[];
  segments: PathVisualizationSegment[];
}

export interface PathfindingResult {
  algorithm: AlgorithmType;
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

