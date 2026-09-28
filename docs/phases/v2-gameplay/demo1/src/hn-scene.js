// Demo 1 (phase v2-gameplay): the Huai Nan slice on top of the phase-1 world runtime, drawn at Civ's scale: walled towns
// several km wide, armies as a few large figures by arm around the general's banner, a base in the faction's colour.
// Presentation only; the game state comes from the page (hn-rules.js). Throwaway spike code.
//   const sc = await HNScene.create(rt, { width, height })
//   sc.sync(state) · sc.pick(x, y) · sc.select(sel) · sc.mark(list) · sc.reach(id, r, targets) · sc.groundAt(x, y) · sc.terrainAt(x, z)
//   sc.gesture.* · sc.cards() · sc.battle.* · sc.loop(onFrame) · sc.settle()
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
  const GLYPH = { zhu_yuanzhang: '明', cao_cao: '魏', sun_quan: '吳', local: '豪' };
  const COLOR = { zhu_yuanzhang: '#b3262e', cao_cao: '#4d6a3a', sun_quan: '#d9772a', local: '#8a7a55' };
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
  S.GROUND = GROUND;

  S.create = async function (rt, o) {
    const T = THREE, W = o.width, H = o.height, terr = rt.terr, scene = rt.scene, MC = rt.MC, D = window.HN_DATA, camera = rt.camera;
    const proj = Terrain.projection(D.meta.projection);
    const rivers = D.water.rivers;
    const waterY = (x, z) => { let best = 1e9, y = 0.3; for (const rv of rivers) for (const p of rv.pts) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; y = p[2]; } } return y; };
    const inWater = (x, z) => terr.riverSD(x, z) < 0;
    const recv = (m) => Terrain.receiveBaked(m, terr, 0.8);
    const HM = HNModels.create({ recv, colors: Object.fromEntries(Object.entries(COLOR).map(([k, v]) => [k, new T.Color(v).getHex()])) });

    // ------------------------------------------------------------ places
    const place = {};
    for (const t of TOWNS) {
      let x, z;
      if (t.seat) { x = MC[t.seat].x; z = MC[t.seat].z; } else { [x, z] = proj.toWorld(t.lonlat[0], t.lonlat[1]); }
      place[t.id] = { id: t.id, name: t.name, x, z, y: terr.h(x, z), seat: t.seat || null, kind: 'town' };
    }
    for (const s of SEATS) { const c = MC[s.id]; place[s.id] = { id: s.id, name: s.name, x: c.x, z: c.z, y: c.y, seat: s.id, kind: 'seat' }; }

    // ------------------------------------------------------------ ground: what kind it is (terrain data of the phase-1 map)
    // (Huai Nan sits 0.1–0.3 up; river banks are steep, so height is judged against the lowest ground 5 units around)
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
    // the three lanes of a battle at a site attacked from a point: the ground where each lane meets decides its kind
    const lanesAt = (siteId, from) => {
      const P = place[siteId]; let u = from ? [P.x - from[0], P.z - from[1]] : [-0.85, 0.5];
      const L = Math.hypot(u[0], u[1]) || 1; u = [u[0] / L, u[1] / L]; const v = [-u[1], u[0]];
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
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
        g.fillStyle = COLOR[fid] || '#8a8275'; g.fillRect(0, 0, 64, 96);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 84, 64, 12);
        if (GLYPH[fid]) { g.fillStyle = '#f3ecdc'; g.font = 'bold 40px "Noto Serif TC","Noto Serif CJK TC","Noto Serif CJK SC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(GLYPH[fid], 32, 42); }
        const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
        flagTex[fid] = new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.9 });
      }
      return flagTex[fid];
    };
    const poleMat = new T.MeshStandardMaterial({ color: 0x3b3129, roughness: 0.8 });
    // a pole and a flag with the owner's glyph; the flag's pivot turns to the camera every frame
    const standard = (fid, h, s) => {
      const g = new T.Group();
      const pole = new T.Mesh(new T.CylinderGeometry(0.035 * s, 0.035 * s, h, 5), poleMat); pole.position.y = h / 2; g.add(pole);
      const piv = new T.Group(); piv.position.y = h; piv.userData.flag = true; g.add(piv);
      const cloth = new T.Mesh(new T.PlaneGeometry(0.7 * s, 1.0 * s, 3, 1), flagMat(fid)); cloth.position.set(0.35 * s, -0.5 * s, 0); piv.add(cloth);
      return g;
    };

    // ------------------------------------------------------------ towns: one walled model each, rebuilt when its lũy changes
    const root = new T.Group(); scene.add(root);
    const towns = {}, armies = {};
    for (const id of Object.keys(place)) {
      const p = place[id], g = new T.Group(); g.position.set(p.x, p.y, p.z); root.add(g);
      towns[id] = { g, std: null, fid: null, level: -1, model: null };
    }
    const setTown = (id, fid, level) => {
      const t = towns[id], p = place[id];
      if (p.kind === 'town' && level !== t.level) {
        if (t.model) { t.g.remove(t.model); t.model.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); }
        t.model = HM.town({ level, seed: [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1, size: id === 'chung_ly' ? 5.2 : 4.4 });
        t.g.add(t.model); t.level = level;
      }
      if (fid !== t.fid) {
        if (t.std) t.g.remove(t.std);
        t.fid = fid; t.std = fid ? standard(fid, p.kind === 'seat' ? 3.2 : 3.6, p.kind === 'seat' ? 1.3 : 1.7) : null;
        if (t.std) { t.std.position.set(0, 0.05, 0); t.g.add(t.std); }
      }
    };

    // ------------------------------------------------------------ armies: Civ-style figures, scaled with the camera distance
    const ringGeo = new T.RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2);
    const ringMat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
    const selRing = new T.Mesh(ringGeo, ringMat(0xf2d27a, 0.95)); selRing.visible = false; selRing.renderOrder = 6; root.add(selRing);
    const tgtRings = [];
    const buildArmy = (a) => { const g = HM.army({ fid: a.fid, bo: a.bo, cung: a.cung, ky: a.ky, thuy: a.thuy, fleet: a.arm === 'fleet', seal: a.seal || GLYPH[a.fid] }); g.userData.id = a.id; return g; };
    let state = null;
    const sig = (a) => [a.fid, a.arm, a.seal, HM.count(a.bo, 600, 9), HM.count(a.cung, 400, 4), HM.count(a.ky, 450, 6), HM.count(a.thuy, 600, 4)].join('|');
    const armyPos = (a) => { const p = a.at ? place[a.at] : null; const x = a.x ?? (p ? p.x + (a.dx || 0) : 0), z = a.z ?? (p ? p.z + (a.dz || 0) : 0); return [x, a.arm === 'fleet' ? waterY(x, z) + 0.02 : terr.h(x, z), z]; };
    const sync = (st) => {
      state = st;
      for (const id of Object.keys(towns)) setTown(id, (st.owners && st.owners[id]) || null, st.walls && st.walls[id] != null ? st.walls[id] : place[id].kind === 'town' ? 1 : -1);
      const seen = new Set();
      for (const a of st.armies || []) {
        seen.add(a.id);
        let m = armies[a.id];
        if (!m || m.sig !== sig(a)) { if (m) root.remove(m.g); m = armies[a.id] = { g: buildArmy(a), sig: sig(a), a }; root.add(m.g); m.g.visible = !BT.on; }
        m.a = a;
        if (!m.moving) { const p = armyPos(a); m.g.position.set(p[0], p[1], p[2]); m.g.rotation.y = Math.atan2(-(a.fz ?? 0), a.fx ?? 1); }
      }
      for (const id of Object.keys(armies)) if (!seen.has(id)) { root.remove(armies[id].g); delete armies[id]; }
      scaleMarkers(); dirty = true;
    };

    // ------------------------------------------------------------ camera
    const huai = place.chung_ly;
    const cam = { t: [huai.x - 7, huai.z + 9], dist: 62, az: 0.3, el: 0.88 };
    const REGION = TOWNS.map((t) => [place[t.id].x, place[t.id].z]).concat([[place.xu.x, place.xu.z], [place.yang.x, place.yang.z]]);
    const clampT = () => { cam.t[0] = Math.max(huai.x - 140, Math.min(huai.x + 140, cam.t[0])); cam.t[1] = Math.max(huai.z - 140, Math.min(huai.z + 120, cam.t[1])); };
    const view = () => {
      clampT();
      const ty = Math.max(0.2, terr.h(cam.t[0], cam.t[1])), t = [cam.t[0], ty, cam.t[1]];
      const c = [t[0] + cam.dist * Math.cos(cam.el) * Math.sin(cam.az), t[1] + cam.dist * Math.sin(cam.el), t[2] + cam.dist * Math.cos(cam.el) * Math.cos(cam.az)];
      const minY = terr.h(c[0], c[2]) + 1.5; if (c[1] < minY) c[1] = minY;
      return cam.dist > 330 ? { name: 'hn-far', target: t, cam: c, fov: 34, mode: 'far' } : { name: 'hn', target: t, cam: c, fov: 34, mode: 'near', lod: REGION, key: 'hn-region', trees: [{ key: 'hn-trees', x: huai.x - 8, z: huai.z + 8, R: 34 }] };
    };
    const apply = () => { rt.setView(view()); scaleMarkers(); dirty = true; };
    // Civ's proportions: an army about as wide as a town; pulled back, both grow (armies a little faster) so they stay readable
    const zoomK = () => Math.max(1, Math.min(4, cam.dist / 45));
    const markerScale = () => 1.45 * Math.pow(zoomK(), 0.9);
    const scaleMarkers = () => {
      const s = markerScale(), ts = Math.pow(zoomK(), 0.7);
      for (const m of Object.values(armies)) m.g.scale.setScalar(s);
      for (const t of Object.values(towns)) { if (t.model) t.model.scale.setScalar(ts); if (t.std) t.std.scale.setScalar(ts); }
      if (!BT.on && selRing.userData.r) selRing.scale.setScalar(selRing.userData.r * (selRing.userData.army ? s : 1));
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

    // ------------------------------------------------------------ gestures (the page forwards pointer and wheel events)
    const ptrs = new Map(); let g0 = null, tap = null;
    const snap = () => { const ps = [...ptrs.values()]; if (ps.length === 1) return { n: 1, x: ps[0].x, y: ps[0].y }; const [a, b] = ps; return { n: 2, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
    const gesture = {
      down(id, x, y, button) { ptrs.set(id, { x, y }); g0 = { s: snap(), cam: JSON.parse(JSON.stringify(cam)), rot: button === 2 }; tap = ptrs.size === 1 ? { x, y, t: performance.now() } : null; },
      move(id, x, y) {
        if (!ptrs.has(id)) return; ptrs.set(id, { x, y }); const s = snap(); if (!g0 || s.n !== g0.s.n) { g0 = { s, cam: JSON.parse(JSON.stringify(cam)), rot: g0 && g0.rot }; return; }
        if (tap && Math.hypot(x - tap.x, y - tap.y) > 8) tap = null;
        if (s.n === 1 && !g0.rot) {
          const k = cam.dist * 0.0021 * (900 / H) * 0.5, dx = s.x - g0.s.x, dy = s.y - g0.s.y, ca = Math.cos(cam.az), sa = Math.sin(cam.az);
          cam.t[0] = g0.cam.t[0] - ca * dx * k - sa * dy * k; cam.t[1] = g0.cam.t[1] + sa * dx * k - ca * dy * k;
        } else if (s.n === 1) { cam.az = g0.cam.az - (s.x - g0.s.x) * 0.006; cam.el = Math.max(0.3, Math.min(1.4, g0.cam.el + (s.y - g0.s.y) * 0.004)); }
        else { cam.dist = Math.max(8, Math.min(900, (g0.cam.dist * g0.s.d) / Math.max(10, s.d))); cam.az = g0.cam.az - (s.ang - g0.s.ang); cam.el = Math.max(0.3, Math.min(1.4, g0.cam.el + (s.y - g0.s.y) * 0.004)); }
        apply();
      },
      up(id, x, y) { const wasTap = tap && ptrs.size === 1 && performance.now() - tap.t < 450; ptrs.delete(id); g0 = null; tap = null; return wasTap ? pick(x, y) : undefined; },
      wheel(dy) { cam.dist = Math.max(8, Math.min(900, cam.dist * Math.exp(dy * 0.0012))); apply(); },
      zoom(f) { cam.dist = Math.max(8, Math.min(900, cam.dist * f)); apply(); },
      rotate(da) { cam.az += da; apply(); },
      tilt(de) { cam.el = Math.max(0.3, Math.min(1.4, cam.el + de)); apply(); },
    };

    // ------------------------------------------------------------ picking, ground under a screen point, screen cards
    const anchorOf = (kind, id) => {
      if (kind === 'army') { const m = armies[id]; if (!m) return null; const p = m.g.position, s = m.g.scale.x; return [p.x, p.y + 1.9 * s, p.z]; }
      const p = place[id], ts = Math.pow(zoomK(), 0.7); return [p.x, p.y + (p.kind === 'town' ? 4.0 * ts : 3.4), p.z];
    };
    const cards = () => {
      const out = [];
      for (const id of Object.keys(place)) { const q = rt.project(anchorOf('town', id)); out.push({ kind: 'town', id, x: q.x, y: q.y, visible: q.visible }); }
      for (const id of Object.keys(armies)) { if (!armies[id].g.visible) continue; const q = rt.project(anchorOf('army', id)); out.push({ kind: 'army', id, x: q.x, y: q.y, visible: q.visible }); }
      return out;
    };
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
      let best = null;
      for (const c of cards()) { if (!c.visible) continue; const d = Math.hypot(c.x - x, c.y - (y - (c.kind === 'army' ? 22 : 18))); const r = c.kind === 'army' ? 48 : 44; if (d < r && (!best || d < best.d)) best = { kind: c.kind, id: c.id, d }; }
      if (best) return { kind: best.kind, id: best.id };
      // the figures themselves: a tap on an army's base or inside a town's walls
      const gp = groundAt(x, y); if (!gp) return { kind: 'ground', id: null };
      for (const [id, m] of Object.entries(armies)) { if (!m.g.visible) continue; const r = (m.g.userData.r || 1.4) * m.g.scale.x; if (Math.hypot(gp[0] - m.g.position.x, gp[1] - m.g.position.z) < r) return { kind: 'army', id }; }
      for (const [id, p] of Object.entries(place)) if (Math.hypot(gp[0] - p.x, gp[1] - p.z) < (p.kind === 'town' ? 3.2 * Math.pow(zoomK(), 0.7) : 2)) return { kind: 'town', id };
      return { kind: 'ground', id: null, at: gp, terrain: terrainAt(gp[0], gp[1]) };
    };
    const posOf = (kind, id) => (kind === 'army' ? (armies[id] ? armies[id].g.position.toArray() : null) : [place[id].x, place[id].y, place[id].z]);
    const ringFor = (ring, kind, id) => {
      const p = posOf(kind, id); if (!p) return false;
      const army = kind === 'army'; ring.userData.army = army; ring.userData.r = army ? (armies[id].g.userData.r || 1.4) + 0.2 : place[id].kind === 'town' ? 3.9 * Math.pow(zoomK(), 0.7) : 2.2;
      const off = army ? new T.Vector3(-0.35, 0, 0).applyQuaternion(armies[id].g.quaternion).multiplyScalar(armies[id].g.scale.x) : new T.Vector3();
      ring.position.set(p[0] + off.x, (army && armies[id].a.arm === 'fleet' ? p[1] : terr.h(p[0], p[2])) + 0.12, p[2] + off.z); return true;
    };
    const select = (sel) => { selRing.visible = !!sel && ringFor(selRing, sel.kind, sel.id); scaleMarkers(); dirty = true; };
    const mark = (list) => {
      while (tgtRings.length) root.remove(tgtRings.pop());
      for (const m of list || []) { const r = new T.Mesh(ringGeo, ringMat(m.hex || 0xd4492f, 0.9)); if (!ringFor(r, m.kind, m.id)) continue; r.renderOrder = 6; root.add(r); tgtRings.push(r); }
      scaleMarkers(); dirty = true;
    };

    // ------------------------------------------------------------ one season's reach: a ribbon circle on the ground, dashed routes to the places in reach
    let reachG = null;
    const ribbon = (pts, w, mat, lift = 0.25) => {
      const pos = [], idx = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * w / 2, nz = (dx / L) * w / 2, [x, z] = pts[i];
        pos.push(x + nx, Math.max(terr.h(x + nx, z + nz), 0) + lift, z + nz, x - nx, Math.max(terr.h(x - nx, z - nz), 0) + lift, z - nz);
        if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new T.Mesh(g, mat); m.renderOrder = 5; return m;
    };
    const flat = (hex, op) => new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
    const reach = (id, R, targets) => {
      if (reachG) { root.remove(reachG); reachG.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); reachG = null; }
      const m = id && armies[id]; if (!m) { dirty = true; return; }
      reachG = new T.Group(); root.add(reachG);
      const c = m.g.position, mine = !!(state && state.me && m.a.fid === state.me), col = mine ? 0xf2d27a : 0xe5735a;
      const circle = (r) => Array.from({ length: 161 }, (_, k) => { const a = (k / 160) * Math.PI * 2; return [c.x + Math.cos(a) * r, c.z + Math.sin(a) * r]; });
      reachG.add(ribbon(circle(R), 0.55, flat(col, 0.85)));
      reachG.add(ribbon(circle(R - 1.4), 2.2, flat(col, 0.12)));
      for (const t of targets || []) {
        const p = t.kind === 'town' ? place[t.id] : armies[t.id] ? { x: armies[t.id].g.position.x, z: armies[t.id].g.position.z } : null; if (!p) continue;
        const L = Math.hypot(p.x - c.x, p.z - c.z), n = Math.max(2, Math.floor(L / 1.6)), mat = flat(t.hostile ? 0xe5735a : 0xf2d27a, 0.9);
        for (let k = 0; k < n; k += 2) { const u0 = k / n, u1 = Math.min(1, (k + 1) / n); if (u1 > 0.9) break; reachG.add(ribbon([u0, (u0 + u1) / 2, u1].map((u) => [c.x + (p.x - c.x) * u, c.z + (p.z - c.z) * u]), 0.35, mat)); }
      }
      reachG.visible = !BT.on; dirty = true;
    };

    // ------------------------------------------------------------ fly the camera (short ease)
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

    // ------------------------------------------------------------ a battle on the map: wings of figures on a 3 × 6 grid at the site
    // rows run along the attack axis (0–1 attacker, 4–5 defender; at a walled town rows 4–5 stand on its walls), lanes across
    const BT = { on: false, g: null, wings: {}, center: null, u: [1, 0], v: [0, 1], fx: [], me: 'A', walls: [] };
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
      const g = new T.Group(), cap = w.arm === 'thuy' ? Math.max(1, Math.min(3, Math.ceil(w.start / 700))) : Math.max(3, Math.min(12, Math.round(w.start / 180)));
      const cols = w.arm === 'ky' ? 3 : w.arm === 'thuy' ? 1 : 4, dx = w.arm === 'ky' ? 0.52 : w.arm === 'thuy' ? 1.3 : 0.32, dz = w.arm === 'ky' ? 0.4 : w.arm === 'thuy' ? 0.8 : 0.32;
      const block = (geo, n, c, sx, sz) => { const m = new T.InstancedMesh(geo, HM.mat, n), m4 = new T.Matrix4(); for (let k = 0; k < n; k++) m.setMatrixAt(k, m4.makeTranslation(-Math.floor(k / c) * sx, 0, ((k % c) - (Math.min(c, n) - 1) / 2) * sz)); m.castShadow = true; m.frustumCulled = false; g.add(m); return m; };
      const m = block(HM.figure(w.arm, fid), cap, cols, dx, dz);
      // boats on the water, the same men as marines when the wing stands on land
      const ashore = w.arm === 'thuy' ? block(HM.figure('thuy-foot', fid), Math.max(3, Math.min(12, Math.round(w.start / 180))), 4, 0.32, 0.32) : null;
      const st = standard(fid, 1.5, 0.55); st.position.set(0.3, 0, -0.5); g.add(st);
      g.scale.setScalar(1.25);
      return { g, mesh: m, ashore, cap };
    };
    const wallMat = recv(new T.MeshStandardMaterial({ color: 0xa89574, roughness: 0.95 }));
    const wallGeo = (() => { const parts = [new T.BoxGeometry(LANE * 0.93, 0.55, 0.4).translate(0, 0.27, 0)]; for (let k = 0; k < 9; k++) parts.push(new T.BoxGeometry(0.12, 0.12, 0.42).translate(-LANE * 0.43 + k * LANE * 0.108, 0.6, 0)); return THREE.BufferGeometryUtils.mergeBufferGeometries(parts); })();
    const towerGeo = THREE.BufferGeometryUtils.mergeBufferGeometries([new T.BoxGeometry(0.55, 0.85, 0.55).translate(0, 0.42, 0), new T.BoxGeometry(0.66, 0.12, 0.66).translate(0, 0.9, 0), new T.ConeGeometry(0.5, 0.34, 4).rotateY(Math.PI / 4).translate(0, 1.13, 0)]);
    const battleBegin = (o) => {
      battleEnd();
      const P = place[o.site]; let u = o.from ? [P.x - o.from[0], P.z - o.from[1]] : [P.x - place.chung_ly.x, P.z - place.chung_ly.z];
      const L = Math.hypot(u[0], u[1]); u = L > 0.5 ? [u[0] / L, u[1] / L] : [-0.85, 0.5];
      BT.u = u; BT.v = [-u[1], u[0]]; BT.me = o.me || 'A'; BT.siege = !!o.siege;
      BT.center = o.siege ? [P.x + u[0] * 0.2, P.z + u[1] * 0.2] : [P.x - u[0] * 3.2, P.z - u[1] * 3.2];
      BT.g = new T.Group(); root.add(BT.g); BT.on = true; BT.wings = {}; BT.fx = []; BT.walls = [];
      // a siege draws its own wall line across the lanes, so the town's model steps aside for it
      if (BT.siege && towns[o.site] && towns[o.site].model) towns[o.site].model.visible = false;
      if (BT.siege) {
        const ang = Math.atan2(-BT.v[1], BT.v[0]);
        for (let l = 0; l < 3; l++) { const p = gridPos(l, 3.6), wall = new T.Mesh(wallGeo, wallMat); wall.position.set(p[0], p[1] - 0.05, p[2]); wall.rotation.y = ang; wall.castShadow = true; wall.receiveShadow = true; BT.g.add(wall); BT.walls.push(wall); }
        for (let k = 0; k < 4; k++) { const p = gridPos(k - 0.5, 3.6), t = new T.Mesh(towerGeo, wallMat); t.position.set(p[0], p[1] - 0.05, p[2]); t.rotation.y = ang; t.castShadow = true; BT.g.add(t); }
      }
      for (const m of Object.values(armies)) m.g.visible = false;
      if (reachG) reachG.visible = false;
      const mid = gridPos(1, 2.9), back = BT.me === 'A' ? [-u[0], -u[1]] : u;
      anim = { from: JSON.parse(JSON.stringify(cam)), to: { t: [mid[0], mid[2]], dist: 15, az: Math.atan2(back[0], back[1]) + 0.3, el: 0.55 }, t0: performance.now(), ms: 1100 };
    };
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
    const battleShow = (b, ms = 800) => {
      if (!BT.on) return;
      const now = performance.now(), cells = {};
      for (const w of b.wings) {
        let Wg = BT.wings[w.id];
        if (!Wg) { Wg = BT.wings[w.id] = wingModel(w, b[w.side].fid); BT.g.add(Wg.g); const p0 = gridPos(w.lane, w.row + (w.side === 'A' ? -1.2 : 1.2)); Wg.g.position.set(p0[0], p0[1], p0[2]); }
        const key = w.side + w.lane + ':' + w.row, slot = (cells[key] = (cells[key] ?? -1) + 1);
        const fwd = w.side === 'A' ? BT.u : [-BT.u[0], -BT.u[1]];
        let to = gridPos(w.lane, w.row, slot ? (slot % 2 ? 1 : -1) * Math.ceil(slot / 2) : 0);
        if (w.gone) { const r = w.left ? 2.2 : 1.6; const x = to[0] - fwd[0] * r * ROW, z = to[2] - fwd[1] * r * ROW; to = [x, terr.h(x, z), z]; }
        const wet = w.arm === 'thuy' && inWater(to[0], to[2]);
        if (wet) to[1] = waterY(to[0], to[2]) + 0.02;
        if (Wg.ashore) { Wg.mesh.visible = wet; Wg.ashore.visible = !wet; Wg.ashore.count = w.gone ? 0 : Math.max(1, Math.ceil((w.men / w.start) * Wg.ashore.instanceMatrix.count)); }
        Wg.g.rotation.y = Math.atan2(-fwd[1], fwd[0]);
        const count = w.gone ? 0 : Math.max(1, Math.min(Wg.cap, Math.ceil((w.men / w.start) * Wg.cap)));
        Wg.tw = { from: Wg.g.position.toArray(), to, t0: now, ms, lunge: w.fought ? 0.4 : 0, fwd, shake: w.hit > 0 ? Math.min(0.1, w.hit / 3000) : 0, c0: Wg.mesh.count, c1: count, fade: w.gone };
        if (w.burnt) for (let k = 0; k < 8; k++) { const f = new T.Mesh(flameGeo, flameMat); f.position.set(K.rr(-1, 0.3), 0.05, K.rr(-0.6, 0.6)); Wg.g.add(f); BT.fx.push({ kind: 'flame', m: f, parent: Wg.g, t0: now, ms: 3200, ph: Math.random() * 6 }); }
      }
      for (const w of b.wings) if (w.breach && w.side === 'A' && BT.walls[w.lane] && !BT.walls[w.lane].userData.down) { const m = BT.walls[w.lane]; m.userData.down = true; m.scale.y = 0.4; m.rotation.x = 0.14; }
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
        if (t.fade && u >= 1) Wg.g.visible = false;
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
    const battleEnd = () => {
      if (!BT.g) return;
      for (const f of BT.fx) if (f.kind === 'dust') rt.removeMarker(f.m);
      BT.g.traverse((x) => { if (x.isInstancedMesh) x.dispose(); });
      root.remove(BT.g); BT.g = null; BT.on = false; BT.wings = {}; BT.fx = []; BT.walls = [];
      for (const t of Object.values(towns)) if (t.model) t.model.visible = true;
      for (const m of Object.values(armies)) m.g.visible = true;
      if (reachG) reachG.visible = true;
      selRing.visible = false; dirty = true;
    };
    const battleCards = () => { if (!BT.on) return []; const out = []; for (const [id, Wg] of Object.entries(BT.wings)) { if (!Wg.g.visible) continue; const p = Wg.g.position, q = rt.project([p.x, p.y + 1.35, p.z]); out.push({ id, x: q.x, y: q.y, visible: q.visible }); } return out; };
    const battleSelect = (id) => { const Wg = id && BT.wings[id]; selRing.visible = !!Wg; if (Wg) { const p = Wg.tw ? Wg.tw.to : Wg.g.position.toArray(); selRing.position.set(p[0] - BT.u[0] * 0.3, p[1] + 0.08, p[2] - BT.u[1] * 0.3); selRing.scale.setScalar(1.1); } dirty = true; };
    const laneCards = () => (BT.on ? [0, 1, 2].map((l) => { const p = gridPos(l, BT.me === 'A' ? 0.5 : 5.3), q = rt.project([p[0], p[1], p[2]]); return { lane: l, x: q.x, y: q.y, visible: q.visible }; }) : []);

    // ------------------------------------------------------------ frame loop (renders only when something changed)
    let dirty = true, running = false, onFrame = null, tWave = 0;
    const draw = () => { orientFlags(); rt.render(); };
    const frame = (now) => {
      if (!running) return;
      if (anim) {
        const u = Math.min(1, (now - anim.t0) / anim.ms), e = ease(u), A = anim.from, B = anim.to;
        cam.t = [A.t[0] + (B.t[0] - A.t[0]) * e, A.t[1] + (B.t[1] - A.t[1]) * e]; cam.dist = Math.exp(Math.log(A.dist) + (Math.log(B.dist) - Math.log(A.dist)) * e); cam.az = A.az + (B.az - A.az) * e; cam.el = A.el + (B.el - A.el) * e;
        rt.setView(view()); scaleMarkers(); dirty = true; if (u >= 1) anim = null;
      }
      if (stepMarch(now)) dirty = true;
      if (stepBattle(now)) dirty = true;
      if (now - tWave > 150) { tWave = now; dirty = true; root.traverse((f) => { if (f.userData.flag && f.children[0]) f.children[0].rotation.y = Math.sin(now * 0.003 + f.id) * 0.18; }); }
      if (dirty) { draw(); dirty = false; if (onFrame) onFrame(); }
      requestAnimationFrame(frame);
    };
    const loop = (cb) => { onFrame = cb; if (!running) { running = true; requestAnimationFrame(frame); } };
    const stop = () => { running = false; };
    // jump every animation to its end and draw (tests; also a skip)
    const settle = () => { if (anim) { Object.assign(cam, anim.to); anim = null; rt.setView(view()); scaleMarkers(); } const far = performance.now() + 1e6; stepMarch(far); stepBattle(far); draw(); dirty = false; };

    // ------------------------------------------------------------ test shots (harness only)
    const demoState = () => ({
      me: 'zhu_yuanzhang',
      owners: { chung_ly: 'zhu_yuanzhang', am_lang: 'zhu_yuanzhang', tho_xuan: 'cao_cao', hu_di: 'local', lich_duong: 'local', xu: 'cao_cao', yan: 'cao_cao', yu: 'cao_cao', yang: 'sun_quan' },
      walls: { chung_ly: 2, am_lang: 1, tho_xuan: 3, hu_di: 1, lich_duong: 1 },
      armies: [
        { id: 'a1', fid: 'zhu_yuanzhang', arm: 'land', at: 'chung_ly', dx: -4.5, dz: 4, bo: 3200, cung: 1000, ky: 800, fx: -1, fz: 0.3, seal: '朱' },
        { id: 'a2', fid: 'zhu_yuanzhang', arm: 'fleet', at: 'chung_ly', dx: 0, dz: -4, thuy: 1800, bo: 600, fx: 1, fz: 0, seal: '桓' },
        { id: 'e1', fid: 'cao_cao', arm: 'land', at: 'tho_xuan', dx: 4.5, dz: -3, bo: 2000, cung: 500, ky: 3500, fx: 1, fz: 0.2, seal: '遼' },
        { id: 'e2', fid: 'sun_quan', arm: 'fleet', at: 'lich_duong', dx: 2, dz: 4, thuy: 3000, bo: 1000, fx: -1, fz: -0.3, seal: '泰' },
      ],
    });
    const shot = async (name) => {
      sync(demoState());
      if (name === 'region') Object.assign(cam, { t: [huai.x - 7, huai.z + 9], dist: 62, az: 0.3, el: 0.88 });
      if (name === 'mid') Object.assign(cam, { t: [huai.x - 3, huai.z + 3], dist: 34, az: 0.45, el: 0.72 });
      if (name === 'close') Object.assign(cam, { t: [huai.x - 3, huai.z + 3], dist: 16, az: 0.6, el: 0.55 });
      if (name === 'far') Object.assign(cam, { t: [huai.x - 60, huai.z - 20], dist: 700, az: 0.1, el: 1.1 });
      apply(); select({ kind: 'army', id: 'a1' }); reach('a1', 36, [{ kind: 'town', id: 'tho_xuan', hostile: true }, { kind: 'town', id: 'am_lang' }, { kind: 'town', id: 'hu_di', hostile: true }]);
      draw(); window.__extra = { cards: cards().filter((c) => c.visible).map((c) => c.kind + ':' + c.id + '@' + Math.round(c.x) + ',' + Math.round(c.y)), lanes: Object.fromEntries(TOWNS.map((t) => [t.id, lanesAt(t.id, [huai.x, huai.z])])) };
    };

    apply();
    return { rt, place, towns, armies, cam, settle, reach, groundAt, terrainAt, lanesAt, GROUND, battle: { begin: battleBegin, show: battleShow, end: battleEnd, cards: battleCards, select: battleSelect, lanes: laneCards, get on() { return BT.on; } }, sync, pick, select, mark, fly, flyTo, march, pathBetween, cards, anchorOf, gesture, loop, stop, shot, apply, waterY, inWater, view, markerScale, get dirty() { return dirty; }, set dirty(v) { dirty = v; } };
  };
})();
