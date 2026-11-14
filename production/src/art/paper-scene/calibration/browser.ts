import * as THREE from 'three';
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setSize(400,200);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-200,200,100,-100,.1,100);camera.position.z=10;
scene.add(new THREE.AmbientLight(0xffffff,Math.PI));
for(const [i,color] of ['#dfa844','#e5b897','#385f59','#efe1b4'].entries()){
 for(const [x,material] of [[-100,new THREE.MeshBasicMaterial({color})],[100,new THREE.MeshLambertMaterial({color})]] as const){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(180,40),material);mesh.position.set(x,75-i*50,0);scene.add(mesh);
 }
}
renderer.render(scene,camera);renderer.getContext().finish();(window as any).calibrationReady=true;
