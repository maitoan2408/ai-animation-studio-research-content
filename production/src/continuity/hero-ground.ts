/** Independent S05 ground gate, based on the explicitly declared development fixture. */
import { anchorPoint } from '../scene/geometry.js';
import type { ArtPack, SceneFrame } from '../scene/types.js';
import { analyzeContacts, type ContactSample } from './ground.js';
const ids = ['mai.left-boot', 'mai.right-boot', 'an.left-boot', 'an.right-boot'] as const;
export function inspectHeroGround(pack: ArtPack, raw: unknown, evaluate: (frame: number) => SceneFrame) {
  if (!raw || typeof raw !== 'object') throw Error('HERO_GROUND_FIXTURE');
  const fixture = raw as {schemaVersion?: unknown; shot?: unknown; coordinateSystem?: unknown;
    groundY?: unknown; stance?: {startFrame?: unknown; endFrameExclusive?: unknown};
    limits?: {driftPx?: unknown; gapPx?: unknown; penetrationPx?: unknown}; status?: unknown};
  if (fixture.schemaVersion !== 1 || fixture.shot !== 'S05' ||
      fixture.coordinateSystem !== 'stage-pixels-y-down' || fixture.groundY !== 860 ||
      fixture.stance?.startFrame !== 0 || fixture.stance.endFrameExclusive !== 192 ||
      fixture.limits?.driftPx !== 1 || fixture.limits.gapPx !== 1 ||
      fixture.limits.penetrationPx !== 0 || fixture.status !== 'PROVISIONAL_DEVELOPMENT_ASSET')
    throw Error('HERO_GROUND_FIXTURE');
  const samples = new Map(ids.map(id => [id, [] as ContactSample[]]));
  for (let frame = 0; frame < 192; frame++) {
    const scene = evaluate(frame);
    for (const id of ids) {
      const sprites = scene.sprites.filter(s => s.id === id);
      if (sprites.length !== 1) throw Error(`HERO_GROUND_SPRITE ${id}`);
      const [x, y] = anchorPoint(pack, sprites[0]!, 'sole');
      samples.get(id)!.push({frame, stance: true, foot: {x, y}, groundY: 860, camera: scene.camera});
    }
  }
  const limits = {driftPx: 1, gapPx: 1, penetrationPx: 0};
  const tracks = Object.fromEntries(ids.map(id => [id, analyzeContacts(samples.get(id)!, limits)]));
  return {status: Object.values(tracks).every(r => r.status === 'PASS') ? 'PASS' as const : 'FAIL' as const,
    tracks, scope: 'S05 declared development ground and stance only; no body/prop collision or artistic approval'};
}
