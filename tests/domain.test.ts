import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {planScript} from '../src/planner.js';
import {parseSpec,hash,uid,now,type Job} from '../src/domain.js';
import {Store} from '../src/store.js';

const draft=()=>planScript('[title=Chào;action=wave;seconds=4]\nXin chào.\n\n[title=Cốc;action=pick-up;camera=pan;seconds=5]\nTôi nhấc chiếc cốc.','Một buổi sáng').spec;
test('script produces explicit scenes, stable IDs and frame durations',()=>{
  const s=draft();assert.deepEqual(s.scenes.map(x=>[x.id,x.action,x.durationFrames]),[['s001','wave',96],['s002','pick-up',120]]);
  assert.deepEqual(s,draft());
});
test('reject invalid duration, unsupported directions and excessive scene count',()=>{
  for(const text of ['', '[seconds=NaN] abc','[seconds=-1] abc','[action=fly] abc','[url=https://evil] abc',Array(13).fill('Hello').join('\n\n')])assert.throws(()=>planScript(text));
});
test('narration edits invalidate generated voice binding',()=>{
  const s=draft();s.scenes[0]!.audio={assetId:'a'.repeat(64),textHash:hash('old narration'),gain:1};
  assert.throws(()=>parseSpec(s),/narration changed/);
});
test('duplicate scene IDs and unknown fields are rejected',()=>{
  const s=draft();s.scenes[1]!.id=s.scenes[0]!.id;assert.throws(()=>parseSpec(s),/unique/);
  assert.throws(()=>parseSpec({...draft(),code:'process.exit()'}));
});
test('optimistic revision updates serialize; old revision remains unchanged',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'studio-domain-'));const store=new Store(dir);await store.init();
  try{
    const p=await store.create(draft()),old=await store.current(p.id);
    const results=await Promise.allSettled([store.revise(p.id,p.currentRevisionId,{...draft(),title:'A'}),store.revise(p.id,p.currentRevisionId,{...draft(),title:'B'})]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(results.filter(x=>x.status==='rejected').length,1);
    assert.deepEqual(await store.get('revisions',old.revision.id),old.revision);
    assert.equal((await store.current(p.id)).project.revisionIds.length,2);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('store blocks traversal and detects changed asset bytes',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'studio-assets-'));const store=new Store(dir);await store.init();
  try{
    assert.throws(()=>store.file('projects','../../README'));
    const bytes=Buffer.from('fixture'),id=hash(bytes);
    await writeFile(store.assetFile(id),bytes);
    await store.put('assets',id,{id,kind:'audio',extension:'wav',bytes:bytes.length,duration:1,sampleRate:48000,source:'upload',createdAt:now()});
    await store.verifyAsset(id);
    await writeFile(store.assetFile(id),'changed');await assert.rejects(()=>store.verifyAsset(id),/bị thay đổi/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('startup marks a running job interrupted rather than successful',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'studio-recovery-'));const store=new Store(dir);await store.init();
  try{
    const job:Job={id:uid('job'),projectId:uid('prj'),revisionId:uid('rev'),profile:'preview',cacheKey:'abc',status:'running',progress:50,stage:'capture',attempts:[],createdAt:now(),updatedAt:now()};
    await store.put('jobs',job.id,job);await store.recover();assert.equal((await store.get<Job>('jobs',job.id)).status,'interrupted');
  }finally{await rm(dir,{recursive:true,force:true});}
});
