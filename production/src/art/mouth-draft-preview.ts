/** Visual inventory of separate draft drawings; not a phoneme mapper. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../',import.meta.url));
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await readFile(path.join(root,'assets/lantern-polish-1/manifest.json'),'utf8'));
const draft=JSON.parse(await readFile(path.join(root,'assets/lantern-mouth-f2-draft/manifest.json'),'utf8'));
const names=['rest','M','A','E','O','F','U','L','teeth'];const files=[];
for(const name of names){
 const isDraft=['U','L','teeth'].includes(name),entry=(isDraft?draft.assets:old.assets).find((a:{id:string})=>a.id===`mouth/${name}`);
 if(!entry)throw Error(`MOUTH_MISSING ${name}`);
 const bytes=await readFile(path.join(root,isDraft?'assets/lantern-mouth-f2-draft':'assets/lantern-polish-1',entry.file));
 if(digest(bytes)!==entry.sha256)throw Error(`MOUTH_HASH ${name}`);
 files.push({name,sha256:entry.sha256,url:`data:image/svg+xml;base64,${bytes.toString('base64')}`,draft:isDraft});
}
const out=path.join(root,'out/mouth-drafts',randomUUID());await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
 const cells=files.map(f=>`<div class="cell"><div class="label">${f.name}${f.draft?' · draft':''}</div><img src="${f.url}"></div>`).join('');
 await page.setContent(`<!doctype html><style>body{margin:0;background:#f5dfb3;font:24px sans-serif;color:#294957}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:22px}.cell{height:310px;background:#fff4da;border:2px solid #ccb991;display:flex;flex-direction:column;align-items:center}.label{padding:15px}.cell img{width:360px;height:210px;image-rendering:auto}</style><div class="grid">${cells}</div>`);
 await page.evaluate(async()=>{await Promise.all(Array.from(document.images).map(i=>i.decode()));});
 const imagePath=path.join(out,'mouths.png');await page.screenshot({path:imagePath});
 const result={status:'PROVISIONAL_DRAWINGS_NOT_REVIEWED',output:out,imageSha256:digest(await readFile(imagePath)),
  browser:await browser.version(),items:files.map(({name,sha256,draft})=>({name,sha256,draft})),
  scope:'Eight draft/old mouth poses plus rest; no speech alignment, lip-sync accuracy or artistic approval.'};
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
