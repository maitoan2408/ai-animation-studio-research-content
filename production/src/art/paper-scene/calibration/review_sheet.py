"""Create an honestly labelled comparison of separate unapproved stills."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,__version__ as pillow_version
ROOT=Path(__file__).resolve().parents[5]
BASE=ROOT/'production/artifacts/quality/v2-f2'
SOURCES=[('Baseline','t1/basic.png'),('Contact + shadow cards','t3/contact-card.png'),('Paper edge (prop)','t4/edge-alpha-preview.png'),('Paper bump (Mai)','t5/bump-preview.png'),('Lantern point light','t6/point-max.png')]
out=BASE/'review-preparation';out.mkdir(parents=True,exist_ok=True)
font_path=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
if not font_path.is_file():raise RuntimeError('SHEET_FONT_MISSING: '+str(font_path))
font=ImageFont.truetype(str(font_path),18)
sheet=Image.new('RGB',(1920,800),'#ece6d6');draw=ImageDraw.Draw(sheet);rows=[]
for i,(label,relative) in enumerate(SOURCES):
 path=BASE/relative;image=Image.open(path).convert('RGB')
 if image.size!=(640,360):raise ValueError('SHEET_IMAGE_SIZE '+relative)
 x=(i%3)*640;y=(i//3)*400;sheet.paste(image,(x,y+32));draw.text((x+8,y+5),label,font=font,fill='#222222')
 rows.append({'label':label,'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'dimensions':[640,360]})
draw.text((1288,415),'Separate experiments; not a final look.',font=font,fill='#222222')
draw.text((1288,443),'Silent stills; lighting and shadow remain open.',font=font,fill='#222222')
sheet.save(out/'separate-experiments.png',optimize=True)
report={'status':'PROVISIONAL_REVIEW_PREPARATION','sourceFrames':rows,'fontSha256':hashlib.sha256(font_path.read_bytes()).hexdigest(),'pillowVersion':pillow_version,'sheetSha256':hashlib.sha256((out/'separate-experiments.png').read_bytes()).hexdigest(),'scope':'S05 frame 108, 640x360; separate experiments, not one combined preset, no artistic approval or audio'}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
