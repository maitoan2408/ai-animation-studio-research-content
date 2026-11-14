/** Single-frame authored draft pose, based on a fully rebound S05 development bake. */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateAlphaGate} from '../continuity/alpha-gate.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),run=promisify(execFile);
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const [source,texturePath]=process.argv.slice(2);if(!source||!texturePath)throw Error('F2_PREVIEW_ARGUMENTS');
const raw=await readFile(path.resolve(source)),data=JSON.parse(raw.toString());
const previous=JSON.parse(await readFile(path.join(path.dirname(path.resolve(source)),'alpha-critic.json'),'utf8'));
validateAlphaGate(previous,sha(raw));
if(data.pack.version!=='lantern-f2-development-2'||data.frames.length!==192)throw Error('F2_PREVIEW_SOURCE');
const textures=JSON.parse(await readFile(path.resolve(texturePath),'utf8'));
const modified=structuredClone(data),frame=modified.frames[108];modified.textures=textures;
const changes:Record<string,string>={
 'mai.head':'mai/head-quarter-sad','mai.head.paper-shadow':'shadow/mai/head-quarter-sad',
 'mai.mouth':'mouth/L','an.head':'an/head-quarter-surprised',
 'an.head.paper-shadow':'shadow/an/head-quarter-surprised','an.mouth':'mouth/U'};
for(const [id,assetId] of Object.entries(changes)){
 const matches=frame.sprites.filter((s:{id:string})=>s.id===id);
 if(matches.length!==1)throw Error(`F2_PREVIEW_SPRITE ${id}`);
 const old=modified.pack.assets.find((a:{id:string})=>a.id===matches[0].asset);
 const next=modified.pack.assets.find((a:{id:string})=>a.id===assetId);
 const tex=textures.textures.find((t:{id:string})=>t.id===assetId);
 if(!old||!next||!tex||tex.sourceSha256!==next.sha256||
   JSON.stringify(old.pivot)!==JSON.stringify(next.pivot)||old.width!==next.width||old.height!==next.height||
   JSON.stringify(old.anchors)!==JSON.stringify(next.anchors))throw Error(`F2_PREVIEW_COMPATIBILITY ${id}`);
 matches[0].asset=assetId;
}
modified.edit={...modified.edit,qualityCandidate:'f2-authored-face-preview',previewFrame:108};
const out=path.join(root,'out/f2-face-preview',randomUUID());await mkdir(out,{recursive:true});
const payload=JSON.stringify(modified),pending=path.join(out,'S05.pending.json');await writeFile(pending,payload,{flag:'wx'});
const {stdout}=await run('python3',[path.join(root,'src/continuity/alpha_overlap.py'),pending],{timeout:120000,maxBuffer:4*1024*1024});
const alpha=JSON.parse(stdout);await writeFile(path.join(out,'alpha-critic.json'),JSON.stringify(alpha,null,2)+'\n');
validateAlphaGate(alpha,sha(payload));await rename(pending,path.join(out,'S05.json'));
const report={status:'PROVISIONAL_SINGLE_FRAME',output:out,sourceSha256:sha(raw),modifiedSha256:sha(payload),
 frame:108,changes,limits:['Only six asset selectors at frame 108 changed; no new acting or mouth timing.',
 'Face drawings and shadows are provisional; no voice or artistic review.',
 '2D alpha gate does not prove 3D penetration or full-frame motion.']};
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
