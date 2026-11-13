/** Small interchangeable engines for measured fixtures, never a render-time loop.
 * Coordinates are metres, y up, radians CCW. Creation order is intentional.
 */
import * as P from 'planck';
import R from '@dimforge/rapier2d-deterministic-compat';
import { readFileSync } from 'node:fs';
export const contract = JSON.parse(
  readFileSync(new URL('../../brief/quality/physics-contract.json', import.meta.url), 'utf8'),
) as {
  fps: number;
  hz: number;
  gravity: number;
  pixelsPerMeter: number;
  pendulum: { x: number; y: number; radius: number; seconds: number };
  drop: { height: number; radius: number; restitution: number; seconds: number };
  limits: {
    periodRelativeError: number;
    fallRelativeError: number;
    bounceRelativeError: number;
    engineeringPenetrationMeters: number;
    strictPenetrationMeters: number;
    heroContactPixels: number;
    heroFootDriftPixels: number;
  };
};
export type Engine = 'planck' | 'rapier';
export type Sample = {
  t: number;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  omega: number;
  contact: boolean;
};
export type Simulation = { step: () => void; sample: (t: number) => Sample; dispose: () => void };
let initialized: Promise<void> | undefined;
export async function rapier(): Promise<typeof R> {
  initialized ??= R.init();
  await initialized;
  return R;
}
export const versions = { planck: '1.5.1', rapier: '0.21.0-deterministic-compat' } as const;
// A declared 2mm collision envelope prevents the visible circle from crossing
// the floor. Do not clamp rendered positions or loosen measured tolerances.
export const solverProfiles = {
  planck: { velocityIterations: 12, positionIterations: 8, contactSkin: 0 },
  rapier: { solverIterations: 12, allowedLinearError: 0.001, contactSkin: 0.002 },
};
export async function fixture(
  engine: Engine,
  kind: 'pendulum' | 'drop',
  damping = 0,
): Promise<Simulation> {
  const c = contract,
    p = c.pendulum,
    d = c.drop,
    pendulum = kind === 'pendulum';
  if (engine === 'planck') {
    const world = new P.World({ gravity: P.Vec2(0, -c.gravity), allowSleep: false });
    const ground = world.createBody();
    const body = world.createDynamicBody({
      position: P.Vec2(pendulum ? p.x : 0, pendulum ? p.y : d.height),
      angularDamping: damping,
      linearDamping: damping,
      bullet: true,
    });
    body.createFixture(new P.Circle(pendulum ? p.radius : d.radius), {
      density: 1,
      restitution: pendulum ? 0 : d.restitution,
      friction: 0,
    });
    if (pendulum) world.createJoint(new P.RevoluteJoint({}, ground, body, P.Vec2(0, 0)));
    else
      ground.createFixture(new P.Box(5, 0.1, P.Vec2(0, -0.1)), {
        friction: 0,
        restitution: d.restitution,
      });
    return {
      step: () => world.step(1 / c.hz, 12, 8),
      sample: (t) => {
        const pos = body.getPosition(),
          v = body.getLinearVelocity();
        let contact = false;
        for (let edge = body.getContactList(); edge; edge = edge.next)
          contact ||= edge.contact.isTouching();
        return {
          t,
          x: pos.x,
          y: pos.y,
          angle: body.getAngle(),
          vx: v.x,
          vy: v.y,
          omega: body.getAngularVelocity(),
          contact,
        };
      },
      dispose: () => {},
    };
  }
  const r = await rapier(),
    world = new r.World({ x: 0, y: -c.gravity });
  world.timestep = 1 / c.hz;
  world.numSolverIterations = 12;
  world.integrationParameters.normalizedAllowedLinearError = 0.001;
  const ground = world.createRigidBody(r.RigidBodyDesc.fixed());
  const body = world.createRigidBody(
    r.RigidBodyDesc.dynamic()
      .setTranslation(pendulum ? p.x : 0, pendulum ? p.y : d.height)
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setAngularDamping(damping)
      .setLinearDamping(damping),
  );
  const ball = world.createCollider(
    r.ColliderDesc.ball(pendulum ? p.radius : d.radius)
      .setDensity(1)
      .setFriction(0)
      .setRestitution(pendulum ? 0 : d.restitution)
      .setContactSkin(pendulum ? 0 : solverProfiles.rapier.contactSkin),
    body,
  );
  let floor: InstanceType<typeof r.Collider> | undefined;
  if (pendulum)
    world.createImpulseJoint(
      r.JointData.revolute({ x: 0, y: 0 }, { x: -p.x, y: -p.y }),
      ground,
      body,
      true,
    );
  else
    floor = world.createCollider(
      r.ColliderDesc.cuboid(5, 0.1)
        .setTranslation(0, -0.1)
        .setFriction(0)
        .setRestitution(d.restitution),
      ground,
    );
  return {
    step: () => world.step(),
    sample: (t) => {
      const pos = body.translation(),
        v = body.linvel();
      let contact = false;
      if (floor)
        world.contactPair(ball, floor, (m) => {
          for (let i = 0; i < m.numSolverContacts(); i++) contact ||= m.solverContactDist(i) <= 0;
        });
      return {
        t,
        x: pos.x,
        y: pos.y,
        angle: body.rotation(),
        vx: v.x,
        vy: v.y,
        omega: body.angvel(),
        contact,
      };
    },
    dispose: () => world.free(),
  };
}
export async function simulate(
  engine: Engine,
  kind: 'pendulum' | 'drop',
  damping = 0,
): Promise<Sample[]> {
  const sim = await fixture(engine, kind, damping),
    samples: Sample[] = [];
  try {
    for (let step = 0; step <= contract[kind].seconds * contract.hz; step++) {
      if (step) sim.step();
      const sample = sim.sample(step / contract.hz);
      if (Object.values(sample).some((v) => typeof v === 'number' && !Number.isFinite(v)))
        throw Error('NONFINITE_PHYSICS');
      samples.push(sample);
    }
  } finally {
    sim.dispose();
  }
  return samples;
}
