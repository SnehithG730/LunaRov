import { TerrainGrid, TerrainCell } from '@/types/terrain';
import {
  Point2D,
  PathfindingOptions,
  PathfindingResult,
  HeuristicType,
  ReplanTelemetry,
  PathVisualizationData,
  PathVisualizationSegment,
} from '@/types/pathfinding';
import {
  IPathfinder,
  isCellBlocked,
  resolveCellCost,
  NEIGHBOR_OFFSETS,
  computeMultiObjectiveMetrics,
  resolveEffectiveWeights,
} from './PathfinderInterface';
import { PathOptimizer } from './PathOptimizer';
import { DEFAULT_ROVER_CONFIG } from '@/lib/constants';

export interface DStarKey {
  k1: number;
  k2: number;
}

export function compareKeys(a: DStarKey, b: DStarKey): number {
  if (Math.abs(a.k1 - b.k1) > 1e-6) {
    return a.k1 - b.k1;
  }
  return a.k2 - b.k2;
}

export interface DStarNode {
  x: number;
  y: number;
  g: number;
  rhs: number;
  key: DStarKey;
  inHeap: boolean;
  heapIndex: number;
}

/**
 * Specialized Indexed Binary Min-Heap for D* Lite
 * Supports O(log N) push, pop, updateKey, and remove operations
 */
export class DStarPriorityQueue {
  private heap: DStarNode[] = [];

  public push(node: DStarNode): void {
    node.heapIndex = this.heap.length;
    node.inHeap = true;
    this.heap.push(node);
    this.bubbleUp(node.heapIndex);
  }

  public pop(): DStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    top.inHeap = false;
    top.heapIndex = -1;

    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      bottom.heapIndex = 0;
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public update(node: DStarNode, newKey: DStarKey): void {
    node.key = newKey;
    if (!node.inHeap) {
      this.push(node);
    } else {
      const idx = node.heapIndex;
      this.bubbleUp(idx);
      this.sinkDown(node.heapIndex);
    }
  }

  public remove(node: DStarNode): void {
    if (!node.inHeap) return;
    const idx = node.heapIndex;
    const bottom = this.heap.pop()!;
    node.inHeap = false;
    node.heapIndex = -1;

    if (idx < this.heap.length) {
      bottom.heapIndex = idx;
      this.heap[idx] = bottom;
      this.bubbleUp(idx);
      this.sinkDown(idx);
    }
  }

  public topKey(): DStarKey {
    if (this.heap.length === 0) {
      return { k1: Infinity, k2: Infinity };
    }
    return this.heap[0].key;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public size(): number {
    return this.heap.length;
  }

  public clear(): void {
    for (const node of this.heap) {
      node.inHeap = false;
      node.heapIndex = -1;
    }
    this.heap = [];
  }

  private bubbleUp(index: number): void {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (compareKeys(node.key, parent.key) >= 0) break;

      this.heap[index] = parent;
      parent.heapIndex = index;

      this.heap[parentIdx] = node;
      node.heapIndex = parentIdx;

      index = parentIdx;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const node = this.heap[index];

    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx: number | null = null;
      let minKey = node.key;

      if (leftChildIdx < length) {
        const leftNode = this.heap[leftChildIdx];
        if (compareKeys(leftNode.key, minKey) < 0) {
          swapIdx = leftChildIdx;
          minKey = leftNode.key;
        }
      }

      if (rightChildIdx < length) {
        const rightNode = this.heap[rightChildIdx];
        if (compareKeys(rightNode.key, minKey) < 0) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;

      const swapNode = this.heap[swapIdx];
      this.heap[index] = swapNode;
      swapNode.heapIndex = index;

      this.heap[swapIdx] = node;
      node.heapIndex = swapIdx;

      index = swapIdx;
    }
  }
}

/**
 * Stateful D* Lite Incremental Engine
 * Supports real-time dynamic edge-cost updates without graph rebuilding
 */
export class DStarLiteEngine {
  private grid: TerrainGrid;
  private options: PathfindingOptions;
  private width: number;
  private height: number;
  private nodes: DStarNode[][];
  private openList: DStarPriorityQueue;
  private sStart: Point2D;
  private sGoal: Point2D;
  private sLast: Point2D;
  private km: number;
  private evaluatedCount: number;
  private exploredSet: Set<string>;

