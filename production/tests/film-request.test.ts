import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFilmRequest,buildPlayback} from '../src/render/render-films.js';
import {loadArtPack} from '../src/art/pack.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=path.join(root,'examples/films');
const load=async(name:string)=>JSON.parse(await readFile(path.join(dir,name),'utf8'));

test('every example film is pure data that validates and bakes a real support contact',async()=>{
 const files=(await readdir(dir)).filter(f=>f.endsWith('.json'));
 assert.ok(files.length>=3);
 const actors=new Set<string>(),hands=new Set<string>(),props=new Set<string>();
 for(const file of files){
  const raw=await load(file);
  const pack=await loadArtPack(path.join(root,raw.artPack));
  const request=validateFilmRequest(raw,pack);
  assert.equal(request.id+'.json',file);
  const playback=await buildPlayback(request,pack);
  for(const r of playback.releases)assert.ok(r.bake.contacts.length>0,file);
  for(const t of request.film.tracks){
   actors.add(t.contact.actor.model);hands.add(t.contact.hand);props.add(t.contact.object.asset);
  }
 }
 // Reuse is proven only across different characters, hands and props.
 assert.ok(actors.size>=2&&hands.size>=2&&props.size>=2);
});

test('film requests fail closed on unknown fields, unknown support and mismatched release',async()=>{
 const raw=await load('an-right-cup.json');
 const pack=await loadArtPack(path.join(root,raw.artPack));
 assert.throws(()=>validateFilmRequest({...raw,extra:1},pack),/FILM_REQUEST_UNKNOWN_FIELD/);
 const badSupport=structuredClone(raw);badSupport.releases[0].supportStageId='nowhere';
 assert.throws(()=>validateFilmRequest(badSupport,pack),/FILM_REQUEST_SUPPORT_UNKNOWN/);
 const badActor=structuredClone(raw);badActor.releases[0].actorId='someone-else';
 assert.throws(()=>validateFilmRequest(badActor,pack),/FILM_REQUEST_RELEASE_TRACK/);
 const badId=structuredClone(raw);badId.id='Bad Id';
 assert.throws(()=>validateFilmRequest(badId,pack),/FILM_REQUEST_SCHEMA/);
});
