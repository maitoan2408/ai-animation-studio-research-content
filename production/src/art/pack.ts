/** Load a versioned art pack directory: `manifest.json` (assets) plus
 * `rigs.json` (rig dimensions keyed by rig id). Node-only; the loaded pack is
 * plain data and is passed to browser code unchanged. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import type {ArtPack} from '../scene/types.js';

export async function loadArtPack(dir:string):Promise<ArtPack>{
 const pack=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')) as ArtPack;
 if(!pack||typeof pack.version!=='string'||!Array.isArray(pack.assets))throw Error('ART_PACK_INVALID '+dir);
 return pack;
}
