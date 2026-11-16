/** M4 product adapter: M3 authored animation + validated immutable M4 replay.
 * No live physics runs during render, seek, UI preview or export.
 */
import {sampleM3,m3TotalFrames} from '../motion/character-library.js';
import {anchorPoint} from '../scene/geometry.js';
import type {ArtPack,SceneFrame,Sprite} from '../scene/types.js';
import type {PhysicsBake,PhysicsProject,PhysicsFrame} from './m4.js';
export type M4RenderData={project:PhysicsProject;bake:PhysicsBake;enabled:boolean};
function transform(pack:ArtPack,sprite:Sprite,frame:PhysicsFrame):Sprite{
 const art=pack.assets.find(a=>a.id===sprite.asset);
 if(!art)throw Error('M4_RENDER_ART_NOT_FOUND');
 const dx=(art.width/2-art.pivot[0])*sprite.scaleX;
 const dy=(art.height/2-art.pivot[1])*sprite.scaleY;
 const a=frame.rotationDeg*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
 return {...sprite,
   x:frame.centerX-(dx*c-dy*sn),
   y:frame.centerY-(dx*sn+dy*c),rotation:frame.rotationDeg};
}
export function sampleM4Scene(data:M4RenderData,frame:number,pack:ArtPack):SceneFrame{
 if(!Number.isSafeInteger(frame)||frame<0||frame>=data.bake.frames.length)
   throw RangeError('M4_RENDER_FRAME_RANGE');
 const motion=data.project.motion;
 const scene=sampleM3(motion,Math.min(frame,m3TotalFrames(motion)-1),pack).frame;
 if(!data.enabled||frame<data.bake.releaseFrame)return scene;
 const target=data.bake.frames[frame]!;
 if(target.owner!=='physics'||target.frame!==frame)throw Error('M4_REPLAY_OWNERSHIP');
 const id=data.project.prop.id;
 const source=scene.sprites.find(s=>s.id===id);
 if(!source)throw Error('M4_RENDER_PROP_MISSING');
 const updated=transform(pack,source,target);
 const sprites=scene.sprites.map(s=>s.id===id?updated:s);
 const grip=anchorPoint(pack,updated,'grip');
 const markers=scene.markers.map(m=>m.id===id+'.grip'?{...m,point:grip}:m);
 return {...scene,sprites,markers};
}
