# Siege prototype: one script for the Design canvas, and its live artboard.
#   python3 docs/design/prototypes/siege/build.py [bundle_url]   → docs/design/prototypes/siege/build/ (not committed)
# sg-bundle.js  three r146 + BufferGeometryUtils + RoundedBoxGeometry + OrbitControls + src/world/kit.js (the lens)
#               + the demo's model kit (docs/phases/v2-gameplay/demo1/src/hn-models.js) + sg-*.js, in load order
# Main.dc.html  the live artboard (1280 × 720): the scene, view buttons, labels; loads the bundle from bundle_url
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(HERE, 'build')
os.makedirs(OUT, exist_ok=True)

parts = ['node_modules/three/build/three.min.js', 'node_modules/three/examples/js/utils/BufferGeometryUtils.js',
         'node_modules/three/examples/js/geometries/RoundedBoxGeometry.js', 'node_modules/three/examples/js/controls/OrbitControls.js',
         'src/world/kit.js', 'docs/phases/v2-gameplay/demo1/src/hn-models.js']
paths = [os.path.join(ROOT, p) for p in parts] + [os.path.join(HERE, n) for n in ('sg-nature.js', 'sg-siege.js', 'sg-camp.js', 'sg-main.js')]
with open(os.path.join(OUT, 'sg-bundle.js'), 'w', encoding='utf-8') as f:
    for p in paths:
        f.write('/* ---- %s ---- */\n' % os.path.relpath(p, ROOT)); f.write(open(p, encoding='utf-8').read()); f.write('\n;\n')

bundle = sys.argv[1] if len(sys.argv) > 1 else 'sg-bundle.js'
html = open(os.path.join(HERE, 'artboard.dc.html'), encoding='utf-8').read().replace('__BUNDLE__', bundle)
open(os.path.join(OUT, 'Main.dc.html'), 'w', encoding='utf-8').write(html)
for n in ('sg-bundle.js', 'Main.dc.html'):
    print('%-14s %9d bytes' % (n, os.path.getsize(os.path.join(OUT, n))))
