/** Read the locked development hero and emit a new, isolated F1 report. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { heroFrame } from '../motion/hero.js';
import { validateBake } from '../physics/bake.js';
import { anchorPoint } from '../scene/geometry.js';
import { analyzeContacts, type ContactSample } from './ground.js';
import { validateBoundary, compareBoundary } from './boundary.js';
import type { ArtPack } from '../scene/types.js';
import type { HeroInput } from '../physics/hero.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const sha = (v: Buffer) => createHash('sha256').update(v).digest('hex');
const files = [
  'assets/lantern-polish-1/manifest.json',
  'artifacts/quality/contracts-20261114/input.json',
  'artifacts/quality/contracts-20261114/bake.json',
  'brief/quality/ground-fixture.json',
  'src/scene/rig.ts',
];
const bytes = await Promise.all(files.map((f) => readFile(path.join(root, f))));
const pack = JSON.parse(bytes[0]!.toString()) as ArtPack,
  input = JSON.parse(bytes[1]!.toString()) as HeroInput,
  bake = validateBake(JSON.parse(bytes[2]!.toString())),
  fixture = JSON.parse(bytes[3]!.toString());
const ids = ['mai.left-boot', 'mai.right-boot', 'an.left-boot', 'an.right-boot'],
  tracks = new Map(ids.map((id) => [id, [] as ContactSample[]]));
let previous = heroFrame(pack, input, bake, 190).sprites.find((s) => s.id === 'lamp')!;
const last = heroFrame(pack, input, bake, 191).sprites.find((s) => s.id === 'lamp')!;
for (let frame = 0; frame < 192; frame++) {
  const scene = heroFrame(pack, input, bake, frame);
  for (const id of ids) {
    const sprite = scene.sprites.find((s) => s.id === id);
    if (!sprite) throw Error('MISSING_BOOT');
    const [x, y] = anchorPoint(pack, sprite, 'sole');
    tracks
      .get(id)!
      .push({
        frame,
        stance: true,
        foot: { x, y },
        groundY: fixture.groundY,
        camera: scene.camera,
      });
  }
}
const ground = Object.fromEntries(
  ids.map((id) => [id, analyzeContacts(tracks.get(id)!, fixture.limits)]),
);
const boundary = {
  schemaVersion: 1,
  shot: 'S05',
  revision: 'candidate',
  frame: 191,
  fps: { num: 24, den: 1 },
  artSha256: input.artSha256,
  rigSha256: sha(bytes[4]!),
  recipeSha256: bake.binding!.executionSha256,
  objects: {
    lamp: {
      position: { x: last.x, y: last.y },
      rotation: last.rotation,
      velocity: {
        x: (last.x - previous.x) * 24,
        y: (last.y - previous.y) * 24,
        angular: (last.rotation - previous.rotation) * 24,
      },
      owner: 'an.rightHandGrip',
      pose: {},
    },
  },
};
const limits = {
  positionPx: 1,
  rotationDeg: 0.1,
  velocityPxPerSec: 1,
  angularVelocityDegPerSec: 1,
  pose: 0.01,
};
const before = validateBoundary(boundary),
  match = validateBoundary({ ...boundary, shot: 'S06', frame: 0 });
const bad = structuredClone(boundary);
bad.shot = 'S06';
bad.frame = 0;
bad.objects.lamp.rotation = 0;
const matched = compareBoundary(before, match, 'continuous', limits),
  snap = compareBoundary(before, validateBoundary(bad), 'continuous', limits);
if (
  Object.values(ground).some((r) => r.status !== 'PASS') ||
  matched.status !== 'PASS' ||
  snap.status !== 'FAIL' ||
  !snap.issues.some((i) => i.code === 'ROTATION_MISMATCH')
)
  throw Error('F1_FIXTURE_FAILED');
const out = path.join(root, 'out/f1-inspection', randomUUID());
await mkdir(out, { recursive: true });
const report = {
  status: 'PASS_TECHNICAL_FIXTURE',
  inputHashes: Object.fromEntries(files.map((f, i) => [f, sha(bytes[i]!)])),
  ground,
  finalBoundary: boundary,
  syntheticMatchingSeam: matched,
  syntheticUprightSnap: snap,
  limits,
  remaining: [
    'S06 continuation is synthetic, not a produced next shot',
    'Ground and stance are declared development fixtures',
    'Prop/body collision tested on synthetic proxies only',
    'No artistic approval',
  ],
};
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', {
  flag: 'wx',
});
console.log(JSON.stringify({ output: out, ...report }));
