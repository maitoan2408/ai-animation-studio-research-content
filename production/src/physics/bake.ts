/** Validated, immutable replay data. No engine is loaded by a frame consumer. */
import { createHash } from 'node:crypto';
export type BodyFrame = { frame: number; centerX: number; centerY: number; rotation: number };
export type BakeFile = {
  schemaVersion: 1;
  shot: 'S05';
  fps: 24;
  hz: 240;
  engine: string;
  inputSha256: string;
  frames: BodyFrame[];
  events: {
    frame: number;
    kind: 'receiver-grips' | 'giver-releases';
    source: 'authored-contact';
    intensity: number;
  }[];
};
export type BakeEnvelope = { sha256: string; data: BakeFile };
export const digest = (data: unknown) =>
  createHash('sha256').update(JSON.stringify(data)).digest('hex');
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, expected: string[]) =>
  Object.keys(v).sort().join(',') === expected.sort().join(',');
export function validateBake(raw: unknown): BakeEnvelope {
  if (!object(raw) || !keys(raw, ['sha256', 'data']) || !object(raw.data))
    throw Error('BAKE_SCHEMA');
  const d = raw.data;
  if (
    !keys(d, ['schemaVersion', 'shot', 'fps', 'hz', 'engine', 'inputSha256', 'frames', 'events']) ||
    d.schemaVersion !== 1 ||
    d.shot !== 'S05' ||
    d.fps !== 24 ||
    d.hz !== 240 ||
    d.engine !== 'rapier-0.21.0-deterministic-compat' ||
    typeof d.inputSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(d.inputSha256) ||
    !Array.isArray(d.frames) ||
    d.frames.length !== 192 ||
    !Array.isArray(d.events)
  )
    throw Error('BAKE_CONTRACT');
  for (let i = 0; i < d.frames.length; i++) {
    const f: unknown = d.frames[i];
    if (
      !object(f) ||
      !keys(f, ['frame', 'centerX', 'centerY', 'rotation']) ||
      f.frame !== i ||
      ![f.centerX, f.centerY, f.rotation].every((v) => typeof v === 'number' && Number.isFinite(v))
    )
      throw Error('BAKE_FRAME');
    if (
      Math.abs(f.centerX as number) > 100 ||
      Math.abs(f.centerY as number) > 100 ||
      Math.abs(f.rotation as number) > Math.PI / 2
    )
      throw Error('BAKE_RANGE');
    if (i < 108 && f.rotation !== 0) throw Error('BAKE_LOCKED_CONTACT');
  }
  if (d.events.length !== 2) throw Error('BAKE_EVENTS');
  for (const [i, frame, kind] of [
    [0, 72, 'receiver-grips'],
    [1, 108, 'giver-releases'],
  ] as const) {
    const e: unknown = d.events[i];
    if (
      !object(e) ||
      !keys(e, ['frame', 'kind', 'source', 'intensity']) ||
      e.frame !== frame ||
      e.kind !== kind ||
      e.source !== 'authored-contact' ||
      typeof e.intensity !== 'number' ||
      !Number.isFinite(e.intensity) ||
      e.intensity < 0 ||
      e.intensity > 1
    )
      throw Error('BAKE_EVENTS');
  }
  if (raw.sha256 !== digest(d)) throw Error('BAKE_HASH');
  for (const f of d.frames) Object.freeze(f);
  for (const e of d.events) Object.freeze(e);
  Object.freeze(d.frames);
  Object.freeze(d.events);
  Object.freeze(d);
  Object.freeze(raw);
  return raw as BakeEnvelope;
}
export function sampleBake(bake: BakeEnvelope, frame: number, expectedInputSha: string): BodyFrame {
  if (!Object.isFrozen(bake) || !Object.isFrozen(bake.data)) throw Error('BAKE_NOT_VALIDATED');
  if (!Number.isInteger(frame) || frame < 0 || frame >= 192) throw Error('BAKE_FRAME_RANGE');
  if (bake.data.inputSha256 !== expectedInputSha) throw Error('BAKE_INPUT_MISMATCH');
  return bake.data.frames[frame]!;
}
