# Scratch: large-cell contact sheet for judging a shortlist frame by frame.
import sys, io, urllib.request
from PIL import Image, ImageDraw
urls = [l.strip() for l in open(sys.argv[1]) if l.strip()]
labels = sys.argv[3].split(",") if len(sys.argv) > 3 else [str(i) for i in range(len(urls))]
CW, CH, cols = 700, 530, 2
rows = (len(urls) + cols - 1) // cols
sheet = Image.new("RGB", (cols * CW, rows * CH), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, u in enumerate(urls):
    im = Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=30).read())).convert("RGB")
    im.thumbnail((CW - 8, CH - 8))
    x, y = (i % cols) * CW, (i // cols) * CH
    sheet.paste(im, (x + 4, y + 4))
    d.rectangle([x + 4, y + 4, x + 60, y + 34], fill=(0, 0, 0))
    d.text((x + 14, y + 14), labels[i], fill=(255, 220, 0))
sheet.save(sys.argv[2], quality=90)
print("wrote", sys.argv[2], sheet.size)
