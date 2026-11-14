/** Observations from actual S05 bake; overlapping canvas bounds require review. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {heroFrame,performanceIR,validateHeroPerformance} from '../motion/hero.js';
import {validateBake} from '../physics/bake.js';
import {inspectSpriteBounds} from './sprite-overlap.js';
import type {ArtPack} from '../scene/types.js';
import type {HeroInput} from '../physics/hero.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const files=['assets/lantern-polish-1/manifest.json','artifacts/quality/contracts-20261114/input.json',
 'artifacts/quality/contracts-20261114/bake.json','src/scene/rig.ts','src/scene/geometry.ts',
 'src/scene/benchmark.ts','src/scene/math.ts','src/scene/polish.ts','src/motion/hero.ts',
 'src/continuity/sprite-overlap.ts'];
const bytes=await Promise.all(files.map(p=>readFile(path.join(root,p))));
const pack=JSON.parse(bytes[0]!.toString()) as ArtPack,input=JSON.parse(bytes[1]!.toString()) as HeroInput;
const bake=validateBake(JSON.parse(bytes[2]!.toString()));
const performance=validateHeroPerformance(performanceIR);
const overlaps:Record<string,number[]>={'mai.torso':[],'an.torso':[]};
for(let frame=0;frame<192;frame++){
 const scene=heroFrame(pack,input,bake,frame),lamp=scene.sprites.find(s=>s.id==='lamp');
 if(!lamp)throw Error('MISSING_LAMP');
 for(const [id,frames] of Object.entries(overlaps)){
  const torso=scene.sprites.find(s=>s.id===id);if(!torso)throw Error(`MISSING_TORSO ${id}`);
  if(inspectSpriteBounds(pack,lamp,torso).status==='BOUNDS_OVERLAP') frames.push(frame);
 }
}
console.log(JSON.stringify({status:'OBSERVATION_ONLY',shot:'S05',frames:192,
 hashes:Object.fromEntries(files.map((f,i)=>[f,createHash('sha256').update(bytes[i]!).digest('hex')])),
 bakeSha256:bake.sha256,contacts:performance.contacts,overlapFrames:overlaps,
 limitations:['SVG canvas rectangles include transparent pixels and ignore physical depth; overlap is not proof of penetration',
 'Grip contacts are not ownership; ownership is not provided by this scene contract',
 'Development fixture, not artistic approval or a publish gate']},null,2));
