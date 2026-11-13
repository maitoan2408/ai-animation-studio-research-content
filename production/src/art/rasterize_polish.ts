/** Raster only NEW derived assets, reuse Q1 textures by source SHA unchanged.
 * Manifest paths stay relative to out/art-q1 for both native Blender adapters. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import puppeteer from 'puppeteer-core';
import {root} from '../render/server.js';
import type {ArtPack} from '../scene/types.js';
const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-polish-1/manifest.json'),'utf8')) as ArtPack;
const before=JSON.parse(await readFile(path.join(root,'out/art-q1/textures.json'),'utf8'));
const output=path.join(root,'out/art-q2-polish');await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const textures=[];
try{
 const page=await browser.newPage();
 for(const a of pack.assets){
  const old=before.textures.find((t:{id:string;sourceSha256:string})=>t.id===a.id&&t.sourceSha256===a.sha256);
  if(old){textures.push(old);continue;}
  const bytes=await readFile(path.join(root,'assets/lantern-polish-1',a.file));
  if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('SOURCE_HASH '+a.id);
  const scale=4,width=Math.ceil(a.width*scale),height=Math.ceil(a.height*scale);
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${bytes.toString('base64')}" style="width:100vw;height:100vh"></body>`);
  await page.evaluate(async()=>{await document.querySelector('img')!.decode();});
  const file=path.join(output,'textures',a.id+'.png');await mkdir(path.dirname(file),{recursive:true});
  const png=await page.screenshot({path:file,omitBackground:true});
  textures.push({id:a.id,file:path.relative(path.join(root,'out/art-q1'),file),width,height,sourceSha256:a.sha256,sha256:createHash('sha256').update(png).digest('hex')});
 }
 await writeFile(path.join(output,'textures.json'),JSON.stringify({pack:pack.version,browser:await browser.version(),textures},null,2)+'\n');
 console.log(JSON.stringify({textures:textures.length,reused:before.textures.length,output}));
}finally{await browser.close();}
