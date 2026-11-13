"""Rebuild R3 from committed R2 + S05 repair without new large Git binaries.

No native renderer needed. Preserve decoded frames and AAC; verify all input
hashes and both output profiles before atomically publishing the new catalog.
Existing verified output is reused, partial attempts stay under out/.
"""
from pathlib import Path
import copy, json, os, subprocess, uuid, zipfile
from contracts import ROOT, sha256, probe, validate_probe, audio_packet_hash
from review_bundle import restore

ART = ROOT/'artifacts/Q2'
DEST = ART/'web-review-v3/generated'


def frames(file):
    data=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(file),'-map','0:v:0','-f','framemd5','-'],text=True)
    return [line.rsplit(',',1)[1].strip() for line in data.splitlines() if line and not line.startswith('#')]


def verified_zip(file):
    with zipfile.ZipFile(file) as archive:
        manifest=json.loads(archive.read('manifest.json'))
        entries={name:archive.read(name) for name in manifest['files']}
    import hashlib
    for name,digest in manifest['files'].items():
        if hashlib.sha256(entries[name]).hexdigest()!=digest:raise ValueError('NATIVE_DEPENDENCY_HASH '+name)
    return entries


def main():
    recipe_file=ART/'web-review-v3/recipe.json'
    recipe=json.loads(recipe_file.read_text())
    for directory in sorted((ART/'web-review-v2').glob('*/bundle.json')):restore(directory.parent)
    for name,digest in recipe['inputs'].items():
        if sha256(ART/name)!=digest:raise ValueError('INPUT_HASH '+name)
    if DEST.exists():
        report=json.loads((DEST/'report.json').read_text())
        if report['recipeSha256']!=sha256(recipe_file):raise ValueError('EXISTING_RECIPE_MISMATCH')
        for name,digest in report['outputs'].items():
            if sha256(DEST/name)!=digest:raise ValueError('EXISTING_OUTPUT_MISMATCH '+name)
        print(json.dumps({'output':str(DEST),'status':'PASS_REUSE_VERIFIED'}));return
    out=ROOT/'out/r3-review-build'/uuid.uuid4().hex;out.mkdir(parents=True)
    commands=[]
    def run(args):
        argv=['ffmpeg','-v','error','-nostdin',*map(str,args)]
        commands.append(argv);(out/'commands.json').write_text(json.dumps(commands,indent=2))
        result=subprocess.run(argv,capture_output=True,timeout=600)
        with (out/'ffmpeg.log').open('ab') as log:log.write(result.stderr)
        if result.returncode:raise RuntimeError('FFMPEG_FAILED: '+result.stderr.decode()[-2000:])
    previous=json.loads((ART/'web-review-v2/catalog.json').read_text())
    r2=next(a for a in previous['artifacts'] if a['revision']=='R2')
    before=ART/r2['file'];master=ART/r2['masterFile']
    shot=ART/'s05-r3'
    # Preserve the complete first five encoded GOPs: R2 was assembled from
    # independent shots and ends S06 exactly at frame960, before S05's keyframe.
    run(['-i',master,'-map','0:v:0','-frames:v','960','-c:v','copy',out/'prefix.mp4'])
    run(['-i',shot/'master.mp4','-map','0:v:0','-c:v','copy',out/'s05.mp4'])
    (out/'concat.txt').write_text("file 'prefix.mp4'\nfile 's05.mp4'\n")
    run(['-f','concat','-safe','1','-i',out/'concat.txt','-i',master,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',out/'master.mp4'])
    validate_probe(probe(out/'master.mp4'),'master',1152)
    if frames(out/'master.mp4')!=frames(master)[:960]+frames(shot/'master.mp4'):raise ValueError('MASTER_FRAME_MISMATCH')
    if audio_packet_hash(out/'master.mp4')!=audio_packet_hash(master):raise ValueError('MASTER_AUDIO_CHANGED')
    # Both inputs are already full-range YUV420. Lossless re-encoding preserves
    # those decoded samples; no RGB conversion, resizing or new motion inference.
    run(['-threads','2','-i',before,'-threads','2','-i',shot/'web-review.mp4',
         '-filter_complex','[0:v]trim=end_frame=960,setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]',
         '-map','[v]','-map','0:a:0','-r','24','-fps_mode','cfr','-video_track_timescale','12288',
         '-c:v','libx264','-preset','fast','-crf','0','-threads','2','-pix_fmt','yuvj420p',
         '-color_primaries','bt709','-color_trc','iec61966-2-1','-colorspace','bt709','-color_range','pc',
         '-c:a','copy','-movflags','+faststart',out/'review.mp4'])
    validate_probe(probe(out/'review.mp4'),'review_v2',1152)
    if frames(out/'review.mp4')!=frames(before)[:960]+frames(shot/'web-review.mp4'):raise ValueError('WEB_FRAME_MISMATCH')
    if audio_packet_hash(out/'review.mp4')!=audio_packet_hash(before):raise ValueError('WEB_AUDIO_CHANGED')
    entries=verified_zip(ART/previous['native']['file']);entries.update(verified_zip(shot/'native-S05-R3.zip'))
    entries['README.txt']=b'R3 six-shot native source. Open project/S01.blend through S06.blend. S05 uses separated grips; other shots keep R2 selection. Textures are relative. Voice is separate, not embedded. Full creative/listening/independent handoff approval is pending.\n'
    import hashlib
    manifest={'schemaVersion':1,'shots':['S01','S02','S03','S04','S05','S06'],'blender':'4.3.2','files':{n:hashlib.sha256(b).hexdigest() for n,b in entries.items()}}
    with zipfile.ZipFile(out/'native.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name,data in sorted(entries.items()):archive.writestr(name,data)
        archive.writestr('manifest.json',json.dumps(manifest,indent=2)+'\n')
    catalog=copy.deepcopy(previous)
    catalog['title']='The Last Lantern — R0–R3 review; native source R3'
    artifact=copy.deepcopy(r2);artifact.update(revision='R3',id=sha256(out/'review.mp4'),file='web-review-v3/generated/review.mp4',masterFile='web-review-v3/generated/master.mp4',masterSha256=sha256(out/'master.mp4'),colorStatus='pending')
    # Full-range converted samples and AAC are exact. The R3 candidate's native
    # side-by-side color checks remain a separate report; no artistic approval.
    artifact['colorStatus']='pass'
    catalog['artifacts'].append(artifact)
    catalog['native']={'file':'web-review-v3/generated/native.zip','sha256':sha256(out/'native.zip')}
    (out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    report={'status':'PASS_TECHNICAL','recipeSha256':sha256(recipe_file),'frames':1152,'reusedFrames':960,'replacedShot':'S05','masterDecodedFramesExact':True,'webDecodedYuvFramesExact':True,'aacPacketsUnchanged':True,'nativeFiles':len(entries),'outputs':{name:sha256(out/name) for name in ['master.mp4','review.mp4','native.zip','catalog.json']},'limits':['Functional reconstruction; no creative/listening or independent operator approval.','Generated bytes may vary with FFmpeg/ZIP runtime; decoded frame identity is checked and catalog binds actual output SHA.']}
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    for name,digest in recipe['inputs'].items():
        if sha256(ART/name)!=digest:raise ValueError('INPUT_CHANGED_DURING_BUILD')
    DEST.parent.mkdir(parents=True,exist_ok=True)
    os.rename(out,DEST)
    print(json.dumps({'output':str(DEST),**report}))


if __name__=='__main__':main()
