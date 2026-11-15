/** Versioned, data-only 2D shot seam contract. No animation is changed here. */
export type BoundaryObject = {
  position: { x: number; y: number };
  rotation: number;
  velocity: { x: number; y: number; angular: number };
  owner: string | null;
  pose: Record<string, number>;
};
export type ShotBoundaryState = {
  schemaVersion: 1;
  shot: string;
  revision: string;
  frame: number;
  fps: { num: number; den: number };
  artSha256: string;
  rigSha256: string;
  recipeSha256: string;
  objects: Record<string, BoundaryObject>;
};
export type SeamLimits = {
  positionPx: number;
  rotationDeg: number;
  velocityPxPerSec: number;
  angularVelocityDegPerSec: number;
  pose: number;
};
type Issue = { code: string; object?: string; control?: string; actual?: number; limit?: number };
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const keys = (x: Record<string, unknown>, expected: string[]) =>
  Object.keys(x).sort().join(',') === expected.sort().join(',');
const finite = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9;
const id = (x: unknown): x is string =>
  typeof x === 'string' && /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(x);
const hash = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const validated = new WeakSet<object>();
function freeze(x: unknown): void {
  if (x && typeof x === 'object') {
    for (const v of Object.values(x)) freeze(v);
    Object.freeze(x);
  }
}
export function validateBoundary(raw: unknown): ShotBoundaryState {
  const v: unknown = structuredClone(raw);
  if (
    !object(v) ||
    !keys(v, [
      'schemaVersion',
      'shot',
      'revision',
      'frame',
      'fps',
      'artSha256',
      'rigSha256',
      'recipeSha256',
      'objects',
    ]) ||
    v.schemaVersion !== 1 ||
    !id(v.shot) ||
    !id(v.revision) ||
    !Number.isSafeInteger(v.frame) ||
    (v.frame as number) < 0 ||
    !object(v.fps) ||
    !keys(v.fps, ['num', 'den']) ||
    !Number.isSafeInteger(v.fps.num) ||
    !Number.isSafeInteger(v.fps.den) ||
    (v.fps.num as number) <= 0 ||
    (v.fps.den as number) <= 0 ||
    !hash(v.artSha256) ||
    !hash(v.rigSha256) ||
    !hash(v.recipeSha256) ||
    !object(v.objects) ||
    !Object.keys(v.objects).length ||
    Object.keys(v.objects).length > 128
  )
    throw Error('BOUNDARY_SCHEMA');
  for (const [name, item] of Object.entries(v.objects)) {
    if (
      !id(name) ||
      !object(item) ||
      !keys(item, ['position', 'rotation', 'velocity', 'owner', 'pose']) ||
      !object(item.position) ||
      !keys(item.position, ['x', 'y']) ||
      !finite(item.position.x) ||
      !finite(item.position.y) ||
      !finite(item.rotation) ||
      !object(item.velocity) ||
      !keys(item.velocity, ['x', 'y', 'angular']) ||
      !finite(item.velocity.x) ||
      !finite(item.velocity.y) ||
      !finite(item.velocity.angular) ||
      (item.owner !== null && !id(item.owner)) ||
      !object(item.pose) ||
      Object.keys(item.pose).length > 128 ||
      Object.entries(item.pose).some(([k, x]) => !id(k) || !finite(x))
    )
      throw Error('BOUNDARY_SCHEMA');
  }
  freeze(v);
  validated.add(v);
  return v as ShotBoundaryState;
}
export function compareBoundary(
  a: ShotBoundaryState,
  b: ShotBoundaryState,
  transition: 'continuous' | { kind: 'intentional_cut'; reason: string },
  limits: SeamLimits,
): { status: 'PASS' | 'FAIL' | 'INTENTIONAL_CUT'; issues: Issue[]; reason?: string } {
  if (!validated.has(a) || !validated.has(b)) throw Error('BOUNDARY_NOT_VALIDATED');
  if (
    !object(limits) ||
    !keys(limits, [
      'positionPx',
      'rotationDeg',
      'velocityPxPerSec',
      'angularVelocityDegPerSec',
      'pose',
    ]) ||
    Object.values(limits).some((x) => !finite(x) || x < 0)
  )
    throw Error('BOUNDARY_LIMITS');
  if (transition !== 'continuous') {
    if (!object(transition) || !keys(transition, ['kind', 'reason']) ||
        transition.kind !== 'intentional_cut' || typeof transition.reason !== 'string' ||
        transition.reason.trim().length < 3 || transition.reason.length > 1000)
      throw Error('BOUNDARY_TRANSITION');
    return { status: 'INTENTIONAL_CUT', issues: [], reason: transition.reason.trim() };
  }
  const issues: Issue[] = [];
  if (BigInt(a.fps.num) * BigInt(b.fps.den) !== BigInt(b.fps.num) * BigInt(a.fps.den))
    issues.push({ code: 'TIMEBASE_MISMATCH' });
  for (const key of ['artSha256', 'rigSha256', 'recipeSha256'] as const)
    if (a[key] !== b[key]) issues.push({ code: 'PROVENANCE_MISMATCH', control: key });
  for (const name of new Set([...Object.keys(a.objects), ...Object.keys(b.objects)])) {
    const x = a.objects[name],
      y = b.objects[name];
    if (!x || !y) {
      issues.push({ code: 'OBJECT_MISMATCH', object: name });
      continue;
    }
    const compare = (code: string, actual: number, limit: number, control?: string) => {
      if (actual > limit)
        issues.push({ code, object: name, actual, limit, ...(control ? { control } : {}) });
    };
    compare(
      'POSITION_MISMATCH',
      Math.hypot(x.position.x - y.position.x, x.position.y - y.position.y),
      limits.positionPx,
    );
    compare(
      'ROTATION_MISMATCH',
      Math.abs(((((x.rotation - y.rotation) % 360) + 540) % 360) - 180),
      limits.rotationDeg,
    );
    compare(
      'VELOCITY_MISMATCH',
      Math.hypot(x.velocity.x - y.velocity.x, x.velocity.y - y.velocity.y),
      limits.velocityPxPerSec,
    );
    compare(
      'ANGULAR_VELOCITY_MISMATCH',
      Math.abs(x.velocity.angular - y.velocity.angular),
      limits.angularVelocityDegPerSec,
    );
    if (x.owner !== y.owner) issues.push({ code: 'OWNER_MISMATCH', object: name });
    for (const k of new Set([...Object.keys(x.pose), ...Object.keys(y.pose)])) {
      if (!Object.hasOwn(x.pose, k) || !Object.hasOwn(y.pose, k)) {
        issues.push({ code: 'POSE_CONTROL_MISMATCH', object: name, control: k });
        continue;
      }
      compare('POSE_MISMATCH', Math.abs(x.pose[k]! - y.pose[k]!), limits.pose, k);
    }
  }
  return { status: issues.length ? 'FAIL' : 'PASS', issues };
}
