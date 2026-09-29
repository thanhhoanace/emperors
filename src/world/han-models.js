// The game's Han model kit (src/world/han-models.js): every model built in code with Ryan Sael's recipe
// (docs/research/ryan-sael.md): blocks with rounded edges that catch a highlight, people and horses from curved shapes
// (lathe, capsule, sphere), Eastern Han roofs (docs/decisions/0006: straight slopes, straight eaves, grey tube tiles,
// the ridge ends turned up a little), everything merged per model with vertex colours and drawn with one material
// (environment map, saturation lift, a sky rim on the edges). Moved verbatim from the closed demo 1 spike
// (docs/phases/v2-gameplay/demo1/src/hn-models.js, which stays as it was for that phase) under the game's global name;
// the battle scene (src/world/battle.js, docs/design/visual-build.md §3) builds at 1 unit = 1 m with kit units × 30.
//   const HM = HanModels.create({ recv, colors, renderer })
//   HM.army({ fid, bo, cung, ky, thuy, fleet, seal }) → Group (faces +x) · HM.town({ level, seed, size, open }) → Group
//   HM.figure(arm, fid) → geometry · HM.siegeWall(len, level) · HM.siegeTower(level) · HM.tree(kind) → geometry
//   HM.parts (kit, xf, paint, shade, rbox, roof, pavilion, house, granary, que, wallPrism, C …) · HM.mat · HM.look · HM.hamlet
(function () {
  const HM = (window.HanModels = {});
  HM.create = function (o) {
    const T = THREE, BGU = THREE.BufferGeometryUtils, COLOR = o.colors;

    // ---------------------------------------------------------------- geometry kit
    const prep = (g) => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
    // colours are sRGB hex; kit.js turns ColorManagement.legacyMode off, so THREE.Color converts them to linear itself
    const lin = (hex) => new T.Color(hex);
    const paint = (g, hex) => { g = prep(g); const c = lin(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; };
    const shade = (hex, k) => new T.Color(hex).lerp(new T.Color(k < 0 ? 0x000000 : 0xffffff), Math.abs(k)).getHex();
    const mix = (a, b, k) => new T.Color(a).lerp(new T.Color(b), k).getHex();
    const E = new T.Euler(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), M = new T.Matrix4(), UP = new T.Vector3(0, 1, 0);
    // scale, then rotate (x, then z, then y), then move
    const xf = (g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => g.applyMatrix4(M.compose(V.set(p[0], p[1], p[2]), Q.setFromEuler(E.set(r[0], r[1], r[2], 'YZX')), S.set(s[0], s[1], s[2])));
    const kit = () => {
      const parts = [];
      const k = {
        add: (g, hex, p, r, s) => { parts.push(xf(paint(g, hex), p, r, s)); return k; },
        push: (g) => { parts.push(g); return k; },
        // a round piece between two points (a limb, a pole): capsule, or cylinder when r1 is given
        seg: (a, b, r, hex, r1) => {
          const d = V.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); d.normalize();
          const g = paint(r1 === undefined ? new T.CapsuleGeometry(r, Math.max(0.001, len), 3, 7) : new T.CylinderGeometry(r1, r, len, 7), hex);
          g.applyMatrix4(M.compose(S.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q.setFromUnitVectors(UP, d), new T.Vector3(1, 1, 1)));
          parts.push(g); return k;
        },
        geo: () => BGU.mergeBufferGeometries(parts),
        get n() { return parts.length; },
      };
      return k;
    };
    // (a bevel on a part thinner than ~0.035 is below a pixel at every zoom the demo allows: a plain box there)
    const rbox = (w, h, d, r = 0.2) => (!r || Math.min(w, h, d) < 0.035 ? new T.BoxGeometry(w, h, d) : new T.RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * r));
    const cyl = (rt, rb, h, seg = 8, open = false) => new T.CylinderGeometry(rt, rb, h, seg, 1, open);
    const sph = (r, ws = 10, hs = 7) => new T.SphereGeometry(r, ws, hs);
    const lathe = (pts, seg = 10) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
    const cone = (r, h, seg = 8) => new T.ConeGeometry(r, h, seg);
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
    // a lumpy ball (tree crowns): an icosphere pushed in and out by position, smooth normals
    const blob = (r, seed = 0, detail = 1) => {
      let g = new T.IcosahedronGeometry(r, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = BGU.mergeVertices(g);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash(x * 9 + seed, y * 9, z * 9) - 0.5) * 0.28; p.setXYZ(i, x * k, y * k * 0.9, z * k); }
      g.computeVertexNormals(); return g;
    };
    // a flat-faced shape from raw triangles
    const tris = (v) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; };

    // ---------------------------------------------------------------- palette (warm key light, Ryan's saturation)
    const C = {
      skin: 0xc27443, cloth: 0x0b0806, boot: 0x060403, iron: 0x1b1e23, brass: 0xa16112, leather: 0x271208, wood: 0x281408, straw: 0xb17f2b, red: 0x860906, cream: 0xdcc69a,
      earth: 0x806341, brick: 0x5d4e3b, stone: 0x5d5a50, plinth: 0x413a30, dark: 0x060403,
      roof: 0x3c434e, thatch: 0x745222, under: 0x411b0c, pillar: 0x640a06, plaster: 0xdacaa8, plaster2: 0xbe9f67, bracket: 0x0c2922, lattice: 0x520c06, base: 0x7c725d,
      ground: 0x524625, yard: 0x73603d, road: 0x978050, paving: 0x7a705c, grass: 0x415d1a, trunk: 0x1b0e08, water: 0x133c47,
      leaf: [0x1b340a, 0x27460e, 0x122508, 0x334c0f, 0x19320d], pine: 0x0d1d09,
    };

    // ---------------------------------------------------------------- material: environment from a gradient sky, saturation, sky rim
    let env = null;
    if (o.renderer) {
      const es = new T.Scene(), sky = new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 d;void main(){vec3 c=mix(vec3(.42,.36,.28),vec3(.95,.9,.8),smoothstep(-.3,.05,d.y));c=mix(c,vec3(.52,.66,.86),smoothstep(.05,.7,d.y));c+=vec3(1.4,1.1,.7)*pow(max(dot(d,normalize(vec3(-.5,.5,-.3))),0.),12.);gl_FragColor=vec4(c,1.);}' });
      es.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), sky));
      const pm = new T.PMREMGenerator(o.renderer); env = pm.fromScene(es, 0.04).texture; pm.dispose();
    }
    const U = { uSat: { value: 1.08 }, uRim: { value: new T.Color(0.24, 0.3, 0.38) } };
    const look = (m) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uSat = U.uSat; sh.uniforms.uRim = U.uRim;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSat; uniform vec3 uRim;').replace('#include <output_fragment>',
          `{ float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); outgoingLight += uRim * fr * (0.3 + 0.7 * diffuseColor.rgb); }
           outgoingLight = max(mix(vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))), outgoingLight, uSat), 0.0);
           #include <output_fragment>`);
      };
      m.customProgramCacheKey = () => 'hnlook';
      return m;
    };
    const mat = o.recv(look(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0, envMap: env, envMapIntensity: 0.85 })));
    const waterMat = new T.MeshStandardMaterial({ color: lin(C.water), roughness: 0.12, metalness: 0.1, envMap: env, envMapIntensity: 1.1 });

    // ---------------------------------------------------------------- the Han roof (docs/design/history.md, decisions/0006)
    // Over a w × d plan (x × z), eaves at y = 0, ridge at y = h. Eastern Han: straight slopes and straight eaves (no
    // curved roof, no upturned corners: those are later), the two ends of the ridge turned up a little, grey tube tiles.
    // kind 'hip' (庑殿, four slopes) or 'gable' (悬山, two). tMax < 1 stops the slopes part way up: the eave of a lower
    // storey. Tiles: ridged columns. o.lift (default 0) is kept for thatch that sags at the corners.
    const prof = (t, h) => h * t;
    const roof = (w, d, h, o = {}) => {
      if (d > w) return xf(roof(d, w, h, o), [0, 0, 0], [0, Math.PI / 2, 0]);
      const a = w / 2, b = d / 2, hip = o.kind !== 'gable', tMax = o.tMax ?? 1, lift = o.lift ?? 0, th = o.th ?? Math.max(0.01, h * 0.08);
      const top = o.color ?? C.roof, under = o.under ?? C.under, ridge = o.ridge ?? shade(top, -0.3), tile = o.tiles ?? 0.05;
      const nt = o.nt ?? 5, parts = [];
      const Y = (u, t) => prof(t, h) + lift * Math.pow(1 - t, 2.2) * Math.pow(Math.abs(u), 3);
      const faces = hip ? [0, 1, 2, 3] : [0, 1];
      for (const f of faces) {
        const long = f < 2, sg = f % 2 ? -1 : 1, eave = long ? a : b, nu = tile ? Math.max(4, Math.min(48, 2 * Math.round(eave / tile))) : 6;
        const P = (u, t) => {
          const e = long ? (hip ? a - t * b : a) : b * (1 - t), n = long ? b * (1 - t) : a - t * b, along = u * e;
          const ridged = tile && (Math.round((u + 1) * nu / 2) % 2) && t < tMax - 1e-6 ? th * 0.45 * (1 - Math.pow(Math.abs(u), 12)) : 0;
          const y = Y(u, t) + ridged;
          return long ? [along, y, sg * n] : [sg * n, y, along];
        };
        const pos = [], col = [], top2 = lin(top), dk = lin(shade(top, -0.12));
        for (let j = 0; j <= nt; j++) for (let i = 0; i <= nu; i++) { const u = -1 + (2 * i) / nu, t = (tMax * j) / nt; pos.push(...P(u, t)); const c = i % 2 && tile ? dk : top2; col.push(c.r, c.g, c.b); }
        const idx = [], row = nu + 1;
        for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) { const q = j * row + i; idx.push(q, q + 1, q + row, q + 1, q + row + 1, q + row); }
        let g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
        // wind so the normals face up and out
        if (g.attributes.normal.getY(Math.floor(nt / 2) * row + Math.floor(nu / 2)) < 0) { for (let q = 0; q < idx.length; q += 3) { const t0 = idx[q]; idx[q] = idx[q + 1]; idx[q + 1] = t0; } g.setIndex(idx); g.computeVertexNormals(); }
        parts.push(g.toNonIndexed());
        // underside (rafters, dark wood) and the eave board along the lower edge
        const up = [], ep = [];
        for (let i = 0; i < nu; i++) for (let j = 0; j < nt; j++) {
          const q = [P(-1 + (2 * i) / nu, (tMax * j) / nt), P(-1 + (2 * (i + 1)) / nu, (tMax * j) / nt), P(-1 + (2 * i) / nu, (tMax * (j + 1)) / nt), P(-1 + (2 * (i + 1)) / nu, (tMax * (j + 1)) / nt)].map((p) => [p[0], p[1] - th, p[2]]);
          if (!o.noUnder) up.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
        }
        for (let i = 0; i < nu; i++) { const p0 = P(-1 + (2 * i) / nu, 0), p1 = P(-1 + (2 * (i + 1)) / nu, 0); ep.push(...p0, p0[0], p0[1] - th, p0[2], ...p1, ...p1, p0[0], p0[1] - th, p0[2], p1[0], p1[1] - th, p1[2]); }
        const ug = up.length ? paint(tris(up), under) : null, eg = paint(tris(ep), shade(under, -0.2));
        // the winding of those two depends on the face: turn them outward
        for (const gg of up.length ? [ug, eg] : [eg]) { const n = gg.attributes.normal, p = gg.attributes.position; let dot = 0; for (let i = 0; i < n.count; i++) dot += gg === ug ? n.getY(i) : n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i); if (gg === ug ? dot > 0 : dot < 0) { const a2 = p.array; for (let i = 0; i < a2.length; i += 9) for (let c = 0; c < 3; c++) { const t0 = a2[i + 3 + c]; a2[i + 3 + c] = a2[i + 6 + c]; a2[i + 6 + c] = t0; } gg.computeVertexNormals(); } parts.push(gg); }
      }
      // ridges: the main ridge with upturned ends, the hip (or verge) ridges ending in flying tips
      const rk = kit(), rt = th * 1.1;
      if (tMax >= 1) {
        const rl = hip ? a - b : a;
        if (rl > 0.02) {
          rk.add(rbox(2 * rl + rt * 2, rt * 2.2, rt * 2, h > 0.1 ? 0.35 : 0), ridge, [0, h + rt * 0.7, 0]);
          for (const sx of [-1, 1]) rk.add(cone(rt * 1.1, rt * 4, 5), ridge, [sx * (rl + rt * 1.2), h + rt * 2.6, 0], [0, 0, -sx * 0.5]);
        } else rk.add(lathe([[0, h], [rt * 2.2, h], [rt * 1.6, h + rt * 2.2], [rt * 1.2, h + rt * 4], [0, h + rt * 5]], 8), C.brass, [0, 0, 0]);
      }
      const hipPts = (sx, sz) => {
        const pts = [];
        for (let j = Math.round(nt * tMax); j >= 0; j--) { const t = (j / nt), p = hip ? [sx * (a - t * b), Y(1, t) + rt * 0.6, sz * b * (1 - t)] : [sx * a, Y(1, t) + rt * 0.6, sz * b * (1 - t)]; pts.push(new T.Vector3(...p)); }
        const c = pts[pts.length - 1]; pts.push(new T.Vector3(c.x + sx * th * 0.8, c.y - th * 0.3, c.z + sz * th * 0.8 * (hip ? 1 : 0)));
        return pts;
      };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pts = hipPts(sx, sz); if (pts.length > 2) rk.push(paint(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 6, rt * 0.75, 4), ridge)); }
      parts.push(rk.geo());
      const g = BGU.mergeBufferGeometries(parts);
      g.userData = { topW: hip ? 2 * (a - tMax * b) : w, topD: 2 * b * (1 - tMax), topY: prof(tMax, h) };
      return g;
    };

    // ---------------------------------------------------------------- buildings
    // a hall or tower: stone base, storeys of columns, walls and a painted bracket band, each under its roof;
    // with double eaves the lower storeys get a skirt roof and a balcony floor. Long axis x, front +z, base at y = 0.
    const pavilion = (o) => {
      const k = kit(), n = o.storeys || 1, ov = o.ov ?? 0.09;
      let y = 0, w = o.w, d = o.d;
      if (o.base) { k.add(rbox(w + 0.1, o.base, d + 0.1, 0.18), o.baseColor ?? C.base, [0, o.base / 2, 0]); y += o.base; }
      for (let s = 0; s < n; s++) {
        const last = s === n - 1, h = (o.h ?? 0.15) * (s ? 0.82 : 1);
        k.add(rbox(w * 0.84, h, d * 0.72, 0.06), o.wall ?? C.lattice, [0, y + h / 2, 0]);
        if (o.cols !== false) { const nx = Math.max(2, Math.round(w / 0.13) + 1); for (let i = 0; i < nx; i++) for (const sz of [-1, 1]) k.add(cyl(0.015, 0.017, h, 6), C.pillar, [-w * 0.45 + (i * w * 0.9) / (nx - 1), y + h / 2, sz * d * 0.42]); }
        k.add(rbox(w * 0.96, 0.03, d * 0.9, 0.3), C.bracket, [0, y + h + 0.015, 0]);
        y += h + 0.03;
        const rh = (o.rh ?? Math.min(w, d) * 0.5) * (last ? 1 : 0.6), r = roof(w + 2 * ov, d + 2 * ov, rh, { kind: o.kind, tMax: last ? 1 : 0.45, color: o.roof, tiles: o.tiles, lift: o.lift });
        k.push(xf(r, [0, y, 0]));
        if (!last) { const u = r.userData; k.add(rbox(u.topW, 0.02, u.topD, 0.3), C.under, [0, y + u.topY - 0.012, 0]); y += u.topY - 0.01; w *= 0.74; d *= 0.74; }
      }
      const g = k.geo(); g.userData.top = y; return g;
    };
    // a courtyard house: plaster walls on a low base, a gable roof, the gable ends filled under the roof's curve
    const house = (w, d, h, o = {}) => {
      const k = kit(), wall = o.wall ?? C.plaster, ov = 0.035, rh = o.rh ?? d * 0.5;
      k.add(rbox(w + 0.02, 0.025, d + 0.02, 0.3), C.base, [0, 0.0125, 0]);
      k.add(rbox(w, h, d, 0.1), wall, [0, 0.025 + h / 2, 0]);
      k.add(rbox(0.05, h * 0.62, 0.012, 0.2), C.lattice, [o.door ?? 0, 0.025 + h * 0.31, d / 2 + 0.002]);
      for (const sx of [-0.3, 0.3]) if (w > 0.3) k.add(rbox(0.06, h * 0.3, 0.01, 0.2), C.dark, [sx * w, 0.025 + h * 0.55, d / 2 + 0.002]);
      // gable ends: a fan under the roof curve (b = the roof's half depth, the wall stands at d / 2)
      const b = d / 2 + ov, pts = [];
      for (let i = 0; i <= 8; i++) { const z = -d / 2 + (d * i) / 8, t = 1 - Math.abs(z) / b; pts.push([z, prof(t, rh) - 0.008]); }
      const v = [];
      for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) { const x = (sx * w) / 2 * 0.999, y0 = 0.025 + h, p = pts[i], q = pts[i + 1]; const tri = [[x, y0, 0], [x, y0 + p[1], p[0]], [x, y0 + q[1], q[0]]]; if (sx < 0) tri.reverse(); for (const t of tri) v.push(...t); }
      // the fan's base row from the wall top: close the gaps at both ends
      for (const sx of [-1, 1]) { const x = (sx * w) / 2 * 0.999, y0 = 0.025 + h, tri = [[x, y0, 0], [x, y0, -d / 2], [x, y0 + pts[0][1], pts[0][0]], [x, y0, 0], [x, y0 + pts[8][1], pts[8][0]], [x, y0, d / 2]]; if (sx < 0) { tri.reverse(); } for (const t of tri) v.push(...t); }
      k.push(paint(tris(v), wall));
      k.push(xf(roof(w + 0.08, d + 2 * ov, rh, { kind: 'gable', color: o.roof ?? C.roof, tiles: o.tiles ?? 0.06, nt: 4, under: 0x52321a, noUnder: true }), [0, 0.025 + h, 0]));
      return k.geo();
    };
    // a round Han granary on stilts, conical roof
    const granary = (r) => {
      const k = kit();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; k.add(cyl(0.012, 0.012, 0.05, 5), C.wood, [Math.cos(a) * r * 0.7, 0.025, Math.sin(a) * r * 0.7]); }
      k.add(cyl(r, r * 0.94, 0.15, 12), C.plaster2, [0, 0.125, 0]);
      k.add(lathe([[0, 0.2], [r * 0.9, 0.2], [r * 1.25, 0.18], [r * 1.25, 0.19], [r * 0.9, 0.24], [r * 0.2, 0.33], [0, 0.34]], 12), C.roof, [0, 0, 0]);
      return k.geo();
    };
    // trees: a lumpy crown or a stack of rounded cones on a trunk
    const treeGeo = (kind, seed = 1, lo = false) => {
      const k = kit(), rs = (n) => hash(seed, n, 3.1), dt = lo ? 0 : 1;
      if (kind === 'pine') {
        k.add(cyl(0.018, 0.026, 0.14, 5), C.trunk, [0, 0.07, 0]);
        for (let i = 0; i < 3; i++) k.add(lathe([[0, 0.06], [0.1 - i * 0.025, 0.05], [0.11 - i * 0.025, 0.07], [0, 0.2 - i * 0.02]], lo ? 6 : 8), shade(C.pine, i * 0.06), [0, 0.06 + i * 0.09, 0]);
      } else {
        k.add(cyl(0.02, 0.03, 0.2, 5), C.trunk, [0, 0.1, 0]);
        const c = C.leaf[Math.floor(rs(1) * C.leaf.length)];
        k.push(xf(paint(blob(0.13, seed, dt), c), [0, 0.29, 0]));
        k.push(xf(paint(blob(0.095, seed + 1, dt), shade(c, 0.08)), [0.07 * (rs(2) - 0.3), 0.36, 0.06 * (rs(3) - 0.5)]));
        k.push(xf(paint(blob(0.09, seed + 2, dt), shade(c, -0.08)), [-0.07, 0.25, -0.05 * rs(4)]));
      }
      return k.geo();
    };

    // ---------------------------------------------------------------- walls
    // rammed earth: a battered prism (wider at the foot), rounded top edges; runs along x, outside +z
    const wallPrism = (len, h, wb, wt) => {
      const sh = new T.Shape(), c = Math.min(0.025, wt * 0.2);
      sh.moveTo(-wb / 2, -0.3); sh.lineTo(wb / 2, -0.3); sh.lineTo(wt / 2, h - c); sh.quadraticCurveTo(wt / 2, h, wt / 2 - c, h); sh.lineTo(-wt / 2 + c, h); sh.quadraticCurveTo(-wt / 2, h, -wt / 2, h - c); sh.lineTo(-wb / 2, -0.3);
      return new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 2 }).rotateY(-Math.PI / 2).translate(len / 2, 0, 0);
    };
    const LV = (lv) => ({ H: [0.2, 0.3, 0.42, 0.52, 0.62][lv], wb: [0.18, 0.3, 0.36, 0.42, 0.48][lv], col: [C.wood, C.earth, C.earth, C.brick, C.stone][lv] });
    // one run of wall along x from x0 to x1 at z = zc, outside +z: walkway, crenellated parapet outside, low one inside
    const wallRun = (k, x0, x1, zc, lv) => {
      const { H, wb, col } = LV(lv), wt = wb * 0.6, len = x1 - x0, cx = (x0 + x1) / 2;
      if (lv === 0) { // a palisade of sharpened logs on a low bank
        k.add(rbox(len, 0.08, 0.26, 0.4), C.earth, [cx, 0.02, zc]);
        const n = Math.max(2, Math.round(len / 0.075));
        for (let i = 0; i < n; i++) { const x = x0 + ((i + 0.5) * len) / n, h = 0.22 + hash(x, zc, 1) * 0.06; k.add(cyl(0.03, 0.032, h, 6), shade(C.wood, (hash(x, 2, zc) - 0.5) * 0.2), [x, 0.06 + h / 2, zc]); k.add(cone(0.03, 0.05, 6), shade(C.wood, 0.1), [x, 0.06 + h + 0.025, zc]); }
        return;
      }
      k.add(wallPrism(len, H, wb, wt), col, [cx, 0, zc]);
      // the layers of rammed earth: faint darker courses on both faces, following the batter
      for (const f of [0.3, 0.62]) for (const sgn of [-1, 1]) { const y = H * f, zf = wb / 2 - ((wb - wt) / 2) * ((y + 0.3) / (H + 0.3)); k.add(rbox(len, 0.014, 0.012, 0), shade(col, -0.12), [cx, y, zc + sgn * (zf + 0.002)], [sgn * Math.atan2((wb - wt) / 2, H + 0.3), 0, 0]); }
      k.add(rbox(len, 0.012, wt * 0.8, 0.3), shade(col, 0.14), [cx, H + 0.004, zc]);
      if (lv >= 3) k.add(rbox(len, 0.07, wb + 0.05, 0.25), C.plinth, [cx, 0.025, zc]);
      const hp = 0.045, pc = shade(col, -0.05);
      k.add(rbox(len, hp, 0.04, 0.25), pc, [cx, H + hp / 2, zc + wt / 2 - 0.02]);
      const n = Math.max(1, Math.floor(len / 0.13));
      for (let i = 0; i < n; i++) k.add(rbox(0.065, 0.05, 0.045, 0), pc, [x0 + ((i + 0.5) * len) / n, H + hp + 0.024, zc + wt / 2 - 0.02]);
      k.add(rbox(len, 0.028, 0.028, 0.3), pc, [cx, H + 0.014, zc - wt / 2 + 0.014]);
    };
    // a gatehouse across the wall (x = 0, z = zc) with the passage and the gate tower on top
    const gate = (k, zc, lv, gw) => {
      const { H, wb, col } = LV(lv), gd = wb * 1.35;
      if (lv === 0) {
        for (const sx of [-1, 1]) { k.add(cyl(0.045, 0.05, 0.42, 7), C.wood, [sx * 0.16, 0.21, zc]); k.add(rbox(0.16, 0.02, 0.16, 0.3), C.wood, [sx * 0.16, 0.36, zc]); k.push(xf(roof(0.2, 0.2, 0.08, { color: C.thatch, tiles: 0, lift: 0.02 }), [sx * 0.16, 0.37, zc])); }
        k.add(rbox(0.42, 0.04, 0.05, 0.3), C.wood, [0, 0.33, zc]);
        return;
      }
      k.add(rbox(gw, H + 0.33, gd, 0.08), shade(col, -0.03), [0, (H + 0.03 - 0.3) / 2, zc]);
      // the passage: flat-topped under timber beams (Han gates have no brick arch), doors ajar inside
      const aw = 0.16, ah = H * 0.6;
      k.add(rbox(aw, ah, gd + 0.02, 0), C.dark, [0, ah / 2, zc]);
      for (const sz of [-1, 1]) { k.add(rbox(aw + 0.06, 0.035, 0.03, 0.3), C.wood, [0, ah + 0.017, zc + sz * (gd / 2 + 0.005)]); for (const sx of [-1, 1]) k.add(rbox(0.025, ah, 0.03, 0.3), C.wood, [sx * (aw / 2 + 0.005), ah / 2, zc + sz * (gd / 2 + 0.005)]); }
      for (const sx of [-1, 1]) k.add(rbox(0.012, ah * 0.9, aw * 0.5, 0.3), C.lattice, [sx * aw * 0.42, ah * 0.45, zc + gd / 2 - 0.03], [0, sx * 0.5, 0]);
      const hp = 0.045, n = Math.max(2, Math.floor(gw / 0.13));
      for (let i = 0; i < n; i++) k.add(rbox(0.065, 0.05, 0.045, 0), shade(col, -0.05), [-gw / 2 + ((i + 0.5) * gw) / n, H + 0.03 + hp / 2, zc + gd / 2 - 0.02]);
      const tw = gw * 0.78, td = gd * 0.72;
      const tower = lv === 1 ? pavilion({ w: tw * 0.8, d: td * 0.8, h: 0.13, rh: 0.1, roof: C.thatch, tiles: 0, wall: C.wood, cols: false, lift: 0.02 })
        : pavilion({ w: tw, d: td, h: 0.15, storeys: lv >= 3 ? 2 : 1, rh: 0.16 + lv * 0.01, base: 0.03, tiles: 0.045 });
      k.push(xf(tower, [0, H + 0.03, zc]));
    };
    // a khuyết (阙): the pair of towers before a gate; a governor has the mother-and-child kind (二出阙): a tall tower with a
    // lower one on its outer side, each with a small hip roof over a bracket band (after the Gao Yi que, AD 209)
    const que = () => {
      const k = kit();
      k.add(rbox(0.1, 0.03, 0.08, 0.3), C.base, [0, 0.015, 0]);
      k.add(rbox(0.07, 0.24, 0.055, 0.12), C.plaster, [0, 0.15, 0]); k.add(rbox(0.085, 0.025, 0.07, 0.3), C.bracket, [0, 0.28, 0]);
      k.push(xf(roof(0.12, 0.1, 0.05, { tiles: 0 }), [0, 0.292, 0]));
      k.add(rbox(0.05, 0.14, 0.04, 0.12), C.plaster, [0.06, 0.1, 0]); k.add(rbox(0.06, 0.02, 0.05, 0.3), C.bracket, [0.06, 0.18, 0]);
      k.push(xf(roof(0.08, 0.07, 0.035, { tiles: 0 }), [0.06, 0.19, 0]));
      return k.geo();
    };
    const cornerTower = (k, x, z, lv) => {
      const { H, wb, col } = LV(lv), cw = wb * 1.9;
      if (lv === 0) { // a watch platform on four posts
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.02, 0.022, 0.5, 5), C.wood, [x + a * 0.1, 0.25, z + b * 0.1]);
        k.add(rbox(0.28, 0.03, 0.28, 0.3), C.wood, [x, 0.5, z]); k.push(xf(roof(0.3, 0.3, 0.12, { color: C.thatch, tiles: 0, lift: 0.02 }), [x, 0.62, z]));
        return;
      }
      k.add(rbox(cw, H + 0.36, cw, 0.1), shade(col, -0.04), [x, (H + 0.06 - 0.3) / 2, z]);
      if (lv >= 3) k.add(rbox(cw + 0.05, 0.07, cw + 0.05, 0.25), C.plinth, [x, 0.025, z]);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i < 3; i++) { const u = (i - 1) * cw * 0.32; k.add(rbox(a ? 0.045 : 0.07, 0.05, a ? 0.07 : 0.045, 0), shade(col, -0.06), [x + a * (cw / 2 - 0.02) + (a ? 0 : u), H + 0.06 + 0.025, z + b * (cw / 2 - 0.02) + (b ? 0 : u)]); }
      if (lv >= 2) k.push(xf(pavilion({ w: cw * 0.62, d: cw * 0.62, h: 0.12, rh: 0.13, storeys: lv >= 4 ? 2 : 1, tiles: 0.045 }), [x, H + 0.06, z]));
    };

    // ---------------------------------------------------------------- the town: platform, walls by level (lũy 0–4), a Han city inside
    const townCache = {};
    HM.town = function (t) {
      const L = t.size || 4.6, lv = Math.max(0, Math.min(4, t.level ?? 1)), R = L / 2, key = L + ':' + lv + ':' + (t.seed || 1) + (t.open ? ':open' : '');
      if (!townCache[key]) townCache[key] = buildTown(L, lv, R, t.seed || 1, !!t.open);
      const c = townCache[key], g = new T.Group();
      const m = new T.Mesh(c.geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
      if (c.water) { const w = new T.Mesh(c.water, waterMat); w.receiveShadow = true; g.add(w); }
      g.userData = { L, H: LV(lv).H, flagAt: c.flagAt, shared: true };
      return g;
    };
    // open: the +z face without its wall and gate (a siege lays its own breachable runs there, HM.siegeWall)
    const buildTown = (L, lv, R, seed, open) => {
      const k = kit(), { H, wb } = LV(lv), moat = lv >= 3, pad = moat ? 0.95 : 0.6, gw = 0.6 + lv * 0.05;
      let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      // ground: the platform (deep enough for a slope), the ground inside, streets
      k.add(rbox(L + 2 * pad, 2.3, L + 2 * pad, 0.04), C.ground, [0, -1.12, 0]);
      k.add(rbox(L - wb * 0.3, 0.03, L - wb * 0.3, 0.3), C.yard, [0, 0.03, 0]);
      const inner = R - wb / 2 - 0.08;
      k.add(rbox(0.26, 0.012, 2 * inner, 0.3), C.road, [0, 0.05, 0.1]);
      k.add(rbox(2 * inner, 0.012, 0.26, 0.3), C.road, [0, 0.05, 0]);
      // walls: four sides, each two runs either side of its gate, corner towers
      const cw = lv === 0 ? 0.28 : wb * 1.9;
      for (let side = 0; side < 4; side++) {
        const w = kit(), bare = open && side === 0;
        if (!bare) { wallRun(w, -R + cw / 2 - 0.02, -gw / 2, R, lv); wallRun(w, gw / 2, R - cw / 2 + 0.02, R, lv); }
        if (lv >= 3 && !bare) for (const x of [-(R + gw / 2) / 2, (R + gw / 2) / 2]) { w.add(rbox(0.26, H + 0.3, 0.32, 0.1), shade(LV(lv).col, -0.04), [x, (H - 0.3) / 2, R + wb / 2 - 0.02]); for (let i = 0; i < 2; i++) w.add(rbox(0.07, 0.05, 0.045, 0), shade(LV(lv).col, -0.06), [x - 0.06 + i * 0.12, H + 0.025, R + wb / 2 + 0.115]); }
        if (!bare) gate(w, R, lv, gw);
        if (moat) { w.add(rbox(0.34, 0.03, 0.62, 0.3), C.wood, [0, 0.045, R + wb / 2 + 0.42]); }
        k.push(xf(w.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
      }
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cornerTower(k, sx * R, sz * R, lv);
      if (lv >= 2) for (const sx of [-1, 1]) k.push(xf(que(), [sx * (gw / 2 + 0.2), 0.03, R + wb / 2 + 0.1], [0, sx < 0 ? Math.PI : 0, 0])); // child tower on the outer side
      // the governor's compound, north of the centre, facing south down the main street
      const yz0 = -R + wb / 2 + 0.16, yz1 = -0.3, yx = 0.62, yc = (yz0 + yz1) / 2;
      k.add(rbox(2 * yx, 0.02, yz1 - yz0, 0.3), C.paving, [0, 0.055, yc]);
      for (const [x0, x1, z0, z1] of [[-yx, yx, yz0, yz0], [-yx, -yx, yz0, yz1], [yx, yx, yz0, yz1], [-yx, -0.16, yz1, yz1], [0.16, yx, yz1, yz1]]) {
        const lx = Math.max(0.035, x1 - x0), lz = Math.max(0.035, z1 - z0);
        k.add(rbox(lx, 0.1, lz, 0.2), 0x74170c, [(x0 + x1) / 2, 0.1, (z0 + z1) / 2]); k.add(rbox(lx + 0.02, 0.018, lz + 0.02, 0.3), C.roof, [(x0 + x1) / 2, 0.157, (z0 + z1) / 2]);
      }
      k.push(xf(pavilion({ w: 0.32, d: 0.14, h: 0.1, rh: 0.09, tiles: 0.04 }), [0, 0.05, yz1]));
      const hallZ = yc - 0.12, flagAt = [0, 0.06, yz1 - 0.2];
      k.push(xf(pavilion({ w: 0.78, d: 0.4, h: 0.17, rh: 0.2, base: 0.06, storeys: 1, tiles: 0.045 }), [0, 0.05, hallZ]));
      if (lv >= 2) k.push(xf(pavilion({ w: 0.5, d: 0.22, h: 0.13, rh: 0.12, tiles: 0.045 }), [0, 0.05, yz0 + 0.18]));
      for (const sx of [-1, 1]) k.push(xf(house(0.36, 0.16, 0.09, { wall: C.plaster2 }), [sx * (yx - 0.14), 0.05, yc + 0.02], [0, Math.PI / 2, 0]));
      // the watchtower at the crossroads (square, storeys shrinking, deep eaves), on a low rammed-earth base
      if (lv >= 1) {
        const tb = 0.36, th2 = 0.08;
        k.add(rbox(tb, th2, tb, 0.15), C.earth, [0, 0.05 + th2 / 2, 0]);
        k.push(xf(pavilion({ w: tb * 0.7, d: tb * 0.7, h: 0.12, rh: 0.1, storeys: lv >= 3 ? 4 : 3, ov: 0.08, tiles: 0.04 }), [0, 0.05 + th2, 0]));
      }
      // blocks: courtyard houses, the market, the granaries, trees
      const taken = [[-yx - 0.06, yx + 0.06, yz0 - 0.1, yz1 + 0.06], [-0.18, 0.18, -inner, inner], [-inner, inner, -0.18, 0.18]];
      const free = (x0, x1, z0, z1) => !taken.some(([a, b, c, d]) => x1 > a && x0 < b && z1 > c && z0 < d);
      const nCell = Math.max(1, Math.round((inner - 0.2) / 0.7)), cell = (inner - 0.2) / nCell, starts = [], trees = [];
      for (let i = 0; i < nCell; i++) starts.push(0.2 + i * cell, -0.2 - (i + 1) * cell);
      let market = false, granaries = false;
      for (const gx of starts) for (const gz of starts) {
        const x0 = gx + 0.03, x1 = gx + cell - 0.03, z0 = gz + 0.03, z1 = gz + cell - 0.03, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cwid = x1 - x0;
        if (!free(x0, x1, z0, z1)) continue;
        if (!market && cx > 0 && cz > 0) { // the market: a paved square with awnings
          market = true;
          k.add(rbox(cwid, 0.015, cwid, 0.3), C.paving, [cx, 0.052, cz]);
          const aw = [0x7a0e0b, 0x0d2952, 0xa4520b, 0x294611, 0x7a0e0b, 0x0d2952];
          for (let i = 0; i < 6; i++) { const x = cx + ((i % 3) - 1) * 0.16, z = cz + (Math.floor(i / 3) - 0.5) * 0.24; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.006, 0.006, 0.08, 4), C.wood, [x + a * 0.055, 0.1, z + b * 0.04]); k.add(rbox(0.13, 0.012, 0.1, 0.3), aw[i], [x, 0.145, z], [0.18, 0, 0]); k.add(rbox(0.08, 0.03, 0.05, 0.3), [C.straw, 0x411a0b, C.cream][i % 3], [x, 0.07, z]); }
          continue;
        }
        if (!granaries && cx > 0 && cz < 0) { granaries = true; for (let i = 0; i < 3; i++) k.push(xf(granary(0.085), [cx + (i - 1) * 0.17, 0.05, cz])); trees.push([cx, cz + 0.2]); continue; }
        // a courtyard compound: low wall with its gate to the south, a main house north, two wings, a yard
        const rich = rnd() < 0.25, wallC = rnd() < 0.3 ? C.plaster2 : C.plaster;
        k.add(rbox(cwid, 0.012, cwid, 0.3), C.yard, [cx, 0.052, cz]);
        for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0], [x0, x0, z0, z1], [x1, x1, z0, z1], [x0, cx - 0.05, z1, z1], [cx + 0.05, x1, z1, z1]]) {
          const lx = Math.max(0.025, a1 - a0), lz = Math.max(0.025, b1 - b0);
          k.add(rbox(lx, 0.06, lz, 0.25), wallC, [(a0 + a1) / 2, 0.08, (b0 + b1) / 2]); k.add(rbox(lx + 0.012, 0.012, lz + 0.012, 0.3), 0x525760, [(a0 + a1) / 2, 0.114, (b0 + b1) / 2]);
        }
        k.push(xf(house(cwid * 0.74, 0.17, 0.1 + rnd() * 0.03, { wall: wallC }), [cx, 0.05, z0 + 0.13]));
        if (rich) k.push(xf(pavilion({ w: 0.1, d: 0.1, h: 0.07, rh: 0.05, storeys: 3, ov: 0.04, wall: C.wood, cols: false, tiles: 0 }), [cx + cwid * 0.28, 0.05, cz + cwid * 0.2]));
        for (const sx of [-1, 1]) if (rnd() < 0.85) k.push(xf(house(cwid * 0.42, 0.13, 0.085, { wall: wallC }), [cx + sx * (cwid / 2 - 0.1), 0.05, cz + 0.06], [0, Math.PI / 2, 0]));
        if (rnd() < 0.55) trees.push([cx + (rnd() - 0.5) * 0.12, cz + 0.12]);
      }
      // trees inside (courtyards, the corners) and a few outside the walls
      for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) trees.push([sx * (inner - 0.12), sz * (inner - 0.12)]);
      for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, r = R + wb / 2 + (moat ? 0.6 : 0.28) + rnd() * 0.15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < gw || Math.abs(z) < gw) continue; trees.push([Math.max(-R - pad + 0.12, Math.min(R + pad - 0.12, x)), Math.max(-R - pad + 0.12, Math.min(R + pad - 0.12, z))]); }
      trees.forEach(([x, z], i) => k.push(xf(treeGeo(i % 5 === 4 ? 'pine' : 'leaf', seed + i), [x, 0.05, z], [0, rnd() * 6, 0], [0.9 + rnd() * 0.35, 0.9 + rnd() * 0.35, 0.9 + rnd() * 0.35])));
      // the moat: water in a ditch round the walls
      let water = null;
      if (moat) {
        const r0 = R + wb / 2 + 0.2, r1 = r0 + 0.32, parts = [];
        for (let side = 0; side < 4; side++) {
          const w = kit(); w.add(rbox(2 * r1, 0.02, r1 - r0, 0.3), 0xffffff, [0, 0.03, (r0 + r1) / 2]); parts.push(xf(w.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
          const b = kit(); b.add(rbox(2 * r1 + 0.06, 0.03, r1 - r0 + 0.06, 0.3), 0x271e11, [0, 0.019, (r0 + r1) / 2]); k.push(xf(b.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
        }
        water = BGU.mergeBufferGeometries(parts); water.deleteAttribute('color');
      }
      return { geo: k.geo(), water, flagAt };
    };

    // ---------------------------------------------------------------- people (≈ 0.64 tall, facing +x, feet at y = 0)
    const person = (k, fc, o = {}) => {
      const top = o.top ?? shade(fc, -0.18), y0 = o.y0 ?? 0;
      if (!o.seated) {
        for (const z of [-0.036, 0.036]) { k.seg([0, 0.04, z], [0, 0.15, z], 0.025, C.cloth); k.add(rbox(0.075, 0.035, 0.046, 0.35), C.boot, [0.012, 0.018, z]); }
        k.add(lathe([[0, 0.13], [0.09, 0.13], [0.083, 0.17], [0.07, 0.29], [0, 0.29]], 10), fc, [0, 0, 0], [0, 0, 0], [0.9, 1, 1.08]);
      }
      k.add(lathe([[0, 0.27], [0.07, 0.27], [0.077, 0.33], [0.073, 0.4], [0.052, 0.445], [0, 0.45]], 10), top, [0, y0, 0], [0, 0, 0], [0.86, 1, 1.2]);
      k.add(cyl(0.079, 0.079, 0.024, 10), C.leather, [0, y0 + 0.295, 0], [0, 0, 0], [0.88, 1, 1.22]);
      for (const z of [-1, 1]) k.add(sph(0.036, 8, 6), fc, [0, y0 + 0.415, z * 0.078]);
      k.add(sph(0.056, 12, 9), C.skin, [0.004, y0 + 0.505, 0]);
    };
    const arm = (k, fc, y0, side, hand) => { const sh = [0, y0 + 0.41, side * 0.08], e = sh.map((v, i) => v + (hand[i] - v) * 0.78); k.seg(sh, e, 0.023, fc); k.add(sph(0.027, 8, 6), C.skin, hand); };
    const helmet = (k, y0, hex, plume) => {
      k.add(lathe([[0, 0.498], [0.077, 0.494], [0.077, 0.5], [0.07, 0.506], [0.066, 0.524], [0.056, 0.556], [0.032, 0.58], [0, 0.585]], 10), hex, [0, y0, 0]);
      if (plume) k.add(cone(0.018, 0.06, 6), plume, [0, y0 + 0.615, 0]);
    };
    const geoFoot = (arm_, fid) => {
      const k = kit(), fc = COLOR[fid];
      person(k, fc, { top: arm_ === 'cung' ? shade(fc, 0.12) : undefined });
      if (arm_ === 'bo') { // spear and shield
        helmet(k, 0, C.iron, C.red);
        arm(k, fc, 0, 1, [0.06, 0.3, 0.09]);
        k.seg([0.055, 0.02, 0.09], [0.085, 1.0, 0.09], 0.008, C.wood, 0.008);
        k.add(cone(0.02, 0.08, 4), 0x959aa1, [0.086, 1.04, 0.09], [0, 0, 0], [1, 1, 0.45]); k.add(sph(0.018, 6, 4), C.red, [0.084, 0.965, 0.09]);
        arm(k, fc, 0, -1, [0.1, 0.32, -0.05]);
        k.add(cyl(0.1, 0.1, 0.022, 16), 0x0b0604, [0.125, 0.3, -0.045], [0, 0, Math.PI / 2], [1.3, 1, 1]);
        k.add(cyl(0.066, 0.066, 0.01, 16), fc, [0.139, 0.3, -0.045], [0, 0, Math.PI / 2], [1.3, 1, 1]); k.add(sph(0.022, 8, 6), C.brass, [0.145, 0.3, -0.045]);
      } else if (arm_ === 'cung') { // straw hat, bow, quiver
        k.add(lathe([[0, 0.55], [0.135, 0.525], [0.135, 0.535], [0.03, 0.61], [0, 0.625]], 12), C.straw, [0, 0, 0]);
        arm(k, fc, 0, -1, [0.18, 0.36, -0.1]);
        k.add(new T.TorusGeometry(0.19, 0.009, 4, 14, Math.PI * 0.86), C.wood, [0.0, 0.36, -0.1], [0, 0, -Math.PI * 0.43]);
        k.seg([0.035, 0.18, -0.1], [0.035, 0.54, -0.1], 0.003, C.cream, 0.003);
        arm(k, fc, 0, 1, [0.05, 0.36, 0.02]);
        k.seg([-0.09, 0.28, 0.03], [-0.05, 0.5, 0.03], 0.032, C.leather, 0.028); k.add(cone(0.03, 0.05, 6), C.cream, [-0.05, 0.53, 0.03], [0, 0, 0.18]);
      } else { // marines: scarf, halberd, round shield
        k.add(lathe([[0, 0.51], [0.066, 0.51], [0.063, 0.55], [0.04, 0.58], [0, 0.59]], 10), 0x07111d, [0, 0, 0]); k.seg([-0.06, 0.55, 0], [-0.1, 0.49, 0], 0.012, 0x07111d);
        arm(k, fc, 0, 1, [0.06, 0.3, 0.09]);
        k.seg([0.055, 0.02, 0.09], [0.08, 0.84, 0.09], 0.008, C.wood, 0.008); k.add(cone(0.018, 0.07, 4), 0x959aa1, [0.081, 0.87, 0.09], [0, 0, 0], [1, 1, 0.45]); k.add(rbox(0.07, 0.02, 0.008, 0.2), 0x959aa1, [0.11, 0.79, 0.09]);
        arm(k, fc, 0, -1, [0.1, 0.32, -0.05]);
        k.add(cyl(0.095, 0.095, 0.022, 16), 0x1a0d08, [0.13, 0.31, -0.05], [0, 0, Math.PI / 2]); k.add(cyl(0.06, 0.06, 0.01, 16), fc, [0.144, 0.31, -0.05], [0, 0, Math.PI / 2]); k.add(sph(0.024, 8, 6), C.brass, [0.15, 0.31, -0.05]);
      }
      return k.geo();
    };
    // a horse (≈ 0.55 long, back at 0.42), walking, facing +x; saddle cloth in the faction's colour
    const horse = (k, coat, cloth, o = {}) => {
      const hair = o.hair ?? shade(coat, -0.45);
      k.seg([-0.1, 0.34, 0], [0.1, 0.34, 0], 0.088, coat); k.add(sph(0.08, 10, 7), coat, [0.12, 0.34, 0]); k.add(sph(0.085, 10, 7), coat, [-0.11, 0.35, 0]);
      k.seg([0.13, 0.38, 0], [0.22, 0.53, 0], 0.045, coat); k.seg([0.225, 0.55, 0], [0.31, 0.46, 0], 0.034, coat); k.add(sph(0.03, 8, 6), shade(coat, -0.15), [0.315, 0.455, 0]);
      for (const z of [-0.018, 0.018]) k.add(cone(0.011, 0.04, 5), coat, [0.215, 0.6, z]);
      k.seg([0.1, 0.43, 0], [0.205, 0.585, 0], 0.017, hair);
      for (const [x0, x1, z] of [[0.12, 0.19, 0.045], [0.12, 0.08, -0.045], [-0.12, -0.06, 0.045], [-0.12, -0.18, -0.045]]) {
        k.seg([x0, 0.3, z], [x1, 0.045, z], 0.021, coat, 0.017); k.add(cyl(0.022, 0.026, 0.035, 7), 0x060403, [x1, 0.018, z]);
      }
      k.seg([-0.19, 0.38, 0], [-0.25, 0.2, 0], 0.022, hair);
      k.add(rbox(0.15, 0.035, 0.17, 0.4), C.leather, [0, 0.43, 0]);
      k.add(new T.CylinderGeometry(0.094, 0.1, 0.07, 14, 1, true), cloth, [0, 0.39, 0], [0, 0, 0], [1.05, 1, 1]);
      if (o.barding) { k.add(new T.CylinderGeometry(0.1, 0.118, 0.15, 16, 1, true), cloth, [0.0, 0.3, 0], [0, 0, 0], [2.0, 1, 1]); k.add(new T.TorusGeometry(0.118, 0.008, 4, 20), C.brass, [0, 0.226, 0], [Math.PI / 2, 0, 0], [2.0, 1, 1]); }
    };
    const rider = (k, fc, o = {}) => {
      const y0 = 0.17;
      for (const z of [-1, 1]) { k.seg([0, 0.45, z * 0.05], [0.06, 0.37, z * 0.095], 0.026, C.cloth); k.seg([0.06, 0.37, z * 0.095], [0.03, 0.27, z * 0.095], 0.022, C.cloth); k.add(rbox(0.06, 0.03, 0.04, 0.35), C.boot, [0.045, 0.255, z * 0.095]); }
      k.add(lathe([[0, 0.38], [0.085, 0.38], [0.08, 0.44], [0, 0.44]], 10), fc, [0, 0, 0], [0, 0, 0], [1, 1, 1.25]);
      person(k, fc, { seated: true, y0 });
      helmet(k, y0, o.helm ?? C.iron, o.plume ?? C.red);
      if (o.cape) k.add(new T.CylinderGeometry(0.075, 0.13, 0.26, 10, 1, true, Math.PI * 1.15, Math.PI * 0.7), o.cape, [-0.02, y0 + 0.3, 0]);
      return y0;
    };
    const geoRider = (fid) => {
      const k = kit(), fc = COLOR[fid];
      horse(k, 0x411a09, fc);
      const y0 = rider(k, fc);
      arm(k, fc, y0, 1, [0.08, y0 + 0.31, 0.1]); arm(k, fc, y0, -1, [0.12, y0 + 0.33, -0.03]);
      k.seg([-0.2, y0 + 0.22, 0.1], [0.62, y0 + 0.52, 0.1], 0.008, C.wood, 0.008); k.add(cone(0.02, 0.08, 4), 0x959aa1, [0.66, y0 + 0.54, 0.1], [0, 0, -1.2], [1, 1, 0.45]);
      k.add(rbox(0.1, 0.05, 0.004, 0.2), fc, [0.55, y0 + 0.44, 0.1], [0, 0, 0.35]);
      return k.geo();
    };
    const geoGeneral = (fid) => {
      const k = kit(), fc = COLOR[fid];
      horse(k, 0xd2c6af, fc, { hair: 0x7d7361, barding: true });
      const y0 = rider(k, fc, { helm: C.brass, plume: C.red, cape: shade(fc, -0.1) });
      arm(k, fc, y0, 1, [0.08, y0 + 0.32, 0.1]); arm(k, fc, y0, -1, [0.12, y0 + 0.33, -0.03]);
      k.seg([0.08, y0 + 0.02, 0.1], [0.08, y0 + 0.95, 0.1], 0.009, C.dark, 0.009);
      k.add(rbox(0.09, 0.05, 0.01, 0.2), 0x959aa1, [0.12, y0 + 0.9, 0.1], [0, 0, 0.1]); k.add(cone(0.02, 0.09, 4), 0x959aa1, [0.08, y0 + 1.0, 0.1], [0, 0, 0], [1, 1, 0.45]); k.add(sph(0.02, 6, 4), C.red, [0.08, y0 + 0.92, 0.1]);
      return xf(k.geo(), [0, 0, 0], [0, 0, 0], [1.3, 1.3, 1.3]);
    };
    // a war junk (lóu chuán): curved hull, shields along the rails, a two-storey castle, a batten sail
    const geoShip = (fid) => {
      const k = kit(), fc = COLOR[fid], N = 18, Mn = 8, pos = [], col = [], idx = [];
      const hullC = lin(0x1d0d05), railC = lin(0x3d1e0c);
      const at = (i, j) => {
        const s = i / N, x = -0.78 + 1.66 * s, e = Math.abs(2 * s - 1), w = 0.23 * Math.pow(Math.max(0, 1 - Math.pow(e, s > 0.5 ? 2.2 : 3.2)), 0.55) + 0.02;
        const yt = 0.2 + 0.14 * Math.pow(e, 4) * (s > 0.5 ? 1.25 : 0.9), yb = 0.03 + 0.1 * Math.pow(e, 3), f = j / Mn * Math.PI;
        return [x, yt - (yt - yb) * Math.pow(Math.sin(f), 0.75), -w * Math.cos(f)];
      };
      for (let i = 0; i <= N; i++) for (let j = 0; j <= Mn; j++) { pos.push(...at(i, j)); const c = j === 0 || j === Mn ? railC : hullC; col.push(c.r, c.g, c.b); }
      for (let i = 0; i < N; i++) for (let j = 0; j < Mn; j++) { const q = i * (Mn + 1) + j; idx.push(q, q + 1, q + Mn + 1, q + 1, q + Mn + 2, q + Mn + 1); }
      let hull = new T.BufferGeometry(); hull.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); hull.setAttribute('color', new T.Float32BufferAttribute(col, 3)); hull.setIndex(idx); hull.computeVertexNormals();
      if (hull.attributes.normal.getY(Math.floor(N / 2) * (Mn + 1) + Mn / 2) > 0) { for (let q = 0; q < idx.length; q += 3) { const t0 = idx[q]; idx[q] = idx[q + 1]; idx[q + 1] = t0; } hull.setIndex(idx); hull.computeVertexNormals(); }
      k.push(hull.toNonIndexed());
      // deck, following the hull's width
      const dv = [];
      for (let i = 0; i < N; i++) { const a = at(i, 0), b = at(i + 1, 0), a2 = at(i, Mn), b2 = at(i + 1, Mn), y = 0.19; dv.push(a[0], y, a[2], a2[0], y, a2[2], b[0], y, b[2], b[0], y, b[2], a2[0], y, a2[2], b2[0], y, b2[2]); }
      const deck = paint(tris(dv), 0x5c3416); if (deck.attributes.normal.getY(0) < 0) { const a2 = deck.attributes.position.array; for (let i = 0; i < a2.length; i += 9) for (let c = 0; c < 3; c++) { const t0 = a2[i + 3 + c]; a2[i + 3 + c] = a2[i + 6 + c]; a2[i + 6 + c] = t0; } deck.computeVertexNormals(); } k.push(deck);
      for (let i = 3; i <= 14; i += 2) { const p = at(i, 0), q = at(i, Mn); k.add(rbox(0.012, 0.07, 0.08, 0.3), i % 4 === 1 ? shade(fc, -0.25) : fc, [p[0], p[1] + 0.02, p[2] - 0.01]); k.add(rbox(0.012, 0.07, 0.08, 0.3), i % 4 === 1 ? shade(fc, -0.25) : fc, [q[0], q[1] + 0.02, q[2] + 0.01]); }
      k.add(rbox(0.46, 0.15, 0.3, 0.12), 0x411a0b, [-0.2, 0.265, 0]); k.add(rbox(0.5, 0.02, 0.34, 0.3), C.bracket, [-0.2, 0.35, 0]);
      k.add(rbox(0.3, 0.11, 0.22, 0.12), 0x52250f, [-0.24, 0.415, 0]);
      k.push(xf(roof(0.42, 0.32, 0.11, { tiles: 0.04, color: C.roof }), [-0.24, 0.47, 0]));
      for (let i = 0; i < 5; i++) for (const z of [-1, 1]) { const p = at(5 + i * 2, z < 0 ? 0 : Mn); k.seg([p[0], p[1] - 0.02, p[2]], [p[0] - 0.06, 0.0, p[2] + z * 0.2], 0.007, C.wood, 0.007); }
      k.seg([0.3, 0.19, 0], [0.3, 1.25, 0], 0.016, C.wood, 0.012);
      // the sail: slightly bellied, battens across
      const sv = [], sw = 0.62, sh0 = 0.42, sh1 = 1.18;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
        const P = (a, b) => { const y = sh0 + (sh1 - sh0) * (a / 6), wz = sw * (0.8 + 0.2 * (a / 6)) * (b / 4 - 0.5), bulge = 0.05 * Math.sin((b / 4) * Math.PI); return [0.02 + bulge, y, wz + sw * 0.25]; };
        const p = [P(i, j), P(i, j + 1), P(i + 1, j), P(i + 1, j + 1)]; sv.push(...p[0], ...p[2], ...p[1], ...p[1], ...p[2], ...p[3]);
      }
      const sail = tris(sv), sail2 = sail.clone(); { const a2 = sail2.attributes.position.array; for (let i = 0; i < a2.length; i += 9) for (let c = 0; c < 3; c++) { const t0 = a2[i + 3 + c]; a2[i + 3 + c] = a2[i + 6 + c]; a2[i + 6 + c] = t0; } sail2.computeVertexNormals(); }
      const sk = kit(), sc = mix(fc, C.cream, 0.18); sk.push(paint(sail, sc)); sk.push(paint(sail2, sc));
      for (let i = 0; i <= 6; i++) { const y = sh0 + (sh1 - sh0) * (i / 6), wz = sw * (0.8 + 0.2 * (i / 6)); sk.add(rbox(0.018, 0.016, wz + 0.04, 0.3), C.dark, [0.025, y, 0]); }
      k.push(xf(sk.geo(), [0.3, 0, 0], [0, 0.75, 0]));
      k.seg([0.82, 0.3, 0], [0.98, 0.42, 0], 0.012, C.wood, 0.01);
      return k.geo();
    };

    // ---------------------------------------------------------------- the general's banner: a tall flag with one character
    const bannerTex = {};
    const banner = (fid, ch) => {
      const key = fid + ch;
      if (!bannerTex[key]) {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
        const css = (hex) => '#' + new T.Color(hex).getHexString();
        g.fillStyle = css(COLOR[fid]); g.fillRect(0, 0, 128, 256);
        g.fillStyle = css(shade(COLOR[fid], -0.35)); g.fillRect(0, 0, 128, 18); g.fillRect(0, 238, 128, 18);
        g.fillStyle = css(C.brass); g.fillRect(0, 18, 128, 4); g.fillRect(0, 234, 128, 4);
        g.fillStyle = '#f6eedb'; g.beginPath(); g.arc(64, 118, 50, 0, 7); g.fill();
        g.fillStyle = css(COLOR[fid]); g.font = 'bold 66px "Noto Serif TC","Noto Serif CJK TC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 122);
        const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
        bannerTex[key] = look(new T.MeshStandardMaterial({ map: t, side: T.DoubleSide, roughness: 0.85 }));
      }
      // the pivot sits at the pole's top and turns to the camera; the cloth hangs beside it, a little rippled
      const piv = new T.Group(); piv.userData.flag = true;
      const pg = new T.PlaneGeometry(0.5, 1.0, 6, 1), p = pg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.25) * 12) * 0.025); pg.computeVertexNormals();
      const m = new T.Mesh(pg, bannerTex[key]); m.position.set(0.25, -0.5, 0); m.castShadow = true; piv.add(m);
      return piv;
    };

    // ---------------------------------------------------------------- an army: figures by arm round the general, on a soft base in the faction's colour
    const cache = {};
    const cached = (key, make) => cache[key] || (cache[key] = make());
    const decal = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(cv); })();
    const baseMat = {};
    const base = (fid, r) => {
      const g = new T.Group();
      if (!baseMat[fid]) baseMat[fid] = [new T.MeshBasicMaterial({ color: lin(COLOR[fid]), map: decal, transparent: true, depthWrite: false }), new T.MeshBasicMaterial({ color: lin(shade(COLOR[fid], 0.15)), transparent: true, opacity: 0.9, depthWrite: false })];
      const d = new T.Mesh(new T.CircleGeometry(r * 1.12, 40).rotateX(-Math.PI / 2), baseMat[fid][0]); d.position.y = 0.03; d.renderOrder = 4; g.add(d);
      const ring = new T.Mesh(new T.RingGeometry(r * 0.95, r, 64).rotateX(-Math.PI / 2), baseMat[fid][1]); ring.position.y = 0.035; ring.renderOrder = 4; g.add(ring);
      return g;
    };
    const place = (geo, pts) => { const m = new T.InstancedMesh(geo, mat, pts.length), m4 = new T.Matrix4(); pts.forEach((p, i) => m.setMatrixAt(i, m4.makeRotationY(p[3] || 0).setPosition(p[0], 0, p[2]))); m.castShadow = true; m.frustumCulled = false; return m; };
    const jit = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1) * 0.04;
    HM.count = (n, per, max) => (n > 0 ? Math.max(1, Math.min(max, Math.round(n / per))) : 0);
    HM.figure = (arm_, fid) => cached(arm_ + ':' + fid, () => (arm_ === 'ky' ? geoRider(fid) : arm_ === 'thuy' ? geoShip(fid) : arm_ === 'thuy-foot' ? geoFoot('thuy', fid) : geoFoot(arm_, fid)));
    const gen = (fid) => cached('g:' + fid, () => geoGeneral(fid));
    HM.army = function (a) {
      const g = new T.Group(), fid = a.fid, parts = {};
      if (a.fleet) {
        const n = HM.count(a.thuy, 600, 4) || 1;
        const ships = []; for (let k = 0; k < n; k++) ships.push([-(k % 2) * 1.3 - Math.floor(k / 2) * 0.4, 0, (k % 2 ? 0.55 : -0.55) * (k ? 1 : 0), 0]);
        g.add((parts.thuy = place(HM.figure('thuy', fid), ships)));
        const f = banner(fid, a.seal); f.position.set(0.3, 1.6, 0); f.scale.setScalar(0.85); g.add(f); parts.flag = f;
        g.add(base(fid, 1.45));
        return Object.assign(g, { userData: { parts, r: 1.45 } });
      }
      // the general in front, spearmen behind, archers at the back, horsemen on the right flank
      g.add(place(gen(fid), [[0.75, 0, 0, 0]]));
      const f = banner(fid, a.seal); f.position.set(0.86, 1.62, 0.13); g.add(f); parts.flag = f;
      const nb = HM.count(a.bo, 600, 9), nc = HM.count(a.cung, 400, 4), nk = HM.count(a.ky, 450, 6), nt = HM.count(a.thuy, 600, 3);
      const grid = (n, x0, cols, dx, dz, z0 = 0) => Array.from({ length: n }, (_, k) => [x0 - Math.floor(k / cols) * dx + jit(k), 0, z0 + ((k % cols) - (Math.min(cols, n) - 1) / 2) * dz + jit(k + 7), 0]);
      if (nb) g.add((parts.bo = place(HM.figure('bo', fid), grid(nb, 0.1, 3, 0.34, 0.34, -0.25))));
      if (nt) g.add((parts.thuy = place(HM.figure('thuy-foot', fid), grid(nt, -0.1 - Math.ceil(nb / 3) * 0.34, 3, 0.34, 0.34, -0.25))));
      if (nc) g.add((parts.cung = place(HM.figure('cung', fid), grid(nc, -0.2 - Math.ceil((nb + nt) / 3) * 0.34, 4, 0.34, 0.3, -0.25))));
      if (nk) g.add((parts.ky = place(HM.figure('ky', fid), grid(nk, 0.3, 2, 0.6, 0.4, 0.95))));
      const r = 1.2 + 0.18 * Math.ceil((nb + nt + nc) / 3);
      const b = base(fid, r); b.position.x = -0.35; g.add(b);
      return Object.assign(g, { userData: { parts, r } });
    };
    // a village: three or four farmhouses round a yard, thatch or tile, a haystack, a tree (≈ 1.1 across)
    HM.hamlet = (seed) => cached('hamlet:' + seed, () => {
      const k = kit(); let sd = seed * 7919 + 13; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const n = 3 + Math.floor(rnd() * 2), spots = [[0, -0.28, 0], [-0.3, 0.05, Math.PI / 2], [0.3, 0.06, Math.PI / 2], [0.02, 0.34, 0]];
      k.add(rbox(1.0, 0.02, 0.9, 0.3), C.yard, [0, 0.0, 0.02]);
      for (let i = 0; i < n; i++) { const [x, z, ry] = spots[i], thatch = rnd() < 0.55; k.push(xf(house(0.34 + rnd() * 0.1, 0.17, 0.1, { wall: rnd() < 0.5 ? C.plaster : C.plaster2, roof: thatch ? C.thatch : C.roof, tiles: thatch ? 0 : 0.06 }), [x, 0.01, z], [0, ry, 0])); }
      k.add(lathe([[0, 0.0], [0.08, 0.0], [0.085, 0.06], [0.05, 0.13], [0, 0.16]], 8), C.straw, [0.02 + (rnd() - 0.5) * 0.2, 0.01, 0.05]);
      k.push(xf(treeGeo('leaf', seed, true), [0.42, 0.01, -0.36]));
      return k.geo();
    });
    HM.mat = mat;
    HM.look = look;
    // the kit itself, for the design prototypes (docs/design/prototypes/siege) that build at other scales
    HM.parts = { kit, xf, paint, shade, mix, rbox, cyl, sph, lathe, cone, blob, tris, roof, pavilion, house, granary, que, treeGeo, wallPrism, C, env };
    HM.banner = banner;
    HM.tree = (kind, seed, lo) => cached('tree:' + kind + ':' + (seed || 1) + (lo ? ':lo' : ''), () => treeGeo(kind, seed || 1, lo));
    // a siege: a run of wall across one lane (along x, outside +z) and a tower between lanes
    HM.siegeWall = (len, lv = 3, withGate = false) => cached('sw:' + len + ':' + lv + withGate, () => {
      const k = kit();
      if (!withGate) wallRun(k, -len / 2, len / 2, 0, lv);
      else { const gw = 0.6 + lv * 0.05; wallRun(k, -len / 2, -gw / 2, 0, lv); wallRun(k, gw / 2, len / 2, 0, lv); gate(k, 0, lv, gw); }
      return k.geo();
    });
    HM.siegeTower = (lv = 3) => cached('st:' + lv, () => { const k = kit(); cornerTower(k, 0, 0, lv); return k.geo(); });
    return HM;
  };
})();
