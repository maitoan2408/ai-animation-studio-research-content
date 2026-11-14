"""Compare two equal-size sRGB PNGs in named regions; ΔE00 is observational.

Requires numpy and Pillow. Input regions are [left, top, right, bottom] pixels.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw


def srgb_lab(rgb):
    x = np.asarray(rgb, dtype=np.float64) / 255.0
    x = np.where(x <= .04045, x / 12.92, ((x + .055) / 1.055) ** 2.4)
    xyz = x @ np.array([[.4124564,.2126729,.0193339],[.3575761,.7151522,.1191920],[.1804375,.0721750,.9503041]])
    xyz /= np.array([.95047,1.,1.08883])
    f = np.where(xyz > (6/29)**3, np.cbrt(xyz), xyz/(3*(6/29)**2)+4/29)
    return np.stack((116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])),axis=-1)


def delta_e00(lab1, lab2):
    l1,a1,b1=np.moveaxis(np.asarray(lab1,dtype=float),-1,0); l2,a2,b2=np.moveaxis(np.asarray(lab2,dtype=float),-1,0)
    c1=np.hypot(a1,b1); c2=np.hypot(a2,b2); cb=(c1+c2)/2
    g=.5*(1-np.sqrt(cb**7/(cb**7+25**7))); ap1=(1+g)*a1; ap2=(1+g)*a2
    cp1=np.hypot(ap1,b1); cp2=np.hypot(ap2,b2); hp1=np.mod(np.degrees(np.arctan2(b1,ap1)),360); hp2=np.mod(np.degrees(np.arctan2(b2,ap2)),360)
    dl=l2-l1; dc=cp2-cp1; diff=hp2-hp1
    dh=np.where(cp1*cp2==0,0,np.where(diff>180,diff-360,np.where(diff < -180,diff+360,diff)))
    dH=2*np.sqrt(cp1*cp2)*np.sin(np.radians(dh/2)); lm=(l1+l2)/2; cm=(cp1+cp2)/2
    hm=np.where(cp1*cp2==0,hp1+hp2,np.where(np.abs(diff)<=180,(hp1+hp2)/2,np.where(hp1+hp2<360,(hp1+hp2+360)/2,(hp1+hp2-360)/2)))
    t=1-.17*np.cos(np.radians(hm-30))+.24*np.cos(np.radians(2*hm))+.32*np.cos(np.radians(3*hm+6))-.20*np.cos(np.radians(4*hm-63))
    sl=1+.015*(lm-50)**2/np.sqrt(20+(lm-50)**2); sc=1+.045*cm; sh=1+.015*cm*t
    rt=-2*np.sqrt(cm**7/(cm**7+25**7))*np.sin(np.radians(60*np.exp(-((hm-275)/25)**2)))
    return np.sqrt((dl/sl)**2+(dc/sc)**2+(dH/sh)**2+rt*(dc/sc)*(dH/sh))


def compare(before,after,regions,output):
    before,after=Path(before),Path(after); a=Image.open(before).convert('RGB'); b=Image.open(after).convert('RGB')
    if a.size!=b.size: raise ValueError('IMAGE_DIMENSIONS_MISMATCH')
    output=Path(output);output.mkdir(parents=True,exist_ok=True); rows={}
    for name,box in regions.items():
        if not name.replace('_','').isalnum() or len(box)!=4 or not (0<=box[0]<box[2]<=a.width and 0<=box[1]<box[3]<=a.height): raise ValueError('INVALID_REGION')
        left=a.crop(box);right=b.crop(box);delta=delta_e00(srgb_lab(left),srgb_lab(right)); rows[name]={'box':box,'meanDeltaE00':float(delta.mean()),'maxDeltaE00':float(delta.max())}
        w,h=left.size; panel=Image.new('RGB',(w*2,h));panel.paste(left,(0,0));panel.paste(right,(w,0));panel.resize((w*4,h*2),Image.Resampling.NEAREST).save(output/f'{name}-before-after.png',optimize=True)
        # Red intensity corresponds to ΔE00/10; black means identical, saturation is deliberate.
        heat=np.zeros((h,w,3),dtype=np.uint8);heat[:,:,0]=np.uint8(np.clip(delta*25.5,0,255));Image.fromarray(heat).save(output/f'{name}-heat.png',optimize=True)
    result={'status':'OBSERVATION_ONLY','beforeSha256':hashlib.sha256(before.read_bytes()).hexdigest(),'afterSha256':hashlib.sha256(after.read_bytes()).hexdigest(),'dimensions':list(a.size),'regions':rows,'color':'sRGB D65 to CIELAB D65, CIEDE2000 kL=kC=kH=1','threshold':'UNVERIFIED; no quality gate'}
    (output/'report.json').write_text(json.dumps(result,indent=2)+'\n');return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('before');p.add_argument('after');p.add_argument('regions',type=Path);p.add_argument('output');args=p.parse_args()
    print(json.dumps(compare(args.before,args.after,json.loads(args.regions.read_text()),args.output)))
