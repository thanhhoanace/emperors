// The game's Han model kit (src/world/han-models.js): every model built in code with Ryan Sael's recipe
// (docs/research/ryan-sael.md): blocks with rounded edges that catch a highlight, people and horses from curved shapes
// (lathe, capsule, sphere), Eastern Han roofs (docs/decisions/0006: straight slopes, straight eaves, grey tube tiles,
// the ridge ends turned up a little), everything merged per model with vertex colours and drawn with one material
// (environment map, saturation lift, a sky rim on the edges, gilt and steel parts that shine). Started from the closed
// demo 1 spike (docs/phases/v2-gameplay/demo1/src/hn-models.js, which stays as it was for that phase); the v2 polish
// (docs/design/v2-polish.md, job 6) added the posed figurines, the waving cloth, the siege camp, the damaged town and the
// fields round it. The battle scene (src/world/battle.js, docs/design/visual-build.md §3) builds at 1 unit = 1 m with kit
// units × 30. Harness: docs/design/prototypes/models.html.
//   const HM = HanModels.create({ recv, colors, renderer, quality? })   (a new kit each call; the tier from the renderer)
//   HM.army({ fid, bo, cung, ky, thuy, fleet, seal, pose }) → Group (faces +x; userData { parts, r, pose, setPose(p) })
//   HM.town({ level, seed, size, open, damage: 0..1, burnt }) → Group (userData { L, H, flagAt, gates, fires, smoke })
//   HM.siegeCamp({ fid, men, r, seed, face, seal }) → Group, centred on the town it rings, in the town's units
//   HM.figure(arm, fid, pose) → geometry · HM.banner(fid, ch, { w, h }) → a flag's pivot · HM.standard(fid, ch, { h })
//   HM.siegeWall(len, level) · HM.siegeTower(level) · HM.tree(kind) → geometry · HM.hamlet(seed) → geometry
//   HM.fire(points, s) · HM.smoke(points, s) → animated meshes · HM.setPose(army, pose) · HM.setTime(t | null)
//   HM.parts (kit, xf, paint, shade, rbox, roof, pavilion, house, granary, que, wallPrism, C …) · HM.mat · HM.look
// Kit InstancedMeshes carry instanceColor from creation (the r146 trap) and keep it white: a gilt or steel part is
// flagged in its vertex colour (red + 2), which a tint would blur.
(function (root) {
  const HMS = (root.HanModels = {});

  // ---------------------------------------------------------------- pure helpers (Node: tests/han-models.test.mjs)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Park–Miller, the kit's one random stream: lcg(seed)() → [0, 1)
  const lcg = (seed) => { let s = (Math.floor(Math.abs(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  HMS.lcg = lcg;
  HMS.POSES = ['stand', 'march', 'fight'];
  HMS.pose = (p) => (HMS.POSES.includes(p) ? p : 'stand');
  // how many figures n men make: one per `per`, at least one, at most `max`
  HMS.count = (n, per, max) => (n > 0 ? Math.max(1, Math.min(max, Math.round(n / per))) : 0);
  // the figures an army is drawn with (huainan-scene.js S.figures keeps the same caps)
  HMS.figures = (u, fleet) => (fleet ? { thuy: HMS.count(u.thuy, 600, 4) || 1 } : { bo: HMS.count(u.bo, 600, 9), cung: HMS.count(u.cung, 400, 4), ky: HMS.count(u.ky, 450, 6), thuy: HMS.count(u.thuy, 600, 3) });
  // a town's damage in quarters (0, .25, .5, .75, 1): one cached model per step
  HMS.damageStep = (d) => Math.round(clamp(Number(d) || 0, 0, 1) * 4) / 4;
  HMS.tierOf = (q) => (q && (q.tier === 'low' || q.tier === 'mid') ? q.tier : 'high');
  // Where a land army's figures stand (the group faces +x): the general out in front, his standard-bearer at his left
  // shoulder, the foot in ranks three abreast, the marines behind them, the archers in a looser line at the back, the
  // horse in two files on the right flank. Every point is [x, z, yaw]; the base is a disc of radius r round (CX, 0).
  const CX = -0.35, jit = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1) * 0.035;
  HMS.formation = (n) => {
    const nb = n.bo || 0, nt = n.thuy || 0, nc = n.cung || 0, nk = n.ky || 0;
    const grid = (cnt, x0, cols, dx, dz, z0, k0) => Array.from({ length: cnt }, (_, k) => [x0 - Math.floor(k / cols) * dx + jit(k + k0), z0 + ((k % cols) - (Math.min(cols, cnt) - 1) / 2) * dz + jit(k + k0 + 7), jit(k + k0 + 3) * 2]);
    const rows = (c, cols) => Math.ceil(c / cols);
    const bo = grid(nb, 0.16, 3, 0.29, 0.29, -0.24, 0), x1 = 0.16 - rows(nb, 3) * 0.29;
    const thuy = grid(nt, x1 - 0.02, 3, 0.29, 0.29, -0.24, 20), x2 = x1 - 0.02 - rows(nt, 3) * 0.29;
    const cung = grid(nc, x2 - 0.05, 4, 0.3, 0.27, -0.28, 40);
    const ky = grid(nk, 0.36, 2, 0.5, 0.4, 0.74, 60);
    const general = [0.8, 0.12, 0], bearer = [0.5, -0.4, 0];
    const all = [...bo, ...thuy, ...cung, ...ky, general, bearer];
    const r = Math.max(1.15, ...all.map(([x, z]) => Math.hypot(x - CX, z) + 0.26));
    return { bo, thuy, cung, ky, general, bearer, r, cx: CX };
  };
  // the breaches of a damaged town: [{ side 0–3 (0 is +z, then a quarter turn each), at: −1..1 along it, w: its width in
  // the side's half-length }], one a quarter of damage, never at a gate or a corner, never two on one side
  HMS.breaches = (seed, damage, open) => {
    const n = Math.round(HMS.damageStep(damage) * 4), rnd = lcg(seed * 131 + 17), sides = [0, 1, 2, 3].filter((s) => !(open && s === 0)), out = [];
    for (let i = 0; i < n && sides.length; i++) {
      const side = sides.splice(Math.floor(rnd() * sides.length), 1)[0], sg = rnd() < 0.5 ? -1 : 1;
      out.push({ side, at: sg * (0.42 + rnd() * 0.3), w: 0.1 + rnd() * 0.06 });
    }
    return out;
  };
  // A siege camp's plan round a town (its units): a ring of stakes on a bank at radius r facing the town, 1–4 camps
  // outside it (the first at `face`, where the army came from), their tents, fires, a banner at each camp's gate, the
  // engines inside the ring facing the walls, ladders and carts by the camps. Angles in radians, 0 = +x, turning to +z.
  HMS.campPlan = ({ men = 6000, r = 3.3, seed = 1, face = 0 } = {}) => {
    const rnd = lcg(seed * 71 + 5), n = clamp(Math.round(men / 3500), 1, 4), camps = [];
    const per = clamp(Math.round(men / n / 550), 4, 10);
    for (let c = 0; c < n; c++) {
      const a = face + (c ? (c % 2 ? 1 : -1) * Math.ceil(c / 2) * (n > 2 ? 1.75 : 2.6) + (rnd() - 0.5) * 0.3 : 0), d = r + 0.95, main = c === 0;
      const tents = [];
      for (let i = 0; i < per + (main ? 2 : 0); i++) tents.push([(i % 4) - 1.5, Math.floor(i / 4) - (Math.ceil((per + (main ? 2 : 0)) / 4) - 1) / 2, rnd()]);
      camps.push({ a, d, main, w: main ? 1.5 : 1.2, dd: main ? 1.1 : 0.9, tents, fires: main ? 2 : 1 });
    }
    const engines = [];
    const ne = clamp(Math.round(men / 4000), 1, 3);
    for (let i = 0; i < ne; i++) engines.push({ kind: 'trebuchet', a: face + (i - (ne - 1) / 2) * 0.55 + (rnd() - 0.5) * 0.1, d: r - 0.3 });
    engines.push({ kind: 'ram', a: face + (rnd() < 0.5 ? 0.3 : -0.3), d: r - 0.55 });
    if (men >= 5000) engines.push({ kind: 'tower', a: face + Math.PI * (0.35 + rnd() * 0.3) * (rnd() < 0.5 ? -1 : 1), d: r - 0.35 });
    const gates = camps.map((c) => c.a);
    return { r, camps, engines, gates, stand: [Math.cos(face) * (r + 2.6), Math.sin(face) * (r + 2.6)] };
  };

  HMS.create = function (o) {
    const T = THREE, BGU = THREE.BufferGeometryUtils, COLOR = o.colors, HM = {};
    const tier = HMS.tierOf(o.quality || (o.renderer && o.renderer.userData && o.renderer.userData.quality)), lite = tier === 'low';

    // ---------------------------------------------------------------- geometry kit
    const prep = (g) => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; };
    // colours are sRGB hex; kit.js turns ColorManagement.legacyMode off, so THREE.Color converts them to linear itself.
    // A negative hex is a metal (gilt, steel): its red goes up by 2, which the look pass reads back as metalness.
    const lin = (hex) => new T.Color(hex);
    const paint = (g, hex) => { g = prep(g); const metal = hex < 0, c = lin(Math.abs(hex)), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r + (metal ? 2 : 0); a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; };
    const shade = (hex, k) => (hex < 0 ? hex : new T.Color(hex).lerp(new T.Color(k < 0 ? 0x000000 : 0xffffff), Math.abs(k)).getHex());
    const mix = (a, b, k) => new T.Color(Math.abs(a)).lerp(new T.Color(Math.abs(b)), k).getHex();
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
        // the same, lighter (the figurines: a few pixels wide on the map): a capsule of one ring a cap, or a thin rod
        limb: (a, b, r, hex, rod) => {
          const d = V.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); d.normalize();
          const g = paint(rod ? new T.CylinderGeometry(r, r, len, lite ? 4 : 5, 1, true) : new T.CapsuleGeometry(r, Math.max(0.001, len), 1, lite ? 5 : 6), hex);
          g.applyMatrix4(M.compose(S.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), Q.setFromUnitVectors(UP, d), new T.Vector3(1, 1, 1)));
          parts.push(g); return k;
        },
        // a shape set along a direction: its +y goes along `dir`, its origin at `at`
        along: (g, hex, at, dir, s = [1, 1, 1]) => { const d = V.set(dir[0], dir[1], dir[2]).normalize(); parts.push(paint(g, hex).applyMatrix4(M.compose(S.set(at[0], at[1], at[2]), Q.setFromUnitVectors(UP, d), new T.Vector3(s[0], s[1], s[2])))); return k; },
        geo: () => BGU.mergeBufferGeometries(parts),
        get n() { return parts.length; },
      };
      return k;
    };
    // (a bevel on a part thinner than ~0.035 is below a pixel at every zoom the demo allows: a plain box there)
    const rbox = (w, h, d, r = 0.2) => (!r || Math.min(w, h, d) < 0.035 ? new T.BoxGeometry(w, h, d) : new T.RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * r));
    // the town's and the figurines' own boxes: on the low tier a bevel under 0.07 is a plain box (a bevel is 108 triangles, a box 12)
    const rb = (w, h, d, r = 0.2) => (lite && Math.min(w, h, d) < 0.07 ? new T.BoxGeometry(w, h, d) : rbox(w, h, d, r));
    const cyl = (rt, rb_, h, seg = 8, open = false) => new T.CylinderGeometry(rt, rb_, h, seg, 1, open);
    const sph = (r, ws = 10, hs = 7) => new T.SphereGeometry(r, ws, hs);
    const lathe = (pts, seg = 10) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
    const cone = (r, h, seg = 8) => new T.ConeGeometry(r, h, seg);
    const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
    // a lumpy ball (tree crowns, rubble): an icosphere pushed in and out by position, smooth normals
    const blob = (r, seed = 0, detail = 1) => {
      let g = new T.IcosahedronGeometry(r, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = BGU.mergeVertices(g);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash(x * 9 + seed, y * 9, z * 9) - 0.5) * 0.28; p.setXYZ(i, x * k, y * k * 0.9, z * k); }
      g.computeVertexNormals(); return g;
    };
    // a flat-faced shape from raw triangles
    const tris = (v) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; };
    // the same triangles facing both ways (a sail, a pennant)
    const twoSided = (v) => { const w = []; for (let i = 0; i < v.length; i += 9) w.push(v[i], v[i + 1], v[i + 2], v[i + 6], v[i + 7], v[i + 8], v[i + 3], v[i + 4], v[i + 5]); return [tris(v), tris(w)]; };
    const LOD = lite ? 0.65 : 1, sg = (n) => Math.max(4, Math.round(n * LOD)); // segments round a lathe or a sphere, fewer on the low tier

    // ---------------------------------------------------------------- palette (warm key light, Ryan's saturation)
    const C = {
      skin: 0xc27443, cloth: 0x0b0806, boot: 0x060403, iron: 0x1b1e23, brass: 0xa16112, leather: 0x271208, wood: 0x281408, straw: 0xb17f2b, red: 0x860906, cream: 0xdcc69a,
      // wall earth by lũy: loess (1–2), a deeper rammed ochre with timber lacing (3), the dense yellow earth of a great city (4)
      earth: 0x806341, rammed: 0x735a3a, rammed2: 0x8a7049, timber: 0x2e1a0c, brick: 0x735a3a /* old name of `rammed`: Han walls are earth, never brick (0006) */, stone: 0x5d5a50, plinth: 0x413a30, dark: 0x060403,
      roof: 0x3c434e, thatch: 0x745222, under: 0x411b0c, pillar: 0x640a06, plaster: 0xdacaa8, plaster2: 0xbe9f67, bracket: 0x0c2922, lattice: 0x520c06, base: 0x7c725d,
      ground: 0x524625, yard: 0x73603d, road: 0x978050, paving: 0x7a705c, grass: 0x415d1a, trunk: 0x1b0e08, water: 0x133c47,
      leaf: [0x1b340a, 0x27460e, 0x122508, 0x334c0f, 0x19320d], pine: 0x0d1d09,
      // fields round a town (autumn of 219: ripe grain, stubble, greens, fresh ploughing, fallow) and its orchards
      field: [0x9a7f33, 0x7f6a3a, 0x4d6420, 0x5b3f24, 0x6a6a31, 0x8c7a2c], orchard: [0x3d5a18, 0x56661c, 0x7a5a17, 0x46541a],
      char: 0x1d1a17, soot: 0x2a2520, ember: 0x7a2a0a, canvas: [0xcbb88c, 0xb39d70, 0xd8c9a2, 0xa89068], hide: 0x4a321d,
      // metals (negative: the look pass shines them): gilt bronze, steel
      gilt: -0xb4822c, steel: -0xa8afb8, bronze: -0x8a5a22,
    };

    // ---------------------------------------------------------------- material: environment from a gradient sky, saturation, sky rim
    let env = null;
    if (o.renderer) {
      const es = new T.Scene(), sky = new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 d;void main(){vec3 c=mix(vec3(.42,.36,.28),vec3(.95,.9,.8),smoothstep(-.3,.05,d.y));c=mix(c,vec3(.52,.66,.86),smoothstep(.05,.7,d.y));c+=vec3(1.4,1.1,.7)*pow(max(dot(d,normalize(vec3(-.5,.5,-.3))),0.),12.);gl_FragColor=vec4(c,1.);}' });
      es.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), sky));
      const pm = new T.PMREMGenerator(o.renderer); env = pm.fromScene(es, 0.04).texture; pm.dispose();
    }
    // one clock for everything that moves in a shader (cloth, flames, smoke): the page's time, or a fixed one (HM.setTime)
    const U = { uSat: { value: 1.08 }, uRim: { value: new T.Color(0.24, 0.3, 0.38) }, uTime: { value: 0 } };
    let fixedTime = null;
    const tick = () => { U.uTime.value = fixedTime != null ? fixedTime : typeof performance !== 'undefined' ? performance.now() / 1000 : 0; };
    HM.setTime = (t) => { fixedTime = t == null ? null : Number(t); tick(); };
    // Cloth: a flag's vertices wave by their place on the cloth (uv.x 0 at the pole, 1 at the fly; uv.y 1 at the top),
    // the wave's size a part of the cloth's height (read off a plane centred on its origin, rows never at uv.y 0.5);
    // `hold` keeps the top edge still (a banner on a spar), `sag` lets the fly droop. Each flag its own phase (its place).
    const CLOTH = `
      uniform float uTime, uClothAmp, uClothHold, uClothSag;
      vec4 hmCloth() {
        float u = uv.x, v = uv.y, h = abs(position.y) / max(abs(v - 0.5), 0.05);
        vec3 o = modelMatrix[3].xyz;
        #ifdef USE_INSTANCING
          o += mat3(modelMatrix) * instanceMatrix[3].xyz;
        #endif
        float ph = dot(o.xz, vec2(0.73, 1.31)) + o.y * 0.5, k = uClothAmp * h * (1.0 - uClothHold * v);
        float w1 = 5.2 * u - uTime * 3.1 + ph + v * 1.3, w2 = 10.8 * u - uTime * 4.7 + ph * 1.7 - v * 0.9;
        float s = sin(w1) + 0.3 * sin(w2), d = k * u * s;
        float du = k * (s + u * (5.2 * cos(w1) + 3.24 * cos(w2)));
        vec3 off = vec3(-abs(d) * 0.3, -uClothSag * h * u * u * (1.0 - uClothHold * v) + k * u * 0.25 * sin(w1 + 1.3), d);
        return vec4(off, du / max(h * 0.62, 1e-4));
      }`;
    const clothVS = (sh, normal) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + CLOTH)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += hmCloth().xyz;');
      if (normal) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(normal) + vec3(-hmCloth().w * (normal.z < 0.0 ? -1.0 : 1.0), 0.0, 0.0));');
    };
    const clothU = (o = {}) => ({ uClothAmp: { value: o.amp ?? 0.075 }, uClothHold: { value: o.hold ?? 0 }, uClothSag: { value: o.sag ?? 0.05 } });
    // The kit's look: metals shine (their red was raised by 2 in paint), a sky rim on the edges, saturation lifted. A flag's
    // cloth (a material with a map drawn on both sides, or look(m, { cloth: true })) waves as above.
    const look = (m, opt = {}) => {
      const cloth = opt.cloth ?? !!(m.map && m.side === T.DoubleSide), cu = cloth ? clothU(opt) : null;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uSat = U.uSat; sh.uniforms.uRim = U.uRim;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSat; uniform vec3 uRim;')
          .replace('#include <color_fragment>', `#include <color_fragment>
            float hmMetal = 0.0;
            #ifdef USE_COLOR
              hmMetal = step(1.5, vColor.r); diffuseColor.r = max(diffuseColor.r - 2.0 * hmMetal, 0.0);
            #endif`)
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.82, hmMetal); roughnessFactor = mix(roughnessFactor, 0.34, hmMetal);')
          .replace('#include <output_fragment>',
            `{ float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); outgoingLight += uRim * fr * (0.3 + 0.7 * diffuseColor.rgb); }
             outgoingLight = max(mix(vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))), outgoingLight, uSat), 0.0);
             #include <output_fragment>`);
        if (cloth) { sh.uniforms.uTime = U.uTime; Object.assign(sh.uniforms, cu); clothVS(sh, true); }
      };
      m.customProgramCacheKey = () => (cloth ? 'hnlook-cloth' : 'hnlook');
      if (cloth) m.onBeforeRender = tick;
      return m;
    };
    // the shadow of a waving cloth (its depth pass waves the same way; the map's alpha cuts the tongues of its fly)
    const clothDepth = (map, opt) => {
      const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5 }), cu = clothU(opt);
      m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; Object.assign(sh.uniforms, cu); clothVS(sh, false); };
      m.customProgramCacheKey = () => 'hn-cloth-depth';
      return m;
    };
    const mat = o.recv(look(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0, envMap: env, envMapIntensity: 0.85 })));
    const waterMat = new T.MeshStandardMaterial({ color: lin(C.water), roughness: 0.12, metalness: 0.1, envMap: env, envMapIntensity: 1.1 });

    // ---------------------------------------------------------------- the Han roof (docs/design/history.md, decisions/0006)
    // Over a w × d plan (x × z), eaves at y = 0, ridge at y = h. Eastern Han: straight slopes and straight eaves (no
    // curved roof, no upturned corners: those are later), the two ends of the ridge turned up a little, grey tube tiles.
    // kind 'hip' (庑殿, four slopes) or 'gable' (悬山, two). tMax < 1 stops the slopes part way up: the eave of a lower
    // storey. Tiles: ridged columns. o.lift (default 0) is kept for thatch that sags at the corners. o.lite: fewer tiles,
    // thin hip ridges (the low tier's towns).
    const prof = (t, h) => h * t;
    const roof = (w, d, h, o = {}) => {
      if (d > w) return xf(roof(d, w, h, o), [0, 0, 0], [0, Math.PI / 2, 0]);
      const a = w / 2, b = d / 2, hip = o.kind !== 'gable', tMax = o.tMax ?? 1, lift = o.lift ?? 0, th = o.th ?? Math.max(0.01, h * 0.08);
      const top = o.color ?? C.roof, under = o.under ?? C.under, ridge = o.ridge ?? shade(top, -0.3), tile = o.lite && o.tiles ? Math.max(o.tiles, 0.09) : o.tiles ?? 0.05;
      const nt = o.lite ? Math.min(3, o.nt ?? 5) : o.nt ?? 5, parts = [];
      const Y = (u, t) => prof(t, h) + lift * Math.pow(1 - t, 2.2) * Math.pow(Math.abs(u), 3);
      const faces = hip ? [0, 1, 2, 3] : [0, 1];
      for (const f of faces) {
        const long = f < 2, sg2 = f % 2 ? -1 : 1, eave = long ? a : b, nu = tile ? Math.max(4, Math.min(48, 2 * Math.round(eave / tile))) : o.lite ? 2 : 6;
        const P = (u, t) => {
          const e = long ? (hip ? a - t * b : a) : b * (1 - t), n = long ? b * (1 - t) : a - t * b, along = u * e;
          const ridged = tile && (Math.round((u + 1) * nu / 2) % 2) && t < tMax - 1e-6 ? th * 0.45 * (1 - Math.pow(Math.abs(u), 12)) : 0;
          const y = Y(u, t) + ridged;
          return long ? [along, y, sg2 * n] : [sg2 * n, y, along];
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
        const up = [], ep = [], nuU = o.lite ? 1 : nu, ntU = o.lite ? 1 : nt;
        for (let i = 0; i < nuU; i++) for (let j = 0; j < ntU; j++) {
          const q = [P(-1 + (2 * i) / nuU, (tMax * j) / ntU), P(-1 + (2 * (i + 1)) / nuU, (tMax * j) / ntU), P(-1 + (2 * i) / nuU, (tMax * (j + 1)) / ntU), P(-1 + (2 * (i + 1)) / nuU, (tMax * (j + 1)) / ntU)].map((p) => [p[0], p[1] - th, p[2]]);
          if (!o.noUnder) up.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
        }
        for (let i = 0; i < nuU; i++) { const p0 = P(-1 + (2 * i) / nuU, 0), p1 = P(-1 + (2 * (i + 1)) / nuU, 0); ep.push(...p0, p0[0], p0[1] - th, p0[2], ...p1, ...p1, p0[0], p0[1] - th, p0[2], p1[0], p1[1] - th, p1[2]); }
        const ug = up.length ? paint(tris(up), under) : null, eg = paint(tris(ep), shade(under, -0.2));
        // the winding of those two depends on the face: turn them outward
        for (const gg of up.length ? [ug, eg] : [eg]) { const n = gg.attributes.normal, p = gg.attributes.position; let dot = 0; for (let i = 0; i < n.count; i++) dot += gg === ug ? n.getY(i) : n.getX(i) * p.getX(i) + n.getZ(i) * p.getZ(i); if (gg === ug ? dot > 0 : dot < 0) { const a2 = p.array; for (let i = 0; i < a2.length; i += 9) for (let c = 0; c < 3; c++) { const t0 = a2[i + 3 + c]; a2[i + 3 + c] = a2[i + 6 + c]; a2[i + 6 + c] = t0; } gg.computeVertexNormals(); } parts.push(gg); }
      }
      // ridges: the main ridge with upturned ends, the hip (or verge) ridges ending in flying tips
      const rk = kit(), rt = th * 1.1;
      if (tMax >= 1) {
        const rl = hip ? a - b : a;
        if (rl > 0.02) {
          rk.add(o.lite ? new T.BoxGeometry(2 * rl + rt * 2, rt * 2.2, rt * 2) : rbox(2 * rl + rt * 2, rt * 2.2, rt * 2, h > 0.1 ? 0.35 : 0), ridge, [0, h + rt * 0.7, 0]);
          for (const sx of [-1, 1]) rk.add(cone(rt * 1.1, rt * 4, o.lite ? 4 : 5), ridge, [sx * (rl + rt * 1.2), h + rt * 2.6, 0], [0, 0, -sx * 0.5]);
        } else rk.add(lathe([[0, h], [rt * 2.2, h], [rt * 1.6, h + rt * 2.2], [rt * 1.2, h + rt * 4], [0, h + rt * 5]], o.lite ? 5 : 8), C.brass, [0, 0, 0]);
      }
      const hipPts = (sx, sz) => {
        const pts = [];
        for (let j = Math.round(nt * tMax); j >= 0; j--) { const t = (j / nt), p = hip ? [sx * (a - t * b), Y(1, t) + rt * 0.6, sz * b * (1 - t)] : [sx * a, Y(1, t) + rt * 0.6, sz * b * (1 - t)]; pts.push(new T.Vector3(...p)); }
        const c = pts[pts.length - 1]; pts.push(new T.Vector3(c.x + sx * th * 0.8, c.y - th * 0.3, c.z + sz * th * 0.8 * (hip ? 1 : 0)));
        return pts;
      };
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pts = hipPts(sx, sz); if (pts.length > 2) rk.push(paint(new T.TubeGeometry(new T.CatmullRomCurve3(pts), o.lite ? 2 : 6, rt * 0.75, o.lite ? 3 : 4), ridge)); }
      parts.push(rk.geo());
      const g = BGU.mergeBufferGeometries(parts);
      g.userData = { topW: hip ? 2 * (a - tMax * b) : w, topD: 2 * b * (1 - tMax), topY: prof(tMax, h) };
      return g;
    };

    // ---------------------------------------------------------------- buildings
    // a hall or tower: stone base, storeys of columns, walls and a painted bracket band, each under its roof;
    // with double eaves the lower storeys get a skirt roof and a balcony floor. Long axis x, front +z, base at y = 0.
    // o.burnt: the frame of one that burned (charred posts and beams, no walls, no roof)
    const pavilion = (o) => {
      const k = kit(), n = o.storeys || 1, ov = o.ov ?? 0.09, box = o.lite ? rb : rbox;
      let y = 0, w = o.w, d = o.d;
      if (o.base) { k.add(box(w + 0.1, o.base, d + 0.1, 0.18), o.baseColor ?? C.base, [0, o.base / 2, 0]); y += o.base; }
      if (o.burnt) {
        const h = o.h ?? 0.15;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1]]) k.add(cyl(0.012, 0.015, h * (0.55 + hash(sx, sz, w) * 0.5), 5), C.char, [sx * w * 0.42, y + h * 0.35, sz * d * 0.42], [hash(sz, sx, 3) * 0.3 - 0.15, 0, hash(sx, 2, sz) * 0.3 - 0.15]);
        k.add(new T.BoxGeometry(w * 0.95, 0.015, 0.02), C.char, [0, y + h * 0.7, d * 0.42], [0, 0, 0.15]);
        k.add(new T.BoxGeometry(0.02, 0.015, d * 0.9), C.char, [w * 0.3, y + h * 0.55, 0], [0.2, 0, 0]);
        const g = k.geo(); g.userData.top = y + h; return g;
      }
      for (let s = 0; s < n; s++) {
        const last = s === n - 1, h = (o.h ?? 0.15) * (s ? 0.82 : 1);
        k.add(box(w * 0.84, h, d * 0.72, 0.06), o.wall ?? C.lattice, [0, y + h / 2, 0]);
        if (o.cols !== false) { const nx = Math.max(2, Math.round(w / (o.lite ? 0.2 : 0.13)) + 1); for (let i = 0; i < nx; i++) for (const sz of [-1, 1]) k.add(cyl(0.015, 0.017, h, o.lite ? 4 : 6), C.pillar, [-w * 0.45 + (i * w * 0.9) / (nx - 1), y + h / 2, sz * d * 0.42]); }
        k.add(box(w * 0.96, 0.03, d * 0.9, 0.3), C.bracket, [0, y + h + 0.015, 0]);
        y += h + 0.03;
        const rh = (o.rh ?? Math.min(w, d) * 0.5) * (last ? 1 : 0.6), r = roof(w + 2 * ov, d + 2 * ov, rh, { kind: o.kind, tMax: last ? 1 : 0.45, color: o.roof, tiles: o.tiles, lift: o.lift, lite: o.lite });
        k.push(xf(r, [0, y, 0]));
        if (!last) { const u = r.userData; k.add(box(u.topW, 0.02, u.topD, 0.3), C.under, [0, y + u.topY - 0.012, 0]); y += u.topY - 0.01; w *= 0.74; d *= 0.74; }
      }
      const g = k.geo(); g.userData.top = y; return g;
    };
    // a courtyard house: plaster walls on a low base, a gable roof, the gable ends filled under the roof's curve.
    // o.ruin: the walls of one that burned or fell (lower, blackened, open to the sky, charred beams across)
    const house = (w, d, h, o = {}) => {
      const k = kit(), wall = o.wall ?? C.plaster, ov = 0.035, rh = o.rh ?? d * 0.5, box = o.lite ? rb : rbox;
      k.add(box(w + 0.02, 0.025, d + 0.02, 0.3), C.base, [0, 0.0125, 0]);
      if (o.ruin) {
        const hw = h * 0.62, t = 0.016, sc = shade(wall, -0.45);
        for (const [x, z, lx, lz] of [[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w * 0.55, t], [-w / 2 + t / 2, 0, t, d], [w / 2 - t / 2, 0, t, d]]) k.add(new T.BoxGeometry(lx, hw * (0.6 + hash(x, z, w) * 0.4), lz), sc, [x - (lz === t && z > 0 ? w * 0.2 : 0), 0.025 + hw * 0.35, z]);
        k.add(new T.BoxGeometry(w * 0.9, 0.01, d * 0.9), C.char, [0, 0.03, 0]);
        k.add(new T.BoxGeometry(w * 1.02, 0.014, 0.018), C.char, [0, 0.025 + hw * 0.8, 0.02], [0.3, 0, 0.12]);
        k.add(new T.BoxGeometry(0.018, 0.014, d), C.char, [w * 0.2, 0.025 + hw * 0.6, 0], [0.25, 0, 0]);
        return k.geo();
      }
      k.add(box(w, h, d, 0.1), wall, [0, 0.025 + h / 2, 0]);
      k.add(box(0.05, h * 0.62, 0.012, 0.2), C.lattice, [o.door ?? 0, 0.025 + h * 0.31, d / 2 + 0.002]);
      for (const sx of [-0.3, 0.3]) if (w > 0.3) k.add(box(0.06, h * 0.3, 0.01, 0.2), C.dark, [sx * w, 0.025 + h * 0.55, d / 2 + 0.002]);
      // gable ends: a fan under the roof curve (b = the roof's half depth, the wall stands at d / 2)
      const b = d / 2 + ov, pts = [];
      for (let i = 0; i <= 8; i++) { const z = -d / 2 + (d * i) / 8, t = 1 - Math.abs(z) / b; pts.push([z, prof(t, rh) - 0.008]); }
      const v = [];
      for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) { const x = (sx * w) / 2 * 0.999, y0 = 0.025 + h, p = pts[i], q = pts[i + 1]; const tri = [[x, y0, 0], [x, y0 + p[1], p[0]], [x, y0 + q[1], q[0]]]; if (sx < 0) tri.reverse(); for (const t of tri) v.push(...t); }
      // the fan's base row from the wall top: close the gaps at both ends
      for (const sx of [-1, 1]) { const x = (sx * w) / 2 * 0.999, y0 = 0.025 + h, tri = [[x, y0, 0], [x, y0, -d / 2], [x, y0 + pts[0][1], pts[0][0]], [x, y0, 0], [x, y0 + pts[8][1], pts[8][0]], [x, y0, d / 2]]; if (sx < 0) { tri.reverse(); } for (const t of tri) v.push(...t); }
      k.push(paint(tris(v), wall));
      k.push(xf(roof(w + 0.08, d + 2 * ov, rh, { kind: 'gable', color: o.roof ?? C.roof, tiles: o.tiles ?? 0.06, nt: 4, under: 0x52321a, noUnder: true, lite: o.lite }), [0, 0.025 + h, 0]));
      return k.geo();
    };
    // a round Han granary on stilts, conical roof
    const granary = (r, o = {}) => {
      const k = kit(), sgm = o.lite ? 7 : 12;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; k.add(cyl(0.012, 0.012, 0.05, 5), C.wood, [Math.cos(a) * r * 0.7, 0.025, Math.sin(a) * r * 0.7]); }
      k.add(cyl(r, r * 0.94, 0.15, sgm), o.burnt ? shade(C.plaster2, -0.5) : C.plaster2, [0, 0.125, 0]);
      if (!o.burnt) k.add(lathe([[0, 0.2], [r * 0.9, 0.2], [r * 1.25, 0.18], [r * 1.25, 0.19], [r * 0.9, 0.24], [r * 0.2, 0.33], [0, 0.34]], sgm), o.roof ?? C.roof, [0, 0, 0]);
      return k.geo();
    };
    // trees: a lumpy crown or a stack of rounded cones on a trunk (burnt: a charred snag)
    const treeGeo = (kind, seed = 1, lo = false, o = {}) => {
      const k = kit(), rs = (n) => hash(seed, n, 3.1), dt = lo ? 0 : 1;
      if (o.burnt) { k.add(cyl(0.012, 0.024, 0.22, 5), C.char, [0, 0.11, 0]); k.add(cyl(0.005, 0.009, 0.1, 4), C.char, [0.03, 0.2, 0], [0, 0, -0.7]); return k.geo(); }
      if (kind === 'pine') {
        k.add(cyl(0.018, 0.026, 0.14, 5), C.trunk, [0, 0.07, 0]);
        for (let i = 0; i < 3; i++) k.add(lathe([[0, 0.06], [0.1 - i * 0.025, 0.05], [0.11 - i * 0.025, 0.07], [0, 0.2 - i * 0.02]], lo ? 6 : 8), shade(C.pine, i * 0.06), [0, 0.06 + i * 0.09, 0]);
      } else {
        k.add(cyl(0.02, 0.03, 0.2, 5), C.trunk, [0, 0.1, 0]);
        const c = o.leaf ?? C.leaf[Math.floor(rs(1) * C.leaf.length)];
        k.push(xf(paint(blob(0.13, seed, dt), c), [0, 0.29, 0]));
        k.push(xf(paint(blob(0.095, seed + 1, dt), shade(c, 0.08)), [0.07 * (rs(2) - 0.3), 0.36, 0.06 * (rs(3) - 0.5)]));
        k.push(xf(paint(blob(0.09, seed + 2, dt), shade(c, -0.08)), [-0.07, 0.25, -0.05 * rs(4)]));
      }
      return k.geo();
    };
    // an orchard tree: a short trunk, one round crown (mulberry, jujube, peach)
    const orchardTree = (k, x, z, s, hex) => { k.add(cyl(0.01, 0.014, 0.06 * s, 4), C.trunk, [x, 0.03 * s, z]); k.push(xf(paint(blob(0.055 * s, x * 7 + z, 0), hex), [x, 0.085 * s, z], [0, 0, 0], [1, 0.8, 1])); };

    // ---------------------------------------------------------------- walls
    // rammed earth: a battered prism (wider at the foot), rounded top edges; runs along x, outside +z
    const wallPrism = (len, h, wb, wt) => {
      const sh = new T.Shape(), c = Math.min(0.025, wt * 0.2);
      sh.moveTo(-wb / 2, -0.3); sh.lineTo(wb / 2, -0.3); sh.lineTo(wt / 2, h - c); sh.quadraticCurveTo(wt / 2, h, wt / 2 - c, h); sh.lineTo(-wt / 2 + c, h); sh.quadraticCurveTo(-wt / 2, h, -wt / 2, h - c); sh.lineTo(-wb / 2, -0.3);
      return new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 2 }).rotateY(-Math.PI / 2).translate(len / 2, 0, 0);
    };
    // by lũy: the wall's height, its foot, its earth; bastions (马面) a side; timber lacing in the earth (纴木); wooden
    // war pavilions (楼橹) on the bastions of a great city
    const LV = (lv) => ({ H: [0.2, 0.3, 0.42, 0.52, 0.62][lv], wb: [0.18, 0.3, 0.36, 0.42, 0.48][lv], col: [C.wood, C.earth, C.earth, C.rammed, C.rammed2][lv], bastions: [0, 0, 0, 2, 4][lv], lacing: lv >= 3 });
    // the face of a battered wall at height y (distance of the outer face from the wall's axis)
    const faceZ = (y, H, wb, wt) => wb / 2 - ((wb - wt) / 2) * ((y + 0.3) / (H + 0.3));
    // one run of wall along x from x0 to x1 at z = zc, outside +z: walkway, crenellated parapet outside, low one inside
    const wallRun = (k, x0, x1, zc, lv, o = {}) => {
      const { H, wb, col, lacing } = LV(lv), wt = wb * 0.6, len = x1 - x0, cx = (x0 + x1) / 2, box = o.lite ? rb : rbox;
      if (len < 0.02) return;
      if (lv === 0) { // a palisade of sharpened logs on a low bank
        k.add(box(len, 0.08, 0.26, 0.4), C.earth, [cx, 0.02, zc]);
        const n = Math.max(2, Math.round(len / (o.lite ? 0.1 : 0.075)));
        for (let i = 0; i < n; i++) { const x = x0 + ((i + 0.5) * len) / n, h = 0.22 + hash(x, zc, 1) * 0.06; k.add(cyl(0.03, 0.032, h, o.lite ? 4 : 5, true), shade(C.wood, (hash(x, 2, zc) - 0.5) * 0.2), [x, 0.06 + h / 2, zc]); k.add(cone(0.03, 0.05, o.lite ? 4 : 5), shade(C.wood, 0.1), [x, 0.06 + h + 0.025, zc]); }
        return;
      }
      k.add(wallPrism(len, H, wb, wt), col, [cx, 0, zc]);
      // the courses of rammed earth on both faces, following the batter; on a great wall they are timber lacing, the beam
      // ends showing on the outer face
      for (const f of lacing ? [0.26, 0.52, 0.78] : [0.3, 0.62]) for (const sgn of [-1, 1]) {
        const y = H * f, zf = faceZ(y, H, wb, wt), lc = lacing ? mix(C.timber, col, 0.35) : shade(col, -0.12);
        k.add(new T.BoxGeometry(len, lacing ? 0.012 : 0.014, 0.012), lc, [cx, y, zc + sgn * (zf + 0.002)], [sgn * Math.atan2((wb - wt) / 2, H + 0.3), 0, 0]);
        if (lacing && sgn > 0 && !o.lite) { const nb = Math.max(1, Math.floor(len / 0.16)); for (let i = 0; i < nb; i++) k.add(new T.BoxGeometry(0.018, 0.018, 0.02), C.timber, [x0 + ((i + 0.5) * len) / nb, y, zc + zf + 0.006]); }
      }
      k.add(box(len, 0.012, wt * 0.8, 0.3), shade(col, 0.14), [cx, H + 0.004, zc]);
      if (lv >= 3) k.add(box(len, 0.07, wb + 0.05, 0.25), C.plinth, [cx, 0.025, zc]);
      const hp = 0.045, pc = shade(col, -0.05);
      k.add(box(len, hp, 0.04, 0.25), pc, [cx, H + hp / 2, zc + wt / 2 - 0.02]);
      const n = Math.max(1, Math.floor(len / 0.13));
      for (let i = 0; i < n; i++) k.add(new T.BoxGeometry(0.065, 0.05, 0.045), pc, [x0 + ((i + 0.5) * len) / n, H + hp + 0.024, zc + wt / 2 - 0.02]);
      k.add(box(len, 0.028, 0.028, 0.3), pc, [cx, H + 0.014, zc - wt / 2 + 0.014]);
    };
    // a breach: the wall's earth slumped outward in a mound, a few beams in it
    const rubble = (k, x, zc, lv, w, seed) => {
      const { H, wb, col } = LV(lv);
      for (let i = 0; i < 3; i++) k.push(xf(paint(blob(w * (0.42 - i * 0.08), seed + i, lite ? 0 : 1), shade(col, -0.06 - i * 0.05)), [x + (i - 1) * w * 0.3, 0.0, zc + wb * (0.1 + i * 0.25)], [0, i, 0], [1.1, (H / w) * (0.55 - i * 0.12), 1.2]));
      k.add(new T.BoxGeometry(w * 0.9, 0.014, 0.016), C.timber, [x, H * 0.25, zc + wb * 0.3], [0.4, 0.6, 0.3]);
      k.add(new T.BoxGeometry(0.016, 0.014, w * 0.8), C.timber, [x + w * 0.15, H * 0.2, zc + wb * 0.5], [0.3, 0, 0.5]);
    };
    // a gatehouse across the wall (x = 0, z = zc) with the passage and the gate tower on top (o.burnt: its tower burned)
    const gate = (k, zc, lv, gw, o = {}) => {
      const { H, wb, col } = LV(lv), gd = wb * 1.35, box = o.lite ? rb : rbox;
      if (lv === 0) {
        for (const sx of [-1, 1]) { k.add(cyl(0.045, 0.05, 0.42, 7), C.wood, [sx * 0.16, 0.21, zc]); k.add(box(0.16, 0.02, 0.16, 0.3), C.wood, [sx * 0.16, 0.36, zc]); if (!o.burnt) k.push(xf(roof(0.2, 0.2, 0.08, { color: C.thatch, tiles: 0, lift: 0.02, lite: o.lite }), [sx * 0.16, 0.37, zc])); }
        k.add(box(0.42, 0.04, 0.05, 0.3), C.wood, [0, 0.33, zc]);
        return;
      }
      k.add(box(gw, H + 0.33, gd, 0.08), shade(col, -0.03), [0, (H + 0.03 - 0.3) / 2, zc]);
      // the passage: flat-topped under timber beams (Han gates have no brick arch), doors ajar inside
      const aw = 0.16, ah = H * 0.6;
      k.add(new T.BoxGeometry(aw, ah, gd + 0.02), C.dark, [0, ah / 2, zc]);
      for (const sz of [-1, 1]) { k.add(box(aw + 0.06, 0.035, 0.03, 0.3), C.wood, [0, ah + 0.017, zc + sz * (gd / 2 + 0.005)]); for (const sx of [-1, 1]) k.add(box(0.025, ah, 0.03, 0.3), C.wood, [sx * (aw / 2 + 0.005), ah / 2, zc + sz * (gd / 2 + 0.005)]); }
      for (const sx of [-1, 1]) k.add(box(0.012, ah * 0.9, aw * 0.5, 0.3), o.burnt ? C.char : C.lattice, [sx * aw * 0.42, ah * 0.45, zc + gd / 2 - 0.03], [0, sx * (o.burnt ? 1.1 : 0.5), 0]);
      const hp = 0.045, n = Math.max(2, Math.floor(gw / 0.13));
      for (let i = 0; i < n; i++) k.add(new T.BoxGeometry(0.065, 0.05, 0.045), shade(col, -0.05), [-gw / 2 + ((i + 0.5) * gw) / n, H + 0.03 + hp / 2, zc + gd / 2 - 0.02]);
      const tw = gw * 0.78, td = gd * 0.72;
      const tower = lv === 1 ? pavilion({ w: tw * 0.8, d: td * 0.8, h: 0.13, rh: 0.1, roof: C.thatch, tiles: 0, wall: C.wood, cols: false, lift: 0.02, lite: o.lite, burnt: o.burnt })
        : pavilion({ w: tw, d: td, h: 0.15, storeys: lv >= 3 ? 2 : 1, rh: 0.16 + lv * 0.01, base: 0.03, tiles: 0.045, lite: o.lite, burnt: o.burnt, roof: o.roof });
      k.push(xf(tower, [0, H + 0.03, zc]));
    };
    // a khuyết (阙): the pair of towers before a gate; a governor has the mother-and-child kind (二出阙): a tall tower with a
    // lower one on its outer side, each with a small hip roof over a bracket band (after the Gao Yi que, AD 209)
    const que = (o = {}) => {
      const k = kit(), box = o.lite ? rb : rbox;
      k.add(box(0.1, 0.03, 0.08, 0.3), C.base, [0, 0.015, 0]);
      k.add(box(0.07, 0.24, 0.055, 0.12), C.plaster, [0, 0.15, 0]); k.add(box(0.085, 0.025, 0.07, 0.3), C.bracket, [0, 0.28, 0]);
      k.push(xf(roof(0.12, 0.1, 0.05, { tiles: 0, lite: o.lite }), [0, 0.292, 0]));
      k.add(box(0.05, 0.14, 0.04, 0.12), C.plaster, [0.06, 0.1, 0]); k.add(box(0.06, 0.02, 0.05, 0.3), C.bracket, [0.06, 0.18, 0]);
      k.push(xf(roof(0.08, 0.07, 0.035, { tiles: 0, lite: o.lite }), [0.06, 0.19, 0]));
      return k.geo();
    };
    // a corner tower (o.broken: its top fallen, no pavilion; o.burnt: its pavilion burned)
    const cornerTower = (k, x, z, lv, o = {}) => {
      const { H, wb, col } = LV(lv), cw = wb * 1.9, box = o.lite ? rb : rbox;
      if (lv === 0) { // a watch platform on four posts
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.02, 0.022, 0.5, 5), C.wood, [x + a * 0.1, 0.25, z + b * 0.1]);
        k.add(box(0.28, 0.03, 0.28, 0.3), C.wood, [x, 0.5, z]); if (!o.broken) k.push(xf(roof(0.3, 0.3, 0.12, { color: o.burnt ? C.char : C.thatch, tiles: 0, lift: 0.02, lite: o.lite }), [x, 0.62, z]));
        return;
      }
      const top = o.broken ? H * 0.62 : H + 0.06;
      k.add(box(cw, top + 0.3, cw, 0.1), shade(col, -0.04), [x, (top - 0.3) / 2, z]);
      if (lv >= 3) k.add(box(cw + 0.05, 0.07, cw + 0.05, 0.25), C.plinth, [x, 0.025, z]);
      if (o.broken) { rubble(k, x + 0.08, z + 0.1, lv, cw * 0.8, x * 3 + z); return; }
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i < 3; i++) { const u = (i - 1) * cw * 0.32; k.add(new T.BoxGeometry(a ? 0.045 : 0.07, 0.05, a ? 0.07 : 0.045), shade(col, -0.06), [x + a * (cw / 2 - 0.02) + (a ? 0 : u), H + 0.06 + 0.025, z + b * (cw / 2 - 0.02) + (b ? 0 : u)]); }
      if (lv >= 2) k.push(xf(pavilion({ w: cw * 0.62, d: cw * 0.62, h: 0.12, rh: 0.13, storeys: lv >= 4 ? 2 : 1, tiles: 0.045, lite: o.lite, burnt: o.burnt, roof: o.roof }), [x, H + 0.06, z]));
    };
    // a bastion (马面) jutting from the wall at x, its top at the walkway; on a great city a timber war pavilion on it
    const bastion = (k, x, zc, lv, o = {}) => {
      const { H, wb, col } = LV(lv), box = o.lite ? rb : rbox, bz = zc + wb / 2 + 0.1;
      k.add(box(0.26, H + 0.3, 0.32, 0.1), shade(col, -0.04), [x, (H - 0.3) / 2, zc + wb / 2 - 0.02]);
      for (let i = 0; i < 2; i++) k.add(new T.BoxGeometry(0.07, 0.05, 0.045), shade(col, -0.06), [x - 0.06 + i * 0.12, H + 0.025, bz + 0.015]);
      if (lv >= 4 && !o.broken) k.push(xf(pavilion({ w: 0.2, d: 0.16, h: 0.09, rh: 0.08, ov: 0.04, wall: C.wood, tiles: 0, cols: false, lite: o.lite, burnt: o.burnt, roof: o.roof }), [x, H, zc + wb / 2 + 0.02]));
    };

    // ---------------------------------------------------------------- the town: a raised apron of fields, walls by level (lũy 0–4), a Han city inside
    // Levels at a glance: 0 a log palisade round thatched farms; 1 a low earth wall, thatch and tile; 2 a higher wall, gate
    // pavilions, the khuyết pair, a watchtower; 3 a moat, bastions, two-storey gates, timber-laced earth; 4 the great city:
    // the tallest wall, three bastions a side with war pavilions, an inner wall round the governor's hall.
    const townCache = {};
    HM.town = function (t) {
      const L = t.size || 4.6, lv = Math.max(0, Math.min(4, t.level ?? 1)), R = L / 2, dq = HMS.damageStep(t.damage), burnt = !!t.burnt, seed = t.seed || 1;
      const key = L + ':' + lv + ':' + seed + (t.open ? ':open' : '') + ':' + dq + (burnt ? ':burnt' : '');
      if (!townCache[key]) townCache[key] = buildTown(L, lv, R, seed, !!t.open, dq, burnt);
      const c = townCache[key], g = new T.Group();
      const m = new T.Mesh(c.geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
      if (c.water) { const w = new T.Mesh(c.water, waterMat); w.receiveShadow = true; g.add(w); }
      let fx = null;
      if (burnt && c.fires.length) { fx = new T.Group(); fx.add(HM.fire(c.fires, 1), HM.smoke(c.smoke, 1)); g.add(fx); }
      g.userData = { L, H: LV(lv).H, flagAt: c.flagAt, shared: true, level: lv, damage: dq, burnt, gates: c.gates, fires: c.fires, smoke: c.smoke, apron: c.apron, fx };
      return g;
    };
    // open: the +z face without its wall and gate (a siege lays its own breachable runs there, HM.siegeWall)
    const buildTown = (L, lv, R, seed, open, dq, burnt) => {
      const k = kit(), { H, wb } = LV(lv), moat = lv >= 3, pad = moat ? 0.95 : 0.6, gw = 0.6 + lv * 0.05, box = lite ? rb : rbox;
      let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const r2 = lcg(seed * 31 + 7), rd = lcg(seed * 97 + 13 + dq * 1000 + (burnt ? 500 : 0)); // fields; damage (their own streams: the town's layout stays)
      const fires = [], smoke = [], ruinP = burnt ? 0.4 + dq * 0.3 : dq * 0.45, charP = burnt ? 0.75 : 0;
      const roofOf = (base) => (burnt && rd() < charP ? (rd() < 0.5 ? C.char : shade(base, -0.45)) : base);
      const thatchP = [1, 0.5, 0.15, 0.06, 0][lv];
      // the apron: the town's own ground, a belt of fields beyond the walls (or the moat), its edge sloping away like a
      // terrace so that on lower ground it reads as a bank and never as a box; roads out of the gates
      const belt = lite ? 0.55 : 0.8, A = R + pad + belt, slope = 1.3, apronPts = [];
      {
        const n = 10, pos = [], ring = (a, y) => { const out = []; for (let c = 0; c < 4; c++) for (let i = 0; i <= n; i++) { const t = c * Math.PI / 2 + (i / n) * Math.PI / 2, rr = 0.55 + (a - A) * 0.6, cx = (c === 0 || c === 3 ? 1 : -1) * (a - rr), cz = (c < 2 ? 1 : -1) * (a - rr); out.push([cx + Math.cos(t) * rr, y, cz + Math.sin(t) * rr]); } return out; };
        const top = ring(A, 0.03), bot = ring(A + slope, -1.25);
        for (let i = 0; i < top.length; i++) { const j = (i + 1) % top.length; pos.push(0, 0.03, 0, ...top[j], ...top[i]); pos.push(...top[i], ...top[j], ...bot[i], ...top[j], ...bot[j], ...bot[i]); }
        const g = tris(pos), col = new Float32Array(g.attributes.position.count * 3), cT = lin(C.ground), cS = lin(0x5a5226);
        for (let i = 0; i < g.attributes.position.count; i++) { const c = g.attributes.position.getY(i) > 0.02 ? cT : cS; col.set([c.r, c.g, c.b], i * 3); }
        g.setAttribute('color', new T.BufferAttribute(col, 3)); k.push(g);
        for (const p of top) apronPts.push([p[0], p[2]]);
      }
      k.add(box(L - wb * 0.3, 0.03, L - wb * 0.3, 0.3), C.yard, [0, 0.03, 0]);
      const inner = R - wb / 2 - 0.08;
      k.add(box(0.26, 0.012, 2 * inner, 0.3), C.road, [0, 0.05, 0.1]);
      k.add(box(2 * inner, 0.012, 0.26, 0.3), C.road, [0, 0.05, 0]);
      // the fields: plots along each side of the belt (not on a siege's open face), cut by the road out of the gate,
      // orchards in two of the corners, a farmstead or two
      const f0 = R + wb / 2 + (moat ? 0.62 : 0.24), f1 = A - 0.06, gates = [];
      for (let side = 0; side < 4; side++) {
        const rot = (side * Math.PI) / 2, fk = kit();
        gates.push([Math.sin(rot) * (R + wb / 2), Math.cos(rot) * (R + wb / 2), rot]);
        fk.add(new T.BoxGeometry(0.22, 0.012, f1 - (R + wb / 2) + 0.05), C.road, [0, 0.036, (R + wb / 2 + f1) / 2]);
        if (open && side === 0) { k.push(xf(fk.geo(), [0, 0, 0], [0, rot, 0])); continue; }
        let x = -f0 + 0.02;
        while (x < f0 - 0.06) {
          const w = 0.22 + r2() * 0.34, x1 = Math.min(f0 - 0.02, x + w), mid = (x + x1) / 2;
          if (Math.abs(mid) < 0.2 || (x < 0.14 && x1 > -0.14)) { x = Math.max(x1, 0.14) + 0.02; continue; }
          const deep = r2() < 0.45, zA = deep ? f0 : f0 + (f1 - f0) * (0.45 + r2() * 0.1), hex = C.field[Math.floor(r2() * C.field.length)];
          fk.add(new T.BoxGeometry(x1 - x - 0.03, 0.01, f1 - zA - 0.03), hex, [mid, 0.036, (zA + f1) / 2]);
          if (!lite && x1 - x > 0.3) for (let f = 1; f < 4; f++) fk.add(new T.BoxGeometry(x1 - x - 0.06, 0.004, 0.008), shade(hex, -0.18), [mid, 0.043, zA + ((f1 - zA) * f) / 4]);
          if (!deep && r2() < 0.7) { const hx = C.field[Math.floor(r2() * C.field.length)]; fk.add(new T.BoxGeometry(x1 - x - 0.03, 0.01, zA - f0 - 0.02), hx, [mid, 0.036, (f0 + zA) / 2]); }
          x = x1 + 0.015;
        }
        k.push(xf(fk.geo(), [0, 0, 0], [0, rot, 0]));
      }
      // orchards: two corners, rows of small round trees; the corners belong to no side's plots
      {
        const ok = kit(), corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].filter(([, sz]) => !(open && sz > 0));
        for (let c = 0; c < corners.length; c++) {
          const [sx, sz] = corners[c], cx = sx * (f0 + f1) / 2, cz = sz * (f0 + f1) / 2, span = (f1 - f0) * 0.9, hex = C.orchard[Math.floor(r2() * C.orchard.length)];
          if (c % 2 && r2() < 0.5) { // a farmstead in this corner instead
            ok.push(xf(house(0.24, 0.13, 0.07, { wall: C.plaster2, roof: C.thatch, tiles: 0, lite }), [cx, 0.035, cz], [0, r2() < 0.5 ? 0 : Math.PI / 2, 0]));
            ok.add(lathe([[0, 0], [0.04, 0], [0.042, 0.03], [0.025, 0.065], [0, 0.08]], 6), C.straw, [cx + 0.18, 0.035, cz + 0.05]);
            continue;
          }
          const nr = lite ? 3 : 4;
          for (let i = 0; i < nr; i++) for (let j = 0; j < nr; j++) orchardTree(ok, cx + ((i - (nr - 1) / 2) * span) / nr, cz + ((j - (nr - 1) / 2) * span) / nr, 0.9 + r2() * 0.25, burnt && r2() < 0.5 ? C.char : shade(hex, (r2() - 0.5) * 0.15));
        }
        k.push(ok.geo());
      }
      // walls: four sides, each two runs either side of its gate, corner towers; breaches split the runs
      const cw = lv === 0 ? 0.28 : wb * 1.9, br = HMS.breaches(seed, dq, open);
      const brokenTowers = new Set(), nBroken = dq >= 0.5 ? Math.round((dq - 0.25) * 4) : 0;
      while (brokenTowers.size < nBroken) brokenTowers.add(Math.floor(rd() * 4));
      const gateBurnt = (side) => burnt ? rd() < 0.7 : dq >= 0.75 && side === Math.floor(seed % 4);
      for (let side = 0; side < 4; side++) {
        const w = kit(), bare = open && side === 0, holes = br.filter((b) => b.side === side).map((b) => [b.at * R - b.w * R, b.at * R + b.w * R]);
        const run = (a, b) => { let x = a; for (const [h0, h1] of holes.filter(([h0, h1]) => h1 > a && h0 < b).sort((p, q) => p[0] - q[0])) { wallRun(w, x, Math.max(x, h0), R, lv, { lite }); rubble(w, (h0 + h1) / 2, R, lv, h1 - h0, seed + side); x = h1; } wallRun(w, x, b, R, lv, { lite }); };
        if (!bare) { run(-R + cw / 2 - 0.02, -gw / 2); run(gw / 2, R - cw / 2 + 0.02); }
        // bastions: two a side at the middle of each half, four on a great city
        const bx = LV(lv).bastions === 2 ? [-1, 1].map((q) => (q * (R + gw / 2)) / 2) : LV(lv).bastions === 4 ? [-0.74, -0.34, 0.34, 0.74].map((f) => Math.sign(f) * (gw / 2 + (R - gw / 2) * Math.abs(f))) : [];
        if (!bare) for (const x of bx) if (!holes.some(([h0, h1]) => x > h0 - 0.15 && x < h1 + 0.15)) bastion(w, x, R, lv, { lite, burnt: burnt && rd() < 0.5, roof: roofOf(C.roof) });
        if (!bare) gate(w, R, lv, gw, { lite, burnt: gateBurnt(side), roof: roofOf(C.roof) });
        if (moat) { w.add(box(0.34, 0.03, 0.62, 0.3), C.wood, [0, 0.045, R + wb / 2 + 0.42]); }
        k.push(xf(w.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
      }
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz], i) => cornerTower(k, sx * R, sz * R, lv, { lite, broken: brokenTowers.has(i), burnt: burnt && rd() < 0.6, roof: roofOf(C.roof) }));
      if (lv >= 2) for (const sx of [-1, 1]) k.push(xf(que({ lite }), [sx * (gw / 2 + 0.2), 0.03, R + wb / 2 + 0.1], [0, sx < 0 ? Math.PI : 0, 0])); // child tower on the outer side
      // the governor's compound, north of the centre, facing south down the main street (a great city: its own inner wall)
      const yz0 = -R + wb / 2 + 0.16, yz1 = -0.3, yx = 0.62, yc = (yz0 + yz1) / 2;
      k.add(box(2 * yx, 0.02, yz1 - yz0, 0.3), C.paving, [0, 0.055, yc]);
      const hallWall = lv >= 4 ? { h: 0.2, c: C.rammed2 } : { h: 0.1, c: 0x74170c };
      for (const [x0, x1, z0, z1] of [[-yx, yx, yz0, yz0], [-yx, -yx, yz0, yz1], [yx, yx, yz0, yz1], [-yx, -0.16, yz1, yz1], [0.16, yx, yz1, yz1]]) {
        const lx = Math.max(0.035, x1 - x0) + (lv >= 4 ? 0.03 : 0), lz = Math.max(0.035, z1 - z0) + (lv >= 4 ? 0.03 : 0);
        k.add(box(lx, hallWall.h, lz, 0.2), hallWall.c, [(x0 + x1) / 2, 0.05 + hallWall.h / 2, (z0 + z1) / 2]); k.add(box(lx + 0.02, 0.018, lz + 0.02, 0.3), roofOf(C.roof), [(x0 + x1) / 2, 0.057 + hallWall.h, (z0 + z1) / 2]);
      }
      if (lv >= 4) for (const sx of [-1, 1]) k.push(xf(pavilion({ w: 0.14, d: 0.14, h: 0.08, rh: 0.08, ov: 0.04, tiles: 0, lite }), [sx * yx, 0.25, yz1]));
      k.push(xf(pavilion({ w: 0.32, d: 0.14, h: 0.1, rh: 0.09, tiles: 0.04, lite, roof: roofOf(C.roof) }), [0, 0.05, yz1]));
      const hallZ = yc - 0.12, flagAt = [0, 0.06, yz1 - 0.2], hallBurnt = burnt && dq >= 0.5;
      k.push(xf(pavilion({ w: 0.78, d: 0.4, h: 0.17, rh: 0.2, base: 0.06, storeys: 1, tiles: 0.045, lite, burnt: hallBurnt, roof: roofOf(C.roof) }), [0, 0.05, hallZ]));
      if (hallBurnt) { fires.push([0.1, 0.12, hallZ]); smoke.push([0, 0.2, hallZ]); }
      if (lv >= 2) k.push(xf(pavilion({ w: 0.5, d: 0.22, h: 0.13, rh: 0.12, tiles: 0.045, lite, roof: roofOf(C.roof) }), [0, 0.05, yz0 + 0.18]));
      for (const sx of [-1, 1]) k.push(xf(house(0.36, 0.16, 0.09, { wall: C.plaster2, lite, roof: roofOf(C.roof) }), [sx * (yx - 0.14), 0.05, yc + 0.02], [0, Math.PI / 2, 0]));
      // the watchtower at the crossroads (square, storeys shrinking, deep eaves), on a low rammed-earth base
      if (lv >= 1) {
        const tb = 0.36, th2 = 0.08, st = (lv >= 3 ? 4 : 3) - (dq >= 0.75 ? 2 : 0);
        k.add(box(tb, th2, tb, 0.15), C.earth, [0, 0.05 + th2 / 2, 0]);
        k.push(xf(pavilion({ w: tb * 0.7, d: tb * 0.7, h: 0.12, rh: 0.1, storeys: st, ov: 0.08, tiles: 0.04, lite, roof: roofOf(lv === 1 ? C.thatch : C.roof), burnt: burnt && dq >= 0.75 }), [0, 0.05 + th2, 0]));
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
          k.add(box(cwid, 0.015, cwid, 0.3), C.paving, [cx, 0.052, cz]);
          const aw = [0x7a0e0b, 0x0d2952, 0xa4520b, 0x294611, 0x7a0e0b, 0x0d2952];
          for (let i = 0; i < 6; i++) { const x = cx + ((i % 3) - 1) * 0.16, z = cz + (Math.floor(i / 3) - 0.5) * 0.24; if (burnt && rd() < 0.5) { k.add(new T.BoxGeometry(0.12, 0.01, 0.09), C.char, [x, 0.062, z]); continue; } for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.006, 0.006, 0.08, 4), C.wood, [x + a * 0.055, 0.1, z + b * 0.04]); k.add(box(0.13, 0.012, 0.1, 0.3), aw[i], [x, 0.145, z], [0.18, 0, 0]); k.add(box(0.08, 0.03, 0.05, 0.3), [C.straw, 0x411a0b, C.cream][i % 3], [x, 0.07, z]); }
          continue;
        }
        if (!granaries && cx > 0 && cz < 0) { granaries = true; for (let i = 0; i < 3; i++) { const gb = burnt && rd() < 0.5; k.push(xf(granary(0.085, { lite, burnt: gb, roof: lv === 0 ? C.thatch : C.roof }), [cx + (i - 1) * 0.17, 0.05, cz])); if (gb) { fires.push([cx + (i - 1) * 0.17, 0.2, cz]); if (smoke.length < 5) smoke.push([cx + (i - 1) * 0.17, 0.25, cz]); } } trees.push([cx, cz + 0.2]); continue; }
        // a courtyard compound: low wall with its gate to the south, a main house north, two wings, a yard
        const rich = rnd() < 0.25, wallC = rnd() < 0.3 ? C.plaster2 : C.plaster;
        const roofC = r2() < thatchP ? C.thatch : C.roof, tl = roofC === C.thatch ? 0 : 0.06, ruin = () => rd() < ruinP;
        k.add(box(cwid, 0.012, cwid, 0.3), C.yard, [cx, 0.052, cz]);
        for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0], [x0, x0, z0, z1], [x1, x1, z0, z1], [x0, cx - 0.05, z1, z1], [cx + 0.05, x1, z1, z1]]) {
          const lx = Math.max(0.025, a1 - a0), lz = Math.max(0.025, b1 - b0);
          k.add(box(lx, 0.06, lz, 0.25), wallC, [(a0 + a1) / 2, 0.08, (b0 + b1) / 2]); k.add(box(lx + 0.012, 0.012, lz + 0.012, 0.3), roofC === C.thatch ? shade(C.thatch, -0.1) : 0x525760, [(a0 + a1) / 2, 0.114, (b0 + b1) / 2]);
        }
        const mainRuin = ruin();
        k.push(xf(house(cwid * 0.74, 0.17, 0.1 + rnd() * 0.03, { wall: wallC, roof: roofOf(roofC), tiles: tl, lite, ruin: mainRuin }), [cx, 0.05, z0 + 0.13]));
        if (mainRuin && burnt && fires.length < 9) { fires.push([cx, 0.1, z0 + 0.13]); if (smoke.length < 5) smoke.push([cx, 0.16, z0 + 0.13]); }
        if (rich) k.push(xf(pavilion({ w: 0.1, d: 0.1, h: 0.07, rh: 0.05, storeys: 3, ov: 0.04, wall: C.wood, cols: false, tiles: 0, lite, roof: roofOf(C.roof), burnt: mainRuin }), [cx + cwid * 0.28, 0.05, cz + cwid * 0.2]));
        for (const sx of [-1, 1]) if (rnd() < 0.85) k.push(xf(house(cwid * 0.42, 0.13, 0.085, { wall: wallC, roof: roofOf(roofC), tiles: tl, lite, ruin: ruin() }), [cx + sx * (cwid / 2 - 0.1), 0.05, cz + 0.06], [0, Math.PI / 2, 0]));
        if (rnd() < 0.55) trees.push([cx + (rnd() - 0.5) * 0.12, cz + 0.12]);
      }
      // trees inside (courtyards, the corners) and a few outside the walls
      for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) trees.push([sx * (inner - 0.12), sz * (inner - 0.12)]);
      for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, r = R + wb / 2 + (moat ? 0.6 : 0.28) + rnd() * 0.15, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < gw || Math.abs(z) < gw) continue; trees.push([Math.max(-R - pad + 0.12, Math.min(R + pad - 0.12, x)), Math.max(-R - pad + 0.12, Math.min(R + pad - 0.12, z))]); }
      trees.forEach(([x, z], i) => k.push(xf(treeGeo(i % 5 === 4 ? 'pine' : 'leaf', seed + i, lite, { burnt: burnt && rd() < 0.55 }), [x, 0.05, z], [0, rnd() * 6, 0], [0.9 + rnd() * 0.35, 0.9 + rnd() * 0.35, 0.9 + rnd() * 0.35])));
      // soot: dark patches where fire ran, round the burnt houses and across the market
      if (burnt) for (let i = 0; i < 9; i++) { const x = (rd() - 0.5) * 2 * inner, z = (rd() - 0.5) * 2 * inner; k.push(xf(paint(blob(0.16 + rd() * 0.14, i, 0), C.soot), [x, 0.058, z], [0, rd() * 3, 0], [1, 0.04, 0.8 + rd() * 0.5])); }
      // the moat: water in a ditch round the walls
      let water = null;
      if (moat) {
        const r0 = R + wb / 2 + 0.2, r1 = r0 + 0.32, parts = [];
        for (let side = 0; side < 4; side++) {
          const w = kit(); w.add(new T.BoxGeometry(2 * r1, 0.02, r1 - r0), 0xffffff, [0, 0.03, (r0 + r1) / 2]); parts.push(xf(w.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
          const b = kit(); b.add(box(2 * r1 + 0.06, 0.03, r1 - r0 + 0.06, 0.3), 0x271e11, [0, 0.019, (r0 + r1) / 2]); k.push(xf(b.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
        }
        water = BGU.mergeBufferGeometries(parts); water.deleteAttribute('color');
      }
      return { geo: k.geo(), water, flagAt, gates, fires, smoke, apron: A };
    };

    // ---------------------------------------------------------------- fire and smoke (a burnt town, a camp's fires): animated in the vertex shader
    // flames: three crossed tongues, white-gold at the root to a dark red tip, added to the light; each flickers on its own
    const flameGeo = (() => {
      const pos = [], col = [], c0 = lin(0xffd27a), c1 = lin(0xff6a10), c2 = lin(0x3a0800);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3, ca = Math.cos(a) * 0.5, sa = Math.sin(a) * 0.5;
        const P = [[-ca, 0, -sa], [ca, 0, sa], [ca * 0.5, 0.45, sa * 0.5], [-ca * 0.5, 0.45, -sa * 0.5], [0, 1, 0]];
        for (const [p, c] of [[P[0], c0], [P[1], c0], [P[2], c1], [P[0], c0], [P[2], c1], [P[3], c1], [P[3], c1], [P[2], c1], [P[4], c2]]) { pos.push(...p); col.push(c.r, c.g, c.b); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      return g;
    })();
    const flameMat = (() => {
      const m = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = U.uTime;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float ph = dot(instanceMatrix[3].xz, vec2(3.1, 5.7));
          #else
            float ph = 0.0;
          #endif
          float f = 0.78 + 0.16 * sin(uTime * 11.0 + ph) + 0.08 * sin(uTime * 23.0 + ph * 2.3);
          transformed.y *= f; transformed.x += transformed.y * 0.18 * sin(uTime * 6.0 + ph); transformed.z += transformed.y * 0.12 * cos(uTime * 5.0 + ph * 1.7);`);
      };
      m.customProgramCacheKey = () => 'hn-flame';
      m.onBeforeRender = tick;
      return m;
    })();
    // smoke: soft puffs that rise, drift down the wind (+x) and fade, a few a column at staggered phases; camera-facing
    const smokeMat = (() => {
      const m = new T.ShaderMaterial({
        uniforms: { uTime: U.uTime, uColor: { value: lin(0x5b5249) } }, transparent: true, depthWrite: false,
        vertexShader: `attribute float aPh; uniform float uTime; varying vec2 vQ; varying float vA;
          void main() {
            float t = fract(uTime * 0.07 + aPh), s = length(instanceMatrix[0].xyz) * length(modelMatrix[0].xyz);
            vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            c.xyz += vec3(0.55 * t * t + 0.05 * sin(aPh * 17.0 + t * 4.0), 1.6 * t, 0.06 * cos(aPh * 11.0 + t * 3.0)) * s;
            vec4 mv = viewMatrix * c; mv.xy += position.xy * s * (0.12 + 0.42 * t);
            gl_Position = projectionMatrix * mv; vQ = position.xy; vA = smoothstep(0.0, 0.12, t) * (1.0 - t);
          }`,
        fragmentShader: `uniform vec3 uColor; varying vec2 vQ; varying float vA;
          void main() { float d = length(vQ); gl_FragColor = vec4(uColor, smoothstep(1.0, 0.15, d) * vA * 0.5);
            #include <tonemapping_fragment>
            #include <encodings_fragment>
          }`,
      });
      m.onBeforeRender = tick;
      return m;
    })();
    const puff = new T.PlaneGeometry(2, 2);
    const unculled = (m) => { m.frustumCulled = false; return m; };
    // points [[x, y, z]…] in the parent's units, s the size (1: a town's)
    HM.fire = (pts, s = 1) => {
      const m = new T.InstancedMesh(flameGeo, flameMat, Math.max(1, pts.length)), m4 = new T.Matrix4();
      pts.forEach((p, i) => m.setMatrixAt(i, m4.makeScale(0.07 * s * (0.8 + hash(p[0], p[2], 1) * 0.5), 0.13 * s * (0.8 + hash(p[2], p[0], 2) * 0.6), 0.07 * s).setPosition(p[0], p[1], p[2])));
      m.count = pts.length; m.renderOrder = 7; return unculled(m);
    };
    HM.smoke = (pts, s = 1) => {
      const N = lite ? 3 : 5, g = new T.BufferGeometry(); g.setIndex(puff.index); g.setAttribute('position', puff.attributes.position);
      const ph = new Float32Array(Math.max(1, pts.length * N)); g.setAttribute('aPh', new T.InstancedBufferAttribute(ph, 1));
      const m = new T.InstancedMesh(g, smokeMat, Math.max(1, pts.length * N)), m4 = new T.Matrix4();
      pts.forEach((p, i) => { for (let j = 0; j < N; j++) { ph[i * N + j] = j / N + hash(p[0], p[2], 3) * 0.2; m.setMatrixAt(i * N + j, m4.makeScale(s, s, s).setPosition(p[0], p[1], p[2])); } });
      m.count = pts.length * N; m.renderOrder = 8; return unculled(m);
    };

    // ---------------------------------------------------------------- people (≈ 0.64 tall, facing +x, feet at y = 0; the right hand is +z)
    // Built upright in two kits: the legs, and everything from the hips up, which leans about the hips (a pose).
    const HIP = 0.15;
    const legs = (k, stride) => {
      for (const [z, s] of [[-0.036, 1], [0.036, -1]]) { const fx = s * stride; k.limb([fx, 0.04, z], [0, HIP, z], 0.025, C.cloth); k.add(rb(0.075, 0.035, 0.046, 0.35), C.boot, [fx + 0.012, 0.018, z]); }
    };
    const person = (k, fc, o = {}) => {
      const top = o.top ?? shade(fc, -0.18), y0 = o.y0 ?? 0, n = sg(10);
      if (!o.seated) k.add(lathe([[0, 0.13], [0.09, 0.13], [0.083, 0.17], [0.07, 0.29], [0, 0.29]], n), fc, [0, 0, 0], [0, 0, 0], [0.9, 1, 1.08]);
      k.add(lathe([[0, 0.27], [0.07, 0.27], [0.077, 0.33], [0.073, 0.4], [0.052, 0.445], [0, 0.45]], n), top, [0, y0, 0], [0, 0, 0], [0.86, 1, 1.2]);
      k.add(cyl(0.079, 0.079, 0.024, n), C.leather, [0, y0 + 0.295, 0], [0, 0, 0], [0.88, 1, 1.22]);
      k.add(sph(0.012, 5, 4), C.gilt, [0.068, y0 + 0.296, 0]); // the belt's hook
      for (const z of [-1, 1]) k.add(sph(0.036, sg(8), sg(6)), fc, [0, y0 + 0.415, z * 0.078]);
      k.add(sph(0.056, sg(12), sg(9)), C.skin, [0.004, y0 + 0.505, 0]);
    };
    const arm = (k, fc, y0, side, hand) => { const sh = [0, y0 + 0.41, side * 0.08], e = sh.map((v, i) => v + (hand[i] - v) * 0.78); k.limb(sh, e, 0.023, fc); k.add(sph(0.027, sg(8), sg(6)), C.skin, hand); };
    const helmet = (k, y0, hex, plume) => {
      k.add(lathe([[0, 0.498], [0.077, 0.494], [0.077, 0.5], [0.07, 0.506], [0.066, 0.524], [0.056, 0.556], [0.032, 0.58], [0, 0.585]], sg(10)), hex, [0, y0, 0]);
      if (plume) k.add(cone(0.018, 0.06, 6), plume, [0, y0 + 0.615, 0]);
    };
    // a pole with a blade: shaft from butt to tip, a steel leaf head, a red tassel under it (o.ji: the side blade of a halberd)
    const polearm = (k, butt, tip, o = {}) => {
      const d = [tip[0] - butt[0], tip[1] - butt[1], tip[2] - butt[2]], L = Math.hypot(...d), u = d.map((v) => v / L);
      k.limb(butt, tip, o.r ?? 0.008, C.wood, true);
      k.along(cone(0.02, o.head ?? 0.08, 4), C.steel, tip.map((v, i) => v + u[i] * 0.035), u, [1, 1, 0.45]);
      k.add(sph(0.018, 6, 4), C.red, tip.map((v, i) => v - u[i] * 0.03));
      if (o.ji) k.along(new T.BoxGeometry(0.05, 0.02, 0.008), C.steel, tip.map((v, i) => v - u[i] * 0.005 + (i === 0 ? 0.025 : 0)), [u[1], -u[0], 0]);
      if (o.pennant) { // a swallow-tailed pennant in the faction's colour just under the head, streaming back (and down off a couched lance)
        const a = tip.map((v, i) => v - u[i] * 0.06), b = tip.map((v, i) => v - u[i] * 0.19), w0 = [-1, -0.35, 0], dw = w0[0] * u[0] + w0[1] * u[1];
        let f = [w0[0] - u[0] * dw, w0[1] - u[1] * dw, 0]; const fl = Math.hypot(f[0], f[1]) || 1; f = f.map((v) => v / fl);
        const at = (p, d) => [p[0] + f[0] * d, p[1] + f[1] * d, p[2] + 0.003], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        const [g1, g2] = twoSided([...a, ...b, ...at(m, 0.075), ...a, ...at(m, 0.075), ...at(a, 0.15), ...b, ...at(b, 0.13), ...at(m, 0.075)]);
        k.push(paint(g1, o.pennant)); k.push(paint(g2, o.pennant));
      }
    };
    // the Han infantry shield (旁牌): tall, a little waisted, a painted face in the faction's colour, a pale lozenge, a gilt boss;
    // at `at`, its face turned to `yaw` (0: +x)
    const shield = (k, fc, at, yaw = 0, tilt = 0) => {
      const s = kit();
      s.add(rb(0.018, 0.28, 0.14, 0.25), 0x1c100a, [0, 0, 0]);
      s.add(new T.BoxGeometry(0.006, 0.25, 0.118), fc, [0.011, 0, 0]);
      s.add(new T.BoxGeometry(0.004, 0.05, 0.05), C.cream, [0.015, 0.01, 0], [Math.PI / 4, 0, 0]);
      s.add(sph(0.014, 6, 4), C.gilt, [0.017, 0.01, 0]);
      k.push(xf(s.geo(), at, [0, yaw, tilt]));
    };
    // a bow: its grip at `at`, limbs along ±y, bent toward +x, tilted by `tilt` about z; drawn to `draw` (a point) or strung straight
    const bow = (k, at, tilt = 0, draw = null, planeYaw = 0) => {
      const b = kit(), R0 = 0.19;
      b.add(new T.TorusGeometry(R0, 0.008, 4, sg(12), Math.PI * 0.86), C.wood, [-R0, 0, 0], [0, 0, -Math.PI * 0.43]);
      const tipX = -R0 + R0 * Math.cos(Math.PI * 0.43), tipY = R0 * Math.sin(Math.PI * 0.43);
      const g = b.geo(); xf(g, [0, 0, 0], [0, planeYaw, tilt]); xf(g, at); k.push(g);
      const T2 = (x, y) => { const c = Math.cos(tilt), s = Math.sin(tilt), px = x * c - y * s, py = x * s + y * c, cy = Math.cos(planeYaw), sy = Math.sin(planeYaw); return [at[0] + px * cy, at[1] + py, at[2] - px * sy]; };
      const t1 = T2(tipX, tipY), t2 = T2(tipX, -tipY);
      if (draw) { k.limb(t1, draw, 0.0025, C.cream, true); k.limb(t2, draw, 0.0025, C.cream, true); }
      else k.limb(t1, t2, 0.0025, C.cream, true);
    };
    const quiver = (k, at, lean = 0.18) => { k.limb([at[0] - 0.02, at[1] - 0.11, at[2]], [at[0] + 0.02, at[1] + 0.11, at[2]], 0.03, C.leather); k.add(cone(0.028, 0.05, 5), C.cream, [at[0] + 0.03, at[1] + 0.14, at[2]], [0, 0, lean]); };

    // the posed foot soldier: 'bo' (spear and shield), 'cung' (bow), 'thuy' (marine: halberd, scarf, round shield)
    const POSE = {
      stand: { stride: 0, lean: 0 },
      march: { stride: 0.06, lean: 0.07 },
      fight: { stride: 0.075, lean: 0.2 },
    };
    const geoFoot = (arm_, fid, pose) => {
      const k = kit(), u = kit(), fc = COLOR[fid], p = HMS.pose(pose), P0 = POSE[p];
      legs(k, P0.stride);
      person(u, fc, { top: arm_ === 'cung' ? shade(fc, 0.12) : undefined });
      if (arm_ === 'bo') {
        helmet(u, 0, C.iron, C.red);
        if (p === 'stand') {
          arm(u, fc, 0, 1, [0.06, 0.3, 0.09]); polearm(u, [0.055, 0.02, 0.09], [0.085, 1.0, 0.09]);
          arm(u, fc, 0, -1, [0.1, 0.32, -0.06]); shield(u, fc, [0.13, 0.28, -0.07]);
        } else if (p === 'march') { // spear sloped on the right shoulder, the shield on the left arm at the side
          arm(u, fc, 0, 1, [0.1, 0.3, 0.1]); polearm(u, [0.2, 0.22, 0.1], [-0.42, 0.95, 0.1]);
          arm(u, fc, 0, -1, [0.03, 0.29, -0.12]); shield(u, fc, [0.02, 0.28, -0.14], Math.PI / 2 + 0.25);
        } else { // spear levelled over the shield
          arm(u, fc, 0, 1, [0.0, 0.34, 0.08]); polearm(u, [-0.32, 0.26, 0.075], [0.72, 0.5, 0.075]);
          arm(u, fc, 0, -1, [0.14, 0.33, -0.05]); shield(u, fc, [0.17, 0.33, -0.04], 0, -0.05);
        }
      } else if (arm_ === 'cung') { // straw hat, bow, quiver on the back
        u.add(lathe([[0, 0.55], [0.135, 0.525], [0.135, 0.535], [0.03, 0.61], [0, 0.625]], sg(12)), C.straw, [0, 0, 0]);
        quiver(u, [-0.085, 0.4, 0.03]);
        if (p === 'stand') {
          arm(u, fc, 0, -1, [0.12, 0.3, -0.1]); bow(u, [0.13, 0.32, -0.1]);
          arm(u, fc, 0, 1, [0.04, 0.24, 0.09]);
        } else if (p === 'march') { // the bow across the back
          bow(u, [-0.1, 0.4, 0.0], 0.55, null, Math.PI / 2);
          arm(u, fc, 0, -1, [-0.04, 0.24, -0.1]); arm(u, fc, 0, 1, [0.08, 0.24, 0.1]);
        } else { // drawing, aimed up for a volley over the walls
          const grip = [0.25, 0.5, -0.05], hand = [0.02, 0.47, 0.03];
          arm(u, fc, 0, -1, grip); bow(u, grip, 0.45, hand, 0.25);
          arm(u, fc, 0, 1, hand); u.limb(hand, [0.34, 0.56, -0.07], 0.004, C.cream, true);
        }
      } else { // marines: scarf, halberd, round shield
        u.add(lathe([[0, 0.51], [0.066, 0.51], [0.063, 0.55], [0.04, 0.58], [0, 0.59]], sg(10)), 0x07111d, [0, 0, 0]); u.limb([-0.06, 0.55, 0], [-0.1, 0.49, 0], 0.012, 0x07111d);
        const [butt, tip, hand] = p === 'march' ? [[0.18, 0.2, 0.09], [-0.38, 0.85, 0.09], [0.1, 0.3, 0.1]] : p === 'fight' ? [[-0.3, 0.28, 0.075], [0.66, 0.48, 0.075], [0.0, 0.34, 0.08]] : [[0.055, 0.02, 0.09], [0.08, 0.84, 0.09], [0.06, 0.3, 0.09]];
        arm(u, fc, 0, 1, hand); polearm(u, butt, tip, { ji: true, head: 0.07 });
        const sp = p === 'march' ? [0.0, 0.3, -0.13] : p === 'fight' ? [0.16, 0.33, -0.05] : [0.13, 0.31, -0.05];
        arm(u, fc, 0, -1, [sp[0] - 0.03, sp[1], sp[2] + 0.005]);
        const face = p === 'march' ? Math.PI / 2 : 0, rs = kit();
        rs.add(cyl(0.095, 0.095, 0.022, sg(16)), 0x1a0d08, [0, 0, 0], [0, 0, Math.PI / 2]); rs.add(cyl(0.06, 0.06, 0.01, sg(16)), fc, [0.014, 0, 0], [0, 0, Math.PI / 2]); rs.add(sph(0.024, 8, 6), C.gilt, [0.02, 0, 0]);
        u.push(xf(rs.geo(), sp, [0, face, 0]));
      }
      k.push(xf(u.geo().translate(0, -HIP, 0), [0, HIP, 0], [0, 0, -P0.lean]));
      return k.geo();
    };
    // a horse (≈ 0.55 long, back at 0.42), facing +x; saddle cloth in the faction's colour; gait 'stand' | 'walk' | 'gallop'
    const horse = (k, coat, cloth, o = {}) => {
      const hair = o.hair ?? shade(coat, -0.45), gait = o.gait || 'walk', gal = gait === 'gallop', y = gal ? 0.035 : 0, ns = sg(10);
      const bk = kit(); // the body, which pitches a little at the gallop
      bk.seg([-0.1, 0.34, 0], [0.1, 0.34, 0], 0.088, coat); bk.add(sph(0.08, ns, sg(7)), coat, [0.12, 0.34, 0]); bk.add(sph(0.085, ns, sg(7)), coat, [-0.11, 0.35, 0]);
      const neck = gal ? [[0.13, 0.38, 0], [0.25, 0.49, 0], [0.26, 0.5, 0], [0.36, 0.43, 0]] : [[0.13, 0.38, 0], [0.22, 0.53, 0], [0.225, 0.55, 0], [0.31, 0.46, 0]];
      bk.limb(neck[0], neck[1], 0.045, coat); bk.limb(neck[2], neck[3], 0.034, coat); bk.add(sph(0.03, sg(8), sg(6)), shade(coat, -0.15), [neck[3][0] + 0.005, neck[3][1] - 0.005, 0]);
      for (const z of [-0.018, 0.018]) bk.add(cone(0.011, 0.04, 5), coat, [neck[1][0] - 0.005, neck[1][1] + 0.06, z]);
      bk.limb([0.1, 0.43, 0], [neck[1][0] - 0.02, neck[1][1] + 0.04, 0], 0.017, hair);
      bk.limb([-0.19, 0.38, 0], gal ? [-0.31, 0.33, 0] : [-0.25, 0.2, 0], 0.022, hair);
      bk.add(rb(0.15, 0.035, 0.17, 0.4), C.leather, [0, 0.43, 0]);
      bk.add(new T.CylinderGeometry(0.094, 0.1, 0.07, sg(14), 1, true), cloth, [0, 0.39, 0], [0, 0, 0], [1.05, 1, 1]);
      if (o.barding) { bk.add(new T.CylinderGeometry(0.1, 0.118, 0.15, sg(16), 1, true), cloth, [0.0, 0.3, 0], [0, 0, 0], [2.0, 1, 1]); bk.add(new T.TorusGeometry(0.118, 0.008, 4, sg(20)), C.gilt, [0, 0.226, 0], [Math.PI / 2, 0, 0], [2.0, 1, 1]); }
      k.push(xf(bk.geo(), [0, y, 0], [0, 0, gal ? 0.06 : 0]));
      // legs: [hip x, hoof x, z] straight, or two pieces bent at the knee at the gallop
      const L = gait === 'stand' ? [[0.12, 0.13, 0.045], [0.12, 0.13, -0.045], [-0.12, -0.13, 0.045], [-0.12, -0.13, -0.045]] : [[0.12, 0.19, 0.045], [0.12, 0.08, -0.045], [-0.12, -0.06, 0.045], [-0.12, -0.18, -0.045]];
      if (gal) {
        for (const [a, kn, f, z] of [[[0.13, 0.32], [0.25, 0.22], [0.33, 0.14], 0.045], [[0.13, 0.32], [0.22, 0.2], [0.17, 0.12], -0.045], [[-0.12, 0.32], [-0.22, 0.2], [-0.33, 0.1], 0.045], [[-0.12, 0.32], [-0.18, 0.19], [-0.27, 0.08], -0.045]]) {
          k.limb([a[0], a[1] + y, z], [kn[0], kn[1] + y, z], 0.021, coat); k.limb([kn[0], kn[1] + y, z], [f[0], f[1] + y, z], 0.017, coat); k.add(cyl(0.022, 0.026, 0.035, 6), 0x060403, [f[0], f[1] + y - 0.01, z]);
        }
      } else for (const [x0, x1, z] of L) { k.limb([x0, 0.3, z], [x1, 0.045, z], 0.02, coat); k.add(cyl(0.022, 0.026, 0.035, 6), 0x060403, [x1, 0.018, z]); }
      return y;
    };
    const rider = (k, fc, o = {}) => {
      const y0 = 0.17 + (o.lift || 0);
      for (const z of [-1, 1]) { k.limb([0, 0.45 + (o.lift || 0), z * 0.05], [0.06, 0.37 + (o.lift || 0), z * 0.095], 0.026, C.cloth); k.limb([0.06, 0.37 + (o.lift || 0), z * 0.095], [0.03, 0.27 + (o.lift || 0), z * 0.095], 0.022, C.cloth); k.add(rb(0.06, 0.03, 0.04, 0.35), C.boot, [0.045, 0.255 + (o.lift || 0), z * 0.095]); }
      k.add(lathe([[0, 0.38], [0.085, 0.38], [0.08, 0.44], [0, 0.44]], sg(10)), fc, [0, o.lift || 0, 0], [0, 0, 0], [1, 1, 1.25]);
      person(k, fc, { seated: true, y0 });
      helmet(k, y0, o.helm ?? C.iron, o.plume ?? C.red);
      if (o.cape) k.add(new T.CylinderGeometry(0.075, 0.13, 0.26, sg(10), 1, true, Math.PI * 1.15, Math.PI * 0.7), o.cape, [-0.02, y0 + 0.3, 0]);
      return y0;
    };
    const GAIT = { stand: 'stand', march: 'walk', fight: 'gallop' };
    const geoRider = (fid, pose) => {
      const k = kit(), fc = COLOR[fid], p = HMS.pose(pose), lift = horse(k, 0x411a09, fc, { gait: GAIT[p] });
      const u = kit(), y0 = rider(u, fc, { lift });
      if (p === 'fight') { // lance couched, leaning into the charge
        arm(u, fc, y0, 1, [0.06, y0 + 0.3, 0.1]); arm(u, fc, y0, -1, [0.12, y0 + 0.31, -0.03]);
        polearm(u, [-0.24, y0 + 0.28, 0.1], [0.74, y0 + 0.36, 0.1], { pennant: fc });
      } else if (p === 'march') {
        arm(u, fc, y0, 1, [0.08, y0 + 0.3, 0.1]); arm(u, fc, y0, -1, [0.12, y0 + 0.33, -0.03]);
        polearm(u, [0.02, y0 + 0.12, 0.1], [0.3, y0 + 0.95, 0.1], { pennant: fc });
      } else {
        arm(u, fc, y0, 1, [0.08, y0 + 0.31, 0.1]); arm(u, fc, y0, -1, [0.12, y0 + 0.33, -0.03]);
        polearm(u, [0.075, y0 + 0.02, 0.1], [0.085, y0 + 0.98, 0.1], { pennant: fc });
      }
      k.push(xf(u.geo().translate(0, -(0.4 + lift), 0), [0, 0.4 + lift, 0], [0, 0, p === 'fight' ? -0.16 : 0]));
      return k.geo();
    };
    // the general: a pale horse in barding, a cape, a gilt helmet with a red plume, a halberd (raised in the fight)
    const geoGeneral = (fid, pose) => {
      const k = kit(), fc = COLOR[fid], p = HMS.pose(pose), lift = horse(k, 0xd2c6af, fc, { hair: 0x7d7361, barding: true, gait: GAIT[p] });
      const u = kit(), y0 = rider(u, fc, { helm: C.gilt, plume: C.red, cape: shade(fc, -0.1), lift });
      arm(u, fc, y0, -1, [0.12, y0 + 0.33, -0.03]);
      if (p === 'fight') { arm(u, fc, y0, 1, [0.14, y0 + 0.5, 0.1]); polearm(u, [-0.22, y0 + 0.2, 0.1], [0.5, y0 + 0.95, 0.1], { ji: true, r: 0.009, head: 0.09 }); }
      else if (p === 'march') { arm(u, fc, y0, 1, [0.1, y0 + 0.32, 0.1]); polearm(u, [0.18, y0 + 0.15, 0.1], [-0.34, y0 + 0.9, 0.1], { ji: true, r: 0.009, head: 0.09 }); }
      else { arm(u, fc, y0, 1, [0.08, y0 + 0.32, 0.1]); polearm(u, [0.08, y0 + 0.02, 0.1], [0.08, y0 + 0.97, 0.1], { ji: true, r: 0.009, head: 0.09 }); }
      k.push(xf(u.geo().translate(0, -(0.4 + lift), 0), [0, 0.4 + lift, 0], [0, 0, p === 'fight' ? -0.12 : 0]));
      return xf(k.geo(), [0, 0, 0], [0, 0, 0], [1.3, 1.3, 1.3]);
    };
    // the standard-bearer: on foot at the general's shoulder, both hands on a tall pole with a gilt finial; the cloth hangs
    // from a spar at the top (the pivot, HM.banner, sits at BEARER.top)
    const BEARER = { top: 2.02, pole: [0.07, 0.07] };
    const geoBearer = (fid, pose) => {
      const k = kit(), u = kit(), fc = COLOR[fid], p = HMS.pose(pose), P0 = POSE[p === 'fight' ? 'march' : p], [px, pz] = BEARER.pole;
      legs(k, P0.stride);
      person(u, fc, { top: shade(fc, -0.3) });
      helmet(u, 0, C.iron, C.red);
      arm(u, fc, 0, 1, [px - 0.01, 0.45, pz]); arm(u, fc, 0, -1, [px, 0.3, pz - 0.02]);
      k.push(xf(u.geo().translate(0, -HIP, 0), [0, HIP, 0], [0, 0, -P0.lean * 0.5]));
      k.limb([px, 0.02, pz], [px, BEARER.top + 0.02, pz], 0.013, C.wood, true);
      k.add(sph(0.022, 8, 6), C.gilt, [px, BEARER.top + 0.03, pz]); k.add(cone(0.02, 0.1, 5), C.gilt, [px, BEARER.top + 0.1, pz]);
      k.add(cyl(0.028, 0.028, 0.03, 8), C.red, [px, BEARER.top - 0.04, pz]);
      return k.geo();
    };
    // a war junk (lóu chuán): curved hull, shields along the rails, a two-storey castle, a batten sail, oars, a flag at the
    // stern; an escort (o.escort) is a smaller covered boat (艨艟) with one low cabin, a sail and more oars
    const geoShip = (fid, o = {}) => {
      const k = kit(), fc = COLOR[fid], N = lite ? 12 : 18, Mn = lite ? 6 : 8, pos = [], col = [], idx = [], esc = !!o.escort;
      const hullC = lin(0x1d0d05), railC = lin(0x3d1e0c), band = lin(shade(fc, -0.35));
      const at = (i, j) => {
        const s = i / N, x = -0.78 + 1.66 * s, e = Math.abs(2 * s - 1), w = 0.23 * Math.pow(Math.max(0, 1 - Math.pow(e, s > 0.5 ? 2.2 : 3.2)), 0.55) + 0.02;
        const yt = 0.2 + 0.14 * Math.pow(e, 4) * (s > 0.5 ? 1.25 : 0.9), yb = 0.03 + 0.1 * Math.pow(e, 3), f = j / Mn * Math.PI;
        return [x, yt - (yt - yb) * Math.pow(Math.sin(f), 0.75), -w * Math.cos(f)];
      };
      for (let i = 0; i <= N; i++) for (let j = 0; j <= Mn; j++) { pos.push(...at(i, j)); const c = j === 0 || j === Mn ? railC : j === 1 || j === Mn - 1 ? band : hullC; col.push(c.r, c.g, c.b); }
      for (let i = 0; i < N; i++) for (let j = 0; j < Mn; j++) { const q = i * (Mn + 1) + j; idx.push(q, q + 1, q + Mn + 1, q + 1, q + Mn + 2, q + Mn + 1); }
      let hull = new T.BufferGeometry(); hull.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); hull.setAttribute('color', new T.Float32BufferAttribute(col, 3)); hull.setIndex(idx); hull.computeVertexNormals();
      if (hull.attributes.normal.getY(Math.floor(N / 2) * (Mn + 1) + Mn / 2) > 0) { for (let q = 0; q < idx.length; q += 3) { const t0 = idx[q]; idx[q] = idx[q + 1]; idx[q + 1] = t0; } hull.setIndex(idx); hull.computeVertexNormals(); }
      k.push(hull.toNonIndexed());
      // deck, following the hull's width
      const dv = [];
      for (let i = 0; i < N; i++) { const a = at(i, 0), b = at(i + 1, 0), a2 = at(i, Mn), b2 = at(i + 1, Mn), y = 0.19; dv.push(a[0], y, a[2], a2[0], y, a2[2], b[0], y, b[2], b[0], y, b[2], a2[0], y, a2[2], b2[0], y, b2[2]); }
      const deck = paint(tris(dv), 0x5c3416); if (deck.attributes.normal.getY(0) < 0) { const a2 = deck.attributes.position.array; for (let i = 0; i < a2.length; i += 9) for (let c = 0; c < 3; c++) { const t0 = a2[i + 3 + c]; a2[i + 3 + c] = a2[i + 6 + c]; a2[i + 6 + c] = t0; } deck.computeVertexNormals(); } k.push(deck);
      // painted eyes at the bow (the river boats' old custom)
      for (const sz of [-1, 1]) { const p = at(N - 2, sz < 0 ? 0 : Mn); k.add(sph(0.022, 6, 4), C.cream, [p[0], p[1] - 0.05, p[2] + sz * 0.012]); k.add(sph(0.011, 5, 3), C.dark, [p[0] + 0.006, p[1] - 0.05, p[2] + sz * 0.024]); }
      const i0 = Math.round((N * 3) / 18), i1 = Math.round((N * 14) / 18);
      for (let i = i0; i <= i1; i += 2) { const p = at(i, 0), q = at(i, Mn); k.add(rb(0.012, 0.07, 0.08, 0.3), i % 4 === 1 ? shade(fc, -0.25) : fc, [p[0], p[1] + 0.02, p[2] - 0.01]); k.add(rb(0.012, 0.07, 0.08, 0.3), i % 4 === 1 ? shade(fc, -0.25) : fc, [q[0], q[1] + 0.02, q[2] + 0.01]); }
      if (esc) { // a low cabin covered in hides
        k.add(rb(0.5, 0.1, 0.26, 0.15), C.hide, [-0.1, 0.24, 0]); k.push(xf(roof(0.56, 0.32, 0.08, { tiles: 0, color: shade(C.hide, -0.2), kind: 'gable', lite }), [-0.1, 0.29, 0]));
      } else {
        k.add(rb(0.46, 0.15, 0.3, 0.12), 0x411a0b, [-0.2, 0.265, 0]); k.add(rb(0.5, 0.02, 0.34, 0.3), C.bracket, [-0.2, 0.35, 0]);
        for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) k.add(new T.BoxGeometry(0.05, 0.035, 0.004), 0x0b0604, [-0.38 + i * 0.12, 0.28, sz * 0.152]);
        k.add(rb(0.3, 0.11, 0.22, 0.12), 0x52250f, [-0.24, 0.415, 0]);
        k.push(xf(roof(0.42, 0.32, 0.11, { tiles: 0.04, color: C.roof, lite }), [-0.24, 0.47, 0]));
        // the stern flagstaff (the pennant is cloth: HM.army hangs a banner on it)
        k.limb([-0.6, 0.3, 0], [-0.6, 1.02, 0], 0.008, C.wood, true); k.add(cone(0.014, 0.05, 5), C.gilt, [-0.6, 1.05, 0]);
      }
      const nOar = esc ? 7 : 5;
      for (let i = 0; i < nOar; i++) for (const z of [-1, 1]) { const p = at(Math.round(N * (esc ? 4 + i * 1.6 : 5 + i * 2) / 18), z < 0 ? 0 : Mn); k.limb([p[0], p[1] - 0.02, p[2]], [p[0] - 0.06, 0.0, p[2] + z * 0.2], 0.007, C.wood, true); k.add(new T.BoxGeometry(0.05, 0.004, 0.03), C.wood, [p[0] - 0.06, 0.0, p[2] + z * 0.21]); }
      const mastX = esc ? 0.18 : 0.3, top = esc ? 0.95 : 1.25;
      k.limb([mastX, 0.19, 0], [mastX, top, 0], 0.016, C.wood); k.add(sph(0.018, 6, 4), C.gilt, [mastX, top + 0.01, 0]);
      // the sail: slightly bellied, battens across, its cloth in the faction's colour between them (stripes a shade apart)
      const sw = esc ? 0.46 : 0.62, sh0 = esc ? 0.34 : 0.42, sh1 = esc ? 0.9 : 1.18, rows = 6, sk = kit();
      for (let i = 0; i < rows; i++) {
        const sv = [];
        for (let j = 0; j < 4; j++) {
          const P = (a, b) => { const y = sh0 + (sh1 - sh0) * (a / rows), wz = sw * (0.8 + 0.2 * (a / rows)) * (b / 4 - 0.5), bulge = 0.05 * Math.sin((b / 4) * Math.PI); return [0.02 + bulge, y, wz + sw * 0.25]; };
          const q = [P(i, j), P(i, j + 1), P(i + 1, j), P(i + 1, j + 1)]; sv.push(...q[0], ...q[2], ...q[1], ...q[1], ...q[2], ...q[3]);
        }
        const [s1, s2] = twoSided(sv), sc = mix(fc, C.cream, i % 2 ? 0.1 : 0.24); sk.push(paint(s1, sc)); sk.push(paint(s2, sc));
      }
      for (let i = 0; i <= rows; i++) { const y = sh0 + (sh1 - sh0) * (i / rows), wz = sw * (0.8 + 0.2 * (i / rows)); sk.add(rb(0.018, 0.016, wz + 0.04, 0.3), C.dark, [0.025, y, sw * 0.25]); }
      k.push(xf(sk.geo(), [mastX, 0, 0], [0, 0.75, 0]));
      k.limb([0.82, 0.3, 0], [0.98, 0.42, 0], 0.012, C.wood); k.add(cone(0.02, 0.07, 4), C.steel, [1.0, 0.44, 0], [0, 0, -1.0]); // the bowsprit's ram point
      const g = k.geo();
      return esc ? xf(g, [0, 0, 0], [0, 0, 0], [0.78, 0.78, 0.78]) : g;
    };

    // ---------------------------------------------------------------- banners: cloth that waves (the look pass, above)
    // A tall flag: the faction's colour in a dark border with a gilt line, a pale disc with one character, the fly cut into
    // flame tongues; `w` × `h` from the pivot (the pole's top) to +x and down. o.hold: how still its top edge is (a spar).
    const bannerTex = {}, sparMat = new T.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.7 });
    const bannerMats = (fid, ch, style) => {
      const key = fid + ch + style;
      if (!bannerTex[key]) {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
        const css = (hex) => '#' + new T.Color(Math.abs(hex)).getHexString(), fc = COLOR[fid] ?? 0x8a7a55, dk = css(shade(fc, -0.4));
        const tongues = style === 'tongues', fw = tongues ? 100 : 128;
        g.fillStyle = css(fc); g.fillRect(0, 0, fw, 256);
        if (tongues) { g.fillStyle = dk; g.beginPath(); for (let i = 0; i < 5; i++) { const y0 = 22 + i * 44; g.moveTo(fw - 2, y0); g.lineTo(128, y0 + 22); g.lineTo(fw - 2, y0 + 44); } g.fill(); g.fillRect(fw - 8, 0, 8, 256); }
        g.fillStyle = dk; g.fillRect(0, 0, fw, 18); g.fillRect(0, 238, fw, 18); g.fillRect(0, 0, 10, 256);
        g.fillStyle = css(C.brass); g.fillRect(0, 18, fw, 3); g.fillRect(0, 235, fw, 3); g.fillRect(10, 18, 3, 220);
        const cx = tongues ? 56 : 64;
        g.fillStyle = '#f3ead6'; g.beginPath(); g.arc(cx, 124, 42, 0, 7); g.fill();
        g.strokeStyle = dk; g.lineWidth = 3; g.beginPath(); g.arc(cx, 124, 36, 0, 7); g.stroke();
        g.fillStyle = css(fc); g.font = 'bold 58px "Noto Serif TC","Noto Serif CJK TC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch || '', cx, 127);
        const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
        bannerTex[key] = { t };
      }
      return bannerTex[key];
    };
    const banner = (fid, ch, o = {}) => {
      const w = o.w ?? 0.5, h = o.h ?? 1.0, style = o.tongues === false ? 'plain' : 'tongues', { t } = bannerMats(fid, ch, style);
      const opt = { hold: o.hold ?? 0.35, amp: o.amp ?? 0.07, sag: o.sag ?? 0.03 };
      const m0 = look(new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0x2a2a2a, side: T.DoubleSide, roughness: 0.82, alphaTest: 0.5 }), Object.assign({ cloth: true }, opt));
      // the pivot sits at the pole's top and turns to the camera; the cloth hangs beside it and waves
      const piv = new T.Group(); piv.userData.flag = true;
      const m = new T.Mesh(new T.PlaneGeometry(w, h, lite ? 8 : 14, 3), m0); m.position.set(w / 2, -h / 2, 0); m.castShadow = true; m.frustumCulled = false;
      m.customDepthMaterial = clothDepth(t, opt); piv.add(m);
      if (o.spar !== false) { const sp = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, w * 1.04, 5).rotateZ(Math.PI / 2), sparMat); sp.position.set(w * 0.5, 0.005, 0); piv.add(sp); }
      return piv;
    };
    // a complete standard (a town's, a board's): pole, gilt finial, the banner on it; h the pole's height
    HM.standard = (fid, ch, o = {}) => {
      const g = new T.Group(), h = o.h ?? 3.6, s = o.s ?? h / 3.6;
      const k = kit(); k.limb([0, 0, 0], [0, h, 0], 0.035 * s, 0x3b3129, true); k.add(sph(0.05 * s, 8, 6), C.gilt, [0, h + 0.03 * s, 0]); k.add(cone(0.05 * s, 0.22 * s, 6), C.gilt, [0, h + 0.15 * s, 0]);
      const pole = new T.Mesh(k.geo(), mat); pole.castShadow = true; g.add(pole);
      const b = banner(fid, ch, { w: 0.72 * s, h: 1.1 * s, hold: 0.3 }); b.position.y = h - 0.02 * s; g.add(b);
      g.userData.flag = b;
      return g;
    };

    // ---------------------------------------------------------------- an army: figures by arm round the general, on a lacquered base in the faction's colour
    const cache = {};
    const cached = (key, make) => cache[key] || (cache[key] = make());
    const decal = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(cv); })();
    const baseMat = {};
    // the soft ring on the water under a fleet (its colour, fading out)
    const waterBase = (fid, r) => {
      const g = new T.Group();
      if (!baseMat[fid]) baseMat[fid] = [new T.MeshBasicMaterial({ color: lin(COLOR[fid]), map: decal, transparent: true, depthWrite: false, opacity: 0.8 }), new T.MeshBasicMaterial({ color: lin(shade(COLOR[fid], 0.15)), transparent: true, opacity: 0.9, depthWrite: false })];
      const d = new T.Mesh(new T.CircleGeometry(r * 1.12, 40).rotateX(-Math.PI / 2), baseMat[fid][0]); d.position.y = 0.03; d.renderOrder = 4; g.add(d);
      const ring = new T.Mesh(new T.RingGeometry(r * 0.95, r, 64).rotateX(-Math.PI / 2), baseMat[fid][1]); ring.position.y = 0.035; ring.renderOrder = 4; g.add(ring);
      return g;
    };
    // the land base: a low disc of dark lacquer (its skirt runs down into the ground so it never floats on a slope), the top
    // in the faction's lacquer with a gilt rim and a gilt inlaid ring, like a fine miniature's tray; a soft shadow round it
    const shadowMat = new T.MeshBasicMaterial({ color: 0x000000, map: decal, transparent: true, opacity: 0.45, depthWrite: false });
    const plinthGeo = (fid, r) => cached('plinth:' + fid + ':' + r.toFixed(2), () => {
      const k = kit(), fc = COLOR[fid], n = lite ? 28 : 48, top = 0.05;
      k.add(lathe([[r * 1.0, -0.45], [r * 1.02, -0.02], [r * 1.02, top - 0.012], [r * 0.99, top], [0, top + 0.002]], n), mix(fc, 0x120a06, 0.42), [0, 0, 0]);
      k.add(cyl(r * 1.018, r * 1.018, 0.03, n, true), 0x140b06, [0, 0.012, 0]);
      k.add(new T.TorusGeometry(r * 1.005, 0.014, 4, n), C.gilt, [0, top - 0.004, 0], [Math.PI / 2, 0, 0]);
      k.add(new T.TorusGeometry(r * 0.86, 0.006, 3, n), C.gilt, [0, top + 0.002, 0], [Math.PI / 2, 0, 0]);
      return k.geo();
    });
    const place = (geo, pts, o = {}) => {
      const m = new T.InstancedMesh(geo, mat, pts.length), m4 = new T.Matrix4();
      m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(pts.length * 3).fill(1), 3);
      pts.forEach((p, i) => m.setMatrixAt(i, m4.makeRotationY(p[3] || 0).setPosition(p[0], p[1] || 0, p[2])));
      m.castShadow = o.shadow !== false; m.receiveShadow = !!o.receive; m.frustumCulled = false; return m;
    };
    HM.count = HMS.count;
    HM.POSES = HMS.POSES;
    HM.figure = (arm_, fid, pose) => { const p = HMS.pose(pose); return cached(arm_ + ':' + fid + ':' + p, () => (arm_ === 'ky' ? geoRider(fid, p) : arm_ === 'thuy' ? geoShip(fid) : arm_ === 'thuy-escort' ? geoShip(fid, { escort: true }) : arm_ === 'thuy-foot' ? geoFoot('thuy', fid, p) : geoFoot(arm_, fid, p))); };
    const gen = (fid, p) => cached('g:' + fid + ':' + HMS.pose(p), () => geoGeneral(fid, p));
    const bearer = (fid, p) => cached('b:' + fid + ':' + HMS.pose(p), () => geoBearer(fid, p));
    // the general with his standard-bearer and the banner (the harness shows it alone)
    HM.general = (fid, seal, pose) => {
      const g = new T.Group(), F = HMS.formation({});
      g.add(place(gen(fid, pose), [[F.general[0], 0, F.general[1], 0]]));
      g.add(place(bearer(fid, pose), [[F.bearer[0], 0, F.bearer[1], 0]]));
      const f = banner(fid, seal, { w: 0.62, h: 0.98 }); f.position.set(F.bearer[0] + BEARER.pole[0], BEARER.top, F.bearer[1] + BEARER.pole[1]); g.add(f);
      return g;
    };
    HM.army = function (a) {
      const g = new T.Group(), fid = a.fid, pose = HMS.pose(a.pose), parts = {}, arms = {};
      if (a.fleet) {
        const n = HMS.count(a.thuy, 600, 4) || 1;
        const ships = []; for (let k = 0; k < n; k++) ships.push([-(k % 2) * 1.3 - Math.floor(k / 2) * 0.4, 0, (k % 2 ? 0.55 : -0.55) * (k ? 1 : 0), 0]);
        g.add((parts.thuy = place(HM.figure('thuy', fid), ships.slice(0, 1))));
        if (n > 1) g.add((parts.escort = place(HM.figure('thuy-escort', fid), ships.slice(1))));
        // the admiral's banner at the flagship's stern
        const f = banner(fid, a.seal, { w: 0.5, h: 0.72 }); f.position.set(-0.6, 1.02, 0); g.add(f); parts.flag = f;
        // wakes: a pale V behind each hull
        const wv = [];
        for (const [x, , z] of ships) for (const s of [-1, 1]) wv.push(x - 0.72, 0.02, z + s * 0.12, x - 1.9, 0.02, z + s * 0.62, x - 1.9, 0.02, z + s * 0.5);
        const wake = new T.Mesh(tris(wv), new T.MeshBasicMaterial({ color: 0xeaf2f0, transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide })); wake.renderOrder = 3; g.add(wake);
        g.add(waterBase(fid, 1.45));
        return Object.assign(g, { userData: { parts, r: 1.45, pose, fid, setPose: () => g } });
      }
      const n = HMS.figures(a, false), F = HMS.formation(n);
      // the general in front with his standard-bearer, spearmen behind, archers at the back, horsemen on the right flank
      g.add((parts.general = place(gen(fid, pose), [[F.general[0], 0, F.general[1], F.general[2]]])));
      g.add((parts.bearer = place(bearer(fid, pose), [[F.bearer[0], 0, F.bearer[1], 0]])));
      const f = banner(fid, a.seal, { w: 0.62, h: 0.98 }); f.position.set(F.bearer[0] + BEARER.pole[0], BEARER.top, F.bearer[1] + BEARER.pole[1]); g.add(f); parts.flag = f;
      const add = (key, arm_, pts) => { if (!pts.length) return; arms[key] = arm_; g.add((parts[key] = place(HM.figure(arm_, fid, pose), pts.map(([x, z, yaw]) => [x, 0, z, yaw])))); };
      add('bo', 'bo', F.bo); add('thuy', 'thuy-foot', F.thuy); add('cung', 'cung', F.cung); add('ky', 'ky', F.ky);
      const base = new T.Group(); base.position.x = F.cx;
      parts.base = place(plinthGeo(fid, F.r), [[0, 0, 0, 0]], { shadow: false, receive: true }); base.add(parts.base);
      const sh = new T.Mesh(new T.PlaneGeometry(F.r * 2.7, F.r * 2.7).rotateX(-Math.PI / 2), shadowMat); sh.position.y = 0.012; sh.renderOrder = 2; base.add(sh);
      g.add(base);
      const setPose = (p) => {
        p = HMS.pose(p); if (p === g.userData.pose) return g;
        for (const [key, arm_] of Object.entries(arms)) parts[key].geometry = HM.figure(arm_, fid, p);
        parts.general.geometry = gen(fid, p); parts.bearer.geometry = bearer(fid, p); g.userData.pose = p;
        return g;
      };
      return Object.assign(g, { userData: { parts, r: F.r, pose, fid, setPose } });
    };
    HM.setPose = (army, pose) => (army && army.userData && army.userData.setPose ? army.userData.setPose(pose) : army);
    // a village: three or four farmhouses round a yard, thatch or tile, a haystack, a tree (≈ 1.1 across)
    HM.hamlet = (seed) => cached('hamlet:' + seed, () => {
      const k = kit(); let sd = seed * 7919 + 13; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const n = 3 + Math.floor(rnd() * 2), spots = [[0, -0.28, 0], [-0.3, 0.05, Math.PI / 2], [0.3, 0.06, Math.PI / 2], [0.02, 0.34, 0]];
      k.add(rbox(1.0, 0.02, 0.9, 0.3), C.yard, [0, 0.0, 0.02]);
      for (let i = 0; i < n; i++) { const [x, z, ry] = spots[i], thatch = rnd() < 0.55; k.push(xf(house(0.34 + rnd() * 0.1, 0.17, 0.1, { wall: rnd() < 0.5 ? C.plaster : C.plaster2, roof: thatch ? C.thatch : C.roof, tiles: thatch ? 0 : 0.06, lite }), [x, 0.01, z], [0, ry, 0])); }
      k.add(lathe([[0, 0.0], [0.08, 0.0], [0.085, 0.06], [0.05, 0.13], [0, 0.16]], 8), C.straw, [0.02 + (rnd() - 0.5) * 0.2, 0.01, 0.05]);
      k.push(xf(treeGeo('leaf', seed, true), [0.42, 0.01, -0.36]));
      return k.geo();
    });

    // ---------------------------------------------------------------- the siege camp: tents, a staked bank round the town, fires, engines, ladders
    // Han siegecraft of the late 2nd century: traction trebuchets (霹靂車, Cao Cao's at Guandu, 200), a battering ram under a
    // hide-covered shed on wheels (轒轀), a wooden siege tower (井闌), scaling ladders; camps of ridge tents inside palisades.
    const tent = (k, x, z, yaw, w, d, h, hex, stripe) => {
      const t = kit(), v = [-w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, h, 0, -w / 2, 0, -d / 2, w / 2, h, 0, -w / 2, h, 0, w / 2, 0, d / 2, -w / 2, 0, d / 2, -w / 2, h, 0, w / 2, 0, d / 2, -w / 2, h, 0, w / 2, h, 0,
        w / 2, 0, -d / 2, w / 2, 0, d / 2, w / 2, h, 0, -w / 2, 0, d / 2, -w / 2, 0, -d / 2, -w / 2, h, 0];
      t.push(paint(tris(v), hex));
      t.add(new T.BoxGeometry(0.004, h * 0.6, d * 0.25), shade(hex, -0.55), [w / 2 + 0.002, h * 0.3, 0]);
      if (stripe) t.add(new T.BoxGeometry(w + 0.01, 0.012, 0.02), stripe, [0, h, 0]);
      k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0]));
    };
    const stake = (k, x, z, h, hex) => { k.add(cyl(0.011, 0.013, h, 4, true), hex, [x, 0.035 + h / 2, z]); k.add(cone(0.013, 0.03, 4), shade(hex, 0.12), [x, 0.035 + h + 0.015, z]); };
    const trebuchet = (k, x, z, yaw) => { // a frame of two leaning trestles, the axle, the arm cocked (long end down behind), ropes on the short end
      const t = kit(), wd = 0x5a3c22, dk = 0x3a2616;
      t.add(new T.BoxGeometry(0.34, 0.03, 0.26), dk, [0, 0.05, 0]);
      for (const sz of [-1, 1]) { t.limb([-0.12, 0.05, sz * 0.1], [0, 0.34, sz * 0.1], 0.014, wd, true); t.limb([0.12, 0.05, sz * 0.1], [0, 0.34, sz * 0.1], 0.014, wd, true); }
      t.limb([0, 0.34, -0.12], [0, 0.34, 0.12], 0.012, dk, true);
      t.limb([-0.4, 0.1, 0], [0.2, 0.46, 0], 0.013, wd, true); // the arm: long end behind and low, short end in front and up
      for (let i = 0; i < 4; i++) t.limb([0.2, 0.46, (i - 1.5) * 0.012], [0.22 + (i - 1.5) * 0.02, 0.05, (i - 1.5) * 0.05], 0.0025, C.straw, true);
      t.limb([-0.4, 0.1, 0], [-0.43, 0.04, 0.03], 0.003, C.straw, true); t.add(sph(0.022, 6, 4), 0x6a6258, [-0.44, 0.03, 0.04]);
      k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0]));
    };
    const ramShed = (k, x, z, yaw) => {
      const t = kit();
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.add(cyl(0.035, 0.035, 0.02, 8), 0x2a1a10, [sx * 0.12, 0.035, sz * 0.1], [Math.PI / 2, 0, 0]);
      t.add(new T.BoxGeometry(0.34, 0.08, 0.18), 0x4a3020, [0, 0.09, 0]);
      t.push(xf(roof(0.4, 0.26, 0.12, { kind: 'gable', tiles: 0, color: C.hide, under: 0x2a1a10, lite }), [0, 0.13, 0]));
      t.limb([0.1, 0.1, 0], [0.3, 0.1, 0], 0.022, 0x3a2616, true); t.add(sph(0.026, 6, 4), C.iron, [0.3, 0.1, 0]);
      k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0]));
    };
    const siegeTowerGeo = (k, x, z, yaw) => { // a wooden tower on a wheeled frame, open sides, a parapet of boards on top
      const t = kit(), wd = 0x5a3c22, h = 0.62;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { t.limb([sx * 0.1, 0.03, sz * 0.1], [sx * 0.07, h, sz * 0.07], 0.012, wd, true); t.add(cyl(0.03, 0.03, 0.02, 7), 0x2a1a10, [sx * 0.12, 0.035, sz * 0.11], [Math.PI / 2, 0, 0]); }
      for (const y of [0.2, 0.4]) t.add(new T.BoxGeometry(0.19, 0.012, 0.19), 0x3a2616, [0, y, 0]);
      t.add(new T.BoxGeometry(0.2, 0.06, 0.2), shade(wd, 0.1), [0, h + 0.02, 0]);
      t.add(new T.BoxGeometry(0.16, 0.012, 0.16), C.hide, [0, h + 0.07, 0]);
      k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0]));
    };
    const ladder = (k, x, z, yaw, len = 0.5) => { const t = kit(), w = 0x6a4a30; for (const s of [-1, 1]) t.add(new T.BoxGeometry(len, 0.012, 0.012), w, [0, 0.01, s * 0.035]); for (let i = 0; i < 6; i++) t.add(new T.BoxGeometry(0.008, 0.008, 0.07), w, [-len / 2 + (i + 0.5) * (len / 6), 0.012, 0]); k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0])); };
    const cart = (k, x, z, yaw) => { const t = kit(); t.add(new T.BoxGeometry(0.16, 0.05, 0.1), 0x5a3c22, [0, 0.06, 0]); for (const s of [-1, 1]) t.add(cyl(0.04, 0.04, 0.012, 8), 0x2a1a10, [0, 0.04, s * 0.06], [Math.PI / 2, 0, 0]); t.limb([0.08, 0.06, 0.03], [0.24, 0.03, 0.03], 0.006, 0x3a2616, true); t.limb([0.08, 0.06, -0.03], [0.24, 0.03, -0.03], 0.006, 0x3a2616, true); for (let i = 0; i < 3; i++) t.add(sph(0.032, 6, 4), C.cream, [-0.04 + i * 0.04, 0.1, (i % 2) * 0.02], [0, 0, 0], [1, 0.7, 1]); k.push(xf(t.geo(), [x, 0.035, z], [0, yaw, 0])); };
    const campfire = (k, x, z) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(sph(0.014, 5, 3), 0x5a554c, [x + Math.cos(a) * 0.035, 0.04, z + Math.sin(a) * 0.035]); } k.add(new T.BoxGeometry(0.06, 0.01, 0.01), C.char, [x, 0.045, z], [0, 0.6, 0]); k.add(new T.BoxGeometry(0.06, 0.01, 0.01), C.char, [x, 0.047, z], [0, -0.7, 0]); };
    const campCache = {};
    HM.siegeCamp = function (o = {}) {
      const fid = o.fid, men = Math.max(0, Number(o.men) || 6000), r = o.r ?? 3.3, seed = o.seed || 1, face = o.face || 0;
      const plan = HMS.campPlan({ men, r, seed, face }), key = [fid, Math.round(men / 500), r.toFixed(2), seed, face.toFixed(2)].join(':');
      if (!campCache[key]) {
        const k = kit(), rnd = lcg(seed * 53 + 11), fc = COLOR[fid] ?? 0x8a7a55, fires = [], smoke = [], flags = [], wood = 0x5a3c22;
        // the bank and its stakes round the town, open where each camp's gate is (angles, the ring's inside faces the town)
        const R0 = r, step = lite ? 0.12 : 0.085, nS = Math.round((2 * Math.PI * R0) / step);
        const gap = (a) => plan.gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2 / R0);
        for (let i = 0; i < nS; i++) {
          const a = (i / nS) * Math.PI * 2; if (gap(a)) continue;
          const x = Math.cos(a) * R0, z = Math.sin(a) * R0;
          if (i % 3 === 0) k.add(new T.BoxGeometry(0.2, 0.05, 0.14), 0x6d5a38, [x, 0.035, z], [0, -a, 0]);
          stake(k, x + Math.cos(a) * 0.03, z + Math.sin(a) * 0.03, 0.09 + hash(i, 1, 2) * 0.03, shade(wood, (hash(i, 2, 3) - 0.5) * 0.3));
        }
        for (const c of plan.camps) {
          // a camp: a square of stakes, its gate toward the town, tents in rows, fires, the general's tent in the first
          const ca = Math.cos(c.a), sa = Math.sin(c.a), cx = ca * c.d, cz = sa * c.d, rot = -c.a; // local x: away from the town
          const L2W = (lx, lz) => [cx + lx * ca - lz * sa, cz + lx * sa + lz * ca];
          const hw = c.dd / 2, hd = c.w / 2, ns = Math.round((2 * (c.w + c.dd)) / (step * 1.1));
          for (let i = 0; i < ns; i++) {
            const t = (i / ns) * 2 * (c.w + c.dd); let lx, lz;
            if (t < c.dd) { lx = -hw + t; lz = -hd; } else if (t < c.dd + c.w) { lx = hw; lz = -hd + (t - c.dd); } else if (t < 2 * c.dd + c.w) { lx = hw - (t - c.dd - c.w); lz = hd; } else { lx = -hw; lz = hd - (t - 2 * c.dd - c.w); }
            if (lx < -hw + 0.01 && Math.abs(lz) < 0.13) continue; // the gate, toward the town
            const [x, z] = L2W(lx, lz); stake(k, x, z, 0.08, shade(wood, (hash(i, lz, 1) - 0.5) * 0.3));
          }
          for (const [tx, tz, tr] of c.tents) { const [x, z] = L2W(-0.07 + tz * 0.19, tx * (c.w / 4.6)); tent(k, x, z, rot + (tr - 0.5) * 0.1, 0.17, 0.12, 0.085, C.canvas[Math.floor(tr * C.canvas.length)], tr < 0.25 ? fc : null); }
          if (c.main) { const [x, z] = L2W(hw - 0.16, 0); tent(k, x, z, rot, 0.3, 0.22, 0.15, mix(fc, C.cream, 0.25), C.gilt); }
          for (let f = 0; f < c.fires; f++) { const [x, z] = L2W(-hw + 0.18, (f - (c.fires - 1) / 2) * 0.4); campfire(k, x, z); fires.push([x, 0.05, z]); smoke.push([x, 0.08, z]); }
          const [bx, bz] = L2W(-hw - 0.02, 0.17), [bx2, bz2] = L2W(-hw - 0.02, -0.17);
          for (const [x, z] of c.main ? [[bx, bz], [bx2, bz2]] : [[bx, bz]]) { k.limb([x, 0.03, z], [x, 0.62, z], 0.008, 0x3b3129, true); flags.push([x, 0.62, z]); }
          for (let i = 0; i < 2; i++) { const [x, z] = L2W(-hw + 0.35 + i * 0.08, hd - 0.2); ladder(k, x, z, rot + 0.1 * i, 0.46); }
          const [kx, kz] = L2W(hw - 0.15, hd - 0.18); cart(k, kx, kz, rot + 1.2);
        }
        // the engines inside the ring, their arms toward the walls
        for (const e of plan.engines) {
          const x = Math.cos(e.a) * e.d, z = Math.sin(e.a) * e.d, yaw = Math.PI - e.a; // local +x toward the town's centre
          if (e.kind === 'trebuchet') trebuchet(k, x, z, yaw);
          else if (e.kind === 'ram') ramShed(k, x, z, yaw);
          else siegeTowerGeo(k, x, z, yaw);
        }
        // ladders laid ready along the ring's inside, a few mantlets of wicker
        for (let i = 0; i < (lite ? 3 : 6); i++) { const a = face + (rnd() - 0.5) * 1.6, d = r - 0.18 - rnd() * 0.15; ladder(k, Math.cos(a) * d, Math.sin(a) * d, -a + Math.PI / 2 + (rnd() - 0.5) * 0.4, 0.5); }
        for (let i = 0; i < (lite ? 3 : 5); i++) { const a = face + (i - 2) * 0.22 + (rnd() - 0.5) * 0.1, d = r - 0.62; k.add(new T.BoxGeometry(0.02, 0.09, 0.16), 0x6d5436, [Math.cos(a) * d, 0.08, Math.sin(a) * d], [0, -a, 0.2]); }
        // the ground each camp trampled: a low pad whose edge slopes into the land (like the town's apron, which covers it where they meet)
        for (const c of plan.camps) { const rr = Math.max(c.w, c.dd) * 0.62; k.add(lathe([[rr + 0.9, -0.85], [rr, 0.02], [0, 0.02]], lite ? 14 : 22), 0x6a5a36, [Math.cos(c.a) * c.d, 0, Math.sin(c.a) * c.d], [0, -c.a, 0], [(c.dd / Math.max(c.w, c.dd)) * 1.05, 1, c.w / Math.max(c.w, c.dd)]); }
        campCache[key] = { geo: k.geo(), fires, smoke, flags };
      }
      const c = campCache[key], g = new T.Group();
      const m = new T.Mesh(c.geo, mat); m.castShadow = !lite; m.receiveShadow = true; g.add(m);
      const fx = new T.Group(); fx.add(HM.fire(c.fires, 0.65), HM.smoke(c.smoke, 0.6)); g.add(fx);
      for (const p of c.flags) { const b = banner(fid, o.seal || '', { w: 0.16, h: 0.24, hold: 0.2, spar: false }); b.position.set(p[0], p[1], p[2]); g.add(b); }
      g.userData = { r, plan, stand: plan.stand, fires: c.fires, smoke: c.smoke, fx, shared: true };
      return g;
    };

    HM.mat = mat;
    HM.look = look;
    // the kit itself, for the design prototypes (docs/design/prototypes/siege) that build at other scales
    HM.parts = { kit, xf, paint, shade, mix, rbox, cyl, sph, lathe, cone, blob, tris, roof, pavilion, house, granary, que, treeGeo, wallPrism, C, env };
    HM.banner = banner;
    HM.tree = (kind, seed, lo) => cached('tree:' + kind + ':' + (seed || 1) + (lo ? ':lo' : ''), () => treeGeo(kind, seed || 1, lo));
    // a siege: a run of wall across one lane (along x, outside +z) and a tower between lanes (o.damage: a breach in it)
    HM.siegeWall = (len, lv = 3, withGate = false, o = {}) => cached('sw:' + len + ':' + lv + withGate + ':' + (o.breach ? 1 : 0), () => {
      const k = kit();
      if (o.breach) { const w = Math.min(0.5, len * 0.3); wallRun(k, -len / 2, -w / 2, 0, lv, { lite }); wallRun(k, w / 2, len / 2, 0, lv, { lite }); rubble(k, 0, 0, lv, w, len); }
      else if (!withGate) wallRun(k, -len / 2, len / 2, 0, lv, { lite });
      else { const gw = 0.6 + lv * 0.05; wallRun(k, -len / 2, -gw / 2, 0, lv, { lite }); wallRun(k, gw / 2, len / 2, 0, lv, { lite }); gate(k, 0, lv, gw, { lite }); }
      return k.geo();
    });
    HM.siegeTower = (lv = 3) => cached('st:' + lv, () => { const k = kit(); cornerTower(k, 0, 0, lv, { lite }); return k.geo(); });
    HM.tier = tier;
    tick();
    return HM;
  };
})(typeof window !== 'undefined' ? window : globalThis);
