/** Isolated visual experiment; not the production renderer or a final art pipeline. */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { makePaperGeometry, type PaperAsset } from './geometry.js';
declare global { interface Window { spikeInput: {svg: string; asset: PaperAsset}; spikeResult: unknown; spikeError?: string; spikeReady?: boolean; } }
async function main() {
  const {svg, asset} = window.spikeInput;
  const parsed = new SVGLoader().parse(svg);
  const path = parsed.paths[0];
  if (!path || path.color.getHexString() !== 'd5a34b') throw Error('SPIKE_SILHOUETTE_UNEXPECTED');
  const shapes = path.toShapes();
  if (shapes.length !== 1) throw Error('SPIKE_SILHOUETTE_SHAPES');
  const rasterSvg = svg.replace('width="180" height="190"', 'width="720" height="760"');
  if (rasterSvg === svg) throw Error('SPIKE_VIEWBOX');
  const blob = URL.createObjectURL(new Blob([rasterSvg], {type:'image/svg+xml'}));
  const image = new Image(); image.src = blob;
  try { await image.decode(); } finally { URL.revokeObjectURL(blob); }
  if (image.naturalWidth !== 720 || image.naturalHeight !== 760) throw Error('SPIKE_TEXTURE_SIZE');
  const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d'); if (!context) throw Error('SPIKE_CANVAS');
  const pixels = context.createImageData(128,128); let seed = 731;
  for (let i=0;i<128*128;i++) { seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    const v=205+(seed%22); pixels.data.set([v,Math.round(v*.91),Math.round(v*.72),255],i*4); }
  context.putImageData(pixels,0,0);
  const paper = new THREE.CanvasTexture(canvas); paper.colorSpace=THREE.SRGBColorSpace;
  paper.wrapS=paper.wrapT=THREE.RepeatWrapping; paper.repeat.set(2,2);
  const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(1920,1080); renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.VSMShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor('#d9cfb5',1); document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-480,480,270,-270,1,2000);
  camera.position.set(0,0,900); camera.lookAt(0,0,0);
  scene.add(new THREE.AmbientLight(0xffffff,1.1));
  const light = new THREE.DirectionalLight(0xffffff,2); light.position.set(-250,300,500);
  light.castShadow=true; light.shadow.mapSize.set(2048,2048);
  Object.assign(light.shadow.camera,{left:-500,right:500,top:300,bottom:-300,near:1,far:1400});
  light.shadow.bias=-0.0004; light.shadow.radius=4; light.shadow.blurSamples=8; scene.add(light);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(960,540),new THREE.MeshStandardMaterial({color:'#eee5cf',roughness:1}));
  board.position.z=-55; board.receiveShadow=true; scene.add(board);
  for (const [x, volume] of [[-210,false],[210,true]] as const) {
    const group = new THREE.Group(); group.position.set(x,-157.5,0); group.rotation.y=-0.15; group.scale.setScalar(2.1);
    const geometry = makePaperGeometry(shapes[0]!, asset, 3);
    const front = new THREE.Mesh(geometry.face,new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:0.01,side:THREE.DoubleSide}));
    front.position.set(0,0,volume ? 3.05 : 0); group.add(front);
    if(volume) {
      const mesh = new THREE.Mesh(geometry.body,new THREE.MeshStandardMaterial({color:'#cbb58d',map:paper,roughness:1,side:THREE.DoubleSide}));
      mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh);
    } else geometry.body.dispose();
    scene.add(group);
  }
  await renderer.compileAsync(scene,camera); renderer.render(scene,camera); renderer.getContext().finish();
  window.spikeResult={three:THREE.REVISION,textureDimensions:[image.naturalWidth,image.naturalHeight],
    pathCount:parsed.paths.length,shapeCount:shapes.length, depth:3, pivot:asset.pivot,
    limitations:['One hand-selected torso silhouette only; no general SVG extrusion',
      'SVG face rasterized by Chromium to preserve its appearance; first path alone forms physical silhouette',
      'Flat reference has no cast shadow; not visual equivalence, final material, or approval',
      'No rig animation, silhouette validation for other assets, normal map or DOF']};
  window.spikeReady=true;
}
main().catch(e=>{window.spikeError=String(e);});
