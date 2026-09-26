// Round 5: the campaign map from real geography (assets/map/, baked by tools/bake-map.mjs).
// Same interface as Terrain.create (terrain.js) so the materials, meshes and dressing are shared.
// Heights come from the bake; masks (forest, fields, roads, borders, light) are computed here on a 1-unit grid.
(function () {
  const T = window.Terrain;
  const { clamp, sstep, lerp } = T.util;
  const { vnoise, fbm } = T.noise;
  const rnd = T.rnd, rr = T.rr;

  // Loads the baked files (tools/bake-map.mjs). Heights arrive gzipped as 2-D delta + zigzag byte planes and are
  // decoded to Int16 in thousandths of a unit. Returns { meta, fine: Int16Array, coarse: Int16Array, water }.
  const gunzip = async (res) => new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const decode = (bytes, g, step) => {
    const N = g.nx * g.nz, out = new Int16Array(N), prevRow = new Int32Array(g.nx), k = Math.round(step * 1000);
    for (let j = 0; j < g.nz; j++) {
      let acc = 0;
      for (let i = 0; i < g.nx; i++) {
        const n = j * g.nx + i, z = bytes[n] | (bytes[N + n] << 8), d = z & 1 ? -(z + 1) / 2 : z / 2;
        const row = d + (j > 0 ? prevRow[i] : 0); prevRow[i] = row; acc += row; out[n] = acc * k;
      }
    }
    return out;
  };
  // Albers equal-area conic (round 8, meta.projection.type 'albers'; same formulas as tools/bake-map.mjs), or the
  // round-5 equirectangular map. Returns { toWorld(lon, lat) → [x, z], toLonLat(x, z) → [lon, lat] } in world units.
  T.projection = function (P) {
    if (P.type !== 'albers') return { toWorld: (lon, lat) => [(lon - P.lon0) * P.unitsPerDegLon, (P.lat0 - lat) * P.unitsPerDegLat], toLonLat: (x, z) => [P.lon0 + x / P.unitsPerDegLon, P.lat0 - z / P.unitsPerDegLat] };
    const r = Math.PI / 180, n = (Math.sin(P.lat1 * r) + Math.sin(P.lat2 * r)) / 2, C = Math.cos(P.lat1 * r) ** 2 + 2 * n * Math.sin(P.lat1 * r);
    const fwd = (lon, lat) => { const t = n * (lon - P.lon0) * r, p = (P.R * Math.sqrt(C - 2 * n * Math.sin(lat * r))) / n; return [p * Math.sin(t), -p * Math.cos(t)]; };
    const [ox, oy] = fwd(P.originLon, P.originLat), k = P.kmPerUnit;
    return {
      toWorld: (lon, lat) => { const [x, y] = fwd(lon, lat); return [(x - ox) / k, -(y - oy) / k]; },
      toLonLat: (X, Z) => { const x = X * k + ox, y = -Z * k + oy, p = Math.hypot(x, y), t = Math.atan2(x, -y); return [P.lon0 + t / n / r, Math.asin(clamp((C - ((p * n) / P.R) ** 2) / (2 * n), -1, 1)) / r]; },
    };
  };

  // opts.tiles(box) → true for the fine tiles to fetch ({x0, z0, x1, z1} in world units; default: all). Tiles left out are
  // filled from the coarse grid, so the core still has heights (softer) and the page downloads only what the camera needs.
  T.loadBaked = async function (base = '/assets/map/', opts = {}) {
    const meta = await fetch(base + 'meta.json').then((r) => r.json());
    const H = meta.height, F = H.fine, C = H.coarse;
    const want = [];
    if (F.tile) for (let tj = 0; tj < F.tilesZ; tj++) for (let ti = 0; ti < F.tilesX; ti++) {
      const box = { x0: F.x0 + ti * F.tile, z0: F.z0 + tj * F.tile }; box.x1 = box.x0 + F.tile; box.z1 = box.z0 + F.tile;
      if (!opts.tiles || opts.tiles(box, meta)) want.push({ ti, tj });
    }
    const [coarseZ, water, land, ...tiles] = await Promise.all([
      fetch(base + 'height-coarse.bin.gz').then(gunzip),
      fetch(base + 'water.json').then((r) => r.json()),
      meta.land ? fetch(base + meta.land.file).then(gunzip) : null,
      ...(F.tile ? want.map((t) => fetch(base + `height-fine-${t.tj}-${t.ti}.bin.gz`).then(gunzip)) : [fetch(base + 'height-fine.bin.gz').then(gunzip)]),
    ]);
    const coarse = decode(coarseZ, C, H.step);
    let fine;
    if (!F.tile) fine = decode(tiles[0], F, H.step);
    else {
      fine = new Int16Array(F.nx * F.nz);
      const cb = (x, z) => { const fx = clamp((x - C.x0) / C.step, 0, C.nx - 1.001), fz = clamp((z - C.z0) / C.step, 0, C.nz - 1.001), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, e = (a, b) => coarse[b * C.nx + a]; return (e(i, j) * (1 - u) + e(i + 1, j) * u) * (1 - v) + (e(i, j + 1) * (1 - u) + e(i + 1, j + 1) * u) * v; };
      for (let j = 0; j < F.nz; j++) for (let i = 0; i < F.nx; i++) fine[j * F.nx + i] = cb(F.x0 + i * F.step, F.z0 + j * F.step);
      const TN = F.tileN;
      want.forEach((t, k) => {
        const sub = decode(tiles[k], { nx: TN, nz: TN }, H.step), i0 = t.ti * (TN - 1), j0 = t.tj * (TN - 1);
        for (let j = 0; j < TN; j++) fine.set(sub.subarray(j * TN, (j + 1) * TN), (j0 + j) * F.nx + i0);
      });
    }
    return { meta, fine, coarse, water, land, tilesLoaded: want.length };
  };

  // opts: { baked, provinces: {id: [x, z]}, neighbors, cities: meta.cities, sun, wall: [[lon, lat]…] }
  T.createReal = function (opts) {
    const t0 = performance.now();
    const phase = {}; let tp = t0; const mark = (k) => { const n = performance.now(); phase[k] = Math.round(n - tp); tp = n; };
    const { meta, water } = opts.baked;
    const P = meta.projection, F = meta.height.fine, CO = meta.height.coarse;
    const { toWorld, toLonLat } = T.projection(P);
    const PROV = opts.provinces, pads = Object.values(opts.cities);
    // round 8: inside present-day China (land mask A); the core grid reaches into Vietnam, Laos, Korea, which stay bare and hazed
    const LM = opts.baked.land ? meta.land : null, landB = opts.baked.land;
    const landRaw = (x, z) => { const o = (clamp(Math.round((z - LM.z0) / LM.step), 0, LM.nz - 1) * LM.nx + clamp(Math.round((x - LM.x0) / LM.step), 0, LM.nx - 1)) * 4; return [landB[o], landB[o + 1], landB[o + 2], landB[o + 3]]; };
    const chinaAt = (x, z) => (LM ? landRaw(x, z)[3] / 255 : 1);
    const cities = Object.values(PROV);

    // --- heights: fine grid inside the map, coarse grid to the horizon, sea beyond
    const bil = (g, arr, x, z) => {
      const fx = clamp((x - g.x0) / g.step, 0, g.nx - 1.001), fz = clamp((z - g.z0) / g.step, 0, g.nz - 1.001);
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = arr[j * g.nx + i], b = arr[j * g.nx + i + 1], c = arr[(j + 1) * g.nx + i], d = arr[(j + 1) * g.nx + i + 1];
      return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) * 0.001;
    };
    const inF = (x, z) => x >= F.x0 && x <= F.x0 + F.w && z >= F.z0 && z <= F.z0 + F.d;
    const inC = (x, z) => x >= CO.x0 && x <= CO.x0 + CO.w && z >= CO.z0 && z <= CO.z0 + CO.d;
    const padMask = (x, z) => { let m = 0; for (const c of pads) { const d = Math.hypot(x - c.x, z - c.z); if (d < c.r + 5) m = Math.max(m, 1 - sstep(c.r + 1, c.r + 5, d)); } return m; };
    // DEM at ~1 km is soft up close: add fine relief on slopes and highlands (not on city pads or plains)
    const H = (x, z) => {
      let v = inF(x, z) ? bil(F, opts.baked.fine, x, z) : inC(x, z) ? bil(CO, opts.baked.coarse, x, z) : -3;
      if (v > 0.8) v += (fbm(x * 0.45, z * 0.45, 3) - 0.5) * 0.3 * sstep(0.8, 4, v) * (1 - padMask(x, z));
      return v;
    };

    // --- mask grid: 1 unit over the fine map
    const G = { x0: F.x0, z0: F.z0, w: F.w, d: F.d, step: 1 };
    G.nx = Math.round(G.w / G.step) + 1; G.nz = Math.round(G.d / G.step) + 1;
    const N = G.nx * G.nz, idx = (i, j) => j * G.nx + i, gx = (i) => G.x0 + i * G.step, gz = (j) => G.z0 + j * G.step;
    const lookup = (arr, x, z) => { const fx = clamp((x - G.x0) / G.step, 0, G.nx - 1.001), fz = clamp((z - G.z0) / G.step, 0, G.nz - 1.001); const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j; return lerp(lerp(arr[idx(i, j)], arr[idx(i + 1, j)], u), lerp(arr[idx(i, j + 1)], arr[idx(i + 1, j + 1)], u), v); };
    const inGrid = (x, z) => x >= G.x0 && x <= G.x0 + G.w && z >= G.z0 && z <= G.z0 + G.d;
    let hFinal = H; // karst pillars are added on top once they are placed
    const h = (x, z) => hFinal(x, z);
    const slopeAt = (x, z) => { const e = 0.5; return Math.min(1.5, Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e)); };
    const height = new Float32Array(N);
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) height[idx(i, j)] = h(gx(i), gz(j));
    mark('height');

    // --- rivers and lakes as a signed distance field (negative in water) for the masks
    const river = new Float32Array(N).fill(1e9), riverHW = new Float32Array(N), silt = new Float32Array(N);
    for (const rv of water.rivers) {
      const R = rv.hw + 8;
      for (let k = 0; k < rv.pts.length; k++) {
        const [px, pz] = rv.pts[k];
        const i0 = Math.max(0, Math.floor((px - R - G.x0) / G.step)), i1 = Math.min(G.nx - 1, Math.ceil((px + R - G.x0) / G.step));
        const j0 = Math.max(0, Math.floor((pz - R - G.z0) / G.step)), j1 = Math.min(G.nz - 1, Math.ceil((pz + R - G.z0) / G.step));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(gx(i) - px, gz(j) - pz) - rv.hw, n = idx(i, j); if (d < river[n]) { river[n] = d; riverHW[n] = rv.hw; silt[n] = rv.silt ? 1 : 0; } }
      }
    }
    for (const L of water.lakes) {
      const ring = L.ring, xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]), m = 6;
      for (let j = Math.max(0, Math.floor((Math.min(...zs) - m - G.z0) / G.step)); j <= Math.min(G.nz - 1, Math.ceil((Math.max(...zs) + m - G.z0) / G.step)); j++)
        for (let i = Math.max(0, Math.floor((Math.min(...xs) - m - G.x0) / G.step)); i <= Math.min(G.nx - 1, Math.ceil((Math.max(...xs) + m - G.x0) / G.step)); i++) {
          const x = gx(i), z = gz(j);
          let inside = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, za] = ring[a], [xb, zb] = ring[b]; if ((za > z) !== (zb > z) && x < ((xb - xa) * (z - za)) / (zb - za) + xa) inside = !inside; }
          let dmin = 1e9; for (let a = 0; a < ring.length - 1; a++) dmin = Math.min(dmin, T.polyDist(x, z, [ring[a], ring[a + 1]]));
          const d = inside ? -dmin : dmin, n = idx(i, j); if (d < river[n]) { river[n] = d; riverHW[n] = 2.5; silt[n] = 0; }
        }
    }
    const riverSD = (x, z) => (inGrid(x, z) ? lookup(river, x, z) : 1e9);
    mark('rivers');

    // --- coast: chamfer distance transform of the sea mask (positive on land)
    const land = new Float32Array(N);
    { const INF = 1e6, dIn = new Float32Array(N), dOut = new Float32Array(N);
      for (let n = 0; n < N; n++) { const sea = height[n] < 0.02 && river[n] > 0.5; dIn[n] = sea ? 0 : INF; dOut[n] = sea ? INF : 0; }
      const pass = (d) => {
        for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let v = d[idx(i, j)]; if (i) v = Math.min(v, d[idx(i - 1, j)] + 1); if (j) { v = Math.min(v, d[idx(i, j - 1)] + 1); if (i) v = Math.min(v, d[idx(i - 1, j - 1)] + 1.414); if (i < G.nx - 1) v = Math.min(v, d[idx(i + 1, j - 1)] + 1.414); } d[idx(i, j)] = v; }
        for (let j = G.nz - 1; j >= 0; j--) for (let i = G.nx - 1; i >= 0; i--) { let v = d[idx(i, j)]; if (i < G.nx - 1) v = Math.min(v, d[idx(i + 1, j)] + 1); if (j < G.nz - 1) { v = Math.min(v, d[idx(i, j + 1)] + 1); if (i < G.nx - 1) v = Math.min(v, d[idx(i + 1, j + 1)] + 1.414); if (i) v = Math.min(v, d[idx(i - 1, j + 1)] + 1.414); } d[idx(i, j)] = v; }
      };
      pass(dIn); pass(dOut);
      for (let n = 0; n < N; n++) land[n] = dIn[n] > 0 ? dIn[n] : -dOut[n];
    }
    const landSD = (x, z) => (inGrid(x, z) ? lookup(land, x, z) : h(x, z) > 0.02 ? 50 : -50);
    mark('coast');

    // --- regions from real geography (lon/lat + height)
    const ell = (lon, lat, clon, clat, rx, ry) => Math.hypot((lon - clon) / rx, (lat - clat) / ry);
    const region = (x, z) => {
      const [lon, lat] = toLonLat(x + 6 * (fbm(x * 0.02, z * 0.02, 2) - 0.5), z + 6 * (fbm(z * 0.02 + 3, x * 0.02, 2) - 0.5)), e = h(x, z);
      const tibet = sstep(7.5, 10.5, e) * sstep(105, 103, lon);
      // Hexi corridor: gravel desert between the Qilian range and the Tengger sands, green only in the Wuwei
      // (Guzang) oasis on the Shiyang river
      const oasis = sstep(1.1, 0.7, ell(lon, lat, 102.65, 37.95, 0.45, 0.35) + 0.5 * (fbm(x * 0.09, z * 0.09, 3) - 0.5));
      const gobi = sstep(36.9, 37.5, lat) * sstep(104.2, 103.4, lon) * sstep(9.5, 7.5, e);
      const tengger = sstep(1.05, 0.7, ell(lon, lat, 104.2, 38.7, 1.3, 0.75) + 0.7 * (fbm(x * 0.07 + 5, z * 0.07, 3) - 0.5)) * (1 - oasis);
      const steppe = clamp(Math.max(sstep(40.2, 41.4, lat) * sstep(119.5, 117.5, lon) + sstep(37.5, 39, lat) * sstep(104.5, 103.5, lon), gobi) * (1 - 0.85 * oasis), 0, 1);
      const loess = sstep(104.3, 105.2, lon) * sstep(113.8, 112.6, lon) * sstep(34.2, 35.0, lat) * sstep(39.6, 38.6, lat) * sstep(1.2, 2.2, e);
      const ordos = Math.max(tengger, sstep(1.05, 0.7, ell(lon, lat, 108.9, 39.4, 2.0, 0.85) + 0.7 * (fbm(x * 0.07, z * 0.07, 3) - 0.5))) * (0.55 + 0.45 * sstep(0.35, 0.65, fbm(x * 0.2 + 7, z * 0.2, 2))); // Mu Us / Kubuqi / Tengger sands in patches
      const sichuan = sstep(1.05, 0.8, ell(lon, lat, 105.3, 30.2, 2.1, 1.4)) * sstep(2.6, 1.9, e);
      const south = sstep(29.8, 27.5, lat);
      const northPlain = sstep(113.3, 114.3, lon) * sstep(40.2, 39.4, lat) * sstep(32.6, 33.4, lat) * sstep(0.9, 0.55, e);
      return { tibet, steppe, loess, ordos, sichuan, south, northPlain, oasis, gobi, lon, lat };
    };

    // --- karst towers, sandstone pillars, granite peaks (real places)
    const pillars = [];
    for (const [lon, lat, Rkm, n, h0, h1, r0, r1] of [[110.4, 25.0, 55, 70, 1.6, 3.6, 0.7, 1.4], [110.45, 29.35, 22, 26, 2, 4.2, 0.5, 0.9], [118.17, 30.13, 14, 10, 2.2, 4, 0.8, 1.3], [110.08, 34.48, 8, 4, 2.5, 4, 0.9, 1.3]]) {
      const [cx, cz] = toWorld(lon, lat), R = Rkm / P.kmPerUnit;
      for (let k = 0, tries = 0; k < n && tries < 800; tries++) {
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (pads.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 4) || riverSD(x, z) < 1 || landSD(x, z) < 3 || pillars.some((p) => Math.hypot(x - p[0], z - p[1]) < p[2] + 0.4)) continue;
        pillars.push([x, z, rr(r0, r1), rr(h0, h1)]); k++;
      }
    }
    if (pillars.length) {
      const base = H;
      const withPillars = (x, z) => {
        let v = base(x, z); const b = v;
        for (const [kx, kz, kr, kh] of pillars) {
          const dx = x - kx, dz = z - kz; if (Math.abs(dx) > kr * 1.45 || Math.abs(dz) > kr * 1.45) continue;
          const d = Math.hypot(dx, dz) / (kr * (0.8 + 0.4 * vnoise(x * 1.3 + 11, z * 1.3))); if (d >= 1) continue;
          v = Math.max(v, b + kh * Math.pow(1 - d ** 3, 0.42) * (0.9 + 0.15 * vnoise(x * 3, z * 3)));
        }
        return v;
      };
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) height[idx(i, j)] = withPillars(gx(i), gz(j));
      hFinal = withPillars;
    }
    const hh2 = h;
    mark('pillars');

    // --- roads: A* on a 2.5-unit grid between neighbouring cities (real passes, real valleys)
    const RS = 2.5, RC = { nx: Math.floor(G.w / RS) + 1, nz: Math.floor(G.d / RS) + 1 };
    const cost = new Float32Array(RC.nx * RC.nz);
    for (let j = 0; j < RC.nz; j++) for (let i = 0; i < RC.nx; i++) {
      const x = G.x0 + i * RS, z = G.z0 + j * RS, e = hh2(x, z), s = slopeAt(x, z), rd = riverSD(x, z);
      cost[j * RC.nx + i] = landSD(x, z) < 0 ? 1e6 : rd < 0 ? 18 : 1 + s * s * 60 + Math.max(0, e - 6) * 1.2;
    }
    const dist = new Float64Array(RC.nx * RC.nz), prev = new Int32Array(RC.nx * RC.nz), stamp = new Int32Array(RC.nx * RC.nz);
    let run = 0;
    function astar(ax, az, bx, bz) {
      run++;
      const si = Math.round((ax - G.x0) / RS), sj = Math.round((az - G.z0) / RS), gi = Math.round((bx - G.x0) / RS), gj = Math.round((bz - G.z0) / RS);
      const m = 24, i0 = Math.max(0, Math.min(si, gi) - m), i1 = Math.min(RC.nx - 1, Math.max(si, gi) + m), j0 = Math.max(0, Math.min(sj, gj) - m), j1 = Math.min(RC.nz - 1, Math.max(sj, gj) + m);
      const s0 = sj * RC.nx + si, g0 = gj * RC.nx + gi, hk = [], hn = [];
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
      if (stamp[g0] !== run) return [[ax, az], [bx, bz]];
      const path = []; for (let n = g0; n !== -1; n = prev[n]) path.push([G.x0 + (n % RC.nx) * RS, G.z0 + ((n / RC.nx) | 0) * RS]);
      path.reverse(); path[0] = [ax, az]; path[path.length - 1] = [bx, bz];
      return path;
    }
    const chaikin = (p, it) => { for (let k = 0; k < it; k++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const [ax, az] = p[i], [bx, bz] = p[i + 1]; o.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]); } o.push(p[p.length - 1]); p = o; } return p; };

    // --- provinces: nearest seat by travel cost, not straight distance, so borders follow ridges and big
    // rivers the way the Han zhou did (Qinling, Taihang, Huai…). One Dijkstra per seat on a 2-unit grid;
    // each fine cell takes the two cheapest seats (bilinear), border = half the cost gap.
    const provIds = Object.keys(PROV);
    const provOf = new Uint8Array(N), prov2 = new Uint8Array(N), border = new Float32Array(N), gap = new Float32Array(N), reach = new Float32Array(N);
    // opts.wild: how far (travel cost) a province reaches into arid land; beyond it the land has no owner
    // (219: 20 provinces, the steppe, deserts and Tibet are wasteland)
    const WILD = opts.wild || 0, WILDI = provIds.length;
    {
      const PG = { x0: G.x0, z0: G.z0, st: 2 }; PG.nx = Math.floor(G.w / PG.st) + 1; PG.nz = Math.floor(G.d / PG.st) + 1;
      const PN = PG.nx * PG.nz, pc = new Float32Array(PN), aridPG = new Float32Array(PN);
      for (let j = 0; j < PG.nz; j++) for (let i = 0; i < PG.nx; i++) {
        const x = PG.x0 + i * PG.st, z = PG.z0 + j * PG.st, e = lookup(height, x, z), rd = riverSD(x, z);
        const s = Math.hypot(lookup(height, x + 1, z) - lookup(height, x - 1, z), lookup(height, x, z + 1) - lookup(height, x, z - 1)) / 2;
        const hw = inGrid(x, z) ? riverHW[idx(Math.round((x - G.x0) / G.step), Math.round((z - G.z0) / G.step))] : 0;
        // with opts.wild: steppe, sand, plateau (and Taiwan, Hainan: beyond Han reach) are the wasteland of 219
        let arid = 0;
        if (WILD) { const R = region(x, z); arid = clamp(R.steppe + R.ordos + R.tibet + ((R.lon > 119.8 && R.lat < 25.5) || (R.lat < 20.3 && R.lon > 108.4 && R.lon < 111.3) ? 1 : 0), 0, 1); } // + Taiwan, Hainan (Zhuya given up in 46 BC)
        aridPG[j * PG.nx + i] = arid;
        pc[j * PG.nx + i] = e < 0.05 && rd > 0 ? 3 : 1 + 40 * s * s + Math.max(0, e - 2.5) * 0.5 + (rd < 0 ? 2 + hw * 5 : 0) + 0.8 * fbm(x * 0.03, z * 0.03, 2) + 2 * arid;
      }
      if (WILD) for (let pass = 0; pass < 2; pass++) for (const [di, dj] of [[1, 0], [0, 1]]) { // box blur r=3 (6 units): no speckled wasteland in rugged terrain
        const src = aridPG.slice();
        for (let j = 0; j < PG.nz; j++) for (let i = 0; i < PG.nx; i++) { let a = 0, c = 0; for (let k = -3; k <= 3; k++) { const ii = i + di * k, jj = j + dj * k; if (ii >= 0 && jj >= 0 && ii < PG.nx && jj < PG.nz) { a += src[jj * PG.nx + ii]; c++; } } aridPG[j * PG.nx + i] = a / c; }
      }
      const hk = new Float32Array(PN * 8), hv = new Int32Array(PN * 8);
      const D = provIds.map((id) => {
        const d = new Float32Array(PN).fill(Infinity), [sx0, sz0] = PROV[id];
        const si = Math.round((sx0 - PG.x0) / PG.st), sj = Math.round((sz0 - PG.z0) / PG.st), s0 = sj * PG.nx + si;
        let n = 0; const push = (k, v) => { let c = n++; while (c > 0) { const p = (c - 1) >> 1; if (hk[p] <= k) break; hk[c] = hk[p]; hv[c] = hv[p]; c = p; } hk[c] = k; hv[c] = v; };
        const pop = () => { const v = hv[0], k = hk[--n], w = hv[n]; let c = 0; for (;;) { let m = 2 * c + 1; if (m >= n) break; if (m + 1 < n && hk[m + 1] < hk[m]) m++; if (hk[m] >= k) break; hk[c] = hk[m]; hv[c] = hv[m]; c = m; } hk[c] = k; hv[c] = w; return v; };
        d[s0] = 0; push(0, s0);
        while (n) {
          const kmin = hk[0], a = pop(); if (kmin > d[a]) continue;
          const ai = a % PG.nx, aj = (a - ai) / PG.nx;
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            if (!di && !dj) continue; const bi = ai + di, bj = aj + dj; if (bi < 0 || bj < 0 || bi >= PG.nx || bj >= PG.nz) continue;
            const b = bj * PG.nx + bi, nd = d[a] + (di && dj ? 1.414 : 1) * PG.st * 0.5 * (pc[a] + pc[b]);
            if (nd < d[b] && n < hk.length) { d[b] = nd; push(nd, b); }
          }
        }
        return d;
      });
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
        const fx = clamp((gx(i) - PG.x0) / PG.st, 0, PG.nx - 1.001), fz = clamp((gz(j) - PG.z0) / PG.st, 0, PG.nz - 1.001);
        const a0 = Math.floor(fx), b0 = Math.floor(fz), u = fx - a0, v = fz - b0, q = b0 * PG.nx + a0;
        let d1 = 1e9, d2 = 1e9, p1 = 0, p2 = 0;
        for (let k = 0; k < D.length; k++) {
          const dk = D[k], d = (dk[q] * (1 - u) + dk[q + 1] * u) * (1 - v) + (dk[q + PG.nx] * (1 - u) + dk[q + PG.nx + 1] * u) * v;
          if (d < d1) { d2 = d1; p2 = p1; d1 = d; p1 = k; } else if (d < d2) { d2 = d; p2 = k; }
        }
        provOf[idx(i, j)] = p1; prov2[idx(i, j)] = p2; gap[idx(i, j)] = (d2 - d1) * 0.5; reach[idx(i, j)] = d1;
      }
      // border distance in world units: the cost gap (d2 − d1) is smooth, so divide it by its own gradient —
      // sub-cell precise, no staircase from the grid (a label-edge distance transform steps at 1 unit)
      const gapAt = (i, j) => gap[idx(clamp(i, 0, G.nx - 1), clamp(j, 0, G.nz - 1))];
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
        const gr = Math.hypot(gapAt(i + 1, j) - gapAt(i - 1, j), gapAt(i, j + 1) - gapAt(i, j - 1)) / 2;
        border[idx(i, j)] = Math.min(50, gap[idx(i, j)] / Math.max(0.3, gr));
      }
      // the wasteland edge the same way: f = W − reach over its own gradient, W falling from 600 on settled land
      // to opts.wild on arid land
      if (WILD) {
        const f = new Float32Array(N);
        for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
          const a = aridPG[clamp(Math.round((gz(j) - PG.z0) / PG.st), 0, PG.nz - 1) * PG.nx + clamp(Math.round((gx(i) - PG.x0) / PG.st), 0, PG.nx - 1)];
          f[idx(i, j)] = 600 + (WILD - 600) * sstep(0.3, 0.6, a) - reach[idx(i, j)];
        }
        const fAt = (i, j) => f[idx(clamp(i, 0, G.nx - 1), clamp(j, 0, G.nz - 1))];
        for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
          const n = idx(i, j), gr = Math.max(0.3, Math.hypot(fAt(i + 1, j) - fAt(i - 1, j), fAt(i, j + 1) - fAt(i, j - 1)) / 2), wb = f[n] / gr;
          if (wb <= 0) { prov2[n] = provOf[n]; provOf[n] = WILDI; border[n] = Math.min(50, -wb); } else if (wb < border[n]) { prov2[n] = WILDI; border[n] = wb; }
        }
      }
    }
    mark('provinces');

    // --- roads between neighbouring seats. Without a neighbour graph (the 219 seats have none yet), provinces
    // that share at least ~5 units (15 km) of border are neighbours.
    if (!opts.neighbors) {
      const cnt = new Map();
      for (let n = 0; n < N; n++) if (border[n] < 1 && provOf[n] !== prov2[n] && provOf[n] !== WILDI && prov2[n] !== WILDI) { const k = Math.min(provOf[n], prov2[n]) + ':' + Math.max(provOf[n], prov2[n]); cnt.set(k, (cnt.get(k) || 0) + 1); }
      opts.neighbors = {};
      for (const [k, c] of cnt) if (c >= 10) { const [a, b] = k.split(':').map((q) => provIds[+q]); (opts.neighbors[a] = opts.neighbors[a] || []).push(b); }
    }
    const roads = [], done = new Set();
    for (const [a, list] of Object.entries(opts.neighbors)) for (const b of list) {
      const key = [a, b].sort().join('>'); if (done.has(key) || !PROV[a] || !PROV[b]) continue; done.add(key);
      roads.push({ a, b, pts: chaikin(astar(PROV[a][0], PROV[a][1], PROV[b][0], PROV[b][1]), 3) });
    }
    const road = new Float32Array(N).fill(9);
    for (const r of roads) for (let k = 0; k < r.pts.length - 1; k++) {
      const [ax, az] = r.pts[k], [bx, bz] = r.pts[k + 1];
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - 2 - G.x0) / G.step)), i1 = Math.min(G.nx - 1, Math.ceil((Math.max(ax, bx) + 2 - G.x0) / G.step));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - 2 - G.z0) / G.step)), j1 = Math.min(G.nz - 1, Math.ceil((Math.max(az, bz) + 2 - G.z0) / G.step));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = T.polyDist(gx(i), gz(j), [[ax, az], [bx, bz]]), n = idx(i, j); if (d < road[n]) road[n] = d; }
    }
    const roadD = (x, z) => (inGrid(x, z) ? lookup(road, x, z) : 9);
    mark('roads');

    // --- baked sun visibility and cavity AO (1-unit grid = mask grid)
    const sun = opts.sun.clone().normalize();
    const sh = new Float32Array(N), hb = new Float32Array(N), hc = new Float32Array(N);
    for (let n = 0; n < N; n++) hc[n] = Math.max(0, height[n]);
    const hl = Math.hypot(sun.x, sun.z), sx = sun.x / hl, sz = sun.z / hl, tanE = sun.y / hl;
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const x = gx(i), z = gz(j), h0 = hc[idx(i, j)] + 0.15;
      let vis = 1;
      for (let t = 0.8; t < 90; t *= 1.1) { const th = lookup(hc, x + sx * t, z + sz * t); vis = Math.min(vis, (h0 + t * tanE - th) / (t * 0.09) + 0.5); if (vis <= 0) break; }
      sh[idx(i, j)] = clamp(vis, 0, 1);
    }
    { const tmp = new Float32Array(N), r = 3;
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let s = 0; for (let k = -r; k <= r; k++) s += hc[idx(clamp(i + k, 0, G.nx - 1), j)]; tmp[idx(i, j)] = s / (2 * r + 1); }
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let s = 0; for (let k = -r; k <= r; k++) s += tmp[idx(i, clamp(j + k, 0, G.nz - 1))]; hb[idx(i, j)] = s / (2 * r + 1); } }
    mark('bake');

    // --- masks: farmland and forest as they might have been c. 200 (plains cleared, hills and south wooded)
    const forest = new Float32Array(N), field = new Float32Array(N), settle = new Float32Array(N);
    const nearPad = (x, z) => { let d = 1e9, r = 0; for (const c of pads) { const dd = Math.hypot(x - c.x, z - c.z) - c.r; if (dd < d) { d = dd; r = c.r; } } return d; };
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const x = gx(i), z = gz(j), n = idx(i, j), e = height[n];
      if (e < 0.05 || river[n] < 0) continue;
      const R = region(x, z), s = slopeAt(x, z), rd = river[n], dc = nearPad(x, z), road0 = road[n];
      const arid = clamp(R.loess * 0.75 + R.steppe * 0.9 + R.ordos + R.tibet * 0.7 + 0.2 * R.northPlain, 0, 1);
      let fm = sstep(30, 10, dc) * sstep(0.5, 1.5, dc) * 0.9 + sstep(10, 2, rd) * 0.55 * (0.6 + 0.4 * R.south) + R.northPlain * 0.75 + R.sichuan * 0.7 + R.loess * 0.25 + R.oasis * 0.9;
      fm += sstep(1.6, 0.6, e) * sstep(0.12, 0.04, s) * 0.45 * (1 - arid); // lowland plains were farmed by 200
      fm *= sstep(0.4, 0.18, s) * Math.max(sstep(6, 3, e), sstep(30, 8, dc)) * (1 - R.ordos) * (1 - R.tibet) * (1 - 0.7 * R.steppe); // high basins round a city were farmed too (Dian, Guzang, Tianshui)
      fm = clamp(fm * 0.9 + (fbm(x * 0.05 + 40, z * 0.05, 3) - 0.5) * 1.1, 0, 1);
      const cn = sstep(0.35, 0.65, chinaAt(x, z));
      field[n] = sstep(0.4, 0.62, fm) * cn;
      let fd = (fbm(x * 0.03 + 9, z * 0.03 + 2) - 0.42) * 3 + sstep(1.3, 4.5, e) * 0.9 + R.south * 0.55 - R.northPlain * 0.6;
      const wx = x + 9 * (fbm(x * 0.05 + 1, z * 0.05, 2) - 0.5), wz = z + 9 * (fbm(z * 0.05 + 6, x * 0.05, 2) - 0.5); // warped: ragged, not round
      fd += sstep(0.6, 0.72, fbm(wx * 0.16 + 3, wz * 0.16 + 8, 3)) * 1.6 * (1 - arid); // woodlots and groves on the plains
      fd -= arid * 1.4 + field[n] * (1.2 + 1.6 * sstep(3.5, 5, e) * sstep(0.1, 0.04, s)) + // farmed high basins (Dian, Guzang) beat the upland forest bonus
         sstep(2.0, 0.6, rd) + sstep(1.4, 0.5, road0) + sstep(4, 0, dc) * 2 + sstep(10.5, 13, e) * 2 + (R.gobi + R.oasis) * 2 * sstep(8.5, 7, e); // Hexi: spruce only up on the Qilian slopes
      for (const [kx, kz, kr] of pillars) if (Math.abs(x - kx) < kr && Math.abs(z - kz) < kr && Math.hypot(x - kx, z - kz) < kr * 0.8) fd = Math.max(fd, 0.9);
      forest[n] = clamp(fd, 0, 1) * cn;
    }
    { const tmp = new Float32Array(N), r = 1;
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let a = 0; for (let k = -r; k <= r; k++) a += forest[idx(clamp(i + k, 0, G.nx - 1), j)]; tmp[idx(i, j)] = a / (2 * r + 1); }
      for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) { let a = 0; for (let k = -r; k <= r; k++) a += tmp[idx(i, clamp(j + k, 0, G.nz - 1))]; forest[idx(i, j)] = sstep(0.1, 0.9, a / (2 * r + 1)); } }
    mark('masks');

    // --- hamlets: farming villages on flat land near roads and rivers
    const hamlets = [];
    for (let k = 0; k < 120000 && hamlets.length < (opts.hamlets ?? 650); k++) {
      const x = rr(G.x0 + 4, G.x0 + G.w - 4), z = rr(G.z0 + 4, G.z0 + G.d - 4), e = hh2(x, z);
      if (e < 0.2 || e > 6 || slopeAt(x, z) > 0.2 || landSD(x, z) < 1.5) continue;
      const rd = riverSD(x, z), r0 = roadD(x, z), dc = nearPad(x, z);
      if (dc < 3 || rd < 1 || !(r0 < 2.5 || rd < 5 || rnd() < 0.12)) continue;
      const R = region(x, z); if (R.ordos > 0.3 || R.tibet > 0.3 || (R.steppe > 0.5 && rnd() < 0.85)) continue;
      if (lookup(forest, x, z) > 0.45 || hamlets.some((p) => Math.abs(p.x - x) < 7 && Math.abs(p.z - z) < 7)) continue;
      if (chinaAt(x, z) < 0.6) continue;
      hamlets.push({ x, z, n: 3 + Math.floor(rnd() * 6), arid: R.loess + R.steppe });
    }
    for (const hm of hamlets) {
      const R = 2.4, RL = R * 2.3; // fields reach 2.2 R: loop over all of it or the patch is cut square
      for (let j = Math.max(0, Math.floor((hm.z - RL - G.z0) / G.step)); j < Math.min(G.nz, (hm.z + RL - G.z0) / G.step); j++)
        for (let i = Math.max(0, Math.floor((hm.x - RL - G.x0) / G.step)); i < Math.min(G.nx, (hm.x + RL - G.x0) / G.step); i++) {
          const n = idx(i, j), d = Math.hypot(gx(i) - hm.x, gz(j) - hm.z) / R;
          settle[n] = Math.max(settle[n], 0.5 * sstep(0.85, 0.2, d + 0.35 * vnoise(gx(i) * 0.8, gz(j) * 0.8)));
          forest[n] *= sstep(0.2, 0.9, d);
          field[n] = Math.max(field[n], sstep(2.2, 1.0, d) * sstep(0.2, 0.6, d) * (1 - hm.arid * 0.5));
        }
    }
    mark('hamlets');

    // --- textures (same channel layout as terrain.js)
    const texA = new Uint8Array(N * 4), texB = new Uint8Array(N * 4), texD = new Uint8Array(N * 4);
    const b8 = (v) => Math.round(clamp(v, 0, 1) * 255);
    for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) {
      const n = idx(i, j), x = gx(i), z = gz(j), R = region(x, z), o = n * 4;
      texA[o] = b8(forest[n]); texA[o + 1] = b8(field[n]); texA[o + 2] = b8(1 - road[n] / 1.4);
      texA[o + 3] = b8(sstep(0.9, 0.05, river[n]) * sstep(0.4, 1.0, riverHW[n]) + sstep(2.0, 0.2, land[n]) * 0.9);
      // round 8: toward the edge of the core, agree with the all-China land mask so the two meet without a seam
      const lmk = LM ? sstep(60, 10, Math.min(x - G.x0, G.x0 + G.w - x, z - G.z0, G.z0 + G.d - z)) : 0, lo = lmk ? landRaw(x, z) : null;
      texB[o] = b8(lerp(R.loess * 0.85 + R.steppe * 0.75 + R.tibet * 0.65 + 0.2 * R.northPlain, lo ? lo[0] / 255 : 0, lmk)); texB[o + 1] = b8(lerp(R.ordos, lo ? lo[1] / 255 : 0, lmk)); texB[o + 2] = b8(R.sichuan * sstep(0.45, 0.8, fbm(x * 0.1, z * 0.1, 3))); texB[o + 3] = b8(settle[n]);
      texD[o] = b8((height[n] + 4) / 8); texD[o + 1] = b8(sh[n]); texD[o + 2] = b8(0.5 + (hc[n] - hb[n]) * 0.22); texD[o + 3] = b8(silt[n] * sstep(6, 1, river[n]));
    }
    const mkTex = (data) => { const t = new THREE.DataTexture(data, G.nx, G.nz, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t; };
    const tA = mkTex(texA), tB = mkTex(texB), tD = mkTex(texD);
    const ownData = new Uint8Array(N * 4), tOwn = mkTex(ownData), bordData = new Uint8Array(N * 4), tBord = mkTex(bordData);
    function setOwners(colorOf, ownerOf2) {
      const cols = [...provIds.map((id) => { const c = colorOf(id); return c ? [c.r, c.g, c.b, 1] : [0.45, 0.45, 0.42, 0]; }), [0, 0, 0, 0]]; // wasteland: black, alpha 0
      const owner = [...provIds.map((id) => ownerOf2(id) || null), null];
      for (let n = 0; n < N; n++) {
        // realm edges (R) reach 4 units in, so the perimeter carries a band of the owner's colour; province edges (G) 2.5
        const c = cols[provOf[n]], o = n * 4, wild = provOf[n] === WILDI || prov2[n] === WILDI, same = owner[provOf[n]] === owner[prov2[n]] && !wild, p = clamp(1 - border[n] / 2.5, 0, 1), pr = clamp(1 - border[n] / 4, 0, 1);
        ownData[o] = b8(c[0]); ownData[o + 1] = b8(c[1]); ownData[o + 2] = b8(c[2]); ownData[o + 3] = b8(c[3]);
        // B: proximity to the wasteland edge (kept for later; the shaders mark wasteland with a pale wash, a line speckles)
        bordData[o] = b8(same || wild ? 0 : pr); bordData[o + 1] = b8(same ? p : 0); bordData[o + 2] = b8(wild ? p : 0);
      }
      tOwn.needsUpdate = true; tBord.needsUpdate = true;
    }
    // tBord.a: presentation marks per province (0.6 = a legal attack target, 1 = the chosen one); owners stay in tOwn
    let hlKey = '';
    function setHighlight(levelOf) {
      const lv = [...provIds.map((id) => b8(levelOf(id) || 0)), 0], key = lv.join(',');
      if (key === hlKey) return false;
      hlKey = key;
      for (let n = 0; n < N; n++) bordData[n * 4 + 3] = lv[provOf[n]];
      tBord.needsUpdate = true;
      return true;
    }
    mark('textures');

    const canopyLift = (x, z) => {
      const f = inGrid(x, z) ? lookup(forest, x, z) : 0;
      if (f < 0.04) return -1.5;
      // round 5 scale: a forest stands about as tall as a city wall (walls ~0.22–0.3), never taller than the towers
      const k = opts.canopy ?? 1;
      return k * (0.2 + sstep(0.1, 0.5, f) * (0.25 + f * 0.45 * (0.75 + 0.5 * vnoise(x * 0.7, z * 0.7)) + Math.min(0.5, slopeAt(x, z) * 0.35)));
    };
    const out = {
      S: 1, G, H: hh2, h: hh2, canopyLift, slopeAt, riverSD, landSD, roadD, region, rivers: [], water, roads, pillars, hamlets, provIds, setOwners, setHighlight, toWorld, toLonLat,
      wall: (opts.wall || []).map(([lon, lat]) => toWorld(lon, lat)),
      forestAt: (x, z) => (inGrid(x, z) ? lookup(forest, x, z) : 0), fieldAt: (x, z) => (inGrid(x, z) ? lookup(field, x, z) : 0),
      sunAt: (x, z) => (inGrid(x, z) ? lookup(sh, x, z) : 1), provinceAt: (x, z) => provIds[provOf[idx(Math.round(clamp((x - G.x0) / G.step, 0, G.nx - 1)), Math.round(clamp((z - G.z0) / G.step, 0, G.nz - 1)))]],
      tex: { A: tA, B: tB, D: tD, own: tOwn, bord: tBord }, buildMs: 0, phase,
    };
    // all of China (round 8): the coarse grid and its baked land mask (R arid, G sand, B forest, A inside China)
    if (opts.baked.land) {
      const L = meta.land, t = new THREE.DataTexture(opts.baked.land, L.nx, L.nz, THREE.RGBAFormat);
      t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
      out.tex.land = t; out.land = L; out.CO = CO;
      out.landAt = (x, z) => { const i = clamp(Math.round((x - L.x0) / L.step), 0, L.nx - 1), j = clamp(Math.round((z - L.z0) / L.step), 0, L.nz - 1), o = (j * L.nx + i) * 4, a = opts.baked.land; return { arid: a[o] / 255, sand: a[o + 1] / 255, forest: a[o + 2] / 255, china: a[o + 3] / 255 }; };
    }
    out.buildMs = performance.now() - t0;
    return out;
  };

  // Rivers as ribbons at their own water level (inland rivers are far above the sea plane) + lakes as flat
  // shapes. One draw call each; the shader fades the edges into the banks and tints silty rivers.
  // o.lift: far views, where the ground mesh (1–2 unit steps) cannot resolve a narrow carved channel — keep the
  // ribbon just above the ground or small rivers show as dashes.
  T.waterBodies = function (terr, normals, env, o = {}) {
    const pos = [], uv = [], silt = [], ind = [];
    for (const rv of terr.water.rivers) {
      const p = rv.pts; if (p.length < 2) continue;
      const base = pos.length / 3; let along = 0;
      for (let k = 0; k < p.length; k++) {
        const a = p[Math.max(0, k - 1)], b = p[Math.min(p.length - 1, k + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
        const nx = -tz / l, nz = tx / l, w = rv.hw * 1.12, y = p[k][2] + 0.02;
        if (k) along += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
        let yl = y;
        if (o.lift) { const L = Math.max(1.2, w); for (const [dx, dz] of [[0, 0], [L, 0], [-L, 0], [0, L], [0, -L]]) yl = Math.max(yl, terr.h(p[k][0] + dx, p[k][1] + dz) + 0.04); yl = Math.min(yl, y + 0.5); } // the mesh interpolates over ±1 cell; never float in gorges
        pos.push(p[k][0] + nx * w, yl, p[k][1] + nz * w, p[k][0] - nx * w, yl, p[k][1] - nz * w);
        uv.push(0, along * 0.35, 1, along * 0.35); silt.push(rv.silt ? 1 : 0, rv.silt ? 1 : 0);
        if (k) { const q = base + (k - 1) * 2; ind.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aSilt', new THREE.Float32BufferAttribute(silt, 1));
    geo.setIndex(ind); geo.computeVertexNormals();
    const lakeGeos = terr.water.lakes.map((L) => {
      const sh = new THREE.Shape(L.ring.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2); g.translate(0, L.level + 0.01, 0);
      const n = g.attributes.position.count; g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2).fill(0.5), 2)); g.setAttribute('aSilt', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
      return g;
    });
    const mat = new THREE.MeshStandardMaterial({ color: 0x1d4a5a, roughness: 0.08, metalness: 0, normalMap: normals, normalScale: new THREE.Vector2(0.3, 0.3), envMap: env, envMapIntensity: 0.8, transparent: true, depthWrite: false });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSilt; varying float vSilt; varying vec2 vRiverUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvSilt = aSilt; vRiverUv = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSilt; varying vec2 vRiverUv;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float edge = min(vRiverUv.x, 1.0 - vRiverUv.x) * 2.0; // 0 at the banks, 1 mid-stream
          vec3 wc = mix(vec3(0.08, 0.20, 0.23), vec3(0.44, 0.35, 0.20), vSilt * 0.85);
          wc = mix(mix(wc, vec3(0.40, 0.40, 0.33), 0.45), wc, smoothstep(0.05, 0.45, edge)); // shallows at the banks
          diffuseColor.rgb = pow(wc, vec3(2.2));
          diffuseColor.a = smoothstep(0.0, 0.3, edge) * 0.93;`);
    };
    mat.customProgramCacheKey = () => 'rivers5';
    const rivers = new THREE.Mesh(geo, mat);
    rivers.renderOrder = 3;
    const lakes = lakeGeos.length ? new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(lakeGeos), mat) : null;
    if (lakes) lakes.renderOrder = 3;
    return { rivers, lakes };
  };
})();
