import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const asset=await readFile(path.join(root,'assets/lantern-polish-1/mai/torso.svg'));
if(sha(asset)!=='01e5f8ec29d2258c56f9718bfe113a74826b018b3e177fa235a1c222330fd2e9') throw Error('SPIKE_ASSET_HASH');
const output=path.join(root,'out/paper-spike',randomUUID()); await mkdir(output,{recursive:true});
const bundle=await build({entryPoints:[path.join(root,'src/art/paper-spike/browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage(); await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
 const errors:string[]=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
 await page.evaluate(svg=>{(window as any).spikeInput={svg};},asset.toString());
 await page.addScriptTag({content:bundle.outputFiles[0]!.text});
 await page.waitForFunction('window.spikeReady || window.spikeError',{timeout:30000});
 const state=await page.evaluate(()=>({result:(window as any).spikeResult,error:(window as any).spikeError}));
 if(state.error||errors.length) throw Error(`SPIKE_BROWSER ${state.error} ${errors.join(' ')}`);
 const imagePath=path.join(output,'comparison.png'); await page.screenshot({path:imagePath});
 const image=await readFile(imagePath);
 const report={status:'PROVISIONAL_VISUAL_SPIKE',asset:'mai/torso',assetSha256:sha(asset),
  comparisonSha256:sha(image),browser:await browser.version(),...state.result,
  output,scope:'isolated Three experiment; left flat, right extruded with preserved SVG face'};
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {await browser.close();}
