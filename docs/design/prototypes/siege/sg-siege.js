// Siege prototype (docs/design/prototypes/siege): Thọ Xuân under siege, autumn 219, at 1 unit = 1 m. Throwaway design code.
// The city follows the Eastern Han rules of docs/design/history.md: rammed-earth walls with a low crenellated parapet,
// flat-topped gate passages under timber towers, a pair of khuyết before the south gate, straight grey tile roofs, wards
// of walled courtyard houses with watchtowers, a walled market with its tower, round granaries, the governor's hall on a
// rammed-earth platform. Buildings come from the demo's model kit (HNModels.parts, kit units × 30 = metres).
// The besiegers (Chu Nguyên Chương, red 明) press the south gate and the east wall; the defenders (Wei, green 魏) hold.
//   SGS.city(L, HM) · SGS.armies(L, HM, city) · SGS.fx(L, city, armies) → { group, … }
(function () {
  const S = (window.SGS = {});
  const T = THREE, BGU = THREE.BufferGeometryUtils;
  const RED = 0xb3262e, GREEN = 0x4d6a3a, KS = 30; // faction colours (data/world.json), kit units → metres

  // ---------------------------------------------------------------- rammed earth: courses of the formwork, 9 cm layers, rain streaks, a damp foot, grass on top
  S.earthMaterial = (env) => {
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMap: env, envMapIntensity: 0.4 });
    mat.extensions = { derivatives: true };
    mat.onBeforeCompile = (sh) => {
      SGN.worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 p = vWP; float side = 1. - smoothstep(.55, .85, abs(vWN.y));
          float course = floor(p.y / 1.15), ct = h12(vec2(course, floor((p.x + p.z) / 3.2)));
          float layers = sin(p.y * 69.8) * fadeFreq(p, 11.);
          float streak = smoothstep(.45, .85, vn3(vec3(p.x * .35, p.y * .05, p.z * .35)));
          float n = vn3(p * .8) * fadeFreq(p, .8) + .5 * (1. - fadeFreq(p, .8));
          vec3 c = diffuseColor.rgb * (.9 + .14 * ct) * (1. - .05 * layers * side) * (1. - .22 * streak * side) * (.9 + .2 * n);
          c *= mix(.72, 1., smoothstep(1.5, 4., p.y));
          float top = smoothstep(.8, .95, vWN.y) * smoothstep(.45, .62, fbm2(p.xz / 5.));
          c = mix(c, vec3(.16, .19, .07) * (.8 + .4 * n), top * .8);
          diffuseColor.rgb = c; }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hb = sin(vWP.y * 69.8) * .012 * fadeFreq(vWP, 11.) + vn3(vWP * 1.3) * .05 * fadeFreq(vWP, 1.3); normal = bumpN(normal, -vViewPosition, hb); }`);
    };
    mat.customProgramCacheKey = () => 'sg-earth';
    return mat;
  };

  // ---------------------------------------------------------------- the city
  S.city = function (L, HM, env) {
    const P = HM.parts, C = P.C, group = new T.Group();
    const E = P.kit(), B = P.kit(); // E: rammed earth (earth material), B: buildings (the kit's material)
    const HC = L.HC, H = 10, WB = 26, WT = 9, G0 = 2.0; // wall centre line, height, base and top width, ground level
    const earth = 0x9a7d5a, earthDark = 0x84694c, paving = 0x7d776d;
    const put = (geo, p, r, s) => B.push(P.xf(geo, p, r, s)); // kit geometry (already painted)
    const KSv = [KS, KS, KS];
    // one run of wall along x from x0 to x1 at z = zc (outside +z): battered body, walkway, earthen parapet with crenels
    const run = (k, x0, x1, zc) => {
      const len = x1 - x0, cx = (x0 + x1) / 2, sh = new T.Shape();
      sh.moveTo(-WB / 2, -3); sh.lineTo(WB / 2, -3); sh.lineTo(WT / 2, H); sh.lineTo(-WT / 2, H); sh.lineTo(-WB / 2, -3);
      k.add(new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(len / 2, 0, 0), earth, [cx, G0, zc]);
      k.add(P.rbox(len, 1.5, 1.2, 0), earthDark, [cx, G0 + H + 0.75, zc + WT / 2 - 0.6]);
      const n = Math.floor(len / 3.6);
      for (let i = 0; i < n; i++) k.add(P.rbox(2.1, 1.1, 1.25, 0), earthDark, [x0 + (i + 0.5) * (len / n), G0 + H + 2.05, zc + WT / 2 - 0.6]);
      k.add(P.rbox(len, 0.9, 0.8, 0), earthDark, [cx, G0 + H + 0.45, zc - WT / 2 + 0.4]);
    };
    const gates = [];
    for (let side = 0; side < 4; side++) {
      const k = P.kit(), main = side === 0, gw = 34, cw = 34;
      run(k, -HC + cw / 2, -gw / 2, HC); run(k, gw / 2, HC - cw / 2, HC);
      for (const x of [-(HC + gw / 2) / 2, (HC + gw / 2) / 2]) { // ụ nhô (mã diện) mid-run
        k.add(P.rbox(16, H + 3, 24, 0.05), earth, [x, G0 + (H - 3) / 2, HC + WB / 2 - 4]);
        for (let i = 0; i < 4; i++) k.add(P.rbox(2.1, 1.1, 1.25, 0), earthDark, [x - 6 + i * 4, G0 + H + 0.55, HC + WB / 2 + 7.2]);
      }
      // the gatehouse: wider earth block, a flat-topped passage under timber, doors
      k.add(P.rbox(gw, H + 3.5, WB + 6, 0.04), earth, [0, G0 + (H + 0.5 - 3) / 2, HC]);
      E.push(P.xf(k.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
      const b = P.kit(), pw = main ? 6.5 : 5.5, ph = 7.2;
      b.add(P.rbox(pw, ph, WB + 6.4, 0), 0x0e0a07, [0, G0 + ph / 2, HC]);
      for (const sz of [-1, 1]) { b.add(P.rbox(pw + 2.2, 0.9, 0.8, 0.2), 0x3a2414, [0, G0 + ph + 0.45, HC + sz * (WB / 2 + 3.2)]); for (const sx of [-1, 1]) b.add(P.rbox(0.8, ph, 0.8, 0.2), 0x3a2414, [sx * (pw / 2 + 0.4), G0 + ph / 2, HC + sz * (WB / 2 + 3.2)]); }
      for (const sx of [-1, 1]) b.add(P.rbox(0.35, ph * 0.95, pw * 0.5, 0.2), 0x4a2211, [sx * pw * 0.42, G0 + ph * 0.47, HC + WB / 2 + 1.5], [0, sx * 0.7, 0]);
      // the gate tower: timber, two storeys (three over the south gate), straight grey roofs
      b.push(P.xf(P.pavilion({ w: 0.9, d: 0.5, h: 0.2, storeys: main ? 3 : 2, rh: 0.17, base: 0.02, ov: 0.08, tiles: 0.028 }), [0, G0 + H + 0.5, HC], [0, 0, 0], KSv));
      B.push(P.xf(b.geo(), [0, 0, 0], [0, (side * Math.PI) / 2, 0]));
      const a = (side * Math.PI) / 2; gates.push({ side, x: Math.sin(a) * HC, z: Math.cos(a) * HC, out: [Math.sin(a), Math.cos(a)], towerY: G0 + H + 0.5 });
      // a wooden bridge over the moat
      const br = P.kit(), bz0 = L.MOAT0 - 5, bz1 = L.MOAT1 + 5;
      br.add(P.rbox(9, 0.7, bz1 - bz0, 0.2), 0x5a3a22, [0, 1.7, (bz0 + bz1) / 2]);
      for (let z = bz0 + 4; z < bz1; z += 8) for (const sx of [-1, 1]) br.add(P.rbox(0.6, 7, 0.6, 0), 0x3d2717, [sx * 4, -1.6, z]);
      for (const sx of [-1, 1]) br.add(P.rbox(0.25, 1.1, bz1 - bz0, 0), 0x5a3a22, [sx * 4.3, 2.6, (bz0 + bz1) / 2]);
      B.push(P.xf(br.geo(), [0, 0, 0], [0, a, 0]));
    }
    // corner bastions with two-storey towers
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      E.add(P.rbox(34, H + 4, 34, 0.04), earth, [sx * HC, G0 + (H + 1 - 3) / 2, sz * HC]);
      for (let i = 0; i < 8; i++) { const u = -15 + i * 4.3; E.add(P.rbox(2.1, 1.1, 1.25, 0), earthDark, [sx * HC + u, G0 + H + 1.55, sz * (HC + 16.4)]); E.add(P.rbox(1.25, 1.1, 2.1, 0), earthDark, [sx * (HC + 16.4), G0 + H + 1.55, sz * HC + u]); }
      put(P.pavilion({ w: 0.55, d: 0.55, h: 0.17, storeys: 2, rh: 0.14, ov: 0.07, tiles: 0.028 }), [sx * HC, G0 + H + 1, sz * HC], [0, 0, 0], KSv);
    }
    // the khuyết pair before the south gate (a governor's rank: mother-and-child towers)
    for (const sx of [-1, 1]) put(P.que(), [sx * 24, G0, HC + WB / 2 + 5], [0, sx < 0 ? Math.PI : 0, 0], KSv);

    // inside: avenues, the governor's compound, the market, granaries, wards of courtyard houses
    const inTrees = [];
    B.add(P.rbox(18, 0.25, 2 * HC - 30, 0), paving, [0, G0 + 0.05, (HC - 15 - 73) / 2 + 0.1]);
    B.add(P.rbox(2 * HC - 30, 0.25, 14, 0), paving, [0, G0 + 0.05, 0]);
    // the governor's compound (郡府): red walls, a gate hall, the main hall on a two-step rammed-earth platform, a rear hall
    const yx = 68, yz0 = -190, yz1 = -73;
    for (const [x0, x1, z0, z1] of [[-yx, yx, yz0, yz0], [-yx, -yx, yz0, yz1], [yx, yx, yz0, yz1], [-yx, -9, yz1, yz1], [9, yx, yz1, yz1]]) {
      const lx = Math.max(1.2, x1 - x0), lz = Math.max(1.2, z1 - z0);
      B.add(P.rbox(lx, 4, lz, 0), 0xa9523a, [(x0 + x1) / 2, G0 + 2, (z0 + z1) / 2]); B.add(P.rbox(lx + 1, 0.6, lz + 1, 0), 0x3f444c, [(x0 + x1) / 2, G0 + 4.2, (z0 + z1) / 2]);
    }
    B.add(P.rbox(2 * yx - 2, 0.2, yz1 - yz0 - 2, 0), paving, [0, G0 + 0.1, (yz0 + yz1) / 2]);
    put(P.pavilion({ w: 0.62, d: 0.3, h: 0.16, rh: 0.12, ov: 0.06, tiles: 0.028 }), [0, G0, yz1], [0, 0, 0], KSv);
    E.add(P.rbox(56, 1.6, 34, 0.08), earth, [0, G0 + 0.8, -140]); E.add(P.rbox(48, 1.6, 27, 0.08), earth, [0, G0 + 2.4, -140]);
    put(P.pavilion({ w: 1.35, d: 0.62, h: 0.24, rh: 0.26, ov: 0.08, tiles: 0.026 }), [0, G0 + 3.2, -140], [0, 0, 0], KSv);
    put(P.pavilion({ w: 0.9, d: 0.4, h: 0.18, rh: 0.17, base: 0.04, ov: 0.06, tiles: 0.028 }), [0, G0, -176], [0, 0, 0], KSv);
    for (const sx of [-1, 1]) put(P.house(1.3, 0.3, 0.14, { wall: C.plaster }), [sx * 50, G0, -118], [0, Math.PI / 2, 0], KSv);
    const flagAt = [0, G0, -98];
    // the walled market with its tower (旗亭) and rows of stalls
    const mk = [73, 129, 12, 68];
    for (const [x0, x1, z0, z1] of [[mk[0], mk[1], mk[2], mk[2]], [mk[0], mk[1], mk[3], mk[3]], [mk[0], mk[0], mk[2], mk[3]], [mk[1], mk[1], mk[2], mk[3]]]) {
      const lx = Math.max(1, x1 - x0), lz = Math.max(1, z1 - z0); B.add(P.rbox(lx, 3, lz, 0), C.plaster, [(x0 + x1) / 2, G0 + 1.5, (z0 + z1) / 2]); B.add(P.rbox(lx + 0.8, 0.5, lz + 0.8, 0), 0x3f444c, [(x0 + x1) / 2, G0 + 3.2, (z0 + z1) / 2]);
    }
    put(P.pavilion({ w: 0.3, d: 0.3, h: 0.14, rh: 0.1, storeys: 3, ov: 0.05, tiles: 0.03 }), [(mk[0] + mk[1]) / 2, G0, (mk[2] + mk[3]) / 2], [0, 0, 0], KSv);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const x = mk[0] + 10 + c * 36, z = mk[2] + 8 + r * 13; if (Math.abs(x - 101) < 12 && Math.abs(z - 40) < 12) continue; put(P.house(0.55, 0.13, 0.07, { wall: C.plaster2 }), [x, G0, z], [0, 0, 0], KSv); }
    // granaries in the north-west
    for (let i = 0; i < 6; i++) put(P.granary(0.09), [-178 + (i % 3) * 22, G0, -178 + Math.floor(i / 3) * 24], [0, 0, 0], KSv);
    // wards: 3 × 3 blocks each side of the avenue, walled, four courtyard houses each
    const spans = [[-190, -134], [-129, -73], [-68, -12], [12, 68], [73, 129], [134, 190]];
    let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const burnHouses = [];
    for (const [x0, x1] of spans) for (const [z0, z1] of spans) {
      if (Math.abs(x0) < 70 && z1 < -60) continue; // the governor's compound
      if (x0 === mk[0] && z0 === mk[2]) continue; // the market
      if (x0 === -190 && z0 === -190) continue; // the granaries
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0;
      for (const [a0, a1, b0, b1] of [[x0, x1, z0, z0], [x0, x0, z0, z1], [x1, x1, z0, z1], [x0, cx - 3, z1, z1], [cx + 3, x1, z1, z1]]) {
        const lx = Math.max(0.8, a1 - a0), lz = Math.max(0.8, b1 - b0); B.add(P.rbox(lx, 2.6, lz, 0), C.plaster, [(a0 + a1) / 2, G0 + 1.3, (b0 + b1) / 2]); B.add(P.rbox(lx + 0.6, 0.4, lz + 0.6, 0), 0x4a4f57, [(a0 + a1) / 2, G0 + 2.8, (b0 + b1) / 2]);
      }
      for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const hx = cx + qx * w * 0.25, hz = cz + qz * w * 0.25, rich = rnd() < 0.3, wallC = rnd() < 0.35 ? C.plaster2 : C.plaster;
        put(P.house(0.62, 0.2, 0.11 + rnd() * 0.03, { wall: wallC }), [hx, G0, hz - 8], [0, 0, 0], KSv);
        for (const sx of [-1, 1]) if (rnd() < 0.8) put(P.house(0.34, 0.15, 0.09, { wall: wallC }), [hx + sx * 9.5, G0, hz + 2], [0, Math.PI / 2, 0], KSv);
        if (rich) put(P.pavilion({ w: 0.16, d: 0.16, h: 0.085, rh: 0.07, storeys: 3, ov: 0.04, wall: C.wood, cols: false, tiles: 0 }), [hx + 7, G0, hz + 7], [0, 0, 0], KSv);
        else if (rnd() < 0.6) inTrees.push([hx + (rnd() - 0.5) * 8, hz + 5, rnd() < 0.3 ? 1 : 0, 7 + rnd() * 4]);
        if (z0 > 100 && x0 > 0 && burnHouses.length < 4 && rnd() < 0.5) burnHouses.push([hx, G0 + 5, hz - 8]);
      }
    }
    // standards on the walls (Wei) and before the governor's hall
    const eMesh = new T.Mesh(E.geo(), S.earthMaterial(env)); eMesh.castShadow = true; eMesh.receiveShadow = true;
    const bMesh = new T.Mesh(B.geo(), HM.mat); bMesh.castShadow = true; bMesh.receiveShadow = true;
    group.add(eMesh, bMesh);
    return { group, gates, flagAt, H, WB, WT, G0, trees: inTrees, burn: burnHouses };
  };

  // ---------------------------------------------------------------- people, horses, engines (metres)
  const FIG = {};
  const soldier = (HM, fc, pose) => {
    const key = fc + pose; if (FIG[key]) return FIG[key];
    const P = HM.parts, k = P.kit(), skin = 0xc79a74, dark = 0x2a221d, iron = 0x4b4f55;
    const lean = pose === 'pull' ? -0.35 : pose === 'run' ? 0.25 : 0;
    for (const z of [-0.12, 0.12]) k.add(P.rbox(0.16, 0.85, 0.16, 0), dark, [pose === 'run' ? (z > 0 ? 0.18 : -0.15) : 0, 0.42, z]);
    k.add(P.lathe([[0, 0.72], [0.3, 0.72], [0.24, 1.0], [0, 1.02]], 6), fc, [0, 0, 0]);
    k.add(P.lathe([[0, 0.98], [0.23, 0.98], [0.26, 1.3], [0.16, 1.48], [0, 1.5]], 6), P.shade(fc, -0.25), [0, 0, 0], [0, 0, 0], [0.85, 1, 1.15]);
    k.add(P.sph(0.12, 6, 4), skin, [0.02, 1.62, 0]);
    k.add(P.cone(0.15, 0.2, 6), pose === 'bow' ? 0x8f7440 : iron, [0, 1.74, 0]);
    if (pose === 'spear' || pose === 'run') { k.add(P.cyl(0.025, 0.025, 3.4, 3), 0x4a3423, [0.25, 1.5, 0.28], [0, 0, pose === 'run' ? -0.7 : 0.08]); k.add(P.rbox(0.07, 0.95, 0.6, 0), P.shade(fc, -0.45), [0.28, 1.05, -0.22]); }
    if (pose === 'bow') { k.add(new T.TorusGeometry(0.62, 0.025, 3, 8, Math.PI * 0.9), 0x3a2a1c, [0.28, 1.3, -0.15], [0, 0, -Math.PI * 0.45]); k.add(P.rbox(0.6, 0.12, 0.12, 0), P.shade(fc, -0.1), [0.35, 1.32, -0.15]); }
    if (pose === 'climb') { for (const z of [-0.2, 0.2]) k.add(P.rbox(0.12, 0.6, 0.12, 0), P.shade(fc, -0.1), [0.1, 1.75, z]); }
    if (pose === 'pull') { for (const z of [-0.18, 0.18]) k.add(P.rbox(0.6, 0.12, 0.12, 0), P.shade(fc, -0.1), [0.35, 1.2, z]); }
    let g = k.geo(); if (lean) g.applyMatrix4(new T.Matrix4().makeRotationZ(-lean));
    return (FIG[key] = g);
  };
  const rider = (HM, fc) => {
    const key = fc + 'rider'; if (FIG[key]) return FIG[key];
    const P = HM.parts, k = P.kit(), coat = 0x5a3a24;
    k.add(P.rbox(2.1, 0.8, 0.7, 0.3), coat, [0, 1.35, 0]); k.add(P.rbox(0.45, 0.9, 0.4, 0.2), coat, [1.05, 1.9, 0], [0, 0, -0.6]); k.add(P.rbox(0.7, 0.3, 0.3, 0.2), coat, [1.45, 2.2, 0], [0, 0, 0.5]);
    for (const [x, z] of [[0.75, 0.22], [0.75, -0.22], [-0.75, 0.22], [-0.75, -0.22]]) k.add(P.rbox(0.14, 1.0, 0.14, 0), P.shade(coat, -0.3), [x, 0.5, z]);
    k.add(P.rbox(0.9, 0.12, 0.8, 0), fc, [0, 1.8, 0]);
    k.add(P.lathe([[0, 1.8], [0.25, 1.8], [0.26, 2.4], [0.15, 2.55], [0, 2.56]], 6), P.shade(fc, -0.2), [0, 0, 0], [0.85, 1, 1.1]);
    k.add(P.sph(0.12, 6, 4), 0xc79a74, [0, 2.68, 0]); k.add(P.cone(0.15, 0.22, 6), 0x4b4f55, [0, 2.82, 0]);
    k.add(P.cyl(0.025, 0.025, 3.6, 3), 0x4a3423, [0.6, 2.6, 0.3], [0, 0, -0.9]);
    return (FIG[key] = k.geo());
  };
  const trebuchet = (HM) => { // 霹靂車: a traction trebuchet — two trestles, an axle, the throwing arm cocked back
    const P = HM.parts, k = P.kit(), wood = 0x6a4a30, dk = 0x4a3222;
    k.add(P.rbox(7, 0.5, 0.5, 0), dk, [0, 0.25, 2]); k.add(P.rbox(7, 0.5, 0.5, 0), dk, [0, 0.25, -2]); k.add(P.rbox(0.5, 0.5, 4.5, 0), dk, [3, 0.25, 0]); k.add(P.rbox(0.5, 0.5, 4.5, 0), dk, [-3, 0.25, 0]);
    for (const z of [-2, 2]) { k.add(P.rbox(0.45, 7.2, 0.45, 0), wood, [-1.6, 3.4, z], [0, 0, -0.42]); k.add(P.rbox(0.45, 7.2, 0.45, 0), wood, [1.6, 3.4, z], [0, 0, 0.42]); }
    k.add(P.cyl(0.3, 0.3, 4.6, 6), dk, [0, 6.6, 0], [Math.PI / 2, 0, 0]);
    k.add(new T.BoxGeometry(11, 0.4, 0.4).translate(-2.5, 0, 0), wood, [0, 6.6, 0], [0, 0, 0.5]); // arm: long end down at the back
    k.add(P.rbox(0.9, 0.9, 0.9, 0.2), 0x7a7266, [-7.4, 1.4, 0]); // the stone in its sling
    for (const z of [-0.6, 0, 0.6]) k.add(new T.BoxGeometry(0.05, 4.4, 0.05), 0x2c2016, [2.6 * Math.cos(0.5), 6.6 + 2.6 * Math.sin(0.5) - 2.2, z]); // pull ropes
    return k.geo();
  };
  const ram = (HM) => { // 轒轀: a wheeled shed roofed with hides, the log inside
    const P = HM.parts, k = P.kit(), wood = 0x5a3c26, hide = 0x6e5236;
    k.add(P.rbox(9, 0.5, 3.6, 0), wood, [0, 1.0, 0]);
    for (const x of [-3.5, 3.5]) for (const z of [-1.9, 1.9]) k.add(P.cyl(0.8, 0.8, 0.35, 10), 0x3a2618, [x, 0.8, z], [Math.PI / 2, 0, 0]);
    for (const x of [-4, 0, 4]) for (const z of [-1.6, 1.6]) k.add(P.rbox(0.3, 3, 0.3, 0), wood, [x, 2.5, z]);
    for (const s of [-1, 1]) k.add(P.rbox(9.4, 0.2, 2.6, 0), hide, [0, 4.1, s * 1.0], [s * 0.72, 0, 0]);
    k.add(P.cyl(0.35, 0.4, 10, 8), 0x6a4a2c, [1.2, 2.1, 0], [0, 0, Math.PI / 2]);
    return k.geo();
  };
  const jinglan = (HM) => { // 井闌: a wheeled tower for archers, a shielded platform on top
    const P = HM.parts, k = P.kit(), wood = 0x654630;
    for (const x of [-2.6, 2.6]) for (const z of [-2.6, 2.6]) k.add(P.rbox(0.45, 15, 0.45, 0), wood, [x, 7.5, z]);
    for (let y = 2; y < 15; y += 3.2) { k.add(P.rbox(5.6, 0.3, 0.3, 0), wood, [0, y, 2.6]); k.add(P.rbox(5.6, 0.3, 0.3, 0), wood, [0, y, -2.6]); k.add(P.rbox(0.3, 0.3, 5.6, 0), wood, [2.6, y, 0]); k.add(P.rbox(0.3, 0.3, 5.6, 0), wood, [-2.6, y, 0]); k.add(P.rbox(0.25, 4.2, 0.25, 0), wood, [0, y + 1.6, 2.6], [0, 0, 0.9]); }
    k.add(P.rbox(6.6, 0.4, 6.6, 0), wood, [0, 15, 0]);
    for (const [x, z, ry] of [[0, 3.2, 0], [0, -3.2, 0], [3.2, 0, Math.PI / 2], [-3.2, 0, Math.PI / 2]]) k.add(P.rbox(6.6, 1.6, 0.25, 0), 0x7a5a3c, [x, 16, z], [0, ry, 0]);
    for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) k.add(P.cyl(0.7, 0.7, 0.3, 8), 0x3a2618, [x, 0.7, z], [Math.PI / 2, 0, 0]);
    return k.geo();
  };
  const ladder = (HM, len) => { const P = HM.parts, k = P.kit(), w = 0x6a4a30; for (const z of [-0.45, 0.45]) k.add(P.rbox(0.18, len, 0.18, 0), w, [0, len / 2, z]); for (let y = 0.5; y < len; y += 0.6) k.add(P.rbox(0.12, 0.1, 0.9, 0), w, [0, y, 0]); return k.geo(); };
  const mantlet = (HM) => { const P = HM.parts, k = P.kit(); k.add(P.rbox(0.25, 2.4, 3.2, 0), 0x6d5036, [0, 1.2, 0], [0, 0, 0.18]); k.add(P.rbox(1.6, 0.15, 0.15, 0), 0x4a3222, [-0.7, 0.9, 0], [0, 0, -0.8]); return k.geo(); };
  // a crowd: an instanced mesh of one figure, placed [x, y, z, yaw, lean]
  const crowd = (geo, mat, list) => {
    const m = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1), c = new T.Color();
    list.forEach((p, i) => { m.setMatrixAt(i, m4.compose(v.set(p[0], p[1], p[2]), q.setFromEuler(e.set(0, p[3] || 0, p[4] || 0, 'YXZ')), s.setScalar(p[5] || 1))); const b = 0.82 + 0.3 * SGN.noise.h2(i, 7); m.setColorAt(i, c.setRGB(b, b, b)); });
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  // banners: a canvas cloth per faction, instanced poles and cloths
  const bannerMat = {};
  const bannerTex = (fc, glyph) => {
    const key = fc + glyph; if (bannerMat[key]) return bannerMat[key];
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const g = cv.getContext('2d'), css = '#' + new T.Color(fc).getHexString();
    g.fillStyle = css; g.fillRect(0, 0, 64, 128); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, 64, 10); g.fillRect(0, 118, 64, 10);
    g.fillStyle = '#efe3c8'; g.font = 'bold 44px "Noto Serif TC","Noto Serif CJK TC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 32, 64);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
    return (bannerMat[key] = new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0x505050, side: T.DoubleSide, roughness: 0.85 })); // a little light through the cloth: never a black flag against the sun
  };
  const banners = (list, fc, glyph, size = 1) => { // list of [x, y, z, yaw]
    const g = new T.Group(); if (!list.length) return g;
    const pole = new T.CylinderGeometry(0.06, 0.07, 6 * size, 4).translate(0, 3 * size, 0), cloth = new T.PlaneGeometry(1.4 * size, 2.6 * size, 4, 1), cp = cloth.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) / size + 0.7) * 3) * 0.12 * size); cloth.computeVertexNormals(); cloth.translate(0.72 * size, 4.55 * size, 0);
    const pm = new T.InstancedMesh(pole, new T.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }), list.length), cm = new T.InstancedMesh(cloth, bannerTex(fc, glyph), list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1), Y = new T.Vector3(0, 1, 0);
    list.forEach((p, i) => { m4.compose(v.set(p[0], p[1], p[2]), q.setFromAxisAngle(Y, p[3] || 0), s); pm.setMatrixAt(i, m4); cm.setMatrixAt(i, m4); });
    pm.castShadow = cm.castShadow = true; g.add(pm, cm); return g;
  };

  S.parts = { soldier, rider, trebuchet, ladder, crowd, banners, RED, GREEN, KS }; // for sg-camp.js

  // ---------------------------------------------------------------- the armies and the siege
  S.armies = function (L, HM, city, env) {
    const group = new T.Group(), mat = HM.mat, HC = L.HC, G0 = city.G0, H = city.H, WB = city.WB, WT = city.WT;
    const R = { spear: [], bow: [], run: [], climb: [], pull: [] }, Gd = { spear: [], bow: [] }, riders = [], Rb = [], Gb = [];
    let sd = 5; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const y = (x, z) => L.h(x, z);
    // a block of men: centre, facing yaw (0 = toward −z, the city), cols × rows, spacing
    const block = (list, cx, cz, cols, rows, sp, yaw, jitter = 0.35, flags) => {
      const ca = Math.cos(yaw), sa = Math.sin(yaw);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (c - (cols - 1) / 2) * sp + (rnd() - 0.5) * jitter * sp, v = (r - (rows - 1) / 2) * sp + (rnd() - 0.5) * jitter * sp;
        const x = cx + u * ca + v * sa, z = cz - u * sa + v * ca; list.push([x, y(x, z), z, yaw + Math.PI / 2 + (rnd() - 0.5) * 0.3]);
      }
      if (flags) for (let c = 0; c < Math.max(1, Math.round(cols / 6)); c++) { const u = (c - (Math.round(cols / 6) - 1) / 2) * sp * 6, v = ((rows - 1) / 2 + 1) * sp, x = cx + u * ca + v * sa, z = cz - u * sa + v * ca; flags.push([x, y(x, z), z, yaw + Math.PI / 2]); }
    };
    // the attackers' yaw: facing the city (north, −z) → the figure's +x must point to −z
    const NORTH = 0, WEST = Math.PI / 2; // yaw of a block whose rows face −z / −x
    // 1. storming the south gate: a packed column on the bridge and at the gate, the ram in the passage
    for (let i = 0; i < 260; i++) { const x = (rnd() - 0.5) * 26 * (0.4 + rnd()), z = HC + 18 + rnd() * 70; if (L.waterSD(x, z) < 0 && Math.abs(x) > 4) continue; R.run.push([x, Math.max(y(x, z), Math.abs(x) < 4.5 && z > L.MOAT0 - 5 && z < L.MOAT1 + 5 ? 2.05 : -99), z, Math.PI / 2 + (rnd() - 0.5) * 0.6]); }
    const ramG = ram(HM); { const m = new T.Mesh(ramG, mat); m.position.set(0, G0 - 0.2, HC + WB / 2 + 8.5); m.rotation.y = Math.PI / 2; m.castShadow = true; group.add(m); }
    // 2. ladders on the south wall and the east wall, men climbing and bunched at the foot
    const ladG = ladder(HM, 15), slope = Math.atan2((WB - WT) / 2, H + 3);
    const ladders = [];
    for (const x of [-150, -95, 60, 118, 165]) ladders.push({ x, z: HC + WB / 2 - 1.5, yaw: 0 });
    for (const z of [-120, -40, 55, 130]) ladders.push({ x: HC + WB / 2 - 1.5, z, yaw: Math.PI / 2 });
    for (const l of ladders) {
      const m = new T.Mesh(ladG, mat), out = [Math.sin(l.yaw), Math.cos(l.yaw)];
      m.position.set(l.x + out[0] * 3.2, G0 - 0.5, l.z + out[1] * 3.2); m.rotation.set(0, l.yaw - Math.PI / 2, 0); m.rotateZ(slope + 0.18); m.castShadow = true; group.add(m);
      for (let i = 0; i < 5; i++) { const t = 0.12 + i * 0.17, hgt = t * 14, back = 3.2 - Math.tan(slope + 0.18) * hgt; R.climb.push([l.x + out[0] * (back + 0.5), G0 - 0.5 + hgt, l.z + out[1] * (back + 0.5), l.yaw - Math.PI / 2 + Math.PI, 0]); }
      for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI, r = 4 + rnd() * 10, x = l.x + out[0] * (5 + Math.sin(a) * r) + out[1] * Math.cos(a) * r * 1.4, z = l.z + out[1] * (5 + Math.sin(a) * r) - out[0] * Math.cos(a) * r * 1.4; if (L.dMoat(x, z) < 0) continue; R.spear.push([x, y(x, z), z, Math.atan2(out[1], -out[0]) + (rnd() - 0.5) * 0.5]); }
    }
    for (const [cx, cz] of [[-120, HC + 75], [90, HC + 75], [-40, HC + 90]]) block(R.spear, cx, cz, 18, 8, 1.5, NORTH, 0.5, Rb);
    // 3. archers behind mantlets south of the gate, jinglan towers near the east wall
    const manG = mantlet(HM), mans = [];
    for (const [cx, cz] of [[-110, HC + 120], [0, HC + 145], [110, HC + 120]]) { block(R.bow, cx, cz, 16, 5, 1.6, NORTH, 0.3, Rb); for (let i = -4; i <= 4; i++) mans.push([cx + i * 3.4, cz - 7]); }
    for (const [x, z] of mans) { const m = new T.Mesh(manG, mat); m.position.set(x, y(x, z), z); m.rotation.y = Math.PI / 2; m.castShadow = true; group.add(m); }
    const jlG = jinglan(HM);
    for (const [x, z] of [[HC + 70, -60], [HC + 72, 60], [120, HC + 78]]) { const m = new T.Mesh(jlG, mat); m.position.set(x, y(x, z), z); m.castShadow = true; group.add(m); for (let i = 0; i < 8; i++) R.bow.push([x + (rnd() - 0.5) * 5, y(x, z) + 15.2, z + (rnd() - 0.5) * 5, x > HC ? Math.PI : Math.PI / 2]); for (let i = 0; i < 30; i++) R.spear.push([x + (rnd() - 0.5) * 16, y(x, z), z + (rnd() - 0.5) * 16, (rnd() - 0.5) * 6]); }
    // 4. the trebuchet line and their crews
    const trG = trebuchet(HM), trebs = [];
    for (let i = 0; i < 7; i++) { const x = -180 + i * 60 + (rnd() - 0.5) * 10, z = HC + 250 + (rnd() - 0.5) * 16; trebs.push([x, z]); const m = new T.Mesh(trG, mat); m.position.set(x, y(x, z), z); m.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.15; m.castShadow = true; group.add(m); for (let c = 0; c < 12; c++) R.pull.push([x + (c % 6 - 2.5) * 1.1, y(x, z), z - 4.5 - Math.floor(c / 6) * 1.4, -Math.PI / 2]); }
    // 5. the main force in blocks, cavalry on the flanks, the general's standard
    for (const [cx, cz] of [[-160, HC + 330], [-55, HC + 345], [55, HC + 345], [160, HC + 330], [-100, HC + 420], [100, HC + 420]]) block(R.spear, cx, cz, 22, 10, 1.7, NORTH, 0.25, Rb);
    for (const [cx, cz] of [[-330, HC + 300], [330, HC + 300]]) { const L2 = []; block(L2, cx, cz, 10, 5, 3.2, NORTH, 0.3, Rb); for (const p of L2) riders.push(p); }
    // 6. the camp to the south-east (sg-camp.js): earthworks, gates, towers, the command enclosure, tents, horses, stores
    const camp = S.camp(L, HM, env, { R, Rb, riders }); group.add(camp.group);
    // 7. boats on the Fei at the canal mouth (the water gate on the west side)
    const ship = HM.figure('thuy', 'zhu_yuanzhang'), ships = [];
    for (let i = 0; i < 5; i++) { const z = -40 + i * 26, x = L.feiX(z) + 8 * (i % 2 ? 1 : -1); ships.push([x, L.WATER + 0.1, z, Math.PI / 2 + (i % 2) * 0.2]); }
    const sm = crowd(ship, mat, ships.map((p) => [...p, 0, 10])); group.add(sm);
    // the defenders: along the south and east walls, archers on the towers, reserves behind the south gate
    for (let x = -HC + 22; x < HC - 22; x += 2.3) { if (Math.abs(x) < 18) continue; Gd[rnd() < 0.5 ? 'bow' : 'spear'].push([x, G0 + H, HC + WT / 2 - 2.2, -Math.PI / 2 + (rnd() - 0.5) * 0.4]); }
    for (let z = -HC + 22; z < HC - 22; z += 2.6) { if (Math.abs(z) < 18) continue; Gd[rnd() < 0.5 ? 'bow' : 'spear'].push([HC + WT / 2 - 2.2, G0 + H, z, (rnd() - 0.5) * 0.4]); }
    for (let x = -HC + 30; x < HC - 30; x += 40) Gb.push([x, G0 + H, HC + WT / 2 - 1.2, 0]);
    for (let z = -HC + 30; z < HC - 30; z += 40) Gb.push([HC + WT / 2 - 1.2, G0 + H, z, Math.PI / 2]);
    for (const [cx, cz] of [[-38, HC - 40], [38, HC - 40], [0, HC - 62]]) { const L2 = []; block(L2, cx, cz, 14, 8, 1.6, NORTH + Math.PI, 0.25, Gb); L2.forEach((p) => { p[1] = G0; Gd.spear.push(p); }); }
    Gb.push([city.flagAt[0], city.flagAt[1], city.flagAt[2], 0]);
    // build the meshes
    for (const [k, list] of Object.entries(R)) if (list.length) group.add(crowd(soldier(HM, RED, k), mat, list));
    for (const [k, list] of Object.entries(Gd)) if (list.length) group.add(crowd(soldier(HM, GREEN, k), mat, list));
    if (riders.length) group.add(crowd(rider(HM, RED), mat, riders));
    group.add(banners(Rb, RED, '明', 1), banners(Gb, GREEN, '魏', 1));
    // the great standards: the general's before the trebuchets, Wei's over the governor's hall
    group.add(banners([[0, y(0, HC + 300), HC + 300, 0]], RED, '朱', 3.2), banners([[city.flagAt[0], G0, city.flagAt[2], 0]], GREEN, '魏', 3.4));
    const count = Object.values(R).reduce((a, l) => a + l.length, 0) + Object.values(Gd).reduce((a, l) => a + l.length, 0) + riders.length;
    return { group, trebs, ladders, count, hearths: camp.hearths, archers: [[-110, HC + 120], [0, HC + 145], [110, HC + 120]] };
  };

  // ---------------------------------------------------------------- fire, smoke, arrows, stones
  const spriteTex = (draw, w = 128, h = 128) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; return t; };
  S.fx = function (L, city, army) {
    const group = new T.Group(), live = [], HC = L.HC;
    let sd = 3; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const smokeT = spriteTex((g, w, h) => { for (let i = 0; i < 30; i++) { const x = w / 2 + (rnd() - 0.5) * w * 0.45, y = h / 2 + (rnd() - 0.5) * h * 0.45, r = w * (0.14 + rnd() * 0.2), gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); gr.addColorStop(0, 'rgba(255,246,232,0.34)'); gr.addColorStop(0.55, 'rgba(170,160,150,0.22)'); gr.addColorStop(1, 'rgba(90,84,78,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
    const flameT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.62, h * 0.5); gr.addColorStop(0, 'rgba(255,245,200,1)'); gr.addColorStop(0.25, 'rgba(255,180,60,0.95)'); gr.addColorStop(0.6, 'rgba(230,80,20,0.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.55, w / 2, h); g.quadraticCurveTo(0, h * 0.55, w / 2, 0); g.fill(); }, 64, 128);
    const glowT = spriteTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,170,80,0.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const fire = (x, y, z, size, smokeH, lit) => {
      for (let i = 0; i < 16; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: flameT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffffff })); s.position.set(x + (rnd() - 0.5) * size * 1.6, y + rnd() * size * 0.5, z + (rnd() - 0.5) * size); s.scale.set(size * 0.5, size, 1); s.userData = { base: s.position.clone(), sz: size, ph: rnd() * 6 }; group.add(s); live.push(['flame', s]); }
      const gl = new T.Sprite(new T.SpriteMaterial({ map: glowT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 })); gl.position.set(x, y + size * 0.3, z); gl.scale.set(size * 3.2, size * 3.2, 1); group.add(gl); live.push(['glow', gl]);
      if (lit) { const light = new T.PointLight(0xff8a3a, 2.4, size * 14, 2); light.position.set(x, y + size * 0.6, z); group.add(light); }
      for (let i = 0; i < 34; i++) { const t = i / 34, g = 0.07 + 0.2 * t + 0.06 * rnd(), sm = new T.Sprite(new T.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: true, alphaTest: 0.18, color: new T.Color().setRGB(g * 1.05, g, g * 0.92), opacity: 1 - t * 0.5 })); const hgt = t * smokeH; sm.position.set(x + hgt * 0.45 + (rnd() - 0.5) * 4, y + size + hgt, z - hgt * 0.2 + (rnd() - 0.5) * 4); const sc = size * (1.1 + rnd() * 0.8) + hgt * 0.42; sm.scale.set(sc, sc, 1); sm.material.rotation = rnd() * 6; sm.userData = { base: sm.position.clone(), ph: rnd() * 6 }; group.add(sm); live.push(['smoke', sm]); }
    };
    const south = city.gates[0];
    fire(-4, south.towerY + 9, HC + 1, 10, 110, true);  // the south gate tower is burning
    fire(10, south.towerY + 4, HC - 3, 4, 40, false);
    for (const [x, y, z] of city.burn.slice(0, 3)) fire(x, y, z, 5, 60);
    // cooking fires in the camp: small flames, a glow, a thin wisp of smoke leaning with the wind
    const hearth = (x, y, z) => {
      for (let i = 0; i < 5; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: flameT, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); s.position.set(x + (rnd() - 0.5) * 0.6, y + 0.3 + rnd() * 0.15, z + (rnd() - 0.5) * 0.6); s.scale.set(0.4, 0.8, 1); s.userData = { base: s.position.clone(), sz: 0.8, ph: rnd() * 6 }; group.add(s); live.push(['flame', s]); }
      const gl = new T.Sprite(new T.SpriteMaterial({ map: glowT, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 })); gl.position.set(x, y + 0.5, z); gl.scale.set(3, 3, 1); group.add(gl); live.push(['glow', gl]);
      for (let i = 0; i < 12; i++) { const t = i / 12, g = 0.5 + 0.2 * t, sm = new T.Sprite(new T.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false, color: new T.Color().setRGB(g, g * 0.97, g * 0.93), opacity: 0.34 * (1 - t) })); const hgt = 1.4 + t * 24; sm.position.set(x + hgt * 0.35 + (rnd() - 0.5), y + hgt, z - hgt * 0.15 + (rnd() - 0.5)); const s2 = 1.3 + hgt * 0.26; sm.scale.set(s2, s2, 1); sm.material.rotation = rnd() * 6; sm.userData = { base: sm.position.clone(), ph: rnd() * 6 }; group.add(sm); live.push(['smoke', sm]); }
    };
    for (const [x, y, z] of army.hearths || []) hearth(x, y, z);
    // dust at the gate and the ladders
    for (let i = 0; i < 14; i++) { const sm = new T.Sprite(new T.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false, color: 0x9a8466, opacity: 0.45 })); const x = (rnd() - 0.5) * 50, z = HC + 30 + rnd() * 40; sm.position.set(x, L.h(x, z) + 3 + rnd() * 3, z); sm.scale.setScalar(12 + rnd() * 10); group.add(sm); }
    // arrows in flight: dark shafts and fire arrows (streaks), from the archers to the south wall and back
    const shaft = new T.BoxGeometry(0.08, 0.08, 1.2), streak = new T.BoxGeometry(0.16, 0.16, 3.5);
    const arrows = [], fireArrows = [];
    const arc = (a, b, t, hmax) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * hmax, a[2] + (b[2] - a[2]) * t];
    for (const [ax, az] of army.archers) for (let i = 0; i < 90; i++) {
      const a = [ax + (rnd() - 0.5) * 26, L.h(ax, az) + 2, az + (rnd() - 0.5) * 8], tx = ax * 0.9 + (rnd() - 0.5) * 60, b = [tx, city.G0 + city.H + 1 + rnd() * 3, HC + (rnd() - 0.5) * 6], t = 0.15 + rnd() * 0.8, hm = 28 + rnd() * 10;
      const p = arc(a, b, t, hm), p2 = arc(a, b, t + 0.01, hm); (i % 5 === 0 ? fireArrows : arrows).push([p, p2]);
    }
    for (let i = 0; i < 160; i++) { const x = (rnd() - 0.5) * 360, a = [x, city.G0 + city.H + 1.5, HC + 3], b = [x * 0.8 + (rnd() - 0.5) * 60, L.h(x, HC + 120), HC + 60 + rnd() * 120], t = 0.1 + rnd() * 0.8, hm = 18 + rnd() * 8; const p = arc(a, b, t, hm), p2 = arc(a, b, t + 0.01, hm); arrows.push([p, p2]); }
    const orient = (list, geo, mat) => { const m = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), d = new T.Vector3(), Z = new T.Vector3(0, 0, 1), s = new T.Vector3(1, 1, 1); list.forEach(([p, p2], i) => { d.set(p2[0] - p[0], p2[1] - p[1], p2[2] - p[2]).normalize(); m.setMatrixAt(i, m4.compose(v.set(...p), q.setFromUnitVectors(Z, d), s)); }); return m; };
    group.add(orient(arrows, shaft, new T.MeshBasicMaterial({ color: 0x1c140e })));
    const fa = orient(fireArrows, streak, new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); group.add(fa);
    // stones and fire pots in flight from the trebuchets
    const stoneG = new T.IcosahedronGeometry(0.7, 1);
    for (let i = 0; i < 5; i++) { const [x, z] = army.trebs[i % army.trebs.length], t = 0.62 + rnd() * 0.25, p = arc([x - 4, L.h(x, z) + 8, z], [x * 0.6 + (rnd() - 0.5) * 40, city.G0 + 6, HC - 20 - rnd() * 60], t, 70); const st = new T.Mesh(stoneG, new T.MeshStandardMaterial({ color: 0x6f675c, roughness: 0.9 })); st.position.set(...p); st.castShadow = true; group.add(st);  }
    // animate: flames flicker, smoke drifts
    const tick = (time) => {
      for (const [kind, s] of live) {
        const u = s.userData;
        if (kind === 'flame') { const f = 0.75 + 0.35 * Math.abs(Math.sin(time * 9 + u.ph)) * (0.7 + 0.3 * Math.sin(time * 23 + u.ph * 2)); s.scale.set(u.sz * 0.5 * (0.8 + 0.2 * f), u.sz * f, 1); s.position.y = u.base.y + (f - 0.75) * u.sz * 0.3; }
        else if (kind === 'smoke') { s.position.x = u.base.x + Math.sin(time * 0.3 + u.ph) * 2; s.material.rotation += 0.0015; }
        else if (kind === 'glow') s.material.opacity = 0.45 + 0.12 * Math.sin(time * 13);
      }
    };
    return { group, tick };
  };
})();
