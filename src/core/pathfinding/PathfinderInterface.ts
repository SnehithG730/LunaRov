import { TerrainGrid, TerrainCell } from '@/types/terrain';
import { Point2D, PathfindingOptions, PathfindingResult, MovementCosts } from '@/types/pathfinding';

export interface IPathfinder {
  findPath(
    grid: TerrainGrid,
    start: Point2D,
    target: Point2D,
    options?: PathfindingOptions
  ): PathfindingResult;
}

export const DEFAULT_MOVEMENT_COSTS: MovementCosts = {
  normal: 1.0,
  rock: 3.0,
  slope: 5.0,
  danger: 10.0,
  crater: Infinity,
};

export function isCellBlocked(
  cell: TerrainCell,
  options?: PathfindingOptions
): boolean {
  if (cell.isObstacle || cell.cost === Infinity) return true;

  if (options?.blockedNodes) {
    if (options.blockedNodes instanceof Set) {
      if (options.blockedNodes.has(`${cell.x},${cell.y}`)) return true;
    } else if (Array.isArray(options.blockedNodes)) {
      for (const pt of options.blockedNodes) {
        if (pt.x === cell.x && pt.y === cell.y) return true;
      }
    }
  }

  return false;
}

export function resolveCellCost(
  cell: TerrainCell,
  options?: PathfindingOptions
): number {
  if (isCellBlocked(cell, options)) {
    return options?.movementCosts?.crater ?? DEFAULT_MOVEMENT_COSTS.crater;
  }

  const costs = {
    ...DEFAULT_MOVEMENT_COSTS,
    ...options?.movementCosts,
  };

  // Danger zone: slope >= 22° or danger terrain
  if (cell.slope >= 22.0) {
    return costs.danger;
  }

  // Slope: slope >= 12°
  if (cell.slope >= 12.0) {
    return costs.slope;
  }

  // Rock: roughness > 1.3
  if (cell.roughness > 1.3) {
    return costs.rock;
  }

  return costs.normal;
}

// Binary Min-Heap Priority Queue for O(log N) node extraction
export class PriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  public push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].item;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  public size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (node.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIdx] = node;
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
      let minPriority = node.priority;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < minPriority) {
          swapIdx = leftChildIdx;
          minPriority = this.heap[leftChildIdx].priority;
        }
      }

      if (rightChildIdx < length) {
        if (this.heap[rightChildIdx].priority < minPriority) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = node;
      index = swapIdx;
    }
  }
}

// 8-direction transitions with diagonal cost sqrt(2) and corner-cutting prevention
export const NEIGHBOR_OFFSETS = [
  { dx: 0, dy: -1, cost: 1.0, isDiag: false }, // North
  { dx: 1, dy: 0, cost: 1.0, isDiag: false },  // East
  { dx: 0, dy: 1, cost: 1.0, isDiag: false },  // South
  { dx: -1, dy: 0, cost: 1.0, isDiag: false }, // West
  { dx: 1, dy: -1, cost: Math.SQRT2, isDiag: true, adj1: { dx: 1, dy: 0 }, adj2: { dx: 0, dy: -1 } }, // NE
  { dx: 1, dy: 1, cost: Math.SQRT2, isDiag: true, adj1: { dx: 1, dy: 0 }, adj2: { dx: 0, dy: 1 } },   // SE
  { dx: -1, dy: 1, cost: Math.SQRT2, isDiag: true, adj1: { dx: -1, dy: 0 }, adj2: { dx: 0, dy: 1 } },  // SW
  { dx: -1, dy: -1, cost: Math.SQRT2, isDiag: true, adj1: { dx: -1, dy: 0 }, adj2: { dx: 0, dy: -1 } },// NW
];
