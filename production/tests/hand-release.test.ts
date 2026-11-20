import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFilmRequest,buildPlayback} from '../src/render/render-films.js';
import {loadArtPack} from '../src/art/pack.js';
import {sampleGeneralPlayback} from '../src/motion/general-playback.js';
import {releasedHandState,halfOpenFrames} from '../src/motion/hand-release.js';
import {auditG3VisualIntent} from '../src/qa/visual-intent.js';
import type {ArtPack} from '../src/scene/types.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const film=async(name:string,packDir:string)=>{
 const pack=await loadArtPack(path.join(root,packDir));
 const raw=JSON.parse(await readFile(path.join(root,'examples/films',name),'utf8'));
 raw.artPack=packDir;
 const sha=(id:string)=>pack.assets.find(a=>a.id===id)!.sha256;
 for(const t of raw.film.tracks)t.contact.object.sha256=sha(t.contact.object.asset);
 for(const s of raw.film.stage??[])s.sha256=sha(s.asset);
 return {pack,playback:await buildPlayback(validateFilmRequest(raw,pack),pack)};
};

test('half-open timing scales with settle time and needs the drawing',()=>{
 const withHalf={version:'x',assets:[{id:'m/hand-half'}]} as unknown as ArtPack;
 const without={version:'x',assets:[]} as unknown as ArtPack;
 assert.equal(halfOpenFrames(24),3);assert.equal(halfOpenFrames(8),2);assert.equal(halfOpenFrames(48),6);
 assert.deepEqual([0,1,2,3].map(f=>releasedHandState(withHalf,'m',f,24)),['half','half','half','open']);
 assert.deepEqual([0,1,2,3].map(f=>releasedHandState(without,'m',f,24)),['open','open','open','open']);
 assert.throws(()=>releasedHandState(withHalf,'m',-1),/HAND_RELEASE_FRAME/);
});

for(const name of ['an-right-cup.json','mai-left-lantern.json','an-left-cup-late-release.json']){
 test('release goes grip -> half -> open on the releasing hand only: '+name,async()=>{
  const {pack,playback}=await film(name,'assets/lantern-v2');
  const r=playback.releases[0]!,t=playback.film.tracks[0]!,id=t.contact.actor.id;
  const other=t.contact.hand==='left'?'right':'left';
  const shape=(f:number,side:string)=>sampleGeneralPlayback(playback,f,pack).frame.sprites
   .find(s=>s.id===id+'.'+side+'-hand')!.asset.split('/hand-')[1];
  const n=halfOpenFrames(r.settleFrames);
  assert.equal(shape(r.frame-1,t.contact.hand),'grip');
  for(let k=0;k<n;k++)assert.equal(shape(r.frame+k,t.contact.hand),'half');
  assert.equal(shape(r.frame+n,t.contact.hand),'open');
  for(const f of [r.frame-1,r.frame,r.frame+n])assert.equal(shape(f,other),'open');
  for(let f=r.frame-2;f<r.frame+n+2;f++)
   assert.deepEqual(auditG3VisualIntent(playback,f,sampleGeneralPlayback(playback,f,pack).frame,pack).issues,[]);
 });
}

test('a pack without the half drawing keeps the immediate open hand',async()=>{
 const {pack,playback}=await film('an-right-cup.json','assets/lantern-v1');
 const r=playback.releases[0]!;
 const hand=sampleGeneralPlayback(playback,r.frame,pack).frame.sprites.find(s=>s.id==='actor-hero.right-hand')!;
 assert.equal(hand.asset,'an/hand-open');
});
