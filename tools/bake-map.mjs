// Bakes the real-geography campaign map into assets/map/ (run once; outputs are committed).
//
//   node tools/bake-map.mjs            downloads into .cache/ on first run (curl, ~25 MB), then bakes
//
// Sources (see assets/SOURCE.md):
//   - elevation: AWS Terrain Tiles, "terrarium" PNG z7 (Mapzen/Tilezen; SRTM, ETOPO1, GMTED… open data)
//   - rivers, lakes: Natural Earth 10 m (public domain), via github.com/nvkelso/natural-earth-vector
//
// Outputs:
//   height-fine.bin.gz    playable map grid (0.5 world units), height in steps of 0.005 units (≈1.7 m),
//                         2-D delta + zigzag, low bytes then high bytes, gzip (≈1.8 MB instead of 4.2 MB raw)
//   height-coarse.bin.gz  same encoding, 2-unit grid out to the horizon
//   (decoder: Terrain.loadBaked in docs/design/prototypes/terrain-real.js)
//   water.json         rivers (world polylines with water-surface height and half-width) and lakes
//   meta.json          projection, grids, attribution
//
// World units: x east, z south, 1 unit = 3 km; heights exaggerated about 9× like every strategy map.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE = path.join(ROOT, '.cache', 'map');
const OUT = path.join(ROOT, 'assets', 'map');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- projection
const LON0 = 112, LAT0 = 32, KM_PER_UNIT = 3;
const KX = (111.32 * Math.cos((LAT0 * Math.PI) / 180)) / KM_PER_UNIT; // world units per degree of longitude
const KZ = 110.57 / KM_PER_UNIT; // per degree of latitude
const toWorld = (lon, lat) => [(lon - LON0) * KX, (LAT0 - lat) * KZ];
const toLonLat = (x, z) => [LON0 + x / KX, LAT0 - z / KZ];
const FINE = { x0: -345, z0: -375, w: 675, d: 780, step: 0.5 };
const COARSE = { x0: -540, z0: -520, w: 1060, d: 1120, step: 2 };
for (const g of [FINE, COARSE]) { g.nx = Math.round(g.w / g.step) + 1; g.nz = Math.round(g.d / g.step) + 1; }
// elevation (m) → world height; sea floor kept shallow so coasts read at map scale
const heightOf = (m) => (m > 0 ? 0.1 + m * 0.003 : Math.max(-6, m * 0.008));

