// Crowd (src/world/crowd.js): soldiers and horses that move, for the battle scene at 1 unit = 1 m. Global `Crowd`.
// A figure is a small rig built from the model kit's parts (HM.parts: rbox, cyl, sph, lathe, cone, paint, xf):
// every part is fixed to one joint (hips → torso → head, upper and lower arms, the weapon or the shield in the hand,
// upper and lower legs; the horse: body, neck, head, four legs, tail; a rider is a horse with a seated man), a pose is
// the joints' angles, and the silhouette and colours follow the approved siege prototype (docs/design/prototypes/siege/sg-siege.js).
// Every animation loop is skinned on the CPU once into F frames (positions and normals) and written to a float
// DataTexture; the vertex shader reads frame floor(t) and frame + 1 by the vertex's `vid` and blends them, so thousands
// of figures are one instanced mesh per body and LOD (fine within reach of the camera, light beyond, far past the shadow
// reach). Everything a figure does is per-instance data read by the shader against the clock: where it goes (two chained
// moves: from, to, start, duration, easing, arc; the heading turns into the motion and settles on the final yaw) and
// what it plays (two loops and the time of the blend between them; a gait's frames advance with the distance covered,
// so the feet do not skate, and a one-shot loop like `die` holds its last frame). The CPU keeps each figure's queue of
// moves and loops and uploads the next pair only when one is due, so a whole charge, clash or rout is scheduled up front
// and costs no per-frame writes. The material is HM.mat wrapped with its look() pass chained; shadows come from a
// MeshDepthMaterial that runs the same vertex code. No float textures on the device → half float → static frame (the
// figures still move, as statues). Why: docs/design/visual-build.md §4 and decisions/0005 — 2,000 moving figures in
// ~12 draw calls and ≤ 1.5 M triangles with shadows. Tiers: high = fine within 150 m (at most 360 figures, nearest
// first), shadows to 150 m; mid = 80 m / 240, shadows to 120 m; low = light only, 4 frames per loop (6 for the
// three-blow strike and the volley, 5 for a fall), no shadow casting. Colour: brightness 0.82–1.12 per figure (seeded).
//   const crowd = Crowd.create({ HM, colors, q, renderer, frames? })   q: 'high' | 'mid' | 'low' or { tier } (default high);
//                           frames: 'float' | 'half' | 'static' forces the frame path (otherwise probed from the renderer)
//   const h = crowd.add(kind, rows)   kind: spear | bow | run | climb | pull | idle | fight | rider | horse
//                           row: [x, y, z, yaw, anim?, phase?, fid?]  anim overrides the kind's loop, phase 0–1
//                           → handle { kind, start, count } (figures start … start + count − 1 in the order added)
//   crowd.move(h, { to: rows | dx, dz, dy?, ground?, t0, dur, ease, stagger, arc, face, yaw, anim, then, blend })
//                           to: [x, y, z, yaw?] per figure (the caller gives y from its land) or an offset dx, dz (y from
//                           ground(x, z) if given, else dy). t0 (default crowd.time) and dur in seconds; stagger: each
//                           figure starts up to that many seconds late (seeded; the same delay as play() with the same
//                           stagger); ease: linear | smooth | in | out | march | charge | flee | [ramp up, ramp down];
//                           arc: metres of lift at mid-way; face: 'travel' (default: turn into the motion, then to the
//                           final yaw) | 'keep' (sidestep or back away still facing); yaw: final heading (default: the
//                           heading of travel, or the current one for a short step). anim: the loop while moving (a gait
//                           is paced by the distance), then: the loop on arrival (default: back to rest; false keeps it).
//                           Fallen figures (a held `die`) stay where they lie. A move replaces the figure's moves that
//                           start at or after its own start.
//   crowd.play(h, anim, { t0, stagger, blend, hold, phase, speed, dead })   switch loops with a blend (default 0.3 s);
//                           phase: every figure takes that phase at its start and runs at one speed (a volley in step);
//                           hold: true (play once, keep the last frame; the default for `die`) or a phase to stop at.
//   crowd.time · crowd.where(h, i) → [x, y, z, yaw] now · crowd.centre(h) → [x, y, z] · crowd.pick(h, fraction | fn)
//   → a handle of some of its figures (seeded) · crowd.alive(h) · crowd.pace(kind, anim) → metres per second of a gait
//   crowd.group · crowd.tick(seconds) · crowd.focus(camera | Vector3) · crowd.count · crowd.stats() · crowd.flush() · crowd.dispose()
//   Loops (Crowd.ANIMS): stand idle walk run fight · charge strike brace rout die cheer (men) · bow volley (archers) ·
//   climb · pull · trot (riders, horses). A loop a body lacks falls back (Crowd.resolve): brace → stand, volley → bow …
//   Pure helpers (tests): Crowd.KINDS, Crowd.ANIMS, Crowd.rig(HM.parts, body, lod), Crowd.pose(body, anim, t),
//   Crowd.bake(rig, body, tier), Crowd.layout(V, F), Crowd.tierOf(q), Crowd.ease(e, k), Crowd.easeCode(e, face),
//   Crowd.seg(segment, t), Crowd.hash(i, salt), Crowd.loopFrame(loop, t, clock), Crowd.resolve(body, anim),
//   Crowd.frameCount(body, tier), Crowd.stride(body, anim), Crowd.skeleton(body), Crowd.budget(tier, figures)
(function () {
  const C = (window.Crowd = {});
  const T = THREE, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, FAR = 1e6;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fract = (x) => x - Math.floor(x);

  // ---------------------------------------------------------------- kinds, bodies, loops
  // kind → [body, default loop]. Kinds that carry the same gear share a body (and so a mesh and a frame texture).
  C.KINDS = { spear: ['foot', 'walk'], run: ['foot', 'run'], idle: ['foot', 'idle'], fight: ['foot', 'fight'], bow: ['bow', 'bow'], climb: ['climb', 'climb'], pull: ['pull', 'pull'], rider: ['rider', 'trot'], horse: ['horse', 'stand'] };
  // body → loop → [frames, loops per second, flags, frames at low]; flags: 'go' a gait (its stride paces a move), 'once'
  // plays once and holds its last frame (baked end to end). A string names another loop whose frames it shares. The
  // first loop is the still pose of the static fallback.
  C.ANIMS = {
    foot: { stand: [8, 0.2], walk: [12, 1.0, 'go'], run: [12, 1.6, 'go'], idle: [8, 0.28], fight: [8, 0.75], charge: [12, 1.7, 'go'], strike: [18, 0.5, '', 6], brace: [8, 0.3], rout: [16, 0.8, 'go', 6], die: [16, 0.75, 'once', 5], cheer: [12, 0.8] },
    bow: { stand: [8, 0.2], bow: [12, 0.45], idle: [8, 0.28], walk: [12, 1.0, 'go'], run: [12, 1.6, 'go'], charge: 'run', volley: [16, 0.3, '', 6], rout: [16, 0.8, 'go', 6], die: [16, 0.75, 'once', 5], cheer: [12, 0.8] },
    climb: { climb: [8, 0.8], idle: [8, 0.28], die: [16, 0.75, 'once', 5], cheer: [12, 0.8] },
    pull: { pull: [8, 0.55], idle: [8, 0.28], rout: [16, 0.8, 'go', 6], die: [16, 0.75, 'once', 5], cheer: [12, 0.8] },
    rider: { stand: [8, 0.3], trot: [12, 1.7, 'go'], walk: [12, 0.9, 'go'], charge: [12, 1.9, 'go'], strike: [18, 0.45, '', 6], rout: [12, 1.9, 'go'], die: [16, 0.6, 'once', 7], cheer: [12, 0.55] },
    horse: { stand: [8, 0.3], walk: [12, 0.9, 'go'], trot: [12, 1.7, 'go'], charge: [12, 1.9, 'go'], rout: 'charge', die: [16, 0.6, 'once', 7] },
  };
  // the loop a body plays when it lacks the one asked for (then that one's fallback …, else the body's first loop)
  const FALL = { charge: 'run', rout: 'run', run: 'walk', walk: 'stand', strike: 'fight', fight: 'idle', brace: 'stand', volley: 'bow', bow: 'idle', cheer: 'idle', trot: 'walk', idle: 'stand', stand: 'idle', die: 'stand', climb: 'idle', pull: 'idle' };
  const REST = { foot: 'idle', bow: 'idle', climb: 'idle', pull: 'idle', rider: 'stand', horse: 'stand' }; // after a gait ends
  C.resolve = (body, anim) => {
    const A = C.ANIMS[body]; if (!A) throw new Error('Crowd: unknown body ' + body);
    for (let a = anim, n = 0; a && n < 8; a = FALL[a], n++) if (A[a] !== undefined) return a;
    return Object.keys(A)[0];
  };
  const spec = (body, anim) => { let s = C.ANIMS[body][anim]; while (typeof s === 'string') s = C.ANIMS[body][s]; return s; };
  const framesOf = (s, tier) => (tier === 'low' ? s[3] || 4 : s[0]);
  C.frameCount = (body, tier) => Object.values(C.ANIMS[body]).reduce((a, s) => a + (typeof s === 'string' ? 0 : framesOf(s, tier)), 0);
  C.tierOf = (q) => { const t = typeof q === 'string' ? q : q && q.tier; return t === 'low' || t === 'mid' ? t : 'high'; };
  // shadowReach: light figures cast a shadow only this close to the focus (beyond it a 2 m man is a few pixels and his
  // shadow pass doubled the crowd's triangles in the battle scene); past it they are drawn with the far LOD, without a
  // shadow (the light model there was a third of the battle's frame)
  const TIER = { high: { reach: 150, maxFine: 360, shadow: true, shadowReach: 150 }, mid: { reach: 80, maxFine: 240, shadow: true, shadowReach: 120 }, low: { reach: 0, maxFine: 0, shadow: false, shadowReach: 0 } };
  C.TIER = TIER;

  // palette (sRGB hex, the prototype's); parts with a tint weight take the instance's colour × weight instead
  const SKIN = 0xc79a74, DARK = 0x2a221d, BOOT = 0x1c1613, IRON = 0x4b4f55, STRAW = 0x8f7440, SHAFT = 0x4a3423, BLADE = 0x959aa1;
  const BOWWOOD = 0x3a2a1c, STRING = 0xd9c9a2, ROPE = 0x7a6a4a, BAY = 0x5a3a24, HOOF = 0x2a221c, MANE = 0x2a221c, TACK = 0x3a2a1c;
  const T_TUNIC = 1.0, T_LAMELLAR = 0.56, T_SHIELD = 0.32, T_QUIVER = 0.85, T_COAT = 1.0;
  // horse coats as the camp prototype paints them: a pale coat (sRGB) times a linear multiplier (bay, chestnut, black, grey, dun, brown)
  const PALE = 0xa89c88, COATS = [[0.62, 0.38, 0.22], [0.8, 0.44, 0.24], [0.2, 0.18, 0.17], [1.05, 1.02, 0.98], [0.9, 0.74, 0.5], [0.42, 0.27, 0.17], [0.62, 0.38, 0.22], [0.42, 0.27, 0.17]];
  const lcg = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  // a figure's own number in [0, 1): the delay of its stagger, its phase when none is given, its lot in pick()
  C.hash = (i, salt = 0) => { let h = Math.imul((i | 0) ^ Math.imul(salt + 0x9e37, 0x85ebca6b), 0xcc9e2d51); h ^= h >>> 15; h = Math.imul(h, 0x1b873593); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ---------------------------------------------------------------- rigs
  // A builder: bones in parent-first order (rest offsets from the parent), parts in the bone's own frame (the joint at
  // the origin, no rest rotation: a hanging limb is authored along −y). done() merges everything into one indexed
  // geometry with a `vid` attribute and the bone of every vertex. Facing +x, the right side is +z, feet at y = 0.
  // Without P (Crowd.skeleton) only the bones are made.
  const NOP = new Proxy({}, { get: () => () => null });
  const builder = (P, lod) => {
    const fine = lod === 'fine', far = lod === 'far', bones = [], names = {}, parts = [], bare = !P; // far: three-sided limbs, past the shadow reach
    const B = {
      fine, far, P: P || NOP,
      bone: (name, parent, x, y, z) => { names[name] = bones.length; bones.push({ name, parent: parent == null ? -1 : names[parent], pos: [x, y, z] }); },
      part: (bn, geo, hex, p, r, s, tint = 0) => {
        if (bare) return;
        const g = P.xf(P.paint(geo, tint ? 0xffffff : hex), p || [0, 0, 0], r || [0, 0, 0], s || [1, 1, 1]), n = g.attributes.position.count;
        g.setAttribute('bone', new T.BufferAttribute(new Float32Array(n).fill(names[bn]), 1));
        g.setAttribute('tint', new T.BufferAttribute(new Float32Array(n).fill(tint), 1));
        parts.push(g);
      },
      cyl: (rt, rb, h) => B.P.cyl(rt, rb, h, fine ? 6 : far ? 3 : 4, far), // far: open (the ends hide in the joints)
      sph: (r) => B.P.sph(r, fine ? 6 : far ? 4 : 5, fine ? 4 : far ? 2 : 3),
      cone: (r, h) => B.P.cone(r, h, fine ? 6 : far ? 3 : 4),
      lathe: (pts, a = 6, b = 4) => B.P.lathe(pts, fine ? a : far ? Math.max(3, b - 1) : b),
      box: (w, h, d) => B.P.rbox(w, h, d, 0),
      done: () => {
        if (bare) return { bones, names };
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
  // o: { seated, hat, spear, shield, bow, rope } — the weapon, the bow and the shield are held in the hands
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
    if (o.shield) { // gripped at its middle by the left hand, a boss facing out: a loop turns the hand to set the shield
      B.part('handL', B.box(0.06, 0.95, 0.6), 0, [0.1, 0.12, -0.02], null, null, T_SHIELD);
      if (fine) B.part('handL', P.cone(0.06, 0.05, 6), IRON, [0.14, 0.12, -0.02], [0, 0, -Math.PI / 2]);
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
  const build = (B, body) => {
    if (body === 'foot') man(B, null, { spear: true, shield: true });
    else if (body === 'bow') man(B, null, { bow: true, hat: 'straw' });
    else if (body === 'climb') man(B, null, {});
    else if (body === 'pull') man(B, null, { rope: true });
    else if (body === 'horse') horse(B, { coatTint: true });
    else if (body === 'rider') { horse(B, { saddle: true }); man(B, 'body', { seated: true, spear: true }); }
    else throw new Error('Crowd: unknown body ' + body);
    return B.done();
  };
  C.rig = (P, body, lod) => build(builder(P, lod), body);
  const skeletons = {};
  C.skeleton = (body) => skeletons[body] || (skeletons[body] = build(builder(null, 'light'), body));

  // ---------------------------------------------------------------- poses (joint angles; a loop is t ∈ [0, 1))
  // K.J(bone, rx, ry, rz) rotation (x, then z, then y like the kit), K.T(bone, dx, dy, dz) offset, K.S(bone, s) scale.
  // rz > 0 swings a hanging limb forward (+x) and tips the torso or the head back (it turns +y toward −x): a forward
  // lean is rz < 0. ry > 0 turns the right side forward; rx > 0 swings a hanging limb out to the left (−z).
  const L1 = 0.3, L2 = 0.28; // upper and lower arm
  // put a hand at (tx, ty, tz) from its shoulder (the body's axes; `twist` is the torso's ry to undo): the arm's plane
  // turns toward the target, a two-link solve in that plane bends the elbow forward. `tilt` (rad from vertical, in the
  // plane; −π/2 points ahead) sets the hand's +y — the spear, the bow's string side, the shield's height — after taking
  // off the hips' and torso's rz (`lean`). Returns the in-plane angle.
  // A free hand turns its plane toward the target. A hand holding something (tilt given) keeps its plane facing ahead,
  // turned out only as far as the target lies to the side of a point 0.15 m behind it, and swings back in it: a
  // target passing behind the shoulder would otherwise spin the plane round and mirror the weapon.
  const reach = (K, sd, tx, ty, tz, twist = 0, tilt = null, lean = 0) => {
    const ct = cos(twist), st = sin(twist), x = tx * ct - tz * st, z = tx * st + tz * ct, held = tilt !== null, phi = held ? Math.atan2(z, Math.abs(x) + 0.15) : Math.atan2(z, x);
    const r = held ? x * cos(phi) + z * sin(phi) : Math.hypot(x, z), ry = -phi, D = Math.min(Math.hypot(r, ty), L1 + L2 - 0.01);
    const e = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1)), bend = Math.PI - e;
    const up = Math.atan2(r, -ty) - Math.atan2(L2 * sin(bend), L1 + L2 * cos(bend));
    K.J('arm' + sd, 0, ry, up); K.J('fore' + sd, 0, 0, bend);
    if (tilt !== null) K.J('hand' + sd, 0, 0, tilt - lean - up - bend);
    return up + bend;
  };
  // an arm hanging and swinging (rx: thrown out to the side); `keep` (0–1) turns the hand back toward vertical (a
  // shield that stays upright)
  const swing = (K, sd, rz, bend, keep = 0, lean = 0, rx = 0) => { K.J('arm' + sd, rx, 0, rz); K.J('fore' + sd, 0, 0, bend); if (keep) K.J('hand' + sd, 0, 0, -(rz + bend + lean) * keep); };
  // walking legs: the thigh swings ±A, the knee bends B on the way forward (most just before mid-swing, straight at the strike)
  const legs = (K, f, A, B) => {
    for (const [sd, ph] of [['R', 0], ['L', Math.PI]]) { const p = f + ph; K.J('leg' + sd, 0, 0, A * sin(p)); K.J('shin' + sd, 0, 0, -B * Math.pow(Math.max(0, cos(p + 0.6)), 1.3)); }
  };
  // keyframed poses: keys [[t, fields], …], each key its fields over the base (keys) or over the key before (chain);
  // fields are numbers or number arrays, smoothstep between keys
  const keys = (base, list) => list.map(([t, o]) => [t, Object.assign({}, base, o)]);
  const chain = (base, list) => { let prev = base; return list.map(([t, o]) => [t, (prev = Object.assign({}, prev, o))]); };
  const kf = (t, K) => {
    let n = 0; while (n < K.length - 2 && t >= K[n + 1][0]) n++;
    const [t0, a] = K[n], [t1, b] = K[n + 1], k = ease(clamp((t - t0) / (t1 - t0 || 1), 0, 1)), o = {};
    for (const key in a) { const x = a[key], y = b[key]; o[key] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * k) : x + (y - x) * k; }
    return o;
  };
  // a man from a keyed pose: hips offset (hx, hy, hz) and rotation hr, torso tr, head hd, legs [rx, thigh, knee],
  // hands R / L as reach() targets [x, y, z, tilt] (from the shoulder) or swings [rz, bend, rx]
  const put = (K, p) => {
    K.T('hips', p.hx || 0, p.hy || 0, p.hz || 0); K.J('hips', ...p.hr); K.J('torso', ...p.tr); K.J('head', ...p.hd);
    for (const sd of ['R', 'L']) { const l = p['l' + sd]; K.J('leg' + sd, l[0], 0, l[1]); K.J('shin' + sd, 0, 0, l[2]); }
    const tw = p.hr[1] + p.tr[1], lean = p.hr[2] + p.tr[2];
    for (const sd of ['R', 'L']) { const a = p[sd]; if (!a) continue; if (a.length < 4) swing(K, sd, a[0], a[1], 0, 0, a[2] || 0); else reach(K, sd, a[0], a[1], a[2], tw, a[3], lean); }
  };
  const gearArms = { foot: 'spear', bow: 'bow', climb: null, pull: 'rope' };
  const N0 = { hx: 0, hy: 0, hz: 0, hr: [0, 0, 0], tr: [0, 0, 0], hd: [0, 0, 0], lR: [0, 0, 0], lL: [0, 0, 0] };

  // the three blows of `strike` (spear and shield; a left-foot-forward fighting stance): an overhand stab down, an
  // underhand lunge, a shield bash with a short jab — a line whose men are at different phases trades all three
  const STRIKE = keys({ ...N0, hy: -0.1, hr: [0, 0.3, -0.05], tr: [0, 0.12, -0.12], hd: [0, -0.3, 0.14], lR: [-0.05, -0.38, -0.18], lL: [0.04, 0.42, -0.5], R: [0.1, -0.32, 0.08, -1.3], L: [0.38, -0.2, 0.12, 0.05] }, [
    [0, {}],
    [0.11, { tr: [0, 0.45, 0.06], hd: [0, -0.5, 0.05], R: [-0.12, 0.2, 0.08, -2.05], hx: -0.06 }], // the spear raised overhand
    [0.18, { tr: [0, -0.2, -0.36], hd: [0, 0.05, 0.3], R: [0.45, 0.0, -0.1, -1.72], hx: 0.16, hy: -0.18, lL: [0.04, 0.7, -0.85], lR: [-0.05, -0.55, -0.1] }], // stab down
    [0.33, {}],
    [0.43, { tr: [0, 0.4, -0.05], R: [-0.18, -0.46, 0.12, -1.35], L: [0.3, -0.12, 0.05, 0.1] }], // drawn back to the hip
    [0.5, { hx: 0.24, hy: -0.24, tr: [0, -0.25, -0.38], hd: [0, 0.1, 0.34], R: [0.52, -0.2, -0.16, -1.47], L: [0.25, -0.2, -0.05, 0.1], lL: [0.04, 0.95, -1.05], lR: [-0.05, -0.62, -0.05] }], // lunge
    [0.66, {}],
    [0.75, { tr: [0, 0.35, -0.08], L: [0.2, -0.22, 0.1, 0.05] }], // the shield drawn in
    [0.81, { hx: 0.16, hy: -0.16, tr: [0, -0.3, -0.3], hd: [0, 0.15, 0.3], L: [0.56, -0.08, 0.02, -0.15], lL: [0.04, 0.7, -0.8] }], // bash
    [0.9, { hx: 0.12, hy: -0.14, tr: [0, 0.05, -0.25], R: [0.5, -0.25, -0.06, -1.42], L: [0.46, -0.12, 0.1, -0.05] }], // jab
    [1, {}],
  ]);
  // `brace` against a charge: down on the right knee, the shield set before the body on the ground, the spear's butt
  // back by the knee and its blade up at a rider's chest; a little breath and shift
  const BRACE = { ...N0, hx: 0.06, hy: -0.46, hr: [0, 0.18, -0.08], tr: [0, 0.1, -0.2], hd: [0, -0.12, 0.22], lR: [-0.08, -0.12, -1.42], lL: [0.02, 1.52, -1.52], R: [0.12, -0.5, 0.12, -1.08], L: [0.44, -0.3, 0.16, -0.06] };
  // `die`: struck (thrown back, arms out), the knees go, a twist and a fall onto the back, a small bounce, still
  const DIE = chain({ ...N0, R: [0.18, -0.4, 0.04, 0.05], L: [0.05, 0.3, 0] }, [
    [0, {}],
    [0.12, { hx: -0.06, tr: [0.12, 0.35, 0.38], hd: [0.1, 0.3, 0.35], R: [0.2, 0.12, 0.3, 0.75], L: [0.35, 0.7, 0.3], lR: [0, 0.12, -0.1] }], // struck
    [0.34, { hx: -0.04, hy: -0.34, hr: [0.1, 0.2, -0.1], tr: [0.1, 0.2, -0.45], hd: [0, 0.1, -0.35], R: [0.25, -0.18, 0.2, 1.15], L: [0.1, 0.25, 0.2], lR: [0, 0.9, -1.8], lL: [0, 0.8, -1.7] }], // the knees go
    [0.45, { hx: -0.12, hy: -0.45, hr: [0.25, 0.25, 0.4], tr: [0.1, 0.15, -0.2], lR: [0, 1.0, -1.1], lL: [0, 0.9, -0.9] }], // sitting back
    [0.56, { hx: -0.22, hy: -0.58, hr: [0.45, 0.3, 0.8], tr: [0.1, 0.1, 0], hd: [0, 0.3, -0.2], R: [0.15, 0.1, 0.45, 1.2], L: [0.3, 0.5, 0.7], lR: [-0.05, 0.55, -0.5], lL: [0.05, 0.5, -0.35] }], // toppling
    [0.76, { hx: -0.3, hy: -0.8, hr: [0.18, 0.3, 1.45], tr: [0.05, 0, 0.12], hd: [0, 0.45, 0.1], R: [0.05, 0.2, 0.5, 1.5], L: [0.1, 0.2, 1.1], lR: [-0.12, 0.35, -0.7], lL: [0.1, 0.1, -0.25] }], // down
    [0.86, { hy: -0.77, hr: [0.14, 0.3, 1.5], tr: [0.05, 0, 0.02] }], // the bounce
    [1, { hx: -0.3, hy: -0.8, hr: [0.12, 0.3, 1.52], tr: [0.04, 0, 0.04], hd: [0, 0.5, 0.05], R: [0.0, 0.25, 0.52, 1.55], L: [0.05, 0.15, 1.1], lR: [-0.14, 0.4, -0.85], lL: [0.12, 0.08, -0.2] }], // still
  ]);
  // the archers' volley: nocked with the bow low, raised to 35° and drawn to the ear together, held, loosed (the
  // string hand flies back), the bow lowered, a new arrow from the quiver, nocked again — in step when given one phase
  const VT = -0.5, EL = 0.62; // the archer's body turned side-on; the bow's elevation
  const VOLLEY = keys({ ...N0, hr: [0, VT * 0.35, 0], tr: [0, VT, 0], hd: [0, -VT * 0.8, -0.05], lR: [0.06, 0.05, -0.02], lL: [-0.06, -0.12, 0] }, [
    [0, { L: [0.4, -0.38, -0.08, Math.PI / 2 - 0.5], R: [0.22, -0.32, -0.36, null] }], // nocked, the bow held low
    [0.14, { L: [0.4, -0.3, -0.08, Math.PI / 2 - 0.35], R: [0.2, -0.24, -0.38, null] }],
    [0.3, { tr: [0, VT - 0.08, 0.1], hd: [0, -VT * 0.8, 0.28], L: [0.56 * cos(EL), 0.56 * sin(EL), -0.04, Math.PI / 2 + EL], R: [-0.06, 0.22, -0.16, null] }], // raised and drawn
    [0.4, { tr: [0, VT - 0.1, 0.12], hd: [0, -VT * 0.8, 0.3], L: [0.57 * cos(EL), 0.57 * sin(EL), -0.04, Math.PI / 2 + EL], R: [-0.1, 0.24, -0.15, null] }], // held
    [0.44, { tr: [0, VT - 0.14, 0.13], hd: [0, -VT * 0.8, 0.3], L: [0.56 * cos(EL + 0.05), 0.56 * sin(EL + 0.05), -0.04, Math.PI / 2 + EL + 0.05], R: [-0.28, 0.2, 0.02, null] }], // loose: the hand flies back
    [0.56, { tr: [0, VT - 0.05, 0.06], hd: [0, -VT * 0.8, 0.12], L: [0.5 * cos(EL - 0.2), 0.5 * sin(EL - 0.2), -0.05, Math.PI / 2 + EL - 0.2], R: [-0.24, 0.1, 0.0, null] }],
    [0.7, { tr: [0, VT, 0], hd: [0, -VT * 0.6, 0.0], L: [0.36, -0.36, -0.1, Math.PI / 2 - 0.55], R: [-0.2, 0.16, -0.12, null] }], // an arrow from the quiver
    [0.86, { hd: [0, -VT * 0.8, -0.08], L: [0.4, -0.4, -0.08, Math.PI / 2 - 0.5], R: [0.26, -0.3, -0.38, null] }], // nocking
    [1, { L: [0.4, -0.38, -0.08, Math.PI / 2 - 0.5], R: [0.22, -0.32, -0.36, null] }],
  ]);

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
      K.T('hips', 0, -0.9 * (1 - cos(0.42 * Math.abs(s))) * 0.85, 0); K.J('hips', 0, 0.05 * s, -0.02);
      K.J('torso', 0, -0.07 * s, -0.05); K.J('head', 0, 0.03 * s, 0.05);
      if (g === 'spear') { reach(K, 'R', 0.17, -0.42, -0.03, 0, 0.35, -0.07); swing(K, 'L', 0.35 * s, 0.35, 0.5, -0.07); }
      else if (g === 'bow') { swing(K, 'R', -0.35 * s, 0.35); swing(K, 'L', 0.12, 0.2); }
      else { swing(K, 'R', -0.4 * s, 0.3); swing(K, 'L', 0.4 * s, 0.3); }
    },
    run: (t, K, g) => { // leaning in, long strides, high knees; the spear low and pointed ahead
      const f = TAU * t, s = sin(f);
      legs(K, f, 0.75, 1.5);
      K.T('hips', 0, 0.02 * cos(2 * f) - 0.06, 0); K.J('hips', 0, 0.1 * s, -0.1);
      K.J('torso', 0, -0.15 * s, -0.2); K.J('head', 0, 0, 0.26);
      if (g === 'spear') { reach(K, 'R', 0.18, -0.34, -0.04, 0, -1.05, -0.3); swing(K, 'L', 0.6 * s - 0.05, 1.0, 0.75, -0.3); }
      else if (g === 'bow') { swing(K, 'R', -0.7 * s - 0.1, 1.2); reach(K, 'L', 0.22, -0.42, -0.06, 0, Math.PI / 2 - 0.9, -0.3); }
      else { swing(K, 'R', -0.7 * s - 0.1, 1.2); swing(K, 'L', 0.7 * s - 0.1, 1.2); }
    },
    fight: (t, K) => { // a thrust (the right foot lunges, the shoulders turn in) and a slower recovery
      const p = t < 0.3 ? ease(t / 0.3) : 1 - ease((t - 0.3) / 0.7), tw = 0.35 * p, lean = -(0.12 + 0.18 * p);
      K.J('hips', 0, 0.15 * p, -0.05); K.T('hips', 0.05 * p, -0.05 - 0.08 * p, 0); K.J('torso', 0, tw, lean + 0.05); K.J('head', 0, -tw * 0.6, 0.18);
      K.J('legR', 0, 0, 0.35 + 0.35 * p); K.J('shinR', 0, 0, -(0.35 + 0.45 * p)); K.J('legL', 0, 0, -0.3 - 0.25 * p); K.J('shinL', 0, 0, -0.1);
      reach(K, 'R', 0.05 + 0.5 * p, -0.22 + 0.12 * p, -0.02 - 0.12 * p, tw, -1.3 - 0.15 * p, lean);
      reach(K, 'L', 0.34, -0.16, 0.08, tw, 0, lean);
    },
    pull: (t, K) => { // hauling a rope: leaning back, the hands drawn to the chest and reached out again, the legs braced
      const f = TAU * t, u = (1 - cos(f)) / 2, lean = 0.22 + 0.14 * u;
      K.T('hips', -0.08 * u, -0.06, 0); K.J('hips', 0, 0, 0.05); K.J('torso', 0, 0, lean - 0.05); K.J('head', 0, 0, -0.18);
      K.J('legR', 0, 0, 0.55 - 0.1 * u); K.J('shinR', 0, 0, -0.55 + 0.25 * u); K.J('legL', 0, 0, -0.45); K.J('shinL', 0, 0, -0.1);
      const hx = 0.55 - 0.32 * u, hy = -0.12 - 0.06 * u;
      reach(K, 'R', hx, hy, -0.13, 0, Math.PI / 2, lean); reach(K, 'L', hx, hy, 0.13, 0, null);
    },
    climb: (t, K) => { // up a ladder: the right hand rises with the left knee and the other way round, the head up
      const f = TAU * t, sR = sin(f), sL = -sR;
      K.T('hips', 0, 0.03 * sin(2 * f), 0); K.J('hips', 0, 0, -0.08); K.J('torso', 0, 0.05 * sR, -0.06); K.J('head', 0, 0, 0.35);
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
    // the charge: a sprint bent into it, the spear couched at the hip and levelled at a man's chest, the shield up
    // before the face; the heavy rise and fall of the stride in the hips and shoulders
    charge: (t, K, g) => {
      const f = TAU * t, s = sin(f), c2 = cos(2 * f), lean = -0.44 + 0.04 * c2, tw = 0.06 * s;
      legs(K, f, 0.86, 1.7);
      K.T('hips', 0.03, 0.045 * c2 - 0.1, 0); K.J('hips', 0, 0.16 * s, -0.14); K.J('torso', 0.03 * s, tw - 0.16 * s, lean + 0.14); K.J('head', 0, -0.05 * s, 0.4);
      if (g === 'spear') { reach(K, 'R', 0.2, -0.46, 0.04, tw, -1.43 - 0.04 * c2, lean); reach(K, 'L', 0.44, -0.12, 0.2, tw, -0.12, lean); }
      else if (g === 'bow') { swing(K, 'R', -0.8 * s - 0.1, 1.3); reach(K, 'L', 0.24, -0.4, -0.06, tw, Math.PI / 2 - 1.0, lean); }
      else { swing(K, 'R', -0.8 * s - 0.1, 1.3); swing(K, 'L', 0.8 * s - 0.1, 1.3); }
    },
    strike: (t, K) => put(K, kf(t, STRIKE)),
    brace: (t, K) => { // shield and spear set; a breath, the spear point hunting a little
      const f = TAU * t, s = sin(f), p = { ...BRACE };
      p.tr = [0, 0.1 + 0.02 * s, -0.2 + 0.015 * cos(f)]; p.R = [0.12, -0.5 + 0.015 * s, 0.12, -1.08 + 0.03 * sin(f + 1)]; p.L = [0.44 + 0.01 * cos(f), -0.3, 0.16, -0.06];
      put(K, p);
    },
    // the rout: running for their lives, bent low and ragged, looking back over the shoulder, arms flung wide; the
    // spear trails behind at the full length of the arm, the shield swings loose
    rout: (t, K, g) => { // (two strides a loop, a glance back once a loop)
      const f = TAU * t, f2 = 2 * f, s = sin(f2), look = Math.pow(Math.max(0, sin(f + 0.6)), 3);
      legs(K, f2, 0.72 + 0.06 * sin(f), 1.55);
      const tw = 0.14 * s - 0.16 * s + 0.3 * look, lean = -0.12 - 0.3 + 0.05 * cos(2 * f2);
      K.T('hips', 0, 0.035 * cos(2 * f2) - 0.08, 0.02 * s); K.J('hips', 0.04 * s, 0.14 * s, -0.12);
      K.J('torso', 0.06 * s, -0.16 * s + 0.3 * look, lean + 0.12); K.J('head', 0, 1.0 * look, 0.3 - 0.12 * look);
      if (g === 'spear') { reach(K, 'R', -0.18 - 0.06 * s, -0.5, 0.05, tw, Math.PI / 2 + 0.1, lean); K.J('armL', 0.35, 0, 0.7 * s + 0.1); K.J('foreL', 0, 0, 0.9); K.J('handL', 0.2, 0, -0.4); }
      else if (g === 'bow') { K.J('armR', -0.35, 0, -0.8 * s); K.J('foreR', 0, 0, 1.0); reach(K, 'L', -0.08, -0.52, -0.08, tw, Math.PI / 2 + 1.2, lean); }
      else { K.J('armR', -0.4, 0, -0.9 * s + 0.1); K.J('foreR', 0, 0, 1.1); K.J('armL', 0.4, 0, 0.9 * s + 0.1); K.J('foreL', 0, 0, 1.1); if (g === 'rope') K.S('handR', 0.001); } // (a hauler drops his rope)
    },
    die: (t, K, g) => {
      const p = kf(t, DIE);
      if (g === 'bow') { const k = sstep(0.55, 0.76, t); p.hy += 0.12 * k; p.hr = [p.hr[0] + 0.35 * k, p.hr[1], p.hr[2]]; } // an archer comes to rest on his quiver, rolled half onto his side
      put(K, p);
      if (g === 'bow') K.J('handL', 0, 1.5 * sstep(0.45, 0.8, t), 0); // the bow laid flat
    },
    // the cheer: weapons thrust up and pumped, the head back, a bounce on the toes
    cheer: (t, K, g) => {
      const f = TAU * t, u = (1 - cos(f)) / 2, s = sin(f); // u: 0 low … 1 at full stretch
      K.T('hips', 0, 0.04 * u - 0.02, 0); K.J('hips', 0, 0.05 * s, 0.02); K.J('torso', 0.02 * s, 0.08 * s, 0.1 * u - 0.02); K.J('head', 0, 0.1 * s, 0.1 + 0.25 * u);
      K.J('legR', -0.04, 0, 0.05 - 0.1 * (1 - u)); K.J('shinR', 0, 0, -0.18 * (1 - u)); K.J('legL', 0.04, 0, -0.05 - 0.08 * (1 - u)); K.J('shinL', 0, 0, -0.15 * (1 - u));
      const lean = 0.12 * u;
      if (g === 'spear') { reach(K, 'R', 0.12, -0.02 + 0.52 * u, 0.1, 0, 0.35 - 0.45 * u, lean); reach(K, 'L', 0.28, -0.1 + 0.12 * u, -0.02, 0, 0.2 - 0.1 * u, lean); }
      else if (g === 'bow') { reach(K, 'L', 0.14, 0.2 + 0.36 * u, -0.05, 0, Math.PI / 2 + 0.3, lean); reach(K, 'R', 0.1, 0.02 + 0.5 * u, 0.08, 0, null); }
      else if (g === 'rope') { reach(K, 'R', 0.1, 0.05 + 0.5 * u, 0.1, 0, 0.3, lean); reach(K, 'L', 0.1, 0.02 + 0.45 * (1 - u), -0.1, 0, null); }
      else { reach(K, 'R', 0.1, 0.05 + 0.5 * u, 0.1, 0, null); reach(K, 'L', 0.1, 0.02 + 0.5 * (1 - u), -0.1, 0, null); }
    },
    volley: (t, K) => { const p = kf(t, VOLLEY); p.R = p.R.slice(0, 3).concat([null]); put(K, p); },
  };
  // the horse's legs: thigh swing A, the front knee folds back and the hock forward by B on the way forward
  const horseLegs = (K, f, offs, A, B) => {
    for (const n of ['FR', 'FL', 'HR', 'HL']) { const p = f - TAU * offs[n], sw = Math.max(0, cos(p + 0.6)); K.J('leg' + n, 0, 0, A * sin(p)); K.J('cnn' + n, 0, 0, (n[0] === 'F' ? -B : B * 0.9) * sw); }
  };
  // the gallop (transverse, leading right: HL, HR, FL, FR): each leg's stance is short and fast (the last third of its
  // cycle), the forward swing long with the leg folded; the forehand rocks up as the hinds drive, the neck reaches
  const gallopLegs = (K, t) => {
    const OFF = { HL: 0, HR: 0.1, FL: 0.4, FR: 0.5 };
    for (const n of Object.keys(OFF)) {
      const u = fract(t - OFF[n]), fr = n[0] === 'F', st = 0.34; // stance share
      const ph = u < 1 - st ? -Math.PI / 2 + (Math.PI * u) / (1 - st) : Math.PI / 2 + (Math.PI * (u - 1 + st)) / st; // swing forward, then back on the ground
      const A = fr ? 0.72 : 0.6, fold = Math.max(0, cos(ph)) * (u < 1 - st ? 1 : 0);
      K.J('leg' + n, 0, 0, A * sin(ph) + (fr ? 0.05 : -0.05)); K.J('cnn' + n, 0, 0, (fr ? -1.5 : 1.25) * Math.pow(fold, 0.8));
    }
  };
  const HORSE = {
    stand: (t, K) => { const f = TAU * t, u = (1 - cos(f)) / 2; K.T('body', 0, 0.006 * sin(f), 0); K.J('neck', 0, 0, -0.18 * u); K.J('hhead', 0, 0.1 * sin(2 * f), -0.15 * u); K.J('tail', 0, 0.45 * sin(f), -0.05); K.J('legHL', 0, 0, 0.12); K.J('cnnHL', 0, 0, 0.25); },
    walk: (t, K) => { const f = TAU * t; horseLegs(K, f, { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 }, 0.32, 0.7); K.T('body', 0, 0.015 * cos(2 * f), 0); K.J('neck', 0, 0, -0.05 - 0.06 * sin(2 * f)); K.J('hhead', 0, 0, -0.05 * sin(2 * f)); K.J('tail', 0, 0.15 * sin(f), 0.05); },
    trot: (t, K) => { const f = TAU * t; horseLegs(K, f, { FL: 0, HR: 0, FR: 0.5, HL: 0.5 }, 0.45, 0.95); K.T('body', 0, 0.035 * cos(2 * f), 0); K.J('body', 0, 0, 0.02 * sin(2 * f)); K.J('neck', 0, 0, 0.03 * cos(2 * f)); K.J('tail', 0, 0.1 * sin(f), 0.25); },
    charge: (t, K) => {
      const f = TAU * t, rock = sin(f - 0.9);
      gallopLegs(K, t);
      K.T('body', 0, 0.07 * cos(f - 0.4) - 0.04, 0); K.J('body', 0, 0, 0.09 * rock - 0.02);
      K.J('neck', 0, 0, -0.36 - 0.14 * rock); K.J('hhead', 0, 0, 0.3 + 0.12 * rock); K.J('tail', 0, 0.12 * sin(2 * f), 0.75 + 0.1 * rock);
    },
    // down: the forelegs buckle, the chest drops to the knees, the hinds fold, a roll onto the near side, legs out
    die: (t, K) => {
      const p = kf(t, HDIE);
      K.T('body', p.bx, p.by, 0); K.J('body', p.roll, 0, p.pitch); K.J('neck', 0, 0, p.neck); K.J('hhead', 0, 0, p.head); K.J('tail', 0, 0, p.tail);
      for (const n of ['FR', 'FL']) { K.J('leg' + n, 0, 0, p.fl); K.J('cnn' + n, 0, 0, p.fc); }
      for (const n of ['HR', 'HL']) { K.J('leg' + n, 0, 0, p.hl); K.J('cnn' + n, 0, 0, p.hc); }
    },
  };
  const HDIE = chain({ bx: 0, by: 0, roll: 0, pitch: 0, neck: 0, head: 0, tail: 0.1, fl: 0, fc: 0, hl: 0, hc: 0 }, [
    [0, {}],
    [0.14, { bx: 0.15, by: -0.2, pitch: -0.2, neck: -0.3, head: 0.1, fl: -0.4, fc: -1.2, tail: 0.5 }], // the stumble
    [0.36, { bx: 0.25, by: -0.4, pitch: -0.25, neck: -0.45, head: 0.25, fl: 0.12, fc: -1.44, hl: 0.2, hc: -0.85 }], // down on the knees, the quarters still up
    [0.47, { bx: 0.22, by: -0.62, roll: 0.15, pitch: -0.15, neck: -0.35, fl: 0.9, fc: -2.5, hl: 0.8, hc: -1.9 }], // the quarters going down
    [0.58, { bx: 0.2, by: -0.8, roll: 0.55, pitch: -0.05, neck: -0.25, head: 0.1, fl: 1.4, fc: -3.0, hl: 1.35, hc: -2.9 }], // on the chest, legs folded under, rolling
    [0.72, { bx: 0.14, by: -0.9, roll: 1.2, neck: -0.1, head: -0.05 }], // over, still folded
    [0.8, { bx: 0.1, by: -0.94, roll: 1.42, pitch: 0, neck: -0.05, head: -0.15, fl: 0.8, fc: -0.35, hl: -0.5, hc: 0.35, tail: 0.3 }], // over on the side, legs out
    [0.88, { by: -0.91, roll: 1.37 }],
    [1, { bx: 0.1, by: -0.94, roll: 1.4, pitch: 0.02, neck: 0.1, head: -0.25, fl: 0.75, fc: -0.3, hl: -0.45, hc: 0.3, tail: 0.25 }],
  ]);
  // the man in the saddle: thighs out over the barrel, the spear up and forward, the left hand on the reins
  const seated = (K, f, post) => {
    K.J('hips', 0, 0, 0.02); K.J('torso', 0, 0.03 * sin(f), 0.05 + post); K.J('head', 0, 0, -0.05);
    K.J('legR', -0.55, 0, 1.0); K.J('shinR', 0, 0, -1.3); K.J('legL', 0.55, 0, 1.0); K.J('shinL', 0, 0, -1.3);
    reach(K, 'R', 0.14, -0.3, 0.05, 0, -0.9, 0.07 + post); reach(K, 'L', 0.36, -0.28, -0.14, 0, null);
  };
  const saddleLegs = (K) => { K.J('legR', -0.55, 0, 1.0); K.J('shinR', 0, 0, -1.3); K.J('legL', 0.55, 0, 1.0); K.J('shinL', 0, 0, -1.3); };
  // the rider's three blows from the saddle at men on his right: a stab down, a thrust ahead and down, a backhand sweep
  const RSTRIKE = keys({ tw: -0.35, lean: -0.1, R: [0.2, -0.2, 0.22, -2.0], L: [0.36, -0.28, -0.14] }, [
    [0, {}],
    [0.12, { tw: -0.1, lean: 0.05, R: [0.0, 0.3, 0.25, -2.5] }], // raised overhand
    [0.2, { tw: -0.5, lean: -0.28, R: [0.35, -0.22, 0.35, -2.15] }], // down at a man on foot
    [0.33, {}],
    [0.44, { tw: 0.0, lean: 0.0, R: [-0.05, -0.2, 0.2, -1.8] }],
    [0.52, { tw: -0.25, lean: -0.35, R: [0.5, -0.25, 0.08, -1.95] }], // thrust ahead and down
    [0.66, {}],
    [0.76, { tw: 0.12, lean: -0.05, R: [0.12, 0.02, 0.0, -1.55] }], // drawn across for
    [0.89, { tw: -0.42, lean: -0.2, R: [0.25, -0.15, 0.38, -1.7] }], // the backhand sweep
    [1, {}],
  ]);
  // the rider's fall: struck and thrown back, pitched over the neck as the horse goes to its knees, then thrown clear
  // as it rolls and left on his back on the ground by its withers (the hips' last turn undoes the horse's roll)
  const RDIE = chain({ hx: 0, hy: 0, hz: 0, hr: [0, 0, 0.02], tw: 0, lean: 0.05, hd: -0.05, R: [0.14, -0.3, 0.05, -0.9], L: [0.36, -0.28, -0.14], lR: [-0.55, 1.0, -1.3], lL: [0.55, 1.0, -1.3] }, [
    [0, {}],
    [0.14, { lean: 0.35, hd: 0.35, R: [0.15, 0.2, 0.3, 0.2], L: [0.1, 0.2, -0.3] }], // struck, thrown back, the spear gone up
    [0.4, { lean: -0.5, hd: -0.3, R: [0.35, -0.45, 0.25, 1.4], L: [0.4, -0.45, -0.2] }], // pitched over the neck
    [0.62, { hy: 0.25, hz: 0.3, hr: [-0.8, 0.7, 0.1], lean: -0.1, hd: 0.2, lR: [-0.3, 0.6, -0.8], lL: [0.3, 0.5, -0.7] }], // thrown clear
    [0.8, { hx: -0.1, hy: 0.4, hz: 0.36, hr: [-1.567, 1.551, 0.171], tw: 0.1, lean: 0.05, hd: 0.3, R: [0.0, 0.25, 0.52, 0.0], L: [0.05, 0.3, -0.45], lR: [-0.15, 0.25, -0.3], lL: [0.12, 0.1, -0.2] }], // on the ground
    [0.88, { hy: 0.43 }],
    [1, { hy: 0.4, tw: 0.15, hd: 0.45 }],
  ]);
  const RIDER = {
    stand: (t, K) => { HORSE.stand(t, K); seated(K, TAU * t, 0); },
    walk: (t, K) => { HORSE.walk(t, K); seated(K, TAU * t, 0.02 * sin(2 * TAU * t)); },
    trot: (t, K) => { HORSE.trot(t, K); seated(K, TAU * t, 0.05 * cos(2 * TAU * t)); },
    // the charge: at the gallop, the rider low over the neck and the spear couched and levelled past the horse's head
    charge: (t, K) => {
      const f = TAU * t, rock = sin(f - 0.9), lean = -0.42 - 0.08 * rock;
      HORSE.charge(t, K);
      K.T('hips', 0.06, 0.02 * cos(f), 0); K.J('hips', 0, 0, -0.1); K.J('torso', 0, 0.05, lean + 0.1 - 0.09 * rock); K.J('head', 0, 0, 0.45 + 0.1 * rock); saddleLegs(K);
      reach(K, 'R', 0.22, -0.4, 0.08, 0.05, -1.5 - 0.09 * rock, lean - 0.09 * rock); reach(K, 'L', 0.46, -0.3, -0.12, 0.05, null);
    },
    // fighting from the saddle: the horse restless under him (a stamp, the head tossed), three blows
    strike: (t, K) => {
      const f = TAU * t, p = kf(t, RSTRIKE);
      HORSE.stand(t * 3 % 1, K); K.J('legFR', 0, 0, 0.35 * Math.max(0, sin(f * 3))); K.J('cnnFR', 0, 0, -0.9 * Math.max(0, sin(f * 3))); K.J('hhead', 0, 0.15 * sin(f * 3), -0.1);
      K.J('hips', 0, 0, 0.02); K.J('torso', 0, p.tw, p.lean); K.J('head', 0, -p.tw * 0.7, -0.05 - p.lean * 0.5); saddleLegs(K);
      reach(K, 'R', p.R[0], p.R[1], p.R[2], p.tw, p.R[3], p.lean); reach(K, 'L', p.L[0], p.L[1], p.L[2], p.tw, null);
    },
    // the rout: flat out, crouched over the neck, looking back, the spear trailing up and back
    rout: (t, K) => {
      const f = TAU * t, rock = sin(f - 0.9), look = Math.pow(Math.max(0, sin(f * 0.5)), 2);
      HORSE.charge(t, K);
      K.J('hips', 0, 0, -0.12); K.J('torso', 0.05, 0.6 * look, -0.5 - 0.06 * rock); K.J('head', 0, 0.9 * look, 0.5); saddleLegs(K);
      reach(K, 'R', -0.1, -0.35, 0.18, 0.6 * look, Math.PI / 2 - 0.55, -0.62); reach(K, 'L', 0.46, -0.32, -0.1, 0.6 * look, null);
    },
    die: (t, K) => {
      const p = kf(t, RDIE);
      HORSE.die(t, K); K.T('hips', p.hx, p.hy, p.hz); K.J('hips', ...p.hr); K.J('torso', 0.1 * p.tw, p.tw, p.lean); K.J('head', 0, 0.3 * p.tw, p.hd);
      K.J('legR', p.lR[0], 0, p.lR[1]); K.J('shinR', 0, 0, p.lR[2]); K.J('legL', p.lL[0], 0, p.lL[1]); K.J('shinL', 0, 0, p.lL[2]);
      reach(K, 'R', p.R[0], p.R[1], p.R[2], p.tw, p.R[3], p.lean); reach(K, 'L', p.L[0], p.L[1], p.L[2], p.tw, null);
    },
    // the cheer: the spear pumped high, the horse tossing its head and stamping
    cheer: (t, K) => {
      const f = TAU * t, u = (1 - cos(f)) / 2;
      HORSE.stand(t, K); K.J('neck', 0, 0, 0.12 * u); K.J('hhead', 0, 0.2 * sin(2 * f), 0.1 * u); K.J('legFL', 0, 0, 0.5 * Math.max(0, sin(2 * f))); K.J('cnnFL', 0, 0, -1.1 * Math.max(0, sin(2 * f)));
      K.J('hips', 0, 0, 0.02); K.J('torso', 0, 0.1 * sin(f), 0.12 * u); K.J('head', 0, 0, 0.15 + 0.2 * u); saddleLegs(K);
      reach(K, 'R', 0.1, 0.05 + 0.5 * u, 0.12, 0, 0.3 - 0.3 * u, 0.12 * u); reach(K, 'L', 0.36, -0.28, -0.14, 0, null);
    },
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
  // how far a gait carries the body in one loop: the planted feet (the lowest points of the loop) slide back under the
  // body at its ground speed, so their backward travel divided by the share of the loop they are down is the stride
  const FEET = { man: [['shinR', 0.05, -0.47, 0], ['shinL', 0.05, -0.47, 0]], horse: [['cnnFR', 0, -0.5, 0], ['cnnFL', 0, -0.5, 0], ['cnnHR', 0, -0.5, 0], ['cnnHL', 0, -0.5, 0]] };
  const strides = {};
  C.stride = (body, anim) => {
    const a = C.resolve(body, anim), key = body + ':' + a;
    if (strides[key] !== undefined) return strides[key];
    const sk = C.skeleton(body), feet = FEET[body === 'horse' || body === 'rider' ? 'horse' : 'man'], N = 96, mats = [], P = [], v = new T.Vector3();
    for (let k = 0; k < N; k++) { fk(sk, C.pose(body, a, k / N), mats); P.push(feet.map(([b, x, y, z]) => v.set(x, y, z).applyMatrix4(mats[sk.names[b]]).toArray())); }
    let minY = Infinity; for (const fr of P) for (const p of fr) minY = Math.min(minY, p[1]);
    let sum = 0, n = 0;
    feet.forEach((_, j) => {
      let back = 0, down = 0;
      for (let k = 0; k < N; k++) { const p = P[k][j], q = P[(k + 1) % N][j]; if (p[1] < minY + 0.06 && q[1] < minY + 0.06) { back += Math.max(0, p[0] - q[0]); down++; } }
      if (down >= 3) { sum += back / (down / N); n++; }
    });
    return (strides[key] = n ? sum / n : 0);
  };
  // metres per second of a gait at its own rate (a caller's duration for a distance: dur = distance / pace)
  C.pace = (kindOrBody, anim) => { const body = C.KINDS[kindOrBody] ? C.KINDS[kindOrBody][0] : kindOrBody, a = C.resolve(body, anim || (C.KINDS[kindOrBody] || [])[1] || 'walk'), s = spec(body, a); return C.stride(body, a) * s[1]; };
  // frame texture layout: the vertex `vid` sits at column vid mod W of row floor(vid / W); a frame takes R rows; the
  // F position frames come first, then the F normal frames. (W ≤ 2048 so every device holds it.)
  C.layout = (V, F) => { const W = Math.min(V, 2048), R = Math.ceil(V / W); return { W, R, H: 2 * F * R }; };
  C.bake = (rig, body, tier) => {
    const anims = C.ANIMS[body], rows = {}, names = [];
    let F = 0;
    for (const [name, s] of Object.entries(anims)) {
      if (typeof s === 'string') continue;
      const n = framesOf(s, tier), flags = s[2] || '';
      rows[name] = { name, row0: F, frames: n, speed: s[1], once: flags.includes('once'), go: flags.includes('go') }; names.push(name); F += n;
    }
    for (const [name, s] of Object.entries(anims)) if (typeof s === 'string') rows[name] = rows[C.resolve(body, s)];
    const { W, R, H } = C.layout(rig.V, F), data = new Float32Array(W * H * 4), pos = rig.geo.attributes.position, nrm = rig.geo.attributes.normal;
    const mats = [], v = new T.Vector3(), n = new T.Vector3(), m3 = new T.Matrix3();
    let radius = 0, minY = Infinity;
    for (const name of names) {
      const a = rows[name];
      for (let k = 0; k < a.frames; k++) {
        fk(rig, C.pose(body, name, a.once ? k / (a.frames - 1) : k / a.frames), mats); // a one-shot loop is baked end to end
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

  // ---------------------------------------------------------------- motion (the CPU mirror of the shader, pure)
  // ease: a trapezoid of speed — it rises over the first `up` of the time, holds, falls over the last `down`; the
  // position is its integral. A code packs it for the shader: ±(1 + round(up · 100) + down), negative: keep facing.
  C.EASES = { linear: [0, 0], smooth: [0.5, 0.5], in: [1, 0], out: [0, 1], march: [0.2, 0.25], charge: [0.45, 0], flee: [0.15, 0.1], halt: [0.1, 0.4] };
  C.easeCode = (e, face) => {
    let [a, b] = Array.isArray(e) ? e : C.EASES[e] || C.EASES.smooth;
    a = clamp(Math.round(a * 100) / 100, 0, 1); b = clamp(b, 0, Math.min(0.99, 1 - a));
    return (face === 'keep' ? -1 : 1) * (1 + Math.round(a * 100) + b);
  };
  C.ease = (e, k) => {
    const code = typeof e === 'number' ? e : C.easeCode(e), c = Math.abs(code) - 1, n = Math.floor(c + 0.001), a = n * 0.01, b = c - n, A = 1 - 0.5 * a - 0.5 * b;
    k = clamp(k, 0, 1);
    if (k < a) return (k * k) / (2 * a * A);
    if (k > 1 - b) { const r = 1 - k; return 1 - (r * r) / (2 * b * A); }
    return (k - 0.5 * a) / A;
  };
  const wrapPi = (x) => x - TAU * Math.floor((x + Math.PI) / TAU), turn = (a, b, t) => a + wrapPi(b - a) * t;
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  // a move segment { from: [x, y, z, yaw], to: [x, y, z, yaw], t0, dur, code, arc } at time t → { p, yaw, clock }; clock
  // is the eased time (a paced gait's frames follow it, so they advance with the ground covered)
  C.seg = (m, t) => {
    const el = t - m.t0, k = m.dur > 0 ? clamp(el / m.dur, 0, 1) : el >= 0 ? 1 : 0, e = C.ease(m.code, k), f = m.from, g = m.to;
    const dx = g[0] - f[0], dy = g[1] - f[1], dz = g[2] - f[2], dist = Math.hypot(dx, dz);
    const p = [f[0] + dx * e, f[1] + dy * e + m.arc * 4 * e * (1 - e), f[2] + dz * e];
    const face = (m.code >= 0 ? 1 : 0) * sstep(1, 3, dist), travel = dist > 1e-3 ? Math.atan2(-dz, dx) : g[3];
    const tIn = Math.min(0.45, 0.25 * m.dur) + 0.001, tOut = Math.min(0.6, 0.3 * m.dur) + 0.001;
    const yf = turn(turn(f[3], travel, sstep(0, tIn, el)), g[3], sstep(m.dur - tOut, m.dur, el));
    return { p, yaw: turn(turn(f[3], g[3], e), yf, face), clock: m.t0 + e * m.dur };
  };
  // a loop { row: { row0, frames, once }, off, rate, hold, paced } at time t (clock: the move's eased time) →
  // [frame, next frame, blend] as rows of the texture — what the shader samples
  C.loopFrame = (l, t, clock = t) => {
    const n = l.row.frames, once = l.row.once, c = l.paced ? clock : t;
    const f = l.hold > 0 ? clamp((c - l.off) * l.rate, 0, l.hold) * (once ? n - 1 : n) : fract(c * l.rate + l.off) * n;
    let i = Math.floor(f), j = i + 1; const w = f - i;
    if (once) { i = Math.min(i, n - 1); j = Math.min(j, n - 1); } else { i %= n; j %= n; }
    return [l.row.row0 + i, l.row.row0 + j, w];
  };
  // triangles and draw calls of the crowd at a tier with this many figures on the field (the worst case: the fine
  // bucket full, every light figure inside the shadow reach casting): what the budget test checks
  C.budget = (tier, figures, tris) => {
    const Q = TIER[C.tierOf(tier)], fine = Math.min(Q.maxFine, figures), rest = figures - fine, sh = Q.shadow ? 2 : 1;
    return { tris: Math.round(fine * tris.fine * sh + rest * tris.light * sh), calls: (Q.maxFine ? 2 : 1) * sh };
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
  // per instance: aLook (tint rgb, brightness); the move pair aFrom / aTo / aMove (start, duration, ease code, arc) and
  // aTo2 / aMove2 (the next move, from wherever the first is at its start); the loop pair aAnimA / aAnimB (first row,
  // ±frames — negative: one-shot —, phase offset or start time when held, loops per second) and aSwitch (B's start,
  // blend, A's and B's flags: hold phase + 2 when paced). 10 vertex attributes in all with vid, tint and color.
  const GLSL_PARS = `
    uniform highp sampler2D uFrames; uniform vec4 uFrameTex; uniform float uTime;
    attribute float vid; attribute float tint; attribute vec4 aLook;
    attribute vec4 aFrom; attribute vec4 aTo; attribute vec4 aMove; attribute vec4 aTo2; attribute vec4 aMove2;
    attribute vec4 aAnimA; attribute vec4 aAnimB; attribute vec4 aSwitch;
    vec3 cPos; vec2 cRot; float cClock;
    float crowdWrap(float a) { return a - 6.2831853 * floor((a + 3.1415927) / 6.2831853); }
    float crowdTurn(float a, float b, float t) { return a + crowdWrap(b - a) * t; }
    float crowdEase(float k, float code) {
      float c = abs(code) - 1.0, n = floor(c + 0.001), a = n * 0.01, b = c - n, A = 1.0 - 0.5 * a - 0.5 * b;
      if (k < a) return k * k / (2.0 * a * A);
      if (k > 1.0 - b) { float r = 1.0 - k; return 1.0 - r * r / (2.0 * b * A); }
      return (k - 0.5 * a) / A;
    }
    void crowdSeg(vec4 f, vec4 g, vec4 m, float time, out vec3 p, out float yaw, out float clock) {
      float el = time - m.x, k = m.y > 0.0 ? clamp(el / m.y, 0.0, 1.0) : step(0.0, el), e = crowdEase(k, m.z);
      vec3 d = g.xyz - f.xyz; float dist = length(d.xz);
      p = f.xyz + d * e; p.y += m.w * 4.0 * e * (1.0 - e);
      float face = step(0.0, m.z) * smoothstep(1.0, 3.0, dist), travel = dist > 0.001 ? atan(-d.z, d.x) : g.w;
      float tIn = min(0.45, 0.25 * m.y) + 0.001, tOut = min(0.6, 0.3 * m.y) + 0.001;
      float yf = crowdTurn(crowdTurn(f.w, travel, smoothstep(0.0, tIn, el)), g.w, smoothstep(m.y - tOut, m.y, el));
      yaw = crowdTurn(crowdTurn(f.w, g.w, e), yf, face);
      clock = m.x + e * m.y;
    }
    void crowdPlace() {
      vec3 p; float y; float c;
      crowdSeg(aFrom, aTo, aMove, uTime, p, y, c);
      if (uTime >= aMove2.x) { vec3 p0; float y0; float c0; crowdSeg(aFrom, aTo, aMove, aMove2.x, p0, y0, c0); crowdSeg(vec4(p0, y0), aTo2, aMove2, uTime, p, y, c); }
      cPos = p; cRot = vec2(cos(y), sin(y)); cClock = c;
    }
    vec3 crowdRot(vec3 v) { return vec3(v.x * cRot.x + v.z * cRot.y, v.y, v.z * cRot.x - v.x * cRot.y); }`;
  // uFrameTex = (1 / W, 1 / H, rows per frame, F)
  const GLSL_SAMPLE = `
    vec3 crowdTexel(float frame, float nrm) {
      float w = 1.0 / uFrameTex.x, rowIn = floor((vid + 0.5) * uFrameTex.x), col = vid - rowIn * w;
      float row = (frame + nrm * uFrameTex.w) * uFrameTex.z + rowIn;
      return texture2D(uFrames, vec2((col + 0.5) * uFrameTex.x, (row + 0.5) * uFrameTex.y)).xyz;
    }
    vec3 crowdLoop(vec4 a, float flags) {
      float paced = step(1.5, flags), hold = flags - 2.0 * paced, clock = paced > 0.5 ? cClock : uTime;
      float n = abs(a.y), once = step(a.y, 0.0), f;
      if (hold > 0.0) f = clamp((clock - a.z) * a.w, 0.0, hold) * (n - once); else f = fract(clock * a.w + a.z) * n;
      float i = floor(f), w = f - i, j = i + 1.0;
      if (once > 0.5) { i = min(i, n - 1.0); j = min(j, n - 1.0); } else { i = mod(i, n); j = mod(j, n); }
      return vec3(a.x + i, a.x + j, w);
    }
    vec3 crowdSample(float nrm) {
      float w = aSwitch.y > 0.0 ? smoothstep(aSwitch.x, aSwitch.x + aSwitch.y, uTime) : step(aSwitch.x, uTime);
      vec3 r = vec3(0.0);
      if (w < 0.999) { vec3 fa = crowdLoop(aAnimA, aSwitch.z); r += (1.0 - w) * mix(crowdTexel(fa.x, nrm), crowdTexel(fa.y, nrm), fa.z); }
      if (w > 0.001) { vec3 fb = crowdLoop(aAnimB, aSwitch.w); r += w * mix(crowdTexel(fb.x, nrm), crowdTexel(fb.y, nrm), fb.z); }
      return r;
    }`;
  const GLSL_TINT = `
    #ifdef USE_COLOR
      vColor.rgb = (tint > 0.001 ? aLook.rgb * tint : vColor.rgb) * aLook.w * vec3(1.0 + (fract(aLook.w * 37.0) - 0.5) * 0.04, 1.0, 1.0 - (fract(aLook.w * 37.0) - 0.5) * 0.04);
    #endif`;
  const animate = (sh, u, mode, main) => {
    const st = mode === 'static';
    sh.uniforms.uFrames = u.tex; sh.uniforms.uFrameTex = u.info; sh.uniforms.uTime = u.time;
    let v = sh.vertexShader.replace('#include <common>', '#include <common>' + GLSL_PARS + (st ? '' : GLSL_SAMPLE));
    const pos = st ? 'crowdRot(position)' : 'crowdRot(crowdSample(0.0))', nrm = st ? 'crowdRot(normal)' : 'crowdRot(normalize(crowdSample(1.0) + vec3(1e-6)))';
    if (main) v = v.replace('#include <beginnormal_vertex>', 'crowdPlace(); vec3 objectNormal = ' + nrm + ';').replace('#include <begin_vertex>', 'vec3 transformed = ' + pos + ' + cPos;').replace('#include <color_vertex>', '#include <color_vertex>' + GLSL_TINT);
    else v = v.replace('#include <begin_vertex>', 'crowdPlace(); vec3 transformed = ' + pos + ' + cPos;');
    sh.vertexShader = v;
  };
  // HM.mat cloned, its onBeforeCompile (the look pass) run first, ours after; one program for every crowd material
  const wrap = (base, u, mode) => {
    const m = base.clone(), orig = base.onBeforeCompile, origKey = base.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { orig.call(base, sh, r); animate(sh, u, mode, true); };
    m.customProgramCacheKey = () => 'crowd2:' + mode + ':' + origKey.call(base);
    m.name = 'crowd';
    return m;
  };
  const depthOf = (u, mode) => {
    const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
    m.onBeforeCompile = (sh) => animate(sh, u, mode, false);
    m.customProgramCacheKey = () => 'crowd2-depth:' + mode;
    return m;
  };
  // rigs, bakes and frame textures are shared by every crowd made from the same kit (a battle makes one per side)
  const SHARED = new WeakMap();
  const shared = (P, body, lod, tier, mode) => {
    let cache = SHARED.get(P); if (!cache) SHARED.set(P, (cache = {}));
    const key = body + ':' + lod + ':' + tier + ':' + mode;
    let e = cache[key];
    if (!e) {
      const rig = C.rig(P, body, lod), bake = C.bake(rig, body, tier);
      e = cache[key] = { rig, bake, tex: null, refs: 0, drop: () => { if (--e.refs <= 0) { if (e.tex) e.tex.dispose(); e.rig.geo.dispose(); delete cache[key]; } } };
      if (mode === 'static') freeze(rig, bake); else e.tex = makeTexture(bake, mode);
    }
    e.refs++;
    return e;
  };

  // ---------------------------------------------------------------- the crowd
  const LOOK_AHEAD = 0.75, REBUCKET = 0.25; // seconds: upload a figure's next move this early; re-sort moving figures this often
  const ATTR = [['aLook', 4], ['aFrom', 4], ['aTo', 4], ['aMove', 4], ['aTo2', 4], ['aMove2', 4], ['aAnimA', 4], ['aAnimB', 4], ['aSwitch', 4]];
  C.create = function (o) {
    const HM = o.HM, P = HM.parts, tier = C.tierOf(o.q), TQ = TIER[tier], colors = o.colors || {}, fids = Object.keys(colors);
    const mode = ['float', 'half', 'static'].includes(o.frames) ? o.frames : modeOf(probe(o.renderer)), split = tier !== 'low' && TQ.shadow && TQ.shadowReach > 0;
    const lods = tier === 'low' ? ['light'] : split ? ['fine', 'light', 'far'] : ['fine', 'light'], hasFine = lods[0] === 'fine';
    const U = { time: { value: 0 } }, group = new T.Group(), rnd = lcg(11), bodies = {}, figs = [];
    const lin = (hex) => new T.Color(hex), defaultTint = lin(fids.length ? colors[fids[0]] : 0xb3262e), tints = {};
    for (const f of fids) tints[f] = lin(colors[f]);
    group.name = 'crowd';
    let focusAt = null, bucketDirty = true, due = Infinity, moveFrom = Infinity, moveTo = -Infinity, lastBucket = -Infinity;
    // a body: its shared rigs and textures per lod, its own materials, meshes and figures
    const ensure = (body) => {
      if (bodies[body]) return bodies[body];
      const b = { body, inst: [], lod: {}, radius: 0, rows: null, changed: true };
      for (const lod of lods) {
        const S = shared(P, body, lod, tier, mode), u = { tex: { value: S.tex }, info: { value: new T.Vector4(1 / S.bake.W, 1 / S.bake.H, S.bake.R, S.bake.F) }, time: U.time };
        b.lod[lod] = { S, rig: S.rig, bake: S.bake, u, mat: wrap(HM.mat, u, mode), depth: depthOf(u, mode), mesh: null, cap: 0, list: [] };
        b.radius = Math.max(b.radius, S.bake.radius + 0.3); b.rows = S.bake.rows;
      }
      return (bodies[body] = b);
    };
    // a mesh at capacity `cap`: the rig's geometry as an InstancedBufferGeometry with our per-instance attributes
    const makeMesh = (b, lod, cap) => {
      const L = b.lod[lod];
      if (L.mesh) { group.remove(L.mesh); L.mesh.geometry.dispose(); }
      const g = new T.InstancedBufferGeometry().copy(L.rig.geo); // a copy: disposing a mesh must not drop the shared rig's buffers
      for (const [k, n] of ATTR) g.setAttribute(k, new T.InstancedBufferAttribute(new Float32Array(cap * n), n));
      g.instanceCount = 0;
      const m = new T.Mesh(g, L.mat);
      m.customDepthMaterial = L.depth; m.castShadow = TQ.shadow && lod !== 'far'; m.receiveShadow = true; m.frustumCulled = true; m.visible = false;
      m.name = 'crowd:' + b.body + ':' + lod; m.userData.crowd = { body: b.body, lod };
      L.mesh = m; L.cap = cap; L.list = []; group.add(m);
      return m;
    };
    // one mesh from a list of figures: every figure's move pair, loop pair and look; bounds over the moves
    const write = (b, lod, list) => {
      const L = b.lod[lod], m = L.mesh, n = list.length;
      if (!m) return;
      const g = m.geometry, A = {}; for (const [k] of ATTR) A[k] = g.attributes[k].array;
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], grow = (p, lift = 0) => { for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k] + (k === 1 ? lift : 0)); } };
      const flags = (l) => l.hold + (l.paced ? 2 : 0), anim = (arr, i, l) => { arr[i] = l.row.row0; arr[i + 1] = l.row.once ? -l.row.frames : l.row.frames; arr[i + 2] = l.off; arr[i + 3] = l.rate; };
      for (let i = 0; i < n; i++) {
        const s = list[i], j = i * 4, m0 = s.M[s.mi], m1 = s.M[s.mi + 1], l0 = s.Lp[s.li], l1 = s.Lp[s.li + 1];
        A.aLook[j] = s.tint.r; A.aLook[j + 1] = s.tint.g; A.aLook[j + 2] = s.tint.b; A.aLook[j + 3] = s.bright;
        A.aFrom.set(m0.from, j); A.aTo.set(m0.to, j); A.aMove[j] = m0.t0; A.aMove[j + 1] = m0.dur; A.aMove[j + 2] = m0.code; A.aMove[j + 3] = m0.arc;
        if (m1) { A.aTo2.set(m1.to, j); A.aMove2[j] = m1.t0; A.aMove2[j + 1] = m1.dur; A.aMove2[j + 2] = m1.code; A.aMove2[j + 3] = m1.arc; }
        else { A.aTo2.set(m0.to, j); A.aMove2[j] = FAR; A.aMove2[j + 1] = 0; A.aMove2[j + 2] = 1; A.aMove2[j + 3] = 0; }
        anim(A.aAnimA, j, l0); anim(A.aAnimB, j, l1 || l0);
        if (l1) { A.aSwitch[j] = l1.ts; A.aSwitch[j + 1] = l1.blend; A.aSwitch[j + 2] = flags(l0); A.aSwitch[j + 3] = flags(l1); }
        else { A.aSwitch[j] = -FAR; A.aSwitch[j + 1] = 0; A.aSwitch[j + 2] = A.aSwitch[j + 3] = flags(l0); }
        grow(m0.from); grow(m0.to, Math.max(0, m0.arc)); if (m1) grow(m1.to, Math.max(0, m1.arc));
      }
      g.instanceCount = n; m.visible = n > 0;
      for (const [k] of ATTR) g.attributes[k].needsUpdate = true;
      if (n) { const c = new T.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2); g.boundingSphere = new T.Sphere(c, c.distanceTo(new T.Vector3(...hi)) + b.radius + 1.5); }
      else g.boundingSphere = new T.Sphere(new T.Vector3(), 1);
      L.list = list;
    };
    // where a figure is now (its active move), for the LOD buckets
    const segAt = (s, t) => { let i = 0; while (i + 1 < s.M.length && s.M[i + 1].t0 <= t) i++; return i; };
    const at = (s, t) => (s.M.length === 1 ? { p: s.M[0].to, yaw: s.M[0].to[3], clock: t } : C.seg(s.M[segAt(s, t)], t));
    const loopAt = (s, t) => { let i = 0; while (i + 1 < s.Lp.length && s.Lp[i + 1].ts <= t) i++; return s.Lp[i]; };
    const dead = (s, t) => { const l = loopAt(s, t); return l.anim === 'die' && l.hold > 0; };
    // the pair on the GPU: the move and the loop showing now and the next ones; returns when that pair runs out
    const sync = (s, t) => {
      const mi = segAt(s, t);
      let li = 0; for (let i = 1; i < s.Lp.length; i++) if (s.Lp[i].ts + s.Lp[i].blend <= t) li = i;
      if (mi !== s.mi || li !== s.li) { s.mi = mi; s.li = li; s.b.changed = true; }
      return Math.min(s.M[mi + 2] ? s.M[mi + 2].t0 : Infinity, s.Lp[li + 2] ? s.Lp[li + 2].ts : Infinity);
    };
    const resync = (list, t) => { let d = Infinity; for (const s of list) d = Math.min(d, sync(s, t)); return d; };
    // the fine bucket: the figures within reach of the focus, nearest first, at most maxFine over all bodies (without a
    // focus: the first maxFine added); every body is re-sorted, its fine ones to the fine mesh, the rest to the light
    // one (split: near light figures keep their shadow, far ones take the far LOD without one). Only a body whose
    // figures changed or whose buckets changed is written.
    const flush = () => {
      const all = Object.values(bodies), t = U.time.value;
      if (bucketDirty) {
        const pos = new Map(), where = (s) => { let p = pos.get(s); if (!p) pos.set(s, (p = at(s, t).p)); return p; };
        const d2 = (s) => { const p = where(s); return (p[0] - focusAt.x) ** 2 + (p[1] - focusAt.y) ** 2 + (p[2] - focusAt.z) ** 2; };
        const keep = new Set();
        if (hasFine) {
          const near = [], r2 = TQ.reach * TQ.reach;
          for (const b of all) for (const s of b.inst) { const d = focusAt ? d2(s) : s.order; if (!focusAt || d < r2) near.push([d, s]); }
          if (near.length > TQ.maxFine) near.sort((p, r) => p[0] - r[0]);
          for (let i = 0; i < Math.min(near.length, TQ.maxFine); i++) keep.add(near[i][1]);
        }
        const sr2 = TQ.shadowReach * TQ.shadowReach, close = (s) => !focusAt || d2(s) < sr2;
        for (const b of all) {
          const rest = hasFine ? b.inst.filter((s) => !keep.has(s)) : b.inst;
          b.want = { fine: hasFine ? b.inst.filter((s) => keep.has(s)) : null, light: split ? rest.filter(close) : rest, far: split ? rest.filter((s) => !close(s)) : null };
        }
        bucketDirty = false; lastBucket = t;
      }
      for (const b of all) {
        const n = b.inst.length;
        for (const lod of lods) {
          const L = b.lod[lod], want = b.want[lod];
          if (L.cap < n) { makeMesh(b, lod, Math.max(n, L.cap * 2, 64)); write(b, lod, want); continue; }
          if (b.changed || want.length !== L.list.length || want.some((s, i) => s !== L.list[i])) write(b, lod, want);
        }
        b.changed = false;
      }
    };
    const resolveH = (h) => {
      if (!h) return [];
      if (Array.isArray(h)) return h.flatMap(resolveH);
      if (h.idx) return h.idx.map((i) => figs[i]).filter(Boolean);
      const a = h.start | 0, n = h.count == null ? figs.length - a : h.count | 0;
      if (a < 0 || n < 0 || a + n > figs.length) throw new Error('Crowd: handle ' + a + '+' + n + ' outside 0…' + figs.length);
      return figs.slice(a, a + n);
    };
    const cut = (list, key, t) => { while (list.length > 1 && list[list.length - 1][key] >= t) list.pop(); };
    // queue a loop for a figure at a[ts]: phase given → in step (no speed jitter); a paced gait → frames follow the move
    const sched = (s, name, a) => {
      const an = C.resolve(s.b.body, name), row = s.b.rows[an], hold = a.hold === undefined || a.hold === null ? (row.once ? 1 : 0) : a.hold === true ? 1 : a.hold === false ? 0 : clamp(+a.hold, 0.001, 1);
      let rate = row.speed * (a.speed || 1) * (a.sync ? 1 : s.speed), paced = false;
      if (a.paced && row.go && !hold) { const st = C.stride(s.b.body, an); if (st > 0.05) { rate = clamp(a.paced.dist / Math.max(a.paced.dur, 1e-3) / st, row.speed * 0.3, row.speed * 2.2); paced = true; } }
      const ph = a.phase != null ? a.phase : C.hash(s.order, 7);
      cut(s.Lp, 'ts', a.ts);
      s.Lp.push({ anim: an, row, off: hold ? a.ts : fract(ph - rate * a.ts), rate, hold, paced, ts: a.ts, blend: Math.max(0, a.blend == null ? 0.3 : a.blend) });
    };
    // the phase (cycles) a figure's loop is at, time t (to carry a gait on without a jump when it is re-paced)
    const phaseAt = (s, t) => { const l = loopAt(s, t); return l.hold ? 0 : fract((l.paced ? at(s, t).clock : t) * l.rate + l.off); };
    const after = (touched) => { const t = U.time.value; due = Math.min(due, resync(touched, t) - LOOK_AHEAD); bucketDirty = true; };

    const crowd = {
      group, tier, mode,
      get time() { return U.time.value; },
      get count() { return figs.length; },
      add(kind, rows) {
        const K = C.KINDS[kind]; if (!K) throw new Error('Crowd: unknown kind ' + kind);
        const b = ensure(K[0]), anims = C.ANIMS[K[0]], start = figs.length;
        for (const r of rows) {
          let anim = typeof r[4] === 'string' ? r[4] : K[1]; // callers' rows may carry other numbers there (a lean)
          if (!anims[anim]) { const a2 = C.resolve(K[0], anim); if (!warned[K[0] + anim]) { warned[K[0] + anim] = 1; console.warn('Crowd: ' + K[0] + ' has no loop ' + anim + ', using ' + a2); } anim = a2; }
          const bright = 0.82 + 0.3 * rnd(); rnd(); // (the second draw kept the warm shift; the shader derives it now)
          const tint = kind === 'horse' ? lin(PALE).multiply(new T.Color(...COATS[Math.floor(rnd() * COATS.length)])) : (r[6] && tints[r[6]]) || defaultTint;
          const ph = r[5] !== undefined && r[5] !== null ? r[5] : rnd(), speed = 0.92 + 0.16 * rnd(), row = b.rows[anim], p = [r[0], r[1], r[2], r[3] || 0];
          const s = { order: figs.length, b, tint, bright, speed, mi: 0, li: 0 };
          s.M = [{ from: p, to: p, t0: -FAR, dur: 0, code: 1, arc: 0 }];
          s.Lp = [{ anim, row, off: row.once ? -FAR : ph, rate: row.speed * speed, hold: row.once ? 1 : 0, paced: false, ts: -FAR, blend: 0 }]; // a fallen man added as one lies already
          b.inst.push(s); figs.push(s);
        }
        b.changed = true; bucketDirty = true;
        return { kind, start, count: rows.length };
      },
      move(h, o = {}) {
        const list = resolveH(h), now = U.time.value, t0 = o.t0 == null ? now : o.t0, dur = Math.max(0, o.dur == null ? 1 : o.dur), code = C.easeCode(o.ease || 'smooth', o.face), stg = o.stagger || 0, touched = [];
        if (o.to && o.to.length !== list.length) throw new Error('Crowd: move needs ' + list.length + ' target rows, got ' + o.to.length);
        list.forEach((s, i) => {
          const ti = t0 + stg * C.hash(s.order);
          if (!o.dead && dead(s, ti)) return; // the fallen stay down
          const was = loopAt(s, ti), ph = phaseAt(s, ti);
          cut(s.M, 't0', ti);
          const cur = C.seg(s.M[s.M.length - 1], ti), r = o.to ? o.to[i] : null;
          const tx = r ? r[0] : cur.p[0] + (o.dx || 0), tz = r ? r[2] : cur.p[2] + (o.dz || 0), ty = r ? r[1] : o.ground ? o.ground(tx, tz) : cur.p[1] + (o.dy || 0);
          const dx = tx - cur.p[0], dz = tz - cur.p[2], dist = Math.hypot(dx, dz);
          const yaw = r && r[3] != null ? r[3] : o.yaw != null ? o.yaw : o.face !== 'keep' && dist > 3 ? Math.atan2(-dz, dx) : cur.yaw;
          s.M.push({ from: [cur.p[0], cur.p[1], cur.p[2], cur.yaw], to: [tx, ty, tz, yaw], t0: ti, dur, code, arc: o.arc || 0 });
          const pace = dist > 0.3 && dur > 0 ? { dist, dur } : null, arrive = (then) => { if (then && dur > 0) sched(s, then, { ts: ti + Math.max(0, dur - 0.15), blend: 0.35 }); };
          if (o.anim) { // the loop on the way, then the one on arrival (a gait's rest: idle or stand)
            sched(s, o.anim, { ts: ti, blend: o.blend == null ? 0.35 : o.blend, paced: pace, phase: o.phase, sync: o.phase != null });
            arrive(o.then === undefined ? (was.row.go ? REST[s.b.body] : was.anim) : o.then);
          } else if (was.paced || (was.row.go && pace)) { // a gait carried on, re-paced for this move, at rest on arrival
            sched(s, was.anim, { ts: ti, blend: was.ts === ti ? was.blend : 0, paced: pace, phase: ph, sync: true }); // (a switch played for this very moment keeps its blend)
            arrive(o.then === undefined ? REST[s.b.body] : o.then);
          }
          touched.push(s);
          moveFrom = Math.min(moveFrom, ti); moveTo = Math.max(moveTo, ti + dur);
        });
        after(touched);
        return h;
      },
      play(h, anim, o = {}) {
        const list = resolveH(h), t0 = o.t0 == null ? U.time.value : o.t0, stg = o.stagger || 0, sync = typeof o.phase === 'number', touched = [];
        for (const s of list) {
          const ts = t0 + stg * C.hash(s.order);
          if (!o.dead && dead(s, ts)) continue; // the fallen do not cheer, nor fall twice
          sched(s, anim, { ts, blend: o.blend, hold: o.hold, phase: o.phase, speed: o.speed, sync });
          touched.push(s);
        }
        after(touched);
        return h;
      },
      where(h, i = 0) { const s = resolveH(h)[i]; if (!s) return null; const r = at(s, U.time.value); return [r.p[0], r.p[1], r.p[2], r.yaw]; },
      centre(h) { const list = resolveH(h), c = [0, 0, 0]; for (const s of list) { const p = at(s, U.time.value).p; c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } return list.length ? c.map((v) => v / list.length) : null; },
      pick(h, f, salt = 1) {
        const list = resolveH(h), idx = [];
        list.forEach((s, i) => { if (typeof f === 'function' ? f(i, crowd.where({ idx: [s.order] })) : C.hash(s.order, 31 + salt) < f) idx.push(s.order); });
        return { kind: h.kind, start: idx.length ? idx[0] : 0, count: idx.length, idx };
      },
      alive(h) { const t = U.time.value, idx = resolveH(h).filter((s) => !dead(s, t)).map((s) => s.order); return { kind: h.kind, start: idx.length ? idx[0] : 0, count: idx.length, idx }; },
      pace: (kind, anim) => C.pace(kind, anim),
      // re-bucket only when the focus moved more than 4 m (a camera flying through calls this every frame)
      focus(cam) {
        const p = cam && cam.isObject3D ? cam.position : cam, v = p ? new T.Vector3(p.x !== undefined ? p.x : p[0], p.y !== undefined ? p.y : p[1], p.z !== undefined ? p.z : p[2]) : null;
        if (v && focusAt && v.distanceToSquared(focusAt) < 16) return;
        focusAt = v; bucketDirty = true; flush();
      },
      tick(time) {
        const t = time || 0, back = t < U.time.value - 1e-6;
        U.time.value = t;
        if (back || t >= due) due = resync(figs, t) - LOOK_AHEAD;
        if (back) bucketDirty = true;
        else if (focusAt && (hasFine || split) && t >= moveFrom && t <= moveTo + REBUCKET && t - lastBucket >= REBUCKET) bucketDirty = true;
        flush();
      },
      flush() { flush(); },
      stats() {
        let meshes = 0, frames = 0, bytes = 0, fineFigures = 0, tris = 0, calls = 0; const textures = [];
        for (const b of Object.values(bodies)) for (const lod of lods) {
          const L = b.lod[lod];
          if (L.mesh) { meshes++; const n = L.mesh.geometry.instanceCount, sh = L.mesh.castShadow ? 2 : 1; if (lod === 'fine') fineFigures += n; if (n) { tris += n * L.rig.tris * sh; calls += sh; } }
          frames += L.bake.F; const per = mode === 'half' ? 8 : mode === 'static' ? 0 : 16; bytes += L.bake.W * L.bake.H * per;
          textures.push({ body: b.body, lod, w: L.bake.W, h: L.bake.H, frames: L.bake.F, verts: L.rig.V, tris: L.rig.tris });
        }
        return { figures: figs.length, fineFigures, meshes, frames, mode, tier, texMB: +(bytes / 1048576).toFixed(2), textures, trisMax: tris, calls, time: U.time.value };
      },
      dispose() {
        for (const b of Object.values(bodies)) for (const lod of lods) { const L = b.lod[lod]; if (L.mesh) { group.remove(L.mesh); L.mesh.geometry.dispose(); } L.mat.dispose(); L.depth.dispose(); L.S.drop(); }
        for (const k of Object.keys(bodies)) delete bodies[k];
        figs.length = 0;
      },
    };
    const warned = {};
    return crowd;
  };
})();
