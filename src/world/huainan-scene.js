// The Huai Nan scene of v2 (docs/design/v2-build.md §S): demo 1's 3D scene (docs/phases/v2-gameplay/demo1/src/hn-scene.js, the
// look the owner approved) on the normal world runtime, with the model kit of src/world/han-models.js. Drawn at Civ's scale:
// walled towns several km wide, an army a few large figures by arm round the general's banner on a base in the faction's
// colour, a battle's wings as blocks by lane × row over the real ground. Presentation only: it draws the View (and the
// Battle state) it is given; towns, names and rivers come from data/scenario/huainan.json (towns, seats, factions).
//
//   const sc = await HuaiNanScene.create(rt, { data, width, height, quality })   rt = WorldRuntime.create({ …, hamlets: false })
//   sc.sync(view) · sc.pick(x, y) · sc.select(sel) · sc.targets(armyId, targets) · sc.focus(id) · sc.overview()
//   sc.battle.begin({ site, from, me, siege }) · .show(b, me) · .pickWing(x, y) · .end()
//   sc.loop(onFrame) · sc.stop() · sc.measure()      + sc.bind(el, { onTap }) for the camera gestures, sc.lanesAt(site, from)
// Loads after three r146 (+ BufferGeometryUtils, RoundedBoxGeometry), kit.js, terrain.js, terrain-real.js, world-runtime.js and
// han-models.js. The pure helpers (counts, labels, wing cells) are exported for Node (tests/huainan-scene.test.mjs).
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

  S.create = async function (rt, o) {
    const T = THREE, terr = rt.terr, scene = rt.scene, MC = rt.MC, camera = rt.camera, doc = document;
    const data = o.data, W = o.width || rt.size.width, H = o.height || rt.size.height;
    const FAC = data.factions || {};
    const COLOR = {}, GLYPH = {}, CSS = {};
    for (const [k, f] of Object.entries(FAC)) { COLOR[k] = parseInt(f.color.slice(1), 16); GLYPH[k] = f.glyph; CSS[k] = f.color; }
    const Qn = () => rt.quality || o.quality || null; // the runtime's tier object: a run-time drop mutates it
    const tierName = () => (Qn() && Qn().tier) || 'high';
    const colored = (m) => { if (m.isInstancedMesh && !m.instanceColor) m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3).fill(1), 3); return m; }; // r146: every InstancedMesh on the kit's material carries instanceColor from creation
    const recv = (m) => Terrain.receiveBaked(m, terr, 0.8);
    const HM = HanModels.create({ recv, renderer: rt.renderer, colors: COLOR });

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
    // a pole and a flag with the owner's glyph; the flag's pivot turns to the camera every frame
    const standard = (fid, h, s) => {
      const g = new T.Group();
      const pole = new T.Mesh(new T.CylinderGeometry(0.03 * s, 0.04 * s, h, 7), poleMat); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
      const tip = new T.Mesh(new T.ConeGeometry(0.06 * s, 0.2 * s, 7), finialMat); tip.position.y = h + 0.1 * s; g.add(tip);
      const piv = new T.Group(); piv.position.y = h; piv.userData.flag = true; g.add(piv);
      const cg = new T.PlaneGeometry(0.7 * s, 1.0 * s, 8, 1), cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) / s + 0.35) * 9) * 0.03 * s); cg.computeVertexNormals();
      const cloth = new T.Mesh(cg, flagMat(fid)); cloth.position.set(0.35 * s, -0.5 * s, 0); cloth.castShadow = true; piv.add(cloth);
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
    // a pill of text: dark, translucent, a bar in the faction's colour on its left, a gold outline when it is ours
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
      rr(0.5, 0.5, w - 1, h - 1, 5); g.lineWidth = st.mine ? 1.6 : 1; g.strokeStyle = st.mine ? '#f2d27a' : 'rgba(255,240,210,0.22)'; g.stroke();
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

    // ------------------------------------------------------------ towns: one walled model each, rebuilt when its lũy changes
    const root = new T.Group(); scene.add(root);
    const towns = {}, armies = {};
    let view = null, dirty = true;
    const BT = { on: false, g: null, wings: {}, center: null, u: [1, 0], v: [0, 1], fx: [], me: 'A', walls: [], lanes: [], sel: null, labels: [] };
    const zoomK = () => clamp(cam.dist / 45, 1, 4);
    const townScale = () => Math.pow(zoomK(), 0.7);
    for (const id of Object.keys(place)) {
      const p = place[id], g = new T.Group(); g.position.set(p.x, p.y, p.z); root.add(g);
      const t = towns[id] = { g, std: null, fid: undefined, level: -2, model: null, name: null };
      t.name = newLabel(() => { const ts = townScale(); return [p.x, p.y + (p.kind === 'town' ? 4.5 * ts : 4.2), p.z]; }, 'map', p.kind === 'town' ? 0 : 1);
    }
    const setTown = (id, fid, level) => {
      const t = towns[id], p = place[id];
      if (p.kind === 'town' && level !== t.level) {
        if (t.model) t.g.remove(t.model); // the geometry is cached by the model kit
        t.model = HM.town({ level, seed: [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1, size: p.size });
        t.g.add(t.model); t.level = level; t.model.visible = !(BT.on && BT.siege && BT.site === id);
      }
      if (fid !== t.fid) {
        if (t.std) { t.g.remove(t.std); freeStd(t.std); }
        t.fid = fid; t.std = fid ? standard(fid, p.kind === 'seat' ? 3.2 : 3.6, p.kind === 'seat' ? 1.3 : 1.7) : null;
        if (t.std) t.g.add(t.std);
        t.name.set(p.name, { px: p.kind === 'town' ? 13 : 11, bar: fid ? CSS[fid] : '#8a8275', dim: p.kind === 'seat' });
      }
    };

    // ------------------------------------------------------------ armies: Civ-style figures, scaled with the camera distance
    const ringGeo = new T.RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2);
    const ringMat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
    const selRing = new T.Mesh(ringGeo, ringMat(0xf2d27a, 0.95)); selRing.visible = false; selRing.renderOrder = 6; root.add(selRing);
    const tgtRings = [];
    const buildArmy = (a) => {
      const g = HM.army({ fid: a.fid, fleet: a.arm === 'fleet', seal: (a.gen && a.gen.seal) || GLYPH[a.fid], ...S.unitsOf(a) });
      g.traverse(colored); g.userData.id = a.id; return g;
    };
    const freeArmy = (g) => g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); else if (x.isMesh && x.geometry) x.geometry.dispose(); });
    const ownerOf = (id) => (place[id] && place[id].kind === 'town' && view ? (view.towns.find((t) => t.id === id) || {}).owner : place[id] && place[id].owner) || null;
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
    // every army's stand: at its town on the side of the nearest hostile town (besieging: on the side it came from, facing the town)
    const stands = () => {
      const by = {}, out = {};
      for (const a of view.armies) {
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
          const r = (armies[a.id] && armies[a.id].g.userData.r || 1.4) * s;
          if (a.arm === 'fleet') {
            const sp = waterSpots(site), w = sp[Math.min(kf++, Math.max(0, sp.length - 1))];
            out[a.id] = w ? { x: w.x, z: w.z, face: w.face } : { x: p.x + p.size / 2 + r, z: p.z + r, face: 0 }; // no water round the town: beside it
            continue;
          }
          const foe = dirTo(p, (q) => hostile(a.fid, ownerOf(q.id))), home = dirTo(p, (q) => ownerOf(q.id) === a.fid);
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
      view = v;
      for (const id of Object.keys(towns)) {
        const p = place[id], vt = p.kind === 'town' ? v.towns.find((t) => t.id === id) : null;
        setTown(id, p.kind === 'town' ? (vt && vt.owner) || null : p.owner, p.kind === 'town' ? (vt ? vt.walls : 1) : -1);
      }
      const seen = new Set();
      for (const a of v.armies || []) {
        seen.add(a.id);
        let m = armies[a.id];
        if (!m || m.sig !== S.armySig(a)) {
          if (m) { root.remove(m.g); freeArmy(m.g); }
          const keep = m; // a new look (more men, another arm) keeps the army's place, march and label
          m = armies[a.id] = { g: buildArmy(a), sig: S.armySig(a), a, label: keep ? keep.label : newLabel(() => armyAnchor(a.id), 'map', 2), to: keep ? keep.to : null, moving: keep ? keep.moving : null, site: keep ? keep.site : null, face: keep ? keep.face : 0 };
          if (keep) { m.g.position.copy(keep.g.position); m.g.rotation.copy(keep.g.rotation); }
          root.add(m.g); m.g.visible = !BT.on;
        }
        m.a = a; m.animate = opt.animate !== false;
        const mine = a.fid === v.me;
        m.label.set(S.countText(a), { px: 11, bar: CSS[a.fid], mine, below: false });
      }
      for (const id of Object.keys(armies)) if (!seen.has(id)) { root.remove(armies[id].g); freeArmy(armies[id].g); armies[id].label.free(); delete armies[id]; }
      placeArmies(true); drawOrders(); scaleMarkers(); dirty = true;
    };
    // an army stands where stands() says; when its stand moved since the last View, it marches there
    const placeArmies = (fresh) => {
      if (!view) return;
      const st = stands();
      for (const [id, m] of Object.entries(armies)) {
        const s = st[id]; if (!s) continue;
        const to = posAt(m.a, s), first = !m.to, site = m.a.besieging || m.a.at, far = !first && Math.hypot(to[0] - m.to[0], to[2] - m.to[2]) > 0.8;
        // it marches when it changes town (or its target moved while it marched); a new stand at the same town is just a new stand
        if (fresh && m.animate && !first && !BT.on && ((site !== m.site && far) || (m.moving && far))) march(id, pathBetween([m.g.position.x, m.g.position.z], [to[0], to[2]], m.a.arm), s);
        else if (!m.moving) { m.g.position.set(to[0], to[1], to[2]); m.g.rotation.y = -s.face; }
        m.to = to; m.face = s.face; m.site = site;
      }
    };

    // ------------------------------------------------------------ camera
    const cam = { t: mid.slice(), dist: 100, az: 0.3, el: 0.88 };
    // the fine ground is built round these points (the runtime: fine to 18 units, half-fine to 90): the towns, and the seats close enough to show
    const boxDist = (p) => Math.hypot(Math.max(box.x0 - p.x, 0, p.x - box.x1), Math.max(box.z0 - p.z, 0, p.z - box.z1));
    // (the low tier: one point in the middle: ground at the half-fine step over the whole play area, ~0.2 M triangles fewer)
    const REGION = tierName() === 'low' ? [mid.slice()] : Object.values(place).filter((p) => p.kind === 'town' || boxDist(p) < (o.seatReach ?? 70)).map((p) => [p.x, p.z]);
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
    const scaleMarkers = () => {
      const s = markerScale(), ts = townScale();
      for (const m of Object.values(armies)) m.g.scale.setScalar(s);
      for (const t of Object.values(towns)) { if (t.model) t.model.scale.setScalar(ts); if (t.std) { const f = (t.model && t.model.userData.flagAt) || [0, 0.05, 0]; t.std.position.set(f[0] * ts, f[1] * ts, f[2] * ts); t.std.scale.setScalar(ts); } }
      placeArmies(false); placeSel(); relayRibbons();
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
      return clamp(1.12 * Math.max(eu / tanH, (ev * Math.sin(el)) / tanV), 40, DMAX);
    };

    // ------------------------------------------------------------ gestures (the page forwards pointer and wheel events, or sc.bind does)
    const ptrs = new Map(); let g0 = null, tap = null;
    const snap = () => { const ps = [...ptrs.values()]; if (ps.length === 1) return { n: 1, x: ps[0].x, y: ps[0].y }; const [a, b] = ps; return { n: 2, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
    const gesture = {
      down(id, x, y, button) { ptrs.set(id, { x, y }); g0 = { s: snap(), cam: JSON.parse(JSON.stringify(cam)), rot: button === 2 }; tap = ptrs.size === 1 ? { x, y, t: performance.now() } : null; anim = null; },
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
      wheel(dy) { cam.dist = clamp(cam.dist * Math.exp(dy * 0.0012), DMIN, DMAX); apply(); },
      zoom(f) { cam.dist = clamp(cam.dist * f, DMIN, DMAX); apply(); },
      rotate(da) { cam.az += da; apply(); },
      tilt(de) { cam.el = clamp(cam.el + de, 0.3, 1.4); apply(); },
    };
    // pointer events of an element (the canvas or its cover) → the gestures; a tap calls onTap(pick result)
    const bind = (el, h = {}) => {
      const at = (e) => { const r = el.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
      el.style.touchAction = 'none';
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture && el.setPointerCapture(e.pointerId); gesture.down(e.pointerId, ...at(e), e.button); });
      el.addEventListener('pointermove', (e) => gesture.move(e.pointerId, ...at(e)));
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
    const pick = (x, y) => {
      if (BT.on) return { kind: 'ground', ground: null, at: groundAt(x, y) };
      let best = null;
      const consider = (kind, id, pt, r) => { const q = rt.project(pt); if (!q.visible) return; const d = Math.hypot(q.x - x, q.y - y); if (d < r && (!best || d < best.d)) best = { kind, id, d }; };
      for (const [id, m] of Object.entries(armies)) if (m.g.visible) { consider('army', id, bodyOf('army', id), 46); consider('army', id, armyAnchor(id), 34); }
      for (const [id, p] of Object.entries(place)) consider(p.kind, id, bodyOf('town', id), p.kind === 'town' ? 44 : 34);
      if (best) return { kind: best.kind, id: best.id };
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
    let sel = null;
    const placeSel = () => { if (BT.on) return; selRing.visible = !!sel && ringFor(selRing, sel.kind, sel.id); if (selRing.visible) selRing.scale.setScalar(selRing.userData.r * (selRing.userData.army ? markerScale() : 1)); };
    const select = (s) => { sel = s && s.id ? { kind: s.kind, id: s.id } : null; placeSel(); dirty = true; };

    // ------------------------------------------------------------ ribbons on the ground: the reach of an army, the routes to what it may go to, the orders given
    const flat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
    // strips: [[x, z] …] each; one geometry for all (one draw call per colour). arrows: [[x, z, dx, dz]] flat triangles at a strip's end
    const ribbons = (strips, w, mat, lift = 0.25, arrows) => {
      const pos = [], idx = [];
      for (const pts of strips) {
        const base = pos.length / 3;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * w / 2, nz = (dx / L) * w / 2, [x, z] = pts[i];
          pos.push(x + nx, Math.max(terr.h(x + nx, z + nz), 0) + lift, z + nz, x - nx, Math.max(terr.h(x - nx, z - nz), 0) + lift, z - nz);
          if (i) { const k = base + 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
        }
      }
      for (const [x, z, dx, dz, sz] of arrows || []) {
        const L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, k = pos.length / 3, tri = [[x + ux * sz, z + uz * sz], [x - ux * sz * 0.2 - uz * sz * 0.7, z - uz * sz * 0.2 + ux * sz * 0.7], [x - ux * sz * 0.2 + uz * sz * 0.7, z - uz * sz * 0.2 - ux * sz * 0.7]];
        for (const [px, pz] of tri) pos.push(px, Math.max(terr.h(px, pz), 0) + lift, pz);
        idx.push(k, k + 1, k + 2);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new T.Mesh(g, mat); m.renderOrder = 5; m.frustumCulled = false; return m;
    };
    const GOLD = 0xf2d27a, RED = 0xe5735a;
    const dropGroup = (g) => { if (g) { root.remove(g); g.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); } return null; };
    const dashes = (a, b, len, gap) => { // a dashed straight run from a to b, as short strips
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), out = [], n = Math.max(1, Math.floor(L / (len + gap)));
      for (let k = 0; k < n; k++) { const u0 = (k * (len + gap)) / L, u1 = Math.min(1, (k * (len + gap) + len) / L); if (u1 > 0.94) break; out.push([u0, (u0 + u1) / 2, u1].map((u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])); }
      return out;
    };
    // the edge of a stand: a route runs from the army's rim to the target's rim, not through them
    const rim = (p, q, r) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [p[0] + ((q[0] - p[0]) / L) * r, p[1] + ((q[1] - p[1]) / L) * r]; };
    let reachG = null, orderG = null, lastTargets = null, ribK = 1;
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
    // the orders our armies carry (View: army.order): a solid line with an arrowhead from the army to its target
    const drawOrders = () => {
      orderG = dropGroup(orderG);
      if (!view) return;
      const by = { [GOLD]: { s: [], a: [] }, [RED]: { s: [], a: [] } };
      for (const a of view.armies) {
        const m = armies[a.id], od = a.order; if (!m || !m.to || !od || !od.target || a.fid !== view.me) continue;
        const p = posOf(od.target.kind, od.target.id); if (!p) continue;
        const hex = od.intent === 'attack' || od.intent === 'ask' ? RED : GOLD, A = rim([m.to[0], m.to[2]], [p[0], p[2]], 2.2 * ribK), B = rim([p[0], p[2]], [m.to[0], m.to[2]], (od.target.kind === 'town' ? 2.9 : 1.8) * ribK);
        by[hex].s.push([A, B]); by[hex].a.push([B[0], B[1], B[0] - A[0], B[1] - A[1], 1.1 * ribK]);
      }
      orderG = new T.Group(); root.add(orderG);
      for (const hex of [GOLD, RED]) if (by[hex].s.length) orderG.add(ribbons(by[hex].s, 0.5 * ribK, flat(hex, 0.95), 0.3, by[hex].a));
      orderG.visible = !BT.on;
    };

    // ------------------------------------------------------------ fly the camera (short ease)
    let anim = null;
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    const flyTo = (to, ms = 700) => { anim = { from: JSON.parse(JSON.stringify(cam)), to: Object.assign(JSON.parse(JSON.stringify(cam)), to), t0: performance.now(), ms }; dirty = true; };
    const focus = (id) => {
      const p = armies[id] ? posOf('army', id) : place[id] ? posOf('town', id) : null; if (!p) return;
      flyTo({ t: [p[0], p[2]], dist: Math.min(cam.dist, 40) });
    };
    const overview = () => { const az = 0.3, el = 0.88; flyTo({ t: mid.slice(), dist: fitDist(az, el), az, el }, 800); };

    // ------------------------------------------------------------ marching (a path of [x, z] points over ms)
    const march = (id, pts, s, ms = 1500) => { const m = armies[id]; if (!m) return; m.moving = { pts, t0: performance.now(), ms, face: s.face }; };
    const pathBetween = (a, b, arm) => {
      const n = Math.max(8, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.6)), pts = [];
      for (let k = 0; k <= n; k++) { const u = k / n; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * (arm === 'fleet' ? 0 : 1.2)]); }
      return pts;
    };
    const stepMarch = (now) => {
      let any = false;
      for (const m of Object.values(armies)) {
        if (!m.moving) continue; any = true;
        const { pts, t0, ms } = m.moving, u = Math.min(1, (now - t0) / ms), f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r;
        m.g.position.set(x, m.a.arm === 'fleet' ? waterY(x, z) + 0.02 : terr.h(x, z), z);
        m.g.rotation.y = u < 1 ? Math.atan2(-(pts[i + 1][1] - pts[i][1]), pts[i + 1][0] - pts[i][0]) : -m.moving.face;
        if (u >= 1) { m.moving = null; if (m.to) m.g.position.set(m.to[0], m.to[1], m.to[2]); } // arrived: on its stand as it is now (the stand moves with the zoom)
        if (sel && sel.kind === 'army' && sel.id === m.a.id) placeSel();
      }
      return any;
    };

    // ------------------------------------------------------------ a battle on the map: wings of figures on a 3 × 6 grid at the site
    // rows run along the attack axis (0–1 attacker, 4–5 defender; at a walled town rows 4–5 stand on its walls), lanes across
    const LANE = 2.3, ROW = 1.35;
    const gridPos = (lane, row, slot = 0) => {
      const c = BT.center, a = (row - 4.5) * ROW, l = (lane - 1) * LANE + slot * 0.5;
      const x = c[0] + BT.u[0] * a + BT.v[0] * l, z = c[1] + BT.u[1] * a + BT.v[1] * l;
      return [x, terr.h(x, z), z];
    };
    const flameGeo = new T.ConeGeometry(0.14, 0.5, 6).translate(0, 0.25, 0);
    const flameMat = new T.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false });
    const arrowGeo = new T.BoxGeometry(0.24, 0.014, 0.014);
    const arrowMat = new T.MeshBasicMaterial({ color: 0x2a2118 });
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
      return { g, mesh: m, ashore, cap, ring, st, foot, fwd: [1, 0] };
    };
    const SIEGE = 1.6, WALL_H = [0.2, 0.3, 0.42, 0.52, 0.62]; // the wall's height by lũy, in the kit's units (han-models.js LV)
    const battleEnd = () => {
      if (!BT.g) return;
      for (const f of BT.fx) if (f.kind === 'dust') rt.removeMarker(f.m);
      BT.g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); else if (x.isMesh && x.userData.own) x.geometry.dispose(); });
      for (const Wg of Object.values(BT.wings)) { Wg.label.free(); freeStd(Wg.st); }
      for (const L of BT.labels) L.free();
      root.remove(BT.g); BT.g = null; BT.on = false; BT.wings = {}; BT.fx = []; BT.walls = []; BT.labels = []; BT.sel = null;
      for (const t of Object.values(towns)) if (t.model) t.model.visible = true;
      for (const m of Object.values(armies)) m.g.visible = true;
      if (reachG) reachG.visible = true;
      if (orderG) orderG.visible = true;
      selRing.visible = false; placeSel(); scaleMarkers(); dirty = true;
    };
    const battleBegin = (b) => {
      battleEnd();
      const site = b.site, { P, u, v } = axisOf(site, b.from !== undefined && b.from !== null ? b.from : ownSeat(site));
      BT.u = u; BT.v = v; BT.me = b.me || 'A'; BT.siege = !!b.siege; BT.site = site;
      BT.center = b.siege ? [P.x + u[0] * 0.2, P.z + u[1] * 0.2] : [P.x - u[0] * 3.2, P.z - u[1] * 3.2];
      BT.g = new T.Group(); root.add(BT.g); BT.on = true; BT.wings = {}; BT.fx = []; BT.walls = []; BT.labels = [];
      // a siege draws its own wall line across the lanes, so the town's model steps aside for it
      if (BT.siege && towns[site] && towns[site].model) towns[site].model.visible = false;
      if (BT.siege) {
        const lv = clamp(b.walls ?? 3, 0, 4); BT.wallTop = WALL_H[lv] * SIEGE - 0.05;
        const wallGeo = HM.siegeWall((LANE * 0.93) / SIEGE, lv), gateGeo = HM.siegeWall((LANE * 0.93) / SIEGE, lv, true), towerGeo = HM.siegeTower(lv), ang = Math.atan2(-v[1], v[0]);
        for (let l = 0; l < 3; l++) { const p = gridPos(l, 3.6), wall = new T.Mesh(l === 1 ? gateGeo : wallGeo, HM.mat); wall.position.set(p[0], p[1] - 0.05, p[2]); wall.rotation.y = ang; wall.scale.setScalar(SIEGE); wall.castShadow = true; wall.receiveShadow = true; BT.g.add(wall); BT.walls.push(wall); }
        for (let k = 0; k < 4; k++) { const p = gridPos(k - 0.5, 3.6), t = new T.Mesh(towerGeo, HM.mat); t.position.set(p[0], p[1] - 0.05, p[2]); t.rotation.y = ang; t.scale.setScalar(SIEGE); t.castShadow = true; BT.g.add(t); }
      }
      for (let l = 0; l < 3; l++) { const L = newLabel(() => { const p = gridPos(l, BT.me === 'A' ? -0.2 : 5.6); return [p[0], p[1] + 0.1, p[2]]; }, 'battle', 3); BT.labels.push(L); }
      for (const m of Object.values(armies)) m.g.visible = false;
      if (reachG) reachG.visible = false;
      if (orderG) orderG.visible = false;
      selRing.visible = false;
      const md = gridPos(1, 2.9), back = BT.me === 'A' ? [-u[0], -u[1]] : u;
      anim = { from: JSON.parse(JSON.stringify(cam)), to: { t: [md[0], md[2]], dist: 15, az: Math.atan2(back[0], back[1]) + 0.3, el: 0.55 }, t0: performance.now(), ms: 1100 };
      dirty = true;
    };
    // the seat an attack on `site` most likely comes from: the nearest town that is ours in the last View
    const ownSeat = (site) => {
      const P = place[site]; let best = null;
      for (const t of view ? view.towns : []) if (t.owner === view.me && t.id !== site && place[t.id]) { const d = Math.hypot(place[t.id].x - P.x, place[t.id].z - P.z); if (!best || d < best.d) best = { d, id: t.id }; }
      return best ? best.id : null;
    };
    const battleShow = (b, me, ms = 800) => {
      if (!BT.on || BT.site !== b.site) battleBegin({ site: b.site, from: b.from, me, siege: b.siege, walls: b.walls });
      if (me) BT.me = me;
      const now = performance.now(), cells = {};
      BT.labels.forEach((L, l) => L.set(LANE_NAME[(b.lanes || [])[l]] || '', { px: 10, bold: false, below: false, bg: 'rgba(24,19,14,0.5)', color: '#d8ccb0' }));
      for (const w of b.wings) {
        const fid = b[w.side].fid, mine = w.side === BT.me;
        let Wg = BT.wings[w.id];
        if (!Wg) {
          Wg = BT.wings[w.id] = wingModel(w, fid); BT.g.add(Wg.g);
          const p0 = gridPos(w.lane, w.row + (w.side === 'A' ? -1.2 : 1.2)); Wg.g.position.set(p0[0], p0[1], p0[2]);
          Wg.label = newLabel(() => { const p = Wg.g.position; return [p.x, p.y + 1.85, p.z]; }, 'battle', 2);
        }
        Wg.ring.visible = mine && !w.gone;
        // in a siege the defenders' rows 4–5 are the walls: those wings stand on the wall top, side by side along it
        const onWall = BT.siege && w.side === 'D' && w.row >= 4, key = onWall ? 'W' + w.lane : w.side + w.lane + ':' + w.row, slot = (cells[key] = (cells[key] ?? -1) + 1);
        const fwd = w.side === 'A' ? BT.u : [-BT.u[0], -BT.u[1]];
        let to = onWall ? gridPos(w.lane, 3.75 + (w.row - 4) * 0.3, S.wingSlot(slot) * 1.1) : gridPos(w.lane, w.row, S.wingSlot(slot));
        if (onWall && !w.gone) to[1] += BT.wallTop;
        if (w.gone) { const r = w.left ? 2.2 : 1.6; const x = to[0] - fwd[0] * r * ROW, z = to[2] - fwd[1] * r * ROW; to = [x, terr.h(x, z), z]; }
        const wet = w.arm === 'thuy' && inWater(to[0], to[2]);
        if (wet) to[1] = waterY(to[0], to[2]) + 0.02;
        if (Wg.ashore) { Wg.mesh.visible = wet; Wg.ashore.visible = !wet; Wg.ashore.count = w.gone ? 0 : Math.max(1, Math.ceil((Math.max(0, w.men) / w.start) * Wg.ashore.instanceMatrix.count)); }
        Wg.g.rotation.y = Math.atan2(-fwd[1], fwd[0]);
        const shown = S.wingShown(w, Wg.cap);
        Wg.gone = !!w.gone; Wg.men = w.men; Wg.fwd = fwd;
        Wg.tw = { from: Wg.g.position.toArray(), to, t0: now, ms, lunge: w.fought ? 0.4 : 0, fwd, shake: w.hit > 0 ? Math.min(0.1, w.hit / 3000) : 0, c0: Wg.mesh.count, c1: shown, fade: w.gone };
        Wg.label.set(w.gone ? '' : fmt(Math.max(0, w.men)), { px: 11, bar: CSS[fid], mine, dim: !!w.routed });
        if (w.burnt) for (let k = 0; k < 8; k++) { const f = new T.Mesh(flameGeo, flameMat); f.position.set(K.rr(-1, 0.3), 0.05, K.rr(-0.6, 0.6)); Wg.g.add(f); BT.fx.push({ kind: 'flame', m: f, parent: Wg.g, t0: now, ms: 3200, ph: Math.random() * 6 }); }
      }
      for (const w of b.wings) if (w.breach && w.side === 'A' && BT.walls[w.lane] && !BT.walls[w.lane].userData.down) { const m = BT.walls[w.lane]; m.userData.down = true; m.scale.y = SIEGE * 0.4; m.rotation.x = 0.14; }
      for (const w of b.wings) {
        if (!w.shot || !BT.wings[w.id] || !BT.wings[w.shot]) continue;
        const A = BT.wings[w.id].tw.to, Tg = BT.wings[w.shot].tw.to;
        for (let k = 0; k < 16; k++) { const m = new T.Mesh(arrowGeo, arrowMat); m.visible = false; BT.g.add(m); BT.fx.push({ kind: 'arrow', m, a: [A[0] + K.rr(-0.5, 0.5), A[1] + 0.4, A[2] + K.rr(-0.5, 0.5)], b: [Tg[0] + K.rr(-0.6, 0.6), Tg[1] + 0.1, Tg[2] + K.rr(-0.6, 0.6)], t0: now + ms * 0.35 + k * 25, ms: 650 }); }
      }
      for (const f of BT.fx) if (f.kind === 'dust') f.end = now + 300;
      const lanes = new Set(b.wings.filter((w) => w.fought && !w.gone).map((w) => w.lane));
      for (const l of lanes) { const ws = b.wings.filter((w) => w.fought && w.lane === l && BT.wings[w.id]); const p = ws.reduce((s, w) => [s[0] + BT.wings[w.id].tw.to[0] / ws.length, s[1] + BT.wings[w.id].tw.to[2] / ws.length], [0, 0]); const d = rt.addDust(); d.position.set(p[0], terr.h(p[0], p[1]), p[1]); d.scale.setScalar(0.5); d.visible = true; BT.fx.push({ kind: 'dust', m: d, t0: now, end: now + 60000 }); }
      dirty = true;
    };
    const stepBattle = (now) => {
      if (!BT.on) return false;
      let any = false;
      for (const Wg of Object.values(BT.wings)) {
        const t = Wg.tw; if (!t) continue;
        const u = Math.min(1, Math.max(0, (now - t.t0) / t.ms)), e = ease(u), l = Math.sin(Math.PI * Math.min(1, u * 1.4)) * t.lunge, sh = u < 1 ? t.shake * Math.sin(now * 0.07) : 0;
        Wg.g.position.set(t.from[0] + (t.to[0] - t.from[0]) * e + t.fwd[0] * l + sh, t.from[1] + (t.to[1] - t.from[1]) * e, t.from[2] + (t.to[2] - t.from[2]) * e + t.fwd[1] * l + sh);
        Wg.mesh.count = Math.round(t.c0 + (t.c1 - t.c0) * e);
        if (t.fade && u >= 1) Wg.g.visible = false; else if (!t.fade) Wg.g.visible = true;
        if (u < 1) any = true; else Wg.tw = Object.assign(t, { lunge: 0, shake: 0, from: t.to.slice(), c0: t.c1 });
      }
      BT.fx = BT.fx.filter((f) => {
        const u = (now - f.t0) / (f.ms || 1);
        if (f.kind === 'flame') { if (u >= 1) { f.parent.remove(f.m); return false; } f.m.scale.set(1, 0.6 + 0.5 * Math.abs(Math.sin(now * 0.012 + f.ph)) * (1 - u * 0.7), 1); any = true; return true; }
        if (f.kind === 'arrow') { if (u >= 1) { BT.g.remove(f.m); return false; } if (u < 0) { any = true; return true; } f.m.visible = true; const x = f.a[0] + (f.b[0] - f.a[0]) * u, z = f.a[2] + (f.b[2] - f.a[2]) * u, y = f.a[1] + (f.b[1] - f.a[1]) * u + Math.sin(Math.PI * u) * 1.4; f.m.position.set(x, y, z); f.m.rotation.y = Math.atan2(-(f.b[2] - f.a[2]), f.b[0] - f.a[0]); f.m.rotation.z = Math.cos(Math.PI * u) * 0.9; any = true; return true; }
        if (f.kind === 'dust') { if (now > f.end) { rt.removeMarker(f.m); return false; } return true; }
        return true;
      });
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
    const battleSelect = (id) => { BT.sel = id && BT.wings[id] ? id : null; for (const [k, Wg] of Object.entries(BT.wings)) Wg.ring.material.color.setHex(k === BT.sel ? 0xffffff : GOLD); dirty = true; };
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
    let running = false, onFrame = null, tWave = 0;
    const draw = () => rt.render();
    const frame = (now) => {
      if (!running) return;
      if (anim) {
        const u = Math.min(1, (now - anim.t0) / anim.ms), e = ease(u), A = anim.from, B = anim.to;
        cam.t = [A.t[0] + (B.t[0] - A.t[0]) * e, A.t[1] + (B.t[1] - A.t[1]) * e]; cam.dist = Math.exp(Math.log(A.dist) + (Math.log(B.dist) - Math.log(A.dist)) * e); cam.az = A.az + (B.az - A.az) * e; cam.el = A.el + (B.el - A.el) * e;
        setView(makeView()); scaleMarkers(); dirty = true; if (u >= 1) anim = null;
      }
      if (stepMarch(now)) dirty = true;
      if (stepBattle(now)) dirty = true;
      if (now - tWave > 200) { tWave = now; dirty = true; root.traverse((f) => { if (f.userData.flag && f.children[0]) f.children[0].rotation.y = Math.sin(now * 0.003 + f.id) * 0.18; }); }
      if (dirty) { draw(); dirty = false; if (onFrame) onFrame(); }
      requestAnimationFrame(frame);
    };
    const loop = (cb) => { onFrame = cb; if (!running) { running = true; requestAnimationFrame(frame); } };
    const stop = () => { running = false; };
    // jump every animation to its end and draw (tests, harness; also a skip)
    const settle = () => { if (anim) { Object.assign(cam, anim.to); anim = null; setView(makeView()); scaleMarkers(); } const far = performance.now() + 1e6; stepMarch(far); stepBattle(far); draw(); dirty = false; };
    // the weight of one frame: draw calls and triangles (shadow pass, scene, lens and labels), buffers, timings
    const measure = () => { const r = rt.renderer; r.info.autoReset = false; r.info.reset(); const f0 = performance.now(); draw(); r.getContext().finish(); const st = K.stats(r, scene, { frameMs: performance.now() - f0 }); r.info.autoReset = true; return st; };

    cam.dist = fitDist(cam.az, cam.el);
    terr.G = clipG; try { rt.prepare(Object.assign(makeView(), { key: 'hn-region' })); } finally { terr.G = G0; } // the near ground is built here, once
    apply();
    return {
      rt, place, towns, armies, cam, GROUND, tier: tierName(), trees, region: REGION,
      sync, pick, select, targets, focus, overview, loop, stop, settle, measure,
      battle: { begin: battleBegin, show: battleShow, pickWing, select: battleSelect, end: battleEnd, cards: battleCards, lanes: laneCards, get on() { return BT.on; } },
      lanesAt, terrainAt, groundAt, screenOf, gesture, bind, flyTo, apply, waterY, inWater, fitDist,
      get dirty() { return dirty; }, set dirty(v) { dirty = v; },
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = S;
  else root.HuaiNanScene = S;
})(typeof window !== 'undefined' ? window : globalThis);
