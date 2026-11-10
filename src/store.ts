import {mkdir,readFile,writeFile,rename,readdir,stat,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {StudioError,idSchema,hashSchema,hash,canonical,uid,now,parseSpec,type Project,type Revision,type Asset,type Job,type Artifact,type Review} from './domain.js';

type Collection='projects'|'revisions'|'assets'|'jobs'|'artifacts'|'reviews';
export class Store {
  readonly root:string;
  private tail:Promise<unknown>=Promise.resolve();
  constructor(root:string){this.root=path.resolve(root);}
  async init(){await Promise.all(['projects','revisions','assets','jobs','artifacts','reviews','media','tmp'].map(x=>mkdir(path.join(this.root,x),{recursive:true})));}
  async transaction<T>(fn:()=>Promise<T>):Promise<T>{const next=this.tail.then(fn,fn);this.tail=next.catch(()=>{});return next;}
  file(collection:Collection,id:string):string {
    const valid=collection==='assets'?hashSchema.safeParse(id):idSchema.safeParse(id);
    if(!valid.success)throw new StudioError('INVALID_ID','ID không hợp lệ.');
    return path.join(this.root,collection,id+'.json');
  }
  async put(collection:Collection,id:string,data:unknown):Promise<void>{
    const target=this.file(collection,id),temp=target+'.'+randomUUID()+'.tmp';
    await writeFile(temp,JSON.stringify(data,null,2)+'\n',{mode:0o600});
    await rename(temp,target);
  }
  async get<T>(collection:Collection,id:string):Promise<T>{
    try{return JSON.parse(await readFile(this.file(collection,id),'utf8')) as T;}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')throw new StudioError('NOT_FOUND',`${collection}/${id} không tồn tại.`,404);throw e;}
  }
  async list<T>(collection:Collection):Promise<T[]>{
    const names=(await readdir(path.join(this.root,collection))).filter(x=>x.endsWith('.json'));
    return Promise.all(names.map(x=>this.get<T>(collection,x.slice(0,-5))));
  }
  async create(specInput:unknown,notes:string[]=[]):Promise<Project>{
    const spec=parseSpec(specInput),time=now(),projectId=uid('prj');
    const rev:Revision={id:uid('rev'),projectId,createdAt:time,spec,digest:hash(canonical(spec)),notes};
    const project:Project={id:projectId,createdAt:time,updatedAt:time,title:spec.title,currentRevisionId:rev.id,revisionIds:[rev.id]};
    await this.put('revisions',rev.id,rev);await this.put('projects',project.id,project);return project;
  }
  async revise(projectId:string,expected:string,input:unknown,notes:string[]=[]):Promise<Revision>{
    const spec=parseSpec(input);
    return this.transaction(async()=>{
      const project=await this.get<Project>('projects',projectId);
      if(project.currentRevisionId!==expected)throw new StudioError('REVISION_CONFLICT','Dự án đã thay đổi. Tải lại trước khi lưu.',409);
      const rev:Revision={id:uid('rev'),projectId,createdAt:now(),spec,digest:hash(canonical(spec)),notes};
      await this.put('revisions',rev.id,rev);
      await this.put('projects',projectId,{...project,title:spec.title,currentRevisionId:rev.id,revisionIds:[...project.revisionIds,rev.id],updatedAt:now()});return rev;
    });
  }
  assetFile(id:string){if(!hashSchema.safeParse(id).success)throw new StudioError('INVALID_ASSET_ID','Asset hash không hợp lệ.');return path.join(this.root,'media',id+'.wav');}
  artifactFile(id:string){this.file('artifacts',id);return path.join(this.root,'media',id+'.mp4');}
  async verifyAsset(id:string):Promise<Asset>{
    const asset=await this.get<Asset>('assets',id);
    let bytes:Buffer;try{bytes=await readFile(this.assetFile(id));}catch{throw new StudioError('MISSING_ASSET',`Thiếu audio asset ${id}`);}
    if(hash(bytes)!==id||bytes.length!==asset.bytes)throw new StudioError('ASSET_HASH_MISMATCH',`Audio asset bị thay đổi: ${id}`);
    return asset;
  }
  async verifyArtifact(artifact:Artifact):Promise<boolean>{
    try{const file=this.artifactFile(artifact.id);return (await stat(file)).size===artifact.bytes&&hash(await readFile(file))===artifact.sha256;}catch{return false;}
  }
  async current(projectId:string){const project=await this.get<Project>('projects',projectId);return {project,revision:await this.get<Revision>('revisions',project.currentRevisionId)};}
  async recover(){for(const j of await this.list<Job>('jobs'))if(j.status==='running')await this.put('jobs',j.id,{...j,status:'interrupted',updatedAt:now(),stage:'Interrupted; retry available',error:{code:'WORKER_INTERRUPTED',message:'Worker dừng trước khi hoàn tất; cần retry.'}});}
  async review(artifactId:string,input:{reviewer:string;decision:'approved'|'changes_requested';notes:string;frame?:number}):Promise<Review>{
    const artifact=await this.get<Artifact>('artifacts',artifactId);
    if(!await this.verifyArtifact(artifact))throw new StudioError('ARTIFACT_HASH_MISMATCH','Video không còn khớp artifact đã QC.');
    if(!input.reviewer.trim()||input.reviewer.length>100||input.notes.length>4000)throw new StudioError('INVALID_REVIEW','Cần tên người duyệt hợp lệ, ghi chú tối đa 4.000 ký tự.');
    if(!['approved','changes_requested'].includes(input.decision))throw new StudioError('INVALID_REVIEW','Quyết định không hợp lệ.');
    if(input.frame!==undefined&&(!Number.isInteger(input.frame)||input.frame<0||input.frame>=artifact.qc.frames))throw new StudioError('INVALID_FRAME','Frame ngoài artifact.');
    const r:Review={reviewer:input.reviewer.trim(),decision:input.decision,notes:input.notes,...(input.frame===undefined?{}:{frame:input.frame}),id:uid('review'),projectId:artifact.projectId,revisionId:artifact.revisionId,artifactId,artifactHash:artifact.sha256,createdAt:now()};
    await this.put('reviews',r.id,r);return r;
  }
}

/** One local application owns the data directory. SIGKILL leaves a recoverable PID lock. */
export async function acquireLock(root:string):Promise<()=>Promise<void>>{
  await mkdir(root,{recursive:true});const file=path.join(root,'.studio.lock');
  try{await writeFile(file,String(process.pid),{flag:'wx'});}catch(e){
    if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
    const pid=Number(await readFile(file,'utf8'));let alive=true;
    if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(err){if((err as NodeJS.ErrnoException).code==='ESRCH')alive=false;}}else throw new StudioError('INVALID_LOCK','Lockfile không hợp lệ; kiểm tra trước khi xóa.');
    if(alive)throw new StudioError('STORE_IN_USE',`Data directory đang được process ${pid} sử dụng.`,409);
    await unlink(file);return acquireLock(root);
  }
  return async()=>{if(await readFile(file,'utf8').catch(()=>null)===String(process.pid))await unlink(file);};
}
