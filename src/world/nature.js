// Close-up nature for the battle scenes at 1 unit = 1 m (docs/design/visual-build.md §2), from the approved siege
// prototype (docs/design/prototypes/siege/sg-nature.js). Classic script, three r146 global. Everything is generated in
// code: no textures, no models. Seeded random only.
//   const L = Nature.land(spec)                    heights, water, land use (roads, fields, woods, trampled ground)
//   Nature.terrain(L, env, q) · Nature.water(L, env) · Nature.rocks(L, env, q) · Nature.trees(L, env, sun, extra, q)
// q is the quality tier ({ tier: 'high'|'mid'|'low', trees }); none means high. Plants and rocks are bucketed into 80 m
// cells (decisions/0005 §5): each cell is an InstancedMesh with its own bounding sphere, culled by the camera.
(function () {
  const N = (window.Nature = {});
  const T = THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  N.util = { clamp, lerp, sstep };

  // ---------------------------------------------------------------- noise (JS: geometry, placement)
  const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const h3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const vn2 = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v); };
  const vn3 = (x, y, z) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const a = lerp(lerp(h3(i, j, k), h3(i + 1, j, k), u), lerp(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v), b = lerp(lerp(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), lerp(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v);
    return lerp(a, b, w);
  };
  const fbm2 = (x, y, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn2(x, y); x = x * 2.03 + 17; y = y * 2.03 + 11; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  const fbm3 = (x, y, z, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn3(x, y, z); x = x * 2.03 + 17; y = y * 2.03 + 11; z = z * 2.03 + 5; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  const ridged3 = (x, y, z, o = 3) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(vn3(x, y, z) * 2 - 1)); x = x * 2.1 + 7; y = y * 2.1 + 3; z = z * 2.1 + 1; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  const ridged2 = (x, y, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(vn2(x, y) * 2 - 1)); x = x * 2.1 + 7; y = y * 2.1 + 3; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  N.noise = { h2, h3, vn2, vn3, fbm2, fbm3, ridged2, ridged3 };
  N.rnd = rnd; N.seed = (s) => (seed = s);

  // the same noise in GLSL (world-space shading)
  N.GLSL = `
    float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vn2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
    float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
    float fbm2(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn2(p); p = mat2(1.62, 1.19, -1.19, 1.62) * p + 17.; a *= .5; } return s / .9375; }
    float fbm3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = mat3(.97, 1.22, -1.29, -1.62, .73, -.97, 0., 1.62, 1.22) * p + 17.; a *= .5; } return s / .9375; }
    float rn2(vec2 p){ return .5 + (vn2(p) + vn2(mat2(.8, .6, -.6, .8) * p * 1.13 + 3.1) - 1.) * .72; }
    float rn3(vec3 p){ return .5 + (vn3(p) + vn3(mat3(.48, .6, -.64, -.8, .36, -.48, 0., .8, .6) * p * 1.13 + 3.1) - 1.) * .72; }
    vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
    // distance to the nearest cell edge of a 3D Voronoi pattern (0 on the edge): cracks, joints
    float cellEdge(vec3 x){ vec3 i = floor(x), f = fract(x); float d1 = 8., d2 = 8.;
      for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int l = -1; l <= 1; l++) { vec3 b = vec3(l, j, k), r = b + h33(i + b) - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return sqrt(d2) - sqrt(d1); }
    // fade a pattern out before it is smaller than a couple of pixels (no shimmer)
    float fadeFreq(vec3 p, float f){ return 1. - smoothstep(.25, .6, length(fwidth(p)) * f); }
    // bump from a height: perturb the normal with the height's screen-space derivatives
    vec3 bumpN(vec3 n, vec3 pos, float hgt){ vec3 dpx = dFdx(pos), dpy = dFdy(pos); float dhx = dFdx(hgt), dhy = dFdy(hgt);
      vec3 r1 = cross(dpy, n), r2 = cross(n, dpx); float det = dot(dpx, r1); vec3 g = sign(det) * (dhx * r1 + dhy * r2); return normalize(abs(det) * n - g); }
  `;
  // world position and normal as varyings (instancing aware)
  N.worldVaryings = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 wp4 = vec4(transformed, 1.0); vec3 wn = objectNormal;
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4; wn = mat3(instanceMatrix) * wn;
      #endif
        vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * wn); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;\n' + N.GLSL);
  };

  // ---------------------------------------------------------------- quality and cells
  const tierOf = (q) => (typeof q === 'string' ? q : q && q.tier) || 'high'; // a tier name or a Quality tier object
  const TREES = { high: 12000, mid: 6000, low: 2500 };
  N.CELL = 80;
  // a geometry that shares another's buffers but has its own bounding sphere: three r146 culls an InstancedMesh by its
  // geometry's sphere only, so every cell needs one round its members
  const cellGeo = (base, sphere) => {
    const g = new T.BufferGeometry(); g.setIndex(base.index);
    for (const k in base.attributes) g.setAttribute(k, base.attributes[k]);
    g.boundingSphere = sphere; return g;
  };
  const WHITE = new T.Color(1, 1, 1);
  // a mesh drawn into the shadow map only: the camera pass calls onBeforeRender (the shadow pass does not) and an empty
  // draw range makes the renderer skip the draw
  const shadowOnly = (m) => {
    m.onBeforeRender = (r, s, c, g) => { g.drawRange.count = 0; };
    m.onAfterRender = (r, s, c, g) => { g.drawRange.count = Infinity; };
  };
  // instances of one or more geometries (parts: [{ geo, mat, depth, shadow }], e.g. leaves and bark) bucketed into
  // square cells of `size` metres. members: [[x, y, z, r, h]] (r: radius round the axis, h: height above y).
  // begin() · put(k, matrix16, rgb) · end() refill the cells; a cell with no instance is hidden (no empty draw call).
  // Every mesh carries instance colours from creation (one shader program per material in r146).
  const cells = (group, parts, members, size) => {
    const idx = new Map(), slot = new Int32Array(members.length), boxes = [];
    members.forEach(([x, y, z, r, h], k) => {
      const key = Math.floor(x / size) + ',' + Math.floor(z / size);
      let c = idx.get(key); if (c === undefined) { c = boxes.length; idx.set(key, c); boxes.push({ n: 0, b: new T.Box3() }); }
      slot[k] = c; boxes[c].n++; boxes[c].b.expandByPoint(new T.Vector3(x - r, y - 1, z - r)).expandByPoint(new T.Vector3(x + r, y + h, z + r));
    });
    const meshes = boxes.map((c) => {
      const sphere = c.b.getBoundingSphere(new T.Sphere());
      return parts.map((p) => {
        const m = new T.InstancedMesh(cellGeo(p.geo, sphere), p.mat, c.n);
        m.frustumCulled = true; m.castShadow = !!p.shadow; m.receiveShadow = true; if (p.depth) m.customDepthMaterial = p.depth;
        m.setColorAt(0, WHITE); m.count = 0; m.visible = false; if (p.shadowOnly) shadowOnly(m); group.add(m); return m;
      });
    });
    const fill = new Int32Array(boxes.length), spheres = meshes.map((ms) => ms[0].geometry.boundingSphere), cast = parts.map((p) => !!p.shadow), sw = new T.Sphere();
    return {
      meshes, count: boxes.length,
      // casters only where their shadow can fall in the view: the cell's sphere swept away from the sun (sunDir points
      // to the sun) must meet the camera's frustum
      shadows: (frustum, sunDir) => meshes.forEach((ms, c) => {
        const S = spheres[c], len = (2 * S.radius) / Math.max(0.15, sunDir.y); let on = false;
        for (let t = 0; t <= 1 && !on; t += 0.5) on = frustum.intersectsSphere(sw.set(sw.center.copy(S.center).addScaledVector(sunDir, -len * t), S.radius));
        ms.forEach((m, k) => (m.castShadow = cast[k] && on));
      }),
      begin: () => fill.fill(0),
      put: (k, m16, rgb) => { const c = slot[k], i = fill[c]++; for (const m of meshes[c]) { m.instanceMatrix.array.set(m16, i * 16); m.instanceColor.array.set(rgb, i * 3); } },
      end: () => meshes.forEach((ms, c) => { for (const m of ms) { m.count = fill[c]; m.visible = fill[c] > 0; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; } }),
    };
  };

  // ---------------------------------------------------------------- the land
  // spec = { EXT, HC, river, tributary, hills, camp, seed }. Default: the Thọ Xuân layout of the prototype: the city
  // (half-size HC) on the south bank of a big river to the north (the Huai), a tributary on the west (the Fei) feeding
  // the moat, rocky hills north-east (Bagong), the besiegers' camp south-east and the siege ground on the camp's side.
  // Sides are compass letters; north is -z, east is +x. A side frame maps (x, z) to (a along the side, b outward).
  const FRAME = {
    n: { to: (x, z) => [x, -z], from: (a, b) => [a, -b] },
    s: { to: (x, z) => [x, z], from: (a, b) => [a, b] },
    e: { to: (x, z) => [z, x], from: (a, b) => [b, a] },
    w: { to: (x, z) => [z, -x], from: (a, b) => [-b, a] },
  };
  const AXIS = { n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
  // corner mirrors: the prototype's layout is ne for the hills and se for the camp
  const MIRROR_HILLS = { ne: [1, 1], nw: [-1, 1], se: [1, -1], sw: [-1, -1] }, MIRROR_CAMP = { se: [1, 1], sw: [-1, 1], ne: [1, -1], nw: [-1, -1] };
  N.land = function (spec = {}) {
    const has = (k) => Object.prototype.hasOwnProperty.call(spec, k);
    const HC = spec.HC ?? 210, MOAT0 = HC + 26, MOAT1 = HC + 54, WATER = -1.0, EXT = spec.EXT ?? 1600;
    const RIV = has('river') ? spec.river : 'n', HILL = has('hills') ? spec.hills : 'ne', CAMPS = spec.camp || 'se';
    let TRIB = has('tributary') ? spec.tributary : 'w';
    if (TRIB && TRIB === RIV) TRIB = AXIS[RIV] === 'ns' ? 'w' : 's'; // never on the river's own side
    // the big river: a meander about 660 m out on its side, 180 m wide
    const HUAI_W = 180, FEI_W = 62;
    const riverB = (a) => 660 - 95 * Math.sin(a / 540) - 42 * Math.sin(a / 215 + 1.3);
    const riverBd = (a) => -(95 / 540) * Math.cos(a / 540) - (42 / 215) * Math.cos(a / 215 + 1.3);
    // the tributary: about 480 m out on its side, 62 m wide, running into the big river
    const tribB = (a) => 480 - 85 * Math.sin(a / 340 + 0.4) - 28 * Math.sin(a / 150);
    const tribBd = (a) => -(85 / 340) * Math.cos(a / 340 + 0.4) - (28 / 150) * Math.cos(a / 150);
    const FR = RIV && FRAME[RIV], FT = TRIB && FRAME[TRIB];
    const riverAt = (a) => (FR ? FR.from(a, riverB(a)) : null), tribAt = (a) => (FT ? FT.from(a, tribB(a)) : null);
    const huaiZ = (x) => (FR ? riverAt(x)[1] : -1e9), feiX = (z) => (FT ? tribAt(z)[0] : -1e9); // the prototype's names (default layout)
    const cheb = (x, z) => Math.max(Math.abs(x), Math.abs(z));
    const landSide = (x, z) => { if (!FR) return true; const [a, b] = FR.to(x, z); return b < riverB(a) + 30; };
    const dHuai = (x, z) => { if (!FR) return 1e9; const [a, b] = FR.to(x, z); return Math.abs(b - riverB(a)) / Math.sqrt(1 + riverBd(a) ** 2) - HUAI_W / 2; };
    const dFei = (x, z) => { if (!FT || !landSide(x, z)) return 1e9; const [a, b] = FT.to(x, z); return Math.abs(b - tribB(a)) / Math.sqrt(1 + tribBd(a) ** 2) - FEI_W / 2; };
    const dCanal = (x, z) => { if (!FT) return 1e9; const [a, b] = FT.to(x, z); return b > MOAT0 - 4 && b < tribB(a) + 5 ? Math.abs(a - 12) - 9 : 1e9; }; // the moat takes its water from the tributary
    const dMoat = (x, z) => { const c = cheb(x, z); return Math.max(MOAT0 - c, c - MOAT1); };
    const riverSD = (x, z) => Math.min(dHuai(x, z), dFei(x, z), dCanal(x, z));
    const waterSD = (x, z) => Math.min(riverSD(x, z), dMoat(x, z));
    // rocky hills in one corner (Bagong); a lower spur beside them
    const [hmx, hmz] = HILL ? MIRROR_HILLS[HILL] : [1, 1];
    const hills = !HILL ? () => 0 : (x0, z0) => {
      const x = x0 * hmx, z = z0 * hmz;
      const a = Math.hypot((x - 900) / 560, (z + 230) / 360), b = Math.hypot((x - 1350) / 330, (z - 160) / 260);
      const m = Math.max(0, 1 - a) ** 1.25 * 120 + Math.max(0, 1 - b) ** 1.4 * 60;
      return m ? m * (0.62 + 0.75 * ridged2(x / 190 + 3, z / 190)) : 0;
    };
    const HILLS_C = [900 * hmx, -230 * hmz]; // the hills' centre (world)
    const farMtn = (x, z) => { const r = Math.hypot(x * 0.85, z), k = sstep(2300, 4300, r); return k ? k * (140 + 520 * ridged2(x / 700 + 9, z / 700, 5) ** 1.6 + 60 * ridged2(x / 160, z / 160)) : 0; };
    const land = (x, z) => 3.4 + 6.5 * (fbm2(x / 480, z / 480) - 0.5) + 1.2 * (fbm2(x / 95, z / 95) - 0.5) + hills(x, z) + farMtn(x, z);
    const h = (x, z) => {
      let y = land(x, z);
      const c = cheb(x, z);
      y = lerp(2.0, y, sstep(HC + 16, MOAT0 - 2, c)); // the city's flat ground and the berm to the moat
      y = lerp(-5.5, y, sstep(-8, 34, riverSD(x, z)));
      y = lerp(-4.0, y, sstep(-2, 4, dMoat(x, z)));
      return y;
    };
    // roads: one out of each side, a little wavy; the one on the river's side stops at the bank, the one on the
    // tributary's side crosses it. Templates in side frames (a along, b outward), the prototype's order and seeds.
    const wavy = (pts, amp, sd) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 20)), nx = -(bz - az) / L, nz = (bx - ax) / L; for (let k = 0; k < n; k++) { const t = k / n, w = amp * (fbm2(sd + (i + t) * 1.7, sd) - 0.5) * Math.sin(Math.PI * Math.min(1, t * 4)); out.push([ax + (bx - ax) * t + nx * w, az + (bz - az) * t + nz * w]); } } out.push(pts[pts.length - 1]); return out; };
    const ROAD = {
      s: [[[0, HC + 40], [60, 700], [260, 1400], [500, 2600]], 40, 1],
      e: [[[0, HC + 40], [60, 800], [260, 1500], [380, 2600]], 50, 2],
      w: [[[12, HC + 40], [20, 550], [120, 1200], [260, 2600]], 30, 3],
      n: [[[0, HC + 40], [60, 700], [260, 1400], [500, 2600]], 40, 4],
    };
    const roads = ['s', 'e', 'w', 'n'].map((sd) => {
      let [pts, amp, seed] = ROAD[sd];
      if (sd === RIV) { pts = [[0, HC + 40], [30, 420], [50, riverB(50) - HUAI_W / 2 + 4]]; amp = 20; }
      else if (sd === TRIB) pts = pts.map((p, i) => (i === 1 ? [20, tribB(12) + 70] : p));
      return wavy(pts.map(([a, b]) => FRAME[sd].from(a, b)), amp, seed);
    });
    const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
    const roadD = (x, z) => { let d = 1e9; for (const r of roads) for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1]; if (Math.abs(a[0] - x) > 80 && Math.abs(b[0] - x) > 80 && Math.sign(a[0] - x) === Math.sign(b[0] - x)) continue; if (Math.abs(a[1] - z) > 80 && Math.abs(b[1] - z) > 80 && Math.sign(a[1] - z) === Math.sign(b[1] - z)) continue; d = Math.min(d, segD(x, z, a[0], a[1], b[0], b[1])); } return d; };
    // the besiegers' camp in one corner; the siege ground (trampled) before the wall on the camp's side
    const [cmx, cmz] = MIRROR_CAMP[CAMPS] || MIRROR_CAMP.se;
    const cx0 = 470 * cmx, cx1 = 830 * cmx, cz0 = 760 * cmz, cz1 = 1010 * cmz;
    const CAMP_R = { x0: Math.min(cx0, cx1), x1: Math.max(cx0, cx1), z0: Math.min(cz0, cz1), z1: Math.max(cz0, cz1) }, CAMP = [650 * cmx, 885 * cmz, 180];
    const CAMP_FACE = cmz > 0 ? 'n' : 's'; // the camp's side that faces the city (its main gate)
    const campIn = (x, z) => Math.min(x - CAMP_R.x0, CAMP_R.x1 - x, z - CAMP_R.z0, CAMP_R.z1 - z); // > 0 inside, metres from the rampart
    const trampled = (x, z0) => { const z = z0 * cmz; return Math.max(sstep(470, 380, Math.abs(x)) * sstep(HC + 54, HC + 80, z) * sstep(HC + 560, HC + 380, z) * (0.55 + 0.45 * fbm2(x / 40, z0 / 40)), sstep(-34, -6, campIn(x, z0))); };
    // land use, baked over ±EXT (6.25 m a pixel at 1600): r woods, g field parcel (0 none), b road, a trampled / city ground
    const RES = Math.round((512 * EXT) / 1600 / 64) * 64 || 64, data = new Uint8Array(RES * RES * 4), wood = new Float32Array(RES * RES), field = new Float32Array(RES * RES);
    const ang = 0.13, ca = Math.cos(ang), sa = Math.sin(ang), R0 = Math.min(1500, EXT * 0.94), R1 = Math.min(1100, EXT * 0.69);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = -EXT + ((i + 0.5) / RES) * 2 * EXT, z = -EXT + ((j + 0.5) / RES) * 2 * EXT, q = (j * RES + i) * 4, sd = waterSD(x, z), c = cheb(x, z), hl = hills(x, z);
      const rd = c > MOAT1 ? roadD(x, z) : 1e9, road = sstep(7, 2.5, rd), tr = trampled(x, z), city = c < HC - 8 ? 1 : 0;
      let w = Math.max(sstep(0.56, 0.68, fbm2(x / 310 + 11, z / 310 + 4)) * sstep(R0, R1, Math.hypot(x, z)), hl > 6 ? sstep(6, 22, hl) * 0.95 : 0, sd > 6 && sd < 26 && riverSD(x, z) < 26 ? 0.45 : 0);
      if (sd < 4 || c < MOAT1 + 30 || rd < 12 || tr > 0.3) w = 0;
      // parcels on the plain near the city: a rotated grid of strips, each a crop
      let f = 0;
      if (!w && sd > 20 && c > MOAT1 + 24 && hl < 2 && rd > 9 && tr < 0.2 && Math.hypot(x, z) < R0) {
        const u = x * ca - z * sa, v = x * sa + z * ca, cu = Math.floor(u / 72), cv = Math.floor(v / 34), hh = h2(cu, cv);
        const fu = u / 72 - cu, fv = v / 34 - cv, edge = Math.min(fu, 1 - fu) * 72 > 1.5 && Math.min(fv, 1 - fv) * 34 > 1.5;
        if (hh < 0.82 && edge) f = 0.2 + 0.8 * h2(cu + 7, cv + 3);
      }
      wood[j * RES + i] = w; field[j * RES + i] = f;
      data[q] = w * 255; data[q + 1] = f * 255; data[q + 2] = road * 255; data[q + 3] = Math.max(tr, city) * 255;
    }
    const tex = new T.DataTexture(data, RES, RES, T.RGBAFormat); tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
    const at = (arr, x, z) => { const i = Math.floor(((x + EXT) / (2 * EXT)) * RES), j = Math.floor(((z + EXT) / (2 * EXT)) * RES); return i < 0 || j < 0 || i >= RES || j >= RES ? 0 : arr[j * RES + i]; };
    return { HC, MOAT0, MOAT1, WATER, h, cheb, riverSD, waterSD, dMoat, hills, huaiZ, feiX, riverAt, tribAt, roads, roadD, trampled, CAMP, CAMP_R, CAMP_GATE: 6.5, CAMP_FACE, campIn, EXT, landTex: tex, landData: data, landRes: RES,
      woodAt: (x, z) => at(wood, x, z), fieldAt: (x, z) => at(field, x, z), sides: { river: RIV || null, tributary: TRIB || null, hills: HILL || null, camp: CAMPS }, HILLS_C, seed: spec.seed ?? 0,
      slope: (x, z) => { const e = 3; return Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e); } };
  };

  // ---------------------------------------------------------------- the terrain: two grids (fine centre, coarse horizon), shaded in the fragment shader
  const grid = (L, cx, cz, size, n, drop) => {
    const g = new T.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; let y = L.h(x, z); if (drop && Math.max(Math.abs(x), Math.abs(z)) < drop) y -= 40; p.setXYZ(i, x, y, z); }
    g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
  };
  // low tier: no bump and no small-scale detail layers (NATURE_LOW)
  N.terrain = function (L, env, q) {
    const tier = tierOf(q), mat = new T.MeshStandardMaterial({ roughness: 0.95, metalness: 0, envMap: env, envMapIntensity: 0.35 });
    mat.extensions = { derivatives: true };
    if (tier === 'low') mat.defines = { NATURE_LOW: '' };
    const R = L.CAMP_R, U = { uLand: { value: L.landTex }, uExt: { value: L.EXT }, uHC: { value: L.HC }, uCamp: { value: new T.Vector4(R.x0, R.x1, R.z0, R.z1) }, uGate: { value: L.CAMP_GATE } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uLand; uniform float uExt, uHC, uGate; uniform vec4 uCamp;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          { // the camp's ditch (SGS.camp sweeps it): a ring 5.9–12.5 m outside the rampart, causeways at the gates
            vec2 cc = vec2(uCamp.x + uCamp.y, uCamp.z + uCamp.w) * .5, dd = abs(vWP.xz - cc) - vec2(uCamp.y - uCamp.x, uCamp.w - uCamp.z) * .5;
            float sdc = max(dd.x, dd.y); bool cw = dd.y > dd.x ? abs(vWP.x - cc.x) < uGate : abs(vWP.z - cc.y) < uGate;
            if (sdc > 5.9 && sdc < 12.5 && !cw) discard; }
          vec2 luv = (vWP.xz + uExt) / (2. * uExt);
          vec4 lu = (luv.x > 0. && luv.x < 1. && luv.y > 0. && luv.y < 1.) ? texture2D(uLand, luv) : vec4(0.);
          float slope = 1. - clamp(vWN.y, 0., 1.);
          float n1 = fbm2(vWP.xz / 60.), n2 = vn2(vWP.xz / 7.) * fadeFreq(vWP, 1. / 7.) + .5 * (1. - fadeFreq(vWP, 1. / 7.)), n3 = vn2(vWP.xz * 1.3) * fadeFreq(vWP, 1.3) + .5 * (1. - fadeFreq(vWP, 1.3));
          // autumn grass: green in the low wet ground, gold on the dry rises
          vec3 green = vec3(.06, .1, .03), gold = vec3(.15, .125, .05), dry = vec3(.19, .16, .09);
          vec3 col = mix(green, gold, smoothstep(.42, .85, n1 + (vWP.y - 2.) * .02));
          col = mix(col, dry, smoothstep(.62, .8, fbm2(vWP.xz / 23. + 5.)) * .6);
          // fields: stubble, ploughed earth, winter wheat, fallow; furrows along each parcel
          if (lu.g > .05) {
            vec2 pq = mat2(cos(.13), -sin(.13), sin(.13), cos(.13)) * vWP.xz; float crop = .2 + .8 * h12(floor(pq / vec2(72., 34.)) + vec2(7., 3.));
            vec3 fc = crop < .45 ? vec3(.36, .26, .09) : crop < .65 ? vec3(.16, .1, .05) : crop < .82 ? vec3(.11, .17, .04) : vec3(.24, .2, .09);
            float ang = .13; vec2 uv = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * vWP.xz;
            float fur = .5 + .5 * sin((crop > .5 ? uv.y : uv.x) * 3.1);
            fur = mix(.5, fur, fadeFreq(vWP, 3.1 / 6.28));
            col = mix(col, mix(fc, col, .35) * (.9 + .2 * fur), smoothstep(.25, .6, lu.g));
          }
          // woods: dark leaf litter under the trees
          col = mix(col, vec3(.13, .12, .05), lu.r * .65);
          // trampled siege ground, the camp, the city's streets and yards: bare earth
          col = mix(col, mix(vec3(.17, .13, .08), vec3(.25, .2, .13), n2), lu.a * mix(.55, .9, smoothstep(.3, .7, fbm2(vWP.xz / 18.))));
          // roads: packed earth with wheel ruts
          col = mix(col, vec3(.3, .24, .15) * (.9 + .2 * n3), lu.b);
          // banks and riverbed: sand, then wet dark mud under water
          float wet = smoothstep(1.2, -.6, vWP.y);
          col = mix(col, vec3(.34, .29, .2), smoothstep(.7, -.4, vWP.y) * (1. - lu.a));
          col = mix(col, vec3(.16, .15, .11), wet);
          // scrub on the hills, darker in the folds
          col = mix(col, mix(vec3(.08, .1, .04), vec3(.16, .15, .07), n1) * (.8 + .4 * n2), smoothstep(10., 30., vWP.y) * (1. - step(1500., length(vWP.xz))) * .85);
          // rock on the steep ground (the hills), in bands
          float strata = .85 + .15 * sin(vWP.y * .9 + fbm2(vWP.xz / 30.) * 6.);
          col = mix(col, vec3(.33, .3, .26) * strata * (.8 + .4 * n2), smoothstep(.35, .6, slope));
          // snow-free distant mountains: blue-grey rock with scrub
          col = mix(col, mix(vec3(.12, .15, .08), vec3(.2, .2, .21), smoothstep(.25, .55, slope)) * (.8 + .4 * fbm2(vWP.xz / 40.)), smoothstep(60., 200., vWP.y) * step(1500., length(vWP.xz)));
          #ifdef NATURE_LOW
          { // few trees at the low tier: the woods' mask is painted as a canopy seen from above, so they still read as woods
            float cn = fbm2(vWP.xz / 45. + 3.), dp = vn2(vWP.xz / 5.);
            vec3 canopy = mix(mix(vec3(.05, .08, .025), vec3(.2, .13, .03), smoothstep(.45, .7, cn)), vec3(.26, .07, .03), smoothstep(.7, .8, cn) * .6);
            col = mix(col, canopy * (.7 + .5 * dp), smoothstep(.1, .5, lu.r) * .85 * (1. - smoothstep(.35, .6, slope))); }
          #endif
          col *= .8 + .4 * n3 * (.5 + .5 * n2);
          #ifndef NATURE_LOW
          { float fc = fadeFreq(vWP, 2.2), g1 = rn2(vWP.xz * 2.2), g2 = rn2(vWP.xz * 5.3 + 9.);
            col = mix(col, col * vec3(.8, .95, .7), smoothstep(.55, .8, g1) * fc * (1. - lu.a) * (1. - lu.b) * .6);        // greener tufts
            col = mix(col, col * vec3(1.15, 1.05, .85), smoothstep(.6, .85, g2) * fc * (1. - lu.b) * .5);                 // dry blades
            float gm = (1. - lu.a) * (1. - lu.b) * (1. - smoothstep(.2, .5, lu.g)), fk = fadeFreq(vWP, .9), fs = fadeFreq(vWP, .12);
            float cl = rn2(vWP.xz * .9 + 2.) * .55 + rn2(vWP.xz * 2.3) * .3 * fadeFreq(vWP, 2.3) + rn2(vWP.xz * 5.3 + 1.) * .15 * fadeFreq(vWP, 5.3);
            col *= mix(1., .72 + .5 * cl, fk * gm);                                                                         // clumps
            col = mix(col, col * vec3(1.22, 1.1, .82), smoothstep(.5, .8, fbm2(vWP.xz * .1 + 7.)) * fs * gm * .7);     // straw patches
            float lit = smoothstep(.6, .68, rn2(vWP.xz * 6.2 + 4.)) * fadeFreq(vWP, 6.2) * lu.r;                                       // fallen leaves in the woods
            col = mix(col, mix(vec3(.3, .12, .03), vec3(.42, .3, .06), vn2(vWP.xz * 7.)), lit * .8); }
          #endif
          diffuseColor.rgb = col;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          #ifndef NATURE_LOW
          { float hb = (vn2(vWP.xz * .9) * fadeFreq(vWP, .9) + vn2(vWP.xz * 3.7) * .4 * fadeFreq(vWP, 3.7)) * (.25 + smoothstep(.3, .6, 1. - clamp(vWN.y, 0., 1.)));
            normal = bumpN(normal, -vViewPosition, hb * .22); }
          #endif`);
    };
    mat.customProgramCacheKey = () => 'nature-terrain-' + (tier === 'low' ? 'low' : 'full');
    const S = 2 * L.EXT + 200, cell = tier === 'low' ? 14 : 10; // 10 m a quad over the land-use square, a coarse ring to the horizon
    const near = new T.Mesh(grid(L, 0, 0, S, Math.round(S / cell), 0), mat), far = new T.Mesh(grid(L, 0, 0, 13000, 180, L.EXT + 40), mat);
    near.receiveShadow = true; far.receiveShadow = true;
    const g = new T.Group(); g.add(near, far); return g;
  };

  // ---------------------------------------------------------------- water: rivers and the moat, one plane at the water level
  N.water = function (L, env) {
    const mat = new T.MeshStandardMaterial({ color: new T.Color(0x2f5a5c), roughness: 0.06, metalness: 0.0, envMap: env, envMapIntensity: 1.3, transparent: true, opacity: 0.86 });
    const U = { uTime: { value: 0 } };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float t = uTime; float hw = vn2(vWP.xz / 9. + vec2(t * .08, t * .05)) + .5 * vn2(vWP.xz / 3.1 - vec2(t * .11, -t * .07)) + .25 * vn2(vWP.xz * .9 + t * .2);
            normal = bumpN(normal, -vViewPosition, hw * .22); }`);
    };
    const m = new T.Mesh(new T.PlaneGeometry(9000, 9000, 1, 1).rotateX(-Math.PI / 2), mat); m.position.y = L.WATER; m.renderOrder = 2;
    m.userData.U = U; return m;
  };

  // ---------------------------------------------------------------- rocks: tower karst (峰林) and boulders
  // A tower of limestone, height 1: a talus flare at the foot, steep walls, a domed top. Horizontal beds leave ledges
  // and undercut notches; vertical joints open into clefts; rain cuts grooves down the walls; caves at the foot.
  // at(angle, v) gives the radius and how deep the surface sits in a hollow (the vertex colour darkens it).
  const pillarShape = (seed) => {
    const s = seed, K = 4 + (Math.floor(seed * 7) % 5), ng = 8 + (Math.floor(seed * 3) % 5);
    const joints = [0, 1, 2].map((k) => s * 1.7 + k * 2.1 + Math.sin(s + k) * 0.4), caves = [s * 0.9 + 1.2, s * 2.3 + 3.9];
    const angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    const R0 = (v) => { let r = 0.34 * (1.1 - 0.22 * v) * (1 + 0.45 * (1 - sstep(0, 0.14, v))); if (v > 0.8) r *= Math.pow(Math.max(0, 1 - ((v - 0.8) / 0.2) ** 2), 0.55); return r; };
    const plan = (a, v) => 0.11 * Math.sin(2 * a + s) + 0.07 * Math.sin(3 * a + 2.3 * s + v * 1.5) + 0.045 * Math.sin(5 * a + 0.7 * s) + 0.03 * Math.sin(7 * a + 1.9 * s);
    const at = (a, v, fine) => {
      const r0 = R0(v), k = r0 / 0.34, ca = Math.cos(a), sa = Math.sin(a);
      const bp = v * K + 1.4 * fbm3(ca * 0.9 + s, v * 0.6, sa * 0.9, 3), f = bp - Math.floor(bp), lm = sstep(0.42, 0.62, fbm3(ca * 1.6 + s * 2, v * 1.2, sa * 1.6, 2));
      const ledge = (-0.034 * (1 - sstep(0, 0.2, f)) + 0.008 * sstep(0.75, 1, f)) * lm;
      const warp = 1.8 * fbm3(ca * 1.3, v * 2.2 + s, sa * 1.3, 3), g = Math.abs(Math.sin((ng * a) / 2 + warp));
      const groove = -0.055 * (1 - sstep(0, 0.22, g)) * sstep(0.08, 0.25, v) * (1 - sstep(0.82, 0.95, v));
      let cleft = 0; for (let j = 0; j < 3; j++) cleft -= 0.13 * Math.exp(-((angD(a, joints[j]) / 0.045) ** 2)) * sstep(0.05, 0.3, v) * (0.6 + 0.4 * Math.sin(v * 9 + j));
      let cave = 0; for (const c of caves) cave -= 0.1 * Math.exp(-((angD(a, c) / 0.18) ** 2) - ((v - 0.13) / 0.06) ** 2);
      const px = ca * 0.34, pz = sa * 0.34;
      const big = (fbm3(px * 2.2 + s, v * 2.2, pz * 2.2, 4) - 0.5) * 0.2;
      const mid = fine ? (ridged3(px * 5 + s, v * 1.6, pz * 5, 3) - 0.5) * 0.08 + (fbm3(px * 6 + s, v * 6, pz * 6, 2) - 0.5) * 0.025 : 0, fin = fine ? (ridged3(px * 14 + s, v * 4, pz * 14, 2) - 0.5) * 0.03 : 0;
      const feat = (ledge + groove + cleft + cave) * k;
      return [Math.max(0.012, r0 * (1 + plan(a, v)) + feat + (big + mid + fin) * k), feat + (big + mid) * k * 0.6];
    };
    return { at, R0, plan };
  };
  const PILLAR_RES = [[40, 34], [64, 56], [96, 88]]; // rings × rows by level of detail
  const pillarGeo = (seed, lod) => {
    const shape = pillarShape(seed), [RS, VS] = PILLAR_RES[lod], hi = lod > 0, pos = [], col = [], idx = [];
    for (let i = 0; i <= VS; i++) {
      const v = i / VS;
      for (let j = 0; j <= RS; j++) {
        const a = ((j % RS) / RS) * Math.PI * 2, [r, d] = shape.at(a, v, hi), dy = v > 0.85 ? (fbm3(Math.cos(a) * 3, v * 3, Math.sin(a) * 3 + seed, 2) - 0.5) * 0.03 : 0;
        pos.push(Math.cos(a) * r, v + dy, Math.sin(a) * r); const ao = clamp(0.64 + d * 4.2, 0.18, 1.05); col.push(ao, ao, ao);
      }
    }
    for (let i = 0; i < VS; i++) for (let j = 0; j < RS; j++) { const q = i * (RS + 1) + j; idx.push(q, q + 1, q + RS + 1, q + 1, q + RS + 2, q + RS + 1); }
    let g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    g = THREE.BufferGeometryUtils.mergeVertices(g); g.computeVertexNormals();
    // outward normals: flip the winding if the wall's normal points in
    const n = g.attributes.normal, p = g.attributes.position; let dot = 0; for (let i = 0; i < p.count; i += 7) dot += n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i);
    if (dot < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    return g;
  };
  // a boulder: bedded, cracked through, flat underneath
  const boulderGeo = (seed, detail = 3) => {
    let g = new T.IcosahedronGeometry(0.5, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = THREE.BufferGeometryUtils.mergeVertices(g);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new T.Vector3(), cn = new T.Vector3(Math.sin(seed), 0.3, Math.cos(seed * 1.3)).normalize();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const big = (fbm3(v.x * 2 + seed, v.y * 2, v.z * 2) - 0.5) * 0.42, mid = (fbm3(v.x * 6 + seed, v.y * 6, v.z * 6) - 0.5) * 0.12, fin = (ridged3(v.x * 14, v.y * 14 + seed, v.z * 14, 2) - 0.5) * 0.04;
      const bp = v.y * 5 + fbm3(v.x, v.y, v.z + seed, 2), bed = -0.035 * (1 - sstep(0, 0.2, bp - Math.floor(bp)));
      const crack = -0.07 * Math.exp(-((v.dot(cn) / 0.035) ** 2));
      const d = big + mid + fin + bed + crack; v.multiplyScalar(1 + d);
      if (v.y < -0.12) v.y = -0.12 - (v.y + 0.12) * 0.15; v.y *= 0.72;
      p.setXYZ(i, v.x, v.y, v.z); const ao = clamp(0.62 + (bed + crack + mid) * 4 + big * 0.8, 0.22, 1.05); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  // limestone: grey with warm and cool patches, rain streaks under the ledges, cracks (cellular), lichen and white
  // crust, moss on the ledges and in the hollows; bump from the cracks and three grains of noise
  // (q low: no bump; its fine grains alias into 2 × 2-pixel blocks on the shaded walls of the coarse mesh)
  N.rockMaterial = (env, q) => {
    const low = tierOf(q) === 'low', mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, envMap: env, envMapIntensity: 0.45 });
    mat.extensions = { derivatives: true };
    if (low) mat.defines = { NATURE_LOW: '' };
    mat.onBeforeCompile = (sh) => {
      N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nfloat gCrack;').replace('#include <color_fragment>', `
        { vec3 p = vWP, nw = normalize(vWN); float side = 1. - smoothstep(.55, .85, abs(nw.y));
          float m = fbm3(p * .035);
          vec3 c = mix(vec3(.17, .17, .165), vec3(.34, .33, .31), m);
          c = mix(c, vec3(.33, .28, .22), smoothstep(.55, .8, fbm3(p * .012 + 11.)) * .5);                  // iron stain
          c = mix(c, vec3(.14, .15, .16), smoothstep(.6, .85, fbm3(p * .02 + 3.)) * .45);                   // cool grey
          c *= .9 + .12 * smoothstep(.3, .7, fbm3(vec3(p.x * .01, p.y * .22, p.z * .01)));                  // beds
          float st = smoothstep(.4, .85, vn3(vec3(p.x * .22, p.y * .01, p.z * .22)) * .65 + vn3(vec3(p.x * .9, p.y * .04, p.z * .9)) * .35);
          c = mix(c, vec3(.06, .06, .058), st * side * .75);                                                 // black rain streaks
          // joints: two sets of vertical planes, wavy; bedding lines; a faint fine crackle — all widened by fwidth (no aliasing)
          vec2 j = vec2(dot(p.xz, vec2(.82, .57)), dot(p.xz, vec2(-.57, .82))) * .045 + vec2(fbm3(p * .02), fbm3(p * .02 + 5.)) * 1.2;
          vec2 jd = abs(fract(j) - .5) / .045; vec2 jw = fwidth(j) / .045 + .35;
          float joint = max(1. - smoothstep(0., jw.x, jd.x), 1. - smoothstep(0., jw.y, jd.y)) * smoothstep(.45, .6, fbm3(p * .03 + 8.)) * side;
          float by = p.y * .11 + fbm3(p * .03) * 1.2, bd = abs(fract(by) - .5) / .5, bw = fwidth(by) / .5 + .05;
          float bedding = (1. - smoothstep(0., bw, bd)) * smoothstep(.4, .62, fbm3(p * .025 + 17.)) * .55 * side;   // a bed every ~9 m, broken
          float ce = cellEdge(p * .21 + 4.), crk = (1. - smoothstep(.015, .06 + fwidth(ce), ce)) * fadeFreq(p, .5) * smoothstep(.45, .7, fbm3(p * .04 + 23.)) * .3;
          gCrack = clamp((joint + bedding) * (1. - smoothstep(.15, .45, length(fwidth(p)))) + crk, 0., 1.); // lines go when a pixel is wider than they are (no net at a distance)
          c *= 1. - .55 * gCrack;
          float patchy = smoothstep(.45, .65, fbm3(p * .04 + 2.));
          c = mix(c, vec3(.45, .41, .27), smoothstep(.66, .84, rn3(p * 1.1 + 5.)) * patchy * fadeFreq(p, 1.1) * .4);   // lichen
          c = mix(c, vec3(.5, .49, .45), smoothstep(.7, .86, rn3(p * .9 + 9.)) * (1. - patchy) * fadeFreq(p, .9) * .3); // pale crust
          float up = smoothstep(.3, .7, nw.y), cav = 1. - vColor.r;
          float moss = clamp(up * smoothstep(.3, .55, fbm3(p * .07)) + cav * smoothstep(.4, .65, fbm3(p * .15 + 2.)), 0., 1.);
          c = mix(c, mix(vec3(.07, .1, .03), vec3(.17, .19, .06), fbm3(p * .3)), moss * .9);               // moss, scrub
          c *= mix(.42, 1., vColor.r);
          diffuseColor.rgb = c; }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          #ifndef NATURE_LOW
          { float hb = vn3(vWP * .45) * fadeFreq(vWP, .45) + .45 * vn3(vWP * 1.7) * fadeFreq(vWP, 1.7) + .18 * vn3(vWP * 6.) * fadeFreq(vWP, 6.)
              + .5 * abs(vn3(vec3(vWP.x * .25, vWP.y * .06, vWP.z * .25)) * 2. - 1.) - .7 * gCrack;
            normal = bumpN(normal, -vViewPosition, hb * .6); }
          #endif`);
    };
    mat.customProgramCacheKey = () => 'nature-rock-' + (low ? 'low' : 'full');
    return mat;
  };
  // the hills (Bagong): towers where the hills rise, boulders on the slopes and along the tributary; levels of detail
  // by distance from the camera (focus), the coarse ones only at the low tier
  // levels of detail by tier: [pillar level, within m] then [boulder icosahedron detail, within m]; the last has no limit
  const ROCK_LOD = {
    high: { pillar: [[2, 450], [1, 1100], [0]], boulder: [[3, 160], [1]] },
    mid: { pillar: [[1, 650], [0]], boulder: [[3, 100], [1]] },
    low: { pillar: [[0]], boulder: [[1]] },
  };
  N.rocks = function (L, env, q) {
    const LOD = ROCK_LOD[tierOf(q)] || ROCK_LOD.high;
    const mat = N.rockMaterial(env, q), group = new T.Group(), seeds = [1.3, 2.7, 4.1, 5.9, 7.4];
    const shapes = seeds.map(pillarShape);
    const [mx, mz] = L.sides && L.sides.hills ? MIRROR_HILLS[L.sides.hills] : [1, 1];
    N.seed(41 + (L.seed || 0));
    const P = seeds.map(() => []), B = [[], [], []];
    for (let k = 0; k < 9000 && P.flat().length < 34; k++) {
      const x = lerp(420, 1700, rnd()) * mx, z = lerp(-640, 420, rnd()) * mz, hl = L.hills(x, z);
      if (hl < 30 || L.waterSD(x, z) < 40 || P.flat().some((q) => Math.hypot(q[0] - x, q[2] - z) < 70)) continue;
      const H = 45 + rnd() * 95 * Math.min(1, hl / 90), R = H * (0.34 + rnd() * 0.22);
      P[Math.floor(rnd() * seeds.length)].push([x, L.h(x, z) - 6, z, R, H, rnd() * 6.28]);
    }
    // boulders along the tributary: on its land side (away from the big river)
    const TS = L.sides && L.sides.tributary, RS = L.sides && L.sides.river, FT = TS && FRAME[TS];
    const tribB0 = FT ? FT.to(...L.tribAt(0))[1] : 0, toRiver = RS && FT ? Math.sign(FT.to(...FRAME[RS].from(0, 1))[0]) : -1; // which way along the tributary the river lies
    let nB = 0; // boulders placed (B.flat().length in the loop test was quadratic)
    for (let k = 0; k < 20000 && nB < 420; k++) {
      const onHill = rnd() < 0.8 || !FT, u = rnd(), v = rnd();
      const [x, z] = onHill ? [lerp(350, 1750, u) * mx, lerp(-650, 450, v) * mz] : FT.from(lerp(-400, 900, v) * (toRiver < 0 ? 1 : -1), tribB0 - lerp(-60, 60, u));
      const hl = L.hills(x, z), sd = L.waterSD(x, z);
      if ((onHill && hl < 8) || sd < 3 || (!onHill && sd > 30)) continue;
      const s = onHill ? 4 + rnd() * 14 : 2 + rnd() * 5;
      B[Math.floor(rnd() * 3)].push([x, L.h(x, z) - s * 0.15, z, s, s, rnd() * 6.28]); nB++;
    }
    const m4 = new T.Matrix4(), qq = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), Y = new T.Vector3(0, 1, 0), GREY = [1, 1, 1];
    const pillarM = ([x, y, z, R, H, r], i) => m4.compose(ps.set(x, y, z), qq.setFromAxisAngle(Y, r), sc.set(R / 0.34, H, (R / 0.34) * (0.85 + 0.3 * h2(i, 3))));
    const boulderM = ([x, y, z, s, , r], i) => m4.compose(ps.set(x, y, z), qq.setFromAxisAngle(Y, r), sc.set(s, s, s * (0.8 + 0.4 * h2(i, 9))));
    // cells: a tower's footprint reaches about 2.4 R from its axis, a boulder's 0.8 s
    // every level of detail in cells: towers by variant; boulders by variant near the camera, and all of them on one
    // coarse shape in 4 × 4 blocks beyond (many small rocks, few calls)
    const sets = [], pick = (c, v) => (Array.isArray(c) ? c[v] : c);
    seeds.forEach((s, v) => {
      if (!P[v].length) return; const mem = P[v].map(([x, y, z, R, H]) => [x, y, z, R * 2.4, H * 1.05]);
      const G = {}, geo = (lod) => G[lod] || (G[lod] = pillarGeo(s, lod));
      sets.push({ list: P[v].map((p, i) => [p, i, 0]), M: pillarM, lods: LOD.pillar.map(([lod, r], k, all) => {
        // the finest level casts its shadow with the next level's mesh (a shadow-only proxy, less than half the
        // triangles), drawn a little inside the fine walls so that it never shades them where the sun reaches
        const proxy = lod === 2 && all[k + 1], parts = [{ geo: geo(lod), mat, shadow: !proxy }].concat(proxy ? [{ geo: geo(proxy[0]).clone().scale(0.93, 0.995, 0.93), mat, shadow: true, shadowOnly: true }] : []);
        return { r: r ?? 1e9, c: cells(group, parts, mem, N.CELL) };
      }) });
    });
    const BL = B.flatMap((list, v) => list.map((p, i) => [p, i, v])), memB = BL.map(([[x, y, z, s]]) => [x, y, z, s * 0.8, s]);
    if (BL.length) sets.push({ list: BL, M: boulderM, lods: LOD.boulder.map(([d, r]) => ({ r: r ?? 1e9,
      c: r ? [0, 1, 2].map((v) => cells(group, [{ geo: boulderGeo((v + 1) * 5.3, d), mat, shadow: true }], memB, N.CELL * 2)) : cells(group, [{ geo: boulderGeo(5.3, d), mat, shadow: true }], memB, N.CELL * 4) })) });
    // the rocks near the camera get the fine mesh
    const focus = (cam) => {
      const at = cam.isCamera ? cam.position : cam;
      for (const S of sets) {
        for (const l of S.lods) [].concat(l.c).forEach((c) => c.begin());
        S.list.forEach(([p, i, v], k) => { S.M(p, i); const d = Math.hypot(p[0] - at.x, p[2] - at.z); pick(S.lods.find((l) => d < l.r).c, v).put(k, m4.elements, GREY); });
        for (const l of S.lods) [].concat(l.c).forEach((c) => c.end());
      }
    };
    focus(new T.Vector3(1e6, 0, 1e6));
    // places on the ledges and the tops where plants hold on (world positions)
    const ledges = [], v3 = new T.Vector3();
    seeds.forEach((s, vi) => P[vi].forEach((p, i) => {
      pillarM(p, i); const mm = m4.clone();
      for (let k = 0; k < 16; k++) { const v = 0.12 + h2(i * 31 + k, vi) * 0.7, a = h2(k, i * 7 + vi) * Math.PI * 2, [r] = shapes[vi].at(a, v, false); v3.set(Math.cos(a) * r * 1.01, v, Math.sin(a) * r * 1.01).applyMatrix4(mm); ledges.push([v3.x, v3.y, v3.z, k < 3 ? 'top' : 'ledge']); }
      for (let k = 0; k < 5; k++) { const a = k * 1.26 + i, rr = k ? 0.12 : 0; v3.set(Math.cos(a) * rr, 0.985, Math.sin(a) * rr).applyMatrix4(mm); ledges.push([v3.x, v3.y, v3.z, 'top']); }
    }));
    group.userData = { pillars: P.flat(), focus, ledges, boulders: B.flat().length };
    return group;
  };

  // ---------------------------------------------------------------- the leaf atlas: sprays of leaves painted on a canvas
  // 3 × 2 tiles of 768 px: 0 summer green, 1 autumn gold, 2 maple red, 3 pine needles, 4 grass, 5 shrub. Twigs carry
  // the leaves, so a card reads as a spray, not confetti. RGB is spread under the transparent parts (no dark fringes
  // when filtered) and the mip chain pushes alpha up level by level (crowns keep their fill at a distance).
  const TILE = 768, TC = 3, TR = 2;
  N.tileUV = (t) => [(t % TC) / TC, 1 - (Math.floor(t / TC) + 1) / TR, 1 / TC, 1 / TR];
  const leafAtlas = () => {
    const Wd = TILE * TC, Ht = TILE * TR, cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht; const g = cv.getContext('2d');
    N.seed(5);
    const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
    const pick = (r) => r[0] + rnd() * (r[1] - r[0]);
    const leaf = (x, y, ang, L, cfg) => {
      const pal = cfg.pal[Math.floor(rnd() * cfg.pal.length)], h = pick(pal.h), s = pick(pal.s), l = pick(pal.l) + (rnd() < 0.15 ? -9 : rnd() < 0.12 ? 8 : 0);
      g.save(); g.translate(x, y); g.rotate(ang);
      const W = L * cfg.w, gr = g.createLinearGradient(0, -W, 0, W); gr.addColorStop(0, hsl(h, s, l + 6)); gr.addColorStop(1, hsl(h, s, l - 7));
      g.fillStyle = gr; g.beginPath();
      if (cfg.maple) { for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, r = k % 2 ? L * 0.42 : L * (k === 0 || k === 10 ? 0.95 : 0.8); g.lineTo(L * 0.5 + Math.sin(a) * r * 0.55, Math.cos(a) * r * 0.55); } }
      else { g.moveTo(0, 0); g.quadraticCurveTo(L * 0.45, -W, L, 0); g.quadraticCurveTo(L * 0.45, W, 0, 0); }
      g.fill(); g.strokeStyle = hsl(h, s, l - 14, 0.55); g.lineWidth = Math.max(1, L / 22); g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.9, 0); g.stroke();
      g.restore();
    };
    const sprays = (ox, oy, cfg) => {
      const cx = ox + TILE / 2, cy = oy + TILE / 2, lim = TILE * 0.44, stems = [];
      const inside = (x, y, m = 0) => Math.hypot(x - cx, y - cy) < lim - m;
      const grow = (x, y, ang, len, depth) => {
        let ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        for (let k = 0; k < 8 && !inside(ex, ey, cfg.leaf[1]); k++) { ex = x + (ex - x) * 0.8; ey = y + (ey - y) * 0.8; }
        stems.push([x, y, ex, ey, depth]);
        if (depth < cfg.depth) { const n = 2 + (rnd() < 0.45 ? 1 : 0); for (let i = 0; i < n; i++) { const t = 0.3 + rnd() * 0.6; grow(x + (ex - x) * t, y + (ey - y) * t, ang + (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.55), len * (0.5 + rnd() * 0.22), depth + 1); } }
      };
      for (let k = 0; k < cfg.roots; k++) grow(cx + (rnd() - 0.5) * TILE * 0.2, oy + TILE * 0.93, -Math.PI / 2 + (rnd() - 0.5) * 0.9, TILE * (0.42 + rnd() * 0.12), 0);
      for (const [x, y, ex, ey, d] of stems) { g.strokeStyle = cfg.twig; g.lineWidth = Math.max(1.2, (cfg.depth + 1.5 - d) * 2.2); g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); }
      for (const [x, y, ex, ey] of stems) {
        const len = Math.hypot(ex - x, ey - y), n = Math.max(1, Math.floor(len / (TILE * cfg.gap))), base = Math.atan2(ey - y, ex - x);
        for (let i = 1; i <= n; i++) {
          const t = i / n, px = x + (ex - x) * t, py = y + (ey - y) * t;
          if (cfg.pine) { g.strokeStyle = hsl(pick(cfg.pal[0].h), pick(cfg.pal[0].s), pick(cfg.pal[0].l)); g.lineWidth = 2.2; g.beginPath(); for (let m = 0; m < 14; m++) { const a = base + (m / 13 - 0.5) * 2.6, L2 = TILE * (0.05 + rnd() * 0.035); if (!inside(px + Math.cos(a) * L2, py + Math.sin(a) * L2)) continue; g.moveTo(px, py); g.lineTo(px + Math.cos(a) * L2, py + Math.sin(a) * L2); } g.stroke(); continue; }
          for (const sd of [-1, 1]) { if (rnd() < 0.12) continue; const L2 = pick(cfg.leaf), a = base + sd * (0.55 + rnd() * 0.55); if (!inside(px + Math.cos(a) * L2, py + Math.sin(a) * L2)) continue; leaf(px, py, a, L2, cfg); }
        }
        if (!cfg.pine) { const L2 = pick(cfg.leaf); if (inside(ex + Math.cos(base) * L2, ey + Math.sin(base) * L2)) leaf(ex, ey, base, L2, cfg); }
      }
      // fill: loose leaves in the gaps inside the silhouette
      for (let k = 0; k < cfg.fill; k++) { const a = rnd() * 6.28, r = lim * Math.sqrt(rnd()) * 0.85, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, L2 = pick(cfg.leaf); if (cfg.pine) continue; if (inside(x + L2, y, 0) && inside(x - L2, y, 0)) leaf(x, y, rnd() * 6.28, L2, cfg); }
    };
    const grass = (ox, oy) => {
      const cx = ox + TILE / 2, by = oy + TILE * 0.995;
      for (let k = 0; k < 190; k++) {
        const off = rnd() * 2 - 1, x = cx + off * TILE * 0.14, H = TILE * (0.25 + 0.68 * (1 - Math.abs(off) * 0.55) * (0.45 + 0.55 * rnd()));
        const lean = clamp(off * TILE * 0.3 + (rnd() - 0.5) * TILE * 0.12, -TILE * 0.42, TILE * 0.42), w = 3 + rnd() * 5, h = 42 + rnd() * 34, s = 28 + rnd() * 25, l = 28 + rnd() * 24;
        const gr = g.createLinearGradient(0, by, 0, by - H); gr.addColorStop(0, hsl(h, s, l - 16)); gr.addColorStop(0.5, hsl(h, s, l)); gr.addColorStop(1, hsl(h + 4, s - 5, l + 8));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, by); g.quadraticCurveTo(x + lean * 0.3, by - H * 0.6, x + lean, by - H); g.quadraticCurveTo(x + lean * 0.3 + w * 0.5, by - H * 0.55, x + w, by); g.fill();
        if (rnd() < 0.1) { g.fillStyle = hsl(40, 35, 60); g.beginPath(); g.ellipse(x + lean, by - H, 4, 13, lean / 200, 0, 6.28); g.fill(); }
      }
    };
    const TILES = [
      { pal: [{ h: [74, 102], s: [30, 50], l: [22, 40] }, { h: [60, 72], s: [35, 50], l: [30, 42] }], leaf: [TILE * 0.045, TILE * 0.075], w: 0.42, twig: 'rgba(58,40,26,1)', depth: 3, roots: 3, gap: 0.028, fill: 260 },
      { pal: [{ h: [36, 50], s: [58, 78], l: [34, 50] }, { h: [24, 34], s: [60, 75], l: [32, 44] }, { h: [58, 75], s: [35, 50], l: [30, 40] }], leaf: [TILE * 0.045, TILE * 0.075], w: 0.42, twig: 'rgba(66,44,28,1)', depth: 3, roots: 3, gap: 0.028, fill: 260 },
      { pal: [{ h: [2, 16], s: [58, 76], l: [28, 42] }, { h: [18, 30], s: [65, 80], l: [34, 46] }], leaf: [TILE * 0.05, TILE * 0.08], w: 0.5, maple: true, twig: 'rgba(70,36,24,1)', depth: 3, roots: 3, gap: 0.032, fill: 180 },
      { pal: [{ h: [98, 128], s: [24, 40], l: [15, 27] }], leaf: [TILE * 0.05, TILE * 0.08], twig: 'rgba(62,44,30,1)', depth: 3, roots: 4, gap: 0.03, pine: true, fill: 0 },
      null,
      { pal: [{ h: [80, 110], s: [28, 45], l: [18, 32] }, { h: [30, 45], s: [45, 60], l: [30, 40] }], leaf: [TILE * 0.03, TILE * 0.05], w: 0.5, twig: 'rgba(60,42,28,1)', depth: 3, roots: 4, gap: 0.022, fill: 320 },
    ];
    TILES.forEach((cfg, t) => { const ox = (t % TC) * TILE, oy = Math.floor(t / TC) * TILE; g.save(); g.beginPath(); g.rect(ox, oy, TILE, TILE); g.clip(); if (cfg) sprays(ox, oy, cfg); else grass(ox, oy); g.restore(); });
    // spread colour under the transparent pixels, alpha kept; flip rows for the DataTexture; mips with alpha pushed up
    const src = g.getImageData(0, 0, Wd, Ht).data, lvl0 = new Uint8Array(Wd * Ht * 4), sum = new Float64Array(TC * TR * 4);
    for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) { const q = (j * Wd + i) * 4, t = Math.floor(j / TILE) * TC + Math.floor(i / TILE); if (src[q + 3] > 200) { sum[t * 4] += src[q]; sum[t * 4 + 1] += src[q + 1]; sum[t * 4 + 2] += src[q + 2]; sum[t * 4 + 3]++; } }
    for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
      const q = (j * Wd + i) * 4, o = ((Ht - 1 - j) * Wd + i) * 4, t = Math.floor(j / TILE) * TC + Math.floor(i / TILE), a = src[q + 3] / 255, n = Math.max(1, sum[t * 4 + 3]);
      for (let c = 0; c < 3; c++) lvl0[o + c] = a > 0.5 ? src[q + c] : (sum[t * 4 + c] / n) * (1 - a) + src[q + c] * a;
      lvl0[o + 3] = src[q + 3];
    }
    const mips = [{ data: lvl0, width: Wd, height: Ht }], CUT = 0.42 * 255;
    // coverage of each tile at level 0: the share of texels that pass the alpha test
    const cover = (d, w, h, t, sc) => { const tw = w / TC, th = h / TR, x0 = Math.floor((t % TC) * tw), y0 = Math.floor((TR - 1 - Math.floor(t / TC)) * th); let n = 0, k = 0; for (let j = y0; j < Math.floor(y0 + th); j++) for (let i = x0; i < Math.floor(x0 + tw); i++) { k++; if (d[(j * w + i) * 4 + 3] * sc > CUT) n++; } return k ? n / k : 0; };
    const c0 = Array.from({ length: TC * TR }, (_, t) => cover(lvl0, Wd, Ht, t, 1));
    for (let l = 1; ; l++) {
      const p = mips[l - 1], w = Math.max(1, p.width >> 1), h = Math.max(1, p.height >> 1), d = new Uint8Array(w * h * 4);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) for (let c = 0; c < 4; c++) {
        let s = 0; for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = Math.min(p.width - 1, 2 * i + di), y = Math.min(p.height - 1, 2 * j + dj); s += p.data[(y * p.width + x) * 4 + c]; }
        d[(j * w + i) * 4 + c] = s / 4;
      }
      // scale each tile's alpha so its coverage matches level 0 (binary search on the scale)
      if (w >= TC * 4 && h >= TR * 4) for (let t = 0; t < TC * TR; t++) {
        let lo = 1, hi = 6; for (let it = 0; it < 10; it++) { const mid = (lo + hi) / 2; if (cover(d, w, h, t, mid) < c0[t]) lo = mid; else hi = mid; }
        const sc = (lo + hi) / 2, tw = w / TC, th = h / TR, x0 = Math.floor((t % TC) * tw), y0 = Math.floor((TR - 1 - Math.floor(t / TC)) * th);
        for (let j = y0; j < Math.floor(y0 + th); j++) for (let i = x0; i < Math.floor(x0 + tw); i++) { const q = (j * w + i) * 4 + 3; d[q] = Math.min(255, d[q] * sc); }
      }
      mips.push({ data: d, width: w, height: h });
      if (w === 1 && h === 1) break;
    }
    const tex = new T.DataTexture(lvl0, Wd, Ht, T.RGBAFormat); tex.mipmaps = mips; tex.generateMipmaps = false; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
    tex.encoding = T.sRGBEncoding; tex.anisotropy = 8; tex.needsUpdate = true; return tex;
  };

  N.leafAtlas = leafAtlas;

  // ---------------------------------------------------------------- plants: bark tubes and leaf cards (height 1), fine / light / far
  const Acc = () => ({ pos: [], nor: [], uv: [], col: [], sway: [], idx: [] });
  const accGeo = (A, bark = 0) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(A.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(A.nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(A.uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(A.col, 3)); g.setAttribute('sway', new T.Float32BufferAttribute(A.sway, 1)); g.setAttribute('bark', new T.Float32BufferAttribute(new Float32Array(A.sway.length).fill(bark), 1)); g.setIndex(A.idx); return g; };
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  // a tapered tube along a polyline (rings of seg vertices), bark uv: u round, v along in units of the radius
  const tube = (A, pts, r0, r1, seg, tint) => {
    const n = pts.length, base = A.pos.length / 3; let len = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], t = (i < n - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
      const up = Math.abs(t.y) > 0.95 ? V(1, 0, 0) : V(0, 1, 0), b1 = V().crossVectors(t, up).normalize(), b2 = V().crossVectors(t, b1).normalize();
      if (i) len += p.distanceTo(pts[i - 1]);
      const r = r0 + (r1 - r0) * (i / (n - 1));
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * Math.PI * 2, nn = b1.clone().multiplyScalar(Math.cos(a)).addScaledVector(b2, Math.sin(a));
        A.pos.push(p.x + nn.x * r, p.y + nn.y * r, p.z + nn.z * r); A.nor.push(nn.x, nn.y, nn.z); A.uv.push(j / seg, len / Math.max(0.004, (r0 + r1) * 1.2));
        A.col.push(tint.r, tint.g, tint.b); A.sway.push(Math.max(0, p.y - 0.25) * 0.9);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const q = base + i * (seg + 1) + j; A.idx.push(q, q + 1, q + seg + 1, q + 1, q + seg + 2, q + seg + 1); }
  };
  // a leaf card: a quad in a tile of the atlas, normals bent out from the crown's centre (soft, round shading)
  const card = (A, c, size, center, tile, o = {}) => {
    const out = o.dir || c.clone().sub(center).normalize();
    const n = out.clone().multiplyScalar(1 - (o.rand ?? 0.45)).add(V(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7, rnd() * 2 - 1).multiplyScalar(o.rand ?? 0.45)).normalize();
    if (o.upish) n.lerp(V(0, 1, 0), o.upish).normalize();
    const up = Math.abs(n.y) > 0.92 ? V(1, 0, 0) : V(0, 1, 0), t0 = V().crossVectors(up, n).normalize(), b0 = V().crossVectors(n, t0).normalize(), rot = o.rot ?? rnd() * 6.28;
    const tt = t0.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b0, Math.sin(rot)), bb = V().crossVectors(n, tt);
    const base = A.pos.length / 3, s = size / 2, [u0, v0, du, dv] = N.tileUV(tile), tall = o.tall || 1, e = 0.004;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v]) => {
      const p = c.clone().addScaledVector(tt, u * s).addScaledVector(bb, (o.hang ? v - 1 : v) * s * tall); A.pos.push(p.x, p.y, p.z);
      const nn = p.clone().sub(center).normalize().multiplyScalar(o.soft ?? 0.75).addScaledVector(n, 1 - (o.soft ?? 0.75)).normalize(); A.nor.push(nn.x, nn.y, nn.z);
      A.uv.push(u0 + e + (u * 0.5 + 0.5) * (du - 2 * e), v0 + e + (v * 0.5 + 0.5) * (dv - 2 * e));
      const dIn = Math.min(1, p.distanceTo(center) / (o.R || 0.35)), ao = clamp(0.5 + 0.55 * dIn * (0.7 + 0.3 * clamp((p.y - center.y) / 0.3 + 0.5, 0, 1)), 0.38, 1.08); A.col.push(ao, ao, ao);
      A.sway.push(Math.max(0.35, p.y));
    });
    A.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const BARK = new T.Color(0x4a3a2e), BARK_P = new T.Color(0x5a4232), BARK_W = new T.Color(0x57493c);
  // a plant: { leaves, wood } geometries, local height 1. far: the light plant with a bare trunk and no boughs, bark
  // merged into the leaf geometry (attribute bark = 1: the leaf material draws it opaque), one draw call a cell
  const plant = (kind, seed, tile, hi, far) => {
    N.seed(Math.floor(seed * 9973) + 13);
    const Lf = Acc(), Wd = Acc();
    if (kind === 'broad') {
      const top = 0.44 + rnd() * 0.12, lean = V((rnd() - 0.5) * 0.06, 0, (rnd() - 0.5) * 0.06), spine = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1].map((t) => V(lean.x * t * t + (t ? (rnd() - 0.5) * 0.012 : 0), t * top, lean.z * t * t));
      tube(Wd, far ? [spine[0], spine[3], spine[6]] : spine, 0.05, 0.026, hi ? 8 : far ? 4 : 5, BARK); if (hi) tube(Wd, [V(0, 0, 0), V(0, 0.05, 0)], 0.085, 0.05, 8, BARK); // root flare
      const center = V(lean.x, 0.66 + (rnd() - 0.5) * 0.04, lean.z), R = V(0.3 + rnd() * 0.08, 0.25 + rnd() * 0.05, 0.3 + rnd() * 0.08);
      const nb = hi ? 6 : 4;
      for (let k = 0; k < nb; k++) {
        const a = (k / nb) * 6.28 + rnd() * 0.7, el = 0.2 + rnd() * 0.55, dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
        const s0 = spine[3 + (k % 3)].clone(), end = center.clone().add(V(dir.x * R.x * 0.72, dir.y * R.y * 0.7, dir.z * R.z * 0.72)), mid = s0.clone().lerp(end, 0.5).add(V(0, 0.05, 0));
        if (!far) tube(Wd, [s0, mid, end], 0.022, 0.006, hi ? 5 : 4, BARK);
      }
      const nc = hi ? 14 : far ? 6 : 7, per = hi ? 11 : far ? 5 : 7, cs = hi ? 0.2 : far ? 0.33 : 0.28;
      for (let k = 0; k < nc; k++) {
        const inner = k >= nc - 2, a = rnd() * 6.28, el = inner ? rnd() * 0.5 : -0.35 + rnd() * 1.6, f = inner ? 0.35 : 0.72 + rnd() * 0.22;
        const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), cc = center.clone().add(V(dir.x * R.x * f, dir.y * R.y * f, dir.z * R.z * f));
        for (let m = 0; m < per; m++) { const off = V(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.8, rnd() * 2 - 1).normalize().multiplyScalar(0.1 * Math.cbrt(rnd())); card(Lf, cc.clone().add(off), cs * (0.8 + rnd() * 0.4), center, tile, { dir: dir, R: R.x }); }
      }
    } else if (kind === 'pine') {
      tube(Wd, [V(0, 0, 0), V(0, 0.3, 0), V(0.005, 0.65, 0), V(0, 0.97, 0)], 0.034, 0.006, hi ? 7 : far ? 4 : 5, BARK_P);
      const center = V(0, 0.55, 0), tiers = hi ? 13 : far ? 6 : 7;
      for (let tI = 0; tI < tiers; tI++) {
        const y = 0.16 + (tI / (tiers - 1)) * 0.76, Rt = 0.3 * Math.pow(1 - (y - 0.16) / 0.86, 0.9) + 0.035, nbr = hi ? 7 : far ? 4 : 5;
        for (let b = 0; b < nbr; b++) {
          const a = b * 2.39996 + tI * 1.1 + rnd() * 0.4, dir = V(Math.cos(a), -0.1 - rnd() * 0.16, Math.sin(a)).normalize(), s0 = V(0, y, 0), e = s0.clone().addScaledVector(dir, Rt * (0.8 + rnd() * 0.3));
          if (hi) tube(Wd, [s0, e], 0.01, 0.003, 3, BARK_P); // boughs: thin, straight, three-sided (hidden in the needles)
          for (const t of hi ? [0.3, 0.55, 0.78, 1.0] : [0.5, 1.0]) card(Lf, s0.clone().lerp(e, t).add(V(0, 0.012 - t * 0.02, 0)), Rt * (hi ? 0.72 : far ? 1.2 : 1.05), center, tile, { dir: V(dir.x * 0.45, 1, dir.z * 0.45).normalize(), rand: 0.3, soft: 0.55, R: 0.3 });
        }
      }
      card(Lf, V(0, 0.95, 0), 0.12, center, tile, { dir: V(0, 1, 0) });
    } else if (kind === 'willow') {
      const trunk = [V(0, 0, 0), V(0.02, 0.2, 0.01), V(0.05, 0.42, 0.02)]; tube(Wd, trunk, 0.05, 0.03, hi ? 7 : far ? 4 : 5, BARK_W);
      const center = V(0.05, 0.55, 0.02), nb = hi ? 6 : 4;
      for (let k = 0; k < nb; k++) {
        const a = (k / nb) * 6.28 + rnd() * 0.5, tip = V(0.05 + Math.cos(a) * 0.3, 0.8 + rnd() * 0.12, 0.02 + Math.sin(a) * 0.3), mid = trunk[2].clone().lerp(tip, 0.5).add(V(0, 0.08, 0));
        if (!far) tube(Wd, [trunk[2].clone(), mid, tip], 0.02, 0.006, 4, BARK_W);
        for (let m = 0; m < (hi ? 10 : 6); m++) { const t = 0.35 + rnd() * 0.65, p = trunk[2].clone().lerp(mid, t).lerp(mid.clone().lerp(tip, t), t); card(Lf, p.add(V(rnd() * 0.08 - 0.04, 0, rnd() * 0.08 - 0.04)), 0.14, center, tile, { dir: V(Math.cos(a), 0, Math.sin(a)), rand: 0.2, hang: true, tall: 2.6, rot: 0, R: 0.35 }); }
      }
    } else if (kind === 'bush') { // a low shrub, height 1, no visible stem
      const center = V(0, 0.42, 0), nc = hi ? 16 : 10;
      for (let k = 0; k < nc; k++) { const a = rnd() * 6.28, el = rnd() * 1.3, d = V(Math.cos(a) * Math.cos(el) * 0.5, 0.1 + Math.sin(el) * 0.38, Math.sin(a) * Math.cos(el) * 0.5); card(Lf, d.clone().add(V(0, 0.08, 0)), 0.5 + rnd() * 0.2, center, tile, { dir: d.clone().normalize(), R: 0.5 }); }
    } else if (kind === 'grass') { // three crossed blades cards, the atlas' grass tile (roots at the card's bottom edge)
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI + rnd() * 0.3; card(Lf, V(0, 0.5, 0), 1, V(0, -0.5, 0), tile, { dir: V(Math.cos(a), 0, Math.sin(a)), rand: 0, rot: 0, soft: 0.35, R: 1 }); }
    }
    if (far && Wd.pos.length) return { leaves: THREE.BufferGeometryUtils.mergeBufferGeometries([accGeo(Lf, 0), accGeo(Wd, 1)]), wood: null };
    return { leaves: accGeo(Lf, 0), wood: Wd.pos.length ? accGeo(Wd, 1) : null };
  };
  // the farthest trees: three crossed cards of the species' spray tile, twigs at the bottom (height 1)
  const cardsGeo = (tile) => {
    const A = Acc(), [u0, v0, du, dv] = N.tileUV(tile), e = 0.004, w = 0.46;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI + 0.3, cx = Math.cos(a), cz = Math.sin(a), base = A.pos.length / 3;
      [[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach(([u, v]) => {
        const x = cx * u * w, z = cz * u * w, y = 0.04 + v * 0.96, n = V(x, 0.5 * (y - 0.45), z).normalize();
        A.pos.push(x, y, z); A.nor.push(n.x, n.y, n.z); A.uv.push(u0 + e + (u * 0.5 + 0.5) * (du - 2 * e), v0 + e + v * (dv - 2 * e));
        const ao = 0.55 + 0.5 * v; A.col.push(ao, ao, ao); A.sway.push(Math.max(0.35, y));
      });
      A.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return accGeo(A);
  };

  // ---------------------------------------------------------------- materials: leaves (alpha cards, wind, light through them), bark
  const WIND = `
      #include <begin_vertex>
      { vec3 ip = vec3(0.);
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3].xyz;
      #endif
        float ph = uTime * 1.3 + ip.x * .031 + ip.z * .027, s = sway * sway;
        transformed.x += (sin(ph) * .018 + sin(ph * 2.7 + position.y * 9.) * .006) * s;
        transformed.z += (cos(ph * .8) * .014 + sin(ph * 3.1 + position.x * 11.) * .006) * s; }`;
  const BARK_MAP = 'if (vBark < .5) {\n#include <map_fragment>\n}'; // the far plants' bark: vertex colour, opaque
  N.treeMaterial = (atlas, env, sun) => {
    const U = { uTime: { value: 0 }, uSunDir: { value: sun.dir.clone() }, uSunCol: { value: sun.color.clone() } };
    const mat = new T.MeshStandardMaterial({ map: atlas, alphaTest: 0.42, side: T.DoubleSide, vertexColors: true, roughness: 0.82, metalness: 0, envMap: env, envMapIntensity: 0.4 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway, bark; uniform float uTime; varying float vBark;').replace('#include <begin_vertex>', WIND + '\nvBark = bark;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunDir, uSunCol; varying float vBark;').replace('#include <map_fragment>', BARK_MAP).replace('#include <output_fragment>', `
        { vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.)).xyz), Vd = normalize(vViewPosition);
          float back = pow(clamp(dot(-Vd, L), 0., 1.), 3.);
          outgoingLight += diffuseColor.rgb * uSunCol * (back * .9 + .08) * (1. - vBark); }
        #include <output_fragment>`);
    };
    mat.customProgramCacheKey = () => 'nature-leaf';
    const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: atlas, alphaTest: 0.42 });
    depth.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway, bark; uniform float uTime; varying float vBark;').replace('#include <begin_vertex>', WIND + '\nvBark = bark;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBark;').replace('#include <map_fragment>', BARK_MAP);
    };
    depth.customProgramCacheKey = () => 'nature-leaf-depth';
    // bark: dark furrows between lighter plates, a little moss on the lower trunk
    const bark = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMap: env, envMapIntensity: 0.3 });
    bark.extensions = { derivatives: true };
    bark.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway; uniform float uTime; varying vec2 vBk; varying float vBy;').replace('#include <begin_vertex>', WIND + '\nvBk = uv; vBy = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vBk; varying float vBy;\n' + N.GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          { float f = vn2(vec2(vBk.x * 22., vBk.y * .9)) * .7 + vn2(vec2(vBk.x * 60., vBk.y * 2.5)) * .3;
            float fur = smoothstep(.35, .65, f);
            diffuseColor.rgb *= mix(.45, 1.15, fur);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.12, .15, .05), smoothstep(.12, 0., vBy) * smoothstep(.4, .7, vn2(vBk * vec2(8., 3.))) * .6); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hb = vn2(vec2(vBk.x * 22., vBk.y * .9)) * .7 + vn2(vec2(vBk.x * 60., vBk.y * 2.5)) * .3; normal = bumpN(normal, -vViewPosition, hb * .012); }`);
    };
    bark.customProgramCacheKey = () => 'nature-bark';
    return { mat, depth, bark, U };
  };

  // ---------------------------------------------------------------- forests: species by place, near trees get the fine plant, undergrowth
  // Three levels: near (the fine plant, its own bark mesh), far (a light plant, bark merged in), crossed crown cards.
  // By tier: high, fine within 160 m, far to 900 m, a grass carpet round a low camera; mid, fine within 120 m, far to
  // 600 m, no carpet; low, the light plant within 150 m and cards beyond, no carpet and no undergrowth. q.trees caps
  // the trees placed (12000 / 6000 / 2500). Cells of the 80 m grid, grouped by level: near trees in blocks of 2 × 2,
  // far trees and undergrowth 4 × 4, cards 8 × 8 (a cell a draw call per part: decisions/0005 allows 400 calls,
  // shadows included; single 80 m cells overran it three times in the close views).
  const PLANT = { high: { fine: 160, far: 900, carpet: true, under: true }, mid: { fine: 120, far: 600, carpet: false, under: true }, low: { fine: 150, far: 0, carpet: false, under: false, light: true } };
  const UNDER_D = { bush: 700, grass: 250 }; // undergrowth is only drawn this near the camera (m)
  const FINE_CELL = 2, FAR_CELL = 4, CARD_CELL = 8, UNDER_CELL = 4; // blocks of k × k cells by level (fewer draw calls)
  const SPECIES = [
    { kind: 'broad', tile: 0, seeds: [1.1, 2.3] }, { kind: 'broad', tile: 1, seeds: [3.7, 4.2] }, { kind: 'broad', tile: 2, seeds: [5.5] },
    { kind: 'pine', tile: 3, seeds: [6.1, 7.9] }, { kind: 'willow', tile: 0, seeds: [8.3] },
    { kind: 'bush', tile: 5, seeds: [9.1], small: true }, { kind: 'bush', tile: 1, seeds: [10.2], small: true }, { kind: 'bush', tile: 2, seeds: [10.9], small: true },
    { kind: 'grass', tile: 4, seeds: [11.3], small: true, noShadow: true },
  ];
  // near: the fine plant (the light one at low) per variant; far and cards: the species' first variant; undergrowth
  // has the fine plant only
  const plantsFor = (TP) => SPECIES.map((sp) => sp.seeds.map((s, vi) => {
    if (sp.small) return { near: TP.under ? plantOnce(sp.kind, s, sp.tile, true) : null };
    return { near: plantOnce(sp.kind, s, sp.tile, !TP.light), far: vi || !TP.far ? null : plantOnce(sp.kind, s, sp.tile, false, true), cards: vi ? null : cardsOnce(sp.tile) };
  }));
  // The leaf atlas and the plant geometries depend on nothing but the tier: built once per page and shared by every
  // battle (they were 4–5 s of a battle's 7–8 s build at high). N.warm(q) builds them ahead, when the page is idle.
  const CACHE = { atlas: null, plants: new Map(), cards: new Map() };
  const atlasOnce = () => CACHE.atlas || (CACHE.atlas = leafAtlas());
  const once = (map, key, make) => { if (!map.has(key)) map.set(key, make()); return map.get(key); };
  const plantOnce = (kind, seed, tile, hi, far) => once(CACHE.plants, [kind, seed, tile, hi, far].join(), () => plant(kind, seed, tile, hi, far));
  const cardsOnce = (tile) => once(CACHE.cards, tile, () => cardsGeo(tile));
  N.warm = function (q) { const TP = PLANT[tierOf(q)] || PLANT.high; atlasOnce(); plantsFor(TP); };
  N.trees = function (L, env, sun, extra = [], q) {
    const tier = tierOf(q), TP = PLANT[tier] || PLANT.high, cap = (q && q.trees) || TREES[tier] || TREES.high;
    const atlas = atlasOnce(), TM = N.treeMaterial(atlas, env, sun), group = new T.Group();
    const plants = plantsFor(TP);
    const lists = SPECIES.map((sp) => sp.seeds.map(() => []));
    N.seed(77 + (L.seed || 0));
    const put = (si, x, z, H, y) => { const vi = Math.floor(rnd() * SPECIES[si].seeds.length); lists[si][vi].push([x, y ?? L.h(x, z) - 0.25, z, H, rnd() * 6.28]); };
    const BAG = L.HILLS_C || [900, -230]; // the hills: denser woods and undergrowth there (the close views)
    const IN = Math.min(1400, L.EXT - 200);
    let placed = 0;
    for (let k = 0; k < 600000 && placed < Math.round((cap * 12500) / 13700); k++) {
      const near = rnd() < 0.35, x = near ? BAG[0] + (rnd() * 2 - 1) * 900 : (rnd() * 2 - 1) * (L.EXT - 20), z = near ? BAG[1] + (rnd() * 2 - 1) * 750 : (rnd() * 2 - 1) * (L.EXT - 20), w = L.woodAt(x, z);
      if (w < 0.05 || rnd() > w * 0.9) continue;
      const sd = L.riverSD(x, z), hl = L.hills(x, z);
      if (L.waterSD(x, z) < 4 || L.slope(x, z) > 0.9 || L.campIn(x, z) > -150) continue;
      const n = fbm2(x / 160 + 30, z / 160);
      const si = sd < 26 ? (rnd() < 0.7 ? 4 : 0) : hl > 20 && rnd() < 0.45 ? 3 : n > 0.68 ? 2 : n > 0.5 ? 1 : rnd() < 0.15 ? 3 : 0;
      put(si, x, z, (si === 3 ? 14 : si === 4 ? 10 : 12) + rnd() * 7); placed++;
    }
    for (let k = 0; k < 60000 && placed < cap; k++) { // lone trees, rows along roads and field edges
      const x = (rnd() * 2 - 1) * IN, z = (rnd() * 2 - 1) * IN;
      if (L.cheb(x, z) < L.MOAT1 + 20 || L.waterSD(x, z) < 6 || L.woodAt(x, z) > 0.05 || L.trampled(x, z) > 0.25 || L.campIn(x, z) > -150) continue; // the camp cut its timber round about
      const rd = L.roadD(x, z); if (rd < 6) continue;
      if (rd < 14 ? rnd() < 0.08 : rnd() < 0.006) { put(rnd() < 0.6 ? 0 : 1, x, z, 9 + rnd() * 6); placed++; }
    }
    if (TP.under) {
      // undergrowth: shrubs and grass round the hills and along the woods' edges (its own seed: the same at every tier)
      N.seed(78 + (L.seed || 0));
      // counters, not lists[i].flat().length in the loop test: that was O(n²), 3 s of a 4.7 s build (same draws, same trees)
      let nBush = 0, nGrass = 0;
      for (let k = 0; k < 400000 && nBush < 7000; k++) {
        const x = BAG[0] + (rnd() * 2 - 1) * 1000, z = BAG[1] + (rnd() * 2 - 1) * 850, w = L.woodAt(x, z), hl = L.hills(x, z);
        if (L.waterSD(x, z) < 3 || L.fieldAt(x, z) > 0.05 || L.roadD(x, z) < 5 || L.trampled(x, z) > 0.2 || (w < 0.08 && hl < 4) || L.slope(x, z) > 1.1) continue;
        put(rnd() < 0.62 ? 5 : rnd() < 0.6 ? 6 : 7, x, z, 1.4 + rnd() * 2.2, L.h(x, z) - 0.15); nBush++;
      }
      for (let k = 0; k < 600000 && nGrass < 12000; k++) {
        const x = BAG[0] + (rnd() * 2 - 1) * 1000, z = BAG[1] + (rnd() * 2 - 1) * 850;
        if (L.waterSD(x, z) < 2 || L.fieldAt(x, z) > 0.05 || L.roadD(x, z) < 4 || L.trampled(x, z) > 0.2 || L.slope(x, z) > 1.1 || (L.woodAt(x, z) < 0.05 && L.hills(x, z) < 4)) continue;
        put(8, x, z, 0.7 + rnd() * 0.7, L.h(x, z) - 0.05); nGrass++;
      }
    }
    for (const e of extra) if (TP.under || !SPECIES[e[2] ?? 0].small) put(e[2] ?? 0, e[0], e[1], e[3] ?? 9, e[4]);
    // cells: every variant has near cells, every tree species far cells; matrices and tints are computed once
    const m4 = new T.Matrix4(), qq = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
    const sets = [];
    SPECIES.forEach((sp, si) => {
      const vars = [], all = [];
      sp.seeds.forEach((s, vi) => {
        const list = lists[si][vi], P = plants[si][vi]; if (!list.length || !P.near) return;
        const M = new Float32Array(list.length * 16), tint = new Float32Array(list.length * 3);
        list.forEach(([x, y, z, H, r], i) => {
          m4.compose(ps.set(x, y, z), qq.setFromAxisAngle(Y, r), sc.set(H * (0.85 + 0.3 * h2(i, 1)), H, H * (0.85 + 0.3 * h2(i + 5, 1)))).toArray(M, i * 16);
          const b = 0.82 + 0.3 * h2(i, vi + si * 3); tint.set([b, b * (0.96 + 0.08 * h2(i, 3)), b * 0.95], i * 3); // per-instance tint: brightness, a little hue
        });
        const mem = list.map(([x, y, z, H]) => [x, y, z, H * 0.5, H * 1.05]);
        const parts = [{ geo: P.near.leaves, mat: TM.mat, depth: TM.depth, shadow: !sp.noShadow }].concat(P.near.wood ? [{ geo: P.near.wood, mat: TM.bark, shadow: !sp.noShadow }] : []);
        vars.push({ list, M, tint, off: all.length, near: cells(group, parts, mem, N.CELL * (sp.small ? UNDER_CELL : FINE_CELL)) }); all.push(...mem);
      });
      if (!vars.length) return;
      const F = plants[si][0], leafCells = (geo, k) => geo && cells(group, [{ geo, mat: TM.mat, depth: TM.depth, shadow: true }], all, N.CELL * k);
      sets.push({ sp, vars, far: F.far && leafCells(F.far.leaves, FAR_CELL), cards: leafCells(F.cards, CARD_CELL) });
    });
    // a grass carpet round the camera: tufts on world-anchored grids (0.9 and 1.5 m cells), coarser with distance and
    // fading out at 48 m, so the near ground reads as grass, not paint; none when the camera is high. Its cells are
    // refilled from a pool of meshes at each focus.
    const grassGeo = TP.carpet && plants[8][0].near && plants[8][0].near.leaves, pool = [];
    const carpetAt = (cam) => {
      const byCell = new Map();
      if (grassGeo && cam.y - L.h(cam.x, cam.z) < 60) for (const [s, r0, r1] of [[0.9, 0, 22], [1.5, 22, 48]]) {
        const i0 = Math.floor((cam.x - r1) / s), i1 = Math.ceil((cam.x + r1) / s), j0 = Math.floor((cam.z - r1) / s), j1 = Math.ceil((cam.z + r1) / s);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const x = (i + h2(i, j + s * 101)) * s, z = (j + h2(i + s * 57, j)) * s, d = Math.hypot(x - cam.x, z - cam.z);
          if (d < r0 || d >= r1) continue;
          if (L.cheb(x, z) < L.MOAT1 + 8 || L.waterSD(x, z) < 2.5 || L.fieldAt(x, z) > 0.3 || L.trampled(x, z) > 0.35 || L.roadD(x, z) < 3.5) continue;
          const w = L.woodAt(x, z); if (w > 0.4 && h2(i * 7, j * 3) < 0.5) continue;
          const y = L.h(x, z); if (Math.abs(L.h(x + 2, z) - y) + Math.abs(L.h(x, z + 2) - y) > 1.6) continue;
          const b = 0.45 + 0.45 * h2(i * 3, j * 5), k = s / 0.9, fade = sstep(48, 30, d), sy = b * Math.pow(k, 0.3) * fade, sx = b * Math.pow(k, 0.8) * (0.4 + 0.6 * fade);
          const t = 0.5 + 0.3 * h2(i + 11, j + 13), gd = h2(i * 5 + 1, j * 3 + 2), key = Math.floor(x / N.CELL) + ',' + Math.floor(z / N.CELL);
          let c = byCell.get(key); if (!c) byCell.set(key, (c = { M: [], C: [], b: new T.Box3() }));
          c.M.push(...m4.compose(ps.set(x, y - 0.06, z), qq.setFromAxisAngle(Y, h2(j, i) * 6.28), sc.set(sx, sy, sx)).elements);
          c.C.push(t * (0.9 + 0.15 * gd), t * (1.0 - 0.05 * gd), t * (0.7 - 0.1 * gd)); c.b.expandByPoint(ps.set(x - 1, y - 0.2, z - 1)).expandByPoint(ps.set(x + 1, y + 1.5, z + 1));
        }
      }
      let k = 0;
      for (const c of byCell.values()) {
        const n = c.C.length / 3;
        if (!pool[k] || pool[k].instanceMatrix.count < n) {
          if (pool[k]) { group.remove(pool[k]); pool[k].dispose(); }
          const m = new T.InstancedMesh(cellGeo(grassGeo, new T.Sphere()), TM.mat, Math.max(n, 2048)); m.frustumCulled = true; m.receiveShadow = true; m.customDepthMaterial = TM.depth; m.setColorAt(0, WHITE); group.add(m); pool[k] = m;
        }
        const m = pool[k++]; m.instanceMatrix.array.set(c.M); m.instanceColor.array.set(c.C); m.count = n; m.visible = true;
        c.b.getBoundingSphere(m.geometry.boundingSphere); m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
      }
      for (; k < pool.length; k++) { pool[k].count = 0; pool[k].visible = false; }
    };
    // focus(cam): cam is a position, or a camera (then the casters are also limited to cells whose shadow reaches the view)
    const frustum = new T.Frustum(), pm = new T.Matrix4();
    const focus = (cam) => {
      const at = cam.isCamera ? cam.position : cam;
      carpetAt(at);
      for (const S of sets) {
        const lv = [S.far, S.cards].filter(Boolean); lv.forEach((c) => c.begin());
        for (const v of S.vars) {
          v.near.begin();
          v.list.forEach(([x, , z], i) => {
            const d = Math.hypot(x - at.x, z - at.z), mi = v.M.subarray(i * 16, i * 16 + 16), ti = v.tint.subarray(i * 3, i * 3 + 3);
            if (S.sp.small) { if (d < UNDER_D[S.sp.kind]) v.near.put(i, mi, ti); } // undergrowth is only drawn near the camera
            else if (d < TP.fine || !S.cards) v.near.put(i, mi, ti); // the fine plant only where it shows (close views are < 150 m)
            else (S.far && d < TP.far ? S.far : S.cards).put(v.off + i, mi, ti);
          });
          v.near.end();
        }
        lv.forEach((c) => c.end());
      }
      if (cam.isCamera) {
        cam.updateMatrixWorld(); frustum.setFromProjectionMatrix(pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
        for (const S of sets) for (const c of [S.far, S.cards, ...S.vars.map((v) => v.near)]) if (c) c.shadows(frustum, TM.U.uSunDir.value);
      }
    };
    focus(new T.Vector3(1e6, 1e6, 1e6));
    const nCells = sets.reduce((n, S) => n + S.vars.reduce((a, v) => a + v.near.count, 0) + (S.far ? S.far.count : 0) + (S.cards ? S.cards.count : 0), 0);
    group.userData = { U: TM.U, count: placed, focus, atlas, carpet: pool, cells: nCells };
    return group;
  };
})();
