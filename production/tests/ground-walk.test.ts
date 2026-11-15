import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { benchmarkFrame } from '../src/scene/benchmark.js';
import { anchorPoint } from '../src/scene/geometry.js';
import { analyzeContacts, type ContactSample } from '../src/continuity/ground.js';
import type { ArtPack } from '../src/scene/types.js';

const read = async (p: string) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const pack = await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const fixture = await read('../brief/quality/s02-walk-contacts.json') as {
  groundY: number; frameRange: [number, number];
  stanceRanges: Record<string, [number, number][]>;
  limits: { driftPx: number; gapPx: number; penetrationPx: number };
};
const tracks = new Map<string, ContactSample[]>();
for (const [id, ranges] of Object.entries(fixture.stanceRanges)) {
  const samples: ContactSample[] = [];
  for (let frame = fixture.frameRange[0]; frame < fixture.frameRange[1]; frame++) {
    const scene = benchmarkFrame(pack, 'S02', frame, { polish: true });
    const sprite = scene.sprites.find((s) => s.id === id);
    assert.ok(sprite, `missing ${id}`);
    const [x, y] = anchorPoint(pack, sprite, 'sole');
    samples.push({frame, stance: ranges.some(([a, b]) => frame >= a && frame < b),
      foot: {x, y}, groundY: fixture.groundY, camera: scene.camera});
  }
  tracks.set(id, samples);
}
test('real S02 walk passes declared alternating stance intervals without false slip on swing', () => {
  for (const [id, samples] of tracks) {
    assert.ok(samples.some(s => !s.stance));
    assert.ok(samples.some((s, i) => i > 0 && s.stance && !samples[i - 1]!.stance));
    const result = analyzeContacts(samples, fixture.limits);
    assert.equal(result.status, 'PASS', JSON.stringify({id, issues: result.issues.slice(0, 5)}));
  }
});
test('slip injected during S02 planted interval is detected', () => {
  const samples = structuredClone(tracks.get('mai.left-boot')!);
  samples[40]!.foot.x += 2;
  const result = analyzeContacts(samples, fixture.limits);
  assert.ok(result.issues.some(i => i.frame === 40 && i.code === 'FOOT_SLIDE_WORLD'));
});
