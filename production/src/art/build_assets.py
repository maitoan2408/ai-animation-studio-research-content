"""Author the Lantern v1 vector art pack.

Coordinates and control points are deliberately authored here, not inferred from
a generated flat image. Every part has editable native SVG, a named pivot and
anchors. Nothing in this module animates or silently invents hidden rig parts.
Run from any cwd: python production/src/art/build_assets.py. Asset rasterization
is a separate browser step so source SVG remains the canonical artwork.
"""
from pathlib import Path
import hashlib
import json

WORKBENCH = Path(__file__).resolve().parents[2]
PACK = WORKBENCH / 'assets/lantern-v1'
CATALOG: list[dict] = []
INK = '#394c4c'


def path(d, fill, stroke='none', sw=2, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'


def ellipse(x, y, rx, ry, fill, extra=''):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'


def rect(x, y, w, h, fill, rx=0, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'


def save(asset_id, width, height, body, pivot=None, anchors=None, category='part', texture=True):
    target = PACK / f'{asset_id}.svg'
    target.parent.mkdir(parents=True, exist_ok=True)
    grain = '''<defs><filter id="paper" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".58" numOctaves="2" seed="31" result="noise"/>
<feColorMatrix in="noise" type="matrix" values="0 0 0 0 .22 0 0 0 0 .18 0 0 0 0 .12 0 0 0 .13 0"/>
<feComposite in2="SourceAlpha" operator="in" result="grain"/>
<feBlend in="SourceGraphic" in2="grain" mode="soft-light"/></filter></defs>'''
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{grain}<g {"filter=\"url(#paper)\"" if texture else ""}>{body}</g></svg>'
    target.write_text(svg + '\n')
    CATALOG.append(dict(id=asset_id, file=str(target.relative_to(PACK)), width=width,
                        height=height, pivot=pivot or [width/2, height/2], anchors=anchors or {},
                        category=category, sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                        colorSpace='srgb', alpha='straight', source='project-original'))


def face(actor, view, mood):
    mai = actor == 'mai'
    skin = '#e8b794' if mai else '#c68f6b'
    shade = '#cf9279' if mai else '#ac775e'
    hair = '#303c41' if mai else '#d7d4be'
    eye_x = [70, 116] if view == 'front' else ([95, 130] if view == 'quarter' else [126])
    b = path('M51 141Q25 135 31 94L37 58Q51 20 98 22Q145 20 155 65L154 144Q134 165 114 156Z', hair)
    b += path('M60 59Q105 36 138 66L146 112Q147 141 115 156Q84 164 62 140L49 107Z', skin)
    b += ellipse(53, 105, 12, 16, shade) + ellipse(55, 103, 7, 10, skin)
    b += path('M76 141L116 146L116 174L78 174Z', skin)
    if mai:
        b += path('M35 93Q26 51 64 28Q112 4 149 40L160 87Q126 79 109 48Q90 80 53 85L55 150Q35 152 30 129Z', hair)
        b += path('M52 52Q81 29 107 35', 'none', '#4d5657', 4)
        b += path('M143 83Q151 102 145 132L135 149L153 143L160 102Z', '#29383b')
        b += path('M44 60L57 64L54 78L41 73Z', '#bd6253')
    else:
        b += path('M39 87Q29 53 64 30Q108 8 142 42L154 80L130 65L118 40Q88 64 53 65Z', hair)
        b += path('M58 125Q76 142 111 135Q134 131 143 114L145 138Q129 165 99 166Q66 165 55 143Z', '#e4ddc3')
        b += path('M57 49Q79 26 108 30', 'none', '#f5ead0', 4)
        b += path('M65 82Q67 91 62 97', 'none', shade, 2)
    b += ellipse(86 if view == 'front' else 111, 123, 13, 7, '#d58472', 'opacity=".46"')
    for i, x in enumerate(eye_x):
        y = 104 if i == 0 else 102
        if mood == 'happy':
            b += path(f'M{x-5} {y+1}Q{x} {y-6} {x+5} {y}', 'none', INK, 3)
        elif mood == 'blink':
            b += path(f'M{x-6} {y}Q{x} {y+3} {x+5} {y}', 'none', INK, 2.5)
        else:
            b += ellipse(x, y, 3.4, 5, INK) + ellipse(x-1, y-2, 1, 1.2, '#fff4d5')
        tilt = -4 if mood == 'worried' and i == 0 else (3 if mood == 'worried' else 0)
        b += path(f'M{x-7} {y-13+tilt}Q{x} {y-17} {x+6} {y-13-tilt}', 'none', hair if mai else '#817f72', 3)
    nose_x = 98 if view == 'front' else (127 if view == 'quarter' else 145)
    b += path(f'M{nose_x} 106l4 13l-7 2', 'none', shade, 2.5)
    if view == 'profile':
        b += path('M140 90L156 112L146 119L148 131L134 147', skin, shade, 1)
    mouth = [99, 135] if view == 'front' else ([124, 134] if view == 'quarter' else [145, 132])
    save(f'{actor}/head-{view}-{mood}', 180, 180, b, [94, 168],
         {'mouth':mouth, 'eye':[eye_x[-1], 104], 'neck':[94,168]}, 'head')


def character(actor):
    mai = actor == 'mai'
    coat = '#d5a34b' if mai else '#47736a'
    dark = '#b87f35' if mai else '#30584f'
    light = '#e6bd6b' if mai else '#669387'
    skin = '#e8b794' if mai else '#c68f6b'
    body = path('M48 20L76 9L108 12L140 28L164 172L135 183L95 177L54 185L17 174L34 53Z', coat, dark, 2)
    body += path('M90 18L83 177L97 177L99 20Z', dark, extra='opacity=".55"')
    body += path('M47 32L73 58L87 20M101 21L119 54L142 33', light)
    body += path('M38 99L68 101L65 129L39 127ZM116 100L147 100L149 125L119 130Z', dark)
    body += path('M40 100L66 103M118 103L146 102M29 164Q57 172 77 166M105 165L150 166', 'none', light, 2)
    for y in [63,90,117,145]:
        body += ellipse(97,y,3,3,'#e5d3a4')
    if mai:
        body += path('M66 12L106 9L123 30L92 39L65 28Z', '#bc6351')
        body += path('M103 30L128 38L116 106L94 96Z', '#a94e46')
        body += path('M105 39L114 42L105 88', 'none', '#d9846a', 3)
    else:
        body += path('M63 23L75 16L90 27L103 18L122 27L113 78L74 79Z', '#d7c89d')
        body += path('M75 36H112M74 47H113M75 58H111', 'none', '#b7a983', 2)
    save(f'{actor}/torso',180,190,body,[90,170],{'leftShoulder':[37,31],'rightShoulder':[143,31],'neck':[94,15],'hip':[90,170]},'torso')
    for part,width,height,length in [('upper-arm',64,130,105),('forearm',58,122,98)]:
        b=path(f'M16 8Q{width/2} 2 {width-12} 15L{width-8} {height-27}Q{width-20} {height-5} 15 {height-13}L8 27Z',coat,dark,2)
        b+=path(f'M18 24L21 {height-35}', 'none',light,3)
        b+=path(f'M14 {height-30}Q{width/2} {height-24} {width-9} {height-33}L{width-9} {height-16}L15 {height-12}Z',dark)
        save(f'{actor}/{part}',width,height,b,[width/2,12],{'end':[width/2,12+length]},'limb')
    for part,width in [('thigh',72),('shin',64)]:
        b=path(f'M14 8L{width-12} 7L{width-9} 132L19 137L10 75Z','#435a5a','#31484b',2)
        b+=path(f'M23 15L25 124M{width-18} 20L{width-17} 120','none','#607370',2)
        save(f'{actor}/{part}',width,145,b,[width/2,14],{'end':[width/2,129]},'limb')
    boot=path('M20 7L52 9L59 29Q86 25 91 42L89 49L9 49L7 36L16 26Z','#665548','#3b4340',2)
    boot+=path('M10 45H89','none','#a28b69',4)+path('M28 16L47 19M27 22L48 25','none','#baa17b',2)
    save(f'{actor}/boot',98,60,boot,[33,20],{'sole':[33,49]},'foot')
    for pose in ['open','grip','point']:
        if pose=='open':
            hand=path('M22 42L13 26Q10 18 16 17L23 27L18 10Q18 3 24 7L31 23L29 6Q32 1 36 7L40 23L42 10Q47 6 49 13L49 29L55 20Q62 18 59 27L52 44L41 52L27 49Z',skin,'#b57d66',1.5)
        elif pose=='grip':
            hand=path('M20 42L15 25Q15 17 23 20L28 29L29 16Q32 9 38 15L44 16Q51 14 54 22L53 37Q50 48 40 52L28 48Z',skin,'#b57d66',1.5)
            hand+=path('M29 24Q41 22 47 29L40 36L28 31M40 37L49 38','none','#b57d66',2)
        else:
            hand=path('M20 41L17 27Q16 20 24 24L31 29L44 5Q49 2 51 7L40 32Q55 23 58 31L51 44L40 53L29 49Z',skin,'#b57d66',1.5)
        save(f'{actor}/hand-{pose}',68,64,hand,[29,45],{'grip':[43,28],'tip':[49,8]},'hand')
    for view in ['front','quarter','profile']:
        for mood in ['neutral','worried','happy','blink']:
            face(actor,view,mood)


def mouths():
    shapes={
        'rest':path('M8 14Q17 17 25 13','none','#6d3e35',2),
        'M':path('M7 14L25 14','none','#753f37',3),
        'A':ellipse(17,14,9,8,'#623b35')+ellipse(17,18,5,2.5,'#b96762'),
        'E':path('M6 9Q17 7 28 9L26 17Q17 23 8 17Z','#623b35')+path('M8 9H26L25 13H9Z','#f8e4be'),
        'O':ellipse(17,14,5,7,'#623b35'),
        'F':path('M8 11H27L25 18L11 18Z','#693d36')+path('M9 11H26V14H9Z','#f8e4be'),
        'smile':path('M6 11Q18 18 29 10Q23 24 12 20Z','#743e38')+path('M8 12Q18 18 27 12L25 15Q17 20 10 15Z','#f8e4be')
    }
    for name,body in shapes.items():
        save(f'mouth/{name}',36,28,body,[17,14],category='mouth',texture=False)


def props():
    mug=path('M18 20L67 18L65 84Q44 98 21 84Z','#bc6351','#874f43',2)
    mug+=path('M66 29Q96 19 88 56Q84 70 66 64','none','#bc6351',10)
    mug+=path('M67 31Q84 26 81 48Q79 58 67 57','none','#e1a77a',2)
    mug+=ellipse(42,20,25,6,'#e0b188')+ellipse(42,20,20,3,'#68483d')
    mug+=path('M29 30L31 75M24 84Q43 92 63 83','none','#dc9576',3)
    save('props/cup',104,105,mug,[43,90],{'grip':[77,42],'support':[43,90]},'prop')
    for lit in [False,True]:
        lamp=path('M51 44V25Q51 5 80 5Q110 6 110 27V45','none','#374d4b',8)
        lamp+=path('M40 46Q80 34 120 46L133 175Q83 199 27 177Z','#e3bf78' if lit else '#6a8980','#3e5d56',5)
        lamp+=path('M51 56L49 171L112 169L110 55Z','#fbe4a2' if lit else '#9aaf98')
        lamp+=path('M40 46L30 176M120 46L132 175M80 41V186','none','#42665b',5)
        for y in [78,105,132,158]:lamp+=path(f'M42 {y}Q81 {y+9} 122 {y}','none','#b79151' if lit else '#6a8c7e',2)
        lamp+=path('M26 177Q79 192 136 176L137 191Q78 210 25 191Z','#3d5b52')
        if lit:lamp+=ellipse(82,116,13,24,'#fff3cc')+path('M79 123Q65 107 85 89Q95 111 85 128Z','#fff9db')
        save('props/lantern-'+('lit' if lit else 'dark'),164,220,lamp,[80,195],{'grip':[80,9],'support':[80,195],'light':[80,116]},'prop')
    table=path('M28 46L48 45L44 223L24 223ZM291 46L313 43L329 223L308 223Z','#715d48')
    table+=path('M45 147H309V162H44Z','#856c50')
    table+=path('M6 22L333 14L346 43L17 54Z','#bd9b68','#816e50',3)
    table+=path('M16 28L330 21M21 42L337 32M60 24L67 44M261 18L269 38','none','#d5b783',2)
    save('props/workbench',352,232,table,[176,222],{'support':[176,31]},'prop')


def background():
    # Overscan asset coordinates = stage coordinates + (240,135).
    def layer(name,body):save('background/'+name,2400,1350,f'<g transform="translate(240 135)">{body}</g>',category='background')
    sky=rect(-240,-135,2400,1350,'#345965')
    sky+=path('M-240 460Q300 220 800 290Q1410 160 2160 440V1215H-240Z','#557c7e')
    sky+=ellipse(1430,190,69,69,'#ead7a5')+ellipse(1452,175,65,64,'#345965')
    for x,y,r in [(110,110,2),(390,80,3),(1050,110,2),(1630,70,2),(1750,280,2),(830,160,2)]:sky+=ellipse(x,y,r,r,'#e7dbba')
    layer('sky',sky)
    far=path('M-240 633Q50 310 410 511Q760 266 1100 497Q1410 340 1770 499Q1960 358 2160 560V1215H-240Z','#719b95')
    far+=path('M-240 742Q250 513 550 674Q880 483 1190 629Q1530 456 2160 690V1215H-240Z','#88aaa0')
    for x,y,w,h in [(80,490,110,180),(230,450,150,220),(435,515,90,150),(1410,465,130,215),(1580,510,160,170)]:
        far+=rect(x,y,w,h,'#9bb4a2')+path(f'M{x-18} {y+5}L{x+w/2} {y-54}L{x+w+18} {y+5}Z','#557d77')
        for wy in [y+35,y+95]:far+=rect(x+25,wy,22,35,'#cad0ad',3)+rect(x+w-48,wy,22,35,'#cad0ad',3)
    layer('village',far)
    workshop=path('M1195 405L1729 402L1753 879L1180 878Z','#d4b784','#9c8b67',3)
    workshop+=path('M1129 418L1461 263L1805 419L1784 448L1134 450Z','#456c65')
    workshop+=path('M1160 423L1461 292L1776 423','none','#76988a',7)
    for x in [1215,1275,1335,1395,1455,1515,1575,1635,1695]:workshop+=path(f'M{x} 448L{x+3} 872','none','#bea678',2)
    workshop+=path('M1387 871V596Q1450 504 1521 599V872Z','#4a6660')
    workshop+=path('M1403 869V604Q1455 535 1505 605V869Z','#789386')
    workshop+=path('M1457 571V868M1407 655H1503M1409 749H1506','none','#42675f',6)
    workshop+=ellipse(1484,738,5,5,'#e2bd71')
    for x in [1235,1578]:
        workshop+=rect(x,552,103,132,'#5a7970',5)+rect(x+10,562,83,110,'#e0cb90',3)
        workshop+=path(f'M{x+52} 560V676M{x+10} 614H{x+93}','none','#739180',6)
        workshop+=path(f'M{x-7} 685H{x+113}V699H{x-7}Z','#9a8962')
    workshop+=path('M1220 837L1327 834L1315 887L1231 887Z','#ab6d51')
    for x,y in [(1245,816),(1280,803),(1304,824)]:workshop+=path(f'M{x} 840Q{x-42} {y-60} {x-18} {y-82}Q{x+15} {y-51} {x} 840Q{x+43} {y-67} {x+39} {y-23}Z','#4d7763')
    layer('workshop',workshop)
    ground=path('M-240 833Q600 801 2160 847V1215H-240Z','#b4a987')
    ground+=path('M-240 1020Q380 801 1120 867Q1550 888 2160 1010V1215H-240Z','#cbbc94')
    ground+=path('M-240 1110Q500 858 2160 1147','none','#d9cda5',42)
    for x,y,w in [(100,930,76),(400,983,90),(870,943,69),(1240,1000,105),(1560,937,75),(1810,1050,90),(650,1080,87)]:
        ground+=path(f'M{x} {y}l{w} -6l18 15l-{w+9} 6Z','#b5a781')
    layer('ground',ground)
    for side in ['left','right']:
        b=path('M135 1100L154 523L184 209L224 93L237 108L211 385L251 648L254 1100Z','#244e4f')
        b+=path('M189 505L79 322L52 182M204 378L333 199L399 116M213 633L343 460','none','#244e4f',22)
        for x,y,rx,ry in [(61,228,94,141),(153,113,112,167),(285,116,119,143),(359,260,93,141),(93,443,114,134),(334,486,110,150),(50,711,101,151)]:
            b+=path(f'M{x-rx} {y}Q{x-rx/2} {y-ry} {x} {y-ry*.7}Q{x+rx} {y-ry/2} {x+rx} {y+25}Q{x+rx*.3} {y+ry} {x-rx} {y}Z','#315f58' if x<220 else '#3c6a5d')
            b+=path(f'M{x-rx*.4} {y+20}Q{x} {y-ry*.3} {x+rx*.4} {y-ry*.25}','none','#63866b',3)
        save('background/tree-'+side,500,1120,b,category='foreground')
    grass=''
    for i,(x,y) in enumerate([(100,160),(245,180),(395,150),(545,190),(715,163),(860,185)]):
        grass+=path(f'M{x} 260Q{x-94} {y-70} {x-62} {y-83}Q{x-16} {y-45} {x} 260Q{x+27} {y-117} {x+62} {y-108}Q{x+68} {y-47} {x} 260Z','#315e50')
        grass+=path(f'M{x} 260Q{x-5} {y-21} {x+20} {y-42}','none','#7e966e',3)
    save('background/foreground-grass',960,280,grass,category='foreground')


def main():
    for actor in ['mai','an']:character(actor)
    mouths();props();background()
    manifest=dict(version='lantern-art-1',authorship='Original vector artwork authored for this project; no external art or voice assets',
                  license='Project-original; use with repository project. External dependencies listed separately.',
                  units='pixels in 1920x1080 stage; part pivots in native SVG coordinates',
                  source='production/src/art/build_assets.py', assets=CATALOG)
    (PACK/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'pack':str(PACK),'assets':len(CATALOG),'manifestSha256':hashlib.sha256((PACK/'manifest.json').read_bytes()).hexdigest()}))


if __name__=='__main__':main()
