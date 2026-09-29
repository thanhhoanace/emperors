// The Huai Nan scene of v2 (docs/design/v2-build.md §S, docs/design/v2-polish.md job 5): demo 1's 3D scene
// (docs/phases/v2-gameplay/demo1/src/hn-scene.js, the look the owner approved) on the normal world runtime, with the model kit
// of src/world/han-models.js. Drawn at Civ's scale: walled towns several km wide, an army a few large figures by arm round the
// general's banner on a base in the faction's colour, a battle's wings as blocks by lane × row over the real ground.
// Presentation only: it draws the View (and the Battle state) it is given; towns, names and rivers come from
// data/scenario/huainan.json (towns, seats, factions). The map lives: an army marches along a real path over the ground
// (valleys, roads, fords; a fleet on its river) with dust behind it, a siege pitches a camp round its town (palisade, tents,
// cook fires, smoke over the walls), a town that changes hands lowers one standard and raises the other.
//
//   const sc = await HuaiNanScene.create(rt, { data, width, height, quality })   rt = WorldRuntime.create({ …, hamlets: false })
//   sc.sync(view) · sc.pick(x, y) · sc.select(sel) · sc.targets(armyId, targets) · sc.focus(id) · sc.overview()
//   sc.battle.begin({ site, from, me, siege }) · .show(b, me) · .pickWing(x, y) · .end()
//   sc.loop(onFrame) · sc.stop() · sc.measure()      + sc.bind(el, { onTap }) for the camera gestures, sc.lanesAt(site, from)
//   sc.fly(to, ms) → Promise · sc.orbit(id, ms, o) → Promise · sc.path(from, to, arm) → [[x, z] …]   the camera and the roads,
//        for the season's playback, the intro, the ending and the watch mode: to = { t: [x, z], dist, az, el } (any part);
//        from / to a place id, an army id or [x, z]; arm 'land' | 'fleet'
//   sc.play: the season on the map, as src/world/huainan-map-play.js directs it (march, camp, clash, beat, rig, finish …)
// Loads after three r146 (+ BufferGeometryUtils, RoundedBoxGeometry), kit.js, terrain.js, terrain-real.js, world-runtime.js and
// han-models.js. The pure helpers (counts, labels, wing cells, paths) are exported for Node (tests/huainan-scene.test.mjs).
(function (root) {
  const S = {};
  const ARMS = ['bo', 'cung', 'ky', 'thuy'];
  // what each kind of ground does (shown on tap; the battle lanes use the same kinds)
  const GROUND = {
    water: { name: 'Sông, hồ', fx: 'Chỉ thuyền đi được. Bộ, kỵ phải qua bến.' },
    ford: { name: 'Bến sông', fx: 'Lội qua sông đánh −20%. Thuyền +15%.' },
    wood: { name: 'Rừng', fx: 'Kỵ −30%. Hỏa công đốt được.' },
    hill: { name: 'Đồi', fx: 'Giữ đồi thủ +25%. Kỵ lên dốc −15%.' },
    mountain: { name: 'Núi', fx: 'Giữ núi thủ +25%. Kỵ lên dốc −15%.' },
    open: { name: 'Đồng bằng', fx: 'Kỵ +30%.' },
    field: { name: 'Ruộng, làng', fx: 'Đồng bằng: kỵ +30%.' },
  };
  const LANE_NAME = { open: 'Đồng trống', ford: 'Bến sông', wood: 'Rừng thưa', hill: 'Đồi' }; // Battle.LANE_TEXT
  const REACH = { land: 36, fast: 45, fleet: 60 }; // one season, world units: foot 108 km, horse 135 km, boats on one river 180 km
  const FAR_MEN = { bo: 1800, cung: 800, ky: 900, thuy: 1200 }; // an army seen only by its arms: a few figures of each, no number behind them
  S.GROUND = GROUND; S.REACH = REACH;

  // ---------------------------------------------------------------- pure helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 3.600
  const total = (u) => ARMS.reduce((s, k) => s + ((u && u[k]) || 0), 0);
  S.fmt = fmt;
  // men of an army the player may read: ours exact, near ±20 % ("~3.600"), far nothing (units null)
  S.menOf = (a) => (a.units ? total(a.units) : null);
  S.countText = (a) => { const n = S.menOf(a); return n == null ? '' : (a.seen === 'near' ? '~' : '') + fmt(n); };
  // the men the figures are drawn from: the View's numbers, or, for a far army, a few of each arm it is known to have
  S.unitsOf = (a) => a.units || Object.fromEntries(ARMS.map((k) => [k, (a.arms || []).includes(k) ? FAR_MEN[k] : 0]));
  S.reachOf = (a) => { if (a.arm === 'fleet') return REACH.fleet; const u = S.unitsOf(a); return u.ky > total(u) * 0.5 ? REACH.fast : REACH.land; };
  const count = (n, per, max) => (n > 0 ? Math.max(1, Math.min(max, Math.round(n / per))) : 0); // as HanModels.count
  // how many figures of each arm an army is drawn with (the kit's own caps)
  S.figures = (u, fleet) => (fleet ? { thuy: count(u.thuy, 600, 4) || 1 } : { bo: count(u.bo, 600, 9), cung: count(u.cung, 400, 4), ky: count(u.ky, 450, 6), thuy: count(u.thuy, 600, 3) });
  S.armySig = (a) => [a.fid, a.arm, a.gen && a.gen.seal, JSON.stringify(S.figures(S.unitsOf(a), a.arm === 'fleet'))].join('|');
  // armies sharing a town fan out round it: slot 0 straight ahead, then alternately either side
  S.slotAngle = (k, spread = 0.72) => (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * spread : 0);
  // a battle wing: how many figures its block shows at most, and now (men / start of its size)
  S.wingCap = (w) => (w.arm === 'thuy' ? clamp(Math.ceil(w.start / 700), 1, 3) : clamp(Math.round(w.start / 180), 3, 12));
  S.wingShown = (w, cap) => (w.gone ? 0 : Math.max(1, Math.min(cap, Math.ceil((Math.max(0, w.men) / Math.max(1, w.start)) * cap))));
  // several wings on one lane and row stand side by side: slot 0 in the middle, then 1, -1, 2, …
  S.wingSlot = (n) => (n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) : 0);

  // ---------------------------------------------------------------- paths (pure): A* on a cost grid, then straightened and rounded
  // cost: nx × nz cells (a march pays the mean of the two cells it steps between, × √2 on a diagonal); minCost, the cheapest
  // cell, keeps the octile heuristic admissible. → the cells from s to goal, or null when goal cannot be reached
  S.astar = (cost, nx, nz, s, goal, minCost = 1) => {
    const N = nx * nz, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N);
    const hk = [], hf = [];
    const push = (i, f) => { hk.push(i); hf.push(f); let k = hk.length - 1; while (k) { const p = (k - 1) >> 1; if (hf[p] <= hf[k]) break; [hk[p], hk[k]] = [hk[k], hk[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p; } };
    const pop = () => {
      const top = hk[0], li = hk.pop(), lf = hf.pop();
      if (hk.length) {
        hk[0] = li; hf[0] = lf; let k = 0;
        for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hk.length && hf[l] < hf[m]) m = l; if (r < hk.length && hf[r] < hf[m]) m = r; if (m === k) break; [hk[m], hk[k]] = [hk[k], hk[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; }
      }
      return top;
    };
    const gx = goal % nx, gz = (goal / nx) | 0;
    const h = (i) => { const dx = Math.abs((i % nx) - gx), dz = Math.abs(((i / nx) | 0) - gz); return (Math.max(dx, dz) + 0.41421 * Math.min(dx, dz)) * minCost; };
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41421], [1, -1, 1.41421], [-1, 1, 1.41421], [-1, -1, 1.41421]];
    g[s] = 0; push(s, h(s));
    while (hk.length) {
      const i = pop(); if (shut[i]) continue; shut[i] = 1; if (i === goal) break;
      const x = i % nx, z = (i / nx) | 0;
      for (const [dx, dz, w] of D) {
        const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= nx || Z >= nz) continue;
        const j = Z * nx + X; if (shut[j]) continue;
        const ng = g[i] + (cost[i] + cost[j]) * 0.5 * w;
        if (ng < g[j]) { g[j] = ng; from[j] = i; push(j, ng + h(j)); }
      }
    }
    if (goal !== s && from[goal] < 0) return null;
    const out = [goal]; for (let i = goal; i !== s; ) { i = from[i]; out.push(i); }
    return out.reverse();
  };
  const d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  S.pathLen = (pts) => { let L = 0; for (let k = 1; k < pts.length; k++) L += d2(pts[k - 1], pts[k]); return L; };
  // a path to walk: its length and the point a fraction u of the way along it, with the way it heads there ([x, z, dx, dz])
  S.track = (pts) => {
    const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + d2(pts[k - 1], pts[k]));
    const L = cum[cum.length - 1] || 0;
    const at = (u) => {
      if (pts.length < 2) return pts.length ? [pts[0][0], pts[0][1], 1, 0] : [0, 0, 1, 0];
      const d = clamp(u, 0, 1) * L; let lo = 1, hi = pts.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m; }
      const a = pts[lo - 1], b = pts[lo], l = cum[lo] - cum[lo - 1], r = l > 1e-9 ? (d - cum[lo - 1]) / l : 0;
      return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, l > 1e-9 ? (b[0] - a[0]) / l : 1, l > 1e-9 ? (b[1] - a[1]) / l : 0];
    };
    return { pts, cum, L, at };
  };
  // the path without the part within d of its end (an army halts short of what it attacks); cutStart likewise at the start
  S.cutEnd = (pts, d) => {
    const end = pts[pts.length - 1];
    for (let k = pts.length - 1; k > 0; k--) {
      const a = pts[k - 1], da = d2(a, end);
      if (da >= d) { const b = pts[k], db = d2(b, end), r = da - db > 1e-9 ? (da - d) / (da - db) : 0; return pts.slice(0, k).concat([[a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]]); }
    }
    return [pts[0].slice(), pts[0].slice()];
  };
  S.cutStart = (pts, d) => S.cutEnd(pts.slice().reverse(), d).reverse();
  // corners cut (Chaikin), the two ends kept
  S.chaikin = (pts, n = 2) => {
    let p = pts;
    for (let it = 0; it < n && p.length > 2; it++) {
      const q = [p[0]];
      for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      q.push(p[p.length - 1]); p = q;
    }
    return p;
  };
  // points at most `step` apart (a ribbon laid over the ground follows it between them)
  S.resample = (pts, step) => {
    const out = pts.length ? [pts[0]] : [];
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], n = Math.max(1, Math.ceil(d2(a, b) / step)); for (let i = 1; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]); }
    return out;
  };
  // straight runs where the ground along them costs no more than the stretch of path they replace (so a road, a valley, a
  // ford stays; a grid's staircase goes). costAt(x, z) → the cost of the ground there
  S.shortcut = (pts, costAt, step = 0.5) => {
    if (pts.length < 3) return pts.slice();
    const seg = (a, b) => { const L = d2(a, b), n = Math.max(1, Math.ceil(L / step)); let c = 0; for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; c += costAt(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); } return (c * L) / n; };
    const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + seg(pts[k - 1], pts[k]));
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) {
      let best = i + 1;
      for (let j = Math.min(pts.length - 1, i + 48); j > i + 1; j--) if (seg(pts[i], pts[j]) <= (cum[j] - cum[i]) * 1.02 + 1e-6) { best = j; break; }
      out.push(pts[best]); i = best;
    }
    return out;
  };
  // days on the road, for an order's badge: foot 15 km a day, horse and boats 30 (a season's reach is 108–180 km)
  S.marchDays = (km, arm, fast) => Math.max(1, Math.round(km / (arm === 'fleet' || fast ? 30 : 15)));
  const VERB = { move: 'Tới', siege: 'Vây', attack: 'Đánh', ask: 'Đánh' };
  S.orderBadge = (intent, days) => (VERB[intent] || 'Tới') + ' · ' + days + ' ngày';
  // the shortest turn from angle a to angle b
  S.turn = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };

  S.create = async function (rt, o) {
    const T = THREE, terr = rt.terr, scene = rt.scene, MC = rt.MC, camera = rt.camera, doc = document;
    const data = o.data, W = o.width || rt.size.width, H = o.height || rt.size.height;
    const FAC = data.factions || {};
    const COLOR = {}, GLYPH = {}, CSS = {};
    for (const [k, f] of Object.entries(FAC)) { COLOR[k] = parseInt(f.color.slice(1), 16); GLYPH[k] = f.glyph; CSS[k] = f.color; }
    const Qn = () => rt.quality || o.quality || null; // the runtime's tier object: a run-time drop mutates it
    const tierName = () => (Qn() && Qn().tier) || 'high';
    const LOW = tierName() === 'low';
    const KM = (rt.world && rt.world.meta && rt.world.meta.projection && rt.world.meta.projection.kmPerUnit) || 3;
    const colored = (m) => { if (m.isInstancedMesh && !m.instanceColor) m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3).fill(1), 3); return m; }; // r146: every InstancedMesh on the kit's material carries instanceColor from creation
    const recv = (m) => Terrain.receiveBaked(m, terr, 0.8);
    const HM = HanModels.create({ recv, renderer: rt.renderer, colors: COLOR });
    const seedOf = (id) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1;
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    const backOut = (u) => { const c = 1.5; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

    // ------------------------------------------------------------ places: the data's towns (a runtime seat or a lon/lat) and the seats round them
    // a lon/lat that falls in a river (the map's rivers are generalised: Lịch Dương on the Yangtze) moves to the nearest bank
    const bank = (x, z) => {
      if (terr.riverSD(x, z) >= 1.4) return [x, z];
      for (let r = 0.5; r <= 9; r += 0.5) for (let k = 0; k < 32; k++) { const a = (k / 32) * 6.2832, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (terr.riverSD(px, pz) >= 1.4) return [px, pz]; }
      return [x, z];
    };
    const place = {};
    for (const t of data.towns) {
      let x, z;
      if (t.seat && MC[t.seat]) { x = MC[t.seat].x; z = MC[t.seat].z; } else [x, z] = bank(...terr.toWorld(t.lonlat[0], t.lonlat[1]));
      place[t.id] = { id: t.id, name: t.name, x, z, y: terr.h(x, z), seat: t.seat || null, kind: 'town', river: t.river || null, terrain: t.terrain || '', size: t.size || (t.seat ? 5.2 : 4.4) };
    }
    const owners0 = rt.owners();
    for (const s of data.seats || []) { const c = MC[s.id]; if (c) place[s.id] = { id: s.id, name: s.name, x: c.x, z: c.z, y: c.y, seat: s.id, kind: 'seat', owner: s.owner !== undefined ? s.owner : owners0[s.id] || null, size: 2.4 }; }
    const TOWNS = data.towns.map((t) => place[t.id]);
    // the runtime draws the seats the towns stand on (Chung Ly) and flies v1's colours over the rest: the scene draws both itself
    const own = Object.assign({}, owners0);
    for (const p of Object.values(place)) if (p.seat) delete own[p.seat];
    rt.setOwners(own);
    rt.hideCities(TOWNS.filter((p) => p.seat).map((p) => p.seat));
    // the box of the play area (towns), for the trees, the camera limits and the overview
    const box = TOWNS.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), z0: Math.min(b.z0, p.z), z1: Math.max(b.z1, p.z) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
    const mid = [(box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2];

    // ------------------------------------------------------------ ground: what kind it is (terrain data of the map)
    // (river banks are steep, so height is judged against the lowest ground 5 units around)
    const inWater = (x, z) => terr.riverSD(x, z) < 0;
    const terrainAt = (x, z) => {
      const sd = terr.riverSD(x, z);
      if (sd < 0) return 'water';
      if (sd < 2) return 'ford';
      const h = terr.h(x, z), e = 0.8, slope = Math.hypot(terr.h(x + e, z) - terr.h(x - e, z), terr.h(x, z + e) - terr.h(x, z - e)) / (2 * e);
      let low = h; for (let k = 0; k < 8; k++) low = Math.min(low, terr.h(x + Math.cos(k * 0.785) * 5, z + Math.sin(k * 0.785) * 5));
      if (h > 0.9 || slope > 0.4) return 'mountain';
      if (slope > 0.16 || h - low > 0.16) return 'hill';
      const f = terr.forestAt ? terr.forestAt(x, z) : 0;
      if (f > 0.45) return 'wood';
      return terr.fieldAt && terr.fieldAt(x, z) > 0.5 ? 'field' : 'open';
    };
    // the water level of a river near (x, z): its polyline points carry it (the fleets float there)
    const riverPts = [];
    for (const rv of terr.water.rivers) for (const p of rv.pts) if (p[0] > box.x0 - 40 && p[0] < box.x1 + 40 && p[1] > box.z0 - 40 && p[1] < box.z1 + 40) riverPts.push(p);
    const waterY = (x, z) => { let best = 1e9, y = 0.3; for (const p of riverPts) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; y = p[2]; } } return y; };
    // what a figure stands on: the ground, or the water's face where it wades a ford
    const footY = (x, z) => { const h = terr.h(x, z); return inWater(x, z) ? Math.max(h, waterY(x, z) - 0.04) : h; };
    // the direction of an attack on `site` from `from` ([x, z], a place id, or nothing: the first town)
    const fromPt = (from) => (Array.isArray(from) ? from : typeof from === 'string' && place[from] ? [place[from].x, place[from].z] : [TOWNS[0].x, TOWNS[0].z]);
    const axisOf = (siteId, from) => {
      const P = place[siteId], f = fromPt(from); let u = [P.x - f[0], P.z - f[1]]; const L = Math.hypot(u[0], u[1]);
      u = L > 0.5 ? [u[0] / L, u[1] / L] : [-0.85, 0.5];
      return { P, u, v: [-u[1], u[0]] };
    };
    // the three lanes of a battle at a site attacked from a point: the ground where each lane meets decides its kind (Battle.create's opts.lanes)
    const lanesAt = (siteId, from) => {
      const { P, u, v } = axisOf(siteId, from);
      return [0, 1, 2].map((l) => {
        const kinds = {};
        for (const a of [-4.5, -3, -1.5]) for (const b of [-0.6, 0, 0.6]) { const off = (l - 1) * 2.6 + b; const k = terrainAt(P.x + u[0] * a + v[0] * off, P.z + u[1] * a + v[1] * off); kinds[k] = (kinds[k] || 0) + 1; }
        const has = (k, n) => (kinds[k] || 0) >= n;
        return has('mountain', 2) || (kinds.hill || 0) + (kinds.mountain || 0) >= 4 ? 'hill' : (kinds.water || 0) + (kinds.ford || 0) >= 3 ? 'ford' : has('wood', 3) ? 'wood' : 'open';
      });
    };

    // ------------------------------------------------------------ standards
    const flagTex = {};
    const flagMat = (fid) => {
      if (!flagTex[fid]) {
        const cv = doc.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
        g.fillStyle = CSS[fid] || '#8a8275'; g.fillRect(0, 0, 64, 96);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 84, 64, 12);
        if (GLYPH[fid]) { g.fillStyle = '#f3ecdc'; g.font = 'bold 40px "Noto Serif TC","Noto Serif CJK TC","Noto Serif CJK SC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(GLYPH[fid], 32, 42); }
        const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
        flagTex[fid] = HM.look(new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.85 }));
      }
      return flagTex[fid];
    };
    const poleMat = new T.MeshStandardMaterial({ color: 0x3b3129, roughness: 0.8 }), finialMat = new T.MeshStandardMaterial({ color: 0xd0a64c, roughness: 0.35, metalness: 0.6 });
    // a pole and a flag with the owner's glyph; the flag's pivot turns to the camera every frame (a town's change of hands
    // runs the pivot down the pole and up again: userData { piv, cloth, h, s })
    const standard = (fid, h, s) => {
      const g = new T.Group();
      const pole = new T.Mesh(new T.CylinderGeometry(0.03 * s, 0.04 * s, h, 7), poleMat); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
      const tip = new T.Mesh(new T.ConeGeometry(0.06 * s, 0.2 * s, 7), finialMat); tip.position.y = h + 0.1 * s; g.add(tip);
      const piv = new T.Group(); piv.position.y = h; piv.userData.flag = true; g.add(piv);
      const cg = new T.PlaneGeometry(0.7 * s, 1.0 * s, 8, 1), cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) / s + 0.35) * 9) * 0.03 * s); cg.computeVertexNormals();
      const cloth = new T.Mesh(cg, flagMat(fid)); cloth.position.set(0.35 * s, -0.5 * s, 0); cloth.castShadow = true; piv.add(cloth);
      g.userData = { piv, cloth, h, s };
      return g;
    };
    const freeStd = (g) => g.traverse((x) => { if (x.isMesh && x.geometry) x.geometry.dispose(); });

    // ------------------------------------------------------------ trees and villages at the towns' scale: groves and lone trees on dry, open ground
    const trees = { meshes: [], count: 0 };
    {
      const dens = { high: 0.13, mid: 0.11, low: 0.06 }[tierName()] || 0.1; // trees per unit², more where the phase-1 canopy stands
      const R = 26, x0 = box.x0 - R, z0 = box.z0 - R, ww = box.x1 - box.x0 + 2 * R, dd = box.z1 - box.z0 + 2 * R, want = Math.min(4200, Math.round(ww * dd * dens));
      const pts = { leaf: [], pine: [] }, m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), UPV = new T.Vector3(0, 1, 0);
      let sd = 97; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      // groves where a smooth value noise is high, crowns over the phase-1 forest canopy, a few lone trees elsewhere
      const hs = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
      const vn = (x, z) => { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hs(i, j) * (1 - u) + hs(i + 1, j) * u) * (1 - v) + (hs(i, j + 1) * (1 - u) + hs(i + 1, j + 1) * u) * v; };
      const grove = (x, z) => 0.65 * vn(x / 9, z / 9) + 0.35 * vn(x / 3.5 + 7, z / 3.5);
      const near = (x, z, rt2, rs) => Object.values(place).some((p) => Math.hypot(p.x - x, p.z - z) < (p.kind === 'town' ? rt2 : rs));
      for (let k = 0, tries = Math.round(ww * dd * 2.6); k < tries && pts.leaf.length + pts.pine.length < want; k++) {
        const x = x0 + rnd() * ww, z = z0 + rnd() * dd, lift = terr.canopyLift ? terr.canopyLift(x, z) : -1, g = grove(x, z);
        if (rnd() > (lift > 0.04 ? 0.7 : g > 0.7 ? 0.55 : g > 0.62 ? 0.12 : 0.008)) continue;
        if (terr.riverSD(x, z) < 0.8 || near(x, z, 6, 3)) continue;
        const h = terr.h(x, z), s = 1.4 + rnd() * 0.9, kind = h > 0.5 || rnd() < 0.2 ? 'pine' : 'leaf';
        pts[kind].push([x, h + (lift > 0.04 ? Math.max(0, lift - 0.3 * s) : 0), z, s, rnd() * 6.28]);
      }
      // villages where the phase-1 map has its hamlets, at the towns' scale
      const vil = [[], [], []];
      for (const hm of terr.hamlets || []) {
        if (hm.x < x0 || hm.x > x0 + ww || hm.z < z0 || hm.z > z0 + dd || terr.riverSD(hm.x, hm.z) < 1.2 || near(hm.x, hm.z, 7, 4)) continue;
        vil[Math.floor(rnd() * 3)].push([hm.x, terr.h(hm.x, hm.z), hm.z, 1.9 + rnd() * 0.4, Math.round(rnd() * 4) * (Math.PI / 2) + (rnd() - 0.5) * 0.3]);
      }
      const put = (geo, L, dy, yy) => {
        const m = colored(new T.InstancedMesh(geo, HM.mat, L.length));
        L.forEach(([x, y, z, s, r], i) => m.setMatrixAt(i, m4.compose(ps.set(x, y - dy, z), q.setFromAxisAngle(UPV, r), sc.set(s, s * yy(i), s))));
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); trees.meshes.push(m); trees.count += L.length;
      };
      vil.forEach((L, v) => { if (L.length) put(HM.hamlet(v + 1), L, 0.03, () => 1); });
      for (const kind of ['leaf', 'pine']) if (pts[kind].length) put(HM.tree(kind, kind === 'leaf' ? 3 : 1, true), pts[kind], 0.02, (i) => 0.85 + (i % 5) * 0.07);
    }

    // ------------------------------------------------------------ labels: sprites of a second scene drawn after the lens (no blur, no grain), a constant size on screen
    const hud = new T.Scene(), labels = new Set(), art = new Map();
    const FONT = '"Noto Sans","Noto Serif","DejaVu Sans",system-ui,sans-serif';
    // a pill of text: dark, translucent, a bar in the faction's colour on its left, a gold outline when it is ours (red: a town under siege)
    const labelArt = (text, st) => {
      const key = text + '|' + JSON.stringify(st);
      if (art.has(key)) return art.get(key);
      const dpr = clamp(rt.renderer.getPixelRatio(), 1, 3), px = st.px || 12, padX = 6, bar = st.bar ? 4 : 0;
      const g0 = doc.createElement('canvas').getContext('2d'); g0.font = (st.bold === false ? '' : '700 ') + px + 'px ' + FONT;
      const w = Math.ceil(g0.measureText(text).width) + padX * 2 + bar, h = px + 8;
      const cv = doc.createElement('canvas'); cv.width = Math.ceil(w * dpr); cv.height = Math.ceil(h * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
      g.globalAlpha = st.dim ? 0.55 : 1;
      rr(0.5, 0.5, w - 1, h - 1, 5); g.fillStyle = st.bg || 'rgba(24,19,14,0.74)'; g.fill();
      if (st.bar) { g.save(); rr(0.5, 0.5, w - 1, h - 1, 5); g.clip(); g.fillStyle = st.bar; g.fillRect(0, 0, bar, h); g.restore(); }
      rr(0.5, 0.5, w - 1, h - 1, 5); g.lineWidth = st.mine || st.ring ? 1.6 : 1; g.strokeStyle = st.ring || (st.mine ? '#f2d27a' : 'rgba(255,240,210,0.22)'); g.stroke();
      g.fillStyle = st.color || '#f3ecdc'; g.font = (st.bold === false ? '' : '700 ') + px + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, bar + (w - bar) / 2, h / 2 + 0.5);
      const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
      const e = { mat: new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }), w, h };
      art.set(key, e);
      return e;
    };
    // layer: 'map' (hidden in a battle) or 'battle'; anchor() → the world point the pill sits on (below it with st.below)
    const newLabel = (anchor, layer, prio = 1) => {
      const L = { anchor, layer, prio, on: true, w: 1, h: 1, key: '', sprite: new T.Sprite() };
      L.sprite.frustumCulled = false; L.sprite.renderOrder = 10; L.sprite.visible = false; hud.add(L.sprite); labels.add(L);
      L.set = (text, st) => { if (!text) { L.on = false; return L; } const key = text + '|' + JSON.stringify(st); if (key !== L.key) { L.key = key; const e = labelArt(text, st); L.sprite.material = e.mat; L.w = e.w; L.h = e.h; L.below = !!st.below; L.sprite.center.set(0.5, L.below ? 1 : 0); } L.on = !!text; return L; };
      L.free = () => { hud.remove(L.sprite); labels.delete(L); };
      return L;
    };

    // ------------------------------------------------------------ towns: one walled model each, rebuilt when its lũy, its damage or its fire changes
    const root = new T.Group(); scene.add(root);
    const towns = {}, armies = {};
    let view = null, dirty = true;
    const BT = { on: false, g: null, wings: {}, center: null, u: [1, 0], v: [0, 1], fx: [], me: 'A', walls: [], lanes: [], sel: null, labels: [] };
    const zoomK = () => clamp(cam.dist / 45, 1, 4);
    const townScale = () => Math.pow(zoomK(), 0.7);
    for (const id of Object.keys(place)) {
      const p = place[id], g = new T.Group(); g.position.set(p.x, p.y, p.z); root.add(g);
      const t = towns[id] = { g, std: null, fid: undefined, key: '', model: null, name: null, pend: undefined, beating: false, walls0: null, siege: false };
      t.name = newLabel(() => { const ts = townScale(); return [p.x, p.y + (p.kind === 'town' ? 4.5 * ts : 4.2), p.z]; }, 'map', p.kind === 'town' ? 0 : 1);
    }
    const nameStyle = (id) => { const p = place[id], t = towns[id]; return { px: p.kind === 'town' ? 13 : 11, bar: t.fid ? CSS[t.fid] : '#8a8275', dim: p.kind === 'seat', ring: t.siege ? '#e5735a' : undefined }; };
    // damage 0..1 (the walls lost since the town was first seen) and a fire (stormed last season) go to the kit when it draws them
    // (HM.town's damage / burnt, docs/design/v2-polish.md job 6); the scene's smoke says the same either way
    const setModel = (id, level, dmg, burnt) => {
      const t = towns[id], p = place[id], key = level + '|' + dmg + '|' + (burnt ? 1 : 0);
      if (key === t.key) return;
      if (t.model) t.g.remove(t.model); // the geometry is cached by the model kit
      t.model = HM.town({ level, seed: seedOf(id), size: p.size, damage: dmg, burnt: !!burnt });
      t.g.add(t.model); t.key = key; t.model.visible = !(BT.on && BT.siege && BT.site === id); t.model.scale.setScalar(townScale());
    };
    const setOwner = (id, fid) => {
      const t = towns[id], p = place[id];
      if (t.std) { t.g.remove(t.std); freeStd(t.std); }
      t.fid = fid; t.pend = undefined; t.std = fid ? standard(fid, p.kind === 'seat' ? 3.2 : 3.6, p.kind === 'seat' ? 1.3 : 1.7) : null;
      if (t.std) t.g.add(t.std);
      t.name.set(p.name, nameStyle(id));
    };
    // with holdBeats (the season's playback is on) a town that changed hands keeps its old standard (and its siege camp, and the
    // winners outside) until its beat plays it (sc.play.beat) or the page moves on (sc.play.flushBeats)
    let holdBeats = false;
    const setTown = (id, fid, level, dmg, burnt) => {
      const t = towns[id], p = place[id];
      if (p.kind === 'town') setModel(id, level, dmg, burnt);
      if (fid === t.fid) { if (t.pend !== undefined) t.pend = undefined; return; }
      if (holdBeats && p.kind === 'town' && t.fid && fid && !t.beating) t.pend = fid;
      else if (!t.beating) setOwner(id, fid);
    };

    // ------------------------------------------------------------ armies: Civ-style figures, scaled with the camera distance
    const ringGeo = new T.RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2);
    const ringMat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
    const selRing = new T.Mesh(ringGeo, ringMat(0xf2d27a, 0.95)); selRing.visible = false; selRing.renderOrder = 6; root.add(selRing);
    const hoverRing = new T.Mesh(ringGeo, ringMat(0xfff6e0, 0.5)); hoverRing.visible = false; hoverRing.renderOrder = 6; root.add(hoverRing);
    const tgtRings = [];
    const buildArmy = (a) => {
      const g = HM.army({ fid: a.fid, fleet: a.arm === 'fleet', seal: (a.gen && a.gen.seal) || GLYPH[a.fid], ...S.unitsOf(a) });
      g.traverse(colored); g.userData.id = a.id; return g;
    };
    const freeArmy = (g) => g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); else if (x.isMesh && x.geometry) x.geometry.dispose(); });
    const ownerIn = (v, id) => (place[id] && place[id].kind === 'town' && v ? (v.towns.find((t) => t.id === id) || {}).owner : place[id] && place[id].owner) || null;
    const hostile = (fid, owner) => !!owner && owner !== fid;
    // where a fleet lies: the nearest, deepest water round its town (found once; the k-th fleet takes the k-th spot), bows along the river
    const spots = {};
    const waterSpots = (id) => {
      if (spots[id]) return spots[id];
      const p = place[id], cand = [], out = [];
      for (let r = p.size / 2 + 0.7; r < 14; r += 0.4) for (let k = 0; k < 36; k++) {
        const a = (k / 36) * 6.2832, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, sd = terr.riverSD(x, z);
        if (sd < -0.1) cand.push({ x, z, cost: r + 5 * (sd + 0.5) });
      }
      cand.sort((a, b) => a.cost - b.cost);
      for (const c of cand) if (out.length < 4 && out.every((s) => Math.hypot(s.x - c.x, s.z - c.z) > 2.8)) {
        const e = 0.6, gx = terr.riverSD(c.x + e, c.z) - terr.riverSD(c.x - e, c.z), gz = terr.riverSD(c.x, c.z + e) - terr.riverSD(c.x, c.z - e), L = Math.hypot(gx, gz);
        let tx = L > 1e-4 ? -gz / L : 1, tz = L > 1e-4 ? gx / L : 0; // along the channel, the way that leads to the middle of the play area
        if (tx * (mid[0] - c.x) + tz * (mid[1] - c.z) < 0) { tx = -tx; tz = -tz; }
        out.push({ x: c.x, z: c.z, face: Math.atan2(tz, tx) });
      }
      return (spots[id] = out);
    };
    // the nearest town of `pred` from a place, as an angle
    const dirTo = (p, pred) => {
      let best = null;
      for (const q of TOWNS) if (q !== p && pred(q)) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (!best || d < best.d) best = { d, a: Math.atan2(q.z - p.z, q.x - p.x) }; }
      return best ? best.a : Math.atan2(mid[1] - p.z, mid[0] - p.x);
    };
    // every army's stand in a View: at its town on the side of the nearest hostile town (besieging: on the side it came from,
    // facing the town). The stands grow with the zoom (the figures do)
    const standsFor = (v) => {
      const by = {}, out = {};
      for (const a of v.armies) {
        const site = a.besieging || a.at;
        if (site && place[site]) (by[site] = by[site] || []).push(a);
        else if (a.x != null && a.z != null) out[a.id] = { x: a.x, z: a.z, face: a.face || 0 }; // on the road: the page says where
      }
      const ts = townScale(), s = markerScale();
      for (const [site, list] of Object.entries(by)) {
        const p = place[site]; if (!p) continue;
        list.sort((a, b) => (a.arm === 'fleet') - (b.arm === 'fleet') || (a.besieging ? 0 : 1) - (b.besieging ? 0 : 1) || (a.id < b.id ? -1 : 1));
        let kl = 0, kf = 0;
        for (const a of list) {
          const r = ((armies[a.id] && armies[a.id].g.userData.r) || 1.4) * s;
          if (a.arm === 'fleet') {
            const sp = waterSpots(site), w = sp[Math.min(kf++, Math.max(0, sp.length - 1))];
            out[a.id] = w ? { x: w.x, z: w.z, face: w.face } : { x: p.x + p.size / 2 + r, z: p.z + r, face: 0 }; // no water round the town: beside it
            continue;
          }
          const foe = dirTo(p, (q) => hostile(a.fid, ownerIn(v, q.id))), home = dirTo(p, (q) => ownerIn(v, q.id) === a.fid);
          const ang = (a.besieging ? home : foe) + S.slotAngle(kl++), off = (p.kind === 'town' ? (p.size / 2) * 1.02 * ts : 2.2) + r * 0.9 + 0.5;
          const x = p.x + Math.cos(ang) * off, z = p.z + Math.sin(ang) * off;
          out[a.id] = { x, z, face: a.besieging ? Math.atan2(p.z - z, p.x - x) : foe }; // a besieger faces the town, a garrison the nearest foe
        }
      }
      return out;
    };
    const posAt = (a, st) => {
      if (a.arm === 'fleet' && st) return [st.x, waterY(st.x, st.z) + 0.02, st.z];
      return [st.x, terr.h(st.x, st.z), st.z];
    };
    const sync = (v, opt = {}) => {
      view = v; ordersOff = false;
      // towns: owner (held back for its beat while the playback is on), lũy, damage, fire, siege
      const burnt = new Set(((v.report && v.report.taken) || []).filter((x) => !x.siege).map((x) => x.town));
      const bes = {};
      for (const a of v.armies || []) if (a.besieging && place[a.besieging]) (bes[a.besieging] = bes[a.besieging] || []).push(a);
      for (const id of Object.keys(towns)) {
        const p = place[id], vt = p.kind === 'town' ? v.towns.find((t) => t.id === id) : null, t = towns[id];
        if (vt) t.walls0 = Math.max(t.walls0 ?? vt.walls, vt.walls);
        const dmg = vt && t.walls0 > 0 ? Math.round(clamp((t.walls0 - vt.walls) / t.walls0, 0, 1) * 4) / 4 : 0;
        t.siege = !!bes[id]; t.burnt = burnt.has(id);
        setTown(id, p.kind === 'town' ? (vt && vt.owner) || null : p.owner, p.kind === 'town' ? (vt ? vt.walls : 1) : -1, dmg, t.burnt);
        if (t.fid !== undefined) t.name.set(p.name, nameStyle(id));
      }
      const seen = new Set();
      for (const a of v.armies || []) {
        seen.add(a.id);
        let m = armies[a.id];
        if (!m || m.sig !== S.armySig(a)) {
          if (m) { root.remove(m.g); freeArmy(m.g); }
          const keep = m; // a new look (more men, another arm) keeps the army's place, march and label
          m = armies[a.id] = { g: buildArmy(a), sig: S.armySig(a), a, label: keep ? keep.label : newLabel(() => armyAnchor(a.id), 'map', 2), to: keep ? keep.to : null, moving: keep ? keep.moving : null, site: keep ? keep.site : null, face: keep ? keep.face : 0, away: keep ? keep.away : false, hold: keep ? keep.hold : null };
          if (keep) { m.g.position.copy(keep.g.position); m.g.rotation.copy(keep.g.rotation); }
          root.add(m.g); m.g.visible = !BT.on;
        }
        m.a = a; m.animate = opt.animate !== false;
        m.kind = (v.moves || []).some((x) => x.id === a.id && x.retreat && x.to === a.at) ? 'retreat' : 'march';
        // the winners of a town whose standard waits for its beat stay outside until it is raised
        const site = a.besieging || a.at, tw = site && towns[site];
        if (tw && !a.besieging && (tw.pend === a.fid || tw.beating === a.fid)) m.hold = site;
        const mine = a.fid === v.me;
        m.label.set(S.countText(a), { px: 11, bar: CSS[a.fid], mine, below: false });
      }
      for (const id of Object.keys(armies)) if (!seen.has(id)) { root.remove(armies[id].g); freeArmy(armies[id].g); armies[id].label.free(); delete armies[id]; }
      placeArmies(true);
      // camps: one round every town under siege; one whose siege is over comes down (on the town's beat when it changed hands)
      const st = standsFor(v);
      for (const [tid, c] of Object.entries(camps)) {
        const on = bes[tid] && bes[tid].some((a) => a.fid === c.fid);
        if (on || c.state === 'striking') continue;
        if (towns[tid].pend !== undefined || towns[tid].beating) c.hold = true; else strikeCamp(tid);
      }
      for (const [tid, list] of Object.entries(bes)) {
        const c = camps[tid];
        if (c && c.state !== 'striking' && c.fid === list[0].fid) continue;
        const s0 = st[list[0].id], p = place[tid], home = s0 ? Math.atan2(s0.z - p.z, s0.x - p.x) : 0;
        pitchCamp(tid, list[0].fid, list.reduce((n, a) => n + (S.menOf(a) || 3000), 0), home, { ms: opt.animate === false ? 0 : 1300 });
      }
      drawOrders(); scaleMarkers(); dirty = true;
    };
    // an army stands where its View puts it. After a new View it walks there along the ground when it changed town, when the
    // playback left it parked elsewhere (a battle line, a stop on the road) or when its stand moved; otherwise it just stands.
    // While the camera moves (fresh = false) a standing army keeps to its stand as the stands grow with the zoom.
    const placeArmies = (fresh) => {
      if (!view) return;
      const st = standsFor(view);
      for (const [id, m] of Object.entries(armies)) {
        const s = st[id]; if (!s) continue;
        const to = posAt(m.a, s), first = !m.to, site = m.a.besieging || m.a.at, moved = !first && Math.hypot(to[0] - m.to[0], to[2] - m.to[2]) > 0.8;
        const cur = [m.g.position.x, m.g.position.z], off = Math.hypot(to[0] - cur[0], to[2] - cur[1]), changed = site !== m.site;
        m.to = to; m.face = s.face; m.site = site;
        const stand = () => { m.g.position.set(to[0], to[1], to[2]); m.g.rotation.set(0, -s.face, 0); m.away = false; };
        if (first) { stand(); continue; }
        if (m.hold) continue; // the winners wait for their town's standard
        if (m.moving) { if (fresh && moved && m.moving.end === 'stand' && m.animate && !BT.on) march(id, pathXZ(cur, [to[0], to[2]], m.a.arm)); continue; }
        if (!fresh) { if (!m.away) stand(); continue; }
        if (m.animate && !BT.on && off > 0.8 && (changed || m.away || moved)) march(id, pathXZ(cur, [to[0], to[2]], m.a.arm), changed || m.away ? { kind: m.kind } : { ms: 800 });
        else stand();
      }
    };

    // ------------------------------------------------------------ camera
    const cam = { t: mid.slice(), dist: 100, az: 0.3, el: 0.88 };
    // the fine ground is built round these points (the runtime: fine to 18 units, half-fine to 90): the towns, and the seats close enough to show
    const boxDist = (p) => Math.hypot(Math.max(box.x0 - p.x, 0, p.x - box.x1), Math.max(box.z0 - p.z, 0, p.z - box.z1));
    // (the low tier: one point in the middle: ground at the half-fine step over the whole play area, ~0.2 M triangles fewer)
    const REGION = LOW ? [mid.slice()] : Object.values(place).filter((p) => p.kind === 'town' || boxDist(p) < (o.seatReach ?? 70)).map((p) => [p.x, p.z]);
    const PAD = 28;
    const clampT = () => { cam.t[0] = clamp(cam.t[0], box.x0 - PAD, box.x1 + PAD); cam.t[1] = clamp(cam.t[1], box.z0 - PAD, box.z1 + PAD); };
    const FOV = 34, DMIN = 8, DMAX = 300; // beyond ~330 the runtime switches to its whole-country level of detail: the scene stays in the region's
    // The runtime builds its near ground over its whole 768 × 896 core, nearly all of it at the coarsest step: ~0.6 M triangles and
    // 4 s that no view of the region uses. It reads terr.G when it builds, so the first build (apply, below) is over the region ± GM
    // and the runtime's coarse set (the whole core, step 3, ~0.3 M) takes over where the view would look past that edge.
    const GM = o.groundMargin ?? 170, CS = 12, G0 = terr.G;
    const clipG = (() => {
      const x0 = Math.max(G0.x0, G0.x0 + Math.floor((box.x0 - GM - G0.x0) / CS) * CS), z0 = Math.max(G0.z0, G0.z0 + Math.floor((box.z0 - GM - G0.z0) / CS) * CS);
      const x1 = Math.min(G0.x0 + G0.w, G0.x0 + Math.ceil((box.x1 + GM - G0.x0) / CS) * CS), z1 = Math.min(G0.z0 + G0.d, G0.z0 + Math.ceil((box.z1 + GM - G0.z0) / CS) * CS);
      return Object.assign({}, G0, { x0, z0, w: x1 - x0, d: z1 - z0 });
    })();
    // the runtime's coarse ground and canopy: its first two scene children (Terrain.meshes of the far set), hidden in near mode;
    // with the horizon ring and the all-China mesh (children 3 and 4) they are the ground past the near set. Where the near set
    // fills the view, the ring and the China mesh lie under the core, unseen: ~0.13 M triangles saved.
    const farSet = (() => { const [g, c, out, cn] = scene.children; return g && c && out && g.isMesh && c.isMesh && g.material === out.material && c.material.userData && c.material.userData.uniforms && c.material.userData.uniforms.uCrownK ? [g, c, out, cn && cn.isGroup ? cn : null] : null; })();
    // how far from the target the view sees ground: the top edge of the frame, and how wide it is there
    const sightReach = () => {
      const half = T.MathUtils.degToRad(FOV / 2), a = cam.el - half; if (a < 0.08) return Infinity;
      const range = (cam.dist * Math.sin(cam.el)) / Math.sin(a), fwd = (cam.dist * Math.sin(cam.el)) / Math.tan(a) - cam.dist * Math.cos(cam.el);
      return Math.hypot(fwd, range * Math.tan(half) * (W / H));
    };
    const makeView = () => {
      clampT();
      const ty = Math.max(0.2, terr.h(cam.t[0], cam.t[1])), t = [cam.t[0], ty, cam.t[1]];
      const c = [t[0] + cam.dist * Math.cos(cam.el) * Math.sin(cam.az), t[1] + cam.dist * Math.sin(cam.el), t[2] + cam.dist * Math.cos(cam.el) * Math.cos(cam.az)];
      const minY = terr.h(c[0], c[2]) + 1.5; if (c[1] < minY) c[1] = minY;
      const coarse = !!farSet && sightReach() > GM - PAD - 12;
      return { name: 'hn', target: t, cam: c, fov: FOV, mode: 'near', lod: REGION, key: coarse ? undefined : 'hn-region', trees: [] };
    };
    // Ryan's lens (docs/research/ryan-sael.md): a sharp band round the target that widens with the distance, blur in front
    // and behind (the miniature look), ambient occlusion in the creases; the tier's caps stay (no SSAO / DOF where it says none)
    const LU = rt.lens && rt.lens.uniforms, blurK = rt.renderer.getDrawingBufferSize(new T.Vector2()).y / 900;
    const setView = (v) => {
      rt.setView(v);
      if (farSet) for (const m of farSet) if (m) m.visible = !v.key; // no near set in this view: the coarse ground, the ring and the China mesh show
      if (!LU) return;
      const d = cam.dist, q = Qn();
      LU.range.value = Math.max(4, 0.55 * d); LU.maxBlur.value = q && !q.dof ? 0 : 5 * blurK;
      LU.aoStrength.value = q && !q.ssao ? 0 : 0.85; LU.aoRadius.value = 0.05 + d * 0.004;
      LU.saturation.value = 1.05; LU.contrast.value = 1.07; LU.vignette.value = 0.26;
    };
    const apply = () => { setView(makeView()); scaleMarkers(); dirty = true; };
    // Civ's proportions: an army about as wide as a town; pulled back, both grow (armies a little faster) so they stay readable
    const markerScale = () => 1.45 * Math.pow(zoomK(), 0.9);
    let campTs = 0;
    const scaleMarkers = () => {
      const s = markerScale(), ts = townScale();
      for (const m of Object.values(armies)) m.g.scale.setScalar(s * (m.shrink ?? 1));
      for (const [id, t] of Object.entries(towns)) {
        if (t.model) t.model.scale.setScalar(ts);
        if (!t.std) continue;
        const f = (t.model && t.model.userData.flagAt) || [0, 0.05, 0], sg = BT.on && BT.flag && BT.flag.site === id ? BT.flag.at : null; // under siege: over the grown town's hall
        if (sg) t.std.position.set(sg[0], sg[1], sg[2]); else t.std.position.set(f[0] * ts, f[1] * ts, f[2] * ts);
        t.std.scale.setScalar(ts);
      }
      if (Math.abs(Math.log(ts / (campTs || ts))) > 0.03 || !campTs) { campTs = ts; for (const c of Object.values(camps)) layCamp(c); }
      placeArmies(false); placeSel(); placeHover(); relayRibbons();
      for (const r of tgtRings) r.scale.setScalar(r.userData.r * (r.userData.army ? s : 1));
    };
    // every flag turns to face the camera (a flag seen edge-on is a line)
    const qP = new T.Quaternion(), qY = new T.Quaternion(), wp = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
    const orientFlags = () => {
      scene.updateMatrixWorld();
      root.traverse((f) => {
        if (!f.userData.flag || !f.parent) return;
        f.getWorldPosition(wp); f.parent.getWorldQuaternion(qP);
        qY.setFromAxisAngle(UP, Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z));
        f.quaternion.copy(qP.invert().multiply(qY));
      });
    };
    // the region on screen: the distance at which the box of the towns (and the models round them) fits the view from this angle
    const fitDist = (az, el) => {
      const tanV = Math.tan(T.MathUtils.degToRad(FOV / 2)), tanH = tanV * (W / H), ca = Math.cos(az), sa = Math.sin(az);
      let eu = 0, ev = 0;
      for (const p of TOWNS) { const dx = p.x - mid[0], dz = p.z - mid[1]; eu = Math.max(eu, Math.abs(dx * ca - dz * sa) + p.size * 0.7); ev = Math.max(ev, Math.abs(-dx * sa - dz * ca) + p.size * 0.7); }
      // the page's bars take about a sixth of the height at the top and at the bottom: the towns fit between them
      return clamp(Math.max((1.12 * eu) / tanH, (1.4 * ev * Math.sin(el)) / tanV), 40, DMAX);
    };
    // the camera target and distance that frame a set of ground points ([x, z] …) from this angle, with a margin round them
    const fitPts = (pts, az = cam.az, el = cam.el, pad = 1.3) => {
      const tanV = Math.tan(T.MathUtils.degToRad(FOV / 2)), tanH = tanV * (W / H), ca = Math.cos(az), sa = Math.sin(az);
      const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      let eu = 0, ev = 0;
      for (const p of pts) { const dx = p[0] - c[0], dz = p[1] - c[1]; eu = Math.max(eu, Math.abs(dx * ca - dz * sa)); ev = Math.max(ev, Math.abs(-dx * sa - dz * ca)); }
      return { t: c, dist: clamp(Math.max((pad * eu + 6) / tanH, ((pad * ev + 6) * Math.sin(el) * 1.25) / tanV), 22, DMAX) };
    };

    // ------------------------------------------------------------ gestures (the page forwards pointer and wheel events, or sc.bind does)
    const ptrs = new Map(); let g0 = null, tap = null;
    const snap = () => { const ps = [...ptrs.values()]; if (ps.length === 1) return { n: 1, x: ps[0].x, y: ps[0].y }; const [a, b] = ps; return { n: 2, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
    const gesture = {
      down(id, x, y, button) { ptrs.set(id, { x, y }); g0 = { s: snap(), cam: JSON.parse(JSON.stringify(cam)), rot: button === 2 }; tap = ptrs.size === 1 ? { x, y, t: performance.now() } : null; endFly(); endRig(); setHover(null); },
      move(id, x, y) {
        if (!ptrs.has(id)) return; ptrs.set(id, { x, y }); const s = snap(); if (!g0 || s.n !== g0.s.n) { g0 = { s, cam: JSON.parse(JSON.stringify(cam)), rot: g0 && g0.rot }; return; }
        if (tap && Math.hypot(x - tap.x, y - tap.y) > 8) tap = null;
        if (s.n === 1 && !g0.rot) {
          const k = cam.dist * 0.0021 * (900 / H) * 0.5, dx = s.x - g0.s.x, dy = s.y - g0.s.y, ca = Math.cos(cam.az), sa = Math.sin(cam.az);
          cam.t[0] = g0.cam.t[0] - ca * dx * k - sa * dy * k; cam.t[1] = g0.cam.t[1] + sa * dx * k - ca * dy * k;
        } else if (s.n === 1) { cam.az = g0.cam.az - (s.x - g0.s.x) * 0.006; cam.el = clamp(g0.cam.el + (s.y - g0.s.y) * 0.004, 0.3, 1.4); }
        else { cam.dist = clamp((g0.cam.dist * g0.s.d) / Math.max(10, s.d), DMIN, DMAX); cam.az = g0.cam.az - (s.ang - g0.s.ang); cam.el = clamp(g0.cam.el + (s.y - g0.s.y) * 0.004, 0.3, 1.4); }
        apply();
      },
      up(id, x, y) { const wasTap = tap && ptrs.size === 1 && performance.now() - tap.t < 450; ptrs.delete(id); g0 = null; tap = null; return wasTap ? pick(x, y) : undefined; },
      wheel(dy) { endFly(); endRig(); cam.dist = clamp(cam.dist * Math.exp(dy * 0.0012), DMIN, DMAX); apply(); },
      zoom(f) { cam.dist = clamp(cam.dist * f, DMIN, DMAX); apply(); },
      rotate(da) { cam.az += da; apply(); },
      tilt(de) { cam.el = clamp(cam.el + de, 0.3, 1.4); apply(); },
    };
    // pointer events of an element (the canvas or its cover) → the gestures; a tap calls onTap(pick result). A mouse over an army,
    // a town or a battle wing lights a ring under it and turns the cursor to a hand
    const bind = (el, h = {}) => {
      const at = (e) => { const r = el.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
      let hoverT = 0;
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture && el.setPointerCapture(e.pointerId); gesture.down(e.pointerId, ...at(e), e.button); });
      el.addEventListener('pointermove', (e) => {
        if (!ptrs.size && e.pointerType === 'mouse') {
          const now = performance.now(); if (now - hoverT < 50) return; hoverT = now;
          const [x, y] = at(e), hit = BT.on ? null : pickNear(x, y), wing = BT.on ? pickWing(x, y) : null;
          setHover(hit); battleHover(wing);
          el.style.cursor = hit || wing ? 'pointer' : '';
          return;
        }
        gesture.move(e.pointerId, ...at(e));
      });
      el.addEventListener('pointerleave', () => { if (!ptrs.size) { setHover(null); battleHover(null); el.style.cursor = ''; } });
      const up = (e) => { const r = gesture.up(e.pointerId, ...at(e)); if (r && h.onTap) h.onTap(r); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', (e) => gesture.up(e.pointerId, -1e4, -1e4));
      el.addEventListener('wheel', (e) => { e.preventDefault(); gesture.wheel(e.deltaY); }, { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    // ------------------------------------------------------------ picking, ground under a screen point
    const armyAnchor = (id) => { const m = armies[id]; if (!m) return [0, 0, 0]; const p = m.g.position, s = m.g.scale.x; return [p.x, p.y + 2.25 * s, p.z]; };
    const bodyOf = (kind, id) => {
      if (kind === 'army') { const m = armies[id], p = m.g.position, s = m.g.scale.x; return [p.x, p.y + 1.0 * s, p.z]; }
      const p = place[id], ts = townScale(); return [p.x, p.y + (p.kind === 'town' ? 1.3 * ts : 1.6), p.z];
    };
    const screenOf = (kind, id) => { if (kind === 'army' ? !armies[id] : !place[id]) return null; return rt.project(kind === 'army' ? armyAnchor(id) : bodyOf('town', id)); };
    const ndc = new T.Vector3(), dir = new T.Vector3();
    const groundAt = (sx, sy) => {
      ndc.set((sx / W) * 2 - 1, -(sy / H) * 2 + 1, 0.5).unproject(camera); dir.copy(ndc).sub(camera.position).normalize();
      const o0 = camera.position; let t = 0, prev = 0;
      for (let k = 0; k < 600; k++) {
        const x = o0.x + dir.x * t, y = o0.y + dir.y * t, z = o0.z + dir.z * t, gap = y - Math.max(terr.h(x, z), 0);
        if (gap < 0.02) {
          let lo = prev, hi = t;
          for (let j = 0; j < 20; j++) { const m = (lo + hi) / 2, g2 = o0.y + dir.y * m - Math.max(terr.h(o0.x + dir.x * m, o0.z + dir.z * m), 0); if (g2 > 0) lo = m; else hi = m; }
          const tt = (lo + hi) / 2; return [o0.x + dir.x * tt, o0.z + dir.z * tt];
        }
        prev = t; t += Math.max(0.05, gap * 0.6);
        if (t > 3000) break;
      }
      return null;
    };
    // the army or town whose figure or pill is under a screen point (no ground search: cheap enough for a mouse hovering)
    const pickNear = (x, y) => {
      let best = null;
      const consider = (kind, id, pt, r) => { const q = rt.project(pt); if (!q.visible) return; const d = Math.hypot(q.x - x, q.y - y); if (d < r && (!best || d < best.d)) best = { kind, id, d }; };
      for (const [id, m] of Object.entries(armies)) if (m.g.visible) { consider('army', id, bodyOf('army', id), 46); consider('army', id, armyAnchor(id), 34); }
      for (const [id, p] of Object.entries(place)) consider(p.kind, id, bodyOf('town', id), p.kind === 'town' ? 44 : 34);
      return best ? { kind: best.kind, id: best.id } : null;
    };
    const pick = (x, y) => {
      if (BT.on) return { kind: 'ground', ground: null, at: groundAt(x, y) };
      const near = pickNear(x, y); if (near) return near;
      // the figures themselves: a tap on an army's base or inside a town's walls
      const gp = groundAt(x, y); if (!gp) return { kind: 'ground', ground: null, at: null };
      for (const [id, m] of Object.entries(armies)) { if (!m.g.visible) continue; const r = (m.g.userData.r || 1.4) * m.g.scale.x; if (Math.hypot(gp[0] - m.g.position.x, gp[1] - m.g.position.z) < r) return { kind: 'army', id }; }
      for (const [id, p] of Object.entries(place)) if (Math.hypot(gp[0] - p.x, gp[1] - p.z) < (p.kind === 'town' ? (p.size / 2) * 1.1 * townScale() : 2)) return { kind: p.kind, id };
      const k = terrainAt(gp[0], gp[1]);
      return { kind: 'ground', ground: Object.assign({ kind: k }, GROUND[k]), at: gp };
    };
    const posOf = (kind, id) => (kind === 'army' ? (armies[id] ? (armies[id].to || armies[id].g.position.toArray()) : null) : place[id] ? [place[id].x, place[id].y, place[id].z] : null);
    const ringFor = (ring, kind, id) => {
      const p = posOf(kind, id); if (!p) return false;
      const army = kind === 'army'; ring.userData.army = army; ring.userData.r = army ? (armies[id].g.userData.r || 1.4) + 0.2 : place[id].kind === 'town' ? (place[id].size / 2) * 1.75 * townScale() : 2.2;
      const off = army ? new T.Vector3(-0.35, 0, 0).applyQuaternion(armies[id].g.quaternion).multiplyScalar(armies[id].g.scale.x) : new T.Vector3();
      const q = army ? armies[id].g.position : { x: p[0], y: p[1], z: p[2] };
      ring.position.set(q.x + off.x, (army && armies[id].a.arm === 'fleet' ? q.y : terr.h(q.x, q.z)) + 0.12, q.z + off.z); return true;
    };
    let sel = null, hover = null;
    const placeSel = () => { if (BT.on) return; selRing.visible = !!sel && ringFor(selRing, sel.kind, sel.id); if (selRing.visible) selRing.scale.setScalar(selRing.userData.r * (selRing.userData.army ? markerScale() : 1)); };
    const select = (s) => { sel = s && s.id ? { kind: s.kind, id: s.id } : null; placeSel(); placeHover(); dirty = true; };
    const placeHover = () => {
      const same = hover && sel && sel.kind === hover.kind && sel.id === hover.id;
      hoverRing.visible = !BT.on && !!hover && !same && ringFor(hoverRing, hover.kind, hover.id);
      if (hoverRing.visible) hoverRing.scale.setScalar(hoverRing.userData.r * (hoverRing.userData.army ? markerScale() : 1) * 1.03);
    };
    const setHover = (h) => { const k = (x) => (x ? x.kind + ':' + x.id : ''); if (k(h) === k(hover)) return; hover = h; placeHover(); dirty = true; };

    // ------------------------------------------------------------ ribbons on the ground: the reach of an army, the routes to what it may go to, the orders given
    const flat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
    const surfY = (x, z) => Math.max(terr.h(x, z), 0, inWater(x, z) ? waterY(x, z) : 0); // a ribbon lies on the ground or on the water
    // strips: [[x, z] …] each; one geometry for all (one draw call per colour). arrows: [[x, z, dx, dz]] flat triangles at a strip's end
    const ribbons = (strips, w, mat, lift = 0.25, arrows) => {
      const pos = [], idx = [];
      for (const pts of strips) {
        const base = pos.length / 3;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * w / 2, nz = (dx / L) * w / 2, [x, z] = pts[i];
          pos.push(x + nx, surfY(x + nx, z + nz) + lift, z + nz, x - nx, surfY(x - nx, z - nz) + lift, z - nz);
          if (i) { const k = base + 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
        }
      }
      for (const [x, z, dx, dz, sz] of arrows || []) {
        const L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, k = pos.length / 3, tri = [[x + ux * sz, z + uz * sz], [x - ux * sz * 0.2 - uz * sz * 0.7, z - uz * sz * 0.2 + ux * sz * 0.7], [x - ux * sz * 0.2 + uz * sz * 0.7, z - uz * sz * 0.2 - ux * sz * 0.7]];
        for (const [px, pz] of tri) pos.push(px, surfY(px, pz) + lift, pz);
        idx.push(k, k + 1, k + 2);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new T.Mesh(g, mat); m.renderOrder = 5; m.frustumCulled = false; return m;
    };
    const GOLD = 0xf2d27a, RED = 0xe5735a;
    const dropGroup = (g) => { if (g) { root.remove(g); g.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material && x.material.userData.own) x.material.dispose(); }); } return null; };
    const dashes = (a, b, len, gap) => { // a dashed straight run from a to b, as short strips
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), out = [], n = Math.max(1, Math.floor(L / (len + gap)));
      for (let k = 0; k < n; k++) { const u0 = (k * (len + gap)) / L, u1 = Math.min(1, (k * (len + gap) + len) / L); if (u1 > 0.94) break; out.push([u0, (u0 + u1) / 2, u1].map((u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])); }
      return out;
    };
    // the edge of a stand: a route runs from the army's rim to the target's rim, not through them
    const rim = (p, q, r) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + ((q[0] - p[0]) / L) * r, p[1] + ((q[1] - p[1]) / L) * r]; };
    let reachG = null, orderG = null, lastTargets = null, ribK = 1;
    const orderLabels = [];
    const ribbonK = () => Math.pow(zoomK(), 0.85); // the lines grow with the camera distance, like the figures
    // the reach of one army (a ribbon circle on the ground) and the places and armies it may go to: gold to walk to, red to strike
    const targets = (armyId, list, opt = {}) => {
      reachG = dropGroup(reachG);
      while (tgtRings.length) root.remove(tgtRings.pop());
      lastTargets = null;
      const m = armyId && armies[armyId]; if (!m) { dirty = true; return; }
      lastTargets = [armyId, list, opt]; ribK = ribbonK();
      reachG = new T.Group(); root.add(reachG);
      const R = opt.reach ?? S.reachOf(m.a), c = m.to || m.g.position.toArray(), mine = !!(view && m.a.fid === view.me), col = mine ? GOLD : RED;
      const circle = (r) => Array.from({ length: 161 }, (_, k) => { const a = (k / 160) * Math.PI * 2; return [c[0] + Math.cos(a) * r, c[2] + Math.sin(a) * r]; });
      reachG.add(ribbons([circle(R)], 0.55 * ribK, flat(col, 0.85)), ribbons([circle(R - 1.4 * ribK)], 2.2 * ribK, flat(col, 0.12)));
      const by = { [GOLD]: [], [RED]: [] };
      for (const t of list || []) {
        const p = t.kind === 'town' ? posOf('town', t.id) : posOf('army', t.id); if (!p) continue;
        const hot = t.intent === 'attack' || t.intent === 'ask' || t.hostile, hex = hot ? RED : GOLD;
        by[hex].push(...dashes(rim([c[0], c[2]], [p[0], p[2]], 2 * ribK), rim([p[0], p[2]], [c[0], c[2]], (t.kind === 'town' ? 2.6 : 1.6) * ribK), 1.0 * ribK, 0.7 * ribK));
        const r = new T.Mesh(ringGeo, ringMat(hex, 0.9)); if (!ringFor(r, t.kind, t.id)) continue; r.renderOrder = 6; root.add(r); tgtRings.push(r);
      }
      for (const hex of [GOLD, RED]) if (by[hex].length) reachG.add(ribbons(by[hex], 0.38 * ribK, flat(hex, 0.9)));
      reachG.visible = !BT.on; scaleMarkers(); dirty = true;
    };
    // zoomed a good way since the lines were laid: lay them again
    const relayRibbons = () => { if (Math.abs(Math.log(ribbonK() / ribK)) < 0.14) return; ribK = ribbonK(); if (lastTargets) targets(...lastTargets); drawOrders(); };
    // the orders our armies carry (View: army.order): a line along the road the army will take (sc.path), from its rim to the
    // target's, with an arrowhead, over a dark edge; a badge halfway says what and how long ("Vây · 4 ngày")
    const orderPaths = new Map();
    const orderPath = (a, b, arm) => {
      const key = arm + '|' + [a[0], a[1], b[0], b[1]].map((v) => Math.round(v * 2)).join(',');
      if (!orderPaths.has(key)) { if (orderPaths.size > 48) orderPaths.delete(orderPaths.keys().next().value); orderPaths.set(key, pathXZ(a, b, arm)); }
      return orderPaths.get(key);
    };
    let ordersOff = false; // the season's playback: the orders are being carried out, their lines go
    const drawOrders = () => {
      orderG = dropGroup(orderG);
      for (const L of orderLabels.splice(0)) L.free();
      if (!view || ordersOff) return;
      const by = { [GOLD]: { s: [], a: [] }, [RED]: { s: [], a: [] } }, edge = [];
      for (const a of view.armies) {
        const m = armies[a.id], od = a.order; if (!m || !m.to || !od || !od.target || a.fid !== view.me) continue;
        const p = posOf(od.target.kind, od.target.id); if (!p) continue;
        const full = orderPath([m.to[0], m.to[2]], [p[0], p[2]], a.arm);
        const pts = S.cutEnd(S.cutStart(full, 2.2 * ribK), (od.target.kind === 'town' ? 2.9 : 1.8) * ribK);
        if (S.pathLen(pts) < 0.6) continue;
        const hex = od.intent === 'move' ? GOLD : RED, n = pts.length, B = pts[n - 1], A = pts[Math.max(0, n - 3)];
        by[hex].s.push(pts); by[hex].a.push([B[0], B[1], B[0] - A[0], B[1] - A[1], 1.1 * ribK]); edge.push(pts);
        const days = S.marchDays(S.pathLen(full) * KM, a.arm, S.reachOf(a) === REACH.fast), tr = S.track(pts), md = tr.at(0.5);
        orderLabels.push(newLabel(() => [md[0], surfY(md[0], md[1]) + 0.4 * ribK, md[1]], 'map', 3).set(S.orderBadge(od.intent, days), { px: 10, bar: hex === RED ? '#e5735a' : '#f2d27a', bg: 'rgba(24,19,14,0.8)' }));
      }
      orderG = new T.Group(); root.add(orderG);
      if (edge.length) orderG.add(ribbons(edge, 0.95 * ribK, flat(0x1a140e, 0.35), 0.28));
      for (const hex of [GOLD, RED]) if (by[hex].s.length) orderG.add(ribbons(by[hex].s, 0.5 * ribK, flat(hex, 0.95), 0.3, by[hex].a));
      orderG.visible = !BT.on;
    };

    // ------------------------------------------------------------ the camera, driven: a flight (eased, fly → Promise), a rig (a function of time
    // the camera follows smoothly: the season's playback), an orbit round a place. A gesture of the player ends any of them
    let anim = null, rigFn = null, rigDone = null;
    const endFly = () => { if (anim) { const d = anim.done; anim = null; if (d) d(); } };
    const endRig = () => { rigFn = null; if (rigDone) { const d = rigDone; rigDone = null; d(); } };
    const flyTo = (to, ms = 700) => {
      endFly(); endRig();
      const from = JSON.parse(JSON.stringify(cam)), goal = Object.assign(JSON.parse(JSON.stringify(cam)), to);
      goal.az = from.az + S.turn(from.az, goal.az); // the short way round
      anim = { from, to: goal, t0: performance.now(), ms: Math.max(1, ms) }; dirty = true;
    };
    const fly = (to, ms = 900) => new Promise((res) => { flyTo(to, ms); anim.done = res; });
    const rig = (fn, done) => { endFly(); endRig(); rigFn = fn; rigDone = done || null; dirty = true; };
    const ptOf = (x) => (Array.isArray(x) ? x : armies[x] ? [armies[x].g.position.x, armies[x].g.position.z] : place[x] ? [place[x].x, place[x].z] : null);
    // round a place (or an army, or [x, z]) for ms: o.turn radians (default 0.9), o.dist, o.el, from o.az (default: where the camera is)
    const orbit = (id, ms = 4000, o2 = {}) => new Promise((res) => {
      const p = ptOf(id); if (!p) { res(); return; }
      const az0 = o2.az ?? cam.az, turn = o2.turn ?? 0.9, dist = o2.dist ?? Math.min(cam.dist, 30), el = o2.el ?? 0.62, t0 = performance.now();
      rig((now) => { const u = clamp((now - t0) / ms, 0, 1); return { t: p, dist, az: az0 + turn * u, el, k: 3, end: u >= 1 }; }, res);
    });
    const focus = (id) => {
      const p = armies[id] ? posOf('army', id) : place[id] ? posOf('town', id) : null; if (!p) return;
      flyTo({ t: [p[0], p[2]], dist: Math.min(cam.dist, 40) });
    };
    // the whole region, looked at a little beyond its middle so the northern towns' labels clear the page's top bar
    const overviewT = (dist, az) => [mid[0] - Math.sin(az) * dist * 0.06, mid[1] - Math.cos(az) * dist * 0.06];
    const overview = () => { const az = 0.3, el = 0.88, dist = fitDist(az, el); flyTo({ t: overviewT(dist, az), dist, az, el }, 800); };

    // ------------------------------------------------------------ roads: A* over a grid on the play area (± 30 units). Slopes, heights and woods
    // cost more, a road less; a land army crosses a river where it must, at a ford (dear, so where the water is narrow); a
    // fleet keeps to the channel; the towns' walls are closed save the towns a march leaves and reaches
    const PG = { step: 0.6, M: 30 };
    let grid = null;
    const buildGrid = () => {
      const s = PG.step, x0 = box.x0 - PG.M, z0 = box.z0 - PG.M, nx = Math.ceil((box.x1 - box.x0 + 2 * PG.M) / s) + 1, nz = Math.ceil((box.z1 - box.z0 + 2 * PG.M) / s) + 1;
      const land = new Float32Array(nx * nz), fleet = new Float32Array(nx * nz), foot = new Int16Array(nx * nz).fill(-1);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = x0 + i * s, z = z0 + j * s, k = j * nx + i, sd = terr.riverSD(x, z), h = terr.h(x, z);
        const slope = terr.slopeAt ? terr.slopeAt(x, z) : 0, road = terr.roadD ? terr.roadD(x, z) : 9, wood = terr.canopyLift ? terr.canopyLift(x, z) > 0.04 : false;
        let c = 1 + slope * 7 + (h > 0.9 ? 2.5 : 0) + (wood ? 0.7 : 0);
        if (sd < 0) c = 14 + slope * 7; else if (sd < 0.6) c += 0.8;
        if (road < 1 && sd >= 0) c *= 0.55 + 0.45 * road;
        land[k] = c;
        fleet[k] = sd < -0.15 ? 1 : sd < 0.25 ? 14 : 400;
      }
      TOWNS.forEach((p, ti) => { const r = p.size / 2 + 0.6; for (let j = Math.floor((p.z - r - z0) / s); j <= Math.ceil((p.z + r - z0) / s); j++) for (let i = Math.floor((p.x - r - x0) / s); i <= Math.ceil((p.x + r - x0) / s); i++) { if (i < 0 || j < 0 || i >= nx || j >= nz) continue; if (Math.hypot(x0 + i * s - p.x, z0 + j * s - p.z) < r) foot[j * nx + i] = ti; } });
      return { x0, z0, s, nx, nz, land, fleet, foot };
    };
    const cellOf = (G, x, z) => clamp(Math.round((z - G.z0) / G.s), 0, G.nz - 1) * G.nx + clamp(Math.round((x - G.x0) / G.s), 0, G.nx - 1);
    // a path from a to b ([x, z] each) for 'land' or 'fleet', as points at most 0.6 apart
    const pathXZ = (a, b, arm = 'land') => {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) return [a.slice(), b.slice()];
      grid = grid || buildGrid();
      const G = grid, s0 = cellOf(G, a[0], a[1]), s1 = cellOf(G, b[0], b[1]), open = new Set([G.foot[s0], G.foot[s1]]);
      const cost = (arm === 'fleet' ? G.fleet : G.land).slice();
      for (let k = 0; k < cost.length; k++) if (G.foot[k] >= 0 && !open.has(G.foot[k])) cost[k] += 30;
      const cells = S.astar(cost, G.nx, G.nz, s0, s1, arm === 'fleet' ? 1 : 0.55);
      if (!cells) return S.resample([a.slice(), b.slice()], 0.6);
      let pts = cells.map((k) => [G.x0 + (k % G.nx) * G.s, G.z0 + ((k / G.nx) | 0) * G.s]);
      pts[0] = a.slice(); pts[pts.length - 1] = b.slice();
      pts = S.shortcut(pts, (x, z) => cost[cellOf(G, x, z)], G.s * 0.7);
      return S.resample(S.chaikin(pts, 3), 0.6);
    };
    const path = (from, to, arm = 'land') => { const a = ptOf(from), b = ptOf(to); return a && b ? pathXZ(a, b, arm) : []; };

    // ------------------------------------------------------------ particles: dust, smoke, fire, sparks as soft billboards, two draw calls in all
    // (one normal-blended set for dust and smoke, one additive for fire, embers and flashes), stepped on the CPU, a few hundred at most
    const PV = 'attribute vec4 iP;attribute vec4 iC;attribute vec2 iR;varying vec2 vU;varying vec4 vC;varying float vS;' +
      'void main(){vU=uv;vC=iC;vS=iR.y;vec4 mv=modelViewMatrix*vec4(iP.xyz,1.);float c=cos(iR.x),s=sin(iR.x);vec2 q=position.xy*iP.w;mv.xy+=vec2(c*q.x-s*q.y,s*q.x+c*q.y);gl_Position=projectionMatrix*mv;}';
    const PF_SOFT = 'varying vec2 vU;varying vec4 vC;varying float vS;void main(){vec2 p=vU*2.-1.;float a=atan(p.y,p.x);float r=length(p)/(.8+.11*sin(a*3.+vS*6.3)+.07*sin(a*5.-vS*9.));float m=smoothstep(1.,.15,r);gl_FragColor=vec4(vC.rgb,vC.a*m);if(gl_FragColor.a<.004)discard;}';
    const PF_GLOW = 'varying vec2 vU;varying vec4 vC;varying float vS;void main(){vec2 p=vU*2.-1.;float r=length(p);float m=pow(max(0.,1.-r),1.8);gl_FragColor=vec4(vC.rgb,vC.a*m);if(gl_FragColor.a<.004)discard;}';
    const pSet = (n, add) => {
      const q = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry();
      g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
      const P = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4), C = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4), R = new T.InstancedBufferAttribute(new Float32Array(n * 2), 2);
      for (const x of [P, C, R]) x.setUsage(T.DynamicDrawUsage);
      g.setAttribute('iP', P); g.setAttribute('iC', C); g.setAttribute('iR', R); g.instanceCount = 0;
      const m = new T.Mesh(g, new T.ShaderMaterial({ vertexShader: PV, fragmentShader: add ? PF_GLOW : PF_SOFT, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending }));
      m.frustumCulled = false; m.renderOrder = add ? 9 : 8; m.visible = false; scene.add(m);
      return { m, g, P, C, R, n, list: [] };
    };
    const PS = { soft: pSet(LOW ? 260 : 520, false), glow: pSet(LOW ? 140 : 280, true) };
    // kinds: colour, alpha, size from → to (× the scale an emitter gives), life (s), rise (units/s × scale), how much the wind takes it
    const PK = {
      dust: { c: 0xbba684, a: 0.4, s0: 0.45, s1: 1.4, life: 1.5, up: 0.22, wind: 0.25 },
      dustBig: { c: 0xae9a77, a: 0.5, s0: 0.8, s1: 2.6, life: 2.1, up: 0.28, wind: 0.3 },
      wake: { c: 0xe8eee6, a: 0.34, s0: 0.25, s1: 0.95, life: 1.1, up: 0, wind: 0 },
      smoke: { c: 0x8f8a82, a: 0.28, s0: 0.3, s1: 1.7, life: 3.6, up: 0.5, wind: 0.5 },
      soot: { c: 0x3a3530, a: 0.5, s0: 0.45, s1: 2.4, life: 4.2, up: 0.75, wind: 0.6 },
      fire: { c: 0xff7a24, a: 0.95, s0: 0.42, s1: 0.1, life: 0.55, up: 0.9, wind: 0.1, glow: true },
      flame: { c: 0xffa645, a: 0.85, s0: 0.3, s1: 0.16, life: 0.34, up: 0.35, wind: 0, glow: true },
      ember: { c: 0xff6a18, a: 1, s0: 0.08, s1: 0.03, life: 1.4, up: 0.7, wind: 0.4, glow: true },
      spark: { c: 0xffe2a0, a: 1, s0: 0.12, s1: 0.02, life: 0.42, up: 0, wind: 0, glow: true },
      flash: { c: 0xfff0c8, a: 0.7, s0: 0.6, s1: 1.8, life: 0.3, up: 0, wind: 0, glow: true },
    };
    for (const k of Object.values(PK)) k.col = new T.Color(k.c);
    const WIND = [0.8, 0.25]; // the wind on the map, units a second at scale 1 (east-south-east)
    // one particle of a kind at (x, y, z); e = { s: scale, v: [vx, vy, vz], col: hex, a: alpha, life }
    const emit = (kind, x, y, z, e = {}) => {
      const K0 = PK[kind]; if (!K0) return; const set = K0.glow ? PS.glow : PS.soft; if (set.list.length >= set.n) return;
      const s = e.s || 1, v = e.v || [0, 0, 0];
      set.list.push({ k: K0, x, y, z, vx: v[0], vy: v[1] + K0.up * s * (0.7 + Math.random() * 0.6), vz: v[2], s, age: 0, life: (e.life || K0.life) * (0.8 + Math.random() * 0.4), rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.8, seed: Math.random(), col: e.col != null ? new T.Color(e.col) : K0.col, a: e.a ?? K0.a });
    };
    const stepParticles = (dt) => {
      let any = false;
      for (const set of [PS.soft, PS.glow]) {
        const L = set.list, P = set.P.array, C = set.C.array, R = set.R.array; let n = 0;
        for (let i = 0; i < L.length; i++) {
          const p = L[i]; p.age += dt; if (p.age >= p.life) continue;
          const k = p.k, u = p.age / p.life, wk = k.wind * p.s, damp = Math.max(0, 1 - dt * 1.5);
          p.x += (p.vx + WIND[0] * wk) * dt; p.y += p.vy * dt; p.z += (p.vz + WIND[1] * wk) * dt;
          p.vx *= damp; p.vz *= damp; p.vy *= Math.max(0, 1 - dt * 0.4); p.rot += p.spin * dt;
          const size = (k.s0 + (k.s1 - k.s0) * (1 - (1 - u) * (1 - u))) * p.s, fade = Math.min(1, u * 7) * Math.pow(1 - u, 1.3) * p.a;
          P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = size;
          C[n * 4] = p.col.r; C[n * 4 + 1] = p.col.g; C[n * 4 + 2] = p.col.b; C[n * 4 + 3] = fade;
          R[n * 2] = p.rot; R[n * 2 + 1] = p.seed;
          L[n++] = p;
        }
        L.length = n; set.g.instanceCount = n; set.m.visible = n > 0;
        if (n) { set.P.needsUpdate = true; set.C.needsUpdate = true; set.R.needsUpdate = true; any = true; }
      }
      return any;
    };
    // a burst: n particles of a kind scattered round a point (r), flung outward at speed sp
    const burst = (kind, x, y, z, n, r, s = 1, sp = 0) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, d = Math.random() * r; emit(kind, x + Math.cos(a) * d, y + Math.random() * r * 0.3, z + Math.sin(a) * d, { s, v: [Math.cos(a) * sp, sp * 0.6 * Math.random(), Math.sin(a) * sp] }); } };

    // ------------------------------------------------------------ a siege camp round a town: a palisade facing the walls, tents in clusters
    // outside it (the besiegers' side first), watchtowers, the general's tent between two standards, cook fires; smoke over the
    // walls. It goes up piece by piece from the besiegers' side when they arrive and comes down when the siege ends. HM.siegeCamp
    // (han-models.js, job 6), when the kit has it, is the model; these parts are the fallback. Laid in town units × the town's scale
    const camps = {};
    const P5 = HM.parts, campGeo = {};
    const cgeo = (key, make) => campGeo[key] || (campGeo[key] = make());
    // a ridge tent over a low cloth wall, the ridge along x (0.24 × 0.15, 0.12 high)
    const prism = (w, d, h, e) => P5.tris([
      -w / 2, e, d / 2, w / 2, e, d / 2, w / 2, h, 0, -w / 2, e, d / 2, w / 2, h, 0, -w / 2, h, 0,
      w / 2, e, -d / 2, -w / 2, e, -d / 2, -w / 2, h, 0, w / 2, e, -d / 2, -w / 2, h, 0, w / 2, h, 0,
      w / 2, e, d / 2, w / 2, e, -d / 2, w / 2, h, 0, -w / 2, e, -d / 2, -w / 2, e, d / 2, -w / 2, h, 0,
    ]);
    const tentGeo = () => cgeo('tent', () => { const k = P5.kit(); k.add(P5.rbox(0.24, 0.035, 0.15, 0), 0xb5a07a, [0, 0.0175, 0]); k.add(prism(0.26, 0.17, 0.12, 0.035), 0xe2d4b4); return k.geo(); });
    const palGeo = () => cgeo('pal', () => {
      const k = P5.kit(); k.add(P5.rbox(0.36, 0.035, 0.1, 0), P5.C.earth, [0, 0.0175, 0]);
      for (let i = 0; i < 6; i++) { const x = -0.15 + i * 0.06; k.add(new T.BoxGeometry(0.02, 0.12, 0.02), 0x6b4a2c, [x, 0.095, 0]); k.add(P5.cone(0.015, 0.03, 4), 0x6b4a2c, [x, 0.17, 0]); }
      k.add(new T.BoxGeometry(0.36, 0.014, 0.014), 0x4a321e, [0, 0.12, 0.012]);
      return k.geo();
    });
    const towerGeo = () => cgeo('tower', () => {
      const k = P5.kit();
      for (const [x, z] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) k.add(new T.BoxGeometry(0.022, 0.34, 0.022), 0x5a3d24, [x, 0.17, z]);
      k.add(P5.rbox(0.19, 0.02, 0.19, 0), 0x4a321e, [0, 0.3, 0]);
      for (const [x, z, w, d] of [[0, -0.09, 0.19, 0.014], [0, 0.09, 0.19, 0.014], [-0.09, 0, 0.014, 0.19], [0.09, 0, 0.014, 0.19]]) k.add(new T.BoxGeometry(w, 0.05, d), 0x5a3d24, [x, 0.335, z]);
      k.add(P5.xf(P5.cone(0.15, 0.08, 4), [0, 0, 0], [0, Math.PI / 4, 0]), P5.C.thatch, [0, 0.42, 0]);
      return k.geo();
    });
    const cmdGeo = (fid) => cgeo('cmd:' + fid, () => { const k = P5.kit(), c = COLOR[fid] || 0x8a7a55; k.add(P5.rbox(0.42, 0.08, 0.28, 0.1), P5.shade(c, -0.15), [0, 0.04, 0]); k.add(prism(0.46, 0.32, 0.2, 0.08), P5.mix(c, 0xe8dcc0, 0.35)); k.add(P5.rbox(0.07, 0.07, 0.01, 0), 0x2a1a10, [0, 0.035, 0.141]); return k.geo(); });
    // the layout: where each piece stands (town units round the town's centre) and its delay as the camp goes up
    const campLayout = (id, home) => {
      const p = place[id], R = p.size / 2, Rc = R + (p.size >= 5 ? 1.35 : 1.2);
      let s = seedOf(id) * 7 + 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const delay = (a) => (Math.abs(S.turn(home, a)) / Math.PI) * 0.55;
      const pal = [], tents = [], towers = [], fires = [], smokes = [];
      const nSeg = Math.round((2 * Math.PI * Rc) / 0.34);
      for (let k = 0; k < nSeg; k++) { const a = home + (k / nSeg) * 6.2832, q = ((k / nSeg) * 4 + 0.5) % 1; if (q > 0.47 && q < 0.53) continue; pal.push({ x: Math.cos(a) * Rc, z: Math.sin(a) * Rc, r: a + Math.PI / 2, d: delay(a) }); } // gates on the diagonals
      const clusters = [[home + 0.78, 9], [home - 0.78, 8], [home + 1.85, 6], [home - 1.85, 6], [home + Math.PI, 7]].slice(0, LOW ? 3 : 5);
      for (const [a, n] of clusters) {
        const r0 = Rc + 0.62, ta = a + Math.PI / 2, cx = Math.cos(a) * r0, cz = Math.sin(a) * r0;
        for (let i = 0; i < n; i++) {
          const row = i % 2, col = Math.floor(i / 2) - (Math.ceil(n / 2) - 1) / 2, along = col * 0.32 + (rnd() - 0.5) * 0.05, out = (row - 0.5) * 0.34 + (rnd() - 0.5) * 0.04;
          tents.push({ x: cx + Math.cos(ta) * along + Math.cos(a) * out, z: cz + Math.sin(ta) * along + Math.sin(a) * out, r: ta + (rnd() - 0.5) * 0.16, d: delay(a) + i * 0.02, tint: rnd() < 0.25 ? 0.86 : 1 });
        }
        fires.push({ x: cx + Math.cos(ta) * (Math.ceil(n / 2) * 0.17 + 0.12), z: cz + Math.sin(ta) * (Math.ceil(n / 2) * 0.17 + 0.12), acc: rnd() });
      }
      for (const a of [home + 1.2, home - 1.2, home + 2.5, home - 2.5]) towers.push({ x: Math.cos(a) * (Rc + 0.05), z: Math.sin(a) * (Rc + 0.05), r: a, d: delay(a) + 0.05 });
      const ca = home + 1.3, cmd = { x: Math.cos(ca) * (Rc + 0.95), z: Math.sin(ca) * (Rc + 0.95), r: ca + Math.PI / 2, d: 0.1 };
      for (let i = 0; i < 2; i++) smokes.push({ x: (rnd() - 0.5) * R * 0.9, z: (rnd() - 0.5) * R * 0.9, acc: rnd() });
      return { pal, tents, towers, fires, cmd, smokes, Rc };
    };
    const m4c = new T.Matrix4(), qc = new T.Quaternion(), vc = new T.Vector3(), sc3 = new T.Vector3(), UPc = new T.Vector3(0, 1, 0);
    // every piece in its place for the town's scale now, risen by how far the camp has gone up (u 0..1, a little overshoot)
    const layCamp = (c) => {
      const p = place[c.id], ts = townScale(), L = c.lay;
      const rise = (d) => { const v = clamp((c.u - d) / 0.4, 0, 1); return v <= 0 ? 0.0001 : c.state === 'striking' ? v * v : backOut(v); };
      const put = (m, list, k0 = 1) => {
        if (!m) return;
        list.forEach((e, i) => { const x = p.x + e.x * ts, z = p.z + e.z * ts, y = terr.h(x, z), r = rise(e.d); m.setMatrixAt(i, m4c.compose(vc.set(x, y, z), qc.setFromAxisAngle(UPc, -e.r), sc3.set(ts * k0 * (0.4 + 0.6 * Math.min(1, r)), ts * k0 * r, ts * k0))); });
        m.instanceMatrix.needsUpdate = true;
      };
      put(c.tents, L.tents); put(c.pal, L.pal); put(c.towers, L.towers);
      if (c.cmd) { const e = L.cmd, x = p.x + e.x * ts, z = p.z + e.z * ts, r = rise(e.d); c.cmd.position.set(x, terr.h(x, z), z); c.cmd.rotation.y = -e.r; c.cmd.scale.set(ts, ts * r, ts); }
      c.stds.forEach((st, i) => { const e = L.cmd, off = (i ? -1 : 1) * 0.36, x = p.x + (e.x + Math.cos(e.r) * off) * ts, z = p.z + (e.z + Math.sin(e.r) * off) * ts; st.position.set(x, terr.h(x, z), z); st.scale.setScalar(ts * 0.34 * Math.max(0.0001, rise(e.d + 0.05))); });
      if (c.ext) { c.ext.position.set(p.x, p.y, p.z); c.ext.scale.set(ts, ts * Math.max(0.0001, Math.min(1, c.u * 1.2)), ts); }
    };
    const dropCamp = (id) => {
      const c = camps[id]; if (!c) return;
      root.remove(c.g); c.g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); });
      for (const st of c.stds) freeStd(st);
      delete camps[id];
    };
    // a camp for `men` besiegers of faction fid, whose side of the town is the angle `home`; o.ms: how long it takes to go up (0: at once)
    const pitchCamp = (id, fid, men, home, o2 = {}) => {
      if (!place[id] || place[id].kind !== 'town') return null;
      dropCamp(id);
      const g = new T.Group(), lay = campLayout(id, home), c = { id, fid, men, home, g, lay, u: o2.ms ? 0 : 1, t0: performance.now(), ms: o2.ms || 0, state: o2.ms ? 'rising' : 'up', hold: false, stds: [], ext: null, tents: null, pal: null, towers: null, cmd: null };
      if (HM.siegeCamp) { // the kit's camp (job 6): rotated so its front (+x) faces out from the besiegers' side
        try { c.ext = HM.siegeCamp({ fid, men, r: lay.Rc, seed: seedOf(id) }); c.ext.rotation.y = -home; c.ext.traverse(colored); g.add(c.ext); if (c.ext.userData && c.ext.userData.fires) lay.fires = c.ext.userData.fires.map((f) => ({ x: f[0] * Math.cos(home) + f[2] * Math.sin(home), z: -f[0] * Math.sin(home) + f[2] * Math.cos(home), acc: Math.random() })); } catch (e) { console.warn('HM.siegeCamp:', e); c.ext = null; }
      }
      if (!c.ext) {
        const inst = (geo, n) => { const m = colored(new T.InstancedMesh(geo, HM.mat, n)); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); return m; };
        c.tents = inst(tentGeo(), lay.tents.length); c.pal = inst(palGeo(), lay.pal.length); c.towers = inst(towerGeo(), lay.towers.length);
        const tint = new T.Color(), fc = new T.Color(COLOR[fid] || 0x8a7a55);
        lay.tents.forEach((e, i) => c.tents.setColorAt(i, e.tint < 1 ? tint.setRGB(1, 1, 1).lerp(fc, 0.5) : tint.setRGB(1, 1, 1)));
        c.cmd = new T.Mesh(cmdGeo(fid), HM.mat); c.cmd.castShadow = true; g.add(c.cmd);
        for (let i = 0; i < 2; i++) { const st = standard(fid, 3.2, 1.3); c.stds.push(st); g.add(st); }
      }
      g.visible = !BT.on; root.add(g); camps[id] = c; layCamp(c); dirty = true;
      return c;
    };
    const strikeCamp = (id, ms = 1000) => { const c = camps[id]; if (!c || c.state === 'striking') return; c.state = 'striking'; c.hold = false; c.t0 = performance.now(); c.ms = ms; c.u0 = c.u; dirty = true; };
    // camps going up or coming down; their fires and the smoke over the walls they besiege, while the map shows
    const stepCamps = (now, dt) => {
      let any = false;
      for (const c of Object.values(camps)) {
        if (c.state === 'rising') { c.u = clamp((now - c.t0) / c.ms, 0, 1); if (c.u >= 1) c.state = 'up'; layCamp(c); any = true; }
        else if (c.state === 'striking') { c.u = (c.u0 ?? 1) * (1 - clamp((now - c.t0) / c.ms, 0, 1)); layCamp(c); any = true; if (c.u <= 0) { dropCamp(c.id); continue; } }
        c.g.visible = !BT.on;
        if (BT.on || c.u < 0.6) continue;
        const p = place[c.id], ts = townScale(), lit = c.state === 'striking' ? c.u : 1;
        for (const f of c.lay.fires) {
          f.acc += dt * (LOW ? 5 : 10) * lit;
          while (f.acc >= 1) { f.acc -= 1; const x = p.x + f.x * ts, z = p.z + f.z * ts, y = terr.h(x, z) + 0.04 * ts; emit('flame', x + (Math.random() - 0.5) * 0.05 * ts, y, z + (Math.random() - 0.5) * 0.05 * ts, { s: ts * 0.55 }); if (Math.random() < 0.22) emit('smoke', x, y + 0.1 * ts, z, { s: ts * 0.45 }); }
        }
        for (const f of c.lay.smokes) {
          f.acc += dt * (LOW ? 1.2 : 2.4) * lit;
          while (f.acc >= 1) { f.acc -= 1; const x = p.x + f.x * ts, z = p.z + f.z * ts; emit('soot', x + (Math.random() - 0.5) * 0.2 * ts, p.y + 0.3 * ts, z + (Math.random() - 0.5) * 0.2 * ts, { s: ts * 0.7 }); }
        }
      }
      // a town stormed last season still burns: dark smoke, flames low among the roofs, embers
      if (!BT.on) for (const [id, t] of Object.entries(towns)) {
        if (!t.burnt || !t.model) continue;
        const p = place[id], ts = townScale();
        t.fireAcc = (t.fireAcc || 0) + dt * (LOW ? 4 : 9);
        while (t.fireAcc >= 1) {
          t.fireAcc -= 1; const a = Math.random() * 6.2832, r = Math.random() * p.size * 0.32 * ts, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = p.y + 0.12 * ts;
          const k = Math.random(); emit(k < 0.35 ? 'soot' : k < 0.8 ? 'fire' : 'ember', x, y, z, { s: ts * (k < 0.35 ? 0.7 : 0.6) });
        }
      }
      return any;
    };

    // ------------------------------------------------------------ a town changes hands (its beat): the old standard runs down the pole, furls,
    // the siege camp comes down, the new standard runs up and a ring of its colour spreads on the ground; the winners walk in
    const beats = [], pulses = [];
    const release = (id) => {
      for (const [aid, m] of Object.entries(armies)) {
        if (m.hold !== id) continue;
        m.hold = null;
        const cur = [m.g.position.x, m.g.position.z];
        if (m.to && Math.hypot(m.to[0] - cur[0], m.to[2] - cur[1]) > 0.8) march(aid, pathXZ(cur, [m.to[0], m.to[2]], m.a.arm)); else if (m.to) { m.g.position.set(m.to[0], m.to[1], m.to[2]); m.g.rotation.set(0, -m.face, 0); m.away = false; }
      }
    };
    const strikeHeld = (id, ms) => { const c = camps[id]; if (c && (c.hold || c.state !== 'striking') && !(view && view.armies.some((a) => a.besieging === id && a.fid === c.fid))) strikeCamp(id, ms); };
    const beat = (id, o2 = {}) => new Promise((res) => {
      const t = towns[id];
      if (!t) { res(); return; }
      const to = t.pend !== undefined ? t.pend : t.fid;
      if (!t.std || !to) { if (to !== t.fid) setOwner(id, to); release(id); strikeHeld(id); res(); return; }
      t.pend = undefined; t.beating = to;
      beats.push({ id, to, t0: performance.now() + (o2.delay || 0), ms: o2.ms || 2600, swapped: false, struck: false, onSwap: o2.onSwap, done: res });
      dirty = true;
    });
    const endBeat = (b) => {
      const t = towns[b.id], ud = t.std && t.std.userData;
      if (!b.swapped) swapFlag(b);
      if (ud) { ud.piv.position.y = ud.h; ud.cloth.scale.x = 1; ud.cloth.position.x = 0.35 * ud.s; }
      t.beating = false; t.fid = b.to;
      if (!b.struck) strikeHeld(b.id, 700);
      release(b.id); b.done();
    };
    const swapFlag = (b) => {
      const t = towns[b.id], ud = t.std.userData, p = place[b.id], ts = townScale();
      b.swapped = true; ud.cloth.material = flagMat(b.to); t.fid = b.to; t.name.set(p.name, nameStyle(b.id));
      if (b.onSwap) try { b.onSwap(); } catch (e) { console.warn(e); }
      // a ring of the new colour on the ground round the walls, and sparks at the top of the pole
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: COLOR[b.to] || GOLD, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.material.userData.own = true; ring.position.set(p.x, p.y + 0.15, p.z); ring.renderOrder = 6; root.add(ring);
      pulses.push({ m: ring, t0: performance.now(), ms: 1300, r0: (p.size / 2) * ts, r1: (p.size / 2 + 3.2) * ts });
      const top = new T.Vector3(); t.std.getWorldPosition(top); top.y += ud.h * ts;
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.2832; emit('spark', top.x, top.y, top.z, { s: ts * 1.6, v: [Math.cos(a) * 1.4 * ts, (0.6 + Math.random()) * ts, Math.sin(a) * 1.4 * ts], col: i % 3 ? 0xffe2a0 : COLOR[b.to] }); }
    };
    const stepBeats = (now) => {
      let any = false;
      for (let i = beats.length - 1; i >= 0; i--) {
        const b = beats[i], t = towns[b.id], ud = t.std && t.std.userData, u = clamp((now - b.t0) / b.ms, 0, 1); any = true;
        if (!ud) { beats.splice(i, 1); endBeat(b); continue; }
        const low = Math.max(0.42, (ud.s * 1.05 + 0.1) / ud.h); // how far down the pole the flag comes (its foot clear of the ground)
        if (u < 0.4) { const e = ease(u / 0.4); ud.piv.position.y = ud.h * (1 - (1 - low) * e); const f = 1 - 0.7 * e; ud.cloth.scale.x = f; ud.cloth.position.x = 0.35 * ud.s * f; }
        else if (!b.swapped) swapFlag(b);
        if (u >= 0.46) { const v = clamp((u - 0.46) / 0.44, 0, 1), e = backOut(v); ud.piv.position.y = ud.h * (low + (1 - low) * e); const f = 0.3 + 0.7 * clamp(v * 1.3, 0, 1); ud.cloth.scale.x = f; ud.cloth.position.x = 0.35 * ud.s * f; }
        if (!b.struck && u > 0.1) { b.struck = true; strikeHeld(b.id, 1000); }
        if (u >= 1) { beats.splice(i, 1); endBeat(b); }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i], u = clamp((now - q.t0) / q.ms, 0, 1), e = 1 - Math.pow(1 - u, 3); any = true;
        q.m.scale.setScalar(q.r0 + (q.r1 - q.r0) * e); q.m.material.opacity = 0.9 * (1 - u);
        if (u >= 1) { root.remove(q.m); q.m.material.dispose(); pulses.splice(i, 1); }
      }
      return any;
    };
    // every change of hands still held shown at once (the page moved on without its beat)
    const flushBeats = () => {
      for (const b of beats.splice(0)) endBeat(b);
      for (const [id, t] of Object.entries(towns)) { if (t.pend !== undefined) { setOwner(id, t.pend); } if (!t.beating) { release(id); const c = camps[id]; if (c && c.hold) strikeCamp(id, 600); } }
      dirty = true;
    };

    // ------------------------------------------------------------ marching: an army walks a path of [x, z] points (sc.path) with dust behind it
    // (a wake behind a fleet). It ends on its stand ('stand', the default), or parks where the path ends ('park': a battle line,
    // a stop of the playback, until a new View puts it on a stand), or leaves the map ('leave': it dwindles into the distance).
    // kind 'retreat' hurries, head down; → Promise, when it arrives (or is sent elsewhere)
    const march = (id, pts, o2 = {}) => {
      const m = armies[id]; if (!m) return Promise.resolve();
      if (m.moving && m.moving.done) m.moving.done();
      if (!pts || pts.length < 2) { const p = (pts && pts[0]) || [m.g.position.x, m.g.position.z]; pts = [p, p]; }
      const tr = S.track(pts), ms = o2.ms || clamp(900 + tr.L * 42, 1100, 2600);
      m.away = false; m.shrink = undefined;
      return new Promise((res) => { m.moving = { tr, t0: o2.t0 ?? performance.now(), ms, end: o2.end || 'stand', face: o2.face, kind: o2.kind || 'march', done: res, acc: 0 }; dirty = true; });
    };
    const stepMarch = (now, dt) => {
      let any = false;
      for (const [id, m] of Object.entries(armies)) {
        const mv = m.moving; if (!mv) continue; any = true;
        const u = clamp((now - mv.t0) / mv.ms, 0, 1) /* a frame's time can precede the march's start */, e = u - (Math.sin(2 * Math.PI * u) / (2 * Math.PI)) * 0.6;
        const [x, z, dx, dz] = mv.tr.at(e), fleet = m.a.arm === 'fleet', s0 = markerScale(), run = mv.kind === 'retreat';
        const y = fleet ? waterY(x, z) + 0.02 : footY(x, z), bob = u < 1 && !fleet ? Math.abs(Math.sin(now * (run ? 0.019 : 0.012))) * 0.045 * s0 : 0;
        m.g.position.set(x, y + bob, z);
        if (u < 1) {
          m.g.rotation.set(fleet ? Math.sin(now * 0.004) * 0.035 : 0, Math.atan2(-dz, dx), run ? 0.06 + Math.sin(now * 0.017) * 0.04 : 0);
          // dust behind the column (more when it hurries), a wake behind boats
          mv.acc += dt * (fleet ? 8 : run ? 20 : 13) * (LOW ? 0.55 : 1) * (u > 0.04 && u < 0.97 ? 1 : 0.3);
          while (mv.acc >= 1) {
            mv.acc -= 1; const r = (m.g.userData.r || 1.4) * s0, back = r * (0.45 + Math.random() * 0.3), side = (Math.random() - 0.5) * r * 0.9;
            emit(fleet ? 'wake' : 'dust', x - dx * back - dz * side, (fleet ? y : footY(x - dx * back, z - dz * back)) + 0.05 * s0, z - dz * back + dx * side, { s: s0 * (fleet ? 0.75 : 0.9), v: [-dx * 0.25 * s0, 0, -dz * 0.25 * s0] });
          }
          if (mv.end === 'leave') { const k = clamp((u - 0.6) / 0.4, 0, 1); m.shrink = Math.max(0.001, 1 - k * k); m.g.scale.setScalar(s0 * m.shrink); }
        } else {
          m.moving = null;
          if (mv.end === 'stand' && m.to) { m.g.position.set(m.to[0], m.to[1], m.to[2]); m.g.rotation.set(0, -m.face, 0); } // on its stand as it is now (the stand moves with the zoom)
          else if (mv.end === 'leave') { m.g.visible = false; m.left = true; m.away = true; }
          else { m.away = true; m.g.rotation.set(0, mv.face != null ? -mv.face : Math.atan2(-dz, dx), 0); }
          mv.done();
        }
        if (sel && sel.kind === 'army' && sel.id === id) placeSel();
        if (hover && hover.kind === 'army' && hover.id === id) placeHover();
      }
      return any;
    };

    // ------------------------------------------------------------ a battle on the map: wings of figures on a 3 × 6 grid at the site
    // rows run along the attack axis (0–1 attacker, 4–5 defender; at a walled town rows 4–5 stand on its walls), lanes across.
    // Between turns the wings move with purpose: they advance (a charge at a run, dust behind), meet their foe in the middle of
    // the gap and fall back to their rows (dust, sparks), fall back under orders, or break and run; volleys of arrows arc from the
    // archers, fire takes a wing in the woods or on the water, a breached run of wall slumps
    const LANE = 2.3, ROW = 1.35;
    const gridPos = (lane, row, slot = 0) => {
      const c = BT.center, a = (row - 4.5) * ROW, l = (lane - 1) * LANE + slot * 0.5;
      const x = c[0] + BT.u[0] * a + BT.v[0] * l, z = c[1] + BT.u[1] * a + BT.v[1] * l;
      return [x, terr.h(x, z), z];
    };
    const arrowGeo = (() => { const k = P5.kit(); k.add(new T.BoxGeometry(0.3, 0.012, 0.012), 0x2a2118, [0, 0, 0]); k.add(new T.BoxGeometry(0.06, 0.03, 0.004), 0xd8cfbf, [-0.13, 0, 0]); k.add(new T.BoxGeometry(0.04, 0.02, 0.02), 0x77777f, [0.16, 0, 0]); return k.geo(); })();
    const ARROWS = LOW ? 60 : 140, arrowMat = new T.MeshBasicMaterial({ vertexColors: true });
    const wingModel = (w, fid) => {
      const g = new T.Group(), cap = S.wingCap(w);
      const cols = w.arm === 'ky' ? 3 : w.arm === 'thuy' ? 1 : 4, dx = w.arm === 'ky' ? 0.52 : w.arm === 'thuy' ? 1.3 : 0.32, dz = w.arm === 'ky' ? 0.4 : w.arm === 'thuy' ? 0.8 : 0.32;
      const block = (geo, n, c, sx, sz) => { const m = colored(new T.InstancedMesh(geo, HM.mat, n)), m4 = new T.Matrix4(); for (let k = 0; k < n; k++) m.setMatrixAt(k, m4.makeTranslation(-Math.floor(k / c) * sx, 0, ((k % c) - (Math.min(c, n) - 1) / 2) * sz)); m.castShadow = true; m.frustumCulled = false; g.add(m); return m; };
      const m = block(HM.figure(w.arm, fid), cap, cols, dx, dz);
      // boats on the water, the same men as marines when the wing stands on land
      const ashore = w.arm === 'thuy' ? block(HM.figure('thuy-foot', fid), clamp(Math.round(w.start / 180), 3, 12), 4, 0.32, 0.32) : null;
      const st = standard(fid, 1.5, 0.55); st.position.set(0.3, 0, -0.5); g.add(st);
      const ring = new T.Mesh(ringGeo, ringMat(GOLD, 0.6)); ring.scale.setScalar(0.8); ring.position.set(-0.3, 0.1, 0); ring.renderOrder = 6; ring.visible = false; g.add(ring); // the player's wings wear a small gold ring
      g.scale.setScalar(1.25);
      // the ground the block covers, along its facing (a0..a1, behind the front rank to just ahead) and across (± l), in world units
      const rowsN = Math.ceil(cap / cols), foot = { a0: -((rowsN - 1) * dx + 0.4) * 1.25, a1: 0.5, l: ((Math.min(cols, cap) - 1) * dz / 2 + 0.35) * 1.25 };
      return { g, mesh: m, ashore, cap, ring, st, foot, fwd: [1, 0], mine: false };
    };
    // a random point on a wing's block, in world units, raised by y
    const onBlock = (Wg, y = 0) => { const k = Wg.foot, a = k.a0 + Math.random() * (k.a1 - k.a0), l = (Math.random() * 2 - 1) * k.l, p = Wg.g.position, f = Wg.fwd; return [p.x + f[0] * a - f[1] * l, p.y + y, p.z + f[1] * a + f[0] * l]; };
    const SIEGE = 1.6, WALL_H = [0.2, 0.3, 0.42, 0.52, 0.62]; // the wall's height by lũy, in the kit's units (han-models.js LV)
    const battleEnd = () => {
      if (!BT.g) return;
      BT.g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); else if (x.isMesh && x.userData.own) x.geometry.dispose(); });
      for (const Wg of Object.values(BT.wings)) { Wg.label.free(); freeStd(Wg.st); }
      for (const L of BT.labels) L.free();
      root.remove(BT.g); BT.g = null; BT.on = false; BT.shown = null; BT.wings = {}; BT.fx = []; BT.walls = []; BT.labels = []; BT.sel = null; BT.hover = null; BT.flag = null; BT.arrows = null;
      for (const t of Object.values(towns)) { if (t.model) t.model.visible = true; if (t.std) t.std.visible = true; }
      for (const m of Object.values(armies)) m.g.visible = !m.left;
      if (reachG) reachG.visible = true;
      if (orderG) orderG.visible = true;
      selRing.visible = false; placeSel(); scaleMarkers(); dirty = true;
    };
    const battleBegin = (b) => {
      battleEnd();
      const site = b.site, { P, u, v } = axisOf(site, b.from !== undefined && b.from !== null ? b.from : ownSeat(site));
      BT.u = u; BT.v = v; BT.me = b.me || 'A'; BT.siege = !!b.siege; BT.site = site; BT.shown = null;
      // a siege: the town itself, grown so its face toward the attacker spans the three lanes (its walls, the lane runs and the
      // men on them share that scale); that face is laid as three runs, one a lane, each breached on its own
      const L = (place[site] && place[site].size) || 4.4, sk = b.siege ? (3 * LANE) / L : SIEGE, front = sk * (L / 2);
      BT.center = b.siege ? [P.x + u[0] * (ROW * 0.9 - front), P.z + u[1] * (ROW * 0.9 - front)] : [P.x - u[0] * 3.2, P.z - u[1] * 3.2]; // row 3.6, the wall line, on the town's face
      BT.g = new T.Group(); root.add(BT.g); BT.on = true; BT.wings = {}; BT.fx = []; BT.walls = []; BT.labels = []; BT.flag = null;
      if (BT.siege && towns[site] && towns[site].model) towns[site].model.visible = false;
      if (BT.siege && BT.me !== 'A' && towns[site] && towns[site].std) towns[site].std.visible = false; // defending: the wings on the wall carry the flags
      if (BT.siege) {
        const lv = clamp(b.walls ?? 3, 0, 4), ang = Math.atan2(-v[1], v[0]), face = Math.atan2(-u[0], -u[1]); BT.wallTop = WALL_H[lv] * sk - 0.05; BT.wallY = P.y;
        const town = HM.town({ level: lv, seed: seedOf(site), size: L, open: true });
        town.position.set(P.x, P.y, P.z); town.rotation.y = face; town.scale.setScalar(sk); BT.g.add(town); // cached geometry: battleEnd leaves it
        const fa = town.userData.flagAt; if (fa && BT.me === 'A') BT.flag = { site, at: [(fa[0] * Math.cos(face) + fa[2] * Math.sin(face)) * sk, fa[1] * sk, (-fa[0] * Math.sin(face) + fa[2] * Math.cos(face)) * sk] }; // the owner's standard over the hall
        const wallGeo = HM.siegeWall((LANE * 0.93) / sk, lv), gateGeo = HM.siegeWall((LANE * 0.93) / sk, lv, true), towerGeo2 = HM.siegeTower(lv);
        for (let l = 0; l < 3; l++) { const p = gridPos(l, 3.6), wall = new T.Mesh(l === 1 ? gateGeo : wallGeo, HM.mat); wall.position.set(p[0], P.y, p[2]); wall.rotation.y = ang; wall.scale.setScalar(sk); wall.castShadow = true; wall.receiveShadow = true; BT.g.add(wall); BT.walls.push(wall); }
        for (let k = 1; k < 3; k++) { const p = gridPos(k - 0.5, 3.6), t = new T.Mesh(towerGeo2, HM.mat); t.position.set(p[0], P.y, p[2]); t.rotation.y = ang; t.scale.setScalar(sk); t.castShadow = true; BT.g.add(t); } // the corners are the town's own towers
      }
      // the arrows of every volley: one instanced mesh, laid each frame from the flights in the air
      BT.arrows = new T.InstancedMesh(arrowGeo, arrowMat, ARROWS); BT.arrows.count = 0; BT.arrows.frustumCulled = false; BT.g.add(BT.arrows);
      if (BT.flag) scaleMarkers();
      for (let l = 0; l < 3; l++) { const L2 = newLabel(() => { const p = gridPos(l, BT.me === 'A' ? -0.2 : BT.siege ? 3.1 : 5.6); return [p[0], p[1] + 0.1, p[2]]; }, 'battle', 3); BT.labels.push(L2); }
      for (const m of Object.values(armies)) m.g.visible = false;
      for (const c of Object.values(camps)) c.g.visible = false;
      if (reachG) reachG.visible = false;
      if (orderG) orderG.visible = false;
      selRing.visible = false; hoverRing.visible = false;
      const md = gridPos(1, 2.9), back = BT.me === 'A' ? [-u[0], -u[1]] : u, over = BT.siege && BT.me === 'D'; // defending a town: from above its wall
      flyTo({ t: [md[0], md[2]], dist: over ? 17 : 15, az: Math.atan2(back[0], back[1]) + 0.3, el: over ? 0.85 : 0.55 }, 1100);
      dirty = true;
    };
    // the seat an attack on `site` most likely comes from: the nearest town that is ours in the last View
    const ownSeat = (site) => {
      const P = place[site]; let best = null;
      for (const t of view ? view.towns : []) if (t.owner === view.me && t.id !== site && place[t.id]) { const d = Math.hypot(place[t.id].x - P.x, place[t.id].z - P.z); if (!best || d < best.d) best = { d, id: t.id }; }
      return best ? best.id : null;
    };
    const battleShow = (b, me, ms0) => {
      if (!BT.on || BT.site !== b.site) battleBegin({ site: b.site, from: b.from, me, siege: b.siege, walls: b.walls });
      if (me) BT.me = me;
      const now = performance.now(), cells = {}, fresh = !Object.keys(BT.wings).length;
      const turnKey = b.turn + ':' + ((b.log && b.log.length) || 0) + ':' + !!b.over, again = BT.shown === turnKey; BT.shown = turnKey;
      const ev = (!again && b.log && b.log.length && b.log[b.log.length - 1].ev) || [], acted = !fresh && ev.length > 0;
      const ms = ms0 || (fresh ? 900 : acted ? 1900 : 900);
      BT.labels.forEach((L, l) => L.set(LANE_NAME[(b.lanes || [])[l]] || '', { px: 10, bold: false, below: false, bg: 'rgba(24,19,14,0.5)', color: '#d8ccb0' }));
      for (const w of b.wings) {
        const fid = b[w.side].fid, mine = w.side === BT.me;
        let Wg = BT.wings[w.id], born = false;
        if (!Wg) {
          Wg = BT.wings[w.id] = wingModel(w, fid); BT.g.add(Wg.g); born = true;
          const p0 = gridPos(w.lane, w.row + (w.side === 'A' ? -1.2 : 1.2)); Wg.g.position.set(p0[0], p0[1], p0[2]);
          Wg.label = newLabel(() => { const p = Wg.g.position; return [p.x, p.y + 1.85, p.z]; }, 'battle', 2);
        }
        Wg.mine = mine; Wg.ring.visible = mine && !w.gone;
        // in a siege the defenders' rows 4–5 are the walls: those wings stand on the wall top, side by side along it
        const onWall = BT.siege && w.side === 'D' && w.row >= 4, key = onWall ? 'W' + w.lane : w.side + w.lane + ':' + w.row, slot = (cells[key] = (cells[key] ?? -1) + 1);
        const fwd = w.side === 'A' ? BT.u : [-BT.u[0], -BT.u[1]];
        const to = onWall ? gridPos(w.lane, 3.75 + (w.row - 4) * 0.3, S.wingSlot(slot) * 1.1) : gridPos(w.lane, w.row, S.wingSlot(slot));
        if (onWall && !w.gone) to[1] = BT.wallY + BT.wallTop;
        const wet = w.arm === 'thuy' && inWater(to[0], to[2]);
        if (wet) to[1] = waterY(to[0], to[2]) + 0.02;
        if (Wg.ashore) { Wg.mesh.visible = wet; Wg.ashore.visible = !wet; Wg.ashore.count = w.gone ? 0 : Math.max(1, Math.ceil((Math.max(0, w.men) / w.start) * Wg.ashore.instanceMatrix.count)); }
        const was = Wg.gone, broke = w.gone && !was && !born; // routed or gone off the field this turn
        const shown = S.wingShown(w, Wg.cap), from = Wg.g.position.toArray(), side = Math.hypot(to[0] - from[0], to[2] - from[2]) > 0.2 && Math.abs((to[0] - from[0]) * BT.v[0] + (to[2] - from[2]) * BT.v[1]) > 1.2; // a lane change swings wide
        Wg.gone = !!w.gone; Wg.men = w.men; Wg.fwd = fwd; Wg.g.rotation.set(0, Math.atan2(-fwd[1], fwd[0]), 0);
        Wg.tw = { from, to, t0: now, ms, fwd, charge: !!w.charge, arc: side, back: w.order === 'rut' || (!w.gone && ((to[0] - from[0]) * fwd[0] + (to[2] - from[2]) * fwd[1]) < -0.3), shake: w.hit > 0 ? Math.min(0.1, w.hit / 3000) : 0, c0: Wg.mesh.count, c1: w.gone ? (broke ? Wg.mesh.count : 0) : shown, fade: w.gone, rout: broke, lunge: null, dustAcc: 0 };
        Wg.label.set(w.gone ? '' : fmt(Math.max(0, w.men)), { px: 11, bar: CSS[fid], mine, dim: !!w.routed });
      }
      if (!fresh && !again) {
        // melee: each pair meets in the middle of the gap between them, then both fall back to their rows
        for (const e of ev) if (e.kind === 'melee' && BT.wings[e.a] && BT.wings[e.d]) {
          const A = BT.wings[e.a], D = BT.wings[e.d], m = [(A.tw.to[0] + D.tw.to[0]) / 2, (A.tw.to[1] + D.tw.to[1]) / 2, (A.tw.to[2] + D.tw.to[2]) / 2];
          A.tw.lunge = { at: m, k: e.charge ? 0.9 : 0.72, t: 0.48, big: !!e.charge }; D.tw.lunge = { at: m, k: 0.6, t: 0.48 };
          BT.fx.push({ kind: 'clash', at: m, t0: now + ms * 0.66, big: !!e.charge, done: false });
        }
        // volleys: three waves of arrows from the archers' block onto the one they shot
        for (const w of b.wings) {
          if (!w.shot || !BT.wings[w.id] || !BT.wings[w.shot]) continue;
          const n = LOW ? 7 : 13;
          for (let v2 = 0; v2 < 3; v2++) for (let k = 0; k < n; k++) BT.fx.push({ kind: 'arrow', from: w.id, to: w.shot, t0: now + ms * (0.14 + v2 * 0.13) + k * 18, ms: 520 + Math.random() * 120, a: null, b: null });
        }
        // fire: burning arrows first, then the wing burns for a while
        for (const e of ev) if (e.kind === 'fire' && BT.wings[e.target]) {
          if (BT.wings[e.wing]) for (let k = 0; k < 10; k++) BT.fx.push({ kind: 'arrow', from: e.wing, to: e.target, t0: now + ms * 0.12 + k * 30, ms: 560, fire: true, a: null, b: null });
          BT.fx.push({ kind: 'burn', wing: e.target, t0: now + ms * 0.4, until: now + ms * 0.4 + 4200, acc: 0 });
        }
        // a breach: the run of wall at that lane slumps in a cloud of earth
        for (const w of b.wings) if (w.breach && w.side === 'A' && BT.walls[w.lane] && !BT.walls[w.lane].userData.down) { BT.walls[w.lane].userData.down = true; BT.fx.push({ kind: 'breach', m: BT.walls[w.lane], t0: now + ms * 0.62, ms: 650, s0: BT.walls[w.lane].scale.y, done: false }); }
      } else for (const w of b.wings) if (w.breach && w.side === 'A' && BT.walls[w.lane] && !BT.walls[w.lane].userData.down) { const m = BT.walls[w.lane]; m.userData.down = true; m.scale.y = SIEGE * 0.4; m.rotation.x = 0.14; }
      dirty = true;
    };
    const m4a = new T.Matrix4(), qa = new T.Quaternion(), ea = new T.Euler(), va = new T.Vector3(), ONE = new T.Vector3(1, 1, 1);
    const stepBattle = (now, dt) => {
      if (!BT.on) return false;
      let any = false;
      for (const Wg of Object.values(BT.wings)) {
        const t = Wg.tw; if (!t) continue;
        const u = clamp((now - t.t0) / t.ms, 0, 1);
        // the move: a charge covers the ground in the first third at a run; a march in the first half; a withdrawal slowly
        const span = t.charge ? 0.34 : t.back ? 0.62 : 0.5, um = clamp(u / span, 0, 1), e = t.charge ? um * um * (3 - 2 * um) : ease(um);
        let x = t.from[0] + (t.to[0] - t.from[0]) * e, y = t.from[1] + (t.to[1] - t.from[1]) * e, z = t.from[2] + (t.to[2] - t.from[2]) * e;
        if (t.arc) { const bow = Math.sin(Math.PI * e) * 0.9; x -= t.fwd[0] * bow; z -= t.fwd[1] * bow; } // a flank ride swings out behind the line
        if (t.lunge) { const v = clamp((u - t.lunge.t) / 0.34, 0, 1), k = Math.sin(Math.PI * v) * t.lunge.k; x += (t.lunge.at[0] - t.to[0]) * k; z += (t.lunge.at[2] - t.to[2]) * k; }
        const sh = u > 0.5 && u < 0.9 ? t.shake * Math.sin(now * 0.07) : 0;
        let yaw = Math.atan2(-t.fwd[1], t.fwd[0]);
        if (t.rout) { const v = clamp((u - 0.58) / 0.42, 0, 1); yaw += Math.PI * Math.min(1, v * 3); x -= t.fwd[0] * v * 2.6 * ROW; z -= t.fwd[1] * v * 2.6 * ROW; Wg.mesh.count = Math.round(t.c0 * (1 - v)); }
        else Wg.mesh.count = Math.round(t.c0 + (t.c1 - t.c0) * clamp(u / 0.8, 0, 1));
        Wg.g.position.set(x + sh, t.rout || t.fade ? footY(x, z) : y, z + sh); Wg.g.rotation.y = yaw;
        // dust under a moving block, thick under a charge or a rout
        const moving = (um < 1 && Math.hypot(t.to[0] - t.from[0], t.to[2] - t.from[2]) > 0.3) || (t.rout && u > 0.58 && u < 1);
        if (moving && u < 1) { t.dustAcc += dt * (t.charge || t.rout ? 18 : 8) * (LOW ? 0.5 : 1); while (t.dustAcc >= 1) { t.dustAcc -= 1; const p = onBlock(Wg, 0.05); emit('dust', p[0], p[1], p[2], { s: 0.55 }); } }
        if (t.fade && u >= 1) Wg.g.visible = false; else if (!t.fade) Wg.g.visible = true;
        if (u < 1) any = true; else Wg.tw = Object.assign(t, { from: t.to.slice(), c0: t.fade ? 0 : t.c1, lunge: null, charge: false, arc: false, back: false, rout: false, shake: 0 });
      }
      // arrows in the air (laid into one instanced mesh), clashes, fire, breaches
      let na = 0;
      BT.fx = BT.fx.filter((f) => {
        if (now < f.t0) { any = true; return true; }
        const u = (now - f.t0) / (f.ms || 1);
        if (f.kind === 'arrow') {
          const A = BT.wings[f.from], B = BT.wings[f.to]; if (!A || !B) return false;
          if (!f.a) { f.a = onBlock(A, 0.45); f.b = onBlock(B, 0.05); f.h = 0.7 + Math.hypot(f.b[0] - f.a[0], f.b[2] - f.a[2]) * 0.28; }
          if (u >= 1) { if (Math.random() < 0.3) emit('dust', f.b[0], f.b[1], f.b[2], { s: 0.25 }); if (f.fire) emit('fire', f.b[0], f.b[1] + 0.1, f.b[2], { s: 0.8 }); return false; }
          const x = f.a[0] + (f.b[0] - f.a[0]) * u, z = f.a[2] + (f.b[2] - f.a[2]) * u, y = f.a[1] + (f.b[1] - f.a[1]) * u + 4 * f.h * u * (1 - u);
          const vy = f.b[1] - f.a[1] + 4 * f.h * (1 - 2 * u), hz = Math.hypot(f.b[0] - f.a[0], f.b[2] - f.a[2]);
          if (na < ARROWS && BT.arrows) BT.arrows.setMatrixAt(na++, m4a.compose(va.set(x, y, z), qa.setFromEuler(ea.set(0, Math.atan2(-(f.b[2] - f.a[2]), f.b[0] - f.a[0]), Math.atan2(vy, hz), 'YZX')), ONE));
          if (f.fire && Math.random() < 0.5) emit('flame', x, y, z, { s: 0.35 });
          any = true; return true;
        }
        if (f.kind === 'clash') {
          if (!f.done) { f.done = true; const [x, y, z] = f.at, n = LOW ? 3 : 6; burst('dustBig', x, y + 0.1, z, n, 0.9, f.big ? 0.8 : 0.6, 0.6); burst('spark', x, y + 0.45, z, f.big ? 14 : 9, 0.6, 0.9, 1.6); emit('flash', x, y + 0.4, z, { s: f.big ? 1.1 : 0.8 }); }
          return false;
        }
        if (f.kind === 'burn') {
          const W2 = BT.wings[f.wing]; if (!W2 || now > f.until || !W2.g.visible) return false;
          f.acc += dt * (LOW ? 16 : 34);
          while (f.acc >= 1) { f.acc -= 1; const p = onBlock(W2, 0.08), k = Math.random(); emit(k < 0.62 ? 'fire' : k < 0.84 ? 'soot' : 'ember', p[0], p[1], p[2], { s: k < 0.62 ? 0.9 : 0.55 }); }
          any = true; return true;
        }
        if (f.kind === 'breach') {
          const v = clamp(u, 0, 1), m = f.m; m.scale.y = f.s0 * (1 - 0.6 * ease(v)); m.rotation.x = 0.14 * ease(v);
          if (!f.done) { f.done = true; const p = m.position; burst('dustBig', p.x, p.y + 0.4, p.z, LOW ? 5 : 10, 1.1, 0.9, 0.5); burst('spark', p.x, p.y + 0.6, p.z, 8, 0.8, 0.8, 1.2); }
          if (u >= 1) return false; any = true; return true;
        }
        return false;
      });
      if (BT.arrows) { BT.arrows.count = na; BT.arrows.instanceMatrix.needsUpdate = true; }
      return any;
    };
    // the wing under a screen point: its pill first, then the ground its block covers (the one whose middle is nearest), then the nearest block by its size on screen
    const pickWing = (x, y) => {
      if (!BT.on) return null;
      const live = Object.entries(BT.wings).filter(([, Wg]) => Wg.g.visible && !Wg.gone);
      for (const [id, Wg] of live) { const r = Wg.label.rect; if (r && x >= r.x0 - 4 && x <= r.x1 + 4 && y >= r.y0 - 4 && y <= r.y1 + 4) return id; }
      let best = null;
      const co = camera.position, rd = dir.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(co).normalize(); // the tap's ray, cut by the plane of each block (a wing on a wall stands higher)
      for (const [id, Wg] of live) {
        const p = Wg.g.position, f = Wg.fwd, k = Wg.foot, t = (p.y + 0.4 - co.y) / rd.y; if (!(t > 0)) continue;
        const rx = co.x + rd.x * t - p.x, rz = co.z + rd.z * t - p.z, a = rx * f[0] + rz * f[1], l = -rx * f[1] + rz * f[0];
        if (a < k.a0 || a > k.a1 || Math.abs(l) > k.l) continue;
        const d = Math.hypot((a - (k.a0 + k.a1) / 2) / (k.a1 - k.a0), l / k.l);
        if (!best || d < best.d) best = { id, d };
      }
      if (best) return best.id;
      for (const [id, Wg] of live) {
        const p = Wg.g.position, c = rt.project([p.x, p.y + 0.6, p.z]); if (!c.visible) continue;
        const e = rt.project([p.x + BT.v[0] * 1.15, p.y + 0.6, p.z + BT.v[1] * 1.15]), r = Math.max(34, Math.hypot(e.x - c.x, e.y - c.y) * 1.05 + 10), d = Math.hypot(c.x - x, c.y - y) / r;
        if (d < 1 && (!best || d < best.d)) best = { id, d };
      }
      return best ? best.id : null;
    };
    // our wings' rings: white on the one selected, brighter under the mouse
    const paintRings = () => { for (const [k, Wg] of Object.entries(BT.wings)) { Wg.ring.material.color.setHex(k === BT.sel ? 0xffffff : GOLD); Wg.ring.material.opacity = k === BT.hover ? 0.95 : 0.6; } dirty = true; };
    const battleSelect = (id) => { BT.sel = id && BT.wings[id] ? id : null; paintRings(); };
    const battleHover = (id) => { if (!BT.on || BT.hover === id) return; BT.hover = id; paintRings(); };
    // screen positions of the wing blocks and of the lanes (for a page that draws its own chips)
    const battleCards = () => (BT.on ? Object.entries(BT.wings).filter(([, Wg]) => Wg.g.visible && !Wg.gone).map(([id, Wg]) => {
      const p = Wg.g.position, q = rt.project([p.x, p.y + 1.35, p.z]), m = (Wg.foot.a0 + Wg.foot.a1) / 2, b = rt.project([p.x + Wg.fwd[0] * m, p.y + 0.4, p.z + Wg.fwd[1] * m]);
      const r = Wg.label.rect;
      return { id, x: q.x, y: q.y, visible: q.visible, body: { x: b.x, y: b.y }, pill: r ? { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 } : null }; // above the block, on it, and its pill as drawn
    }) : []);
    const laneCards = () => (BT.on ? [0, 1, 2].map((l) => { const p = gridPos(l, BT.me === 'A' ? 0.5 : 5.3), q = rt.project([p[0], p[1], p[2]]); return { lane: l, x: q.x, y: q.y, visible: q.visible }; }) : []);

    // ------------------------------------------------------------ labels on screen, frame loop (renders only when something changed)
    // pills that would cover one another are pushed up in screen space (a town's name first, then an army's count, then a wing's)
    const updateLabels = () => {
      const k = (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) / H, vis = [];
      for (const L of labels) {
        const on = L.on && L.key && ((L.layer === 'battle') === BT.on);
        L.sprite.visible = !!on; if (!on) { L.rect = null; continue; }
        const p = L.anchor(); L.sprite.position.set(p[0], p[1], p[2]); L.sprite.scale.set(L.w * k, L.h * k, 1);
        const q = rt.project(p); L.sx = q.x; L.sy = q.y; vis.push(L);
      }
      vis.sort((a, b) => a.prio - b.prio || b.sy - a.sy);
      const placed = [];
      for (const L of vis) {
        const top0 = L.below ? L.sy : L.sy - L.h; let shift = 0;
        for (let pass = 0; pass < 8; pass++) {
          const y0 = top0 - shift, hit = placed.find((r) => L.sx - L.w / 2 < r.x1 && L.sx + L.w / 2 > r.x0 && y0 < r.y1 && y0 + L.h > r.y0);
          if (!hit) break;
          shift = top0 + L.h - hit.y0 + 2;
        }
        shift = Math.min(shift, 70);
        placed.push(L.rect = { x0: L.sx - L.w / 2, x1: L.sx + L.w / 2, y0: top0 - shift, y1: top0 - shift + L.h });
        L.sprite.center.y = (L.below ? 1 : 0) - shift / L.h;
      }
    };
    const render0 = rt.render;
    rt.render = () => {
      orientFlags(); updateLabels(); render0();
      const r = rt.renderer, ac = r.autoClear; r.autoClear = false; r.render(hud, camera); r.autoClear = ac;
    };
    let running = false, onFrame = null, tWave = 0, tAmb = 0, last = 0;
    const draw = () => rt.render();
    const frame = (now) => {
      if (!running) return;
      const dt = clamp((now - (last || now)) / 1000, 0, 0.25); last = now;
      if (rigFn) {
        const r = rigFn(now);
        if (r) {
          const k = r.snap ? 1 : 1 - Math.exp(-dt * (r.k || 2.4));
          if (r.t) { cam.t[0] += (r.t[0] - cam.t[0]) * k; cam.t[1] += (r.t[1] - cam.t[1]) * k; }
          if (r.dist) cam.dist = Math.exp(Math.log(cam.dist) + (Math.log(r.dist) - Math.log(cam.dist)) * k);
          if (r.az != null) cam.az += S.turn(cam.az, r.az) * k;
          if (r.el != null) cam.el += (r.el - cam.el) * k;
          setView(makeView()); scaleMarkers(); dirty = true;
          if (r.end) endRig();
        }
      } else if (anim) {
        const u = clamp((now - anim.t0) / anim.ms, 0, 1), e = ease(u), A = anim.from, B = anim.to;
        cam.t = [A.t[0] + (B.t[0] - A.t[0]) * e, A.t[1] + (B.t[1] - A.t[1]) * e]; cam.dist = Math.exp(Math.log(A.dist) + (Math.log(B.dist) - Math.log(A.dist)) * e); cam.az = A.az + (B.az - A.az) * e; cam.el = A.el + (B.el - A.el) * e;
        setView(makeView()); scaleMarkers(); dirty = true; if (u >= 1) endFly();
      }
      if (stepMarch(now, dt)) dirty = true;
      if (stepBeats(now)) dirty = true;
      if (stepCamps(now, dt)) dirty = true;
      if (stepBattle(now, dt)) dirty = true;
      // what only lives (smoke, fires, the selection's glow) draws at ~30 frames a second when nothing else moves
      const alive = stepParticles(dt), glow = selRing.visible;
      if (glow) { selRing.material.opacity = 0.78 + 0.2 * Math.sin(now * 0.006); }
      if ((alive || glow) && now - tAmb > 33) { tAmb = now; dirty = true; }
      if (now - tWave > 200) { tWave = now; dirty = true; root.traverse((f) => { if (f.userData.flag && f.children[0]) f.children[0].rotation.y = Math.sin(now * 0.003 + f.id) * 0.18; }); }
      if (dirty) { draw(); dirty = false; if (onFrame) onFrame(); }
      requestAnimationFrame(frame);
    };
    const loop = (cb) => { onFrame = cb; if (!running) { running = true; requestAnimationFrame(frame); } };
    const stop = () => { running = false; };
    // jump every animation to its end and draw (tests, harness; also a skip)
    const finish = () => {
      if (anim) { Object.assign(cam, anim.to); endFly(); setView(makeView()); scaleMarkers(); }
      const far = performance.now() + 1e6;
      stepMarch(far, 0); stepBeats(far);
      for (const c of Object.values(camps)) if (c.state === 'rising') { c.u = 1; c.state = 'up'; layCamp(c); } else if (c.state === 'striking') dropCamp(c.id);
      stepBattle(far, 0);
    };
    const settle = () => { finish(); draw(); dirty = false; };
    // the weight of one frame: draw calls and triangles (shadow pass, scene, lens and labels), buffers, timings
    const measure = () => { const r = rt.renderer; r.info.autoReset = false; r.info.reset(); const f0 = performance.now(); draw(); r.getContext().finish(); const st = K.stats(r, scene, { frameMs: performance.now() - f0 }); r.info.autoReset = true; return st; };

    cam.dist = fitDist(cam.az, cam.el); cam.t = overviewT(cam.dist, cam.az);
    terr.G = clipG; try { rt.prepare(Object.assign(makeView(), { key: 'hn-region' })); } finally { terr.G = G0; } // the near ground is built here, once
    apply();
    setTimeout(() => { grid = grid || buildGrid(); }, 1200); // the road grid (~50 ms) before anyone needs a path

    // ------------------------------------------------------------ the season on the map, for its director (src/world/huainan-map-play.js)
    const play = {
      get hold() { return holdBeats; }, set hold(v) { holdBeats = !!v; if (!v) flushBeats(); },
      view: () => view,
      stands: (v) => standsFor(v),
      // where an army is now ([x, z]), how large the figures are drawn, how far out from a town's centre its walls reach on the map
      at: (id) => (armies[id] ? [armies[id].g.position.x, armies[id].g.position.z] : null),
      scale: () => markerScale(),
      armyR: (id) => ((armies[id] && armies[id].g.userData.r) || 1.4) * markerScale(),
      exit: (id, len = 30) => {
        const m = armies[id]; if (!m) return null;
        const c = [m.g.position.x, m.g.position.z], away = (p) => Math.hypot(p[0] - mid[0], p[1] - mid[1]);
        if (m.a.arm === 'fleet') { // walk the nearest river both ways; the end farther from the middle of the play area
          let best = null;
          for (const rv of terr.water.rivers) rv.pts.forEach((p, i) => { const d = Math.hypot(p[0] - c[0], p[1] - c[1]); if (!best || d < best.d) best = { d, rv, i }; });
          if (best && best.d < 8) {
            const ends = [-1, 1].map((sg) => { let L = 0, i = best.i; while (L < len && i + sg >= 0 && i + sg < best.rv.pts.length) { const a = best.rv.pts[i], b = best.rv.pts[i + sg]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); i += sg; } return [best.rv.pts[i][0], best.rv.pts[i][1]]; });
            return away(ends[0]) > away(ends[1]) ? ends[0] : ends[1];
          }
        }
        let d = [c[0] - mid[0], c[1] - mid[1]], seat = null;
        for (const p of Object.values(place)) if (p.kind === 'seat' && p.owner === m.a.fid) { const k = Math.hypot(p.x - c[0], p.z - c[1]); if (!seat || k < seat.k) seat = { k, p }; }
        if (seat) d = [seat.p.x - c[0], seat.p.z - c[1]];
        const L = Math.hypot(d[0], d[1]) || 1;
        return [clamp(c[0] + (d[0] / L) * len, box.x0 - PG.M + 2, box.x1 + PG.M - 2), clamp(c[1] + (d[1] / L) * len, box.z0 - PG.M + 2, box.z1 + PG.M - 2)];
      },
      townR: (id) => (place[id] ? (place[id].kind === 'town' ? (place[id].size / 2) * 1.02 * townScale() : 2.2) : 0),
      // o = { pts | to: [x, z], arm, end: 'stand' | 'park' | 'leave', kind: 'march' | 'retreat' | 'leave', ms, t0, face }
      march: (id, o2 = {}) => { const m = armies[id]; if (!m) return Promise.resolve(); const pts = o2.pts || pathXZ([m.g.position.x, m.g.position.z], o2.to, o2.arm || m.a.arm); m.g.visible = !BT.on; m.left = false; return march(id, pts, o2); },
      moving: (id) => !!(armies[id] && armies[id].moving),
      camp: (id, fid, men, home, ms = 1300) => { const c = pitchCamp(id, fid, men, home ?? 0, { ms }); return c ? c.lay.Rc * townScale() : 0; },
      hasCamp: (id) => !!camps[id] && camps[id].state !== 'striking',
      // where two sides meet: dust thrown up, sparks, a flash
      clash: (x, z, s = 1) => { const y = footY(x, z), k = markerScale() * s; burst('dustBig', x, y + 0.2 * k, z, LOW ? 5 : 10, 1.2 * k, k, 0.8 * k); burst('spark', x, y + 0.6 * k, z, 12, 0.8 * k, k, 2 * k); emit('flash', x, y + 0.6 * k, z, { s: k * 1.2 }); dirty = true; },
      dust: (x, z, n = 6, s = 1) => { const k = markerScale() * s; burst('dustBig', x, footY(x, z) + 0.1 * k, z, n, 1.2 * k, k, 0.5 * k); },
      beat, flushBeats, rig, endRig, fitPts, emit,
      orders: (on) => { ordersOff = !on; drawOrders(); dirty = true; },
      finish: () => { finish(); dirty = true; },
    };

    return {
      rt, place, towns, armies, cam, GROUND, tier: tierName(), trees, region: REGION, camps,
      sync, pick, select, targets, focus, overview, loop, stop, settle, measure,
      battle: { begin: battleBegin, show: battleShow, pickWing, select: battleSelect, hover: battleHover, end: battleEnd, cards: battleCards, lanes: laneCards, get on() { return BT.on; } },
      lanesAt, terrainAt, groundAt, screenOf, gesture, bind, flyTo, apply, waterY, inWater, fitDist,
      fly, orbit, path, play,
      get dirty() { return dirty; }, set dirty(v) { dirty = v; },
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = S;
  else root.HuaiNanScene = S;
})(typeof window !== 'undefined' ? window : globalThis);
