import sys, io, urllib.request, collections
from PIL import Image
urls=[l.strip() for l in open(sys.argv[1])]
for i in [int(x) for x in sys.argv[2].split(",")]:
    im=Image.open(io.BytesIO(urllib.request.urlopen(urls[i],timeout=30).read())).convert("RGB")
    im.thumbnail((200,200))
    c=collections.Counter(im.getdata())
    tops=[(rgb,n) for rgb,n in c.most_common(4000)]
    # most saturated frequent colors
    def sat(t):
        r,g,b=t; mx,mn=max(t),min(t); return (mx-mn)/(mx+1)
    sel=sorted([t for t in tops if sat(t[0])>0.35 and 40<sum(t[0])/3<200], key=lambda t:-t[1])[:6]
    print(i, [( "%02X%02X%02X"%rgb, n) for rgb,n in sel])
