/** S05 secondary dynamics only: the authored hand remains kinematic, while the
 * lantern gains weight/inertia after the giver releases. Two-hand hold is exact.
 * Body centre is the existing light anchor [80,116], with a rectangular inertia
 * proxy; it is a declared stylized mass model, not a scan of a real lantern.
 */
import { rapier, versions } from './engines.js';
import {
  digest,
  executionDigest,
  validateBake,
  type BakeEnvelope,
  type BodyFrame,
} from './bake.js';
import { heroPhysics, validatePhysics, type HeroPhysics } from './recipe.js';
export type HeroInput = {
  schemaVersion: 1;
  shot: 'S05';
  fps: 24;
  hz: 240;
  releaseFrame: 108;
  pixelsPerMeter: 200;
  artSha256: string;
  massKg: number;
  angularDamping: number;
  halfExtents: [number, number];
  localAnchor: [number, number];
  anchorFrames: [number, number][];
  centerFrames: [number, number][];
};
export function validateHeroInput(v: HeroInput): void {
  if (
    !v ||
    v.schemaVersion !== 1 ||
    v.shot !== 'S05' ||
    v.fps !== 24 ||
    v.hz !== 240 ||
    v.releaseFrame !== 108 ||
    v.pixelsPerMeter !== 200 ||
    typeof v.artSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(v.artSha256) ||
    !Array.isArray(v.anchorFrames) ||
    !Array.isArray(v.centerFrames) ||
    v.anchorFrames.length !== 192 ||
    v.centerFrames.length !== 192
  )
    throw Error('HERO_INPUT_CONTRACT');
  if (
    !Number.isFinite(v.massKg) ||
    v.massKg <= 0 ||
    v.massKg > 10 ||
    !Number.isFinite(v.angularDamping) ||
    v.angularDamping < 0 ||
    v.angularDamping > 10
  )
    throw Error('HERO_MATERIAL');
  for (const p of [...v.anchorFrames, ...v.centerFrames, v.halfExtents, v.localAnchor])
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      p.some((n) => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 100)
    )
      throw Error('HERO_INPUT_RANGE');
  if (v.halfExtents.some((n) => n <= 0 || n > 1)) throw Error('HERO_GEOMETRY');
  const a = v.anchorFrames[107]!,
    b = v.centerFrames[107]!;
  if (Math.hypot(a[0] - b[0] - v.localAnchor[0], a[1] - b[1] - v.localAnchor[1]) > 1e-10)
    throw Error('HERO_INITIAL_CONTACT');
}
export async function bakeHero(
  input: HeroInput,
  physics: HeroPhysics = heroPhysics,
): Promise<BakeEnvelope> {
  input = structuredClone(input);
  physics = structuredClone(physics);
  validatePhysics(physics);
  validateHeroInput(input);
  const r = await rapier(),
    world = new r.World({ x: 0, y: -physics.gravity });
  world.timestep = 1 / physics.hz;
  world.numSolverIterations = physics.solverIterations;
  const a = input.anchorFrames[107]!,
    b = input.centerFrames[107]!;
  const hand = world.createRigidBody(
    r.RigidBodyDesc.kinematicPositionBased().setTranslation(a[0], a[1]),
  );
  const body = world.createRigidBody(
    r.RigidBodyDesc.dynamic()
      .setTranslation(b[0], b[1])
      .setCanSleep(false)
      .setAngularDamping(input.angularDamping),
  );
  world.createCollider(r.ColliderDesc.cuboid(...input.halfExtents).setMass(input.massKg), body);
  world.createImpulseJoint(
    r.JointData.revolute({ x: 0, y: 0 }, { x: input.localAnchor[0], y: input.localAnchor[1] }),
    hand,
    body,
    true,
  );
  const frames: BodyFrame[] = input.centerFrames
    .slice(0, 108)
    .map(([centerX, centerY], frame) => ({ frame, centerX, centerY, rotation: 0 }));
  try {
    for (let frame = 108; frame < 192; frame++) {
      const from = input.anchorFrames[frame - 1]!,
        to = input.anchorFrames[frame]!;
      for (let sub = 1; sub <= 10; sub++) {
        const t = sub / 10;
        hand.setNextKinematicTranslation({
          x: from[0] + (to[0] - from[0]) * t,
          y: from[1] + (to[1] - from[1]) * t,
        });
        world.step();
      }
      const p = body.translation();
      frames.push({ frame, centerX: p.x, centerY: p.y, rotation: body.rotation() });
    }
  } finally {
    world.free();
  }
  const data = {
    schemaVersion: 1 as const,
    shot: 'S05' as const,
    fps: 24 as const,
    hz: 240 as const,
    engine: 'rapier-' + versions.rapier,
    inputSha256: digest(input),
    frames,
    events: [
      {
        frame: 72,
        kind: 'receiver-grips' as const,
        source: 'authored-contact' as const,
        intensity: 0.25,
      },
      {
        frame: 108,
        kind: 'giver-releases' as const,
        source: 'authored-contact' as const,
        intensity: 0.2,
      },
    ],
  };
  const sha256 = digest(data);
  return validateBake({
    sha256,
    data,
    binding: {
      schemaVersion: 1,
      physics,
      executionSha256: executionDigest(data.inputSha256, sha256, physics),
    },
  });
}
