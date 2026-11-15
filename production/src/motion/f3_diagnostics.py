"""Selected-image diagnostics for one hashed F3 hero-life preview; not an art gate."""
import hashlib,json,math,sys
from pathlib import Path
from PIL import Image,ImageDraw

def sha(b):return hashlib.sha256(b).hexdigest()
def derivative(values,fps):
 if len(values)<2 or not math.isfinite(fps) or fps<=0 or not all(math.isfinite(x) for x in values):raise ValueError('F3_DIAGNOSTIC_TRACE')
 return [(b-a)*fps for a,b in zip(values,values[1:])]
def generate(source,preview,out):
 source,preview,out=Path(source),Path(preview),Path(out)
 raw=source.read_bytes();data=json.loads(raw);report=json.loads((preview/'report.json').read_text())
 if data['edit']['qualityCandidate']!='f3-hero-life' or len(data['frames'])!=192 or report['sourceSha256']!=sha(raw) or report['frames']!=192 or report['fps']!='24/1':raise ValueError('F3_DIAGNOSTIC_SOURCE')
 if len(report['frameSha256'])!=192 or sha((preview/'preview.mp4').read_bytes())!=report['videoSha256']:raise ValueError('F3_DIAGNOSTIC_VIDEO')
 pngs=[]
 for frame in range(192):
  b=(preview/'frames'/f'{frame:04}.png').read_bytes()
  if sha(b)!=report['frameSha256'][frame]:raise ValueError('F3_DIAGNOSTIC_FRAME_HASH')
  pngs.append(b)
 if out.exists():raise ValueError('F3_DIAGNOSTIC_TARGET_EXISTS')
 out.mkdir(parents=True)
 from io import BytesIO
 picks=[0,24,60,72,90,108,158,191];sheet=Image.new('RGB',(1280,420),'#f4f1e8');draw=ImageDraw.Draw(sheet)
 for i,frame in enumerate(picks):
  image=Image.open(BytesIO(pngs[frame])).convert('RGB');image.thumbnail((320,180));x=(i%4)*320;y=(i//4)*210
  sheet.paste(image,(x,y+24));draw.text((x+8,y+5),f'Frame {frame}',fill='#183b38')
 sheet.save(out/'contact-sheet.png',optimize=True)
 frames=[86,88,90,92,94];onion=Image.open(BytesIO(pngs[frames[0]])).convert('RGB')
 for count,frame in enumerate(frames[1:],start=2):onion=Image.blend(onion,Image.open(BytesIO(pngs[frame])).convert('RGB'),1/count)
 onion.save(out/'onion-86-94.png',optimize=True)
 heads=[];torsos=[];blink=[]
 for frame in data['frames']:
  head=next(s for s in frame['sprites'] if s['id']=='mai.head');torso=next(s for s in frame['sprites'] if s['id']=='mai.torso')
  heads.append(head['rotation']);torsos.append(torso['y']);blink.append(int(head['asset'].endswith('-blink')))
 velocity=derivative(heads,24);acceleration=derivative(velocity,24);jerk=derivative(acceleration,24)
 chart=Image.new('RGB',(960,720),'#faf8f0');pen=ImageDraw.Draw(chart)
 for row,(values,label) in enumerate(zip([heads,torsos,blink],['Head angle (degrees)','Torso pivot y (stage px)','Blink asset active'])):
  top=30+row*220;low=min(values);high=max(values);span=max(high-low,1e-9)
  pen.text((12,top),f'{label}: {low:.3f} to {high:.3f}',fill='#183b38')
  pen.rectangle((60,top+24,930,top+194),outline='#637b74')
  points=[(60+i*870/191,top+194-(value-low)*170/span) for i,value in enumerate(values)]
  pen.line(points,fill='#247b77',width=2)
 pen.text((60,701),'Frames 0-191, 24 fps; observations, no acting score',fill='#183b38')
 chart.save(out/'curves.png',optimize=True)
 result={'status':'OBSERVATION_ONLY','sourceSha256':sha(raw),'videoSha256':report['videoSha256'],'frames':192,'contactFrames':picks,'onionFrames':frames,
 'maxHeadJerkDegreesPerSecondCubed':max(map(abs,jerk)),'blinkFrames':sum(blink),
 'limits':['finite differences use unfiltered frame samples; no locked jerk threshold','contact sheet and blended onion are not art approval','preview 640x360, no audio']}
 (out/'report.json').write_text(json.dumps(result,indent=2)+'\n');return result
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('usage: f3_diagnostics.py SOURCE PREVIEW OUTPUT')
 print(json.dumps(generate(*sys.argv[1:])))
