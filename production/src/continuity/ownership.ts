import type {PerformanceScript} from '../motion/performance.js';
type Interval={start:number;end:number;owner:string};
export function validateOwnership(raw:unknown,script:PerformanceScript) {
 if(!raw || typeof raw!=='object' || Array.isArray(raw))throw Error('OWNERSHIP_SCHEMA');
 const x=raw as {schemaVersion?:unknown;shot?:unknown;prop?:unknown;fps?:unknown;frames?:unknown;intervals?:unknown;status?:unknown;rationale?:unknown};
 if(x.schemaVersion!==1||x.shot!==script.shot||typeof x.prop!=='string'||!script.props.includes(x.prop)||
 x.fps!==script.fps||x.frames!==script.frames||x.status!=='PROVISIONAL_DEVELOPMENT'||
 typeof x.rationale!=='string'||x.rationale.trim().length<10||!Array.isArray(x.intervals)||!x.intervals.length)
  throw Error('OWNERSHIP_SCHEMA');
 const intervals:Interval[]=[];let previous=0;
 for(const rawInterval of x.intervals){
  if(!rawInterval||typeof rawInterval!=='object'||Array.isArray(rawInterval))throw Error('OWNERSHIP_INTERVAL');
  const item=rawInterval as Partial<Interval>;
  if(!Number.isInteger(item.start)||!Number.isInteger(item.end)||item.start!==previous||
    (item.end as number)<=(item.start as number)||(item.end as number)>script.frames||typeof item.owner!=='string')
    throw Error('OWNERSHIP_INTERVAL');
  const matches=script.contacts.filter(c=>`${c.actor}.${c.control}`===item.owner && c.target.startsWith(`${x.prop}.`) && c.start<=item.start! && c.end>=item.end!);
  if(matches.length!==1) throw Error('OWNERSHIP_CONTACT_MISSING');
  intervals.push({start:item.start!,end:item.end!,owner:item.owner});previous=item.end!;
 }
 if(previous!==script.frames)throw Error('OWNERSHIP_COVERAGE');
 return Object.freeze(intervals.map(i=>Object.freeze(i)));
}
export function ownerAt(intervals:readonly Interval[],frame:number):string {
 if(!Number.isSafeInteger(frame)||frame<0)throw Error('OWNERSHIP_FRAME');
 const item=intervals.find(i=>i.start<=frame&&frame<i.end);if(!item)throw Error('OWNERSHIP_FRAME');
 return item.owner;
}
