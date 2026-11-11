import type { ArtPack, Point, Sprite } from './types.js';
import { add, rotate } from './math.js';

/** Transform a native asset point through the actual sprite matrix. Tests use
 * this path on both sprites, rather than trusting a rig's claimed contact marker. */
export function assetPoint(pack: ArtPack, item: Sprite, point: Point): Point {
  const asset=pack.assets.find(x=>x.id===item.asset);
  if (!asset) throw new Error(`ASSET_MISSING: ${item.asset}`);
  return add([item.x,item.y],rotate([(point[0]-asset.pivot[0])*item.scaleX,(point[1]-asset.pivot[1])*item.scaleY],item.rotation));
}
export function anchorPoint(pack: ArtPack, item: Sprite, name: string): Point {
  const asset=pack.assets.find(x=>x.id===item.asset), point=asset?.anchors[name];
  if(!point) throw new Error(`ANCHOR_MISSING: ${item.asset}:${name}`);
  return assetPoint(pack,item,point);
}
