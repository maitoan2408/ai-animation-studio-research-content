/** Reject missing cutout contours; backgrounds/shadows remain explicit flat plates. */
export function requireForegroundContour(asset:string,hasContour:boolean):void {
 if(!asset||typeof asset!=='string')throw Error('SCENE_ASSET_ID');
 const foreground=['mai/','an/','mouth/','props/'].some(prefix=>asset.startsWith(prefix));
 if(foreground&&!hasContour)throw Error(`SCENE_CONTOUR_REQUIRED ${asset}`);
}
