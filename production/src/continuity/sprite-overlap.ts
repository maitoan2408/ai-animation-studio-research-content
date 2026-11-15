/** Conservative SVG canvas bounds only: overlap signals review, not penetration. */
import { assetPoint } from '../scene/geometry.js';
import type { ArtPack, Point, Sprite } from '../scene/types.js';
type Result = {status:'BOUNDS_DISJOINT'|'BOUNDS_OVERLAP'; scope:string};
export function inspectSpriteBounds(pack:ArtPack, a:Sprite, b:Sprite):Result {
  const corners = (sprite:Sprite): Point[] => {
    const matches = pack.assets.filter(item => item.id === sprite.asset);
    if (matches.length !== 1) throw Error(`OVERLAP_ASSET ${sprite.asset}`);
    const asset = matches[0]!;
    if (![asset.width,asset.height,sprite.x,sprite.y,sprite.rotation,sprite.scaleX,sprite.scaleY].every(v => Number.isFinite(v) && Math.abs(v) <= 1e9) ||
        asset.width <= 0 || asset.height <= 0 || sprite.scaleX === 0 || sprite.scaleY === 0)
      throw Error('OVERLAP_TRANSFORM');
    return ([[0,0],[asset.width,0],[asset.width,asset.height],[0,asset.height]] as Point[])
      .map(p => assetPoint(pack,sprite,p));
  };
  const x = corners(a), y = corners(b);
  for (const polygon of [x,y]) for (let i=0;i<4;i++) {
    const p = polygon[i]!, q = polygon[(i+1)%4]!;
    const axis:Point = [-(q[1]-p[1]), q[0]-p[0]];
    const px = x.map(([u,v]) => u*axis[0]+v*axis[1]);
    const py = y.map(([u,v]) => u*axis[0]+v*axis[1]);
    if (Math.max(...px) <= Math.min(...py) || Math.max(...py) <= Math.min(...px))
      return {status:'BOUNDS_DISJOINT',scope:'SVG canvas rectangles; effects and physical depth are not modeled'};
  }
  return {status:'BOUNDS_OVERLAP',scope:'Conservative SVG canvas overlap; transparency and intended layering can cause false positives'};
}
