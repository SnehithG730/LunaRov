import { TerrainGrid } from '@/types/terrain';
import {
  Point2D,
  AlgorithmType,
  PathfindingOptions,
  PathfindingResult,
  AlgorithmComparisonItem,
  AlgorithmComparisonResult,
} from '@/types/pathfinding';
import { AStarPathfinder } from './AStar';
import { DijkstraPathfinder } from './Dijkstra';
import { GreedyBFSPathfinder } from './GreedyBFS';
import { DStarLitePathfinder } from './DStarLite';

export class AlgorithmComparator {
  /**
   * Executes multiple pathfinding algorithms against the identical terrain grid,
   * start point, and destination point, returning a comparative performance report.
   */
  public static compare(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options: PathfindingOptions = {},
    algorithms: AlgorithmType[] = ['ASTAR', 'DIJKSTRA', 'GREEDY_BFS', 'DSTAR_LITE']
  ): AlgorithmComparisonResult {
    const results: Partial<Record<AlgorithmType, PathfindingResult>> = {};
    const comparison: AlgorithmComparisonItem[] = [];

    for (const algo of algorithms) {
      let result: PathfindingResult;

      switch (algo) {
        case 'ASTAR': {
          const solver = new AStarPathfinder();
          result = solver.findPath(grid, start, target, options);
          break;
        }
        case 'DIJKSTRA': {
          const solver = new DijkstraPathfinder();
          result = solver.findPath(grid, start, target, options);
          break;
        }
        case 'GREEDY_BFS': {
          const solver = new GreedyBFSPathfinder();
          result = solver.findPath(grid, start, target, options);
          break;
        }
        case 'DSTAR_LITE': {
          const solver = new DStarLitePathfinder();
          result = solver.findPath(grid, start, target, options);
          break;
        }
        default: {
          continue;
        }
      }

      results[algo] = result;
      comparison.push({
        algorithm: algo,
        distance: result.totalDistance,
        cost: result.totalMovementCost,
        nodesExplored: result.nodesEvaluated,
        computationTimeMs: result.executionTimeMs,
        success: result.success,
        pathLength: result.path.length,
        failureReason: result.failureReason,
      });
    }

    const successfulRuns = comparison.filter((c) => c.success);

    let fastest: AlgorithmType | undefined;
    let shortestDistance: AlgorithmType | undefined;
    let lowestCost: AlgorithmType | undefined;
    let fewestNodesExplored: AlgorithmType | undefined;

    if (successfulRuns.length > 0) {
      fastest = [...successfulRuns].sort((a, b) => a.computationTimeMs - b.computationTimeMs)[0].algorithm;
      shortestDistance = [...successfulRuns].sort((a, b) => a.distance - b.distance)[0].algorithm;
      lowestCost = [...successfulRuns].sort((a, b) => a.cost - b.cost)[0].algorithm;
      fewestNodesExplored = [...successfulRuns].sort((a, b) => a.nodesExplored - b.nodesExplored)[0].algorithm;
    }

    return {
      results,
      comparison,
      fastest,
      shortestDistance,
      lowestCost,
      fewestNodesExplored,
    };
  }
}
