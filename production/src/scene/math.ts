import type { Point } from './types.js';

export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
export const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
export const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function rotate(p: Point, degrees: number): Point {
  const r = degrees * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}
export const clamp = (x: number, low = 0, high = 1) => Math.min(high, Math.max(low, x));
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixPoint = (a: Point, b: Point, t: number): Point => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

/** Analytic two-link IK. Unreachable targets fail instead of silently stretching
 * a limb or moving a contact marker to pretend that grip succeeded. */
export function elbow(start: Point, end: Point, upper: number, lower: number, bend: 1 | -1): Point {
  const d = distance(start, end);
  if (!Number.isFinite(d) || d < 0.001 || d > upper + lower + 1e-6 || d < Math.abs(upper - lower) - 1e-6)
    throw new Error(`IK_UNREACHABLE: distance=${d.toFixed(3)}, links=${upper}+${lower}`);
  const ex = (end[0] - start[0]) / d, ey = (end[1] - start[1]) / d;
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const side = Math.sqrt(Math.max(0, upper * upper - along * along)) * bend;
  return [start[0] + along * ex + side * ey, start[1] + along * ey - side * ex];
}
