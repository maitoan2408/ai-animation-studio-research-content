/** Independent declared ground anchors and conservative 2D collision proxies.
 * World coordinates are stage pixels, y down. Stance intervals and geometry are
 * supplied by the caller; these measurements do not infer intent or real anatomy.
 */
type Point = { x: number; y: number };
export type ContactSample = {
  frame: number;
  stance: boolean;
  foot: Point;
  groundY: number;
  camera: Point & { zoom: number };
  prop?: Point & { radius: number };
  torso?: { left: number; top: number; right: number; bottom: number };
};
type Limits = { driftPx: number; gapPx: number; penetrationPx: number };
type ContactIssue = { frame: number; code: string; actual: number; limit: number };
const finite = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e9;
const point = (p: Point) => !!p && finite(p.x) && finite(p.y);
export function analyzeContacts(samples: ContactSample[], limits: Limits) {
  if (
    !limits ||
    Object.keys(limits).sort().join(',') !== 'driftPx,gapPx,penetrationPx' ||
    Object.values(limits).some((n) => !finite(n) || n < 0)
  )
    throw Error('CONTACT_LIMITS');
  if (!Array.isArray(samples) || !samples.length) throw Error('CONTACT_SAMPLES');
  const issues: ContactIssue[] = [];
  let anchor: Point | undefined;
  let previous = -1;
  let maxWorldDrift = 0,
    maxProjectedDrift = 0,
    stanceFrames = 0,
    collisionFrames = 0;
  for (const s of samples) {
    if (!s || !Number.isSafeInteger(s.frame) || s.frame < 0 || s.frame <= previous)
      throw Error('CONTACT_FRAME_ORDER');
    if (previous >= 0 && s.frame !== previous + 1) throw Error('CONTACT_FRAME_GAP');
    previous = s.frame;
    if (
      typeof s.stance !== 'boolean' ||
      !point(s.foot) ||
      !finite(s.groundY) ||
      !point(s.camera) ||
      !finite(s.camera.zoom) ||
      s.camera.zoom <= 0
    )
      throw Error('CONTACT_SAMPLE');
    if (!!s.prop !== !!s.torso) throw Error('CONTACT_COLLISION_SHAPES');
    if (s.prop && s.torso) {
      const p = s.prop,
        t = s.torso;
      if (
        !point(p) ||
        !finite(p.radius) ||
        p.radius <= 0 ||
        ![t.left, t.right, t.top, t.bottom].every(finite) ||
        t.left >= t.right ||
        t.top >= t.bottom
      )
        throw Error('CONTACT_COLLISION_SHAPES');
      const x = Math.max(t.left, Math.min(t.right, p.x)),
        y = Math.max(t.top, Math.min(t.bottom, p.y));
      const overlap = p.radius - Math.hypot(p.x - x, p.y - y);
      collisionFrames++;
      if (overlap > 0)
        issues.push({ frame: s.frame, code: 'PROP_BODY_OVERLAP', actual: overlap, limit: 0 });
    }
    if (!s.stance) {
      anchor = undefined;
      continue;
    }
    stanceFrames++;
    anchor ??= { ...s.foot };
    const drift = Math.hypot(s.foot.x - anchor.x, s.foot.y - anchor.y),
      projected = drift * s.camera.zoom;
    maxWorldDrift = Math.max(maxWorldDrift, drift);
    maxProjectedDrift = Math.max(maxProjectedDrift, projected);
    if (drift > limits.driftPx)
      issues.push({ frame: s.frame, code: 'FOOT_SLIDE_WORLD', actual: drift, limit: limits.driftPx });
    if (projected > limits.driftPx)
      issues.push({ frame: s.frame, code: 'FOOT_SLIDE', actual: projected, limit: limits.driftPx });
    const gap = (s.groundY - s.foot.y) * s.camera.zoom;
    if (gap > limits.gapPx)
      issues.push({ frame: s.frame, code: 'FOOT_GAP', actual: gap, limit: limits.gapPx });
    if (-gap > limits.penetrationPx)
      issues.push({
        frame: s.frame,
        code: 'GROUND_PENETRATION',
        actual: -gap,
        limit: limits.penetrationPx,
      });
  }
  return {
    status: issues.length ? 'FAIL' : stanceFrames || collisionFrames ? 'PASS' : 'NOT_APPLICABLE',
    issues,
    stanceFrames,
    collisionFrames,
    maxWorldDrift,
    maxProjectedDrift,
    limits: [
      'Ground, stance and collision proxies are declared inputs; no artistic approval',
      'Camera translation cancels in same-frame projection; zoom scales error',
      'World and projected drift are checked independently using the declared driftPx limit',
    ],
  };
}
