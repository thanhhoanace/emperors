// The v2 page's loop (docs/design/v2-build.md, "Ghép"; docs/design/v2-polish.md, "Móc"): the rules (EmperorsV2) own the
// game; the scene (HuaiNanScene) and the UI (HuaiNanUI) draw only what the player may see and report taps. A season: an
// army → a target (the UI asks "đánh ngay / vây" for an enemy town) → the preview or the general's forecast → confirm; a
// town → its 2–3 tasks (or all) → the preview → confirm; cards from the queue; "Hết mùa" at any time → the season played
// on the map → the player's battles turn by turn (the general's proposal, the player's changes) → each town that changed
// hands, on the map → the season's recap. Nothing here reads the game state for display: only V2.view, V2.targets,
// V2.tasks, V2.preview, V2.forecast, V2.battle and V2.lastBattle.
//   await HuaiNanPlay.boot({ params }) → window.__v2 = { V2, rt, sc, ui, H, env, game(), view(), seed, ready }
//
// Hooks: the page's other modules (the battle cinema, the map's season playback, the intro and ending, the watch mode)
// register async steps before boot; the loop awaits each in order at its point, with the page's input locked
// (ui.lock, when the UI has it) while one runs. A hook that throws is logged and skipped. With &fast=1 (the e2e) env.fast
// is true and a hook should return at once.
//   HuaiNanPlay.hook(name, async (ctx, env) => …)
//     boot       ctx = env                      after the scene and the UI exist, before the first frame of play
//     intro      ctx = { view }                 before the goal screen
//     playback   ctx = { before, after }        after "Hết mùa": the views before and after the season (after.moves, after.report)
//     battleOpen ctx = { bt }                   a battle of ours begins (V2.battle), before its first turn is shown
//     battleTurn ctx = { before, after, over }  a turn was fought: before = V2.battle before it; after = V2.battle, or V2.lastBattle when over
//     battleResult ctx = { lb }                 after the last turn, before its result panel
//     beat       ctx = { taken, view }          a town changed hands (report.taken[i]), before its card
//     ending     ctx = { over, view }           the game is over, before the end screen
// Events: HuaiNanPlay.on(type, fn) for what only listens (sound, captions). Types: act ({ name, args }: every handler
// call), season ({ view }: a new season on screen), battle ({ bt }), turn ({ before, after, over }), result ({ lb }),
// beat (taken), report (report), over (over), lock (bool), skip (a tap while a hook plays: finish it now), watch (bool),
// mute (bool). New modules load after this file (v2.html) and register before HuaiNanPlay.boot runs.
(function () {
  const P = (window.HuaiNanPlay = {});
  const hooks = {}, listeners = {};
  P.hook = (name, fn) => { (hooks[name] = hooks[name] || []).push(fn); };
  P.on = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  const emit = (type, detail) => { for (const f of listeners[type] || []) { try { f(detail); } catch (e) { console.warn('v2 on ' + type + ':', e); } } };
  P.emit = emit;

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
    const env = { V2, rt, sc, ui: null, H: null, data, world, cities, quality, params, W, H, seed, fast: params.has('fast'), game: () => g, view, emit };
    // one hook point: each registered step in turn, the input locked while any runs
    let locks = 0;
    const lock = (on) => { locks += on ? 1 : -1; const l = locks > 0; if (env.ui && env.ui.lock) env.ui.lock(l); emit('lock', l); };
    const run = async (name, ctx) => {
      const list = hooks[name]; if (!list || !list.length) return;
      lock(true);
      try { for (const f of list) { try { await f(ctx, env); } catch (e) { console.warn('v2 hook ' + name + ':', e); } } } finally { lock(false); }
    };
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
    const safe = (fn) => async (...args) => { try { return await fn(...args); } catch (e) { console.warn('v2:', e.message); refresh(); return null; } };

    const showForecast = () => {
      const v = view(), key = fc.target.kind + ':' + fc.target.id;
      const partners = v.armies.filter((a) => a.fid === v.me && a.id !== fc.armies[0] && V2.targets(g, a.id).some((t) => t.kind + ':' + t.id === key))
        .map((a) => ({ army: a.id, label: a.gen ? a.gen.name : a.id, on: fc.armies.indexOf(a.id) >= 0 }));
      const act = { type: 'order', army: fc.armies[0], armies: fc.armies.slice(), target: fc.target, intent: 'attack' };
      ui.forecast(V2.forecast(g, fc.armies, fc.target), act, { partners, preview: V2.preview(g, { type: 'order', army: fc.armies[0], target: fc.target, intent: 'attack' }) });
    };
    // after the season's end or a battle: the next battle of ours, else the next town that changed hands, else the recap (or the end)
    const next = async () => {
      const bt = V2.battle(g);
      if (bt) {
        if (fighting !== bt.id) {
          fighting = bt.id; sc.battle.begin({ site: bt.plan.site, from: bt.plan.from, me: bt.me, siege: bt.plan.siege });
          emit('battle', { bt });
          await run('battleOpen', { bt });
        }
        sc.battle.show(bt.b, bt.me); ui.battle(bt);
        return 'battle';
      }
      const v = refresh();
      if (beats === null) beats = ((v.report && v.report.taken) || []).slice();
      if (beats.length) {
        const t = beats.shift();
        sc.focus(t.town);
        await run('beat', { taken: t, view: v });
        ui.beat(t); emit('beat', t);
        return 'beat';
      }
      if (v.over) { await run('ending', { over: v.over, view: v }); ui.over(v.over); emit('over', v.over); return 'over'; }
      if (v.report) { ui.report(v.report); emit('report', v.report); }
      return 'season';
    };
    // after a battle turn: the same battle goes on, or it is over (its last state, with the outcome, until "Xem kết quả")
    const afterTurn = async (before) => {
      const bt = V2.battle(g), same = !!bt && bt.id === fighting, lb = same ? null : V2.lastBattle(g);
      const after = same ? bt : lb;
      emit('turn', { before, after, over: !same });
      if (after) await run('battleTurn', { before, after, over: !same });
      if (same) { sc.battle.show(bt.b, bt.me); ui.battle(bt); return 'battle'; }
      if (lb) { sc.battle.show(lb.b, lb.me); ui.battle(lb); emit('result', { lb }); await run('battleResult', { lb }); return 'result'; }
      return next();
    };

    const Hs = {
      onEndSeason: safe(async () => {
        sel = null; fc = null; sc.select(null); sc.targets(null);
        const before = view();
        g = V2.endSeason(g); beats = null;
        await run('playback', { before, after: view() });
        return next();
      }),
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
      onBattleTurn: safe(async (overrides) => { const before = V2.battle(g); g = V2.battleTurn(g, overrides || {}); return afterTurn(before); }),
      onAutoBattle: safe(async () => { const before = V2.battle(g); g = V2.autoBattle(g); return afterTurn(before); }),
      onBattleDone: safe(async () => { ui.battle(null); sc.battle.end(); fighting = null; return next(); }),
      onBeatDone: safe(async () => next()),
      onReportDone: () => { refresh(); emit('season', { view: view() }); },
      onGoalDone: () => { emit('season', { view: view() }); },
      onAgain: () => { g = V2.newGame(data, g.seed + 1); sel = null; fc = null; fighting = null; beats = null; refresh(); ui.goal(); },
      onOverview: () => sc.overview(),
      // the UI's controls for what plays by itself: skip the step that is playing, the watch mode, the sound
      onSkip: () => emit('skip'),
      onWatch: (on) => { env.watching = !!on; emit('watch', !!on); },
      onMute: (on) => emit('mute', !!on),
      // the general's plan for the season (V2.advise): the UI lists it, each line confirmed through onConfirmOrder
      onAdvise: () => { if (V2.advise && ui.advise) ui.advise(V2.advise(g)); },
    };
    // every handler call is an event (sound, captions); the handler itself is unchanged
    for (const k of Object.keys(Hs)) { const f = Hs[k]; Hs[k] = (...a) => { emit('act', { name: k, args: a }); return f(...a); }; }
    const portraits = 'docs/phases/v2-gameplay/demo1/portraits/';
    const ui = HuaiNanUI.create(document.body, Hs, { factions: data.factions, towns: data.towns, portraits, battle: window.EmperorsBattle });
    env.ui = ui; env.H = Hs;

    // the scene's gestures move the camera; a tap goes to the UI (it picks a target or selects), in a battle to a wing.
    // A tap's screen point is kept for the wing pick (the scene's pick answers for the map)
    const cv = rt.renderer.domElement;
    let at = [0, 0];
    cv.addEventListener('pointerup', (e) => { const r = cv.getBoundingClientRect(); at = [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; });
    sc.bind(cv, {
      onTap: (hit) => {
        if (locks > 0) return; // a hook is playing (it takes its own taps, e.g. to skip)
        if (fighting) { const w = sc.battle.pickWing(at[0], at[1]); if (w) ui.battle.selectWing(w); return; }
        ui.tap(hit && (hit.kind === 'army' || hit.kind === 'town') ? { kind: hit.kind, id: hit.id } : { kind: 'ground' }); // a seat outside the slice is ground
      },
    });
    // names and counts over the towns and armies are the scene's own labels (sprites); the UI's DOM chips stay off
    const onFrame = null;

    refresh();
    sc.loop(onFrame);
    window.__v2 = { V2, rt, sc, ui, H: Hs, env, game: () => g, view, seed, ready: false };
    await run('boot', env);
    await run('intro', { view: view() });
    ui.goal();
    window.__v2.ready = true;
    return window.__v2;
  };
})();
