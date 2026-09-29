// The v2 page's loop (docs/design/v2-build.md, "Ghép"): the rules (EmperorsV2) own the game; the scene (HuaiNanScene)
// and the UI (HuaiNanUI) draw only what the player may see and report taps. A season: an army → a target (the UI asks
// "đánh ngay / vây" for an enemy town) → the preview or the general's forecast → confirm; a town → its 2–3 tasks (or
// all) → the preview → confirm; cards from the queue; "Hết mùa" at any time → the player's battles turn by turn (the
// general's proposal, the player's changes) → each town that changed hands, on the map → the season's recap. Nothing here reads the game state for display: only
// V2.view, V2.targets, V2.tasks, V2.preview, V2.forecast, V2.battle and V2.lastBattle.
//   await HuaiNanPlay.boot({ params }) → window.__v2 = { V2, rt, sc, ui, H, game(), view(), seed, ready }
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
    const rt = await WorldRuntime.create({ world, cities, width: W, height: H, dpr: Number(params.get('dpr')) || Math.min(quality.dpr, devicePixelRatio || 1), quality, base: 'assets/map/', hamlets: false }); // the scene draws its own villages at town scale
    const loading = document.getElementById('loading'); if (loading) loading.remove();
    const sc = await HuaiNanScene.create(rt, { data, width: W, height: H, quality });
    const seed = params.has('seed') ? Number(params.get('seed')) : (Date.now() % 100000) + 1;

    let g = V2.newGame(data, seed);
    let sel = null; // { kind: 'army'|'town', id } | null, the UI's selection
    let fc = null; // the forecast on screen: { armies, target }
    let fighting = null; // id of the battle on screen
    let beats = null; // the towns that changed hands this season, shown one at a time on the map before the recap (null: not read yet)
    const view = () => V2.view(g);
    const refresh = () => {
      const v = view();
      sc.sync(v); ui.render(v, sel);
      const a = sel && sel.kind === 'army' && v.armies.find((x) => x.id === sel.id), t = sel && sel.kind === 'town' && v.towns.find((x) => x.id === sel.id);
      if (a) { const own = a.fid === v.me, tg = own ? V2.targets(g, a.id) : null; ui.armyCard(a, tg); sc.targets(own ? a.id : null, tg || []); } else sc.targets(null);
      if (t) ui.townPanel(t, t.owner === v.me ? V2.tasks(g, t.id) : null);
      if (!a && !t) sel = null;
      return v;
    };
    // an illegal act (the engine throws) changes nothing: say so in the console and redraw
    const safe = (fn) => (...args) => { try { return fn(...args); } catch (e) { console.warn('v2:', e.message); refresh(); return null; } };

    const showForecast = () => {
      const v = view(), key = fc.target.kind + ':' + fc.target.id;
      const partners = v.armies.filter((a) => a.fid === v.me && a.id !== fc.armies[0] && V2.targets(g, a.id).some((t) => t.kind + ':' + t.id === key))
        .map((a) => ({ army: a.id, label: a.gen ? a.gen.name : a.id, on: fc.armies.indexOf(a.id) >= 0 }));
      const act = { type: 'order', army: fc.armies[0], armies: fc.armies.slice(), target: fc.target, intent: 'attack' };
      ui.forecast(V2.forecast(g, fc.armies, fc.target), act, { partners, preview: V2.preview(g, { type: 'order', army: fc.armies[0], target: fc.target, intent: 'attack' }) });
    };
    // after the season's end or a battle: the next battle of ours, else the recap (or the end)
    const next = () => {
      const bt = V2.battle(g);
      if (bt) {
        if (fighting !== bt.id) { fighting = bt.id; sc.battle.begin({ site: bt.plan.site, from: bt.plan.from, me: bt.me, siege: bt.plan.siege }); }
        sc.battle.show(bt.b, bt.me); ui.battle(bt);
        return 'battle';
      }
      const v = refresh();
      if (beats === null) beats = ((v.report && v.report.taken) || []).slice();
      if (beats.length) { const t = beats.shift(); sc.focus(t.town); ui.beat(t); return 'beat'; }
      if (v.over) ui.over(v.over); else if (v.report) ui.report(v.report);
      return v.over ? 'over' : 'season';
    };
    // after a battle turn: the same battle goes on, or it is over (its last state, with the outcome, until "Xem kết quả")
    const afterTurn = () => {
      const bt = V2.battle(g);
      if (bt && bt.id === fighting) { sc.battle.show(bt.b, bt.me); ui.battle(bt); return 'battle'; }
      const lb = V2.lastBattle(g);
      if (lb) { sc.battle.show(lb.b, lb.me); ui.battle(lb); return 'result'; }
      return next();
    };

    const Hs = {
      onEndSeason: safe(() => { sel = null; fc = null; sc.select(null); sc.targets(null); g = V2.endSeason(g); beats = null; return next(); }),
      onSelect: (s) => { sel = s; fc = null; sc.select(s); refresh(); },
      onTarget: safe((t) => { const act = { type: 'order', army: t.army, target: { kind: t.kind, id: t.id }, intent: t.intent }; ui.preview(V2.preview(g, act), act); }),
      onForecast: safe((t) => { fc = { armies: t.armies.slice(), target: { kind: t.kind, id: t.id } }; showForecast(); }),
      onPartner: safe((id) => { if (!fc) return; const i = fc.armies.indexOf(id); if (i >= 0) fc.armies.splice(i, 1); else fc.armies.push(id); showForecast(); }),
      onConfirmOrder: safe((a) => {
        if (a.type === 'task') g = V2.setTask(g, a.town, a.key);
        else for (const id of a.armies || [a.army]) g = V2.order(g, id, a.target, a.intent);
        fc = null; refresh();
      }),
      onCancel: () => { fc = null; },
      onClearOrder: safe((id) => { g = V2.order(g, id, null); refresh(); }),
      onTask: safe((town, key) => {
        if (key == null) { g = V2.setTask(g, town, null); refresh(); return; }
        const act = { type: 'task', town, key }; ui.preview(V2.preview(g, act), act);
      }),
      onAnswer: safe((id, yes) => { g = V2.answer(g, id, yes); refresh(); }),
      onBattleOrder: () => {}, // the UI keeps the player's changes until "Đánh"
      onWingSelect: (w) => { if (sc.battle.select) sc.battle.select(w); },
      onBattleTurn: safe((overrides) => { g = V2.battleTurn(g, overrides || {}); return afterTurn(); }),
      onAutoBattle: safe(() => { g = V2.autoBattle(g); return afterTurn(); }),
      onBattleDone: () => { ui.battle(null); sc.battle.end(); fighting = null; return next(); },
      onBeatDone: () => next(),
      onReportDone: () => { refresh(); },
      onGoalDone: () => {},
      onAgain: () => { g = V2.newGame(data, g.seed + 1); sel = null; fc = null; fighting = null; beats = null; refresh(); ui.goal(); },
      onOverview: () => sc.overview(),
    };
    const portraits = 'docs/phases/v2-gameplay/demo1/portraits/';
    const ui = HuaiNanUI.create(document.body, Hs, { factions: data.factions, towns: data.towns, portraits, battle: window.EmperorsBattle });

    // the scene's gestures move the camera; a tap goes to the UI (it picks a target or selects), in a battle to a wing.
    // A tap's screen point is kept for the wing pick (the scene's pick answers for the map)
    const cv = rt.renderer.domElement;
    let at = [0, 0];
    cv.addEventListener('pointerup', (e) => { const r = cv.getBoundingClientRect(); at = [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; });
    sc.bind(cv, {
      onTap: (hit) => {
        if (fighting) { const w = sc.battle.pickWing(at[0], at[1]); if (w) ui.battle.selectWing(w); return; }
        ui.tap(hit && (hit.kind === 'army' || hit.kind === 'town') ? { kind: hit.kind, id: hit.id } : { kind: 'ground' }); // a seat outside the slice is ground
      },
    });
    // names and counts over the towns and armies are the scene's own labels (sprites); the UI's DOM chips stay off
    const onFrame = null;

    refresh(); ui.goal();
    sc.loop(onFrame);
    window.__v2 = { V2, rt, sc, ui, H: Hs, game: () => g, view, seed, ready: true };
    return window.__v2;
  };
})();
