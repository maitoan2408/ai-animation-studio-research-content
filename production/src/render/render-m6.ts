/**
 * Two actual native Three/Chromium 1080p24 encodes, one frozen M3 baseline and
 * one bounded M6 quality evaluation. Independent QA is a separate process.
 * The original M3 renderer is reused; no alternate screenshot/AI video path.
 */
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {root} from './server.js';

const output=process.env.M6_OUTPUT_DIR?
  path.resolve(process.env.M6_OUTPUT_DIR):path.join(root,'out/product-first/m6');
await mkdir(output,{recursive:true});
for(const mode of ['baseline','enhanced'] as const){
  const folder=path.join(output,mode);
  const command=path.join(root,'src/render/render-m3.ts');
  const child=spawn(process.execPath,['--import','tsx',command],{
    cwd:root,stdio:'inherit',env:{...process.env,M6_QUALITY_MODE:mode,
      M3_OUTPUT_DIR:folder,HYPERFRAMES_NO_TELEMETRY:'1'},
  });
  const [exit]=await once(child,'close');
  if(exit!==0)throw Error('M6_NATIVE_'+mode.toUpperCase()+'_RENDER_FAILED: '+exit);
}
console.log('M6_PAIRED_NATIVE_CAPTURE_COMPLETED '+JSON.stringify({output,
  note:'Technical media only; independent post-result audit is required.'}));
