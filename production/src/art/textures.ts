/** Rasterize an art pack's SVGs into PNG textures for the native renderer and
 * verify the cache before every use. Source SVGs are never modified. A missing
 * cache is prepared; a corrupt or stale cache fails closed instead of being
 * silently regenerated.
 *   npx tsx src/art/textures.ts assets/<pack>
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {loadArtPack} from './pack.js';

export type TextureEntry={id:string;file:string;width:number;height:number;sha256:string;sourceSha256:string};
export type TextureManifest={pack:string;browser?:string;textures:TextureEntry[]};
const productionRoot=fileURLToPath(new URL('../../',import.meta.url));
const sha=(bytes:Buffer|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export const browserPath=()=>process.env.FILM_BROWSER??'/usr/bin/chromium';
/** Cache location for one pack directory, outside version control. */
export const textureCacheDir=(packDir:string,root=productionRoot)=>
 path.join(root,'out/textures',path.basename(path.resolve(packDir)));

export async function rasterizeTextures(packDir:string,cacheDir:string):Promise<void>{
 const pack=await loadArtPack(packDir);
 const browser=await puppeteer.launch({executablePath:browserPath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const textures:TextureEntry[]=[];
  for(const asset of pack.assets){
   const source='data:image/svg+xml;base64,'+(await readFile(path.join(packDir,asset.file))).toString('base64');
   const scale=asset.category==='background'?1.5:(asset.category==='foreground'?2:4);
   const width=Math.ceil(asset.width*scale),height=Math.ceil(asset.height*scale);
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${source}" style="width:100vw;height:100vh;display:block"></body></html>`);
   await page.evaluate(async()=>{await document.querySelector('img')!.decode();});
   const file=path.join(cacheDir,'textures',asset.id+'.png');
   await mkdir(path.dirname(file),{recursive:true});
   const bytes=await page.screenshot({path:file,omitBackground:true});
   textures.push({id:asset.id,file:`textures/${asset.id}.png`,width,height,sha256:sha(bytes),sourceSha256:asset.sha256});
  }
  const manifest:TextureManifest={pack:pack.version,browser:await browser.version(),textures};
  await writeFile(path.join(cacheDir,'textures.json'),JSON.stringify(manifest,null,2)+'\n');
 }finally{await browser.close();}
}

/** Return the verified texture manifest for a pack, preparing it once if absent. */
export async function ensureTextures(packDir:string,cacheDir=textureCacheDir(packDir),
 prepare=()=>rasterizeTextures(packDir,cacheDir)):Promise<TextureManifest>{
 const manifestPath=path.join(cacheDir,'textures.json');
 let raw:Buffer;
 try{raw=await readFile(manifestPath);}
 catch(error){
  if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
  await prepare();
  raw=await readFile(manifestPath);
 }
 const manifest=JSON.parse(raw.toString()) as TextureManifest;
 const pack=await loadArtPack(packDir);
 if(manifest.pack!==pack.version||manifest.textures.length!==pack.assets.length)
  throw Error('TEXTURE_PACK_MISMATCH');
 for(const asset of pack.assets){
  const matches=manifest.textures.filter(t=>t.id===asset.id);
  if(matches.length!==1)throw Error('TEXTURE_ID_MISMATCH: '+asset.id);
  const texture=matches[0]!;
  if(texture.file!=='textures/'+asset.id+'.png'||texture.sourceSha256!==asset.sha256||
     sha(await readFile(path.join(packDir,asset.file)))!==asset.sha256||
     sha(await readFile(path.join(cacheDir,texture.file)))!==texture.sha256)
   throw Error('TEXTURE_HASH_MISMATCH: '+asset.id);
 }
 return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){
 const packDir=path.resolve(process.argv[2]??'');
 if(!process.argv[2])throw Error('USAGE: textures.ts <art-pack-dir>');
 const manifest=await ensureTextures(packDir);
 console.log(JSON.stringify({pack:manifest.pack,textures:manifest.textures.length,cache:textureCacheDir(packDir)}));
}
