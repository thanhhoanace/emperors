// src/world/nature.js: Nature.land(spec) puts the river, tributary, hills and camp on the asked sides, and the default
// spec reproduces the approved prototype's land (docs/design/prototypes/siege/sg-nature.js). Claude's lane.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// the classic scripts run in this process' own realm (node --test gives every file its own process): three.js sets
// globalThis.THREE, nature.js window.Nature, the prototype window.SGN. A vm context would be ~30 times slower here.
globalThis.window = globalThis;
for (const f of ['node_modules/three/build/three.min.js', 'src/world/nature.js', 'docs/design/prototypes/siege/sg-nature.js']) new Function(fs.readFileSync(path.join(ROOT, f), 'utf8'))();
const { Nature, SGN } = globalThis;

test('nature: the default land is the prototype land', () => {
  const A = Nature.land(), B = SGN.land();
  for (const k of ['HC', 'MOAT0', 'MOAT1', 'WATER', 'EXT', 'CAMP_GATE']) assert.equal(A[k], B[k], k);
  assert.equal(JSON.stringify([A.CAMP, A.CAMP_R]), JSON.stringify([B.CAMP, B.CAMP_R]));
  assert.equal(A.roads.length, B.roads.length);
  A.roads.forEach((r, i) => assert.equal(JSON.stringify(r), JSON.stringify(B.roads[i]), `road ${i}`));
  for (let k = 0; k < 400; k++) {
    const x = ((k * 7919) % 3000) - 1500, z = ((k * 104729) % 3000) - 1500;
    for (const f of ['h', 'riverSD', 'waterSD', 'hills', 'trampled', 'campIn', 'woodAt', 'fieldAt']) assert.equal(A[f](x, z), B[f](x, z), `${f}(${x}, ${z})`);
    assert.equal(Math.min(80, A.roadD(x, z)), Math.min(80, B.roadD(x, z)), `roadD(${x}, ${z})`);
    assert.equal(A.huaiZ(x), B.huaiZ(x)); assert.equal(A.feiX(z), B.feiX(z));
  }
  assert.ok(Buffer.from(A.landData).equals(Buffer.from(B.landTex.image.data)), 'land-use texture');
});

test('nature: sides of the river, tributary, hills and camp', () => {
  const EXT = 800; // a smaller land-use square: faster
  const wet = (L, [x, z]) => L.riverSD(x, z) < 0;
  // default: the big river 660 m north, the tributary 480 m west
  const D = Nature.land({ EXT });
  assert.ok(wet(D, D.riverAt(0)) && D.riverAt(0)[1] < -500, 'river north');
  assert.ok(wet(D, D.tribAt(100)) && D.tribAt(100)[0] < -350, 'tributary west');
  assert.ok(D.riverSD(0, 0) > 100 && D.riverSD(0, 700) > 100, 'no water south');
  // river east, tributary east (moved off the river's side), hills south-west, camp north-west
  const L = Nature.land({ EXT, river: 'e', tributary: 'e', hills: 'sw', camp: 'nw' });
  assert.equal(JSON.stringify(L.sides), JSON.stringify({ river: 'e', tributary: 's', hills: 'sw', camp: 'nw' }));
  assert.ok(wet(L, L.riverAt(0)) && L.riverAt(0)[0] > 500, 'river east');
  assert.ok(L.riverSD(0, -620) > 100, 'no river north');
  assert.ok(wet(L, L.tribAt(-100)) && L.tribAt(-100)[1] > 350, 'tributary south');
  assert.ok(L.hills(-900, 230) > 50 && L.hills(900, -230) === 0, 'hills south-west');
  assert.ok(L.campIn(-650, -885) > 0 && L.campIn(650, 885) < 0 && L.CAMP_FACE === 's', 'camp north-west');
  assert.ok(L.trampled(0, -(L.HC + 200)) > 0.3 && L.trampled(0, L.HC + 200) < 0.3, 'siege ground on the camp side');
  // no river, no tributary, no hills
  const N = Nature.land({ EXT, river: null, tributary: null, hills: null, HC: 150 });
  assert.equal(N.HC, 150); assert.equal(N.MOAT1, 204);
  assert.ok(N.riverSD(0, -620) > 1e8 && N.riverSD(-480, 0) > 1e8, 'dry');
  assert.ok(N.waterSD(177, 0) < 0, 'the moat still holds water');
  assert.equal(N.hills(900, -230), 0);
  // a road out of every side; the one on the river's side stops at the bank
  for (const S of [D, L, N]) assert.equal(S.roads.length, 4);
  const end = L.roads[1][L.roads[1].length - 1]; // east road, on the river's side
  assert.ok(Math.abs(L.riverSD(end[0], end[1])) < 10, 'east road ends at the river');
});
