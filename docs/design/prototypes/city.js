// High-detail procedural Chinese walled city for the design prototypes (three r146, global THREE).
// Needs kit.js (K.r / K.rr seeded random) and BufferGeometryUtils.
(function () {
  const CK = (window.CityKit = {});
  const BGU = THREE.BufferGeometryUtils;
  const r = () => K.r();
  const rr = (a, b) => K.rr(a, b);

  // ------------------------------------------------------------ textures
  function pixels(size, fn) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const hgt = new Float32Array(size * size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const [cr, cg, cb, h] = fn(x, y);
        const i = (y * size + x) * 4;
        img.data[i] = cr;
        img.data[i + 1] = cg;
        img.data[i + 2] = cb;
        img.data[i + 3] = 255;
        hgt[y * size + x] = h;
      }
    g.putImageData(img, 0, 0);
    return { canvas: c, hgt, size };
  }
  function toTex(canvas, srgb) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function normalMap({ hgt, size }, strength) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const H = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
        const l = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
        img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
        img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    return toTex(c, false);
  }
  const hsh = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const grain = (x, y, s) => hsh(Math.floor(x / s), Math.floor(y / s));

  // Pan-and-cover roof tiles: 16 tile columns across, courses down the slope.
  function tileTex(base) {
    const cols = 16, course = 22;
    return pixels(512, (x, y) => {
      const cw = 512 / cols, col = Math.floor(x / cw), fx = (x % cw) / cw;
      const cover = Math.cos((fx - 0.5) * Math.PI) ** 0.7; // rounded cover tile
      const cy = y % course, courseId = Math.floor(y / course);
      const lip = cy < 3 ? 0.55 : 1 - (cy / course) * 0.12;
      const v = hsh(col, courseId) * 0.18 - 0.09 + (grain(x, y, 3) - 0.5) * 0.06;
      const shade = (0.62 + 0.38 * cover) * lip + v;
      const moss = grain(x, y, 17) > 0.93 ? 0.12 : 0;
      return [base[0] * shade + moss * 40, base[1] * shade + moss * 55, base[2] * shade + moss * 25, cover * 0.8 + (cy < 3 ? -0.25 : 0)];
    });
  }
  const tilesGray = tileTex([66, 70, 77]), tilesGold = tileTex([196, 150, 52]), tilesGreen = tileTex([62, 104, 80]);
  const brick = pixels(512, (x, y) => {
    const bh = 20, bw = 56, row = Math.floor(y / bh), off = (row % 2) * bw / 2;
    const bx = Math.floor((x + off) / bw), mortar = y % bh < 3 || (x + off) % bw < 3;
    const t = hsh(bx, row) * 0.22 - 0.11 + (grain(x, y, 2) - 0.5) * 0.08 + (grain(x, y, 40) - 0.5) * 0.1;
    const streak = (grain(x, 0, 9) - 0.5) * 0.18 * (y / 512);
    const c = mortar ? [128, 122, 110] : [112 * (1 + t - streak), 104 * (1 + t - streak), 92 * (1 + t - streak)];
    return [...c, mortar ? 0 : 1];
  });
  const plaster = pixels(256, (x, y) => { const n = (grain(x, y, 2) - 0.5) * 0.05 + (grain(x, y, 24) - 0.5) * 0.07; return [226 * (1 + n), 219 * (1 + n), 204 * (1 + n), 0]; });
  const paving = pixels(512, (x, y) => {
    const s = 48, row = Math.floor(y / s), off = hsh(row, 7) * s, cx = Math.floor((x + off) / (s * (0.9 + hsh(row, 3) * 0.6)));
    const edge = y % s < 2 || (x + off) % Math.floor(s * (0.9 + hsh(row, 3) * 0.6)) < 2;
    const t = hsh(cx, row) * 0.2 - 0.1 + (grain(x, y, 3) - 0.5) * 0.06;
    return edge ? [98, 94, 86, 0] : [150 * (1 + t), 146 * (1 + t), 136 * (1 + t), 1];
  });
  const earth = pixels(256, (x, y) => { const n = (grain(x, y, 2) - 0.5) * 0.1 + (grain(x, y, 20) - 0.5) * 0.16 + (grain(x, y, 60) - 0.5) * 0.1; return [132 * (1 + n), 116 * (1 + n), 88 * (1 + n), 0]; });
  const lattice = pixels(128, (x, y) => {
    const frame = x < 6 || x > 121 || y < 6 || y > 121, bar = x % 16 < 3 || y % 16 < 3;
    return frame ? [70, 34, 26, 1] : bar ? [92, 44, 30, 0.8] : [34, 22, 18, 0];
  });

  // ------------------------------------------------------------ materials
  function triplanar(img, scale, o = {}) {
    const tex = toTex(img.canvas, false);
    const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, roughness: o.rough ?? 0.92, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.tTri = { value: tex };
      sh.uniforms.triScale = { value: scale };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN; varying float vTriG;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            mat4 triM = modelMatrix * instanceMatrix;
          #else
            mat4 triM = modelMatrix;
          #endif
          vTriP = (triM * vec4(transformed, 1.0)).xyz; vTriN = normalize(mat3(triM) * objectNormal); vTriG = triM[3].y;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTriP; varying vec3 vTriN; varying float vTriG; uniform sampler2D tTri; uniform float triScale;')
        .replace('#include <map_fragment>', `
          vec3 bw = pow(abs(normalize(vTriN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec3 tc = texture2D(tTri, vTriP.zy * triScale).rgb * bw.x + texture2D(tTri, vTriP.xz * triScale).rgb * bw.y + texture2D(tTri, vTriP.xy * triScale).rgb * bw.z;
          diffuseColor.rgb *= pow(tc, vec3(2.2));
          diffuseColor.rgb *= mix(0.45, 1.0, smoothstep(vTriG, vTriG + 0.45, vTriP.y)); // grime at the foot of each object`);
    };
    const key = 'tri' + (triplanar.n = (triplanar.n || 0) + 1);
    m.customProgramCacheKey = () => key;
    return m;
  }
  CK.ground = 1.2;
  CK.tex = { pixels, toTex, normalMap, grain, triplanar }; // shared with hancity.js
  const roofMat = (img, rough = 0.62) => new THREE.MeshStandardMaterial({ map: toTex(img.canvas, true), normalMap: normalMap(img, 3), normalScale: new THREE.Vector2(1.2, 1.2), roughness: rough, side: THREE.DoubleSide });
  const M = (CK.mats = {
    roof: roofMat(tilesGray),
    roofGold: roofMat(tilesGold, 0.38),
    roofGreen: roofMat(tilesGreen, 0.45),
    ridge: new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 }),
    ridgeGold: new THREE.MeshStandardMaterial({ color: 0x9b7322, roughness: 0.4 }),
    brick: triplanar(brick, 0.9),
    plaster: triplanar(plaster, 1.3),
    paving: triplanar(paving, 0.7),
    earth: triplanar(earth, 0.35),
    stone: triplanar(paving, 1.6, { color: 0xd9d4ca }),
    red: new THREE.MeshStandardMaterial({ color: 0x7c2419, roughness: 0.5 }),
    redWall: triplanar(plaster, 1.3, { color: 0xb34a36 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a2e20, roughness: 0.75 }),
    lattice: new THREE.MeshStandardMaterial({ map: toTex(lattice.canvas, true), roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2a4f52, roughness: 0.15, metalness: 0.1 }),
    cloth: [0xb8452f, 0xd6b25a, 0x3f6f8f, 0x6f8f3f, 0xe8e0cc].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, side: THREE.DoubleSide })),
    lantern: new THREE.MeshStandardMaterial({ color: 0xd8432e, emissive: 0x8a1c0c, emissiveIntensity: 1.2, roughness: 0.6 }),
  });

  // ------------------------------------------------------------ geometry collection
  // A Bag collects geometries per material key; bake() merges them into meshes (or into one grouped geometry for instancing).
  class Bag {
    constructor() { this.parts = {}; }
    add(key, geo, matrix) {
      let g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (matrix) g = g.clone().applyMatrix4(matrix);
      (this.parts[key] = this.parts[key] || []).push(g);
      return this;
    }
    at(key, geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));
      return this.add(key, geo, m);
    }
    merge(other, matrix) { for (const [k, list] of Object.entries(other.parts)) for (const g of list) this.add(k, g, matrix); return this; }
    meshes(parent) {
      for (const [k, list] of Object.entries(this.parts)) {
        const mesh = new THREE.Mesh(BGU.mergeBufferGeometries(list), M[k]);
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
      }
    }
    grouped() {
      const keys = Object.keys(this.parts);
      const geo = BGU.mergeBufferGeometries(keys.map((k) => BGU.mergeBufferGeometries(this.parts[k])), true);
      return { geo, mats: keys.map((k) => M[k]) };
    }
  }
  CK.Bag = Bag;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);

  // ------------------------------------------------------------ detail level
  // 'full' for the city the camera is looking at, 'lite' for every other city on the map (docs/decisions/0005).
  // Lite keeps the silhouette (walls, gate towers, palace, packed roofs) at ~1/8 of the triangles.
  const DETAIL = { full: { nu: 10, ns: 7, tubes: true, columns: true }, lite: { nu: 3, ns: 2, tubes: false, columns: false } };
  let DET = DETAIL.full;
  CK.setDetail = (lod) => { DET = DETAIL[lod] || DETAIL.full; };

  // ------------------------------------------------------------ curved roof
  // Hip roof with concave slopes and upturned corners. Ridge runs along the longer side.
  function hipRoof(w, d, h, o = {}) {
    const ov = o.overhang ?? Math.min(w, d) * 0.28;
    let W = w + ov * 2, D = d + ov * 2;
    const swap = D > W;
    if (swap) [W, D] = [D, W];
    const hw = W / 2, hd = D / 2, lr = hw - hd;
    const p = o.power ?? 1.75, lift = o.lift ?? h * 0.22, sMax = o.sMax ?? 1;
    const Y = (x, z, s) => h * Math.pow(s, p) + lift * Math.pow(Math.min(1, Math.abs(x) / hw) * Math.min(1, Math.abs(z) / hd), 2.4) * Math.pow(1 - s, 1.5);
    const tile = o.tile ?? 1.05, slope = Math.hypot(hd, h);
    const faces = [
      (u, s) => [lerp(-hw + s * hd, hw - s * hd, u), hd * (1 - s)],
      (u, s) => [lerp(-hw + s * hd, hw - s * hd, u), -hd * (1 - s)],
      (u, s) => [hw - s * hd, lerp(-hd * (1 - s), hd * (1 - s), u)],
      (u, s) => [-hw + s * hd, lerp(-hd * (1 - s), hd * (1 - s), u)],
    ];
    const geos = [];
    const nu = o.segU ?? DET.nu, ns = o.segS ?? DET.ns;
    faces.forEach((f, fi) => {
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= ns; j++)
        for (let i = 0; i <= nu; i++) {
          const s = (j / ns) * sMax, u = i / nu;
          const [x, z] = f(u, s);
          pos.push(x, Y(x, z, s), z);
          uv.push((fi < 2 ? x : z) * tile, s * slope * tile);
        }
      for (let j = 0; j < ns; j++)
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1;
          idx.push(a, b, c, b, e, c);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      if (g.attributes.normal.getY(0) < 0 || g.attributes.normal.getY(Math.floor(pos.length / 6)) < 0) { idx.reverse(); g.setIndex(idx); g.computeVertexNormals(); }
      geos.push(g);
    });
    const bag = new Bag();
    geos.forEach((g) => bag.add(o.mat || 'roof', g));
    const rk = o.ridgeMat || 'ridge';
    const rt = Math.max(0.025, h * 0.07);
    // eave thickness: a thin fascia under every eave edge
    faces.forEach((f) => {
      const pos = [], idx = [];
      for (let i = 0; i <= nu; i++) { const [x, z] = f(i / nu, 0); const y = Y(x, z, 0); pos.push(x, y, z, x * 0.985, y - rt * 1.4, z * 0.985); }
      for (let i = 0; i < nu; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      bag.add('wood', g);
    });
    if (sMax >= 1) {
      // main ridge with end ornaments (lite: ridge only)
      bag.at(rk, box(Math.max(0.05, lr * 2 + rt * 2), rt * 2.2, rt * 1.6), 0, h + rt * 0.6, 0);
      for (const sx of [-1, 1]) bag.at(rk, box(rt * 1.4, rt * 4, rt * 1.6), sx * (lr + rt * 0.6), h + rt * 2, 0, 0);
      // hip ridges down to the corners
      if (DET.tubes) for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const pts = [];
          for (let k = 0; k <= 8; k++) { const s = 1 - k / 8; const x = sx * (hw - s * hd), z = sz * hd * (1 - s); pts.push(new THREE.Vector3(x, Y(x, z, s) + rt * 0.5, z)); }
          bag.add(rk, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, rt * 0.75, 5, false));
          const tip = pts[pts.length - 1];
          bag.at(rk, cyl(0.001, rt * 0.9, rt * 5, 5), tip.x, tip.y + rt * 1.2, tip.z);
        }
    }
    if (swap) for (const list of Object.values(bag.parts)) list.forEach((g) => g.rotateY(Math.PI / 2));
    bag.topY = h;
    bag.sagY = Y(0, 0, sMax);
    return bag;
  }
  CK.hipRoof = hipRoof;
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ------------------------------------------------------------ buildings
  // A timber hall: stone plinth, red columns, lattice facade, plaster sides, curved roof. Front faces +z.
  function hall(w, d, h, o = {}) {
    const bag = new Bag();
    const base = o.base ?? 0.12;
    bag.at('stone', box(w + 0.18, base, d + 0.18), 0, base / 2, 0);
    bag.at('plaster', box(w * 0.94, h, d * 0.9), 0, base + h / 2, 0);
    // facade: lattice panels between columns on the front, plus back door
    const ncol = Math.max(2, Math.round(w / 0.32));
    for (let i = 0; i <= ncol && DET.columns; i++) {
      const x = -w / 2 + (i * w) / ncol;
      for (const z of [d / 2, -d / 2]) bag.at('red', cyl(0.028, 0.032, h, 6), x * 0.97, base + h / 2, z * 0.97);
      if (i < ncol && o.facade !== false) bag.at('lattice', box(w / ncol - 0.06, h * 0.72, 0.012), x + w / ncol / 2, base + h * 0.44, d * 0.455);
    }
    bag.at('red', box(w * 0.96, 0.05, d * 0.92), 0, base + h - 0.04, 0);
    // bracket band under the eaves
    bag.at('wood', box(w + 0.06, 0.06, d + 0.06), 0, base + h + 0.02, 0);
    let top = base + h + 0.04;
    if (o.double) {
      const skirt = hipRoof(w + 0.1, d + 0.1, h * 0.9, { overhang: Math.min(w, d) * 0.3, sMax: 0.42, mat: o.roofMat, ridgeMat: o.ridgeMat });
      bag.merge(skirt, new THREE.Matrix4().makeTranslation(0, top, 0));
      const uh = h * 0.55;
      bag.at('plaster', box(w * 0.78, uh, d * 0.7), 0, top + skirt.sagY * 0.6 + uh / 2, 0);
      bag.at('wood', box(w * 0.82, 0.05, d * 0.74), 0, top + skirt.sagY * 0.6 + uh, 0);
      top += skirt.sagY * 0.6 + uh + 0.02;
      const roof = hipRoof(w * 0.78, d * 0.7, o.roofH ?? Math.min(w, d) * 0.42, { mat: o.roofMat, ridgeMat: o.ridgeMat });
      bag.merge(roof, new THREE.Matrix4().makeTranslation(0, top, 0));
      bag.height = top + roof.topY;
    } else {
      const roof = hipRoof(w, d, o.roofH ?? Math.min(w, d) * 0.45, { mat: o.roofMat, ridgeMat: o.ridgeMat, lift: o.lift });
      bag.merge(roof, new THREE.Matrix4().makeTranslation(0, top, 0));
      bag.height = top + roof.topY;
    }
    return bag;
  }
  CK.hall = hall;

  function pagoda(tiers, o = {}) {
    const bag = new Bag();
    bag.at('stone', box(1.3, 0.2, 1.3), 0, 0.1, 0);
    let y = 0.2, s = 0.9;
    for (let t = 0; t < tiers; t++) {
      const hgt = t === 0 ? 0.42 : 0.26;
      bag.at(t === 0 ? 'plaster' : 'plaster', cyl(s * 0.5, s * 0.52, hgt, 8), 0, y + hgt / 2, 0);
      bag.at('red', cyl(s * 0.53, s * 0.53, 0.04, 8), 0, y + hgt - 0.02, 0);
      const roof = hipRoof(s * 0.92, s * 0.92, 0.2, { overhang: 0.2, lift: 0.07, mat: o.roofMat, power: 1.5 });
      bag.merge(roof, new THREE.Matrix4().makeTranslation(0, y + hgt, 0));
      y += hgt + 0.1;
      s *= 0.88;
    }
    bag.at('ridgeGold', cyl(0.004, 0.05, 0.5, 6), 0, y + 0.22, 0);
    bag.height = y + 0.5;
    return bag;
  }
  CK.pagoda = pagoda;

  // Courtyard compound (siheyuan): enclosure, main hall north, two side halls, gate south, tree.
  function compound(W, D, o = {}) {
    const bag = new Bag();
    const wh = 0.26, t = 0.06;
    bag.at('paving', box(W, 0.03, D), 0, 0.015, 0);
    for (const [w, d, x, z] of [[W, t, 0, -D / 2], [t, D, -W / 2, 0], [t, D, W / 2, 0], [W * 0.38, t, -W * 0.31, D / 2], [W * 0.38, t, W * 0.31, D / 2]]) {
      bag.at('plaster', box(w, wh, d), x, wh / 2, z);
      bag.at('ridge', box(w + 0.04, 0.035, d + 0.05), x, wh + 0.015, z);
    }
    const main = hall(W * 0.7, D * 0.3, 0.32, { roofH: 0.2, base: 0.07 });
    bag.merge(main, new THREE.Matrix4().makeTranslation(0, 0, -D / 2 + D * 0.2));
    for (const sx of [-1, 1]) {
      const side = hall(D * 0.34, W * 0.2, 0.26, { roofH: 0.15, base: 0.05 });
      bag.merge(side, new THREE.Matrix4().makeRotationY(sx * Math.PI / 2).setPosition(sx * (W / 2 - W * 0.14), 0, D * 0.05));
    }
    const gate = hall(W * 0.22, 0.14, 0.24, { roofH: 0.1, base: 0.03, facade: false });
    bag.merge(gate, new THREE.Matrix4().makeTranslation(W * (o.gateX ?? 0.28), 0, D / 2));
    return bag;
  }
  CK.compound = compound;

  function shop(w, d) {
    const bag = hall(w, d, 0.38, { roofH: 0.2, base: 0.04 });
    bag.at('wood', box(w * 0.9, 0.02, 0.3), 0, 0.3, d / 2 + 0.15, 0);
    return bag;
  }

  // Tapered wall run along +x of length len, centred at origin.
  function wallRun(len, h, tb, tt) {
    const g = box(len, h, tb).toNonIndexed();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * (tt / tb));
    g.translate(0, h / 2, 0);
    g.computeVertexNormals();
    return g;
  }

  // ------------------------------------------------------------ the city
  // opts: { x, z, y, half, seat, palaceRoof: 'gold'|'gray'|'green', flags: fn(x,y,z,s) }
  const VCACHE = {};
  CK.sink = () => ({ static: new Bag(), inst: {} });
  CK.flush = function (sink, scene) {
    const g = new THREE.Group();
    sink.static.meshes(g);
    for (const b of Object.values(sink.inst)) {
      // one InstancedMesh per variant for ALL far cities (they are all on screen in the overview anyway)
      const geo = b.proto.geo.clone();
      const im = new THREE.InstancedMesh(geo, b.proto.mats, b.mats.length);
      const box = new THREE.Box3(), p = new THREE.Vector3();
      b.mats.forEach((m, i) => { im.setMatrixAt(i, m); box.expandByPoint(p.setFromMatrixPosition(m)); });
      geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); geo.boundingSphere.radius += 4;
      im.frustumCulled = true;
      im.receiveShadow = true;
      g.add(im);
    }
    // far cities take the baked terrain light but cast no real-time shadow (they sit outside the shadow frustum)
    g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    scene.add(g);
    return g;
  };
  CK.build = function (scene, o) {
    const lod = o.lod || 'full', lite = lod === 'lite';
    CK.setDetail(lod);
    const root = new THREE.Group();
    root.position.set(o.x, o.y, o.z);
    scene.add(root);
    // o.sink (lite cities): geometry goes into shared buckets instead of this city's own meshes, so all
    // far cities together cost ~50 draw calls. CK.flush(sink, scene) builds them once every city is in.
    const rootM = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z);
    const emit = (bag, local) => {
      if (o.sink) { o.sink.static.merge(bag, local ? local.clone().premultiply(rootM) : rootM); return; }
      if (!local) { bag.meshes(root); return; }
      const g = new THREE.Group(); g.applyMatrix4(local); bag.meshes(g); root.add(g);
    };
    const S = o.half, WH = o.wallH ?? 1.35, TB = 0.95, TT = 0.62;
    const walls = new Bag(), merlons = [], anchors = { gates: [], towers: [] };
    const gateW = 2.4;
    // four sides; each side is rotated copy of the south side (+z)
    for (let side = 0; side < 4; side++) {
      const rot = (side * Math.PI) / 2;
      const m = new THREE.Matrix4().makeRotationY(rot);
      const put = (key, geo, x, y, z) => walls.add(key, geo, new THREE.Matrix4().makeTranslation(x, y, z).premultiply(m));
      const segLen = S - gateW / 2 - 0.7;
      for (const sx of [-1, 1]) {
        const cx = sx * (gateW / 2 + segLen / 2);
        put('brick', wallRun(segLen, WH, TB, TT), cx, 0, S);
        put('paving', box(segLen, 0.02, TT * 0.9), cx, WH + 0.01, S);
        put('brick', box(segLen, 0.1, 0.05), cx, WH + 0.05, S - TT / 2 + 0.03);
        if (!lite) for (let t = -segLen / 2 + 0.12; t < segLen / 2 - 0.1; t += 0.26) merlons.push(new THREE.Vector3(cx + t, WH + 0.09, S + TT / 2 - 0.04).applyMatrix4(m));
        // bastions (ma mian) along the run
        const nb = Math.max(1, Math.floor(segLen / 3.2));
        for (let b = 1; b <= nb; b++) {
          const bx = sx * (gateW / 2 + (segLen * b) / (nb + 1));
          put('brick', wallRun(0.9, WH, 1.5, 1.2), bx, 0, S + 0.55);
          put('paving', box(0.86, 0.02, 1.1), bx, WH + 0.01, S + 0.6);
          if (!lite) for (let t = -0.35; t <= 0.36; t += 0.24) merlons.push(new THREE.Vector3(bx + t, WH + 0.09, S + 1.15).applyMatrix4(m));
          if (!lite) for (const e of [-1, 1]) for (let t = 0.2; t < 1.1; t += 0.26) merlons.push(new THREE.Vector3(bx + e * 0.43, WH + 0.09, S + 0.15 + t).applyMatrix4(m));
        }
      }
      // gatehouse block with arched tunnel and doors, then a two-storey gate tower
      put('brick', wallRun(gateW + 0.9, WH + 0.25, TB + 0.5, TT + 0.4), 0, 0, S);
      for (const fz of [1, -1]) {
        const z = S + fz * ((TB + 0.5) / 2 + 0.005);
        const arch = new THREE.Shape();
        arch.moveTo(-0.34, 0); arch.lineTo(-0.34, 0.5); arch.absarc(0, 0.5, 0.34, Math.PI, 0, true); arch.lineTo(0.34, 0); arch.lineTo(-0.34, 0);
        const ag = new THREE.ShapeGeometry(arch, 8);
        if (fz < 0) ag.rotateY(Math.PI);
        put('dark', ag, 0, 0.001, z);
        if (fz > 0) put('red', box(0.3, 0.5, 0.03), -0.17, 0.25, z - 0.08), put('red', box(0.3, 0.5, 0.03), 0.17, 0.25, z - 0.08);
      }
      const tower = hall(gateW - 0.2, TT + 0.25, 0.5, { double: side === 0 || o.seat, roofH: 0.5, base: 0.08 });
      walls.merge(tower, new THREE.Matrix4().makeTranslation(0, WH + 0.25, S).premultiply(m));
      anchors.gates.push(new THREE.Vector3(0, WH + 0.25 + (tower.height || 1.5), S).applyMatrix4(m));
      // barbican (weng cheng) in front of the main south gate
      if (side === 0) {
        const bw = 3.6, bd = 2.2;
        put('brick', wallRun(bw, WH * 0.85, 0.7, 0.5), 0, 0, S + bd + 0.5);
        for (const e of [-1, 1]) put('brick', wallRun(bd, WH * 0.85, 0.7, 0.5).rotateY(Math.PI / 2), e * (bw / 2), 0, S + 0.45 + bd / 2);
        if (!lite) for (let t = -bw / 2 + 0.15; t < bw / 2; t += 0.26) merlons.push(new THREE.Vector3(t, WH * 0.85 + 0.09, S + bd + 0.72).applyMatrix4(m));
        const arch = new THREE.Shape();
        arch.moveTo(-0.3, 0); arch.lineTo(-0.3, 0.42); arch.absarc(0, 0.42, 0.3, Math.PI, 0, true); arch.lineTo(0.3, 0); arch.lineTo(-0.3, 0);
        put('dark', new THREE.ShapeGeometry(arch, 8).rotateY(Math.PI / 2), bw / 2 + 0.36, 0.001, S + 1.5);
      }
    }
    // corner towers
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      walls.at('brick', wallRun(1.6, WH + 0.1, 1.6, 1.45), sx * S, 0, sz * S);
      const t = hall(1.0, 1.0, 0.36, { roofH: 0.42, base: 0.06, facade: false });
      walls.merge(t, new THREE.Matrix4().makeTranslation(sx * S, WH + 0.1, sz * S));
      anchors.towers.push(new THREE.Vector3(sx * S, WH + 1.2, sz * S));
    }
    emit(walls);
    // merlons (instanced)
    const mat4 = new THREE.Matrix4();
    if (merlons.length) {
    const mg = box(0.13, 0.17, 0.09);
    const mm = new THREE.InstancedMesh(mg, M.brick, merlons.length);
    merlons.forEach((p, i) => { const ang = Math.abs(p.z) > Math.abs(p.x) ? 0 : Math.PI / 2; mm.setMatrixAt(i, mat4.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang), new THREE.Vector3(1, 1, 1))); });
    mm.castShadow = mm.receiveShadow = true;
    root.add(mm);
    }

    // ------------ interior: streets, palace, compounds, shops, market
    const inner = S - 0.8;
    const ground = new Bag();
    ground.at('earth', box(S * 2 - 0.4, 0.02, S * 2 - 0.4), 0, 0.006, 0);
    ground.at('paving', box(0.95, 0.03, inner * 2 + 3.4), 0, 0.015, 1.4); // south avenue to the palace
    ground.at('paving', box(inner * 2, 0.03, 0.8), 0, 0.015, 1.2); // east-west avenue
    emit(ground);
    const occupied = [];
    const block = (x, z, w, d) => occupied.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
    const free = (x, z, w, d) => Math.abs(x) + w / 2 < inner && Math.abs(z) + d / 2 < inner && !occupied.some(([a, b, c, e]) => x + w / 2 > a && x - w / 2 < b && z + d / 2 > c && z - d / 2 < e);
    block(0, 1.3, 1.0, inner * 2 + 3);
    block(0, 1.2, inner * 2, 0.85);
    // palace on a three-step terrace
    const pw = o.seat ? 5.2 : 3.4, pd = o.seat ? 4.2 : 2.8, pz = -inner + pd / 2 + 0.3;
    block(0, pz, pw + 0.4, pd + 0.4);
    const pal = new Bag();
    for (const [w, d, y, h] of [[pw, pd, 0.06, 0.12], [pw * 0.72, pd * 0.62, 0.18, 0.12], [pw * 0.56, pd * 0.44, 0.3, 0.12]]) pal.at('stone', box(w, h, d), 0, y, pz - pd * 0.08);
    for (const [w, d, x, z] of [[pw, 0.12, 0, pz - pd / 2], [pw, 0.12, 0, pz + pd / 2], [0.12, pd, -pw / 2, pz], [0.12, pd, pw / 2, pz]]) { pal.at('redWall', box(w, 0.42, d), x, 0.21, z); pal.at(o.palaceRoof === 'gold' ? 'ridgeGold' : 'ridge', box(w + 0.08, 0.05, d + 0.08), x, 0.44, z); }
    const roofMat = o.palaceRoof === 'gold' ? 'roofGold' : o.palaceRoof === 'green' ? 'roofGreen' : 'roof';
    const ridgeMat = o.palaceRoof === 'gold' ? 'ridgeGold' : 'ridge';
    const great = hall(pw * 0.46, pd * 0.28, 0.62, { double: true, roofMat, ridgeMat, roofH: 0.55 });
    pal.merge(great, new THREE.Matrix4().makeTranslation(0, 0.36, pz - pd * 0.12));
    const front = hall(pw * 0.3, pd * 0.16, 0.42, { roofMat, ridgeMat, roofH: 0.3 });
    pal.merge(front, new THREE.Matrix4().makeTranslation(0, 0.12, pz + pd * 0.36));
    for (const sx of [-1, 1]) { const sideH = hall(pd * 0.34, pw * 0.12, 0.36, { roofMat, ridgeMat, roofH: 0.24 }); pal.merge(sideH, new THREE.Matrix4().makeRotationY(sx * Math.PI / 2).setPosition(sx * pw * 0.36, 0.12, pz + pd * 0.05)); }
    if (o.seat) { const pg = pagoda(o.pagodaTiers || 5, { roofMat }); pal.merge(pg, new THREE.Matrix4().makeTranslation(pw * 0.36, 0.12, pz - pd * 0.3)); }
    emit(pal);
    anchors.palace = new THREE.Vector3(0, 0.36 + great.height, pz);
    // drum tower at the crossing
    const drum = new Bag();
    drum.at('brick', wallRun(1.2, 0.55, 1.2, 1.05), 0, 0, 1.2);
    drum.merge(hall(0.95, 0.8, 0.3, { roofH: 0.34, double: false }), new THREE.Matrix4().makeTranslation(0, 0.55, 1.2));
    emit(drum);
    block(0, 1.2, 1.4, 1.4);

    // instanced compounds (a few variants) filling the free blocks
    // prototypes are built once per detail level and shared by every city (geometry memory is paid once)
    const vc = (VCACHE[lod] = VCACHE[lod] || {
      variants: [compound(1.7, 1.5, { gateX: 0.28 }), compound(1.5, 1.35, { gateX: -0.28 }), compound(2.0, 1.6, { gateX: 0.3 })].map((b) => b.grouped()),
      shopV: [shop(0.7, 0.45), shop(0.9, 0.5)].map((b) => b.grouped()),
    });
    const { variants, shopV } = vc;
    const placed = variants.map(() => []), shopsPlaced = shopV.map(() => []);
    // shops line the avenues
    for (let t = -inner + 0.6; t < inner - 0.4; t += 0.78) {
      for (const e of [-1, 1]) {
        const k = Math.floor(r() * shopV.length), w = k ? 0.9 : 0.7;
        if (free(e * 0.95, t, w * 0.8, 0.55) && t > pz + pd / 2) { shopsPlaced[k].push([e * 0.95, t, e > 0 ? -Math.PI / 2 : Math.PI / 2]); block(e * 0.95, t, 0.55, w); }
        if (free(t, 1.2 + e * 0.8, w, 0.55)) { shopsPlaced[k].push([t, 1.2 + e * 0.8, e > 0 ? 0 : Math.PI]); block(t, 1.2 + e * 0.8, w, 0.55); }
      }
    }
    // market square with stalls in one quadrant
    const mx = inner * 0.55, mz = inner * 0.5;
    block(mx, mz, 2.2, 1.8);
    const market = new Bag();
    market.at('paving', box(2.2, 0.03, 1.8), mx, 0.015, mz);
    for (let i = 0; i < (lite ? 0 : 14); i++) { const x = mx + rr(-0.9, 0.9), z = mz + rr(-0.7, 0.7); market.at('wood', box(0.22, 0.1, 0.16), x, 0.08, z); market.at('red', cyl(0.008, 0.008, 0.26, 4), x, 0.13, z); }
    emit(market);
    for (let i = 0; i < (lite ? 0 : 14); i++) { const aw = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), M.cloth[i % M.cloth.length]); aw.position.set(mx + rr(-0.9, 0.9), 0.27, mz + rr(-0.7, 0.7)); aw.rotation.set(-Math.PI / 2 + 0.25, rr(-0.3, 0.3), 0); aw.castShadow = true; root.add(aw); }
    // temple with pagoda in another quadrant for non-seat cities too
    if (!o.seat) { emit(pagoda(4), new THREE.Matrix4().makeTranslation(-inner * 0.55, 0, inner * 0.45)); block(-inner * 0.55, inner * 0.45, 1.4, 1.4); }
    // compounds packed ward by ward (the four quadrants between the avenues), lanes between rows
    const sizes = [[1.7, 1.5], [1.5, 1.35], [2.0, 1.6]];
    const small = [];
    const wards = [[-inner + 0.15, -0.55, -inner + 0.15, 0.7], [0.55, inner - 0.15, -inner + 0.15, 0.7], [-inner + 0.15, -0.55, 1.75, inner - 0.15], [0.55, inner - 0.15, 1.75, inner - 0.15]];
    for (const [x0, x1, z0, z1] of wards) {
      for (let z = z0; z < z1 - 0.5; ) {
        const rowD = rr(1.25, 1.6);
        for (let x = x0; x < x1 - 0.4; ) {
          const k = Math.floor(r() * sizes.length);
          const sc = Math.min(1, rowD / sizes[k][1]);
          const w = sizes[k][0] * sc, d = sizes[k][1] * sc;
          const cx = x + w / 2, cz = z + d / 2;
          if (x + w <= x1 && z + d <= z1 && free(cx, cz, w, d)) { placed[k].push([cx, cz, 0, sc]); block(cx, cz, w, d); x += w + rr(0.08, 0.18); }
          else { if (free(x + 0.3, z + 0.3, 0.55, 0.5)) { small.push([x + 0.3, z + 0.3, Math.floor(r() * 4) * Math.PI / 2]); block(x + 0.3, z + 0.3, 0.6, 0.55); } x += 0.62; }
        }
        z += rowD + rr(0.16, 0.26);
      }
    }
    for (const [x, z, ry] of small) shopsPlaced[Math.floor(r() * shopsPlaced.length)].push([x, z, ry]);
    const inst = (proto, list, key) => {
      if (!list.length) return;
      if (o.sink) {
        const b = (o.sink.inst[lod + ':' + key] = o.sink.inst[lod + ':' + key] || { proto, mats: [] });
        for (const [x, z, ry, sc = 1] of list) b.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sc, 0.9 + 0.1 * sc, sc)).premultiply(rootM));
        return;
      }
      const im = new THREE.InstancedMesh(proto.geo, proto.mats, list.length);
      list.forEach(([x, z, ry, sc = 1], i) => im.setMatrixAt(i, mat4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sc, 0.9 + 0.1 * sc, sc))));
      im.castShadow = im.receiveShadow = true;
      root.add(im);
    };
    if (o.suburbs !== false)
      for (let side = 0; side < 4; side++) {
        const m = new THREE.Matrix4().makeRotationY((side * Math.PI) / 2);
        const reach = side === 0 ? S + 3.6 : S + 1.9;
        for (let t = 0; t < 14; t++) {
          const along = reach + 0.4 + t * rr(0.55, 0.8), off = (t % 2 ? 1 : -1) * rr(0.75, 1.4);
          const pt = new THREE.Vector3(off, 0, along).applyMatrix4(m);
          if (o.canBuild && !o.canBuild(o.x + pt.x, o.z + pt.z)) continue;
          if (r() < 0.3) placed[1].push([pt.x, pt.z, (side * Math.PI) / 2, 0.75]);
          else shopsPlaced[Math.floor(r() * shopsPlaced.length)].push([pt.x, pt.z, (side * Math.PI) / 2 + (off > 0 ? -Math.PI / 2 : Math.PI / 2), 0.9]);
        }
      }
    variants.forEach((v, k) => inst(v, placed[k], 'c' + k));
    shopV.forEach((v, k) => inst(v, shopsPlaced[k], 's' + k));
    // lanterns along the south avenue
    if (!lite) {
    const lan = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 8), M.lantern, 60);
    let li = 0;
    for (let t = -inner + 0.5; t < inner + 2.5 && li < 58; t += 0.55) for (const e of [-1, 1]) lan.setMatrixAt(li++, mat4.makeTranslation(e * 0.52, 0.32, t));
    lan.count = li;
    root.add(lan);
    }
    anchors.compounds = placed.reduce((a, l) => a + l.length, 0);
    CK.setDetail('full');
    anchors.inner = inner;
    root.userData.anchors = anchors;
    return root;
  };
})();