  constructor(
    grid: TerrainGrid,
    start: Point2D,
    goal: Point2D,
    options: PathfindingOptions = {}
  ) {
    this.grid = grid;
    this.options = options;
    this.width = grid.width;
    this.height = grid.height;
    this.openList = new DStarPriorityQueue();
    this.sStart = { ...start };
    this.sGoal = { ...goal };
    this.sLast = { ...start };
    this.km = 0;
    this.evaluatedCount = 0;
    this.exploredSet = new Set<string>();

    this.nodes = [];
    for (let y = 0; y < this.height; y++) {
      this.nodes[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.nodes[y][x] = {
          x,
          y,
          g: Infinity,
          rhs: Infinity,
          key: { k1: Infinity, k2: Infinity },
          inHeap: false,
          heapIndex: -1,
        };
      }
    }

    this.initialize();
  }

  private heuristic(a: Point2D, b: Point2D): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const type: HeuristicType = this.options.heuristic ?? 'OCTILE';
    let d = 0;

    if (type === 'EUCLIDEAN') {
      d = Math.hypot(dx, dy);
    } else if (type === 'MANHATTAN') {
      d = dx + dy;
    } else {
      // Default: Octile distance with diagonal metric
      d = Math.max(dx, dy) + (Math.SQRT2 - 1.0) * Math.min(dx, dy);
    }
    return d * this.grid.resolution;
  }

  private calculateKey(node: DStarNode): DStarKey {
    const minVal = Math.min(node.g, node.rhs);
    return {
      k1: minVal + this.heuristic(this.sStart, { x: node.x, y: node.y }) + this.km,
      k2: minVal,
    };
  }

