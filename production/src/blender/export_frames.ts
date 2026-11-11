/** Shared authored blocking → data for native Blender planes/F-curves.
 * The .blend uses these keyed objects, never candidate A rendered video frames. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {benchmarkFrame,shotFrames,type ShotId,type Edit} from '../scene/benchmark.js';
import {phonemeCues} from '../audio/cues.js';
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8'));
const textures=JSON.parse(await readFile(path.join(root,'out/art-q1/textures.json'),'utf8'));
const voice=JSON.parse(await readFile(path.join(root,'artifacts/Q1/draft-3/voice/manifest.json'),'utf8'));
const edit:Edit={cues:phonemeCues(voice.timings),...(process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):{})};
const output=path.join(root,'out/blender-input');await mkdir(output,{recursive:true});
for(const shot of Object.keys(shotFrames) as ShotId[]){
 const frames=Array.from({length:shotFrames[shot]},(_,frame)=>benchmarkFrame(pack,shot,frame,edit));
 await writeFile(path.join(output,`${shot}.json`),JSON.stringify({shot,fps:24,pack,textures,edit,frames}));
}
console.log(JSON.stringify({output,shots:6,frames:1152}));
