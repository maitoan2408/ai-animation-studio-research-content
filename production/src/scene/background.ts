import {sprite,type SceneFrame,type Sprite} from './types.js';
export function background(camera:SceneFrame['camera']):Sprite[]{
  // Authored multiplane parallax with an orthographic lens. No free 3D orbit.
  return [sprite('sky','background/sky',960,540,-600),sprite('village','background/village',960,540,-400),
    sprite('workshop','background/workshop',960,540,-200),sprite('ground','background/ground',960,540,-10),
    sprite('tree-left','background/tree-left',30,500,50),sprite('tree-right','background/tree-right',1890,500,51,0,-1,1),
    sprite('grass','background/foreground-grass',800,1110,60)].map(s=>({...s,x:s.x-(camera.x-960)*s.z/2000}));
}
