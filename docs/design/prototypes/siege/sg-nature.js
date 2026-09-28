// Siege prototype (docs/design/prototypes/siege): the land round Thọ Xuân at 1 unit = 1 m. Throwaway design code.
// Thọ Xuân (寿春) stands on the south bank of the Huai; the Fei (淝水) passes its west side into the Huai; the rocky
// Bagong hills (八公山, "草木皆兵") rise north-east of the city. Everything is generated in code: no textures, no models.
//   const land = SGN.land()                         heights, water, land use (roads, fields, woods, trampled ground)
//   SGN.terrain(land, env) · SGN.water(land, env) · SGN.rocks(land) · SGN.trees(land, sun) → meshes
(function () {
  const N = (window.SGN = {});
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
  const ridged2 = (x, y, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(vn2(x, y) * 2 - 1)); x = x * 2.1 + 7; y = y * 2.1 + 3; a *= 0.5; } return s / (1 - Math.pow(0.5, o)); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  N.noise = { h2, h3, vn2, vn3, fbm2, fbm3, ridged2 };
  N.rnd = rnd; N.seed = (s) => (seed = s);

  // the same noise in GLSL (world-space shading)
  N.GLSL = `
    float h13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vn2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
    float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
    float fbm2(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn2(p); p = p * 2.03 + 17.; a *= .5; } return s / .9375; }
    float fbm3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn3(p); p = p * 2.03 + 17.; a *= .5; } return s / .9375; }
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

  // ---------------------------------------------------------------- the land
  N.land = function () {
    const HC = 210, MOAT0 = HC + 26, MOAT1 = HC + 54, WATER = -1.0;
    const huaiZ = (x) => -660 + 95 * Math.sin(x / 540) + 42 * Math.sin(x / 215 + 1.3);
    const huaiD = (x) => (95 / 540) * Math.cos(x / 540) + (42 / 215) * Math.cos(x / 215 + 1.3);
    const feiX = (z) => -480 + 85 * Math.sin(z / 340 + 0.4) + 28 * Math.sin(z / 150);
    const feiD = (z) => (85 / 340) * Math.cos(z / 340 + 0.4) + (28 / 150) * Math.cos(z / 150);
    const HUAI_W = 180, FEI_W = 62;
    const cheb = (x, z) => Math.max(Math.abs(x), Math.abs(z));
    const dHuai = (x, z) => Math.abs(z - huaiZ(x)) / Math.sqrt(1 + huaiD(x) ** 2) - HUAI_W / 2;
    const dFei = (x, z) => (z > huaiZ(x) - 30 ? Math.abs(x - feiX(z)) / Math.sqrt(1 + feiD(z) ** 2) - FEI_W / 2 : 1e9);
    const dCanal = (x, z) => (x < -MOAT0 + 4 && x > feiX(z) - 5 ? Math.abs(z - 12) - 9 : 1e9); // the moat takes its water from the Fei
    const dMoat = (x, z) => { const c = cheb(x, z); return Math.max(MOAT0 - c, c - MOAT1); };
    const riverSD = (x, z) => Math.min(dHuai(x, z), dFei(x, z), dCanal(x, z));
    const waterSD = (x, z) => Math.min(riverSD(x, z), dMoat(x, z));
    // Bagong: rocky hills north-east, south of the Huai; a lower spur east of them
    const hills = (x, z) => {
      const a = Math.hypot((x - 900) / 560, (z + 230) / 360), b = Math.hypot((x - 1350) / 330, (z - 160) / 260);
      const m = Math.max(0, 1 - a) ** 1.25 * 120 + Math.max(0, 1 - b) ** 1.4 * 60;
      return m * (0.62 + 0.75 * ridged2(x / 190 + 3, z / 190));
    };
    const farMtn = (x, z) => { const r = Math.hypot(x * 0.85, z), k = sstep(2300, 4300, r); return k * (140 + 520 * ridged2(x / 700 + 9, z / 700, 5) ** 1.6 + 60 * ridged2(x / 160, z / 160)); };
    const land = (x, z) => 3.4 + 6.5 * (fbm2(x / 480, z / 480) - 0.5) + 1.2 * (fbm2(x / 95, z / 95) - 0.5) + hills(x, z) + farMtn(x, z);
    const h = (x, z) => {
      let y = land(x, z);
      const c = cheb(x, z);
      y = lerp(2.0, y, sstep(HC + 16, MOAT0 - 2, c)); // the city's flat ground and the berm to the moat
      y = lerp(-5.5, y, sstep(-8, 34, riverSD(x, z)));
      y = lerp(-4.0, y, sstep(-2, 4, dMoat(x, z)));
      return y;
    };
    // roads: polylines in metres, a little wavy
    const wavy = (pts, amp, sd) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 20)), nx = -(bz - az) / L, nz = (bx - ax) / L; for (let k = 0; k < n; k++) { const t = k / n, w = amp * (fbm2(sd + (i + t) * 1.7, sd) - 0.5) * Math.sin(Math.PI * Math.min(1, t * 4)); out.push([ax + (bx - ax) * t + nx * w, az + (bz - az) * t + nz * w]); } } out.push(pts[pts.length - 1]); return out; };
    const roads = [
      wavy([[0, HC + 40], [60, 700], [260, 1400], [500, 2600]], 40, 1),
      wavy([[HC + 40, 0], [800, 60], [1500, 260], [2600, 380]], 50, 2),
      wavy([[-HC - 40, 12], [feiX(12) - 70, 20], [-1200, 120], [-2600, 260]], 30, 3),
      wavy([[0, -HC - 40], [30, -420], [50, huaiZ(50) + HUAI_W / 2 - 4]], 20, 4),
    ];
    const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
    const roadD = (x, z) => { let d = 1e9; for (const r of roads) for (let i = 0; i < r.length - 1; i++) { const a = r[i], b = r[i + 1]; if (Math.abs(a[0] - x) > 80 && Math.abs(b[0] - x) > 80 && Math.sign(a[0] - x) === Math.sign(b[0] - x)) continue; d = Math.min(d, segD(x, z, a[0], a[1], b[0], b[1])); } return d; };
    // the siege ground south of the walls (trampled), the besiegers' camp south-east
    const CAMP = [640, 880, 190];
    const trampled = (x, z) => Math.max(sstep(470, 380, Math.abs(x)) * sstep(HC + 54, HC + 80, z) * sstep(HC + 560, HC + 380, z) * (0.55 + 0.45 * fbm2(x / 40, z / 40)), sstep(CAMP[2] + 20, CAMP[2] - 30, Math.hypot(x - CAMP[0], z - CAMP[1])));
    // land use, baked over ±1600 m (6.25 m a pixel): r woods, g field parcel (0 none), b road, a trampled / city ground
    const EXT = 1600, RES = 512, data = new Uint8Array(RES * RES * 4), wood = new Float32Array(RES * RES), field = new Float32Array(RES * RES);
    const ang = 0.13, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = -EXT + ((i + 0.5) / RES) * 2 * EXT, z = -EXT + ((j + 0.5) / RES) * 2 * EXT, q = (j * RES + i) * 4, sd = waterSD(x, z), c = cheb(x, z), hl = hills(x, z);
      const rd = c > MOAT1 ? roadD(x, z) : 1e9, road = sstep(7, 2.5, rd), tr = trampled(x, z), city = c < HC - 8 ? 1 : 0;
      let w = Math.max(sstep(0.56, 0.68, fbm2(x / 310 + 11, z / 310 + 4)) * sstep(1500, 1100, Math.hypot(x, z)), hl > 6 ? sstep(6, 22, hl) * 0.95 : 0, sd > 6 && sd < 26 && riverSD(x, z) < 26 ? 0.45 : 0);
      if (sd < 4 || c < MOAT1 + 30 || rd < 12 || tr > 0.3) w = 0;
      // parcels on the plain near the city: a rotated grid of strips, each a crop
      let f = 0;
      if (!w && sd > 20 && c > MOAT1 + 24 && hl < 2 && rd > 9 && tr < 0.2 && Math.hypot(x, z) < 1500) {
        const u = x * ca - z * sa, v = x * sa + z * ca, cu = Math.floor(u / 72), cv = Math.floor(v / 34), hh = h2(cu, cv);
        const fu = u / 72 - cu, fv = v / 34 - cv, edge = Math.min(fu, 1 - fu) * 72 > 1.5 && Math.min(fv, 1 - fv) * 34 > 1.5;
        if (hh < 0.82 && edge) f = 0.2 + 0.8 * h2(cu + 7, cv + 3);
      }
      wood[j * RES + i] = w; field[j * RES + i] = f;
      data[q] = w * 255; data[q + 1] = f * 255; data[q + 2] = road * 255; data[q + 3] = Math.max(tr, city) * 255;
    }
    const tex = new T.DataTexture(data, RES, RES, T.RGBAFormat); tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter; tex.needsUpdate = true;
    const at = (arr, x, z) => { const i = Math.floor(((x + EXT) / (2 * EXT)) * RES), j = Math.floor(((z + EXT) / (2 * EXT)) * RES); return i < 0 || j < 0 || i >= RES || j >= RES ? 0 : arr[j * RES + i]; };
    return { HC, MOAT0, MOAT1, WATER, h, cheb, riverSD, waterSD, dMoat, hills, huaiZ, feiX, roads, roadD, trampled, CAMP, EXT, landTex: tex, woodAt: (x, z) => at(wood, x, z), fieldAt: (x, z) => at(field, x, z),
      slope: (x, z) => { const e = 3; return Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e); } };
  };

  // ---------------------------------------------------------------- the terrain: two grids (fine centre, coarse horizon), shaded in the fragment shader
  const grid = (L, cx, cz, size, n, drop) => {
    const g = new T.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; let y = L.h(x, z); if (drop && Math.max(Math.abs(x), Math.abs(z)) < drop) y -= 40; p.setXYZ(i, x, y, z); }
    g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
  };
  N.terrain = function (L, env) {
    const mat = new T.MeshStandardMaterial({ roughness: 0.95, metalness: 0, envMap: env, envMapIntensity: 0.35 });
    mat.extensions = { derivatives: true };
    const U = { uLand: { value: L.landTex }, uExt: { value: L.EXT }, uHC: { value: L.HC } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uLand; uniform float uExt, uHC;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec2 luv = (vWP.xz + uExt) / (2. * uExt);
          vec4 lu = (luv.x > 0. && luv.x < 1. && luv.y > 0. && luv.y < 1.) ? texture2D(uLand, luv) : vec4(0.);
          float slope = 1. - clamp(vWN.y, 0., 1.);
          float n1 = fbm2(vWP.xz / 60.), n2 = vn2(vWP.xz / 7.) * fadeFreq(vWP, 1. / 7.) + .5 * (1. - fadeFreq(vWP, 1. / 7.)), n3 = vn2(vWP.xz * 1.3) * fadeFreq(vWP, 1.3) + .5 * (1. - fadeFreq(vWP, 1.3));
          // autumn grass: green in the low wet ground, gold on the dry rises
          vec3 green = vec3(.1, .15, .04), gold = vec3(.26, .19, .06), dry = vec3(.3, .24, .12);
          vec3 col = mix(green, gold, smoothstep(.35, .75, n1 + (vWP.y - 2.) * .02));
          col = mix(col, dry, smoothstep(.62, .8, fbm2(vWP.xz / 23. + 5.)) * .6);
          // fields: stubble, ploughed earth, winter wheat, fallow; furrows along each parcel
          if (lu.g > .05) {
            float crop = lu.g;
            vec3 fc = crop < .45 ? vec3(.36, .26, .09) : crop < .65 ? vec3(.16, .1, .05) : crop < .82 ? vec3(.11, .17, .04) : vec3(.24, .2, .09);
            float ang = .13; vec2 uv = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * vWP.xz;
            float fur = .5 + .5 * sin((crop > .5 ? uv.y : uv.x) * 3.1);
            fur = mix(.5, fur, fadeFreq(vWP, 3.1 / 6.28));
            col = mix(col, mix(fc, col, .35) * (.9 + .2 * fur), smoothstep(.05, .2, lu.g));
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
          col *= .86 + .28 * n3 * (.6 + .4 * n2);
          diffuseColor.rgb = col;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hb = (vn2(vWP.xz * .9) * fadeFreq(vWP, .9) + vn2(vWP.xz * 3.7) * .4 * fadeFreq(vWP, 3.7)) * (.25 + smoothstep(.3, .6, 1. - clamp(vWN.y, 0., 1.)));
            normal = bumpN(normal, -vViewPosition, hb * .22); }`);
    };
    mat.customProgramCacheKey = () => 'sg-terrain';
    const near = new T.Mesh(grid(L, 0, 0, 3400, 425, 0), mat), far = new T.Mesh(grid(L, 0, 0, 13000, 180, 1640), mat);
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

  // ---------------------------------------------------------------- rocks: sculpted pillars and boulders
  // A lathe body pushed out by fractal noise, fluted vertically, cut in horizontal beds; the vertex colour carries the
  // cavities (darker where the surface sank). Shaded with world-space noise: streaks, bedding, moss on top.
  const rockGeo = (seed, type) => {
    let g;
    if (type === 'pillar') {
      const pts = []; const H = 1, s0 = seed * 1.7;
      for (let i = 0; i <= 48; i++) { const v = i / 48; let r = 0.36 * (1.12 - 0.34 * v + 0.07 * Math.sin(v * 5 + s0) + 0.18 * Math.max(0, 0.12 - v) * 8); if (v > 0.8) r *= Math.sqrt(Math.max(0, 1 - ((v - 0.8) / 0.2) ** 2)); pts.push(new T.Vector2(Math.max(0.001, r), v * H - 0.05)); }
      g = new T.LatheGeometry(pts, 44);
    } else { g = new T.IcosahedronGeometry(0.5, 4); }
    g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = THREE.BufferGeometryUtils.mergeVertices(g);
    const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), v = new T.Vector3(), c = new T.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(p, i);
      let d;
      if (type === 'pillar') {
        c.set(v.x, 0, v.z); const r = c.length() || 1e-4, a = Math.atan2(v.z, v.x);
        const big = (fbm3(v.x * 2.2 + seed, v.y * 2.2, v.z * 2.2) - 0.5) * 0.3, fine = (fbm3(v.x * 9 + seed, v.y * 9, v.z * 9) - 0.5) * 0.07 - 0.05 * Math.abs(fbm3(v.x * 16 + seed, v.y * 5, v.z * 16) * 2 - 1);
        const plan = 0.09 * Math.sin(a * 2 + seed) + 0.06 * Math.sin(a * 3 + seed * 2.3) + 0.04 * Math.sin(a * 5 + seed * 0.7);
        const groove = -0.07 * Math.pow(Math.abs(Math.sin(a * 6 + 2.5 * fbm3(v.x * 1.2, v.y * 1.5 + seed, v.z * 1.2))), 0.35) * sstep(0.05, 0.3, v.y) * sstep(0.98, 0.8, v.y);
        const bed = -0.012 * sstep(0.8, 0.95, (v.y * 7 + fbm3(v.x * 3, v.y, v.z * 3 + seed) * 3) % 1);
        d = big + fine + plan + groove + 0.035 + bed;
        const k = Math.max(0.05, 1 + d / Math.max(0.05, r)); v.x *= k; v.z *= k; v.y += big * 0.15 * sstep(0.85, 1, v.y);
      } else {
        const big = (fbm3(v.x * 2 + seed, v.y * 2, v.z * 2) - 0.5) * 0.45, fine = (fbm3(v.x * 8 + seed, v.y * 8, v.z * 8) - 0.5) * 0.1;
        d = big + fine; v.multiplyScalar(1 + d); v.y = v.y < -0.12 ? -0.12 - (v.y + 0.12) * 0.15 : v.y; v.y *= 0.72;
      }
      p.setXYZ(i, v.x, v.y, v.z);
      const ao = clamp(0.58 + d * 3.6, 0.22, 1.08); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  N.rockMaterial = (env) => {
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, envMap: env, envMapIntensity: 0.45 });
    mat.extensions = { derivatives: true };
    mat.onBeforeCompile = (sh) => {
      N.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 p = vWP; float n = fbm3(p * .05), n2 = vn3(p * .6) * fadeFreq(p, .6) + .5 * (1. - fadeFreq(p, .6));
          vec3 base = mix(vec3(.13, .13, .125), vec3(.29, .28, .26), n);
          base *= 1. - .45 * smoothstep(.4, .85, vn3(vec3(p.x * .15, p.y * .014, p.z * .15)));          // rain streaks down the faces
          base *= .94 + .06 * sin(p.y * 1.3 + n * 7.);                                               // bedding
          float up = smoothstep(.45, .8, vWN.y) * smoothstep(.35, .6, fbm3(p * .09 + 3.));
          base = mix(base, vec3(.16, .19, .07) * (.8 + .4 * n2), up * .85);                           // moss and scrub on ledges
          base = mix(base, vec3(.36, .35, .3), smoothstep(.7, .85, vn3(p * .12)) * .25);              // lichen
          diffuseColor.rgb = base * (.85 + .3 * n2) * vColor.r; }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hb = vn3(vWP * .45) * fadeFreq(vWP, .45) + .45 * vn3(vWP * 1.7) * fadeFreq(vWP, 1.7) + .6 * abs(vn3(vec3(vWP.x * .25, vWP.y * .06, vWP.z * .25)) * 2. - 1.); normal = bumpN(normal, -vViewPosition, hb * .9); }`);
      sh.vertexShader = sh.vertexShader; // vertex colours already multiply in color_vertex
    };
    mat.customProgramCacheKey = () => 'sg-rock';
    return mat;
  };
  // pillars and boulders on the Bagong hills, a few boulders along the Fei
  N.rocks = function (L, env) {
    const mat = N.rockMaterial(env), group = new T.Group();
    const pillarG = [1, 2, 3, 4, 5].map((s) => rockGeo(s * 3.1, 'pillar')), boulderG = [1, 2, 3].map((s) => rockGeo(s * 5.3, 'boulder'));
    N.seed(41);
    const P = [[], [], [], [], []], B = [[], [], []];
    for (let k = 0; k < 9000 && P.flat().length < 34; k++) {
      const x = lerp(420, 1700, rnd()), z = lerp(-640, 420, rnd()), hl = L.hills(x, z);
      if (hl < 30 || L.waterSD(x, z) < 40 || P.flat().some((q) => Math.hypot(q[0] - x, q[2] - z) < 70)) continue;
      const H = 45 + rnd() * 95 * Math.min(1, hl / 90), R = H * (0.34 + rnd() * 0.22);
      P[Math.floor(rnd() * 5)].push([x, L.h(x, z) - 6, z, R, H, rnd() * 6.28]);
    }
    for (let k = 0; k < 20000 && B.flat().length < 420; k++) {
      const onHill = rnd() < 0.8, x = onHill ? lerp(350, 1750, rnd()) : L.feiX(0) + lerp(-60, 60, rnd()), z = onHill ? lerp(-650, 450, rnd()) : lerp(-400, 900, rnd());
      const hl = L.hills(x, z), sd = L.waterSD(x, z);
      if ((onHill && hl < 8) || sd < 3 || (!onHill && sd > 30)) continue;
      const s = onHill ? 4 + rnd() * 14 : 2 + rnd() * 5;
      B[Math.floor(rnd() * 3)].push([x, L.h(x, z) - s * 0.15, z, s, s, rnd() * 6.28]);
    }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
    const inst = (geo, list, pillar) => {
      if (!list.length) return;
      const m = new T.InstancedMesh(geo, mat, list.length);
      list.forEach(([x, y, z, R, H, r], i) => m.setMatrixAt(i, m4.compose(ps.set(x, y, z), q.setFromAxisAngle(Y, r), pillar ? sc.set(R / 0.36, H, R / 0.36 * (0.8 + 0.4 * h2(i, 3))) : sc.set(R, H, R * (0.8 + 0.4 * h2(i, 9))))));
      m.castShadow = true; m.receiveShadow = true; group.add(m);
    };
    pillarG.forEach((g, i) => inst(g, P[i], true)); boulderG.forEach((g, i) => inst(g, B[i], false));
    group.userData.pillars = P.flat();
    return group;
  };

  // ---------------------------------------------------------------- trees: leaf cards, instanced, wind, light through the leaves
  // The leaf atlas is painted on a canvas: four tiles of leaf clusters (summer green, autumn gold, maple red, pine).
  const leafAtlas = () => {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S * 2; const g = cv.getContext('2d');
    const tiles = [
      { hue: [72, 100], sat: [28, 48], lit: [20, 38] }, { hue: [34, 50], sat: [45, 66], lit: [28, 46] },
      { hue: [4, 22], sat: [50, 70], lit: [26, 40] }, { hue: [95, 130], sat: [22, 38], lit: [14, 26], pine: true },
    ];
    N.seed(5);
    tiles.forEach((t, ti) => {
      const ox = (ti % 2) * S, oy = Math.floor(ti / 2) * S, cx = ox + S / 2, cy = oy + S / 2;
      g.save(); g.beginPath(); g.rect(ox, oy, S, S); g.clip();
      // twigs
      g.strokeStyle = 'rgba(60,42,28,0.9)'; g.lineWidth = 3;
      for (let k = 0; k < 7; k++) { const a = rnd() * 6.28; g.beginPath(); g.moveTo(cx, cy + S * 0.3); g.quadraticCurveTo(cx + Math.cos(a) * S * 0.15, cy + Math.sin(a) * S * 0.1, cx + Math.cos(a) * S * 0.38, cy + Math.sin(a) * S * 0.34); g.stroke(); }
      const n = t.pine ? 520 : 420;
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28, rim = S * 0.43 * (0.82 + 0.18 * Math.sin(a * 3 + ti) + 0.1 * Math.sin(a * 7)), r = rim * Math.sqrt(rnd());
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, edge = r / rim;
        const hue = t.hue[0] + rnd() * (t.hue[1] - t.hue[0]) + (ti === 1 && rnd() < 0.18 ? 40 : 0), sat = t.sat[0] + rnd() * (t.sat[1] - t.sat[0]), lit = t.lit[0] + rnd() * (t.lit[1] - t.lit[0]) + (1 - edge) * -4 + (y < cy ? 6 : 0);
        g.save(); g.translate(x, y); g.rotate(rnd() * 6.28);
        if (t.pine) { g.strokeStyle = `hsl(${hue},${sat}%,${lit}%)`; g.lineWidth = 2.2; g.beginPath(); for (let m = 0; m < 5; m++) { g.moveTo(0, 0); g.lineTo(Math.cos(m * 0.35 - 0.7) * 22, Math.sin(m * 0.35 - 0.7) * 22); } g.stroke(); }
        else {
          const L = 13 + rnd() * 13, gr = g.createLinearGradient(-L, 0, L, 0); gr.addColorStop(0, `hsl(${hue},${sat}%,${lit - 6}%)`); gr.addColorStop(1, `hsl(${hue},${sat}%,${lit + 7}%)`);
          g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, L, L * 0.48, 0, 0, 6.28); g.fill();
          g.strokeStyle = `hsla(${hue},${sat}%,${lit - 10}%,0.6)`; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
        }
        g.restore();
      }
      g.restore();
    });
    // RGB from the leaves drawn over their own average colour (no black fringes when filtered), alpha from the leaves alone;
    // mips built here with alpha pushed up level by level, so crowns keep their fill at a distance (alpha test)
    const src = g.getImageData(0, 0, S * 2, S * 2).data, N2 = S * 2, lvl0 = new Uint8Array(N2 * N2 * 4), avg = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0];
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) { const q = (j * N2 + i) * 4, t = (j < S ? 0 : 2) + (i < S ? 0 : 1); if (src[q + 3] > 200) { avg[t * 3] += src[q]; avg[t * 3 + 1] += src[q + 1]; avg[t * 3 + 2] += src[q + 2]; cnt[t]++; } }
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) { const q = (j * N2 + i) * 4, t = (j < S ? 0 : 2) + (i < S ? 0 : 1), a = src[q + 3] / 255; for (let c = 0; c < 3; c++) lvl0[q + c] = a > 0.5 ? src[q + c] : (avg[t * 3 + c] / Math.max(1, cnt[t])) * (1 - a) + src[q + c] * a; lvl0[q + 3] = src[q + 3]; }
    // DataTexture rows run bottom-up: flip so the tiles sit where the uv code expects (tile 0, 1 on the canvas' top row)
    const flip = (d, n) => { const o = new Uint8Array(d.length), row = n * 4; for (let j = 0; j < n; j++) o.set(d.subarray(j * row, (j + 1) * row), (n - 1 - j) * row); return o; };
    const mips = [{ data: flip(lvl0, N2), width: N2, height: N2 }];
    for (let n = N2 / 2, l = 1; n >= 1; n /= 2, l++) {
      const p = mips[mips.length - 1], d = new Uint8Array(n * n * 4), boost = 1 + 0.45 * l;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) { const a = p.data[((2 * j) * p.width + 2 * i) * 4 + c] + p.data[((2 * j) * p.width + 2 * i + 1) * 4 + c] + p.data[((2 * j + 1) * p.width + 2 * i) * 4 + c] + p.data[((2 * j + 1) * p.width + 2 * i + 1) * 4 + c]; d[(j * n + i) * 4 + c] = c === 3 ? Math.min(255, (a / 4) * boost) : a / 4; }
      mips.push({ data: d, width: n, height: n });
    }
    const tex = new T.DataTexture(mips[0].data, N2, N2, T.RGBAFormat); tex.mipmaps = mips; tex.generateMipmaps = false; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
    tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.needsUpdate = true; return tex;
  };
  // one tree, local units (height ≈ 1): trunk and branches (cylinders), crown of cards in clumps
  const cardTree = (kind, seed, tile) => {
    N.seed(seed * 97 + 13);
    const pos = [], nor = [], uv = [], col = [], sway = [], idx = [];
    const TU = (tile % 2) * 0.5, TV = tile < 2 ? 0.5 : 0; // three flips v: tile 0,1 are the top row of the canvas
    const bark = new T.Color(0x3b2a1e);
    const addCyl = (a, b, r0, r1) => {
      const g = new T.CylinderGeometry(r1, r0, a.distanceTo(b), 5, 1, true), d = b.clone().sub(a).normalize();
      g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d), new T.Vector3(1, 1, 1)));
      const gi = g.index.array, gp = g.attributes.position, gn = g.attributes.normal, base = pos.length / 3;
      for (let i = 0; i < gp.count; i++) { pos.push(gp.getX(i), gp.getY(i), gp.getZ(i)); nor.push(gn.getX(i), gn.getY(i), gn.getZ(i)); uv.push(0.25, 0.02); col.push(bark.r, bark.g, bark.b); sway.push(Math.max(0, gp.getY(i) - 0.3) * 0.6); }
      for (let i = 0; i < gi.length; i++) idx.push(base + gi[i]);
    };
    const card = (c, size, center, droop = 0, tall = 1) => {
      // a quad at c, facing a random direction (tilted for droop), normals bent out from the crown centre
      const n = new T.Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.6 - droop, rnd() * 2 - 1).normalize(), up = Math.abs(n.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
      const t = new T.Vector3().crossVectors(up, n).normalize(), b = new T.Vector3().crossVectors(n, t).normalize(), rot = rnd() * 6.28;
      const tt = t.clone().multiplyScalar(Math.cos(rot)).add(b.clone().multiplyScalar(Math.sin(rot))), bb = new T.Vector3().crossVectors(n, tt);
      const base = pos.length / 3, s = size / 2;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v]) => {
        const p = c.clone().addScaledVector(tt, u * s).addScaledVector(bb, v * s * tall); pos.push(p.x, p.y, p.z);
        const nn = p.clone().sub(center).normalize().multiplyScalar(0.8).add(n.clone().multiplyScalar(0.2)).normalize(); nor.push(nn.x, nn.y, nn.z);
        uv.push(TU + (u * 0.5 + 0.5) * 0.5, TV + (v * 0.5 + 0.5) * 0.5);
        const ao = clamp(0.55 + 0.45 * ((p.y - center.y) / 0.45 + 0.6) * (0.55 + 0.45 * Math.min(1, p.distanceTo(center) / 0.35)), 0.35, 1.08); col.push(ao, ao, ao);
        sway.push(Math.max(0.3, p.y));
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const V = (x, y, z) => new T.Vector3(x, y, z);
    if (kind === 'pine') {
      addCyl(V(0, 0, 0), V(0, 0.96, 0), 0.028, 0.006);
      const center = V(0, 0.52, 0);
      for (let tier = 0; tier < 9; tier++) { const y = 0.2 + tier * 0.085, R = 0.28 * (1 - tier / 10); for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28 + tier * 0.7 + rnd() * 0.4; card(V(Math.cos(a) * R * 0.6, y, Math.sin(a) * R * 0.6), R * 1.05, center, 0.9, 0.7); } }
      card(V(0, 0.95, 0), 0.12, center);
    } else if (kind === 'willow') {
      addCyl(V(0, 0, 0), V(0.03, 0.45, 0), 0.04, 0.025);
      const center = V(0, 0.55, 0);
      for (let k = 0; k < 5; k++) { const a = rnd() * 6.28; addCyl(V(0.03, 0.42, 0), V(Math.cos(a) * 0.22, 0.72 + rnd() * 0.1, Math.sin(a) * 0.22), 0.018, 0.008); }
      for (let k = 0; k < 44; k++) { const a = rnd() * 6.28, r = 0.1 + rnd() * 0.25, y = 0.35 + rnd() * 0.45; card(V(Math.cos(a) * r, y, Math.sin(a) * r), 0.2, center, -0.2, 2.2); }
    } else { // broadleaf: a few clumps on branches
      const H = 1, trunkTop = 0.42 + rnd() * 0.1;
      addCyl(V(0, 0, 0), V(0, trunkTop, 0), 0.045, 0.03);
      const center = V(0, 0.64, 0), clumps = [];
      const nc = 6 + Math.floor(rnd() * 3);
      for (let k = 0; k < nc; k++) { const a = (k / nc) * 6.28 + rnd() * 0.6, r = 0.12 + rnd() * 0.16, y = 0.55 + rnd() * 0.32; const c = V(Math.cos(a) * r, y, Math.sin(a) * r); clumps.push(c); addCyl(V(0, trunkTop - 0.05, 0), c.clone().multiplyScalar(0.8), 0.022, 0.008); }
      clumps.push(V(0, 0.86 * H, 0));
      for (const c of clumps) { const R = 0.13 + rnd() * 0.06; for (let m = 0; m < 9; m++) { const off = V(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.8, rnd() * 2 - 1).normalize().multiplyScalar(R * Math.cbrt(rnd())); card(c.clone().add(off), R * 1.5, center); } }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('sway', new T.Float32BufferAttribute(sway, 1)); g.setIndex(idx);
    return g;
  };
  N.treeMaterial = (atlas, env, sun) => {
    const U = { uTime: { value: 0 }, uSunDir: { value: sun.dir.clone() }, uSunCol: { value: sun.color.clone() } };
    const wind = `
      #include <begin_vertex>
      { vec3 ip = vec3(0.);
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3].xyz;
      #endif
        float ph = uTime * 1.3 + ip.x * .031 + ip.z * .027, s = sway * sway;
        transformed.x += (sin(ph) * .018 + sin(ph * 2.7 + position.y * 9.) * .006) * s;
        transformed.z += (cos(ph * .8) * .014 + sin(ph * 3.1 + position.x * 11.) * .006) * s; }`;
    const mat = new T.MeshStandardMaterial({ map: atlas, alphaTest: 0.42, side: T.DoubleSide, vertexColors: true, roughness: 0.82, metalness: 0, envMap: env, envMapIntensity: 0.4 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway; uniform float uTime;').replace('#include <begin_vertex>', wind);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunDir, uSunCol;').replace('#include <output_fragment>', `
        { vec3 L = normalize((viewMatrix * vec4(uSunDir, 0.)).xyz), Vd = normalize(vViewPosition);
          float back = pow(clamp(dot(-Vd, L), 0., 1.), 3.);                                  // sun through the leaves
          outgoingLight += diffuseColor.rgb * uSunCol * (back * .9 + .08); }
        #include <output_fragment>`);
    };
    mat.customProgramCacheKey = () => 'sg-tree';
    const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: atlas, alphaTest: 0.42 });
    depth.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway; uniform float uTime;').replace('#include <begin_vertex>', wind); };
    return { mat, depth, U };
  };
  // the forests: species by place (willows on the banks, pines on the hills, gold and red in the autumn woods)
  N.trees = function (L, env, sun, extra = []) {
    const atlas = leafAtlas(), TM = N.treeMaterial(atlas, env, sun), group = new T.Group();
    const species = [
      { kind: 'broad', tile: 0, v: [1, 2] }, { kind: 'broad', tile: 1, v: [3, 4] }, { kind: 'broad', tile: 2, v: [5] }, { kind: 'pine', tile: 3, v: [6, 7] }, { kind: 'willow', tile: 0, v: [8] },
    ];
    const geos = species.map((s) => s.v.map((v) => cardTree(s.kind, v, s.tile)));
    const lists = geos.map((vs) => vs.map(() => []));
    N.seed(77);
    const put = (si, x, z, H) => { const vi = Math.floor(rnd() * geos[si].length); lists[si][vi].push([x, L.h(x, z) - 0.3, z, H, rnd() * 6.28]); };
    let placed = 0;
    for (let k = 0; k < 400000 && placed < 9000; k++) {
      const x = (rnd() * 2 - 1) * (L.EXT - 20), z = (rnd() * 2 - 1) * (L.EXT - 20), w = L.woodAt(x, z);
      if (w < 0.05 || rnd() > w * 0.9) continue;
      const sd = L.riverSD(x, z), hl = L.hills(x, z), sl = L.slope(x, z);
      if (L.waterSD(x, z) < 4 || sl > 0.9) continue;
      const nearWater = sd < 26, n = fbm2(x / 160 + 30, z / 160);
      const si = nearWater ? (rnd() < 0.7 ? 4 : 0) : hl > 20 && rnd() < 0.45 ? 3 : n > 0.68 ? 2 : n > 0.5 ? 1 : rnd() < 0.15 ? 3 : 0;
      put(si, x, z, (si === 3 ? 13 : si === 4 ? 10 : 11) + rnd() * 7); placed++;
    }
    // lone trees and rows along field edges and roads
    for (let k = 0; k < 60000 && placed < 10200; k++) {
      const x = (rnd() * 2 - 1) * 1400, z = (rnd() * 2 - 1) * 1400;
      if (L.cheb(x, z) < L.MOAT1 + 20 || L.waterSD(x, z) < 6 || L.woodAt(x, z) > 0.05 || L.trampled(x, z) > 0.25) continue;
      const rd = L.roadD(x, z); if (rd < 6) continue;
      if (rd < 14 ? rnd() < 0.08 : rnd() < 0.006) { put(rnd() < 0.6 ? 0 : 1, x, z, 9 + rnd() * 6); placed++; }
    }
    for (const e of extra) { put(e[2] ?? 0, e[0], e[1], e[3] ?? 9); if (e[4] !== undefined) { const si = e[2] ?? 0, L2 = lists[si].find((l) => l.length && l[l.length - 1][0] === e[0] && l[l.length - 1][2] === e[1]); if (L2) L2[L2.length - 1][1] = e[4]; } }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), Y = new T.Vector3(0, 1, 0), tint = new T.Color();
    geos.forEach((vs, si) => vs.forEach((geo, vi) => {
      const list = lists[si][vi]; if (!list.length) return;
      const m = new T.InstancedMesh(geo, TM.mat, list.length);
      list.forEach(([x, y, z, H, r], i) => { m.setMatrixAt(i, m4.compose(ps.set(x, y, z), q.setFromAxisAngle(Y, r), sc.set(H * (0.85 + 0.3 * h2(i, si)), H, H * (0.85 + 0.3 * h2(i + 5, si))))); const b = 0.82 + 0.3 * h2(i, vi + 11); m.setColorAt(i, tint.setRGB(b, b * (0.96 + 0.08 * h2(i, 3)), b * 0.95)); });
      m.customDepthMaterial = TM.depth; m.castShadow = true; m.receiveShadow = true; group.add(m);
    }));
    group.userData.U = TM.U; group.userData.count = placed;
    return group;
  };
})();
