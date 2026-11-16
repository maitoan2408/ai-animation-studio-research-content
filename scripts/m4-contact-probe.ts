import {rapier} from '../production/src/physics/engines.js';
import {bakeM4} from '../production/src/physics/m4.js';
import {m4Fixture,m4Pack} from '../production/tests/m4-fixture.js';
const r=await rapier(),original=r.World.prototype.step;
let steps=0,first=-1;
r.World.prototype.step=function(...args){
 const result=original.apply(this,args);steps++;
 const colliders:any[]=[];this.forEachCollider(c=>colliders.push(c));
 if(first<0&&colliders.length===2)this.contactPair(colliders[0],colliders[1],m=>{
  for(let j=0;j<m.numContacts();j++)if(m.contactImpulse(j)>0)first=steps;
 });
 return result;
};
try{
 for(const speed of [-30,-70,-150,-300,-500])for(const restitution of [.2,.6,1]){
  const p=m4Fixture(96);p.prop.velocityStagePxPerSecond=[0,speed];p.prop.angularVelocityDegPerSecond=0;
  p.prop.restitution=restitution;p.prop.friction=0;p.gravityMps2=30;
  steps=0;first=-1;
  const b=await bakeM4(p,m4Pack);
  const recorded=b.events.find(e=>e.kind==='platform-contact')?.frame;
  const expected=first<0?undefined:b.releaseFrame+Math.ceil(first/10);
  console.log(JSON.stringify({speed,restitution,firstStep:first,expected,recorded,match:expected===recorded}));
 }
}finally{r.World.prototype.step=original;}
