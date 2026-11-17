import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Studio} from '../../../src/application.js';
import {serve} from '../../../src/server.js';

const storyboard=()=>({
 schemaVersion:'native-director/1',
 title:'Native storyboard from Studio API',
 script:'Mai waves and then turns to greet a visitor.',
 style:'paper-cut',
 storyboard:{
   engine:'m3',
   project:{
     schemaVersion:'character-motion/1',
     character:{id:'native-ui-actor',model:'mai',rigId:'production-cutout-1',
       artPackId:'lantern-art-1',capabilities:['wave','turn-head'],
       xStart:880,floor:860,facing:1},
     clips:[{action:'wave',frames:49},{action:'turn-head',frames:49}],
   },
 },
});
test('Native Director HTTP plans, immutably saves/reopens and rejects forged inputs',async(t)=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'studio-native-http-'));
 const app=await Studio.open(dir);
 const server=await serve(app,0);
 t.after(async()=>{
   await server.close();await app.close();
   await rm(dir,{recursive:true,force:true});
 });
 const get=async(route:string)=>fetch(server.url+route);
 const post=async(route:string,payload:unknown,headers:Record<string,string>={})=>
   fetch(server.url+route,{method:'POST',
     headers:{'Content-Type':'application/json',...headers},
     body:JSON.stringify(payload)});
 let r=await post('/api/director/native/plan',{input:storyboard()});
 assert.equal(r.status,200,await r.text());
 const plan=await (await post('/api/director/native/plan',{input:storyboard()})).json() as any;
 assert.equal(plan.schemaVersion,'native-director-plan/1');
 assert.deepEqual(plan.graph.map((n:any)=>n.id),['validate','render','verify']);
 assert.equal(plan.graph[1].skill,'native-m3-chromium');
 assert.match(plan.planSha256,/^[a-f0-9]{64}$/);
 r=await post('/api/director/native/save',{plan});
 assert.equal(r.status,201,await r.text());
 const stored=await (await post('/api/director/native/save',{plan})).json() as any;
 assert.equal(stored.revision,plan.planSha256);
 const loaded=await get('/api/director/native/projects/'+stored.revision);
 assert.equal(loaded.status,200);
 const clone=await loaded.json() as any;
 assert.equal(clone.planSha256,plan.planSha256);
 const edited=structuredClone(storyboard()) as any;
 edited.script+=' Now she pauses.';
 const p2=await (await post('/api/director/native/plan',{input:edited})).json() as any;
 assert.notEqual(p2.planSha256,plan.planSha256);
 assert.equal((await post('/api/director/native/save',{plan:p2})).status,201);
 assert.equal((await get('/api/director/native/projects/'+stored.revision)).status,200);
 const forged=structuredClone(plan);
 forged.graph[1].skill='execute-arbitrary-js';
 assert.equal((await post('/api/director/native/save',{plan:forged})).status,400);
 const unsupported=structuredClone(storyboard()) as any;
 unsupported.storyboard.engine='m2';
 assert.equal((await post('/api/director/native/plan',{input:unsupported})).status,400);
 const unknown=structuredClone(storyboard()) as any;
 unknown.storyboard.project.clips[0].action='fly';
 assert.equal((await post('/api/director/native/plan',{input:unknown})).status,400);
 assert.equal((await post('/api/director/native/jobs/'+stored.revision,{approved:false})).status,400);
 assert.equal((await post('/api/director/native/jobs/'+stored.revision,{approved:true},
   {Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await get('/api/director/native/jobs/garbage/video')).status,400);
 assert.equal((await get('/api/director/native/jobs/'+stored.revision+'/video')).status,409);
 const target=path.join(dir,'director-native','projects',stored.revision+'.json');
 const original=await readFile(target,'utf8');
 await writeFile(target,original.replace('Native storyboard','TAMPERED storyboard'));
 assert.equal((await get('/api/director/native/projects/'+stored.revision)).status,400);
 await writeFile(target,original);
 assert.equal((await get('/api/director/native/projects/'+stored.revision)).status,200);
});
