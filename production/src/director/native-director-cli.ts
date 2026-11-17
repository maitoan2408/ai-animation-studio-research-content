/**
 * Private JSON stdin/stdout bridge between the root Studio API and the
 * versioned native production Director. Never eval untrusted script or code.
 * Script text is metadata; the supported storyboard is explicitly authored.
 */
import {stdin} from 'node:process';
import {nativeArt,planNativeDirector,saveNativePlan,
 reopenNativePlan,executeNativeDirector} from './native-director.js';
import path from 'node:path';
const cmd=process.argv[2];
const dir=process.env.NATIVE_DIRECTOR_STORE_ROOT;
if(!dir||!path.isAbsolute(dir))throw Error('NATIVE_DIRECTOR_STORE_REQUIRED');
let input='';
for await(const chunk of stdin){
 input+=chunk.toString();
 if(Buffer.byteLength(input)>100_000)throw Error('NATIVE_DIRECTOR_REQUEST_TOO_LARGE');
}
const data=input.trim()?JSON.parse(input):{};
if(!data||typeof data!=='object'||Array.isArray(data))throw Error('NATIVE_DIRECTOR_REQUEST_INVALID');
const {pack,sha256}=await nativeArt();
let output:unknown;
if(cmd==='plan'){
 if(Object.keys(data).sort().join('|')!=='input')
   throw Error('NATIVE_DIRECTOR_REQUEST_INVALID');
 output=planNativeDirector(data.input,pack,sha256);
}else if(cmd==='save'){
 if(Object.keys(data).sort().join('|')!=='plan')
   throw Error('NATIVE_DIRECTOR_REQUEST_INVALID');
 const plan=data.plan;
 const file=await saveNativePlan(plan,dir,pack,sha256);
 output={revision:path.basename(file,'.json'),planFile:path.relative(dir,file)};
}else if(cmd==='get'){
 if(Object.keys(data).sort().join('|')!=='revision'||
    typeof data.revision!=='string'||!/^[a-f0-9]{64}$/.test(data.revision))
   throw Error('NATIVE_DIRECTOR_REVISION_INVALID');
 output=await reopenNativePlan(path.join(dir,'projects',data.revision+'.json'),pack,sha256);
}else if(cmd==='render'){
 if(Object.keys(data).sort().join('|')!=='revision'||
    typeof data.revision!=='string'||!/^[a-f0-9]{64}$/.test(data.revision))
   throw Error('NATIVE_DIRECTOR_REVISION_INVALID');
 const file=path.join(dir,'projects',data.revision+'.json');
 await reopenNativePlan(file,pack,sha256);
 output=await executeNativeDirector(file,dir);
}else throw Error('NATIVE_DIRECTOR_COMMAND_UNKNOWN');
process.stdout.write(JSON.stringify({ok:true,result:output})+'\n');
