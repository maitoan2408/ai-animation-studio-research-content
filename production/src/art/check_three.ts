/** Q1 availability probe only. Q2 exercises the real seek/readiness adapter. */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'out/three-environment');
await mkdir(out,{recursive:true});
const code=await build({stdin:{contents:`
import * as THREE from 'three';
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(320,320); renderer.setClearColor(0,0); renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.15,1.15,1.15,-1.15,.1,10);
camera.position.z=4;
const texture=await new THREE.TextureLoader().loadAsync('/head.png'); texture.colorSpace=THREE.SRGBColorSpace;
const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,transparent:true}));
scene.add(mesh);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
window.result={three:THREE.REVISION,version:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
window.ready=true;
`,resolveDir:root,loader:'js'},bundle:true,write:false,format:'esm'});
const server=createServer(async(req,res)=>{
  try{
    if(req.url==='/head.png'){res.setHeader('content-type','image/png');res.end(await readFile(path.join(root,'out/art-q1/textures/mai/head-quarter-neutral.png')));}
    else if(req.url==='/app.js'){res.setHeader('content-type','text/javascript');res.end(code.outputFiles[0]!.contents);}
    else res.end('<html><body style="margin:0;background:transparent"><script type="module" src="/app.js"></script></body></html>');
  }catch(e){res.statusCode=500;res.end(String(e));}
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();if(!address||typeof address==='string')throw Error('NO_PORT');
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();await page.setViewport({width:320,height:320,deviceScaleFactor:1});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.waitForFunction('window.ready===true',{timeout:30000});
  if(errors.length)throw Error(errors.join('\n'));
  await page.screenshot({path:path.join(out,'transparent.png'),omitBackground:true});
  for(const color of ['white','black']){
    await page.evaluate(c=>{document.body.style.background=c;},color);
    await page.screenshot({path:path.join(out,`${color}.png`)});
  }
  const report={...(await page.evaluate('window.result') as object),browser:await browser.version(),scope:'Single real art texture, alpha + WebGL availability; no motion/readiness claim'};
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();server.close();}
