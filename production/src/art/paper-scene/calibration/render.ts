/** Isolated light-albedo calibration; not an S05 render or art approval. */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const here=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(process.argv[2]??'production/out/f2-light-calibration');await mkdir(out,{recursive:true});
const code=await build({entryPoints:[path.join(here,'browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:400,height:200,deviceScaleFactor:1});await page.setContent('<!doctype html><body style="margin:0"></body>');
 await page.addScriptTag({content:code.outputFiles[0]!.text});await page.waitForFunction('window.calibrationReady',{timeout:60000});if(errors.length)throw Error('CALIBRATION_BROWSER '+errors.join(' '));
 const file=path.join(out,'calibration.png');await page.screenshot({path:file});const bytes=await readFile(file);
 console.log(JSON.stringify({file,sha256:createHash('sha256').update(bytes).digest('hex'),scope:'Flat opaque swatches; no textures, shadow, F2 art or perceptual gate',browser:await browser.version()}));
}finally{await browser.close();}
