/** Captures matched synthetic shadow-off/on states. */
import {build} from 'esbuild';import {mkdir} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import puppeteer from 'puppeteer-core';
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(process.argv[2]??'production/out/f2-shadow-calibration');
const shape=process.argv[3]==='shape';if(process.argv[3]&&!shape)throw Error('SHADOW_FIXTURE_MODE');await mkdir(out,{recursive:true});
const code=await build({entryPoints:[path.join(here,shape?'shadow-shape-browser.ts':'shadow-browser.ts')],bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.setViewport({width:400,height:200,deviceScaleFactor:1});await page.setContent('<!doctype html><body style="margin:0"></body>');await page.addScriptTag({content:code.outputFiles[0]!.text});
 await page.waitForFunction('window.fixtureReady',{timeout:60000});
 for(const enabled of [false,true]){await page.evaluate(v=>(window as any).renderShadow(v),enabled);await page.screenshot({path:path.join(out,enabled?'shadow-on.png':'shadow-off.png')});}
 if(errors.length)throw Error('SHADOW_FIXTURE_BROWSER '+errors.join(' '));console.log(JSON.stringify({out,browser:await browser.version(),scope:'Synthetic two-plane receiver, not S05 or approved art'}));
}finally{await browser.close();}
