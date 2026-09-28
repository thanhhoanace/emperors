// Crowd (src/world/crowd.js): soldiers and horses that move, for the battle scene at 1 unit = 1 m. Global `Crowd`.
// A figure is a small rig built from the model kit's parts (HM.parts: rbox, cyl, sph, lathe, cone, paint, xf):
// every part is fixed to one joint (hips → torso → head, upper and lower arms, the weapon in the hand, upper and lower
// legs; the horse: body, neck, head, four legs, tail; a rider is a horse with a seated man), a pose is the joints'
// angles, and the silhouette and colours follow the approved siege prototype (docs/design/prototypes/siege/sg-siege.js).
// Every animation loop is skinned on the CPU once into F frames (positions and normals) and written to a float
// DataTexture; the vertex shader reads frame floor(t) and frame + 1 by the vertex's `vid` and blends them, so thousands
// of figures are one InstancedMesh per body and LOD (fine within reach of the camera, light beyond, far past the shadow
// reach), each instance with its own loop, phase and speed. The material is HM.mat wrapped with its look() pass chained;
// shadows come from a MeshDepthMaterial that runs the same vertex animation. No float textures on the device → half
// float → static frame. Why: docs/design/visual-build.md §4 and decisions/0005 — 2,000 moving figures in ~12 draw calls
// and ≤ 1.5 M triangles with shadows. Tiers: high = fine within 150 m (at most 360 figures, nearest first), shadows to
// 150 m; mid = 80 m / 240, shadows to 120 m; low = light only, 4 frames per loop, no shadow casting. Instance colour =
// brightness 0.82–1.12 (seeded, no Math.random).
//   const crowd = Crowd.create({ HM, colors, q, renderer, frames? })   q: 'high' | 'mid' | 'low' or { tier } (default high);
//                           frames: 'float' | 'half' | 'static' forces the frame path (otherwise probed from the renderer)
//   crowd.add(kind, rows)   kind: spear | bow | run | climb | pull | idle | fight | rider | horse
//                           row: [x, y, z, yaw, anim?, phase?, fid?]  anim overrides the kind's loop, phase 0–1
//   crowd.group · crowd.tick(seconds) · crowd.focus(camera | Vector3) · crowd.count · crowd.stats() · crowd.dispose()
//   Pure helpers (tests): Crowd.KINDS, Crowd.ANIMS, Crowd.rig(HM.parts, body, lod), Crowd.pose(body, anim, t),
//   Crowd.bake(rig, body, tier), Crowd.layout(V, F), Crowd.tierOf(q)
(function () {
  const C = (window.Crowd = {});
  const T = THREE, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------------------------------------------------------------- kinds, bodies, loops
  // kind → [body, default loop]. Kinds that carry the same gear share a body (and so a mesh and a frame texture).
  C.KINDS = { spear: ['foot', 'walk'], run: ['foot', 'run'], idle: ['foot', 'idle'], fight: ['foot', 'fight'], bow: ['bow', 'bow'], climb: ['climb', 'climb'], pull: ['pull', 'pull'], rider: ['rider', 'trot'], horse: ['horse', 'stand'] };
  // body → loop → [frames, loops per second]; the first loop is the still pose of the static fallback
  C.ANIMS = {
    foot: { stand: [8, 0.2], walk: [12, 1.0], run: [12, 1.6], idle: [8, 0.28], fight: [8, 0.75] },
    bow: { stand: [8, 0.2], bow: [12, 0.45], idle: [8, 0.28], walk: [12, 1.0] },
    climb: { climb: [8, 0.8], idle: [8, 0.28] },
    pull: { pull: [8, 0.55], idle: [8, 0.28] },
    rider: { stand: [8, 0.3], trot: [12, 1.7], walk: [12, 0.9] },
    horse: { stand: [8, 0.3], walk: [12, 0.9], trot: [12, 1.7] },
  };
  C.tierOf = (q) => { const t = typeof q === 'string' ? q : q && q.tier; return t === 'low' || t === 'mid' ? t : 'high'; };
  // shadowReach: light figures cast a shadow only this close to the focus (beyond it a 2 m man is a few pixels and his
  // shadow pass doubled the crowd's triangles in the battle scene); past it they are drawn with the far LOD, without a
  // shadow (the light model there was a third of the battle's frame)
  const TIER = { high: { reach: 150, maxFine: 360, shadow: true, shadowReach: 150 }, mid: { reach: 80, maxFine: 240, shadow: true, shadowReach: 120 }, low: { reach: 0, maxFine: 0, shadow: false, shadowReach: 0 } };

  // palette (sRGB hex, the prototype's); parts with a tint weight take the instance's colour × weight instead
  const SKIN = 0xc79a74, DARK = 0x2a221d, BOOT = 0x1c1613, IRON = 0x4b4f55, STRAW = 0x8f7440, SHAFT = 0x4a3423, BLADE = 0x959aa1;
  const BOWWOOD = 0x3a2a1c, STRING = 0xd9c9a2, ROPE = 0x7a6a4a, BAY = 0x5a3a24, HOOF = 0x2a221c, MANE = 0x2a221c, TACK = 0x3a2a1c;
  const T_TUNIC = 1.0, T_LAMELLAR = 0.56, T_SHIELD = 0.32, T_QUIVER = 0.85, T_COAT = 1.0;
  // horse coats as the camp prototype paints them: a pale coat (sRGB) times a linear multiplier (bay, chestnut, black, grey, dun, brown)
  const PALE = 0xa89c88, COATS = [[0.62, 0.38, 0.22], [0.8, 0.44, 0.24], [0.2, 0.18, 0.17], [1.05, 1.02, 0.98], [0.9, 0.74, 0.5], [0.42, 0.27, 0.17], [0.62, 0.38, 0.22], [0.42, 0.27, 0.17]];
  const lcg = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

  // ---------------------------------------------------------------- rigs
  // A builder: bones in parent-first order (rest offsets from the parent), parts in the bone's own frame (the joint at
  // the origin, no rest rotation: a hanging limb is authored along −y). done() merges everything into one indexed
  // geometry with a `vid` attribute and the bone of every vertex. Facing +x, the right side is +z, feet at y = 0.
  const builder = (P, lod) => {
    const fine = lod === 'fine', far = lod === 'far', bones = [], names = {}, parts = []; // far: three-sided limbs, past the shadow reach
    const B = {
      fine, far, P,
      bone: (name, parent, x, y, z) => { names[name] = bones.length; bones.push({ name, parent: parent == null ? -1 : names[parent], pos: [x, y, z] }); },
      part: (bn, geo, hex, p, r, s, tint = 0) => {
        const g = P.xf(P.paint(geo, tint ? 0xffffff : hex), p || [0, 0, 0], r || [0, 0, 0], s || [1, 1, 1]), n = g.attributes.position.count;
        g.setAttribute('bone', new T.BufferAttribute(new Float32Array(n).fill(names[bn]), 1));
        g.setAttribute('tint', new T.BufferAttribute(new Float32Array(n).fill(tint), 1));
        parts.push(g);
      },
      cyl: (rt, rb, h) => P.cyl(rt, rb, h, fine ? 6 : far ? 3 : 4, far), // far: open (the ends hide in the joints)
      sph: (r) => P.sph(r, fine ? 6 : far ? 4 : 5, fine ? 4 : far ? 2 : 3),
      cone: (r, h) => P.cone(r, h, fine ? 6 : far ? 3 : 4),
      lathe: (pts, a = 6, b = 4) => P.lathe(pts, fine ? a : far ? Math.max(3, b - 1) : b),
      box: (w, h, d) => P.rbox(w, h, d, 0),
      done: () => {
        const BGU = T.BufferGeometryUtils;
        const g = BGU.mergeVertices(BGU.mergeBufferGeometries(parts), 1e-4), V = g.attributes.position.count, bone = new Int32Array(V), vid = new Float32Array(V);
        for (let i = 0; i < V; i++) { bone[i] = g.attributes.bone.getX(i); vid[i] = i; }
        g.deleteAttribute('bone'); g.setAttribute('vid', new T.BufferAttribute(vid, 1));
        return { bones, names, geo: g, bone, V, tris: g.index.count / 3 };
      },
    };
    return B;
  };
  // a man (≈ 1.85 tall): trousers and boots, the tunic's skirt, the lamellar coat, an iron helmet (or a straw hat)
  // o: { seated, hat, spear, shield, bow, rope } — the gear hangs on the hand and forearm bones
  const man = (B, parent, o) => {
    const y0 = o.seated ? 0.5 : 0.96, fine = B.fine, P = B.P; // seated: on the saddle (the body bone is the barrel's axis)
    B.bone('hips', parent, 0, y0, 0); B.bone('torso', 'hips', 0, 0.06, 0); B.bone('head', 'torso', 0, 0.5, 0);
    for (const [sd, z] of [['R', 1], ['L', -1]]) {
      B.bone('arm' + sd, 'torso', 0, 0.4, z * 0.27); B.bone('fore' + sd, 'arm' + sd, 0, -0.3, 0); B.bone('hand' + sd, 'fore' + sd, 0, -0.28, 0);
      B.bone('leg' + sd, 'hips', 0, -0.02, z * (o.seated ? 0.2 : 0.12)); B.bone('shin' + sd, 'leg' + sd, 0, -0.44, 0);
    }
    if (!o.seated) B.part('hips', B.lathe([[0, -0.24], [0.3, -0.24], [0.25, 0.06], [0, 0.08]]), 0, null, null, null, T_TUNIC);
    B.part('torso', B.lathe([[0, -0.04], [0.23, -0.04], [0.26, 0.28], [0.16, 0.46], [0, 0.48]]), 0, null, null, [0.85, 1, 1.15], T_LAMELLAR);
    B.part('head', B.sph(0.12), SKIN, [0.02, 0.1, 0]);
    B.part('head', B.cone(0.15, 0.2), o.hat === 'straw' ? STRAW : IRON, [0, 0.22, 0]);
    for (const sd of ['R', 'L']) {
      B.part('arm' + sd, B.cyl(0.055, 0.05, 0.32), 0, [0, -0.15, 0], null, null, T_TUNIC);
      if (fine) B.part('fore' + sd, B.sph(0.052), 0, null, null, null, T_TUNIC);
      B.part('fore' + sd, B.cyl(0.048, 0.042, 0.28), 0, [0, -0.14, 0], null, null, T_TUNIC);
      if (fine) B.part('hand' + sd, P.sph(0.045, 5, 3), SKIN, [0, -0.01, 0]);
      B.part('leg' + sd, B.cyl(0.075, 0.068, 0.46), DARK, [0, -0.22, 0]);
      if (fine) B.part('shin' + sd, B.sph(0.07), DARK);
      B.part('shin' + sd, B.cyl(0.066, 0.06, 0.44), DARK, [0, -0.22, 0]);
      if (!B.far) B.part('shin' + sd, B.box(0.24, 0.1, 0.13), BOOT, [0.05, -0.42, 0]);
    }
    if (o.spear) { // the grip half a metre from the butt, the blade 2.9 up the shaft
      B.part('handR', P.cyl(0.025, 0.025, 3.4, 3), SHAFT, [0, 1.2, 0]);
      B.part('handR', P.cone(0.035, 0.28, 4), BLADE, [0, 3.02, 0], null, [1, 1, 0.4]);
    }
    if (o.shield) { // on the left forearm, a boss facing out
      B.part('foreL', B.box(0.06, 0.95, 0.6), 0, [0.12, -0.14, -0.03], null, null, T_SHIELD);
      if (fine) B.part('foreL', P.cone(0.06, 0.05, 6), IRON, [0.16, -0.14, -0.03], [0, 0, -Math.PI / 2]);
    }
    if (o.bow) { // in the left hand: a flat arc (1.4 tall, 0.25 deep), the string toward the archer; a quiver on the back
      const arc = 0.444 * Math.PI;
      B.part('handL', new T.TorusGeometry(1.09, fine ? 0.025 : 0.02, 3, fine ? 10 : 6, arc), BOWWOOD, [0, 1.09, 0], [0, 0, -Math.PI / 2 - arc / 2]);
      B.part('handL', P.cyl(0.005, 0.005, 1.4, 3), STRING, [0, 0.255, 0], [0, 0, Math.PI / 2]);
      B.part('torso', B.box(0.12, 0.6, 0.12), 0, [-0.22, 0.2, 0.08], [0, 0, 0.35], null, T_QUIVER);
    }
    if (o.rope) B.part('handR', P.cyl(0.03, 0.03, 1.5, 4), ROPE, [0, -0.45, -0.13]); // through both hands, on ahead
  };
  // a horse (≈ 1.7 at the withers, the prototype's build): a barrel body, a raised neck, the head down-forward
  const horse = (B, o) => {
    const fine = B.fine, P = B.P, coat = o.coatTint ? 0 : BAY, tint = o.coatTint ? T_COAT : 0;
    B.bone('body', null, 0, 1.32, 0); B.bone('neck', 'body', 0.65, 0.05, 0); B.bone('hhead', 'neck', 0.69, 0.49, 0); B.bone('tail', 'body', -0.95, 0.22, 0);
    for (const [n, x, z] of [['FR', 0.72, 0.19], ['FL', 0.72, -0.19], ['HR', -0.72, 0.19], ['HL', -0.72, -0.19]]) { B.bone('leg' + n, 'body', x, -0.32, z); B.bone('cnn' + n, 'leg' + n, 0, -0.5, 0); }
    B.part('body', B.lathe([[0, -0.95], [0.28, -0.9], [0.36, -0.45], [0.38, 0.3], [0.33, 0.8], [0, 0.95]], 8, 5), coat, null, [0, 0, -Math.PI / 2], [1.1, 1, 0.84], tint);
    B.part('neck', B.cyl(0.16, 0.23, 0.9), coat, [0.345, 0.247, 0], [0, 0, -0.95], [1, 1, 0.8], tint);
    B.part('neck', B.box(0.1, 0.72, 0.07), MANE, [0.23, 0.42, 0], [0, 0, -0.95]); // the mane along the crest
    B.part('hhead', B.lathe([[0, -0.33], [0.11, -0.3], [0.13, 0.1], [0.1, 0.3], [0, 0.33]], 6, 4), coat, [0.14, -0.3, 0], [0, 0, 3.56], [1.15, 1.15, 0.95], tint);
    if (fine) for (const z of [-0.07, 0.07]) B.part('hhead', P.cone(0.03, 0.12, 4), coat, [-0.03, 0.1, z], null, null, tint);
    for (const n of ['FR', 'FL', 'HR', 'HL']) {
      B.part('leg' + n, B.cyl(0.075, 0.06, 0.52), coat, [0, -0.25, 0], null, null, tint);
      B.part('cnn' + n, B.cyl(0.055, 0.045, 0.46), coat, [0, -0.23, 0], null, null, tint);
      if (fine) B.part('cnn' + n, P.cyl(0.06, 0.07, 0.08, 6), HOOF, [0, -0.46, 0]);
    }
    B.part('tail', B.box(0.12, 0.72, 0.1), MANE, [-0.107, -0.344, 0], [0, 0, -0.3]);
    if (o.saddle) { B.part('body', B.box(0.9, 0.12, 0.8), 0, [0, 0.46, 0], null, null, T_TUNIC); B.part('body', B.box(0.5, 0.06, 0.86), TACK, [0, 0.36, 0]); }
  };
  C.rig = (P, body, lod) => {
    const B = builder(P, lod);
    if (body === 'foot') man(B, null, { spear: true, shield: true });
    else if (body === 'bow') man(B, null, { bow: true, hat: 'straw' });
    else if (body === 'climb') man(B, null, {});
    else if (body === 'pull') man(B, null, { rope: true });
    else if (body === 'horse') horse(B, { coatTint: true });
    else if (body === 'rider') { horse(B, { saddle: true }); man(B, 'body', { seated: true, spear: true }); }
    else throw new Error('Crowd: unknown body ' + body);
    return B.done();
  };

  // ---------------------------------------------------------------- poses (joint angles; a loop is t ∈ [0, 1))
  // K.J(bone, rx, ry, rz) rotation (x, then z, then y like the kit), K.T(bone, dx, dy, dz) offset, K.S(bone, s) scale.
  // rz > 0 swings a hanging limb forward (+x) and leans the torso forward; ry > 0 turns the right side forward.
  const L1 = 0.3, L2 = 0.28; // upper and lower arm
  // put a hand at (tx, ty, tz) from its shoulder (world-aligned axes; `twist` is the torso's ry to undo): the arm's plane
  // turns toward the target, a two-link solve in that plane bends the elbow forward. `tilt` (rad from vertical, in the
  // plane) points the hand's +y — the spear or the bow — after taking off the body's lean. Returns the in-plane angle.
  const reach = (K, sd, tx, ty, tz, twist = 0, tilt = null, lean = 0) => {
    const ct = cos(twist), st = sin(twist), x = tx * ct - tz * st, z = tx * st + tz * ct;
    const r = Math.hypot(x, z), ry = -Math.atan2(z, x), D = Math.min(Math.hypot(r, ty), L1 + L2 - 0.01);
    const e = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1)), bend = Math.PI - e;
    const up = Math.atan2(r, -ty) - Math.atan2(L2 * sin(bend), L1 + L2 * cos(bend));
    K.J('arm' + sd, 0, ry, up); K.J('fore' + sd, 0, 0, bend);
    if (tilt !== null) K.J('hand' + sd, 0, 0, tilt - lean - up - bend);
    return up + bend;
  };
  const swing = (K, sd, rz, bend) => { K.J('arm' + sd, 0, 0, rz); K.J('fore' + sd, 0, 0, bend); };
  // walking legs: the thigh swings ±A, the knee bends B on the way forward (most just before mid-swing, straight at the strike)
  const legs = (K, f, A, B) => {
    for (const [sd, ph] of [['R', 0], ['L', Math.PI]]) { const p = f + ph; K.J('leg' + sd, 0, 0, A * sin(p)); K.J('shin' + sd, 0, 0, -B * Math.pow(Math.max(0, cos(p + 0.6)), 1.3)); }
  };
  const gearArms = { foot: 'spear', bow: 'bow', climb: null, pull: 'rope' };
  const HUMAN = {
    stand: (t, K, g) => { // guard: still but breathing, the spear upright before the shoulder
      const f = TAU * t, s = sin(f);
      K.T('hips', 0, 0.004 * s, 0); K.J('torso', 0, 0, 0.02 + 0.012 * s); K.J('head', 0, 0.02 * s, -0.02);
      if (g === 'spear') { reach(K, 'R', 0.2, -0.38, 0.02, 0, 0, 0.02); swing(K, 'L', 0.05, 0.35); }
      else if (g === 'bow') { swing(K, 'L', 0.1, 0.2); swing(K, 'R', 0.05, 0.15); }
      else { swing(K, 'R', 0.05, 0.2); swing(K, 'L', 0.05, 0.2); }
    },
    idle: (t, K, g) => { // breathing, the weight shifting, a look about
      const f = TAU * t, s = sin(f), c = cos(f);
      K.T('hips', 0.01 * c, 0.006 * s, 0.02 * s); K.J('hips', 0, 0.03 * s, 0.01);
      K.J('torso', 0.01 * c, 0.05 * s, 0.03 + 0.015 * s); K.J('head', 0, 0.12 * sin(f + 1), 0.02 * c);
      K.J('legR', 0.02 * s, 0, -0.03); K.J('legL', 0.02 * s, 0, 0.03); K.J('shinR', 0, 0, -0.05); K.J('shinL', 0, 0, -0.04);
      if (g === 'spear') { reach(K, 'R', 0.12, -0.55, 0.03, 0, 0.05, 0.04); swing(K, 'L', 0.08 + 0.02 * s, 0.3); }
      else if (g === 'bow') { swing(K, 'L', 0.1, 0.25); swing(K, 'R', 0.05 + 0.03 * s, 0.2); }
      else if (g === 'rope') { reach(K, 'R', 0.32, -0.34 + 0.01 * s, -0.13, 0, Math.PI / 2, 0.03); reach(K, 'L', 0.32, -0.34 + 0.01 * s, 0.13, 0, null); } // the slack rope held level between hauls
      else { swing(K, 'R', 0.06 + 0.02 * s, 0.25); swing(K, 'L', 0.06 - 0.02 * s, 0.25); }
    },
    walk: (t, K, g) => { // the spear shouldered (hand low before the hip, the shaft over the shoulder), the free arm swings
      const f = TAU * t, s = sin(f);
      legs(K, f, 0.42, 0.9);
      K.T('hips', 0, -0.9 * (1 - cos(0.42 * Math.abs(s))) * 0.85, 0); K.J('hips', 0, 0.05 * s, 0.02);
      K.J('torso', 0, -0.07 * s, 0.03); K.J('head', 0, 0.03 * s, -0.03);
      if (g === 'spear') { reach(K, 'R', 0.17, -0.42, -0.03, 0, 0.35, 0.05); swing(K, 'L', 0.35 * s, 0.35); }
      else if (g === 'bow') { swing(K, 'R', -0.35 * s, 0.35); swing(K, 'L', 0.12, 0.2); }
      else { swing(K, 'R', -0.4 * s, 0.3); swing(K, 'L', 0.4 * s, 0.3); }
    },
    run: (t, K, g) => { // leaning, long strides, high knees; the spear low and pointed ahead
      const f = TAU * t, s = sin(f);
      legs(K, f, 0.75, 1.5);
      K.T('hips', 0, 0.02 * cos(2 * f) - 0.06, 0); K.J('hips', 0, 0.1 * s, 0.1);
      K.J('torso', 0, -0.15 * s, 0.22); K.J('head', 0, 0, -0.15);
      if (g === 'spear') { reach(K, 'R', 0.15, -0.3, -0.06, 0, -0.75, 0.32); swing(K, 'L', 0.7 * s - 0.1, 1.2); }
      else if (g === 'bow') { swing(K, 'R', -0.7 * s - 0.1, 1.2); reach(K, 'L', 0.2, -0.45, -0.06, 0, 0, 0.32); }
      else { swing(K, 'R', -0.7 * s - 0.1, 1.2); swing(K, 'L', 0.7 * s - 0.1, 1.2); }
    },
    fight: (t, K) => { // a thrust (the right foot lunges, the shoulders turn in) and a slower recovery
      const p = t < 0.3 ? ease(t / 0.3) : 1 - ease((t - 0.3) / 0.7), tw = 0.35 * p, lean = 0.12 + 0.18 * p;
      K.J('hips', 0, 0.15 * p, 0.05); K.T('hips', 0.05 * p, -0.05 - 0.08 * p, 0); K.J('torso', 0, tw, lean - 0.05); K.J('head', 0, -tw * 0.6, -0.1);
      K.J('legR', 0, 0, 0.35 + 0.35 * p); K.J('shinR', 0, 0, -(0.35 + 0.45 * p)); K.J('legL', 0, 0, -0.3 - 0.25 * p); K.J('shinL', 0, 0, -0.1);
      reach(K, 'R', 0.05 + 0.5 * p, -0.22 + 0.12 * p, -0.02 - 0.12 * p, tw, -1.25 - 0.2 * p, lean);
      reach(K, 'L', 0.28, -0.12, -0.12, tw, null);
    },
    pull: (t, K) => { // hauling a rope: leaning back, the hands drawn to the chest and reached out again, the legs braced
      const f = TAU * t, u = (1 - cos(f)) / 2, lean = -0.25 - 0.12 * u;
      K.T('hips', -0.08 * u, -0.06, 0); K.J('hips', 0, 0, -0.05); K.J('torso', 0, 0, lean + 0.05); K.J('head', 0, 0, 0.15);
      K.J('legR', 0, 0, 0.55 - 0.1 * u); K.J('shinR', 0, 0, -0.55 + 0.25 * u); K.J('legL', 0, 0, -0.45); K.J('shinL', 0, 0, -0.1);
      const hx = 0.55 - 0.32 * u, hy = -0.12 - 0.06 * u;
      reach(K, 'R', hx, hy, -0.13, 0, Math.PI / 2, lean); reach(K, 'L', hx, hy, 0.13, 0, null);
    },
    climb: (t, K) => { // up a ladder: the right hand rises with the left knee and the other way round
      const f = TAU * t, sR = sin(f), sL = -sR;
      K.T('hips', 0, 0.03 * sin(2 * f), 0); K.J('hips', 0, 0, 0.1); K.J('torso', 0, 0.05 * sR, 0.1); K.J('head', 0, 0, -0.4);
      reach(K, 'R', 0.28, 0.3 + 0.18 * sL, -0.04, 0, null); reach(K, 'L', 0.28, 0.3 + 0.18 * sR, 0.04, 0, null);
      K.J('legR', 0, 0, 0.7 + 0.45 * sR); K.J('shinR', 0, 0, -(0.85 + 0.55 * sR)); K.J('legL', 0, 0, 0.7 + 0.45 * sL); K.J('shinL', 0, 0, -(0.85 + 0.55 * sL));
    },
    bow: (t, K) => { // raise and draw to the cheek, hold, loose (the hand flies back), lower the bow, an arrow from the
      // quiver over the right shoulder, nock and raise again. Right-hand keys from the shoulder: string, cheek, loosed, quiver
      const tw = -0.45, S = [0.25, 0.04, -0.5], CH = [-0.08, 0.13, -0.16], LO = [-0.2, 0.08, -0.02], Q = [-0.2, 0.16, -0.12], NK = [0.28, -0.2, -0.4];
      const keys = [[0, S], [0.32, CH], [0.46, CH], [0.5, LO], [0.62, LO], [0.74, Q], [0.88, NK], [1, S]];
      let n = 0; while (n < keys.length - 2 && t >= keys[n + 1][0]) n++;
      const [t0, a] = keys[n], [t1, b] = keys[n + 1], k = ease((t - t0) / (t1 - t0));
      // the bow arm: up and aimed from the nock to the loose, lowered while the right hand fetches an arrow
      const raise = t < 0.52 ? 1 : t < 0.66 ? 1 - 0.75 * ease((t - 0.52) / 0.14) : t < 0.84 ? 0.25 : 0.25 + 0.75 * ease((t - 0.84) / 0.16);
      const draw = t < 0.32 ? ease(t / 0.32) : t < 0.5 ? 1 : 0;
      K.J('hips', 0, tw * 0.3, 0); K.J('torso', 0, tw - 0.08 * draw, 0.04 - 0.05 * draw); K.J('head', 0, -tw * 0.8, -0.05 + 0.1 * (1 - raise));
      K.J('legR', 0.05, 0, 0.1); K.J('legL', -0.05, 0, -0.1);
      reach(K, 'L', 0.46 - 0.14 * (1 - raise), -0.42 + 0.47 * raise, -0.05 - 0.08 * (1 - raise), tw, Math.PI / 2 - 0.35 * (1 - raise), 0.04);
      reach(K, 'R', a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, tw, null);
    },
  };
  // the horse's legs: thigh swing A, the front knee folds back and the hock forward by B on the way forward
  const horseLegs = (K, f, offs, A, B) => {
    for (const n of ['FR', 'FL', 'HR', 'HL']) { const p = f - TAU * offs[n], sw = Math.max(0, cos(p + 0.6)); K.J('leg' + n, 0, 0, A * sin(p)); K.J('cnn' + n, 0, 0, (n[0] === 'F' ? -B : B * 0.9) * sw); }
  };
  const HORSE = {
    stand: (t, K) => { const f = TAU * t, u = (1 - cos(f)) / 2; K.T('body', 0, 0.006 * sin(f), 0); K.J('neck', 0, 0, -0.18 * u); K.J('hhead', 0, 0.1 * sin(2 * f), -0.15 * u); K.J('tail', 0, 0.45 * sin(f), -0.05); K.J('legHL', 0, 0, 0.12); K.J('cnnHL', 0, 0, 0.25); },
    walk: (t, K) => { const f = TAU * t; horseLegs(K, f, { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 }, 0.32, 0.7); K.T('body', 0, 0.015 * cos(2 * f), 0); K.J('neck', 0, 0, -0.05 - 0.06 * sin(2 * f)); K.J('hhead', 0, 0, -0.05 * sin(2 * f)); K.J('tail', 0, 0.15 * sin(f), 0.05); },
    trot: (t, K) => { const f = TAU * t; horseLegs(K, f, { FL: 0, HR: 0, FR: 0.5, HL: 0.5 }, 0.45, 0.95); K.T('body', 0, 0.035 * cos(2 * f), 0); K.J('body', 0, 0, 0.02 * sin(2 * f)); K.J('neck', 0, 0, 0.03 * cos(2 * f)); K.J('tail', 0, 0.1 * sin(f), 0.25); },
  };
  // the man in the saddle: thighs out over the barrel, the spear up and forward, the left hand on the reins
  const seated = (K, f, post) => {
    K.J('hips', 0, 0, 0.02); K.J('torso', 0, 0.03 * sin(f), 0.05 + post); K.J('head', 0, 0, -0.05);
    K.J('legR', -0.55, 0, 1.0); K.J('shinR', 0, 0, -1.3); K.J('legL', 0.55, 0, 1.0); K.J('shinL', 0, 0, -1.3);
    reach(K, 'R', 0.14, -0.3, 0.05, 0, -0.9, 0.07 + post); reach(K, 'L', 0.36, -0.28, -0.14, 0, null);
  };
  const RIDER = {
    stand: (t, K) => { HORSE.stand(t, K); seated(K, TAU * t, 0); },
    walk: (t, K) => { HORSE.walk(t, K); seated(K, TAU * t, 0.02 * sin(2 * TAU * t)); },
    trot: (t, K) => { HORSE.trot(t, K); seated(K, TAU * t, 0.05 * cos(2 * TAU * t)); },
  };
  C.pose = (body, anim, t) => {
    const o = {}, K = { J: (n, rx, ry, rz) => { (o[n] || (o[n] = {})).r = [rx, ry, rz]; }, T: (n, dx, dy, dz) => { (o[n] || (o[n] = {})).p = [dx, dy, dz]; }, S: (n, s) => { (o[n] || (o[n] = {})).s = s; } };
    const fn = body === 'horse' ? HORSE[anim] : body === 'rider' ? RIDER[anim] : HUMAN[anim];
    if (!fn) throw new Error('Crowd: no loop ' + anim + ' for ' + body);
    fn(t, K, gearArms[body]);
    return o;
  };

  // ---------------------------------------------------------------- baking: forward kinematics, skinning, the frame texture
  const _E = new T.Euler(), _Q = new T.Quaternion(), _V = new T.Vector3(), _S = new T.Vector3(), _M = new T.Matrix4(), Z3 = [0, 0, 0];
  const fk = (rig, pose, out) => {
    for (let i = 0; i < rig.bones.length; i++) {
      const b = rig.bones[i], pp = pose[b.name], p = (pp && pp.p) || Z3, r = (pp && pp.r) || Z3, s = pp && pp.s !== undefined ? pp.s : 1;
      _E.set(r[0], r[1], r[2], 'YZX'); _Q.setFromEuler(_E); _V.set(b.pos[0] + p[0], b.pos[1] + p[1], b.pos[2] + p[2]); _S.setScalar(s); _M.compose(_V, _Q, _S);
      if (!out[i]) out[i] = new T.Matrix4();
      if (b.parent < 0) out[i].copy(_M); else out[i].multiplyMatrices(out[b.parent], _M);
    }
    return out;
  };
  // frame texture layout: the vertex `vid` sits at column vid mod W of row floor(vid / W); a frame takes R rows; the
  // F position frames come first, then the F normal frames. (W ≤ 2048 so every device holds it.)
  C.layout = (V, F) => { const W = Math.min(V, 2048), R = Math.ceil(V / W); return { W, R, H: 2 * F * R }; };
  C.bake = (rig, body, tier) => {
    const anims = C.ANIMS[body], rows = {}, names = [];
    let F = 0;
    for (const [name, [frames, speed]] of Object.entries(anims)) { const n = tier === 'low' ? 4 : frames; rows[name] = { row0: F, frames: n, speed }; names.push(name); F += n; }
    const { W, R, H } = C.layout(rig.V, F), data = new Float32Array(W * H * 4), pos = rig.geo.attributes.position, nrm = rig.geo.attributes.normal;
    const mats = [], v = new T.Vector3(), n = new T.Vector3(), m3 = new T.Matrix3();
    let radius = 0, minY = Infinity;
    for (const name of names) {
      const a = rows[name];
      for (let k = 0; k < a.frames; k++) {
        fk(rig, C.pose(body, name, k / a.frames), mats);
        const f = a.row0 + k;
        for (let i = 0; i < rig.V; i++) {
          const M = mats[rig.bone[i]], rowIn = Math.floor(i / W), col = i - rowIn * W, ip = ((f * R + rowIn) * W + col) * 4, iN = (((F + f) * R + rowIn) * W + col) * 4;
          v.fromBufferAttribute(pos, i).applyMatrix4(M);
          n.fromBufferAttribute(nrm, i).applyMatrix3(m3.setFromMatrix4(M)); const l = n.length(); if (l > 1e-6) n.divideScalar(l); else n.set(0, 0, 0);
          data[ip] = v.x; data[ip + 1] = v.y; data[ip + 2] = v.z; data[ip + 3] = 1;
          data[iN] = n.x; data[iN + 1] = n.y; data[iN + 2] = n.z; data[iN + 3] = 0;
          const d = v.length(); if (d > radius) radius = d; if (v.y < minY) minY = v.y;
        }
      }
    }
    return { data, W, H, R, F, rows, radius, minY };
  };
  // the static fallback: the body's first loop, frame 0, written into the geometry itself
  const freeze = (rig, bake) => {
    const pos = rig.geo.attributes.position, nrm = rig.geo.attributes.normal, W = bake.W;
    for (let i = 0; i < rig.V; i++) { const rowIn = Math.floor(i / W), col = i - rowIn * W, ip = (rowIn * W + col) * 4, iN = ((bake.F * bake.R + rowIn) * W + col) * 4; pos.setXYZ(i, bake.data[ip], bake.data[ip + 1], bake.data[ip + 2]); nrm.setXYZ(i, bake.data[iN], bake.data[iN + 1], bake.data[iN + 2]); }
    pos.needsUpdate = nrm.needsUpdate = true; rig.geo.computeBoundingSphere();
  };

  // ---------------------------------------------------------------- the GPU side: textures, the wrapped material, the depth material
  // what the device can sample in the vertex stage: float, half float, or nothing (→ static)
  const probe = (renderer) => {
    try {
      if (renderer) { const c = renderer.capabilities, x = renderer.extensions; return { vt: c.vertexTextures, float: c.isWebGL2 || x.has('OES_texture_float'), half: c.isWebGL2 || x.has('OES_texture_half_float') }; }
      if (typeof document === 'undefined') return { vt: false };
      const cv = document.createElement('canvas'), gl2 = cv.getContext('webgl2');
      if (gl2) return { vt: gl2.getParameter(gl2.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0, float: true, half: true };
      const gl = cv.getContext('webgl'); if (!gl) return { vt: false };
      return { vt: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0, float: !!gl.getExtension('OES_texture_float'), half: !!gl.getExtension('OES_texture_half_float') };
    } catch (e) { return { vt: false }; }
  };
  const modeOf = (g) => (!g.vt ? 'static' : g.float ? 'float' : g.half ? 'half' : 'static');
  const makeTexture = (bake, mode) => {
    let data = bake.data, type = T.FloatType;
    if (mode === 'half') { const h = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) h[i] = T.DataUtils.toHalfFloat(data[i]); data = h; type = T.HalfFloatType; }
    const tex = new T.DataTexture(data, bake.W, bake.H, T.RGBAFormat, type);
    tex.minFilter = tex.magFilter = T.NearestFilter; tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping; tex.generateMipmaps = false; tex.flipY = false; tex.needsUpdate = true;
    return tex;
  };
  const GLSL_PARS = `
    uniform highp sampler2D uFrames; uniform vec4 uFrameTex; uniform float uTime;
    attribute float vid; attribute vec4 aAnim; attribute vec3 aTint; attribute float tint;`;
  // uFrameTex = (1 / W, 1 / H, rows per frame, F); aAnim = (first row, frames in the loop, phase, loops per second)
  const GLSL_SAMPLE = `
    vec3 crowdFrame;
    vec4 crowdTexel(float frame, float nrm) {
      float w = 1.0 / uFrameTex.x, rowIn = floor((vid + 0.5) * uFrameTex.x), col = vid - rowIn * w;
      float row = (frame + nrm * uFrameTex.w) * uFrameTex.z + rowIn;
      return texture2D(uFrames, vec2((col + 0.5) * uFrameTex.x, (row + 0.5) * uFrameTex.y));
    }
    void crowdPick() {
      float f = fract(uTime * aAnim.w + aAnim.z) * aAnim.y, a = floor(f), b = a + 1.0;
      if (b > aAnim.y - 0.5) b = 0.0;
      crowdFrame = vec3(aAnim.x + a, aAnim.x + b, f - a);
    }`;
  const GLSL_POS = 'crowdPick(); vec3 transformed = mix(crowdTexel(crowdFrame.x, 0.0).xyz, crowdTexel(crowdFrame.y, 0.0).xyz, crowdFrame.z);';
  const GLSL_NRM = 'crowdPick(); vec3 objectNormal = normalize(mix(crowdTexel(crowdFrame.x, 1.0).xyz, crowdTexel(crowdFrame.y, 1.0).xyz, crowdFrame.z) + vec3(1e-6));';
  const GLSL_TINT = `
    #ifdef USE_INSTANCING_COLOR
      if (tint > 0.001) vColor.rgb = aTint * tint * instanceColor.rgb;
    #endif`;
  const animate = (sh, u, mode, withColor) => {
    sh.uniforms.uFrames = u.tex; sh.uniforms.uFrameTex = u.info; sh.uniforms.uTime = u.time;
    let v = sh.vertexShader.replace('#include <common>', '#include <common>' + GLSL_PARS + (mode === 'static' ? '' : GLSL_SAMPLE));
    if (mode !== 'static') v = v.replace('#include <beginnormal_vertex>', GLSL_NRM).replace('#include <begin_vertex>', GLSL_POS);
    if (withColor) v = v.replace('#include <color_vertex>', '#include <color_vertex>' + GLSL_TINT);
    sh.vertexShader = v;
  };
  // HM.mat cloned, its onBeforeCompile (the look pass) run first, ours after; one program for every crowd material
  const wrap = (base, u, mode) => {
    const m = base.clone(), orig = base.onBeforeCompile, origKey = base.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { orig.call(base, sh, r); animate(sh, u, mode, true); };
    m.customProgramCacheKey = () => 'crowd:' + mode + ':' + origKey.call(base);
    m.name = 'crowd';
    return m;
  };
  const depthOf = (u, mode) => {
    const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
    m.onBeforeCompile = (sh) => animate(sh, u, mode, false);
    m.customProgramCacheKey = () => 'crowd-depth:' + mode;
    return m;
  };

  // ---------------------------------------------------------------- the crowd
  C.create = function (o) {
    const HM = o.HM, P = HM.parts, tier = C.tierOf(o.q), TQ = TIER[tier], colors = o.colors || {}, fids = Object.keys(colors);
    const mode = ['float', 'half', 'static'].includes(o.frames) ? o.frames : modeOf(probe(o.renderer)), split = tier !== 'low' && TQ.shadow && TQ.shadowReach > 0;
    const lods = tier === 'low' ? ['light'] : split ? ['fine', 'light', 'far'] : ['fine', 'light'], hasFine = lods[0] === 'fine';
    const U = { time: { value: 0 } }, group = new T.Group(), rnd = lcg(11), bodies = {};
    const lin = (hex) => new T.Color(hex), defaultTint = lin(fids.length ? colors[fids[0]] : 0xb3262e), tints = {};
    for (const f of fids) tints[f] = lin(colors[f]);
    group.name = 'crowd';
    const m4 = new T.Matrix4(), q = new T.Quaternion(), v3 = new T.Vector3(), one = new T.Vector3(1, 1, 1), Y = new T.Vector3(0, 1, 0);
    let count = 0, focusAt = null, dirty = false;
    // a body: its rigs, textures and materials per lod, its instances and meshes
    const ensure = (body) => {
      if (bodies[body]) return bodies[body];
      const b = { body, inst: [], lod: {}, radius: 0 };
      for (const lod of lods) {
        const rig = C.rig(P, body, lod), bake = C.bake(rig, body, tier);
        const u = { tex: { value: null }, info: { value: new T.Vector4(1 / bake.W, 1 / bake.H, bake.R, bake.F) }, time: U.time };
        if (mode === 'static') freeze(rig, bake); else u.tex.value = makeTexture(bake, mode);
        b.lod[lod] = { rig, bake, u, mat: wrap(HM.mat, u, mode), depth: depthOf(u, mode), mesh: null, cap: 0, rows: bake.rows };
        b.radius = Math.max(b.radius, bake.radius + 0.3);
      }
      return (bodies[body] = b);
    };
    // an InstancedMesh at capacity `cap`: instance colours from the start (the kit material's program trap), our own
    // per-instance loop and tint attributes on a private copy of the rig's geometry
    const makeMesh = (b, lod, cap) => {
      const L = b.lod[lod];
      if (L.mesh) { group.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.dispose(); }
      const g = L.rig.geo.clone();
      g.setAttribute('aAnim', new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
      g.setAttribute('aTint', new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
      const m = new T.InstancedMesh(g, L.mat, cap);
      m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      m.customDepthMaterial = L.depth; m.castShadow = TQ.shadow && lod !== 'far'; m.receiveShadow = true; m.frustumCulled = true; m.count = 0;
      m.name = 'crowd:' + b.body + ':' + lod; m.userData.crowd = { body: b.body, lod };
      L.mesh = m; L.cap = cap; group.add(m);
      return m;
    };
    // write one mesh from a list of instances: matrices, brightness, loop, tint, bounds
    const write = (b, lod, list) => {
      const L = b.lod[lod], m = L.mesh, n = list.length;
      if (!m) return;
      const A = m.geometry.attributes.aAnim.array, K = m.geometry.attributes.aTint.array, Cc = m.instanceColor.array;
      const c = new T.Vector3(), lo = new T.Vector3(Infinity, Infinity, Infinity), hi = new T.Vector3(-Infinity, -Infinity, -Infinity);
      for (let i = 0; i < n; i++) {
        const s = list[i], a = L.rows[s.anim] || L.rows[Object.keys(L.rows)[0]];
        m.setMatrixAt(i, m4.compose(v3.set(s.x, s.y, s.z), q.setFromAxisAngle(Y, s.yaw), one));
        A[i * 4] = a.row0; A[i * 4 + 1] = a.frames; A[i * 4 + 2] = s.phase; A[i * 4 + 3] = a.speed * s.speed;
        K[i * 3] = s.tint.r; K[i * 3 + 1] = s.tint.g; K[i * 3 + 2] = s.tint.b;
        Cc[i * 3] = s.bright[0]; Cc[i * 3 + 1] = s.bright[1]; Cc[i * 3 + 2] = s.bright[2];
        lo.min(v3); hi.max(v3);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.geometry.attributes.aAnim.needsUpdate = true; m.geometry.attributes.aTint.needsUpdate = true;
      if (n) { c.addVectors(lo, hi).multiplyScalar(0.5); m.geometry.boundingSphere = new T.Sphere(c, c.distanceTo(hi) + b.radius); }
      else m.geometry.boundingSphere = new T.Sphere(new T.Vector3(), 1);
    };
    // the fine bucket: the figures within reach of the focus, nearest first, at most maxFine over all bodies (without a
    // focus: the first maxFine added); every body is rewritten, its fine ones to the fine mesh, the rest to the light one
    const flush = () => {
      if (!dirty) return;
      const all = Object.values(bodies), keep = new Set();
      if (hasFine) {
        const near = [], r2 = TQ.reach * TQ.reach;
        for (const b of all) for (const s of b.inst) { const d = focusAt ? (s.x - focusAt.x) ** 2 + (s.y - focusAt.y) ** 2 + (s.z - focusAt.z) ** 2 : s.order; if (!focusAt || d < r2) near.push([d, s]); }
        if (near.length > TQ.maxFine) near.sort((p, r) => p[0] - r[0]);
        for (let i = 0; i < Math.min(near.length, TQ.maxFine); i++) keep.add(near[i][1]);
      }
      for (const b of all) {
        const n = b.inst.length;
        for (const lod of lods) if (b.lod[lod].cap < n) makeMesh(b, lod, Math.max(n, b.lod[lod].cap * 2, 64));
        if (hasFine) write(b, 'fine', b.inst.filter((s) => keep.has(s)));
        const rest = hasFine ? b.inst.filter((s) => !keep.has(s)) : b.inst;
        if (!split) write(b, 'light', rest);
        else { // near light figures keep their shadow, far ones take the far LOD without one (no focus: all near)
          const sr2 = TQ.shadowReach * TQ.shadowReach, near = (s) => !focusAt || (s.x - focusAt.x) ** 2 + (s.y - focusAt.y) ** 2 + (s.z - focusAt.z) ** 2 < sr2;
          write(b, 'light', rest.filter(near)); write(b, 'far', rest.filter((s) => !near(s)));
        }
      }
      dirty = false;
    };
    const warned = {};
    const crowd = {
      group, tier, mode,
      add(kind, rows) {
        const K = C.KINDS[kind]; if (!K) throw new Error('Crowd: unknown kind ' + kind);
        const b = ensure(K[0]), anims = C.ANIMS[K[0]];
        for (const r of rows) {
          let anim = typeof r[4] === 'string' ? r[4] : K[1]; // callers' rows may carry other numbers there (a lean)
          if (!anims[anim]) { if (!warned[K[0] + anim]) { warned[K[0] + anim] = 1; console.warn('Crowd: ' + K[0] + ' has no loop ' + anim + ', using ' + K[1]); } anim = K[1]; }
          const bright = 0.82 + 0.3 * rnd(), warm = (rnd() - 0.5) * 0.04, tint = kind === 'horse' ? lin(PALE).multiply(new T.Color(...COATS[Math.floor(rnd() * COATS.length)])) : (r[6] && tints[r[6]]) || defaultTint;
          b.inst.push({ order: count++, x: r[0], y: r[1], z: r[2], yaw: r[3] || 0, anim, phase: r[5] !== undefined && r[5] !== null ? r[5] : rnd(), speed: 0.92 + 0.16 * rnd(), tint, bright: [bright * (1 + warm), bright, bright * (1 - warm)] });
        }
        dirty = true;
        return this;
      },
      // re-bucket only when the focus moved more than 4 m (a camera flying through calls this every frame)
      focus(cam) {
        const p = cam && cam.isObject3D ? cam.position : cam, v = p ? new T.Vector3(p.x !== undefined ? p.x : p[0], p.y !== undefined ? p.y : p[1], p.z !== undefined ? p.z : p[2]) : null;
        if (v && focusAt && v.distanceToSquared(focusAt) < 16) return;
        focusAt = v; dirty = true; flush();
      },
      tick(time) { U.time.value = time || 0; flush(); },
      get count() { return count; },
      stats() {
        let meshes = 0, frames = 0, bytes = 0, fineFigures = 0; const textures = [];
        for (const b of Object.values(bodies)) for (const lod of lods) { const L = b.lod[lod]; if (L.mesh) { meshes++; if (lod === 'fine') fineFigures += L.mesh.count; } frames += L.bake.F; const per = mode === 'half' ? 8 : mode === 'static' ? 0 : 16; bytes += L.bake.W * L.bake.H * per; textures.push({ body: b.body, lod, w: L.bake.W, h: L.bake.H, frames: L.bake.F, verts: L.rig.V, tris: L.rig.tris }); }
        return { figures: count, fineFigures, meshes, frames, mode, tier, texMB: +(bytes / 1048576).toFixed(2), textures };
      },
      dispose() {
        for (const b of Object.values(bodies)) for (const lod of lods) { const L = b.lod[lod]; if (L.mesh) { group.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.dispose(); } L.rig.geo.dispose(); L.mat.dispose(); L.depth.dispose(); if (L.u.tex.value) L.u.tex.value.dispose(); }
        for (const k of Object.keys(bodies)) delete bodies[k];
        count = 0;
      },
    };
    return crowd;
  };
})();
