"""Assemble a trusted Q2 six-shot selection without re-rendering pictures.

Usage: python assemble.py <selection.json> <R0|R1|R2|R3> [parent-R2-result.json]
R2/R3 use brief/edit-R2-order.json; R0/R1 preserve S01..S06. Input take
manifests and media hashes must match. Concatenate picture-only streams; create
one sample-exact PCM timeline before a single AAC encode (never concat AAC).
Every output directory is unique. A failed attempt remains unpublished.
"""
from pathlib import Path
import hashlib, json, subprocess, sys, uuid, wave

ROOT = Path(__file__).resolve().parents[2]
FRAMES = {'S01':192, 'S02':192, 'S03':240, 'S04':192, 'S05':192, 'S06':144}
FPS, RATE = 24, 48000


def digest(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def run(argv):
    return subprocess.run(argv, check=True, capture_output=True).stdout


def scene_pcm(file, frames):
    """Accept known mono/stereo PCM; explicitly rematrix mono at -3dB/channel."""
    with wave.open(str(file)) as wav:
        if (wav.getsampwidth(),wav.getframerate(),wav.getnframes(),wav.getcomptype()) != (2,RATE,frames*RATE//FPS,'NONE') or wav.getnchannels() not in [1,2]:
            raise ValueError('VOICE_PCM_PROFILE')
        if wav.getnchannels() == 2:
            return wav.readframes(wav.getnframes())
    return run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-af','pan=stereo|c0=0.70710678*c0|c1=0.70710678*c0','-c:a','pcm_s16le','-f','s16le','-'])


def video_hash(file):
    return hashlib.sha256(run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-map','0:v:0','-c:v','copy','-f','h264','-'])).hexdigest()


def load_selection(file):
    selection = json.loads(Path(file).read_text())
    if set(selection) != set(FRAMES):
        raise ValueError('SIX_UNIQUE_SHOTS_REQUIRED')
    rows = {}
    for shot, location in selection.items():
        take = Path(location).resolve()
        result = json.loads((take/'result.json').read_text())
        if result.get('status') != 'PASS_TECHNICAL' or result.get('shot') != shot:
            raise ValueError('TAKE_NOT_VERIFIED '+shot)
        if result.get('frames') != FRAMES[shot] or result.get('width') != 1920:
            raise ValueError('TAKE_PROFILE '+shot)
        if digest(take/'delivery.mp4') != result['deliverySha256']:
            raise ValueError('TAKE_HASH '+shot)
        rows[shot] = (take, result)
    return rows


def revision_order(rows, revision, parent_file=None):
    """R3 is a selective S05 replacement of a verified R2, never a new base."""
    if revision not in ['R0', 'R1', 'R2', 'R3']:
        raise ValueError('UNKNOWN_EDIT_ROUND')
    order = json.loads((ROOT/'brief/edit-R2-order.json').read_text()) if revision in ['R2','R3'] else list(FRAMES)
    if len(order) != 6 or set(order) != set(FRAMES):
        raise ValueError('INVALID_EDITORIAL_ORDER')
    if revision == 'R3':
        if parent_file is None:raise ValueError('R3_PARENT_REQUIRED')
        parent=json.loads(Path(parent_file).read_text())
        if parent.get('status')!='PASS_TECHNICAL' or parent.get('revision')!='R2' or parent.get('frames')!=1152:
            raise ValueError('R3_INVALID_PARENT')
        timeline=parent.get('timeline',[])
        if [item['shot'] for item in timeline]!=order:raise ValueError('R3_PARENT_ORDER')
        cursor=0
        for item in timeline:
            shot=item['shot'];take,result=rows[shot]
            if item['startFrame']!=cursor or item['endFrameExclusive']!=cursor+FRAMES[shot]:raise ValueError('R3_PARENT_TIMELINE')
            cursor+=FRAMES[shot]
            if shot!='S05' and (result['deliverySha256']!=item['deliverySha256'] or digest(take/'picture.mp4')!=item['pictureSha256']):
                raise ValueError('R3_UNRELATED_SHOT_CHANGED '+shot)
            if shot=='S01' and result.get('audioInputSha256')!=item['audioInputSha256']:raise ValueError('R3_VOICE_CHANGED')
        take,result=rows['S05']
        if result['deliverySha256']==next(item['deliverySha256'] for item in timeline if item['shot']=='S05'):raise ValueError('R3_S05_NOT_REPLACED')
        if json.loads((take/'inputs.json').read_text()).get('edit',{}).get('separateHandoffGrips') is not True:raise ValueError('R3_HANDOFF_EDIT_REQUIRED')
    return order


def assemble(selection_file, revision, parent_file=None):
    rows = load_selection(selection_file)
    order = revision_order(rows, revision, parent_file)
    output = ROOT/'out/sequences'/f'{revision}-{uuid.uuid4().hex}'
    output.mkdir(parents=True)
    (output/'request.json').write_text(json.dumps({'revision':revision, 'order':order,
        'selection':json.loads(Path(selection_file).read_text()), 'status':'RUNNING'}, indent=2))
    # Validate decode/profile again, and name hardlinks without concat escaping.
    # Output is on the same workspace filesystem; copied bytes remain identical.
    import shutil
    entries, timeline, cursor = [], [], 0
    pcm = bytearray(sum(FRAMES.values())//FPS * RATE * 2 * 2)
    for index, shot in enumerate(order):
        take, result = rows[shot]
        probe = json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-of','json',str(take/'picture.mp4')]))
        v = probe['streams'][0]
        if len(probe['streams']) != 1 or (v['codec_name'],v['pix_fmt'],v['width'],v['height'],v['r_frame_rate'],v['nb_read_frames'],v.get('color_space'),v.get('color_transfer'),v.get('color_primaries'),v.get('color_range')) != ('h264','yuv420p',1920,1080,'24/1',str(FRAMES[shot]),'bt709','bt709','bt709','tv'):
            raise ValueError('PICTURE_PROFILE '+shot)
        if video_hash(take/'picture.mp4') != video_hash(take/'delivery.mp4'):
            raise ValueError('PICTURE_DELIVERY_MISMATCH '+shot)
        name = f'{index}-{shot}.mp4'
        shutil.copy2(take/'picture.mp4', output/name)
        entries.append(f"file '{name}'\n")
        audio_hash = None
        if shot == 'S01':
            data = json.loads((take/'inputs.json').read_text())
            voice = ROOT/('artifacts/Q2/edit-R1/voice' if data['edit'].get('voiceTake') == 'R1' else 'artifacts/Q1/draft-3/voice')
            audio_hash = digest(voice/'scene.wav')
            if audio_hash != result.get('audioInputSha256'):
                raise ValueError('VOICE_TAKE_MISMATCH')
            segment = scene_pcm(voice/'scene.wav', FRAMES[shot])
            if len(segment) != FRAMES[shot]*RATE//FPS*4:
                raise ValueError('VOICE_PCM_LENGTH')
            offset = cursor*RATE//FPS*4
            pcm[offset:offset+len(segment)] = segment
        timeline.append({'shot':shot,'startFrame':cursor,'endFrameExclusive':cursor+FRAMES[shot],
            'take':str(take),'pictureSha256':digest(take/'picture.mp4'),
            'deliverySha256':result['deliverySha256'],'audioInputSha256':audio_hash})
        cursor += FRAMES[shot]
    (output/'pictures.txt').write_text(''.join(entries))
    with wave.open(str(output/'timeline.wav'),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes(pcm)
    concat = ['ffmpeg','-v','error','-nostdin','-f','concat','-safe','1','-i',str(output/'pictures.txt'),'-map','0:v','-c:v','copy',str(output/'picture.mp4')]
    mux = ['ffmpeg','-v','error','-nostdin','-i',str(output/'picture.mp4'),'-i',str(output/'timeline.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-ar',str(RATE),'-ac','2','-t',str(cursor/FPS),'-movflags','+faststart',str(output/'delivery.mp4')]
    (output/'commands.json').write_text(json.dumps([concat,mux],indent=2))
    run(concat);run(mux)
    run(['ffmpeg','-v','error','-nostdin','-i',str(output/'delivery.mp4'),'-f','null','-'])
    probe = json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(output/'delivery.mp4')]))
    v = next(s for s in probe['streams'] if s['codec_type']=='video')
    a = next(s for s in probe['streams'] if s['codec_type']=='audio')
    if (v['nb_read_frames'],v['width'],v['height'],v['r_frame_rate'],a['sample_rate'],a['channels'],float(probe['format']['duration'])) != (str(cursor),1920,1080,'24/1','48000',2,cursor/FPS):
        raise ValueError('SEQUENCE_PROFILE')
    report = {'status':'PASS_TECHNICAL','revision':revision,'frames':cursor,'durationSeconds':cursor/FPS,'timeline':timeline,'monoRematrix':'L=R=0.70710678*mono; stereo unchanged',
        'pictureSha256':digest(output/'picture.mp4'),'deliverySha256':digest(output/'delivery.mp4'),'pcmSha256':digest(output/'timeline.wav'),
        'probe':probe,'limits':['48s independent benchmark, not72s pilot','No final loudness or listening/creative approval','Same-agent assembly, not independent handoff']}
    if parent_file is not None:report['parentResultSha256']=digest(parent_file)
    (output/'result.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'output':str(output),'status':report['status'],'frames':cursor}))
    return output


if __name__ == '__main__':
    assemble(Path(sys.argv[1]),sys.argv[2],Path(sys.argv[3]) if len(sys.argv)>3 else None)
