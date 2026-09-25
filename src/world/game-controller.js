// GameController: the playable turn loop around the real engine (src/engine/engine.js + attach-219.js).
//
//   choose an emperor → options() from engine state → decision(action, choice) → resolve(): Engine.fillDecisions (the
//   player's decision + MOCK decisions for every other living faction) → Engine.resolveTurn → RuntimeEvent v1[]
//
// The engine is the only authority: this file never rolls dice, never changes owners, never evaluates gates. Its
// options are read from the engine's own queries (frontier, owned, hasPact, aliveIds, attackOf/defenseOf) and only
// shape the menu; resolveTurn decides what actually happens. No DOM here (Node tests drive it); GameController.bind
// connects it to the browser: event queue → EventPresenter → WorldRuntime/HUD → state sync → next turn.
(function (root) {
  const GC = {};
  // stratagem kinds the engine resolves (engine.js resolveStratagem; its mock agent picks from the same three)
  GC.STRATAGEMS = [
    { id: 'discord', label: 'Ly gián', hint: 'dân tâm địch giảm' },
    { id: 'burn', label: 'Đốt lương', hint: 'lương địch giảm' },
    { id: 'defect', label: 'Chiêu hàng tướng', hint: 'một phần quân địch trở giáo' },
  ];
  GC.ACTION_ORDER = ['attack', 'diplomacy', 'internal', 'stratagem', 'fortify'];

  GC.create = function (o) {
    const E = o.Engine, world = o.world, personas = o.personas;
    const emperors = world.factions.filter((f) => f.type === 'time_displaced').map((f) => f.id);
    const ctrl = { Engine: E, world, playable: emperors, game: null, player: null, busy: false, history: [], seed: null };
    const g = () => ctrl.game;
    const nameOf = (fid) => (fid === E.NEUTRAL ? world.neutral.name : g().def.F[fid].persona.name);
    const city = (pid) => g().def.P[pid].city;
    const pactCount = (fid) => E.aliveIds(g()).filter((x) => x !== fid && E.hasPact(g(), fid, x)).length;

    // a new real engine game; the three warlords and the three other emperors stay MOCK agents
    ctrl.start = (fid, seed) => {
      if (!emperors.includes(fid)) throw new Error('not a playable emperor: ' + fid);
      ctrl.seed = seed != null ? seed : o.seed != null ? o.seed : Date.now() >>> 0;
      ctrl.game = E.createGame(world, personas, ctrl.seed);
      ctrl.player = fid; ctrl.history = []; ctrl.busy = false;
      return ctrl.status();
    };

    // province owners straight from engine state (neutral provinces have none)
    ctrl.owners = () => {
      const out = {};
      for (const [pid, p] of Object.entries(g().state.provinces)) if (p.owner && p.owner !== E.NEUTRAL) out[pid] = p.owner;
      return out;
    };

    ctrl.status = () => {
      const G = g(), st = G.state, fid = ctrl.player, me = st.factions[fid];
      const mine = E.owned(G, fid);
      return {
        turn: st.turn, maxTurns: G.def.rules.maxTurns, calendar: E.calendar(G), over: !!st.over, winner: st.winner || null, seed: ctrl.seed,
        player: {
          fid, name: nameOf(fid), alive: me.alive, seat: me.seat, seatCity: me.alive ? city(me.seat) : null,
          troops: me.troops, grain: me.grain, loyalty: me.loyalty, prestige: me.prestige,
          income: me.alive ? E.income(G, fid) : 0, upkeep: me.alive ? E.upkeep(G, fid) : 0,
          provinces: mine.map((pid) => ({ pid, city: city(pid), fort: st.provinces[pid].fort, seat: pid === me.seat })),
          pacts: Object.keys(me.pacts).filter((x) => E.hasPact(G, fid, x)).map((x) => ({ fid: x, name: nameOf(x), until: me.pacts[x] })),
        },
        factions: E.ranking(G).map((r) => ({ fid: r.id, name: nameOf(r.id), alive: r.alive, provinces: r.provinces.length, troops: r.troops, prestige: r.prestige })),
      };
    };

    // What the player may choose this turn, derived from engine queries. UX only: resolveTurn still has the last word.
    ctrl.options = () => {
      const G = g(), st = G.state, fid = ctrl.player, me = st.factions[fid];
      if (!me.alive || st.over) return null;
      const R = G.def.rules, front = E.frontier(G, fid), mine = E.owned(G, fid);
      const others = E.aliveIds(G).filter((x) => x !== fid);
      const attack = front.map((pid) => {
        const owner = st.provinces[pid].owner, atk = E.attackOf(G, fid, pid), dfn = E.defenseOf(G, pid);
        return {
          pid, city: city(pid), owner, ownerName: nameOf(owner), pact: owner !== E.NEUTRAL && E.hasPact(G, fid, owner),
          via: G.def.P[pid].neighbors.filter((n) => st.provinces[n].owner === fid).map((n) => ({ pid: n, city: city(n) })),
          commit: atk.commit, defenders: dfn.troops, ratio: atk.power / Math.max(1, dfn.power), // engine's own estimates, before the dice
        };
      });
      const annex = attack.filter((t) => t.owner === E.NEUTRAL).map(({ pid, city: c, ownerName }) => ({ pid, city: c, ownerName }));
      const full = pactCount(fid) >= R.pact.max;
      const pact = others.filter((x) => !E.hasPact(G, fid, x)).map((x) => ({ fid: x, name: nameOf(x), full: full || pactCount(x) >= R.pact.max }));
      const stratagem = { subs: GC.STRATAGEMS, targets: others.map((x) => ({ fid: x, name: nameOf(x), troops: st.factions[x].troops })) };
      const fortify = mine.map((pid) => ({ pid, city: city(pid), fort: st.provinces[pid].fort, max: R.combat.fortMax, seat: pid === me.seat }));
      return {
        attack, diplomacy: { annex, pact, pactTurns: R.pact.turns }, internal: { seat: me.seat, city: city(me.seat) }, stratagem, fortify,
        available: { attack: attack.length > 0, diplomacy: annex.length + pact.length > 0, internal: true, stratagem: others.length > 0, fortify: mine.length > 0 },
      };
    };

    // The engine's decision shape (engine.js decide): { fid, action, sub, target, targetKind, from, betray }. `from` stays
    // null: resolveAttack picks the origin itself (originFor: the seat if it borders the target, else a bordering province).
    ctrl.decision = (action, c = {}) => {
      const fid = ctrl.player, base = { fid, action, sub: null, target: null, targetKind: null, from: null, betray: false };
      if (action === 'attack') return Object.assign(base, { target: c.target, targetKind: 'province', betray: !!c.betray });
      if (action === 'diplomacy') return Object.assign(base, c.sub === 'annex' ? { sub: 'annex', target: c.target, targetKind: 'province' } : { sub: 'pact', target: c.target, targetKind: 'faction' });
      if (action === 'stratagem') return Object.assign(base, { sub: c.sub, target: c.target, targetKind: 'faction' });
      if (action === 'fortify') return Object.assign(base, { target: c.target, targetKind: 'province' });
      if (action === 'internal') return Object.assign(base, { target: g().state.factions[fid].seat, targetKind: 'province' });
      throw new Error('unknown action: ' + action);
    };

    // null when the decision is one the menu offers; otherwise why not (Vietnamese, shown to the player)
    ctrl.validate = (d) => {
      const op = ctrl.options();
      if (!op) return 'Không còn nhận lệnh.';
      if (!d || !E.ACTIONS[d.action]) return 'Chưa chọn hành động.';
      if (d.fid !== ctrl.player) return 'Lệnh không thuộc phe đang chơi.';
      if (d.action === 'attack') {
        const t = op.attack.find((x) => x.pid === d.target);
        if (!t) return 'Chỉ đánh được châu giáp ranh.';
        if (t.pact && !d.betray) return 'Châu này của minh hữu: phải chọn bội minh.';
      } else if (d.action === 'diplomacy') {
        if (d.sub === 'annex' && !op.diplomacy.annex.some((x) => x.pid === d.target)) return 'Chỉ chiêu hàng được châu trung lập giáp ranh.';
        if (d.sub === 'pact' && !op.diplomacy.pact.some((x) => x.fid === d.target)) return 'Không kết minh được với phe này.';
        if (d.sub !== 'annex' && d.sub !== 'pact') return 'Chưa chọn cách ngoại giao.';
      } else if (d.action === 'stratagem') {
        if (!GC.STRATAGEMS.some((s) => s.id === d.sub)) return 'Chưa chọn kế.';
        if (!op.stratagem.targets.some((x) => x.fid === d.target)) return 'Chưa chọn phe địch.';
      } else if (d.action === 'fortify') {
        if (!op.fortify.some((x) => x.pid === d.target)) return 'Chỉ củng cố được châu của mình.';
      }
      return null;
    };

    // One real turn. Returns the history entry the view plays; busy until finish() (after playback).
    ctrl.resolve = (d) => {
      const G = g();
      if (!G) throw new Error('no game');
      if (ctrl.busy) throw new Error('turn already resolving');
      if (G.state.over) throw new Error('game over');
      const alive = G.state.factions[ctrl.player].alive;
      if (alive) { const err = ctrl.validate(d); if (err) throw new Error(err); }
      ctrl.busy = true;
      try {
        const decisions = E.fillDecisions(G, ctrl.player, alive ? d : null); // player + MOCK agents
        const result = E.resolveTurn(G, decisions);                          // RuntimeEvent v1 in result.events
        const entry = { turn: result.turn, calendar: result.calendar, decision: alive ? d : null, decisions, events: result.events, frozen: JSON.stringify(result.events), played: [], skipped: [] };
        ctrl.history.push(entry);
        return entry;
      } catch (e) { ctrl.busy = false; throw e; }
    };
    ctrl.finish = () => { ctrl.busy = false; };
    return ctrl;
  };

  // ------------------------------------------------------------------ browser: event queue, playback, state sync
  // view: { rt, presenter, hud, ui, titleOf(ev) }. Returns { choose(fid), submit(decision), sync() }.
  GC.bind = function (ctrl, view) {
    const { rt, presenter, hud, ui } = view;
    const loop = { playing: false };
    const idle = () => { rt.render(); hud.drawPlaces(rt, rt.view().mode === 'far'); };
    // the world and the HUD follow engine state only
    loop.sync = () => {
      rt.setOwners(ctrl.owners());
      presenter.end();
      idle();
      const st = ctrl.status();
      ui.update(st, ctrl.options());
      if (st.over) ui.gameOver(st, ctrl.history.length ? ctrl.history[ctrl.history.length - 1].events.find((e) => e.kind === 'win') : null);
      return st;
    };
    loop.choose = (fid, seed) => {
      if (loop.playing) throw new Error('turn in progress');
      ctrl.start(fid, seed);
      hud.clearLog();
      return loop.sync();
    };
    loop.submit = async (d) => {
      if (loop.playing) throw new Error('turn in progress');
      const entry = ctrl.resolve(d); // throws on an invalid decision: nothing was sent to the engine
      loop.playing = true;
      ui.lock(true, entry);
      hud.log({ fid: ctrl.player, text: 'Lượt ' + entry.turn + ' · ' + entry.calendar.season + ' năm ' + entry.calendar.year }, '');
      try {
        await presenter.playAll(entry.events, {
          onEvent: (ev) => { entry.played.push(ev); hud.log(ev, view.titleOf(ev)); ui.progress(entry.played.length + entry.skipped.length, entry.events.length); },
          onSkip: (ev) => { entry.skipped.push(ev); hud.log(ev, view.titleOf(ev)); },
        });
      } finally {
        loop.playing = false;
        ctrl.finish();
        ui.lock(false, entry);
        loop.sync();
      }
      return entry;
    };
    return loop;
  };

  if (typeof module === 'object' && module.exports) module.exports = GC;
  else root.GameController = GC;
})(typeof window !== 'undefined' ? window : globalThis);