// ---------------------------------------------------------------- downloads
function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  execFileSync('curl', ['-sSf', '-m', '120', '-o', file, url]);
}
const Z = 7, TX0 = 97, TX1 = 109, TY0 = 45, TY1 = 58;
console.log('tiles…');
for (let x = TX0; x <= TX1; x++) for (let y = TY0; y <= TY1; y++) download(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`, path.join(CACHE, 'terrarium', `${Z}_${x}_${y}.png`));
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
for (const f of ['ne_10m_rivers_lake_centerlines', 'ne_10m_lakes']) download(NE + f + '.geojson', path.join(CACHE, f + '.geojson'));

// ---------------------------------------------------------------- minimal PNG decoder (8-bit RGB/RGBA, no interlace)
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported png'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}

// ---------------------------------------------------------------- elevation mosaic (web-mercator pixels)
console.log('mosaic…');
const MW = (TX1 - TX0 + 1) * 256, MH = (TY1 - TY0 + 1) * 256, elev = new Float32Array(MW * MH);
for (let x = TX0; x <= TX1; x++) for (let y = TY0; y <= TY1; y++) {
  const t = decodePNG(fs.readFileSync(path.join(CACHE, 'terrarium', `${Z}_${x}_${y}.png`)));
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const o = (j * 256 + i) * t.bpp, v = t.data[o] * 256 + t.data[o + 1] + t.data[o + 2] / 256 - 32768;
    elev[((y - TY0) * 256 + j) * MW + (x - TX0) * 256 + i] = v;
  }
}
const N2 = 2 ** Z * 256;
function elevAt(lon, lat) {
  const px = ((lon + 180) / 360) * N2 - TX0 * 256, s = Math.sin((lat * Math.PI) / 180);
  const py = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * N2 - TY0 * 256;
  const x = Math.max(0, Math.min(MW - 1.001, px)), y = Math.max(0, Math.min(MH - 1.001, py)), i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
  const e = (a, b) => elev[b * MW + a];
  return (e(i, j) * (1 - u) + e(i + 1, j) * u) * (1 - v) + (e(i, j + 1) * (1 - u) + e(i + 1, j + 1) * u) * v;
}
function grid(g) {
  const h = new Float32Array(g.nx * g.nz);
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) { const [lon, lat] = toLonLat(g.x0 + i * g.step, g.z0 + j * g.step); h[j * g.nx + i] = heightOf(elevAt(lon, lat)); }
  return h;
}
const fine = grid(FINE), coarse = grid(COARSE);
const sampleH = (g, h, x, z) => { const fx = Math.max(0, Math.min(g.nx - 1.001, (x - g.x0) / g.step)), fz = Math.max(0, Math.min(g.nz - 1.001, (z - g.z0) / g.step)); const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, e = (a, b) => h[b * g.nx + a]; return (e(i, j) * (1 - u) + e(i + 1, j) * u) * (1 - v) + (e(i, j + 1) * (1 - u) + e(i + 1, j + 1) * u) * v; };
const inFine = (x, z) => x >= FINE.x0 && x <= FINE.x0 + FINE.w && z >= FINE.z0 && z <= FINE.z0 + FINE.d;
const heightAtWorld = (x, z) => (inFine(x, z) ? sampleH(FINE, fine, x, z) : sampleH(COARSE, coarse, x, z));

// Lakes Natural Earth 10m lacks, traced from the DEM before any carving: flood the flat water surface from a
// seed inside the lake (+2 m ≈ today's shore), then contour the flooded cells (marching squares, longest loop).
const DEM_LAKES = [{ name: 'Điền Trì', lon: 102.7, lat: 24.84, rise: 0.006 }]; // Dian lake, 1886 m, ~300 km²
const demLakes = DEM_LAKES.map((L) => {
  const g = FINE, [sx, sz] = toWorld(L.lon, L.lat), s0 = Math.round((sz - g.z0) / g.step) * g.nx + Math.round((sx - g.x0) / g.step);
  const top = fine[s0] + L.rise, wet = new Uint8Array(g.nx * g.nz), stack = [s0];
  while (stack.length) {
    const n = stack.pop(), i = n % g.nx; if (wet[n] || fine[n] > top || i === 0 || i === g.nx - 1 || n < g.nx || n >= g.nx * (g.nz - 1)) continue;
    wet[n] = 1; stack.push(n - 1, n + 1, n - g.nx, n + g.nx);
  }
  const P = (i, j) => wet[j * g.nx + i], adj = new Map(), key = (x, z) => x * 2 + ',' + z * 2;
  const link = (a, b) => { for (const [u, v] of [[a, b], [b, a]]) { const k = key(...u); if (!adj.has(k)) adj.set(k, { p: u, n: [] }); adj.get(k).n.push(key(...v)); } };
  const SEG = { 1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 5: [['T', 'R'], ['L', 'B']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']], 9: [['T', 'B']], 10: [['T', 'L'], ['B', 'R']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['R', 'B']], 14: [['L', 'B']] };
  for (let j = 0; j < g.nz - 1; j++) for (let i = 0; i < g.nx - 1; i++) {
    const c = P(i, j) * 8 + P(i + 1, j) * 4 + P(i + 1, j + 1) * 2 + P(i, j + 1);
    const m = { T: [i + 0.5, j], R: [i + 1, j + 0.5], B: [i + 0.5, j + 1], L: [i, j + 0.5] };
    for (const [a, b] of SEG[c] || []) link(m[a], m[b]);
  }
  let best = [];
  const seen = new Set();
  for (const [k0] of adj) {
    if (seen.has(k0)) continue;
    const loop = []; let prev = null, k = k0;
    while (k && !seen.has(k)) { seen.add(k); const v = adj.get(k); loop.push(v.p); const nx = v.n.find((q) => q !== prev && !seen.has(q)); prev = k; k = nx; }
    if (loop.length > best.length) best = loop;
  }
  let ring = best.map(([i, j]) => [g.x0 + i * g.step, g.z0 + j * g.step]);
  for (let k = 0; k < 2; k++) ring = ring.flatMap(([ax, az], n) => { const [bx, bz] = ring[(n + 1) % ring.length]; return [[ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]]; });
  ring = ring.filter((_, n) => n % 3 === 0); ring.push(ring[0]);
  console.log('lake', L.name, (wet.reduce((a, b) => a + b, 0) * g.step * g.step * KM_PER_UNIT ** 2).toFixed(0), 'km²,', ring.length, 'shore points');
  return { name: L.name, ring };
});

// ---------------------------------------------------------------- rivers
console.log('rivers…');
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'world.json'), 'utf8'));
const cityDefs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cities.json'), 'utf8')).cities;
// Each city is drawn larger than life (like every strategy map): longest side L km → 2.8·L^0.8 units.
const cityScale = (L) => (2.8 * Math.pow(L, 0.8)) / L;
// Seats: the provinces of data/world.json (autumn 219, what the engine runs; the year-200 world in data/archive is never loaded).
const cities = world.provinces.map((p) => {
  const def = cityDefs[p.id];
  // footprint: walls, inner cities and the features that stand on the city's own ground (not twin towns or forts)
  const near = (def.features || []).filter((f) => f.at && ['platform', 'mound', 'hill', 'granary', 'garden', 'market', 'ironworks', 'watchtower'].includes(f.type)).map((f) => f.at);
  const pts = [...def.outline, ...(def.sub || []).flatMap((s) => s.outline), ...near];
  const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]), L = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  const scale = cityScale(L), reach = Math.max(...pts.map(([x, z]) => Math.hypot(x, z))) * scale;
  const [x, z] = toWorld(...p.lonlat);
  return { id: p.id, x, z, scale: +scale.toFixed(4), r: +(reach + 1.2).toFixed(2) };
});
const SILT = new Set(['Huang', 'Wei', 'Fen', 'Jing', 'Wuding']);
// half-width (world units) by Natural Earth scale rank; the Yangtze and Yellow River are drawn wider
const HW = { 1: 1.6, 2: 1.1, 3: 1.4, 4: 0.9, 5: 0.8, 6: 0.75, 7: 0.55, 8: 0.45, 9: 0.38 };
const rivGeo = JSON.parse(fs.readFileSync(path.join(CACHE, 'ne_10m_rivers_lake_centerlines.geojson'), 'utf8'));
const lines = [];
// Rivers Natural Earth lacks at this scale but the cities sit on (history.md), in lon/lat.
const EXTRA_RIVERS = [
  { name: 'Luo', hw: 0.45, silt: true, ll: [[111.2, 34.35], [111.7, 34.5], [112.2, 34.62], [112.5, 34.67], [112.75, 34.68], [113.0, 34.78], [113.08, 34.84]] },
  { name: 'Zi', hw: 0.35, ll: [[118.2, 36.45], [118.33, 36.7], [118.4, 36.87], [118.45, 37.1], [118.55, 37.3]] },
  { name: 'Si', hw: 0.5, ll: [[117.3, 35.6], [117.1, 35.1], [117.15, 34.75], [117.22, 34.3], [117.6, 33.9], [118.2, 33.6], [118.8, 33.45]] },
  { name: 'Bian', hw: 0.4, silt: true, ll: [[114.3, 34.75], [115.2, 34.55], [116.3, 34.45], [116.9, 34.33], [117.2, 34.29]] },
  { name: 'He', hw: 0.3, ll: [[115.5, 35.3], [116.0, 35.18], [116.3, 35.1], [116.8, 35.1], [117.1, 35.1]] },
  { name: 'Min', hw: 0.5, ll: [[103.6, 31.8], [103.62, 31.0], [103.75, 30.75], [103.85, 30.45], [103.8, 30.1], [103.72, 29.56]] },
  { name: 'Pi', hw: 0.35, ll: [[103.62, 31.0], [103.83, 30.84], [103.98, 30.7], [104.07, 30.645], [104.12, 30.61], [104.0, 30.4], [103.87, 30.2]] },
  { name: 'Jian', hw: 0.35, ll: [[103.66, 30.95], [103.88, 30.76], [104.02, 30.63], [104.12, 30.61]] },
  { name: 'Zhu', hw: 1.3, ll: [[112.85, 23.15], [113.05, 23.12], [113.27, 23.105], [113.45, 23.09], [113.58, 22.93], [113.65, 22.78]] },
  // Shiyang: Qilian meltwater that made the Guzang (Wuwei) oasis, out to the Minqin marshes
  { name: 'Shiyang', hw: 0.3, ll: [[102.42, 37.5], [102.55, 37.7], [102.66, 37.86], [102.72, 38.0], [102.85, 38.2], [103.0, 38.42], [103.1, 38.62]] },
];
for (const r of EXTRA_RIVERS) lines.push({ name: r.name, rank: 9, hw: r.hw, silt: !!r.silt, pts: r.ll.map(([lon, lat]) => toWorld(lon, lat)) });
for (const f of rivGeo.features) {
  if (!f.geometry || f.properties.featurecla === 'Lake Centerline') continue;
  const name = f.properties.name || '', rank = f.properties.scalerank;
  const parts = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const part of parts) {
    const w = part.map(([lon, lat]) => toWorld(lon, lat));
    const inside = w.filter(([x, z]) => x > COARSE.x0 && x < COARSE.x0 + COARSE.w && z > COARSE.z0 && z < COARSE.z0 + COARSE.d).length;
    if (inside < 2) continue;
    const lon = part[Math.floor(part.length / 2)][0];
    if (lon < 99 || lon > 126.5) continue; // Tibet/Myanmar/Korea rivers are beyond the play area
    let hw = HW[rank] ?? 0.4;
    if (name === 'Jinsha') hw = 0.9;
    if (name === 'Nanpan' && lon < 104.5) hw = 0.45; // headwaters on the Yunnan plateau, not the lower river
    if (name === 'Chang Jiang' || name === 'Yangtze') hw = lon > 111 ? 2.0 : 1.3;
    if (rank >= 8 && !inFine(...w[Math.floor(w.length / 2)])) continue; // small rivers only on the playable map
    lines.push({ name, rank, hw, silt: SILT.has(name), pts: w });
  }
}
// History (200 CE): Hongze Lake did not exist; the Huai ran straight to the Yellow Sea. Natural Earth splits the Huai
// into pieces and names its middle course (Huainan–Zhongli) "Hudi": chain the pieces west to east, cut the chain where
// the Hongze basin begins, add the old mouth. Pieces that do not join (Hongze, the 1851 outlet to the Yangtze) drop out.
{
  const parts = lines.filter((l) => l.name === 'Huai' || l.name === 'Hudi');
  const rest = parts.slice().sort((p, q) => Math.min(...p.pts.map((v) => v[0])) - Math.min(...q.pts.map((v) => v[0])));
  const first = rest.shift(), west = first.pts[0][0] < first.pts[first.pts.length - 1][0] ? first.pts.slice() : first.pts.slice().reverse();
  let chain = west;
  for (let joined = true; joined; ) {
    joined = false;
    const end = chain[chain.length - 1];
    for (let k = 0; k < rest.length; k++) {
      const P = rest[k].pts, dA = Math.hypot(P[0][0] - end[0], P[0][1] - end[1]), dB = Math.hypot(P[P.length - 1][0] - end[0], P[P.length - 1][1] - end[1]);
      if (Math.min(dA, dB) < 1.5) { chain = chain.concat((dA <= dB ? P : P.slice().reverse()).slice(1)); rest.splice(k, 1); joined = true; break; }
    }
  }
  const cutX = toWorld(118.45, 33.2)[0], cut = chain.findIndex(([x]) => x > cutX);
  if (cut > 0) chain = chain.slice(0, cut);
  const last = chain[chain.length - 1];
  const oldHuai = [[118.8, 33.45], [119.25, 33.62], [119.7, 33.85], [120.1, 34.05], [120.45, 34.2]].map(([a, b]) => toWorld(a, b));
  chain = [...chain, ...oldHuai.filter(([x]) => x > last[0])];
  for (const l of parts) lines.splice(lines.indexOf(l), 1);
  lines.push({ name: 'Huai', rank: first.rank, hw: first.hw, silt: false, pts: chain });
}
// Keep rivers out of the (enlarged) city footprints but hugging the walls, as they did (rivers were moats).
// Each river is shifted sideways, away from the city on the side it already flows, with a cosine bump along
// its length: a local detour that keeps the river's course (a radial push would wrap it round the city).
// Natural Earth 10m vertices are 1–3 km apart: round the corners (Chaikin, 3 passes) so rivers meander
// instead of zig-zagging when seen from the campaign camera.
const chaikin = (pts, n) => { for (let k = 0; k < n; k++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } o.push(pts[pts.length - 1]); pts = o; } return pts; };
for (const l of lines) l.pts = resample(chaikin(l.pts, 3), 0.5);
for (let pass = 0; pass < 3; pass++) for (const c of cities) for (const l of lines) {
  const P = l.pts, need = c.r - 1.2 + 0.5 + l.hw; // water edge just outside the walls
  let k0 = -1, dmin = 1e9;
  for (let k = 0; k < P.length; k++) { const d = Math.hypot(P[k][0] - c.x, P[k][1] - c.z); if (d < dmin) { dmin = d; k0 = k; } }
  if (dmin >= need) continue;
  const a = P[Math.max(0, k0 - 3)], b = P[Math.min(P.length - 1, k0 + 3)], ln = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let nx = -(b[1] - a[1]) / ln, nz = (b[0] - a[0]) / ln;
  const px = P[k0][0] - c.x, pz = P[k0][1] - c.z;
  if (nx * px + nz * pz < 0) { nx = -nx; nz = -nz; }
  if (Math.abs(nx * px + nz * pz) < 1e-3 && nz < 0) { nx = -nx; nz = -nz; } // straight through the middle: pass south
  const off = need - Math.max(0, nx * px + nz * pz), L = need * 2.4;
  const s = [0]; for (let k = 1; k < P.length; k++) s.push(s[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  for (let k = 0; k < P.length; k++) { const ds = Math.abs(s[k] - s[k0]); if (ds > L) continue; const w = 0.5 * (1 + Math.cos((Math.PI * ds) / L)); P[k][0] += nx * off * w; P[k][1] += nz * off * w; }
}
// resample, sample terrain, smooth and make the water surface fall monotonically toward the mouth
function resample(pts, step) {
  const out = [pts[0].slice()];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= L) { out.push([ax + ((bx - ax) * t) / L, az + ((bz - az) * t) / L]); t += step; }
    carry = L - (t - step);
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
for (const l of lines) {
  l.pts = resample(chaikin(l.pts, 1), 0.35);
  let s = l.pts.map(([x, z]) => heightAtWorld(x, z));
  const W = 12;
  s = s.map((_, i) => { let a = 0, n = 0; for (let k = -W; k <= W; k++) { const v = s[i + k]; if (v !== undefined) { a += v; n++; } } return a / n; });
  if (s[0] < s[s.length - 1]) { l.pts.reverse(); s.reverse(); } // flow from high to low
  for (let i = 1; i < s.length; i++) s[i] = Math.min(s[i], s[i - 1]);
  l.surf = s.map((v) => Math.max(0.02, v - 0.08));
}
// flatten a pad under each city (level = median ground in the footprint), blended over 4 units
for (const c of cities) {
  const samples = [];
  for (let a = 0; a < 24; a++) for (const f of [0.3, 0.7, 1]) samples.push(heightAtWorld(c.x + Math.cos(a) * c.r * f, c.z + Math.sin(a) * c.r * f));
  samples.sort((a, b) => a - b);
  c.y = Math.max(0.35, samples[Math.floor(samples.length / 2)]);
  for (const [g, h] of [[FINE, fine], [COARSE, coarse]]) {
    const R = c.r + 4;
    for (let j = Math.max(0, Math.floor((c.z - R - g.z0) / g.step)); j <= Math.min(g.nz - 1, Math.ceil((c.z + R - g.z0) / g.step)); j++)
      for (let i = Math.max(0, Math.floor((c.x - R - g.x0) / g.step)); i <= Math.min(g.nx - 1, Math.ceil((c.x + R - g.x0) / g.step)); i++) {
        const d = Math.hypot(g.x0 + i * g.step - c.x, g.z0 + j * g.step - c.z), t = Math.max(0, Math.min(1, (d - c.r) / 4)), k = t * t * (3 - 2 * t), n = j * g.nx + i;
        h[n] = h[n] * k + c.y * (1 - k);
      }
  }
}
// carve channels and banks into both grids
function carve(g, h) {
  for (const l of lines) {
    const bank = 2 + l.hw * 1.5, R = l.hw + bank, bed = 0.3 + 0.18 * l.hw;
    for (let k = 0; k < l.pts.length; k++) {
      const [px, pz] = l.pts[k], sf = l.surf[k];
      const i0 = Math.max(0, Math.floor((px - R - g.x0) / g.step)), i1 = Math.min(g.nx - 1, Math.ceil((px + R - g.x0) / g.step));
      const j0 = Math.max(0, Math.floor((pz - R - g.z0) / g.step)), j1 = Math.min(g.nz - 1, Math.ceil((pz + R - g.z0) / g.step));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(g.x0 + i * g.step - px, g.z0 + j * g.step - pz) - l.hw;
        if (d > bank) continue;
        const t = d < 0 ? Math.max(0, Math.min(1, -d / l.hw)) : 0;
        const target = d < 0 ? sf - 0.12 - bed * t * t * (3 - 2 * t) : sf + 0.06 + d * d * (0.35 / bank);
        const n = j * g.nx + i; if (target < h[n]) h[n] = target;
      }
    }
  }
}
carve(FINE, fine);
carve(COARSE, coarse);

// ---------------------------------------------------------------- lakes (only those that existed around 200 CE, roughly)
const KEEP_LAKES = /Dongting|Poyang|Boyang|Tai Hu|Taihu|^Tai$|Chao/i;
const lakeGeo = JSON.parse(fs.readFileSync(path.join(CACHE, 'ne_10m_lakes.geojson'), 'utf8'));
const lakes = [];
function addLake(name, ring) {
  const shore = ring.map(([x, z]) => heightAtWorld(x, z)).sort((a, b) => a - b);
  const level = Math.max(0.05, shore[Math.floor(shore.length * 0.15)] - 0.05);
  lakes.push({ name, level: +level.toFixed(3), ring: ring.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]) });
  // carve the basin: depth grows away from the shore
  for (const [g, h] of [[FINE, fine], [COARSE, coarse]]) {
    const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
    for (let j = Math.floor((Math.min(...zs) - g.z0) / g.step); j <= Math.ceil((Math.max(...zs) - g.z0) / g.step); j++)
      for (let i = Math.floor((Math.min(...xs) - g.x0) / g.step); i <= Math.ceil((Math.max(...xs) - g.x0) / g.step); i++) {
        if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
        const x = g.x0 + i * g.step, z = g.z0 + j * g.step;
        let inside = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, za] = ring[a], [xb, zb] = ring[b]; if ((za > z) !== (zb > z) && x < ((xb - xa) * (z - za)) / (zb - za) + xa) inside = !inside; }
        if (!inside) continue;
        let dmin = 1e9; for (let a = 0; a < ring.length - 1; a++) { const [xa, za] = ring[a], [xb, zb] = ring[a + 1], dx = xb - xa, dz = zb - za, tt = Math.max(0, Math.min(1, ((x - xa) * dx + (z - za) * dz) / (dx * dx + dz * dz || 1))); dmin = Math.min(dmin, Math.hypot(x - xa - dx * tt, z - za - dz * tt)); }
        const n = j * g.nx + i; h[n] = Math.min(h[n], level - 0.15 - Math.min(1.2, dmin * 0.25));
      }
  }
}
for (const f of lakeGeo.features) {
  const name = f.properties.name || '';
  if (!f.geometry || !KEEP_LAKES.test(name)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const ring = poly[0].map(([lon, lat]) => toWorld(lon, lat));
    if (ring.every(([x, z]) => inFine(x, z))) addLake(name, ring);
  }
}
for (const l of demLakes) addLake(l.name, l.ring);

// small historical lakes Natural Earth does not carry (ellipses in lon/lat)
for (const e of [{ name: 'Đại Dã trạch', lon: 116.05, lat: 35.47, rx: 0.16, ry: 0.1 }, { name: 'Tây hồ (Kế)', lon: 116.27, lat: 39.88, rx: 0.035, ry: 0.025 }]) {
  const ring = []; for (let a = 0; a <= 32; a++) { const t = (a / 32) * Math.PI * 2, w = 1 + 0.12 * Math.sin(t * 3 + 1) + 0.08 * Math.sin(t * 5); ring.push(toWorld(e.lon + Math.cos(t) * e.rx * w, e.lat + Math.sin(t) * e.ry * w)); }
  const level = Math.max(0.05, Math.min(...ring.map(([x, z]) => heightAtWorld(x, z))) - 0.05);
  lakes.push({ name: e.name, level: +level.toFixed(3), ring: ring.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]) });
  for (const [g, h] of [[FINE, fine], [COARSE, coarse]]) {
    const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
    for (let j = Math.floor((Math.min(...zs) - g.z0) / g.step); j <= Math.ceil((Math.max(...zs) - g.z0) / g.step); j++)
      for (let i = Math.floor((Math.min(...xs) - g.x0) / g.step); i <= Math.ceil((Math.max(...xs) - g.x0) / g.step); i++) {
        if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
        const x = g.x0 + i * g.step, z = g.z0 + j * g.step;
        let inside = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, za] = ring[a], [xb, zb] = ring[b]; if ((za > z) !== (zb > z) && x < ((xb - xa) * (z - za)) / (zb - za) + xa) inside = !inside; }
        if (inside) { const n = j * g.nx + i; h[n] = Math.min(h[n], level - 0.25); }
      }
  }
}

// ---------------------------------------------------------------- write
// DEM noise defeats plain gzip; quantise, take the 2-D delta, zigzag, split byte planes, then gzip.
const Q = 0.005;
const encode = (h, g) => {
  const q = new Int32Array(h.length); for (let i = 0; i < h.length; i++) q[i] = Math.round(h[i] / Q);
  const out = Buffer.alloc(h.length * 2), N = h.length;
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const n = j * g.nx + i, row = (jj, ii) => (ii > 0 ? q[jj * g.nx + ii] - q[jj * g.nx + ii - 1] : q[jj * g.nx + ii]);
    const d = row(j, i) - (j > 0 ? row(j - 1, i) : 0), z = d >= 0 ? d * 2 : -d * 2 - 1;
    if (z > 65535) throw new Error('height delta out of range');
    out[n] = z & 255; out[N + n] = z >> 8;
  }
  return zlib.gzipSync(out, { level: 9 });
};
for (const f of ['height-fine.bin', 'height-coarse.bin']) fs.rmSync(path.join(OUT, f), { force: true });
fs.writeFileSync(path.join(OUT, 'height-fine.bin.gz'), encode(fine, FINE));
fs.writeFileSync(path.join(OUT, 'height-coarse.bin.gz'), encode(coarse, COARSE));
const r2 = (v) => +v.toFixed(2), r3 = (v) => +v.toFixed(3);
const rivers = lines.map((l) => {
  const keep = l.pts.map((p, i) => [r2(p[0]), r2(p[1]), r3(l.surf[i])]).filter((_, i, a) => i % 3 === 0 || i === a.length - 1); // ~1 unit spacing
  return { name: l.name, rank: l.rank, hw: l.hw, silt: l.silt, pts: keep };
});
fs.writeFileSync(path.join(OUT, 'water.json'), JSON.stringify({ rivers, lakes }));
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
  projection: { lon0: LON0, lat0: LAT0, kmPerUnit: KM_PER_UNIT, unitsPerDegLon: +KX.toFixed(5), unitsPerDegLat: +KZ.toFixed(5), note: 'x = (lon - lon0) * unitsPerDegLon, z = (lat0 - lat) * unitsPerDegLat' },
  height: { step: Q, encoding: 'delta2d-zigzag-planes-gzip', landFormula: 'h = 0.1 + metres * 0.003; sea = metres * 0.008', fine: FINE, coarse: COARSE },
  sources: ['AWS Terrain Tiles (terrarium, z7) — Mapzen/Tilezen: SRTM, ETOPO1, GMTED2010 and others; attribution per tilezen/joerd', 'Natural Earth 10m rivers and lakes (public domain)'],
  history: ['Huai river routed to the Yellow Sea (pre-1128 course); Hongze Lake removed', 'Only Dongting, Poyang, Tai and Chao lakes kept (plus Dian lake traced from the DEM)', 'Huai pieces (Natural Earth "Hudi" is its middle course) chained into one river; the 1851 outlet dropped', 'Added Luo, Zi, Si, Bian, He canal, Chengdu Pi/Jian, Guangzhou Pearl channel, Shiyang (Wuwei); Daye marsh, Ji West Lake'],
  cities: Object.fromEntries(cities.map((c) => [c.id, { x: +c.x.toFixed(2), z: +c.z.toFixed(2), y: +c.y.toFixed(3), r: c.r, scale: c.scale }])),
}, null, 1));
console.log('fine', FINE.nx, 'x', FINE.nz, 'coarse', COARSE.nx, 'x', COARSE.nz, 'rivers', rivers.length, 'lakes', lakes.length);
