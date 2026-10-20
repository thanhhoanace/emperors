/*
 * Tam Quốc Loạn Nhập — v3 paper: the whole campaign map of 219 as one paper diorama (docs/design/v3-paper.md, "Toàn bản đồ").
 *
 * Classic script, three r146, no assets beyond the baked terrain (assets/map/, loaded with Terrain.loadBaked and projected with
 * Terrain.projection from src/world/terrain-real.js). Every layout is seeded. Two halves, like paper.js:
 *   1. pure (PaperWorld._, Node-testable): the layer field (real heights sliced into stacked contour cards, the sea as wavy
 *      bands off the coast, river trenches, lake basins, town plateaus), the province partition (a travel-cost Dijkstra from
 *      the 20 seats: borders follow ridges), and the static geometry (terrain, water, origami ranges, trees, border ribbons,
 *      towns, the card base), merged per layer/material;
 *   2. the page (PaperWorld.boot): view-only overview of all China that pans and zooms down to a province; owners from
 *      data/world.json (factions[].start.provinces), glyph banners from data/personas.
 *   paper.html?map=world&tier=low|mid|high&season=Thu&focus=<province id>&zoom=<distance>
 */
(function (root, factory) {
  const K = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = K; else root.PaperWorld = K;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  const PK = root.PaperKit || (typeof require === 'function' ? require('./paper.js') : null);
  const { clamp, lerp, smooth, rng, fbm, vnoise, strSeed, hex, mix, shade, lighten, polyPrep, polyAt, sliceCell, edgeInterval, box, frustum, wallQuad, hanTown, paperTree, UP } = PK._;
  const Builder = PK.Builder;

  // ---------------------------------------------------------------- the diorama's frame and its layers
  // World units (1 = 3 km, Albers, decision 0006). The plate: the plateau's edge in the west to the shelf sea in the east,
  // the Great Wall country in the north to the Lingnan coast in the south.
  const WB = { x0: -420, x1: 330, z0: -372, z1: 402 };
  // layer k covers g >= k. 1–3 the sea's bands, 4 the coast (land at sea level), 5–10 the land by metres (coarser than Hoài Nam)
  const SEA_TOP = 3, LAND0 = 4, TOPK = 10;
  const KNOT_M = [0, 250, 620, 1150, 1850, 2750, 3750], KNOT_G = [4.3, 5, 6, 7, 8, 9, 10];
  const SEA_D = [0, 4, 11, 24, 46], SEA_G = [3.92, 3, 2, 1, 0.3];
  const LAND_T = 1.9, SEA_T = 0.6;
  const layerY = (k) => (k <= LAND0 ? (k - LAND0) * SEA_T : (k - LAND0) * LAND_T);
  const BASE_Y = layerY(0);
  const interp = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0] + (x - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]);
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1]));
    const n = xs.length - 1; return ys[n] + (x - xs[n]) * (ys[n] - ys[n - 1]) / (xs[n] - xs[n - 1]);
  };
  const gOfMetres = (m) => interp(KNOT_M, KNOT_G, m);

  // rivers drawn (water.json names) and their paper half-widths in world units (widened to read at the overview)
  const RIVER_W = {
    'Yangtze': 3.3, 'Chang Jiang': 3.3, 'Jinsha': 2.2, 'Huang': 3.0, 'Huai': 2.5, 'Han': 2.2,
    'Wei': 1.5, 'Xiang': 1.5, 'Gan': 1.5, 'Yuan': 1.3, 'Jialing': 1.4, 'Min': 1.2, 'Xi': 1.6, 'Hongshui': 1.1, 'Bei': 1.1, 'Dong': 1.0, 'Zhu': 1.5,
    'Fen': 1.0, 'Luo': 0.95, 'Si': 0.95, 'Bian': 0.85, 'Ying': 0.85, 'Jing': 0.85, 'Tuo': 0.9, 'Wu': 1.0, 'Yalong': 1.1, 'Dadu': 1.0,
    'Lancang': 1.1, 'Nu': 1.0, 'Yongding': 0.85, 'Zhang': 0.85, 'Fuchun': 0.95, 'Nanpan': 0.9, 'Yu': 0.9,
  };
  const MAJOR = new Set(['Yangtze', 'Chang Jiang', 'Huang', 'Huai', 'Han', 'Jinsha']);
  const LAKES = ['Tai Hu', 'Poyang Hu', 'Chao Hu', 'Dongting Hu', 'Qinghai Hu', 'Điền Trì', 'Đại Dã trạch'];
  // town level (lũy 0–4) by the seat's rank in data/cities.json and how far out it lies
  const FRONTIER = new Set(['hexi', 'nanzhong', 'jiao', 'you']);
  const townLevel = (rank, id) => (rank === 'capital' ? 4 : rank === 'fort' ? 1 : FRONTIER.has(id) ? 2 : 3);
  // how far a seat's writ runs (the travel cost is divided by it): Wu's Yang reached over Yuzhang and Kuaiji to the Min
  const REACH = { yang: 1.6, jing_nan: 1.3, yi: 1.2, jiao: 0.95, huai: 1.15, you: 0.9 };
  const TOWN_R = [3.2, 3.7, 4.3, 4.9, 5.6]; // wall half-size in world units by level (the town's own units are scaled to it)

  // ---------------------------------------------------------------- baked terrain sampler (Terrain.loadBaked's result)
  function sampler(baked) {
    const C = baked.meta.height.coarse, arr = baked.coarse, LM = baked.meta.land, land = baked.land;
    const H = (x, z) => {
      const fx = clamp((x - C.x0) / C.step, 0, C.nx - 1.001), fz = clamp((z - C.z0) / C.step, 0, C.nz - 1.001), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
      const a = arr[j * C.nx + i], b = arr[j * C.nx + i + 1], c = arr[(j + 1) * C.nx + i], d = arr[(j + 1) * C.nx + i + 1];
      return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) * 0.001;
    };
    const L = (x, z) => {
      if (!land) return [0, 0, 0, 255];
      const o = (clamp(Math.round((z - LM.z0) / LM.step), 0, LM.nz - 1) * LM.nx + clamp(Math.round((x - LM.x0) / LM.step), 0, LM.nx - 1)) * 4;
      return [land[o], land[o + 1], land[o + 2], land[o + 3]];
    };
    const metres = (h) => (h >= 0.1 ? (h - 0.1) / 0.003 : h > 0.04 ? 0 : h / 0.008);
    return { H, L, metres };
  }

  // ---------------------------------------------------------------- grids
  function grid(B, cs) {
    const nx = Math.max(2, Math.round((B.x1 - B.x0) / cs)), nz = Math.max(2, Math.round((B.z1 - B.z0) / cs));
    const G = { nx, nz, x0: B.x0, z0: B.z0, dx: (B.x1 - B.x0) / nx, dz: (B.z1 - B.z0) / nz, W: nx + 1, N: (nx + 1) * (nz + 1) };
    G.x = (i) => G.x0 + i * G.dx; G.z = (j) => G.z0 + j * G.dz;
    G.bil = (arr, x, z) => {
      const fx = clamp((x - G.x0) / G.dx, 0, nx - 1e-6), fz = clamp((z - G.z0) / G.dz, 0, nz - 1e-6), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, W = G.W;
      return lerp(lerp(arr[j * W + i], arr[j * W + i + 1], a), lerp(arr[(j + 1) * W + i], arr[(j + 1) * W + i + 1], a), b);
    };
    G.near = (arr, x, z) => arr[clamp(Math.round((z - G.z0) / G.dz), 0, nz) * G.W + clamp(Math.round((x - G.x0) / G.dx), 0, nx)];
    return G;
  }
  // chamfer distance (world units) to the nearest node where src[n] is true
  function chamfer(G, src) {
    const INF = 1e9, d = new Float32Array(G.N), a = G.dx, dg = Math.hypot(G.dx, G.dz), W = G.W;
    for (let n = 0; n < G.N; n++) d[n] = src[n] ? 0 : INF;
    for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) { const n = j * W + i; let v = d[n]; if (i) v = Math.min(v, d[n - 1] + a); if (j) { v = Math.min(v, d[n - W] + G.dz); if (i) v = Math.min(v, d[n - W - 1] + dg); if (i < G.nx) v = Math.min(v, d[n - W + 1] + dg); } d[n] = v; }
    for (let j = G.nz; j >= 0; j--) for (let i = G.nx; i >= 0; i--) { const n = j * W + i; let v = d[n]; if (i < G.nx) v = Math.min(v, d[n + 1] + a); if (j < G.nz) { v = Math.min(v, d[n + W] + G.dz); if (i < G.nx) v = Math.min(v, d[n + W + 1] + dg); if (i) v = Math.min(v, d[n + W - 1] + dg); } d[n] = v; }
    return d;
  }

  // ---------------------------------------------------------------- rivers and lakes from water.json (clipped, pushed round the towns, smoothed)
  function chaikin(pts, it) {
    for (let k = 0; k < it; k++) {
      const out = [pts[0]];
      for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }
  function resample(pts, step) {
    const P = polyPrep(pts), out = [];
    for (let s = 0; s <= P.length; s += step) { const p = polyAt(P, s); out.push([p.x, p.z]); }
    const l = pts[pts.length - 1]; out.push([l[0], l[1]]);
    return out;
  }
  function riverList(water, B, towns) {
    const inB = (p, m) => p[0] > B.x0 + m && p[0] < B.x1 - m && p[1] > B.z0 + m && p[1] < B.z1 - m;
    const out = [];
    for (const r of water.rivers) {
      const hw = RIVER_W[r.name]; if (!hw) continue;
      // runs inside the frame (a river can leave and come back)
      let run = [];
      const flush = () => { if (run.length > 6) out.push({ name: r.name, hw, major: MAJOR.has(r.name), pts: run }); run = []; };
      for (const p of r.pts) { if (inB(p, 3)) run.push([p[0], p[1]]); else flush(); }
      flush();
    }
    for (const r of out) {
      let pts = resample(r.pts, 2.2);
      for (let it = 0; it < 3; it++) { // bend round the towns (decision 0006: the river makes the moat, it never runs through the walls)
        for (const p of pts) for (const t of towns) {
          const need = t.plate + r.hw + 1.4, dx = p[0] - t.x, dz = p[1] - t.z, d = Math.hypot(dx, dz);
          if (d < need) { const k = need / Math.max(d, 1e-3); p[0] = t.x + dx * k; p[1] = t.z + dz * k; }
        }
        pts = chaikin(pts, 1); pts = resample(pts, 1.6);
      }
      r.pts = pts; r.P = polyPrep(pts);
    }
    return out;
  }
  function lakeList(water, B) {
    const out = [];
    for (const L of water.lakes) if (LAKES.includes(L.name) && L.ring.some((p) => p[0] > B.x0 && p[0] < B.x1 && p[1] > B.z0 && p[1] < B.z1)) out.push({ name: L.name, ring: L.ring.map((p) => [p[0], p[1]]) });
    return out;
  }
  const inPoly = (x, z, ring) => { let ins = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, za] = ring[a], [xb, zb] = ring[b]; if ((za > z) !== (zb > z) && x < ((xb - xa) * (z - za)) / (zb - za) + xa) ins = !ins; } return ins; };
  const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  function ringSD(x, z, ring) { let d = 1e9; for (let a = 0; a < ring.length; a++) { const b = (a + 1) % ring.length; d = Math.min(d, segD(x, z, ring[a][0], ring[a][1], ring[b][0], ring[b][1])); } return inPoly(x, z, ring) ? -d : d; }

  // ---------------------------------------------------------------- the layer field
  // spec: { S: sampler, B, cs, towns: [{x, z, plate}], rivers, lakes, seed }
  function worldField(spec) {
    const { S, cs, seed = 7 } = spec, B = spec.B || WB, G = grid(B, cs), N = G.N, W = G.W;
    const m = new Float32Array(N), sea = new Uint8Array(N), china = new Uint8Array(N), arid = new Uint8Array(N), forest = new Uint8Array(N);
    for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) {
      const n = j * W + i, x = G.x(i), z = G.z(j), h = S.H(x, z), L = S.L(x, z);
      m[n] = Math.max(S.metres(h), h < 0.05 && L[3] >= 128 ? 0 : -1e9); sea[n] = h < 0.05 && L[3] < 128 ? 1 : 0; china[n] = L[3]; arid[n] = Math.max(L[0], L[1]); forest[n] = L[2];
    }
    const dSea = chamfer(G, Array.from(sea, (s) => !s)); // distance from land, in the sea
    const g = new Float32Array(N);
    for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) {
      const n = j * W + i, x = G.x(i), z = G.z(j);
      if (sea[n]) {
        const wv = (fbm(x / 9, z / 23, seed + 3, 2) - 0.5) * 0.9 + 0.22 * Math.sin(x * 0.09 + z * 0.05 + fbm(x / 30, z / 30, seed, 2) * 6);
        g[n] = Math.min(3.92, interp(SEA_D, SEA_G, dSea[n]) + wv);
      } else g[n] = Math.max(4.25, gOfMetres(m[n]) + (fbm(x / 23, z / 23, seed + 11, 2) - 0.5) * 0.35);
    }
    // soften the land's contours a little (paper is cut with a blade, not stamped from pixels); the sea keeps its bands
    // a box blur over ~8 units, twice: the cards get broad, clean outlines instead of a speckle of one-cell islands
    const rad = Math.max(1, Math.round(4 / cs));
    for (let pass = 0; pass < 2; pass++) {
      const g2 = Float32Array.from(g);
      for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) {
        const n = j * W + i; if (sea[n]) continue;
        let s = 0, c = 0;
        for (let b = Math.max(0, j - rad); b <= Math.min(G.nz, j + rad); b++) for (let a = Math.max(0, i - rad); a <= Math.min(G.nx, i + rad); a++) { const q = b * W + a; if (!sea[q]) { s += g[q]; c++; } }
        g2[n] = Math.max(4.25, s / c);
      }
      g.set(g2);
    }
    const F = { G, g, m, sea, china, arid, forest, dSea, B };
    // town plateaus: flat at the layer the town stands on
    for (const t of spec.towns || []) {
      const lv = Math.max(LAND0, Math.floor(G.bil(g, t.x, t.z))), r1 = t.plate + 1.2, r2 = t.plate + 4.5; t.k = lv;
      stamp(G, t.x, t.z, r2, (n, d) => { if (sea[n]) return; const w = smooth(r2, r1, d); g[n] = lerp(g[n], lv + 0.5, w); });
    }
    // lakes: a basin one layer below the lowest shore, the lake card at the basin floor
    for (const L of spec.lakes || []) {
      let lo = 1e9; for (const p of L.ring) lo = Math.min(lo, G.bil(g, p[0], p[1]));
      L.k = Math.max(LAND0, Math.floor(lo) - (lo - Math.floor(lo) < 0.35 ? 1 : 0));
      const xs = L.ring.map((p) => p[0]), zs = L.ring.map((p) => p[1]);
      const bx = { x0: Math.min(...xs) - 4, x1: Math.max(...xs) + 4, z0: Math.min(...zs) - 4, z1: Math.max(...zs) + 4 };
      eachNode(G, bx, (n, x, z) => { const d = ringSD(x, z, L.ring); if (d < 1.2) g[n] = Math.min(g[n], L.k + 0.5 + Math.max(0, d) * 0.4); });
    }
    // river trenches: the river's layer never rises downstream; the trench is that layer, its banks the layers above
    for (const r of spec.rivers || []) {
      const lv = r.pts.map((p) => G.bil(g, p[0], p[1]));
      let run = 1e9; r.k = lv.map((v) => (run = Math.min(run, Math.max(LAND0, Math.floor(v)))));
      r.wet = lv.map((v, i) => v >= LAND0 - 0.2 || i < 2); // runs out where it meets the sea
      const R = r.hw + cs * 0.9;
      for (let i = 0; i < r.pts.length; i++) {
        if (!r.wet[i]) continue;
        const [px, pz] = r.pts[i], k = r.k[i];
        stamp(G, px, pz, R, (n) => { if (!sea[n]) g[n] = Math.min(g[n], k + 0.5); });
      }
    }
    F.at = (x, z) => G.bil(g, x, z);
    F.topK = (x, z) => clamp(Math.floor(F.at(x, z) + 1e-6), 0, TOPK);
    F.topY = (x, z) => layerY(F.topK(x, z));
    return F;
  }
  function stamp(G, x, z, R, fn) {
    const i0 = Math.max(0, Math.floor((x - R - G.x0) / G.dx)), i1 = Math.min(G.nx, Math.ceil((x + R - G.x0) / G.dx));
    const j0 = Math.max(0, Math.floor((z - R - G.z0) / G.dz)), j1 = Math.min(G.nz, Math.ceil((z + R - G.z0) / G.dz));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(G.x(i) - x, G.z(j) - z); if (d <= R) fn(j * G.W + i, d); }
  }
  function eachNode(G, b, fn) {
    const i0 = Math.max(0, Math.floor((b.x0 - G.x0) / G.dx)), i1 = Math.min(G.nx, Math.ceil((b.x1 - G.x0) / G.dx));
    const j0 = Math.max(0, Math.floor((b.z0 - G.z0) / G.dz)), j1 = Math.min(G.nz, Math.ceil((b.z1 - G.z0) / G.dz));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * G.W + i, G.x(i), G.z(j));
  }

  // ---------------------------------------------------------------- provinces: travel cost from each seat (ridges and the plateau cost more)
  // seats: [{ id, x, z }]. Returns { G, label: Int16Array (-1 none), cost, at(x, z) → index | -1, ids }
  function partition(S, seats, B, cp, cap) {
    const G = grid(B || WB, cp || 3), N = G.N, W = G.W;
    const m = new Float32Array(N), ok = new Uint8Array(N), dry = new Float32Array(N);
    for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) {
      const n = j * W + i, x = G.x(i), z = G.z(j), h = S.H(x, z), L = S.L(x, z);
      m[n] = Math.max(0, S.metres(h)); ok[n] = L[3] > 100 && m[n] < 3300 ? 1 : 0; dry[n] = Math.max(L[0], L[1]) / 255;
    }
    const cost = new Float64Array(N).fill(1e9), label = new Int16Array(N).fill(-1); // float64: a popped cost must compare equal to the stored one
    const heap = []; // binary heap of [cost, n]
    const push = (c, n) => { heap.push([c, n]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    seats.forEach((s, k) => { const i = clamp(Math.round((s.x - G.x0) / G.dx), 0, G.nx), j = clamp(Math.round((s.z - G.z0) / G.dz), 0, G.nz), n = j * W + i; cost[n] = 0; label[n] = k; ok[n] = 1; push(0, n); });
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const reach = seats.map((s) => REACH[s.id] || 1);
    const capC = cap || 150;
    while (heap.length) {
      const [c, n] = pop(); if (c > cost[n]) continue;
      const i = n % W, j = (n - i) / W;
      for (const [di, dj] of nb) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a > G.nx || b > G.nz) continue;
        const q = b * W + a; if (!ok[q]) continue;
        const L = Math.hypot(di * G.dx, dj * G.dz), dm = Math.abs(m[q] - m[n]) / (L * 3); // metres per km
        const step = L * (1 + dm / 9 + Math.max(0, (m[q] + m[n]) / 2 - 1300) / 450) * (1 + 2.5 * dry[q]);
        const nc = c + step / reach[label[n]]; if (nc < cost[q] && nc < capC) { cost[q] = nc; label[q] = label[n]; push(nc, q); }
      }
    }
    // fill the pinholes (a lake, a speck of salt flat) with the province round them
    for (let pass = 0; pass < 3; pass++) for (let j = 1; j < G.nz; j++) for (let i = 1; i < G.nx; i++) {
      const n = j * W + i; if (label[n] >= 0) continue;
      const cnt = {}; let best = -1, bc = 0;
      for (const [di, dj] of nb) { const l = label[n + dj * W + di]; if (l >= 0 && (cnt[l] = (cnt[l] || 0) + 1) > bc) { bc = cnt[l]; best = l; } }
      if (bc >= 5) { label[n] = best; cost[n] = cost[n + 1] < 1e8 ? cost[n + 1] : cost[n - 1] < 1e8 ? cost[n - 1] : cost[n + W] < 1e8 ? cost[n + W] : cost[n - W]; }
    }
    const at = (x, z) => G.near(label, x, z);
    return { G, label, cost, at, ids: seats.map((s) => s.id) };
  }
  // border polylines: every grid edge whose ends belong to different provinces (or a province and the waste) is crossed where
  // the two travel costs meet; the crossings chain into lines. Returns [{ pts: [[x, z]…], a, b }] (a, b: the labels left / right)
  function borders(P) {
    const { G, label, cost } = P, W = G.W;
    const key = (n, o) => n * 2 + o; // o: 0 the edge to +x, 1 to +z
    const pt = {};
    const cross = (n, q, o) => {
      const k = key(n, o); if (pt[k]) return pt[k];
      const la = label[n], lb = label[q], ca = la < 0 ? 1e9 : cost[n], cb = lb < 0 ? 1e9 : cost[q], w = o ? G.dz : G.dx;
      let t = la < 0 || lb < 0 ? 0.5 : clamp((cb - ca + w) / (2 * w), 0.15, 0.85);
      if (la < 0) t = 0.35; if (lb < 0) t = 0.65;
      const i = n % W, j = (n - i) / W;
      return (pt[k] = { x: G.x(i) + (o ? 0 : w * t), z: G.z(j) + (o ? w * t : 0), id: k, links: [] });
    };
    const segs = [];
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const n0 = j * W + i, n1 = n0 + 1, n2 = n0 + W + 1, n3 = n0 + W, L = [label[n0], label[n1], label[n2], label[n3]];
      if (L[0] === L[1] && L[1] === L[2] && L[2] === L[3]) continue;
      if (L.every((v) => v < 0)) continue;
      const cs = [];
      if (L[0] !== L[1]) cs.push(cross(n0, n1, 0));
      if (L[1] !== L[2]) cs.push(cross(n1, n2, 1));
      if (L[3] !== L[2]) cs.push(cross(n3, n2, 0));
      if (L[0] !== L[3]) cs.push(cross(n0, n3, 1));
      if (cs.length === 2) segs.push([cs[0], cs[1]]);
      else if (cs.length > 2) { const c = { x: G.x(i) + G.dx / 2, z: G.z(j) + G.dz / 2, id: 'c' + n0, links: [] }; for (const p of cs) segs.push([p, c]); }
    }
    for (const [a, b] of segs) { a.links.push(b); b.links.push(a); }
    // chain
    const used = new Set(), lines = [], ek = (a, b) => (a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id);
    const walk = (a, b) => {
      const line = [a, b]; used.add(ek(a, b));
      let prev = a, cur = b;
      while (cur.links.length === 2) { const nx = cur.links[0] === prev ? cur.links[1] : cur.links[0]; if (used.has(ek(cur, nx))) break; used.add(ek(cur, nx)); line.push(nx); prev = cur; cur = nx; }
      return line;
    };
    const nodes = new Set(); for (const [a, b] of segs) { nodes.add(a); nodes.add(b); }
    for (const p of nodes) if (p.links.length !== 2) for (const q of p.links) if (!used.has(ek(p, q))) lines.push(walk(p, q));
    for (const p of nodes) for (const q of p.links) if (!used.has(ek(p, q))) lines.push(walk(p, q)); // loops
    // sides: sample a little to each side of the line's middle
    const lenOf = (l) => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i].x - l[i - 1].x, l[i].z - l[i - 1].z); return s; };
    return lines.filter((l) => l.length > 1 && lenOf(l) > G.dx * 5).map((l) => {
      let pts = l.map((p) => [p.x, p.z]); if (pts.length > 2) pts = chaikin(pts, 2);
      const mI = Math.floor(pts.length / 2), a = pts[Math.max(0, mI - 1)], b = pts[Math.min(pts.length - 1, mI)], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, e = G.dx * 0.9, nx = -dz / len, nz = dx / len;
      return { pts, a: P.at(mx + nx * e, mz + nz * e), b: P.at(mx - nx * e, mz - nz * e) };
    });
  }

  // ---------------------------------------------------------------- palettes (cream, deep teal, terracotta; peaks muted)
  const WPAL = {
    autumn: {
      bg: ['#a9c2c6', '#f2e2c8'], sea: ['#1b4f5a', '#24676f', '#3b8a8d', '#7cb9b0'], foam: '#f7f2e4',
      land: ['#f1e5c9', '#dcd8b3', '#e3c28f', '#c9845e', '#6f978f', '#a3b0a8', '#f2ede2'],
      tints: ['#f5e8ca', '#dfe0bd', '#efcfb1', '#d2ddc6', '#f3dcb6', '#e6d6bd', '#c9dcd2', '#ecd9ad', '#e8c9a8', '#dfe6d2'],
      waste: '#e2d8c4', arid: '#e9d3a2', foreign: '#d7d3c7', river: ['#24676f', '#3b8a8d', '#79b8b0'],
      peakBase: ['#6e8d88', '#b08066', '#8d9089', '#5f7f86'], peakBand: '#d4c09c', peakLight: '#e9e1cf', snow: '#fbf8f0',
      trees: ['#c4723c', '#d4a24c', '#4f7f6a', '#a85a35', '#8b9a5c'], plate: ['#f2e6cf', '#c4683f', '#2b6f78'],
      key: '#fff0dc', hemi: ['#fff4e4', '#9fb4b8'], cloud: '#fffaf0',
    },
    winter: {
      bg: ['#c6d4e0', '#eef1f4'], sea: ['#2a5670', '#356f88', '#5c92a8', '#a3c8d6'], foam: '#ffffff',
      land: ['#f2f4f5', '#e7ecef', '#dde5ea', '#cfd9e1', '#a9bccb', '#c9d5de', '#fbfcfd'],
      tints: ['#f4f5f6', '#eceff1', '#e9edf0', '#f1f1ee', '#e6ebee', '#eef0f0'], waste: '#e9edf0', arid: '#ece9e0', foreign: '#dfe3e6', river: ['#356f88', '#5c92a8', '#9cc4d4'],
      peakBase: ['#7d92a5', '#9aa6b2', '#8a9cad'], peakBand: '#d9e1e8', peakLight: '#f1f5f8', snow: '#ffffff', trees: ['#4d6e78', '#6a8c94', '#8aa6ac'], plate: ['#f4f6f8', '#8fa7bb', '#4f7690'],
      key: '#f2f6ff', hemi: ['#f4f8ff', '#a9b9c6'], cloud: '#ffffff',
    },
    spring: {
      bg: ['#cfe2e6', '#f6e0d8'], sea: ['#1d5a66', '#277380', '#459aa0', '#8acbc2'], foam: '#f6fbf8',
      land: ['#eef0cf', '#d9e6b0', '#b9d494', '#9ac08a', '#6f9f8e', '#a9bbb0', '#f3f1e6'],
      tints: ['#eef1d2', '#e4ecc2', '#f1e3cf', '#dde9c6', '#efe7c9', '#e2e8cf'], waste: '#e4e3cf', arid: '#ead9ad', foreign: '#d8dccd', river: ['#277380', '#459aa0', '#86c6c0'],
      peakBase: ['#5f8f86', '#c4876a', '#7f9a8e'], peakBand: '#d9d0ac', peakLight: '#ecebd9', snow: '#fbfaf3', trees: ['#6fae67', '#e9a6b8', '#f4c9d2', '#a9cc72'], plate: ['#f1e6d0', '#d9835f', '#2f7f86'],
      key: '#fff2e0', hemi: ['#fff6ea', '#a9bfc4'], cloud: '#ffffff',
    },
    summer: {
      bg: ['#c5e0e4', '#f5e9d0'], sea: ['#175463', '#1f6e7c', '#3a96a0', '#7ccbc6'], foam: '#f4fbfa',
      land: ['#e9ebc5', '#cfe0a6', '#a9cb8c', '#86b682', '#5c9486', '#9fb5aa', '#f2f1e4'],
      tints: ['#e9ecc6', '#dde8bb', '#ecdfc0', '#d5e4be', '#e8e3c0', '#dce5c8'], waste: '#e2e0c8', arid: '#e8d6a6', foreign: '#d4d9c8', river: ['#1f6e7c', '#3a96a0', '#79c5c2'],
      peakBase: ['#4f8580', '#b97a58', '#728f84'], peakBand: '#d3cba4', peakLight: '#e8e8d6', snow: '#fbfaf3', trees: ['#2f8a62', '#58a45d', '#87bd5a', '#d9b84a'], plate: ['#f1e6d0', '#d7774f', '#2f8587'],
      key: '#fff1dc', hemi: ['#fff6ea', '#a4bfc2'], cloud: '#ffffff',
    },
  };
  function wpalette(name) {
    const p = WPAL[name] || WPAL.autumn, o = { name: WPAL[name] ? name : 'autumn' };
    for (const k of Object.keys(p)) o[k] = Array.isArray(p[k]) ? p[k].map(hex) : hex(p[k]);
    o.bgCss = p.bg; o.winter = name === 'winter';
    return o;
  }
  const TIERS = {
    low: { cs: 3.6, peaks: 130, trees: 260, dpr: 1, shadow: 0, post: false, msaa: 0, lite: true, folds: false },
    mid: { cs: 2.4, peaks: 270, trees: 700, dpr: 2, shadow: 2048, post: true, msaa: 4, lite: false, folds: true },
    high: { cs: 1.7, peaks: 400, trees: 1300, dpr: 2, shadow: 4096, post: true, msaa: 4, lite: false, folds: true },
  };

  // ---------------------------------------------------------------- the static geometry
  // spec: { baked, proj: Terrain.projection, world (data/world.json), cities (data/cities.json .cities), water, tier, season, seed }
  function buildWorld(spec) {
    const tier = TIERS[spec.tier] || TIERS.mid, pal = wpalette(spec.season || 'autumn'), seed = spec.seed || 7, S = sampler(spec.baked), B = WB;
    const rnd = rng(seed * 7919 + 101);
    // seats and their towns
    const owner = {};
    for (const f of spec.world.factions) for (const pid of (f.start && f.start.provinces) || []) owner[pid] = f.id;
    const seats = spec.world.provinces.map((p) => {
      const [x, z] = spec.proj.toWorld(p.lonlat[0], p.lonlat[1]), c = (spec.cities || {})[p.id] || {}, level = townLevel(c.rank, p.id);
      const k = TOWN_R[level] / PK._.TL(level).R;
      const own = owner[p.id] || 'neutral';
      return { id: p.id, name: p.name, city: p.city, x, z, level, scale: k, plate: PK._.townPlate(level) * k, owner: own, color: spec.colorOf ? spec.colorOf(own) : hex('#8a7a55') };
    });
    const rivers = riverList(spec.water, B, seats), lakes = lakeList(spec.water, B);
    const F = worldField({ S, B, cs: tier.cs, towns: seats, rivers, lakes, seed }); F.proj = spec.proj;
    const P = partition(S, seats, B, 3, 600), lines = borders(P);
    const G = F.G, g = F.g;
    const out = { terrain: new Builder(), water: new Builder(), mtn: new Builder(), trees: new Builder(), towns: new Builder(), borders: new Builder(), F, P, seats, rivers, lakes, pal, tier, lines };
    // what lies wet (rivers, lakes) for the dressing to keep clear of
    const wet = new Uint8Array(G.N);
    for (const r of rivers) for (const p of r.pts) stamp(G, p[0], p[1], r.hw + 2.5, (n) => { wet[n] = 1; });
    for (const L of lakes) for (const p of L.ring) stamp(G, p[0], p[1], 3, (n) => { wet[n] = 1; });
    F.wet = (x, z) => G.near(wet, x, z);
    buildLand(out.terrain, F, P, seats, pal, seed);
    buildBase(out.terrain, pal);
    buildRivers(out.water, F, rivers, pal);
    buildLakes(out.water, F, lakes, pal);
    out.peaks = buildPeaks(out.mtn, F, S, seats, pal, tier, rnd);
    buildTrees(out.trees, F, P, seats, out.peaks, pal, tier, rnd);
    buildBorders(out.borders, F, lines, seats);
    for (const t of seats) {
      const y = layerY(t.k);
      t.info = hanTown(out.towns, { x: t.x, y: y + 0.54 * t.scale, z: t.z, level: t.level, seed: t.id, scale: t.scale, lite: tier.lite });
    }
    out.tris = ['terrain', 'water', 'mtn', 'trees', 'towns', 'borders'].reduce((s, k) => s + out[k].tris, 0);
    return out;
  }

  // the stacked cards: tops coloured by layer, province tint and paper patches, cut edges with a bright lip (white foam in the sea)
  function buildLand(B, F, P, seats, pal, seed) {
    const G = F.G, W = G.W, g = F.g, tints = seats.map((s, i) => pal.tints[(strSeed(s.id) + i) % pal.tints.length]);
    const colAt = (k, x, z, hv) => {
      if (k <= SEA_TOP) { const c = pal.sea[k]; return shade(c, 0.97 + 0.06 * vnoise(x / 11, z / 11, seed + 5)); }
      let c = pal.land[clamp(k - LAND0, 0, pal.land.length - 1)];
      const li = P.at(x, z), ch = G.near(F.china, x, z), ar = G.near(F.arid, x, z) / 255;
      if (li >= 0) c = mix(c, tints[li], k <= 6 ? 0.55 : 0.22);
      else if (ch >= 128) c = mix(c, pal.waste, 0.32);
      else c = mix(c, pal.foreign, 0.6);
      if (ar > 0.15 && k <= 8) c = mix(c, pal.arid, 0.55 * smooth(0.15, 0.6, ar));
      const patch = fbm(x / 34, z / 34, seed + 53, 2);
      c = shade(c, 0.95 + 0.1 * patch);
      return shade(c, 1 - 0.38 * smooth(k + 0.15, k + 1, hv)); // the card darkens where the next one lies over it
    };
    for (let k = 1; k <= TOPK; k++) {
      const y1 = layerY(k), y0 = layerY(k - 1), base = k <= SEA_TOP ? pal.sea[k] : pal.land[clamp(k - LAND0, 0, pal.land.length - 1)];
      contourCells(G, g, k, (poly) => B.fan(poly.map((p) => [p.x, y1, p.z]), poly.map((p) => colAt(k, p.x, p.z, p.c ? k : p.f + k)), UP),
        (a, b, ox, oz) => (k <= SEA_TOP ? foamWall(B, a.x, a.z, b.x, b.z, y0, y1, ox, oz, base, pal.foam) : wallQuad(B, a.x, a.z, b.x, b.z, y0, y1, ox, oz, k === LAND0 ? mix(base, hex('#d9c39a'), 0.4) : base)));
      // the frame's cut sides
      frameSides(G, g, k, (ax, az, bx, bz, ox, oz) => (k <= SEA_TOP ? foamWall(B, ax, az, bx, bz, y0, y1, ox, oz, base, pal.foam) : wallQuad(B, ax, az, bx, bz, y0, y1, ox, oz, base)));
    }
  }
  function contourCells(G, vals, k, onTop, onWall) {
    const { nx, nz, x0, z0, dx, dz, W } = G;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const f0 = vals[j * W + i] - k, f1 = vals[j * W + i + 1] - k, f2 = vals[(j + 1) * W + i + 1] - k, f3 = vals[(j + 1) * W + i] - k;
      if (f0 < 0 && f1 < 0 && f2 < 0 && f3 < 0) continue;
      const poly = sliceCell(x0 + i * dx, z0 + j * dz, dx, dz, f0, f1, f2, f3), n = poly.length;
      if (!(f0 >= 1 && f1 >= 1 && f2 >= 1 && f3 >= 1)) onTop(poly);
      if (f0 >= 0 && f1 >= 0 && f2 >= 0 && f3 >= 0) continue;
      let cx = 0, cz = 0; for (const p of poly) { cx += p.x; cz += p.z; } cx /= n; cz /= n;
      for (let m = 0; m < n; m++) { const p = poly[m], q = poly[(m + 1) % n]; if (p.c && q.c) onWall(p, q, (p.x + q.x) / 2 - cx, (p.z + q.z) / 2 - cz); }
    }
  }
  function frameSides(G, vals, k, emit) {
    const W = G.W, X1 = G.x0 + G.nx * G.dx, Z1 = G.z0 + G.nz * G.dz;
    const edge = (na, nb, pa, pb, ox, oz) => { const iv = edgeInterval(vals[na] - k, vals[nb] - k); if (!iv) return; emit(lerp(pa[0], pb[0], iv[0]), lerp(pa[1], pb[1], iv[0]), lerp(pa[0], pb[0], iv[1]), lerp(pa[1], pb[1], iv[1]), ox, oz); };
    for (let i = 0; i < G.nx; i++) {
      edge(i, i + 1, [G.x(i), G.z0], [G.x(i + 1), G.z0], 0, -1);
      edge(G.nz * W + i, G.nz * W + i + 1, [G.x(i), Z1], [G.x(i + 1), Z1], 0, 1);
    }
    for (let j = 0; j < G.nz; j++) {
      edge(j * W, (j + 1) * W, [G.x0, G.z(j)], [G.x0, G.z(j + 1)], -1, 0);
      edge(j * W + G.nx, (j + 1) * W + G.nx, [X1, G.z(j)], [X1, G.z(j + 1)], 1, 0);
    }
  }
  // a sea card's cut edge: a broad white foam lip over the teal
  function foamWall(B, ax, az, bx, bz, y0, y1, ox, oz, base, foam) {
    const ym = y1 - (y1 - y0) * 0.42, d = [ox, 0, oz], body = shade(base, 0.72);
    B.quad([ax, ym, az], [bx, ym, bz], [bx, y1 + 0.02, bz], [ax, y1 + 0.02, az], [shade(foam, 0.88), shade(foam, 0.88), foam, foam], d);
    B.quad([ax, y0, az], [bx, y0, bz], [bx, ym, bz], [ax, ym, az], [shade(body, 0.7), shade(body, 0.7), body, body], d);
  }
  // the card base the diorama stands on: the sea floor card, a cream mount, a terracotta card, a teal inlay line
  function buildBase(B, pal) {
    const { x0, x1, z0, z1 } = WB, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, y = BASE_Y;
    B.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], shade(pal.sea[0], 0.95), UP);
    box(B, cx, y - 1.2, cz, w, 1.2, d, 0, shade(pal.sea[0], 0.8), shade(pal.sea[0], 0.75), shade(pal.sea[0], 0.5));
    box(B, cx, y - 1.3, cz, w + 2.4, 0.0001, d + 2.4, 0, pal.plate[2], pal.plate[2], pal.plate[2]);
    box(B, cx, y - 3.2, cz, w + 9, 1.9, d + 9, 0, pal.plate[0], shade(pal.plate[0], 0.9), shade(pal.plate[0], 0.6));
    box(B, cx, y - 5.0, cz, w + 20, 1.8, d + 20, 0, pal.plate[1], shade(pal.plate[1], 0.9), shade(pal.plate[1], 0.55));
  }

  // rivers: three stacked wavy paper strips (deep, mid, light teal), white foam lips along the banks, crests across the water
  function buildRivers(B, F, rivers, pal) {
    for (const r of rivers) {
      const n = r.pts.length, tan = [];
      for (let i = 0; i < n; i++) { const a = r.pts[Math.max(0, i - 1)], b = r.pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; tan.push([dx / l, dz / l]); }
      const ys = r.k.map((k) => layerY(k));
      const strips = [{ w: r.hw + 0.7, dy: 0.1, col: pal.river[0], amp: 0.3, f: 0.5, ph: 0 }, { w: r.hw + 0.15, dy: 0.2, col: pal.river[1], amp: 0.26, f: 0.75, ph: 1.7 }, { w: r.hw * 0.62, dy: 0.3, col: pal.river[2], amp: 0.22, f: 1.1, ph: 3.1 }];
      const P = (i, side, w, dy) => [r.pts[i][0] - tan[i][1] * side * w, ys[i] + dy, r.pts[i][1] + tan[i][0] * side * w];
      for (const st of strips) {
        const wv = (i) => Math.max(0.25, st.w + st.amp * Math.sin(i * 1.6 * st.f + st.ph) + 0.12 * Math.sin(i * 3.7 + st.ph * 2));
        for (let i = 0; i + 1 < n; i++) {
          if (!r.wet[i] || !r.wet[i + 1]) continue;
          const wa = wv(i), wb = wv(i + 1), c = shade(st.col, (i >> 1) & 1 ? 0.97 : 1.03), dk = shade(st.col, 0.55);
          const La = P(i, 1, wa, st.dy), Lb = P(i + 1, 1, wb, st.dy), Ra = P(i, -1, wa, st.dy), Rb = P(i + 1, -1, wb, st.dy);
          B.quad(La, Lb, Rb, Ra, c, UP);
          const drop = 0.14;
          for (const [A2, B2, s] of [[La, Lb, 1], [Ra, Rb, -1]]) B.quad([A2[0], A2[1] - drop, A2[2]], [B2[0], B2[1] - drop, B2[2]], B2, A2, [dk, dk, lighten(st.col, 0.2), lighten(st.col, 0.2)], [-tan[i][1] * s, 0, tan[i][0] * s]);
          if (ys[i + 1] < ys[i] - 0.1) { // a cascade where the river steps down a card: foam across it
            const fa = P(i, 1, wa * 1.05, st.dy + 0.03), fb = P(i, -1, wa * 1.05, st.dy + 0.03), fc = P(i + 1, -1, wb * 1.05, st.dy + 0.03), fd = P(i + 1, 1, wb * 1.05, st.dy + 0.03);
            if (st === strips[2]) B.quad(fa, fd, fc, fb, pal.foam, UP);
          }
        }
      }
      // foam lips: broken white ribbons near both banks of the light strip, and crests
      const s3 = strips[2];
      for (const side of [1, -1]) for (let i = 0; i + 1 < n; i++) {
        if (!r.wet[i] || !r.wet[i + 1] || ((i + (side > 0 ? 0 : 4)) % 7) > 4) continue;
        const w0 = s3.w + 0.18 + 0.22 * Math.sin(i * 1.3 + side), w1 = s3.w + 0.18 + 0.22 * Math.sin((i + 1) * 1.3 + side);
        B.quad(P(i, side, w0, 0.34), P(i + 1, side, w1, 0.34), P(i + 1, side, w1 - 0.3, 0.34), P(i, side, w0 - 0.3, 0.34), pal.foam, UP);
      }
      if (r.hw >= 2) for (let i = 3; i + 2 < n; i += 6) {
        if (!r.wet[i] || !r.wet[i + 2]) continue;
        const w = s3.w * 0.5, o = ((i * 7) % 5 - 2) * 0.15;
        B.quad(P(i, 1, w * (0.3 + o), 0.36), P(i + 2, 1, w * (0.1 + o), 0.36), P(i + 2, -1, w * (0.5 - o), 0.36), P(i, -1, w * (0.2 - o), 0.36), lighten(pal.river[2], 0.55), UP);
      }
    }
  }
  // lakes: the same stacked strips as nested cut sheets of the lake's signed distance, a foam lip round the shore
  function buildLakes(B, F, lakes, pal) {
    for (const L of lakes) {
      const xs = L.ring.map((p) => p[0]), zs = L.ring.map((p) => p[1]), cs = 0.8;
      const G = grid({ x0: Math.min(...xs) - 3, x1: Math.max(...xs) + 3, z0: Math.min(...zs) - 3, z1: Math.max(...zs) + 3 }, cs), sd = new Float32Array(G.N);
      for (let j = 0; j <= G.nz; j++) for (let i = 0; i <= G.nx; i++) { const x = G.x(i), z = G.z(j); sd[j * G.W + i] = -ringSD(x, z, L.ring) + 0.35 * (vnoise(x / 3, z / 3, 17) - 0.5); }
      const y = layerY(L.k);
      const sheets = [{ lv: -1.0, dy: 0.1, col: pal.river[0] }, { lv: 0.6, dy: 0.2, col: pal.river[1] }, { lv: 2.2, dy: 0.3, col: pal.river[2] }];
      for (const s of sheets) {
        const vals = sd.map((v) => v - s.lv + 1); // the sheet covers sd >= lv
        contourCells(G, vals, 1, (poly) => B.fan(poly.map((p) => [p.x, y + s.dy, p.z]), s.col, UP), (a, b, ox, oz) => {
          const dk = shade(s.col, 0.55); B.quad([a.x, y + s.dy - 0.14, a.z], [b.x, y + s.dy - 0.14, b.z], [b.x, y + s.dy, b.z], [a.x, y + s.dy, a.z], [dk, dk, lighten(s.col, 0.2), lighten(s.col, 0.2)], [ox, 0, oz]);
        });
      }
      // foam: a broken white lip just inside the shore
      let m = 0;
      contourCells(G, sd.map((v) => v + 0.5 + 1), 1, () => {}, (a, b, ox, oz) => {
        if ((m++ % 6) > 3) return;
        const l = Math.hypot(ox, oz) || 1, nx = ox / l * 0.45, nz = oz / l * 0.45;
        B.quad([a.x, y + 0.33, a.z], [b.x, y + 0.33, b.z], [b.x - nx, y + 0.33, b.z - nz], [a.x - nx, y + 0.33, a.z - nz], pal.foam, UP);
      });
    }
  }

  // ---------------------------------------------------------------- origami ranges: clusters of folded peaks where the real relief is
  // A peak: five rings of points that alternate in and out (spurs and gullies: many small creases), a crest; facets coloured in
  // strata by height (base card, a sand band, pale stone, a cream or snow crown), every facet its own tone.
  function peak(B, cx, cz, y0, R, H, n, pal, rnd, o) {
    const spec = [[1.0, 0], [0.8, 0.2], [0.6, 0.42], [0.4, 0.63], [0.2, 0.83]], rings = [];
    const base = o.base, band = mix(pal.peakBand, base, 0.25), crown = o.snow ? pal.snow : pal.peakLight, rot = rnd() * 6.28, lean = [(rnd() - 0.5) * R * 0.25, (rnd() - 0.5) * R * 0.25];
    spec.forEach(([rf, hf], ri) => {
      const ring = [];
      for (let i = 0; i < n; i++) {
        const a = rot + ((i + (ri & 1) * 0.5 + (rnd() - 0.5) * 0.3) / n) * Math.PI * 2, spur = i & 1 ? 1.14 : 0.86, r = R * rf * spur * (0.9 + 0.2 * rnd());
        ring.push([cx + Math.cos(a) * r + lean[0] * hf, y0 + H * hf * (ri ? 0.92 + 0.16 * rnd() : 1), cz + Math.sin(a) * r * 0.92 + lean[1] * hf]);
      }
      rings.push(ring);
    });
    const top = [cx + lean[0], y0 + H, cz + lean[1]];
    const strata = (f) => (f < 0.3 ? base : f < 0.38 ? band : f < 0.56 ? mix(base, pal.peakLight, 0.3) : f < 0.64 ? band : f < 0.78 ? mix(pal.peakLight, base, 0.15) : crown);
    const facet = (a, b, c) => {
      const f = clamp(((a[1] + b[1] + c[1]) / 3 - y0) / H, 0, 1), col = shade(strata(f), 0.86 + 0.24 * rnd());
      B.tri(a, b, c, col, [(a[0] + b[0] + c[0]) / 3 - cx, 0.3, (a[2] + b[2] + c[2]) / 3 - cz]);
    };
    for (let r = 0; r + 1 < rings.length; r++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = rings[r][i], b = rings[r][j], c = rings[r + 1][j], d = rings[r + 1][i];
      if ((i + r) & 1) { facet(a, b, c); facet(a, c, d); } else { facet(a, b, d); facet(b, c, d); }
    }
    const last = rings[rings.length - 1];
    for (let i = 0; i < n; i++) facet(last[i], last[(i + 1) % n], top);
  }
  // the ranges the overview must show as folded paper (lon, lat polylines): Qinling, Daba, Taihang, Dabie, Wuyi, Nanling, Wuling,
  // the plateau's eastern edge (Hengduan, Min shan), Qilian, Yin shan
  const RANGES = [
    [[104.3, 34.3], [106.5, 34.0], [108.5, 33.9], [110.2, 33.8], [111.5, 33.6]], [[106.3, 32.4], [108.3, 32.0], [110.2, 31.5]],
    [[112.6, 35.3], [113.5, 36.5], [113.9, 37.8], [114.3, 39.3]], [[114.2, 31.3], [115.6, 31.1], [116.6, 30.9]], [[116.3, 26.3], [117.5, 27.4], [118.6, 28.3]],
    [[109.8, 25.4], [112.0, 25.2], [114.3, 24.8], [115.4, 24.6]], [[108.4, 28.2], [109.6, 29.0], [110.6, 29.9]],
    [[102.2, 27.0], [102.6, 29.2], [103.0, 30.9], [103.6, 32.4], [104.0, 33.3]], [[97.8, 39.2], [99.8, 38.4], [101.8, 37.6], [103.0, 37.0]], [[106.6, 41.0], [109.5, 41.1], [112.0, 41.2]],
  ];
  function buildPeaks(B, F, S, seats, pal, tier, rnd) {
    const cand = [], sp = 6.5, lines = (F.proj ? RANGES.map((L) => L.map((p) => F.proj.toWorld(p[0], p[1]))) : []);
    const nearRange = (x, z) => { let d = 1e9; for (const L of lines) for (let i = 0; i + 1 < L.length; i++) { const a = L[i], b = L[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / l2, 0, 1); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; };
    for (let z = WB.z0 + 6; z < WB.z1 - 6; z += sp) for (let x = WB.x0 + 6; x < WB.x1 - 6; x += sp) {
      const px = x + (rnd() - 0.5) * sp * 0.8, pz = z + (rnd() - 0.5) * sp * 0.8, m = Math.max(0, S.metres(S.H(px, pz)));
      if (m < 450) continue;
      let lo = 1e9, hi = -1e9;
      for (let a = 0; a < 8; a++) { const mm = S.metres(S.H(px + Math.cos(a * 0.785) * 7, pz + Math.sin(a * 0.785) * 7)); lo = Math.min(lo, mm); hi = Math.max(hi, mm); }
      const relief = Math.max(hi, m) - lo;
      const rg = nearRange(px, pz) < 14 ? 1 : 0;
      if (relief < (rg ? 250 : 420) && m < 3300) continue;
      cand.push({ x: px, z: pz, m, relief: Math.max(relief, rg * 700), score: relief / 900 + Math.max(0, m - 1200) / 2600 + rg * 3 + rnd() * 0.35 });
    }
    cand.sort((a, b) => b.score - a.score);
    const placed = [];
    const clear = (x, z, r) => {
      for (const t of seats) if (Math.hypot(x - t.x, z - t.z) < t.plate + r + 2) return false;
      for (let a = 0; a < 6; a++) if (F.wet(x + Math.cos(a) * r * 0.55, z + Math.sin(a) * r * 0.55)) return false;
      if (F.wet(x, z)) return false;
      for (const p of placed) if (Math.hypot(x - p.x, z - p.z) < (p.r + r) * (p.main ? 0.9 : 0.6)) return false;
      return true;
    };
    for (const c of cand) {
      if (placed.length >= tier.peaks) break;
      const H = clamp(4.5 + c.relief * 0.0085 + (c.m > 3000 ? 3 : 0), 5, 22), R = H * (0.72 + 0.2 * rnd());
      if (!clear(c.x, c.z, R)) continue;
      // the cluster: the main peak and two or three shoulders
      const baseCol = pal.peakBase[Math.floor(rnd() * pal.peakBase.length)], snow = c.m > 2600 || H > 11, members = [[c.x, c.z, R, H]];
      for (let s = 0; s < 2 + Math.floor(rnd() * 2); s++) {
        const a = rnd() * 6.28, d = R * (0.6 + 0.35 * rnd()), sx = c.x + Math.cos(a) * d, sz = c.z + Math.sin(a) * d, f = 0.45 + 0.3 * rnd();
        if (!F.wet(sx, sz)) members.push([sx, sz, R * f * 1.05, H * f]);
      }
      for (const [x, z, r, h] of members) {
        let y0 = 1e9; for (let a = 0; a < 6; a++) y0 = Math.min(y0, F.topY(x + Math.cos(a) * r * 0.8, z + Math.sin(a) * r * 0.8));
        y0 = Math.min(y0, F.topY(x, z)) - 0.25;
        peak(B, x, z, y0, r, h + (F.topY(x, z) - y0) * 0.5, tier.lite ? 8 : 10 + Math.floor(rnd() * 3) * 2, pal, rnd, { base: baseCol, snow });
        placed.push({ x, z, r, main: x === c.x });
      }
    }
    return placed;
  }

  // rolled-paper groves where the bake says forest, kept off rivers, towns and peaks
  function buildTrees(B, F, P, seats, peaks, pal, tier, rnd) {
    let placed = 0, tries = 0;
    while (placed < tier.trees && tries++ < tier.trees * 12) {
      const cx = WB.x0 + 8 + rnd() * (WB.x1 - WB.x0 - 16), cz = WB.z0 + 8 + rnd() * (WB.z1 - WB.z0 - 16), k = F.topK(cx, cz);
      if (k < LAND0 || k > 8 || F.G.near(F.forest, cx, cz) < 110 || F.wet(cx, cz)) continue;
      if (seats.some((t) => Math.hypot(cx - t.x, cz - t.z) < t.plate + 5)) continue;
      if (peaks.some((p) => Math.hypot(cx - p.x, cz - p.z) < p.r * 0.9)) continue;
      const fam = Math.floor(rnd() * pal.trees.length), cnt = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < cnt; i++) {
        const a = rnd() * 6.28, r = 0.5 + rnd() * 2.6, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = F.at(x, z), fr = h - Math.floor(h);
        if (Math.floor(h) !== k || fr < 0.25 || F.wet(x, z)) continue;
        const kind = k >= 7 || rnd() < 0.2 ? 'pine' : rnd() < 0.15 ? 'cypress' : 'bush', col = pal.trees[(fam + (rnd() < 0.25 ? 1 : 0)) % pal.trees.length];
        paperTree(B, x, layerY(k), z, kind, 0.85 + 0.45 * rnd(), kind === 'pine' ? mix(col, pal.trees[2], 0.6) : col, pal, rnd); placed++;
      }
    }
  }

  // province borders: a raised paper ribbon, each half in the colour of the faction that owns that side (cream where both sides
  // share an owner), riding over the cards
  function buildBorders(B, F, lines, seats) {
    const fc = (li) => (li >= 0 ? seats[li].color : null);
    for (const L of lines) {
      const ca = fc(L.a), cb = fc(L.b); if (!ca && !cb) continue;
      const same = L.a >= 0 && L.b >= 0 && seats[L.a].owner === seats[L.b].owner;
      const pts = resample(L.pts, 1.2), n = pts.length; if (n < 2) continue;
      const ys = pts.map((p) => F.topY(p[0], p[1]));
      const top = ys.map((y, i) => { let m = y; for (let k = -2; k <= 2; k++) m = Math.max(m, ys[clamp(i + k, 0, n - 1)]); return m + 0.32; });
      for (let pass = 0; pass < 2; pass++) for (let i = 1; i + 1 < n; i++) top[i] = Math.max(ys[i] + 0.3, (top[i - 1] + 2 * top[i] + top[i + 1]) / 4);
      const W = same ? 0.7 : 1.5, th = 0.38, cream = hex('#f6eedc');
      const halves = same ? [[-W, W, cream]] : [[0, W, ca || cream], [-W, 0, cb || cream]];
      for (let i = 0; i + 1 < n; i++) {
        const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
        for (const [w0, w1, col] of halves) {
          if (!col) continue;
          const p = (q, w, y) => [q[0] + nx * w, y, q[1] + nz * w], c = shade(col, i & 1 ? 1 : 0.95), dk = shade(col, 0.6);
          B.quad(p(a, w0, top[i]), p(b, w0, top[i + 1]), p(b, w1, top[i + 1]), p(a, w1, top[i]), c, UP);
          const ow = w1 > 0 ? w1 : w0, s = w1 > 0 ? 1 : -1;
          B.quad(p(a, ow, top[i] - th), p(b, ow, top[i + 1] - th), p(b, ow, top[i + 1]), p(a, ow, top[i]), [dk, dk, c, c], [nx * s, 0, nz * s]);
        }
        if (!same) { const p = (q, w, y) => [q[0] + nx * w, y, q[1] + nz * w], cr = cream; B.quad(p(a, -0.22, top[i] + 0.02), p(b, -0.22, top[i + 1] + 0.02), p(b, 0.22, top[i + 1] + 0.02), p(a, 0.22, top[i] + 0.02), cr, UP); }
      }
    }
  }

  // paper clouds: stacked discs drifting over the frame's edges (they cast soft shadows on the cards)
  function buildClouds(B, pal, rnd) {
    for (const [cx, cz, y, sc] of [[-360, -300, 46, 1.6], [250, -330, 52, 1.3], [-380, 300, 50, 1.5], [290, 330, 44, 1.2], [-60, -380, 58, 1.0], [300, 60, 60, 1.1]]) {
      for (let i = 0; i < 5; i++) {
        const r = (5.2 - Math.abs(i - 2) * 0.9 + rnd()) * sc, x = cx + (i - 2) * 5.2 * sc, yy = y + (i % 2) * 1.6 * sc;
        frustum(B, x, cz + (rnd() - 0.5) * 3, yy, yy + 0.9 * sc, r, r * 0.9, 16, 0, shade(pal.cloud, 0.82), pal.cloud, { sz: 0.62, cap: pal.cloud, bottom: shade(pal.cloud, 0.7) });
      }
    }
  }

  // the five levels of town side by side on a paper board (paper.html?map=towns): a review sheet for the town kit
  function townsBoard(THREE, doc, q, tierName, tier, P, $) {
    const ST = PK.makeStage({ THREE, doc, q, tier: Object.assign({ aa: true }, tier) }), { renderer, scene, cam, hemi, key, lam, renderFrame } = ST, pal = wpalette('autumn');
    const B = new Builder(), xs = [-34, -19, -3, 15, 35];
    box(B, 0, -1.2, 0, 96, 1.2, 30, 0, pal.land[0], shade(pal.land[0], 0.9), shade(pal.land[0], 0.6));
    box(B, 0, -2.4, 0, 100, 1.2, 34, 0, pal.plate[1], shade(pal.plate[1], 0.9), shade(pal.plate[1], 0.55));
    const flagAt = [];
    for (let lv = 0; lv < 5; lv++) flagAt.push(hanTown(B, { x: xs[lv], y: 0.54, z: 0, level: lv, seed: 'board' + lv, scale: 1, lite: tier.lite }));
    const m = new THREE.Mesh(B.geometry(THREE), lam); m.castShadow = m.receiveShadow = true; scene.add(m);
    hemi.color.setRGB(...pal.hemi[0]); hemi.groundColor.setRGB(...pal.hemi[1]); key.color.setRGB(...pal.key);
    scene.background = new THREE.Color().setRGB(...mix(pal.bg[0], pal.bg[1], 0.5)); scene.fog = null;
    const el = +q.get('el') || 0.62, d = +q.get('d') || 80, tx = +q.get('tx') || 0;
    cam.fov = 30; cam.near = 1; cam.far = 1000; cam.position.set(tx, Math.sin(el) * d, Math.cos(el) * d); cam.lookAt(tx, 0, 0); cam.updateProjectionMatrix();
    key.position.set(tx - 50, 70, 40); key.target.position.set(tx, 0, 0); key.target.updateMatrixWorld();
    if (tier.shadow) { const sc = key.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 300; sc.updateProjectionMatrix(); }
    Object.assign(ST.tilt, { c: 0.5, w0: 0.3, w1: 0.8, top: 1.2, bot: 1.2 });
    xs.forEach((x, lv) => { const e = doc.createElement('div'); e.className = 'lbl'; e.textContent = 'Lũy ' + lv; doc.body.appendChild(e); const v = new THREE.Vector3(x, 0, 9).project(cam); e.style.transform = `translate(${((v.x + 1) / 2) * renderer.domElement.clientWidth - 20}px,${((1 - v.y) / 2) * renderer.domElement.clientHeight}px)`; });
    $('info').hidden = true; $('season').textContent = 'Thành trì · lũy 0–4';
    let frames = 0;
    const frame = () => { renderer.info.reset(); renderFrame(); if (++frames === 2) { root.__extra = { tier: tierName, map: 'towns', tris: renderer.info.render.triangles, calls: renderer.info.render.calls, perTown: flagAt.map((f) => f.tris) }; $('boot').classList.add('out'); root.__done = true; P.ready = true; } root.requestAnimationFrame(frame); };
    root.requestAnimationFrame(frame);
  }

  // ================================================================ the page (view-only)
  function boot() {
    const THREE = root.THREE, doc = root.document, TR = root.Terrain, $ = (id) => doc.getElementById(id);
    const q = new URLSearchParams(root.location.search);
    const tierName = TIERS[q.get('tier')] ? q.get('tier') : 'mid', tier = TIERS[tierName];
    const SEASON_KEY = { 'Xuân': 'spring', 'Hạ': 'summer', 'Thu': 'autumn', 'Đông': 'winter' }, SEASON_VI = { spring: 'Xuân', summer: 'Hạ', autumn: 'Thu', winter: 'Đông' };
    const sq = q.get('season') ? q.get('season').normalize('NFC') : 'Thu', season = SEASON_KEY[sq] || (WPAL[sq] ? sq : 'autumn');
    const P = { ready: false, tier: tierName, map: 'world' }; root.__paper = P;
    for (const id of ['res', 'end', 'ask']) { const e = $(id); if (e) e.style.display = 'none'; }
    if (q.get('map') === 'towns') return townsBoard(THREE, doc, q, tierName, tier, P, $);
    doc.title = 'Thiên hạ bằng giấy';
    const t0 = performance.now();
    const json = (u) => fetch(u).then((r) => r.json());
    Promise.all([json('data/world.json'), json('data/cities.json'), TR.loadBaked('assets/map/', { tiles: () => false })])
      .then(([world, cities, baked]) => Promise.all(world.factions.map((f) => json('data/personas/' + f.id + '.json').catch(() => ({})))).then((ps) => run(world, cities.cities, baked, ps)))
      .catch((e) => { root.__error = String(e && e.stack || e); $('boot').textContent = 'Lỗi: ' + e.message; });

    function run(world, cities, baked, personas) {
      const proj = TR.projection(baked.meta.projection);
      const FAC = { neutral: { color: '#8a7a55', glyph: '守', name: 'Trung lập' } };
      world.factions.forEach((f, i) => { FAC[f.id] = { color: f.color, glyph: (personas[i] && personas[i].glyph) || '軍', name: (personas[i] && personas[i].name) || f.id }; });
      const tb = performance.now();
      const st = buildWorld({ baked, proj, world, cities, water: baked.water, tier: tierName, season, seed: 7, colorOf: (fid) => hex((FAC[fid] || FAC.neutral).color) });
      const rnd = rng(99); const clouds = new Builder(); buildClouds(clouds, st.pal, rnd);
      const buildMs = Math.round(performance.now() - tb);
      const pal = st.pal;
      // ---- stage
      const ST = PK.makeStage({ THREE, doc, q, tier: Object.assign({ aa: true }, tier) });
      const { renderer, scene, cam, hemi, key, lam, renderFrame } = ST;
      cam.fov = 30; cam.near = 2; cam.far = 5000; cam.updateProjectionMatrix();
      const add = (b, cast, recv) => { const m = new THREE.Mesh(b.geometry(THREE), lam); m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
      const terrainMesh = add(st.terrain, true, true); add(st.water, false, true); add(st.mtn, true, true); add(st.trees, true, true); add(st.towns, true, true); add(st.borders, false, true); add(clouds, true, false);
      hemi.color.setRGB(...pal.hemi[0]); hemi.groundColor.setRGB(...pal.hemi[1]); hemi.intensity = 0.5; key.color.setRGB(...pal.key); key.intensity = 0.95;
      const sk = doc.createElement('canvas'); sk.width = 4; sk.height = 256; const sx = sk.getContext('2d'), sg = sx.createLinearGradient(0, 0, 0, 256); sg.addColorStop(0, pal.bgCss[0]); sg.addColorStop(1, pal.bgCss[1]); sx.fillStyle = sg; sx.fillRect(0, 0, 4, 256);
      scene.background = new THREE.CanvasTexture(sk); scene.fog.color.setRGB(...mix(mix(hex(pal.bgCss[0]), hex(pal.bgCss[1]), 0.5), [0.85, 0.88, 0.9], 0.3));
      doc.documentElement.style.setProperty('--bg1', pal.bgCss[0]); doc.documentElement.style.setProperty('--bg2', pal.bgCss[1]);
      if (tier.shadow) { key.shadow.camera.far = 3000; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.25; }
      // ---- banners over the halls
      const texs = {};
      const glyphTex = (fid) => {
        if (texs[fid]) return texs[fid];
        const f = FAC[fid] || FAC.neutral, cv = doc.createElement('canvas'); cv.width = 192; cv.height = 112; const c = cv.getContext('2d');
        c.fillStyle = f.color; c.fillRect(0, 0, 192, 112); c.strokeStyle = '#f6ead0'; c.lineWidth = 5; c.strokeRect(9, 9, 174, 94);
        c.fillStyle = '#f6ead0'; c.font = '700 78px "WenQuanYi Zen Hei","Noto Sans CJK SC","Noto Sans CJK JP","Microsoft YaHei","PingFang SC",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.glyph, 96, 60);
        const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return (texs[fid] = tx);
      };
      const flags = [], banners = [];
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
      for (const t of st.seats) {
        const g = new THREE.Group(); g.position.set(...t.info.flagAt);
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), poleMat); pole.position.y = 1.7; g.add(pole);
        const geo = new THREE.PlaneGeometry(2.6, 1.5, 5, 2); geo.translate(1.3, 0, 0);
        const flag = new THREE.Mesh(geo, ST.paperize(new THREE.MeshLambertMaterial({ map: glyphTex(t.owner), side: THREE.DoubleSide }), 0.04));
        flag.position.set(0.08, 2.75, 0); flag.castShadow = true; flag.userData = { base: Float32Array.from(geo.attributes.position.array), ph: t.x }; g.add(flag);
        scene.add(g); flags.push(flag); banners.push(g);
      }
      // ---- labels
      const labels = st.seats.map((t) => {
        const el = doc.createElement('div'); el.className = 'lbl'; el.innerHTML = `<i style="background:${(FAC[t.owner] || FAC.neutral).color}"></i>${t.name}<small>${t.city}</small>`; doc.body.appendChild(el); return el;
      });
      // ---- camera: overview of all China, pan and zoom down to a province
      const CX = (WB.x0 + WB.x1) / 2, CZ = (WB.z0 + WB.z1) / 2 - 10;
      let fitMemo = null;
      const fitDist = () => { // the distance at which the whole plate (and its card mount) fits the screen at the overview's tilt
        if (fitMemo && fitMemo.a === cam.aspect) return fitMemo.d;
        const el = 0.98, c = new THREE.PerspectiveCamera(cam.fov, cam.aspect, 1, 1e5), v = new THREE.Vector3();
        const pts = []; for (const x of [WB.x0 - 10, WB.x1 + 10]) for (const z of [WB.z0 - 10, WB.z1 + 10]) for (const y of [-8, 6]) pts.push([x, y, z]);
        const fits = (d) => { c.position.set(CX, 2 + Math.sin(el) * d, CZ + Math.cos(el) * d); c.lookAt(CX, 2, CZ); c.updateMatrixWorld(); return pts.every((p) => { v.set(p[0], p[1], p[2]).project(c); return Math.abs(v.x) < 0.985 && v.y > -0.96 && v.y < 0.9; }); };
        let lo = 100, hi = 8000; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
        fitMemo = { a: cam.aspect, d: hi }; return hi;
      };
      const camS = { tx: CX, tz: CZ, dist: fitDist() }, camT = Object.assign({}, camS);
      const minD = 22;
      const clampCam = () => { const m = fitDist(), f = smooth(m * 0.9, m * 0.35, camT.dist); camT.dist = clamp(camT.dist, minD, m * 1.1); camT.tx = clamp(camT.tx, lerp(CX, WB.x0, f), lerp(CX, WB.x1, f)); camT.tz = clamp(camT.tz, lerp(CZ, WB.z0 + 20, f), lerp(CZ, WB.z1 - 10, f)); };
      const seatById = Object.fromEntries(st.seats.map((t) => [t.id, t]));
      const focusOn = (id, d) => { const t = seatById[id]; if (!t) return; camT.tx = t.x; camT.tz = t.z + 2; camT.dist = d || 110; clampCam(); };
      const elev = (d) => lerp(0.62, 0.98, smooth(60, fitDist() * 0.9, d)); // close in, the camera drops towards the horizon
      function updateCam(snap) {
        const k = snap ? 1 : 0.14;
        for (const f of ['tx', 'tz', 'dist']) camS[f] = lerp(camS[f], camT[f], k);
        const el = elev(camS.dist), ty = lerp(F.topY(camS.tx, camS.tz), 2, smooth(150, 600, camS.dist));
        cam.position.set(camS.tx, ty + Math.sin(el) * camS.dist, camS.tz + Math.cos(el) * camS.dist); cam.lookAt(camS.tx, ty, camS.tz);
        cam.near = Math.max(1, camS.dist * 0.04); cam.far = camS.dist * 5 + 400; cam.updateProjectionMatrix();
        key.position.set(camS.tx - 0.45 * Math.max(200, camS.dist), Math.max(200, camS.dist) * 0.8, camS.tz + 0.28 * Math.max(200, camS.dist)); key.target.position.set(camS.tx, 0, camS.tz - camS.dist * 0.08); key.target.updateMatrixWorld();
        scene.fog.near = camS.dist * 1.5; scene.fog.far = camS.dist * 5;
        if (tier.shadow) { const e = clamp(camS.dist * 0.7, 40, 560), sc = key.shadow.camera; if (Math.abs(sc.right - e) > 0.5) { sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 10; sc.far = Math.max(600, camS.dist * 3); sc.updateProjectionMatrix(); } }
        // tilt-shift: gentle over the overview (the far ranges stay legible), a narrow sharp band close in
        const z = smooth(70, fitDist() * 0.85, camS.dist);
        Object.assign(ST.tilt, { c: lerp(0.47, 0.5, z), w0: lerp(0.2, 0.36, z), w1: lerp(0.62, 0.8, z), top: lerp(2.6, 0.9, z), bot: lerp(2.2, 1.3, z) });
      }
      const F = st.F;
      const uiScale = () => clamp(camS.dist / 90, 0.7, 7);
      // ---- input
      const cv = renderer.domElement; cv.style.touchAction = 'none';
      const ptr = new Map(); let downAt = null, pinch0 = 0;
      const dist2 = () => { const p = [...ptr.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 1) downAt = { x: e.clientX, y: e.clientY, moved: 0 }; else { pinch0 = dist2(); downAt = null; } });
      cv.addEventListener('pointermove', (e) => {
        const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (ptr.size === 2) { const d = dist2(); if (pinch0 > 0 && d > 0) { camT.dist /= d / pinch0; pinch0 = d; clampCam(); } return; }
        if (downAt) { downAt.moved += Math.abs(dx) + Math.abs(dy); if (downAt.moved > 7) { const sc = (2 * Math.tan((cam.fov * Math.PI) / 360) * camT.dist) / cv.clientHeight; camT.tx -= dx * sc; camT.tz -= (dy * sc) / Math.sin(elev(camS.dist)); clampCam(); } }
      });
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      const onTap = (x, y) => {
        const r = cv.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
        const h = ray.intersectObject(terrainMesh, false)[0]; if (!h) return;
        const li = st.P.at(h.point.x, h.point.z);
        if (li >= 0) focusOn(st.seats[li].id, camS.dist > 160 ? 120 : 60); else { camT.tx = h.point.x; camT.tz = h.point.z; camT.dist = Math.max(minD, camS.dist * 0.6); clampCam(); }
      };
      const up = (e) => { const was = downAt; ptr.delete(e.pointerId); if (was && was.moved <= 7 && ptr.size === 0 && e.type === 'pointerup') onTap(e.clientX, e.clientY); if (ptr.size === 0) downAt = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', (e) => { e.preventDefault(); camT.dist *= Math.exp(e.deltaY * 0.0012); clampCam(); }, { passive: false });
      root.addEventListener('resize', () => { renderer.setSize(root.innerWidth, root.innerHeight, false); cam.aspect = root.innerWidth / root.innerHeight; cam.updateProjectionMatrix(); if (tier.post) ST.makePost(); clampCam(); });
      // ---- HUD
      $('season').textContent = (SEASON_VI[pal.name] || 'Thu') + ' 219';
      const info = $('info'); info.hidden = false; info.innerHTML = 'Thiên hạ năm 219<small>Kéo, chụm để xem gần; chạm một châu.</small>';
      const leg = doc.createElement('div'); leg.className = 'chip legend';
      leg.innerHTML = world.factions.map((f) => `<span><i style="background:${f.color}"></i>${FAC[f.id].glyph}</span>`).join('') + `<span><i style="background:${FAC.neutral.color}"></i>${FAC.neutral.glyph}</span>`;
      doc.body.appendChild(leg);
      // ---- loop
      let clockT = 0, last = 0, frames = 0; const v3 = new THREE.Vector3();
      function frame(ts) {
        const dt = Math.min(0.08, last ? (ts - last) / 1000 : 0.016); last = ts; clockT += dt;
        updateCam(false);
        const us = uiScale();
        for (const b of banners) b.scale.setScalar(Math.max(1, us * 0.75));
        for (const f of flags) { const pos = f.geometry.attributes.position, b = f.userData.base; for (let i = 0; i < pos.count; i++) { const x = b[i * 3], k = x / 2.6; pos.setZ(i, Math.sin(clockT * 3.2 + x * 1.7 + f.userData.ph) * 0.24 * k); pos.setY(i, b[i * 3 + 1] - 0.14 * k * k); } pos.needsUpdate = true; }
        const rects = [], W = cv.clientWidth, H = cv.clientHeight, close = camS.dist < 260;
        const order = st.seats.map((t, i) => i).sort((a, b) => st.seats[b].level - st.seats[a].level);
        for (const i of order) {
          const t = st.seats[i], el = labels[i], bs = Math.max(1, us * 0.75); v3.set(t.info.flagAt[0], t.info.flagAt[1] + 4.4 * bs, t.info.flagAt[2]).project(cam);
          const x = ((v3.x + 1) / 2) * W, y = ((1 - v3.y) / 2) * H, w = el.offsetWidth, h = el.offsetHeight, r = [x - w / 2, y - h, x + w / 2, y];
          const hit = v3.z > 1 || x < -w || x > W + w || y < 0 || y > H + h || rects.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
          el.classList.toggle('city', close); el.classList.toggle('far', camS.dist > 700);
          el.style.visibility = hit ? 'hidden' : 'visible'; if (!hit) rects.push(r);
          el.style.transform = `translate(${x - w / 2}px,${y - h}px)`;
        }
        renderer.info.reset(); renderFrame();
        if (++frames === 2) {
          const s2 = { tier: tierName, map: 'world', season: pal.name, tris: renderer.info.render.triangles, calls: renderer.info.render.calls, staticTris: st.tris + clouds.tris, buildMs, loadMs: Math.round(performance.now() - t0), geometries: renderer.info.memory.geometries, dist: Math.round(camS.dist) };
          P.stats = s2; root.__extra = s2; $('boot').classList.add('out'); P.ready = true; root.__done = true;
        }
        root.requestAnimationFrame(frame);
      }
      const fq = q.get('focus');
      if (fq && seatById[fq]) focusOn(fq, +q.get('zoom') || 110);
      else if (q.get('zoom')) { camT.dist = +q.get('zoom'); clampCam(); }
      if (q.get('at')) { const [x, z] = q.get('at').split(',').map(Number); camT.tx = x; camT.tz = z; clampCam(); }
      updateCam(true);
      Object.assign(P, { THREE, scene, cam, renderer, st, seats: seatById, focus: (id, d) => { focusOn(id, d); updateCam(true); }, camera: (o) => { Object.assign(camT, o); clampCam(); updateCam(true); }, home: () => { Object.assign(camT, { tx: CX, tz: CZ, dist: fitDist() }); updateCam(true); }, stats: () => ({ tris: renderer.info.render.triangles, calls: renderer.info.render.calls }), tap: onTap });
      root.requestAnimationFrame(frame);
    }
  }

  return {
    boot, buildWorld, wpalette, WPAL, TIERS, WB, layerY, sampler, worldField, partition, borders, riverList, lakeList, townLevel, TOWN_R,
    _: { grid, chamfer, interp, gOfMetres, chaikin, resample, ringSD, inPoly, SEA_TOP, LAND0, TOPK, BASE_Y, KNOT_M },
  };
});
