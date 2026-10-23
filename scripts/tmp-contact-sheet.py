# Scratch: build a numbered contact sheet from listing photo URLs. Safe to delete.
import sys, io, urllib.request
from PIL import Image, ImageDraw

urls = [l.strip() for l in open(sys.argv[1]) if l.strip()]
out = sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
CW, CH = 320, 240

rows = (len(urls) + cols - 1) // cols
sheet = Image.new("RGB", (cols * CW, rows * CH), (20, 20, 20))
d = ImageDraw.Draw(sheet)

for i, u in enumerate(urls):
    try:
        raw = urllib.request.urlopen(u, timeout=30).read()
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((CW - 4, CH - 4))
        x, y = (i % cols) * CW, (i // cols) * CH
        sheet.paste(im, (x + 2, y + 2))
        d.rectangle([x + 2, y + 2, x + 34, y + 24], fill=(0, 0, 0))
        d.text((x + 8, y + 8), str(i), fill=(255, 220, 0))
    except Exception as e:
        print(f"{i} FAIL {e}")

sheet.save(out, quality=88)
print("wrote", out, sheet.size)
