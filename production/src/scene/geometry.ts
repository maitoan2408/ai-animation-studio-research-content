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

export function spriteBounds(pack:ArtPack,item:Sprite){
 const art=pack.assets.find(x=>x.id===item.asset);
 if(!art)throw Error('SPRITE_BOUNDS_ASSET_MISSING '+item.asset);
 const corners:Point[]=[[0,0],[art.width,0],[art.width,art.height],[0,art.height]];
 const places=corners.map(p=>assetPoint(pack,item,p));
 return {left:Math.min(...places.map(p=>p[0])),right:Math.max(...places.map(p=>p[0])),
  top:Math.min(...places.map(p=>p[1])),bottom:Math.max(...places.map(p=>p[1]))};
}
export function spriteBoundsGap(a:ReturnType<typeof spriteBounds>,b:ReturnType<typeof spriteBounds>){
 return Math.hypot(Math.max(0,b.left-a.right,a.left-b.right),
   Math.max(0,b.top-a.bottom,a.top-b.bottom));
}
/** Inverse of assetPoint: world point -> native asset coordinates of `item`. */
export function toAssetPoint(pack:ArtPack,item:Sprite,world:Point):Point{
 const art=pack.assets.find(x=>x.id===item.asset);
 if(!art)throw Error('ASSET_MISSING: '+item.asset);
 const local=rotate([world[0]-item.x,world[1]-item.y],-item.rotation);
 return [local[0]/item.scaleX+art.pivot[0],local[1]/item.scaleY+art.pivot[1]];
}
/** Fraction (0..1) of `a`'s own oriented art rectangle that lies inside `b`'s
 * oriented art rectangle, sampled on an n x n grid. Unlike axis-aligned
 * boxes this follows rotated limbs, so a hand hanging beside a slanted thigh
 * is not counted as lying on it. Still a rectangle proxy, not pixel alpha. */
export function orientedCoverage(pack:ArtPack,a:Sprite,b:Sprite,n=9):number{
 const artA=pack.assets.find(x=>x.id===a.asset),artB=pack.assets.find(x=>x.id===b.asset);
 if(!artA||!artB)throw Error('ASSET_MISSING: '+(!artA?a.asset:b.asset));
 let inside=0;
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){
  const p=assetPoint(pack,a,[artA.width*(i+.5)/n,artA.height*(j+.5)/n]);
  const q=toAssetPoint(pack,b,p);
  if(q[0]>=0&&q[0]<=artB.width&&q[1]>=0&&q[1]<=artB.height)inside++;
 }
 return inside/(n*n);
}
