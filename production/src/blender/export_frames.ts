/** Shared authored blocking → data for native Blender planes/F-curves.
 * The .blend uses these keyed objects, never candidate A rendered video frames. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../render/server.js';
import {benchmarkFrame,shotFrames,type ShotId,type Edit} from '../scene/benchmark.js';
import {phonemeCues} from '../audio/cues.js';
import {voiceFixture} from '../audio/fixture.js';
const requested:Edit=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):{};
const pack=JSON.parse(await readFile(path.join(root,requested.polish?'assets/lantern-polish-1/manifest.json':'assets/lantern-v1/manifest.json'),'utf8'));
const textures=JSON.parse(await readFile(path.join(root,requested.polish?'out/art-q2-polish/textures.json':'out/art-q1/textures.json'),'utf8'));
const {manifest:voice}=await voiceFixture(requested);
const edit:Edit={cues:phonemeCues(voice.timings),...requested};
const output=process.argv[3]?path.resolve(process.argv[3]):path.join(root,'out/blender-input');await mkdir(output,{recursive:true});
for(const shot of Object.keys(shotFrames) as ShotId[]){
 const frames=Array.from({length:shotFrames[shot]},(_,frame)=>benchmarkFrame(pack,shot,frame,edit));
 await writeFile(path.join(output,`${shot}.json`),JSON.stringify({shot,fps:24,pack,textures,edit,frames}));
}
console.log(JSON.stringify({output,shots:6,frames:1152}));
