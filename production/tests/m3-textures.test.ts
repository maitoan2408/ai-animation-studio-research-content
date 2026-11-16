import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {ensureM3Textures} from '../src/render/prepare-m3.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
test('M3 cold start prepares textures; warm cache verifies source and raster bytes',async()=>{
 const root=await mkdtemp('/tmp/m3-textures-');
 try{
  await mkdir(path.join(root,'assets/lantern-v1'),{recursive:true});
  await writeFile(path.join(root,'assets/lantern-v1/source.svg'),'source');
  await writeFile(path.join(root,'assets/lantern-v1/manifest.json'),JSON.stringify({version:'pack',assets:[{id:'part',file:'source.svg',sha256:sha('source')}]}));
  let preparations=0;
  const prepare=async()=>{
   preparations++;
   await mkdir(path.join(root,'out/art-q1/textures'),{recursive:true});
   await writeFile(path.join(root,'out/art-q1/textures/part.png'),'raster');
   await writeFile(path.join(root,'out/art-q1/textures.json'),JSON.stringify({pack:'pack',textures:[{id:'part',file:'textures/part.png',sourceSha256:sha('source'),sha256:sha('raster')}]}));
  };
  await ensureM3Textures(root,prepare);
  await ensureM3Textures(root,prepare);
  assert.equal(preparations,1);
  await writeFile(path.join(root,'out/art-q1/textures/part.png'),'changed');
  await assert.rejects(ensureM3Textures(root,prepare),/M3_TEXTURE_HASH_MISMATCH/);
  assert.equal(preparations,1,'corrupt evidence must not be silently regenerated');
  await writeFile(path.join(root,'out/art-q1/textures/part.png'),'raster');
  await writeFile(path.join(root,'assets/lantern-v1/source.svg'),'changed');
  await assert.rejects(ensureM3Textures(root,prepare),/M3_TEXTURE_HASH_MISMATCH/);
 }finally{await rm(root,{recursive:true,force:true});}
});
