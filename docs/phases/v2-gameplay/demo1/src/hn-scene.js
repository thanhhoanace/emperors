// Demo 1 (phase v2-gameplay): the Huai Nan slice on top of the phase-1 world runtime. Presentation only: towns, armies
// by arm (infantry, cavalry, boats), a free camera for touch, picking and screen positions for the page's cards.
// Throwaway spike code; the game state comes from the page (hn-rules.js), never decided here.
//   const sc = await HNScene.create(rt, { width, height })
//   sc.sync(state) · sc.pick(x, y) · sc.select(id) · sc.mark(ids) · sc.fly(id) · sc.gesture.* · sc.cards() · sc.loop(onFrame)
(function () {
  const S = (window.HNScene = {});
  const TOWNS = [
    { id: 'chung_ly', name: 'Chung Ly', seat: 'huai' },
    { id: 'tho_xuan', name: 'Thọ Xuân', lonlat: [116.78, 32.58] },
    { id: 'am_lang', name: 'Âm Lăng', lonlat: [117.72, 32.52] },
    { id: 'hu_di', name: 'Hu Dị', lonlat: [118.52, 33.0] },
    { id: 'lich_duong', name: 'Lịch Dương', lonlat: [118.36, 31.74] },
  ];
  const SEATS = [{ id: 'xu', name: 'Bành Thành' }, { id: 'yang', name: 'Kiến Nghiệp' }, { id: 'yan', name: 'Xương Ấp' }, { id: 'yu', name: 'Hứa Xương' }];
  S.TOWNS = TOWNS; S.SEATS = SEATS;
  const GLYPH = { zhu_yuanzhang: '明', cao_cao: '魏', sun_quan: '吳', local: '豪', neutral: '' };
  const COLOR = { zhu_yuanzhang: '#b3262e', cao_cao: '#4d6a3a', sun_quan: '#e07b24', local: '#8a7a55', neutral: '#8a8275' };

  S.create = async function (rt, o) {
    const THREEc = THREE, V3 = (a) => new THREEc.Vector3(a[0], a[1], a[2]);
    const W = o.width, H = o.height, terr = rt.terr, scene = rt.scene, MC = rt.MC, D = window.HN_DATA;
    const proj = Terrain.projection(D.meta.projection);
    const rivers = D.water.rivers;
    const waterY = (x, z) => { let best = 1e9, y = 0.3; for (const rv of rivers) for (const p of rv.pts) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; y = p[2]; } } return y; };
    const inWater = (x, z) => terr.riverSD(x, z) < 0;

    // ------------------------------------------------------------ places
    const place = {};
    for (const t of TOWNS) {
      let x, z;
      if (t.seat) { x = MC[t.seat].x; z = MC[t.seat].z; } else { [x, z] = proj.toWorld(t.lonlat[0], t.lonlat[1]); }
      place[t.id] = { id: t.id, name: t.name, x, z, y: terr.h(x, z), seat: t.seat || null, kind: 'town' };
    }
    for (const s of SEATS) { const c = MC[s.id]; place[s.id] = { id: s.id, name: s.name, x: c.x, z: c.z, y: c.y, seat: s.id, kind: 'seat' }; }
    // the four towns that are not seats get a small walled town from the same kit as the seats
    const baseDef = D.cities.huai;
    const sink = CityKit.sink();
    for (const t of TOWNS) {
      if (t.seat) continue;
      const p = place[t.id], def = JSON.parse(JSON.stringify(baseDef));
      def.name = t.name; def.rank = 'fort'; def.features = [{ type: 'watchtower', at: [-0.15, -0.17] }]; delete def.river;
      def.palaces[0].name = 'Huyện nha ' + t.name;
      K.seed([...t.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
      HanCity.build(scene, { def, x: p.x, y: p.y, z: p.z, scale: 3.0, lod: 'lite', sink, groundAt: terr.h, wetAt: terr.riverSD });
    }
    CityKit.flush(sink, scene);

    // ------------------------------------------------------------ materials and small models
    const recv = (m) => Terrain.receiveBaked(m, terr, 0.8);
    const flagTex = {};
    const flagMat = (fid) => {
      if (!flagTex[fid]) {
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
        g.fillStyle = COLOR[fid] || '#8a8275'; g.fillRect(0, 0, 64, 96);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 84, 64, 12);
        if (GLYPH[fid]) { g.fillStyle = '#f3ecdc'; g.font = 'bold 40px "Noto Serif TC","Noto Serif CJK TC","Noto Serif CJK SC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(GLYPH[fid], 32, 42); }
        const t = new THREEc.CanvasTexture(cv); t.encoding = THREEc.sRGBEncoding;
        flagTex[fid] = new THREEc.MeshStandardMaterial({ map: t, side: THREEc.DoubleSide, roughness: 0.9 });
      }
      return flagTex[fid];
    };
    const poleMat = new THREEc.MeshStandardMaterial({ color: 0x3b3129, roughness: 0.8 });
    const standard = (fid, h = 2.2, s = 1) => {
      const g = new THREEc.Group();
      const pole = new THREEc.Mesh(new THREEc.CylinderGeometry(0.03 * s, 0.03 * s, h, 5), poleMat); pole.position.y = h / 2; g.add(pole);
      const cloth = new THREEc.Mesh(new THREEc.PlaneGeometry(0.6 * s, 0.9 * s, 3, 1), flagMat(fid)); cloth.position.set(0.3 * s, h - 0.45 * s, 0); g.add(cloth);
      g.userData.cloth = cloth; return g;
    };
    const colored = (geo, hex) => Flora.colored(geo, hex);
    // one foot soldier: body, head, spear (vertex colours; the instance colour tints the body)
    const footGeo = THREEc.BufferGeometryUtils.mergeBufferGeometries([
      colored(new THREEc.BoxGeometry(0.13, 0.24, 0.09).translate(0, 0.2, 0), 0xffffff), colored(new THREEc.BoxGeometry(0.08, 0.08, 0.08).translate(0, 0.37, 0), 0xd9b08a),
      colored(new THREEc.BoxGeometry(0.015, 0.62, 0.015).translate(0.08, 0.34, 0), 0x5c4a36), colored(new THREEc.BoxGeometry(0.1, 0.13, 0.02).translate(-0.07, 0.22, 0.03), 0x6b4a2e)]);
    // one horseman: horse (dark bay), rider, lance
    const horseGeo = THREEc.BufferGeometryUtils.mergeBufferGeometries([
      colored(new THREEc.BoxGeometry(0.36, 0.14, 0.12).translate(0, 0.26, 0), 0x5a3a24), colored(new THREEc.BoxGeometry(0.1, 0.16, 0.08).translate(0.2, 0.36, 0).rotateZ(0), 0x5a3a24),
      colored(new THREEc.BoxGeometry(0.03, 0.2, 0.03).translate(-0.13, 0.1, 0.04), 0x4a3020), colored(new THREEc.BoxGeometry(0.03, 0.2, 0.03).translate(-0.13, 0.1, -0.04), 0x4a3020),
      colored(new THREEc.BoxGeometry(0.03, 0.2, 0.03).translate(0.13, 0.1, 0.04), 0x4a3020), colored(new THREEc.BoxGeometry(0.03, 0.2, 0.03).translate(0.13, 0.1, -0.04), 0x4a3020),
      colored(new THREEc.BoxGeometry(0.1, 0.18, 0.09).translate(-0.02, 0.44, 0), 0xffffff), colored(new THREEc.BoxGeometry(0.07, 0.07, 0.07).translate(-0.02, 0.57, 0), 0xd9b08a),
      colored(new THREEc.BoxGeometry(0.62, 0.012, 0.012).translate(0.12, 0.48, 0.06), 0x5c4a36)]);
    const menMat = recv(new THREEc.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    const block = (geo, fid, n, cols, sp, jitter = 0.02, light = 0) => {
      const men = new THREEc.InstancedMesh(geo, menMat, n), m4 = new THREEc.Matrix4(), col = new THREEc.Color(COLOR[fid] || '#8a8275').lerp(new THREEc.Color(0x3a3530), 0.38).lerp(new THREEc.Color(0xe8dcc0), light);
      men.instanceColor = new THREEc.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      const rows = Math.ceil(n / cols);
      for (let k = 0; k < n; k++) { const i = Math.floor(k / cols), j = k % cols; men.setMatrixAt(k, m4.makeTranslation(-i * sp + K.rr(-jitter, jitter), 0, (j - (cols - 1) / 2) * sp + K.rr(-jitter, jitter))); men.setColorAt(k, col); }
      men.castShadow = true; men.frustumCulled = false; men.userData.rows = rows;
      return men;
    };
    const boatTpl = (() => { const g = new THREEc.Group(); HanCity.warship(0.9).meshes(g); return g; })();

    // ------------------------------------------------------------ markers
    const root = new THREEc.Group(); scene.add(root);
    const towns = {}, armies = {};
    for (const id of Object.keys(place)) {
      const p = place[id], g = new THREEc.Group(); g.position.set(p.x, p.y, p.z); root.add(g);
      towns[id] = { g, std: null, fid: null };
    }
    const ringGeo = new THREEc.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    const ringMat = (hex, op) => new THREEc.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
    const selRing = new THREEc.Mesh(ringGeo, ringMat(0xf2d27a, 0.95)); selRing.visible = false; selRing.renderOrder = 5; root.add(selRing);
    const tgtRings = [];

    // army model: general with standard in front, infantry block, cavalry wedge on the flank; fleets float on the river
    const buildArmy = (a) => {
      const g = new THREEc.Group(), fid = a.fid;
      if (a.arm === 'fleet') {
        const n = Math.max(2, Math.min(7, Math.round((a.thuy || 0) / 450)));
        for (let k = 0; k < n; k++) { const b = boatTpl.clone(); b.position.set(-(k % 3) * 1.1 - Math.floor(k / 3) * 0.3, 0, (k % 2 ? 0.45 : -0.45) * (1 + Math.floor(k / 3) * 0.4)); g.add(b); }
        const s = standard(fid, 1.7, 0.9); s.position.set(0.3, 0.1, 0); g.add(s);
      } else {
        const gen = rt.addArmy(fid, false); gen.visible = true; gen.position.set(0.25, 0, 0); gen.scale.setScalar(1.25); g.add(gen);
        const nb = Math.max(0, Math.min(60, Math.round((a.bo || 0) / 200)));
        if (nb) { const m = block(footGeo, fid, nb, Math.min(8, Math.max(4, Math.ceil(Math.sqrt(nb * 1.6)))), 0.16); m.position.set(-0.45, 0, 0); g.add(m); }
        const nc = Math.max(0, Math.min(24, Math.round((a.cung || 0) / 200)));
        if (nc) { const m = block(footGeo, fid, nc, Math.min(6, Math.max(3, Math.ceil(Math.sqrt(nc * 1.6)))), 0.16, 0.02, 0.45); m.position.set(-0.45 - (Math.ceil(nb / 8) + 0.6) * 0.16, 0, 0); g.add(m); }
        const nk = Math.max(0, Math.min(30, Math.round((a.ky || 0) / 130)));
        if (nk) { const m = block(horseGeo, fid, nk, Math.min(6, Math.max(3, Math.ceil(Math.sqrt(nk)))), 0.34, 0.05); m.position.set(-0.3, 0, nb ? 1.05 : 0); g.add(m); }
      }
      g.userData.id = a.id;
      return g;
    };

    // ------------------------------------------------------------ state from the page
    let state = null;
    const sig = (a) => [a.fid, a.arm, a.bo || 0, a.cung || 0, a.ky || 0, a.thuy || 0].join('|');
    const armyPos = (a) => { const p = a.at ? place[a.at] : null; const x = a.x ?? (p ? p.x + (a.dx || 0) : 0), z = a.z ?? (p ? p.z + (a.dz || 0) : 0); return [x, a.arm === 'fleet' ? waterY(x, z) + 0.02 : terr.h(x, z), z]; };
    const sync = (st) => {
      state = st;
      for (const [id, t] of Object.entries(towns)) {
        const fid = (st.owners && st.owners[id]) || null;
        if (fid !== t.fid) {
          if (t.std) { t.g.remove(t.std); }
          t.fid = fid; t.std = fid ? standard(fid, place[id].seat ? 3.2 : 2.4, place[id].seat ? 1.3 : 1.0) : null;
          if (t.std) { t.std.position.set(place[id].seat ? 0 : 0.6, 0.3, place[id].seat ? 0 : -0.6); t.g.add(t.std); }
        }
      }
      const seen = new Set();
      for (const a of st.armies || []) {
        seen.add(a.id);
        let m = armies[a.id];
        if (!m || m.sig !== sig(a)) { if (m) root.remove(m.g); m = armies[a.id] = { g: buildArmy(a), sig: sig(a), a }; root.add(m.g); }
        m.a = a;
        if (!m.moving) { const p = armyPos(a); m.g.position.set(p[0], p[1], p[2]); m.g.rotation.y = Math.atan2(-(a.fz ?? 0), a.fx ?? 1); }
      }
      for (const id of Object.keys(armies)) if (!seen.has(id)) { root.remove(armies[id].g); delete armies[id]; }
      dirty = true;
    };

    // ------------------------------------------------------------ camera
    const huai = place.chung_ly;
    const cam = { t: [huai.x + 4, huai.z + 4], dist: 120, az: 0.25, el: 0.95 };
    const REGION = TOWNS.map((t) => [place[t.id].x, place[t.id].z]).concat([[place.xu.x, place.xu.z], [place.yang.x, place.yang.z]]);
    const clampT = () => { cam.t[0] = Math.max(huai.x - 140, Math.min(huai.x + 140, cam.t[0])); cam.t[1] = Math.max(huai.z - 140, Math.min(huai.z + 120, cam.t[1])); };
    const view = () => {
      clampT();
      const ty = Math.max(0.2, terr.h(cam.t[0], cam.t[1])), t = [cam.t[0], ty, cam.t[1]];
      const c = [t[0] + cam.dist * Math.cos(cam.el) * Math.sin(cam.az), t[1] + cam.dist * Math.sin(cam.el), t[2] + cam.dist * Math.cos(cam.el) * Math.cos(cam.az)];
      const minY = terr.h(c[0], c[2]) + 1.5; if (c[1] < minY) c[1] = minY;
      const far = cam.dist > 330;
      return far ? { name: 'hn-far', target: t, cam: c, fov: 34, mode: 'far' } : { name: 'hn', target: t, cam: c, fov: 34, mode: 'near', lod: REGION, key: 'hn-region', trees: [{ key: 'hn-trees', x: huai.x, z: huai.z, R: 26 }] };
    };
    const apply = () => { rt.setView(view()); scaleMarkers(); dirty = true; };
    // armies and standards are drawn larger than life, and grow as the camera pulls back (like every campaign map)
    const scaleMarkers = () => {
      const s = Math.max(1, Math.min(9, cam.dist / 38));
      for (const m of Object.values(armies)) m.g.scale.setScalar(s);
      for (const t of Object.values(towns)) if (t.std) t.std.scale.setScalar(Math.max(1, s * 0.7));
      if (!BT.on) selRing.scale.setScalar(s * 1.6); for (const r of tgtRings) r.scale.setScalar(s * 1.6);
    };

    // ------------------------------------------------------------ gestures (the page forwards pointer and wheel events)
    const ptrs = new Map(); let g0 = null, tap = null;
    const snap = () => { const ps = [...ptrs.values()]; if (ps.length === 1) return { n: 1, x: ps[0].x, y: ps[0].y }; const [a, b] = ps; return { n: 2, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
    const gesture = {
      down(id, x, y, button) { ptrs.set(id, { x, y }); g0 = { s: snap(), cam: JSON.parse(JSON.stringify(cam)), rot: button === 2 }; if (ptrs.size === 1) tap = { x, y, t: performance.now() }; else tap = null; },
      move(id, x, y) {
        if (!ptrs.has(id)) return; ptrs.set(id, { x, y }); const s = snap(); if (!g0 || s.n !== g0.s.n) { g0 = { s, cam: JSON.parse(JSON.stringify(cam)), rot: g0 && g0.rot }; return; }
        if (tap && Math.hypot(x - tap.x, y - tap.y) > 8) tap = null;
        if (s.n === 1 && !g0.rot) {
          const k = cam.dist * 0.0021 * (900 / H) * 0.5, dx = s.x - g0.s.x, dy = s.y - g0.s.y, ca = Math.cos(cam.az), sa = Math.sin(cam.az);
          cam.t[0] = g0.cam.t[0] - (ca * dx) * k - (sa * dy) * k; cam.t[1] = g0.cam.t[1] + (sa * dx) * k - (ca * dy) * k;
        } else if (s.n === 1) { cam.az = g0.cam.az - (s.x - g0.s.x) * 0.006; cam.el = Math.max(0.3, Math.min(1.4, g0.cam.el + (s.y - g0.s.y) * 0.004)); }
        else { cam.dist = Math.max(8, Math.min(900, g0.cam.dist * g0.s.d / Math.max(10, s.d))); cam.az = g0.cam.az - (s.ang - g0.s.ang); cam.el = Math.max(0.3, Math.min(1.4, g0.cam.el + (s.y - g0.s.y) * 0.004)); }
        apply();
      },
      up(id, x, y) { const wasTap = tap && ptrs.size === 1 && performance.now() - tap.t < 450; ptrs.delete(id); g0 = null; tap = null; return wasTap ? pick(x, y) : undefined; },
      wheel(dy) { cam.dist = Math.max(8, Math.min(900, cam.dist * Math.exp(dy * 0.0012))); apply(); },
      zoom(f) { cam.dist = Math.max(8, Math.min(900, cam.dist * f)); apply(); },
      rotate(da) { cam.az += da; apply(); },
      tilt(de) { cam.el = Math.max(0.3, Math.min(1.4, cam.el + de)); apply(); },
    };

    // ------------------------------------------------------------ picking and screen cards
    const anchorOf = (kind, id) => {
      if (kind === 'army') { const m = armies[id]; if (!m) return null; const p = m.g.position, s = m.g.scale.x; return [p.x, p.y + 1.6 * s, p.z]; }
      const p = place[id]; return [p.x, p.y + (p.seat ? 2.2 : 1.6), p.z];
    };
    const cards = () => {
      const out = [];
      for (const id of Object.keys(place)) { const a = anchorOf('town', id), q = rt.project(a); out.push({ kind: 'town', id, x: q.x, y: q.y, visible: q.visible }); }
      for (const id of Object.keys(armies)) { const a = anchorOf('army', id), q = rt.project(a); out.push({ kind: 'army', id, x: q.x, y: q.y, visible: q.visible }); }
      return out;
    };
    const pick = (x, y) => {
      let best = null;
      for (const c of cards()) { if (!c.visible) continue; const d = Math.hypot(c.x - x, c.y - (y - (c.kind === 'army' ? 18 : 10))); const r = c.kind === 'army' ? 46 : 40; if (d < r && (!best || d < best.d)) best = { kind: c.kind, id: c.id, d }; }
      return best ? { kind: best.kind, id: best.id } : { kind: 'ground', id: null };
    };
    const posOf = (kind, id) => (kind === 'army' ? (armies[id] ? armies[id].g.position.toArray() : null) : [place[id].x, place[id].y, place[id].z]);
    const select = (sel) => {
      const p = sel && posOf(sel.kind, sel.id); selRing.visible = !!p;
      if (p) selRing.position.set(p[0], (sel.kind === 'army' && armies[sel.id] && armies[sel.id].a.arm === 'fleet' ? p[1] : terr.h(p[0], p[2])) + 0.06, p[2]);
      dirty = true;
    };
    const mark = (list) => {
      while (tgtRings.length) root.remove(tgtRings.pop());
      for (const m of list || []) { const p = posOf(m.kind, m.id); if (!p) continue; const r = new THREEc.Mesh(ringGeo, ringMat(m.hex || 0xd4492f, 0.9)); r.position.set(p[0], terr.h(p[0], p[2]) + 0.07, p[2]); r.renderOrder = 5; root.add(r); tgtRings.push(r); }
      scaleMarkers(); dirty = true;
    };
    // fly the camera to a place or army (short ease)
    let anim = null;
    const fly = (kind, id, dist) => { const p = posOf(kind, id); if (!p) return; anim = { from: JSON.parse(JSON.stringify(cam)), to: { t: [p[0], p[2]], dist: dist || Math.min(cam.dist, 70), az: cam.az, el: cam.el }, t0: performance.now(), ms: 650 }; };
    const flyTo = (to, ms = 700) => { anim = { from: JSON.parse(JSON.stringify(cam)), to: Object.assign(JSON.parse(JSON.stringify(cam)), to), t0: performance.now(), ms }; };

    // ------------------------------------------------------------ marching (a path of [x, z] points over ms)
    const march = (id, pts, ms = 1600) => new Promise((res) => { const m = armies[id]; if (!m) return res(); m.moving = { pts, t0: performance.now(), ms, res }; });
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
        m.g.rotation.y = Math.atan2(-(pts[i + 1][1] - pts[i][1]), pts[i + 1][0] - pts[i][0]);
        if (u >= 1) { const r2 = m.moving.res; m.moving = null; r2(); }
      }
      return any;
    };

    // ------------------------------------------------------------ frame loop (renders only when something changed)
    let dirty = true, running = false, onFrame = null, tWave = 0;
    const frame = (now) => {
      if (!running) return;
      if (anim) {
        const u = Math.min(1, (now - anim.t0) / anim.ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, A = anim.from, B = anim.to;
        cam.t = [A.t[0] + (B.t[0] - A.t[0]) * e, A.t[1] + (B.t[1] - A.t[1]) * e]; cam.dist = Math.exp(Math.log(A.dist) + (Math.log(B.dist) - Math.log(A.dist)) * e); cam.az = A.az + (B.az - A.az) * e; cam.el = A.el + (B.el - A.el) * e;
        rt.setView(view()); scaleMarkers(); dirty = true; if (u >= 1) anim = null;
      }
      if (stepMarch(now)) dirty = true;
      if (stepBattle(now)) dirty = true;
      // standards flutter a little (cheap: one sine on the cloth's rotation)
      if (now - tWave > 90) { tWave = now; const w = Math.sin(now * 0.004) * 0.25; for (const t of Object.values(towns)) if (t.std) t.std.userData.cloth.rotation.y = w; }
      if (dirty) { rt.render(); dirty = false; if (onFrame) onFrame(); }
      requestAnimationFrame(frame);
    };
    // jump every animation to its end and draw (tests; also a 'skip' button)
    const settle = () => { if (anim) { Object.assign(cam, anim.to); anim = null; rt.setView(view()); scaleMarkers(); } const far = performance.now() + 1e6; stepMarch(far); stepBattle(far); rt.render(); dirty = false; };
    const loop = (cb) => { onFrame = cb; if (!running) { running = true; requestAnimationFrame(frame); } };
    const stop = () => { running = false; };


    // ------------------------------------------------------------ a battle on the map: wings on a 3 × 6 grid at the site
    // rows run along the attack axis (0–1 attacker, 4–5 defender; at a walled town rows 4–5 are its walls), lanes across it
    const BT = { on: false, g: null, wings: {}, center: null, u: [1, 0], v: [0, 1], fx: [], me: 'A' };
    const LANE = 2.1, ROW = 1.25, WS = 1.25; // wing models are drawn 1.5× like every other marker
    const gridPos = (lane, row, slot = 0) => {
      const c = BT.center, a = (row - 4.5) * ROW, l = (lane - 1) * LANE + slot * 0.42;
      const x = c[0] + BT.u[0] * a + BT.v[0] * l, z = c[1] + BT.u[1] * a + BT.v[1] * l;
      return [x, terr.h(x, z), z];
    };
    const wallMat = recv(new THREEc.MeshStandardMaterial({ color: 0xa89574, roughness: 0.95 }));
    const wallGeo = (() => { const parts = [new THREEc.BoxGeometry(LANE * 0.93, 0.42, 0.34).translate(0, 0.21, 0)]; for (let k = 0; k < 9; k++) parts.push(new THREEc.BoxGeometry(0.1, 0.09, 0.36).translate(-LANE * 0.43 + k * LANE * 0.108, 0.46, 0)); return THREEc.BufferGeometryUtils.mergeBufferGeometries(parts); })();
    const towerGeo = THREEc.BufferGeometryUtils.mergeBufferGeometries([new THREEc.BoxGeometry(0.46, 0.66, 0.46).translate(0, 0.33, 0), new THREEc.BoxGeometry(0.56, 0.1, 0.56).translate(0, 0.7, 0), new THREEc.ConeGeometry(0.42, 0.28, 4).rotateY(Math.PI / 4).translate(0, 0.89, 0)]);
    const flameGeo = new THREEc.ConeGeometry(0.12, 0.45, 6).translate(0, 0.22, 0);
    const flameMat = new THREEc.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false });
    const arrowGeo = new THREEc.BoxGeometry(0.22, 0.012, 0.012);
    const arrowMat = new THREEc.MeshBasicMaterial({ color: 0x2a2118 });
    const wingModel = (w, fid) => {
      const g = new THREEc.Group(), cap = Math.max(4, Math.min(48, Math.round(w.start / 60)));
      let mesh = null, boats = [];
      if (w.arm === 'thuy') {
        const n = Math.max(1, Math.min(4, Math.ceil(w.start / 500)));
        for (let k = 0; k < n; k++) { const b = boatTpl.clone(); b.scale.setScalar(0.75); b.position.set(-(k % 2) * 0.9, 0, (k - (n - 1) / 2) * 0.5); g.add(b); boats.push(b); }
        mesh = block(footGeo, fid, cap, 8, 0.15, 0.02, 0.2); // the same men ashore
      } else if (w.arm === 'ky') mesh = block(horseGeo, fid, cap, 6, 0.3, 0.05);
      else mesh = block(footGeo, fid, cap, 8, 0.15, 0.02, w.arm === 'cung' ? 0.45 : 0);
      if (mesh) g.add(mesh);
      const st = standard(fid, 1.15, 0.6); st.position.set(0.25, 0, 0); g.add(st); g.scale.setScalar(WS);
      return { g, mesh, boats, cap, std: st };
    };
    const battleBegin = (o) => {
      battleEnd();
      const P = place[o.site]; let u = o.from ? [P.x - o.from[0], P.z - o.from[1]] : [P.x - place.chung_ly.x, P.z - place.chung_ly.z];
      const L = Math.hypot(u[0], u[1]); u = L > 0.5 ? [u[0] / L, u[1] / L] : [-0.85, 0.5];
      BT.u = u; BT.v = [-u[1], u[0]]; BT.me = o.me || 'A'; BT.fids = o.fids; BT.siege = !!o.siege;
      BT.center = o.siege ? [P.x + u[0] * 0.3, P.z + u[1] * 0.3] : [P.x - u[0] * 2.2, P.z - u[1] * 2.2];
      BT.g = new THREEc.Group(); root.add(BT.g); BT.on = true; BT.wings = {}; BT.fx = []; BT.walls = [];
      if (BT.siege) {
        const ang = Math.atan2(-BT.v[1], BT.v[0]);
        for (let l = 0; l < 3; l++) {
          const p = gridPos(l, 3.62), wall = new THREEc.Mesh(wallGeo, wallMat); wall.position.set(p[0], p[1] - 0.05, p[2]); wall.rotation.y = ang; wall.castShadow = true; wall.receiveShadow = true; BT.g.add(wall); BT.walls.push(wall);
        }
        for (let k = 0; k < 4; k++) { const p = gridPos(k - 0.5, 3.62), t = new THREEc.Mesh(towerGeo, wallMat); t.position.set(p[0], p[1] - 0.05, p[2]); t.rotation.y = ang; t.castShadow = true; BT.g.add(t); }
      }
      for (const m of Object.values(armies)) m.g.visible = false;
      // the camera stands behind our side, a little high
      const mid = gridPos(1, 2.9), back = BT.me === 'A' ? [-u[0], -u[1]] : u;
      anim = { from: JSON.parse(JSON.stringify(cam)), to: { t: [mid[0], mid[2]], dist: 13, az: Math.atan2(back[0], back[1]) + 0.25, el: 0.55 }, t0: performance.now(), ms: 1100 };
    };
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    // show a battle state: every wing tweens to its cell; fights lunge, burns flicker, arrows fly, routs fall back and thin out
    const battleShow = (b, ms = 800) => {
      if (!BT.on) return;
      const now = performance.now(), cells = {};
      for (const w of b.wings) {
        let W = BT.wings[w.id];
        if (!W) { W = BT.wings[w.id] = wingModel(w, b[w.side].fid); BT.g.add(W.g); const p0 = gridPos(w.lane, w.row + (w.side === 'A' ? -1.2 : 1.2)); W.g.position.set(p0[0], p0[1], p0[2]); W.alive = true; }
        const key = w.side + w.lane + ':' + w.row, slot = cells[key] = (cells[key] ?? -1) + 1;
        const fwd = w.side === 'A' ? BT.u : [-BT.u[0], -BT.u[1]];
        let to = gridPos(w.lane, w.row, slot ? (slot % 2 ? 1 : -1) * Math.ceil(slot / 2) : 0);
        if (w.gone) { const r = w.left ? 2.2 : 1.6; const x = to[0] - fwd[0] * r * ROW, z = to[2] - fwd[1] * r * ROW; to = [x, terr.h(x, z), z]; }
        W.g.rotation.y = Math.atan2(-fwd[1], fwd[0]);
        const count = w.gone ? 0 : Math.max(2, Math.min(W.cap, Math.round(w.men / 60)));
        W.tw = { from: W.g.position.toArray(), to, t0: now, ms, lunge: w.fought ? 0.35 : 0, fwd, shake: w.hit > 0 ? Math.min(0.08, w.hit / 4000) : 0, c0: W.mesh ? W.mesh.count : 0, c1: W.mesh ? count : 0, fade: w.gone };
        const wet = W.boats.length && inWater(to[0], to[2]);
        for (let k = 0; k < W.boats.length; k++) W.boats[k].visible = wet && !w.gone && k < Math.max(1, Math.ceil(w.men / 500));
        if (W.boats.length && W.mesh) W.mesh.visible = !wet;
        if (wet) to[1] = waterY(to[0], to[2]) + 0.02;
        if (w.burnt) for (let k = 0; k < 7; k++) { const f = new THREEc.Mesh(flameGeo, flameMat); f.position.set(K.rr(-0.9, 0.2), 0.05, K.rr(-0.55, 0.55)); W.g.add(f); BT.fx.push({ kind: 'flame', m: f, parent: W.g, t0: now, ms: 3200, ph: Math.random() * 6 }); }
      }
      if (BT.walls && BT.walls.length) for (const w of b.wings) if (w.breach && w.side === 'A' && !BT.walls[w.lane].userData.down) { const m = BT.walls[w.lane]; m.userData.down = true; m.scale.y = 0.45; m.rotation.x = 0.12; }
      // arrows: a short arc from each shooting wing to its target
      for (const w of b.wings) {
        if (!w.shot || !BT.wings[w.id] || !BT.wings[w.shot]) continue;
        const A = BT.wings[w.id].tw.to, T = BT.wings[w.shot].tw.to;
        for (let k = 0; k < 14; k++) { const m = new THREEc.Mesh(arrowGeo, arrowMat); m.visible = false; BT.g.add(m); BT.fx.push({ kind: 'arrow', m, a: [A[0] + K.rr(-0.4, 0.4), A[1] + 0.3, A[2] + K.rr(-0.4, 0.4)], b: [T[0] + K.rr(-0.5, 0.5), T[1] + 0.1, T[2] + K.rr(-0.5, 0.5)], t0: now + ms * 0.35 + k * 25, ms: 650 }); }
      }
      // dust where lines met
      const lanes = new Set(b.wings.filter((w) => w.fought && !w.gone).map((w) => w.lane));
      for (const f of BT.fx) if (f.kind === 'dust') f.end = now + 300;
      for (const l of lanes) { const ws = b.wings.filter((w) => w.fought && w.lane === l && BT.wings[w.id]), p = ws.reduce((s, w) => [s[0] + BT.wings[w.id].tw.to[0] / ws.length, s[1] + BT.wings[w.id].tw.to[2] / ws.length], [0, 0]); const d = rt.addDust(); d.position.set(p[0], terr.h(p[0], p[1]), p[1]); d.scale.setScalar(0.45); d.visible = true; BT.fx.push({ kind: 'dust', m: d, t0: now, end: now + 60000 }); }
      dirty = true;
    };
    const stepBattle = (now) => {
      if (!BT.on) return false;
      let any = false;
      for (const W of Object.values(BT.wings)) {
        const t = W.tw; if (!t) continue;
        const u = Math.min(1, Math.max(0, (now - t.t0) / t.ms)), e = ease(u), l = Math.sin(Math.PI * Math.min(1, u * 1.4)) * t.lunge, sh = u < 1 ? t.shake * Math.sin(now * 0.07) : 0;
        W.g.position.set(t.from[0] + (t.to[0] - t.from[0]) * e + t.fwd[0] * l + sh, t.from[1] + (t.to[1] - t.from[1]) * e, t.from[2] + (t.to[2] - t.from[2]) * e + t.fwd[1] * l + sh);
        if (W.mesh) W.mesh.count = Math.round(t.c0 + (t.c1 - t.c0) * e);
        if (t.fade && u >= 1) W.g.visible = false;
        if (u < 1) any = true; else W.tw = Object.assign(t, { lunge: 0, shake: 0, from: t.to.slice(), c0: t.c1 });
      }
      BT.fx = BT.fx.filter((f) => {
        const u = (now - f.t0) / (f.ms || 1);
        if (f.kind === 'flame') { if (u >= 1) { f.parent.remove(f.m); return false; } f.m.scale.set(1, 0.6 + 0.5 * Math.abs(Math.sin(now * 0.012 + f.ph)) * (1 - u * 0.7), 1); any = true; return true; }
        if (f.kind === 'arrow') { if (u >= 1) { BT.g.remove(f.m); return false; } if (u < 0) { any = true; return true; } f.m.visible = true; const x = f.a[0] + (f.b[0] - f.a[0]) * u, z = f.a[2] + (f.b[2] - f.a[2]) * u, y = f.a[1] + (f.b[1] - f.a[1]) * u + Math.sin(Math.PI * u) * 1.2; f.m.position.set(x, y, z); f.m.rotation.y = Math.atan2(-(f.b[2] - f.a[2]), f.b[0] - f.a[0]); f.m.rotation.z = Math.cos(Math.PI * u) * 0.9; any = true; return true; }
        if (f.kind === 'dust') { if (now > f.end) { rt.removeMarker(f.m); return false; } return true; }
        return true;
      });
      return any;
    };
    const battleEnd = () => {
      if (!BT.g) return;
      for (const f of BT.fx) if (f.kind === 'dust') rt.removeMarker(f.m);
      BT.g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      root.remove(BT.g); BT.g = null; BT.on = false; BT.wings = {}; BT.fx = [];
      for (const m of Object.values(armies)) m.g.visible = true;
      selRing.visible = false; dirty = true;
    };
    const battleCards = () => { if (!BT.on) return []; const out = []; for (const [id, W] of Object.entries(BT.wings)) { if (!W.g.visible) continue; const p = W.g.position, q = rt.project([p.x, p.y + 1.25, p.z]); out.push({ id, x: q.x, y: q.y, visible: q.visible }); } return out; };
    const battleSelect = (id) => { const W = id && BT.wings[id]; selRing.visible = !!W; if (W) { const p = W.tw ? W.tw.to : W.g.position.toArray(); selRing.position.set(p[0], p[1] + 0.05, p[2]); selRing.scale.setScalar(0.9); } dirty = true; };
    // the lanes' names, placed in the middle of the field
    const laneCards = () => (BT.on ? [0, 1, 2].map((l) => { const p = gridPos(l, BT.me === 'A' ? 0.6 : 5.2), q = rt.project([p[0], p[1], p[2]]); return { lane: l, x: q.x, y: q.y, visible: q.visible }; }) : []);

    // ------------------------------------------------------------ test shots (harness only)
    const demoState = () => ({
      owners: { chung_ly: 'zhu_yuanzhang', am_lang: 'zhu_yuanzhang', tho_xuan: 'cao_cao', hu_di: 'local', lich_duong: 'local', xu: 'cao_cao', yan: 'cao_cao', yu: 'cao_cao', yang: 'sun_quan' },
      armies: [
        { id: 'a1', fid: 'zhu_yuanzhang', arm: 'land', at: 'chung_ly', dx: 3, dz: 2.5, bo: 4200, ky: 800, fx: -1, fz: 0.3 },
        { id: 'a2', fid: 'zhu_yuanzhang', arm: 'fleet', at: 'chung_ly', dx: 0, dz: -3.2, thuy: 1800, fx: 1, fz: 0 },
        { id: 'e1', fid: 'cao_cao', arm: 'land', at: 'tho_xuan', dx: 3, dz: -1.5, bo: 2500, ky: 3500, fx: 1, fz: 0.2 },
        { id: 'e2', fid: 'sun_quan', arm: 'fleet', at: 'lich_duong', dx: 2, dz: 3, thuy: 3000, fx: -1, fz: -0.3 },
      ],
    });
    const shot = async (name) => {
      sync(demoState());
      if (name === 'region') Object.assign(cam, { t: [huai.x - 4, huai.z + 12], dist: 150, az: 0.2, el: 0.95 });
      if (name === 'mid') Object.assign(cam, { t: [huai.x - 10, huai.z + 6], dist: 60, az: 0.5, el: 0.7 });
      if (name === 'close') Object.assign(cam, { t: [huai.x + 2, huai.z + 1], dist: 18, az: 0.6, el: 0.55 });
      if (name === 'far') Object.assign(cam, { t: [huai.x - 60, huai.z - 20], dist: 700, az: 0.1, el: 1.1 });
      apply(); select({ kind: 'army', id: 'a1' }); mark([{ kind: 'army', id: 'e1' }]);
      rt.render(); window.__extra = { cards: cards().filter((c) => c.visible).map((c) => c.kind + ':' + c.id + '@' + Math.round(c.x) + ',' + Math.round(c.y)) };
    };

    apply();
    return { rt, place, towns, armies, cam, settle, battle: { begin: battleBegin, show: battleShow, end: battleEnd, cards: battleCards, select: battleSelect, lanes: laneCards, get on() { return BT.on; } }, sync, pick, select, mark, fly, flyTo, march, pathBetween, cards, anchorOf, gesture, loop, stop, shot, apply, waterY, inWater, view, get dirty() { return dirty; }, set dirty(v) { dirty = v; } };
  };
})();
