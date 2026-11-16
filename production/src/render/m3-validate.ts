/** Local, data-only M3 validation bridge used by the root Studio UI.
 * No user-provided source code is executed and no project path is accepted.
 * JSON input arrives through stdin; the art-pack SHA is always local/pinned.
 */
import {readFile} from 'node:fs/promises';
import {validateM3,m3TotalFrames} from '../motion/character-library.js';
import type {ArtPack} from '../scene/types.js';
const pack=JSON.parse(await readFile(new URL('../../assets/lantern-v1/manifest.json',import.meta.url),'utf8')) as ArtPack;
const chunks:Buffer[]=[];
let bytes=0;
for await(const part of process.stdin){
  const buf=Buffer.isBuffer(part)?part:Buffer.from(part);
  bytes+=buf.length;
  if(bytes>120000)throw Error('M3_PAYLOAD_TOO_LARGE');
  chunks.push(buf);
}
const project=validateM3(JSON.parse(Buffer.concat(chunks).toString('utf8')),pack);
process.stdout.write(JSON.stringify({ok:true,project,frames:m3TotalFrames(project),artPack:pack.version})+'\n');
