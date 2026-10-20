// Pure helpers of src/world/paper.js (the v3 paper-cut diorama): noise, polylines, the contour slicer, terrain, geometry builder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';
const require = createRequire(import.meta.url);
const K = require(path.join(ROOT, 'src/world/paper.js'));
const U = K._;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenario/huainan.json'), 'utf8'));
const towns = data.towns.map((d) => ({ id: d.id, name: d.name, x: d.xz[0], z: d.xz[1], level: d.id === 'hu_di' ? 3 : 2, river: d.river }));

test('rng and noise are seeded and deterministic', () => {
  const a = U.rng(5), b = U.rng(5), c = U.rng(6);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [c(), c(), c()]);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
  assert.equal(U.fbm(3.3, 4.1, 9), U.fbm(3.3, 4.1, 9));
  assert.ok(U.fbm(1.7, 2.2, 3) >= 0 && U.fbm(1.7, 2.2, 3) <= 1);
});

test('polyline: length, point at arc length, nearest point', () => {
  const P = U.polyPrep([[0, 0], [10, 0], [10, 10]]);
  assert.equal(P.length, 20);
  const m = U.polyAt(P, 15);
  assert.ok(Math.abs(m.x - 10) < 1e-9 && Math.abs(m.z - 5) < 1e-9 && m.tz === 1);
  const n = U.polyNearest(P, 4, 3);
  assert.ok(Math.abs(n.d - 3) < 1e-9 && Math.abs(n.s - 4) < 1e-9);
  assert.equal(U.polyAt(P, -5).s, 0);
  assert.equal(U.polyAt(P, 99).s, 20);
});

test('sliceCell: full, empty, half and corner cells', () => {
  const area = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p.x * q.z - q.x * p.z; } return Math.abs(s) / 2; };
  const full = U.sliceCell(0, 0, 2, 2, 1, 1, 1, 1);
  assert.equal(full.length, 4); assert.ok(full.every((p) => !p.c)); assert.equal(area(full), 4);
  assert.equal(U.sliceCell(0, 0, 2, 2, -1, -1, -1, -1).length, 0);
  const half = U.sliceCell(0, 0, 2, 2, 1, -1, -1, 1); // left half inside
  assert.ok(Math.abs(area(half) - 2) < 1e-9); assert.equal(half.filter((p) => p.c).length, 2);
  const corner = U.sliceCell(0, 0, 2, 2, 1, -1, -1, -1); // one corner: a triangle with legs 1
  assert.equal(corner.length, 3); assert.ok(Math.abs(area(corner) - 0.5) < 1e-9);
  for (const p of corner.filter((q) => q.c)) assert.ok(Math.abs(p.x - 1) < 1e-9 || Math.abs(p.z - 1) < 1e-9);
});

test('contourLevel: a disc field gives a closed cut edge whose length is about the circumference', () => {
  const B = { x0: 0, x1: 40, z0: 0, z1: 40 };
  const F = U.makeField((x, z) => 3 - Math.hypot(x - 20, z - 20) / 5, B, 0.5); // h = 3 at the centre, 1 at r = 10
  let wallLen = 0, tops = 0, area = 0;
  U.contourLevel(F, 1, (poly) => { tops++; for (let i = 1; i + 1 < poly.length; i++) area += Math.abs((poly[i].x - poly[0].x) * (poly[i + 1].z - poly[0].z) - (poly[i + 1].x - poly[0].x) * (poly[i].z - poly[0].z)) / 2; },
    (a, b, ox, oz) => {
      wallLen += Math.hypot(a.x - b.x, a.z - b.z);
      let nx = -(b.z - a.z), nz = b.x - a.x; if (nx * ox + nz * oz < 0) { nx = -nx; nz = -nz; } // the wall's normal on the side the hint points to
      const mx = (a.x + b.x) / 2 - 20, mz = (a.z + b.z) / 2 - 20;
      assert.ok(nx * mx + nz * mz > -1e-6, 'wall faces outwards');
    });
  assert.ok(Math.abs(wallLen - 2 * Math.PI * 10) < 1.2, 'wallLen ' + wallLen);
  assert.ok(tops > 0);
  // layer 1 covers the disc r < 10 but the cells fully under layer 2 (r < 5) draw no top: the visible ring is about the area of r<10 minus r<5
  assert.ok(Math.abs(area - Math.PI * (100 - 25)) < 14, 'area ' + area);
});

