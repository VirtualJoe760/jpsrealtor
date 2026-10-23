import sys, io, urllib.request
from PIL import Image, ImageDraw
urls = [l.strip() for l in open(sys.argv[1]) if l.strip()]
out = sys.argv[2]; cols = int(sys.argv[3]); start = int(sys.argv[4])
CW, CH = 640, 480
rows = (len(urls) + cols - 1) // cols
sheet = Image.new("RGB", (cols*CW, rows*CH), (20,20,20)); d = ImageDraw.Draw(sheet)
for i,u in enumerate(urls):
    try:
        im = Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=30).read())).convert("RGB")
        im.thumbnail((CW-4, CH-4))
        x,y = (i%cols)*CW, (i//cols)*CH
        sheet.paste(im,(x+2,y+2))
        d.rectangle([x+2,y+2,x+60,y+34], fill=(0,0,0))
        d.text((x+10,y+12), str(i+start), fill=(255,220,0))
    except Exception as e: print(i+start,"FAIL",e)
sheet.save(out, quality=88); print("wrote", out, sheet.size)
