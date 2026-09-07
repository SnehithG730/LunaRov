import { TerrainGrid } from '@/types/terrain';
import {
  Point2D,
  PathfindingOptions,
  PathfindingResult,
  PathNode,
  PathVisualizationData,
  PathVisualizationSegment,
} from '@/types/pathfinding';
import {
  IPathfinder,
  PriorityQueue,
  NEIGHBOR_OFFSETS,
  resolveCellCost,
  isCellBlocked,
} from './PathfinderInterface';
import { PathOptimizer } from './PathOptimizer';

export class DijkstraPathfinder implements IPathfinder {
  public findPath(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const startTime = performance.now();
    const allowDiagonal = options.allowDiagonal ?? true;
    const shouldOptimize = options.optimizePath !== false;

    if (
      start.x < 0 || start.x >= grid.width || start.y < 0 || start.y >= grid.height ||
      target.x < 0 || target.x >= grid.width || target.y < 0 || target.y >= grid.height
    ) {
      return this.failure('Start or Target position out of grid bounds');
    }

    const startCell = grid.cells[start.y][start.x];
    const targetCell = grid.cells[target.y][target.x];

    if (isCellBlocked(startCell, options)) {
      return this.failure('Start coordinates are situated inside an obstacle or crater');
    }
    if (isCellBlocked(targetCell, options)) {
      return this.failure('Target destination coordinates are inside an obstacle or crater');
    }

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
      hCost: 0, // Uniform cost: zero heuristic
      fCost: 0,
    };

    gScores[startIndex] = 0;
    openSet.push(startNode, 0);
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

      if (current.x === target.x && current.y === target.y) {
        goalNode = current;
        break;
      }

      for (const offset of neighborList) {
        const nx = current.x + offset.dx;
        const ny = current.y + offset.dy;

        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;

        const nIndex = ny * grid.width + nx;
        if (closedSet[nIndex] === 1) continue;

        const nCell = grid.cells[ny][nx];
        const cellCost = resolveCellCost(nCell, options);
        if (cellCost >= Infinity || isCellBlocked(nCell, options)) continue;

        if (offset.isDiag && offset.adj1 && offset.adj2) {
          const adj1 = grid.cells[current.y + offset.adj1.dy][current.x + offset.adj1.dx];
          const adj2 = grid.cells[current.y + offset.adj2.dy][current.x + offset.adj2.dx];
          if (isCellBlocked(adj1, options) && isCellBlocked(adj2, options)) continue;
        }

        const stepDistMeters = offset.cost * grid.resolution;
        const currentCell = grid.cells[current.y][current.x];
        const currentCost = resolveCellCost(currentCell, options);
        const avgTerrainMultiplier = (currentCost + cellCost) * 0.5;

        const elevationDiff = nCell.elevation - currentCell.elevation;
        const inclinePenalty = elevationDiff > 0 ? elevationDiff * 0.8 : 0;

        const stepMovementCost = (stepDistMeters * avgTerrainMultiplier) + inclinePenalty;
        const tentativeG = current.gCost + stepMovementCost;

        if (tentativeG < gScores[nIndex]) {
          gScores[nIndex] = tentativeG;
          const neighborNode: PathNode = {
            x: nx,
            y: ny,
            elevation: nCell.elevation,
            gCost: tentativeG,
            hCost: 0,
            fCost: tentativeG,
            parent: current,
          };
          nodeMap.set(nIndex, neighborNode);
          openSet.push(neighborNode, tentativeG);
        }
      }
    }

    const executionTimeMs = performance.now() - startTime;

    if (!goalNode) {
      return {
        algorithm: 'DIJKSTRA',
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
        failureReason: 'No traversable path found (target blocked by terrain hazards)',
        estimatedEnergyWh: 0,
      };
    }

    const rawPath: Point2D[] = [];
    let curr: PathNode | undefined = goalNode;
    while (curr) {
      rawPath.unshift({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }

    const optimizedPath = shouldOptimize
      ? PathOptimizer.optimizePath(grid, rawPath, options)
      : rawPath;

    const finalPath = optimizedPath;

    let totalDistanceMeters = 0;
    const segments: PathVisualizationSegment[] = [];
    let totalMovementCost = 0;

    for (let i = 0; i < finalPath.length - 1; i++) {
      const p1 = finalPath[i];
      const p2 = finalPath[i + 1];
      const dx = (p2.x - p1.x) * grid.resolution;
      const dy = (p2.y - p1.y) * grid.resolution;
      const dz = grid.cells[p2.y][p2.x].elevation - grid.cells[p1.y][p1.x].elevation;
      const segDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      totalDistanceMeters += segDist;

      const segCost = resolveCellCost(grid.cells[p2.y][p2.x], options);
      totalMovementCost += segCost * segDist;

      segments.push({
        from: p1,
        to: p2,
        cost: Number(segCost.toFixed(2)),
        distanceMeters: Number(segDist.toFixed(2)),
      });
    }

    const estimatedEnergyWh = goalNode.gCost * 0.45;

    const visualizationData: PathVisualizationData = {
      waypoints: finalPath,
      exploredSequence: exploredNodes,
      segments,
    };

    return {
      algorithm: 'DIJKSTRA',
      path: finalPath,
      rawPath,
      optimizedPath,
      exploredNodes,
      totalDistanceMeters: Number(totalDistanceMeters.toFixed(2)),
      totalDistance: Number(totalDistanceMeters.toFixed(2)),
      totalMovementCost: Number(totalMovementCost.toFixed(2)),
      nodesEvaluated: exploredNodes.length,
      nodesExploredCount: exploredNodes.length,
      executionTimeMs: Number(executionTimeMs.toFixed(2)),
      computeTimeMs: Number(executionTimeMs.toFixed(2)),
      success: true,
      estimatedEnergyWh: Number(estimatedEnergyWh.toFixed(1)),
      visualizationData,
    };
  }

  private failure(reason: string): PathfindingResult {
    return {
      algorithm: 'DIJKSTRA',
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
    };
  }
}
