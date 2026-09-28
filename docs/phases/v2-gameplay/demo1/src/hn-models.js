// Demo 1 (phase v2-gameplay): figurines at campaign-map scale, the way Civ draws them: a walled town that reads as a town,
// and each army as a few large figures by arm (spearmen, archers, horsemen, ships) around its general under his banner.
// Low-poly, vertex-coloured, merged per model and cached per faction. Throwaway spike code.
//   const HM = HNModels.create({ recv, flagTex })
//   HM.army({ fid, bo, cung, ky, thuy, fleet, seal }) → Group (faces +x) · HM.town({ level, fid }) → Group · HM.soldier(arm, fid)
(function () {
  const HM = (window.HNModels = {});
  HM.create = function (o) {
    const T = THREE, BGU = THREE.BufferGeometryUtils;
    const COLOR = o.colors;
    const ni = (g) => (g.index ? g.toNonIndexed() : g);
    const paint = (g, hex) => { g = ni(g); const c = new T.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g; };
    const merge = (parts) => BGU.mergeBufferGeometries(parts);
    const box = (w, h, d, x, y, z, hex, ry = 0, rz = 0) => paint(new T.BoxGeometry(w, h, d).rotateZ(rz).rotateY(ry).translate(x, y, z), hex);
    const cyl = (rt, rb, h, x, y, z, hex, seg = 8, rx = 0, rz = 0) => paint(new T.CylinderGeometry(rt, rb, h, seg).rotateX(rx).rotateZ(rz).translate(x, y, z), hex);
    const cone = (r, h, x, y, z, hex, seg = 8, ry = 0, rz = 0) => paint(new T.ConeGeometry(r, h, seg).rotateZ(rz).rotateY(ry).translate(x, y, z), hex);
    const ball = (r, x, y, z, hex) => paint(new T.IcosahedronGeometry(r, 1).translate(x, y, z), hex);
    const shade = (hex, k) => new T.Color(hex).lerp(new T.Color(k < 0 ? 0x000000 : 0xffffff), Math.abs(k)).getHex();
    const SKIN = 0xd6a77f, DARK = 0x2f2a24, IRON = 0x4a4b4d, WOOD = 0x6e5033, BRASS = 0xc9a44a, CLOTH = 0x3b342c;
    const mat = o.recv(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05 }));

    // ---------------------------------------------------------------- one figure of each arm (about 0.55 tall, facing +x)
    const cache = {};
    const cached = (key, make) => cache[key] || (cache[key] = make());
    const man = (fc, x = 0, z = 0) => [
      box(0.07, 0.2, 0.06, x, 0.1, z - 0.045, CLOTH), box(0.07, 0.2, 0.06, x, 0.1, z + 0.045, CLOTH),
      box(0.13, 0.21, 0.19, x, 0.31, z, fc), box(0.135, 0.035, 0.195, x, 0.225, z, DARK),
      box(0.06, 0.17, 0.05, x + 0.01, 0.32, z - 0.12, shade(fc, -0.25)), box(0.06, 0.17, 0.05, x + 0.01, 0.32, z + 0.12, shade(fc, -0.25)),
      ball(0.058, x, 0.47, z, SKIN),
    ];
    const geoSoldier = (arm, fid) => cached('s:' + arm + fid, () => {
      const fc = COLOR[fid], p = man(fc);
      if (arm === 'bo') {
        p.push(cone(0.075, 0.09, 0, 0.535, 0, IRON), cyl(0.012, 0.012, 0.02, 0, 0.59, 0, fc));
        p.push(cyl(0.11, 0.11, 0.025, 0.09, 0.31, -0.13, shade(fc, -0.4), 12, 0, Math.PI / 2), cyl(0.03, 0.03, 0.03, 0.105, 0.31, -0.13, BRASS, 6, 0, Math.PI / 2));
        p.push(cyl(0.009, 0.009, 0.82, 0.05, 0.44, 0.14, WOOD, 5), cone(0.02, 0.07, 0.05, 0.88, 0.14, IRON, 5));
      } else if (arm === 'cung') {
        p.push(cone(0.12, 0.06, 0, 0.52, 0, 0xb49a62, 10), cyl(0.05, 0.05, 0.02, 0, 0.5, 0, 0xb49a62, 8));
        p.push(paint(new T.TorusGeometry(0.16, 0.009, 4, 12, Math.PI).rotateZ(-Math.PI / 2).translate(0.1, 0.34, -0.1), WOOD));
        p.push(box(0.05, 0.2, 0.06, -0.09, 0.35, 0.05, 0x7a5a3a, 0, 0.2));
      } else if (arm === 'thuy') {
        p.push(paint(new T.CylinderGeometry(0.075, 0.075, 0.03, 8).translate(0, 0.52, 0), 0x2f4a5e));
        p.push(cyl(0.009, 0.009, 0.62, 0.06, 0.4, 0.13, WOOD, 5), cone(0.03, 0.06, 0.06, 0.74, 0.13, IRON, 4));
      }
      return merge(p);
    });
    const horse = (hex, s = 1, legs = WOOD) => [
      box(0.42 * s, 0.17 * s, 0.15 * s, 0, 0.3 * s, 0, hex), box(0.1 * s, 0.2 * s, 0.1 * s, 0.22 * s, 0.4 * s, 0, hex, 0, -0.5), box(0.17 * s, 0.08 * s, 0.08 * s, 0.3 * s, 0.49 * s, 0, hex, 0, -0.3),
      box(0.14 * s, 0.03 * s, 0.03 * s, 0.26 * s, 0.53 * s, 0, DARK), box(0.05 * s, 0.14 * s, 0.03 * s, -0.24 * s, 0.3 * s, 0, DARK, 0, 0.5),
      ...[[0.15, 0.05], [0.15, -0.05], [-0.15, 0.05], [-0.15, -0.05]].map(([x, z]) => cyl(0.022 * s, 0.018 * s, 0.24 * s, x * s, 0.12 * s, z * s, shade(hex, -0.3), 5)),
    ];
    const rider = (fc, s, helm) => [
      box(0.1 * s, 0.2 * s, 0.17 * s, -0.02 * s, 0.5 * s, 0, fc), box(0.05 * s, 0.13 * s, 0.05 * s, -0.02 * s, 0.37 * s, -0.09 * s, CLOTH), box(0.05 * s, 0.13 * s, 0.05 * s, -0.02 * s, 0.37 * s, 0.09 * s, CLOTH),
      ball(0.055 * s, -0.02 * s, 0.66 * s, 0, SKIN), cone(0.07 * s, 0.09 * s, -0.02 * s, 0.73 * s, 0, helm),
    ];
    const geoRider = (fid) => cached('k:' + fid, () => {
      const fc = COLOR[fid];
      return merge([...horse(0x6b4226), ...rider(fc, 1, IRON), cyl(0.009, 0.009, 0.9, 0.12, 0.58, 0.1, WOOD, 5, 0, -1.1), cone(0.02, 0.07, 0.53, 0.78, 0.1, IRON, 5, 0, -1.1 - Math.PI / 2)]);
    });
    const geoGeneral = (fid) => cached('g:' + fid, () => {
      const fc = COLOR[fid], s = 1.3;
      return merge([...horse(0xe4ddcf, s), ...rider(fc, s, BRASS), box(0.03, 0.34, 0.26, -0.12, 0.58, 0, shade(fc, -0.35)), cyl(0.012, 0.012, 1.1, -0.25, 1.05, 0.14, DARK, 5), cone(0.03, 0.08, -0.25, 1.64, 0.14, BRASS, 5)]);
    });
    const geoShip = (fid) => cached('t:' + fid, () => {
      const fc = COLOR[fid], HULL = 0x5a3b22;
      const hull = new T.Shape(); hull.moveTo(-0.7, 0); hull.lineTo(0.55, 0); hull.quadraticCurveTo(0.85, 0.02, 0.95, 0.2); hull.lineTo(-0.75, 0.2); hull.lineTo(-0.7, 0);
      const hg = paint(new T.ExtrudeGeometry(hull, { depth: 0.34, bevelEnabled: false }).translate(0, 0, -0.17), HULL);
      return merge([hg, box(1.55, 0.03, 0.36, 0.08, 0.215, 0, 0x8a6a45), box(0.42, 0.2, 0.3, -0.35, 0.33, 0, 0x6e4b2c), cone(0.26, 0.12, -0.35, 0.49, 0, 0x3f3a33, 4, Math.PI / 4),
        cyl(0.018, 0.018, 1.5, 0.12, 0.95, 0, WOOD, 6), box(0.03, 0.62, 0.62, 0.14, 0.82, 0, fc), box(0.035, 0.05, 0.64, 0.14, 0.55, 0, DARK), box(0.035, 0.05, 0.64, 0.14, 1.1, 0, DARK),
        ...[-0.4, -0.15, 0.1, 0.35].flatMap((x) => [box(0.025, 0.02, 0.36, x, 0.14, -0.3, WOOD, 0, 0.25), box(0.025, 0.02, 0.36, x, 0.14, 0.3, WOOD, 0, -0.25)])]);
    });

    // ---------------------------------------------------------------- the general's banner: a tall flag with one character
    const bannerTex = {};
    const banner = (fid, ch) => {
      const key = fid + ch;
      if (!bannerTex[key]) {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
        const css = (hex) => '#' + new T.Color(hex).getHexString();
        g.fillStyle = css(COLOR[fid]); g.fillRect(0, 0, 128, 256);
        g.fillStyle = css(shade(COLOR[fid], -0.35)); g.fillRect(0, 0, 128, 18); g.fillRect(0, 238, 128, 18);
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(k * 22, 256); g.lineTo(k * 22 + 11, 238); g.lineTo(k * 22 + 22, 256); g.fill(); }
        g.fillStyle = '#f6eedb'; g.beginPath(); g.arc(64, 118, 50, 0, 7); g.fill();
        g.fillStyle = css(COLOR[fid]); g.font = 'bold 66px "Noto Serif TC","Noto Serif CJK TC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 122);
        const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
        bannerTex[key] = new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.9 });
      }
      // the pivot sits at the pole's top and turns to the camera; the cloth hangs beside it
      const piv = new T.Group(); piv.userData.flag = true;
      const m = new T.Mesh(new T.PlaneGeometry(0.5, 1.0, 4, 1), bannerTex[key]); m.position.set(0.25, -0.5, 0); piv.add(m);
      return piv;
    };

    // ---------------------------------------------------------------- an army: figures by arm around the general, on a base in the faction's colour
    const baseMat = {};
    const base = (fid, r) => {
      const g = new T.Group();
      if (!baseMat[fid]) baseMat[fid] = [new T.MeshBasicMaterial({ color: COLOR[fid], transparent: true, opacity: 0.28, depthWrite: false }), new T.MeshBasicMaterial({ color: COLOR[fid], transparent: true, opacity: 0.95, depthWrite: false })];
      const d = new T.Mesh(new T.CircleGeometry(r, 40).rotateX(-Math.PI / 2), baseMat[fid][0]); d.position.y = 0.03; d.renderOrder = 4; g.add(d);
      const ring = new T.Mesh(new T.RingGeometry(r * 0.93, r, 48).rotateX(-Math.PI / 2), baseMat[fid][1]); ring.position.y = 0.035; ring.renderOrder = 4; g.add(ring);
      return g;
    };
    const place = (geo, pts) => { const m = new T.InstancedMesh(geo, mat, pts.length), m4 = new T.Matrix4(); pts.forEach((p, i) => m.setMatrixAt(i, m4.makeRotationY(p[3] || 0).setPosition(p[0], 0, p[2]))); m.castShadow = true; m.frustumCulled = false; return m; };
    const jit = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1) * 0.04;
    HM.count = (n, per, max) => (n > 0 ? Math.max(1, Math.min(max, Math.round(n / per))) : 0);
    HM.army = function (a) {
      const g = new T.Group(), fid = a.fid, parts = {};
      if (a.fleet) {
        const n = HM.count(a.thuy, 600, 4) || 1;
        const ships = []; for (let k = 0; k < n; k++) ships.push([-(k % 2) * 1.3 - Math.floor(k / 2) * 0.4, 0, (k % 2 ? 0.55 : -0.55) * (k ? 1 : 0), 0]);
        g.add((parts.thuy = place(geoShip(fid), ships)));
        const f = banner(fid, a.seal); f.position.set(0.12, 1.7, 0); f.scale.setScalar(0.85); g.add(f); parts.flag = f;
        g.add(base(fid, 1.45));
        return Object.assign(g, { userData: { parts, r: 1.45 } });
      }
      // the general in front, spearmen block behind, archers at the back, horsemen on the right flank
      const gen = place(geoGeneral(fid), [[0.75, 0, 0, 0]]); g.add(gen);
      const f = banner(fid, a.seal); f.position.set(0.5, 1.6, 0.14); g.add(f); parts.flag = f;
      const nb = HM.count(a.bo, 600, 9), nc = HM.count(a.cung, 400, 4), nk = HM.count(a.ky, 450, 6), nt = HM.count(a.thuy, 600, 3);
      const grid = (n, x0, cols, dx, dz, z0 = 0) => Array.from({ length: n }, (_, k) => [x0 - Math.floor(k / cols) * dx + jit(k), 0, z0 + ((k % cols) - (Math.min(cols, n) - 1) / 2) * dz + jit(k + 7), 0]);
      if (nb) g.add((parts.bo = place(geoSoldier('bo', fid), grid(nb, 0.1, 3, 0.34, 0.34, -0.25))));
      if (nt) g.add((parts.thuy = place(geoSoldier('thuy', fid), grid(nt, -0.1 - Math.ceil(nb / 3) * 0.34, 3, 0.34, 0.34, -0.25))));
      if (nc) g.add((parts.cung = place(geoSoldier('cung', fid), grid(nc, -0.2 - Math.ceil((nb + nt) / 3) * 0.34, 4, 0.34, 0.3, -0.25))));
      if (nk) g.add((parts.ky = place(geoRider(fid), grid(nk, 0.3, 2, 0.5, 0.36, 0.95))));
      const r = 1.2 + 0.18 * Math.ceil((nb + nt + nc) / 3);
      const b = base(fid, r); b.position.x = -0.35; g.add(b);
      return Object.assign(g, { userData: { parts, r } });
    };
    // one figure (the battle's wings use these)
    HM.figure = (arm, fid) => (arm === 'ky' ? geoRider(fid) : arm === 'thuy' ? geoShip(fid) : arm === 'thuy-foot' ? geoSoldier('thuy', fid) : geoSoldier(arm, fid));
    HM.mat = mat;
    HM.banner = banner;

    // ---------------------------------------------------------------- a walled town: the wall grows with its level (lũy 0–4)
    const E = { earth: 0xb09a74, wood: 0x7d5c3a, brick: 0xa89378, stone: 0x8f8a80, roof: 0x55514b, roofRed: 0x7a3326, wall: 0xdcd3c0, pillar: 0x8e3a2a, road: 0xc2ac85 };
    HM.town = function (t) {
      const L = t.size || 4.6, lv = t.level || 0, g = new T.Group(), p = [], H = [0.12, 0.26, 0.38, 0.5, 0.62][lv], th = 0.16 + lv * 0.05, col = lv <= 1 ? E.wood : lv === 2 ? E.earth : lv === 3 ? E.brick : E.stone;
      let s = t.seed || 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      p.push(box(L + 1.2, 2.2, L + 1.2, 0, -1.05, 0, 0x9c8a63)); // the town's own ground, deep enough for a slope
      p.push(box(L * 0.95, 0.02, 0.32, 0, 0.05, 0, E.road), box(0.32, 0.02, L * 0.95, 0, 0.05, 0, E.road));
      // walls on four sides with a gate gap in the middle of each, crenels on top
      const side = (ax, sgn) => {
        for (const half of [-1, 1]) {
          const len = L / 2 - 0.45, c = half * (0.45 + len / 2);
          const x = ax ? c : sgn * L / 2, z = ax ? sgn * L / 2 : c;
          p.push(box(ax ? len : th, H, ax ? th : len, x, H / 2 + 0.04, z, col));
          if (lv >= 1) for (let k = 0; k < Math.floor(len / 0.22); k++) { const u = -len / 2 + 0.11 + k * 0.22; p.push(box(ax ? 0.1 : th * 1.1, 0.08, ax ? th * 1.1 : 0.1, ax ? x + u : x, H + 0.08, ax ? z : z + u, shade(col, -0.12))); }
        }
        // gate house over the gap
        const gx = ax ? 0 : sgn * L / 2, gz = ax ? sgn * L / 2 : 0, gw = 0.95, gh = H + 0.12;
        p.push(box(ax ? gw : th * 1.6, gh, ax ? th * 1.6 : gw, gx, gh / 2 + 0.04, gz, shade(col, -0.05)), box(ax ? 0.4 : th * 1.7, gh * 0.6, ax ? th * 1.7 : 0.4, gx, gh * 0.3 + 0.04, gz, DARK));
        if (lv >= 2) { p.push(box(ax ? 0.8 : 0.5, 0.26, ax ? 0.5 : 0.8, gx, gh + 0.17, gz, E.wall), cone(0.62, 0.28, gx, gh + 0.44, gz, E.roof, 4, Math.PI / 4)); }
      };
      side(true, 1); side(true, -1); side(false, 1); side(false, -1);
      if (lv >= 2) for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const x = cx * L / 2, z = cz * L / 2, tH = H + 0.22; p.push(box(0.46, tH, 0.46, x, tH / 2 + 0.04, z, shade(col, -0.08))); if (lv >= 3) p.push(cone(0.42, 0.26, x, tH + 0.17, z, E.roof, 4, Math.PI / 4)); }
      // houses in blocks between the two streets, a hall in one quarter
      const q = L / 2 - 0.35;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const hall = sx === 1 && sz === -1;
        if (hall) { const x = 0.35 + q / 2, z = -(0.35 + q / 2); p.push(box(1.1, 0.12, 0.8, x, 0.1, z, 0xc9bda3), box(0.9, 0.36, 0.56, x, 0.34, z, E.pillar), cone(0.78, 0.32, x, 0.68, z, E.roofRed, 4, Math.PI / 4), box(0.95, 0.04, 0.62, x, 0.53, z, 0x3d3a35)); continue; }
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          if (rnd() < 0.18) continue;
          const x = sx * (0.35 + (i + 0.5) * q / 3), z = sz * (0.35 + (j + 0.5) * q / 3), w = 0.34 + rnd() * 0.12, d = 0.26 + rnd() * 0.08, h = 0.18 + rnd() * 0.08, ry = rnd() < 0.5 ? 0 : Math.PI / 2;
          p.push(box(w, h, d, x, h / 2 + 0.04, z, E.wall, ry), paint(new T.ConeGeometry(0.3, 0.16, 4).rotateY(Math.PI / 4).scale(w / 0.42, 1, d / 0.42).rotateY(ry).translate(x, h + 0.12, z), rnd() < 0.2 ? 0x6b4a3a : E.roof));
        }
      }
      const m = new T.Mesh(merge(p), mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
      g.userData.L = L; g.userData.H = H;
      return g;
    };
    return HM;
  };
})();
