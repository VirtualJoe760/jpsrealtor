# Scratch: crop the top-left corner of every listing photo into one strip so a
# burned-in "Digitally Altered" watermark is readable. Invisible at contact-sheet
# size — 4140 E Calle San Antonio's rendered pool sailed through as photo #7.
#   node scripts/tmp-photo-urls.js <listingKey> > urls.txt
#   python scripts/tmp-watermark-strip.py urls.txt out.jpg
import sys, io, urllib.request
from PIL import Image, ImageDraw

urls = [l.strip() for l in open(sys.argv[1]) if l.strip()]
CW, CH, cols = 400, 60, 4
rows = (len(urls) + cols - 1) // cols
sheet = Image.new("RGB", (cols * CW, rows * CH), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, u in enumerate(urls):
    try:
        im = Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=30).read())).convert("RGB")
        crop = im.crop((0, 0, int(im.width * 0.30), int(im.height * 0.06))).resize((CW - 46, CH - 6))
        x, y = (i % cols) * CW, (i // cols) * CH
        sheet.paste(crop, (x + 44, y + 3))
        d.rectangle([x + 2, y + 3, x + 42, y + CH - 4], fill=(0, 0, 0))
        d.text((x + 8, y + 22), str(i), fill=(255, 220, 0))
    except Exception as e:
        print(i, "FAIL", e)
sheet.save(sys.argv[2], quality=92)
print("wrote", sys.argv[2], sheet.size)
