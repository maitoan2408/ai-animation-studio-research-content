/** Bootstrap the pinned native texture cache for a fresh Studio install.
 * Missing cache is prepared using the existing rasterizer; corrupt/stale cache
 * fails closed instead of silently replacing evidence or accepting stale art.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const productionRoot=fileURLToPath(new URL('../../',import.meta.url));
const run=promisify(execFile);
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export async function ensureM3Textures(root=productionRoot,prepare=async()=>{
  await run(process.execPath,['--import','tsx',path.join(root,'src/art/preview.ts')],
    {cwd:root,timeout:120000,maxBuffer:2*1024*1024});
}) {
  const manifestPath=path.join(root,'out/art-q1/textures.json');
  let raw:Buffer;
  try {raw=await readFile(manifestPath);}
  catch(error){
    if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    await prepare();
    raw=await readFile(manifestPath);
  }
  const manifest=JSON.parse(raw.toString()) as {pack:string;textures:Array<{id:string;file:string;sha256:string;sourceSha256:string}>};
  const pack=JSON.parse(await readFile(path.join(root,'assets/lantern-v1/manifest.json'),'utf8')) as {
    version:string;assets:Array<{id:string;file:string;sha256:string}>
  };
  if(manifest.pack!==pack.version||manifest.textures.length!==pack.assets.length)
    throw Error('M3_TEXTURE_PACK_MISMATCH');
  for(const asset of pack.assets){
    const matches=manifest.textures.filter(t=>t.id===asset.id);
    if(matches.length!==1)throw Error('M3_TEXTURE_ID_MISMATCH: '+asset.id);
    const texture=matches[0]!;
    if(texture.file!=='textures/'+asset.id+'.png'||texture.sourceSha256!==asset.sha256||
       sha(await readFile(path.join(root,'assets/lantern-v1',asset.file)))!==asset.sha256||
       sha(await readFile(path.join(root,'out/art-q1',texture.file)))!==texture.sha256)
      throw Error('M3_TEXTURE_HASH_MISMATCH: '+asset.id);
  }
}
