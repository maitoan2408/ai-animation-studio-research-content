import {createRenderJob,executeRenderJob} from '@hyperframes/producer';
import {drainBrowserPool} from '@hyperframes/engine';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const fixture = process.argv[2] || 'study';
const workers = Number(process.argv[3] || 1);
const strictness = process.argv[4] || 'strict';
const name=`hyperframes-${fixture}-w${workers}-${strictness}`;
process.env.HYPERFRAMES_BROWSER_PATH='/usr/bin/chromium';
process.env.HYPERFRAMES_CACHE_DIR='/tmp/studio-hyperframes-cache';
process.env.HYPERFRAMES_NO_TELEMETRY='1';
process.env.PRODUCER_BROWSER_GPU='false';
const job=createRenderJob({fps:24,quality:'standard',format:'mp4',workers,crf:18,strictness,maxRenderMs:180000});
await mkdir(`${root}/out`,{recursive:true});
const before=performance.now();
try {
 await executeRenderJob(job,`${root}/fixtures/hyperframes-${fixture}`,`${root}/out/${name}.mp4`);
} finally {
 await writeFile(`${root}/evidence/${name}-metrics.json`,JSON.stringify({elapsedSeconds:(performance.now()-before)/1000,job},null,2)+'\n');
 await drainBrowserPool();
}
console.log(JSON.stringify({status:job.status,outcome:job.outcome,warnings:job.warnings}));
