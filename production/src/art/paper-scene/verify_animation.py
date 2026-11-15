"""Recheck a candidate's frame hashes, decode and video metadata; not a review."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image

def sha(data):return hashlib.sha256(data).hexdigest()
def verify(folder):
    folder=Path(folder);report=json.loads((folder/'report.json').read_text())
    profile=(report['status'],report['width'],report['height'])
    if profile not in (('PASS_PROVISIONAL_PREVIEW',640,360),('PASS_PROVISIONAL_1080P',1920,1080)) or report['frames']!=192 or report['fps']!='24/1' or report['seek108Exact'] is not True:raise ValueError('ANIMATION_REPORT')
    width,height=report['width'],report['height']
    hashes=report['frameSha256']
    if not isinstance(hashes,list) or len(hashes)!=192:raise ValueError('ANIMATION_FRAME_HASHES')
    for i,expected in enumerate(hashes):
        file=folder/'frames'/f'{i:04}.png';raw=file.read_bytes()
        if sha(raw)!=expected:raise ValueError(f'ANIMATION_FRAME_HASH {i}')
        with Image.open(file) as im:
            im.load()
            if im.format!='PNG' or im.size!=(width,height):raise ValueError(f'ANIMATION_FRAME_FORMAT {i}')
    video=folder/'preview.mp4'
    if sha(video.read_bytes())!=report['videoSha256']:raise ValueError('ANIMATION_VIDEO_HASH')
    p=subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_read_frames','-of','json',str(video)],capture_output=True,text=True,check=True)
    streams=json.loads(p.stdout)['streams']
    if len(streams)!=1 or streams[0]!={'width':width,'height':height,'r_frame_rate':'24/1','nb_read_frames':'192'}:raise ValueError('ANIMATION_VIDEO_METADATA')
    subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True,capture_output=True)
    return {'status':'PASS_PREVIEW_INTEGRITY','frames':192,'distinctFrameHashes':len(set(hashes)),'videoSha256':report['videoSha256'],
       'scope':f'{width}x{height} silent candidate integrity only; no motion, art, voice or physical approval.'}
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: verify_animation.py DIRECTORY')
    print(json.dumps(verify(Path(sys.argv[1]))))
