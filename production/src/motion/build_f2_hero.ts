/** Rebind the existing S05 candidate to a separate development art revision. */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {heroInput,heroFrame,r3,performanceIR,validateHeroPerformance} from './hero.js';
import {bakeHero} from '../physics/hero.js';
import {validateBake,digest} from '../physics/bake.js';
import {inspectHeroGround} from '../continuity/hero-ground.js';
import {validateOwnership} from '../continuity/ownership.js';
import {validateAlphaGate} from '../continuity/alpha-gate.js';
import type {ArtPack} from '../scene/types.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),run=promisify(execFile);
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const source=process.argv[2];if(!source)throw Error('F2_OVERLAY_REQUIRED');
const folder=path.resolve(source),manifestBytes=await readFile(path.join(folder,'manifest.json'));
const pack=JSON.parse(manifestBytes.toString()) as ArtPack & {status:string};
if(sha(manifestBytes)!=='0db84d9fed8b8a35ccea5c328760ec2f519054475fae6f5a70d1b7925a4d67d2'||pack.version!=='lantern-f2-development-2'||pack.status!=='PROVISIONAL_NOT_APPROVED'||pack.assets.length!==156)throw Error('F2_OVERLAY_MANIFEST');
for(const asset of pack.assets){const file=path.resolve(folder,asset.file);
 if(!file.startsWith(folder+path.sep)||sha(await readFile(file))!==asset.sha256)throw Error(`F2_OVERLAY_ASSET ${asset.id}`);}
const oldPack=JSON.parse(await readFile(path.join(root,'assets/lantern-polish-1/manifest.json'),'utf8')) as ArtPack;
const oldInput=JSON.parse(await readFile(path.join(root,'artifacts/quality/contracts-20261114/input.json'),'utf8'));
const oldBake=validateBake(JSON.parse(await readFile(path.join(root,'artifacts/quality/contracts-20261114/bake.json'),'utf8')));
const input=heroInput(pack);const bake=await bakeHero(input),again=await bakeHero(input);
if(bake.sha256!==again.sha256)throw Error('F2_BAKE_NONDETERMINISTIC');
if(JSON.stringify(bake.data.frames)!==JSON.stringify(oldBake.data.frames)||JSON.stringify(bake.data.events)!==JSON.stringify(oldBake.data.events))throw Error('F2_BAKE_MOTION_CHANGED');
const frames=Array.from({length:192},(_,f)=>heroFrame(pack,input,bake,f));
for(let f=0;f<192;f++)if(JSON.stringify(frames[f])!==JSON.stringify(heroFrame(oldPack,oldInput,oldBake,f)))throw Error(`F2_BASE_FRAME_CHANGED ${f}`);
const groundBytes=await readFile(path.join(root,'brief/quality/ground-fixture.json'));
const ground=inspectHeroGround(pack,JSON.parse(groundBytes.toString()),f=>frames[f]!);if(ground.status!=='PASS')throw Error('F2_GROUND_FAILED');
const ownershipBytes=await readFile(path.join(root,'brief/quality/s05-ownership.json'));
const ownership=validateOwnership(JSON.parse(ownershipBytes.toString()),validateHeroPerformance(performanceIR));
const textures=JSON.parse(await readFile(path.join(root,'out/hero-textures/d5a8aa9c807b9c95f4ddcfbc9c1b0591f6035e601e285053d614a7e7ed06c309/textures.json'),'utf8'));
const out=path.join(root,'out/f2-hero',randomUUID());await mkdir(out,{recursive:true});
const result={shot:'S05',fps:24,pack,textures,edit:{...r3,qualityCandidate:'f2-overlay-baseline',bakeSha256:bake.sha256},frames};
const payload=JSON.stringify(result),pending=path.join(out,'S05.pending.json');await writeFile(pending,payload,{flag:'wx'});
const {stdout}=await run('python3',[path.join(root,'src/continuity/alpha_overlap.py'),pending],{timeout:120000,maxBuffer:4*1024*1024});
const alpha=JSON.parse(stdout);await writeFile(path.join(out,'alpha-critic.json'),JSON.stringify(alpha,null,2)+'\n');
validateAlphaGate(alpha,sha(payload));await rename(pending,path.join(out,'S05.json'));
await writeFile(path.join(out,'input.json'),JSON.stringify(input,null,2)+'\n');await writeFile(path.join(out,'bake.json'),JSON.stringify(bake,null,2)+'\n');
const report={status:'PASS_PROVISIONAL_OVERLAY_REBIND',output:out,artManifestSha256:sha(manifestBytes),artObjectSha256:digest(pack),
 inputSha256:digest(input),bakeSha256:bake.sha256,oldBakeSha256:oldBake.sha256,frames:192,baselineFramesAndNumericalBakeIdentical:true,
 ownershipFixtureSha256:sha(ownershipBytes),ownership,groundFixtureSha256:sha(groundBytes),
 limitations:['Uses existing S05 poses only; no draft mouth or expression appears in this frame stream',
 'Projected alpha 2D gate is not 3D penetration detection', 'Development candidate only; no artistic approval']};
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
