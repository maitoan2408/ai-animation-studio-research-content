import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {ensureTextures} from '../src/art/textures.js';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
test('cold start prepares textures; warm cache verifies source and raster bytes',async()=>{
 const root=await mkdtemp('/tmp/m3-textures-');
 try{
  const pack=path.join(root,'pack'),cache=path.join(root,'cache');
  await mkdir(pack,{recursive:true});
  await writeFile(path.join(pack,'source.svg'),'source');
  await writeFile(path.join(pack,'manifest.json'),JSON.stringify({version:'pack',assets:[{id:'part',file:'source.svg',sha256:sha('source')}]}));
  let preparations=0;
  const prepare=async()=>{
   preparations++;
   await mkdir(path.join(cache,'textures'),{recursive:true});
   await writeFile(path.join(cache,'textures/part.png'),'raster');
   await writeFile(path.join(cache,'textures.json'),JSON.stringify({pack:'pack',textures:[{id:'part',file:'textures/part.png',sourceSha256:sha('source'),sha256:sha('raster')}]}));
  };
  await ensureTextures(pack,cache,prepare);
  await ensureTextures(pack,cache,prepare);
  assert.equal(preparations,1);
  await writeFile(path.join(cache,'textures/part.png'),'changed');
  await assert.rejects(ensureTextures(pack,cache,prepare),/TEXTURE_HASH_MISMATCH/);
  assert.equal(preparations,1,'corrupt evidence must not be silently regenerated');
  await writeFile(path.join(cache,'textures/part.png'),'raster');
  await writeFile(path.join(pack,'source.svg'),'changed');
  await assert.rejects(ensureTextures(pack,cache,prepare),/TEXTURE_HASH_MISMATCH/);
 }finally{await rm(root,{recursive:true,force:true});}
});
