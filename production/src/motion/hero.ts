/** PerformanceIR adapter for the existing R3 rig. The director is bounded to
 * this authored clip; secondary movement is replayed from an audited bake. */
import { benchmarkFrame, type Edit } from '../scene/benchmark.js';
import { assetPoint } from '../scene/geometry.js';
import { rotate } from '../scene/math.js';
import type { ArtPack, SceneFrame } from '../scene/types.js';
import { digest, sampleBake, type BakeEnvelope } from '../physics/bake.js';
import type { HeroInput } from '../physics/hero.js';
import { heroPhysics, type HeroPhysics } from '../physics/recipe.js';
import { parsePerformance, type PerformanceCapabilities } from './performance.js';
export const r3: Edit = {
  polish: true,
  cameraAmplitude: 0.7,
  reactionDelay: 12,
  separateHandoffGrips: true,
};
export const heroCapabilities: PerformanceCapabilities = {
  clips: ['Q2-R3-authored'],
  intents: ['hold', 'offer', 'share-grip', 'receive', 'settle-and-react'],
  actors: { mai: ['rightHandGrip'], an: ['rightHandGrip'] },
  props: { lamp: ['giverGrip', 'receiverGrip'] },
};
export const performanceIR = parsePerformance(
  {
    schemaVersion: 1,
    shot: 'S05',
    intent: 'offer-light-receive',
    primaryClip: 'Q2-R3-authored',
    fps: 24,
    frames: 192,
    actors: ['mai', 'an'],
    props: ['lamp'],
    beats: [
      {
        start: 0,
        end: 24,
        intent: 'hold',
        actors: ['mai', 'an'],
        emotion: 'anticipation',
        emphasis: 0.2,
        gazeTarget: 'lamp',
      },
      {
        start: 24,
        end: 72,
        intent: 'offer',
        actors: ['mai', 'an'],
        emotion: 'care',
        emphasis: 0.6,
        gazeTarget: 'lamp',
      },
      {
        start: 72,
        end: 108,
        intent: 'share-grip',
        actors: ['mai', 'an'],
        emotion: 'care',
        emphasis: 0.8,
        gazeTarget: 'lamp',
      },
      {
        start: 108,
        end: 144,
        intent: 'receive',
        actors: ['mai', 'an'],
        emotion: 'relief',
        emphasis: 0.6,
        gazeTarget: 'lamp',
      },
      {
        start: 144,
        end: 192,
        intent: 'settle-and-react',
        actors: ['mai', 'an'],
        emotion: 'relief',
        emphasis: 0.3,
        gazeTarget: 'lamp',
      },
    ],
    contacts: [
      { actor: 'mai', control: 'rightHandGrip', target: 'lamp.giverGrip', start: 0, end: 108 },
      { actor: 'an', control: 'rightHandGrip', target: 'lamp.receiverGrip', start: 72, end: 192 },
    ],
    secondary: ['lamp'],
    releaseFrame: 108,
    artStatus: 'development-asset-not-final-approved',
  },
  heroCapabilities,
);
/** The existing authored evaluator cannot execute arbitrary new scripts. */
export function validateHeroPerformance(raw: unknown) {
  const script = parsePerformance(raw, heroCapabilities);
  if (digest(script) !== digest(performanceIR)) throw Error('PERFORMANCE_UNSUPPORTED_VARIATION');
  return script;
}
export function heroInput(pack: ArtPack): HeroInput {
  const anchorFrames: [number, number][] = [],
    centerFrames: [number, number][] = [];
  for (let f = 0; f < 192; f++) {
    const lamp = benchmarkFrame(pack, 'S05', f, r3).sprites.find((s) => s.id === 'lamp')!;
    const anchor = assetPoint(pack, lamp, [110, 27]),
      center = assetPoint(pack, lamp, [80, 116]);
    anchorFrames.push([anchor[0] / 200, -anchor[1] / 200]);
    centerFrames.push([center[0] / 200, -center[1] / 200]);
  }
  return {
    schemaVersion: 1,
    shot: 'S05',
    fps: 24,
    hz: 240,
    releaseFrame: 108,
    pixelsPerMeter: 200,
    artSha256: digest(pack),
    massKg: 0.6,
    angularDamping: 2.4,
    halfExtents: [0.246, 0.267],
    localAnchor: [0.09, 0.267],
    anchorFrames,
    centerFrames,
  };
}
export function heroFrame(
  pack: ArtPack,
  input: HeroInput,
  bake: BakeEnvelope,
  frame: number,
  physics: HeroPhysics = heroPhysics,
): SceneFrame {
  if (input.artSha256 !== digest(pack)) throw Error('HERO_ART_MISMATCH');
  const sample = sampleBake(bake, frame, digest(input), physics);
  if (frame < 108) return benchmarkFrame(pack, 'S05', frame, r3);
  const rotation = (-sample.rotation * 180) / Math.PI;
  // Convert physics light-centre back to the existing SVG bottom pivot. No
  // post-render image offsets, solver correction, or live physics on seeking.
  const offset = rotate([0, (195 - 116) * 0.6], rotation);
  return benchmarkFrame(pack, 'S05', frame, {
    ...r3,
    handoffSecondaryTransform: {
      x: sample.centerX * 200 + offset[0],
      y: -sample.centerY * 200 + offset[1],
      rotation,
    },
  });
}
