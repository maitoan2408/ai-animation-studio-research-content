/** PerformanceIR adapter for the existing R3 rig. The director is bounded to
 * this authored clip; secondary movement is replayed from an audited bake. */
import { benchmarkFrame, type Edit } from '../scene/benchmark.js';
import { assetPoint } from '../scene/geometry.js';
import { rotate } from '../scene/math.js';
import type { ArtPack, SceneFrame } from '../scene/types.js';
import { digest, sampleBake, type BakeEnvelope } from '../physics/bake.js';
import type { HeroInput } from '../physics/hero.js';
export const r3: Edit = {
  polish: true,
  cameraAmplitude: 0.7,
  reactionDelay: 12,
  separateHandoffGrips: true,
};
export const performanceIR = {
  schemaVersion: 1,
  shot: 'S05',
  intent: 'offer-light-receive',
  primaryClip: 'Q2-R3-authored',
  fps: 24,
  frames: 192,
  beats: [
    { start: 0, end: 24, intent: 'hold' },
    { start: 24, end: 72, intent: 'offer' },
    { start: 72, end: 108, intent: 'share-grip' },
    { start: 108, end: 144, intent: 'receive' },
    { start: 144, end: 192, intent: 'settle-and-react' },
  ],
  secondary: ['lantern'],
  releaseFrame: 108,
  artStatus: 'development-asset-not-final-approved',
} as const;
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
): SceneFrame {
  if (input.artSha256 !== digest(pack)) throw Error('HERO_ART_MISMATCH');
  const sample = sampleBake(bake, frame, digest(input));
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
