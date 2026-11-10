import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const frames=[0,23,24,47,48,71,72,95,96,119,120,239];
const orders=[frames,[...frames].reverse(),[72,0,239,24,96,23,120,48,119,47,95,71],frames];
const create=()=>openBrowser('chrome',{browserExecutable:'/usr/bin/chromium',chromiumOptions:{gl:'swangle'}});
let browser=await create();
const serveUrl=`${root}/bundle`;
const composition=await selectComposition({serveUrl,id:'Study',puppeteerInstance:browser});
const baseline={};const results=[];
try{
 for(let pass=0;pass<orders.length;pass++){
  if(pass===3){await browser.close({silent:true});browser=await create();}
  for(const f of orders[pass]){
   const {buffer}=await renderStill({composition,serveUrl,frame:f,imageFormat:'png',puppeteerInstance:browser});
   const hash=createHash('sha256').update(buffer).digest('hex');
   if(pass===0)baseline[f]=hash;
   results.push({pass,frame:f,hash,matchesBaseline:hash===baseline[f]});
  }
 }
}finally{await browser.close({silent:true});}
await writeFile(`${root}/evidence/remotion-seek.json`,JSON.stringify({orders,results,scope:'renderStill creates a page per call; shared browser then fresh browser, not a persistent Player scrub test'},null,2)+'\n');
console.log(JSON.stringify({samples:results.length,failures:results.filter(x=>!x.matchesBaseline)}));
if(results.some(x=>!x.matchesBaseline))process.exitCode=1;
