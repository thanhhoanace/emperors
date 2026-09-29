// Seasons on the Hoài Nam map (docs/design/v2-polish.md, job 4): the calendar's season drawn on the map, with its
// weather. The look itself lives in the runtime and the shared materials (rt.setSeason in world-runtime.js, K.wx in
// kit.js, the ground, forests and rivers in terrain*.js); this module ties it to the page's loop and adds the weather.
//   boot: the season of env.view().calendar ('Thu 219' → Thu), at once. season (a new season on screen): ~1.5 s blend
//   to it (env.fast: at once). &season=Xuân|Hạ|Thu|Đông on v2.html forces one season for the whole game (screenshots).
//   Weather near the camera, one draw call: spring petals over the valley mist, summer showers (the ground wets and
//   the light greys while it rains), autumn leaves, winter snowfall. Off at the low tier and with env.fast.
// The model kit dresses soldiers and trees with one material; two twins of it (K.wx.twin) split them: the leaves of the
// trees, villages and towns take the season's colours, the army figures take no snow (their colours read at a glance).
//   window.HuaiNanSeason: set(name, { ms }) · get() · freeze() (weather held still: screenshots) · nameOf(calendar)
// Emits 'weather' ({ season, kind, rain }) through the page's events when the weather changes (sound can follow it).
(function () {
  const S = (window.HuaiNanSeason = {});
  const WX = () => window.K && K.wx;
  S.nameOf = (calendar) => (WX() ? K.wx.name(calendar) : null);
  const qs = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
  const forced = S.nameOf(qs.get('season')); // &season=…: this season all game

  // what falls, and how much at each tier (low: none; the season's look stays)
  const WEATHER = {
    Xuân: { kind: 'petals', n: { high: 240, mid: 150 } },
    Hạ: { kind: 'rain', n: { high: 2600, mid: 1500 }, showers: true },
    Thu: { kind: 'leaves', n: { high: 200, mid: 130 } },
    Đông: { kind: 'snow', n: { high: 2600, mid: 1500 } },
  };
  let env = null, rt = null, sc = null, current = null, tier = 'high';
  let sys = null, raf = 0, t0 = 0, frozen = false, wet = 0, lastT = 0, rainOn = null;

  // ---------------------------------------------------------------- the kit's material, split in three
  let base = null, scenery = null, figs = null;
  const kitMaterial = () => {
    if (base || !sc) return base;
    const tm = sc.trees && sc.trees.meshes && sc.trees.meshes[0];
    const m = (sc.HM && sc.HM.mat) || (tm && tm.material); // the scene's trees and villages wear the kit's material
    if (!m || !m.userData || !m.userData.wx) return null; // no season pass on it: leave the models as they are
    base = m; scenery = K.wx.twin(base, { foliage: true }); figs = K.wx.twin(base, { snow: false });
    return base;
  };
  // trees, villages and the towns' own models → leaves by season; anything else of the kit under the scene's root (the
  // armies, a battle's wings, camps) → no snow. Cheap (a few hundred objects), run a few times a second and on change.
  const scan = () => {
    if (!kitMaterial()) return false;
    let n = 0;
    for (const m of (sc.trees && sc.trees.meshes) || []) if (m.material === base) { m.material = scenery; n++; }
    const models = new Set(), root = firstTownGroup();
    for (const t of Object.values(sc.towns || {})) if (t.model) models.add(t.model);
    const inTown = (o) => { for (let p = o; p; p = p.parent) if (models.has(p)) return true; return false; };
    if (root) root.traverse((o) => { if (o.isMesh && o.material === base) { o.material = inTown(o) ? scenery : figs; n++; } });
    if (n && sc) sc.dirty = true;
    return n > 0;
  };
  const firstTownGroup = () => { const t = Object.values(sc.towns || {})[0]; return t && t.g ? t.g.parent : null; };

  // ---------------------------------------------------------------- weather
  const stopWeather = () => {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (sys) { rt.scene.remove(sys.mesh); sys.dispose(); sys = null; }
    if (rt && rt.setRain) rt.setRain(0, 0);
    wet = 0; rainOn = null;
  };
  const startWeather = (name) => {
    stopWeather();
    const W = WEATHER[name], n = W && W.n[tier];
    if (!n || env.fast || !WX()) { emitWeather(name, null, 0); return; }
    sys = K.wx.particles(W.kind, { count: n, seed: 29 + name.length });
    rt.scene.add(sys.mesh);
    t0 = performance.now(); lastT = 0; wet = W.showers ? 1 : 0;
    emitWeather(name, W.kind, W.showers ? 1 : 0);
    if (!frozen) raf = requestAnimationFrame(tick);
    frame(0); // placed and drawn at once, whatever the loop does next
  };
  // a shower comes and goes: rain about half of each minute, starting wet (the season opens in the rain)
  const shower = (t) => { const s = 0.5 + 0.5 * Math.cos((t * Math.PI * 2) / 64); return s * s * (3 - 2 * s); };
  const frame = (t) => {
    if (!sys) return;
    const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
    K.wx.U.uWxTime.value = t;
    // the cube just ahead of the camera, sized to the view (the same on screen at every zoom)
    const d = sc.cam ? sc.cam.dist : rt.camera.position.length();
    sys.place(rt.camera, Math.max(4, d * (sys.kind === 'rain' ? 0.55 : 0.5)), 0.56);
    if (WEATHER[current] && WEATHER[current].showers) {
      const k = shower(t);
      sys.U.uAmount.value = 0.12 + 0.88 * k;
      wet += (k > wet ? 0.6 : 0.08) * (k - wet) * dt * 3; // wets fast, dries slowly
      rt.setRain(k * 0.85, Math.max(k, wet));
      const on = k > 0.3; if (on !== rainOn) { rainOn = on; emitWeather(current, 'rain', on ? 1 : 0); }
    }
    sc.dirty = true;
  };
  const tick = (now) => { raf = 0; if (!sys || frozen) return; frame((now - t0) / 1000); raf = requestAnimationFrame(tick); };
  const emitWeather = (season, kind, rain) => { try { if (env && env.emit) env.emit('weather', { season, kind, rain }); } catch (e) { /* listeners are the page's */ } };

  // ---------------------------------------------------------------- the season
  const set = async (name, o = {}) => {
    const n = S.nameOf(name);
    if (!n || !rt || !rt.setSeason) return current;
    const ms = env && env.fast ? 0 : o.ms ?? 1500;
    const changed = n !== current;
    current = n; if (env) env.season = n;
    scan();
    const p = rt.setSeason(n, { ms, onFrame: () => { if (sc) sc.dirty = true; } });
    if (changed || !sys) startWeather(n);
    await p;
    scan();
    return n;
  };
  S.set = (name, o) => set(name, o);
  S.get = () => current;
  S.freeze = () => { frozen = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (sc) sc.dirty = true; };
  S.thaw = () => { if (!frozen) return; frozen = false; if (sys && !raf) raf = requestAnimationFrame(tick); };
  S.weather = () => (sys ? { kind: sys.kind, count: sys.count, amount: sys.U.uAmount.value } : null);

  if (!window.HuaiNanPlay) return;
  HuaiNanPlay.hook('boot', async (e) => {
    env = e; rt = e.rt; sc = e.sc;
    tier = (e.quality && e.quality.tier) || (rt.quality && rt.quality.tier) || 'high';
    if (!rt || !rt.setSeason) return; // an older runtime: the round-8 look
    await set(forced || S.nameOf(e.view().calendar) || 'Thu', { ms: 0 });
    // the kit's models are rebuilt as the game goes (an army's look, a town's walls): keep them on the right twin
    setInterval(() => { if (base) scan(); }, 350);
  });
  HuaiNanPlay.on('season', (d) => {
    if (!env || forced) return;
    const n = S.nameOf(d && d.view && d.view.calendar);
    if (n && n !== current) set(n, { ms: 1500 });
  });
})();
