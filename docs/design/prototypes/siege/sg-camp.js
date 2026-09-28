// Siege prototype (docs/design/prototypes/siege): the besiegers' camp (營), autumn 219, 1 unit = 1 m. Throwaway design code.
// Han practice (docs/design/history.md): an earth rampart (壘) with a ditch (塹) outside it, a timber palisade on the
// rampart, chevaux-de-frise (拒馬) before the gates; no fixed plan. Here: a rectangle south-east of the lines, a gate in
// each side under a timber gate tower, watchtowers at the corners and along the sides, two streets crossing at the
// command enclosure (中軍: the great tent, the 朱 standard, Han drums on poles, weapon racks, the officers' tents),
// blocks of ridge tents with their cooking fires, the horse lines, the supply depot by the west gate (sacks, carts,
// covered grain), the engineers' yard (timber, a trebuchet being built), the drill ground with its reviewing platform
// and archery butts. The ditch is a real cut: the terrain shader drops its fragments in the ditch's ring (SGN.terrain).
//   SGS.camp(L, HM, env, out) → { group, hearths }   out: the armies' lists { R, Rb, riders } (figures, banners, riders)
(function () {
  const S = window.SGS, T = THREE, BGU = THREE.BufferGeometryUtils;
  S.camp = function (L, HM, env, out) {
    const P = HM.parts, mat = HM.mat, { soldier, rider, trebuchet, ladder, crowd, banners, RED } = S.parts;
    const group = new T.Group(), { x0, x1, z0, z1 } = L.CAMP_R, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, GH = L.CAMP_GATE;
    const y = (x, z) => L.h(x, z), hearths = [];
    let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), eu = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), c3 = new T.Color();
    const WOOD = 0x5e4530, DARK = 0x3e2c1e, PLANK = 0x7a5c3e, SHINGLE = 0x4a3b2c, CLOTH = 0x8a7a5e;

    // instances of one geometry: [x, y, z, yaw, sx, sy, sz, pitch, roll, tint]. Every instanced mesh on the kit's
    // material carries instance colours (white by default): three r146 keeps one program per material and does not
    // recompile between meshes with and without them, so a mix would drop the tints (or the figures' shading)
    const inst = (geo, material, list, shadow = true) => {
      const m = new T.InstancedMesh(geo, material, list.length);
      list.forEach((p, i) => {
        m.setMatrixAt(i, m4.compose(v.set(p[0], p[1], p[2]), q.setFromEuler(eu.set(p[7] || 0, p[3] || 0, p[8] || 0, 'YXZ')), sc.set(p[4] ?? 1, p[5] ?? p[4] ?? 1, p[6] ?? p[4] ?? 1)));
        m.setColorAt(i, c3.setRGB(...(p[9] || [1, 1, 1])));
      });
      m.castShadow = shadow; m.receiveShadow = true; group.add(m); return m;
    };
    const one = (geo, x, z, yaw = 0, dy = 0, material = mat) => { const m = new T.Mesh(geo, material); m.position.set(x, y(x, z) + dy, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };
    // a convex polygon as triangles, turned to face `out`; flat() paints a triangle list
    const V3 = (a) => new T.Vector3(a[0], a[1], a[2]);
    const poly = (list, pts, o) => {
      const n = V3(pts[1]).sub(V3(pts[0])).cross(V3(pts[2]).sub(V3(pts[0]))), p = n.dot(V3(o)) < 0 ? [...pts].reverse() : pts;
      for (let i = 1; i < p.length - 1; i++) list.push(...p[0], ...p[i], ...p[i + 1]);
    };
    const flat = (list, hex) => P.paint(P.tris(list), hex);
    const hipRoof = (list, w, d, h, y0) => { // eaves w × d at y0, the ridge along the longer side
      if (d > w) { const l2 = []; hipRoof(l2, d, w, h, y0); for (let i = 0; i < l2.length; i += 3) list.push(-l2[i + 2], l2[i + 1], l2[i]); return; }
      const r = (w - d) / 2;
      poly(list, [[-w / 2, y0, d / 2], [w / 2, y0, d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]], [0, 1, 1]);
      poly(list, [[-w / 2, y0, -d / 2], [w / 2, y0, -d / 2], [r, y0 + h, 0], [-r, y0 + h, 0]], [0, 1, -1]);
      for (const sx of [-1, 1]) poly(list, [[sx * w / 2, y0, -d / 2], [sx * w / 2, y0, d / 2], [sx * r, y0 + h, 0]], [sx, 1, 0]);
    };
    const yawTo = (dx, dz) => Math.atan2(-dz, dx); // the yaw that turns a model's +x toward (dx, dz)
    // a cloth hip roof: each slope a small grid that sags between the ridge, the hip ropes and the eave (smooth shaded)
    const clothRoof = (w, d, h, y0, sag, hex, n = 6) => {
      if (d > w) return P.xf(clothRoof(d, w, h, y0, sag, hex, n), [0, 0, 0], [0, Math.PI / 2, 0]);
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
        const mid = (Math.floor(n / 2) * (n + 1) + Math.floor(n / 2)); if (g.attributes.normal.getY(mid) < 0) { for (let k = 0; k < idx.length; k += 3) { const tmp = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
        parts.push(P.paint(g, hex));
      }
      return BGU.mergeBufferGeometries(parts);
    };

    // ---------------------------------------------------------------- models (metres, +x forward)
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
    const horse = () => { // a standing horse, painted pale: the instance colour gives the coat
      const k = P.kit(), c = 0xa89c88, dk = 0x2a221c;
      k.add(P.rbox(1.9, 0.78, 0.62, 0.4), c, [0, 1.32, 0]);
      k.add(P.rbox(0.42, 0.85, 0.34, 0.35), c, [1.0, 1.62, 0], [0, 0, -0.95]);
      k.add(P.rbox(0.66, 0.27, 0.25, 0.35), c, [1.5, 1.72, 0], [0, 0, -1.15]);
      k.add(P.rbox(0.62, 0.1, 0.08, 0), dk, [0.92, 1.9, 0], [0, 0, -0.95]);
      for (const [x, z] of [[0.72, 0.19], [0.72, -0.19], [-0.72, 0.19], [-0.72, -0.19]]) k.add(P.rbox(0.13, 1.02, 0.13, 0), c, [x, 0.51, z]);
      k.add(P.rbox(0.12, 0.72, 0.1, 0), dk, [-1.02, 1.08, 0], [0, 0, -0.3]);
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
      const k = P.kit(), H = 7.4;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(P.rbox(0.36, H + 2.6, 0.36, 0), WOOD, [sx * 2.1, (H + 2.6) / 2 - 0.6, sz * 2.1]);
      for (const [lo, hi] of [[0, H / 2], [H / 2, H]]) for (let f = 0; f < 4; f++) {
        const ry = (f * Math.PI) / 2, len = Math.hypot(4.2, hi - lo), ang = Math.atan2(hi - lo, 4.2);
        for (const s2 of [-1, 1]) k.add(P.rbox(len, 0.16, 0.16, 0), DARK, [2.1 * Math.sin(ry), (lo + hi) / 2, 2.1 * Math.cos(ry)], [0, ry, s2 * ang]);
      }
      k.add(P.rbox(5.4, 0.3, 5.4, 0), PLANK, [0, H, 0]);
      for (let f = 0; f < 4; f++) { const ry = (f * Math.PI) / 2; k.add(P.rbox(5.4, 1.15, 0.14, 0), PLANK, [2.7 * Math.sin(ry), H + 0.72, 2.7 * Math.cos(ry)], [0, ry, 0]); }
      const rf = []; hipRoof(rf, 6.4, 6.4, 1.9, H + 2.0); k.push(flat(rf, SHINGLE));
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
      for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; k.add(P.rbox(0.32, 0.2, 0.26, 0.4), 0x6f6a60, [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], [0, a, 0]); }
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

    // ---------------------------------------------------------------- earthworks: sections swept round the rectangle
    // A side runs s ∈ [−(half + u), half + u] at outward offset u (so the corners mitre), broken at the gate (|s| < GH)
    // into two runs, each capped at the gate. Fixed samples every ~3 m keep the grid regular for every u.
    const SIDES = [
      { half: (x1 - x0) / 2, at: (s, u) => [cx + s, z0 - u], dir: [1, 0], n: [0, -1] },
      { half: (z1 - z0) / 2, at: (s, u) => [x1 + u, cz + s], dir: [0, 1], n: [1, 0] },
      { half: (x1 - x0) / 2, at: (s, u) => [cx - s, z1 + u], dir: [-1, 0], n: [0, 1] },
      { half: (z1 - z0) / 2, at: (s, u) => [x0 - u, cz - s], dir: [0, -1], n: [-1, 0] },
    ];
    const runs = (side) => {
      const hf = side.half, n = Math.ceil((hf - 7 - GH) / 3), A = [null], B = [];
      for (let k = 0; k <= n; k++) { A.push(-(hf - 7) + (k * (hf - 7 - GH)) / n); B.push(GH + (k * (hf - 7 - GH)) / n); }
      B.push(null); return [A, B];
    };
    const sweep = (prof, hex) => { // prof: [[u, h], …], points 1 → 2 are the top (or the floor): it must face up
      const parts = [];
      for (const side of SIDES) runs(side).forEach((list, ri) => {
        const pos = [], idx = [], M = prof.length, N = list.length;
        for (const s0 of list) for (const [u, hh] of prof) { const s = s0 === null ? (ri ? side.half + u : -(side.half + u)) : s0, [x, z] = side.at(s, u); pos.push(x, y(x, z) + hh, z); }
        for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j; idx.push(a, a + M, a + 1, a + 1, a + M, a + M + 1); }
        const at = (i) => V3(pos.slice(i * 3, i * 3 + 3)), a = M + 1, nrm = at(a + M).sub(at(a)).cross(at(a + 1).sub(at(a)));
        if (nrm.y < 0) for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        const capI = ri ? 0 : N - 1, o = ri ? [-side.dir[0], 0, -side.dir[1]] : [side.dir[0], 0, side.dir[1]], cap = [];
        const pts = prof.map((_, j) => pos.slice((capI * M + j) * 3, (capI * M + j) * 3 + 3));
        if (V3(pts[1]).sub(V3(pts[0])).cross(V3(pts[2]).sub(V3(pts[0]))).lengthSq() > 1e-6) poly(cap, pts, o);
        parts.push(P.paint(g, hex)); if (cap.length) parts.push(flat(cap, hex));
      });
      return BGU.mergeBufferGeometries(parts);
    };
    const earthMat = S.earthMaterial(env), E = [];
    E.push(sweep([[4.2, -0.6], [1.3, 3.2], [-1.5, 3.2], [-4.8, -0.6]], 0x7a6247));   // the rampart
    E.push(sweep([[5.5, 0.22], [7.3, -1.3], [11.1, -1.3], [12.9, 0.22]], 0x6e5a40)); // the ditch (the terrain is cut away over it)
    E.push(sweep([[12.5, -0.25], [14.8, 0.95], [16.8, 0.95], [19.5, -0.4]], 0x6e5a42)); // the spoil bank
    { const m = new T.Mesh(BGU.mergeBufferGeometries(E), earthMat); m.castShadow = m.receiveShadow = true; group.add(m); }
    { const w = new T.Mesh(sweep([[6.9, -0.8], [9.2, -0.8], [11.5, -0.8]], 0xffffff), new T.MeshStandardMaterial({ color: 0x33362a, roughness: 0.08, metalness: 0, envMap: env, envMapIntensity: 1.1 })); w.receiveShadow = true; group.add(w); }

    // the palisade: sharpened logs on the rampart's outer edge, two rails behind them
    const logG = (() => { const k = P.kit(); k.add(P.cyl(0.13, 0.15, 3.4, 5), 0x5a4330, [0, 1.7, 0]); k.add(P.cone(0.13, 0.5, 5), 0x6c5238, [0, 3.65, 0]); return k.geo(); })();
    const railG = new T.BoxGeometry(1, 0.14, 0.14), logs = [], rails = [];
    const along = (side, u, step, fn) => { // points along both halves of a side at offset u, every ~step, gate left open
      for (const sg of [-1, 1]) { const sA = side.half + u, n = Math.max(1, Math.floor((sA - GH) / step)); for (let i = 0; i <= n; i++) { const s = sg * (GH + (i * (sA - GH)) / n), [x, z] = side.at(s, u); fn(x, z, s, i, n); } }
    };
    const railsBetween = (pts, heights) => { for (let i = 0; i < pts.length - 1; i++) { const [xa, za] = pts[i], [xb, zb] = pts[i + 1], ya = y(xa, za), yb = y(xb, zb), len = Math.hypot(xb - xa, zb - za); if (len < 0.2) continue; for (const hh of heights) rails.push([(xa + xb) / 2, (ya + yb) / 2 + hh, (za + zb) / 2, yawTo(xb - xa, zb - za), len + 0.1, 1, 1, 0, Math.atan2(yb - ya, len)]); } };
    for (const side of SIDES) {
      along(side, 1.0, 0.34, (x, z) => logs.push([x, y(x, z) + 2.75, z, rnd() * 6, 1, 0.9 + rnd() * 0.2, 1, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05]));
      for (const sg of [-1, 1]) { const pts = []; along(side, 0.72, 3, (x, z, s) => { if (Math.sign(s) === sg) pts.push([x, z]); }); if (sg < 0) pts.reverse(); railsBetween(pts, [4.2, 5.6]); }
    }
    // the command enclosure's fence: lower logs, a gate to the north
    const CMD = { x0: 612, x1: 688, z0: 856, z1: 914 };
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
    inst(friseG, mat, frises);
    // watchtowers: the corners and two along each side, on the rampart; archers and a banner on each
    const wtG = watchTower(), towers = [];
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) towers.push([x, z, [x < cx ? -1 : 1, z < cz ? -1 : 1]]);
    for (const side of SIDES) for (const f of [-0.5, 0.5]) { const [x, z] = side.at(f * side.half, 0); towers.push([x, z, side.n]); }
    for (const [x, z, n] of towers) {
      const by = y(x, z) + 2.9; one(wtG, x, z, 0, 2.9);
      out.Rb.push([x - 2.3, by + 7.55, z - 2.3, 0]);
      for (const s2 of [-1, 1]) out.R.bow.push([x + n[0] * 1.4 + s2 * n[1] * 1.2, by + 7.55, z + n[1] * 1.4 - s2 * n[0] * 1.2, yawTo(n[0], n[1])]);
    }
    // sentries on the rampart walk, facing out
    for (const side of SIDES) along(side, -0.5, 22, (x, z, s, i) => { if (i % 2 === 0 && Math.abs(s) < side.half - 8) out.R.spear.push([x, y(x, z) + 3.2, z, yawTo(side.n[0], side.n[1]) + (rnd() - 0.5) * 0.5]); });

    // ---------------------------------------------------------------- streets: packed earth, a cross from the gates to the enclosure
    { const pos = [], idx = [], strip = (ax, az, bx, bz, hw) => { const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 4), tx = (bx - ax) / len, tz = (bz - az) / len, b = pos.length / 3;
        for (let i = 0; i <= n; i++) for (const s of [-1, -0.4, 0.4, 1]) { const x = ax + tx * (len * i) / n - tz * s * hw, z = az + tz * (len * i) / n + tx * s * hw; pos.push(x, y(x, z) + 0.12, z); }
        for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { const a = b + i * 4 + j; idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4); } };
      strip(cx, z0 - 20, cx, CMD.z0, 5.5); strip(cx, CMD.z1, cx, z1 + 20, 5.5); strip(x0 - 20, cz, CMD.x0, cz, 5.5); strip(CMD.x1, cz, x1 + 20, cz, 5.5);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(0) < 0) { for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; } g.setIndex(idx); g.computeVertexNormals(); }
      const col = new Float32Array(pos.length); for (let i = 0; i < pos.length / 3; i++) { const b = 0.85 + 0.25 * SGN.noise.vn2(pos[i * 3] / 3, pos[i * 3 + 2] / 3), e = (i % 4 === 0 || i % 4 === 3) ? 0.8 : 1; c3.set(0x9c8664).multiplyScalar(b * e); col.set([c3.r, c3.g, c3.b], i * 3); }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMap: env, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.receiveShadow = true; group.add(m); }

    // ---------------------------------------------------------------- the command enclosure (中軍)
    one(greatTent(), cx, 897, Math.PI, 0);
    const oT = wallTent(8, 6, 2.0, 2.8, 0x857660, 0x6e3e30, 0x2e1c14);
    for (const z of [868, 884, 900]) { one(oT, 622, z, Math.PI / 2); one(oT, 678, z, -Math.PI / 2); }
    const drum = jianGu(); one(drum, cx - 7.5, 852.5); one(drum, cx + 7.5, 852.5);
    const rk = rack(); one(rk, cx - 13, 882, 0); one(rk, cx + 13, 882, 0);
    out.Rb.push([cx - 5.5, y(cx, CMD.z0), CMD.z0 - 1.5, 0], [cx + 5.5, y(cx, CMD.z0), CMD.z0 - 1.5, 0]);
    const std = banners([[cx, y(cx, 879), 879, 0]], RED, '朱', 2.4); group.add(std);
    for (let z = 861; z < 881; z += 2.5) for (const sx of [-1, 1]) out.R.spear.push([cx + sx * 4.2, y(cx, z), z, sx < 0 ? 0 : Math.PI]);
    for (let i = 0; i < 6; i++) { const a = -0.4 + i * 0.16; out.R.spear.push([cx + Math.sin(a) * 6, y(cx, 884), 884 - Math.cos(a) * 2, -Math.PI / 2 + (rnd() - 0.5) * 0.3]); } // officers before the awning

    // ---------------------------------------------------------------- tent blocks, with their cooking fires
    const TENT = [ridgeTent(4.2, 3.3, 2.2, CLOTH)], tents = [], hearthPos = [], smallO = [], blockFlags = [];
    const ZONES = [[598, 643, 776, 850], [657, 750, 776, 850], [694, 816, 856, 878], [484, 606, 856, 878], [574, 643, 920, 996], [657, 718, 920, 996], [574, 606, 892, 914], [694, 718, 892, 914]];
    for (const [ax, bx, az, bz] of ZONES) {
      let rz = 0;
      for (let z = az + 2.2; z < bz - 1.8; ) {
        let kx = 0;
        for (let x = ax + 2.5; x < bx - 2.3; ) {
          if (rnd() > 0.12) {
            if (rnd() < 0.07) smallO.push([x, z]);
            else { // undyed hemp in a spread of tones, some tents of dark hide; a little out of line
              const hide = rnd() < 0.22, b = hide ? 0.55 + 0.15 * rnd() : 0.8 + 0.25 * rnd(), t = hide ? [b * 0.95, b * 0.8, b * 0.62] : [b, b * (0.94 + 0.05 * rnd()), b * (0.84 + 0.08 * rnd())];
              const jx = (rnd() - 0.5) * 0.7, jz = (rnd() - 0.5) * 0.7; tents.push([x + jx, y(x + jx, z + jz) - 0.05, z + jz, (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.12, 1, 1, 1, 0, 0, t]);
            }
          }
          x += 5.6; if (++kx % 5 === 0) { if (rz % 2 === 1 && x < bx - 3) { hearthPos.push([x - 0.3, z - 3.6]); if (rnd() < 0.5) blockFlags.push([x + 1.2, z - 2.2]); } x += 4.2; }
        }
        z += 6.2; if (++rz % 2 === 0) z += 3.2;
      }
    }
    inst(TENT[0], mat, tents);
    for (const [x, z] of blockFlags) out.Rb.push([x, y(x, z), z, 0]);
    inst(wallTent(6, 4.4, 1.6, 2.2, 0x94846a, 0x5e3e28, 0x2e1c14), mat, smallO.map(([x, z]) => [x, y(x, z), z, rnd() < 0.5 ? 0 : Math.PI]));
    const tri = tripod(), fires = [];
    for (const [x, z] of hearthPos) {
      fires.push([x, y(x, z), z, rnd() * 6]); hearths.push([x, y(x, z) + 0.1, z]);
      const n = 3 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, px = x + Math.cos(a) * 1.7, pz = z + Math.sin(a) * 1.7; out.R.spear.push([px, y(px, pz), pz, yawTo(x - px, z - pz)]); }
    }
    inst(tri, mat, fires);

    // ---------------------------------------------------------------- the horse lines (south-east)
    const posts = [], hr = { x0: 724, x1: 816, z0: 898, z1: 996 }, fencePts = [];
    ring(hr, 3, (x, z) => x === hr.x0 && Math.abs(z - cz - 30) < 4, (x, z) => { posts.push([x, y(x, z), z, 0]); });
    { const c = [[hr.x0, hr.z0], [hr.x1, hr.z0], [hr.x1, hr.z1], [hr.x0, hr.z1], [hr.x0, hr.z0]]; for (let k = 0; k < 4; k++) { const pts = []; const [ax, az] = c[k], [bx, bz] = c[k + 1], n = Math.round(Math.hypot(bx - ax, bz - az) / 3); for (let i = 0; i <= n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]); fencePts.push(pts); } }
    for (const pts of fencePts) railsBetween(pts, [0.6, 1.2]);
    const postG = P.paint(new T.BoxGeometry(0.18, 1.5, 0.18).translate(0, 0.75, 0), 0x4a3423);
    const horseG = horse(), horses = [], COATS = [[0.62, 0.38, 0.22], [0.8, 0.44, 0.24], [0.2, 0.18, 0.17], [1.05, 1.02, 0.98], [0.9, 0.74, 0.5], [0.42, 0.27, 0.17], [0.62, 0.38, 0.22], [0.42, 0.27, 0.17]];
    for (const lz of [918, 946, 974]) {
      for (let x = hr.x0 + 8; x < hr.x1 - 6; x += 6) posts.push([x, y(x, lz), lz, 0]);
      rails.push([(hr.x0 + hr.x1) / 2, y(cx, lz) + 1.3, lz, 0, hr.x1 - hr.x0 - 14, 0.4, 0.4]);
      for (const sz of [-1, 1]) for (let x = hr.x0 + 9; x < hr.x1 - 7; x += 2.9) if (rnd() < 0.7) { const z = lz + sz * 2.6; horses.push([x + (rnd() - 0.5) * 0.4, y(x, z), z, (sz < 0 ? -Math.PI / 2 : Math.PI / 2) + (rnd() - 0.5) * 0.3, 1, 1, 1, 0, 0, COATS[Math.floor(rnd() * COATS.length)]]); }
    }
    for (let i = 0; i < 9; i++) { const x = hr.x0 + 10 + rnd() * 70, z = hr.z0 + 6 + rnd() * 88; if (Math.abs(((z - 918) % 28 + 28) % 28 - 14) < 6) horses.push([x, y(x, z), z, rnd() * 6.28, 1, 1, 1, 0, 0, COATS[Math.floor(rnd() * COATS.length)]]); }
    inst(postG, mat, posts); inst(horseG, mat, horses);
    const hay = P.paint(P.blob(1, 3, 1), 0xb8964e), heaps = [];
    for (const [x, z] of [[730, 904], [730, 932], [730, 960], [810, 990], [796, 904], [812, 932]]) heaps.push([x, y(x, z) + 0.2, z, rnd() * 6, 2.2, 1.1, 1.6]);
    const trough = P.paint(P.rbox(6, 0.6, 0.9, 0), 0x5a4330), troughs = [];
    for (const lz of [932, 960]) troughs.push([hr.x0 + 30, y(hr.x0 + 30, lz), lz, 0], [hr.x0 + 62, y(hr.x0 + 62, lz), lz, 0]);
    inst(trough, mat, troughs.map((p) => [p[0], p[1] + 0.3, p[2], p[3]]));

    // ---------------------------------------------------------------- the supply depot (by the west gate)
    one(shed(46, 11, 4.2), 516, 904, 0);
    const sackG = P.paint(P.rbox(0.9, 0.44, 0.62, 0.45), 0xc4ae84), sacks = [];
    const pile = (px, pz, nx, nz, yaw) => { const ca = Math.cos(yaw), sa = Math.sin(yaw); for (let l = 0; l < 3; l++) for (let i = 0; i < nx - l; i++) for (let j = 0; j < nz - l; j++) { const lx = (i - (nx - l - 1) / 2) * 0.95, lz = (j - (nz - l - 1) / 2) * 0.66, x = px + lx * ca + lz * sa, z = pz - lx * sa + lz * ca; sacks.push([x, y(px, pz) + 0.22 + l * 0.42, z, yaw + (rnd() - 0.5) * 0.2, 1, 1, 1, 0, 0, [0.9 + rnd() * 0.15, 0.88 + rnd() * 0.12, 0.8 + rnd() * 0.12]]); } };
    for (let i = 0; i < 8; i++) pile(496 + i * 5.6, 904, 4, 6, 0);
    for (let i = 0; i < 10; i++) pile(498 + (i % 5) * 12, 922 + Math.floor(i / 5) * 10, 5, 4, (rnd() - 0.5) * 0.3);
    heaps.push(...[[548, 922], [560, 934], [548, 944]].map(([x, z]) => [x, y(x, z) + 0.3, z, rnd() * 6, 4.6, 2.4, 3.4]));
    inst(hay, mat, heaps);
    const cartS = cart('sacks'), cartC = cart('cover'), cartE = cart(''), carts = { s: [], c: [], e: [] };
    for (let i = 0; i < 16; i++) { const x = 494 + (i % 8) * 8.4, z = 962 + Math.floor(i / 8) * 13, k = i % 3 ? (i % 3 === 1 ? 's' : 'c') : 'e'; carts[k].push([x, y(x, z), z, Math.PI + (rnd() - 0.5) * 0.2]); }
    inst(cartS, mat, carts.s); inst(cartC, mat, carts.c); inst(cartE, mat, carts.e); inst(sackG, mat, sacks);
    const gran = P.xf(P.granary(0.09), [0, 0, 0], [0, 0, 0], [30, 30, 30]); one(gran, 500, 990); one(gran, 512, 990);
    for (let i = 0; i < 14; i++) { const x = 496 + rnd() * 66, z = 914 + rnd() * 70; out.R.pull.push([x, y(x, z), z, rnd() * 6.28]); }

    // ---------------------------------------------------------------- the engineers' yard (north-east)
    one(shed(18, 9, 4), 790, 784, 0);
    const logL = P.paint(new T.CylinderGeometry(0.28, 0.3, 8, 7).rotateZ(Math.PI / 2), 0x6a4c32), lying = [];
    for (const [px, pz] of [[768, 800], [768, 812], [806, 842]]) for (let l = 0; l < 3; l++) for (let i = 0; i < 5 - l; i++) lying.push([px, y(px, pz) + 0.3 + l * 0.5, pz + (i - (4 - l) / 2) * 0.6, (rnd() - 0.5) * 0.05]);
    inst(logL, mat, lying);
    one(trebuchet(HM), 790, 824, Math.PI / 2);
    const lad = ladder(HM, 12), lads = []; for (let i = 0; i < 4; i++) lads.push([776 + i * 1.3, y(776, 836) + 0.12, 836, 0, 1, 1, 1, 0, Math.PI / 2]);
    inst(lad, mat, lads);
    for (let i = 0; i < 12; i++) { const x = 772 + rnd() * 38, z = 798 + rnd() * 40; out.R.pull.push([x, y(x, z), z, rnd() * 6.28]); }

    // ---------------------------------------------------------------- the drill ground (north-west): the reviewing platform, a formation, archery
    { const k = P.kit(), px = 537, pz = 784, py = y(px, pz), rp = [];
      k.add(P.rbox(14, 4.2, 12, 0.03), 0x7a6247, [0, 1.5, 0]);
      poly(rp, [[-2.6, 3.55, 6], [2.6, 3.55, 6], [2.6, -0.4, 14], [-2.6, -0.4, 14]], [0, 1, 1]); for (const sx of [-1, 1]) poly(rp, [[sx * 2.6, 3.55, 6], [sx * 2.6, -0.4, 14], [sx * 2.6, -0.4, 6]], [sx, 0, 0]);
      k.push(flat(rp, 0x7a6247));
      const m = new T.Mesh(k.geo(), earthMat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; group.add(m);
      const c = P.kit(); for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(P.cyl(0.12, 0.14, 3.2, 6), 0x6a2a1e, [sx * 3.4, 3.6 + 1.6, sz * 2.8]);
      const rf = []; hipRoof(rf, 8.4, 7.2, 1.9, 6.8); c.push(flat(rf, 0x7a3a2e));
      const cm = new T.Mesh(c.geo(), mat); cm.position.set(px, py, pz); cm.castShadow = true; group.add(cm);
      one(drum, px + 5.2, pz - 3.8, 0, 3.6);
      out.Rb.push([px - 6.2, py + 3.6, pz + 5, 0], [px + 6.2, py + 3.6, pz + 5, 0]);
      for (let i = 0; i < 4; i++) out.R.spear.push([px - 1.8 + i * 1.2, py + 3.6, pz + 1.5, -Math.PI / 2]);
      const block = (bx, bz, cols, rows, spn, yaw) => { for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) { const x = bx + (c2 - (cols - 1) / 2) * spn + (rnd() - 0.5) * 0.2, z = bz + (r - (rows - 1) / 2) * spn + (rnd() - 0.5) * 0.2; out.R.spear.push([x, y(x, z), z, yaw]); } };
      block(517, 814, 12, 7, 1.5, Math.PI / 2); block(558, 814, 12, 7, 1.5, Math.PI / 2);
      out.Rb.push([517, y(517, 822), 822, 0], [558, y(558, 822), 822, 0]);
      const tg = target(), tgs = []; for (const z of [834, 839, 844]) { tgs.push([490, y(490, z), z, 0]); for (const dz of [-0.8, 0.8]) out.R.bow.push([532, y(532, z + dz), z + dz, Math.PI]); }
      inst(tg, mat, tgs); }

    // ---------------------------------------------------------------- people about the streets; riders coming in by the west gate
    for (let i = 0; i < 60; i++) {
      const ns = rnd() < 0.5, t = rnd(), sgn = rnd() < 0.5 ? -1 : 1;
      const x = ns ? cx + (rnd() - 0.5) * 8 : t < 0.5 ? x0 + 12 + rnd() * (CMD.x0 - x0 - 16) : CMD.x1 + 4 + rnd() * (x1 - CMD.x1 - 16);
      const z = ns ? (t < 0.5 ? z0 + 12 + rnd() * (CMD.z0 - z0 - 18) : CMD.z1 + 4 + rnd() * (z1 - CMD.z1 - 16)) : cz + (rnd() - 0.5) * 8;
      (rnd() < 0.15 ? out.R.run : out.R.spear).push([x, y(x, z), z, ns ? sgn * Math.PI / 2 : sgn < 0 ? Math.PI : 0]);
    }
    for (let i = 0; i < 12; i++) { const x = x0 - 32 - (i >> 1) * 5.5, z = cz + (i % 2 ? 1.6 : -1.6); out.riders.push([x, y(x, z), z, 0]); }
    inst(logG, mat, logs); inst(P.paint(railG, 0x4a3423), mat, rails); // the palisade, the enclosure fence, every rail
    return { group, hearths };
  };
})();
