# Demo 1 (phase v2-gameplay): rebuild what the Design canvas carries, into demo1/build/ (not committed).
#   python3 docs/phases/v2-gameplay/demo1/build.py [bundle_blob_url map_blob_url]
# hn-map.png   assets/map/*.bin.gz, gzip bytes untouched, packed 3 per pixel (a canvas takes images, not .gz)
# hn-data.js   data/world.json, data/cities.json, assets/map/meta.json + water.json, the PNG's index
# hn-bundle.js three r146 + BufferGeometryUtils + src/world (unchanged) + hn-data + src/hn-*.js, in load order
# Main.dc.html the artboard: ui/template.html + ui/component.js, pointing at the two uploaded assets
import os, sys, json, math
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
OUT = os.path.join(HERE, 'build')
os.makedirs(OUT, exist_ok=True)

# 1. the baked map as one PNG
src = os.path.join(ROOT, 'assets/map')
names = sorted(f for f in os.listdir(src) if f.endswith('.bin.gz'))
blob, index = bytearray(), {}
for n in names:
    b = open(os.path.join(src, n), 'rb').read()
    index[n] = [len(blob), len(b)]
    blob += b
W = 1024
H = math.ceil(math.ceil(len(blob) / 3) / W)
blob += bytes(W * H * 3 - len(blob))
Image.frombytes('RGB', (W, H), bytes(blob)).save(os.path.join(OUT, 'hn-map.png'), optimize=False, compress_level=6)

# 2. the data the world runtime reads
rd = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
data = {'world': rd('data/world.json'), 'cities': rd('data/cities.json')['cities'], 'meta': rd('assets/map/meta.json'), 'water': rd('assets/map/water.json'), 'index': {'w': W, 'h': H, 'files': index}}
with open(os.path.join(OUT, 'hn-data.js'), 'w', encoding='utf-8') as f:
    f.write('// Demo 1 data: data/world.json, data/cities.json, assets/map/meta.json + water.json, hn-map.png index.\n')
    f.write('window.HN_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

# 3. one script, in load order (a canvas may load several scripts out of order)
parts = ['node_modules/three/build/three.min.js', 'node_modules/three/examples/js/utils/BufferGeometryUtils.js'] + ['src/world/' + n for n in ('kit.js', 'city.js', 'hancity.js', 'terrain.js', 'terrain-real.js', 'flora.js', 'names.js', 'world-runtime.js')]
paths = [os.path.join(ROOT, p) for p in parts] + [os.path.join(OUT, 'hn-data.js')] + [os.path.join(HERE, 'src', n) for n in ('hn-boot.js', 'hn-scene.js', 'hn-rules.js')]
with open(os.path.join(OUT, 'hn-bundle.js'), 'w', encoding='utf-8') as f:
    for p in paths:
        f.write('/* ---- %s ---- */\n' % os.path.basename(p)); f.write(open(p, encoding='utf-8').read()); f.write('\n;\n')

# 4. the artboard
bundle_url, map_url = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ('hn-bundle.js', 'hn-map.png')
tpl = open(os.path.join(HERE, 'ui/template.html'), encoding='utf-8').read().strip()
comp = open(os.path.join(HERE, 'ui/component.js'), encoding='utf-8').read().replace("'__MAP_PNG__'", "'%s'" % map_url)
html = ('<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<title>Một mùa ở Hoài Nam</title>\n<script src="./support.js"></script>\n'
        '<script src="%s"></script>\n</head>\n<body>\n' % bundle_url) + tpl + (
        '\n<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":844,"height":390}}\'>\n'
        '// Demo 1 (phase v2-gameplay). Sources: docs/phases/v2-gameplay/demo1/ in the repo.\n') + comp.strip() + '\n</script>\n</body>\n</html>\n'
open(os.path.join(OUT, 'Main.dc.html'), 'w', encoding='utf-8').write(html)
for n in ('hn-map.png', 'hn-data.js', 'hn-bundle.js', 'Main.dc.html'):
    print('%-14s %9d bytes' % (n, os.path.getsize(os.path.join(OUT, n))))