  private initialize(): void {
    this.openList.clear();
    this.km = 0;
    this.evaluatedCount = 0;
    this.exploredSet.clear();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const n = this.nodes[y][x];
        n.g = Infinity;
        n.rhs = Infinity;
        n.inHeap = false;
        n.heapIndex = -1;
      }
    }

    if (
      this.sGoal.x >= 0 &&
      this.sGoal.x < this.width &&
      this.sGoal.y >= 0 &&
      this.sGoal.y < this.height
    ) {
      const goalNode = this.nodes[this.sGoal.y][this.sGoal.x];
      goalNode.rhs = 0;
      goalNode.key = this.calculateKey(goalNode);
      this.openList.push(goalNode);
    }
  }

  /**
   * Calculates transition cost c(u, v) from node u to neighbor v
   */
  public getTransitionCost(u: Point2D, v: Point2D): number {
    if (
      u.x < 0 || u.x >= this.width || u.y < 0 || u.y >= this.height ||
      v.x < 0 || v.x >= this.width || v.y < 0 || v.y >= this.height
    ) {
      return Infinity;
    }

    const cellU = this.grid.cells[u.y][u.x];
    const cellV = this.grid.cells[v.y][v.x];

    if (isCellBlocked(cellU, this.options) || isCellBlocked(cellV, this.options)) {
      return Infinity;
    }

    const dx = v.x - u.x;
    const dy = v.y - u.y;
    const isDiagonal = dx !== 0 && dy !== 0;

    // Corner-cutting prevention: diagonal traversal requires both adjacent orthogonal cells to be traversable
    if (isDiagonal) {
      const adj1 = this.grid.cells[u.y][u.x + dx];
      const adj2 = this.grid.cells[u.y + dy][u.x];
      if (isCellBlocked(adj1, this.options) || isCellBlocked(adj2, this.options)) {
        return Infinity;
      }
    }

    const distStep = isDiagonal ? Math.SQRT2 : 1.0;
    const stepDistMeters = distStep * this.grid.resolution;

    const costU = resolveCellCost(cellU, this.options);
    const costV = resolveCellCost(cellV, this.options);
    if (costU === Infinity || costV === Infinity) return Infinity;

    const avgTerrainMultiplier = (costU + costV) * 0.5;
    const elevationDiff = cellV.elevation - cellU.elevation;
    const inclinePenalty = elevationDiff > 0 ? elevationDiff * 0.8 : 0;

    return (stepDistMeters * avgTerrainMultiplier) + inclinePenalty;
  }

  /**
   * Returns valid traversable 8-directional neighbors of a node
   */
  public getNeighbors(p: Point2D): Point2D[] {
    const neighbors: Point2D[] = [];
    const allowDiag = this.options.allowDiagonal ?? true;

    for (const offset of NEIGHBOR_OFFSETS) {
      if (offset.isDiag && !allowDiag) continue;

      const nx = p.x + offset.dx;
      const ny = p.y + offset.dy;

      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  /**
   * D* Lite Vertex Update: maintains local consistency rhs(u) = min_{s' in Succ(u)} (c(u, s') + g(s'))
   */
  public updateVertex(uCoord: Point2D): void {
    const u = this.nodes[uCoord.y][uCoord.x];

    if (uCoord.x !== this.sGoal.x || uCoord.y !== this.sGoal.y) {
      let minRhs = Infinity;
      const successors = this.getNeighbors(uCoord);

      for (const succ of successors) {
        const c = this.getTransitionCost(uCoord, succ);
        const succNode = this.nodes[succ.y][succ.x];
        const val = c === Infinity || succNode.g === Infinity ? Infinity : c + succNode.g;
        if (val < minRhs) {
          minRhs = val;
        }
      }
      u.rhs = minRhs;
    }

    if (u.inHeap && Math.abs(u.g - u.rhs) < 1e-6) {
      this.openList.remove(u);
    } else if (u.inHeap && Math.abs(u.g - u.rhs) >= 1e-6) {
      this.openList.update(u, this.calculateKey(u));
    } else if (!u.inHeap && Math.abs(u.g - u.rhs) >= 1e-6) {
      this.openList.push(u);
    }
  }

  /**
   * Computes shortest path until start node is locally consistent and top key >= start key
   */
  public computeShortestPath(maxIterations: number = 60000): void {
    const startNode = this.nodes[this.sStart.y]?.[this.sStart.x];
    if (!startNode) return;

    let iterations = 0;

    while (!this.openList.isEmpty() && iterations < maxIterations) {
      iterations++;
      this.evaluatedCount++;

      const topKey = this.openList.topKey();
      const startKey = this.calculateKey(startNode);

      if (compareKeys(topKey, startKey) >= 0 && Math.abs(startNode.rhs - startNode.g) < 1e-6) {
        break;
      }

      const u = this.openList.pop();
      if (!u) break;

      this.exploredSet.add(`${u.x},${u.y}`);
      const kOld = u.key;
      const kNew = this.calculateKey(u);

      if (compareKeys(kOld, kNew) < 0) {
        this.openList.update(u, kNew);
      } else if (u.g > u.rhs) {
        u.g = u.rhs;
        const preds = this.getNeighbors({ x: u.x, y: u.y });
        for (const pred of preds) {
          this.updateVertex(pred);
        }
      } else {
        u.g = Infinity;
        this.updateVertex({ x: u.x, y: u.y });
        const preds = this.getNeighbors({ x: u.x, y: u.y });
        for (const pred of preds) {
          this.updateVertex(pred);
        }
      }
    }
  }

  /**
   * Dynamic update when new obstacles or hazards are discovered during simulation
   */
  public updateObstacles(
    hazardCells: Point2D[],
    currentRoverPos: Point2D
  ): { nodesUpdated: number } {
    let nodesUpdated = 0;

    // 1. Accumulate km adjustment for rover displacement since last replan
    this.km += this.heuristic(this.sLast, currentRoverPos);
    this.sLast = { ...currentRoverPos };
    this.sStart = { ...currentRoverPos };

    // 2. Mark dynamic blocked nodes in options
    if (!this.options.blockedNodes) {
      this.options.blockedNodes = new Set<string>();
    }
    const blockedSet =
      this.options.blockedNodes instanceof Set
        ? this.options.blockedNodes
        : new Set(this.options.blockedNodes.map((p) => `${p.x},${p.y}`));

    for (const hz of hazardCells) {
      blockedSet.add(`${hz.x},${hz.y}`);
    }
    this.options.blockedNodes = blockedSet;

    // 3. Update vertices for all predecessors of the newly blocked/affected cells
    const affectedNodesSet = new Set<string>();
    for (const hz of hazardCells) {
      affectedNodesSet.add(`${hz.x},${hz.y}`);
      const neighbors = this.getNeighbors(hz);
      for (const n of neighbors) {
        affectedNodesSet.add(`${n.x},${n.y}`);
      }
    }

    for (const key of affectedNodesSet) {
      const [x, y] = key.split(',').map(Number);
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.updateVertex({ x, y });
        nodesUpdated++;
      }
    }

    // 4. Re-run computeShortestPath
    this.computeShortestPath();

    return { nodesUpdated };
  }

  /**
   * Extracts the reconstructed optimal path from current start to goal
   */
  public extractPath(): Point2D[] {
    const path: Point2D[] = [];
    let curr: Point2D = { ...this.sStart };
    const visited = new Set<string>();
    const maxSteps = this.width * this.height * 2;

    path.push({ ...curr });
    visited.add(`${curr.x},${curr.y}`);

    let steps = 0;
    while ((curr.x !== this.sGoal.x || curr.y !== this.sGoal.y) && steps < maxSteps) {
      steps++;
      const successors = this.getNeighbors(curr);
      let bestSucc: Point2D | null = null;
      let minCost = Infinity;

      for (const succ of successors) {
        const c = this.getTransitionCost(curr, succ);
        const succNode = this.nodes[succ.y][succ.x];
        if (c === Infinity || succNode.g === Infinity) continue;

        const totalCost = c + succNode.g;
        if (totalCost < minCost) {
          minCost = totalCost;
          bestSucc = succ;
        }
      }

      if (!bestSucc || minCost === Infinity || visited.has(`${bestSucc.x},${bestSucc.y}`)) {
        // Path blocked or loop detected
        break;
      }

      curr = { ...bestSucc };
      path.push({ ...curr });
      visited.add(`${curr.x},${curr.y}`);
    }

    const reachedGoal = path.length > 0 &&
      path[path.length - 1].x === this.sGoal.x &&
      path[path.length - 1].y === this.sGoal.y;

    return reachedGoal ? path : [];
  }

  public getExploredNodes(): Point2D[] {
    const list: Point2D[] = [];
    for (const key of this.exploredSet) {
      const [x, y] = key.split(',').map(Number);
      list.push({ x, y });
    }
    return list;
  }

  public getEvaluatedCount(): number {
    return this.evaluatedCount;
  }

  public getNode(x: number, y: number): DStarNode | undefined {
    return this.nodes[y]?.[x];
  }
}

