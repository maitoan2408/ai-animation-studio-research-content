/** Bounded scalar motion primitive for F3 experiments; no implicit rig binding. */
export type ScalarClip = Readonly<{
  duration: number;
  start: number;
  end: number;
  anticipation: number;
  actionEnd: number;
  anticipationAmount: number;
  overshootAmount: number;
}>;
export type ClipSample = Readonly<{ frame: number; value: number; phase: 'anticipation' | 'action' | 'settle' }>;
const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Frames are integer samples including both endpoints. Marker positions are in
 * normalized clip time, making duration changes a retime, not a stateful replay. */
export function sampleScalarClip(clip: ScalarClip, frame: number): ClipSample {
  const keys = ['duration', 'start', 'end', 'anticipation', 'actionEnd', 'anticipationAmount', 'overshootAmount'];
  if (!clip || typeof clip !== 'object' || Object.keys(clip).sort().join(',') !== keys.sort().join(',') ||
      !Object.values(clip).every((v) => typeof v === 'number' && Number.isFinite(v)) ||
      !Number.isSafeInteger(clip.duration) || clip.duration < 3 || clip.duration > 5760 ||
      clip.anticipation <= 0 || clip.anticipation >= clip.actionEnd || clip.actionEnd >= 1 ||
      clip.anticipationAmount < 0 || clip.anticipationAmount > 0.5 ||
      clip.overshootAmount < 0 || clip.overshootAmount > 0.5)
    throw Error('MOTION_CLIP_INVALID');
  if (!Number.isSafeInteger(frame) || frame < 0 || frame > clip.duration) throw Error('MOTION_FRAME_INVALID');
  const t = frame / clip.duration;
  const delta = clip.end - clip.start;
  let value: number;
  let phase: ClipSample['phase'];
  if (t < clip.anticipation) {
    phase = 'anticipation';
    value = clip.start - delta * clip.anticipationAmount * smooth(t / clip.anticipation);
  } else if (t < clip.actionEnd) {
    phase = 'action';
    const begin = clip.start - delta * clip.anticipationAmount;
    value = begin + (clip.end + delta * clip.overshootAmount - begin) * smooth((t - clip.anticipation) / (clip.actionEnd - clip.anticipation));
  } else {
    phase = 'settle';
    value = clip.end + delta * clip.overshootAmount * (1 - smooth((t - clip.actionEnd) / (1 - clip.actionEnd)));
  }
  if (!Number.isFinite(value)) throw Error('MOTION_CLIP_RANGE');
  return { frame, value, phase };
}
