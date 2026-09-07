import { Point2D } from '@/types/pathfinding';

// Deterministic Mulberry32 PRNG
export function createRNG(seed: number) {
  let s = Math.floor(Math.abs(seed)) || 12345;
  return function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D Perlin-like gradient noise generator with octave fractal summation
export class Noise2D {
  private perm: number[] = [];

  constructor(seed = 42) {
    const rng = createRNG(seed);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return this.lerp(v, x1, x2);
  }

  public fractalNoise(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}

export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function octileDistance(p1: Point2D, p2: Point2D): number {
  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);
  const F = Math.SQRT2 - 1;
  return dx < dy ? F * dx + dy : F * dy + dx;
}

export function manhattanDistance(p1: Point2D, p2: Point2D): number {
  return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeAngle(rad: number): number {
  let angle = rad % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

export function angleDifference(target: number, current: number): number {
  let diff = (target - current) % (2 * Math.PI);
  if (diff < -Math.PI) diff += 2 * Math.PI;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  return diff;
}
