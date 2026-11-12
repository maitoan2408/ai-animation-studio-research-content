"""Measure color paths without inventing an artistic/color acceptance threshold.
Usage: <take-directory> <native-PNG> <frame> <player-directory>
Records explicit BT709→sRGB decode, naive decode, canvas and displayed compositor.
The deliberately unsupported packed-RGB zscale probe must fail, so the measured
inverse uses planar GBR before conversion to packed RGB for PNG encoding.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,uuid
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2];take=Path(sys.argv[1]);reference=Path(sys.argv[2]);frame=int(sys.argv[3]);player=Path(sys.argv[4]);out=root/'out/color-probe'/uuid.uuid4().hex;out.mkdir(parents=True)
report={'status':'MEASURED_NOT_COLOR_APPROVAL','frame':frame,'referenceSha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'deliverySha256':hashlib.sha256((take/'delivery.mp4').read_bytes()).hexdigest(),'measurements':{},'limits':['No tolerance selected retrospectively','Reference decoder roundtrip and target-player display are different tests','Q7 target-player calibration remains open']}
base=f'select=eq(n\\,{frame}),zscale=primariesin=709:transferin=709:matrixin=709:rangein=limited:primaries=709:transfer=iec61966-2-1:matrix=gbr:range=full'
def decode(label,filt):
 argv=['ffmpeg','-v','error','-nostdin','-i',str(take/'delivery.mp4'),'-vf',filt,'-frames:v','1',str(out/f'{label}.png')]
 result=subprocess.run(argv,capture_output=True,text=True);(out/f'{label}.log').write_text(result.stderr);return result
bad=decode('rejected-packed-rgb',base+',format=rgb24')
if bad.returncode==0 or 'YUV color family' not in bad.stderr:raise RuntimeError('EXPECTED_PACKED_FORMAT_FAILURE_NOT_OBSERVED')
report['negativePackedFormatExitCode']=bad.returncode
for label,filt in [('explicit-inverse',base+',format=gbrp,format=rgb24'),('naive-decode',f'select=eq(n\\,{frame}),format=rgb24')]:decode(label,filt).check_returncode()
ref=np.asarray(Image.open(reference).convert('RGB')).astype(float)
for label,file in [('explicit-inverse',out/'explicit-inverse.png'),('naive-decode',out/'naive-decode.png'),('player-canvas',player/'player.png'),('player-compositor',player/'compositor.png')]:
 actual=np.asarray(Image.open(file).convert('RGB')).astype(float)
 if actual.shape!=ref.shape:raise RuntimeError('COLOR_SAMPLE_SIZE')
 delta=np.abs(ref-actual);report['measurements'][label]={'maeRGB':float(delta.mean()),'p95RGB':float(np.percentile(delta,95)),'sampleSha256':hashlib.sha256(file.read_bytes()).hexdigest()}
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'output':str(out),**report}))
