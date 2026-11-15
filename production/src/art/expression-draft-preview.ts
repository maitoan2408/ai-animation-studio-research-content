/** Quarter-view comparison of old and provisional independent head drawings. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await readFile(path.join(root,'assets/lantern-polish-1/manifest.json'),'utf8'));
const draft=JSON.parse(await readFile(path.join(root,'assets/lantern-expression-f2-draft-2/manifest.json'),'utf8'));
const cells=[];
for(const actor of ['mai','an'])for(const mood of ['neutral','worried','happy','sad','surprised','angry']){
 const isDraft=['sad','surprised','angry'].includes(mood),id=`${actor}/head-quarter-${mood}`;
 const entry=(isDraft?draft.assets:old.assets).find((a:{id:string})=>a.id===id);if(!entry)throw Error(`EXPRESSION_MISSING ${id}`);
 const bytes=await readFile(path.join(root,isDraft?'assets/lantern-expression-f2-draft-2':'assets/lantern-polish-1',entry.file));
 if(sha(bytes)!==entry.sha256)throw Error(`EXPRESSION_HASH ${id}`);
 cells.push({id,sha256:entry.sha256,draft:isDraft,url:`data:image/svg+xml;base64,${bytes.toString('base64')}`});
}
const out=path.join(root,'out/expression-drafts',randomUUID());await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
 const html=cells.map(c=>`<div class="cell"><div>${c.id}${c.draft?' · draft':''}</div><img src="${c.url}"></div>`).join('');
 await page.setContent(`<!doctype html><style>body{margin:0;background:#f5dfb3;font:18px sans-serif;color:#294957}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;padding:18px}.cell{height:500px;background:#fff4da;border:2px solid #ccb991;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}.cell img{width:250px;height:250px}</style><div class="grid">${html}</div>`);
 await page.evaluate(async()=>{await Promise.all(Array.from(document.images).map(i=>i.decode()));});
 const png=path.join(out,'expressions.png');await page.screenshot({path:png});
 const result={status:'PROVISIONAL_DRAWINGS_NOT_REVIEWED',output:out,imageSha256:sha(await readFile(png)),browser:await browser.version(),
  items:cells.map(({id,sha256,draft})=>({id,sha256,draft})),
  scope:'Head drawings only, without mouth overlays; no acting or artistic approval.'};
 await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
