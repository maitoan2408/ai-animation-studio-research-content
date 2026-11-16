import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {bakeM4,sampleM4Bake,validateM4Bake} from '../src/physics/m4.js';
import {rapier} from '../src/physics/engines.js';
import {m4Pack,m4Fixture} from './m4-fixture.js';
const rehash=(value:Awaited<ReturnType<typeof bakeM4>>)=>{
 const {bakeSha256,...payload}=value;
 value.bakeSha256=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 return value;
};
test('frozen unvalidated receipts cannot bypass replay validation',async()=>{
 const bake=structuredClone(await bakeM4(m4Fixture(),m4Pack));
 bake.frames[80]!.centerY=9000;
 Object.freeze(bake.frames);Object.freeze(bake);
 assert.throws(()=>sampleM4Bake(bake,80),/M4_BAKE_UNVALIDATED/);
});
test('checksum-consistent handoff teleport rejects at bake boundary',async()=>{
 const project=m4Fixture(),bake=await bakeM4(project,m4Pack);
 const jump=structuredClone(bake);jump.frames[jump.releaseFrame]!.centerX+=20;
 assert.throws(()=>validateM4Bake(rehash(jump),project,m4Pack),/M4_BAKE_HANDOFF/);
});
test('checksum-consistent floor penetration rejects at bake boundary',async()=>{
 const project=m4Fixture(),bake=await bakeM4(project,m4Pack);
 const below=structuredClone(bake);below.frames[100]!.centerY=900;
 assert.throws(()=>validateM4Bake(rehash(below),project,m4Pack),/M4_BAKE_PENETRATION/);
});

test('contact event records first real support impulse at a 240Hz substep',async()=>{
 const r=await rapier(),original=r.World.prototype.step;
 let steps=0,firstImpulse=-1;
 r.World.prototype.step=function(this:InstanceType<typeof r.World>,...args:Parameters<typeof original>){
  const result=original.apply(this,args);steps++;
  const colliders:import('@dimforge/rapier2d-deterministic-compat').Collider[]=[];
  this.forEachCollider(c=>colliders.push(c));
  if(firstImpulse<0&&colliders.length===2)this.contactPair(colliders[0]!,colliders[1]!,m=>{
   for(let i=0;i<m.numContacts();i++)if(m.contactImpulse(i)>0)firstImpulse=steps;
  });
  return result;
 };
 try{
  const p=m4Fixture();p.prop.velocityStagePxPerSecond=[0,-30];
  p.prop.angularVelocityDegPerSecond=0;p.gravityMps2=30;
  const bake=await bakeM4(p,m4Pack);
  assert.ok(firstImpulse>0,'real Rapier support impulse must be observed');
  assert.equal(bake.events.find(e=>e.kind==='platform-contact')?.frame,
   bake.releaseFrame+Math.ceil(firstImpulse/10));
 }finally{r.World.prototype.step=original;}
});

test('review frame selection supports shortest and long M4 projects',async()=>{
 const {m4ReviewFrames}=await import('../src/render/m4-review-frames.js');
 for(const [count,release] of [[105,62],[169,62],[5760,5509]]){
   const plan=m4ReviewFrames(count!,release!);
   assert.equal(plan.selected.length,9);
   for(const f of [...plan.selected,...plan.seek,plan.focus])
     assert.ok(Number.isSafeInteger(f)&&f>=0&&f<count!);
   assert.equal(plan.seek[0],plan.seek.at(-1));
   assert.equal(plan.selected.at(-1),count!-1);
 }
 assert.throws(()=>m4ReviewFrames(80,62),/M4_REVIEW_TIMELINE/);
});

test('committed second input bakes the shortest supported native timeline',async()=>{
 const {readFileSync}=await import('node:fs');
 const project=JSON.parse(readFileSync(new URL('../examples/m4-short-project.json',import.meta.url),'utf8'));
 const bake=await bakeM4(project,m4Pack);
 assert.equal(bake.frames.length,105);
 assert.equal(bake.events.find(e=>e.kind==='platform-contact')?.frame,63);
});