/**
 * D* Lite Pathfinder conforming to standard IPathfinder interface
 */
export class DStarLitePathfinder implements IPathfinder {
  public findPath(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const startTime = performance.now();
    const { strategy, weights } = resolveEffectiveWeights(options);
    const roverConfig = options.roverConfig ?? DEFAULT_ROVER_CONFIG;

    const makeFailure = (reason: string, explored: Point2D[] = []): PathfindingResult => ({
      algorithm: 'DSTAR_LITE',
      strategy,
      weights,
      path: [],
      rawPath: [],
      optimizedPath: [],
      exploredNodes: explored,
      totalDistanceMeters: 0,
      totalDistance: 0,
      totalMovementCost: 0,
      nodesEvaluated: explored.length,
      nodesExploredCount: explored.length,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      computeTimeMs: Number((performance.now() - startTime).toFixed(2)),
      success: false,
      failureReason: reason,
      estimatedEnergyWh: 0,
      solarEnergyGeneratedWh: 0,
      netEnergyWh: 0,
      minimumBatteryPct: 100,
      timeInIlluminationSeconds: 0,
      timeInShadowSeconds: 0,
      estimatedTravelTimeSeconds: 0,
      averageSlopeDeg: 0,
      maxSlopeDeg: 0,
      riskScore: 0,
      batteryRemainingPct: 100,
      feasibility: 'INFEASIBLE',
      feasibilityWarning: reason,
    });

    // Edge Case: Start equals Destination
    if (start.x === target.x && start.y === target.y) {
      return {
        algorithm: 'DSTAR_LITE',
        strategy,
        weights,
        path: [{ ...start }],
        rawPath: [{ ...start }],
        optimizedPath: [{ ...start }],
        exploredNodes: [{ ...start }],
        totalDistanceMeters: 0,
        totalDistance: 0,
        totalMovementCost: 0,
        nodesEvaluated: 1,
        nodesExploredCount: 1,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        computeTimeMs: Number((performance.now() - startTime).toFixed(2)),
        success: true,
        estimatedEnergyWh: 0,
        solarEnergyGeneratedWh: 0,
        netEnergyWh: 0,
        minimumBatteryPct: 100,
        timeInIlluminationSeconds: 0,
        timeInShadowSeconds: 0,
        estimatedTravelTimeSeconds: 0,
        averageSlopeDeg: 0,
        maxSlopeDeg: 0,
        riskScore: 0,
        batteryRemainingPct: 100,
        feasibility: 'FEASIBLE',
      };
    }

    // Edge Case: Start or Target out of bounds
    if (
      start.x < 0 || start.x >= grid.width || start.y < 0 || start.y >= grid.height ||
      target.x < 0 || target.x >= grid.width || target.y < 0 || target.y >= grid.height
    ) {
      return makeFailure('Start or destination point is out of sector grid bounds.');
    }

    // Edge Case: Start or Target is an impassable obstacle
    const startCell = grid.cells[start.y][start.x];
    const targetCell = grid.cells[target.y][target.x];

    if (isCellBlocked(startCell, options)) {
      return makeFailure(
        `Rover start position [${start.x}, ${start.y}] is located on an impassable obstacle or cliff.`,
        [{ ...start }]
      );
    }

    if (isCellBlocked(targetCell, options)) {
      return makeFailure(
        `Mission destination target [${target.x}, ${target.y}] is located on an impassable hazard.`,
        [{ ...start }]
      );
    }

    // Execute D* Lite Graph Search
    const engine = new DStarLiteEngine(grid, start, target, options);
    engine.computeShortestPath();

    const rawPath = engine.extractPath();
    const endTime = performance.now();
    const computeTime = Number((endTime - startTime).toFixed(2));
    const exploredNodes = engine.getExploredNodes();
    const nodesEvaluated = engine.getEvaluatedCount();

    if (rawPath.length === 0) {
      return makeFailure(
        'No traversable path exists between start and destination (terrain impassable).',
        exploredNodes
      );
    }

    // Apply path smoothing / optimization if requested
    const shouldOptimize = options.optimizePath !== false;
    const finalPath = shouldOptimize && rawPath.length > 2
      ? PathOptimizer.optimizePath(grid, rawPath, options)
      : rawPath;

    // Full multi-objective metrics
    const metrics = computeMultiObjectiveMetrics(grid, finalPath, roverConfig, weights, options);

    const visualizationData: PathVisualizationData = {
      waypoints: finalPath,
      exploredSequence: exploredNodes,
      segments: metrics.segments,
    };

    return {
      algorithm: 'DSTAR_LITE',
      strategy,
      weights,
      path: finalPath,
      rawPath,
      optimizedPath: finalPath,
      exploredNodes,
      totalDistanceMeters: metrics.totalDistanceMeters,
      totalDistance: metrics.totalDistanceMeters,
      totalMovementCost: metrics.totalMovementCost,
      nodesEvaluated,
      nodesExploredCount: nodesEvaluated,
      executionTimeMs: computeTime,
      computeTimeMs: computeTime,
      success: true,
      visualizationData,
      estimatedEnergyWh: metrics.estimatedEnergyWh,
      solarEnergyGeneratedWh: metrics.solarEnergyGeneratedWh,
      netEnergyWh: metrics.netEnergyWh,
      minimumBatteryPct: metrics.minimumBatteryPct,
      timeInIlluminationSeconds: metrics.timeInIlluminationSeconds,
      timeInShadowSeconds: metrics.timeInShadowSeconds,
      estimatedTravelTimeSeconds: metrics.estimatedTravelTimeSeconds,
      averageSlopeDeg: metrics.averageSlopeDeg,
      maxSlopeDeg: metrics.maxSlopeDeg,
      riskScore: metrics.riskScore,
      batteryRemainingPct: metrics.batteryRemainingPct,
      feasibility: metrics.feasibility,
      feasibilityWarning: metrics.feasibilityWarning,
      costBreakdown: metrics.costBreakdown,
    };
  }
}
