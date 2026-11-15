import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { benchmarkFrame, shotFrames } from '../src/scene/benchmark.js';
import { inspectSceneSeam } from '../src/continuity/scene-seam.js';
import type { ArtPack } from '../src/scene/types.js';
const read = async (p: string) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const pack = await read('../assets/lantern-polish-1/manifest.json') as ArtPack;
const order = await read('../brief/edit-R2-order.json') as string[];
const edit = await read('../brief/edit-R3.json');
const before = benchmarkFrame(pack, 'S06', shotFrames.S06 - 1, edit);
const after = benchmarkFrame(pack, 'S05', 0, edit);
test('real R2 editorial boundary is S06 to S05; a missing lamp is explicit', () => {
  assert.equal(order.indexOf('S05'), order.indexOf('S06') + 1);
  const [torso, lamp] = inspectSceneSeam(before, after, ['mai.torso', 'lamp']);
  assert.equal(torso!.status, 'OBSERVED');
  assert.deepEqual(lamp, {id: 'lamp', status: 'MISSING_AT_BOUNDARY', beforePresent: false, afterPresent: true});
});
test('seam inventory refuses ambiguous selection and duplicate sprite identity', () => {
  assert.throws(() => inspectSceneSeam(before, after, ['lamp', 'lamp']), /SEAM_OBJECT_SELECTION/);
  assert.throws(() => inspectSceneSeam({...before, sprites: [...before.sprites, before.sprites[0]!]}, after, ['lamp']), /SEAM_DUPLICATE_SPRITE/);
});
test('real S06 to S05 torso change is reported unless an explicit provisional cut is declared', async () => {
  const {validateBoundary,compareBoundary}=await import('../src/continuity/boundary.js');
  const {createHash}=await import('node:crypto');
  const hash=(name:string)=>createHash('sha256').update(name).digest('hex');
  const transition=await read('../brief/quality/r2-s06-s05-transition.json');
  assert.equal(transition.from,'S06'); assert.equal(transition.to,'S05');
  assert.equal(transition.status,'PROVISIONAL_DEVELOPMENT');
  const mk=(shot:'S05'|'S06',f:number)=>{
    const sprite=benchmarkFrame(pack,shot,f,edit).sprites.find(s=>s.id==='mai.torso')!;
    const other=benchmarkFrame(pack,shot,shot==='S06'?f-1:f+1,edit).sprites.find(s=>s.id==='mai.torso')!;
    const sign=shot==='S06'?1:-1;
    return validateBoundary({schemaVersion:1,shot,revision:'r3',frame:f,fps:{num:24,den:1},
      artSha256:hash('fixture-art'),rigSha256:hash('fixture-rig'),recipeSha256:hash('fixture-recipe'),
      objects:{torso:{position:{x:sprite.x,y:sprite.y},rotation:sprite.rotation,
        velocity:{x:(sprite.x-other.x)*24*sign,y:(sprite.y-other.y)*24*sign,angular:(sprite.rotation-other.rotation)*24*sign},
        owner:null,pose:{}}}});
  };
  const a=mk('S06',143),b=mk('S05',0);
  const limits={positionPx:1,rotationDeg:.1,velocityPxPerSec:1,angularVelocityDegPerSec:1,pose:.01};
  assert.ok(compareBoundary(a,b,'continuous',limits).issues.some(i=>i.code==='POSITION_MISMATCH'));
  assert.equal(compareBoundary(a,b,{kind:transition.kind,reason:transition.reason},limits).status,'INTENTIONAL_CUT');
});
