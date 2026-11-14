/** Isolated development rasterization; reuses exact R3 textures by verified SHA. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
const overlay=path.resolve(process.argv[2]??'');const baseManifest=path.resolve(process.argv[3]??'');
if(!process.argv[2]||!process.argv[3])throw Error('OVERLAY_TEXTURE_ARGUMENTS');
const manifestBytes=await readFile(path.join(overlay,'manifest.json'));
if(sha(manifestBytes)!=='0db84d9fed8b8a35ccea5c328760ec2f519054475fae6f5a70d1b7925a4d67d2')throw Error('OVERLAY_TEXTURE_MANIFEST_HASH');
const pack=JSON.parse(manifestBytes.toString());
const base=JSON.parse(await readFile(baseManifest,'utf8'));
if(!Array.isArray(pack.assets)||!Array.isArray(base.textures)||new Set(pack.assets.map((a:{id:string})=>a.id)).size!==pack.assets.length)throw Error('ALL_TEXTURE_MANIFEST');
const existing=new Map<string,any>(base.textures.map((t:{id:string})=>[t.id,t]));
const output=path.join(root,'out/paper-overlay-textures',randomUUID());await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),textures=[];let reused=0,generated=0;
 for(const asset of pack.assets){
  const file=path.resolve(overlay,asset.file);
  if(!file.startsWith(overlay+path.sep))throw Error('ALL_TEXTURE_PATH');
  const svg=await readFile(file);if(sha(svg)!==asset.sha256)throw Error(`ALL_TEXTURE_SOURCE_HASH ${asset.id}`);
  const old=existing.get(asset.id);
  if(old){
   if(old.sourceSha256!==asset.sha256)throw Error(`ALL_TEXTURE_SOURCE_MISMATCH ${asset.id}`);
   const png=await readFile(path.resolve(root,'out/art-q1',old.file));if(sha(png)!==old.sha256)throw Error(`ALL_TEXTURE_HASH ${asset.id}`);
   textures.push(old);reused++;continue;
  }
  const width=Math.ceil(asset.width*4),height=Math.ceil(asset.height*4);
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||width>4096||height>4096)throw Error(`ALL_TEXTURE_DIMENSIONS ${asset.id}`);
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${svg.toString('base64')}" style="width:100vw;height:100vh;display:block"></body>`);
  await page.evaluate(async()=>{const img=document.querySelector('img');if(!img)throw Error('ALL_TEXTURE_IMAGE');await img.decode();});
  const png=await page.screenshot({omitBackground:true}),digest=sha(png),target=path.join(output,`${digest}.png`);
  try{await writeFile(target,png,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||sha(await readFile(target))!==digest)throw e;}
  textures.push({id:asset.id,file:path.relative(path.join(root,'out/art-q1'),target),width,height,sourceSha256:asset.sha256,sha256:digest});generated++;
 }
 const result={pack:pack.version,browser:await browser.version(),source:'117 verified development textures reused; draft overlay assets newly rasterized for development',textures};
 await writeFile(path.join(output,'textures.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'PARTIAL_DEVELOPMENT_RASTERS',output,textures:textures.length,reused,generated,manifestSha256:sha(Buffer.from(JSON.stringify(result,null,2)+'\n'))}));
}finally{await browser.close();}
