import { TerrainGrid } from '@/types/terrain';
import {
  Point2D,
  PathfindingOptions,
  PathfindingResult,
  PathNode,
  HeuristicType,
  PathVisualizationData,
} from '@/types/pathfinding';
import {
  IPathfinder,
  PriorityQueue,
  NEIGHBOR_OFFSETS,
  resolveCellCost,
  isCellBlocked,
  resolveEffectiveWeights,
  calculateMultiObjectiveTransitionCost,
  computeMultiObjectiveMetrics,
} from './PathfinderInterface';
import { octileDistance, euclideanDistance, manhattanDistance } from '@/lib/math';
import { PathOptimizer } from './PathOptimizer';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

export class AStarPathfinder implements IPathfinder {
  public findPath(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const startTime = performance.now();
    const heuristicType: HeuristicType = options.heuristic ?? 'OCTILE';
    const allowDiagonal = options.allowDiagonal ?? true;
    const shouldOptimize = options.optimizePath !== false;
    const roverConfig = options.roverConfig ?? DEFAULT_ROVER_CONFIG;
    const { strategy, weights } = resolveEffectiveWeights(options);

    // Validate bounds
    if (
      start.x < 0 || start.x >= grid.width || start.y < 0 || start.y >= grid.height ||
      target.x < 0 || target.x >= grid.width || target.y < 0 || target.y >= grid.height
    ) {
      return this.failure('Start or Target position out of grid bounds');
    }

    const startCell = grid.cells[start.y][start.x];
    const targetCell = grid.cells[target.y][target.x];

    if (isCellBlocked(startCell, options)) {
      return this.failure('Start coordinates are situated inside an impassable obstacle or crater');
    }
    if (isCellBlocked(targetCell, options)) {
      return this.failure('Target destination coordinates are inside an impassable obstacle or crater');
    }

    // Heuristic function h(n)
    // Scale heuristic conservatively to maintain admissibility under weighted costs
    const heuristicScale = Math.max(0.5, (weights.distance * 1.0 + weights.time * 0.5 + 0.2));
    const getH = (p: Point2D): number => {
      let d = 0;
      if (heuristicType === 'OCTILE') d = octileDistance(p, target);
      else if (heuristicType === 'EUCLIDEAN') d = euclideanDistance(p, target);
      else d = manhattanDistance(p, target);
      return d * grid.resolution * heuristicScale;
    };

    const openSet = new PriorityQueue<PathNode>();
    const closedSet = new Uint8Array(grid.width * grid.height);
    const gScores = new Float32Array(grid.width * grid.height).fill(Infinity);
    const nodeMap = new Map<number, PathNode>();

    const startIndex = start.y * grid.width + start.x;
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      elevation: startCell.elevation,
      gCost: 0,
      hCost: getH(start),
      fCost: getH(start), // f(n) = g(n) + h(n)
    };

    gScores[startIndex] = 0;
    openSet.push(startNode, startNode.fCost);
    nodeMap.set(startIndex, startNode);

    const exploredNodes: Point2D[] = [];
    let goalNode: PathNode | null = null;

    const neighborList = allowDiagonal ? NEIGHBOR_OFFSETS : NEIGHBOR_OFFSETS.slice(0, 4);

    while (!openSet.isEmpty()) {
      const current = openSet.pop()!;
      const currentIndex = current.y * grid.width + current.x;

      if (closedSet[currentIndex] === 1) continue;
      closedSet[currentIndex] = 1;
      exploredNodes.push({ x: current.x, y: current.y });

      // Destination reached
      if (current.x === target.x && current.y === target.y) {
        goalNode = current;
        break;
      }

      const currentCell = grid.cells[current.y][current.x];

      for (const offset of neighborList) {
        const nx = current.x + offset.dx;
        const ny = current.y + offset.dy;

        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;

        const nIndex = ny * grid.width + nx;
        if (closedSet[nIndex] === 1) continue;

        const nCell = grid.cells[ny][nx];
        const cellCost = resolveCellCost(nCell, options);
        if (cellCost >= Infinity || isCellBlocked(nCell, options)) continue;

        // Prevent diagonal cutting through two blocked adjacent cells
        if (offset.isDiag && offset.adj1 && offset.adj2) {
          const adj1 = grid.cells[current.y + offset.adj1.dy][current.x + offset.adj1.dx];
          const adj2 = grid.cells[current.y + offset.adj2.dy][current.x + offset.adj2.dx];
          if (isCellBlocked(adj1, options) && isCellBlocked(adj2, options)) continue;
        }

        // Multi-objective transition cost calculation
        const { totalCost: stepCost } = calculateMultiObjectiveTransitionCost(
          currentCell,
          nCell,
          offset.cost,
          grid.resolution,
          roverConfig,
          weights,
          options
        );

        // g(n) = accumulated cost to reach neighbor in metric units
        const tentativeG = current.gCost + (stepCost * grid.resolution);

        if (tentativeG < gScores[nIndex]) {
          gScores[nIndex] = tentativeG;
          const h = getH({ x: nx, y: ny });
          const neighborNode: PathNode = {
            x: nx,
            y: ny,
            elevation: nCell.elevation,
            gCost: tentativeG,
            hCost: h,
            fCost: tentativeG + h, // f(n) = g(n) + h(n)
            parent: current,
          };
          nodeMap.set(nIndex, neighborNode);
          openSet.push(neighborNode, neighborNode.fCost);
        }
      }
    }

