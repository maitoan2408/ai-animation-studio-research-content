/** Observational seam inventory. No claim that a cut implies physical continuity. */
import type { SceneFrame, Sprite } from '../scene/types.js';

function indexed(frame: SceneFrame): Map<string, Sprite> {
  const result = new Map<string, Sprite>();
  for (const sprite of frame.sprites) {
    if (result.has(sprite.id)) throw Error(`SEAM_DUPLICATE_SPRITE ${sprite.id}`);
    if (![sprite.x, sprite.y, sprite.rotation, sprite.scaleX, sprite.scaleY].every(Number.isFinite))
      throw Error(`SEAM_NONFINITE_SPRITE ${sprite.id}`);
    result.set(sprite.id, sprite);
  }
  return result;
}

/** Compare explicitly selected IDs. Absence is reported, never turned into owner=null or a cut. */
export function inspectSceneSeam(before: SceneFrame, after: SceneFrame, ids: string[]) {
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !id))
    throw Error('SEAM_OBJECT_SELECTION');
  const a = indexed(before), b = indexed(after);
  return ids.map(id => {
    const previous = a.get(id), next = b.get(id);
    if (!previous || !next) return {id, status: 'MISSING_AT_BOUNDARY' as const,
      beforePresent: !!previous, afterPresent: !!next};
    return {id, status: 'OBSERVED' as const, before: {asset: previous.asset, x: previous.x,
      y: previous.y, rotation: previous.rotation, scaleX: previous.scaleX, scaleY: previous.scaleY},
      after: {asset: next.asset, x: next.x, y: next.y, rotation: next.rotation,
        scaleX: next.scaleX, scaleY: next.scaleY},
      positionDelta: Math.hypot(next.x - previous.x, next.y - previous.y),
      rotationDelta: Math.abs(((((next.rotation - previous.rotation) % 360) + 540) % 360) - 180)};
  });
}
