import { z } from 'zod';
import {
  actionSchema,
  hash,
  parseSpec,
  styleSchema,
  type ProjectSpec,
  type Scene,
} from './domain.js';

/** Canonical stage: 1920x1080, pixels Y-down. All intervals are half-open. */
const frame = z.number().int().safe().nonnegative();
const interval = z
  .object({ startFrame: frame, endFrame: frame })
  .strict()
  .refine((x) => x.endFrame > x.startFrame, 'empty interval');
const audio = z
  .object({
    assetId: z.string().regex(/^[a-f0-9]{64}$/),
    textHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    gain: z.number().min(0).max(2),
  })
  .strict();
const character = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_-]*$/),
    rigId: z.string().min(1),
    artPackageId: z.string().min(1),
    actions: z.array(actionSchema).min(1),
  })
  .strict();
const shot = z
  .object({
    id: z.string().regex(/^s\d{3}$/),
    title: z.string().min(1).max(100),
    interval,
    action: z.object({ name: actionSchema, actorId: z.string() }).strict(),
    camera: z.object({ kind: z.enum(['static', 'pan']) }).strict(),
    narration: z.string().max(1200),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    audio: audio.optional(),
  })
  .strict();

export const animationIrSchema = z
  .object({
    schemaVersion: z.literal('animation-ir/1'),
    stage: z
      .object({
        width: z.literal(1920),
        height: z.literal(1080),
        yAxis: z.literal('down'),
        units: z.literal('stage-px'),
      })
      .strict(),
    timeline: z.object({ fps: z.literal(24), totalFrames: frame }).strict(),
    title: z.string().min(1).max(100),
    style: styleSchema,
    language: z.enum(['vi', 'en']),
    characters: z.array(character).min(1),
    shots: z.array(shot).min(1).max(12),
  })
  .strict()
  .superRefine((ir, ctx) => {
    if (new Set(ir.characters.map((c) => c.id)).size !== ir.characters.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate character ID' });
    if (new Set(ir.shots.map((s) => s.id)).size !== ir.shots.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate shot ID' });
    const actors = new Map(ir.characters.map((c) => [c.id, new Set(c.actions)]));
    let next = 0;
    for (const s of ir.shots) {
      if (s.interval.startFrame !== next)
        ctx.addIssue({ code: 'custom', message: s.id + ': non-contiguous timeline' });
      next = s.interval.endFrame;
      if (!actors.get(s.action.actorId)?.has(s.action.name))
        ctx.addIssue({ code: 'custom', message: s.id + ': actor missing action capability' });
      if (s.audio?.textHash && s.audio.textHash !== hash(s.narration))
        ctx.addIssue({ code: 'custom', message: s.id + ': narration/audio hash mismatch' });
    }
    if (next !== ir.timeline.totalFrames)
      ctx.addIssue({ code: 'custom', message: 'Timeline totalFrames mismatch' });
    if (next > 5760) ctx.addIssue({ code: 'custom', message: 'Studio v0.1 240s limit exceeded' });
  });
export type AnimationIR = z.infer<typeof animationIrSchema>;
export type IRShot = AnimationIR['shots'][number];
export function parseAnimationIR(value: unknown): AnimationIR {
  return animationIrSchema.parse(value);
}
/** Lossless conversion for supported v1.0 projects; no persisted migration. */
export function toAnimationIR(source: ProjectSpec): AnimationIR {
  const spec = parseSpec(source);
  let end = 0;
  const shots = spec.scenes.map((s) => {
    const start = end;
    end += s.durationFrames;
    return {
      id: s.id,
      title: s.title,
      interval: { startFrame: start, endFrame: end },
      action: { name: s.action, actorId: 'studio-primary' },
      camera: { kind: s.camera },
      narration: s.narration,
      color: s.color,
      ...(s.audio ? { audio: { ...s.audio } } : {}),
    };
  });
  return parseAnimationIR({
    schemaVersion: 'animation-ir/1',
    stage: { width: 1920, height: 1080, yAxis: 'down', units: 'stage-px' },
    timeline: { fps: 24, totalFrames: end },
    title: spec.title,
    style: spec.style,
    language: spec.language,
    characters: [
      {
        id: 'studio-primary',
        rigId: 'studio-procedural-v0.1',
        artPackageId: 'studio-embedded-svg-v0.1',
        actions: actionSchema.options,
      },
    ],
    shots,
  });
}
/** Reject unsupported characters rather than quietly changing artwork. */
export function toLegacyProjectSpec(value: AnimationIR): ProjectSpec {
  const ir = parseAnimationIR(value);
  if (
    ir.characters.length !== 1 ||
    ir.characters[0]?.id !== 'studio-primary' ||
    ir.characters[0]?.rigId !== 'studio-procedural-v0.1' ||
    ir.characters[0]?.artPackageId !== 'studio-embedded-svg-v0.1'
  )
    throw new Error('IR_UNSUPPORTED_CHARACTER');
  const scenes: Scene[] = ir.shots.map((s) => ({
    id: s.id,
    title: s.title,
    narration: s.narration,
    durationFrames: s.interval.endFrame - s.interval.startFrame,
    action: s.action.name,
    camera: s.camera.kind,
    color: s.color,
    ...(s.audio ? { audio: { ...s.audio } } : {}),
  }));
  return parseSpec({
    schemaVersion: '1.0',
    title: ir.title,
    style: ir.style,
    fps: ir.timeline.fps,
    language: ir.language,
    scenes,
  });
}
export function shotAtFrame(
  value: AnimationIR,
  index: number,
): {
  shot: IRShot;
  localFrame: number;
} {
  const ir = parseAnimationIR(value);
  if (!Number.isSafeInteger(index) || index < 0 || index >= ir.timeline.totalFrames)
    throw new RangeError('IR_FRAME_OUT_OF_RANGE');
  const shot = ir.shots.find((s) => index >= s.interval.startFrame && index < s.interval.endFrame);
  if (!shot) throw new Error('IR_SHOT_NOT_FOUND');
  return { shot, localFrame: index - shot.interval.startFrame };
}
