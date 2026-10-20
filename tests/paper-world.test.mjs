// v3 paper, the whole map (src/world/paper-world.js) and the Han paper town (src/world/paper.js hanTown): pure parts.
// The real bake is loaded with the page's own loader (src/world/terrain.js + terrain-real.js in a vm, files for fetch).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';
const require = createRequire(import.meta.url);
const PK = require(path.join(ROOT, 'src/world/paper.js'));
const PW = require(path.join(ROOT, 'src/world/paper-world.js'));
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/world.json'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cities.json'), 'utf8')).cities;

async function loadBaked() {
  const ctx = { console, performance, Response, DecompressionStream, Math, Float32Array, Int16Array, Uint8Array, Int32Array, Promise };
  ctx.fetch = async (u) => new Response(fs.readFileSync(path.join(ROOT, u)));
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['src/world/terrain.js', 'src/world/terrain-real.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const baked = await ctx.Terrain.loadBaked('assets/map/', { tiles: () => false });
  return { baked, proj: ctx.Terrain.projection(baked.meta.projection) };
}

test('hanTown: five levels, each larger than the last, deterministic, plate and flag reported', () => {
  let last = 0;
  for (let lv = 0; lv <= 4; lv++) {
    const a = new PK.Builder(), b = new PK.Builder();
    const ra = PK._.hanTown(a, { level: lv, seed: 'x', x: 10, y: 2, z: -5, scale: 1.2 }), rb = PK._.hanTown(b, { level: lv, seed: 'x', x: 10, y: 2, z: -5, scale: 1.2 });
    assert.deepEqual(a.p, b.p, 'seeded layout');
    assert.ok(a.tris > last, `level ${lv} has more parts than level ${lv - 1}`); last = a.tris;
    assert.ok(a.tris < 16000, 'a town stays light');
    assert.ok(Math.abs(ra.plate - PK._.townPlate(lv) * 1.2) < 1e-9);
    assert.ok(ra.flagAt[1] > 2, 'the banner stands above the plate');
    // every vertex inside the plate's square
    for (let i = 0; i < a.p.length; i += 3) { assert.ok(Math.abs(a.p[i] - 10) <= ra.plate + 0.4 * 1.2 + 1e-6); assert.ok(Math.abs(a.p[i + 2] + 5) <= ra.plate + 0.4 * 1.2 + 1e-6); }
    void rb;
  }
});

test('town levels from data/cities.json ranks', () => {
  assert.equal(PW.townLevel('capital', 'si_li'), 4);
  assert.equal(PW.townLevel('provincial', 'yi'), 3);
  assert.equal(PW.townLevel('provincial', 'hexi'), 2);
  assert.equal(PW.townLevel('fort', 'jiang'), 1);
});

test('chamfer distance and layer heights', () => {
  const G = PW._.grid({ x0: 0, x1: 10, z0: 0, z1: 10 }, 1), src = new Uint8Array(G.N); src[0] = 1;
  const d = PW._.chamfer(G, src);
  assert.equal(d[0], 0); assert.equal(d[5], 5); assert.ok(Math.abs(d[G.W * 3 + 3] - 3 * Math.SQRT2) < 1e-5);
  assert.ok(PW.layerY(4) === 0 && PW.layerY(3) < 0 && PW.layerY(10) > PW.layerY(9));
  assert.ok(PW._.gOfMetres(0) < 5 && PW._.gOfMetres(4000) > 10);
});

test('partition and borders on a synthetic world: two seats, a ridge between them', () => {
  const S = { H: (x, z) => (Math.abs(x) < 3 ? 0.1 + 900 * 0.003 : 0.4), L: () => [0, 0, 0, 255], metres: (h) => (h - 0.1) / 0.003 };
  const B = { x0: -40, x1: 40, z0: -20, z1: 20 }, seats = [{ id: 'a', x: -20, z: 0 }, { id: 'b', x: 20, z: 0 }];
  const P = PW.partition(S, seats, B, 2, 1e6);
  assert.equal(P.at(-30, 5), 0); assert.equal(P.at(30, -5), 1);
  const lines = PW.borders(P);
  assert.ok(lines.length >= 1);
  const main = lines.reduce((a, b) => (b.pts.length > a.pts.length ? b : a));
  for (const p of main.pts) assert.ok(Math.abs(p[0]) < 3, 'the border runs along the ridge');
  assert.deepEqual([main.a, main.b].sort(), [0, 1]);
});

test('the whole map: builds from the real bake, every seat a town on land, within the 0005 budget, deterministic', async () => {
  const { baked, proj } = await loadBaked();
  const spec = { baked, proj, world, cities, water: baked.water, tier: 'low', season: 'autumn' };
  const a = PW.buildWorld(spec), b = PW.buildWorld(spec);
  assert.equal(a.seats.length, 20);
  assert.equal(a.tris, b.tris);
  assert.deepEqual(a.terrain.p.slice(0, 300), b.terrain.p.slice(0, 300));
  assert.ok(a.tris < 1e6 * 0.8, `low tier static triangles ${a.tris}`);
  for (const t of a.seats) {
    assert.ok(t.k >= 4, `${t.id} stands on land (layer ${t.k})`);
    assert.ok(t.info && t.info.plate > 3, `${t.id} has a town`);
    assert.equal(a.P.at(t.x, t.z), a.seats.indexOf(t), `${t.id} lies in its own province`);
  }
  const own = Object.fromEntries(a.seats.map((t) => [t.id, t.owner]));
  assert.equal(own.huai, 'zhu_yuanzhang'); assert.equal(own.yi, 'liu_bei'); assert.equal(own.you, 'neutral');
  // the big rivers and lakes are there
  for (const n of ['Huang', 'Yangtze', 'Huai', 'Han']) assert.ok(a.rivers.some((r) => r.name === n), n);
  for (const n of ['Dongting Hu', 'Poyang Hu', 'Tai Hu']) assert.ok(a.lakes.some((l) => l.name === n), n);
  assert.ok(a.peaks.length > 60, 'origami ranges');
});
