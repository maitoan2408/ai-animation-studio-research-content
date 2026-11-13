/** Geometry/kinematics critic. Reports measurements, never an artistic score. */
import { heroFrame, r3 } from './hero.js';
import { benchmarkFrame } from '../scene/benchmark.js';
import { anchorPoint, assetPoint } from '../scene/geometry.js';
import type { ArtPack, Point } from '../scene/types.js';
import type { HeroInput } from '../physics/hero.js';
import type { BakeEnvelope } from '../physics/bake.js';
import { contract } from '../physics/engines.js';
export function critic(pack: ArtPack, input: HeroInput, bake: BakeEnvelope) {
  let maxGripPixels = 0,
    maxAnchorPixels = 0,
    maxFootDriftPixels = 0,
    maxRotationDegrees = 0;
  const positions: Point[] = [],
    violations: { frame: number; code: string; value: number }[] = [];
  for (let f = 0; f < 192; f++) {
    const scene = heroFrame(pack, input, bake, f),
      base = benchmarkFrame(pack, 'S05', f, r3);
    const lamp = scene.sprites.find((s) => s.id === 'lamp')!,
      zoom = scene.camera.zoom;
    positions.push([lamp.x, lamp.y]);
    maxRotationDegrees = Math.max(maxRotationDegrees, Math.abs(lamp.rotation));
    for (const [owner, active, target] of [
      ['mai', f < 108, [51, 25]],
      ['an', f >= 72, [110, 27]],
    ] as const) {
      if (!active) continue;
      const a = anchorPoint(
          pack,
          scene.sprites.find((s) => s.id === owner + '.right-hand')!,
          'grip',
        ),
        b = assetPoint(pack, lamp, [...target]);
      const error = Math.hypot(a[0] - b[0], a[1] - b[1]) * zoom;
      maxGripPixels = Math.max(maxGripPixels, error);
      if (error > contract.limits.heroContactPixels)
        violations.push({ frame: f, code: 'GRIP_DRIFT', value: error });
    }
    const actual = assetPoint(pack, lamp, [110, 27]),
      expected = input.anchorFrames[f]!;
    const jointError =
      Math.hypot(actual[0] - expected[0] * 200, actual[1] + expected[1] * 200) * zoom;
    maxAnchorPixels = Math.max(maxAnchorPixels, jointError);
    if (jointError > contract.limits.heroContactPixels)
      violations.push({ frame: f, code: 'PHYSICS_JOINT_DRIFT', value: jointError });
    for (const s of scene.sprites.filter(
      (s) => s.asset.endsWith('/boot') && !s.asset.startsWith('shadow/'),
    )) {
      const a = anchorPoint(pack, s, 'sole'),
        b = anchorPoint(
          pack,
          base.sprites.find((x) => x.id === s.id)!,
          'sole',
        );
      const drift = Math.hypot(a[0] - b[0], a[1] - b[1]) * zoom;
      maxFootDriftPixels = Math.max(maxFootDriftPixels, drift);
      if (drift > contract.limits.heroFootDriftPixels)
        violations.push({ frame: f, code: 'FOOT_DRIFT', value: drift });
    }
  }
  const differences = (p: Point[]): Point[] =>
    p.slice(1).map((b, i) => [(b[0] - p[i]![0]) * 24, (b[1] - p[i]![1]) * 24]);
  const velocity = differences(positions),
    acceleration = differences(velocity),
    jerk = differences(acceleration);
  const peak = (p: Point[]) => Math.max(...p.map((v) => Math.hypot(...v)));
  return {
    status: violations.length ? 'FAIL' : 'PASS_GEOMETRY',
    frames: 192,
    maxGripPixels,
    maxAnchorPixels,
    maxFootDriftPixels,
    maxRotationDegrees,
    kinematics: {
      peakStagePixelsPerSecond: peak(velocity),
      peakStagePixelsPerSecondSquared: peak(acceleration),
      peakStagePixelsPerSecondCubed: peak(jerk),
    },
    violations,
    limits: [
      'Contact/stance limits are frozen; kinematics are descriptive, not an artistic score.',
      'Lantern/hand joint only; no character-body collision volumes or cloth/hair solver.',
      'No new final art, voice audition, or independent operator approval.',
    ],
  };
}
