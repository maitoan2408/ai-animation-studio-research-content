"""Trace the exact perimeter of a declared binary alpha mask on its pixel grid.

Each edge is directed with the filled cell on its right in y-down coordinates.
At diagonal touches the rightmost continuation keeps components separate.
No smoothing, resampling, topology approximation or art-quality claim.
"""
from collections import defaultdict

def trace(mask, width, height):
    if not isinstance(width,int) or not isinstance(height,int) or width<1 or height<1 or len(mask)!=width*height:
        raise ValueError('SILHOUETTE_MASK')
    edges=defaultdict(set)
    def filled(x,y): return 0<=x<width and 0<=y<height and bool(mask[y*width+x])
    def add(a,b): edges[a].add(b)
    for y in range(height):
        for x in range(width):
            if not filled(x,y): continue
            if not filled(x,y-1): add((x,y),(x+1,y))
            if not filled(x+1,y): add((x+1,y),(x+1,y+1))
            if not filled(x,y+1): add((x+1,y+1),(x,y+1))
            if not filled(x-1,y): add((x,y+1),(x,y))
    directions={(1,0):0,(0,1):1,(-1,0):2,(0,-1):3}
    loops=[]
    while edges:
        start=min(edges); at=start; path=[at]; prev=None
        while True:
            choices=edges.get(at)
            if not choices: raise ValueError('SILHOUETTE_OPEN_EDGE')
            if prev is None: nxt=min(choices)
            else:
                direction=directions[(at[0]-prev[0],at[1]-prev[1])]
                order=[(direction+1)%4,direction,(direction+3)%4,(direction+2)%4]
                nxt=min(choices,key=lambda p:order.index(directions[(p[0]-at[0],p[1]-at[1])]))
            choices.remove(nxt)
            if not choices: del edges[at]
            prev,at=at,nxt
            if at==start: break
            path.append(at)
        # Remove collinear vertices; this preserves the exact pixel-grid polygon.
        keep=[]
        for i,p in enumerate(path):
            a=path[i-1];b=path[(i+1)%len(path)]
            if (p[0]-a[0])*(b[1]-p[1]) != (p[1]-a[1])*(b[0]-p[0]): keep.append(p)
        if len(keep)<4: raise ValueError('SILHOUETTE_DEGENERATE')
        area=sum(p[0]*keep[(i+1)%len(keep)][1]-keep[(i+1)%len(keep)][0]*p[1] for i,p in enumerate(keep))/2
        loops.append({'points':keep,'signedArea':area})
    return loops


def reconstruct(loops, width, height):
    """Rasterize axis-aligned loops at pixel centres using nonzero winding."""
    counts=[0]*(width*height)
    for loop in loops:
        points=loop['points']; sign=1 if loop['signedArea']>0 else -1
        for y in range(height):
            intersections=[]
            for i,(x1,y1) in enumerate(points):
                x2,y2=points[(i+1)%len(points)]
                if x1==x2 and min(y1,y2)<=y<max(y1,y2): intersections.append(x1)
            intersections.sort()
            if len(intersections)%2: raise ValueError('SILHOUETTE_ODD_INTERSECTIONS')
            for i in range(0,len(intersections),2):
                lo,hi=intersections[i:i+2]
                if lo<0 or hi>width: raise ValueError('SILHOUETTE_OUT_OF_BOUNDS')
                for x in range(lo,hi): counts[y*width+x]+=sign
    if any(n<0 for n in counts): raise ValueError('SILHOUETTE_INVALID_WINDING')
    return bytes(1 if n else 0 for n in counts)