test('edgeInterval', () => {
  assert.deepEqual(U.edgeInterval(1, 2), [0, 1]);
  assert.equal(U.edgeInterval(-1, -2), null);
  assert.deepEqual(U.edgeInterval(1, -1), [0, 0.5]);
  assert.deepEqual(U.edgeInterval(-1, 1), [0.5, 1]);
});

test('terrain: river beds are below the first layer, towns stand on their own flat level', () => {
  const T = U.makeTerrain({ towns, seed: 7 });
  for (const r of T.rivers) for (const s of [20, 50, 80]) {
    const p = U.polyAt(r.P, Math.min(s, r.P.length));
    if (p.x < K.BOUNDS.x0 || p.x > K.BOUNDS.x1 || p.z < K.BOUNDS.z0 || p.z > K.BOUNDS.z1) continue;
    assert.ok(T.h(p.x, p.z) < 1, `${r.id} bed at s=${s}`);
  }
  for (const t of towns) {
    for (const [dx, dz] of [[0, 0], [3, 2], [-4, 1], [2, -4]]) {
      const h = T.h(t.x + dx, t.z + dz);
      assert.equal(Math.floor(h), t.level, `${t.id} plateau at ${dx},${dz}: h=${h}`);
    }
  }
  assert.equal(T.h(150, -30), T.h(150, -30));
});

test('rivers keep clear of the towns (a plateau and a river strip never overlap)', () => {
  const T = U.makeTerrain({ towns, seed: 7 });
  for (const t of towns) for (const r of T.rivers) assert.ok(U.polyNearest(r.P, t.x, t.z).d > r.hw + 1.7 + U.PLATEAU.r1 - 1, `${t.id} / ${r.id}`);
});

test('Builder: flat normals face the requested direction; counts triangles', () => {
  const B = new K.Builder();
  B.tri([0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  B.tri([0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 0], [0, 1, 0]);
  assert.equal(B.tris, 2);
  assert.deepEqual(B.n.slice(0, 3).map((v) => v + 0), [0, 1, 0]); assert.deepEqual(B.n.slice(9, 12).map((v) => v + 0), [0, 1, 0]);
  B.tri([0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 1]); // degenerate: skipped
  assert.equal(B.tris, 2);
  assert.equal(B.p.length, B.n.length); assert.equal(B.p.length, B.c.length);
});

test('buildStatic: every tier stays far inside the 0005 budget and is deterministic', () => {
  const budget = { low: 1.0e6, mid: 2.0e6, high: 3.0e6 }, tris = {};
  for (const tier of ['low', 'mid', 'high']) {
    const o = K.buildStatic({ tier, pal: K.palette('autumn'), towns, seed: 7 });
    const n = o.terrain.tris + o.river.tris + o.mtn.tris + o.props.tris + o.back.tris;
    tris[tier] = n; assert.ok(n < budget[tier] / 5, `${tier}: ${n} triangles`);
    for (const b of [o.terrain, o.river, o.mtn, o.props, o.back]) for (const v of b.p) assert.ok(Number.isFinite(v));
  }
  assert.ok(tris.low < tris.mid && tris.mid < tris.high);
  const a = K.buildStatic({ tier: 'low', pal: K.palette('winter'), towns, seed: 7 }), b = K.buildStatic({ tier: 'low', pal: K.palette('winter'), towns, seed: 7 });
  assert.deepEqual(a.props.p, b.props.p);
});

test('palettes: four seasons, every colour a valid [r,g,b]', () => {
  for (const name of ['spring', 'summer', 'autumn', 'winter']) {
    const p = K.palette(name);
    assert.equal(p.terrain.length, 8);
    for (const c of [...p.terrain, ...p.river, ...p.trees, p.sand, p.wall, p.roof, p.peak, ...p.mtnBase]) assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 1), name);
  }
});
