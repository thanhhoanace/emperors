// Battle scene (src/world/battle.js): a siege at 1 unit = 1 m, the approved siege prototype as a game module
// (docs/design/prototypes/siege/sg-siege.js, sg-camp.js, sg-main.js; contract: docs/design/visual-build.md §5).
// The city comes from its entry in data/cities.json (outline in km, x east, z south → metres; gates per side, passages,
// khuyết, moat, river, palaces, features, houses fraction, rank) under the Eastern Han rules of docs/decisions/0006:
// rammed-earth walls with a low crenellated parapet and mã diện, flat-topped timber gate passages under timber towers,
// straight grey tile roofs, red columns, white walls, no curved eaves, no brick, no barbicans. Bigger cities are
// compressed to a Total War scale (a county town stays 1:1) so a capital still reads bigger and a walk from the gate to
// the hall stays one scene. The armies come from the troop counts (one block per ~1,000 men; the drawn figures are
// capped per quality tier and each group scaled by the same ratio), the engines from the infantry, the boats from the
// marines when the city has a river, the camp on the attacker's side; fire, smoke, arrows and stones only in an
// assault. Everything is code and seeded (an LCG, no Math.random); no textures are loaded. Classic script (decision
// 0002), three r146 global; the land is a `L` interface (visual-build.md §2) and is never read from a fixed layout.
//   Battle.siege(desc, deps) → { group, tick(dt), views, labels(), focus(cam), stats(), dispose(), trees, land, city, camp }
//   desc = { attacker: { fid, color, glyph, name, troops: { bo, ky, thuy } }, defender: { … }, city: cities.json entry + { id },
//           ground: L | spec (→ Nature.land), season, hour, mode: 'assault' | 'stand' | 'camp', result?: 'win' | 'loss',
//           side?: 'n' | 's' | 'e' | 'w' (the attacker's side; default from the land's camp, else south) }
//   deps = { HM (HanModels.create), Nature, Crowd?, env, sun, q (quality tier), renderer, camera? }
//   views: approach, gate, wall, camp, field, result → { target, cam, fov, shadow: [x, z, ext], ao }
//   trees: [x, z, species, height] for Nature.trees(L, env, sun, extra) (courtyard and orchard trees inside the walls)
//   Battle.Crowd.create({ HM, colors, q }) is the static stand-in for src/world/crowd.js (visual-build.md §4), used when
//   deps.Crowd is absent: the same add(kind, list) / group / tick / focus / count / stats / dispose; per kind the fine
//   figure near the camera given to focus() (shadowed nearest), a box figure beyond. One crowd is made per faction
//   (colors = { [fid]: hex }), so the rows need no faction. focus(cam) re-sorts them: call it when the view changes.
//   Budget (0005, tiers high / mid / low): figures 4,000 / 2,500 / 1,200 in all; wards 48 / 24 / 12; fire and smoke
//   are instanced camera-facing quads (four draw calls); PointLights 3 / 1 / 0; low skips the camp's stores and yards.
//   Battle.plan(cityDef) → { S, D, poly, half } (the scale and outline in metres; the harness sizes the land with it).
//   Battle.landSpec(desc) → { river, hills, cityR, campSide } for Nature.land when the integrator builds the land.
(function () {
  const B = (window.Battle = {});
  const T = THREE, BGU = THREE.BufferGeometryUtils, KS = 30; // kit units → metres
  const lcg = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647); // the prototype's seeded random
  const hex = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const yawTo = (dx, dz) => Math.atan2(-dz, dx); // the yaw that turns a model's +x toward (dx, dz)
  const TIER = { high: { figures: 4000, wards: 48, fx: 1, lights: 3 }, mid: { figures: 2500, wards: 24, fx: 0.6, lights: 1 }, low: { figures: 1200, wards: 12, fx: 0.35, lights: 0 } };
  const SIDE_VI = { n: 'Bắc', s: 'Nam', e: 'Đông', w: 'Tây' }, DIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  const tierOf = (q) => { const t = typeof q === 'string' ? q : q && q.tier; return TIER[t] ? t : 'high'; };

  // ---------------------------------------------------------------- plan geometry (metres, x east, z south)
  const inPoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  // the edges of a closed outline, each turned so its outward normal is (-dz, dx): then a kit built along local x with
  // the outside at local +z lands on the edge through P.xf(geo, [a.x, 0, a.z], [0, ry, 0])
  const edgesOf = (poly) => poly.map((p, i) => {
    let a = p, b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    let nx = -dz, nz = dx;
    if (inPoly((a[0] + b[0]) / 2 + nx * 0.5, (a[1] + b[1]) / 2 + nz * 0.5, poly)) { [a, b] = [b, a]; dx = -dx; dz = -dz; nx = -nx; nz = -nz; }
    return { a, b, len, dx, dz, nx, nz, ry: Math.atan2(-dz, dx), side: Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'e' : 'w') : nz > 0 ? 's' : 'n', i };
  });
  // the outline moved inward by d (each edge's line offset, consecutive lines intersected)
  const insetPoly = (poly, d) => {
    const E = edgesOf(poly), n = poly.length, out = [];
    for (let i = 0; i < n; i++) {
      const e1 = E[(i + n - 1) % n], e2 = E[i], p1 = [e1.a[0] - e1.nx * d, e1.a[1] - e1.nz * d], p2 = [e2.a[0] - e2.nx * d, e2.a[1] - e2.nz * d], den = e1.dx * e2.dz - e1.dz * e2.dx;
      if (Math.abs(den) < 1e-6) out.push([poly[i][0] - e2.nx * d, poly[i][1] - e2.nz * d]);
      else { const t = ((p2[0] - p1[0]) * e2.dz - (p2[1] - p1[1]) * e2.dx) / den; out.push([p1[0] + e1.dx * t, p1[1] + e1.dz * t]); }
    }
    return out;
  };
  // the city's scale: a county town at 1:1, bigger cities compressed so the longest side is 420 · (km / 0.42)^0.35 m
  B.plan = (def) => {
    const ox = def.outline.map((p) => p[0]), oz = def.outline.map((p) => p[1]);
    const Lkm = Math.max(Math.max(...ox) - Math.min(...ox), Math.max(...oz) - Math.min(...oz));
    const S = Math.min(1000, (420 * Math.pow(Lkm / 0.42, 0.35)) / Lkm), rot = ((def.rotation || 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
    const poly = def.outline.map((p) => [(p[0] * cs - p[1] * sn) * S, (p[0] * sn + p[1] * cs) * S]);
    const half = Math.max(...poly.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
    return { S, D: Lkm * S, rot, poly, half, bbox: [Math.min(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[1]))] };
  };
  B.landSpec = (desc) => { const p = B.plan(desc.city); return { river: desc.city.river ? desc.city.river.sides[0] : null, hills: null, cityR: p.half + 30, campSide: desc.side || 's' }; };

  // ---------------------------------------------------------------- rammed earth: courses of the formwork, 9 cm layers, rain streaks, a damp foot, grass on top
  const earthMaterial = (env, N) => {
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMap: env, envMapIntensity: 0.4 });
    mat.extensions = { derivatives: true };
    mat.onBeforeCompile = (sh) => {
      N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 p = vWP; float side = 1. - smoothstep(.55, .85, abs(vWN.y));
          float course = floor(p.y / 1.15), ct = h12(vec2(course, floor((p.x + p.z) / 3.2)));
          float layers = sin(p.y * 69.8) * fadeFreq(p, 11.);
          float streak = smoothstep(.45, .85, vn3(vec3(p.x * .35, p.y * .05, p.z * .35)));
          float n = vn3(p * .8) * fadeFreq(p, .8) + .5 * (1. - fadeFreq(p, .8));
          vec3 c = diffuseColor.rgb * (.9 + .14 * ct) * (1. - .05 * layers * side) * (1. - .22 * streak * side) * (.9 + .2 * n);
          c *= mix(.72, 1., smoothstep(1.5, 4., p.y));
          float top = smoothstep(.8, .95, vWN.y) * smoothstep(.42, .7, fbm2(p.xz / 13.) * .75 + vn2(p.xz * .7) * .25);
          c = mix(c, vec3(.16, .19, .07) * (.8 + .4 * n), top * .8);
          diffuseColor.rgb = c; }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hb = sin(vWP.y * 69.8) * .012 * fadeFreq(vWP, 11.) + vn3(vWP * 1.3) * .05 * fadeFreq(vWP, 1.3); normal = bumpN(normal, -vViewPosition, hb); }`);
    };
    mat.customProgramCacheKey = () => 'bt-earth';
    return mat;
  };

  // ---------------------------------------------------------------- people, horses, engines (metres, facing +x)
  const soldier = (P, fc, pose) => {
    const k = P.kit(), skin = 0xc79a74, dark = 0x2a221d, iron = 0x4b4f55;
    const lean = pose === 'pull' ? -0.35 : pose === 'run' ? 0.25 : pose === 'fight' ? 0.12 : 0, armed = pose === 'spear' || pose === 'run' || pose === 'fight' || pose === 'idle';
    for (const z of [-0.12, 0.12]) k.add(P.rbox(0.16, 0.85, 0.16, 0), dark, [pose === 'run' || pose === 'fight' ? (z > 0 ? 0.18 : -0.15) : 0, 0.42, z]);
    k.add(P.lathe([[0, 0.72], [0.3, 0.72], [0.24, 1.0], [0, 1.02]], 6), fc, [0, 0, 0]);
    k.add(P.lathe([[0, 0.98], [0.23, 0.98], [0.26, 1.3], [0.16, 1.48], [0, 1.5]], 6), P.shade(fc, -0.25), [0, 0, 0], [0, 0, 0], [0.85, 1, 1.15]);
    k.add(P.sph(0.12, 6, 4), skin, [0.02, 1.62, 0]);
    k.add(P.cone(0.15, 0.2, 6), pose === 'bow' ? 0x8f7440 : iron, [0, 1.74, 0]);
    if (armed) { k.add(P.cyl(0.025, 0.025, 3.4, 3), 0x4a3423, [0.25, 1.5, 0.28], [0, 0, pose === 'run' ? -0.7 : pose === 'fight' ? -1.2 : 0.08]); k.add(P.rbox(0.07, 0.95, 0.6, 0), P.shade(fc, -0.45), [0.28, 1.05, -0.22]); }
    if (pose === 'bow') { k.add(new T.TorusGeometry(0.62, 0.025, 3, 8, Math.PI * 0.9), 0x3a2a1c, [0.28, 1.3, -0.15], [0, 0, -Math.PI * 0.45]); k.add(P.rbox(0.6, 0.12, 0.12, 0), P.shade(fc, -0.1), [0.35, 1.32, -0.15]); }
    if (pose === 'climb') for (const z of [-0.2, 0.2]) k.add(P.rbox(0.12, 0.6, 0.12, 0), P.shade(fc, -0.1), [0.1, 1.75, z]);
    if (pose === 'pull') for (const z of [-0.18, 0.18]) k.add(P.rbox(0.6, 0.12, 0.12, 0), P.shade(fc, -0.1), [0.35, 1.2, z]);
    const g = k.geo(); if (lean) g.applyMatrix4(new T.Matrix4().makeRotationZ(-lean));
    return g;
  };
  const rider = (P, fc) => {
    const k = P.kit(), coat = 0x5a3a24;
    k.add(P.rbox(2.1, 0.8, 0.7, 0.3), coat, [0, 1.35, 0]); k.add(P.rbox(0.45, 0.9, 0.4, 0.2), coat, [1.05, 1.9, 0], [0, 0, -0.6]); k.add(P.rbox(0.7, 0.3, 0.3, 0.2), coat, [1.45, 2.2, 0], [0, 0, 0.5]);
    for (const [x, z] of [[0.75, 0.22], [0.75, -0.22], [-0.75, 0.22], [-0.75, -0.22]]) k.add(P.rbox(0.14, 1.0, 0.14, 0), P.shade(coat, -0.3), [x, 0.5, z]);
    k.add(P.rbox(0.9, 0.12, 0.8, 0), fc, [0, 1.8, 0]);
    k.add(P.lathe([[0, 1.8], [0.25, 1.8], [0.26, 2.4], [0.15, 2.55], [0, 2.56]], 6), P.shade(fc, -0.2), [0, 0, 0], [0.85, 1, 1.1]);
    k.add(P.sph(0.12, 6, 4), 0xc79a74, [0, 2.68, 0]); k.add(P.cone(0.15, 0.22, 6), 0x4b4f55, [0, 2.82, 0]);
    k.add(P.cyl(0.025, 0.025, 3.6, 3), 0x4a3423, [0.6, 2.6, 0.3], [0, 0, -0.9]);
    return k.geo();
  };
  const horse = (P) => { // a standing horse, painted pale: the instance colour gives the coat
    const k = P.kit(), c = 0xa89c88, dk = 0x2a221c;
    k.add(P.rbox(1.9, 0.78, 0.62, 0.4), c, [0, 1.32, 0]);
    k.add(P.rbox(0.42, 0.85, 0.34, 0.35), c, [1.0, 1.62, 0], [0, 0, -0.95]);
    k.add(P.rbox(0.66, 0.27, 0.25, 0.35), c, [1.5, 1.72, 0], [0, 0, -1.15]);
    k.add(P.rbox(0.62, 0.1, 0.08, 0), dk, [0.92, 1.9, 0], [0, 0, -0.95]);
    for (const [x, z] of [[0.72, 0.19], [0.72, -0.19], [-0.72, 0.19], [-0.72, -0.19]]) k.add(P.rbox(0.13, 1.02, 0.13, 0), c, [x, 0.51, z]);
    k.add(P.rbox(0.12, 0.72, 0.1, 0), dk, [-1.02, 1.08, 0], [0, 0, -0.3]);
    return k.geo();
  };
  const trebuchet = (P) => { // 霹靂車: a traction trebuchet — two trestles, an axle, the throwing arm cocked back
    const k = P.kit(), wood = 0x6a4a30, dk = 0x4a3222;
    k.add(P.rbox(7, 0.5, 0.5, 0), dk, [0, 0.25, 2]); k.add(P.rbox(7, 0.5, 0.5, 0), dk, [0, 0.25, -2]); k.add(P.rbox(0.5, 0.5, 4.5, 0), dk, [3, 0.25, 0]); k.add(P.rbox(0.5, 0.5, 4.5, 0), dk, [-3, 0.25, 0]);
    for (const z of [-2, 2]) { k.add(P.rbox(0.45, 7.2, 0.45, 0), wood, [-1.6, 3.4, z], [0, 0, -0.42]); k.add(P.rbox(0.45, 7.2, 0.45, 0), wood, [1.6, 3.4, z], [0, 0, 0.42]); }
    k.add(P.cyl(0.3, 0.3, 4.6, 6), dk, [0, 6.6, 0], [Math.PI / 2, 0, 0]);
    k.add(new T.BoxGeometry(11, 0.4, 0.4).translate(-2.5, 0, 0), wood, [0, 6.6, 0], [0, 0, 0.5]); // arm: long end down at the back
    k.add(P.rbox(0.9, 0.9, 0.9, 0.2), 0x7a7266, [-7.4, 1.4, 0]); // the stone in its sling
    for (const z of [-0.6, 0, 0.6]) k.add(new T.BoxGeometry(0.05, 4.4, 0.05), 0x2c2016, [2.6 * Math.cos(0.5), 6.6 + 2.6 * Math.sin(0.5) - 2.2, z]); // pull ropes
    return k.geo();
  };
  const ram = (P) => { // 轒轀: a wheeled shed roofed with hides, the log inside
    const k = P.kit(), wood = 0x5a3c26, hide = 0x6e5236;
    k.add(P.rbox(9, 0.5, 3.6, 0), wood, [0, 1.0, 0]);
    for (const x of [-3.5, 3.5]) for (const z of [-1.9, 1.9]) k.add(P.cyl(0.8, 0.8, 0.35, 10), 0x3a2618, [x, 0.8, z], [Math.PI / 2, 0, 0]);
    for (const x of [-4, 0, 4]) for (const z of [-1.6, 1.6]) k.add(P.rbox(0.3, 3, 0.3, 0), wood, [x, 2.5, z]);
    for (const s of [-1, 1]) k.add(P.rbox(9.4, 0.2, 2.6, 0), hide, [0, 4.1, s * 1.0], [s * 0.72, 0, 0]);
    k.add(P.cyl(0.35, 0.4, 10, 8), 0x6a4a2c, [1.2, 2.1, 0], [0, 0, Math.PI / 2]);
    return k.geo();
  };
  const jinglan = (P) => { // 井闌: a wheeled tower for archers, a shielded platform on top
    const k = P.kit(), wood = 0x654630;
    for (const x of [-2.6, 2.6]) for (const z of [-2.6, 2.6]) k.add(P.rbox(0.45, 15, 0.45, 0), wood, [x, 7.5, z]);
    for (let y = 2; y < 15; y += 3.2) { k.add(P.rbox(5.6, 0.3, 0.3, 0), wood, [0, y, 2.6]); k.add(P.rbox(5.6, 0.3, 0.3, 0), wood, [0, y, -2.6]); k.add(P.rbox(0.3, 0.3, 5.6, 0), wood, [2.6, y, 0]); k.add(P.rbox(0.3, 0.3, 5.6, 0), wood, [-2.6, y, 0]); k.add(P.rbox(0.25, 4.2, 0.25, 0), wood, [0, y + 1.6, 2.6], [0, 0, 0.9]); }
    k.add(P.rbox(6.6, 0.4, 6.6, 0), wood, [0, 15, 0]);
    for (const [x, z, ry] of [[0, 3.2, 0], [0, -3.2, 0], [3.2, 0, Math.PI / 2], [-3.2, 0, Math.PI / 2]]) k.add(P.rbox(6.6, 1.6, 0.25, 0), 0x7a5a3c, [x, 16, z], [0, ry, 0]);
    for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) k.add(P.cyl(0.7, 0.7, 0.3, 8), 0x3a2618, [x, 0.7, z], [Math.PI / 2, 0, 0]);
    return k.geo();
  };
  const ladder = (P, len) => { const k = P.kit(), w = 0x6a4a30; for (const z of [-0.45, 0.45]) k.add(P.rbox(0.18, len, 0.18, 0), w, [0, len / 2, z]); for (let y = 0.5; y < len; y += 0.6) k.add(P.rbox(0.12, 0.1, 0.9, 0), w, [0, y, 0]); return k.geo(); };
  const mantlet = (P) => { const k = P.kit(); k.add(P.rbox(0.25, 2.4, 3.2, 0), 0x6d5036, [0, 1.2, 0], [0, 0, 0.18]); k.add(P.rbox(1.6, 0.15, 0.15, 0), 0x4a3222, [-0.7, 0.9, 0], [0, 0, -0.8]); return k.geo(); };

  // instances of one geometry: rows [x, y, z, yaw, sx, sy, sz, pitch, roll, tint]. Every InstancedMesh on the kit's
  // material carries instance colours (white by default): three r146 keeps one program per material and does not
  // recompile between meshes with and without them, so a mix would drop the tints (or the figures' shading)
  const M4 = new T.Matrix4(), Q4 = new T.Quaternion(), EU = new T.Euler(), V3 = new T.Vector3(), SC = new T.Vector3(), C3 = new T.Color();
  // three r146 culls an InstancedMesh by its geometry's sphere at the mesh origin, so instances laid out in world
  // coordinates vanish whenever the origin leaves the view: each mesh gets a view of the geometry (the same buffers)
  // with a sphere round all its instances, and is culled (and left out of the shadow pass) as a whole
  const bounded = (geo, list) => {
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const g = new T.BufferGeometry(); if (geo.index) g.setIndex(geo.index); for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, sm = 1;
    for (const p of list) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); sm = Math.max(sm, p[4] ?? 1, p[5] ?? 1, p[6] ?? 1); }
    const c = new T.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.boundingSphere = new T.Sphere(c, Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + (geo.boundingSphere.center.length() + geo.boundingSphere.radius) * sm);
    return g;
  };
  const inst = (geo, material, list, shadow = true) => {
    const m = new T.InstancedMesh(list.length ? bounded(geo, list) : geo, material, list.length);
    list.forEach((p, i) => {
      m.setMatrixAt(i, M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromEuler(EU.set(p[7] || 0, p[3] || 0, p[8] || 0, 'YXZ')), SC.set(p[4] ?? 1, p[5] ?? p[4] ?? 1, p[6] ?? p[4] ?? 1)));
      m.setColorAt(i, C3.setRGB(...(p[9] || [1, 1, 1])));
    });
    m.castShadow = shadow; m.receiveShadow = true; return m;
  };
  // banners: a canvas cloth per faction and glyph, instanced poles and cloths; rows [x, y, z, yaw, size?] (a general's
  // standard is the same banner scaled up, so a faction's banners are two draw calls)
  const bannerCloth = (cache, fc, glyph) => {
    const key = fc + glyph; if (cache[key]) return cache[key];
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const g = cv.getContext('2d'), css = '#' + new T.Color(fc).getHexString();
    g.fillStyle = css; g.fillRect(0, 0, 64, 128); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, 64, 10); g.fillRect(0, 118, 64, 10);
    g.fillStyle = '#efe3c8'; g.font = 'bold 44px "Noto Serif TC","Noto Serif CJK TC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 32, 64);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
    return (cache[key] = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0x505050, side: T.DoubleSide, roughness: 0.85 })); // a little light through the cloth: never a black flag against the sun
  };
  const banners = (cache, list, fc, glyph) => {
    const g = new T.Group(); if (!list.length) return g;
    const pole = new T.CylinderGeometry(0.06, 0.07, 6, 4).translate(0, 3, 0), cloth = new T.PlaneGeometry(1.4, 2.6, 4, 1), cp = cloth.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) + 0.7) * 3) * 0.12); cloth.computeVertexNormals(); cloth.translate(0.72, 4.55, 0);
    const rows = list.map((p) => [p[0], p[1], p[2], p[3] || 0, p[4] || 1]);
    const pm = new T.InstancedMesh(bounded(pole, rows), new T.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }), list.length), cm = new T.InstancedMesh(bounded(cloth, rows), bannerCloth(cache, fc, glyph), list.length), Y = new T.Vector3(0, 1, 0);
    rows.forEach((p, i) => { M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromAxisAngle(Y, p[3]), SC.setScalar(p[4])); pm.setMatrixAt(i, M4); cm.setMatrixAt(i, M4); });
    pm.castShadow = cm.castShadow = true; g.add(pm, cm); return g;
  };

  // far figures: a few boxes in the same colours (legs, coat, head, the spear), ~40 triangles against ~190
  const loFigure = (P, fc, kind) => {
    const k = P.kit(), skin = 0xc79a74, dark = 0x2a221d, B3 = (w, h, d) => new T.BoxGeometry(w, h, d);
    if (kind === 'horse' || kind === 'rider') {
      const coat = kind === 'horse' ? 0xa89c88 : 0x5a3a24;
      k.add(B3(2.0, 0.8, 0.62), coat, [0, 1.33, 0]); k.add(B3(0.5, 0.95, 0.36), coat, [1.05, 1.75, 0], [0, 0, -0.7]);
      k.add(B3(1.6, 0.95, 0.4), P.shade(coat, -0.3), [0, 0.5, 0]);
      if (kind === 'rider') { k.add(B3(0.44, 0.8, 0.5), fc, [0, 2.15, 0]); k.add(new T.OctahedronGeometry(0.16), skin, [0, 2.66, 0]); k.add(B3(0.05, 3.4, 0.05), 0x4a3423, [0.6, 2.6, 0.3], [0, 0, -0.9]); }
      return k.geo();
    }
    const lean = kind === 'pull' ? -0.35 : kind === 'run' ? 0.25 : kind === 'fight' ? 0.12 : 0;
    k.add(B3(0.38, 0.85, 0.3), dark, [0, 0.42, 0]);
    k.add(new T.CylinderGeometry(0.17, 0.27, 0.8, 4, 1), fc, [0, 1.1, 0], [0, Math.PI / 4, 0]);
    k.add(new T.OctahedronGeometry(0.15), skin, [0.02, 1.62, 0]);
    if (kind === 'spear' || kind === 'run' || kind === 'fight' || kind === 'idle') { k.add(B3(0.05, 3.4, 0.05), 0x4a3423, [0.25, 1.5, 0.28], [0, 0, kind === 'run' ? -0.7 : kind === 'fight' ? -1.2 : 0.08]); k.add(B3(0.07, 0.95, 0.6), P.shade(fc, -0.45), [0.28, 1.05, -0.22]); }
    const g = k.geo(); if (lean) g.applyMatrix4(new T.Matrix4().makeRotationZ(-lean));
    return g;
  };

  // ---------------------------------------------------------------- the static crowd (the stand-in for crowd.js, §4)
  // One faction per crowd (colors = { [fid]: hex }). Per kind three InstancedMeshes on HM.mat: the fine figure casting a
  // shadow within 0.55 NEAR metres of the camera given to focus(), the fine figure without one out to NEAR, the box
  // figure (no shadow) beyond; focus() re-sorts the rows between them (a view change, not every frame). Rows [x, y, z, yaw, anim?, phase?, fid?].
  const NEAR = { high: 180, mid: 140, low: 100 };
  const COATS = [[0.62, 0.38, 0.22], [0.8, 0.44, 0.24], [0.2, 0.18, 0.17], [1.05, 1.02, 0.98], [0.9, 0.74, 0.5], [0.42, 0.27, 0.17], [0.62, 0.38, 0.22], [0.42, 0.27, 0.17]];
  B.Crowd = {
    create(o) {
      const HM = o.HM, P = HM.parts, tier = tierOf(o.q), near = NEAR[tier];
      const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
      const fc = hex(o.colors && (o.colors.coat ?? Object.values(o.colors)[0])) ?? 0x8a7a55;
      const lists = {}, meshes = {}, group = new T.Group(); let count = 0, dirty = false, eye = null, laid = null;
      const hiGeo = (kind) => (kind === 'rider' ? rider(P, fc) : kind === 'horse' ? horse(P) : soldier(P, fc, kind));
      const add = (kind, list) => { const l = lists[kind] || (lists[kind] = []); for (const p of list) l.push(p); count += list.length; dirty = true; };
      const tint = (kind, i) => (kind === 'horse' ? COATS[Math.floor(h2(i, 3) * COATS.length)] : ((b) => [b, b, b])(0.82 + 0.3 * h2(i, 7)));
      const make = (geo, n, shadow) => {
        const m = new T.InstancedMesh(geo, HM.mat, n);
        for (let i = 0; i < n; i++) m.setColorAt(i, C3.setRGB(1, 1, 1)); // instance colours from creation (the r146 trap)
        m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; group.add(m); return m;
      };
      const build = () => {
        if (!dirty) return; dirty = false; laid = null;
        for (const [kind, list] of Object.entries(lists)) {
          const cur = meshes[kind];
          if (cur && cur.cap >= list.length) continue;
          if (cur) for (const m of [cur.hi, cur.mid, cur.lo]) { group.remove(m); m.dispose(); }
          const g = cur ? cur.geos : [hiGeo(kind), loFigure(P, fc, kind)];
          meshes[kind] = { cap: list.length, geos: g, hi: make(g[0], list.length, true), mid: make(g[0], list.length, false), lo: make(g[1], list.length, false) };
        }
      };
      // sort the rows between the fine and the box figures by their distance from the eye (no eye: all fine)
      const layout = () => {
        build();
        if (laid && eye && laid.distanceTo(eye) < 8) return; laid = eye ? eye.clone() : null;
        for (const [kind, list] of Object.entries(lists)) {
          const { hi, mid, lo } = meshes[kind], n = [0, 0, 0];
          list.forEach((p, i) => {
            const d = eye ? Math.hypot(p[0] - eye.x, p[1] - eye.y, p[2] - eye.z) : 0, band = d < near * 0.55 ? 0 : d < near ? 1 : 2, m = [hi, mid, lo][band], j = n[band]++;
            m.setMatrixAt(j, M4.compose(V3.set(p[0], p[1], p[2]), Q4.setFromEuler(EU.set(0, p[3] || 0, 0, 'YXZ')), SC.set(1, 1, 1)));
            m.setColorAt(j, C3.setRGB(...tint(kind, i)));
          });
          [hi, mid, lo].forEach((m, k) => { m.count = n[k]; m.visible = n[k] > 0; });
          for (const m of [hi, mid, lo]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
        }
      };
      const focus = (cam) => { const p = cam && (cam.isVector3 ? cam : cam.position); eye = p ? p.clone() : null; layout(); };
      const dispose = () => { for (const { hi, mid, lo, geos } of Object.values(meshes)) { for (const m of [hi, mid, lo]) { group.remove(m); m.dispose(); } geos.forEach((g) => g.dispose()); } };
      const stats = () => { let fine = 0, shadow = 0, box = 0; for (const { hi, mid, lo } of Object.values(meshes)) { shadow += hi.count; fine += hi.count + mid.count; box += lo.count; } return { figures: count, fine, shadow, box, kinds: Object.keys(meshes).length, animated: false }; };
      return { group, add, flush: layout, tick: () => { if (dirty) layout(); }, focus, get count() { return count; }, stats, dispose };
    },
  };

  // ---------------------------------------------------------------- the city from data/cities.json
  const buildCity = (ctx) => {
    const { HM, L, env, N, tier, def, desc } = ctx, P = HM.parts, C = P.C, rnd = lcg(11), group = new T.Group();
    const E = P.kit(), Bk = P.kit(); // E: rammed earth (the earth material), Bk: buildings (the kit's material)
    const capital = def.rank === 'capital', H = capital ? 12 : 10, WB = capital ? 30 : 26, WT = capital ? 10 : 9, cw = 34; // wall height, base and top width, corner bastion
    const earth = 0x9a7d5a, earthDark = 0x84694c, burnt = 0x5a4a3c, paving = 0x7d776d, KSv = [KS, KS, KS];
    const plan = B.plan(def), { S, rot } = plan, cs = Math.cos(rot), sn = Math.sin(rot);
    // everything is built in plan space (metres, unrotated, the city centre at the origin) and the two meshes turned by
    // the plan's rotation at the end (Chengdu: N30°E); the land is sampled at world positions
    const toW = (x, z) => [x * cs - z * sn, x * sn + z * cs], rotV = (dx, dz) => [dx * cs - dz * sn, dx * sn + dz * cs];
    const gY = (x, z) => L.h(...toW(x, z)), G0 = gY(0, 0);
    const polyP = def.outline.map((p) => [p[0] * S, p[1] * S]), edges = edgesOf(polyP), nE = edges.length;
    const put = (geo, p, r, s) => Bk.push(P.xf(geo, p, r, s));
    const crenel = (k, x, y, z, ry) => k.add(P.rbox(2.1, 1.1, 1.25, 0), earthDark, [x, y, z], [0, ry || 0, 0]);
    // one run of wall from s0 to s1 (local x) at z = 0, outside +z: battered body, walkway, earthen parapet with crenels
    const run = (k, s0, s1, y0) => {
      const len = s1 - s0, cx = (s0 + s1) / 2; if (len < 3) return;
      const sh = new T.Shape(); sh.moveTo(-WB / 2, -3); sh.lineTo(WB / 2, -3); sh.lineTo(WT / 2, H); sh.lineTo(-WT / 2, H); sh.lineTo(-WB / 2, -3);
      k.add(new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(len / 2, 0, 0), earth, [cx, y0, 0]);
      k.add(P.rbox(len, 1.5, 1.2, 0), earthDark, [cx, y0 + H + 0.75, WT / 2 - 0.6]);
      const n = Math.floor(len / 3.6);
      for (let i = 0; i < n; i++) crenel(k, s0 + (i + 0.5) * (len / n), y0 + H + 2.05, WT / 2 - 0.6);
      k.add(P.rbox(len, 0.9, 0.8, 0), earthDark, [cx, y0 + H + 0.45, -WT / 2 + 0.4]);
      // ụ nhô (mã diện): one on a run over 90 m, every ~150 m on a long one
      const nm = len > 90 ? Math.max(1, Math.round(len / 150)) : 0;
      for (let i = 0; i < nm; i++) { const s = s0 + ((i + 0.5) * len) / nm; k.add(P.rbox(16, H + 3, 24, 0.05), earth, [s, y0 + (H - 3) / 2, WB / 2 - 4]); for (let j = 0; j < 4; j++) crenel(k, s - 6 + j * 4, y0 + H + 0.55, WB / 2 + 7.2); }
    };
    // the gatehouse at local x = s: a wider earth block, flat-topped passages under timber, doors, the timber tower
    const pass = clamp(def.passages || 1, 1, 3), gwOf = 34 + (pass - 1) * 12;
    const gateAt = (k, b, s, y0, main, doors) => {
      const gw = gwOf, pw = main ? 6.5 : 5.5, ph = 7.2;
      k.add(P.rbox(gw, H + 3.5, WB + 6, 0.04), earth, [s, y0 + (H + 0.5 - 3) / 2, 0]);
      for (let i = 0; i < pass; i++) {
        const x = s + (i - (pass - 1) / 2) * (pw + 3);
        b.add(P.rbox(pw, ph, WB + 6.4, 0), 0x0e0a07, [x, y0 + ph / 2, 0]);
        for (const sz of [-1, 1]) { b.add(P.rbox(pw + 2.2, 0.9, 0.8, 0.2), 0x3a2414, [x, y0 + ph + 0.45, sz * (WB / 2 + 3.2)]); for (const sx of [-1, 1]) b.add(P.rbox(0.8, ph, 0.8, 0.2), 0x3a2414, [x + sx * (pw / 2 + 0.4), y0 + ph / 2, sz * (WB / 2 + 3.2)]); }
        if (doors) for (const sx of [-1, 1]) b.add(P.rbox(0.35, ph * 0.95, pw * 0.5, 0.2), 0x4a2211, [x + sx * pw * 0.42, y0 + ph * 0.47, WB / 2 + 1.5], [0, sx * 0.7, 0]);
      }
      b.push(P.xf(P.pavilion({ w: 0.9 + (pass - 1) * 0.3, d: 0.5, h: 0.2, storeys: main ? 3 : 2, rh: 0.17, base: 0.02, ov: 0.08, tiles: 0.028 }), [s, y0 + H + 0.5, 0], [0, 0, 0], KSv));
    };
    // a khuyết pair: the mother tower with one child stepping down on its outer side (二出阙, a governor) or two (三出阙, the emperor)
    const queGeo = (kids) => {
      const k = P.kit();
      k.add(P.rbox(0.1, 0.03, 0.08, 0.3), C.base, [0, 0.015, 0]);
      k.add(P.rbox(0.07, 0.24, 0.055, 0.12), C.plaster, [0, 0.15, 0]); k.add(P.rbox(0.085, 0.025, 0.07, 0.3), C.bracket, [0, 0.28, 0]);
      k.push(P.xf(P.roof(0.12, 0.1, 0.05, { tiles: 0 }), [0, 0.292, 0]));
      let x = 0.06, h = 0.14, w = 0.05;
      for (let i = 0; i < kids; i++) { k.add(P.rbox(w, h, 0.04, 0.12), C.plaster, [x, h / 2 + 0.03, 0]); k.add(P.rbox(w + 0.01, 0.02, 0.05, 0.3), C.bracket, [x, h + 0.04, 0]); k.push(P.xf(P.roof(w + 0.03, 0.07, 0.035, { tiles: 0 }), [x, h + 0.05, 0])); x += w * 0.9; h *= 0.75; w *= 0.85; }
      return k.geo();
    };
    // gates spread along the longest edge facing each side; the main gate is the south one nearest the axis
    const gateOn = new Map();
    for (const side of ['n', 's', 'e', 'w']) {
      const n = (def.gates && def.gates[side]) || 0; if (!n) continue;
      const e = edges.filter((q) => q.side === side).sort((u, v) => v.len - u.len)[0]; if (!e) continue;
      gateOn.set(e, Array.from({ length: n }, (_, k) => (k + 1) / (n + 1)));
    }
    const groundAlong = (e) => { let y = -1e9; for (let i = 0; i <= 8; i++) { const t = i / 8; y = Math.max(y, gY(e.a[0] + e.dx * e.len * t - e.nx * 2, e.a[1] + e.dz * e.len * t - e.nz * 2)); } return y; };
    for (const e of edges) e.y0 = groundAlong(e);
    const gatesP = [];
    for (const e of edges) {
      const ts = (gateOn.get(e) || []).map((t) => t * e.len).sort((a, b) => a - b);
      for (const s of ts) gatesP.push({ e, s, side: e.side, t: s / e.len, y0: e.y0 });
    }
    const south = gatesP.filter((g) => g.side === 's').sort((a, b) => Math.abs(a.t - 0.5) - Math.abs(b.t - 0.5))[0];
    const main = south || gatesP[0]; if (main) main.main = true;
    // the assaulted gate: on the attacker's side, nearest that side's middle; without one, the gate whose way out best faces that side
    const side = ctx.side, sd = DIR[side];
    const onSide = gatesP.filter((g) => g.side === side).sort((a, b) => Math.abs(a.t - 0.5) - Math.abs(b.t - 0.5));
    const attack = onSide[0] || gatesP.slice().sort((a, b) => (b.e.nx * sd[0] + b.e.nz * sd[1]) - (a.e.nx * sd[0] + a.e.nz * sd[1]))[0] || null;
    if (attack) attack.attacked = true;
    const win = desc.result === 'win';
    for (const e of edges) {
      const k = P.kit(), b = P.kit(), ts = gatesP.filter((g) => g.e === e).map((g) => g.s), cut = cw * 0.4;
      let s = cut;
      for (const [g0, g1] of [...ts.map((t) => [t - gwOf / 2, t + gwOf / 2]), [e.len - cut, e.len]]) { run(k, s, Math.min(g0, e.len - cut), e.y0); s = g1; }
      for (const g of gatesP.filter((q) => q.e === e)) gateAt(k, b, g.s, e.y0, !!g.main, !(win && g.attacked));
      if (k.n) E.push(P.xf(k.geo(), [e.a[0], 0, e.a[1]], [0, e.ry, 0]));
      if (b.n) Bk.push(P.xf(b.geo(), [e.a[0], 0, e.a[1]], [0, e.ry, 0]));
    }
    // corner bastions with two-storey towers: turned to the incoming edge's outward side, crenels on the two outer faces
    polyP.forEach((v, i) => {
      const e1 = edges[(i + nE - 1) % nE], e2 = edges[i], y0 = Math.max(e1.y0, e2.y0), k = P.kit();
      k.add(P.rbox(cw, H + 4, cw, 0.04), earth, [0, y0 + (H + 1 - 3) / 2, 0]);
      const sx = e2.nx * e1.dx + e2.nz * e1.dz >= 0 ? 1 : -1;
      for (let j = 0; j < 8; j++) { const u = -15 + j * 4.3; crenel(k, u, y0 + H + 1.55, cw / 2 - 0.6); crenel(k, sx * (cw / 2 - 0.6), y0 + H + 1.55, u, Math.PI / 2); }
      E.push(P.xf(k.geo(), [v[0], 0, v[1]], [0, e1.ry, 0]));
      put(P.pavilion({ w: 0.55, d: 0.55, h: 0.17, storeys: 2, rh: 0.14, ov: 0.07, tiles: 0.028 }), [v[0], y0 + H + 1, v[1]], [0, e1.ry, 0], KSv);
    });
    // the gates in world coordinates, each with its way out, and the bridge over the moat where the land has one
    const gates = gatesP.map((g) => {
      const e = g.e, px = e.a[0] + e.dx * g.s, pz = e.a[1] + e.dz * g.s, [x, z] = toW(px, pz), out = rotV(e.nx, e.nz), tan = rotV(e.dx, e.dz);
      const G = { x, z, px, pz, out, tan, side: g.side, t: g.t, y0: g.y0, towerY: g.y0 + H + 0.5, main: !!g.main, attacked: !!g.attacked, gw: gwOf, ry: e.ry - rot, moat: null, bridgeY: g.y0 - 0.3, edge: e };
      let w0 = -1, w1 = -1;
      for (let v = WB / 2 + 2; v < 260; v += 1) { const sd = L.waterSD(x + out[0] * v, z + out[1] * v); if (w0 < 0 && sd < 0) w0 = v; else if (w0 >= 0 && sd > 0) { w1 = v; break; } }
      if (w0 >= 0 && w1 > w0) {
        G.moat = [w0, w1];
        const br = P.kit(), bz0 = w0 - 5, bz1 = w1 + 5, y = G.bridgeY;
        br.add(P.rbox(9, 0.7, bz1 - bz0, 0.2), 0x5a3a22, [0, y, (bz0 + bz1) / 2]);
        for (let zz = bz0 + 4; zz < bz1; zz += 8) for (const sx of [-1, 1]) br.add(P.rbox(0.6, 7, 0.6, 0), 0x3d2717, [sx * 4, y - 3.3, zz]);
        for (const sx of [-1, 1]) br.add(P.rbox(0.25, 1.1, bz1 - bz0, 0), 0x5a3a22, [sx * 4.3, y + 0.9, (bz0 + bz1) / 2]);
        Bk.push(P.xf(br.geo(), [px, 0, pz], [0, e.ry, 0]));
      }
      return G;
    });
    // the khuyết pair before the main gate
    if (main && def.que && def.que !== 'none') {
      const e = main.e, kids = def.que === 'imperial' ? 2 : 1, qg = queGeo(kids), qk = P.kit();
      for (const sx of [-1, 1]) qk.push(P.xf(qg.clone(), [main.s + sx * (26 + (pass - 1) * 7), e.y0, WB / 2 + 6], [0, sx < 0 ? Math.PI : 0, 0], [KS * 1.4, KS * 1.4, KS * 1.4])); // ~10 m, as the stone que of Eastern Han
      Bk.push(P.xf(qk.geo(), [e.a[0], 0, e.a[1]], [0, e.ry, 0]));
    }

    // ---------------------------------------------------------------- inside: avenues, the palace, the market, granaries, wards
    const inner = insetPoly(polyP, WB / 2 + 6), inside = (x, z) => inPoly(x, z, inner);
    const blocks = [], block = (x0, x1, z0, z1) => blocks.push([x0, x1, z0, z1]);
    const free = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]].every(([a, b]) => inside(a, b)) && !blocks.some(([a, b, c, d]) => x1 > a && x0 < b && z1 > c && z0 < d);
    const inTrees = [], hubs = [], labels = [];
    // palaces: the governor's compound scaled from the prototype's 136 × 117 m (red walls, a gate hall, the main hall on a
    // stepped rammed-earth platform, a rear hall, side houses); a ruined one is a bare burnt platform with charred stumps
    let flagAt = null;
    for (const pl of def.palaces || []) {
      const [px, pz] = [pl.at[0] * S, pl.at[1] * S], w = Math.max(40, pl.size[0] * S), d = Math.max(34, pl.size[1] * S), y0 = gY(px, pz), ruined = pl.ruined || def.state === 'ruined';
      block(px - w / 2 - 6, px + w / 2 + 6, pz - d / 2 - 6, pz + d / 2 + 6); hubs.push([px, pz]);
      const steps = (pl.platform || 1) >= 1.5 ? 2 : 1, stepH = 1.6 * ((pl.platform || 1) >= 2 ? 1.25 : 1);
      labels.push({ text: pl.name, kind: 'thing', p: [px, y0 + 14, pz] });
      if (ruined) {
        E.add(P.rbox(w * 0.7, stepH, d * 0.7, 0.04), earth, [px, y0 + stepH / 2, pz]); E.add(P.rbox(w * 0.55, stepH, d * 0.55, 0.04), burnt, [px, y0 + stepH * 1.5, pz]);
        for (let i = 0; i < 24; i++) { const h = 1 + rnd() * 3; Bk.add(P.cyl(0.35, 0.42, h, 5), 0x1a1410, [px + (rnd() - 0.5) * w * 0.45, y0 + stepH * 2 + h / 2, pz + (rnd() - 0.5) * d * 0.45]); }
        for (let i = 0; i < 6; i++) Bk.add(P.rbox(8 + rnd() * 10, 0.6, 0.7, 0), 0x1a1410, [px + (rnd() - 0.5) * w * 0.4, y0 + stepH * 2 + 0.3, pz + (rnd() - 0.5) * d * 0.4], [0, rnd() * 3, 0]);
        continue;
      }
      const ks = clamp(Math.min(w / 136, d / 117), 0.7, 1.6), KSs = [KS * ks, KS * ks, KS * ks], hw = w / 2, hd = d / 2, gap = 9 * ks;
      for (const [x0, x1, z0, z1] of [[-hw, hw, -hd, -hd], [-hw, -hw, -hd, hd], [hw, hw, -hd, hd], [-hw, -gap, hd, hd], [gap, hw, hd, hd]]) {
        const lx = Math.max(1.2, x1 - x0), lz = Math.max(1.2, z1 - z0);
        Bk.add(P.rbox(lx, 4, lz, 0), 0xa9523a, [px + (x0 + x1) / 2, y0 + 2, pz + (z0 + z1) / 2]); Bk.add(P.rbox(lx + 1, 0.6, lz + 1, 0), 0x3f444c, [px + (x0 + x1) / 2, y0 + 4.2, pz + (z0 + z1) / 2]);
      }
      Bk.add(P.rbox(w - 2, 0.2, d - 2, 0), paving, [px, y0 + 0.1, pz]);
      put(P.pavilion({ w: 0.62, d: 0.3, h: 0.16, rh: 0.12, ov: 0.06, tiles: 0.028 }), [px, y0, pz + hd], [0, 0, 0], KSs);
      for (let i = 0; i < steps; i++) E.add(P.rbox((56 - i * 8) * ks, stepH, (34 - i * 7) * ks, 0.08), earth, [px, y0 + stepH * (i + 0.5), pz - d * 0.07]);
      put(P.pavilion({ w: 1.35, d: 0.62, h: 0.24, rh: 0.26, ov: 0.08, tiles: 0.026 }), [px, y0 + stepH * steps, pz - d * 0.07], [0, 0, 0], KSs);
      if (d > 70) put(P.pavilion({ w: 0.9, d: 0.4, h: 0.18, rh: 0.17, base: 0.04, ov: 0.06, tiles: 0.028 }), [px, y0, pz - d * 0.38], [0, 0, 0], KSs);
      // side halls down both flanks; a big compound (a commandery seat, a palace) gets a row of them and more trees
      if (w > 90) for (const sx of [-1, 1]) for (const f of d > 120 ? [-0.3, 0.115, 0.36] : [0.115]) put(P.house(1.3, 0.3, 0.14, { wall: C.plaster }), [px + sx * w * 0.37, y0, pz + d * f], [0, Math.PI / 2, 0], KSs);
      if (w > 150) for (let i = 0; i < 10; i++) inTrees.push([...toW(px + (rnd() - 0.5) * w * 0.5, pz + d * (0.2 + rnd() * 0.22)), rnd() < 0.4 ? 3 : 0, 8 + rnd() * 5]);
      if (!flagAt) flagAt = [px, y0, pz + hd + 25];
    }
    // features (docs/design/history.md): the market with its tower, granaries, platforms, watchtowers, gardens, mounds
    const fpos = (f) => (f.at ? [f.at[0] * S, f.at[1] * S] : [0, 0]);
    for (const f of def.features || []) {
      const [fx, fz] = fpos(f), fw = f.size ? Math.max(20, f.size[0] * S) : 0, fd = f.size ? Math.max(20, f.size[1] * S) : 0, y0 = gY(fx, fz);
      if (f.type === 'market' && inside(fx, fz)) { // the walled market with its tower (旗亭) and rows of stalls
        const mk = [fx - 28, fx + 28, fz - 28, fz + 28]; block(mk[0] - 4, mk[1] + 4, mk[2] - 4, mk[3] + 4); hubs.push([fx, fz]);
        for (const [x0, x1, z0, z1] of [[mk[0], mk[1], mk[2], mk[2]], [mk[0], mk[1], mk[3], mk[3]], [mk[0], mk[0], mk[2], mk[3]], [mk[1], mk[1], mk[2], mk[3]]]) {
          const lx = Math.max(1, x1 - x0), lz = Math.max(1, z1 - z0); Bk.add(P.rbox(lx, 3, lz, 0), C.plaster, [(x0 + x1) / 2, y0 + 1.5, (z0 + z1) / 2]); Bk.add(P.rbox(lx + 0.8, 0.5, lz + 0.8, 0), 0x3f444c, [(x0 + x1) / 2, y0 + 3.2, (z0 + z1) / 2]);
        }
        put(P.pavilion({ w: 0.3, d: 0.3, h: 0.14, rh: 0.1, storeys: 3, ov: 0.05, tiles: 0.03 }), [fx, y0, fz], [0, 0, 0], KSv);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const x = mk[0] + 10 + c * 36, z = mk[2] + 8 + r * 13; if (Math.abs(x - fx) < 12 && Math.abs(z - fz) < 12) continue; put(P.house(0.55, 0.13, 0.07, { wall: C.plaster2 }), [x, y0, z], [0, 0, 0], KSv); }
        if (f.name) labels.push({ text: f.name, kind: 'thing', p: [fx, y0 + 12, fz] });
      } else if (f.type === 'granary' && inside(fx, fz)) {
        for (let i = 0; i < 6; i++) put(P.granary(0.09), [fx + (i % 3) * 22, y0, fz + Math.floor(i / 3) * 24], [0, 0, 0], KSv);
        block(fx - 12, fx + 56, fz - 12, fz + 36);
      } else if (f.type === 'watchtower' && inside(fx, fz)) {
        E.add(P.rbox(14, 2, 14, 0.1), earth, [fx, y0 + 1, fz]);
        put(P.pavilion({ w: 0.3, d: 0.3, h: 0.14, rh: 0.1, storeys: 4, ov: 0.06, tiles: 0.03 }), [fx, y0 + 2, fz], [0, 0, 0], KSv);
        block(fx - 12, fx + 12, fz - 12, fz + 12);
      } else if (f.type === 'platform' && !f.onWall && inside(fx, fz)) {
        const hh = 1.6 * (f.height || 1), k2 = clamp(Math.min(fw, fd) / 40, 0.6, 1.4);
        E.add(P.rbox(fw, hh, fd, 0.06), earth, [fx, y0 + hh / 2, fz]);
        put(P.pavilion({ w: 0.62, d: 0.34, h: 0.16, rh: 0.13, ov: 0.06, tiles: 0.028 }), [fx, y0 + hh, fz], [0, 0, 0], [KS * k2, KS * k2, KS * k2]);
        block(fx - fw / 2 - 4, fx + fw / 2 + 4, fz - fd / 2 - 4, fz + fd / 2 + 4);
        if (f.name) labels.push({ text: f.name, kind: 'thing', p: [fx, y0 + hh + 12, fz] });
      } else if (f.type === 'garden' && inside(fx, fz)) {
        block(fx - fw / 2, fx + fw / 2, fz - fd / 2, fz + fd / 2);
        for (let i = 0, n = Math.round((fw * fd) / 500); i < n; i++) { const x = fx + (rnd() - 0.5) * fw * 0.9, z = fz + (rnd() - 0.5) * fd * 0.9; if (inside(x, z)) inTrees.push([...toW(x, z), rnd() < 0.3 ? 1 : 0, 7 + rnd() * 5]); }
        if (f.name) labels.push({ text: f.name, kind: 'thing', p: [fx, y0 + 10, fz] });
      } else if (f.type === 'mound' && inside(fx, fz)) {
        E.push(P.xf(P.paint(new T.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), earthDark), [fx, y0 - 0.2, fz], [0, 0, 0], [fw / 2, 3 * (f.height || 1), fd / 2]));
        block(fx - fw / 2, fx + fw / 2, fz - fd / 2, fz + fd / 2);
      }
    }
    // avenues: from the gate nearest the middle of each side straight in, until they leave the walls or meet a compound
    const axial = new Map();
    for (const g of gatesP) { const cur = axial.get(g.side); if (!cur || Math.abs(g.t - 0.5) < Math.abs(cur.t - 0.5)) axial.set(g.side, g); }
    for (const g of axial.values()) {
      const e = g.e, px = e.a[0] + e.dx * g.s, pz = e.a[1] + e.dz * g.s, tx = -e.nx, tz = -e.nz, w = g.main ? 18 : 14;
      let k = WB / 2 + 2;
      while (k < 3000 && inside(px + tx * (k + 4), pz + tz * (k + 4)) && !blocks.some(([a, b, c, d]) => px + tx * (k + 4) > a && px + tx * (k + 4) < b && pz + tz * (k + 4) > c && pz + tz * (k + 4) < d)) k += 4;
      if (k < WB) continue;
      const len = k - WB / 2, mx = px + tx * (WB / 2 + len / 2), mz = pz + tz * (WB / 2 + len / 2);
      Bk.add(P.rbox(w, 0.25, len + 4, 0), paving, [mx, gY(mx, mz) + 0.05, mz], [0, e.ry, 0]);
      for (let q = WB / 2; q < k; q += 8) block(px + tx * q - w * 0.7, px + tx * q + w * 0.7, pz + tz * q - w * 0.7, pz + tz * q + w * 0.7);
      hubs.push([px, pz]);
    }
    // wards: cells of 56 m on a 61 m pitch, walled, four courtyards each; the settled share (houses) clusters round the
    // palace, the market and the gates, the rest is orchard and open ground. The count is capped per quality tier.
    const cell = 56, pitch = 61, pxs = polyP.map((p) => p[0]), pzs = polyP.map((p) => p[1]), bx0 = Math.min(...pxs), bx1 = Math.max(...pxs), bz0 = Math.min(...pzs), bz1 = Math.max(...pzs), cands = [];
    for (let z = bz0 + 6; z + cell < bz1; z += pitch) for (let x = bx0 + 6; x + cell < bx1; x += pitch) if (free(x, x + cell, z, z + cell)) cands.push({ x0: x, x1: x + cell, z0: z, z1: z + cell, cx: x + cell / 2, cz: z + cell / 2 });
    const gateHubs = gatesP.map((g) => [g.e.a[0] + g.e.dx * g.s, g.e.a[1] + g.e.dz * g.s]), allHubs = hubs.concat(gateHubs);
    for (const c of cands) c.v = -(allHubs.length ? Math.min(...allHubs.map(([hx, hz]) => Math.hypot(c.cx - hx, c.cz - hz))) : 0) + 20 * (Math.sin(c.cx * 0.17 + c.cz * 0.04) + Math.sin(c.cz * 0.21 - c.cx * 0.08));
    cands.sort((a, b) => b.v - a.v);
    const fill = (def.houses ?? 1) * (def.state === 'ruined' ? 0.3 : 1), nWard = Math.min(TIER[tier].wards, Math.round(cands.length * fill));
    const ag = attack ? [attack.e.a[0] + attack.e.dx * attack.s, attack.e.a[1] + attack.e.dz * attack.s] : [0, 0];
    const burnCands = [];
    // the wards go into meshes of ~240 m cells (culled by the view and the shadow camera one by one); the house models
    // are made once per kind and copied
    const wardKits = new Map(), wardKit = (x, z) => { const key = Math.floor(x / 240) + ',' + Math.floor(z / 240); if (!wardKits.has(key)) wardKits.set(key, P.kit()); return wardKits.get(key); };
    const models = {}, model = (key, make) => (models[key] || (models[key] = make())).clone();
    cands.forEach((c, i) => {
      const { x0, x1, z0, z1, cx, cz } = c, y0 = gY(cx, cz), W = wardKit(cx, cz);
      if (i >= nWard) { if (i < nWard + (cands.length - nWard) * 0.4) for (let t = 0; t < 3; t++) inTrees.push([...toW(cx + (rnd() - 0.5) * 40, cz + (rnd() - 0.5) * 40), rnd() < 0.3 ? 1 : 0, 6 + rnd() * 5]); return; }
      for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0], [x0, x0, z0, z1], [x1, x1, z0, z1], [x0, cx - 3, z1, z1], [cx + 3, x1, z1, z1]]) {
        const lx = Math.max(0.8, a1 - a0), lz = Math.max(0.8, b1 - b0); W.add(P.rbox(lx, 2.6, lz, 0), C.plaster, [(a0 + a1) / 2, y0 + 1.3, (b0 + b1) / 2]); W.add(P.rbox(lx + 0.6, 0.4, lz + 0.6, 0), 0x4a4f57, [(a0 + a1) / 2, y0 + 2.8, (b0 + b1) / 2]);
      }
      for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const hx = cx + qx * cell * 0.25, hz = cz + qz * cell * 0.25, rich = rnd() < 0.15, w2 = rnd() < 0.35, wallC = w2 ? C.plaster2 : C.plaster, rh = Math.floor(rnd() * 3);
        W.push(P.xf(model('m' + w2 + rh, () => P.house(0.62, 0.2, 0.11 + rh * 0.015, { wall: wallC })), [hx, y0, hz - 8], [0, 0, 0], KSv));
        for (const sx of [-1, 1]) if (rnd() < 0.8) W.push(P.xf(model('s' + w2, () => P.house(0.34, 0.15, 0.09, { wall: wallC })), [hx + sx * 9.5, y0, hz + 2], [0, Math.PI / 2, 0], KSv));
        if (rich) W.push(P.xf(model('t', () => P.pavilion({ w: 0.16, d: 0.16, h: 0.085, rh: 0.07, storeys: 3, ov: 0.04, wall: C.wood, cols: false, tiles: 0 })), [hx + 7, y0, hz + 7], [0, 0, 0], KSv));
        else if (rnd() < 0.6) inTrees.push([...toW(hx + (rnd() - 0.5) * 8, hz + 5), rnd() < 0.3 ? 1 : 0, 7 + rnd() * 4]);
        burnCands.push([hx, y0 + 5, hz - 8, Math.hypot(hx - ag[0], hz - ag[1])]);
      }
    });
    for (const g of Object.values(models)) g.dispose();
    burnCands.sort((a, b) => a[3] - b[3]);
    const burn = burnCands.filter((_, i) => i % 3 === 0).slice(0, 4).map(([x, y, z]) => { const [wx, wz] = toW(x, z); return [wx, y, wz]; });
    if (!flagAt) flagAt = [0, G0, 0];
    // build the two meshes and turn them by the plan's rotation
    const eMesh = new T.Mesh(E.geo(), earthMaterial(env, N)); eMesh.castShadow = true; eMesh.receiveShadow = true; eMesh.rotation.y = -rot;
    const bMesh = new T.Mesh(Bk.geo(), HM.mat); bMesh.castShadow = true; bMesh.receiveShadow = true; bMesh.rotation.y = -rot;
    group.add(eMesh, bMesh);
    const wMeshes = [...wardKits.values()].filter((k) => k.n).map((k) => { const m = new T.Mesh(k.geo(), HM.mat); m.castShadow = tier === 'high'; m.receiveShadow = true; m.rotation.y = -rot; group.add(m); return m; });
    // world-space edges and the two assaulted ones: the gate's and the next one round (the ladders' wall)
    const wEdges = edges.map((e) => ({ a: toW(...e.a), b: toW(...e.b), len: e.len, d: rotV(e.dx, e.dz), n: rotV(e.nx, e.nz), ry: e.ry - rot, y0: e.y0, side: e.side, i: e.i, gates: gatesP.filter((g) => g.e === e).map((g) => g.s) }));
    const attackGate = attack ? gates[gatesP.indexOf(attack)] : null, mainGate = main ? gates[gatesP.indexOf(main)] : null;
    const aEdge = attackGate ? wEdges[attackGate.edge.i] : wEdges.slice().sort((u, v) => (v.n[0] * sd[0] + v.n[1] * sd[1]) - (u.n[0] * sd[0] + u.n[1] * sd[1]))[0];
    const wallEdge = wEdges.filter((e) => e !== aEdge).sort((u, v) => { const du = Math.hypot((u.a[0] + u.b[0]) / 2 - (aEdge.b[0]), (u.a[1] + u.b[1]) / 2 - aEdge.b[1]), dv = Math.hypot((v.a[0] + v.b[0]) / 2 - aEdge.b[0], (v.a[1] + v.b[1]) / 2 - aEdge.b[1]); return du - dv; })[0] || aEdge;
    const fw = toW(flagAt[0], flagAt[2]);
    return { group, gates, attackGate, mainGate, aEdge, wallEdge, edges: wEdges, poly: plan.poly, half: plan.half, D: plan.D, S, rot, flagAt: [fw[0], flagAt[1], fw[1]], H, WB, WT, G0, cw, trees: inTrees, burn, labels: labels.map((l) => { const [x, z] = toW(l.p[0], l.p[2]); return { ...l, p: [x, l.p[1], z] }; }), meshes: [eMesh, bMesh, ...wMeshes], wards: nWard };
  };

  // ---------------------------------------------------------------- the besiegers' camp (營), from sg-camp.js, laid round the camp rectangle
  // Han practice (docs/design/history.md): an earth rampart (壘) with a ditch (塹) outside it, a timber palisade on the
  // rampart, chevaux-de-frise (拒馬) before the gates; no fixed plan. Here: a gate in each side under a timber gate tower,
  // watchtowers at the corners and along the sides, two streets crossing at the command enclosure (中軍: the great tent,
  // the standard, Han drums on poles, weapon racks, the officers' tents), blocks of ridge tents with their cooking fires,
  // the horse lines, the supply depot by the west gate, the engineers' yard, the drill ground with its reviewing platform
  // and archery butts. The ditch is a real cut when the land knows the rectangle (Nature.terrain drops its fragments).
  // The prototype's absolute layout (a 360 × 250 m camp centred at 650, 885) is kept in its own numbers and mapped
  // onto the rectangle through X() and Z(), so the diff against sg-camp.js stays readable.
  const buildCamp = (ctx, out) => {
    const { HM, L, env, N, tier, atk, R, group } = ctx, P = HM.parts, mat = HM.mat, lite = tier === 'low';
    const { x0, x1, z0, z1 } = R, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, GH = L.CAMP_GATE || 6.5;
    const kx = clamp((x1 - x0) / 360, 0.75, 1.25), kz = clamp((z1 - z0) / 250, 0.75, 1.25), X = (x) => cx + (x - 650) * kx, Z = (z) => cz + (z - 885) * kz;
    const y = (x, z) => L.h(x, z), hearths = [], rnd = lcg(11);
    const WOOD = 0x5e4530, DARK = 0x3e2c1e, PLANK = 0x7a5c3e, SHINGLE = 0x4a3b2c, CLOTH = 0x8a7a5e;
    const add = (m) => { group.add(m); return m; };
    const one = (geo, x, z, yaw = 0, dy = 0, material = mat) => { const m = new T.Mesh(geo, material); m.position.set(x, y(x, z) + dy, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
    const V = (a) => new T.Vector3(a[0], a[1], a[2]);
    const poly = (list, pts, o) => { const n = V(pts[1]).sub(V(pts[0])).cross(V(pts[2]).sub(V(pts[0]))), p = n.dot(V(o)) < 0 ? [...pts].reverse() : pts; for (let i = 1; i < p.length - 1; i++) list.push(...p[0], ...p[i], ...p[i + 1]); };
    const flat = (list, hex_) => P.paint(P.tris(list), hex_);
    const hipRoof = (list, w, d, h, y0) => { // eaves w × d at y0, the ridge along the longer side
      if (d > w) { const l2 = []; hipRoof(l2, d, w, h, y0); for (let i = 0; i < l2.length; i += 3) list.push(-l2[i + 2], l2[i + 1], l2[i]); return; }
      const r = (w - d) / 2;
      poly(list, [[-w / 2, y0, d / 2], [w / 2, y0, d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]], [0, 1, 1]);
      poly(list, [[-w / 2, y0, -d / 2], [w / 2, y0, -d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]], [0, 1, -1]);
      for (const sx of [-1, 1]) poly(list, [[sx * w / 2, y0, -d / 2], [sx * w / 2, y0, d / 2], [sx * r, y0 + h, 0]], [sx, 1, 0]);
    };
    // a cloth hip roof: each slope a small grid that sags between the ridge, the hip ropes and the eave (smooth shaded)
    const clothRoof = (w, d, h, y0, sag, hex_, n = 6) => {
      if (d > w) return P.xf(clothRoof(d, w, h, y0, sag, hex_, n), [0, 0, 0], [0, Math.PI / 2, 0]);
      const r = (w - d) / 2, parts = [], faces = [
        [[-w / 2, y0, d / 2], [w / 2, y0, d / 2], [-r, y0 + h, 0], [r, y0 + h, 0]], [[w / 2, y0, -d / 2], [-w / 2, y0, -d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]],
        [[w / 2, y0, d / 2], [w / 2, y0, -d / 2], [r, y0 + h, 0], [r, y0 + h, 0]], [[-w / 2, y0, -d / 2], [-w / 2, y0, d / 2], [-r, y0 + h, 0], [-r, y0 + h, 0]]];
      for (const [E0, E1, R0, R1] of faces) {
        const pos = [], idx = [];
        for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
          const s = i / n, t = j / n, e = [0, 1, 2].map((c) => E0[c] + (E1[c] - E0[c]) * s), rr = [0, 1, 2].map((c) => R0[c] + (R1[c] - R0[c]) * s);
          pos.push(e[0] + (rr[0] - e[0]) * t, e[1] + (rr[1] - e[1]) * t - sag * Math.sin(Math.PI * t) * (0.35 + 0.65 * Math.sin(Math.PI * s)), e[2] + (rr[2] - e[2]) * t);
        }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1); }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const mid = Math.floor(n / 2) * (n + 1) + Math.floor(n / 2); if (g.attributes.normal.getY(mid) < 0) { for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
        parts.push(P.paint(g, hex_));
      }
      return BGU.mergeBufferGeometries(parts);
    };
    // models (metres, +x forward)
    const ridgeTent = (w, d, h, cloth) => { // ridge along x, the door in the +x gable, the ridge pole showing
      const k = P.kit(), a = [], b = [], g = [], e = 0.1;
      poly(a, [[-w / 2, h, 0], [w / 2, h, 0], [w / 2, e, d / 2], [-w / 2, e, d / 2]], [0, 1, 1]);
      poly(a, [[-w / 2, h, 0], [w / 2, h, 0], [w / 2, e, -d / 2], [-w / 2, e, -d / 2]], [0, 1, -1]);
      for (const sx of [-1, 1]) poly(b, [[sx * (w / 2 - 0.15), h - 0.04, 0], [sx * (w / 2 - 0.15), e, d / 2 - 0.08], [sx * (w / 2 - 0.15), e, -d / 2 + 0.08]], [sx, 0, 0]);
      poly(g, [[w / 2 - 0.12, h * 0.7, 0], [w / 2 - 0.12, e, d * 0.19], [w / 2 - 0.12, e, -d * 0.19]], [1, 0, 0]);
      k.push(flat(a, cloth)).push(flat(b, P.shade(cloth, -0.1))).push(flat(g, 0x2e241a));
      k.add(P.cyl(0.05, 0.05, w + 0.5, 4), 0x4a3423, [0, h + 0.03, 0], [0, 0, Math.PI / 2]);
      return k.geo();
    };
    const wallTent = (w, d, hw, hr, cloth, roof, trim) => { // cloth walls, a hip roof, a valance; the door in the +z wall
      const k = P.kit();
      for (const [sx, sz, ww, dd] of [[0, 1, w, 0.08], [0, -1, w, 0.08], [1, 0, 0.08, d], [-1, 0, 0.08, d]]) k.add(P.rbox(ww, hw, dd, 0), cloth, [sx * (w / 2 - 0.04), hw / 2, sz * (d / 2 - 0.04)]);
      k.push(clothRoof(w + 0.9, d + 0.9, hr, hw, Math.min(0.45, hr * 0.09), roof));
      k.add(P.rbox(Math.max(0.3, Math.abs(w - d)) + 0.3, 0.22, 0.22, 0), P.shade(roof, -0.35), [0, hw + hr + 0.05, 0], [0, d > w ? Math.PI / 2 : 0, 0]); // ridge
      for (const [sx, sz, ww, dd] of [[0, 1, w + 0.9, 0.05], [0, -1, w + 0.9, 0.05], [1, 0, 0.05, d + 0.9], [-1, 0, 0.05, d + 0.9]]) k.add(P.rbox(ww, 0.42, dd, 0), trim, [sx * (w / 2 + 0.45), hw - 0.2, sz * (d / 2 + 0.45)]);
      k.add(P.rbox(Math.min(2.4, w * 0.3), hw * 0.86, 0.1, 0), 0x2a2018, [0, hw * 0.43, d / 2 + 0.02]);
      return k.geo();
    };
    const greatTent = () => { // 大帳: a wall tent 20 × 12, red roof, an awning over the door on four poles
      const k = P.kit(); k.push(wallTent(20, 12, 3.1, 5.2, 0x8e7e64, 0x7a3a2e, 0x2d2621));
      const aw = []; poly(aw, [[-5, 3.3, 6.2], [5, 3.3, 6.2], [5, 2.9, 11.5], [-5, 2.9, 11.5]], [0, 1, 0]); k.push(flat(aw, 0x84443a));
      for (const sx of [-1, 1]) { k.add(P.cyl(0.07, 0.08, 3.0, 5), DARK, [sx * 4.9, 1.5, 11.4]); k.add(P.rbox(0.06, 0.4, 5.3, 0), 0x2d2621, [sx * 5, 3.0, 8.85]); }
      k.add(P.rbox(10, 0.4, 0.06, 0), 0x2d2621, [0, 2.75, 11.5]);
      k.add(P.rbox(8, 0.25, 6, 0), 0x6a4a30, [0, 0.12, 8.6]); // a plank floor under the awning
      return k.geo();
    };
    const jianGu = () => { // 建鼓: the Han war drum, pierced by a pole, a canopy on top
      const k = P.kit();
      for (const ry of [0, Math.PI / 2]) k.add(P.rbox(2.4, 0.25, 0.3, 0), DARK, [0, 0.12, 0], [0, ry, 0]);
      k.add(P.cyl(0.08, 0.1, 6.4, 6), 0x6a2a1e, [0, 3.2, 0]);
      k.add(P.lathe([[0.6, -0.7], [0.76, -0.35], [0.8, 0], [0.76, 0.35], [0.6, 0.7]], 12), 0x8e2a22, [0, 2.3, 0], [0, 0, Math.PI / 2]);
      for (const sx of [-1, 1]) k.add(P.cyl(0.6, 0.6, 0.04, 12), 0xd9c9a2, [sx * 0.71, 2.3, 0], [0, 0, Math.PI / 2]);
      k.add(P.cone(0.95, 0.55, 8), 0x9c2f28, [0, 6.55, 0]); k.add(P.sph(0.14, 6, 4), 0xc8a050, [0, 6.9, 0]);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; k.add(P.rbox(0.05, 0.7, 0.05, 0), 0xb89040, [Math.cos(a) * 0.9, 5.95, Math.sin(a) * 0.9]); }
      return k.geo();
    };
    const rack = () => { // a weapon rack, spears leaning on it
      const k = P.kit(), w = 0x4e3826;
      for (const x of [-1.6, 1.6]) k.add(P.rbox(0.14, 1.9, 0.14, 0), w, [x, 0.95, 0]);
      for (const hh of [0.5, 1.6]) k.add(P.rbox(3.4, 0.1, 0.12, 0), w, [0, hh, 0]);
      for (let i = 0; i < 9; i++) { const x = -1.4 + i * 0.35; k.add(P.cyl(0.025, 0.03, 3.4, 4), 0x4a3423, [x, 1.66, -0.22], [0.12, 0, 0]); k.add(P.cone(0.05, 0.32, 4), 0x9aa0a8, [x, 3.5, -0.02], [0.12, 0, 0]); }
      return k.geo();
    };
    const cart = (load) => { // 輜車: a two-wheeled cart, shafts down, sacks or a hide cover on the bed
      const k = P.kit(), w = 0x6a4a30, dk = 0x3a2618;
      k.add(P.rbox(3.2, 0.2, 1.7, 0), w, [0, 1.05, 0]);
      for (const z of [-0.85, 0.85]) k.add(P.rbox(3.2, 0.45, 0.08, 0), w, [0, 1.35, z]);
      for (const z of [-1.02, 1.02]) k.add(P.cyl(0.85, 0.85, 0.12, 12), dk, [0, 0.85, z], [Math.PI / 2, 0, 0]);
      k.add(P.cyl(0.07, 0.07, 2.3, 5), dk, [0, 0.85, 0], [Math.PI / 2, 0, 0]);
      for (const z of [-0.5, 0.5]) k.add(P.rbox(3.4, 0.12, 0.12, 0), w, [3.0, 0.65, z], [0, 0, -0.24]);
      if (load === 'sacks') for (let i = 0; i < 9; i++) k.add(P.rbox(0.9, 0.42, 0.62, 0.45), 0xc4ae84, [-1.05 + (i % 3) * 1.0, 1.4 + Math.floor(i / 6) * 0.38, i % 6 < 3 ? -0.36 : 0.36]);
      if (load === 'cover') k.add(P.rbox(3.0, 1.0, 1.75, 0.45), 0x7e6a4c, [0, 1.62, 0]);
      return k.geo();
    };
    const frise = () => { // 拒馬: a log with crossed sharpened stakes through it
      const k = P.kit();
      k.add(P.cyl(0.2, 0.2, 4.2, 6), 0x5a4330, [0, 1.25, 0], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x = -1.5 + i * 1.0, a = 0.62, Ls = 3.1; k.add(P.cyl(0.07, 0.09, Ls, 5), 0x6e5438, [x, 1.25, 0], [s * a, 0, 0]); for (const e of [-1, 1]) k.add(P.cone(0.075, 0.35, 5), 0x8a7050, [x, 1.25 + e * Math.cos(a) * (Ls / 2 + 0.15), -e * s * Math.sin(a) * (Ls / 2 + 0.15)], [s * a + (e < 0 ? Math.PI : 0), 0, 0]); }
      return k.geo();
    };
    const gateHouse = () => { // 營門: posts framing the passage, a fighting platform over it on the rampart ends, a shingle roof
      const k = P.kit(), W2 = GH + 6;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { k.add(P.rbox(0.55, 8.9, 0.55, 0), WOOD, [sx * (GH + 0.3), 4.2, sz * 2.6]); k.add(P.rbox(0.45, 8.9, 0.45, 0), WOOD, [sx * (GH + 5.4), 4.2, sz * 2.6]); }
      for (const sz of [-1, 1]) k.add(P.rbox(2 * GH + 1.8, 0.55, 0.5, 0), DARK, [0, 7.3, sz * 2.6]);
      k.add(P.rbox(2 * W2, 0.35, 6.6, 0), PLANK, [0, 8.6, 0]);
      k.add(P.rbox(2 * W2, 1.3, 0.18, 0), PLANK, [0, 9.4, 3.2]);
      for (let i = -5; i <= 5; i++) k.add(P.rbox(0.9, 0.5, 0.2, 0), 0x0e0a07, [i * 2.1, 9.55, 3.3]); // loopholes
      for (const sx of [-1, 1]) k.add(P.rbox(0.18, 1.3, 6.6, 0), PLANK, [sx * W2, 9.4, 0]);
      k.add(P.rbox(2 * W2, 0.14, 0.14, 0), DARK, [0, 9.7, -3.2]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.rbox(0.3, 2.6, 0.3, 0), WOOD, [sx * (W2 - 0.4), 10.05, sz * 3.0]);
      const rf = []; hipRoof(rf, 2 * W2 + 2.4, 8.8, 2.6, 11.3); k.push(flat(rf, SHINGLE));
      k.add(P.rbox(2 * W2 - 6, 0.4, 0.4, 0), 0x2e241a, [0, 13.9, 0]);
      const L2 = GH - 0.3; // the doors, open inward (−z), hinged on the passage posts
      for (const sx of [-1, 1]) k.add(P.rbox(L2, 6.4, 0.2, 0), 0x4a3020, [sx * (GH - (Math.cos(1.2) * L2) / 2), 3.2, 1.0 - (Math.sin(1.2) * L2) / 2], [0, -sx * 1.2, 0]);
      return k.geo();
    };
    const watchTower = () => { // 望樓: four posts, braced, a breastwork platform, a hip roof of shingles
      const k = P.kit(), Ht = 7.4;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.rbox(0.36, Ht + 2.6, 0.36, 0), WOOD, [sx * 2.1, (Ht + 2.6) / 2 - 0.6, sz * 2.1]);
      for (const [lo, hi] of [[0, Ht / 2], [Ht / 2, Ht]]) for (let f = 0; f < 4; f++) {
        const ry = (f * Math.PI) / 2, len = Math.hypot(4.2, hi - lo), ang = Math.atan2(hi - lo, 4.2);
        for (const s2 of [-1, 1]) k.add(P.rbox(len, 0.16, 0.16, 0), DARK, [2.1 * Math.sin(ry), (lo + hi) / 2, 2.1 * Math.cos(ry)], [0, ry, s2 * ang]);
      }
      k.add(P.rbox(5.4, 0.3, 5.4, 0), PLANK, [0, Ht, 0]);
      for (let f = 0; f < 4; f++) { const ry = (f * Math.PI) / 2; k.add(P.rbox(5.4, 1.15, 0.14, 0), PLANK, [2.7 * Math.sin(ry), Ht + 0.72, 2.7 * Math.cos(ry)], [0, ry, 0]); }
      const rf = []; hipRoof(rf, 6.4, 6.4, 1.9, Ht + 2.0); k.push(flat(rf, SHINGLE));
      return k.geo();
    };
    const target = () => { // an archery butt: straw disc with rings on two legs, facing +x
      const k = P.kit();
      for (const z of [-0.5, 0.5]) k.add(P.rbox(0.12, 1.6, 0.12, 0), DARK, [-0.2, 0.8, z], [0, 0, 0.2]);
      k.add(P.cyl(0.8, 0.8, 0.25, 14), 0xb89a5c, [0, 1.3, 0], [0, 0, Math.PI / 2]);
      k.add(P.cyl(0.55, 0.55, 0.26, 14), 0x9c2f28, [0.01, 1.3, 0], [0, 0, Math.PI / 2]);
      k.add(P.cyl(0.35, 0.35, 0.27, 14), 0xd6c69a, [0.02, 1.3, 0], [0, 0, Math.PI / 2]);
      k.add(P.cyl(0.14, 0.14, 0.28, 10), 0x2a2018, [0.03, 1.3, 0], [0, 0, Math.PI / 2]);
      return k.geo();
    };
    const tripod = () => { // a cooking fire: a ring of stones, a tripod and a pot
      const k = P.kit();
      for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; k.add(P.rbox(0.32, 0.2, 0.26, tier === 'high' ? 0.4 : 0), 0x6f6a60, [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], [0, a, 0]); }
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28; k.add(P.cyl(0.03, 0.03, 1.7, 4), DARK, [Math.cos(a) * 0.4, 0.78, Math.sin(a) * 0.4], [Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28]); }
      k.add(P.lathe([[0.05, 0.55], [0.34, 0.6], [0.38, 0.78], [0.3, 0.95]], 8), 0x2a2622, [0, 0, 0]);
      return k.geo();
    };
    const shed = (w, d, h) => { // an open shed: posts and a shingle roof
      const k = P.kit(), n = Math.max(2, Math.round(w / 5));
      for (let i = 0; i <= n; i++) for (const sz of [-1, 1]) k.add(P.rbox(0.28, h, 0.28, 0), WOOD, [-w / 2 + (i * w) / n, h / 2, sz * (d / 2 - 0.3)]);
      for (const sz of [-1, 1]) k.add(P.rbox(w, 0.3, 0.3, 0), DARK, [0, h - 0.15, sz * (d / 2 - 0.3)]);
      const rf = []; hipRoof(rf, w + 1.6, d + 1.6, Math.min(3, d * 0.3), h); k.push(flat(rf, SHINGLE));
      return k.geo();
    };

    // earthworks: sections swept round the rectangle. A side runs s ∈ [−(half + u), half + u] at outward offset u (so
    // the corners mitre), broken at the gate (|s| < GH) into two runs, each capped at the gate.
    const SIDES = [
      { half: (x1 - x0) / 2, at: (s, u) => [cx + s, z0 - u], dir: [1, 0], n: [0, -1] },
      { half: (z1 - z0) / 2, at: (s, u) => [x1 + u, cz + s], dir: [0, 1], n: [1, 0] },
      { half: (x1 - x0) / 2, at: (s, u) => [cx - s, z1 + u], dir: [-1, 0], n: [0, 1] },
      { half: (z1 - z0) / 2, at: (s, u) => [x0 - u, cz - s], dir: [0, -1], n: [-1, 0] },
    ];
    const runs = (side) => {
      const hf = side.half, n = Math.ceil((hf - 7 - GH) / 3), A = [null], Bs = [];
      for (let k = 0; k <= n; k++) { A.push(-(hf - 7) + (k * (hf - 7 - GH)) / n); Bs.push(GH + (k * (hf - 7 - GH)) / n); }
      Bs.push(null); return [A, Bs];
    };
    const sweep = (prof, hex_) => { // prof: [[u, h], …], points 1 → 2 are the top (or the floor): it must face up
      const parts = [];
      for (const side of SIDES) runs(side).forEach((list, ri) => {
        const pos = [], idx = [], Mn = prof.length, Nn = list.length;
        for (const s0 of list) for (const [u, hh] of prof) { const s = s0 === null ? (ri ? side.half + u : -(side.half + u)) : s0, [x, z] = side.at(s, u); pos.push(x, y(x, z) + hh, z); }
        for (let i = 0; i < Nn - 1; i++) for (let j = 0; j < Mn - 1; j++) { const a = i * Mn + j; idx.push(a, a + Mn, a + 1, a + 1, a + Mn, a + Mn + 1); }
        const at = (i) => V(pos.slice(i * 3, i * 3 + 3)), a = Mn + 1, nrm = at(a + Mn).sub(at(a)).cross(at(a + 1).sub(at(a)));
        if (nrm.y < 0) for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const capI = ri ? 0 : Nn - 1, o = ri ? [-side.dir[0], 0, -side.dir[1]] : [side.dir[0], 0, side.dir[1]], cap = [];
        const pts = prof.map((_, j) => pos.slice((capI * Mn + j) * 3, (capI * Mn + j) * 3 + 3));
        if (V(pts[1]).sub(V(pts[0])).cross(V(pts[2]).sub(V(pts[0]))).lengthSq() > 1e-6) poly(cap, pts, o);
        parts.push(P.paint(g, hex_)); if (cap.length) parts.push(flat(cap, hex_));
      });
      return BGU.mergeBufferGeometries(parts);
    };
    const earthMat = earthMaterial(env, N), Ew = [];
    ctx.disposables.push(earthMat);
    Ew.push(sweep([[4.2, -0.6], [1.3, 3.2], [-1.5, 3.2], [-4.8, -0.6]], 0x7a6247));   // the rampart
    Ew.push(sweep([[5.5, 0.22], [7.3, -1.3], [11.1, -1.3], [12.9, 0.22]], 0x6e5a40)); // the ditch (the terrain is cut away over it)
    Ew.push(sweep([[12.5, -0.25], [14.8, 0.95], [16.8, 0.95], [19.5, -0.4]], 0x6e5a42)); // the spoil bank
    { const m = new T.Mesh(BGU.mergeBufferGeometries(Ew), earthMat); m.castShadow = m.receiveShadow = true; group.add(m); }
    { const wm = new T.MeshStandardMaterial({ color: 0x33362a, roughness: 0.08, metalness: 0, envMap: env, envMapIntensity: 1.1 }); ctx.disposables.push(wm); const w = new T.Mesh(sweep([[6.9, -0.8], [9.2, -0.8], [11.5, -0.8]], 0xffffff), wm); w.receiveShadow = true; group.add(w); }

    // the palisade: sharpened logs on the rampart's outer edge, two rails behind them
    const logG = (() => { const k = P.kit(); k.add(P.cyl(0.13, 0.15, 3.4, tier === 'high' ? 5 : 4, true), 0x5a4330, [0, 1.7, 0]); k.add(P.cone(0.13, 0.5, tier === 'high' ? 5 : 4), 0x6c5238, [0, 3.65, 0]); return k.geo(); })();
    const railG = new T.BoxGeometry(1, 0.14, 0.14), logs = [], rails = [], sideLogs = SIDES.map(() => []); // a mesh of logs per side: culled side by side
    const along = (side, u, step, fn) => { // points along both halves of a side at offset u, every ~step, gate left open
      for (const sg of [-1, 1]) { const sA = side.half + u, n = Math.max(1, Math.floor((sA - GH) / step)); for (let i = 0; i <= n; i++) { const s = sg * (GH + (i * (sA - GH)) / n), [x, z] = side.at(s, u); fn(x, z, s, i, n); } }
    };
    const railsBetween = (pts, heights) => { for (let i = 0; i < pts.length - 1; i++) { const [xa, za] = pts[i], [xb, zb] = pts[i + 1], ya = y(xa, za), yb = y(xb, zb), len = Math.hypot(xb - xa, zb - za); if (len < 0.2) continue; for (const hh of heights) rails.push([(xa + xb) / 2, (ya + yb) / 2 + hh, (za + zb) / 2, yawTo(xb - xa, zb - za), len + 0.1, 1, 1, 0, Math.atan2(yb - ya, len)]); } };
    for (const side of SIDES) {
      along(side, 1.0, 0.34, (x, z) => sideLogs[SIDES.indexOf(side)].push([x, y(x, z) + 2.75, z, rnd() * 6, 1, 0.9 + rnd() * 0.2, 1, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05]));
      for (const sg of [-1, 1]) { const pts = []; along(side, 0.72, 3, (x, z, s) => { if (Math.sign(s) === sg) pts.push([x, z]); }); if (sg < 0) pts.reverse(); railsBetween(pts, [4.2, 5.6]); }
    }
    // the command enclosure's fence: lower logs, a gate to the north
    const CMD = { x0: X(612), x1: X(688), z0: Z(856), z1: Z(914) };
    const ring = (r, step, gap, fn) => { const c = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1], [r.x0, r.z0]]; for (let k = 0; k < 4; k++) { const [ax, az] = c[k], [bx, bz] = c[k + 1], len = Math.hypot(bx - ax, bz - az), n = Math.round(len / step); for (let i = 0; i < n; i++) { const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n; if (!gap(x, z)) fn(x, z); } } };
    ring(CMD, 0.4, (x, z) => z === CMD.z0 && Math.abs(x - cx) < 5, (x, z) => logs.push([x, y(x, z) - 0.3, z, rnd() * 6, 0.75, 0.68 + rnd() * 0.1, 0.75]));

    // gates: the gate house, banners on its corners, guards; chevaux-de-frise beyond the spoil bank in two staggered rows
    const ghG = gateHouse(), friseG = frise(), frises = [];
    SIDES.forEach((side) => {
      const [gx, gz] = side.at(0, 0), yaw = Math.atan2(side.n[0], side.n[1]), cyw = Math.cos(yaw), syw = Math.sin(yaw);
      one(ghG, gx, gz, yaw, 0);
      const W = (lx, lz) => [gx + lx * cyw + lz * syw, gz - lx * syw + lz * cyw]; // local (x along the side, z out) → world
      for (const sx of [-1, 1]) { const [bx, bz] = W(sx * (GH + 5.6), 2.9); out.Rb.push([bx, y(gx, gz) + 8.8, bz, yaw]); }
      for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const [px, pz] = W(sx * (GH - 1.2), -1.5 - i * 2.2); out.R.spear.push([px, y(px, pz), pz, yawTo(side.n[0], side.n[1]) + (rnd() - 0.5) * 0.4]); }
      for (let i = -2; i <= 2; i++) { const [px, pz] = W(i * 3.4, 1.8); out.R.bow.push([px, y(gx, gz) + 8.8, pz, yawTo(side.n[0], side.n[1])]); }
      const fy = yawTo(side.dir[0], side.dir[1]);
      for (const [s, u] of [[-2.1, 30], [2.1, 30], [-13, 30], [13, 30], [-17.2, 30], [17.2, 30], [-7.6, 23.5], [7.6, 23.5], [-11.8, 23.5], [11.8, 23.5]]) { const [fx, fz] = side.at(s, u); frises.push([fx, y(fx, fz), fz, fy + (rnd() - 0.5) * 0.08]); }
    });
    add(inst(friseG, mat, frises));
    // watchtowers: the corners and two along each side, on the rampart; archers and a banner on each
    const wtG = watchTower(), towers = [];
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) towers.push([x, z, [x < cx ? -1 : 1, z < cz ? -1 : 1]]);
    for (const side of SIDES) for (const f of [-0.5, 0.5]) { const [x, z] = side.at(f * side.half, 0); towers.push([x, z, side.n]); }
    const wtList = towers.map(([x, z]) => [x, y(x, z) + 2.9, z, 0]); add(inst(wtG, mat, wtList));
    for (const [x, z, n] of towers) {
      const by = y(x, z) + 2.9;
      out.Rb.push([x - 2.3, by + 7.55, z - 2.3, 0]);
      for (const s2 of [-1, 1]) out.R.bow.push([x + n[0] * 1.4 + s2 * n[1] * 1.2, by + 7.55, z + n[1] * 1.4 - s2 * n[0] * 1.2, yawTo(n[0], n[1])]);
    }
    // sentries on the rampart walk, facing out
    for (const side of SIDES) along(side, -0.5, 22, (x, z, s, i) => { if (i % 2 === 0 && Math.abs(s) < side.half - 8) out.R.spear.push([x, y(x, z) + 3.2, z, yawTo(side.n[0], side.n[1]) + (rnd() - 0.5) * 0.5]); });

    // streets: packed earth, a cross from the gates to the enclosure
    { const pos = [], idx = [], strip = (ax, az, bx, bz, hw) => { const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 4), tx = (bx - ax) / len, tz = (bz - az) / len, b = pos.length / 3;
        for (let i = 0; i <= n; i++) for (const s of [-1, -0.4, 0.4, 1]) { const x = ax + tx * (len * i) / n - tz * s * hw, z = az + tz * (len * i) / n + tx * s * hw; pos.push(x, y(x, z) + 0.12, z); }
        for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { const a = b + i * 4 + j; idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4); } };
      strip(cx, z0 - 20, cx, CMD.z0, 5.5); strip(cx, CMD.z1, cx, z1 + 20, 5.5); strip(x0 - 20, cz, CMD.x0, cz, 5.5); strip(CMD.x1, cz, x1 + 20, cz, 5.5);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(0) < 0) { for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
      const col = new Float32Array(pos.length); for (let i = 0; i < pos.length / 3; i++) { const b = 0.85 + 0.25 * N.noise.vn2(pos[i * 3] / 3, pos[i * 3 + 2] / 3), e = (i % 4 === 0 || i % 4 === 3) ? 0.8 : 1; C3.set(0x9c8664).multiplyScalar(b * e); col.set([C3.r, C3.g, C3.b], i * 3); }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      const sm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMap: env, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); ctx.disposables.push(sm);
      const m = new T.Mesh(g, sm); m.receiveShadow = true; group.add(m); }

    // the command enclosure (中軍)
    one(greatTent(), cx, Z(897), Math.PI, 0);
    const oT = wallTent(8, 6, 2.0, 2.8, 0x857660, 0x6e3e30, 0x2e1c14), oTs = [];
    for (const z of [868, 884, 900]) { oTs.push([X(622), y(X(622), Z(z)), Z(z), Math.PI / 2], [X(678), y(X(678), Z(z)), Z(z), -Math.PI / 2]); }
    add(inst(oT, mat, oTs));
    const drum = jianGu(); add(inst(drum, mat, [[cx - 7.5, y(cx - 7.5, Z(852.5)), Z(852.5), 0], [cx + 7.5, y(cx + 7.5, Z(852.5)), Z(852.5), 0], ...(lite ? [] : [[X(537) + 5.2, y(X(537), Z(784)) + 3.6, Z(784) - 3.8, 0]])]));
    if (!lite) add(inst(rack(), mat, [[cx - 13, y(cx - 13, Z(882)), Z(882), 0], [cx + 13, y(cx + 13, Z(882)), Z(882), 0]]));
    out.Rb.push([cx - 5.5, y(cx, CMD.z0), CMD.z0 - 1.5, 0], [cx + 5.5, y(cx, CMD.z0), CMD.z0 - 1.5, 0]);
    out.standards.push([cx, y(cx, Z(879)), Z(879), 0, 2.4]);
    for (let z = 861; z < 881; z += 2.5) for (const sx of [-1, 1]) out.R.spear.push([cx + sx * 4.2, y(cx, Z(z)), Z(z), sx < 0 ? 0 : Math.PI]);
    for (let i = 0; i < 6; i++) { const a = -0.4 + i * 0.16; out.R.spear.push([cx + Math.sin(a) * 6, y(cx, Z(884)), Z(884) - Math.cos(a) * 2, -Math.PI / 2 + (rnd() - 0.5) * 0.3]); } // officers before the awning

    // tent blocks, with their cooking fires
    const TENT = ridgeTent(4.2, 3.3, 2.2, CLOTH), tents = [], hearthPos = [], smallO = [], blockFlags = [];
    const ZONES = [[598, 643, 776, 850], [657, 750, 776, 850], [694, 816, 856, 878], [484, 606, 856, 878], [574, 643, 920, 996], [657, 718, 920, 996], [574, 606, 892, 914], [694, 718, 892, 914]];
    for (const [ax, bx, az, bz] of ZONES) {
      let rz = 0;
      for (let z = az + 2.2; z < bz - 1.8; ) {
        let kx2 = 0;
        for (let x = ax + 2.5; x < bx - 2.3; ) {
          if (rnd() > 0.12) {
            if (rnd() < 0.07) smallO.push([X(x), Z(z)]);
            else { // undyed hemp in a spread of tones, some tents of dark hide; a little out of line
              const hide = rnd() < 0.22, b = hide ? 0.55 + 0.15 * rnd() : 0.8 + 0.25 * rnd(), t = hide ? [b * 0.95, b * 0.8, b * 0.62] : [b, b * (0.94 + 0.05 * rnd()), b * (0.84 + 0.08 * rnd())];
              const jx = (rnd() - 0.5) * 0.7, jz = (rnd() - 0.5) * 0.7, wx = X(x) + jx, wz = Z(z) + jz; tents.push([wx, y(wx, wz) - 0.05, wz, (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.12, 1, 1, 1, 0, 0, t]);
            }
          }
          x += 5.6; if (++kx2 % 5 === 0) { if (rz % 2 === 1 && x < bx - 3) { hearthPos.push([X(x - 0.3), Z(z - 3.6)]); if (rnd() < 0.5) blockFlags.push([X(x + 1.2), Z(z - 2.2)]); } x += 4.2; }
        }
        z += 6.2; if (++rz % 2 === 0) z += 3.2;
      }
    }
    add(inst(TENT, mat, tents));
    for (const [x, z] of blockFlags) out.Rb.push([x, y(x, z), z, 0]);
    add(inst(wallTent(6, 4.4, 1.6, 2.2, 0x94846a, 0x5e3e28, 0x2e1c14), mat, smallO.map(([x, z]) => [x, y(x, z), z, rnd() < 0.5 ? 0 : Math.PI])));
    const tri = tripod(), fires = [];
    for (const [x, z] of hearthPos) {
      fires.push([x, y(x, z), z, rnd() * 6]); hearths.push([x, y(x, z) + 0.1, z]);
      const n = 3 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, px = x + Math.cos(a) * 1.7, pz = z + Math.sin(a) * 1.7; out.R.spear.push([px, y(px, pz), pz, yawTo(x - px, z - pz)]); }
    }
    add(inst(tri, mat, fires));

    // the horse lines (south-east)
    const posts = [], hr = { x0: X(724), x1: X(816), z0: Z(898), z1: Z(996) }, fencePts = [];
    ring(hr, 3, (x, z) => x === hr.x0 && Math.abs(z - cz - 30 * kz) < 4, (x, z) => { posts.push([x, y(x, z), z, 0]); });
    { const c = [[hr.x0, hr.z0], [hr.x1, hr.z0], [hr.x1, hr.z1], [hr.x0, hr.z1], [hr.x0, hr.z0]]; for (let k = 0; k < 4; k++) { const pts = []; const [ax, az] = c[k], [bx, bz] = c[k + 1], n = Math.round(Math.hypot(bx - ax, bz - az) / 3); for (let i = 0; i <= n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]); fencePts.push(pts); } }
    for (const pts of fencePts) railsBetween(pts, [0.6, 1.2]);
    const postG = P.paint(new T.BoxGeometry(0.18, 1.5, 0.18).translate(0, 0.75, 0), 0x4a3423);
    for (const lz0 of [918, 946, 974]) {
      const lz = Z(lz0);
      for (let x = hr.x0 + 8; x < hr.x1 - 6; x += 6) posts.push([x, y(x, lz), lz, 0]);
      rails.push([(hr.x0 + hr.x1) / 2, y(cx, lz) + 1.3, lz, 0, hr.x1 - hr.x0 - 14, 0.4, 0.4]);
      for (const sz of [-1, 1]) for (let x = hr.x0 + 9; x < hr.x1 - 7; x += 2.9) if (rnd() < 0.7) { const z = lz + sz * 2.6; out.horses.push([x + (rnd() - 0.5) * 0.4, y(x, z), z, (sz < 0 ? -Math.PI / 2 : Math.PI / 2) + (rnd() - 0.5) * 0.3]); }
    }
    for (let i = 0; i < 9; i++) { const x = hr.x0 + 10 + rnd() * 70 * kx, z = hr.z0 + 6 + rnd() * 88 * kz; if (Math.abs((((z - Z(918)) % (28 * kz)) + 28 * kz) % (28 * kz) - 14 * kz) < 6) out.horses.push([x, y(x, z), z, rnd() * 6.28]); }
    add(inst(postG, mat, posts));
    const hay = P.paint(P.blob(1, 3, 1), 0xb8964e), heaps = [];
    if (!lite) {
      for (const [x, z] of [[730, 904], [730, 932], [730, 960], [810, 990], [796, 904], [812, 932]]) heaps.push([X(x), y(X(x), Z(z)) + 0.2, Z(z), rnd() * 6, 2.2, 1.1, 1.6]);
      const trough = P.paint(P.rbox(6, 0.6, 0.9, 0), 0x5a4330), troughs = [];
      for (const lz0 of [932, 960]) { const lz = Z(lz0); troughs.push([hr.x0 + 30, y(hr.x0 + 30, lz) + 0.3, lz, 0], [hr.x0 + 62, y(hr.x0 + 62, lz) + 0.3, lz, 0]); }
      add(inst(trough, mat, troughs));
    }

    // the supply depot (by the west gate)
    one(shed(46, 11, 4.2), X(516), Z(904), 0);
    if (!lite) {
      const sackG = P.paint(P.rbox(0.9, 0.44, 0.62, tier === 'high' ? 0.45 : 0), 0xc4ae84), sacks = [];
      const pile = (px, pz, nx, nz, yaw) => { const ca = Math.cos(yaw), sa = Math.sin(yaw); for (let l = 0; l < 3; l++) for (let i = 0; i < nx - l; i++) for (let j = 0; j < nz - l; j++) { const lx = (i - (nx - l - 1) / 2) * 0.95, lz = (j - (nz - l - 1) / 2) * 0.66, x = px + lx * ca + lz * sa, z = pz - lx * sa + lz * ca; sacks.push([x, y(px, pz) + 0.22 + l * 0.42, z, yaw + (rnd() - 0.5) * 0.2, 1, 1, 1, 0, 0, [0.9 + rnd() * 0.15, 0.88 + rnd() * 0.12, 0.8 + rnd() * 0.12]]); } };
      for (let i = 0; i < 8; i++) pile(X(496 + i * 5.6), Z(904), 4, 6, 0);
      for (let i = 0; i < 10; i++) pile(X(498 + (i % 5) * 12), Z(922 + Math.floor(i / 5) * 10), 5, 4, (rnd() - 0.5) * 0.3);
      heaps.push(...[[548, 922], [560, 934], [548, 944]].map(([x, z]) => [X(x), y(X(x), Z(z)) + 0.3, Z(z), rnd() * 6, 4.6, 2.4, 3.4]));
      add(inst(hay, mat, heaps));
      const cartS = cart('sacks'), cartC = cart('cover'), cartE = cart(''), carts = { s: [], c: [], e: [] };
      for (let i = 0; i < 16; i++) { const x = X(494 + (i % 8) * 8.4), z = Z(962 + Math.floor(i / 8) * 13), k = i % 3 ? (i % 3 === 1 ? 's' : 'c') : 'e'; carts[k].push([x, y(x, z), z, Math.PI + (rnd() - 0.5) * 0.2]); }
      add(inst(cartS, mat, carts.s)); add(inst(cartC, mat, carts.c)); add(inst(cartE, mat, carts.e)); add(inst(sackG, mat, sacks));
      for (let i = 0; i < 14; i++) { const x = X(496 + rnd() * 66), z = Z(914 + rnd() * 70); out.R.pull.push([x, y(x, z), z, rnd() * 6.28]); }
    }
    const gran = P.xf(P.granary(0.09), [0, 0, 0], [0, 0, 0], [30, 30, 30]); add(inst(gran, mat, [[X(500), y(X(500), Z(990)), Z(990), 0], [X(512), y(X(512), Z(990)), Z(990), 0]]));

    // the engineers' yard (north-east)
    one(shed(18, 9, 4), X(790), Z(784), 0);
    if (!lite) {
      const logL = P.paint(new T.CylinderGeometry(0.28, 0.3, 8, 7).rotateZ(Math.PI / 2), 0x6a4c32), lying = [];
      for (const [px, pz] of [[768, 800], [768, 812], [806, 842]]) for (let l = 0; l < 3; l++) for (let i = 0; i < 5 - l; i++) lying.push([X(px), y(X(px), Z(pz)) + 0.3 + l * 0.5, Z(pz) + (i - (4 - l) / 2) * 0.6, (rnd() - 0.5) * 0.05]);
      add(inst(logL, mat, lying));
      one(ctx.engines.trebuchet, X(790), Z(824), Math.PI / 2);
      const lads = []; for (let i = 0; i < 4; i++) lads.push([X(776) + i * 1.3, y(X(776), Z(836)) + 0.12, Z(836), 0, 1, 1, 1, 0, Math.PI / 2]);
      add(inst(ctx.engines.ladderShort, mat, lads));
      for (let i = 0; i < 12; i++) { const x = X(772 + rnd() * 38), z = Z(798 + rnd() * 40); out.R.pull.push([x, y(x, z), z, rnd() * 6.28]); }
    }

    // the drill ground (north-west): the reviewing platform, a formation, archery
    { const k = P.kit(), px = X(537), pz = Z(784), py = y(px, pz), rp = [];
      k.add(P.rbox(14, 4.2, 12, 0.03), 0x7a6247, [0, 1.5, 0]);
      poly(rp, [[-2.6, 3.55, 6], [2.6, 3.55, 6], [2.6, -0.4, 14], [-2.6, -0.4, 14]], [0, 1, 1]); for (const sx of [-1, 1]) poly(rp, [[sx * 2.6, 3.55, 6], [sx * 2.6, -0.4, 14], [sx * 2.6, -0.4, 6]], [sx, 0, 0]);
      k.push(flat(rp, 0x7a6247));
      const m = new T.Mesh(k.geo(), earthMat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; group.add(m);
      const c = P.kit(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(P.cyl(0.12, 0.14, 3.2, 6), 0x6a2a1e, [sx * 3.4, 3.6 + 1.6, sz * 2.8]);
      const rf = []; hipRoof(rf, 8.4, 7.2, 1.9, 6.8); c.push(flat(rf, 0x7a3a2e));
      const cm = new T.Mesh(c.geo(), mat); cm.position.set(px, py, pz); cm.castShadow = true; group.add(cm);
      out.Rb.push([px - 6.2, py + 3.6, pz + 5, 0], [px + 6.2, py + 3.6, pz + 5, 0]);
      for (let i = 0; i < 4; i++) out.R.spear.push([px - 1.8 + i * 1.2, py + 3.6, pz + 1.5, -Math.PI / 2]);
      const f = ctx.fA, blk = (bx, bz, cols, rows, spn, yaw) => { for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) { const x = bx + (c2 - (cols - 1) / 2) * spn + (rnd() - 0.5) * 0.2, z = bz + (r - (rows - 1) / 2) * spn + (rnd() - 0.5) * 0.2; out.R.spear.push([x, y(x, z), z, yaw]); } };
      blk(X(517), Z(814), Math.round(12 * Math.sqrt(f)), Math.round(7 * Math.sqrt(f)), 1.5 / Math.sqrt(f), Math.PI / 2); blk(X(558), Z(814), Math.round(12 * Math.sqrt(f)), Math.round(7 * Math.sqrt(f)), 1.5 / Math.sqrt(f), Math.PI / 2);
      out.Rb.push([X(517), y(X(517), Z(822)), Z(822), 0], [X(558), y(X(558), Z(822)), Z(822), 0]);
      if (!lite) { const tg = target(), tgs = []; for (const z of [834, 839, 844]) { tgs.push([X(490), y(X(490), Z(z)), Z(z), 0]); for (const dz of [-0.8, 0.8]) out.R.bow.push([X(532), y(X(532), Z(z) + dz), Z(z) + dz, Math.PI]); } add(inst(tg, mat, tgs)); } }

    // people about the streets; riders coming in by the west gate
    for (let i = 0, n = Math.round(60 * ctx.fA); i < n; i++) {
      const ns = rnd() < 0.5, t = rnd(), sgn = rnd() < 0.5 ? -1 : 1;
      const x = ns ? cx + (rnd() - 0.5) * 8 : t < 0.5 ? x0 + 12 + rnd() * (CMD.x0 - x0 - 16) : CMD.x1 + 4 + rnd() * (x1 - CMD.x1 - 16);
      const z = ns ? (t < 0.5 ? z0 + 12 + rnd() * (CMD.z0 - z0 - 18) : CMD.z1 + 4 + rnd() * (z1 - CMD.z1 - 16)) : cz + (rnd() - 0.5) * 8;
      (rnd() < 0.15 ? out.R.run : out.R.spear).push([x, y(x, z), z, ns ? sgn * Math.PI / 2 : sgn < 0 ? Math.PI : 0]);
    }
    for (let i = 0; i < 12; i++) { const x = x0 - 32 - (i >> 1) * 5.5, z = cz + (i % 2 ? 1.6 : -1.6); out.riders.push([x, y(x, z), z, 0]); }
    add(inst(logG, mat, logs)); for (const l of sideLogs) add(inst(logG, mat, l)); add(inst(P.paint(railG, 0x4a3423), mat, rails)); // the palisade, the enclosure fence, every rail
    return { hearths, tents: tents.length + smallO.length + oTs.length + 1, centre: [cx, cz], R };
  };

  // ---------------------------------------------------------------- the armies: the storm, the lines, the defenders on the walls, the boats
  const buildArmies = (ctx, city, out) => {
    const { HM, L, desc, tier, k, fA, mode, res, atk, dfd, group } = ctx, P = HM.parts, mat = HM.mat, rnd = lcg(5);
    const A = atk.troops, D = dfd.troops, H = city.H, WB = city.WB, WT = city.WT, y = (x, z) => L.h(x, z), assault = mode === 'assault';
    const R = out.R, Gd = out.Gd, Rb = out.Rb, Gb = out.Gb, riders = out.riders, dRiders = out.dRiders, engines = [];
    const g = city.attackGate, e1 = city.aEdge, e2 = city.wallEdge;
    // the frame of the assault: u along the gate's wall, v out from it; the field begins beyond the moat
    const gx = g ? g.x : (e1.a[0] + e1.b[0]) / 2, gz = g ? g.z : (e1.a[1] + e1.b[1]) / 2, out_ = g ? g.out : e1.n, tan = g ? g.tan : e1.d, y0 = g ? g.y0 : e1.y0;
    const W = (u, v) => [gx + u * tan[0] + v * out_[0], gz + u * tan[1] + v * out_[1]];
    const yawIn = yawTo(-out_[0], -out_[1]), yawOut = yawTo(out_[0], out_[1]);
    const moat = g && g.moat, dv = moat ? moat[1] - 54 : 0, hl = g ? Math.min(g.t, 1 - g.t) * e1.len : e1.len / 2, ku = clamp(hl / 210, 0.6, 1.6);
    const dry = (x, z) => L.waterSD(x, z) > 0;
    const nb = Math.max(1, Math.round(A.bo / 1000)), blockMen = Math.max(12, Math.round(1000 * k));
    // a block of men at (u, v): cols × rows scaled to the block's figures, spacing widened when the figures are fewer
    const block = (list, u, v, men, yaw, sp0, flags, jitter = 0.3, colsRatio = 2.2) => {
      const rows = Math.max(1, Math.round(Math.sqrt(men / colsRatio))), cols = Math.max(1, Math.ceil(men / rows)), sp = sp0 * clamp(Math.sqrt(219 / Math.max(20, men)), 1, 2.2);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const uu = u + (c - (cols - 1) / 2) * sp + (rnd() - 0.5) * jitter * sp, vv = v + (r - (rows - 1) / 2) * sp + (rnd() - 0.5) * jitter * sp, [x, z] = W(uu, vv);
        if (!dry(x, z)) continue; list.push([x, y(x, z), z, yaw + (rnd() - 0.5) * 0.3]);
      }
      if (flags) for (let c = 0; c < Math.max(1, Math.round(cols / 6)); c++) { const uu = u + (c - (Math.round(cols / 6) - 1) / 2) * sp * 6, vv = v + ((rows - 1) / 2 + 1) * sp, [x, z] = W(uu, vv); if (dry(x, z)) flags.push([x, y(x, z), z, yaw]); }
    };
    const ladders = [], nLad = clamp(Math.round(nb * 0.75), 2, 12), nJ = clamp(Math.round(nb / 4), 1, 4), nTr = clamp(Math.round(nb * 0.6), 1, 9), nArch = clamp(Math.round(nb * 0.25), 1, 4), nFwd = Math.max(1, Math.round(nb * 0.25)), nMain = Math.max(0, nb - nArch - nFwd);
    if (assault) {
      // 1. storming the gate: a packed column on the bridge and at the gate, the ram in the passage; on a loss the column
      // falls back beyond the moat, on a win it pours through the gate
      const vCol1 = moat ? moat[1] + 30 : 88;
      for (let i = 0, n = Math.round(260 * fA); i < n; i++) {
        let u = (rnd() - 0.5) * 26 * (0.4 + rnd()), v = res === 'loss' ? (moat ? moat[1] + 10 : 60) + rnd() * 90 : res === 'win' ? -40 + rnd() * (vCol1 + 40) : 18 + rnd() * (vCol1 - 18);
        if (res === 'win' && Math.abs(v) < WB / 2 + 4) u = (rnd() - 0.5) * 5;
        const onBridge = moat && Math.abs(u) < 4.5 && v > moat[0] - 5 && v < moat[1] + 5, [x, z] = W(u, v);
        if (!onBridge && !dry(x, z)) continue;
        R.run.push([x, onBridge ? g.bridgeY + 0.35 : y(x, z), z, (res === 'loss' ? yawOut : yawIn) + (rnd() - 0.5) * 0.6]);
      }
      if (g && A.bo >= 1500) { const v = res === 'loss' ? WB / 2 + 42 : WB / 2 + 8.5, [x, z] = W(0, v); engines.push(['ram', [x, y0 - 0.2, z, yawIn]]); }
      // 2. ladders on the gate's wall and the next one, men climbing and bunched at the foot
      const slope = Math.atan2((WB - WT) / 2, H + 3), spots = (e, n, gates) => { // even spots along the runs of an edge, clear of gates, corners and mã diện
        const cand = [], gwh = g ? g.gw / 2 : 17; for (let s = city.cw + 12; s < e.len - city.cw - 12; s += 6) { if (gates.some((gs) => Math.abs(s - gs) < gwh + 12)) continue; cand.push(s); }
        const outL = []; for (let i = 0; i < n && cand.length; i++) outL.push(cand[Math.floor(((i + 0.5) / n) * cand.length)]); return outL;
      };
      const n1 = Math.ceil(nLad * 0.55), place = (e, list) => { for (const s of list) { const x = e.a[0] + e.d[0] * s + e.n[0] * (WB / 2 - 1.5), z = e.a[1] + e.d[1] * s + e.n[1] * (WB / 2 - 1.5); ladders.push({ x, z, out: e.n, yaw: Math.atan2(e.n[0], e.n[1]), y0: e.y0 }); } };
      place(e1, spots(e1, n1, e1.gates)); if (e2 !== e1) place(e2, spots(e2, nLad - n1, e2.gates));
      for (const l of ladders) {
        const fallen = res === 'loss', roll = fallen ? -(Math.PI / 2 - 0.06) : slope + 0.18;
        engines.push(['ladder', [l.x + l.out[0] * 3.2, l.y0 - 0.5, l.z + l.out[1] * 3.2, l.yaw - Math.PI / 2, 1, 1, 1, 0, roll]]);
        if (!fallen) for (let i = 0; i < 5; i++) { const t = 0.12 + i * 0.17, hgt = t * 14, back = 3.2 - Math.tan(slope + 0.18) * hgt; R.climb.push([l.x + l.out[0] * (back + 0.5), l.y0 - 0.5 + hgt, l.z + l.out[1] * (back + 0.5), l.yaw - Math.PI / 2 + Math.PI, 0]); }
        for (let i = 0, n = Math.round((fallen ? 10 : 26) * fA); i < n; i++) { const a = rnd() * Math.PI, r = 4 + rnd() * 10, x = l.x + l.out[0] * (5 + Math.sin(a) * r) + l.out[1] * Math.cos(a) * r * 1.4, z = l.z + l.out[1] * (5 + Math.sin(a) * r) - l.out[0] * Math.cos(a) * r * 1.4; if (!dry(x, z)) continue; R[fallen ? 'run' : 'spear'].push([x, y(x, z), z, (fallen ? yawTo(l.out[0], l.out[1]) : yawTo(-l.out[0], -l.out[1])) + (rnd() - 0.5) * 0.5]); }
      }
      // 3. jinglan towers near the walls, archers on top and a guard round each
      const jSpots = [];
      if (e2 !== e1) for (const f of [0.32, 0.68]) jSpots.push({ x: (e2.a[0] + e2.d[0] * e2.len * f), z: e2.a[1] + e2.d[1] * e2.len * f, n: e2.n });
      jSpots.push({ x: e1.a[0] + e1.d[0] * (g ? g.t * e1.len + 120 * ku : e1.len * 0.7), z: e1.a[1] + e1.d[1] * (g ? g.t * e1.len + 120 * ku : e1.len * 0.7), n: e1.n }, { x: e1.a[0] + e1.d[0] * (g ? g.t * e1.len - 150 * ku : e1.len * 0.3), z: e1.a[1] + e1.d[1] * (g ? g.t * e1.len - 150 * ku : e1.len * 0.3), n: e1.n });
      for (const j of jSpots.slice(0, nJ)) {
        let v = WB / 2 + 60; for (; v < 260; v += 4) { const x = j.x + j.n[0] * v, z = j.z + j.n[1] * v; if (L.waterSD(x, z) > 6 && L.waterSD(x + j.n[0] * 6, z + j.n[1] * 6) > 6) break; } // beyond the moat where there is one
        const x = j.x + j.n[0] * v, z = j.z + j.n[1] * v, jy = y(x, z), yw = yawTo(-j.n[0], -j.n[1]);
        engines.push(['jinglan', [x, jy, z, 0]]);
        for (let i = 0; i < 8; i++) R.bow.push([x + (rnd() - 0.5) * 5, jy + 15.2, z + (rnd() - 0.5) * 5, yw]);
        for (let i = 0, n = Math.round(30 * fA); i < n; i++) { const px = x + (rnd() - 0.5) * 16, pz = z + (rnd() - 0.5) * 16; if (dry(px, pz)) R.spear.push([px, y(px, pz), pz, (rnd() - 0.5) * 6]); }
      }
    }
    // 4. the forward blocks and the archers behind mantlets (in an assault), the trebuchet line and their crews
    const fwdAt = [[-120, 75], [90, 75], [-40, 90], [150, 95], [-170, 100], [40, 105]], archAt = [[-110, 120], [0, 145], [110, 120], [-200, 135]];
    for (let i = 0; i < nFwd; i++) { const [u, v] = fwdAt[i % fwdAt.length]; block(R.spear, u * ku, v + dv + Math.floor(i / fwdAt.length) * 30, blockMen, yawIn, 1.5, Rb, 0.5); }
    const archers = [];
    for (let i = 0; i < nArch; i++) {
      const [u, v] = archAt[i % archAt.length], uu = u * ku, vv = v + dv; archers.push([uu, vv]);
      block(R.bow, uu, vv, Math.round(blockMen * 0.4), yawIn, 1.6, Rb, 0.3);
      if (assault) for (let j = -4; j <= 4; j++) { const [x, z] = W(uu + j * 3.4, vv - 7); if (dry(x, z)) engines.push(['mantlet', [x, y(x, z), z, yawIn]]); }
    }
    const trebs = [];
    for (let i = 0; i < nTr; i++) {
      const u = (nTr > 1 ? (i - (nTr - 1) / 2) * ((360 * ku) / (nTr - 1)) : 0) + (rnd() - 0.5) * 10, v = 250 + dv + (rnd() - 0.5) * 16, [x, z] = W(u, v);
      if (!dry(x, z)) continue; trebs.push([x, z]); engines.push(['trebuchet', [x, y(x, z), z, yawIn + (rnd() - 0.5) * 0.15]]);
      for (let c = 0, n = tier === 'low' ? 6 : 12; c < n; c++) { const [px, pz] = W(u + ((c % 6) - 2.5) * 1.1, v + 4.5 + Math.floor(c / 6) * 1.4); R.pull.push([px, y(px, pz), pz, yawOut]); }
    }
    // 5. the main force in blocks of a thousand, rows of four, cavalry on the flanks, the general's standard
    const mainU = [-160, -55, 55, 160];
    for (let i = 0; i < nMain; i++) { const row = Math.floor(i / 4), c = i % 4, n4 = Math.min(4, nMain - row * 4), u = (n4 === 4 ? mainU[c] : (c - (n4 - 1) / 2) * 110) * ku, v = 330 + dv + row * 88 + (c === 1 || c === 2 ? 15 : 0); block(R.spear, u, v, blockMen, yawIn, 1.7, Rb, 0.25); }
    const nRid = Math.round(A.ky * k);
    if (nRid) for (const s of [-1, 1]) block(riders, s * 330 * ku, 300 + dv, Math.ceil(nRid / 2), yawIn, 3.2, Rb, 0.3, 2);
    { const [sx, sz] = W(0, 300 + dv); out.standards.push([sx, y(sx, sz), sz, 0, 3.2]); }
    // 6. boats on the river when the city has one and the attacker marines: at the river nearest the city, in a lane along it
    const boats = [];
    if (A.thuy > 0 && desc.city.river) {
      const rs = DIR[desc.city.river.sides[0]] || DIR.n; let px = 0, pz = 0, found = false;
      for (let d = city.half; d < 1500; d += 6) { px = rs[0] * d; pz = rs[1] * d; if (L.riverSD(px, pz) < -12) { found = true; break; } }
      if (found) {
        const e = 6, gx2 = (L.riverSD(px + e, pz) - L.riverSD(px - e, pz)) / (2 * e), gz2 = (L.riverSD(px, pz + e) - L.riverSD(px, pz - e)) / (2 * e), gl = Math.hypot(gx2, gz2) || 1, tx = -gz2 / gl, tz = gx2 / gl;
        const n = clamp(Math.round(A.thuy / 100), 1, 8);
        for (let i = 0; i < n; i++) { const t = (i - (n - 1) / 2) * 26, s = (i % 2 ? 1 : -1) * 8, x = px + tx * t + (gx2 / gl) * s, z = pz + tz * t + (gz2 / gl) * s; if (L.riverSD(x, z) < -6) boats.push([x, L.WATER + 0.1, z, yawTo(tx, tz) + (i % 2) * 0.2, 10]); }
        if (boats.length) { const ship = HM.figure('thuy', atk.fid), sm = inst(ship, mat, boats.map((b) => [b[0], b[1], b[2], b[3], b[4], b[4], b[4]])); group.add(sm); }
        ctx.harbour = [px, pz];
      }
    }
    // the defenders: along the assaulted walls, archers among them, banners every 40 m, reserves behind the gate; on a
    // win the wall is thinned and the reserves gone
    const wallN = Math.round(D.bo * k * 0.5 * (res === 'win' ? 0.3 : 1)), segs = [];
    for (const e of [e1, e2]) { if (!e || segs.some((s) => s.e === e)) continue; let s = city.cw * 0.65; const cuts = e.gates.map((gs) => [gs - 18 - (g ? g.gw / 2 - 17 : 0), gs + 18 + (g ? g.gw / 2 - 17 : 0)]).concat([[e.len - city.cw * 0.65, e.len]]); for (const [c0, c1] of cuts) { if (c0 > s) segs.push({ e, s0: s, s1: c0 }); s = c1; } }
    const total = segs.reduce((a, s) => a + s.s1 - s.s0, 0), sp = clamp(total / Math.max(1, wallN), 1.6, 9);
    for (const sg of segs) for (let s = sg.s0; s < sg.s1; s += sp) { const e = sg.e, x = e.a[0] + e.d[0] * s + e.n[0] * (WT / 2 - 2.2), z = e.a[1] + e.d[1] * s + e.n[1] * (WT / 2 - 2.2); Gd[rnd() < 0.5 ? 'bow' : 'spear'].push([x, e.y0 + H, z, yawTo(e.n[0], e.n[1]) + (rnd() - 0.5) * 0.4]); }
    for (const sg of segs) for (let s = sg.s0 + 12; s < sg.s1; s += 40) { const e = sg.e; Gb.push([e.a[0] + e.d[0] * s + e.n[0] * (WT / 2 - 1.2), e.y0 + H, e.a[1] + e.d[1] * s + e.n[1] * (WT / 2 - 1.2), yawTo(e.n[0], e.n[1])]); }
    if (res !== 'win') {
      const resMen = Math.round(D.bo * k * 0.5 / 3);
      for (const [u, v] of [[-38, -40], [38, -40], [0, -62]]) { const L2 = []; block(L2, u * ku, v, resMen, yawOut, 1.6, Gb, 0.25); for (const p of L2) Gd.spear.push(p); }
      const nDr = Math.round(D.ky * k); if (nDr) block(dRiders, 0, -95, nDr, yawOut, 3.2, Gb, 0.3, 2);
    }
    out.dStandards.push([city.flagAt[0], city.flagAt[1], city.flagAt[2], 0, 3.4]);
    // the standards over the gate: the winner's beside the burning tower, the defenders' on a held wall
    if (g && res === 'win') { const [x, z] = W(-14, 1.5); out.standards.push([x, g.y0 + H, z, yawOut, 3.2]); const [x2, z2] = W(14, 1.5); out.standards.push([x2, g.y0 + H, z2, yawOut, 2.4]); }
    if (g && res === 'loss') { const [x, z] = W(-14, 1.5); out.dStandards.push([x, g.y0 + H, z, yawOut, 3.2]); }
    // engines: one InstancedMesh per kind (instance colours from creation)
    const byKind = {}; for (const [kind, row] of engines) (byKind[kind] = byKind[kind] || []).push(row);
    for (const [kind, rows] of Object.entries(byKind)) group.add(inst(ctx.engines[kind], mat, rows));
    return { trebs, ladders, archers, engines: engines.length, boats: boats.length, frame: { W, yawIn, yawOut, dv, gate: g, y0 } };
  };

  // ---------------------------------------------------------------- fire, smoke, arrows, stones (assault only)
  // Fire and smoke are camera-facing quads drawn as instances: one draw call per look (flames, glows, dense smoke,
  // soft smoke and dust) instead of one per sprite; the flicker, the drift and the glow's pulse run in the vertex
  // shader from uTime. Each quad: aPos (centre), aSz (width, height, rotation, phase), aCol (linear rgb, opacity).
  const BILL_VS = `attribute vec3 aPos; attribute vec4 aSz; attribute vec4 aCol; uniform float uTime; varying vec2 vUv; varying vec4 vCol;
    void main() { vUv = uv; vCol = aCol; vec3 p = aPos; vec2 s = aSz.xy; float rot = aSz.z, ph = aSz.w;
    #if KIND == 1
      float ff = .75 + .35 * abs(sin(uTime * 9. + ph)) * (.7 + .3 * sin(uTime * 23. + ph * 2.)); p.y += (ff - .75) * s.y * .3; s = vec2(s.x * (.8 + .2 * ff), s.y * ff);
    #elif KIND == 2
      vCol.a = .45 + .12 * sin(uTime * 13.);
    #else
      p.x += sin(uTime * .3 + ph) * 2.; rot += uTime * .09;
    #endif
      vec4 mv = modelViewMatrix * vec4(p, 1.); vec2 q = position.xy * s; float c = cos(rot), sn = sin(rot);
      mv.xy += vec2(c * q.x - sn * q.y, sn * q.x + c * q.y); gl_Position = projectionMatrix * mv; }`;
  const BILL_FS = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
    void main() { vec4 c = texture2D(map, vUv) * vCol;
    #ifdef ATEST
      if (c.a < ATEST) discard;
    #endif
      gl_FragColor = c;
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`;
  const billboards = (tex, kind, o, list, U) => {
    const n = list.length, base = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry(), pos = new Float32Array(n * 3), sz = new Float32Array(n * 4), col = new Float32Array(n * 4);
    g.setIndex(base.index); g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    list.forEach((b, i) => { pos.set(b.p, i * 3); sz.set([b.w, b.h, b.rot || 0, b.ph || 0], i * 4); col.set([b.c.r, b.c.g, b.c.b, b.a ?? 1], i * 4); });
    g.setAttribute('aPos', new T.InstancedBufferAttribute(pos, 3)); g.setAttribute('aSz', new T.InstancedBufferAttribute(sz, 4)); g.setAttribute('aCol', new T.InstancedBufferAttribute(col, 4)); g.instanceCount = n;
    const defines = { KIND: kind }; if (o.alphaTest) defines.ATEST = o.alphaTest.toFixed(3);
    const mat = new T.ShaderMaterial({ uniforms: { map: { value: tex }, uTime: U }, vertexShader: BILL_VS, fragmentShader: BILL_FS, defines, transparent: true, depthWrite: !!o.depthWrite, blending: o.additive ? T.AdditiveBlending : T.NormalBlending });
    const m = new T.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = o.order || 0; return m;
  };
  const buildFx = (ctx, city, army, camp) => {
    const { L, tier, res, group } = ctx, rnd = lcg(3), f = TIER[tier].fx, lights = TIER[tier].lights, texs = [], mats = [], U = { value: 0 };
    const spriteTex = (draw, w = 128, h = 128) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; texs.push(t); return t; };
    const smokeT = spriteTex((g, w, h) => { for (let i = 0; i < 30; i++) { const x = w / 2 + (rnd() - 0.5) * w * 0.45, y = h / 2 + (rnd() - 0.5) * h * 0.45, r = w * (0.14 + rnd() * 0.2), gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); gr.addColorStop(0, 'rgba(255,246,232,0.34)'); gr.addColorStop(0.55, 'rgba(170,160,150,0.22)'); gr.addColorStop(1, 'rgba(90,84,78,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    const flameT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.62, h * 0.5); gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(0.25, 'rgba(255,180,60,0.95)'); gr.addColorStop(0.6, 'rgba(230,80,20,0.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.55, w / 2, h); g.quadraticCurveTo(0, h * 0.55, w / 2, 0); g.fill(); }, 64, 128);
    const glowT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,170,80,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const FL = [], GL = [], SD = [], SS = [], WHITE = new T.Color(1, 1, 1);
    let lit = 0;
    const fire = (x, y, z, size, smokeH, light) => {
      for (let i = 0, n = Math.round(16 * f); i < n; i++) FL.push({ p: [x + (rnd() - 0.5) * size * 1.6, y + rnd() * size * 0.5, z + (rnd() - 0.5) * size], w: size * 0.5, h: size, ph: rnd() * 6, c: WHITE });
      GL.push({ p: [x, y + size * 0.3, z], w: size * 3.2, h: size * 3.2, c: WHITE, a: 0.55 });
      if (light && lit < lights) { lit++; const pl = new T.PointLight(0xff8a3a, 2.4, size * 14, 2); pl.position.set(x, y + size * 0.6, z); group.add(pl); }
      for (let i = 0, n = Math.round(34 * f); i < n; i++) { const t = i / n, g2 = 0.07 + 0.2 * t + 0.06 * rnd(), hgt = t * smokeH, sc = size * (1.1 + rnd() * 0.8) + hgt * 0.42; SD.push({ p: [x + hgt * 0.45 + (rnd() - 0.5) * 4, y + size + hgt, z - hgt * 0.2 + (rnd() - 0.5) * 4], w: sc, h: sc, rot: rnd() * 6, ph: rnd() * 6, c: new T.Color().setRGB(g2 * 1.05, g2, g2 * 0.92), a: 1 - t * 0.5 }); }
    };
    const war = ctx.mode === 'assault' && army, F = army ? army.frame : null, g = F && F.gate;
    if (war) {
      if (g && res !== 'loss') { const [x, z] = F.W(-4, 1); fire(x, g.towerY + 9, z, 10, 110, true); const [x2, z2] = F.W(10, -3); fire(x2, g.towerY + 4, z2, 4, 40, false); } // the gate tower is burning
      for (const [x, y, z] of city.burn.slice(0, res === 'loss' ? 1 : 3)) fire(x, y, z, 5, 60, false);
    }
    // cooking fires in the camp: small flames, a glow, a thin wisp of smoke leaning with the wind
    const hearth = (x, y, z) => {
      for (let i = 0; i < 5; i++) FL.push({ p: [x + (rnd() - 0.5) * 0.6, y + 0.3 + rnd() * 0.15, z + (rnd() - 0.5) * 0.6], w: 0.4, h: 0.8, ph: rnd() * 6, c: WHITE });
      GL.push({ p: [x, y + 0.5, z], w: 3, h: 3, c: WHITE, a: 0.5 });
      for (let i = 0, n = Math.round(12 * f); i < n; i++) { const t = i / n, g2 = 0.5 + 0.2 * t, hgt = 1.4 + t * 24, s2 = 1.3 + hgt * 0.26; SS.push({ p: [x + hgt * 0.35 + (rnd() - 0.5), y + hgt, z - hgt * 0.15 + (rnd() - 0.5)], w: s2, h: s2, rot: rnd() * 6, ph: rnd() * 6, c: new T.Color().setRGB(g2, g2 * 0.97, g2 * 0.93), a: 0.34 * (1 - t) }); }
    };
    (camp ? camp.hearths : []).forEach(([x, y, z], i) => { if (tier === 'high' || i % (tier === 'mid' ? 2 : 3) === 0) hearth(x, y, z); });
    if (war) {
      // dust at the gate and the ladders
      const DUST = new T.Color(0x9a8466);
      for (let i = 0, n = Math.round(14 * f); i < n; i++) { const [x, z] = F.W((rnd() - 0.5) * 50, 30 + rnd() * 40), sc = 12 + rnd() * 10; SS.push({ p: [x, L.h(x, z) + 3 + rnd() * 3, z], w: sc, h: sc, ph: rnd() * 6, c: DUST, a: 0.45 }); }
      // arrows in flight: dark shafts and fire arrows (streaks), from the archers to the wall and back
      const shaft = new T.BoxGeometry(0.08, 0.08, 1.2), streak = new T.BoxGeometry(0.16, 0.16, 3.5), arrows = [], fireArrows = [];
      const arc = (a, b, t, hmax) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * hmax, a[2] + (b[2] - a[2]) * t];
      const H = city.H, y0 = F.y0;
      for (const [au, av] of army.archers) for (let i = 0, n = Math.round(90 * f); i < n; i++) {
        const [ax, az] = F.W(au + (rnd() - 0.5) * 26, av + (rnd() - 0.5) * 8), [bx, bz] = F.W(au * 0.9 + (rnd() - 0.5) * 60, (rnd() - 0.5) * 6);
        const a = [ax, L.h(ax, az) + 2, az], b = [bx, y0 + H + 1 + rnd() * 3, bz], t = 0.15 + rnd() * 0.8, hm = 28 + rnd() * 10;
        const p = arc(a, b, t, hm), p2 = arc(a, b, t + 0.01, hm); (i % 5 === 0 ? fireArrows : arrows).push([p, p2]);
      }
      for (let i = 0, n = Math.round(160 * f); i < n; i++) { const u = (rnd() - 0.5) * 360, [ax, az] = F.W(u, 3), [bx, bz] = F.W(u * 0.8 + (rnd() - 0.5) * 60, 60 + F.dv + rnd() * 120); const a = [ax, y0 + H + 1.5, az], b = [bx, L.h(bx, bz), bz], t = 0.1 + rnd() * 0.8, hm = 18 + rnd() * 8; const p = arc(a, b, t, hm), p2 = arc(a, b, t + 0.01, hm); arrows.push([p, p2]); }
      const orient = (list, geo, material) => { mats.push(material); const m = new T.InstancedMesh(geo, material, list.length), d = new T.Vector3(), Z = new T.Vector3(0, 0, 1); list.forEach(([p, p2], i) => { d.set(p2[0] - p[0], p2[1] - p[1], p2[2] - p[2]).normalize(); m.setMatrixAt(i, M4.compose(V3.set(...p), Q4.setFromUnitVectors(Z, d), SC.set(1, 1, 1))); }); m.frustumCulled = false; return m; };
      if (arrows.length) group.add(orient(arrows, shaft, new T.MeshBasicMaterial({ color: 0x1c140e })));
      if (fireArrows.length) group.add(orient(fireArrows, streak, new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })));
      // stones in flight from the trebuchets
      if (army.trebs.length) {
        const stoneG = new T.IcosahedronGeometry(0.7, 1), stones = [];
        for (let i = 0; i < 5; i++) { const [x, z] = army.trebs[i % army.trebs.length], t = 0.62 + rnd() * 0.25, [tx, tz] = F.W((rnd() - 0.5) * 40, -20 - rnd() * 60), p = arc([x, L.h(x, z) + 8, z], [tx, y0 + 6, tz], t, 70); stones.push([p[0], p[1], p[2], rnd() * 6]); }
        const sm = new T.MeshStandardMaterial({ color: 0x6f675c, roughness: 0.9 }); mats.push(sm); group.add(inst(stoneG, sm, stones));
      }
    }
    // the looks, back to front: dense smoke writes depth (alpha-tested), the soft smoke, the flames and glows add light
    const looks = [[SD, smokeT, 3, { alphaTest: 0.18, depthWrite: true }], [SS, smokeT, 3, { order: 1 }], [GL, glowT, 2, { additive: true, order: 2 }], [FL, flameT, 1, { additive: true, order: 3 }]];
    for (const [list, tex, kind, o] of looks) if (list.length) { const m = billboards(tex, kind, o, list, U); mats.push(m.material); group.add(m); }
    const tick = (time) => { U.value = time; };
    return { tick, sprites: FL.length + GL.length + SD.length + SS.length, dispose: () => { for (const m of mats) m.dispose(); for (const t of texs) t.dispose(); } };
  };

  // ---------------------------------------------------------------- the scene
  B.siege = function (desc, deps) {
    const HM = deps.HM, N = deps.Nature, env = deps.env, tier = tierOf(deps.q), mode = desc.mode || 'assault', res = desc.result || null;
    const L = desc.ground && typeof desc.ground.h === 'function' ? desc.ground : N.land(desc.ground || B.landSpec(desc));
    const atk = { ...desc.attacker, color: hex(desc.attacker.color), troops: { bo: 0, ky: 0, thuy: 0, ...desc.attacker.troops } };
    const dfd = { ...desc.defender, color: hex(desc.defender.color), troops: { bo: 0, ky: 0, thuy: 0, ...desc.defender.troops } };
    const group = new T.Group(), disposables = [], bannerCache = {};
    // the attacker's side: given, else the land's camp tells it, else south
    let side = desc.side;
    if (!side && L.CAMP_R) { const cx = (L.CAMP_R.x0 + L.CAMP_R.x1) / 2, cz = (L.CAMP_R.z0 + L.CAMP_R.z1) / 2; side = Math.abs(cx) > Math.abs(cz) ? (cx > 0 ? 'e' : 'w') : cz > 0 ? 's' : 'n'; }
    side = DIR[side] ? side : 's';
    // the drawn figures: capped per tier, every group scaled by the same ratio k (figures per man); fA is that ratio
    // against the prototype's density (0.219 at 4,000 figures for 18,300 men), which the prototype's group sizes assume
    const men = atk.troops.bo + atk.troops.ky + dfd.troops.bo + dfd.troops.ky || 1, cap = desc.figures || TIER[tier].figures, k = Math.min(0.5, (0.8 * cap) / men), fA = k / 0.219; // a fifth kept for the camp, the crews and the guards
    const ctx = { HM, L, N, env, tier, mode, res, atk, dfd, desc, def: desc.city, side, k, fA, group, disposables, engines: {} };
    const P = HM.parts;
    ctx.engines = { trebuchet: trebuchet(P), ram: ram(P), jinglan: jinglan(P), ladder: ladder(P, 15), ladderShort: ladder(P, 12), mantlet: mantlet(P) };
    for (const g of Object.values(ctx.engines)) disposables.push(g);
    const city = buildCity(ctx); group.add(city.group); disposables.push(city.meshes[0].material);
    // crowds: one per faction, the animated crowd.js when the integrator passes it, else the static stand-in
    const Crowd = deps.Crowd || B.Crowd;
    const crowdA = Crowd.create({ HM, colors: { [atk.fid]: atk.color }, q: deps.q, Nature: N }), crowdD = Crowd.create({ HM, colors: { [dfd.fid]: dfd.color }, q: deps.q, Nature: N });
    group.add(crowdA.group, crowdD.group);
    const out = { R: { spear: [], bow: [], run: [], climb: [], pull: [] }, Gd: { spear: [], bow: [] }, Rb: [], Gb: [], riders: [], dRiders: [], horses: [], standards: [], dStandards: [] };
    // the camp on the attacker's side: the land's rectangle (its ditch is cut in the terrain), else one laid out beyond the lines
    let R = L.CAMP_R;
    if (!R) { const d = DIR[side], t = [d[1], -d[0]], cx = d[0] * (city.half + 640) + t[0] * 220, cz = d[1] * (city.half + 640) + t[1] * 220; R = { x0: cx - 180, x1: cx + 180, z0: cz - 125, z1: cz + 125 }; }
    ctx.R = R;
    let camp = null, army = null, fx = null;
    if (mode === 'camp' || mode === 'assault' || mode === 'stand') camp = buildCamp(ctx, out);
    if (mode !== 'camp') army = buildArmies(ctx, city, out);
    // the cap holds: if the camp, the crews and the guards took the figures past it, thin every list evenly
    const all = [...Object.values(out.R), ...Object.values(out.Gd), out.riders, out.dRiders, out.horses], total = all.reduce((a, l) => a + l.length, 0);
    if (total > cap) { const r = cap / total; all.forEach((l) => { let w = 0; for (let i = 0; i < l.length; i++) if (Math.floor((i + 1) * r) > Math.floor(i * r)) l[w++] = l[i]; l.length = w; }); } // every (1/r)-th man, so the cap holds to the figure
    for (const [kind, list] of Object.entries(out.R)) if (list.length) crowdA.add(kind, list);
    if (out.riders.length) crowdA.add('rider', out.riders);
    if (out.horses.length) crowdA.add('horse', out.horses);
    for (const [kind, list] of Object.entries(out.Gd)) if (list.length) crowdD.add(kind, list);
    if (out.dRiders.length) crowdD.add('rider', out.dRiders);
    if (crowdA.flush) crowdA.flush(); if (crowdD.flush) crowdD.flush();
    group.add(banners(bannerCache, out.Rb.concat(out.standards), atk.color, atk.glyph), banners(bannerCache, out.Gb.concat(out.dStandards), dfd.color, dfd.glyph));
    if (army || camp) fx = buildFx(ctx, city, army, camp); // the camp's cooking fires in every mode; fire, smoke, arrows and stones in an assault

    // ---------------------------------------------------------------- views (the prototype's numbers in the gate's frame, sized to the city)
    const g = city.attackGate, e1 = city.aEdge, e2 = city.wallEdge, D = city.D, y0 = g ? g.y0 : e1.y0;
    const F = army ? army.frame : (() => { const gx = g ? g.x : (e1.a[0] + e1.b[0]) / 2, gz = g ? g.z : (e1.a[1] + e1.b[1]) / 2, o = g ? g.out : e1.n, t = g ? g.tan : e1.d; return { W: (u, v) => [gx + u * t[0] + v * o[0], gz + u * t[1] + v * o[1]], dv: g && g.moat ? g.moat[1] - 54 : 0 }; })();
    const at = (u, y, v) => { const [x, z] = F.W(u, v); return [x, y, z]; };
    const cc = camp ? camp.centre : [0, 0], vc = g ? -(g.out[0] * g.x + g.out[1] * g.z) : -city.half, uc = g ? -(g.tan[0] * g.x + g.tan[1] * g.z) : 0; // the city centre in the gate's frame
    const views = {
      approach: { target: at(0.1 * D, y0, -0.2 * D), cam: at(-0.4 * D - 60, y0 + 0.32 * D + 160, 540 + F.dv), fov: 40, shadow: [...F.W(0, 0.1 * D + 200 + F.dv), 0.7 * D + 420], ao: 5 }, // from behind the army: the lines, the engines, the city beyond
      gate: { target: at(4, y0 + 12, 6), cam: at(-78, y0 + 72, 205), fov: 40, shadow: [...F.W(0, 0), 330], ao: 1.6 },
      wall: { target: [e2.a[0] + e2.d[0] * e2.len * 0.62 + e2.n[0] * 4, e2.y0 + city.H + 2, e2.a[1] + e2.d[1] * e2.len * 0.62 + e2.n[1] * 4], cam: [e2.a[0] + e2.d[0] * e2.len * 0.1 + e2.n[0] * 46, e2.y0 + 28, e2.a[1] + e2.d[1] * e2.len * 0.1 + e2.n[1] * 46], fov: 42, shadow: [(e2.a[0] + e2.b[0]) / 2 + e2.n[0] * 30, (e2.a[1] + e2.b[1]) / 2 + e2.n[1] * 30, 280], ao: 1.4 },
      camp: { target: [cc[0] + 5, L.h(cc[0], cc[1]) + 2, cc[1] + 8], cam: [cc[0] - 248, L.h(cc[0], cc[1]) + 148, cc[1] - 233], fov: 40, shadow: [cc[0], cc[1], 260], ao: 3 },
      field: { target: at(10, y0 + 8, 110 + F.dv), cam: at(-80, y0 + 32, 345 + F.dv), fov: 42, shadow: [...F.W(0, 200 + F.dv), 380], ao: 1.4 },
      result: { target: at(-2, y0 + city.H + 9, 2), cam: at(52, y0 + city.H + 24, 96), fov: 38, shadow: [...F.W(0, 10), 200], ao: 1.5 },
    };
    // labels: the city, the lanes of the siege, the camp's parts, the halls, projected by the camera given to focus()
    const gSide = g ? g.side : side, wSide = e2.side, v3 = new T.Vector3(), v2 = new T.Vector2();
    const LABELS = [
      { text: `${desc.city.name} (${dfd.name} giữ)`, kind: 'city', p: [0, city.G0 + 0.1 * D + 50, 0] },
      ...(camp ? [{ text: `Doanh trại ${atk.name}`, kind: 'place', p: [cc[0], L.h(cc[0], cc[1]) + 30, cc[1]] }] : []),
      ...(army ? [{ text: `Cổng ${SIDE_VI[gSide]}: xe húc, thang mây`, kind: 'lane', p: at(0, y0 + 24, 60 + F.dv) }, { text: `Tường ${SIDE_VI[wSide]}: tháp tên, thang`, kind: 'lane', p: [(e2.a[0] + e2.b[0]) / 2 + e2.n[0] * 90, e2.y0 + 20, (e2.a[1] + e2.b[1]) / 2 + e2.n[1] * 90] }, { text: 'Máy bắn đá', kind: 'thing', p: at(0, y0 + 18, 250 + F.dv) }] : []),
      ...(ctx.harbour ? [{ text: 'Bến sông: thuyền', kind: 'lane', p: [ctx.harbour[0], 16, ctx.harbour[1]] }] : []),
      ...(camp ? [[652, 20, 752, 'Cổng, cự mã trước hào'], [650, 16, 897, `Trướng chỉ huy, cờ ${atk.glyph}`], [770, 8, 946, 'Tàu ngựa'], [522, 10, 944, 'Kho lương, xe lương'], [790, 16, 812, 'Xưởng công thành'], [537, 14, 800, 'Giáo trường, đài điểm tướng'], [838, 12, 830, 'Luỹ đất, hào, hàng rào gỗ']].map(([x, y, z, text]) => ({ text, kind: 'camp', p: [cc[0] + (x - 650) * clamp((R.x1 - R.x0) / 360, 0.75, 1.25), y, cc[1] + (z - 885) * clamp((R.z1 - R.z0) / 250, 0.75, 1.25)] })) : []),
      ...city.labels,
    ];
    let cam = deps.camera || null;
    const focus = (c) => { cam = c || cam; if (cam) for (const cr of [crowdA, crowdD]) if (cr.focus) cr.focus(cam); };
    if (cam) focus(cam);
    const labels = (c, w, h) => {
      const camera = c || cam; if (!camera) return [];
      let W = w, Hh = h; if (!W && deps.renderer) { deps.renderer.getSize(v2); W = v2.x; Hh = v2.y; } W = W || 1; Hh = Hh || 1;
      return LABELS.map((l) => { v3.set(...l.p).project(camera); return { text: l.text, kind: l.kind, x: (v3.x + 1) * 0.5 * W, y: (1 - v3.y) * 0.5 * Hh, visible: v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 }; });
    };
    let time = 0;
    const tick = (dt = 0) => { time += dt; if (fx) fx.tick(time); if (crowdA.tick) crowdA.tick(time); if (crowdD.tick) crowdD.tick(time); };
    const stats = () => {
      const s = { soldiers: crowdA.count + crowdD.count, attackers: crowdA.count, defenders: crowdD.count, engines: army ? army.engines : 0, boats: army ? army.boats : 0, tents: camp ? camp.tents : 0, fx: fx ? fx.sprites : 0, tier, figuresPerMan: +k.toFixed(3), cityScale: +city.S.toFixed(1), citySide: Math.round(city.D), crowd: [crowdA.stats(), crowdD.stats()] };
      if (deps.renderer) { s.calls = deps.renderer.info.render.calls; s.triangles = deps.renderer.info.render.triangles; }
      return s;
    };
    const dispose = () => {
      group.traverse((o) => { if (o.isMesh || o.isSprite) { if (o.geometry) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m) { if (m.map) m.map.dispose(); m.dispose(); } } });
      for (const d of disposables) d.dispose(); crowdA.dispose(); crowdD.dispose(); if (fx) fx.dispose();
      for (const m of Object.values(bannerCache)) { if (m.map) m.map.dispose(); m.dispose(); }
      if (group.parent) group.parent.remove(group);
    };
    return { group, tick, views, labels, focus, stats, dispose, trees: city.trees, land: L, city, camp, side, tier };
  };
})();
