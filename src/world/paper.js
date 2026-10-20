/*
 * Tam Quốc Loạn Nhập — v3 Hoài Nam bằng giấy (docs/design/v3-paper.md). The campaign map as a paper-cut diorama.
 *
 * Classic script, three r146, no assets: every shape is code, every layout is seeded (no Math.random). Two halves:
 *   1. pure helpers (PaperKit._, tested in tests/paper.test.mjs): noise, polylines, the contour slicer that turns a height
 *      field into stacked paper layers (marching squares: the inside polygon of every cell is the layer's top, the iso
 *      segment is its cut edge), the terrain field, a flat-shaded geometry builder, and the static scene's geometry;
 *   2. the page (PaperKit.boot): three.js scene, EmperorsV2 (newGame / view / targets / order / endSeason / autoBattle),
 *      a tiny DOM HUD, tap an army -> tap a target -> orders, "Hết mùa" resolves the season and the armies glide.
 * Everything static is merged into five meshes (terrain, river, mountains, props, backdrop); armies, flags and
 * markers are the only dynamic objects. Edge shading ("AO") lives in vertex colours: no post effects.
 *   paper.html?season=Xuân|Hạ|Thu|Đông&tier=high|mid|low&seed=3&focus=am_lang&zoom=40
 */
(function (root, factory) {
  const K = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = K; else root.PaperKit = K;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  // ---------------------------------------------------------------- small maths
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }; // a > b works too
  function rng(seed) { // mulberry32
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(ix, iz, seed) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, seed) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return lerp(lerp(hash2(ix, iz, seed), hash2(ix + 1, iz, seed), u), lerp(hash2(ix, iz + 1, seed), hash2(ix + 1, iz + 1, seed), u), v);
  }
  function fbm(x, z, seed, oct) {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < (oct || 3); i++) { s += a * vnoise(x * f, z * f, seed + i * 17); n += a; a *= 0.5; f *= 2; }
    return s / n;
  }
  const strSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  // ---------------------------------------------------------------- colours ([r,g,b] 0..1; what is written is what shows)
  function hex(h) { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const shade = (c, f) => [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
  const WHITE = [1, 1, 1], COOL = [0.12, 0.26, 0.32];
  const lighten = (c, t) => mix(c, WHITE, t);
  function ramp(stops, t) { const x = clamp(t, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)); return mix(stops[i], stops[i + 1], x - i); }
  // a layer's cut edge: a bright thin lip, then a body that falls into soft shadow towards the layer below
  const edgeBody = (base) => mix(shade(base, 0.7), COOL, 0.14), edgeFoot = (base) => mix(shade(base, 0.34), COOL, 0.34), edgeLip = (base) => lighten(base, 0.5);

  // ---------------------------------------------------------------- palettes (the four seasons' paper)
  const PAL = {
    spring: { bg: ['#dbe8ec', '#f6dcd8'], terrain: ['#3f9a8e', '#63ae8c', '#86bf83', '#aad08a', '#cfdc9a', '#e9e5b9', '#f2eed6', '#f8f5ea'], sand: '#efe2bd', bed: '#1f6f86',
      river: ['#1f6f86', '#2f95a8', '#6cc6cc'], foam: '#f4fbfb', mtnBase: ['#3b8f8c', '#d98f6b'], peak: '#f6efdc', trees: ['#6fae67', '#e9a6b8', '#f4c9d2', '#a9cc72'],
      wall: '#cf9a66', roof: '#4a545c', plate: ['#f1e6d0', '#d9835f', '#3a8a88'], sun: ['#ffb347', '#ff8a3d', '#ffe0b0'], cloud: '#ffffff', far: ['#dce7ee', '#c9d9e3'], key: '#fff2e0', hemi: ['#fff6ea', '#a9bfc4'] },
    summer: { bg: ['#c9e3e6', '#f6ead2'], terrain: ['#2b8f88', '#3fa58b', '#69b98a', '#98ca88', '#c7d79a', '#e8e1b4', '#f3efd4', '#fafaf0'], sand: '#f1dfb0', bed: '#18627c',
      river: ['#18627c', '#1f8aa3', '#5fc0cb'], foam: '#f2fbfb', mtnBase: ['#2f8587', '#d7774f'], peak: '#f7f0dd', trees: ['#2f8a62', '#58a45d', '#87bd5a', '#d9b84a'],
      wall: '#cf9a66', roof: '#4a545c', plate: ['#f1e6d0', '#d7774f', '#2f8587'], sun: ['#ffa63c', '#ff7a2d', '#ffd49a'], cloud: '#ffffff', far: ['#d3e5ea', '#bcd4de'], key: '#fff1dc', hemi: ['#fff6ea', '#a4bfc2'] },
    autumn: { bg: ['#86a8b6', '#f0d6b6'], terrain: ['#3d8686', '#dd8138', '#e8a050', '#eebf78', '#f1d9a6', '#f4e9cc', '#f8f2e0', '#fffdf6'], sand: '#f1dcae', bed: '#1d6a82',
      river: ['#1d6a82', '#2b8fa5', '#69c0c7'], foam: '#f6fbfb', mtnBase: ['#c0502f', '#2f7f86'], peak: '#f7ecd6', trees: ['#d9622b', '#e8903a', '#efc24f', '#b8452e', '#7d8f54'],
      wall: '#cf9a66', roof: '#4a545c', plate: ['#f2e4cc', '#cc5b36', '#2f7f86'], sun: ['#ff5a2e', '#e63d22', '#ff9a63'], cloud: '#fff4e8', far: ['#bfd0da', '#a6bccb'], key: '#ffeedb', hemi: ['#fff1e0', '#9eb4bb'] },
    winter: { bg: ['#c9d6e3', '#eef1f4'], terrain: ['#a8bccb', '#c0cfdb', '#d5e0e8', '#e4ecf1', '#eef3f6', '#f5f8fa', '#fafcfd', '#ffffff'], sand: '#e9eef2', bed: '#3a6682',
      river: ['#3a6682', '#5588a6', '#9cc3d6'], foam: '#ffffff', mtnBase: ['#6f8aa2', '#8da0b4'], peak: '#fdfeff', trees: ['#4d6e78', '#6a8c94', '#8aa6ac'],
      wall: '#bfae96', roof: '#5b6670', plate: ['#f4f6f8', '#9db3c6', '#5e84a0'], sun: ['#f4d9b4', '#eec79a', '#fff0dc'], cloud: '#ffffff', far: ['#dde5ec', '#cfdae4'], key: '#f2f6ff', hemi: ['#f4f8ff', '#a9b9c6'] },
  };
  const SEASON_KEY = { 'Xuân': 'spring', 'Hạ': 'summer', 'Thu': 'autumn', 'Đông': 'winter' };
  function palette(name) {
    const p = PAL[name] || PAL.autumn, o = {};
    for (const k of Object.keys(p)) {
      const v = p[k];
      o[k] = Array.isArray(v) ? v.map(hex) : typeof v === 'string' ? hex(v) : v;
    }
    o.name = name; o.bgCss = p.bg; o.fade = mix(hex(p.bg[0]), hex(p.bg[1]), 0.86); o.winter = name === 'winter';
    return o;
  }

  // ---------------------------------------------------------------- polylines
  function polyPrep(pts) {
    const seg = []; let L = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], len = Math.hypot(dx, dz);
      seg.push({ x: pts[i][0], z: pts[i][1], dx, dz, len, s: L }); L += len;
    }
    return { pts, seg, length: L };
  }
  function polyAt(P, s) {
    s = clamp(s, 0, P.length);
    let q = P.seg[P.seg.length - 1];
    for (let i = 0; i < P.seg.length; i++) if (s <= P.seg[i].s + P.seg[i].len) { q = P.seg[i]; break; }
    const t = q.len ? clamp((s - q.s) / q.len, 0, 1) : 0;
    return { x: q.x + q.dx * t, z: q.z + q.dz * t, tx: q.dx / q.len, tz: q.dz / q.len, s };
  }
  function polyNearest(P, x, z) {
    let best = null;
    for (const q of P.seg) {
      const t = clamp(((x - q.x) * q.dx + (z - q.z) * q.dz) / (q.len * q.len), 0, 1), px = q.x + q.dx * t, pz = q.z + q.dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, s: q.s + t * q.len, x: px, z: pz };
    }
    return best;
  }

  // ---------------------------------------------------------------- the terrain field (h in "paper layers": layer k covers h >= k)
  const BOUNDS = { x0: 118, x1: 226, z0: -98, z1: 20 };
  const RIVERS = [ // the Hoài (north of Thọ Xuân, Chung Ly, Hu Dị) and the Trường Giang in front; half widths in world units (1 = 3 km, widened to read)
    { id: 'hoai', hw: 2.4, pts: [[104, -44], [120, -44], [135, -48], [146, -47], [158, -56], [170, -62], [184, -67], [197, -69], [210, -72], [226, -77], [240, -82]] },
    { id: 'giang', hw: 3.1, pts: [[104, 19], [118, 16], [140, 10], [165, 5], [185, 1], [197, 1], [215, -2], [226, -6], [240, -11]] },
  ];
  const TOWN_LEVEL = { chung_ly: 3, tho_xuan: 3, am_lang: 3, hu_di: 4, lich_duong: 3 } // plateaus stand level with (not sunk below) the ground round them;
  const TOWN_RANK = { tho_xuan: 4, chung_ly: 3, am_lang: 2, hu_di: 2, lich_duong: 1 }; // lũy 0–4: Yuan Shu's old capital, the commandery seat, the counties
  const MOUNTAINS = [ // cx, cz, radius, height (peaks stand on the terrain layers; the back range is the frame's far wall)
    [132, -88, 14, 24], [156, -92, 12, 29], [181, -90, 13, 23], [205, -88, 13, 27], [221, -80, 9, 17],
    [125, -68, 9, 14], [219, -50, 8, 11], [121, -20, 7, 9], [222, 10, 6, 7],
  ];
  const PLATEAU = { r1: 6.4, r2: 11 };
  function makeTerrain(spec) {
    const B = spec.bounds || BOUNDS, seed = spec.seed || 7, rivers = (spec.rivers || RIVERS).map((r) => ({ id: r.id, hw: r.hw, P: polyPrep(r.pts) }));
    const towns = spec.towns || [];
    function h(x, z) {
      const u = (x - B.x0) / (B.x1 - B.x0), v = (z - B.z0) / (B.z1 - B.z0);
      let y = 1.25 + 3.3 * fbm(x / 17, z / 17, seed, 3);
      y += 4.6 * smooth(0.26, 0.04, v) * (0.75 + 0.5 * fbm(x / 14, z / 14, seed + 5, 2));
      y += 2.2 * smooth(0.16, 0.0, u) + 2.2 * smooth(0.84, 1.0, u);
      y += 1.3 * smooth(0.82, 1.0, v) * fbm(x / 12, z / 12, seed + 9, 2);
      let pw = 0;
      for (const t of towns) {
        const d = Math.hypot(x - t.x, z - t.z), w = d < PLATEAU.r2 ? smooth(PLATEAU.r2, PLATEAU.r1, d) : 0;
        if (w > 0) { y = lerp(y, (t.level || 2) + 0.5, w); if (w > pw) pw = w; }
      }
      for (const r of rivers) {
        const d = polyNearest(r.P, x, z).d;
        y *= smooth(r.hw, r.hw + 3.4, d);
        if (d > r.hw + 1.5) y = Math.min(y, 1.2 + 0.55 * (d - r.hw - 1.5) + pw * 6); // gentle terraced banks: the water stays in sight (a town's plateau is exempt)
      }
      return clamp(y, 0, 9.6);
    }
    return { h, rivers, bounds: B, seed };
  }
  function makeField(hfn, B, cs) {
    const nx = Math.max(2, Math.round((B.x1 - B.x0) / cs)), nz = Math.max(2, Math.round((B.z1 - B.z0) / cs)), dx = (B.x1 - B.x0) / nx, dz = (B.z1 - B.z0) / nz;
    const vals = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) vals[j * (nx + 1) + i] = hfn(B.x0 + i * dx, B.z0 + j * dz);
    const F = { nx, nz, x0: B.x0, z0: B.z0, dx, dz, vals, W: nx + 1 };
    F.at = (x, z) => { // bilinear, as the contour sees it
      const fx = clamp((x - F.x0) / dx, 0, nx - 1e-6), fz = clamp((z - F.z0) / dz, 0, nz - 1e-6), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, W = F.W;
      return lerp(lerp(vals[j * W + i], vals[j * W + i + 1], a), lerp(vals[(j + 1) * W + i], vals[(j + 1) * W + i + 1], a), b);
    };
    return F;
  }

  // ---------------------------------------------------------------- contour slicing
  // The part of one cell with f >= 0 (f = h - level at the corners p0 p1 p2 p3 going x then z): its polygon, crossings flagged.
  function sliceCell(x, z, dx, dz, f0, f1, f2, f3) {
    const X = [x, x + dx, x + dx, x], Z = [z, z, z + dz, z + dz], f = [f0, f1, f2, f3], out = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) & 3, a = f[i] >= 0, b = f[j] >= 0;
      if (a) out.push({ x: X[i], z: Z[i], c: false, f: f[i] });
      if (a !== b) { const t = f[i] / (f[i] - f[j]); out.push({ x: X[i] + (X[j] - X[i]) * t, z: Z[i] + (Z[j] - Z[i]) * t, c: true, f: 0 }); }
    }
    return out;
  }
  // one paper layer: onTop(poly) for every cell that shows its top, onWall(a, b, outX, outZ) for every piece of its cut edge
  function contourLevel(F, k, onTop, onWall) {
    const { nx, nz, x0, z0, dx, dz, vals, W } = F;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const f0 = vals[j * W + i] - k, f1 = vals[j * W + i + 1] - k, f2 = vals[(j + 1) * W + i + 1] - k, f3 = vals[(j + 1) * W + i] - k;
      if (f0 < 0 && f1 < 0 && f2 < 0 && f3 < 0) continue;
      const poly = sliceCell(x0 + i * dx, z0 + j * dz, dx, dz, f0, f1, f2, f3), n = poly.length;
      if (!(f0 >= 1 && f1 >= 1 && f2 >= 1 && f3 >= 1)) onTop(poly);
      if (f0 >= 0 && f1 >= 0 && f2 >= 0 && f3 >= 0) continue;
      let cx = 0, cz = 0; for (const p of poly) { cx += p.x; cz += p.z; } cx /= n; cz /= n;
      for (let m = 0; m < n; m++) {
        const p = poly[m], q = poly[(m + 1) % n];
        if (p.c && q.c) onWall(p, q, (p.x + q.x) / 2 - cx, (p.z + q.z) / 2 - cz);
      }
    }
  }
  // the inside part of a boundary edge (field values fa, fb at its ends) as t-range, or null
  function edgeInterval(fa, fb) {
    if (fa >= 0 && fb >= 0) return [0, 1];
    if (fa >= 0) return [0, fa / (fa - fb)];
    if (fb >= 0) return [fa / (fa - fb), 1];
    return null;
  }

  // ---------------------------------------------------------------- flat-shaded geometry builder
  function Builder() { this.p = []; this.n = []; this.c = []; this.tris = 0; }
  Builder.prototype.tri = function (a, b, c, col, dir) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    const per = Array.isArray(col[0]);
    let c0 = per ? col[0] : col, c1 = per ? col[1] : col, c2 = per ? col[2] : col;
    if (dir && nx * dir[0] + ny * dir[1] + nz * dir[2] < 0) { const t = b; b = c; c = t; const u = c1; c1 = c2; c2 = u; nx = -nx; ny = -ny; nz = -nz; }
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.c.push(c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], c2[0], c2[1], c2[2]);
    this.tris++;
  };
  Builder.prototype.quad = function (a, b, c, d, col, dir) {
    const per = Array.isArray(col[0]);
    this.tri(a, b, c, per ? [col[0], col[1], col[2]] : col, dir);
    this.tri(a, c, d, per ? [col[0], col[2], col[3]] : col, dir);
  };
  Builder.prototype.fan = function (pts, col, dir) { for (let i = 1; i + 1 < pts.length; i++) this.tri(pts[0], pts[i], pts[i + 1], Array.isArray(col[0]) ? [col[0], col[i], col[i + 1]] : col, dir); };
  Builder.prototype.geometry = function (THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.n), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.c), 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  };
  const UP = [0, 1, 0];
  const rotator = (cx, y, cz, rot) => { const c = Math.cos(rot), s = Math.sin(rot); return { pt: (x, h, z) => [cx + x * c + z * s, y + h, cz - x * s + z * c], dir: (x, h, z) => [x * c + z * s, h, -x * s + z * c] }; };
  // a box (rotated about Y at its centre); sides run from colLow at the foot to colSide; the top is colTop
  function box(B, cx, y0, cz, sx, sy, sz, rot, colTop, colSide, colLow) {
    const R = rotator(cx, y0, cz, rot), hx = sx / 2, hz = sz / 2, lo = colLow || shade(colSide, 0.75);
    const bot = [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]].map((p) => R.pt(p[0], p[1], p[2]));
    const top = [[-hx, sy, -hz], [hx, sy, -hz], [hx, sy, hz], [-hx, sy, hz]].map((p) => R.pt(p[0], p[1], p[2]));
    const nrm = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
    for (let i = 0; i < 4; i++) { const j = (i + 1) & 3, d = R.dir(nrm[i][0], 0, nrm[i][2]); B.quad(bot[i], bot[j], top[j], top[i], [lo, lo, colSide, colSide], d); }
    B.quad(top[0], top[1], top[2], top[3], colTop || colSide, UP);
  }
  // a (frustum | cone | disc) of n sides, optionally flattened (sx, sz), rings at y0 (r0) and y1 (r1); r1 = 0 closes into a point
  function frustum(B, cx, cz, y0, y1, r0, r1, n, rot, colLow, colHigh, o) {
    o = o || {}; const sx = o.sx || 1, sz = o.sz || 1, ox = o.ox || 0, oz = o.oz || 0, lo = [], hi = [];
    const R = rotator(cx, 0, cz, o.yaw || 0);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      lo.push(R.pt(c * r0 * sx, y0, s * r0 * sz)); hi.push(R.pt(c * r1 * sx + ox, y1, s * r1 * sz + oz));
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, am = rot + ((i + 0.5) / n) * Math.PI * 2, d = R.dir(Math.cos(am) / sx, 0.25, Math.sin(am) / sz);
      if (r1 > 0.001) B.quad(lo[i], lo[j], hi[j], hi[i], [colLow, colLow, colHigh, colHigh], d);
      else B.tri(lo[i], lo[j], hi[0], [colLow, colLow, colHigh], d);
    }
    if (r1 > 0.001) B.fan(hi, o.cap || colHigh, UP);
    if (o.bottom) B.fan(lo, o.bottom, [0, -1, 0]);
  }
  // a straight (Han) gable roof, ridge along local x: eaves at +-(d/2 + ov), ridge h above; gable ends in the wall colour
  function gable(B, cx, y, cz, w, d, h, rot, colA, colB, colWall, ov) {
    const R = rotator(cx, y, cz, rot), hz = d / 2 + (ov || 0.25), hx = w / 2 + (ov || 0.25) * 0.5;
    const e = [R.pt(-hx, 0, -hz), R.pt(hx, 0, -hz), R.pt(hx, 0, hz), R.pt(-hx, 0, hz)], r0 = R.pt(-hx, h, 0), r1 = R.pt(hx, h, 0);
    B.quad(e[0], e[1], r1, r0, [shade(colA, 0.8), shade(colA, 0.8), colA, colA], R.dir(0, hz, -h));
    B.quad(e[2], e[3], r0, r1, [shade(colB, 0.8), shade(colB, 0.8), colB, colB], R.dir(0, hz, h));
    const gz = d / 2, g = [R.pt(-w / 2, 0, -gz), R.pt(-w / 2, 0, gz), R.pt(-w / 2, h * 0.92, 0)], g2 = [R.pt(w / 2, 0, -gz), R.pt(w / 2, 0, gz), R.pt(w / 2, h * 0.92, 0)];
    B.tri(g[0], g[1], g[2], colWall, R.dir(-1, 0, 0)); B.tri(g2[0], g2[1], g2[2], colWall, R.dir(1, 0, 0));
  }

  // ---------------------------------------------------------------- tiers
  const TIERS = {
    high: { cs: 1.25, trees: 120, rocks: 60, shadow: 4096, dpr: 2, aa: true, post: true, msaa: 4 },
    mid: { cs: 1.8, trees: 84, rocks: 36, shadow: 2048, dpr: 2, aa: true, post: true, msaa: 4 },
    low: { cs: 2.6, trees: 48, rocks: 18, shadow: 0, dpr: 1, aa: false, post: false, msaa: 0 },
  };
  const LAYER = 0.9, LEVELS = 10;

  // ---------------------------------------------------------------- the static scene's geometry (pure: builders only)
  function buildStatic(spec) {
    const tier = TIERS[spec.tier] || TIERS.mid, pal = spec.pal || palette('autumn'), towns = spec.towns || [];
    const T = makeTerrain({ towns, seed: spec.seed });
    const F = makeField(T.h, T.bounds, tier.cs), Bd = T.bounds;
    const topY = (x, z) => clamp(Math.floor(F.at(x, z) + 1e-6), 0, LEVELS) * LAYER;
    const out = { terrain: new Builder(), river: new Builder(), mtn: new Builder(), props: new Builder(), back: new Builder(), T, F, topY, pal };
    const rnd = rng((spec.seed || 7) * 7919 + 13);
    buildTerrain(out.terrain, F, T, pal, Bd);
    buildRivers(out.river, T, pal, Bd);
    const mtns = buildMountains(out.mtn, F, topY, pal, rnd);
    scatterProps(out.props, { F, topY, T, towns, mtns, pal, tier, rnd });
    out.towns = new Builder(); out.townInfo = {};
    for (const t of towns) { const lv = t.town == null ? 3 : t.town; out.townInfo[t.id] = hanTown(out.towns, { x: t.x, y: topY(t.x, t.z) + 0.54 * TOWN_FIT / townPlate(lv), z: t.z, level: lv, seed: t.id, scale: TOWN_FIT / townPlate(lv) }); }
    buildBackdrop(out.back, pal, Bd, rnd);
    out.mtns = mtns;
    return out;
  }

  const TOWN_FIT = 6.7; // a Hoài Nam town's plate half-size (its plateau is PLATEAU.r1)
  function appendScaled(B, tb, cx, cy, cz, k, tx, ty, tz) { // a sub-builder scaled about (cx, cy, cz) and moved to (tx, ty, tz) (default: stays): normals stay
    if (tx === undefined) { tx = cx; ty = cy; tz = cz; }
    for (let i = 0; i < tb.p.length; i += 3) B.p.push(tx + (tb.p[i] - cx) * k, ty + (tb.p[i + 1] - cy) * k, tz + (tb.p[i + 2] - cz) * k);
    for (let i = 0; i < tb.n.length; i++) B.n.push(tb.n[i]);
    for (let i = 0; i < tb.c.length; i++) B.c.push(tb.c[i]);
    B.tris += tb.tris;
  }
  function buildTerrain(B, F, T, pal, Bd) {
    const stops = pal.terrain, near = (x, z) => { let d = 1e9; for (const r of T.rivers) d = Math.min(d, polyNearest(r.P, x, z).d - r.hw); return d; };
    const seed = T.seed;
    const topCol = (k, x, z, hv) => {
      const patch = fbm(x / 26, z / 26, seed + 53, 2); // broad patches lean to the cooler / paler neighbour layer colour, like different card stock
      let c = ramp(stops, (k - 1) / 6 + (patch - 0.3) * 0.5);
      const teal = smooth(0.5, 0.64, fbm(x / 21 + 9, z / 21, seed + 71, 2)); if (k >= 2 && teal > 0) c = mix(c, lighten(pal.mtnBase[0], 0.08), 0.6 * teal);
      const nz = fbm(x / 8, z / 8, seed + 31, 2);
      c = shade(c, 0.93 + 0.14 * nz);
      if (k <= 3) { const d = near(x, z); if (d < 4.2) c = mix(c, pal.sand, 0.85 * smooth(4.2, 2.2, d)); }
      return shade(c, 1 - 0.62 * smooth(k + 0.05, k + 1, hv));
    };
    // the base: the river bed, and the card stack the diorama stands on (cut-paper frame)
    const mg = [0, 2.2, 5.6], pc = pal.plate, ys = [-1.0, -2.0, -3.3];
    const bed = pal.bed, x0 = Bd.x0, x1 = Bd.x1, z0 = Bd.z0, z1 = Bd.z1;
    B.quad([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], shade(bed, 0.9), UP);
    box(B, (x0 + x1) / 2, ys[0], (z0 + z1) / 2, x1 - x0, -ys[0], z1 - z0, 0, shade(bed, 0.7), shade(bed, 0.8), shade(bed, 0.55));
    box(B, (x0 + x1) / 2, ys[1], (z0 + z1) / 2, x1 - x0 + mg[1] * 2, 1.0, z1 - z0 + mg[1] * 2, 0, pc[1], shade(pc[1], 0.9), shade(pc[1], 0.6));
    box(B, (x0 + x1) / 2, ys[2], (z0 + z1) / 2, x1 - x0 + mg[2] * 2, 1.3, z1 - z0 + mg[2] * 2, 0, pc[0], shade(pc[0], 0.92), shade(pc[0], 0.62));
    // thin teal inlay line between the cards
    box(B, (x0 + x1) / 2, -0.98, (z0 + z1) / 2, x1 - x0 + 1.0, 0.0001, z1 - z0 + 1.0, 0, pc[2], pc[2], pc[2]);
    for (let k = 1; k <= LEVELS; k++) {
      const y1 = k * LAYER, y0 = y1 - LAYER, kc = ramp(stops, (k - 1) / 6);
      contourLevel(F, k, (poly) => {
        const pts = poly.map((p) => [p.x, y1, p.z]), cols = poly.map((p) => topCol(k, p.x, p.z, p.c ? k : p.f + k));
        B.fan(pts, cols, UP);
      }, (a, b, ox, oz) => wall(B, a.x, a.z, b.x, b.z, y0, y1, ox, oz, kc));
      // the frame's own cut edges (the diorama's sides)
      for (const e of [[0, 'N'], [1, 'S'], [2, 'W'], [3, 'E']]) {
        const n = e[1] === 'N' || e[1] === 'S' ? F.nx : F.nz;
        for (let i = 0; i < n; i++) {
          let ia, ib, pa, pb, ox = 0, oz = 0;
          if (e[1] === 'N') { ia = i; ib = i + 1; pa = [F.x0 + ia * F.dx, F.z0]; pb = [F.x0 + ib * F.dx, F.z0]; oz = -1; ia = ia; }
          else if (e[1] === 'S') { pa = [F.x0 + i * F.dx, F.z0 + F.nz * F.dz]; pb = [F.x0 + (i + 1) * F.dx, F.z0 + F.nz * F.dz]; oz = 1; }
          else if (e[1] === 'W') { pa = [F.x0, F.z0 + i * F.dz]; pb = [F.x0, F.z0 + (i + 1) * F.dz]; ox = -1; }
          else { pa = [F.x0 + F.nx * F.dx, F.z0 + i * F.dz]; pb = [F.x0 + F.nx * F.dx, F.z0 + (i + 1) * F.dz]; ox = 1; }
          const fa = F.at(pa[0] === F.x0 + F.nx * F.dx ? pa[0] - 1e-6 : pa[0], pa[1] === F.z0 + F.nz * F.dz ? pa[1] - 1e-6 : pa[1]) - k;
          const fb = F.at(pb[0] === F.x0 + F.nx * F.dx ? pb[0] - 1e-6 : pb[0], pb[1] === F.z0 + F.nz * F.dz ? pb[1] - 1e-6 : pb[1]) - k;
          const iv = edgeInterval(fa, fb); if (!iv) continue;
          const A = [lerp(pa[0], pb[0], iv[0]), lerp(pa[1], pb[1], iv[0])], C = [lerp(pa[0], pb[0], iv[1]), lerp(pa[1], pb[1], iv[1])];
          wall(B, A[0], A[1], C[0], C[1], y0, y1, ox, oz, kc);
        }
      }
    }
  }
  // a paper cut edge: bright lip over a body that darkens to the layer below
  function wall(B, ax, az, bx, bz, y0, y1, ox, oz, base) {
    const ym = y1 - Math.min(0.1, (y1 - y0) * 0.16), lip = edgeLip(base), body = edgeBody(base), foot = edgeFoot(base), d = [ox, 0, oz];
    B.quad([ax, ym, az], [bx, ym, bz], [bx, y1, bz], [ax, y1, az], [body, body, lip, lip], d);
    B.quad([ax, y0, az], [bx, y0, bz], [bx, ym, bz], [ax, ym, az], [foot, foot, body, body], d);
  }

  function buildRivers(B, T, pal, Bd) {
    const step = 1.1;
    for (const r of T.rivers) {
      const strips = [
        { w: r.hw + 1.7, y: 0.14, col: pal.river[0], amp: 0.45, f: 0.55, ph: 0.0 },
        { w: r.hw + 0.85, y: 0.3, col: pal.river[1], amp: 0.4, f: 0.8, ph: 1.7 },
        { w: r.hw - 0.1, y: 0.46, col: pal.river[2], amp: 0.34, f: 1.15, ph: 3.1 },
      ];
      const samples = [];
      for (let s = 0; s <= r.P.length; s += step) {
        const p = polyAt(r.P, s);
        if (p.x < Bd.x0 - 4 || p.x > Bd.x1 + 4 || p.z < Bd.z0 - 4 || p.z > Bd.z1 + 4) continue;
        samples.push(p);
      }
      const edge = (p, side, w) => [clamp(p.x + -p.tz * side * w, Bd.x0, Bd.x1), 0, clamp(p.z + p.tx * side * w, Bd.z0, Bd.z1)];
      for (const st of strips) {
        const L = [], R = [];
        for (const p of samples) {
          const w = Math.max(0.3, st.w + st.amp * Math.sin(p.s * st.f + st.ph) + 0.18 * Math.sin(p.s * 2.3 + st.ph * 2));
          const a = edge(p, 1, w), b = edge(p, -1, w); a[1] = b[1] = st.y; L.push(a); R.push(b);
        }
        const cs = [shade(st.col, 0.96), shade(st.col, 1.04)];
        for (let i = 0; i + 1 < L.length; i++) {
          const c = cs[(i >> 1) & 1]; // a faint banding along the strip, like torn paper joins
          B.quad(L[i], L[i + 1], R[i + 1], R[i], c, UP);
          const dark = shade(st.col, 0.5);
          B.quad([L[i][0], st.y - 0.16, L[i][2]], [L[i + 1][0], st.y - 0.16, L[i + 1][2]], [L[i + 1][0], st.y, L[i + 1][2]], [L[i][0], st.y, L[i][2]], [dark, dark, lighten(st.col, 0.25), lighten(st.col, 0.25)], [-(L[i][2] - R[i][2]) * 0 + (L[i][0] - R[i][0]), 0, L[i][2] - R[i][2]]);
          B.quad([R[i][0], st.y - 0.16, R[i][2]], [R[i + 1][0], st.y - 0.16, R[i + 1][2]], [R[i + 1][0], st.y, R[i + 1][2]], [R[i][0], st.y, R[i][2]], [dark, dark, lighten(st.col, 0.25), lighten(st.col, 0.25)], [R[i][0] - L[i][0], 0, R[i][2] - L[i][2]]);
        }
      }
      // foam: two thin white wavy ribbons near the banks and a few short crests across the water
      for (const side of [1, -1]) {
        const A = [], C = [];
        for (const p of samples) {
          const w = strips[2].w + 0.5 * Math.sin(p.s * 1.15 + 3.1) - 0.15 + 0.12 * Math.sin(p.s * 3.1 + side);
          const a = edge(p, side, w), c = edge(p, side, w - 0.42 - 0.12 * Math.sin(p.s * 2 + side)); a[1] = c[1] = 0.5; A.push(a); C.push(c);
        }
        for (let i = 0; i + 1 < A.length; i += 1) if (((i + (side > 0 ? 0 : 3)) % 9) < 6) B.quad(A[i], A[i + 1], C[i + 1], C[i], pal.foam, UP);
      }
      for (let s = 6; s < r.P.length; s += 9.5) {
        const p = polyAt(r.P, s), w = strips[2].w * 0.55, a = edge(p, 1, w), b = edge(p, -1, w), q = polyAt(r.P, s + 1.6), a2 = edge(q, 1, w * 0.8), b2 = edge(q, -1, w * 0.8);
        if (p.x < Bd.x0 + 2 || p.x > Bd.x1 - 2) continue;
        a[1] = b[1] = a2[1] = b2[1] = 0.5;
        B.quad(lerp3(a, b, 0.3), lerp3(a, b, 0.7), lerp3(a2, b2, 0.62), lerp3(a2, b2, 0.38), lighten(pal.river[2], 0.55), UP);
      }
    }
  }
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // origami mountains: rings of jittered points, every facet flat and its own tone
  function origami(B, cx, cz, y0, R, H, n, pal, rnd, baseIdx) {
    const rings = [], spec = [[1.0, -0.7, 0], [0.82, 0.12, 0.3], [0.52, 0.42, 0.6], [0.27, 0.72, 0.85]], jit = 0.16;
    for (const [rf, hf] of spec.map((s) => [s[0], s[1]])) {
      const ring = [], off = rnd() * 0.5;
      for (let i = 0; i < n; i++) {
        const a = ((i + off + (rnd() - 0.5) * 0.45) / n) * Math.PI * 2, r = R * rf * (0.78 + 0.44 * rnd());
        ring.push([cx + Math.cos(a) * r, y0 + H * (hf + (rnd() - 0.5) * jit * (hf > 0 ? 1 : 0)), cz + Math.sin(a) * r]);
      }
      rings.push(ring);
    }
    const top = [cx + (rnd() - 0.5) * R * 0.12, y0 + H, cz + (rnd() - 0.5) * R * 0.12];
    const base = pal.mtnBase[baseIdx % pal.mtnBase.length], base2 = pal.mtnBase[(baseIdx + 1) % pal.mtnBase.length], cream = pal.peak;
    const facet = (a, b, c) => {
      const ym = (a[1] + b[1] + c[1]) / 3, f = clamp((ym - y0) / H, 0, 1), tone = 0.74 + 0.44 * rnd();
      let col = mix(rnd() < 0.3 ? base2 : base, cream, smooth(0.2, 0.52, f));
      col = shade(col, tone);
      B.tri(a, b, c, col, [(a[0] + b[0] + c[0]) / 3 - cx, 0.35, (a[2] + b[2] + c[2]) / 3 - cz]);
    };
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, a = rings[r][i], b = rings[r][j], c = rings[r + 1][j], d = rings[r + 1][i];
        if ((i + r) & 1) { facet(a, b, c); facet(a, c, d); } else { facet(a, b, d); facet(b, c, d); }
      }
    }
    const last = rings[rings.length - 1];
    for (let i = 0; i < n; i++) facet(last[i], last[(i + 1) % n], top);
  }
  function buildMountains(B, F, topY, pal, rnd) {
    const list = [];
    MOUNTAINS.forEach((m, idx) => {
      const [cx, cz, R, H] = m, y0 = topY(cx, cz) - 0.2, n = R > 11 ? 10 : 8;
      origami(B, cx, cz, y0, R, H, n, pal, rnd, idx);
      // a smaller spire leaning on it
      const a = rnd() * Math.PI * 2, sx = cx + Math.cos(a) * R * 0.62, sz = cz + Math.sin(a) * R * 0.62;
      origami(B, sx, sz, topY(sx, sz) - 0.2, R * 0.55, H * (0.5 + 0.25 * rnd()), 7, pal, rnd, idx + 1);
      list.push({ x: cx, z: cz, r: R, h: H });
    });
    return list;
  }

  function tree(B, x, y, z, kind, size, col, pal, rnd) {
    const trunk = hex('#8a6a4a');
    if (kind === 'cypress') {
      frustum(B, x, z, y, y + 0.5 * size, 0.18 * size, 0.14 * size, 5, 0, trunk, trunk);
      frustum(B, x, z, y + 0.4 * size, y + 3.6 * size, 0.62 * size, 0.0, 6, rnd() * 6, shade(col, 0.82), lighten(col, 0.12));
    } else if (kind === 'pine') {
      frustum(B, x, z, y, y + 0.5 * size, 0.18 * size, 0.14 * size, 5, 0, trunk, trunk);
      for (let i = 0; i < 3; i++) frustum(B, x, z, y + (0.4 + i * 0.7) * size, y + (1.5 + i * 0.7) * size, (1.0 - i * 0.22) * size, 0.12 * size, 7, rnd() * 6, shade(col, 0.8), lighten(col, 0.1 + i * 0.05), { cap: pal.winter ? WHITE : undefined });
    } else { // rolled-paper bush: three flared discs
      frustum(B, x, z, y, y + 0.7 * size, 0.2 * size, 0.16 * size, 5, 0, trunk, trunk);
      const rr = rnd() * 6;
      frustum(B, x, z, y + 0.55 * size, y + 1.1 * size, 0.9 * size, 1.25 * size, 8, rr, shade(col, 0.74), shade(col, 0.92));
      frustum(B, x, z, y + 1.1 * size, y + 1.65 * size, 1.25 * size, 0.95 * size, 8, rr + 0.2, shade(col, 0.95), lighten(col, 0.1));
      frustum(B, x, z, y + 1.65 * size, y + 2.0 * size, 0.95 * size, 0.55 * size, 8, rr + 0.4, lighten(col, 0.06), lighten(col, 0.18), { cap: pal.winter ? WHITE : lighten(col, 0.22) });
    }
  }
  function rock(B, x, y, z, s, rnd) {
    const g = hex('#8a97a3'), g2 = hex('#b3bec8');
    frustum(B, x, z, y, y + 0.55 * s, 0.9 * s, 0.55 * s, 5, rnd() * 6, shade(g, 0.8), g, { sz: 0.8, cap: g2 });
    frustum(B, x + 0.7 * s, z + 0.3 * s, y, y + 0.35 * s, 0.55 * s, 0.32 * s, 5, rnd() * 6, shade(g, 0.8), g2, { cap: lighten(g2, 0.2) });
  }
  function scatterProps(B, o) {
    const { F, topY, T, towns, mtns, pal, tier, rnd } = o, Bd = T.bounds;
    const clear = (x, z, rt) => {
      for (const t of towns) if (Math.hypot(x - t.x, z - t.z) < rt) return false;
      for (const m of mtns) if (Math.hypot(x - m.x, z - m.z) < m.r * 0.95) return false;
      return true;
    };
    const bankDist = (x, z) => { let d = 1e9; for (const r of T.rivers) d = Math.min(d, polyNearest(r.P, x, z).d - r.hw); return d; };
    // fewer, larger rolled-paper trees in tight groves: one colour family per grove, a cypress or two as accents
    let placed = 0, tries = 0;
    const cols = pal.trees.slice(0, 3);
    while (placed < tier.trees && tries++ < 400) {
      const cx = Bd.x0 + 4 + rnd() * (Bd.x1 - Bd.x0 - 8), cz = Bd.z0 + 4 + rnd() * (Bd.z1 - Bd.z0 - 8), h0 = F.at(cx, cz);
      if (h0 < 1.05 || !clear(cx, cz, 12) || bankDist(cx, cz) < 5 || fbm(cx / 13, cz / 13, T.seed + 77, 2) < 0.5) continue;
      const gc = cols[Math.floor(rnd() * cols.length)], k = 4 + Math.floor(rnd() * 4);
      for (let i = 0; i < k; i++) {
        const a = rnd() * Math.PI * 2, rr = 0.6 + rnd() * 3.2, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, h = F.at(x, z), fr = h - Math.floor(h);
        if (h < 1.05 || fr < 0.3 || fr > 0.85 || !clear(x, z, 10.5) || bankDist(x, z) < 3.6) continue;
        const kind = i === 0 && rnd() < 0.5 ? 'cypress' : i % 3 === 2 ? 'pine' : 'bush', sz = 1.25 + 0.7 * rnd() - (h > 6 ? 0.25 : 0);
        tree(B, x, topY(x, z), z, kind, sz, i === 0 && rnd() < 0.3 ? cols[(cols.indexOf(gc) + 1) % cols.length] : gc, pal, rnd); placed++;
      }
    }
    placed = 0; tries = 0;
    while (placed < tier.rocks && tries++ < tier.rocks * 30) {
      const x = Bd.x0 + 2 + rnd() * (Bd.x1 - Bd.x0 - 4), z = Bd.z0 + 2 + rnd() * (Bd.z1 - Bd.z0 - 4), h = F.at(x, z), fr = h - Math.floor(h);
      if (h < 1.05 || fr < 0.25 || fr > 0.85 || !clear(x, z, 8.5) || bankDist(x, z) > 7) continue;
      rock(B, x, topY(x, z), z, 0.7 + 0.8 * rnd(), rnd); placed++;
    }
  }

  // ---------------------------------------------------------------- the Han town as crafted paper (decision 0006: straight roofs, rammed
  // earth, no brick, no barbican). Layout after the v2 model (han-models.js HM.town): a square wall by level (lũy 0–4) with a gate
  // in each side under a gate tower, corner towers, bastions from level 3, a moat from level 3, the governor's compound north of
  // the centre facing south, the main streets crossing at a watchtower, courtyard houses in blocks, a market with awnings,
  // granaries, trees. Paper: card walls with folded crenellations and a lighter cap, slate roofs with a pale ridge and faint tile
  // folds, red-lacquer gate towers, cream courtyard walls, doors cut as dark slits, all on a two-card base plate.
  const LACQUER = hex('#a8362a'), SLATE = hex('#4d5868'), RIDGE = hex('#d9ddda'), GOLD = hex('#d9a441');
  const TOWNC = {
    earth: hex('#d4b080'), cap: hex('#f1e2c0'), cream: hex('#f3ead6'), creamCap: hex('#5b6470'), slit: hex('#2b2421'), pave: hex('#e9dcc0'),
    street: hex('#efe4cb'), yard: hex('#d6bd8c'), wood: hex('#8c6142'), thatch: hex('#d8b56a'), plateTop: hex('#f4ead5'), plateLow: hex('#c96f4a'),
    moat: hex('#3f8f94'), moatDeep: hex('#2a6f78'), foam: hex('#f6f2e6'), field: ['#c9b26a', '#a9a85e', '#d4b878', '#b58f58', '#93a06a', '#dcc98e', '#b9b07a'].map(hex),
    awning: ['#a8362a', '#2f5f8a', '#c98a2e', '#4d7a4a'].map(hex), tree: ['#c8743a', '#d6a24a', '#4f7f6a', '#a5532f', '#5d8a6a', '#7f9a5a'].map(hex),
  };
  // local units: the wall's half-size, height, thickness, gate width by level
  const TL = (lv) => ({ R: [2.4, 3.0, 3.6, 4.2, 4.8][lv], H: [0.62, 0.78, 1.08, 1.32, 1.52][lv], wt: [0.12, 0.45, 0.56, 0.66, 0.76][lv], gw: [0.7, 0.75, 0.85, 0.95, 1.05][lv], bast: [0, 0, 0, 2, 4][lv], moat: lv >= 3 });
  const townPlate = (lv) => { const t = TL(lv); return t.R + t.wt / 2 + (t.moat ? 1.55 : 0.75) + 0.55; };
  // a straight gable roof (ridge along local x) whose slopes carry faint tile folds, a pale ridge, gable ends in wallCol
  function tileGable(B, cx, y, cz, w, d, h, rot, col, wallCol, ov, folds) {
    const R = rotator(cx, y, cz, rot), hz = d / 2 + ov, hx = w / 2 + ov * 0.6, n = folds || 1;
    for (const s of [-1, 1]) {
      const nrm = R.dir(0, hz, s * h);
      for (let i = 0; i < n; i++) {
        const xa = -hx + (2 * hx * i) / n, xb = -hx + (2 * hx * (i + 1)) / n, c = shade(col, i & 1 ? 0.92 : 1.0), lo = shade(c, 0.82);
        B.quad(R.pt(xa, 0, s * hz), R.pt(xb, 0, s * hz), R.pt(xb, h, 0), R.pt(xa, h, 0), [lo, lo, c, c], nrm);
      }
      B.quad(R.pt(-hx, -0.06, s * hz), R.pt(hx, -0.06, s * hz), R.pt(hx, 0, s * hz), R.pt(-hx, 0, s * hz), shade(col, 0.6), R.dir(0, 0, s)); // the eave's paper edge
    }
    const gz = d / 2;
    for (const s of [-1, 1]) B.tri(R.pt(s * w / 2, 0, -gz), R.pt(s * w / 2, 0, gz), R.pt(s * w / 2, h * 0.94, 0), wallCol, R.dir(s, 0, 0));
    const rr = rotator(cx, y + h - 0.03, cz, rot);
    const rw = hx + 0.04, rt = clamp(d * 0.07, 0.025, 0.07), rd = rt, rc = mix(RIDGE, col, d < 0.6 ? 0.45 : 0.15);
    B.quad(rr.pt(-rw, rt, -rd), rr.pt(rw, rt, -rd), rr.pt(rw, rt, rd), rr.pt(-rw, rt, rd), rc, UP);
    for (const s of [-1, 1]) B.quad(rr.pt(-rw, 0, s * rd), rr.pt(rw, 0, s * rd), rr.pt(rw, rt, s * rd), rr.pt(-rw, rt, s * rd), shade(rc, 0.8), rr.dir(0, 0, s));
  }
  // a straight hip roof over w × d (ridge along x), eaves at y; tile folds on the long slopes; pale ridge and hips
  function tileHip(B, cx, y, cz, w, d, h, col, ov, folds) {
    const hx = w / 2 + ov, hz = d / 2 + ov, rx = Math.max(0.02, hx - hz * 0.9), n = folds || 1;
    const e = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map((p) => [cx + p[0], y, cz + p[1]]), r0 = [cx - rx, y + h, cz], r1 = [cx + rx, y + h, cz];
    for (const s of [-1, 1]) {
      const a = s < 0 ? e[0] : e[3], b = s < 0 ? e[1] : e[2], nrm = [0, hz, s * h];
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, c = shade(col, i & 1 ? 0.92 : 1), lo = shade(c, 0.82);
        const A = lerp3(a, b, t0), Bq = lerp3(a, b, t1), C = lerp3(r0, r1, t1), D = lerp3(r0, r1, t0);
        B.quad(A, Bq, C, D, [lo, lo, c, c], nrm);
      }
    }
    B.tri(e[0], e[3], r0, [shade(col, 0.74), shade(col, 0.74), shade(col, 0.9)], [-h, hx, 0]);
    B.tri(e[2], e[1], r1, [shade(col, 0.74), shade(col, 0.74), shade(col, 0.9)], [h, hx, 0]);
    // eave paper edge and the pale ridge
    const lo = [shade(col, 0.55)];
    for (let i = 0; i < 4; i++) { const a = e[i], b = e[(i + 1) & 3]; B.quad([a[0], y - 0.05, a[2]], [b[0], y - 0.05, b[2]], b, a, lo[0], [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz]); }
    const rt = clamp(d * 0.08, 0.03, 0.08), rc = mix(RIDGE, col, d < 0.6 ? 0.45 : 0.12);
    box(B, cx, y + h - rt * 0.3, cz, 2 * rx + rt * 2, rt, rt * 1.6, 0, rc, shade(rc, 0.82), shade(rc, 0.7));
  }
  // a hall: body (cream walls with lacquer posts, or lacquer), a door slit to the south, a roof
  function hall(B, cx, y, cz, w, d, h, o) {
    o = o || {};
    const body = o.lacquer ? LACQUER : o.wall || TOWNC.cream, bodyLo = shade(body, 0.7);
    box(B, cx, y, cz, w, h, d, 0, body, body, bodyLo);
    const f = cz + d / 2 + 0.012, slit = TOWNC.slit;
    if (!o.lacquer && !o.lite) { // lacquer posts on the front
      const np = Math.max(2, Math.round(w / 0.45));
      for (let i = 0; i <= np; i++) { const x = cx - w / 2 + (w * i) / np, pw = 0.035; B.quad([x - pw, y, f], [x + pw, y, f], [x + pw, y + h, f], [x - pw, y + h, f], [shade(LACQUER, 0.8), shade(LACQUER, 0.8), LACQUER, LACQUER], [0, 0, 1]); }
    }
    const dw = Math.min(0.26, w * 0.22), dh = h * 0.68;
    B.quad([cx - dw / 2, y, f + 0.004], [cx + dw / 2, y, f + 0.004], [cx + dw / 2, y + dh, f + 0.004], [cx - dw / 2, y + dh, f + 0.004], slit, [0, 0, 1]);
    if (o.windows) for (const s of [-1, 1]) { const x = cx + s * w * 0.3; B.quad([x - 0.08, y + h * 0.45, f + 0.004], [x + 0.08, y + h * 0.45, f + 0.004], [x + 0.08, y + h * 0.75, f + 0.004], [x - 0.08, y + h * 0.75, f + 0.004], slit, [0, 0, 1]); }
    const roof = o.roof || SLATE, rh = o.rh || Math.min(w, d) * 0.42;
    if (o.hip) tileHip(B, cx, y + h, cz, w, d, rh, roof, o.ov || 0.16, o.lite ? 1 : Math.max(2, Math.round(w / 0.32)));
    else tileGable(B, cx, y + h, cz, w, d, rh, 0, roof, shade(body, 0.95), o.ov || 0.14, o.lite ? 1 : Math.max(2, Math.round(w / 0.3)));
  }
  // a red-lacquer tower (gate or corner): body, a cream band, window slits, a straight hip roof; storeys stack, each smaller
  function lacquerTower(B, cx, y, cz, w, d, storeys, o) {
    o = o || {};
    let yy = y, ww = w, dd = d;
    for (let s = 0; s < storeys; s++) {
      const h = (o.h || 0.5) * (s ? 0.82 : 1), top = s === storeys - 1, body = o.timber ? TOWNC.wood : LACQUER;
      box(B, cx, yy, cz, ww, 0.06, dd, 0, TOWNC.cap, TOWNC.cap, shade(TOWNC.cap, 0.7)); // the floor plank
      box(B, cx, yy + 0.06, cz, ww * 0.88, h, dd * 0.86, 0, body, body, shade(body, 0.6));
      const f = cz + dd * 0.43 + 0.012, nw = Math.max(1, Math.round(ww / 0.42));
      if (!o.lite) for (let i = 0; i < nw; i++) { const x = cx - ww * 0.44 + (ww * 0.88 * (i + 0.5)) / nw; B.quad([x - 0.06, yy + 0.06 + h * 0.35, f], [x + 0.06, yy + 0.06 + h * 0.35, f], [x + 0.06, yy + 0.06 + h * 0.78, f], [x - 0.06, yy + 0.06 + h * 0.78, f], TOWNC.slit, [0, 0, 1]); }
      yy += 0.06 + h;
      if (top) tileHip(B, cx, yy, cz, ww * 0.88, dd * 0.86, (o.rh || 0.36) * (s ? 0.9 : 1), o.roof || SLATE, o.ov || 0.28, o.lite ? 1 : 5);
      else { tileHip(B, cx, yy, cz, ww * 0.88, dd * 0.86, 0.2, o.roof || SLATE, (o.ov || 0.28) * 0.9, o.lite ? 1 : 3); yy += 0.12; ww *= 0.8; dd *= 0.82; } // a skirt eave, then the upper storey
    }
  }
  // one wall run from a to b (local, along x or z), outward normal (nx, nz): card body, lighter cap, folded merlons outside, fold lines
  function wallRun(B, ax, az, bx, bz, nx, nz, T, lv, lite) {
    const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) return;
    const ux = (bx - ax) / len, uz = (bz - az) / len, mx = (ax + bx) / 2, mz = (az + bz) / 2, alongX = Math.abs(ux) > 0.5;
    const sx = alongX ? len : T.wt, sz = alongX ? T.wt : len, earth = TOWNC.earth, cap = TOWNC.cap;
    if (lv === 0) { // a palisade: a folded strip of sharpened stakes
      const n = Math.max(3, Math.round(len / 0.16));
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n, m = (a + b) / 2, o = (i & 1 ? 0.05 : -0.05), h = T.H * (0.86 + 0.14 * ((i * 7) % 3) / 2);
        const p = (t, off) => [ax + (bx - ax) * t + nx * off, 0, az + (bz - az) * t + nz * off];
        const pa = p(a, -o), pb = p(b, o), pm = p(m, 0), c = shade(TOWNC.wood, i & 1 ? 1.08 : 0.9);
        B.quad(pa, pb, [pb[0], h, pb[2]], [pa[0], h, pa[2]], [shade(c, 0.7), shade(c, 0.7), c, c], [nx, 0, nz]);
        B.tri([pa[0], h, pa[2]], [pb[0], h, pb[2]], [pm[0], h + 0.16, pm[2]], lighten(c, 0.15), [nx, 0.3, nz]);
        B.quad(pb, pa, [pa[0], h, pa[2]], [pb[0], h, pb[2]], shade(c, 0.8), [-nx, 0, -nz]);
      }
      return;
    }
    box(B, mx, 0, mz, sx, T.H, sz, 0, cap, earth, shade(earth, 0.62));
    box(B, mx + nx * 0.03, T.H, mz + nz * 0.03, sx + (alongX ? 0.04 : 0.1), 0.06, sz + (alongX ? 0.1 : 0.04), 0, lighten(cap, 0.2), cap, shade(cap, 0.8)); // the lighter cap, overhanging outside
    if (lite) return;
    const np = Math.max(1, Math.floor(len / 0.44)), st = len / np, o = T.wt / 2 - 0.05;
    for (let i = 0; i < np; i++) { // folded merlons on the outer edge: a little tent of card, its fold catching the light
      const s0 = (i + 0.5) * st, px = ax + ux * s0 + nx * o, pz = az + uz * s0 + nz * o, hw = st * 0.3, y0 = T.H + 0.06, y1 = y0 + 0.32;
      const A = [px - ux * hw - nx * 0.05, y0, pz - uz * hw - nz * 0.05], Bq = [px + ux * hw - nx * 0.05, y0, pz + uz * hw - nz * 0.05], C = [px + ux * hw + nx * 0.07, y0, pz + uz * hw + nz * 0.07], D = [px - ux * hw + nx * 0.07, y0, pz - uz * hw + nz * 0.07];
      const A1 = [A[0], y1, A[2]], B1 = [Bq[0], y1, Bq[2]], C1 = [C[0], y1 - 0.05, C[2]], D1 = [D[0], y1 - 0.05, D[2]];
      const me = shade(earth, 1.04);
      B.quad(D, C, C1, D1, [shade(me, 0.82), shade(me, 0.82), me, me], [nx, 0, nz]);
      B.quad(A1, B1, C1, D1, lighten(cap, 0.2), [nx * 0.3, 1, nz * 0.3]);
      B.quad(Bq, A, A1, B1, shade(me, 0.75), [-nx, 0, -nz]);
      B.quad(A, D, D1, A1, shade(me, 0.86), [-ux, 0, -uz]); B.quad(C, Bq, B1, C1, shade(me, 0.86), [ux, 0, uz]);
    }
    const fo = T.wt / 2 + 0.012, fold = shade(earth, 0.82);
    for (const f of lv >= 3 ? [0.3, 0.58, 0.84] : [0.36, 0.7]) { // the courses of rammed earth (timber-laced from lũy 3), a darker scored line
      const y = T.H * f, c2 = lv >= 3 ? mix(TOWNC.wood, earth, 0.45) : shade(earth, 0.8);
      B.quad([ax + nx * fo, y, az + nz * fo], [bx + nx * fo, y, bz + nz * fo], [bx + nx * fo, y + 0.045, bz + nz * fo], [ax + nx * fo, y + 0.045, az + nz * fo], c2, [nx, 0, nz]);
    }
    for (let s0 = 0.55; s0 < len - 0.2; s0 += 0.62) { // fold lines down the outer face (the card was scored)
      const px = ax + ux * s0 + nx * fo, pz = az + uz * s0 + nz * fo, w2 = 0.025;
      B.quad([px - ux * w2, 0.02, pz - uz * w2], [px + ux * w2, 0.02, pz + uz * w2], [px + ux * w2, T.H, pz + uz * w2], [px - ux * w2, T.H, pz - uz * w2], [shade(fold, 0.85), shade(fold, 0.85), fold, fold], [nx, 0, nz]);
    }
  }
  // hanTown(B, { x, y, z, level 0–4, seed, lite }) → { plate, flagAt: [x, y, z], R }. Built at (x, y, z) in local town units.
  function hanTown(B0, o) {
    const lv = clamp(o.level == null ? 3 : o.level, 0, 4), T = TL(lv), R = T.R, lite = !!o.lite, r = rng(strSeed(o.seed || 'town') + lv);
    const B = new Builder(), P = townPlate(lv), sw = 0.22 + lv * 0.03, inner = R - T.wt / 2 - 0.12;
    // the plate: a terracotta card under a cream card, both with a visible edge
    box(B, 0, -0.36, 0, 2 * P + 0.5, 0.18, 2 * P + 0.5, 0, TOWNC.plateLow, shade(TOWNC.plateLow, 0.85), shade(TOWNC.plateLow, 0.55));
    box(B, 0, -0.18, 0, 2 * P, 0.18, 2 * P, 0, TOWNC.plateTop, shade(TOWNC.plateTop, 0.9), shade(TOWNC.plateTop, 0.62));
    // fields round the wall (outside the moat), cut by the four roads
    const f0 = R + T.wt / 2 + (T.moat ? 1.45 : 0.15), f1 = P - 0.12;
    if (f1 - f0 > 0.3) for (let side = 0; side < 4; side++) {
      let a = -f1;
      while (a < f1 - 0.1) {
        const w = 0.35 + r() * 0.6, b = Math.min(f1, a + w);
        if (b - a > 0.12 && !(a < sw * 1.6 && b > -sw * 1.6)) {
          const c = shade(TOWNC.field[Math.floor(r() * TOWNC.field.length)], 0.95 + 0.1 * r()), z0 = f0 + 0.05, z1 = f1;
          const pts = side === 0 ? [[a, z0], [b, z0], [b, z1], [a, z1]] : side === 1 ? [[z0, -b], [z0, -a], [z1, -a], [z1, -b]] : side === 2 ? [[-b, -z0], [-a, -z0], [-a, -z1], [-b, -z1]] : [[-z0, a], [-z0, b], [-z1, b], [-z1, a]];
          if (Math.abs(pts[0][0]) < f0 + 0.05 && Math.abs(pts[0][1]) < f0 + 0.05 && Math.abs(pts[2][0]) < f0 + 0.05 && Math.abs(pts[2][1]) < f0 + 0.05) { a = b + 0.05; continue; }
          B.quad(...pts.map((p) => [p[0], 0.012, p[1]]), c, UP);
          if (!lite) for (let f = 1; f < 4; f++) { const t = f / 4, A = pts[0].map((v, i) => v + (pts[3][i] - v) * t), Bq = pts[1].map((v, i) => v + (pts[2][i] - v) * t), dz2 = 0.025; const nzx = (pts[3][0] - pts[0][0]), nzz = (pts[3][1] - pts[0][1]), nl = Math.hypot(nzx, nzz) || 1; B.quad([A[0], 0.016, A[1]], [Bq[0], 0.016, Bq[1]], [Bq[0] + nzx / nl * dz2, 0.016, Bq[1] + nzz / nl * dz2], [A[0] + nzx / nl * dz2, 0.016, A[1] + nzz / nl * dz2], shade(c, 0.82), UP); }
        }
        a = b + 0.06;
      }
    }
    // roads out of the gates and the main streets inside
    box(B, 0, 0, 0, 2 * sw, 0.03, 2 * P - 0.1, 0, TOWNC.street, TOWNC.street, TOWNC.street);
    box(B, 0, 0, 0, 2 * P - 0.1, 0.03, 2 * sw, 0, TOWNC.street, TOWNC.street, TOWNC.street);
    // the moat: a water channel with a foam lip, bridged at the gates
    if (T.moat) {
      const m0 = R + T.wt / 2 + 0.35, m1 = m0 + 0.75;
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (const [a0, a1] of [[-m1, -sw - 0.2], [sw + 0.2, m1]]) {
          const q = (u, v) => (sx ? [sx * v, 0.035, u] : [u, 0.035, sz * v]);
          B.quad(q(a0, m0), q(a1, m0), q(a1, m1), q(a0, m1), TOWNC.moat, UP);
          const q2 = (u, v) => (sx ? [sx * v, 0.045, u] : [u, 0.045, sz * v]);
          B.quad(q2(a0, m0 + 0.08), q2(a1, m0 + 0.08), q2(a1, m0 + 0.2), q2(a0, m0 + 0.2), TOWNC.foam, UP);
        }
        const bx2 = sx * (m0 + m1) / 2, bz2 = sz * (m0 + m1) / 2;
        box(B, bx2, 0.03, bz2, sx ? 1.0 : 2 * sw + 0.5, 0.08, sx ? 2 * sw + 0.5 : 1.0, 0, shade(TOWNC.wood, 1.15), TOWNC.wood, shade(TOWNC.wood, 0.7));
      }
    }
    // the walls: four sides, each two runs either side of its gate
    const gh = T.gw / 2, sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [nx, nz] of sides) {
      const ux = -nz, uz = nx, cxs = nx * R, czs = nz * R;
      wallRun(B, cxs - ux * R, czs - uz * R, cxs - ux * gh, czs - uz * gh, nx, nz, T, lv, lite);
      wallRun(B, cxs + ux * gh, czs + uz * gh, cxs + ux * R, czs + uz * R, nx, nz, T, lv, lite);
      // bastions (mamian) jutting out
      for (let b = 0; b < T.bast; b++) {
        const f = T.bast === 2 ? [-0.55, 0.55][b] : [-0.78, -0.4, 0.4, 0.78][b], px = cxs + ux * f * R + nx * (T.wt / 2 + 0.2), pz = czs + uz * f * R + nz * (T.wt / 2 + 0.2);
        box(B, px, 0, pz, nx ? 0.42 : 0.56, T.H, nx ? 0.56 : 0.42, 0, TOWNC.cap, TOWNC.earth, shade(TOWNC.earth, 0.6));
        box(B, px, T.H, pz, nx ? 0.5 : 0.64, 0.06, nx ? 0.64 : 0.5, 0, lighten(TOWNC.cap, 0.2), TOWNC.cap, shade(TOWNC.cap, 0.8));
        if (lv >= 4) lacquerTower(B, px, T.H + 0.06, pz, 0.42, 0.42, 1, { h: 0.26, rh: 0.2, timber: true, lite });
      }
      // the gate: an earth gatehouse block, a dark passage, lacquer doors; the gate tower on top
      const gx = nx * R, gz = nz * R, gwid = T.gw + 0.7, gdep = T.wt * 1.35;
      if (lv === 0) {
        for (const s of [-1, 1]) { const px = gx + ux * s * (gh + 0.05), pz = gz + uz * s * (gh + 0.05); box(B, px, 0, pz, 0.14, T.H + 0.35, 0.14, 0, TOWNC.wood, TOWNC.wood, shade(TOWNC.wood, 0.7)); }
        box(B, gx, T.H + 0.25, gz, nx ? 0.12 : T.gw + 0.3, 0.1, nx ? T.gw + 0.3 : 0.12, 0, TOWNC.wood, TOWNC.wood, TOWNC.wood);
        continue;
      }
      box(B, gx, 0, gz, nx ? gdep : gwid, T.H + 0.06, nx ? gwid : gdep, 0, TOWNC.cap, shade(TOWNC.earth, 0.97), shade(TOWNC.earth, 0.6));
      const f = gdep / 2 + 0.014, pw = T.gw * 0.32, ph = T.H * 0.72;
      const pq = (u, y) => [gx + nx * f + ux * u, y, gz + nz * f + uz * u];
      B.quad(pq(-pw, 0), pq(pw, 0), pq(pw, ph), pq(-pw, ph), TOWNC.slit, [nx, 0, nz]);
      for (const s of [-1, 1]) B.quad(pq(s * pw, 0), pq(s * (pw + 0.12), 0), pq(s * (pw + 0.12), ph), pq(s * pw, ph), LACQUER, [nx, 0, nz]); // doors folded open
      const tw = T.gw + 0.75, td = gdep * 1.05, st = lv >= 3 ? 2 : 1;
      lacquerTower(B, gx, T.H + 0.06, gz, nx ? td : tw, nx ? tw : td, st, { h: lv === 1 ? 0.42 : 0.56, rh: 0.48, ov: 0.32, timber: lv === 1, roof: lv === 1 ? TOWNC.thatch : SLATE, lite });
    }
    // corner towers
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (lv === 0) { box(B, sx * R, 0, sz * R, 0.3, T.H + 0.45, 0.3, 0, TOWNC.wood, TOWNC.wood, shade(TOWNC.wood, 0.7)); tileHip(B, sx * R, T.H + 0.45, sz * R, 0.34, 0.34, 0.26, TOWNC.thatch, 0.06, 1); continue; }
      const cw = T.wt * 1.9;
      box(B, sx * R, 0, sz * R, cw, T.H + 0.14, cw, 0, TOWNC.cap, shade(TOWNC.earth, 0.96), shade(TOWNC.earth, 0.6));
      if (lv >= 2) lacquerTower(B, sx * R, T.H + 0.14, sz * R, cw * 0.9, cw * 0.9, lv >= 4 ? 2 : 1, { h: 0.46, rh: 0.42, ov: 0.3, lite });
    }
    // the khuyet pair before the south gate (a governor's seat and up)
    if (lv >= 2) for (const s of [-1, 1]) {
      const qx = s * (gh + 0.55), qz = R + T.wt / 2 + (T.moat ? 1.45 : 0.55), qh = 0.7 + lv * 0.1;
      box(B, qx, 0, qz, 0.26, qh, 0.22, 0, TOWNC.cream, TOWNC.cream, shade(TOWNC.cream, 0.7));
      tileHip(B, qx, qh, qz, 0.26, 0.22, 0.14, SLATE, 0.08, 1);
      if (lv >= 4) { box(B, qx + s * 0.22, 0, qz, 0.18, qh * 0.62, 0.17, 0, TOWNC.cream, TOWNC.cream, shade(TOWNC.cream, 0.7)); tileHip(B, qx + s * 0.22, qh * 0.62, qz, 0.18, 0.17, 0.1, SLATE, 0.06, 1); }
    }
    // the governor's compound, north of the centre, facing south down the main street
    const yx = R * 0.42, yz0 = -inner + 0.12, yz1 = -sw - 0.35, yc = (yz0 + yz1) / 2, ydep = yz1 - yz0;
    box(B, 0, 0.03, yc, 2 * yx, 0.02, ydep, 0, TOWNC.yard, TOWNC.yard, TOWNC.yard);
    box(B, 0, 0.05, (yz1 + yc) / 2, 0.36, 0.02, yz1 - yc, 0, TOWNC.pave, TOWNC.pave, TOWNC.pave); // the paved way to the hall
    const cwH = lv >= 4 ? 0.62 : 0.34, cwT = lv >= 4 ? 0.26 : 0.1, cwCol = lv >= 4 ? TOWNC.earth : TOWNC.cream;
    const cwalls = [[-yx, yz0, yx, yz0, 0, -1], [-yx, yz0, -yx, yz1, -1, 0], [yx, yz0, yx, yz1, 1, 0], [-yx, yz1, -0.3, yz1, 0, 1], [0.3, yz1, yx, yz1, 0, 1]];
    for (const [ax, az, bx, bz] of cwalls) {
      const lx = Math.max(cwT, Math.abs(bx - ax) + cwT), lz = Math.max(cwT, Math.abs(bz - az) + cwT);
      box(B, (ax + bx) / 2, 0, (az + bz) / 2, lx, cwH, lz, 0, lv >= 4 ? TOWNC.cap : TOWNC.creamCap, cwCol, shade(cwCol, 0.65));
    }
    hall(B, 0, 0, yz1, 0.62, 0.36, 0.34, { lite, rh: 0.2 }); // the compound's gate
    // the main hall on a two-step earth platform, the rear hall, the side wings
    const hz = yc + ydep * 0.06, hw = yx * 1.3, hd = Math.min(1.05, ydep * 0.46);
    box(B, 0, 0, hz, hw + 0.36, 0.14, hd + 0.34, 0, TOWNC.cap, TOWNC.earth, shade(TOWNC.earth, 0.6));
    box(B, 0, 0.14, hz, hw + 0.16, 0.12, hd + 0.16, 0, lighten(TOWNC.cap, 0.15), TOWNC.cap, shade(TOWNC.cap, 0.7));
    hall(B, 0, 0.26, hz, hw, hd, 0.52 + lv * 0.05, { hip: lv >= 3, rh: 0.5 + lv * 0.04, ov: 0.3, windows: true, lite });
    if (lv >= 2) hall(B, 0, 0, yz0 + 0.42, hw * 0.85, 0.5, 0.44, { hip: lv >= 4, rh: 0.34, ov: 0.22, lite });
    for (const s of [-1, 1]) { // side halls along the compound's walls, a tree before each
      const wx = s * (yx - 0.36), wd = Math.min(1.3, ydep * 0.55);
      box(B, wx, 0, hz + 0.1, 0.42, 0.38, wd, 0, TOWNC.cream, TOWNC.cream, shade(TOWNC.cream, 0.7));
      tileGable(B, wx, 0.38, hz + 0.1, wd, 0.42, 0.26, Math.PI / 2, SLATE, TOWNC.cream, 0.12, lite ? 1 : 3);
    }
    const flagAt = [0, 0.26 + 0.52 + lv * 0.05 + 0.5 + lv * 0.04 - 0.1, hz + hd * 0.5 + 0.35];
    // the watchtower at the crossroads
    if (lv >= 1) {
      box(B, 0, 0, 0, 0.72, 0.22, 0.72, 0, TOWNC.cap, TOWNC.earth, shade(TOWNC.earth, 0.6));
      const st = [0, 2, 2, 3, 3][lv];
      lacquerTower(B, 0, 0.22, 0, 0.62, 0.62, st, { h: 0.4, rh: 0.36, ov: 0.26, timber: lv <= 2, roof: lv === 1 ? TOWNC.thatch : SLATE, lite });
    }
    // the blocks: courtyard compounds, the market, the granaries, trees
    const cell = lv <= 1 ? 1.4 : 0.98, trees = [];
    const taken = (x0, x1, z0, z1) => (x1 > -sw - 0.05 && x0 < sw + 0.05) || (z1 > -sw - 0.05 && z0 < sw + 0.05) || (x1 > -yx - 0.15 && x0 < yx + 0.15 && z0 < yz1 + 0.15) || (Math.abs((x0 + x1) / 2) < 0.75 && Math.abs((z0 + z1) / 2) < 0.75);
    let market = false, granary = false;
    const cells = [];
    for (let gx = -inner; gx + cell <= inner + 0.01; gx += cell) for (let gz = -inner; gz + cell <= inner + 0.01; gz += cell) cells.push([gx, gz]);
    cells.sort((p, q) => Math.hypot(p[0] + cell / 2, p[1] + cell / 2) - Math.hypot(q[0] + cell / 2, q[1] + cell / 2));
    const thatchP = [1, 0.55, 0.12, 0, 0][lv];
    for (const [gx, gz] of cells) {
      const x0 = gx + 0.06, x1 = gx + cell - 0.06, z0 = gz + 0.06, z1 = gz + cell - 0.06, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, c = x1 - x0;
      if (taken(x0, x1, z0, z1)) continue;
      if (!market && lv >= 1 && cx > 0 && cz > 0) { // the market: a paved square under paper awnings
        market = true;
        box(B, cx, 0.03, cz, c, 0.02, c, 0, TOWNC.pave, TOWNC.pave, TOWNC.pave);
        for (let i = 0; i < 4; i++) {
          const ax = cx + ((i % 2) - 0.5) * c * 0.48, az = cz + (Math.floor(i / 2) - 0.5) * c * 0.48, col = TOWNC.awning[i % TOWNC.awning.length];
          box(B, ax, 0.05, az, 0.3, 0.12, 0.2, 0, TOWNC.cap, TOWNC.wood, shade(TOWNC.wood, 0.7));
          B.quad([ax - 0.24, 0.3, az - 0.2], [ax + 0.24, 0.3, az - 0.2], [ax + 0.24, 0.22, az + 0.2], [ax - 0.24, 0.22, az + 0.2], col, [0, 1, 0.2]);
          B.quad([ax - 0.24, 0.22, az + 0.2], [ax + 0.24, 0.22, az + 0.2], [ax + 0.24, 0.16, az + 0.22], [ax - 0.24, 0.16, az + 0.22], shade(col, 0.75), [0, 0, 1]);
        }
        continue;
      }
      if (!granary && lv >= 1 && cx > 0 && cz < 0) { // granaries: round card drums under conical slate roofs
        granary = true;
        for (let i = 0; i < 3; i++) { const qx = cx + (i - 1) * c * 0.31; frustum(B, qx, cz, 0.02, 0.42, 0.17, 0.16, 10, 0, shade(TOWNC.cream, 0.8), TOWNC.cream); frustum(B, qx, cz, 0.4, 0.66, 0.24, 0.02, 10, 0, shade(lv === 1 ? TOWNC.thatch : SLATE, 0.8), lv === 1 ? TOWNC.thatch : SLATE); }
        continue;
      }
      // a courtyard compound: cream wall with a slate cap, its gate (a dark slit) to the south, the main house north, wings, a yard
      const roof = r() < thatchP ? TOWNC.thatch : shade(SLATE, 0.92 + 0.16 * r()), wallC = shade(TOWNC.cream, 0.95 + 0.07 * r()), wh = 0.2, wt = 0.06;
      box(B, cx, 0.03, cz, c, 0.012, c, 0, TOWNC.yard, TOWNC.yard, TOWNC.yard);
      if (lv >= 1) for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0], [x0, x0, z0, z1], [x1, x1, z0, z1], [x0, cx - 0.1, z1, z1], [cx + 0.1, x1, z1, z1]]) {
        const lx = Math.max(wt, a1 - a0 + wt), lz = Math.max(wt, b1 - b0 + wt);
        box(B, (a0 + a1) / 2, 0, (b0 + b1) / 2, lx, wh, lz, 0, roof === TOWNC.thatch ? shade(TOWNC.thatch, 0.85) : mix(TOWNC.creamCap, wallC, 0.55), wallC, shade(wallC, 0.7));
      }
      if (lv >= 1) B.quad([cx - 0.09, 0.0, z1 + wt / 2 + 0.01], [cx + 0.09, 0.0, z1 + wt / 2 + 0.01], [cx + 0.09, wh * 0.85, z1 + wt / 2 + 0.01], [cx - 0.09, wh * 0.85, z1 + wt / 2 + 0.01], TOWNC.slit, [0, 0, 1]);
      const mw = c * 0.86, md = c * 0.4, mh = 0.34 + 0.06 * r(), rich = lv >= 2 && r() < 0.3;
      hall(B, cx, 0, z0 + md / 2 + 0.06, mw, md, mh, { wall: wallC, roof, rh: rich ? 0.34 : 0.3, ov: 0.14, hip: rich, lite: true });
      const wings = r() < 0.75 ? [-1, 1] : [r() < 0.5 ? -1 : 1];
      for (const s of wings) {
        const wx = cx + s * (c / 2 - 0.22), wz = cz + 0.14, ww = 0.34, wd = c * 0.46;
        box(B, wx, 0, wz, ww, 0.3, wd, 0, wallC, wallC, shade(wallC, 0.7));
        tileGable(B, wx, 0.3, wz, wd, ww, 0.22, Math.PI / 2, roof, wallC, 0.1, lite ? 1 : 2);
      }
      if (r() < 0.7) trees.push([cx + (r() - 0.5) * c * 0.2, cz + c * 0.24, 0.66]);
      if (lv === 0 && r() < 0.8) frustum(B, cx + c * 0.3, cz + c * 0.3, 0.02, 0.36, 0.16, 0.0, 8, 0, shade(TOWNC.thatch, 0.85), lighten(TOWNC.thatch, 0.1)); // a haystack
    }
    // trees along the main streets, in the corners inside and a few outside the walls
    if (lv >= 1) for (let i = 1; i < 4; i++) for (const sx of [-1, 1]) { const d = (inner * i) / 4 + 0.25; trees.push([sx * (sw + 0.22), d + 0.1, 0.55]); if (i > 1) trees.push([d, sx * (sw + 0.22), 0.55]), trees.push([-d, sx * (sw + 0.22), 0.55]); }
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (r() < 0.8) trees.push([sx * (inner - 0.3), sz * (inner - 0.3), 0.7]);
    for (let i = 0; i < 6 + lv; i++) { const a = r() * Math.PI * 2, rr2 = R + T.wt / 2 + (T.moat ? 1.25 : 0.4) + r() * 0.25, x = Math.cos(a) * rr2, z = Math.sin(a) * rr2; if (Math.abs(x) < sw + 0.4 || Math.abs(z) < sw + 0.4) continue; trees.push([clamp(x, -P + 0.25, P - 0.25), clamp(z, -P + 0.25, P - 0.25), 0.75]); }
    for (const [x, z, s] of trees) {
      const col = TOWNC.tree[Math.floor(r() * TOWNC.tree.length)], rr = r() * 6;
      frustum(B, x, z, 0, 0.22 * s, 0.07 * s, 0.06 * s, 5, 0, TOWNC.wood, TOWNC.wood);
      frustum(B, x, z, 0.2 * s, 0.5 * s, 0.34 * s, 0.42 * s, 8, rr, shade(col, 0.75), shade(col, 0.95));
      frustum(B, x, z, 0.5 * s, 0.78 * s, 0.42 * s, 0.2 * s, 8, rr + 0.3, shade(col, 0.98), lighten(col, 0.12), { cap: lighten(col, 0.2) });
    }
    appendScaled(B0, B, 0, 0, 0, o.scale || 1, o.x || 0, o.y || 0, o.z || 0);
    const k = o.scale || 1;
    return { plate: P * k, plateY: o.y || 0, R: R * k, flagAt: [(o.x || 0) + flagAt[0] * k, (o.y || 0) + flagAt[1] * k, (o.z || 0) + flagAt[2] * k], tris: B.tris };
  }

  // the backdrop: far paper ridges, a paper sun with its rings and strips of cloud, stacked-disc clouds
  function waveRidge(B, x0, x1, zc, yBase, amp, seed, colTop, colBot, thick) {
    const r = rng(seed), pts = [], n = 28;
    for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(x0, x1, t); pts.push([x, yBase + amp * (0.5 + 0.5 * Math.sin(t * 9 + seed)) * (0.55 + 0.45 * fbm(x / 20, seed, seed, 2)) + amp * 0.3 * r()]); }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      B.quad([a[0], yBase - 6, zc], [b[0], yBase - 6, zc], [b[0], b[1], zc], [a[0], a[1], zc], [colBot, colBot, colTop, colTop], [0, 0, 1]);
      B.quad([a[0], a[1], zc - thick], [b[0], b[1], zc - thick], [b[0], b[1], zc], [a[0], a[1], zc], shade(colTop, 0.9), UP);
    }
  }
  function disc(B, cx, cy, cz, r, thick, col, n, rim) { // a paper disc standing upright, facing +z
    const pts = [], pb = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]); pb.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz - thick]); }
    B.fan(pts, col, [0, 0, 1]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, c = rim || shade(col, 0.82); B.quad(pb[i], pb[j], pts[j], pts[i], c, [pts[i][0] + pts[j][0] - 2 * cx, pts[i][1] + pts[j][1] - 2 * cy, 0]); }
  }
  function buildBackdrop(B, pal, Bd, rnd) {
    const cx = (Bd.x0 + Bd.x1) / 2;
    const fade = mix(hex(pal.bgCss[0]), hex(pal.bgCss[1]), 0.5); // the ridges melt into the sky's middle tone
    void fade; // round 3: no far ridges (they read as a pale slab behind the plate); the sky gradient is the backdrop
    const sx = cx + 76, sy = 17, sz = Bd.z0 - 52;
    disc(B, sx, sy, sz - 0.4, 19, 0.6, mix(pal.sun[2], pal.sun[0], 0.25), 40);
    disc(B, sx, sy, sz, 15.5, 0.8, pal.sun[0], 40);
    disc(B, sx, sy, sz + 0.5, 12.3, 0.5, pal.sun[1], 40);
    // paper strips across the sun
    const strips = [[-2, 6.5, 8], [3, 3.5, 10], [-5, 0.0, 7], [4, -3, 9], [-1, -6.5, 6]];
    for (const [dx, dy, w] of strips) { const c = lighten(pal.cloud, 0.0); box(B, sx + dx, sy + dy, sz + 1.2, w, 0.7, 0.4, 0, c, c, shade(c, 0.85)); }
    // stacked-disc clouds
    for (const [cx0, cy0, sc] of [[cx - 84, 19, 1.2], [cx - 22, 27, 0.8], [cx + 124, 22, 1.0]]) {
      const cz = Bd.z0 - 30 + rnd() * 6;
      for (let i = 0; i < 5; i++) {
        const r = (3.6 - Math.abs(i - 2) * 0.55 + rnd() * 0.5) * sc, x = cx0 + (i - 2) * 3.4 * sc, y = cy0 + (i % 2) * 1.2 * sc;
        frustum(B, x, cz + i * 0.12, y, y + 0.7 * sc, r, r * 0.92, 18, 0, shade(pal.cloud, 0.8), pal.cloud, { sz: 0.55, cap: pal.cloud, bottom: shade(pal.cloud, 0.7) });
      }
    }
  }

  // ---------------------------------------------------------------- armies as paper figures (pure geometry; scaled by the page)
  function standee(B, fcol, hat) {
    const dk = shade(fcol, 0.7), cream = hex('#f3e7cc'), wood = hex('#7a5a3a'), skin = hex('#f0d9b5');
    frustum(B, 0, 0, 0, 0.12, 0.95, 0.9, 10, 0, shade(cream, 0.85), cream, { sz: 0.5 });
    frustum(B, 0, 0, 0.1, 1.4, 0.74, 0.62, 4, Math.PI / 4, shade(fcol, 0.8), fcol, { sz: 0.22 });
    frustum(B, 0, 0.03, 0.62, 0.86, 0.77, 0.74, 4, Math.PI / 4, shade(cream, 0.95), cream, { sz: 0.25 });
    frustum(B, 0, 0.02, 1.4, 1.82, 0.3, 0.27, 8, 0, skin, lighten(skin, 0.08), { sz: 0.5 });
    frustum(B, 0, 0.04, 1.78, 2.2, hat ? 0.44 : 0.36, 0.14, 8, 0, dk, fcol, { sz: 0.5 });
    box(B, 0.72, 0, 0.1, 0.08, 2.9, 0.08, 0, wood, wood, wood);
    frustum(B, 0.72, 0.1, 2.9, 3.3, 0.1, 0.0, 4, 0, cream, WHITE, { sz: 0.5 });
  }
  function boat(B, fcol, o) { // a folded-paper sail boat, bow towards +x
    o = o || {};
    const hull = hex('#6b4a36'), hullHi = hex('#8d6648'), sail = [1.38, 1.34, 1.26], deck = hex('#c9a77a');
    const top = [[2.2, 0.62, 0], [1.1, 0.62, 0.72], [-1.9, 0.62, 0.78], [-1.9, 0.62, -0.78], [1.1, 0.62, -0.72]], bot = [[1.7, 0, 0], [0.8, 0, 0.36], [-1.6, 0, 0.42], [-1.6, 0, -0.42], [0.8, 0, -0.36]];
    B.fan(top, deck, UP);
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5, a = top[i], b = top[j], c = bot[j], d = bot[i], dir = [(a[0] + b[0]) / 2 - 0, 0, (a[2] + b[2]) / 2], mid = [lerp(a[0], d[0], 0.4), lerp(a[1], d[1], 0.4), lerp(a[2], d[2], 0.4)], mid2 = [lerp(b[0], c[0], 0.4), lerp(b[1], c[1], 0.4), lerp(b[2], c[2], 0.4)];
      B.quad(a, b, mid2, mid, [hullHi, hullHi, fcol, fcol], dir);
      B.quad(mid, mid2, c, d, [fcol, fcol, hull, hull], dir);
    }
    box(B, -0.1, 0.6, 0, 0.1, 3.9, 0.1, 0, hullHi, hullHi, hullHi);
    const tri2 = (a, b, c, col) => { B.tri(a, b, c, col, [0, 0, 1]); B.tri(a, b, c, col, [0, 0, -1]); };
    B.tri([-0.05, 4.2, 0.02], [-0.05, 0.95, 0.02], [-1.9, 0.9, 0.02], [sail, lighten(sail, 0), shade(sail, 0.92)], [0, 0, 1]);
    B.tri([-0.05, 4.2, -0.02], [-0.05, 0.95, -0.02], [-1.9, 0.9, -0.02], [sail, lighten(sail, 0), shade(sail, 0.92)], [0, 0, -1]);
    B.tri([0.12, 3.6, 0.02], [0.12, 0.95, 0.02], [2.0, 0.85, 0.02], [shade(sail, 0.98), sail, shade(sail, 0.9)], [0, 0, 1]);
    B.tri([0.12, 3.6, -0.02], [0.12, 0.95, -0.02], [2.0, 0.85, -0.02], [shade(sail, 0.98), sail, shade(sail, 0.9)], [0, 0, -1]);
    void tri2;
    if (!o.noFlag) { /* the flag is a dynamic mesh the page adds */ }
  }

  // a square frame in the owner's colour round a town's plate (half-size P, ribbon width w, thickness t): a paper ribbon on the card
  function ownerFrame(THREE, P, w, t) {
    const B = new Builder(), c = [1, 1, 1];
    for (const [sx, sz, lx, lz] of [[0, -1, 2 * P + w, w], [0, 1, 2 * P + w, w], [-1, 0, w, 2 * P - w], [1, 0, w, 2 * P - w]]) box(B, sx * (P - w / 2 + w / 2), 0, sz * (P - w / 2 + w / 2), lx, t, lz, 0, c, shade(c, 0.8), shade(c, 0.62));
    const g = B.geometry(THREE);
    return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xffffff }));
  }

  // the stage both maps share: renderer, scene, camera, lights, the paper-fibre material patch and the post pass (MSAA, then a
  // separable tilt-shift blur + vignette; the low tier draws straight to the canvas). ST.tilt = { c, w0, w1, top, bot } in screen
  // terms: the sharp band's centre (0 bottom … 1 top), where the blur starts and is full, and the blur radius above / below it.
  function makeStage(o) {
    const THREE = o.THREE, doc = o.doc, q = o.q, tier = o.tier;
    const W0 = +q.get('w') || root.innerWidth, H0 = +q.get('h') || root.innerHeight;
    // mid/high render into a multisampled target (MSAA), then a separable tilt-shift blur + vignette; low draws straight to the canvas
    const renderer = new THREE.WebGLRenderer({ antialias: tier.aa && !tier.post, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(+q.get('dpr') || root.devicePixelRatio || 1, tier.dpr));
    renderer.setSize(W0, H0, false); renderer.info.autoReset = false;
    renderer.shadowMap.enabled = !!tier.shadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    doc.body.insertBefore(renderer.domElement, doc.body.firstChild);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W0 / H0, 8, 900);
    scene.fog = new THREE.Fog(0xdfe8ee, 200, 500);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.46), key = new THREE.DirectionalLight(0xffffff, 0.98);
    scene.add(hemi, key, key.target);
    if (tier.shadow) {
      key.castShadow = true; key.shadow.mapSize.set(tier.shadow, tier.shadow);
      const sc = key.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 20; sc.far = 400;
      key.shadow.bias = -0.0004; key.shadow.normalBias = 0.18; key.shadow.radius = tier.shadow > 2048 ? 4 : 3;
    }
    // paper: a very faint world-space fibre/grain noise multiplied into the albedo (no textures), slightly matte
    const paperize = (mat, amp) => {
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWp;
float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(ph(i), ph(i + vec2(1.0, 0.0)), f.x), mix(ph(i + vec2(0.0, 1.0)), ph(i + vec2(1.0, 1.0)), f.x), f.y); }`)
          .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 w = vWp.xz + vWp.y * vec2(0.7, 1.3); float vd = distance(vWp, cameraPosition), near = 1.0 - smoothstep(25.0, 150.0, vd), fine = 1.0 - smoothstep(70.0, 260.0, vd);
  float fib = pn(w * vec2(9.0, 2.2)) * 0.5 + pn(w * vec2(2.4, 11.0)) * 0.5, grain = pn(w * 26.0), streak = pn(w * vec2(31.0, 4.0));
  diffuseColor.rgb *= 1.0 + ${amp.toFixed(3)} * (0.55 + 1.5 * near) * ((fib - 0.5) * 1.6 * (0.4 + 0.6 * fine) + ((grain - 0.5) * 0.9 + (streak - 0.5) * 0.7) * fine); }`);
      };
      mat.customProgramCacheKey = () => 'paper' + amp;
      return mat;
    };
    const lam = paperize(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.05), bas = new THREE.MeshBasicMaterial({ vertexColors: true });
    let post = null; // { rtA, rtB, quad, qScene, qCam, mH, mV }
    function makePost() {
      const sz = renderer.getDrawingBufferSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
      if (post) { post.rtA.dispose(); post.rtB.dispose(); post.mH.dispose(); post.mV.dispose(); post.quad.geometry.dispose(); }
      const rtA = new THREE.WebGLRenderTarget(sz.x, sz.y, { samples: tier.msaa, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }), rtB = new THREE.WebGLRenderTarget(sz.x, sz.y, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      const fs = (last) => `varying vec2 vUv; uniform sampler2D t; uniform vec2 dir; uniform float aspect; uniform vec4 band; uniform vec2 rad;
        void main(){
          float d = abs(vUv.y - band.x), m = smoothstep(band.y, band.z, d), r = m * (vUv.y > band.x ? rad.x : rad.y) * ${pr.toFixed(2)};
          vec4 c = texture2D(t, vUv) * 0.2270;
          c += (texture2D(t, vUv + dir * r * 1.3846) + texture2D(t, vUv - dir * r * 1.3846)) * 0.3162;
          c += (texture2D(t, vUv + dir * r * 3.2308) + texture2D(t, vUv - dir * r * 3.2308)) * 0.0703;
          ${last ? 'vec2 q = (vUv - 0.5) * vec2(aspect, 1.0); c.rgb *= 1.0 - 0.3 * smoothstep(0.42, 1.05, length(q)); c.rgb = mix(c.rgb, c.rgb * vec3(1.02, 1.0, 0.97), 0.5);' : ''}
          gl_FragColor = vec4(c.rgb, 1.0);
        }`;
      const mk = (last, dir) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs(last), uniforms: { t: { value: null }, dir: { value: dir }, aspect: { value: sz.x / sz.y }, band: { value: new THREE.Vector4(0.44, 0.24, 0.62, 0) }, rad: { value: new THREE.Vector2(2.3, 2.3) } }, depthTest: false, depthWrite: false });
      const mH = mk(false, new THREE.Vector2(1 / sz.x, 0)), mV = mk(true, new THREE.Vector2(0, 1 / sz.y));
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mH); quad.frustumCulled = false;
      post = { rtA, rtB, quad, qScene: new THREE.Scene(), qCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mH, mV }; post.qScene.add(quad);
    }
    if (tier.post) makePost();
    const tilt = { c: 0.44, w0: 0.24, w1: 0.62, top: 2.3, bot: 2.3 };
    function renderFrame() {
      if (!post) { renderer.render(scene, cam); return; }
      for (const m of [post.mH, post.mV]) { m.uniforms.band.value.set(tilt.c, tilt.w0, tilt.w1, 0); m.uniforms.rad.value.set(tilt.top, tilt.bot); }
      renderer.setRenderTarget(post.rtA); renderer.render(scene, cam);
      post.quad.material = post.mH; post.mH.uniforms.t.value = post.rtA.texture; renderer.setRenderTarget(post.rtB); renderer.render(post.qScene, post.qCam);
      post.quad.material = post.mV; post.mV.uniforms.t.value = post.rtB.texture; renderer.setRenderTarget(null); renderer.render(post.qScene, post.qCam);
    }

    const ST = { renderer, scene, cam, hemi, key, paperize, lam, bas, renderFrame, makePost, tilt };
    Object.defineProperty(ST, 'post', { get: () => post });
    return ST;
  }

  // ================================================================ the page
  function boot() {
    const THREE = root.THREE, V2 = root.EmperorsV2, doc = root.document;
    const $ = (id) => doc.getElementById(id);
    const q = new URLSearchParams(root.location.search);
    if ((q.get('map') || 'world') !== 'huainan' && root.PaperWorld) return root.PaperWorld.boot(); // the whole map is the default; ?map=huainan plays Hoài Nam
    doc.title = 'Hoài Nam bằng giấy';
    const tierName = TIERS[q.get('tier')] ? q.get('tier') : 'mid', tier = TIERS[tierName];
    const lockSeason = q.get('season') ? SEASON_KEY[q.get('season').normalize('NFC')] || (PAL[q.get('season')] ? q.get('season') : null) : null;
    const seed = +q.get('seed') || 3;
    const P = { ready: false, tier: tierName };
    root.__paper = P;
    fetch('data/scenario/huainan.json').then((r) => r.json()).then(run).catch((e) => { root.__error = String(e && e.stack || e); $('boot').textContent = 'Lỗi: ' + e.message; });

    function run(data) {
      let g = V2.newGame(data, seed), view = V2.view(g);
      const factions = data.factions;
      const fcol = (fid) => hex((factions[fid] || factions.local).color);
      const townList = data.towns.map((d) => ({ id: d.id, name: d.name, x: d.xz[0], z: d.xz[1], level: TOWN_LEVEL[d.id] || 2, town: TOWN_RANK[d.id] == null ? 2 : TOWN_RANK[d.id], river: d.river }));
      const townById = Object.fromEntries(townList.map((t) => [t.id, t]));
      const seasonOf = (v) => SEASON_KEY[v.calendar.split(' ')[0]] || 'autumn';
      let seasonKey = lockSeason || seasonOf(view);

      // ---- renderer / scene
      const ST = makeStage({ THREE, doc, q, tier });
      const { renderer, scene, cam, hemi, key, paperize, lam, bas, renderFrame } = ST;
      const world = new THREE.Group(); scene.add(world);
      const dyn = new THREE.Group(); scene.add(dyn);
      const makePost = ST.makePost;
      let S = null, glow = null; const fogCol = new THREE.Color(); // the current static scene
      const stats = { tris: 0, calls: 0 };

      function applySeason(name) {
        seasonKey = name;
        if (S) { world.remove(...world.children); for (const m of S.meshes) m.geometry.dispose(); }
        const pal = palette(name), st = buildStatic({ tier: tierName, pal, towns: townList, seed: 7 });
        const meshes = [];
        const add = (b, mat, cast, recv) => { const m = new THREE.Mesh(b.geometry(THREE), mat); m.castShadow = cast; m.receiveShadow = recv; world.add(m); meshes.push(m); return m; };
        add(st.terrain, lam, true, true); add(st.river, lam, false, true); add(st.mtn, lam, true, true); add(st.props, lam, true, true); add(st.towns, lam, true, true); add(st.back, bas, false, false);
        // sun glow: a soft additive sprite behind the paper sun
        const cv = doc.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 8, 64, 64, 64);
        const sc = pal.sun[0], rgb = `${Math.round(sc[0] * 255)},${Math.round(sc[1] * 255)},${Math.round(sc[2] * 255)}`;
        gr.addColorStop(0, `rgba(${rgb},0.65)`); gr.addColorStop(0.45, `rgba(${rgb},0.22)`); gr.addColorStop(1, `rgba(${rgb},0)`); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        const Bd = st.T.bounds; sp.scale.set(120, 120, 1); sp.position.set((Bd.x0 + Bd.x1) / 2 + 76, 17, Bd.z0 - 53.5); world.add(sp);
        S = { st, pal, meshes, topY: st.topY };
        hemi.color.copy(new THREE.Color().setRGB(...pal.hemi[0])); hemi.groundColor.copy(new THREE.Color().setRGB(...pal.hemi[1]));
        key.color.copy(new THREE.Color().setRGB(...pal.key));
        // sky: the page gradient drawn into the scene (the blur pass needs an opaque frame); fog = the pale blue-ish air, so far layers fade
        const sk = doc.createElement('canvas'); sk.width = 4; sk.height = 256; const sx = sk.getContext('2d'), sg = sx.createLinearGradient(0, 0, 0, 256); sg.addColorStop(0, pal.bgCss[0]); sg.addColorStop(1, pal.bgCss[1]); sx.fillStyle = sg; sx.fillRect(0, 0, 4, 256);
        scene.background = new THREE.CanvasTexture(sk); fogCol.setRGB(...mix(mix(hex(pal.bgCss[0]), hex(pal.bgCss[1]), 0.5), [0.8, 0.88, 0.93], 0.2)); scene.fog.color.copy(fogCol);
        doc.documentElement.style.setProperty('--bg1', pal.bgCss[0]); doc.documentElement.style.setProperty('--bg2', pal.bgCss[1]);
        P.season = name; P.tris = st.terrain.tris + st.river.tris + st.mtn.tris + st.props.tris + st.towns.tris + st.back.tris;
        rebuildTowns(); syncAll(false);
      }

      // ---- towns: ownership ring, banner, label, hit proxy
      const hitTowns = [], hitArmies = [], townObj = {};
      const labelEls = {};
      function makeFlag(w, h, segs) {
        const geo = new THREE.PlaneGeometry(w, h, segs, 2); geo.translate(w / 2, 0, 0);
        const m = new THREE.Mesh(geo, paperize(new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 0.04));
        m.userData = { w, segs, base: Float32Array.from(geo.attributes.position.array) };
        return m;
      }
      const flags = [], glyphTexs = {};
      function glyphTex(fid) { // a paper banner: faction colour, cream inner border, the faction's glyph cut in cream
        if (glyphTexs[fid]) return glyphTexs[fid];
        const f = factions[fid] || factions.local, cv2 = doc.createElement('canvas'); cv2.width = 192; cv2.height = 112; const c2 = cv2.getContext('2d');
        c2.fillStyle = f.color; c2.fillRect(0, 0, 192, 112); c2.strokeStyle = '#f6ead0'; c2.lineWidth = 5; c2.strokeRect(9, 9, 174, 94);
        c2.fillStyle = '#f6ead0'; c2.font = '700 78px "WenQuanYi Zen Hei","Noto Sans CJK SC","Noto Sans CJK JP","Microsoft YaHei","PingFang SC",serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(f.glyph || '豪', 96, 60);
        const tx = new THREE.CanvasTexture(cv2); tx.anisotropy = 4; return (glyphTexs[fid] = tx);
      }
      const uiScale = () => clamp(camS.dist / 105, 0.62, 2.1); // paper pieces swell as the camera pulls back, so a phone still reads them
      function waveFlags(t) {
        for (const f of flags) {
          const pos = f.geometry.attributes.position, b = f.userData.base, w = f.userData.w;
          for (let i = 0; i < pos.count; i++) { const x = b[i * 3], k = x / w; pos.setZ(i, Math.sin(t * 3.2 + x * 1.7 + f.userData.ph) * 0.28 * k); pos.setY(i, b[i * 3 + 1] - 0.16 * k * k); }
          pos.needsUpdate = true;
        }
      }
      function rebuildTowns() {
        for (const id of Object.keys(townObj)) { dyn.remove(townObj[id].g); const i = flags.indexOf(townObj[id].flag); if (i >= 0) flags.splice(i, 1); }
        hitTowns.length = 0;
        for (const t of townList) {
          const y = S.topY(t.x, t.z), g = new THREE.Group(); g.position.set(t.x, y, t.z);
          const info = S.st.townInfo[t.id], ring = ownerFrame(THREE, info.plate, 0.55, 0.16); ring.position.y = info.plateY - y; ring.receiveShadow = true; g.add(ring);
          const banner = new THREE.Group(); g.add(banner); banner.position.set(info.flagAt[0] - t.x, info.flagAt[1] - y, info.flagAt[2] - t.z); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x7a5a3a })); pole.position.set(0, 2.1, 0); banner.add(pole);
          const flag = makeFlag(3.6, 2.1, 6); flag.userData.ph = t.x; flag.position.set(0.1, 3.3, 0); flag.castShadow = true; banner.add(flag); flags.push(flag);
          const hit = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 8, 10), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 3; hit.userData = { kind: 'town', id: t.id }; g.add(hit); hitTowns.push(hit);
          dyn.add(g); townObj[t.id] = { g, ring, flag, y, banner };
        }
        paintTowns();
      }
      function paintTowns() {
        for (const tv of view.towns) {
          const o = townObj[tv.id]; if (!o) continue; const c = fcol(tv.owner), col = new THREE.Color().setRGB(...c);
          o.ring.material.color.copy(col); o.flag.material.map = glyphTex(tv.owner); o.flag.material.color.setRGB(1, 1, 1); o.flag.material.needsUpdate = true;
          const el = labelEls[tv.id];
          if (el) { el.firstChild.style.background = '#' + col.getHexString(); }
        }
      }
      for (const t of townList) {
        const el = doc.createElement('div'); el.className = 'lbl'; el.innerHTML = '<i></i>' + t.name; doc.body.appendChild(el); labelEls[t.id] = el;
      }

      // ---- armies
      const A = {}; // id -> { g, flag, kind, x, z, anim }
      const GLIDE = 1.5;
      function armySize(a) { const u = a.units ? Object.values(a.units).reduce((s, v) => s + v, 0) : 6000; return clamp(Math.round(u / 2200), 2, 5); }
      function makeArmy(a) {
        const col = fcol(a.fid), g = new THREE.Group(), B = new Builder(), fleet = a.arm === 'fleet';
        if (fleet) boat(B, col); else standee(B, col, a.arms.indexOf('ky') >= 0);
        const mesh = new THREE.Mesh(B.geometry(THREE), lam); mesh.castShadow = true;
        const inner = new THREE.Group(); g.add(inner);
        const n = fleet ? 1 : armySize(a), sc = fleet ? 2.2 : 1.9;
        if (fleet) { mesh.scale.setScalar(sc); inner.add(mesh); }
        else for (let i = 0; i < n; i++) {
          const m = mesh.clone(); const ang = (i / n) * Math.PI * 2 + 0.6, rr = n > 1 ? 2.0 : 0;
          m.position.set(Math.cos(ang) * rr * 1.1, 0, Math.sin(ang) * rr * 0.7 + (i % 2) * 0.3); m.scale.setScalar(sc * (0.92 + 0.08 * (i % 2))); inner.add(m);
        }
        const flag = makeFlag(2.6, 1.5, 5); flag.userData.ph = a.id.charCodeAt(1); flag.material.map = glyphTex(a.fid); flag.material.color.setRGB(1, 1, 1);
        const poleH = fleet ? 7.6 : 6.2, pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1, 0.14), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
        if (fleet) { flag.position.set(-0.1 * sc, poleH * 1.45, 0); } else { pole.scale.y = poleH - 1.5; pole.position.set(0, 1.5 + (poleH - 1.5) / 2, -1.6); flag.position.set(0.07, poleH - 0.7, -1.6); g.add(pole); }
        flag.castShadow = true; inner.add(flag); flags.push(flag);
        const base = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.3, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
        base.rotation.x = -Math.PI / 2; base.position.y = 0.12; g.add(base);
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 3.4; hit.userData = { kind: 'army', id: a.id }; g.add(hit); hitArmies.push(hit);
        dyn.add(g);
        return { g, inner, flag, hit, base, fleet, heading: 0, x: 0, z: 0, anim: null, fid: a.fid };
      }
      function riverP(id) { const r = S.st.T.rivers.find((x) => x.id === id); return r && r.P; }
      // where an army stands: land armies on slots round the town's south side (besiegers outside the wall), fleets on the river nearby
      function slotOf(a, idxAt, cnt) {
        const place = a.besieging || a.at, t = townById[place]; if (!t) return { x: 0, z: 0 };
        if (a.arm === 'fleet') {
          const P = riverP(t.river); if (!P) return { x: t.x + 6, z: t.z + 6, s: 0 };
          const n0 = polyNearest(P, t.x, t.z), s = n0.s + (idxAt - (cnt - 1) / 2) * 6.5, p = polyAt(P, s);
          return { x: p.x, z: p.z, s, river: t.river };
        }
        const ang = Math.PI / 2 + (idxAt - (cnt - 1) / 2) * 0.62, rad = a.besieging ? 11.5 : 9.4;
        return { x: t.x + Math.cos(ang) * rad, z: t.z + Math.sin(ang) * rad };
      }
      function placeFleetY() { return 0.72; }
      function groundY(o, x, z) { return o.fleet ? placeFleetY() : S.topY(x, z); }
      function syncArmies(animate) {
        const byPlace = {};
        for (const a of view.armies) { const k = (a.besieging || a.at) + (a.besieging ? ':s' : '') + (a.arm === 'fleet' ? ':f' : ''); (byPlace[k] = byPlace[k] || []).push(a); }
        const alive = new Set();
        for (const k of Object.keys(byPlace)) {
          const arr = byPlace[k].sort((u, v) => (u.id < v.id ? -1 : 1));
          arr.forEach((a, i) => {
            alive.add(a.id);
            let o = A[a.id], fresh = false;
            if (!o) { o = A[a.id] = makeArmy(a); fresh = true; }
            const tgt = slotOf(a, i, arr.length);
            if (fresh || !animate) { o.x = tgt.x; o.z = tgt.z; o.s = tgt.s; o.river = tgt.river; o.anim = null; }
            else if (Math.hypot(tgt.x - o.x, tgt.z - o.z) > 0.5) o.anim = { x0: o.x, z0: o.z, s0: o.s, x1: tgt.x, z1: tgt.z, s1: tgt.s, river: tgt.river, t: 0 };
            o.view = a;
            o.g.visible = true;
          });
        }
        for (const id of Object.keys(A)) if (!alive.has(id)) { dyn.remove(A[id].g); const i = hitArmies.indexOf(A[id].hit); if (i >= 0) hitArmies.splice(i, 1); const f = flags.indexOf(A[id].flag); if (f >= 0) flags.splice(f, 1); delete A[id]; }
        for (const id of Object.keys(A)) poseArmy(A[id], 0);
      }
      function poseArmy(o, dt) {
        if (o.anim) {
          const an = o.anim; an.t = Math.min(1, an.t + dt / GLIDE); const e = an.t * an.t * (3 - 2 * an.t);
          if (o.fleet && an.river && an.river === o.river && an.s0 !== undefined && an.s1 !== undefined) {
            const p = polyAt(riverP(an.river), lerp(an.s0, an.s1, e)); o.x = p.x; o.z = p.z; const dir = Math.sign(an.s1 - an.s0) || 1; o.heading = Math.atan2(-p.tz * dir, p.tx * dir);
          } else {
            o.x = lerp(an.x0, an.x1, e); o.z = lerp(an.z0, an.z1, e);
            const dx = an.x1 - an.x0; if (o.fleet) o.heading = Math.atan2(-(an.z1 - an.z0), dx); else if (Math.abs(dx) > 1) o.inner.scale.x = dx < 0 ? -1 : 1;
          }
          if (an.t >= 1) { o.x = an.x1; o.z = an.z1; o.s = an.s1; o.river = an.river; o.anim = null; }
        }
        const hop = o.anim && !o.fleet ? Math.abs(Math.sin(o.anim.t * Math.PI * 7)) * 0.55 : 0, bob = o.fleet ? Math.sin(clockT * 1.6 + o.x) * 0.07 : 0;
        o.g.position.set(o.x, groundY(o, o.x, o.z) + hop + bob, o.z); o.g.scale.setScalar(uiScale());
        if (o.fleet) { o.inner.rotation.y = o.heading; if (!o.anim && o.river) { const P = riverP(o.river), p = polyAt(P, o.s || 0); o.heading = Math.atan2(-p.tz, p.tx); o.inner.rotation.y = o.heading; } }
      }

      // ---- order arrows and selection markers
      let sel = null, tgts = [], markers = new THREE.Group(), arrows = new THREE.Group(); dyn.add(markers, arrows);
      const mkMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, depthTest: false });
      let pulse = [];
      function refreshMarkers() {
        for (const grp of [markers, arrows]) { while (grp.children.length) { const c = grp.children.pop(); c.geometry.dispose(); } }
        pulse = [];
        for (const id of Object.keys(A)) A[id].base.material.opacity = 0;
        if (sel && A[sel]) {
          const o = A[sel]; o.base.material.color.set(0xffd25a); o.base.material.opacity = 0.95; o.base.material.depthTest = false;
          for (const tg of tgts) {
            let x, z, y, rad;
            if (tg.kind === 'town') { const t = townById[tg.id]; x = t.x; z = t.z; y = S.topY(x, z) + 0.2; rad = 8.4; } else { const b = A[tg.id]; if (!b) continue; x = b.x; z = b.z; y = groundY(b, x, z) + 0.25; rad = 5.8; }
            const hostile = tg.intent !== 'move', m = new THREE.Mesh(new THREE.RingGeometry(rad - 0.7, rad, 36), mkMat(hostile ? 0xe8452c : 0xfff1c0, 0.95));
            m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 9; markers.add(m); pulse.push(m);
          }
        }
        for (const a of view.armies) {
          if (!a.order) continue; const o = A[a.id], tt = a.order.target; if (!o) continue;
          const tx = tt.kind === 'town' ? townById[tt.id].x : A[tt.id].x, tz = tt.kind === 'town' ? townById[tt.id].z : A[tt.id].z, col = fcol(a.fid), n = Math.max(2, Math.floor(Math.hypot(tx - o.x, tz - o.z) / 2.6));
          const B = new Builder(); paperRibbon(B, o, tx, tz, col);
          const rb = new THREE.Mesh(B.geometry(THREE), lam); rb.castShadow = true; arrows.add(rb);
        }
      }
      // the order arrow: a bold paper ribbon that rides over the layers, with a thick edge, gentle folds and an arrowhead
      function paperRibbon(B, o, tx, tz, col) {
        const len = Math.hypot(tx - o.x, tz - o.z), n = Math.max(6, Math.round(len / 1.5)), dx = (tx - o.x) / len, dz = (tz - o.z) / len, nx = -dz, nz = dx, head = Math.min(6, len * 0.4), W = 1.25;
        const ys = [], cnt = n + 1;
        for (let i = 0; i <= n; i++) { const d = i * len / n, x = o.x + dx * d, z = o.z + dz * d; ys.push(groundYFor(o, x, z)); }
        const top = ys.map((y, i) => { let m = y; for (let k = -2; k <= 2; k++) m = Math.max(m, ys[clamp(i + k, 0, n)]); return m + 1.5 + 0.28 * Math.sin(i * 0.9); });
        for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) top[i] = (top[i - 1] + top[i] * 2 + top[i + 1]) / 4;
        const dk = shade(col, 0.62), lt = lighten(col, 0.22), th = 0.34;
        const P = (i, side, w, dy) => { const d = Math.min(len - head * 0.0, i * len / n); return [o.x + dx * d + nx * side * w, top[i] + (dy || 0), o.z + dz * d + nz * side * w]; };
        const endI = Math.max(1, Math.round((len - head) / (len / n)));
        for (let i = 0; i < endI; i++) {
          const c = (i & 1) ? col : shade(col, 0.93), w = W;
          B.quad(P(i, -1, w), P(i + 1, -1, w), P(i + 1, 1, w), P(i, 1, w), [c, c, lighten(c, 0.08), lighten(c, 0.08)], UP);
          B.quad(P(i, 1, w, -th), P(i + 1, 1, w, -th), P(i + 1, 1, w), P(i, 1, w), [dk, dk, c, c], [nx, 0, nz]);
          B.quad(P(i, -1, w, -th), P(i + 1, -1, w, -th), P(i + 1, -1, w), P(i, -1, w), [dk, dk, c, c], [-nx, 0, -nz]);
          B.quad(P(i, -1, w * 0.78), P(i + 1, -1, w * 0.78), P(i + 1, -1, w * 0.6), P(i, -1, w * 0.6), lt, UP); // a pale paper stripe down the middle
        }
        const hi = endI, hy = top[Math.min(n, hi)], bx = o.x + dx * (hi * len / n), bz = o.z + dz * (hi * len / n), tipX = o.x + dx * len, tipZ = o.z + dz * len;
        const A = [bx + nx * 3.0, hy, bz + nz * 3.0], Bq = [bx - nx * 3.0, hy, bz - nz * 3.0], T = [tipX, hy - 0.2, tipZ];
        B.tri(A, Bq, T, [lighten(col, 0.1), lighten(col, 0.1), col], UP);
        const A2 = [A[0], hy - th, A[2]], B2 = [Bq[0], hy - th, Bq[2]], T2 = [T[0], hy - th - 0.2, T[2]];
        B.quad(A2, A, T, T2, [dk, col, col, dk], [nx, 0, nz]); B.quad(B2, Bq, T, T2, [dk, col, col, dk], [-nx, 0, -nz]); B.quad(A2, A, Bq, B2, [dk, col, col, dk], [-dx, 0, -dz]);
        void cnt;
      }
      const groundYFor = (o, x, z) => (o.fleet ? 0.7 : S.topY(x, z));

      // ---- HUD
      const info = $('info'), toastEl = $('toast'), ask = $('ask');
      let toastT = 0;
      function toast(s) { toastEl.textContent = s; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 5200); }
      const ARM = { bo: 'bộ', cung: 'cung', ky: 'kỵ', thuy: 'thủy' };
      function hud() {
        $('season').textContent = view.calendar; $('r-luong').textContent = view.res.luong; $('r-tien').textContent = view.res.tien; $('r-uy').textContent = view.res.uy;
        const a = sel && view.armies.find((x) => x.id === sel);
        if (a) {
          const u = a.units ? Object.keys(a.units).filter((k) => a.units[k] > 0).map((k) => `${ARM[k] || k} ${a.units[k]}`).join(' · ') : '';
          info.hidden = false; info.innerHTML = `${a.gen ? a.gen.name : 'Đạo quân'}<small>${u}</small><small>${a.order ? 'Đã có lệnh. Chạm quân để huỷ.' : 'Chạm một thành hay quân địch trong tầm.'}</small>`;
        } else { info.hidden = false; info.innerHTML = view.over ? `Hết trận: ${view.over.win ? 'thắng' : 'thua'}` : 'Chạm một đạo quân của ta (cờ đỏ) để ra lệnh.<small>Kéo để dời, cuộn hoặc chụm hai ngón để thu phóng.</small>'; }
      }
      function syncAll(animate) { view = V2.view(g); paintTowns(); syncArmies(animate); refreshMarkers(); hud(); }

      // ---- interaction
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      function pick(cx, cy) {
        const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
        for (const list of [hitArmies, hitTowns]) { const h = ray.intersectObjects(list, false); if (h.length) return h[0].object.userData; }
        return null;
      }
      function onTap(cx, cy) {
        if (busy) return; ask.style.display = 'none';
        const hit = pick(cx, cy), mine = (id) => view.armies.find((a) => a.id === id && a.seen === 'own');
        if (!hit) { sel = null; tgts = []; refreshMarkers(); hud(); return; }
        if (hit.kind === 'army' && mine(hit.id)) {
          if (sel === hit.id) { const a = mine(hit.id); if (a.order) { g = V2.order(g, hit.id, null); view = V2.view(g); } else { sel = null; tgts = []; } }
          else { sel = hit.id; tgts = V2.targets(g, sel); }
          refreshMarkers(); hud(); return;
        }
        if (sel) {
          const tg = tgts.find((x) => x.kind === hit.kind && x.id === hit.id) || (hit.kind === 'town' ? null : null);
          if (tg) {
            if (tg.intent === 'ask') {
              $('ask-t').textContent = (tg.kind === 'town' ? townById[tg.id].name : 'Quân địch') + ': ';
              ask.style.display = 'flex'; askTarget = tg; return;
            }
            orderTo(tg, tg.intent);
          } else if (hit.kind === 'town') focusOn(hit.id, 46);
        } else if (hit.kind === 'town') focusOn(hit.id, 46);
      }
      let askTarget = null;
      function orderTo(tg, intent) {
        try { g = V2.order(g, sel, { kind: tg.kind, id: tg.id }, intent); toast('Lệnh đã ra.'); } catch (e) { toast(e.message.replace('V2.order: ', '')); }
        ask.style.display = 'none'; view = V2.view(g); refreshMarkers(); hud();
      }
      $('ask-atk').onclick = () => askTarget && orderTo(askTarget, 'attack'); $('ask-siege').onclick = () => askTarget && orderTo(askTarget, 'siege');
      let busy = false;
      function endSeason() {
        if (busy || view.over) return; busy = true; ask.style.display = 'none'; sel = null; tgts = [];
        try {
          for (const c of g.cards.filter((x) => x.urgent)) g = V2.answer(g, c.id, false);
          g = V2.endSeason(g); let guard = 0;
          while (g.pending && guard++ < 8) g = V2.autoBattle(g);
          const rep = g.report; if (rep && rep.lines && rep.lines.length) toast(rep.lines.slice(0, 2).map((l) => String(l).replace(/^[!?\s]+/, '')).join(' '));
        } catch (e) { toast(e.message); }
        view = V2.view(g);
        if (!lockSeason && seasonOf(view) !== seasonKey) { applySeason(seasonOf(view)); syncAll(true); } else syncAll(true);
        busy = false;
      }
      $('end').onclick = endSeason;

      // ---- camera
      const camS = { tx: 172, ty: 4, tz: -34, dist: 220, el: 0.5 }, camT = Object.assign({}, camS);
      const fitDist = () => { const asp = cam.aspect, vf = 86 / (2 * Math.tan((cam.fov * Math.PI) / 360)), hf = 112 / (2 * Math.tan((cam.fov * Math.PI) / 360) * asp); return Math.max(vf, hf); };
      camT.dist = camS.dist = fitDist();
      const home = () => ({ tx: 172, tz: -34, dist: fitDist() });
      function focusOn(id, dist) { const t = townById[id]; camT.tx = t.x; camT.tz = t.z + 4; camT.ty = S.topY(t.x, t.z); camT.dist = dist; }
      function clampCam() { camT.tx = clamp(camT.tx, BOUNDS.x0, BOUNDS.x1); camT.tz = clamp(camT.tz, BOUNDS.z0 + 10, BOUNDS.z1); camT.dist = clamp(camT.dist, 20, fitDist() * 1.25); }
      function updateCam(snap) {
        const k = snap ? 1 : 0.14;
        for (const f of ['tx', 'ty', 'tz', 'dist']) camS[f] = lerp(camS[f], camT[f], k);
        camS.el = lerp(0.44, 0.55, smooth(30, fitDist() * 0.9, camS.dist)); // close in, the camera drops towards the horizon (diorama seen at ~20-30 degrees)
        cam.position.set(camS.tx, camS.ty + Math.sin(camS.el) * camS.dist, camS.tz + Math.cos(camS.el) * camS.dist); cam.lookAt(camS.tx, camS.ty, camS.tz);
        key.position.set(camS.tx - 80, 82, camS.tz + 52); key.target.position.set(camS.tx, 0, camS.tz - 10); key.target.updateMatrixWorld();
        scene.fog.near = camS.dist * 0.95; scene.fog.far = camS.dist * 2.6;
        if (tier.shadow) { const e = clamp(camS.dist * 0.62, 34, 95), sc = key.shadow.camera; if (Math.abs(sc.right - e) > 0.5) { sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.updateProjectionMatrix(); } }
      }
      const ptr = new Map(); let downAt = null, pinch0 = 0;
      const cv = renderer.domElement; cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 1) downAt = { x: e.clientX, y: e.clientY, moved: 0 }; else { pinch0 = dist2(); downAt = null; } });
      const dist2 = () => { const p = [...ptr.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
      cv.addEventListener('pointermove', (e) => {
        const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (ptr.size === 2) { const d = dist2(); if (pinch0 > 0 && d > 0) { camT.dist /= d / pinch0; pinch0 = d; clampCam(); } return; }
        if (downAt) {
          downAt.moved += Math.abs(dx) + Math.abs(dy);
          if (downAt.moved > 7) { const sc = (2 * Math.tan((cam.fov * Math.PI) / 360) * camT.dist) / cv.clientHeight; camT.tx -= dx * sc; camT.tz -= (dy * sc) / Math.sin(camS.el); clampCam(); }
        }
      });
      const up = (e) => { const was = downAt; ptr.delete(e.pointerId); if (was && was.moved <= 7 && ptr.size === 0 && e.type === 'pointerup') onTap(e.clientX, e.clientY); if (ptr.size === 0) downAt = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', (e) => { e.preventDefault(); camT.dist *= Math.exp(e.deltaY * 0.0012); clampCam(); }, { passive: false });
      root.addEventListener('resize', () => { renderer.setSize(root.innerWidth, root.innerHeight, false); cam.aspect = root.innerWidth / root.innerHeight; cam.updateProjectionMatrix(); if (tier.post) makePost(); });

      // ---- loop
      let clockT = 0, last = 0, frames = 0; const v3 = new THREE.Vector3();
      function frame(ts) {
        const dt = Math.min(0.08, last ? (ts - last) / 1000 : 0.016); last = ts; clockT += dt;
        updateCam(false); waveFlags(clockT);
        for (const id of Object.keys(A)) poseArmy(A[id], dt);
        for (const id of Object.keys(townObj)) townObj[id].banner.scale.setScalar(Math.max(0.9, uiScale() * 0.6));
        for (const m of pulse) m.scale.setScalar(1 + 0.07 * Math.sin(clockT * 5));
        for (const t of townList) {
          const el = labelEls[t.id]; v3.set(t.x, townObj[t.id].y + 8.5, t.z + 1).project(cam);
          el.style.transform = `translate(${((v3.x + 1) / 2) * cv.clientWidth - el.offsetWidth / 2}px,${((1 - v3.y) / 2) * cv.clientHeight - 10}px)`; el.style.visibility = v3.z < 1 ? 'visible' : 'hidden';
        }
        renderer.info.reset(); renderFrame();
        if (++frames === 2) { stats.tris = renderer.info.render.triangles; stats.calls = renderer.info.render.calls; P.stats = { tris: stats.tris, calls: stats.calls, staticTris: P.tris }; $('boot').classList.add('out'); P.ready = true; root.__done = true; root.__extra = { tier: tierName, season: seasonKey, tris: stats.tris, calls: stats.calls, staticTris: P.tris, geometries: renderer.info.memory.geometries }; }
        root.requestAnimationFrame(frame);
      }

      applySeason(seasonKey);
      if (q.get('focus') && townById[q.get('focus')]) { focusOn(q.get('focus'), +q.get('zoom') || 46); }
      updateCam(true);
      Object.assign(P, {
        game: () => g, view: () => view, V2, THREE, scene, cam, renderer, towns: townById, armies: A,
        setSeason: (n) => applySeason(SEASON_KEY[n] || n), endSeason, focus: (id, d) => { focusOn(id, d || 46); updateCam(true); },
        camera: (o) => { Object.assign(camT, o); clampCam(); updateCam(true); },
        select: (id) => { sel = id; tgts = id ? V2.targets(g, id) : []; refreshMarkers(); hud(); },
        order: (kind, id, intent) => { const tg = tgts.find((x) => x.kind === kind && x.id === id); if (tg) orderTo(tg, intent || tg.intent); return !!tg; },
        tap: onTap, home: () => { Object.assign(camT, home()); updateCam(true); }, stats: () => ({ tris: renderer.info.render.triangles, calls: renderer.info.render.calls }),
        screen: (x, z, y) => { v3.set(x, y || 0, z).project(cam); return [((v3.x + 1) / 2) * cv.clientWidth, ((1 - v3.y) / 2) * cv.clientHeight]; },
      });
      root.requestAnimationFrame(frame);
    }
  }

  return {
    boot, makeStage, palette, PAL, TIERS, BOUNDS, RIVERS, MOUNTAINS, Builder, buildStatic,
    _: { clamp, lerp, smooth, rng, hash2, vnoise, fbm, strSeed, hex, mix, shade, lighten, ramp, polyPrep, polyAt, polyNearest, makeTerrain, makeField, sliceCell, contourLevel, edgeInterval, box, frustum, gable, wallQuad: wall, appendScaled, hanTown, townPlate, TL, TOWNC, LACQUER, SLATE, ownerFrame, paperTree: tree, rock, standee, boat, UP, LAYER, LEVELS, PLATEAU },
  };
});
