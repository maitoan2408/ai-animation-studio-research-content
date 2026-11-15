/** Seeded preview signals. Not calibrated physiology or a rig/acting layer. */
export type LifeSample = Readonly<{ breath: number; blink: number }>;
function mix(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
/** At 24fps each fixed 120-frame window contains a four-frame blink with
 * seed-dependent timing. Sampling has no mutable RNG state; ranges are
 * deliberately provisional and must not be described as medical evidence. */
export function sampleLife(seed: number, frame: number): LifeSample {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff ||
      !Number.isSafeInteger(frame) || frame < 0 || frame > 10_000_000) throw Error('LIFE_INPUT_INVALID');
  const window = Math.floor(frame / 120);
  const position = frame % 120;
  const start = 24 + (mix(seed, window) % 72);
  const offset = position - start;
  const blink = offset >= 0 && offset <= 4 ? 1 - Math.abs(offset - 2) / 2 : 0;
  const breath = (1 - Math.cos((2 * Math.PI * (frame % 96)) / 96)) / 2;
  return { breath, blink };
}