    const executionTimeMs = performance.now() - startTime;

    if (!goalNode) {
      return {
        algorithm: 'ASTAR',
        strategy,
        weights,
        path: [],
        rawPath: [],
        optimizedPath: [],
        exploredNodes,
        totalDistanceMeters: 0,
        totalDistance: 0,
        totalMovementCost: 0,
        nodesEvaluated: exploredNodes.length,
        nodesExploredCount: exploredNodes.length,
        executionTimeMs: Number(executionTimeMs.toFixed(2)),
        computeTimeMs: Number(executionTimeMs.toFixed(2)),
        success: false,
        failureReason: 'No traversable path found to destination (target blocked by terrain hazards)',
        estimatedEnergyWh: 0,
        estimatedTravelTimeSeconds: 0,
        averageSlopeDeg: 0,
        maxSlopeDeg: 0,
        riskScore: 0,
        batteryRemainingPct: 100,
        feasibility: 'INFEASIBLE',
        feasibilityWarning: 'No route available to target.',
      };
    }

    // Reconstruct raw discrete grid path
    const rawPath: Point2D[] = [];
    let curr: PathNode | undefined = goalNode;
    while (curr) {
      rawPath.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }

    // Path optimization (prune unnecessary intermediate points while preserving clearance)
    const optimizedPath = shouldOptimize
      ? PathOptimizer.optimizePath(grid, rawPath, options)
      : rawPath;

    const finalPath = optimizedPath;

    // Full multi-objective metrics
    const metrics = computeMultiObjectiveMetrics(grid, finalPath, roverConfig, weights, options);

    const visualizationData: PathVisualizationData = {
      waypoints: finalPath,
      exploredSequence: exploredNodes,
      segments: metrics.segments,
    };

    return {
      algorithm: 'ASTAR',
      strategy,
      weights,
      path: finalPath,
      rawPath,
      optimizedPath,
      exploredNodes,
      totalDistanceMeters: metrics.totalDistanceMeters,
      totalDistance: metrics.totalDistanceMeters,
      totalMovementCost: metrics.totalMovementCost,
      nodesEvaluated: exploredNodes.length,
      nodesExploredCount: exploredNodes.length,
      executionTimeMs: Number(executionTimeMs.toFixed(2)),
      computeTimeMs: Number(executionTimeMs.toFixed(2)),
      success: true,
      estimatedEnergyWh: metrics.estimatedEnergyWh,
      estimatedTravelTimeSeconds: metrics.estimatedTravelTimeSeconds,
      averageSlopeDeg: metrics.averageSlopeDeg,
      maxSlopeDeg: metrics.maxSlopeDeg,
      riskScore: metrics.riskScore,
      batteryRemainingPct: metrics.batteryRemainingPct,
      feasibility: metrics.feasibility,
      feasibilityWarning: metrics.feasibilityWarning,
      costBreakdown: metrics.costBreakdown,
      visualizationData,
    };
  }

  private failure(reason: string): PathfindingResult {
    return {
      algorithm: 'ASTAR',
      path: [],
      rawPath: [],
      optimizedPath: [],
      exploredNodes: [],
      totalDistanceMeters: 0,
      totalDistance: 0,
      totalMovementCost: 0,
      nodesEvaluated: 0,
      nodesExploredCount: 0,
      executionTimeMs: 0,
      computeTimeMs: 0,
      success: false,
      failureReason: reason,
      estimatedEnergyWh: 0,
      estimatedTravelTimeSeconds: 0,
      averageSlopeDeg: 0,
      maxSlopeDeg: 0,
      riskScore: 0,
      batteryRemainingPct: 100,
      feasibility: 'INFEASIBLE',
      feasibilityWarning: reason,
    };
  }
}
