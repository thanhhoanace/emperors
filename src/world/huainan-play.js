// The v2 page's loop (docs/design/v2-build.md, "Ghép"): the rules (EmperorsV2) own the game; the scene (HuaiNanScene)
// and the UI (HuaiNanUI) draw only the View and report taps. A season: an army → its targets → a target (an enemy town
// asks "đánh ngay / vây") → the preview → confirm; a town → its 2–3 tasks (or all) → the preview → confirm; cards from
// the queue; "Hết mùa" at any time → the player's battles turn by turn (the general's proposal, the player's changes)
// → the season's recap. Nothing here reads the game state for display: only V2.view(g), V2.battle(g), V2.forecast.
//   await HuaiNanPlay.boot({ params })  → window.__v2 = { V2, rt, sc, ui, game(), view(), act, ready }
(function () {
  const P = (window.HuaiNanPlay = {});

  const pickQuality = (params) => {
    let override = params.get('tier') || (params.has('qa') ? 'high' : undefined);
    if (!override) { try { override = localStorage.getItem('tq.tier') || undefined; } catch (e) { /* storage blocked: detect */ } }
    const probe = document.createElement('canvas'), gl = probe.getContext('webgl2') || probe.getContext('webgl');
    const q = Quality.detect({ getContext: () => gl }, { override });
    try { const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) { /* dies with the canvas */ }
    return q;
  };

  P.boot = async function (o) {
    const params = o.params, W = Number(params.get('w')) || innerWidth, H = Number(params.get('h')) || innerHeight;
    const V2 = window.EmperorsV2, quality = pickQuality(params);
    const json = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
    const [world, cities, data] = await Promise.all([json('data/world.json'), json('data/cities.json').then((j) => j.cities), json('data/scenario/huainan.json')]);
    const rt = await WorldRuntime.create({ world, cities, width: W, height: H, dpr: Number(params.get('dpr')) || Math.min(quality.dpr, devicePixelRatio || 1), quality, base: 'assets/map/' });
    const loading = document.getElementById('loading'); if (loading) loading.remove();
    const sc = await HuaiNanScene.create(rt, { data, width: W, height: H, quality });
    const seed = params.has('seed') ? Number(params.get('seed')) : (Date.now() % 100000) + 1;

    let g = V2.newGame(data, seed);
    let sel = null; // { kind: 'army', id, targets, target?, intent?, preview? } | { kind: 'town', id, tasks, key?, preview? }
    let fight = null; // the player's battle in progress: { overrides: { wingId: order } }
    const view = () => V2.view(g);
    const redraw = () => { const v = view(); sc.sync(v); ui.render(v, sel); return v; };
    const act = {}; // every player action, also for the browser QA

    act.select = (hit) => {
      if (fight) return;
      if (!hit || hit.kind === 'ground') { sel = null; sc.select(null); sc.targets(null); redraw(); return; }
      const v = view();
      if (hit.kind === 'army') {
        const a = v.armies.find((x) => x.id === hit.id);
        if (a && a.fid === v.me) { sel = { kind: 'army', id: a.id, targets: V2.targets(g, a.id) }; sc.select(sel); sc.targets(a.id, sel.targets); ui.armyCard(a); }
        else if (sel && sel.kind === 'army') return act.target({ kind: 'army', id: hit.id });
        else { sel = { kind: 'army', id: hit.id, foreign: true }; sc.select(sel); ui.armyCard(a); }
      } else if (hit.kind === 'town') {
        if (sel && sel.kind === 'army' && !sel.foreign && sel.targets.some((t) => t.kind === 'town' && t.id === hit.id)) return act.target({ kind: 'town', id: hit.id });
        const t = v.towns.find((x) => x.id === hit.id);
        sel = { kind: 'town', id: hit.id, tasks: t && t.owner === v.me ? V2.tasks(g, hit.id) : null };
        sc.select(sel); sc.targets(null); ui.townPanel(t, sel.tasks);
      }
      ui.render(v, sel);
    };
    // a target for the selected army: an enemy town asks once, then the preview and, on an attack, the forecast
    act.target = (target, intent) => {
      if (!sel || sel.kind !== 'army' || sel.foreign) return;
      const t = sel.targets.find((x) => x.kind === target.kind && x.id === target.id);
      if (!t) return;
      if (!intent && t.intent === 'ask') { sel.target = target; ui.askIntent(target); return; }
      sel.target = target; sel.intent = intent || t.intent;
      sel.preview = V2.preview(g, { type: 'order', army: sel.id, target, intent: sel.intent });
      ui.preview(sel.preview);
      if (sel.intent === 'attack' || sel.intent === 'siege') ui.forecast(V2.forecast(g, [sel.id], target));
    };
    act.confirmOrder = () => { if (!sel || !sel.target) return; g = V2.order(g, sel.id, sel.target, sel.intent); sel = null; sc.targets(null); redraw(); };
    act.clearOrder = (armyId) => { g = V2.order(g, armyId, null); redraw(); };
    act.task = (townId, key) => { if (!sel || sel.kind !== 'town') return; sel.key = key; sel.preview = key ? V2.preview(g, { type: 'task', town: townId, key }) : null; if (sel.preview) ui.preview(sel.preview); };
    act.confirmTask = (townId, key) => { g = V2.setTask(g, townId, key === undefined ? sel && sel.key : key); sel = null; redraw(); };
    act.answer = (cardId, yes) => { g = V2.answer(g, cardId, yes); redraw(); };
    act.transfer = (townId, armyId, arm, n) => { g = V2.transfer(g, townId, armyId, arm, n); redraw(); };

    // the season's end: the player's battles one by one, then the recap
    act.endSeason = () => {
      if (fight) return;
      sel = null; sc.select(null); sc.targets(null);
      g = V2.endSeason(g);
      return next();
    };
    const next = () => {
      const bt = V2.battle(g);
      if (bt) {
        if (!fight) { fight = { overrides: {} }; sc.battle.begin({ site: bt.plan.site, from: bt.plan.from, me: bt.me, siege: bt.plan.siege }); }
        sc.battle.show(bt.b, bt.me); ui.battle(Object.assign({}, bt, { overrides: fight.overrides }));
        return 'battle';
      }
      if (fight) { sc.battle.end(); fight = null; }
      const v = redraw();
      if (v.over) ui.over(v.over); else if (v.report) ui.report(v.report);
      return v.over ? 'over' : 'season';
    };
    act.battleOrder = (wingId, order) => { if (!fight) return; fight.overrides[wingId] = order; const bt = V2.battle(g); ui.battle(Object.assign({}, bt, { overrides: fight.overrides })); };
    act.battleTurn = () => { if (!fight) return; g = V2.battleTurn(g, fight.overrides); fight.overrides = {}; return next(); };
    act.autoBattle = () => { if (!fight) return; g = V2.autoBattle(g); fight.overrides = {}; return next(); };

    const ui = HuaiNanUI.create(document.body, {
      onEndSeason: () => act.endSeason(), onSelect: (hit) => act.select(hit), onTarget: (t, intent) => act.target(t, intent),
      onIntent: (intent) => sel && sel.target && act.target(sel.target, intent), onConfirmOrder: () => act.confirmOrder(),
      onClearOrder: (id) => act.clearOrder(id), onTask: (townId, key) => act.task(townId, key), onConfirmTask: (townId, key) => act.confirmTask(townId, key),
      onAnswer: (id, yes) => act.answer(id, yes), onTransfer: (t, a, arm, n) => act.transfer(t, a, arm, n),
      onBattleOrder: (w, o) => act.battleOrder(w, o), onBattleTurn: () => act.battleTurn(), onAutoBattle: () => act.autoBattle(),
      onForecast: (ids, target) => ui.forecast(V2.forecast(g, ids, target)), onCloseReport: () => redraw(),
    });

    // taps on the map: an army, a town, the ground; in a battle, a wing
    const cv = rt.renderer.domElement;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) { down = null; return; } // a drag moves the camera
      down = null;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (fight) { const w = sc.battle.pickWing(x, y); if (w) ui.battle.selectWing && ui.battle.selectWing(w); return; }
      act.select(sc.pick(x, y));
    });

    redraw(); ui.goal();
    sc.loop(null);
    window.__v2 = { V2, rt, sc, ui, act, game: () => g, view, seed, ready: true };
    return window.__v2;
  };
})();
