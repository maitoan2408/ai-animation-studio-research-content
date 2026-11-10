import {z} from 'zod';
import {createHash, randomUUID} from 'node:crypto';

export class StudioError extends Error {
  constructor(public code:string, message:string, public status=400) {super(message);this.name='StudioError';}
}
export const idSchema=z.string().regex(/^[a-z]+_[a-f0-9-]{36}$/);
export const hashSchema=z.string().regex(/^[a-f0-9]{64}$/);
export const styleSchema=z.enum(['paper-cut','multiplane','shadow-box']);
export const actionSchema=z.enum(['idle','wave','walk','pick-up','talk']);
export const profileSchema=z.enum(['preview','final']);
export type Profile=z.infer<typeof profileSchema>;
export const profiles={preview:{width:640,height:360},final:{width:1920,height:1080}} as const;
export const audioBindingSchema=z.object({assetId:hashSchema,textHash:hashSchema.optional(),gain:z.number().min(0).max(2).default(1)}).strict();
export const sceneSchema=z.object({
  id:z.string().regex(/^s\d{3}$/),title:z.string().min(1).max(100),
  narration:z.string().max(1200),durationFrames:z.number().int().min(24).max(2880),
  action:actionSchema,camera:z.enum(['static','pan']),
  color:z.string().regex(/^#[0-9a-fA-F]{6}$/),audio:audioBindingSchema.optional(),
}).strict();
export const projectSpecSchema=z.object({
  schemaVersion:z.literal('1.0'),title:z.string().min(1).max(100),style:styleSchema,
  fps:z.literal(24),language:z.enum(['vi','en']),scenes:z.array(sceneSchema).min(1).max(12),
}).strict().superRefine((s,c)=>{
  if(new Set(s.scenes.map(x=>x.id)).size!==s.scenes.length)c.addIssue({code:'custom',message:'Scene IDs must be unique'});
  if(s.scenes.reduce((n,x)=>n+x.durationFrames,0)>5760)c.addIssue({code:'custom',message:'Project exceeds the 240 second MVP limit'});
  for(const x of s.scenes)if(x.audio?.textHash&&x.audio.textHash!==hash(x.narration))c.addIssue({code:'custom',message:`${x.id}: narration changed; regenerate or detach its voice`});
});
export type Scene=z.infer<typeof sceneSchema>;
export type ProjectSpec=z.infer<typeof projectSpecSchema>;
export type Revision={id:string;projectId:string;createdAt:string;spec:ProjectSpec;digest:string;notes:string[]};
export type Project={id:string;createdAt:string;updatedAt:string;title:string;currentRevisionId:string;revisionIds:string[]};
export type Asset={id:string;kind:'audio';extension:'wav';bytes:number;duration:number;sampleRate:number;source:'upload'|'local-voice';createdAt:string};
export type Attempt={id:string;startedAt:string;finishedAt?:string;error?:{code:string;message:string}};
export type Job={id:string;projectId:string;revisionId:string;profile:Profile;cacheKey:string;status:'queued'|'running'|'succeeded'|'failed'|'cancelled'|'interrupted';progress:number;stage:string;attempts:Attempt[];artifactId?:string;createdAt:string;updatedAt:string;error?:{code:string;message:string};cacheHit?:boolean};
export type QC={frames:number;expectedFrames:number;fps:string;width:number;height:number;duration:number;hasAudio:boolean;audioDuration?:number;audioSampleRate?:number};
export type Artifact={id:string;projectId:string;revisionId:string;jobId:string;profile:Profile;cacheKey:string;sha256:string;bytes:number;createdAt:string;qc:QC};
export type Review={id:string;projectId:string;revisionId:string;artifactId:string;artifactHash:string;reviewer:string;decision:'approved'|'changes_requested';notes:string;frame?:number;createdAt:string};
export function hash(value:string|Buffer):string{return createHash('sha256').update(value).digest('hex');}
export function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
export const uid=(prefix:string)=>`${prefix}_${randomUUID()}`;
export const now=()=>new Date().toISOString();
export const totalFrames=(spec:ProjectSpec)=>spec.scenes.reduce((n,s)=>n+s.durationFrames,0);
export function parseSpec(input:unknown):ProjectSpec {
  const result=projectSpecSchema.safeParse(input);
  if(!result.success)throw new StudioError('INVALID_PROJECT',result.error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; '));
  return result.data;
}
export function errorInfo(error:unknown):{code:string;message:string}{
  return error instanceof StudioError?{code:error.code,message:error.message}:{code:'INTERNAL_ERROR',message:error instanceof Error?error.message:String(error)};
}
