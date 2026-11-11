/** Art preflight and transparent texture preparation; never a product renderer.
 * Browser rasterization preserves original SVGs and writes a separate texture
 * manifest. Styleframes use those same pivots as candidate renderers will use.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { actorSprites } from '../scene/rig.js';
import { sprite, type ArtPack, type Sprite } from '../scene/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packDir = path.join(root,'assets/lantern-v1');
const pack = JSON.parse(await readFile(path.join(packDir,'manifest.json'),'utf8')) as ArtPack;
const files = new Map<string,string>();
for (const asset of pack.assets) files.set(asset.id,'data:image/svg+xml;base64,'+(await readFile(path.join(packDir,asset.file))).toString('base64'));
const output = path.join(root,'out/art-q1');
await mkdir(output,{recursive:true});

function markup(items: Sprite[]): string {
  return [...items].sort((a,b)=>a.z-b.z).map(s=>{
    const asset=pack.assets.find(x=>x.id===s.asset);
    if (!asset) throw new Error(`ASSET_MISSING: ${s.asset}`);
    return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rotation}) scale(${s.scaleX} ${s.scaleY})"><image href="${files.get(s.asset)}" x="${-asset.pivot[0]}" y="${-asset.pivot[1]}" width="${asset.width}" height="${asset.height}" opacity="${s.opacity}" ${asset.category==='background'?'':'filter="url(#cut-shadow)"'}/></g>`;
  }).join('');
}
function svg(items: Sprite[],width=1920,height=1080,camera={x:960,y:540,zoom:1},background='#e8ddbe'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="cut-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="5" stdDeviation="3" flood-color="#19302e" flood-opacity=".2"/></filter></defs><rect width="100%" height="100%" fill="${background}"/><g transform="translate(${width/2} ${height/2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})">${markup(items)}</g></svg>`;
}
function background(): Sprite[] {
  return [sprite('sky','background/sky',960,540,-600),sprite('village','background/village',960,540,-400),sprite('workshop','background/workshop',960,540,-200),sprite('ground','background/ground',960,540,-10),sprite('tree-left','background/tree-left',30,500,50),sprite('tree-right','background/tree-right',1890,500,51,0,-1,1),sprite('grass','background/foreground-grass',800,1110,60)];
}
const mai=actorSprites(pack,{id:'mai',character:'mai',x:760,floor:860,facing:1,mood:'worried'}).sprites;
const an=actorSprites(pack,{id:'an',character:'an',x:1370,floor:860,facing:-1,mood:'happy',scale:.96}).sprites;
const table=sprite('bench','props/workbench',1100,860,-1);
const lantern=sprite('lamp','props/lantern-dark',1100,667,6,0,.65);
const scenes: Record<string,string>={
  'wide':svg([...background(),...mai,...an,table,lantern]),
  'close':svg([...background(),...mai,...an,table,lantern],1920,1080,{x:795,y:430,zoom:2.35}),
  'contact':svg([...background(),...actorSprites(pack,{id:'mai',character:'mai',x:760,floor:860,facing:1,rightWrist:[158,-277],rightHand:'grip',headAngle:9}).sprites,table,sprite('cup','props/cup',908,631,5.2,0,.7)],1920,1080,{x:940,y:620,zoom:1.55}),
};
const sheet: Sprite[]=[];
for(const [row,actor] of (['mai','an'] as const).entries()) for(const [column,view] of (['front','quarter','profile'] as const).entries())
  sheet.push(...actorSprites(pack,{id:`${actor}-${view}`,character:actor,x:320+column*640,floor:650+row*690,facing:1,view,mood:column===1?'happy':'neutral'}).sprites);
scenes['model-sheet']=svg(sheet,1920,1440,{x:960,y:720,zoom:1});

const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage();
  for(const [name,source] of Object.entries(scenes)) {
    await writeFile(path.join(output,`${name}.svg`),source);
    await page.setViewport({width:1920,height:name==='model-sheet'?1440:1080,deviceScaleFactor:1});
    await page.setContent(`<html><body style="margin:0">${source}</body></html>`);
    await page.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('image')).map(el=>{const img=new Image();img.src=el.getAttribute('href')!;return img.decode();}));});
    await page.screenshot({path:path.join(output,`${name}.png`)});
    console.log(`Styleframe ${name}`);
  }
  const textures=[];
  for(const asset of pack.assets) {
    const scale=asset.category==='background'?1.5:(asset.category==='foreground'?2:4);
    await page.setViewport({width:Math.ceil(asset.width*scale),height:Math.ceil(asset.height*scale),deviceScaleFactor:1});
    await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${files.get(asset.id)}" style="width:100vw;height:100vh;display:block"></body></html>`);
    await page.evaluate(async()=>{await document.querySelector('img')!.decode();});
    const file=path.join(output,'textures',asset.id+'.png');
    await mkdir(path.dirname(file),{recursive:true});
    const bytes=await page.screenshot({path:file,omitBackground:true});
    textures.push({id:asset.id,file:`textures/${asset.id}.png`,width:Math.ceil(asset.width*scale),height:Math.ceil(asset.height*scale),sha256:createHash('sha256').update(bytes).digest('hex'),sourceSha256:asset.sha256});
  }
  await writeFile(path.join(output,'textures.json'),JSON.stringify({pack:pack.version,browser:await browser.version(),textures},null,2)+'\n');
  console.log(JSON.stringify({styleframes:Object.keys(scenes),textures:textures.length,output}));
} finally {await browser.close();}
