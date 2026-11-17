/** Independent adversarial audit of actual M6 media receipts.
 * Each case references immutable original files through symlinks, changes only
 * a temporary manifest, and must fail closed. The accepted media stays intact.
 */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,readdir,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspect} from './audit-m6.js';
import {validateM3} from '../motion/character-library.js';
import type {ArtPack} from '../scene/types.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=process.env.M6_OUTPUT_DIR?
  path.resolve(process.env.M6_OUTPUT_DIR):path.join(root,'out/product-first/m6');
const original=path.join(output,'baseline');
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as ArtPack;
const project=validateM3(JSON.parse(await readFile(path.join(original,'m3-project.json'),'utf8')),pack);
const manifest=JSON.parse(await readFile(path.join(original,'manifest.json'),'utf8')) as {
  sourceCommit:string;milestone:string;video:{sha256:string;duration:number};
  frameHashes:string[];nativeFrames:Record<string,string>;
  contacts:{file:string};
};
const scratch=await mkdtemp(path.join(root,'out/m6-audit-negative-'));
const prior=process.env.SOURCE_HEAD_SHA;
if(!prior)process.env.SOURCE_HEAD_SHA=manifest.sourceCommit;
const cases:{
  name:string;mutate:(m:typeof manifest)=>void;error:RegExp
}[]=[
  {name:'source-commit-mismatch',mutate:m=>{m.sourceCommit='0'.repeat(40);},
    error:/source commit mismatch/},
  {name:'forged-frame-hashes',mutate:m=>{
    const selected=Object.keys(m.nativeFrames)[1]!;
    const n=Number(selected.match(/-(\d+)\.png$/)?.[1]);
    m.frameHashes[n]='0'.repeat(64);
  },error:/M6_FRAME_SAMPLE_MISMATCH/},
  {name:'bad-still-path',mutate:m=>{m.nativeFrames['../untrusted.png']='0'.repeat(64);},
    error:/M6_NATIVE_FRAME_PATH_INVALID/},
  {name:'deleted-first-still',mutate:m=>{
    const selected=Object.keys(m.nativeFrames).find(s=>/-000\.png$/.test(s))!;
    delete m.nativeFrames[selected];
  },error:/M6_BOUNDARY_STILLS_MISSING/},
  {name:'video-digest-mismatch',mutate:m=>{m.video.sha256='0'.repeat(64);},
    error:/video source bytes tampered/},
  {name:'duration-forgery',mutate:m=>{m.video.duration=99;},
    error:/M6_MANIFEST_DURATION_MISMATCH/},
  {name:'contact-traversal',mutate:m=>{m.contacts.file='../suspicious.png';},
    error:/M6_CONTACT_SHEET_PATH_INVALID/},
];
try{
  const names=await readdir(original);
  for(const test of cases){
    const folder=path.join(scratch,test.name);
    await mkdir(folder,{recursive:true});
    for(const name of names){
      if(name==='manifest.json')continue;
      await symlink(path.join(original,name),path.join(folder,name));
    }
    const modified=structuredClone(manifest);
    test.mutate(modified);
    await writeFile(path.join(folder,'manifest.json'),JSON.stringify(modified));
    await assert.rejects(()=>inspect(folder,'baseline',project,pack),test.error,test.name);
  }
  console.log('M6_MEDIA_TAMPER_NEGATIVE_PASS '+JSON.stringify({cases:cases.map(c=>c.name)}));
}finally{
  if(prior===undefined)delete process.env.SOURCE_HEAD_SHA;
  else process.env.SOURCE_HEAD_SHA=prior;
  await rm(scratch,{recursive:true,force:true});
}
