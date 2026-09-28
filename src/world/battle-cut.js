// Battle cut (src/world/battle-cut.js): the 3–5 second siege shot inside an `attack` event (decisions/0004: the
// campaign of A with the battle cut of C). The campaign map is 1 unit = 3 km; the battle is 1 unit = 1 m, so the cut
// has its own scene, camera, sky, sun and lens on the page's renderer, and the page draws it instead of the map while
// the event's plan is inside its cut window (EventPresenter: plan.cut, P.cut). Presentation only: the result comes from
// the event (`win`), never from anything computed here.
//
//   const cut = BattleCut.create(rt, { world, cities, glyphs, names, quality })
//   cut.key(info)                  the battle an info asks for (from, to, fid, defender, win)
//   await cut.prepare(info)        build it now (shows "Đang dựng trận…" for the one to four seconds it takes)
//   cut.frame(info, u)             put the shot at u ∈ 0..1 on screen (approach → gate → result); builds if not ready
//   cut.off() · cut.active · cut.render() · cut.stats() · cut.dispose()
//   info = { from, to, fid, defenderFid, win, commit? }  (an attack RuntimeEvent carries all of these)
//
// Troops: until the engine hands over a battle descriptor (docs/phases/v2-gameplay/ASSIGN.md, mục 1), the split into
// foot, horse and boats is a display guess from the committed troops, the faction's traits and the city's river.
// One battle is kept (the last built); a new key disposes it. Nature.warm(quality) is called once the page is idle,
// so the leaf atlas and the plant geometries are ready before the first battle.
(function () {
  const BC = (window.BattleCut = {});
  const T = THREE;
  const hexOf = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
  const smooth = (e) => e * e * (3 - 2 * e);
  const lerp3 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

  // the side of the city the attacker comes from: toward the origin province, unless a river is there
  BC.sideOf = function (world, cityDef, from, to) {
    const P = {}; for (const p of world.provinces) P[p.id] = p;
    const a = P[from] && P[from].lonlat, b = P[to] && P[to].lonlat, rivers = (cityDef.river && cityDef.river.sides) || '';
    const order = [];
    if (a && b) { const dx = a[0] - b[0], dz = -(a[1] - b[1]); order.push(Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : dz > 0 ? 's' : 'n'); }
    order.push('s', 'e', 'w', 'n');
    return order.find((s) => !rivers.includes(s)) || 's';
  };
  // the armies as the scene draws them: foot, horse, boats (a display guess until the engine gives the split)
  BC.troopsOf = function (world, cityDef, fid, total, attacker) {
    const f = world.factions.find((x) => x.id === fid), traits = (f && f.traits) || {}, river = !!(cityDef.river && cityDef.river.sides);
    const n = Math.max(1500, Math.round(total || (attacker ? 12000 : 5000)));
    const ky = Math.round(n * (traits.cavalry && traits.cavalry > 1 ? 0.28 : attacker ? 0.15 : 0.07));
    const thuy = attacker && river ? Math.round(n * (traits.riverDefense || traits.navy ? 0.12 : 0.05)) : 0;
    return { bo: n - ky - thuy, ky, thuy };
  };

  BC.create = function (rt, o) {
    const renderer = rt.renderer, W = rt.size.width, H = rt.size.height, world = o.world, cities = o.cities, q = o.quality || rt.quality || null;
    const tier = (q && q.tier) || 'high', N = window.Nature;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, W / H, 1.5, 16000);
    const sunDir = new T.Vector3(-0.82, 0.36, 0.3).normalize(), sunColor = new T.Color(1.0, 0.72, 0.46);
    const colors = {}; for (const f of world.factions) colors[f.id] = hexOf(f.color); colors.neutral = 0x8a7a55;
    const HM = HanModels.create({ recv: (m) => m, renderer, colors });

    // sky of the siege prototype (sg-main.js), the environment from it, the golden-hour sun
    const skyMat = () => new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { uSun: { value: sunDir } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `varying vec3 vD; uniform vec3 uSun; ${N.GLSL}
        void main(){ vec3 d = normalize(vD); float h = clamp(d.y, -.1, 1.), s = max(dot(d, normalize(uSun)), 0.);
          vec3 zen = vec3(.1, .2, .42), hor = vec3(.84, .68, .52), warm = vec3(1.2, .58, .26);
          vec3 c = mix(hor, zen, pow(max(h, 0.), .45));
          c = mix(c, warm, pow(s, 2.2) * .85 * (1. - smoothstep(.02, .45, h)));
          c += vec3(1.4, .9, .5) * pow(s, 60.) + vec3(4., 3., 2.) * pow(s, 900.);
          float cl = smoothstep(.55, .8, fbm2(d.xz / max(d.y, .06) * 1.4 + 3.)) * smoothstep(.02, .18, d.y) * (1. - smoothstep(.4, .7, d.y));
          c = mix(c, mix(vec3(.95, .72, .58), vec3(1.1, .75, .45), pow(s, 2.)), cl * .55);
          if (d.y < 0.) c = hor * .8;
          gl_FragColor = vec4(c, 1.); }` });
    const sky = new T.Mesh(new T.SphereGeometry(15000, 48, 24), skyMat()); scene.add(sky);
    const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), skyMat()));
    const pm = new T.PMREMGenerator(renderer), env = pm.fromScene(es, 0.03).texture; pm.dispose();
    const shadowMap = q ? q.shadow : 4096;
    const sun = new T.DirectionalLight(sunColor, 2.35); sun.castShadow = shadowMap > 0;
    if (shadowMap) { sun.shadow.mapSize.set(shadowMap, shadowMap); sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.6; }
    scene.add(sun, sun.target, new T.HemisphereLight(new T.Color(0.5, 0.6, 0.8), new T.Color(0.3, 0.24, 0.16), 0.42));
    const lens = K.lens(renderer, scene, camera, { focus: 300, range: 300, maxBlur: 3, ao: 0.8, aoRadius: 2, vignette: 0.28, contrast: 1.06, saturation: 1.06, quality: q,
      atmos: { density: 0.00017, falloff: 0.005, color: 0xa7a8ad, sunColor: 0xe0a070, sunDir } });
    const LU = lens.uniforms, blurK = renderer.getDrawingBufferSize(new T.Vector2()).y / 900; LU.band.value.set(0.5, 0.5);

    // the "building the battle" card, over the page while the scene is made (the build blocks the main thread)
    const card = document.createElement('div');
    card.className = 'battle-cut-card';
    card.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:50;padding:12px 20px;border-radius:6px;background:rgba(21,18,15,.86);color:#efe3c8;font:600 16px "Noto Serif",Georgia,serif;letter-spacing:.04em;pointer-events:none;display:none';
    card.textContent = 'Đang dựng trận…';
    document.body.appendChild(card);
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // painted, then build

    let built = null, time = 0, lastU = null;
    const cut = { active: false, scene, camera, lens };
    cut.key = (info) => [info.from, info.to, info.fid, info.defenderFid, info.win ? 1 : 0].join('|');
    const disposeBuilt = () => {
      if (!built) return;
      scene.remove(built.root);
      built.battle.dispose();
      built.root.traverse((m) => { if (m.isMesh && m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); });
      built = null;
    };
    cut.build = (info) => {
      const k = cut.key(info);
      if (built && built.key === k) return built;
      disposeBuilt();
      const t0 = performance.now(), to = info.to, def = Object.assign({}, cities[to], { id: to });
      if (!def.outline) return null; // no layout for this city: the event stays on the map
      const aFid = info.fid, dFid = info.defenderFid && info.defenderFid !== 'neutral' ? info.defenderFid : 'neutral';
      const nameOf = (fid) => (fid === 'neutral' ? 'Quân trấn thủ' : o.names ? o.names.name(fid) : fid);
      const sideOf = (fid, troops) => ({ fid, color: colors[fid] || 0x8a7a55, name: nameOf(fid), glyph: (o.glyphs && o.glyphs[fid]) || '守', troops });
      const side = BC.sideOf(world, def, info.from, to);
      const commit = info.commit || null;
      const desc = {
        attacker: sideOf(aFid, BC.troopsOf(world, def, aFid, commit, true)),
        defender: sideOf(dFid, BC.troopsOf(world, def, dFid, commit ? commit * 0.45 : null, false)),
        city: def, season: 'autumn', hour: 17.5, mode: 'assault', result: info.win ? 'win' : 'loss', side,
      };
      const L = Battle.land(def, side, N);
      const root = new T.Group(); scene.add(root);
      const terrain = N.terrain(L, env, q), water = N.water(L, env), rocks = N.rocks(L, env, q); root.add(terrain, water, rocks);
      const battle = Battle.siege(Object.assign({}, desc, { ground: L }), { HM, Nature: N, Crowd: window.Crowd, env, sun: { dir: sunDir, color: sunColor }, q, renderer, camera });
      root.add(battle.group);
      const tops = [];
      rocks.userData.ledges.forEach(([x, yy, z, kind], i) => { const r = N.noise.h2(i, 17); if (kind === 'top') tops.push(r < 0.55 ? [x, z, 3, 7 + r * 9, yy - 0.5] : [x, z, 5, 2 + r * 2, yy - 0.3]); else tops.push(r < 0.3 ? [x, z, 3, 4 + r * 8, yy - 0.8] : [x, z, r < 0.65 ? 5 : 7, 1.6 + r * 1.6, yy - 0.4]); });
      const trees = N.trees(L, env, { dir: sunDir, color: sunColor }, battle.trees.concat(tops), q); root.add(trees);
      built = { key: k, root, battle, trees, rocks, water, ms: Math.round(performance.now() - t0), shots: ['approach', 'gate', 'result'].map((n) => battle.views[n]).filter(Boolean) };
      return built;
    };
    cut.prepare = async (info) => {
      if (built && built.key === cut.key(info)) return built;
      card.style.display = 'block'; await nextFrame();
      try { return cut.build(info); } finally { card.style.display = 'none'; }
    };
    // the camera through the shots: approach (the whole city from the attacker's side) → gate (the assault) → result;
    // each shot drifts in a little, the moves between them are eased
    const place = (u) => {
      const S = built.shots, n = S.length, x = Math.min(0.9999, Math.max(0, u)) * n, i = Math.floor(x), e = x - i;
      const a = S[i], hold = 0.7; // the share of a shot spent still (drifting); the rest flies to the next
      let v;
      if (e < hold || i === n - 1) { const k = e / (i === n - 1 ? 1 : hold); v = { cam: lerp3(a.cam, lerp3(a.cam, a.target, 0.08), k), target: a.target, fov: a.fov, shadow: a.shadow, ao: a.ao }; }
      else { const b = S[i + 1], k = smooth((e - hold) / (1 - hold)), from = lerp3(a.cam, a.target, 0.08); v = { cam: lerp3(from, b.cam, k), target: lerp3(a.target, b.target, k), fov: a.fov + (b.fov - a.fov) * k, shadow: k < 0.5 ? a.shadow : b.shadow, ao: b.ao }; }
      camera.fov = v.fov; camera.aspect = W / H; camera.position.set(...v.cam); camera.lookAt(...v.target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const dist = camera.position.distanceTo(new T.Vector3(...v.target)), [sx, sz, ext] = v.shadow || [v.target[0], v.target[2], Math.max(200, dist * 0.8)];
      sun.position.set(sx, 0, sz).addScaledVector(sunDir, 3000); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld();
      Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 100, far: 6000 }); sun.shadow.camera.updateProjectionMatrix();
      LU.focus.value = dist; LU.range.value = Math.max(120, dist * 1.2); LU.maxBlur.value = q && !q.dof ? 0 : 2.6 * blurK;
      LU.aoStrength.value = q && !q.ssao ? 0 : 0.85; LU.aoRadius.value = v.ao || Math.max(1.5, dist * 0.006);
      LU.near.value = camera.near; LU.far.value = camera.far;
      LU.projScale.value = renderer.getDrawingBufferSize(new T.Vector2()).y / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2));
      sky.position.copy(camera.position);
      built.trees.userData.focus(camera); built.rocks.userData.focus(camera); built.battle.focus(camera);
    };
    cut.frame = (info, u) => {
      if (!built || built.key !== cut.key(info)) cut.build(info);
      if (!built) { cut.active = false; return false; }
      const dt = lastU == null ? 0.5 : Math.max(0, Math.min(0.25, (u - lastU) * 4.8)); lastU = u; time += dt;
      place(u);
      built.trees.userData.U.uTime.value = time; built.water.userData.U.uTime.value = time; built.battle.tick(dt);
      cut.active = true; return true;
    };
    cut.off = () => { cut.active = false; lastU = null; };
    cut.render = () => lens.render();
    cut.labels = () => (built ? built.battle.labels(camera, W, H) : []);
    cut.stats = () => (built ? Object.assign({ buildMs: built.ms, key: built.key }, built.battle.stats()) : null);
    cut.dispose = () => { disposeBuilt(); card.remove(); };
    // warm the leaf atlas and the plant geometries while the page is idle (the first battle then skips that second)
    const warm = () => { try { N.warm(q); } catch (e) { console.warn('Nature.warm', e); } };
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 8000 }); else setTimeout(warm, 1500);
    return cut;
  };
})();
