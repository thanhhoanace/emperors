// GameController: the playable turn loop around the real engine (engine.js → attach-219.js → perception.js),
// gameplay contract v1.1 (docs/product/GAMEPLAY-CONTRACT-v1.1.md).
//
//   choose an emperor → view() = what the player knows → decision(action, choice)
//   → prepare(): Engine.preparePlayerTurn, once (the AI decisions of the turn, frozen in one envelope)
//   → incoming pact offers? answer(id, accept|reject) → Engine.answerReaction on the SAME envelope
//   → commit(): Engine.resolvePrepared(envelope) → Engine.projectTurnObservation(player) → presentationOf(observation)
//
// The engine is the only authority: this file never rolls dice, never changes owners, never evaluates gates, never
// decides what the player may know. The controller holds the authoritative game, but everything it hands the UI about
// other factions comes from Engine.projectPerception(game, player), and everything the player sees of a turn comes
// from the TurnObservation. The raw RuntimeEvents stay in the history entry for replay/debug only. The player's
// identity and answers are turn/session data here (pendingTurn), never written into game.state.
// No DOM here (Node tests drive it); GameController.bind connects it to the browser.
(function (root) {
  const GC = {};
  // presentation of the stratagem kinds the engine resolves (Engine.STRATAGEMS)
  GC.STRATAGEM_TEXT = {
    discord: { label: 'Ly gián', hint: 'dân tâm địch giảm' },
    burn: { label: 'Đốt lương', hint: 'lương địch giảm' },
    defect: { label: 'Chiêu hàng tướng', hint: 'một phần quân địch trở giáo' },
  };
  GC.ACTION_ORDER = ['attack', 'diplomacy', 'internal', 'stratagem', 'fortify'];
  // DecisionContext troop bands and diplomatic pressure, as words (never turned back into numbers)
  GC.BAND_TEXT = { unknown: 'Chưa rõ', weak: 'Yếu', medium: 'Vừa', strong: 'Mạnh', very_strong: 'Rất mạnh' };
  GC.PRESSURE_TEXT = { none: 'Không đáng kể', watch: 'Theo dõi', high: 'Cao' };
  // what the four resources mean in the current engine (no statecraft states before A.5)
  GC.STAT_HELP = {
    troops: 'Quân: tổng binh lực. Mỗi mùa mộ thêm theo dân số các châu; đánh trận và thiếu lương làm hao quân.',
    grain: 'Lương: kho lương. Mỗi mùa cộng thu các châu, trừ nuôi quân. Kho cạn thì quân đói bỏ trốn, dân tâm giảm.',
    loyalty: 'Dân tâm (0–100): giữ sĩ khí khi đánh và khi thủ. Thấp quá thì châu có thể nổi dậy thoát khỏi phe; nội chính giúp tăng.',
    prestige: 'Uy (0–100): tăng khi thắng trận, kết minh, chiêu hàng; giảm khi bại trận, bội minh. Uy cao giúp chiêu hàng, kết minh, mưu kế dễ thành.',
  };

  // Province intel (DecisionContext.provinceIntel) in words. A band stays a word; fortLevel null = unknown ("?"), 0 = a
  // wall seen at level 0; commander null = "?"; the source says how fresh it is.
  GC.intelWords = function (I) {
    const band = GC.BAND_TEXT[I.troopBand] || GC.BAND_TEXT.unknown;
    const fresh = I.source === 'adjacent' ? 'Tin: hiện tại' : I.source === 'memory' ? 'Tin cũ: lượt ' + I.lastSeenTurn : I.source === 'own' ? 'Châu mình' : 'Tin: chưa có';
    const fort = I.fortLevel == null ? '?' : String(I.fortLevel), commander = I.commander == null ? '?' : I.commander;
    return {
      band, fresh, commander, fort,
      troops: 'Quân: ' + band,
      line: `quân ${band.toLowerCase()} · lũy ${fort}${I.source === 'memory' ? ' · tin cũ lượt ' + I.lastSeenTurn : I.source === 'unknown' ? ' · chưa có tin' : ''}`,
    };
  };

  // ------------------------------------------------------------------ TurnObservation → what the player is shown
  // Titles and sentences are built from textKey/titleKey and the projected fields only (labels, cities, outcome, own
  // loss). Nothing here reads a RuntimeEvent: no raw text, no hidden actor, no enemy troops, no count of hidden events.
  const TITLE = {
    own_attack: 'Tấn công', province_attacked: 'Bị tấn công', guest_truce: 'Đình chiến khách', pact_signed: 'Minh ước', pact_refused: 'Minh ước',
    own_annex: 'Chiêu hàng', own_internal: 'Nội chính', own_fortify: 'Củng cố', own_stratagem: 'Mưu kế', target_stratagem: 'Bị dùng kế',
    own_revolt: 'Dân biến', target_revolt: 'Dân biến', own_event: 'Biến cố', target_event: 'Biến cố',
    ownership_changed: 'Đổi chủ', pact_public: 'Minh ước', faction_destroyed: 'Diệt vong', succession: 'Kế vị', win: 'Thiên hạ định',
    gate_opening: 'Thu Kiến An 24', gate_guest_arrival: 'Khách lạ tới',
  };
  const num = (n) => Math.round(n).toLocaleString('vi-VN');
  // look: { player, cities {pid: city}, stratagems {id: label}, decision (the player's own order), seat (own seat) }
  GC.presentationOf = function (observation, look) {
    const city = (pid) => (pid && look.cities[pid]) || '';
    const lab = (s, dflt) => s || dflt || 'Quân địch';
    const lossText = (v) => (v.ownLoss != null && v.ownLoss >= 1 ? ` Ta mất ${num(v.ownLoss)} quân.` : '');
    const until = (v) => (v.untilTurn != null ? ` (đến lượt ${v.untilTurn})` : '');
    const subOf = (v) => (v.sub ? look.stratagems[v.sub] || v.sub : look.decision && look.decision.action === 'stratagem' && v.role !== 'target' ? look.stratagems[look.decision.sub] || '' : '');
    const visibleText = (v) => {
      switch (v.textKey) {
        case 'own_attack_win': return `${lab(v.actorLabel)} đánh ${city(v.to)} — thắng.${lossText(v)}`;
        case 'own_attack_loss': return `${lab(v.actorLabel)} đánh ${city(v.to)} — bại, rút quân.${lossText(v)}`;
        case 'province_attacked': return `Quân ${lab(v.actorLabel)} đánh ${city(v.to)} — ${v.outcome === 'win' ? 'giữ vững' : 'phòng tuyến thất thủ'}.${lossText(v)}`;
        case 'guest_truce': return v.role === 'attacker' ? `Quân ta dừng trước ${city(v.to)} — đình chiến khách còn hiệu lực.` : `Quân ${lab(v.actorLabel)} dừng trước ${city(v.to)} — đình chiến khách còn hiệu lực.`;
        case 'pact_signed': return `${lab(v.actorLabel)} và ${lab(v.otherLabel)} lập minh ước${until(v)}.`;
        case 'pact_refused': return v.role === 'self' ? `${lab(v.otherLabel)} không nhận minh ước.` : `Minh ước ${lab(v.actorLabel)} đề nghị không thành.`;
        case 'own_annex': return `Chiêu hàng ${city(v.prov)} — ${v.outcome === 'ok' ? 'thành' : 'không thành'}.`;
        case 'own_internal': return `Nội chính ở ${city(v.prov || look.seat)}.`;
        case 'own_fortify': return `Củng cố ${city(v.prov)}.`;
        case 'own_stratagem': { const s = subOf(v); return `Kế${s ? ' ' + s.toLowerCase() : ''} nhắm ${lab(v.otherLabel)} — ${v.outcome === 'ok' ? 'thành' : 'bị phát giác'}.`; }
        case 'target_stratagem': return `${lab(v.actorLabel)} dùng kế với ta — ${v.outcome === 'ok' ? 'ta trúng kế' : 'ta phát giác'}.`;
        case 'own_revolt': case 'target_revolt': return `Dân ${city(v.prov)} nổi dậy.`;
        case 'own_event': case 'target_event': return v.prov ? `Biến cố ở ${city(v.prov)}.` : v.otherLabel ? `Biến cố với ${v.otherLabel}.` : 'Biến cố trong nước.';
        default: return [TITLE[v.titleKey] || 'Tin', v.actorLabel, v.otherLabel].filter(Boolean).join(' · ') + '.';
      }
    };
    const newsText = (n) => {
      switch (n.textKey) {
        case 'ownership_changed': return `${n.city || city(n.prov)} nay thuộc ${lab(n.ownerLabel, 'Trung lập')}.`;
        case 'pact_public': return `${lab(n.actorLabel)} và ${lab(n.otherLabel)} công bố minh ước${until(n)}.`;
        case 'faction_destroyed': return `${lab(n.actorLabel)} diệt vong.`;
        case 'succession': return `${lab(n.actorLabel)} có người kế vị.`;
        case 'win': return `${lab(n.actorLabel)} định thiên hạ.`;
        case 'gate_opening': return 'Thu Kiến An 24: thiên hạ chia ba.';
        case 'gate_guest_arrival': return 'Các thế lực lạ xuất hiện ở rìa thiên hạ.';
        default: return (TITLE[n.titleKey] || 'Tin') + '.';
      }
    };
    const tone = (v) => (v.outcome === 'win' || v.outcome === 'ok' ? (v.role === 'target' && v.kind === 'stratagem' ? 'bad' : 'good') : v.outcome ? 'bad' : 'neutral');
    const items = observation.visibleEvents.map((v) => {
      const mine = v.actorId === look.player && (v.role === 'attacker' || v.role === 'self');
      const hostile = v.role === 'defender' || (v.role === 'target' && v.kind === 'stratagem');
      const it = { safe: true, kind: v.kind, role: v.role, title: TITLE[v.titleKey] || 'Tin', text: visibleText(v), tone: tone(v), fid: v.actorId || null, kicker: v.actorLabel || 'Thiên hạ', mine, hostile, shot: null };
      const actor = (id, label, role) => ({ id: 'actor:' + role, name: label || 'Trung lập', fid: id || null, role, faction: '', glyph: id === look.player ? undefined : '' });
      if (v.kind === 'attack' && v.role === 'attacker') {
        Object.assign(it, { from: v.from || null, to: v.to, win: v.outcome === 'win', badge: { win: v.outcome === 'win', text: v.outcome === 'win' ? 'Thắng' : 'Bại' },
          actors: [actor(v.actorId, v.actorLabel, 'Bên đánh'), actor(v.otherId, v.otherLabel, 'Bên thủ')], other: v.otherId || null });
        it.shot = v.from && v.to ? 'march' : 'focus'; it.prov = v.to; it.view = 'city';
      } else if (v.kind === 'attack' && v.role === 'defender') {
        // no origin on purpose: the shot looks at the player's own city, never at where the enemy came from
        Object.assign(it, { to: v.to, prov: v.to, view: 'city', shot: 'focus', dust: true, badge: { win: v.outcome === 'win', text: v.outcome === 'win' ? 'Giữ vững' : 'Thất thủ' },
          actors: [actor(v.actorId, v.actorLabel, 'Bên đánh'), actor(v.otherId, v.otherLabel, 'Bên thủ')] });
      } else {
        const prov = v.prov || v.to || (mine && (v.kind === 'internal' || v.kind === 'fortify') ? look.seat : null);
        Object.assign(it, { prov, view: v.kind === 'internal' || v.kind === 'fortify' ? 'city' : 'province', shot: 'focus',
          actors: [actor(v.actorId, v.actorLabel, v.role === 'target' ? 'Bên ra tay' : ''), ...(v.otherLabel ? [actor(v.otherId, v.otherLabel, '')] : [])] });
      }
      return it;
    });
    // playback policy: the player's own result, and at most one direct hostile reaction, get a shot; the rest is a log line
    const d = look.decision, main = !d ? [] : d.action === 'attack' ? ['attack', 'guest_truce'] : d.action === 'diplomacy' ? [d.sub === 'annex' ? 'annex' : 'pact'] : [d.action];
    const own = items.find((x) => x.mine && main.includes(x.kind)) || items.find((x) => x.mine), hit = items.find((x) => x.hostile && x !== own);
    const shots = [own, hit].filter(Boolean);
    for (const x of items) if (!shots.includes(x)) x.shot = null;
    const news = observation.publicNews.map((n) => ({ kind: n.kind, title: TITLE[n.titleKey] || 'Tin', text: newsText(n) }));
    const winNews = observation.publicNews.find((n) => n.kind === 'win');
    return {
      items, shots, log: items.filter((x) => !shots.includes(x)),
      news: news.length ? { title: 'Thiên hạ', items: news } : null,
      win: winNews ? { fid: winNews.actorId, label: winNews.actorLabel, text: newsText(winNews) } : null,
    };
  };

  GC.create = function (o) {
    const E = o.Engine, world = o.world, personas = o.personas;
    const emperors = world.factions.filter((f) => f.type === 'time_displaced').map((f) => f.id);
    const ctrl = { Engine: E, world, playable: emperors, game: null, player: null, busy: false, history: [], seed: null, pendingTurn: null };
    const g = () => ctrl.game;
    const cities = Object.fromEntries(world.provinces.map((p) => [p.id, p.city])); // public geography
    // the stratagem kinds the engine resolves
    ctrl.stratagems = (E.STRATAGEMS || Object.keys(GC.STRATAGEM_TEXT)).map((id) => Object.assign({ id }, GC.STRATAGEM_TEXT[id] || { label: id, hint: '' }));

    // the start screen: the four emperors as the player may choose them (before any game exists)
    ctrl.roster = () => emperors.map((fid) => {
      const f = world.factions.find((x) => x.id === fid), p = personas[fid];
      return { fid, name: p.name, courtesy: p.courtesy, dynasty: p.dynasty, glyph: p.glyph || '', seatCity: cities[f.start.seat], troops: f.start.troops, prestige: f.start.prestige };
    });

    // a new real engine game; the three warlords and the three other emperors stay MOCK agents
    ctrl.start = (fid, seed) => {
      if (!emperors.includes(fid)) throw new Error('not a playable emperor: ' + fid);
      ctrl.seed = seed != null ? seed : o.seed != null ? o.seed : Date.now() >>> 0;
      ctrl.game = E.createGame(world, personas, ctrl.seed);
      ctrl.player = fid; ctrl.history = []; ctrl.busy = false; ctrl.pendingTurn = null;
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
    const labelOf = (ctx, fid) => (fid === E.NEUTRAL ? world.neutral.name : fid === ctx.fid ? ctx.self.name : ctx.world.publicLabels[fid] || ctx.others[fid].publicLabel);
    const labels = (ctx, ids) => (ids || []).map((fid) => ({ fid, label: labelOf(ctx, fid) }));
    const myPacts = (ctx) => ctx.world.pacts.filter((e) => e.a === ctx.fid || e.b === ctx.fid);
    // what the player knows of one province (DecisionContext.provinceIntel): band, commander, fort, when, from where
    const intelOf = (ctx, pid) => { const x = ctx.provinceIntel[pid]; return { troopBand: x.troopBand, commander: x.commander, fortLevel: x.fortLevel, lastSeenTurn: x.lastSeenTurn, source: x.source }; };

    // Status panel + faction panel. Own realm exact; others as perceived; ordered by public province count, then the
    // fixed faction order (never by hidden troops or prestige).
    ctrl.status = (ctx = ctrl.perception()) => {
      const G = g(), st = G.state, fid = ctrl.player, me = ctx.self, alive = st.factions[fid].alive;
      const own = { fid, label: me.name, me: true, alive, provinces: me.provinces.length, troops: me.troops, prestige: me.prestige };
      const factions = [own].concat(Object.keys(ctx.others).map((x) => seen(ctx, x)))
        .sort((a, b) => b.alive - a.alive || b.provinces - a.provinces || G.def.order.indexOf(a.fid) - G.def.order.indexOf(b.fid));
      // guest protection: exactly the player's own legal status (self.guestProtection), nothing derived beyond wording
      const gp = me.guestProtection;
      const guest = gp && alive ? {
        active: gp.active, remainingTurns: gp.remainingTurns, protectedFrom: labels(ctx, gp.protectedFrom), brokenAgainst: labels(ctx, gp.brokenAgainst),
        ended: gp.active ? null : gp.remainingTurns > 0 && me.provinces.length >= 2 ? 'expanded' : gp.remainingTurns === 0 ? 'expired' : 'inactive',
      } : null;
      return {
        turn: ctx.turn, maxTurns: G.def.rules.maxTurns, calendar: ctx.calendar, over: !!st.over, winner: st.winner || null, seed: ctrl.seed,
        player: {
          fid, name: me.name, alive, seat: me.seat, seatCity: alive ? ctx.world.cities[me.seat] : null,
          troops: me.troops, grain: me.grain, loyalty: me.loyalty, prestige: me.prestige,
          income: alive ? E.income(G, fid) : 0, upkeep: alive ? E.upkeep(G, fid) : 0,
          provinces: me.provinces.map((pid) => ({ pid, city: ctx.world.cities[pid], fort: st.provinces[pid].fort, seat: pid === me.seat })),
          // live pacts from the public pact graph (world.pacts): the engine's own untilTurn / remainingTurns
          pacts: myPacts(ctx).map((e) => { const x = e.a === fid ? e.b : e.a; return { fid: x, label: labelOf(ctx, x), untilTurn: e.untilTurn, remainingTurns: e.remainingTurns }; }),
          guest,
        },
        factions,
        world: {
          pacts: ctx.world.pacts.filter((e) => e.a !== fid && e.b !== fid).map((e) => ({ a: e.a, aLabel: labelOf(ctx, e.a), b: e.b, bLabel: labelOf(ctx, e.b), untilTurn: e.untilTurn, remainingTurns: e.remainingTurns })),
          // border pressure as the player's DecisionContext rates it (none | watch | high); not another faction's intent
          pressure: Object.keys(ctx.diplomaticPressure).filter((x) => ctx.others[x] && ctx.others[x].alive).map((x) => ({ fid: x, label: labelOf(ctx, x), level: ctx.diplomaticPressure[x] })),
        },
      };
    };

    // What the player may choose this turn: the DecisionContext's legal targets, shaped for the menu. UX only:
    // resolveTurn still has the last word. A target shows the province intel the player has, no combat estimate.
    ctrl.options = (ctx = ctrl.perception()) => {
      const G = g(), st = G.state, fid = ctrl.player;
      if (!st.factions[fid].alive || st.over) return null;
      const W = ctx.world, L = ctx.legal, R = ctx.rules, me = ctx.self;
      const inOrder = (set) => Object.keys(W.owners).filter((pid) => set.includes(pid)); // public province order
      const pactWith = new Set(myPacts(ctx).map((e) => (e.a === fid ? e.b : e.a)));
      const attack = inOrder(L.attackTargets).map((pid) => {
        const owner = W.owners[pid], neutral = owner === E.NEUTRAL;
        return {
          pid, city: W.cities[pid], owner, ownerLabel: labelOf(ctx, owner), claimedIdentity: neutral ? null : ctx.others[owner].claimedIdentity || null, pact: !neutral && pactWith.has(owner),
          intel: intelOf(ctx, pid),
          via: W.neighbors[pid].filter((n) => W.owners[n] === fid).map((n) => ({ pid: n, city: W.cities[n], seat: n === me.seat })),
        };
      });
      const annex = inOrder(L.annexTargets).map((pid) => ({ pid, city: W.cities[pid], owner: E.NEUTRAL, ownerLabel: labelOf(ctx, E.NEUTRAL), intel: intelOf(ctx, pid) }));
      // what the player still remembers of provinces out of reach (source memory); not attackable, for planning only
      const far = Object.keys(W.owners).filter((pid) => ctx.provinceIntel[pid].source === 'memory').map((pid) => ctrl.provinceCard(pid, ctx));
      const full = pactWith.size >= R.pactMax; // own pacts only: others' pacts do not decide the menu
      const pact = L.pactTargets.map((x) => Object.assign(seen(ctx, x), { full, pressure: ctx.diplomaticPressure[x] || 'none' }));
      const rivals = Object.keys(ctx.others).filter((x) => ctx.others[x].alive);
      const stratagem = { subs: ctrl.stratagems, targets: rivals.map((x) => seen(ctx, x)) };
      const fortify = L.fortifyTargets.map((pid) => ({ pid, city: W.cities[pid], fort: st.provinces[pid].fort, max: R.fortMax, seat: pid === me.seat }));
      return {
        attack, far, diplomacy: { annex, pact, pactTurns: R.pactTurns }, internal: { seat: me.seat, city: W.cities[me.seat] }, stratagem, fortify,
        available: { attack: attack.length > 0, diplomacy: annex.length + pact.length > 0, internal: true, stratagem: rivals.length > 0, fortify: fortify.length > 0 },
      };
    };

    // one province as the player knows it: public owner and city, intel from the DecisionContext
    ctrl.provinceCard = (pid, ctx = ctrl.perception()) => {
      const owner = ctx.world.owners[pid];
      return { pid, city: ctx.world.cities[pid], owner, ownerLabel: labelOf(ctx, owner), intel: intelOf(ctx, pid) };
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
        if (!d.target) return 'Chưa chọn châu đích.';
        const t = op.attack.find((x) => x.pid === d.target);
        if (!t) return 'Chỉ đánh được châu giáp ranh không được bảo hộ.';
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

    // ---------------------------------------------------------------- one turn: prepare once → reactions → commit
    // prepare(): the main action is committed for this turn. Engine.preparePlayerTurn runs exactly once and freezes
    // every AI decision in the envelope; answering offers never regenerates them. Busy until finish() (after playback).
    ctrl.prepare = (d) => {
      const G = g();
      if (!G) throw new Error('no game');
      if (ctrl.busy || ctrl.pendingTurn) throw new Error('turn already resolving');
      if (G.state.over) throw new Error('game over');
      const alive = G.state.factions[ctrl.player].alive;
      if (alive) { const err = ctrl.validate(d); if (err) throw new Error(err); }
      ctrl.busy = true;
      try {
        const beforeOwners = E.ownersSnapshot(G);                                 // public map before the turn
        const envelope = E.preparePlayerTurn(G, ctrl.player, alive ? d : null);   // player + agents, frozen once
        ctrl.pendingTurn = { decision: alive ? d : null, envelope, beforeOwners };
        return ctrl.reactions();
      } catch (e) { ctrl.busy = false; ctrl.pendingTurn = null; throw e; }
    };
    // incoming pact offers of the prepared turn (envelope.pendingReactions only; declinedOffers are never actionable),
    // named by the player's DecisionContext
    ctrl.reactions = () => {
      const pt = ctrl.pendingTurn;
      if (!pt) return [];
      const ctx = ctrl.perception(), answers = pt.envelope.answers || {};
      return pt.envelope.pendingReactions.map((r) => ({ id: r.id, kind: r.kind, from: r.from, fromLabel: labelOf(ctx, r.from), turns: r.turns, answer: answers[r.id] || null }));
    };
    ctrl.unanswered = () => ctrl.reactions().filter((r) => !r.answer);
    ctrl.answer = (id, answer) => {
      if (!ctrl.pendingTurn) throw new Error('no prepared turn');
      E.answerReaction(ctrl.pendingTurn.envelope, id, answer); // the engine checks the id against the envelope
      return ctrl.reactions();
    };
    // resolve the SAME prepared envelope, then keep only what the player observes for presentation
    ctrl.commit = () => {
      const G = g(), pt = ctrl.pendingTurn;
      if (!pt) throw new Error('no prepared turn');
      const result = E.resolvePrepared(G, pt.envelope);
      if (result.blocked) throw new Error('reactions pending');
      const observation = E.projectTurnObservation(G, ctrl.player, result, pt.beforeOwners);
      const seat = G.state.factions[ctrl.player].seat;
      const entry = {
        turn: result.turn, calendar: result.calendar, decision: pt.decision, envelope: pt.envelope, decisions: pt.envelope.decisions,
        answers: Object.assign({}, pt.envelope.answers),
        events: result.events, frozen: JSON.stringify(result.events), // RuntimeEvent truth: replay/debug only, never shown
        observation, visibleEvents: observation.visibleEvents, publicNews: observation.publicNews,
        presentation: GC.presentationOf(observation, { player: ctrl.player, cities, seat, decision: pt.decision, stratagems: Object.fromEntries(ctrl.stratagems.map((s) => [s.id, s.label])) }),
        played: [], skipped: [],
      };
      ctrl.history.push(entry);
      ctrl.pendingTurn = null;
      return entry;
    };
    // prepare + answer + commit in one call (tests, fast-forward). `answer` (fn(reaction) or 'accept'/'reject') is
    // required when the engine hands the player an offer: the controller never answers for the player on its own.
    ctrl.resolve = (d, answer) => {
      ctrl.prepare(d);
      if (answer) for (const r of ctrl.unanswered()) ctrl.answer(r.id, typeof answer === 'function' ? answer(r) : answer);
      if (ctrl.unanswered().length) throw new Error('reactions pending');
      return ctrl.commit();
    };
    ctrl.finish = () => { ctrl.busy = false; ctrl.pendingTurn = null; };
    return ctrl;
  };

  // ------------------------------------------------------------------ browser: reactions, playback, state sync
  // view: { rt, presenter, hud, ui }. Returns { choose(fid), submit(decision), sync() }.
  // Playable playback reads entry.presentation (from the TurnObservation) only; entry.events is never shown here.
  GC.bind = function (ctrl, view) {
    const { rt, presenter, hud, ui } = view;
    const loop = { playing: false, last: null };
    const idle = () => { rt.render(); hud.drawPlaces(rt, rt.view().mode === 'far'); };
    // the world and the HUD follow engine state only
    loop.sync = () => {
      rt.setOwners(ctrl.owners());
      presenter.end();
      idle();
      const v = ctrl.view(), st = v.status, last = ctrl.history[ctrl.history.length - 1];
      ui.update(st, v.options);
      ui.news(last ? last.presentation.news : null, last);
      if (st.over) ui.gameOver(st, last ? last.presentation.win : null);
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
      ctrl.prepare(d); // throws on an invalid decision: nothing was sent to the engine
      loop.playing = true;
      ui.lock(true);
      let entry = null;
      try {
        // incoming pact offers: one card each, in the envelope's order; the answer costs no main action
        const offers = ctrl.unanswered();
        for (let i = 0; i < offers.length; i++) ctrl.answer(offers[i].id, await ui.react(offers[i], i, offers.length));
        entry = ctrl.commit();
        const P = entry.presentation;
        ui.progress(0, P.shots.length, entry);
        hud.log({ fid: ctrl.player, text: 'Lượt ' + entry.turn + ' · ' + entry.calendar.season + ' năm ' + entry.calendar.year }, '');
        await presenter.playAll(P.shots, {
          onEvent: (it) => { entry.played.push(it); hud.log(it, it.title); ui.progress(entry.played.length, P.shots.length); },
          onSkip: (it) => { entry.skipped.push(it); hud.log(it, it.title); },
        });
        for (const it of P.log) hud.log(it, it.title);
      } finally {
        loop.playing = false;
        ctrl.finish();
        ui.lock(false);
        loop.sync();
      }
      return entry;
    };
    return loop;
  };

  if (typeof module === 'object' && module.exports) module.exports = GC;
  else root.GameController = GC;
})(typeof window !== 'undefined' ? window : globalThis);
