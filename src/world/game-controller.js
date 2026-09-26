// GameController: the playable turn loop around the real engine (engine.js → attach-219.js → perception.js).
//
//   choose an emperor → view() = what the player knows → decision(action, choice) → resolve(): Engine.fillDecisions
//   (the player's decision + a decision for every other living faction, each from its own DecisionContext) →
//   Engine.resolveTurn → RuntimeEvent v1[]
//
// The engine is the only authority: this file never rolls dice, never changes owners, never evaluates gates. The
// controller holds the authoritative game, but everything it hands the UI about other factions comes from
// Engine.projectPerception(game, player) (docs/product/perception.md): public labels, troop bands, public province
// owners. The player's own realm is exact. No DOM here (Node tests drive it); GameController.bind connects it to the
// browser: event queue → EventPresenter → WorldRuntime/HUD → state sync → next turn.
(function (root) {
  const GC = {};
  // presentation of the stratagem kinds the engine resolves (Engine.STRATAGEMS)
  GC.STRATAGEM_TEXT = {
    discord: { label: 'Ly gián', hint: 'dân tâm địch giảm' },
    burn: { label: 'Đốt lương', hint: 'lương địch giảm' },
    defect: { label: 'Chiêu hàng tướng', hint: 'một phần quân địch trở giáo' },
  };
  GC.ACTION_ORDER = ['attack', 'diplomacy', 'internal', 'stratagem', 'fortify'];
  // DecisionContext troop bands, as words (a band is all the player learns about another faction's army)
  GC.BAND_TEXT = { unknown: 'Chưa rõ', weak: 'Yếu', medium: 'Vừa', strong: 'Mạnh', very_strong: 'Rất mạnh' };

  GC.create = function (o) {
    const E = o.Engine, world = o.world, personas = o.personas;
    const emperors = world.factions.filter((f) => f.type === 'time_displaced').map((f) => f.id);
    const ctrl = { Engine: E, world, playable: emperors, game: null, player: null, busy: false, history: [], seed: null };
    const g = () => ctrl.game;
    // the stratagem kinds the engine resolves
    ctrl.stratagems = (E.STRATAGEMS || Object.keys(GC.STRATAGEM_TEXT)).map((id) => Object.assign({ id }, GC.STRATAGEM_TEXT[id] || { label: id, hint: '' }));

    // the start screen: the four emperors as the player may choose them (before any game exists)
    ctrl.roster = () => emperors.map((fid) => {
      const f = world.factions.find((x) => x.id === fid), p = personas[fid];
      return { fid, name: p.name, courtesy: p.courtesy, dynasty: p.dynasty, glyph: p.glyph || '', seatCity: world.provinces.find((x) => x.id === f.start.seat).city, troops: f.start.troops, prestige: f.start.prestige };
    });

    // a new real engine game; the three warlords and the three other emperors stay MOCK agents
    ctrl.start = (fid, seed) => {
      if (!emperors.includes(fid)) throw new Error('not a playable emperor: ' + fid);
      ctrl.seed = seed != null ? seed : o.seed != null ? o.seed : Date.now() >>> 0;
      ctrl.game = E.createGame(world, personas, ctrl.seed);
      ctrl.player = fid; ctrl.history = []; ctrl.busy = false;
      return ctrl.status();
    };

    // province owners straight from engine state (neutral provinces have none): the map is public
    ctrl.owners = () => {
      const out = {};
      for (const [pid, p] of Object.entries(g().state.provinces)) if (p.owner && p.owner !== E.NEUTRAL) out[pid] = p.owner;
      return out;
    };

    // The player's DecisionContext: the only source for anything about other factions.
    ctrl.perception = () => E.projectPerception(g(), ctrl.player);

    // label + what is known of one other faction, from the DecisionContext only
    const seen = (ctx, fid) => {
      const x = ctx.others[fid];
      return { fid, label: x.publicLabel, claimedIdentity: x.claimedIdentity || null, alive: x.alive, provinces: x.provinces, troopBand: x.troopBand, lastAction: x.lastAction, lastSeenTurn: x.lastSeenTurn, adjacent: x.adjacent };
    };
    const labelOf = (ctx, fid) => (fid === E.NEUTRAL ? world.neutral.name : fid === ctx.fid ? ctx.self.name : ctx.others[fid].publicLabel);
    const pactUntil = (ctx, fid) => (ctx.self.pacts[fid] && ctx.self.pacts[fid] >= ctx.turn ? ctx.self.pacts[fid] : 0);

    // Status panel + faction panel. Own realm exact; others as perceived; ordered by public province count, then the
    // fixed faction order (never by hidden troops or prestige).
    ctrl.status = (ctx = ctrl.perception()) => {
      const G = g(), st = G.state, fid = ctrl.player, me = ctx.self, alive = st.factions[fid].alive;
      const own = { fid, label: me.name, me: true, alive, provinces: me.provinces.length, troops: me.troops, prestige: me.prestige };
      const factions = [own].concat(Object.keys(ctx.others).map((x) => seen(ctx, x)))
        .sort((a, b) => b.alive - a.alive || b.provinces - a.provinces || G.def.order.indexOf(a.fid) - G.def.order.indexOf(b.fid));
      return {
        turn: ctx.turn, maxTurns: G.def.rules.maxTurns, calendar: ctx.calendar, over: !!st.over, winner: st.winner || null, seed: ctrl.seed,
        player: {
          fid, name: me.name, alive, seat: me.seat, seatCity: alive ? ctx.world.cities[me.seat] : null,
          troops: me.troops, grain: me.grain, loyalty: me.loyalty, prestige: me.prestige,
          income: alive ? E.income(G, fid) : 0, upkeep: alive ? E.upkeep(G, fid) : 0,
          provinces: me.provinces.map((pid) => ({ pid, city: ctx.world.cities[pid], fort: st.provinces[pid].fort, seat: pid === me.seat })),
          pacts: Object.keys(me.pacts).filter((x) => pactUntil(ctx, x)).map((x) => ({ fid: x, label: labelOf(ctx, x), until: me.pacts[x] })),
        },
        factions,
      };
    };

    // What the player may choose this turn: the DecisionContext's legal targets, shaped for the menu. UX only:
    // resolveTurn still has the last word. No combat estimate: a target shows its owner's troop band, nothing more.
    ctrl.options = (ctx = ctrl.perception()) => {
      const G = g(), st = G.state, fid = ctrl.player;
      if (!st.factions[fid].alive || st.over) return null;
      const W = ctx.world, L = ctx.legal, R = ctx.rules, me = ctx.self;
      const inOrder = (set) => Object.keys(W.owners).filter((pid) => set.includes(pid)); // public province order
      const attack = inOrder(L.attackTargets).map((pid) => {
        const owner = W.owners[pid], neutral = owner === E.NEUTRAL, x = neutral ? null : ctx.others[owner];
        return {
          pid, city: W.cities[pid], owner, ownerLabel: labelOf(ctx, owner), claimedIdentity: x ? x.claimedIdentity || null : null, pact: !neutral && !!pactUntil(ctx, owner),
          troopBand: x ? x.troopBand : 'unknown', lastSeenTurn: x ? x.lastSeenTurn : null, adjacent: true,
          via: W.neighbors[pid].filter((n) => W.owners[n] === fid).map((n) => ({ pid: n, city: W.cities[n], seat: n === me.seat })),
        };
      });
      const annex = inOrder(L.annexTargets).map((pid) => ({ pid, city: W.cities[pid], ownerLabel: world.neutral.name }));
      const full = Object.keys(me.pacts).filter((x) => pactUntil(ctx, x)).length >= R.pactMax; // own pacts only: others' pacts are not known
      const pact = L.pactTargets.map((x) => Object.assign(seen(ctx, x), { full }));
      const rivals = Object.keys(ctx.others).filter((x) => ctx.others[x].alive);
      const stratagem = { subs: ctrl.stratagems, targets: rivals.map((x) => seen(ctx, x)) };
      const fortify = L.fortifyTargets.map((pid) => ({ pid, city: W.cities[pid], fort: st.provinces[pid].fort, max: R.fortMax, seat: pid === me.seat }));
      return {
        attack, diplomacy: { annex, pact, pactTurns: R.pactTurns }, internal: { seat: me.seat, city: W.cities[me.seat] }, stratagem, fortify,
        available: { attack: attack.length > 0, diplomacy: annex.length + pact.length > 0, internal: true, stratagem: rivals.length > 0, fortify: fortify.length > 0 },
      };
    };

    // Everything the player-facing UI reads, in one call.
    ctrl.view = () => { const ctx = ctrl.perception(); return { status: ctrl.status(ctx), options: ctrl.options(ctx) }; };

    // The engine's decision shape (engine.js decide): { fid, action, sub, target, targetKind, from, betray }. `from` may
    // stay null: resolveAttack then picks the origin itself (the seat if it borders the target, else a bordering province).
    ctrl.decision = (action, c = {}) => {
      const fid = ctrl.player, base = { fid, action, sub: null, target: null, targetKind: null, from: null, betray: false };
      if (action === 'attack') return Object.assign(base, { target: c.target, targetKind: 'province', from: c.from || null, betray: !!c.betray });
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
        if (d.from && !t.via.some((v) => v.pid === d.from)) return 'Chỉ xuất quân từ châu mình giáp đích.';
        if (t.pact && !d.betray) return 'Châu này của minh hữu: phải chọn bội minh.';
      } else if (d.action === 'diplomacy') {
        if (d.sub === 'annex' && !op.diplomacy.annex.some((x) => x.pid === d.target)) return 'Chỉ chiêu hàng được châu trung lập giáp ranh.';
        if (d.sub === 'pact' && !op.diplomacy.pact.some((x) => x.fid === d.target)) return 'Không kết minh được với phe này.';
        if (d.sub !== 'annex' && d.sub !== 'pact') return 'Chưa chọn cách ngoại giao.';
      } else if (d.action === 'stratagem') {
        if (!ctrl.stratagems.some((s) => s.id === d.sub)) return 'Chưa chọn kế.';
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
        const decisions = E.fillDecisions(G, ctrl.player, alive ? d : null); // player + agents, each from its DecisionContext
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
      const v = ctrl.view(), st = v.status;
      ui.update(st, v.options);
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
