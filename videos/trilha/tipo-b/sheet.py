import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; sel = sys.argv[2].split(',') if len(sys.argv) > 2 else None
fs = sorted(f for f in os.listdir(d) if f.startswith('frame'))
if sel: fs = [f for f in fs if any(f.endswith(f'at-{x}s.png') for x in sel)]
rows = []
for f in fs:
    im = Image.open(os.path.join(d, f)); s = im.size[0] / 1080
    a = im.crop((0, int(470 * s), im.size[0], int(875 * s))).resize((540, 203))
    b = im.crop((0, int(885 * s), im.size[0], int(1290 * s))).resize((540, 203))
    r = Image.new('RGB', (1080, 203)); r.paste(a, (0, 0)); r.paste(b, (540, 0)); ImageDraw.Draw(r).text((480, 4), f[9:-4], fill='yellow'); rows.append(r)
out = Image.new('RGB', (1080, 206 * len(rows)))
for i, r in enumerate(rows): out.paste(r, (0, i * 206))
out.save(os.path.join(d, 'sheet.png'))
