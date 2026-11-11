import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const id = process.argv[2] || 'Study';
const workers = Number(process.argv[3] || 1);
const name = `remotion-${id.toLowerCase()}-w${workers}`;
const started = performance.now();
await mkdir(`${root}/out`, {recursive:true});
const serveUrl = await bundle({entryPoint:`${root}/fixtures/Study.tsx`, publicDir:`${root}/fixtures/public`, outDir:`${root}/bundle`});
const bundleSeconds = (performance.now()-started)/1000;
const browser = await openBrowser('chrome', {browserExecutable:'/usr/bin/chromium', chromiumOptions:{gl:'swangle'}});
try {
 const composition = await selectComposition({serveUrl,id, puppeteerInstance:browser});
 const before = performance.now();
 await renderMedia({composition,serveUrl,codec:'h264',crf:18,pixelFormat:'yuv420p',audioCodec:'aac',
   outputLocation:`${root}/out/${name}.mp4`,concurrency:workers,puppeteerInstance:browser});
 const result={id,workers,composition,bundleSeconds,renderSeconds:(performance.now()-before)/1000,totalSeconds:(performance.now()-started)/1000};
 if(id==='Study') {
   const frames=[0,23,24,47,48,71,72,95,96,119,120,239];
   for(const f of frames) await renderStill({composition,serveUrl,frame:f,imageFormat:'png',output:`${root}/out/remotion-${f}.png`,puppeteerInstance:browser});
 }
 await writeFile(`${root}/evidence/${name}-metrics.json`,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally {await browser.close({silent:true});}
