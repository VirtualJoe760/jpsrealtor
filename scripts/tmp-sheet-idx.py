# Scratch: contact sheet from a url file + explicit index list, labelled with the ORIGINAL index.
import sys, io, urllib.request
from PIL import Image, ImageDraw
urls = [l.strip() for l in open(sys.argv[1]) if l.strip()]
out = sys.argv[2]
idxs = [int(x) for x in sys.argv[3].split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
CW, CH = 640, 480
rows = (len(idxs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * CW, rows * CH), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(idxs):
    try:
        raw = urllib.request.urlopen(urls[n], timeout=30).read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((CW - 4, CH - 4))
        x, y = (i % cols) * CW, (i // cols) * CH
        sheet.paste(im, (x + 2, y + 2))
        d.rectangle([x + 2, y + 2, x + 60, y + 34], fill=(0, 0, 0))
        d.text((x + 10, y + 12), str(n), fill=(255, 220, 0))
    except Exception as e:
        print(f"{n} FAIL {e}")
sheet.save(out, quality=90)
print("wrote", out, sheet.size)
