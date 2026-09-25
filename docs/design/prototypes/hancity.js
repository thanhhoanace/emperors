// Round 5: Eastern Han cities (c. 200 CE) built from data/cities.json. Rules: docs/design/history.md —
// rammed-earth walls, flat-topped timber gate passages under gate towers, que pairs, straight grey-tiled roofs,
// vermilion timber and white walls, palaces on rammed-earth platforms; Luoyang and Chang'an as burnt ruins.
// Plans are in km and scaled uniformly (meta.cities[id].scale) into world units; heights are exaggerated
// against the plan (a wall is ~0.22–0.3 units) so a city still reads from the campaign camera.
(function () {
  const HC = (window.HanCity = {});
  const CK = window.CityKit, M = CK.mats, Bag = CK.Bag, BGU = THREE.BufferGeometryUtils;
  const { pixels, triplanar, grain } = CK.tex;
  const r = () => K.r(), rr = (a, b) => K.rr(a, b);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
  const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const RT = (ry, x, y, z) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);

  // ------------------------------------------------------------ materials
  // rammed earth: horizontal tamping layers (7–11 cm), rows of pole holes, loess colour
  const earthImg = pixels(512, (x, y) => {
    const layer = Math.floor(y / 9), band = (grain(0, layer, 1) - 0.5) * 0.14, n = (grain(x, y, 2) - 0.5) * 0.08 + (grain(x, y, 18) - 0.5) * 0.1;
    const seam = y % 9 === 0 ? -0.12 : 0, hole = x % 64 < 3 && y % 72 < 3 ? -0.35 : 0;
    const k = 1 + band + n + seam + hole;
    return [171 * k, 142 * k, 103 * k, 0];
  });
  const burntImg = pixels(256, (x, y) => { const n = (grain(x, y, 2) - 0.5) * 0.2 + (grain(x, y, 30) - 0.5) * 0.3; const k = 0.5 + n; return [60 * k + 30, 50 * k + 22, 42 * k + 18, 0]; });
  const bambooImg = pixels(128, (x, y) => { const k = 0.85 + 0.2 * Math.sin((x / 128) * Math.PI * 16) + (grain(x, y, 3) - 0.5) * 0.1 - (y % 40 < 2 ? 0.25 : 0); return [150 * k, 128 * k, 78 * k, 0]; });
  const HM = (HC.mats = {
    earth: triplanar(earthImg, 2.2, { rough: 0.97 }),
    earthDark: triplanar(earthImg, 2.2, { rough: 0.97, color: 0xa89878 }),
    burnt: triplanar(burntImg, 3, { rough: 1 }),
    bamboo: triplanar(bambooImg, 6, { rough: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9a2a1c, roughness: 0.55 }),
    yard: triplanar(earthImg, 5, { rough: 1, color: 0xd9ccb0 }),
    street: triplanar(earthImg, 5, { rough: 1, color: 0xf0e6cf }),
    hill: triplanar(pixels(256, (x, y) => { const n = (grain(x, y, 3) - 0.5) * 0.25 + (grain(x, y, 22) - 0.5) * 0.3; const k = 1 + n; return [96 * k, 104 * k, 58 * k, 0]; }), 1.2, { rough: 1 }),
    hull: new THREE.MeshStandardMaterial({ color: 0x4b3624, roughness: 0.8 }),
    sail: new THREE.MeshStandardMaterial({ color: 0xcfc3a3, roughness: 0.9, side: THREE.DoubleSide }),
  });
  // Bag.meshes/grouped look materials up in CityKit.mats: register ours there under 'han_*'
  for (const [k, m] of Object.entries(HM)) M['han_' + k] = m;
  const E = 'han_earth', ED = 'han_earthDark', BU = 'han_burnt', RED = 'han_red', YARD = 'han_yard', HILL = 'han_hill';

  // ------------------------------------------------------------ roofs (straight, Han: no upturned corners)
  function hipRoof(w, d, h, o = {}) {
    const bag = new Bag(), ov = o.overhang ?? Math.min(w, d) * 0.22;
    let W = w + ov * 2, D = d + ov * 2; const swap = D > W; if (swap) [W, D] = [D, W];
    const hw = W / 2, hd = D / 2, rl = Math.max(0.001, hw - hd);
    const quads = [
      [[-hw, 0, hd], [hw, 0, hd], [rl, h, 0], [-rl, h, 0]],
      [[hw, 0, -hd], [-hw, 0, -hd], [-rl, h, 0], [rl, h, 0]],
      [[hw, 0, hd], [hw, 0, -hd], [rl, h, 0], [rl, h, 0]],
      [[-hw, 0, -hd], [-hw, 0, hd], [-rl, h, 0], [-rl, h, 0]],
    ];
    for (const [a, b, c, e] of quads) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...e], 3));
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]) * 1.3, S = Math.hypot(hd, h) * 1.3;
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, L, 0, L, S, 0, 0, L, S, 0, S], 2));
      g.computeVertexNormals();
      bag.add(o.mat || 'roof', g);
    }
    const t = Math.max(0.006, h * 0.08);
    bag.at('wood', box(W, t, D), 0, -t / 2, 0); // eave slab gives the roof its thickness
    bag.at('ridge', box(rl * 2 + t * 2, t * 1.8, t * 1.6), 0, h + t * 0.4, 0);
    for (const sx of [-1, 1]) bag.at('ridge', box(t * 1.4, t * 3.2, t * 1.8), sx * (rl + t), h + t * 1.2, 0); // stacked-tile ridge ends
    if (swap) for (const list of Object.values(bag.parts)) list.forEach((g) => g.rotateY(Math.PI / 2));
    return bag;
  }
  // Overhanging gable roof (悬山), the common roof of houses.
  function gableRoof(w, d, h, o = {}) {
    const bag = new Bag(), ov = o.overhang ?? Math.min(w, d) * 0.18, W = w + ov * 2, hd = d / 2 + ov;
    for (const s of [1, -1]) {
      const g = new THREE.BufferGeometry(), a = [-W / 2, 0, s * hd], b = [W / 2, 0, s * hd], c = [W / 2, h, 0], e = [-W / 2, h, 0];
      g.setAttribute('position', new THREE.Float32BufferAttribute(s > 0 ? [...a, ...b, ...c, ...a, ...c, ...e] : [...b, ...a, ...e, ...b, ...e, ...c], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, W * 1.3, 0, W * 1.3, 1, 0, 0, W * 1.3, 1, 0, 1], 2));
      g.computeVertexNormals(); bag.add('roof', g);
    }
    const t = Math.max(0.005, h * 0.09);
    bag.at('ridge', box(W + t, t * 1.6, t * 1.4), 0, h + t * 0.3, 0);
    for (const sx of [-1, 1]) {
      const p = [[sx * w / 2, 0, d / 2], [sx * w / 2, 0, -d / 2], [sx * w / 2, h * 0.92, 0]];
      const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute((sx > 0 ? p : [p[1], p[0], p[2]]).flat(), 3));
      tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); tri.computeVertexNormals(); bag.add('plaster', tri);
    }
    return bag;
  }

  // ------------------------------------------------------------ buildings
  // Hall: stone/earth plinth, white walls, red posts, lattice front, beam band, straight roof.
  function hall(w, d, hgt, o = {}) {
    const bag = new Bag(), base = o.base ?? 0.02;
    bag.at(o.baseMat || 'stone', box(w + 0.02, base, d + 0.02), 0, base / 2, 0);
    bag.at('plaster', box(w * 0.95, hgt, d * 0.9), 0, base + hgt / 2, 0);
    if (o.detail !== false) {
      const n = Math.max(2, Math.round(w / 0.05));
      for (let i = 0; i <= n; i++) bag.at(RED, box(0.008, hgt, 0.008), -w / 2 + (i * w) / n, base + hgt / 2, d * 0.46);
      bag.at('lattice', box(w * 0.8, hgt * 0.5, 0.003), 0, base + hgt * 0.5, d * 0.455);
    }
    bag.at('wood', box(w + 0.006, hgt * 0.12, d * 0.95), 0, base + hgt + hgt * 0.04, 0);
    const top = base + hgt + hgt * 0.1, roofH = o.roofH ?? Math.min(w, d) * 0.42;
    bag.merge(o.gable ? gableRoof(w, d, roofH) : hipRoof(w, d, roofH, { mat: o.roofMat, overhang: o.overhang }), T(0, top, 0));
    bag.height = top + roofH;
    return bag;
  }
  // Timber tower (望楼): storeys shrink upward, each with a balcony and its own eave (Han pottery models).
  function tower(storeys, w, sh) {
    const bag = new Bag(); let y = 0, s = w;
    for (let k = 0; k < storeys; k++) {
      bag.at('plaster', box(s * 0.8, sh, s * 0.8), 0, y + sh / 2, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bag.at(RED, box(s * 0.08, sh, s * 0.08), sx * s * 0.4, y + sh / 2, sz * s * 0.4);
      bag.at('wood', box(s * 1.02, sh * 0.08, s * 1.02), 0, y + sh * 0.04, 0);
      if (k === storeys - 1) bag.merge(hipRoof(s * 0.85, s * 0.85, s * 0.42), T(0, y + sh, 0));
      else bag.merge(hipRoof(s * 0.85, s * 0.85, s * 0.16, { overhang: s * 0.22 }), T(0, y + sh * 0.92, 0));
      y += sh; s *= 0.82;
    }
    bag.height = y + w * 0.4;
    return bag;
  }
  // Que (阙): a pair of towers flanking the approach. official = mother + one child, imperial = mother + two.
  function quePair(kind, gap, H) {
    const bag = new Bag(), kids = kind === 'imperial' ? 2 : 1;
    for (const side of [-1, 1]) {
      const x0 = side * gap / 2, mh = H * 1.25, mw = H * 0.42;
      bag.at(E, box(mw, mh, mw * 0.8), x0, mh / 2, 0);
      bag.merge(hipRoof(mw * 1.05, mw * 0.85, H * 0.16, { overhang: mw * 0.25 }), T(x0, mh * 0.82, 0));
      bag.merge(hipRoof(mw * 0.9, mw * 0.7, H * 0.18, { overhang: mw * 0.22 }), T(x0, mh, 0));
      for (let k = 1; k <= kids; k++) {
        const cw = mw * (0.7 - 0.12 * (k - 1)), x = x0 + side * (mw / 2 + cw / 2 + (k - 1) * cw), hh = mh * (0.7 - 0.15 * (k - 1));
        bag.at(E, box(cw, hh, cw * 0.8), x, hh / 2, 0);
        bag.merge(hipRoof(cw * 1.05, cw * 0.85, H * 0.12, { overhang: cw * 0.22 }), T(x, hh, 0));
      }
    }
    return bag;
  }
  // Courtyard compound (Han): walled yard, gatehouse south, main hall north, side rooms, some with a watchtower.
  const HOUSES = [[0.55, 0.42], [0.45, 0.38], [0.62, 0.46], [0.5, 0.4]];
  function house(W, D, o = {}) {
    const bag = new Bag(), wh = 0.05, t = 0.018;
    bag.at(YARD, box(W, 0.006, D), 0, 0.003, 0);
    for (const [w, d, x, z] of [[W, t, 0, -D / 2], [t, D, -W / 2, 0], [t, D, W / 2, 0], [W * 0.38, t, -W * 0.31, D / 2], [W * 0.38, t, W * 0.31, D / 2]]) { bag.at('plaster', box(w, wh, d), x, wh / 2, z); bag.at('ridge', box(w + 0.01, 0.008, d + 0.01), x, wh + 0.004, z); }
    bag.merge(hall(W * 0.7, D * 0.3, 0.07, { gable: true, roofH: 0.05, base: 0.012, detail: o.detail }), T(0, 0, -D / 2 + D * 0.2));
    bag.merge(hall(W * 0.22, 0.05, 0.05, { gable: true, roofH: 0.025, base: 0.004, detail: false }), T(W * (o.gateX ?? 0.2), 0, D / 2));
    for (const sx of [-1, 1]) bag.merge(hall(D * 0.34, W * 0.16, 0.05, { gable: true, roofH: 0.03, base: 0.008, detail: false }), RT(sx * Math.PI / 2, sx * (W / 2 - W * 0.12), 0, D * 0.05));
    if (o.watchtower) bag.merge(tower(3, 0.1, 0.07), T(W * 0.28, 0, D * 0.15));
    return bag;
  }
  // Burnt-out compound: broken earthen walls, no roof, scorched yard.
  function shell(W, D) {
    const bag = new Bag(), wh = 0.05, t = 0.02;
    bag.at(BU, box(W * 0.8, 0.005, D * 0.8), 0, 0.003, 0);
    for (const [w, d, x, z] of [[W * 0.6, t, -W * 0.15, -D / 2], [t, D * 0.7, -W / 2, -D * 0.1], [t, D * 0.4, W / 2, D * 0.25], [W * 0.3, t, W * 0.3, D / 2], [W * 0.5, t, 0, -D * 0.1]]) bag.at('plaster', box(w, wh * (0.4 + 0.6 * ((x + z + 1) % 1)), d), x, wh * 0.3, z);
    bag.at('dark', box(W * 0.4, 0.012, 0.014), 0.05, 0.008, 0.02, 0.5);
    return bag;
  }
  // Far-city compound (~60 triangles): yard, main hall and gatehouse as boxes under plain gable roofs.
  function houseLite(W, D) {
    const bag = new Bag(), roof = (w, d, h, x, y, z) => {
      for (const sgn of [1, -1]) { const g = new THREE.BufferGeometry(), a = [-w / 2, 0, sgn * d / 2], b = [w / 2, 0, sgn * d / 2], c = [w / 2, h, 0], e = [-w / 2, h, 0]; g.setAttribute('position', new THREE.Float32BufferAttribute(sgn > 0 ? [...a, ...b, ...c, ...a, ...c, ...e] : [...b, ...a, ...e, ...b, ...e, ...c], 3)); g.computeVertexNormals(); bag.add('roof', g, T(x, y, z)); }
    };
    bag.at(YARD, box(W, 0.006, D), 0, 0.003, 0);
    bag.at('plaster', box(W * 0.66, 0.07, D * 0.26), 0, 0.035, -D * 0.3); roof(W * 0.8, D * 0.38, 0.05, 0, 0.07, -D * 0.3);
    bag.at('plaster', box(W * 0.3, 0.05, D * 0.16), W * 0.2, 0.025, D * 0.36); roof(W * 0.38, D * 0.24, 0.03, W * 0.2, 0.05, D * 0.36);
    bag.at('plaster', box(W, 0.04, 0.016), 0, 0.02, -D / 2); bag.at('plaster', box(0.016, 0.04, D), -W / 2, 0.02, 0); bag.at('plaster', box(0.016, 0.04, D), W / 2, 0.02, 0);
    return bag;
  }
  function granary(r0, h0) {
    const bag = new Bag();
    bag.at('plaster', cyl(r0, r0, h0, 10), 0, h0 / 2 + 0.01, 0);
    bag.at('roof', new THREE.ConeGeometry(r0 * 1.25, h0 * 0.7, 10), 0, h0 + 0.01 + h0 * 0.35, 0);
    return bag;
  }

  // ------------------------------------------------------------ walls and gates
  // Rammed-earth wall along +x (length len): battered faces, low earthen parapet with gaps on the outer (+z) side.
  function wallRun(len, H, base, top, o = {}) {
    const bag = new Bag(), g = box(len, H, base).toNonIndexed(), p = g.attributes.position, mat = o.mat || E;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * (top / base));
    g.translate(0, H / 2, 0); g.computeVertexNormals();
    bag.add(mat, g);
    if (o.parapet !== false) {
      const ph = H * 0.12, n = Math.max(1, Math.floor(len / (H * 0.35)));
      for (let k = 0; k < n; k++) bag.at(mat, box((len / n) * 0.62, ph, top * 0.18), -len / 2 + ((k + 0.5) * len) / n, H + ph / 2, top * 0.4);
      bag.at(mat, box(len, ph * 0.5, top * 0.12), 0, H + ph * 0.25, -top * 0.44);
    }
    return bag;
  }
  // Gate width: passages (0.3 H wide) with piers, plus wings. Passages are flat-topped (timber lintels).
  const gateWidth = (n, H) => n * 0.3 * H + (n + 1) * 0.2 * H + 0.6 * H;
  function gate(n, H, base, o = {}) {
    const bag = new Bag(), pw = 0.3 * H, gw = gateWidth(n, H), blk = base * 1.2;
    bag.merge(wallRun(gw, H * 1.05, blk, blk * 0.8, { parapet: false, mat: o.mat }));
    for (let k = 0; k < n; k++) {
      const x = -gw / 2 + 0.3 * H + 0.2 * H + pw / 2 + k * (pw + 0.2 * H);
      bag.at('dark', box(pw, H * 0.55, blk * 1.02), x, H * 0.275, 0);
      bag.at('wood', box(pw * 1.25, H * 0.07, blk * 1.04), x, H * 0.585, 0); // lintel beam
    }
    if (o.ruined) { // the timber gate tower burnt down: charred posts and fallen beams on the rammed-earth block
      for (let k = 0; k < 10; k++) { const hh = rr(0.02, 0.1); bag.at('dark', cyl(0.008, 0.01, hh, 5), rr(-0.4, 0.4) * gw, H * 1.05 + hh / 2, rr(-0.3, 0.3) * blk); }
      bag.at('dark', box(gw * 0.5, 0.012, 0.014), 0, H * 1.06, 0, rr(-0.4, 0.4));
      bag.at(BU, box(gw * 0.8, 0.012, blk * 0.6), 0, H * 1.05 + 0.006, 0);
    } else if (o.tower !== false) {
      const t = hall(gw * 0.85, blk * 0.62, H * 0.45, { roofH: H * 0.36, base: 0.006, detail: o.detail });
      bag.merge(t, T(0, H * 1.05, 0));
      bag.height = H * 1.05 + t.height;
      if (o.storeys === 2) { const t2 = hall(gw * 0.55, blk * 0.42, H * 0.34, { roofH: H * 0.3, base: 0.004, detail: false }); bag.merge(t2, T(0, H * 1.05 + t.height - H * 0.1, 0)); bag.height += H * 0.6; }
    }
    return bag;
  }
  // Bamboo palisade (Jianye c. 212: walls of bamboo, gates of woven wattle).
  function palisade(len, H) {
    const bag = new Bag(), n = Math.max(2, Math.floor(len / 0.03));
    for (let k = 0; k < n; k++) bag.at('han_bamboo', cyl(0.008, 0.01, H * (0.9 + 0.2 * r()), 5), -len / 2 + (k + 0.5) * (len / n), H / 2, 0);
    bag.at('wood', box(len, 0.012, 0.02), 0, H * 0.75, 0.01);
    return bag;
  }

  // ------------------------------------------------------------ ruins (Luoyang burnt 190, Chang'an sacked 195)
  function ruinPalace(w, d, ph) {
    const bag = new Bag();
    for (const [f, y] of [[1, 0], [0.8, 1], [0.6, 2]]) bag.at(y === 2 ? BU : E, box(w * f, ph, d * f), 0, ph * (y + 0.5), 0);
    const top = ph * 3, u = Math.min(w, d);
    for (let k = 0; k < 30; k++) { const hh = rr(0.02, 0.09); bag.at('dark', cyl(0.008, 0.01, hh, 5), rr(-0.28, 0.28) * w, top + hh / 2, rr(-0.28, 0.28) * d); } // charred column stumps
    for (let k = 0; k < 10; k++) bag.at('dark', box(rr(0.06, 0.16) * u, 0.01, 0.012), rr(-0.25, 0.25) * w, top + 0.01, rr(-0.25, 0.25) * d, rr(0, 3)); // fallen beams
    for (let k = 0; k < 8; k++) bag.at('plaster', box(rr(0.04, 0.1) * u, rr(0.02, 0.05), 0.01), rr(-0.3, 0.3) * w, top + 0.02, rr(-0.3, 0.3) * d, rr(0, 3)); // wall stubs
    return bag;
  }
  function rubble(n, R) { const bag = new Bag(); for (let k = 0; k < n; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * R; bag.at(r() < 0.5 ? BU : E, new THREE.IcosahedronGeometry(rr(0.02, 0.045), 0).scale(1, 0.45, 1), Math.cos(a) * d, 0.004, Math.sin(a) * d); } return bag; }

  // ------------------------------------------------------------ boats
  HC.warship = function (len) { // 蒙冲: long hull, covered deck house
    const bag = new Bag(), hull = box(len, len * 0.09, len * 0.2).toNonIndexed(), p = hull.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (len / 2); p.setZ(i, p.getZ(i) * (1 - 0.55 * x * x)); if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * 0.6); }
    hull.computeVertexNormals(); bag.add('han_hull', hull, T(0, len * 0.02, 0));
    bag.at('han_hull', box(len * 0.6, len * 0.08, len * 0.14), 0, len * 0.1, 0);
    bag.merge(hipRoof(len * 0.55, len * 0.13, len * 0.06, { overhang: len * 0.02 }), T(0, len * 0.14, 0));
    return bag;
  };
  HC.boat = function (len) { const bag = new Bag(); bag.at('han_hull', box(len, len * 0.07, len * 0.26), 0, len * 0.02, 0); bag.at('han_sail', new THREE.PlaneGeometry(len * 0.45, len * 0.55), 0, len * 0.34, 0); return bag; };

  // ------------------------------------------------------------ plan helpers
  const inPoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const edgeInfo = (a, b, poly) => { // outward normal of edge a→b and its compass side
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    let nx = dz / l, nz = -dx / l; if (inPoly(mx + nx * 0.01, mz + nz * 0.01, poly)) { nx = -nx; nz = -nz; }
    return { a, b, len: l, nx, nz, side: Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'e' : 'w') : nz > 0 ? 's' : 'n' };
  };
  const edgesOf = (poly) => poly.map((a, i) => edgeInfo(a, poly[(i + 1) % poly.length], poly));

  // Walls, corner towers and gates along a closed outline (local units). Returns the gates.
  function ring(bag, poly, gatesSpec, P) {
    const edges = edgesOf(poly), gatesOut = [], gateAt = new Map();
    const gw = gateWidth(P.passages, P.H);
    for (const side of ['n', 's', 'e', 'w']) { // gates spread along the longest edge facing that way
      const n = (gatesSpec && gatesSpec[side]) || 0; if (!n) continue;
      const e = edges.filter((q) => q.side === side).sort((u, v) => v.len - u.len)[0]; if (!e) continue;
      gateAt.set(e, Array.from({ length: n }, (_, k) => (k + 1) / (n + 1)));
    }
    for (const e of edges) {
      const ry = Math.atan2(e.nx, e.nz); // local +z → outward
      const put = (b, t) => bag.merge(b, RT(ry, e.a[0] + (e.b[0] - e.a[0]) * t, P.y0, e.a[1] + (e.b[1] - e.a[1]) * t));
      const ts = gateAt.get(e) || [];
      let t0 = 0;
      for (const [c0, c1] of [...ts.map((t) => [t - gw / 2 / e.len, t + gw / 2 / e.len]), [1, 1]]) {
        const L = (c0 - t0) * e.len;
        if (L > 0.02) put(P.palisade ? palisade(L, P.H) : wallRun(L, P.H, P.base, P.top, { mat: P.mat }), (t0 + c0) / 2);
        t0 = c1;
      }
      for (const t of ts) {
        put(P.palisade ? palisade(gw * 0.5, P.H * 0.9) : gate(P.passages, P.H, P.base, { mat: P.mat, storeys: P.rank === 'capital' ? 2 : 1, tower: P.rank !== 'fort', detail: !P.lite, ruined: P.ruined }), t);
        gatesOut.push({ x: e.a[0] + (e.b[0] - e.a[0]) * t, z: e.a[1] + (e.b[1] - e.a[1]) * t, nx: e.nx, nz: e.nz, side: e.side, top: P.y0 + P.H * 1.05, w: gw });
      }
      if (!P.palisade) { // corner tower
        const cm = RT(ry, e.a[0], P.y0, e.a[1]);
        bag.merge(wallRun(P.base * 1.3, P.H * 1.08, P.base * 1.3, P.top * 1.6, { mat: P.mat, parapet: false }), cm);
        if (P.rank !== 'fort' && !P.ruined) bag.merge(hall(P.base * 0.8, P.base * 0.8, P.H * 0.4, { roofH: P.H * 0.32, base: 0.004, detail: false }), cm.clone().multiply(T(0, P.H * 1.08, 0)));
      }
    }
    return gatesOut;
  }

  // ------------------------------------------------------------ the city
  // o: { def (cities.json entry), x, y, z (pad centre), scale, lod: 'full'|'lite', sink, groundAt(x, z), wetAt(x, z) }
  // groundAt/wetAt take world coordinates; wetAt < 0 means inside a river or lake.
  const PROTO = {};
  HC.build = function (scene, o) {
    const def = o.def, s = o.scale, lite = o.lod === 'lite', rank = def.rank;
    const rot = ((def.rotation || 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
    // the whole plan (walls, streets, houses) is built unrotated and the city turned as one (Chengdu: −15°)
    const L = (p) => [p[0] * s, p[1] * s]; // km plan → local units
    const root = new THREE.Group(); root.position.set(o.x, o.y, o.z); root.rotation.y = -rot; scene.add(root);
    root.updateMatrix(); const rootM = root.matrix.clone();
    const toW = (x, z) => [o.x + x * cs - z * sn, o.z + x * sn + z * cs]; // local → world
    const yAt = (x, z) => (o.groundAt ? Math.max(-0.2, o.groundAt(...toW(x, z)) - o.y) : 0); // local ground height
    const wet = (x, z) => (o.wetAt ? o.wetAt(...toW(x, z)) : 9);
    const bag = new Bag();
    const H = rank === 'capital' ? 0.3 : rank === 'fort' ? 0.16 : 0.22;
    const ruined = def.state === 'ruined';
    const P = { y0: 0, rank, lite, ruined, passages: def.passages || 1, palisade: def.wallType === 'palisade', mat: E, H, base: H * 1.5, top: H * 0.5 };
    const outline = def.outline.map(L);
    const gates = ring(bag, outline, def.gates, P);
    const subs = (def.sub || []).map((sb) => ({ ...sb, poly: sb.outline.map(L) }));
    for (const sb of subs) gates.push(...ring(bag, sb.poly, sb.gates, { ...P, passages: 1 }));
    const polys = [outline, ...subs.map((sb) => sb.poly)];
    const inside = (x, z) => polys.some((pl) => inPoly(x, z, pl));
    const anchors = { gates, palace: null, labels: [] }, extras = [];

    // moat: one polyline per run of consecutive edges on the named sides, offset outward with mitred corners
    const moat = [];
    if (def.moat) {
      const es = edgesOf(outline), n = es.length, on = es.map((e) => def.moat.sides.includes(e.side));
      const w = Math.max(0.1, def.moat.width * s), off = P.base * 0.75 + w / 2 + 0.05;
      const start = on.every(Boolean) ? 0 : on.findIndex((v, i) => v && !on[(i + n - 1) % n]);
      if (start >= 0) {
        let run = null;
        const corner = (e1, e2) => { const mx = e1.nx + e2.nx, mz = e1.nz + e2.nz, l = Math.hypot(mx, mz) || 1, c = (mx / l) * e2.nx + (mz / l) * e2.nz; return [e2.a[0] + (mx / l) * off / Math.max(0.5, c), e2.a[1] + (mz / l) * off / Math.max(0.5, c)]; };
        for (let k = 0; k <= n; k++) {
          const i = (start + k) % n, e = es[i];
          if (k < n && on[i]) {
            if (!run) { run = { w, pts: [] }; const prev = es[(i + n - 1) % n]; run.pts.push(on[(i + n - 1) % n] && on.every(Boolean) ? corner(prev, e) : [e.a[0] + e.nx * off, e.a[1] + e.nz * off]); }
            const next = es[(i + 1) % n];
            run.pts.push(on[(i + 1) % n] ? corner(e, next) : [e.b[0] + e.nx * off, e.b[1] + e.nz * off]);
          } else if (run) { moat.push(run); run = null; }
        }
        if (run) moat.push(run);
      }
    }
    // que before the main gate: the southern gate nearest the axis
    const main = gates.filter((g) => g.side === 's').sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0] || gates[0];
    const moatOn = (side) => def.moat && def.moat.sides.includes(side);
    // que placed explicitly (Chang'an: at Weiyang palace's east and north gates, not at a city gate)
    const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    for (const q of def.queAt || []) { const [qx, qz] = L(q.at), [nx, nz] = FACE[q.face] || FACE.s; bag.merge(quePair(def.que || 'official', H * 2.2, H), RT(Math.atan2(nx, nz), qx, P.y0, qz)); }
    if (main && def.que && def.que !== 'none' && !def.queAt) { const d = moatOn(main.side) ? P.base * 0.75 + Math.max(0.1, def.moat.width * s) + 0.4 : P.base * 1.05 + 0.12; bag.merge(quePair(def.que, main.w * 1.25, H), RT(Math.atan2(main.nx, main.nz), main.x + main.nx * d, P.y0, main.z + main.nz * d)); }

    for (const g of gates) if (moatOn(g.side) && polys.length && inPoly(g.x - g.nx * 0.2, g.z - g.nz * 0.2, outline)) {
      const w = Math.max(0.1, def.moat.width * s), L = P.base * 0.75 + w + 0.3;
      bag.add('wood', box(0.12, 0.02, L), RT(Math.atan2(g.nx, g.nz), g.x + g.nx * (L / 2 + P.base * 0.3), P.y0 + 0.02, g.z + g.nz * (L / 2 + P.base * 0.3)));
    }
    // occupancy for placing houses: walls, avenues, palaces and features block cells
    const occupied = [];
    const block = (x, z, w, d) => occupied.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
    const free = (x, z, w, d) => [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2], [x + w / 2, z + d / 2]].every(([a, b]) => inside(a, b)) && !occupied.some(([a, b, c, e]) => x + w / 2 > a && x - w / 2 < b && z + d / 2 > c && z - d / 2 < e);
    for (const pl of polys) for (const e of edgesOf(pl)) for (let t = 0; t <= 1; t += Math.min(0.5, 0.1 / e.len)) block(e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t, P.base * 1.5, P.base * 1.5);
    // avenues from each gate straight in until they leave the walls
    const aw = 0.1, axial = new Set();
    for (const side of ['n', 's', 'e', 'w']) { // one avenue per side, from the gate nearest the middle of that side
      const gs = gates.filter((g) => g.side === side); if (!gs.length) continue;
      axial.add(gs.sort((a, b) => Math.abs(side === 'n' || side === 's' ? a.x : a.z) - Math.abs(side === 'n' || side === 's' ? b.x : b.z))[0]);
    }
    for (const g of gates) {
      if (!axial.has(g)) { for (let q = 0; q < 0.5; q += aw) block(g.x - g.nx * q, g.z - g.nz * q, aw * 1.8, aw * 1.8); continue; }
      const tx = -g.nx, tz = -g.nz; let k = 0.1;
      while (k < 40 && inside(g.x + tx * (k + 0.1), g.z + tz * (k + 0.1))) k += 0.1;
      if (k < 0.3) continue;
      bag.add('han_street', box(aw, 0.004, k), RT(Math.atan2(tx, tz), g.x + (tx * k) / 2, P.y0 + 0.003, g.z + (tz * k) / 2));
      for (let q = 0; q < k; q += aw) block(g.x + tx * q, g.z + tz * q, aw * 1.8, aw * 1.8);
    }

    // palaces on rammed-earth platforms, or their burnt ruins
    for (const pl of def.palaces || []) {
      const [px, pz] = L(pl.at), w = pl.size[0] * s, d = pl.size[1] * s, ph = 0.025 * (pl.platform || 1.5);
      block(px, pz, w, d);
      if (pl.ruined || def.state === 'ruined') {
        bag.merge(ruinPalace(w * 0.5, d * 0.4, ph), T(px, P.y0, pz));
        bag.merge(rubble(lite ? 10 : 50, Math.min(w, d) * 0.45), T(px, P.y0, pz));
        for (const [cx, cz, ww, dd] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, 0, d], [w / 2, 0, 0, d]]) // the compound wall, broken
          for (let k = 0; k < 8; k++) if (r() < 0.55) { const t = (k + 0.5) / 8 - 0.5; bag.at(BU, box(ww ? ww / 10 : 0.02, rr(0.02, 0.06), dd ? dd / 10 : 0.02), px + cx + t * ww, P.y0 + 0.02, pz + cz + t * dd); }
        anchors.palace = anchors.palace || { x: px, y: P.y0 + ph * 3 + 0.3, z: pz };
      } else {
        for (const [f, k] of [[1, 0], [0.8, 1]]) bag.at(E, box(w * 0.7 * f, ph, d * 0.7 * f), px, P.y0 + ph * (k + 0.5), pz);
        for (const [ww, dd, x, z] of [[w, 0.02, 0, -d / 2], [w, 0.02, 0, d / 2], [0.02, d, -w / 2, 0], [0.02, d, w / 2, 0]]) { bag.at('plaster', box(ww, 0.05, dd), px + x, P.y0 + 0.025, pz + z); bag.at('ridge', box(ww + 0.01, 0.01, dd + 0.01), px + x, P.y0 + 0.055, pz + z); }
        const k = Math.min(1.5, Math.max(1, w / 1.2));
        const mainHall = hall(w * 0.42, d * 0.24, 0.11 * k, { roofH: 0.08 * k, base: 0.01, detail: !lite });
        bag.merge(mainHall, T(px, P.y0 + ph * 2, pz - d * 0.08));
        bag.merge(hall(w * 0.26, d * 0.13, 0.07, { roofH: 0.05, base: 0.006, detail: !lite }), T(px, P.y0 + ph, pz + d * 0.26));
        if (!lite) for (const sx of [-1, 1]) bag.merge(hall(d * 0.3, w * 0.1, 0.06, { gable: true, roofH: 0.035, base: 0.006, detail: false }), RT(sx * Math.PI / 2, px + sx * w * 0.36, P.y0, pz));
        anchors.palace = anchors.palace || { x: px, y: P.y0 + ph * 2 + mainHall.height + 0.1, z: pz };
      }
    }
    // features (history.md)
    // move a satellite town or fort off the water: across the river (twin towns face the city over it) or back
    // toward the city (a fort on the same bank)
    const moveDry = (x, z, w, d, across) => {
      const l = Math.hypot(x, z) || 1, ux = x / l, uz = z / l, dry = (x, z) => [[0, 0], [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].every(([a, b]) => wet(x + a, z + b) > 0.25);
      if (across) { for (let k = 0; k < 80 && !dry(x, z); k++) { x += ux * 0.15; z += uz * 0.15; } return [x, z]; }
      // same bank: nearest dry spot around the plan position that does not overlap the walls
      const clear = (a, b) => !polys.some((pl) => pl.some(([px, pz]) => Math.abs(px - a) < w / 2 + 0.3 && Math.abs(pz - b) < d / 2 + 0.3) || inPoly(a, b, pl));
      for (let t = 0; t < 5; t += 0.15) for (let k = 0; k < 16; k++) { const a = x + Math.cos(k * 0.3927) * t, b = z + Math.sin(k * 0.3927) * t; if (dry(a, b) && clear(a, b)) return [a, b]; }
      return [x, z];
    };
    const hillShape = (w, d, hh) => { // a natural knoll: displaced dome, wider foot
      const g = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.18 * Math.sin(x * 5 + z * 3) * Math.cos(z * 4 - x * 2); p.setXYZ(i, x * n * (1.25 - 0.35 * y), Math.pow(y, 1.4), z * n * (1.25 - 0.35 * y)); }
      g.scale(w / 2, hh, d / 2); g.computeVertexNormals(); return g;
    };
    const rect = (cx, cz, w, d) => [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
    const towns = [];
    for (const f of def.features || []) {
      let [fx, fz] = f.at ? L(f.at) : [0, 0];
      const fw = f.size ? f.size[0] * s : 0, fd = f.size ? f.size[1] * s : 0;
      if (f.type === 'platform') {
        const hh = 0.05 * f.height, y = yAt(fx, fz);
        if (f.oval) bag.add(E, cyl(1, 1.15, hh, 20).scale(fw / 2, 1, fd / 2), T(fx, y + hh / 2, fz)); else bag.at(E, box(fw, hh, fd), fx, y + hh / 2, fz);
        bag.merge(hall(Math.min(fw, fd) * 0.5, Math.min(fw, fd) * 0.4, 0.06, { roofH: 0.045, detail: false }), T(fx, y + hh, fz));
        block(fx, fz, fw, fd); anchors.labels.push({ name: f.name, x: fx, y: y + hh + 0.25, z: fz });
      } else if (f.type === 'coveredWay') {
        const [ax, az] = L(f.from), [bx, bz] = L(f.to), len = Math.hypot(bx - ax, bz - az), cw = new Bag();
        for (let t = -len / 2; t <= len / 2; t += 0.1) for (const e of [-0.03, 0.03]) cw.at('dark', box(0.01, 0.1, 0.01), e, 0.05, t);
        cw.at('wood', box(0.08, 0.01, len), 0, 0.1, 0);
        bag.merge(cw, RT(Math.atan2(bx - ax, bz - az), (ax + bx) / 2, P.y0, (az + bz) / 2)); block((ax + bx) / 2, (az + bz) / 2, 0.12, len);
      } else if (f.type === 'granary') {
        for (let k = 0; k < (lite ? 2 : 6); k++) bag.merge(granary(0.05, 0.08), T(fx + (k % 3) * 0.14, P.y0, fz + Math.floor(k / 3) * 0.14));
        block(fx + 0.14, fz + 0.07, 0.45, 0.32);
      } else if (f.type === 'garden') {
        block(fx, fz, fw, fd); extras.push({ type: 'grove', x: fx, z: fz, w: fw, d: fd });
      } else if (f.type === 'market') {
        block(fx, fz, 0.7, 0.5);
        for (let k = 0; k < (lite ? 0 : 14); k++) bag.merge(gableRoof(0.09, 0.06, 0.03), T(fx + rr(-0.3, 0.3), P.y0 + 0.05, fz + rr(-0.2, 0.2)));
      } else if (f.type === 'mound' || f.type === 'hill') {
        const hh = 0.12 * f.height, y = yAt(fx, fz);
        bag.add(f.type === 'hill' ? HILL : ED, f.type === 'hill' ? hillShape(fw * 1.3, fd * 1.3, hh) : new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(fw / 2, hh, fd / 2), T(fx, y - 0.01, fz));
        if (f.type === 'hill') extras.push({ type: 'grove', x: fx, z: fz, w: fw * 0.9, d: fd * 0.9, y: y + hh * 0.6, sparse: true });
        if (f.terrace) bag.merge(hall(0.2, 0.16, 0.06, { roofH: 0.05, detail: false }), T(fx, y + hh * 0.97, fz));
        block(fx, fz, fw, fd); anchors.labels.push({ name: f.name, x: fx, y: y + hh + 0.25, z: fz });
      } else if (f.type === 'twinTown') {
        [fx, fz] = moveDry(fx, fz, fw, fd, true);
        const poly = rect(fx, fz, fw, fd), y = yAt(fx, fz);
        ring(bag, poly, { n: 1, s: 1, e: 1 }, { ...P, y0: y, rank: 'county', passages: 1, H: H * 0.8, base: H * 1.2, top: H * 0.4 });
        towns.push({ poly, y }); polys.push(poly); for (const e of edgesOf(poly)) for (let t = 0; t <= 1; t += Math.min(0.5, 0.1 / e.len)) block(e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t, H * 1.8, H * 1.8);
        anchors.labels.push({ name: f.name, x: fx, y: y + 0.5, z: fz });
      } else if (f.type === 'hillFort') {
        [fx, fz] = moveDry(fx, fz, fw * 1.6, fd * 1.6, false);
        const hh = 0.45, y = yAt(fx, fz);
        bag.add(HILL, hillShape(fw * 1.7, fd * 1.7, hh), T(fx, y - 0.02, fz));
        extras.push({ type: 'grove', x: fx, z: fz, w: fw * 1.5, d: fd * 1.5, sparse: true });
        const poly = rect(fx, fz, fw * 0.7, fd * 0.7);
        ring(bag, poly, { e: 1 }, { ...P, y0: y + hh * 0.72, rank: 'fort', passages: 1, H: 0.14, base: 0.2, top: 0.07 });
        bag.merge(tower(3, 0.12, 0.08), T(fx - fw * 0.15, y + hh * 0.9, fz));
        anchors.labels.push({ name: f.name, x: fx, y: y + hh + 0.5, z: fz });
      } else if (f.type === 'watchtower') {
        bag.merge(tower(4, 0.12, 0.085), T(fx, P.y0, fz)); block(fx, fz, 0.2, 0.2);
      } else if (f.type === 'blockade') {
        extras.push({ type: 'ships', kind: 'war', x: fx, z: fz, n: f.ships });
      } else if (f.type === 'harbour') {
        extras.push({ type: 'harbour', dir: { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[f.side] });
      } else if (f.type === 'ironworks') {
        for (let k = 0; k < 4; k++) bag.at('dark', new THREE.ConeGeometry(0.04, 0.08, 8), fx + k * 0.1, P.y0 + 0.04, fz);
        extras.push({ type: 'smoke', x: fx + 0.15, z: fz }); block(fx + 0.15, fz, 0.5, 0.2);
      } else if (f.type === 'bridges') {
        extras.push({ type: 'bridges', side: f.side, n: f.count });
      }
    }

    // houses: packed rows of courtyard compounds facing south; ruined cities keep only some
    const key = lite ? 'lite' : 'full';
    const proto = (PROTO[key] = PROTO[key] || [...HOUSES.map(([w, d], k) => (lite ? houseLite(w, d) : house(w, d, { gateX: k % 2 ? -0.2 : 0.2, watchtower: k === 3 })).grouped()), shell(0.52, 0.42).grouped()]);
    const hs = 0.55, placed = proto.map(() => []), SHELL = HOUSES.length, slots = [];
    const all = polys.flat(), xs = all.map((p) => p[0]), zs = all.map((p) => p[1]);
    for (let z = Math.min(...zs); z < Math.max(...zs); z += 0.44 * hs + 0.05) {
      for (let x = Math.min(...xs) + rr(0, 0.1); x < Math.max(...xs); ) {
        const k = Math.floor(r() * HOUSES.length), w = HOUSES[k][0] * hs, d = HOUSES[k][1] * hs, cx = x + w / 2, cz = z + d / 2;
        if (free(cx, cz, w + 0.04, d + 0.04)) {
          const tw = towns.find((t) => inPoly(cx, cz, t.poly));
          slots.push({ k, cx, cz, w, d, y: tw ? tw.y : P.y0 });
          block(cx, cz, w + 0.03, d + 0.03); x += w + rr(0.02, 0.06);
        } else x += 0.08;
      }
    }
    // Re-settled in part (Luoyang and Chang'an in 219, def.houses < 1): the wards in use cluster round the palaces
    // still standing, the markets and the gates; the rest of the walled area is orchards and open ground.
    const fill = def.houses ?? 1;
    if (!ruined && fill < 1) {
      const hubs = [...(def.palaces || []).filter((p) => !p.ruined).map((p) => L(p.at)), ...(def.features || []).filter((f) => f.type === 'market').map((f) => L(f.at)), ...gates.map((g) => [g.x, g.z])];
      const score = (x, z) => -Math.min(...hubs.map(([hx, hz]) => Math.hypot(x - hx, z - hz))) + 0.3 * (Math.sin(x * 1.7 + z * 0.4) + Math.sin(z * 2.1 - x * 0.8));
      slots.forEach((q) => (q.v = score(q.cx, q.cz)));
      const order = [...slots].sort((a, b) => b.v - a.v), nHouse = Math.round(slots.length * fill);
      order.forEach((q, i) => { if (i < nHouse) placed[q.k].push([q.cx, q.cz, 0, hs, q.y]); else if (i < nHouse + (slots.length - nHouse) * 0.35) extras.push({ type: 'grove', x: q.cx, z: q.cz, w: q.w, d: q.d, sparse: true }); });
    } else for (const q of slots) {
      // Luoyang 196: "the palaces all burnt, the officials cut back the thorns and camped among the walls"
      const v = r();
      if (!ruined || v < 0.1) placed[q.k].push([q.cx, q.cz, 0, hs, q.y]); else if (v < 0.45) placed[SHELL].push([q.cx, q.cz, 0, hs, P.y0]); else if (v < 0.6) extras.push({ type: 'grove', x: q.cx, z: q.cz, w: q.w, d: q.d, sparse: true });
    }
    if (ruined) for (let k = 0; k < (lite ? 20 : 120); k++) { const x = rr(Math.min(...xs), Math.max(...xs)), z = rr(Math.min(...zs), Math.max(...zs)); if (free(x, z, 0.1, 0.1)) bag.merge(rubble(4, 0.1), T(x, P.y0, z)); }

    // emit: the full city gets its own meshes; far cities go to the shared sink (docs/decisions/0005)
    if (o.sink) o.sink.static.merge(bag, rootM); else bag.meshes(root);
    const m4 = (x, z, ry, sc, y) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sc, Math.min(1, sc * 1.5), sc));
    placed.forEach((list, k) => {
      if (!list.length) return;
      if (o.sink) { const b = (o.sink.inst['han:' + key + ':' + k] = o.sink.inst['han:' + key + ':' + k] || { proto: proto[k], mats: [] }); for (const [x, z, ry, sc, y] of list) b.mats.push(m4(x, z, ry, sc, y).premultiply(rootM)); return; }
      const im = new THREE.InstancedMesh(proto[k].geo, proto[k].mats, list.length);
      list.forEach(([x, z, ry, sc, y], i) => im.setMatrixAt(i, m4(x, z, ry, sc, y)));
      im.castShadow = im.receiveShadow = true; root.add(im);
    });
    // anchors and extras leave in world coordinates (y absolute)
    const W = (a) => { const [x, z] = toW(a.x, a.z); return { ...a, x, z, y: a.y !== undefined ? a.y + o.y : undefined }; };
    const Wn = (a) => ({ ...W(a), nx: a.nx * cs - a.nz * sn, nz: a.nx * sn + a.nz * cs, top: a.top + o.y });
    root.userData.anchors = {
      gates: anchors.gates.map(Wn), palace: anchors.palace && W(anchors.palace), labels: anchors.labels.map(W),
      extras: extras.map((e) => { const out = e.x !== undefined ? W(e) : { ...e }; if (e.dir) out.dir = [e.dir[0] * cs - e.dir[1] * sn, e.dir[0] * sn + e.dir[1] * cs]; return out; }),
      moat: moat.map((m) => ({ w: m.w, y: o.y + 0.012, pts: m.pts.map(([x, z]) => toW(x, z)) })),
      H, houses: placed.reduce((a, l) => a + l.length, 0),
    };
    return root;
  };

  // Moats as water ribbons (same material and uv convention as Terrain.waterBodies: uv.x across the stream).
  HC.moatGeometry = function (roots) {
    const pos = [], uv = [], ind = [];
    for (const c of roots) for (const m of c.userData.anchors.moat) {
      const p = m.pts, base = pos.length / 3, y = m.y, hw = m.w / 2;
      for (let k = 0; k < p.length; k++) {
        const a = p[Math.max(0, k - 1)], b = p[Math.min(p.length - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
        pos.push(p[k][0] + nx * hw, y, p[k][1] + nz * hw, p[k][0] - nx * hw, y, p[k][1] - nz * hw);
        uv.push(0, k, 1, k);
        if (k) { const q = base + (k - 1) * 2; ind.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      }
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aSilt', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
    g.setIndex(ind); g.computeVertexNormals();
    return g;
  };
})();
