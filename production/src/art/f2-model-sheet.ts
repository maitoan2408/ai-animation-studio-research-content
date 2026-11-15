/** Draft rig model sheets from separately bound art; no speech or art approval. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {actorSprites} from '../scene/rig.js';
import {polishFrame} from '../scene/polish.js';
import type {ArtPack,ActorPose,Sprite} from '../scene/types.js';
const root=fileURLToPath(new URL('../../',import.meta.url));const folder=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('SHEET_OVERLAY_REQUIRED');
const bytes=await readFile(path.join(folder,'manifest.json'));const sha=(x:Uint8Array)=>createHash('sha256').update(x).digest('hex');
if(sha(bytes)!=='0db84d9fed8b8a35ccea5c328760ec2f519054475fae6f5a70d1b7925a4d67d2')throw Error('SHEET_MANIFEST_HASH');
const pack=JSON.parse(bytes.toString()) as ArtPack;const encoded=new Map<string,string>();
async function url(id:string){if(encoded.has(id))return encoded.get(id)!;const a=pack.assets.find(x=>x.id===id);if(!a)throw Error(`SHEET_ASSET ${id}`);
 const file=path.resolve(folder,a.file);if(!file.startsWith(folder+path.sep))throw Error('SHEET_PATH');const b=await readFile(file);if(sha(b)!==a.sha256)throw Error(`SHEET_HASH ${id}`);
 const s='data:image/svg+xml;base64,'+b.toString('base64');encoded.set(id,s);return s;}
const out=path.join(root,'out/f2-model-sheet',randomUUID());await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});const outputs=[];
 for(const [sheet,moods,extreme] of [
  ['base',['neutral','worried','happy'],false],['draft',['sad','surprised','angry'],false],['extreme',['sad','surprised','angry'],true],
 ] as const){
  const sprites:Sprite[]=[],labels:string[]=[];
  for(const [row,actor] of (['mai','an'] as const).entries())for(const [col,view] of (['front','quarter','profile'] as const).entries()){
   const pose={id:`${actor}-${view}`,character:actor,x:320+col*640,floor:490+row*520,facing:1,view,mood:moods[col],
    mouth:extreme?['U','L','teeth'][col]:(sheet==='draft'?['M','O','M'][col]:['rest','M','smile'][col]),scale:.82,torsoAngle:extreme?(col===1?10:-9):0,headAngle:extreme?(col===1?-14:11):0} as ActorPose;
   const actorFrame=actorSprites(pack,pose);const scene=polishFrame(pack,{sprites:actorFrame.sprites,markers:actorFrame.markers,camera:{x:960,y:540,zoom:1}});
   sprites.push(...scene.sprites);labels.push(`<text x="${320+col*640}" y="${515+row*520}" text-anchor="middle">${actor} · ${view} · ${moods[col]}${extreme?' · draft pose':''}</text>`);
  }
  const markup=await Promise.all([...sprites].sort((a,b)=>a.z-b.z).map(async s=>{const a=pack.assets.find(x=>x.id===s.asset)!;
   return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rotation}) scale(${s.scaleX} ${s.scaleY})"><image href="${await url(s.asset)}" x="${-a.pivot[0]}" y="${-a.pivot[1]}" width="${a.width}" height="${a.height}" opacity="${s.opacity}"/></g>`;}));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#f5dfb3"/><g font-family="sans-serif" font-size="22" fill="#294957">${labels.join('')}</g>${markup.join('')}</svg>`;
  await writeFile(path.join(out,`${sheet}.svg`),svg,{flag:'wx'});await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('image')).map(el=>{const img=new Image();img.src=el.getAttribute('href')!;return img.decode();}));});
  const png=path.join(out,`${sheet}.png`);await page.screenshot({path:png});outputs.push({sheet,sha256:sha(await readFile(png))});
 }
 const result={status:'PROVISIONAL_VECTOR_RIG_SHEETS',output:out,manifestSha256:sha(bytes),browser:await browser.version(),outputs,
  limitations:['Vector rig sheets, not paper mesh render or animation.', 'Draft labels, mouth and head drawings have not been reviewed or aligned to speech.',
   'Extreme pose sample is not a formal reachability or art gate.']};
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
