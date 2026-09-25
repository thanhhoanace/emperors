// Baked map (tools/bake-map.mjs → assets/map/) agrees with data/world.json; Claude's lane (docs/product/lanes.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MAP = path.join(ROOT, 'assets/map');
const meta = JSON.parse(fs.readFileSync(path.join(MAP, 'meta.json'), 'utf8'));
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/world.json'), 'utf8'));

// Albers equal-area conic, as in bake-map.mjs and Terrain.projection (terrain-real.js)
const albers = (P) => {
  const r = Math.PI / 180, n = (Math.sin(P.lat1 * r) + Math.sin(P.lat2 * r)) / 2, C = Math.cos(P.lat1 * r) ** 2 + 2 * n * Math.sin(P.lat1 * r);
  const fwd = (lon, lat) => { const t = n * (lon - P.lon0) * r, p = (P.R * Math.sqrt(C - 2 * n * Math.sin(lat * r))) / n; return [p * Math.sin(t), -p * Math.cos(t)]; };
  const [ox, oy] = fwd(P.originLon, P.originLat);
  return (lon, lat) => { const [x, y] = fwd(lon, lat); return [(x - ox) / P.kmPerUnit, -(y - oy) / P.kmPerUnit]; };
};

test('map: Albers projection, every seat baked where world.json puts it', () => {
  assert.equal(meta.projection.type, 'albers');
  const toWorld = albers(meta.projection);
  for (const p of world.provinces) {
    const c = meta.cities[p.id], [x, z] = toWorld(...p.lonlat);
    assert.ok(c, `${p.id} missing from meta.json: re-run node tools/bake-map.mjs`);
    assert.ok(Math.hypot(c.x - x, c.z - z) < 0.05, `${p.id} moved in world.json (lonlat) since the last bake`);
    const F = meta.height.fine;
    assert.ok(c.x > F.x0 && c.x < F.x0 + F.w && c.z > F.z0 && c.z < F.z0 + F.d, `${p.id} outside the detailed core`);
  }
});

test('map: fine tiles, coarse grid and land mask are all there', () => {
  const F = meta.height.fine, L = meta.land;
  for (let tj = 0; tj < F.tilesZ; tj++) for (let ti = 0; ti < F.tilesX; ti++) assert.ok(fs.existsSync(path.join(MAP, `height-fine-${tj}-${ti}.bin.gz`)), `tile ${tj}-${ti}`);
  const coarse = zlib.gunzipSync(fs.readFileSync(path.join(MAP, 'height-coarse.bin.gz')));
  assert.equal(coarse.length, meta.height.coarse.nx * meta.height.coarse.nz * 2);
  const land = zlib.gunzipSync(fs.readFileSync(path.join(MAP, L.file)));
  assert.equal(land.length, L.nx * L.nz * 4);
  for (const p of world.provinces) { // every seat lies inside present-day China (land mask A)
    const c = meta.cities[p.id], i = Math.round((c.x - L.x0) / L.step), j = Math.round((c.z - L.z0) / L.step);
    assert.ok(land[(j * L.nx + i) * 4 + 3] > 128, `${p.id} outside China on the land mask`);
  }
});
