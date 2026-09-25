// Round-4 campaign-map terrain: China-shaped heightfield, baked masks and lighting, splat shader.
// Everything expensive is computed once into grids/textures, so the GPU draws a few large meshes
// (see docs/decisions/0005-web-performance-budget.md). Coordinates: x east, z south, 1 unit ≈ one city block.
(function () {
  const T = (window.Terrain = {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  T.util = { clamp, sstep, lerp };

  // ------------------------------------------------------------------ noise
  function hash(ix, iz) { let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z); const fx = x - ix, fz = z - iz; const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, z, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
  function ridged(x, z, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { const r = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1); s += a * r * r; n += a; a *= 0.5; f *= 2.1; } return s / n; }
  T.noise = { hash, vnoise, fbm, ridged };
  let seed = 11;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  T.rnd = rnd; T.rr = rr;

  // ------------------------------------------------------------------ geography
  // Distorted like every strategy map, but the shapes a Chinese player recognises must be there:
  // the Yellow River's "几" loop around the Ordos, the Yangtze through the Three Gorges, Bohai and Shandong,
  // the ringed Sichuan basin, Qinling and Taihang, Tibet in the west, steppe and the Great Wall in the north.
  const COAST = [[900, -130], [160, -118], [130, -96], [112, -78], [100, -84], [84, -88], [70, -78], [62, -68], [60, -56], [63, -47], [76, -45], [90, -48], [100, -50], [114, -48], [124, -42], [120, -34], [106, -28], [94, -20], [90, -8], [91, 6], [95, 18], [100, 24], [97, 30], [100, 36], [90, 40], [98, 46], [96, 56], [88, 66], [76, 76], [62, 84], [46, 90], [30, 92], [18, 93], [4, 95], [-20, 98], [-44, 102], [-70, 112], [-120, 130], [-900, 130]];
  const LAND_POLY = [[-900, -900], [900, -900], ...COAST];
  // w0 → w1: half-width at source → mouth. silt: muddy water (Yellow River basin).
  const RIVERS = [
    { id: 'hoang_ha', label: 'Hoàng Hà', w0: 0.75, w1: 1.35, amp: 1.5, silt: 1, pts: [[-150, -38], [-128, -40], [-112, -46], [-102, -58], [-96, -72], [-90, -84], [-80, -91], [-64, -93], [-52, -92], [-46, -86], [-45, -74], [-46, -62], [-44, -50], [-43, -38], [-41, -29], [-32, -25], [-22, -25], [-8, -26], [6, -25], [20, -24], [32, -28], [44, -34], [54, -41], [63, -47]] },
    { id: 'vi', w0: 0.35, w1: 0.55, amp: 0.6, silt: 1, pts: [[-120, -22], [-100, -24], [-84, -25], [-70, -27], [-56, -27], [-48, -28], [-41, -29]] },
    { id: 'phan', w0: 0.3, w1: 0.45, amp: 0.7, silt: 1, pts: [[-24, -86], [-28, -74], [-31, -62], [-33, -50], [-36, -40], [-40, -33], [-42, -30]] },
    { id: 'truong_giang', label: 'Trường Giang', w0: 0.9, w1: 2.0, amp: 1.7, pts: [[-150, 54], [-128, 52], [-110, 50], [-94, 49], [-82, 48], [-70, 46], [-58, 44], [-50, 40], [-42, 38], [-34, 40], [-26, 43], [-16, 45], [-4, 46], [6, 43], [14, 40], [22, 37], [32, 36], [42, 33], [52, 29], [62, 26], [72, 24], [82, 23], [90, 24], [98, 27]] },
    { id: 'han', label: 'Hán Thủy', w0: 0.4, w1: 0.8, amp: 1.2, pts: [[-86, 6], [-72, 5], [-60, 6], [-48, 9], [-36, 12], [-26, 12], [-16, 11], [-8, 14], [-2, 20], [2, 28], [6, 35], [12, 39]] },
    { id: 'hoai', label: 'Hoài Thủy', w0: 0.4, w1: 0.8, amp: 1.3, pts: [[10, 22], [20, 21], [32, 19], [44, 18], [56, 17], [66, 16], [76, 17], [86, 16], [93, 14]] },
    { id: 'man', w0: 0.3, w1: 0.5, amp: 0.8, pts: [[-98, 4], [-92, 14], [-88, 24], [-86, 34], [-84, 42], [-82, 47]] },
    { id: 'tuong', w0: 0.3, w1: 0.55, amp: 0.8, pts: [[-24, 70], [-20, 65], [-16, 60]] },
    { id: 'dong_dinh_out', w0: 0.5, w1: 0.7, amp: 0.2, pts: [[-15, 52], [-16, 46]] },
    { id: 'cam', w0: 0.35, w1: 0.6, amp: 0.8, pts: [[50, 70], [48, 62], [47, 56]] },
    { id: 'bo_duong_out', w0: 0.5, w1: 0.7, amp: 0.3, pts: [[46, 45], [44, 34]] },
    { id: 'chau_giang', label: 'Châu Giang', w0: 0.6, w1: 1.2, amp: 1.2, pts: [[-110, 72], [-90, 74], [-70, 78], [-50, 80], [-30, 84], [-12, 86], [0, 88], [10, 90], [16, 95]] },
  ];
  const LAKES = [
    { id: 'dong_dinh', x: -15, z: 56, rx: 7, rz: 4.6 },
    { id: 'bo_duong', x: 46, z: 50, rx: 4.6, rz: 5.8 },
    { id: 'thai_ho', x: 82, z: 38, rx: 4, rz: 3.4 },
  ];
  const RANGES = [
    { id: 'tan_linh', h: 12, w: 5, pts: [[-112, 0], [-96, -1], [-80, -2], [-66, 0], [-52, -1], [-40, 0], [-32, 2]] },
    { id: 'phuc_nguu', h: 5, w: 3.5, pts: [[-32, 2], [-20, 2], [-10, 3]] },
    { id: 'dai_ba', h: 9, w: 4.5, pts: [[-100, 16], [-86, 17], [-72, 16], [-58, 19], [-48, 24], [-42, 30]] },
    { id: 'vu_son_n', h: 10, w: 3.3, pts: [[-58, 32], [-48, 34], [-40, 34], [-32, 33]] },
    { id: 'vu_son_s', h: 9, w: 3.3, pts: [[-58, 53], [-46, 50], [-38, 50], [-30, 52]] },
    { id: 'long_mon', h: 13, w: 5, pts: [[-100, 12], [-102, 30], [-100, 46], [-96, 62]] },
    { id: 'dai_luong', h: 7, w: 5, pts: [[-96, 62], [-80, 62], [-64, 60]] },
    { id: 'thai_hanh', h: 11, w: 4, pts: [[-4, -96], [-2, -80], [1, -68], [2, -56], [0, -44], [-4, -34]] },
    { id: 'lu_luong', h: 7, w: 3.3, pts: [[-38, -90], [-37, -76], [-36, -62]] },
    { id: 'yen_son', h: 8, w: 4, pts: [[-10, -90], [14, -86], [36, -84], [58, -82], [70, -80]] },
    { id: 'am_son', h: 9, w: 6, pts: [[-150, -112], [-110, -104], [-80, -104], [-50, -106], [-20, -102], [10, -104]] },
    { id: 'thai_son', h: 7, w: 3, pts: [[80, -22], [86, -18], [92, -20]] },
    { id: 'dai_biet', h: 6, w: 4, pts: [[16, 28], [28, 27], [40, 26], [50, 24]] },
    { id: 'nam_linh', h: 8, w: 4.5, pts: [[-64, 76], [-44, 77], [-28, 76], [-16, 72], [-6, 68], [6, 64], [20, 63], [34, 66], [46, 72]] },
    { id: 'vu_di', h: 7, w: 4, pts: [[52, 70], [62, 64], [72, 58], [82, 52], [90, 48]] },
  ];
  // pillar fields: karst (south), Zhangjiajie sandstone, Huangshan granite. [cx, cz, R, n, hMin, hMax, rMin, rMax]
  const PILLARS = [[-44, 86, 12, 24, 3, 6.5, 1.8, 3.2], [-4, 82, 6, 8, 3, 5.5, 1.8, 3], [-34, 62, 6, 14, 4, 8, 1.4, 2.2], [60, 54, 4.5, 7, 4, 8, 2, 3.2], [-62, 68, 7, 10, 3, 6, 1.8, 3]];
  const WALL = [[-44, -97], [-40, -93], [-30, -94], [-18, -92], [-10, -90], [2, -88], [14, -86], [26, -85], [36, -84], [48, -83], [58, -82], [66, -79], [71, -76]];
  T.geo = { COAST, RIVERS, LAKES, RANGES, PILLARS, WALL };

  // ------------------------------------------------------------------ geometry helpers
  function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
  function polyDist(px, pz, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }
  function inPoly(px, pz, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c; } return c; }
  const landDistRaw = (x, z) => { const x2 = x + 1.6 * (vnoise(x * 0.3, z * 0.3) - 0.5), z2 = z + 1.6 * (vnoise(z * 0.3 + 9, x * 0.3) - 0.5); const d = polyDist(x2, z2, COAST); return inPoly(x2, z2, LAND_POLY) ? d : -d; };
  T.polyDist = polyDist;
  // Catmull-Rom through key points, resampled every `step`, then meandered sideways (bigger bends downstream).
  function spline(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function meander(line, amp, key) {
    let s = 0; const out = [];
    for (let i = 0; i < line.length; i++) {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      if (i) s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
      const u = i / (line.length - 1);
      const endFade = sstep(0, 0.04, u) * sstep(1, 0.96, u);
      const off = amp * endFade * (0.65 * Math.sin(s * 0.33 + key) * (0.6 + 0.8 * vnoise(s * 0.05, key)) + 0.55 * (fbm(s * 0.09, key * 3.1, 3) - 0.5) * 2);
      out.push([line[i][0] - (tz / tl) * off, line[i][1] + (tx / tl) * off]);
    }
    return out;
  }
  T.spline = spline;

  // ------------------------------------------------------------------ build
  // opts: { provinces: {id: [x, z]}, sun: THREE.Vector3 (for baked shadows) }
  // opts.scale: world units per map unit. The renderer spreads the map so a city is ~1/6 of a province,
  // like TW3K; data/world.json keeps map units. Widths/heights stay in world units.
  T.create = function (opts) {
    seed = 11;
    const t0 = performance.now();
    const phase = {}; let tp = t0; const mark = (k) => { const n = performance.now(); phase[k] = Math.round(n - tp); tp = n; };
    const S = opts.scale || 1;
    const sc = (pts) => pts.map(([x, z]) => [x * S, z * S]);
    const COASTW = sc(COAST), LANDW = sc(LAND_POLY);
    const RIVERSW = RIVERS.map((r) => ({ ...r, amp: r.amp * S, pts: sc(r.pts) }));
    const LAKESW = LAKES.map((L) => ({ ...L, x: L.x * S, z: L.z * S, rx: L.rx * S, rz: L.rz * S }));
    const RANGESW = RANGES.map((r) => ({ ...r, h: r.h * 1.15, w: r.w * (1 + (S - 1) * 0.7), pts: sc(r.pts) }));
    const PILLARSW = PILLARS.map(([cx, cz, R, n, h0, h1, r0, r1]) => [cx * S, cz * S, R * S, Math.round(n * S), h0, h1, r0, r1]);
    const landDistW = (x, z) => { const x2 = x + 1.6 * (vnoise(x * 0.3, z * 0.3) - 0.5), z2 = z + 1.6 * (vnoise(z * 0.3 + 9, x * 0.3) - 0.5); const d = polyDist(x2, z2, COASTW); return inPoly(x2, z2, LANDW) ? d : -d; };
    const PROV = opts.provinces;
    const cities = Object.values(PROV);
    // Grid covering the playable map, 0.5 world units per cell. Heights, masks and baked light live here.
    const G = { x0: -120 * S, z0: -100 * S, w: 240 * S, d: 200 * S, step: 0.5 };
    G.nx = Math.round(G.w / G.step) + 1; G.nz = Math.round(G.d / G.step) + 1;
    const N = G.nx * G.nz;
    const idx = (i, j) => j * G.nx + i;
    const gx = (i) => G.x0 + i * G.step, gz = (j) => G.z0 + j * G.step;

    // --- rivers: signed distance to the water edge (negative inside) + silt flag
    const river = new Float32Array(N).fill(1e9), silt = new Float32Array(N), riverHW = new Float32Array(N);
    const riverLines = [];
    RIVERSW.forEach((rv, ri) => {
      const line = meander(spline(rv.pts, 0.3), rv.amp, ri * 7.3 + 1);
      riverLines.push({ ...rv, line });
      const R = 14;
      for (let k = 0; k < line.length; k++) {
        const u = k / (line.length - 1), hw = lerp(rv.w0, rv.w1, Math.pow(u, 0.8));
        const [px, pz] = line[k];
        const i0 = Math.max(0, Math.floor((px - R - G.x0) / G.step)), i1 = Math.min(G.nx - 1, Math.ceil((px + R - G.x0) / G.step));
        const j0 = Math.max(0, Math.floor((pz - R - G.z0) / G.step)), j1 = Math.min(G.nz - 1, Math.ceil((pz + R - G.z0) / G.step));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const d = Math.hypot(gx(i) - px, gz(j) - pz) - hw, n = idx(i, j);
          if (d < river[n]) { river[n] = d; riverHW[n] = hw; silt[n] = rv.silt ? 1 : 0; }
        }
      }
    });
    mark('rivers');
    // lakes merge into the same field (noisy shoreline)
    for (const L of LAKESW) {
      const R = Math.max(L.rx, L.rz) + 12;
      for (let j = Math.max(0, Math.floor((L.z - R - G.z0) / G.step)); j < Math.min(G.nz, (L.z + R - G.z0) / G.step); j++)
        for (let i = Math.max(0, Math.floor((L.x - R - G.x0) / G.step)); i < Math.min(G.nx, (L.x + R - G.x0) / G.step); i++) {
          const x = gx(i), z = gz(j), wx = x + 3.5 * (fbm(x * 0.12 + 5, z * 0.12, 3) - 0.5), wz = z + 3.5 * (fbm(z * 0.12, x * 0.12 + 9, 3) - 0.5);
          const e = Math.hypot((wx - L.x) / L.rx, (wz - L.z) / L.rz);
          const d = (e - 1 - 0.45 * (fbm(x * 0.3, z * 0.3, 3) - 0.5)) * Math.min(L.rx, L.rz), n = idx(i, j);
          if (d < river[n]) { river[n] = d; riverHW[n] = 2.5; silt[n] = 0; }
        }
    }
    const lookup = (arr, x, z) => { const fx = clamp((x - G.x0) / G.step, 0, G.nx - 1.001), fz = clamp((z - G.z0) / G.step, 0, G.nz - 1.001); const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; return lerp(lerp(arr[idx(i, j)], arr[idx(i + 1, j)], u), lerp(arr[idx(i, j + 1)], arr[idx(i + 1, j + 1)], u), v); };
    const inGrid = (x, z) => x >= G.x0 && x <= G.x0 + G.w && z >= G.z0 && z <= G.z0 + G.d;
    const riverSD = (x, z) => (inGrid(x, z) ? lookup(river, x, z) : 1e9);

    mark('lakes');
    // --- coast (signed distance, positive on land)
    const land = new Float32Array(N);
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) land[idx(i, j)] = landDistW(gx(i), gz(j));
    const landSD = (x, z) => (inGrid(x, z) ? lookup(land, x, z) : landDistW(x, z));

    mark('coast');
    // --- pillar fields (karst etc.)
    const pillars = [];
    for (const [cx, cz, R, n, h0, h1, r0, r1] of PILLARSW)
      for (let k = 0, tries = 0; k < n && tries < 600; tries++) {
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (cities.some(([px, pz]) => Math.hypot(x - px, z - pz) < 18) || riverSD(x, z) < 2 || landSD(x, z) < 4 || pillars.some((p) => Math.hypot(x - p[0], z - p[1]) < p[2] + 0.6)) continue;
        pillars.push([x, z, rr(r0, r1), rr(h0, h1)]); k++;
      }

    // --- regions (0..1 weights)
    const region = (xw, zw) => {
      const x = xw / S, z = zw / S;
      const wx = x + 8 * (fbm(x * 0.03, z * 0.03, 3) - 0.5), wz = z + 8 * (fbm(z * 0.03 + 4, x * 0.03, 3) - 0.5);
      const tibet = sstep(-92, -116, wx);
      const steppe = sstep(-93, -104, wz);
      const loess = sstep(-106, -98, wx) * sstep(-34, -40, wx) * sstep(-90, -82, wz) * sstep(-20, -28, wz);
      const ordos = sstep(1.0, 0.7, Math.hypot((wx + 69) / 19, (wz + 77) / 13) + 0.35 * (fbm(x * 0.09, z * 0.09, 3) - 0.5));
      const sichuan = sstep(22, 14, Math.hypot(wx + 74, (wz - 34) * 1.15));
      const south = sstep(44, 66, wz);
      const northPlain = sstep(-12, -2, wx) * sstep(-78, -70, wz) * sstep(18, 8, wz);
      return { tibet, steppe, loess, ordos, sichuan, south, northPlain };
    };

    mark('pillars');
    // --- range distance fields (1-unit grid over each range's bounding box, in warped coordinates)
    for (const r of RANGESW) {
      const m = r.w * 2.6 + 4, xs = r.pts.map((p) => p[0]), zs = r.pts.map((p) => p[1]);
      r.f = { x0: Math.floor(Math.min(...xs) - m), z0: Math.floor(Math.min(...zs) - m) };
      r.f.nx = Math.ceil(Math.max(...xs) + m) - r.f.x0 + 1; r.f.nz = Math.ceil(Math.max(...zs) + m) - r.f.z0 + 1;
      r.f.d = new Float32Array(r.f.nx * r.f.nz);
      for (let j = 0; j < r.f.nz; j++) for (let i = 0; i < r.f.nx; i++) r.f.d[j * r.f.nx + i] = polyDist(r.f.x0 + i, r.f.z0 + j, r.pts);
    }
    const rangeD = (r, x, z) => {
      const fx = x - r.f.x0, fz = z - r.f.z0;
      if (fx < 0 || fz < 0 || fx >= r.f.nx - 1 || fz >= r.f.nz - 1) return 1e9;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, d = r.f.d, nx = r.f.nx;
      return lerp(lerp(d[j * nx + i], d[j * nx + i + 1], u), lerp(d[(j + 1) * nx + i], d[(j + 1) * nx + i + 1], u), v);
    };

    mark('rangeFields');
    // --- height
    function H(x, z) {
      const R = region(x, z);
      let h = 1.0 + 0.6 * fbm(x * 0.021, z * 0.021) - 0.2;
      const hill = clamp(0.25 + 1.3 * R.south + 1.1 * R.loess + 0.5 * R.steppe + 0.7 * R.sichuan * 0.3 - 0.2 * R.northPlain, 0, 2);
      h += hill * (2.6 * Math.pow(ridged(x * 0.05 + 3, z * 0.05, 3), 1.6) - 0.4);
      if (R.loess > 0) h += R.loess * 2.2 * Math.pow(ridged(x * 0.12, z * 0.12, 3), 2.2); // loess gullies
      if (R.ordos > 0) h = lerp(h, 1.6 + 0.9 * fbm(x * 0.2, z * 0.2, 3), R.ordos * 0.8); // dunes
      if (R.sichuan > 0) h = lerp(h, 1.3 + 1.1 * fbm(x * 0.09, z * 0.09, 3), R.sichuan * 0.7); // basin floor
      // Tibet: a high plateau with snowy ranges
      if (R.tibet > 0) h += R.tibet * (9 + 5 * fbm(x * 0.03, z * 0.03) + 12 * Math.pow(ridged(x * 0.04 + 7, z * 0.04, 4), 2.2));
      const wx = x + 5 * (fbm(x * 0.05 + 2, z * 0.05, 3) - 0.5), wz = z + 5 * (fbm(z * 0.05 + 6, x * 0.05, 3) - 0.5);
      for (const r of RANGESW) {
        const d = r.f ? rangeD(r, wx, wz) : polyDist(wx, wz, r.pts); if (d > r.w * 2.6) continue;
        const prof = Math.exp(-((d / r.w) ** 2));
        const rg = ridged(x * 0.06 + r.h, z * 0.06, 3);
        h += r.h * prof * (0.25 + 0.75 * Math.pow(rg, 1.5) + 0.35 * fbm(x * 0.03 + 5, z * 0.03, 2));
      }
      const base = h;
      for (const [kx, kz, kr, kh] of pillars) {
        const dx = x - kx, dz = z - kz; if (Math.abs(dx) > kr * 1.45 || Math.abs(dz) > kr * 1.45) continue;
        const rr2 = kr * (0.8 + 0.4 * vnoise(x * 0.9 + 11, z * 0.9));
        const d = Math.hypot(dx, dz) / rr2; if (d >= 1) continue;
        h = Math.max(h, base + kh * Math.pow(1 - d ** 3, 0.42) * (0.9 + 0.15 * vnoise(x * 2.1, z * 2.1)));
      }
      // coast
      const ld = landSD(x, z);
      if (ld < 5) { const t = sstep(-1.2, 5, ld); h = lerp(-2.2 - clamp(-ld, 0, 30) * 0.1, Math.max(h, 0.3), t); }
      // flatten city sites
      for (const [px, pz] of cities) { const d = Math.hypot(x - px, z - pz); if (d < 19) { const k = sstep(12.5, 19, d); h = h * k + 1.2 * (1 - k); } }
      // river valleys, banks and beds
      const rd = riverSD(x, z);
      if (rd < 6) {
        const fp = lerp(3.4, 1.1, sstep(3, 9, h)) * (inGrid(x, z) ? sstep(0.2, 0.9, lookup(riverHW, x, z)) * 0.6 + 0.4 : 1);
        const bank = 0.34 + 0.12 * vnoise(x * 0.4, z * 0.4);
        if (rd < fp) h = lerp(Math.min(h, bank), h, Math.pow(sstep(0.2, fp, rd), 1.4));
        if (rd < 0.25) { const hw = inGrid(x, z) ? lookup(riverHW, x, z) : 1; const bed = -0.5 - Math.min(hw, 2.4) * 0.45; h = lerp(bed, Math.min(h, bank), sstep(-Math.max(hw, 0.5) * 0.85, 0.25, rd)); }
      }
      return h;
    }
    T.H = H;

    // --- height grid
    const height = new Float32Array(N);
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) height[idx(i, j)] = H(gx(i), gz(j));
    const h = (x, z) => (inGrid(x, z) ? lookup(height, x, z) : H(x, z));
    const slopeAt = (x, z) => { const e = 0.5; return Math.min(1.5, Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e)); };

    mark('height');
    // --- roads: A* on a 2-unit grid between neighbouring cities, cost = slope + height + water
    const C = { nx: Math.round(G.w) + 1, nz: Math.round(G.d) + 1 }; // 1-unit grid (also used by the light bake)
    const RS = 2, RC = { nx: Math.floor(G.w / RS) + 1, nz: Math.floor(G.d / RS) + 1 };
    const cost = new Float32Array(RC.nx * RC.nz);
    for (let j = 0; j < RC.nz; j++) for (let i = 0; i < RC.nx; i++) {
      const x = G.x0 + i * RS, z = G.z0 + j * RS, hh = h(x, z), s = slopeAt(x, z);
      cost[j * RC.nx + i] = hh < 0.05 ? (landSD(x, z) < 0 ? 1e6 : 22) : 1 + s * s * 70 + Math.max(0, hh - 5) * 1.5;
    }
    // Weighted A* (heuristic x2.2) inside the endpoints' bounding box: near-optimal roads, ~50x faster.
    const dist = new Float64Array(RC.nx * RC.nz), prev = new Int32Array(RC.nx * RC.nz), stamp = new Int32Array(RC.nx * RC.nz);
    let run = 0;
    function astar(ax, az, bx, bz) {
      run++;
      const si = Math.round((ax - G.x0) / RS), sj = Math.round((az - G.z0) / RS), gi = Math.round((bx - G.x0) / RS), gj = Math.round((bz - G.z0) / RS);
      const m = 16, i0 = Math.max(0, Math.min(si, gi) - m), i1 = Math.min(RC.nx - 1, Math.max(si, gi) + m), j0 = Math.max(0, Math.min(sj, gj) - m), j1 = Math.min(RC.nz - 1, Math.max(sj, gj) + m);
      const s0 = sj * RC.nx + si, g0 = gj * RC.nx + gi;
      const hk = [], hn = [];
      const push = (n, f) => { hk.push(f); hn.push(n); let i = hk.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; } };
      const pop = () => { const n0 = hn[0]; const lk = hk.pop(), ln = hn.pop(); if (hk.length) { hk[0] = lk; hn[0] = ln; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let q = i; if (l < hk.length && hk[l] < hk[q]) q = l; if (r < hk.length && hk[r] < hk[q]) q = r; if (q === i) break; [hk[q], hk[i]] = [hk[i], hk[q]]; [hn[q], hn[i]] = [hn[i], hn[q]]; i = q; } } return n0; };
      const hz = (i, j) => 2.2 * Math.hypot(i - gi, j - gj);
      stamp[s0] = run; dist[s0] = 0; prev[s0] = -1; push(s0, hz(si, sj));
      while (hk.length) {
        const n = pop(); if (n === g0) break;
        const i = n % RC.nx, j = (n / RC.nx) | 0, dn = dist[n];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < i0 || jj < j0 || ii > i1 || jj > j1) continue;
          const q = jj * RC.nx + ii, nd = dn + (di && dj ? 1.414 : 1) * (cost[n] + cost[q]) * 0.5;
          if (stamp[q] !== run || nd < dist[q]) { stamp[q] = run; dist[q] = nd; prev[q] = n; push(q, nd + hz(ii, jj)); }
        }
      }
      const path = []; if (stamp[g0] !== run) return [[ax, az], [bx, bz]];
      for (let n = g0; n !== -1; n = prev[n]) path.push([G.x0 + (n % RC.nx) * RS, G.z0 + ((n / RC.nx) | 0) * RS]);
      path.reverse(); path[0] = [ax, az]; path[path.length - 1] = [bx, bz];
      return path;
    }
    const chaikin = (p, it) => { for (let k = 0; k < it; k++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1]; o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } o.push(p[p.length - 1]); p = o; } return p; };
    const roads = [];
    const done = new Set();
    for (const [a, list] of Object.entries(opts.neighbors)) for (const b of list) {
      const key = [a, b].sort().join('>'); if (done.has(key) || !PROV[a] || !PROV[b]) continue; done.add(key);
      const [ax, az] = PROV[a].map(Math.round), [bx, bz] = PROV[b].map(Math.round);
      const p = chaikin(astar(ax, az, bx, bz), 3);
      roads.push({ a, b, pts: p });
    }
    const road = new Float32Array(N).fill(9);
    for (const r of roads) for (let k = 0; k < r.pts.length - 1; k++) {
      const [ax, az] = r.pts[k], [bx, bz] = r.pts[k + 1];
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - 2 - G.x0) / G.step)), i1 = Math.min(G.nx - 1, Math.ceil((Math.max(ax, bx) + 2 - G.x0) / G.step));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - 2 - G.z0) / G.step)), j1 = Math.min(G.nz - 1, Math.ceil((Math.max(az, bz) + 2 - G.z0) / G.step));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = segDist(gx(i), gz(j), ax, az, bx, bz), n = idx(i, j); if (d < road[n]) road[n] = d; }
    }
    const roadD = (x, z) => (inGrid(x, z) ? lookup(road, x, z) : 9);

    mark('roads');
    // --- provinces: warped nearest-city, with the border distance
    const provIds = Object.keys(PROV);
    const provOf = new Uint8Array(N), prov2 = new Uint8Array(N), border = new Float32Array(N);
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const x = gx(i), z = gz(j);
      const wx = x + 9 * (fbm(x * 0.045, z * 0.045, 3) - 0.5), wz = z + 9 * (fbm(z * 0.045 + 5, x * 0.045, 3) - 0.5);
      let d1 = 1e9, d2 = 1e9, p1 = 0, p2 = 0;
      provIds.forEach((id, k) => { const [px, pz] = PROV[id]; const d = Math.hypot(wx - px, wz - pz); if (d < d1) { d2 = d1; p2 = p1; d1 = d; p1 = k; } else if (d < d2) { d2 = d; p2 = k; } });
      provOf[idx(i, j)] = p1; prov2[idx(i, j)] = p2; border[idx(i, j)] = (d2 - d1) * 0.5;
    }

    mark('provinces');
    // --- baked sun visibility (soft, horizon-march on a 1-unit grid) and cavity AO
    const sun = opts.sun.clone().normalize();
    const sh = new Float32Array(C.nx * C.nz), hb = new Float32Array(C.nx * C.nz), hc = new Float32Array(C.nx * C.nz);
    for (let j = 0; j < C.nz; j++) for (let i = 0; i < C.nx; i++) hc[j * C.nx + i] = Math.max(0, h(G.x0 + i, G.z0 + j));
    const hcAt = (x, z) => { const fx = clamp(x - G.x0, 0, C.nx - 1.001), fz = clamp(z - G.z0, 0, C.nz - 1.001); const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; const a = hc[j * C.nx + i], b = hc[j * C.nx + i + 1], c = hc[(j + 1) * C.nx + i], d = hc[(j + 1) * C.nx + i + 1]; return lerp(lerp(a, b, u), lerp(c, d, u), v); };
    const hl = Math.hypot(sun.x, sun.z), sx = sun.x / hl, sz = sun.z / hl, tanE = sun.y / hl;
    for (let j = 0; j < C.nz; j++) for (let i = 0; i < C.nx; i++) {
      const x = G.x0 + i, z = G.z0 + j, h0 = hc[j * C.nx + i] + 0.15;
      let vis = 1;
      for (let t = 0.7; t < 70; t *= 1.09) { const th = hcAt(x + sx * t, z + sz * t); const ray = h0 + t * tanE; vis = Math.min(vis, (ray - th) / (t * 0.09) + 0.5); if (vis <= 0) break; }
      sh[j * C.nx + i] = clamp(vis, 0, 1);
    }
    // box blur of height (radius 3) for cavity
    { const tmp = new Float32Array(C.nx * C.nz), r = 3;
      for (let j = 0; j < C.nz; j++) for (let i = 0; i < C.nx; i++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const ii = clamp(i + k, 0, C.nx - 1); s += hc[j * C.nx + ii]; n++; } tmp[j * C.nx + i] = s / n; }
      for (let j = 0; j < C.nz; j++) for (let i = 0; i < C.nx; i++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const jj = clamp(j + k, 0, C.nz - 1); s += tmp[jj * C.nx + i]; n++; } hb[j * C.nx + i] = s / n; } }
    const cAt = (arr, x, z) => { const fx = clamp(x - G.x0, 0, C.nx - 1.001), fz = clamp(z - G.z0, 0, C.nz - 1.001); const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; return lerp(lerp(arr[j * C.nx + i], arr[j * C.nx + i + 1], u), lerp(arr[(j + 1) * C.nx + i], arr[(j + 1) * C.nx + i + 1], u), v); };

    mark('bake');
    // --- masks
    const forest = new Float32Array(N), field = new Float32Array(N);
    const settle = new Float32Array(N);
    const nearCity = (x, z) => { let d = 1e9; for (const [px, pz] of cities) d = Math.min(d, Math.hypot(x - px, z - pz)); return d; };
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const x = gx(i), z = gz(j), n = idx(i, j), hh = height[n];
      if (hh < 0.2) continue;
      const R = region(x, z), s = slopeAt(x, z), rd = river[n], dc = nearCity(x, z), road0 = road[n];
      const arid = clamp(R.loess * 0.9 + R.steppe * 0.85 + R.ordos + R.tibet * 0.6 + 0.35 * R.northPlain, 0, 1);
      // farmland: city hinterlands and floodplains, flat and low, lush regions first
      let fm = sstep(36, 20, dc) * sstep(13, 15, dc) + sstep(9, 3, rd) * sstep(0.3, 1.2, rd) * (0.6 + 0.4 * R.south) * sstep(-40 * S, -10 * S, z + 30 * S * (1 - R.northPlain)) + R.northPlain * 0.45 + R.sichuan * 0.5;
      fm *= sstep(0.45, 0.2, s) * sstep(4.5, 2.5, hh) * (1 - R.ordos) * (1 - R.tibet) * (1 - 0.6 * R.steppe);
      fm = clamp(fm * 0.85 + (fbm(x * 0.06 + 40, z * 0.06, 3) - 0.5) * 1.3, 0, 1);
      field[n] = sstep(0.42, 0.66, fm);
      // forest: hills and the south, not on farmland, water, roads, towns, deserts or above the tree line
      let fd = (fbm(x * 0.035 + 9, z * 0.035 + 2) - 0.44) * 3.2 + sstep(2.2, 6.5, hh) * 0.8 + R.south * 0.45 + R.sichuan * 0.1;
      fd -= arid * 1.3 + field[n] * 1.2 + sstep(2.4, 0.8, rd) + sstep(1.6, 0.6, road0) + sstep(17, 13, dc) * 2 + sstep(13, 15.5, hh) * 2;
      for (const [kx, kz, kr] of pillars) if (Math.abs(x - kx) < kr && Math.abs(z - kz) < kr && Math.hypot(x - kx, z - kz) < kr * 0.75 && hh > 2.5) fd = Math.max(fd, 0.85);
      forest[n] = clamp(fd, 0, 1);
    }

    mark('masks');
    // smooth the forest mask (box blur, radius 2 cells) so the canopy edge is a clean line, not a bed of nails
    { const tmp = new Float32Array(N), r = 2;
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let a = 0; for (let k = -r; k <= r; k++) a += forest[idx(clamp(i + k, 0, G.nx - 1), j)]; tmp[idx(i, j)] = a / (2 * r + 1); }
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let a = 0; for (let k = -r; k <= r; k++) a += tmp[idx(i, clamp(j + k, 0, G.nz - 1))]; forest[idx(i, j)] = sstep(0.1, 0.9, a / (2 * r + 1)); } }
    // --- hamlets: along roads and rivers on flat land, away from cities
    const hamlets = [];
    for (let k = 0; k < 40000 && hamlets.length < (opts.hamlets ?? Math.round(170 * S * S)); k++) {
      const x = rr(G.x0 + 4, G.x0 + G.w - 4), z = rr(G.z0 + 4, G.z0 + G.d - 4), hh = h(x, z);
      if (hh < 0.45 || hh > 5 || slopeAt(x, z) > 0.22) continue;
      const rd = riverSD(x, z), r0 = roadD(x, z), dc = nearCity(x, z);
      if (dc < 22 || rd < 1.5 || !(r0 < 2.2 || rd < 4.5 || rnd() < 0.08)) continue;
      const R = region(x, z); if (R.ordos > 0.3 || R.tibet > 0.3 || (R.steppe > 0.5 && rnd() < 0.8)) continue;
      if (hamlets.some((p) => Math.hypot(p.x - x, p.z - z) < 8) || lookup(forest, x, z) > 0.45) continue;
      hamlets.push({ x, z, n: 3 + Math.floor(rnd() * 7), arid: R.loess + R.steppe });
    }
    for (const hm of hamlets) {
      const R = 2.6;
      for (let j = Math.max(0, Math.floor((hm.z - R - G.z0) / G.step)); j < Math.min(G.nz, (hm.z + R - G.z0) / G.step); j++)
        for (let i = Math.max(0, Math.floor((hm.x - R - G.x0) / G.step)); i < Math.min(G.nx, (hm.x + R - G.x0) / G.step); i++) {
          const n = idx(i, j), d = Math.hypot(gx(i) - hm.x, gz(j) - hm.z) / R;
          settle[n] = Math.max(settle[n], 0.6 * sstep(0.85, 0.2, d + 0.35 * vnoise(gx(i) * 0.8, gz(j) * 0.8)));
          forest[n] *= sstep(0.2, 0.9, d);
          field[n] = Math.max(field[n], sstep(2.2, 1.0, d) * sstep(0.2, 0.6, d) * (1 - hm.arid * 0.5));
        }
    }

    mark('hamlets');
    // --- textures (RGBA8)
    const W = G.nx, D = G.nz;
    const texA = new Uint8Array(N * 4), texB = new Uint8Array(N * 4), texD = new Uint8Array(N * 4);
    const b8 = (v) => Math.round(clamp(v, 0, 1) * 255);
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) {
      const n = idx(i, j), x = gx(i), z = gz(j), R = region(x, z), o = n * 4;
      texA[o] = b8(forest[n]); texA[o + 1] = b8(field[n]); texA[o + 2] = b8(1 - road[n] / 1.4); texA[o + 3] = b8(sstep(1.0, 0.05, river[n]) * sstep(0.45, 1.0, riverHW[n]) + sstep(2.5, 0.2, land[n]) * 0.9);
      texB[o] = b8(R.loess * 0.9 + R.steppe * 0.75 + R.tibet * 0.7 + 0.25 * R.northPlain); texB[o + 1] = b8(R.ordos); texB[o + 2] = b8(R.sichuan * sstep(0.45, 0.8, fbm(x * 0.12, z * 0.12, 3))); texB[o + 3] = b8(settle[n]);
      texD[o] = b8((height[n] + 4) / 8); texD[o + 1] = b8(cAt(sh, x, z)); texD[o + 2] = b8(0.5 + (cAt(hc, x, z) - cAt(hb, x, z)) * 0.28); texD[o + 3] = b8(silt[n] * sstep(8, 2, river[n]));
    }
    const mkTex = (data, linear = true) => { const t = new THREE.DataTexture(data, W, D, THREE.RGBAFormat); t.magFilter = t.minFilter = linear ? THREE.LinearFilter : THREE.NearestFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.flipY = false; t.needsUpdate = true; return t; };
    const tA = mkTex(texA), tB = mkTex(texB), tD = mkTex(texD);
    const ownData = new Uint8Array(N * 4), tOwn = mkTex(ownData);
    const bordData = new Uint8Array(N * 4), tBord = mkTex(bordData);
    // Owner colours are re-baked whenever ownership changes (one pass over the grid, a few ms).
    // tOwn: owner colour (A = 1 if owned). tBord: R = proximity (1 at the line, 0 at 1.5 units) to a border (B: to the wasteland edge, terrain-real)
    // between different owners, G = proximity to a province border inside one realm.
    function setOwners(colorOf, ownerOf2) {
      const cols = provIds.map((id) => { const c = colorOf(id); return c ? [c.r, c.g, c.b, 1] : [0.45, 0.45, 0.42, 0]; });
      const owner = provIds.map((id) => ownerOf2(id) || null);
      for (let n = 0; n < N; n++) {
        const c = cols[provOf[n]], o = n * 4, a = provOf[n], b = prov2[n];
        const same = owner[a] === owner[b], p = clamp(1 - border[n] / 1.5, 0, 1);
        ownData[o] = b8(c[0]); ownData[o + 1] = b8(c[1]); ownData[o + 2] = b8(c[2]); ownData[o + 3] = b8(c[3]);
        bordData[o] = b8(same ? 0 : p); bordData[o + 1] = b8(same ? p : 0);
      }
      tOwn.needsUpdate = true; tBord.needsUpdate = true;
    }

    mark('textures');
    // height of the forest canopy above the ground (negative = no canopy)
    const canopyLift = (x, z) => {
      const f = inGrid(x, z) ? lookup(forest, x, z) : 0;
      // never at ground level (no z-fighting); the forest edge is cut in the shader along the crowns
      if (f < 0.04) return -1.5;
      return 0.25 + sstep(0.1, 0.5, f) * (0.3 + f * 0.6 * (0.75 + 0.5 * vnoise(x * 0.7, z * 0.7)) + Math.min(0.6, slopeAt(x, z) * 0.4));
    };
    const out = {
      S, G, H, h, canopyLift, slopeAt, riverSD, landSD, roadD, region, rivers: riverLines, roads, pillars, hamlets, provIds, setOwners,
      forestAt: (x, z) => (inGrid(x, z) ? lookup(forest, x, z) : 0), fieldAt: (x, z) => (inGrid(x, z) ? lookup(field, x, z) : 0),
      sunAt: (x, z) => cAt(sh, x, z), provinceAt: (x, z) => provIds[provOf[idx(Math.round(clamp((x - G.x0) / G.step, 0, G.nx - 1)), Math.round(clamp((z - G.z0) / G.step, 0, G.nz - 1)))]],
      tex: { A: tA, B: tB, D: tD, own: tOwn, bord: tBord }, buildMs: 0, phase,
    };
    out.buildMs = performance.now() - t0;
    return out;
  };

  // ------------------------------------------------------------------ procedural textures (nothing to download)
  // Tileable value noise, summed over octaves whose periods divide the texture size.
  function tileNoise(size, octaves, seedK) {
    const out = new Float32Array(size * size);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      const period = 4 << o, cell = size / period;
      const g = new Float32Array(period * period);
      for (let i = 0; i < g.length; i++) g[i] = hash(i + seedK * 7919, o * 131 + seedK);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
        const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
        const a = g[(iy % period) * period + (ix % period)], b = g[(iy % period) * period + ((ix + 1) % period)];
        const c = g[((iy + 1) % period) * period + (ix % period)], d = g[((iy + 1) % period) * period + ((ix + 1) % period)];
        out[y * size + x] += amp * (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv);
      }
      total += amp; amp *= 0.55;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }
  // Ground detail: clumpy grass/soil variation in G, a finer grain in R.
  T.detailTexture = function (size = 512) {
    const n1 = tileNoise(size, 7, 3), n2 = tileNoise(size, 3, 9);
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const g = clamp(0.5 + (n1[i] - 0.5) * 1.6 + (n2[i] - 0.5) * 0.5, 0, 1);
      data[i * 4] = Math.round(clamp(0.5 + (n1[i] - 0.5) * 2.2, 0, 1) * 255); data[i * 4 + 1] = Math.round(g * 255); data[i * 4 + 2] = 128; data[i * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return t;
  };
  // Water ripples: normal map from tileable noise.
  T.waterNormalTexture = function (size = 256) {
    const hgt = tileNoise(size, 5, 21);
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const hL = hgt[y * size + ((x - 1 + size) % size)], hR = hgt[y * size + ((x + 1) % size)], hD = hgt[((y - 1 + size) % size) * size + x], hU = hgt[((y + 1) % size) * size + x];
      const nx = (hL - hR) * 6, ny = (hD - hU) * 6, nz = 1, l = Math.hypot(nx, ny, nz), o = (y * size + x) * 4;
      data[o] = Math.round((nx / l * 0.5 + 0.5) * 255); data[o + 1] = Math.round((ny / l * 0.5 + 0.5) * 255); data[o + 2] = Math.round((nz / l * 0.5 + 0.5) * 255); data[o + 3] = 255;
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  };

  // ------------------------------------------------------------------ shaders
  const GLSL_NOISE = `
    float th21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    vec2 th22(vec2 p){ float n = th21(p); return vec2(n, th21(p + n)); }
    float tnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(th21(i), th21(i + vec2(1,0)), u.x), mix(th21(i + vec2(0,1)), th21(i + vec2(1,1)), u.x), u.y); }
    float tfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * tnoise(p); p *= 2.03; a *= 0.5; } return s / 0.9375; }
    vec3 tworley(vec2 p){ vec2 ip = floor(p), fp = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j)); vec2 r = g + th22(ip + g) * 0.85 - fp; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = th21(ip + g + 17.0); } else if (d < d2) d2 = d; }
      return vec3(sqrt(d1), sqrt(d2), id); }
  `;

  // Realm and province borders: crisp anti-aliased line (width uBorderW) in the owner's colour + a soft inner
  // wash. Shared by the ground and the canopy so borders stay visible over forests.
  const GLSL_BORDER = `
    // beyond the baked grid (round 5): fade into a haze so the map ends in cloud, not in a cut edge
    float edgeFog(vec2 wp){ vec2 ex = max(uGrid.xy - wp, wp - uGrid.xy - uGrid.zw); return uEdgeFog * smoothstep(-10.0, 45.0, max(ex.x, ex.y)); }
    const vec3 EDGE_HAZE = vec3(0.74, 0.79, 0.81);
    vec3 applyBorders(vec3 col, vec4 own, vec4 bd, float land, vec2 wp){
      bd.r = max(bd.r, bd.b * step(0.01, uTint)); // wasteland edge (B) only in the tinted map views
      float dR = (1.0 - bd.r) * 1.5, feR = max(fwidth(dR), 1e-4), wR = max(uBorderW, feR * 0.9);
      float lineR = (1.0 - smoothstep(wR - feR, wR + feR, dR)) * step(0.004, bd.r) * land;
      float dP = (1.0 - bd.g) * 1.5, feP = max(fwidth(dP), 1e-4), wP = max(uBorderW * 0.5, feP * 0.7);
      float lineP = (1.0 - smoothstep(wP - feP, wP + feP, dP)) * step(0.004, bd.g) * land;
      float outline = (1.0 - smoothstep(wR * 1.6 - feR, wR * 1.6 + feR, dR)) * step(0.004, bd.r) * land;
      float dash = own.a > 0.5 ? 1.0 : step(0.5, fract((wp.x + wp.y) * 0.4));
      vec3 lc = own.a > 0.5 ? mix(own.rgb * 1.35 + 0.02, mix(own.rgb, vec3(0.92, 0.88, 0.78), 0.3), uSoft) : vec3(0.62, 0.60, 0.55);
      col = mix(col, col * 0.62, lineP * uBorder * 0.5);
      col = mix(col, col * 0.35, outline * uBorder * 0.6 * dash);
      col = mix(col, lc, lineR * uBorder * dash);
      return mix(col, own.rgb, (1.0 - smoothstep(0.0, 1.4, dR)) * step(0.004, bd.r) * own.a * uBorder * 0.2 * land);
    }`;
  T.GLSL_NOISE = GLSL_NOISE;
  // Shared uniforms: grid → uv, baked light, owner colours, view mode.
  T.uniforms = (terr, extra = {}) => ({
    tMaskA: { value: terr.tex.A }, tMaskB: { value: terr.tex.B }, tMaskD: { value: terr.tex.D }, tOwn: { value: terr.tex.own }, tBord: { value: terr.tex.bord },
    uGrid: { value: new THREE.Vector4(terr.G.x0, terr.G.z0, terr.G.w, terr.G.d) },
    uTint: { value: 0.06 }, uBorder: { value: 0.75 }, uBorderW: { value: 0.22 }, uSnowLine: { value: 13 }, uSnowWest: { value: 1 }, uWaterLine: { value: 0.12 }, uFieldK: { value: 1 }, uDetailK: { value: 1 }, uSoft: { value: 0 }, uEdgeFog: { value: 0 }, uCrownK: { value: 1 }, uOutArid: { value: new THREE.Vector4(-150, -175, -170, -190) }, uSeason: { value: 0 }, uFocus: { value: new THREE.Vector3(0, 0, 0) },
    ...extra,
  });
  // Patch any MeshStandardMaterial so it receives the baked terrain shadow + cavity AO by world position.
  const VS_WP = (sh, withNormal) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;' + (withNormal ? '\nvarying vec3 vWN;' : ''))
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        #ifdef USE_INSTANCING
          vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        ${withNormal ? 'vWN = normalize(mat3(modelMatrix) * objectNormal);' : ''}`);
  };
  const FS_LIGHT = `
    reflectedLight.directDiffuse *= tSunVis; reflectedLight.directSpecular *= tSunVis;
    reflectedLight.indirectDiffuse *= tAO;`;
  T.receiveBaked = function (mat, terr, strength = 1) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.tMaskD = { value: terr.tex.D }; sh.uniforms.uGrid = { value: new THREE.Vector4(terr.G.x0, terr.G.z0, terr.G.w, terr.G.d) };
      if (!/varying vec3 vWP/.test(sh.vertexShader)) VS_WP(sh, false);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform sampler2D tMaskD; uniform vec4 uGrid;')
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          { vec4 bk = texture2D(tMaskD, (vWP.xz - uGrid.xy) / uGrid.zw);
            float tSunVis = mix(1.0, 0.25 + 0.75 * bk.g, ${strength.toFixed(2)}); float tAO = mix(1.0, 0.7 + 0.6 * bk.b, ${(strength * 0.6).toFixed(2)});
            ${FS_LIGHT} }`);
    };
    mat.customProgramCacheKey = () => 'baked' + strength + (prev ? prev.toString().length : 0);
    return mat;
  };

  // The ground: splat of grass / dry grass / sand / red soil, procedural farmland parcels, roads, banks, rock
  // strata, snow, forest floor, riverbed colour by depth, faction tint and border lines.
  T.groundMaterial = function (terr, grassTex, debug) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0 });
    if (debug) mat.defines = { DEBUG_MASKS: 1 };
    mat.extensions = { derivatives: true };
    const U = T.uniforms(terr, { tGrass: { value: grassTex } });
    mat.userData.uniforms = U;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      VS_WP(sh, true);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP; varying vec3 vWN;
          uniform sampler2D tMaskA, tMaskB, tMaskD, tOwn, tBord, tGrass; uniform vec4 uGrid; uniform float uTint, uBorder, uBorderW, uSeason, uSnowLine, uSnowWest, uWaterLine, uFieldK, uDetailK, uSoft, uEdgeFog; uniform vec4 uOutArid;
          ${GLSL_NOISE}
          ${GLSL_BORDER}
          vec3 fieldColor(vec2 wp, float lush, out float bump){
            float ang = (tnoise(wp * 0.009) - 0.5) * 3.0;
            vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * wp;
            q += (vec2(tnoise(wp * 0.25), tnoise(wp * 0.25 + 7.0)) - 0.5) * 0.9;
            vec2 sz = vec2(2.5, 1.35) * (0.75 + 0.6 * tnoise(wp * 0.05 + 3.0));
            vec2 c = floor(q / sz), f = fract(q / sz);
            float r = th21(c);
            vec3 col = r < 0.3 ? vec3(0.33, 0.40, 0.17) : r < 0.55 ? vec3(0.40, 0.45, 0.19) : r < 0.72 ? vec3(0.48, 0.48, 0.22) : r < 0.84 ? vec3(0.56, 0.52, 0.29) : r < 0.93 ? vec3(0.45, 0.38, 0.27) : vec3(0.36, 0.42, 0.20);
            col = mix(col, vec3(0.30, 0.41, 0.37), lush * step(mix(0.86, 0.94, uSoft), th21(c + 3.1)) * mix(0.7, 0.4, uSoft)); // flooded paddies in the wet south
            col = mix(col, vec3(0.42, 0.45, 0.21), 0.35 * uSoft); // round 5: calmer patchwork
            float fw = length(fwidth(q / sz));
            float fur = 0.5 + 0.5 * sin((r > 0.5 ? f.x : f.y) * 30.0);
            float furFade = 1.0 - smoothstep(0.006, 0.014, fw); // furrows vanish before they alias
            fur = mix(0.5, fur, furFade);
            col *= 0.95 + 0.06 * fur;
            float e = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
            float fe = max(fwidth(e), 1e-4), dw = max(0.035, fe * mix(0.8, 1.6, uSoft)); // round 5: bunds never thinner than ~1.5 px (no dotted lines)
            float dyke = (1.0 - smoothstep(dw - fe * 0.5, dw + fe * 0.5, e)) * (0.035 / dw) * (1.0 - smoothstep(mix(0.06, 0.02, uSoft), mix(0.15, 0.06, uSoft), fe)); // >= 1px, fainter far away
            col = mix(col, mix(vec3(0.30, 0.34, 0.18), vec3(0.47, 0.46, 0.30), uSoft), dyke * mix(0.5, 0.35, uSoft)); // round 5: pale earth bunds
            bump = fur * 0.08 + dyke * 0.35;
            // fade the pattern out where cells shrink below a few pixels (no shimmering at the overview)
            float px = length(fwidth(q / sz));
            // round 5: blocks of 4×4 parcels share a crop colour, so the patchwork still reads from the campaign camera
            vec2 cB = floor(q / (sz * 4.0)); float rB = th21(cB + 17.0);
            vec3 blockC = rB < 0.35 ? vec3(0.40, 0.45, 0.20) : rB < 0.6 ? vec3(0.47, 0.47, 0.24) : rB < 0.8 ? vec3(0.53, 0.49, 0.28) : vec3(0.36, 0.41, 0.19);
            vec3 farC = mix(vec3(0.41, 0.44, 0.20), mix(blockC, vec3(0.44, 0.45, 0.22), smoothstep(0.1, 0.35, px / 4.0)), uSoft);
            return mix(col, farC, smoothstep(0.08, 0.3, px));
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 uvG = (vWP.xz - uGrid.xy) / uGrid.zw;
          vec4 mA = texture2D(tMaskA, uvG), mB = texture2D(tMaskB, uvG), mD = texture2D(tMaskD, uvG), own = texture2D(tOwn, uvG), bd = texture2D(tBord, uvG);
          { // beyond the playable grid: steppe/plateau defaults, no farms, no borders, unshadowed
            vec2 ex = max(uGrid.xy - vWP.xz, vWP.xz - uGrid.xy - uGrid.zw);
            float out_ = smoothstep(0.0, 4.0, max(ex.x, ex.y));
            float aridOut = clamp(smoothstep(uOutArid.x, uOutArid.y, vWP.z) + smoothstep(uOutArid.z, uOutArid.w, vWP.x), 0.0, 1.0) * (0.35 + 0.35 * tnoise(vWP.xz * 0.01));
            mA = mix(mA, vec4(0.0), out_); mB = mix(mB, vec4(aridOut, 0.0, 0.0, 0.0), out_);
            mD = mix(mD, vec4(mD.r, 1.0, 0.5, 0.0), out_); own = mix(own, vec4(0.0), out_); bd = mix(bd, vec4(0.0), out_);
          }
          float slope = 1.0 - clamp(vWN.y, 0.0, 1.0);
          float hgt = vWP.y;
          float fwp = length(fwidth(vWP.xz)); // world units per pixel
          float n1 = mix(tfbm(vWP.xz * 0.22), 0.5, smoothstep(0.25, 0.6, fwp * 0.22 * 4.0));
          float n2 = mix(tnoise(vWP.xz * 1.3), 0.5, smoothstep(0.25, 0.6, fwp * 1.3));
          float n3 = mix(tnoise(vWP.xz * 5.0 * uDetailK), 0.5, smoothstep(0.25, 0.6, fwp * 5.0 * uDetailK));
          float gA = mix(texture2D(tGrass, vWP.xz * 0.19 * uDetailK).g, 0.5, smoothstep(0.05, 0.2, fwp * uDetailK));
          float gB = mix(texture2D(tGrass, vWP.xz * 0.033 + 0.3).g, 0.5, smoothstep(0.4, 1.5, fwp));
          float tBump = (gA - 0.5) * 0.3;
          vec3 lush = mix(vec3(0.20, 0.30, 0.10), vec3(0.34, 0.41, 0.15), n1);
          lush = mix(lush, vec3(0.42, 0.44, 0.18), smoothstep(0.62, 0.85, n2) * 0.35);
          vec3 dry = mix(vec3(0.50, 0.45, 0.28), vec3(0.64, 0.55, 0.35), n1);
          vec3 col = mix(lush, dry, mB.r);
          col = mix(col, vec3(0.80, 0.69, 0.47) * (0.9 + 0.2 * n2), mB.g);
          col = mix(col, vec3(0.52, 0.33, 0.22) * (0.85 + 0.3 * n1), mB.b * 0.55);
          float fb; vec3 fc = fieldColor(vWP.xz * uFieldK, 1.0 - mB.r, fb); // uFieldK > 1: smaller parcels (round 5 scale)
          float fm = smoothstep(0.1, 0.5, mA.g + (n2 - 0.5) * 0.2);
          col = mix(col, fc, fm); tBump += fb * fm;
          col = mix(col, vec3(0.12, 0.17, 0.07), smoothstep(0.15, 0.6, mA.r));
          col = mix(col, vec3(0.55, 0.48, 0.36) * (0.85 + 0.25 * n3), mB.a * 0.8);
          col = mix(col, vec3(0.50, 0.46, 0.36) * (0.9 + 0.2 * n3), mA.a * 0.4);
          float road = smoothstep(0.45, 0.8, mA.b + (n3 - 0.5) * 0.12);
          col = mix(col, vec3(0.63, 0.53, 0.37) * (0.9 + 0.18 * n3), road); tBump -= road * 0.2;
          float rock = smoothstep(0.34, 0.6, slope + (n2 - 0.5) * 0.2) + smoothstep(9.0, 12.0, hgt) * smoothstep(0.15, 0.35, slope);
          vec3 rk = mix(vec3(0.42, 0.39, 0.34), vec3(0.58, 0.54, 0.48), n2);
          rk *= 0.86 + 0.18 * tnoise(vec2((vWP.x + vWP.z) * 0.15, hgt * 2.2)) + 0.1 * (n3 - 0.5);
          col = mix(col, rk, clamp(rock, 0.0, 1.0)); tBump += rock * (n3 - 0.5) * 0.6;
          float snowLine = uSnowLine + 5.0 * smoothstep(-130.0, -175.0, vWP.x) * uSnowWest;
          float snow = smoothstep(snowLine, snowLine + 2.5, hgt + (n1 - 0.5) * 3.0) * (1.0 - smoothstep(0.5, 0.78, slope));
          col = mix(col, vec3(0.90, 0.91, 0.93), snow);
          if (hgt < uWaterLine) {
            float dep = clamp(-hgt / 2.2, 0.0, 1.0);
            vec3 shallow = mix(vec3(0.19, 0.34, 0.32), vec3(0.50, 0.42, 0.25), mD.a);
            vec3 deep = mix(vec3(0.05, 0.16, 0.22), vec3(0.34, 0.27, 0.15), mD.a);
            col = mix(col, mix(shallow, deep, dep), smoothstep(uWaterLine, uWaterLine - 0.37, hgt));
          }
          col *= mix(0.74 + 0.5 * gA * 0.75, 0.86 + 0.28 * gA * 0.75, uSoft) + 0.25 * (gB - 0.5);
          col = pow(col, vec3(2.2)); // authored in sRGB, lit in linear
          col = mix(col, own.rgb, uTint * own.a * step(0.1, hgt));
          // wasteland (no province at all; encoded as black, alpha 0): washed pale in the owner view
          float wild = (1.0 - own.a) * (1.0 - step(0.05, own.r + own.g + own.b));
          col = mix(col, vec3(dot(col, vec3(0.3, 0.55, 0.15))) * 0.9 + vec3(0.1, 0.09, 0.07), uTint * wild * 1.6 * step(0.1, hgt));
          col = applyBorders(col, own, bd, step(0.2, hgt), vWP.xz);
          diffuseColor.rgb = mix(col, pow(EDGE_HAZE, vec3(2.2)), edgeFog(vWP.xz));
          #ifdef DEBUG_MASKS
            diffuseColor.rgb = vec3(mA.b, step(hgt, 0.12), mA.a);
          #endif`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
            float bx = dFdx(tBump), by = dFdy(tBump);
            vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
            normal = normalize(abs(det) * normal - sign(det) * (bx * r1 + by * r2) * 0.9); }`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          { float tSunVis = 0.2 + 0.8 * mD.g; float tAO = 0.62 + 0.76 * mD.b; ${FS_LIGHT} }`);
    };
    mat.customProgramCacheKey = () => 'ground4';
    return mat;
  };

  // Forest canopy: a heightfield lifted by forest density, shaded as packed tree crowns (Worley cells).
  // One mesh draws every forest on the map; individual trees only appear near the camera focus.
  T.canopyMaterial = function (terr, debug) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    if (debug) mat.defines = debug === 'albedo' ? { DEBUG_ALBEDO: 1 } : { DEBUG_FLAT: 1 };
    mat.extensions = { derivatives: true };
    // no territory tint on the canopy by default: dark greens in linear space are tiny, 5% of an owner colour turns them brown
    const U = T.uniforms(terr, { uNear: { value: new THREE.Vector4(0, 0, 0, 0) }, uTint: { value: 0 }, uCanopyBorder: { value: 0 } });
    mat.userData.uniforms = U;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      VS_WP(sh, true);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec4 uNear;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          { vec4 wp0 = modelMatrix * vec4(transformed, 1.0); float dn = length(wp0.xz - uNear.xy);
            transformed.y -= uNear.w * (1.0 - smoothstep(uNear.z - 6.0, uNear.z, dn)); }`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP; varying vec3 vWN; uniform sampler2D tMaskA, tMaskB, tMaskD, tOwn, tBord; uniform vec4 uGrid; uniform float uSeason, uTint, uBorder, uBorderW, uCanopyBorder, uSoft, uEdgeFog, uCrownK;
          ${GLSL_NOISE}
          ${GLSL_BORDER}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 uvG = (vWP.xz - uGrid.xy) / uGrid.zw;
          vec4 mA = texture2D(tMaskA, uvG), mB = texture2D(tMaskB, uvG), mD = texture2D(tMaskD, uvG);
          vec3 wn = normalize(vWN);
          float steep = smoothstep(0.12, 0.4, 1.0 - wn.y);
          vec3 wA = tworley(vWP.xz * 2.1 * uCrownK); // uCrownK > 1: smaller crowns (round-5 scale)
          float d1 = wA.x, d2 = wA.y, id = wA.z;
          float crown = 1.0 - smoothstep(0.0, 0.55, d1);
          float gap = smoothstep(0.0, 0.16, d2 - d1);
          float conifer = clamp(smoothstep(5.0, 9.0, vWP.y) + mB.r * 0.8, 0.0, 1.0);
          float fwc0 = length(fwidth(vWP.xz)) * 2.1 * uCrownK;
          float det0 = (1.0 - smoothstep(0.15, 0.45, fwc0)) * (1.0 - steep);
          id = mix(tnoise(vWP.xz * 0.9 + vec2(vWP.y * 0.7)), id, det0); // smooth colour where crowns fade out
          vec3 broad = mix(vec3(0.13, 0.21, 0.07), vec3(0.24, 0.33, 0.11), id);
          vec3 needle = mix(vec3(0.08, 0.15, 0.08), vec3(0.14, 0.22, 0.12), id);
          vec3 col = mix(broad, needle, conifer);
          col = mix(col, vec3(0.38, 0.40, 0.14), step(0.94, id) * 0.7 * (1.0 - conifer));
          col = mix(col, vec3(0.62, 0.35, 0.40), step(0.985, id) * (1.0 - conifer) * 0.8 * (1.0 - smoothstep(0.1, 0.3, length(fwidth(vWP.xz)) * 2.1)));
          vec3 autumn = id < 0.4 ? vec3(0.55, 0.30, 0.10) : id < 0.7 ? vec3(0.62, 0.48, 0.14) : col;
          col = mix(col, autumn, uSeason * (1.0 - conifer * 0.8));
          float fwc = length(fwidth(vWP.xz)) * 2.1 * uCrownK; // crowns per pixel: fade the pattern before it aliases
          float detail = (1.0 - smoothstep(0.15, 0.45, fwc)) * (1.0 - steep); // crowns stretch on slopes: drop them there
          col *= mix(0.9, 0.72 + 0.42 * crown, detail); col *= mix(1.0, mix(0.62, 1.0, gap), detail);
          col *= 0.85 + 0.3 * tnoise(vWP.xz * 0.35);
          col *= mix(1.0, 0.72 + 0.5 * tnoise(vec2(vWP.x + vWP.z * 0.3, vWP.y * 1.5 + vWP.z) * 0.6 + 3.0), (1.0 - detail) * (1.0 - smoothstep(0.3, 0.7, length(fwidth(vWP.xz)) * 0.6)));
          float tBump = (crown * 0.35 + gap * 0.1) * detail * (1.0 - steep);
          // organic forest edge: keep whole crowns where the density is high enough
          if (mA.r < 0.13 + 0.14 * (1.0 - crown * detail) + 0.08 * (tnoise(vWP.xz * 0.8) - 0.5)) discard;
          diffuseColor.rgb = pow(col, vec3(2.2));
          { vec4 own = texture2D(tOwn, uvG); diffuseColor.rgb = mix(diffuseColor.rgb, own.rgb, uTint * own.a * 0.8);
            float wild = (1.0 - own.a) * (1.0 - step(0.05, own.r + own.g + own.b)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15))) * 0.9 + vec3(0.1, 0.09, 0.07), uTint * wild * 1.6);
            if (uCanopyBorder > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, applyBorders(diffuseColor.rgb, own, texture2D(tBord, uvG), 1.0, vWP.xz), uCanopyBorder); }
          #ifdef DEBUG_FLAT
            diffuseColor.rgb = vec3(0.1, 0.2, 0.08); tBump = 0.0;
          #endif
          #ifdef DEBUG_ALBEDO
            totalEmissiveRadiance = diffuseColor.rgb; diffuseColor.rgb = vec3(0.0);
          #endif`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
            float bx = dFdx(tBump), by = dFdy(tBump);
            vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1);
            normal = normalize(abs(det) * normal - sign(det) * (bx * r1 + by * r2) * 1.0); }`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          { float tSunVis = 0.2 + 0.8 * mD.g; float tAO = (0.55 + 0.7 * mD.b) * (0.7 + 0.3 * mA.r); ${FS_LIGHT} }`);
    };
    mat.customProgramCacheKey = () => 'canopy4';
    return mat;
  };

  // Water: transparent over the coloured riverbed, depth from the baked height, foam at the shore, silt tint.
  T.waterMaterial = function (terr, normals, env) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1d4a5a, roughness: 0.06, metalness: 0.0, normalMap: normals, normalScale: new THREE.Vector2(0.35, 0.35), envMap: env, envMapIntensity: 0.85, transparent: true, depthWrite: false });
    const U = T.uniforms(terr);
    mat.userData.uniforms = U;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      VS_WP(sh, false);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWP; uniform sampler2D tMaskD; uniform vec4 uGrid; uniform float uEdgeFog;
          ${GLSL_NOISE}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 uvG = (vWP.xz - uGrid.xy) / uGrid.zw;
          vec2 exG = max(uGrid.xy - vWP.xz, vWP.xz - uGrid.xy - uGrid.zw); float fogE = uEdgeFog * smoothstep(-10.0, 45.0, max(exG.x, exG.y));
          bool inside = all(greaterThan(uvG, vec2(0.0))) && all(lessThan(uvG, vec2(1.0)));
          vec4 mD = texture2D(tMaskD, clamp(uvG, 0.0, 1.0));
          float tH = inside ? mD.r * 8.0 - 4.0 : -3.0;
          float dep = max(0.0, -tH);
          float silt = inside ? mD.a : 0.0;
          vec3 wc = mix(vec3(0.07, 0.18, 0.21), vec3(0.03, 0.11, 0.18), smoothstep(0.4, 3.0, dep));
          wc = mix(wc, vec3(0.42, 0.34, 0.19), silt * 0.85);
          float foam = (1.0 - smoothstep(0.0, 0.07, dep)) * (0.5 + 0.5 * tnoise(vWP.xz * 3.0));
          diffuseColor.rgb = pow(mix(wc, vec3(0.80, 0.83, 0.80), foam * 0.45), vec3(2.2));
          diffuseColor.a = clamp(0.55 + dep * 0.3 + silt * 0.3, 0.0, 0.94);
          diffuseColor.a = max(diffuseColor.a, foam * 0.7);
          diffuseColor.rgb = mix(diffuseColor.rgb, pow(vec3(0.74, 0.79, 0.81), vec3(2.2)), fogE); diffuseColor.a = mix(diffuseColor.a, 1.0, fogE);
          if (tH > 0.08) discard;`);
    };
    mat.customProgramCacheKey = () => 'water4';
    return mat;
  };

  // ------------------------------------------------------------------ meshes
  // The ground is built in 12-unit chunks whose grid step depends on the distance to the camera focus
  // (0.5 near, 1 mid, 2 far), then merged into ONE mesh; skirts hide the cracks between steps.
  // Normals come from the height grid, so chunk seams do not show in the lighting.
  function chunkedSurface(terr, o, heightAt) {
    const { G } = terr, CS = 12;
    const pos = [], nor = [], ind = [];
    const nx0 = Math.ceil(G.w / CS), nz0 = Math.ceil(G.d / CS);
    const foci = o.focus ? (Array.isArray(o.focus[0]) ? o.focus : [o.focus]) : [];
    const stepFor = (cx, cz) => {
      if (o.step) return o.step;
      if (!foci.length) return 1;
      let d = 1e9;
      for (const f of foci) { const dx = Math.max(0, Math.abs(cx - f[0]) - CS / 2), dz = Math.max(0, Math.abs(cz - f[1]) - CS / 2); d = Math.min(d, Math.hypot(dx, dz)); }
      return d < (o.near ?? 45) ? o.fine ?? 0.5 : d < (o.mid ?? 120) ? 1 : 2;
    };
    const e = 0.5;
    for (let cj = 0; cj < nz0; cj++) for (let ci = 0; ci < nx0; ci++) {
      const x0 = G.x0 + ci * CS, z0 = G.z0 + cj * CS, x1 = Math.min(G.x0 + G.w, x0 + CS), z1 = Math.min(G.z0 + G.d, z0 + CS);
      const st = Math.max(o.minStep ?? 0, stepFor((x0 + x1) / 2, (z0 + z1) / 2));
      const nx = Math.round((x1 - x0) / st), nz = Math.round((z1 - z0) / st);
      const base = pos.length / 3;
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
        pos.push(x, heightAt(x, z), z);
        const hx = terr.h(x + e, z) - terr.h(x - e, z), hz = terr.h(x, z + e) - terr.h(x, z - e);
        const l = Math.hypot(hx, 2 * e, hz); nor.push(-hx / l, (2 * e) / l, -hz / l);
      }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; ind.push(a, c, b, b, c, d); }
      // skirts: edge vertices copied 2 units down
      const edge = (list) => {
        const sb = pos.length / 3;
        for (const k of list) { pos.push(pos[k * 3], pos[k * 3 + 1] - 2, pos[k * 3 + 2]); nor.push(nor[k * 3], nor[k * 3 + 1], nor[k * 3 + 2]); }
        for (let t = 0; t < list.length - 1; t++) { const a = list[t], b = list[t + 1], c = sb + t, d = sb + t + 1; ind.push(a, b, c, b, d, c, a, c, b, b, c, d); }
      };
      const row = (j) => Array.from({ length: nx + 1 }, (_, i) => base + j * (nx + 1) + i), col = (i) => Array.from({ length: nz + 1 }, (_, j) => base + j * (nx + 1) + i);
      // a skirt only where the neighbour chunk has another step (or at the map edge): with a uniform step the
      // skirts cost more triangles than the surface itself
      const diff = (di, dj) => { const ci2 = ci + di, cj2 = cj + dj; if (ci2 < 0 || cj2 < 0 || ci2 >= nx0 || cj2 >= nz0) return true; const cx = G.x0 + (ci2 + 0.5) * CS, cz = G.z0 + (cj2 + 0.5) * CS; return Math.max(o.minStep ?? 0, stepFor(cx, cz)) !== st; };
      if (diff(0, -1)) edge(row(0)); if (diff(0, 1)) edge(row(nz)); if (diff(-1, 0)) edge(col(0)); if (diff(1, 0)) edge(col(nx));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(ind);
    geo.computeBoundingSphere();
    return geo;
  }
  // o: { focus: [x, z] | null, near, mid }
  T.meshes = function (terr, mats, o = {}) {
    const { G } = terr;
    const out = {};
    out.ground = new THREE.Mesh(chunkedSurface(terr, o, (x, z) => terr.h(x, z)), mats.ground);
    out.ground.receiveShadow = true;
    // canopy: lifted by forest density; sinks below the ground where there is no forest
    const canopyH = (x, z) => terr.h(x, z) + terr.canopyLift(x, z);
    out.canopy = new THREE.Mesh(chunkedSurface(terr, { ...o, minStep: 1 }, canopyH), mats.canopy); // edges are cut in the shader, 1 unit is enough
    out.canopy.receiveShadow = true;
    // outer ring: non-uniform grid, dense near the map, coarse at the horizon; hidden under the map inside.
    // Heights are averaged over the local cell size so coarse vertices do not alias the noise.
    const R = 1400, n = 220;
    const og = new THREE.PlaneGeometry(2, 2, n, n).rotateX(-Math.PI / 2);
    const op = og.attributes.position;
    for (let i = 0; i < op.count; i++) {
      const u = op.getX(i), v = op.getZ(i);
      const x = Math.sign(u) * Math.pow(Math.abs(u), 2.6) * R, z = Math.sign(v) * Math.pow(Math.abs(v), 2.6) * R;
      const inside = x > G.x0 + 1 && x < G.x0 + G.w - 1 && z > G.z0 + 1 && z < G.z0 + G.d - 1;
      const sp = Math.max(2.6 * Math.pow(Math.abs(u), 1.6), 2.6 * Math.pow(Math.abs(v), 1.6)) * R * (2 / n); // vertex spacing here
      const edge = Math.min(x - G.x0, G.x0 + G.w - x, z - G.z0, G.z0 + G.d - z);
      let y;
      // hidden under the map inside, but flush with it along the edge (else the last ring cell is a trench)
      if (inside) y = terr.h(x, z) - (edge < sp * 1.5 ? 0.06 : 3);
      else {
        // average over the vertex footprint (spacing grows toward the horizon) so the noise cannot alias
        const r = Math.max(1, sp * 0.6);
        let acc = 0, wsum = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const w = a || b ? 1 : 2; acc += w * terr.H(x + a * r, z + b * r); wsum += w; }
        y = acc / wsum - 0.05;
      }
      op.setXYZ(i, x, y, z);
    }
    og.computeVertexNormals();
    out.outer = new THREE.Mesh(og, mats.ground);
    out.outer.receiveShadow = true;
    return out;
  };
})();
