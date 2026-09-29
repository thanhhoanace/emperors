/*
 * Tam Quốc Loạn Nhập — Demo Hoài Nam, the v2 rules (docs/design/v2-build.md §E; GAMEPLAY-FREEZE.md v2, tiers A and B).
 *
 * Pure and deterministic like engine.js and battle.js: a game is a plain JSON state `g`, every call returns a new
 * state, and every roll comes from g's own seed (the battles' seeds too), so a whole game replays from its seed. No
 * DOM, no Math.random, no clock. Content (towns, armies, generals, tasks, cards, the AI's hooks) is
 * data/scenario/huainan.json, carried in g.data and never written; the rules and their numbers are here, ported from
 * the demo 1 spike (docs/phases/v2-gameplay/demo1/src/hn-rules.js) with the freeze v2 changes. Battles are
 * src/engine/battle.js. Loaded as a classic <script> after battle.js (window.EmperorsV2) or with require() in Node.
 *
 *   const g = V2.newGame(data, seed)
 *   V2.view(g) → what the player (g.me) sees; the UI and the scene read only this
 *   V2.targets(g, armyId) → [{ kind, id, intent: 'move'|'attack'|'ask', d, km, seasons }]
 *   V2.preview(g, act) → { seasons, res: { luong: [before, after], tien, uy }, lines, ok, fall? }
 *   V2.order(g, armyId, target|null, intent?) · V2.tasks(g, townId) · V2.setTask(g, townId, key|null)
 *   V2.transfer(g, townId, armyId, arm, n) · V2.answer(g, cardId, yes) · V2.forecast(g, armyIds, target)
 *   V2.endSeason(g) → g.pending (a battle of ours: V2.battle / battleTurn / autoBattle) or the next season, g.report
 *   V2.lastBattle(g) → the battle that just ended, { plan, b, me, proposed: {}, outcome }, for the screen after it
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../battle.js'));
  else root.EmperorsV2 = factory(root.EmperorsBattle);
})(typeof self !== 'undefined' ? self : this, function (Battle) {
  'use strict';
  if (!Battle) throw new Error('EmperorsV2 needs EmperorsBattle (src/engine/battle.js) loaded first');

  // ---------------------------------------------------------------- tier B numbers (GAMEPLAY-FREEZE.md B, demo 1)
  const ARMS = ['bo', 'cung', 'ky', 'thuy'];
  const RES_NAME = { luong: 'lương', tien: 'tiền', uy: 'Uy' };
  const REACH = { land: 36, fast: 45, fleet: 60 }; // world units a season (1 = 3 km): foot 108 km, horse 135, boats 180 on one river
  const NEAR = 33; // ~100 km of our towns or armies: numbers within ±20 %; farther only the flag and the arms
  const SPREAD = 0.2;
  const GUESS = 0.5; // a far army in a forecast: the analyst guesses (the spike's old far spread)
  const UPKEEP = { bo: 0.1, cung: 0.1, ky: 0.2, thuy: 0.15 }; // grain a man a season
  const GARRISON = 0.05;
  const GRAIN = 0.03, COIN = 0.012, FARM = 1.25, MARKET = 200, MAX_WALLS = 4;
  const SIEGE = { gar: 0.8, dan: 0.92, open: 0.3, keep: 0.15 };
  const TAKE = { gar: 0.2, army: 0.8 }; // a town taken: garrison 20 % of the winners, the armies keep 80 %
  const RETREAT = 300, DISBAND = 200, GUARD = 300, KEEP = 100;
  const UY = { win: 4, lose: -6, lost: -8, held: 5, opened: 3 };
  const LEAVE = 30; // Trung below this: the general walks out with his army
  const DESERT = 0.9; // a season below zero grain: a tenth of the men run
  const RULES = { REACH, NEAR, SPREAD, GUESS, UPKEEP, GARRISON, GRAIN, COIN, FARM, MARKET, MAX_WALLS, SIEGE, TAKE, RETREAT, DISBAND, GUARD, KEEP, UY, LEAVE, DESERT };

  // ---------------------------------------------------------------- helpers
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // a new state: everything copied but the scenario, which nothing writes
  function copy(g) {
    const data = g.data;
    const o = clone(Object.assign({}, g, { data: null }));
    o.data = data;
    return o;
  }
  // mulberry32 over g.rs, as the spike and engine.js
  function rnd(g) {
    g.rs = (g.rs + 0x6d2b79f5) >>> 0;
    let t = g.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const fmt = (n) => { n = Math.round(n); const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '−' : '') + s; };
  const r100 = (n) => Math.round(n / 100) * 100;
  const total = (u) => ARMS.reduce((s, k) => s + (Number(u && u[k]) || 0), 0);
  const full = (u) => ({ bo: Math.round((u && u.bo) || 0), cung: Math.round((u && u.cung) || 0), ky: Math.round((u && u.ky) || 0), thuy: Math.round((u && u.thuy) || 0) });
  const addUnits = (to, u) => { for (const [k, v] of Object.entries(u || {})) to[k] = (to[k] || 0) + v; return to; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const fill = (s, o) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (o[k] == null ? m : o[k]));
  const place = (g, tid) => g.data.towns.find((t) => t.id === tid);
  const posOf = (g, tid) => place(g, tid).xz;
  const riverOf = (g, tid) => place(g, tid).river || null;
  const townName = (g, tid) => place(g, tid).name;
  const short = (g, fid) => (g.data.factions[fid] || {}).short || fid;
  const genData = (g, gid) => (gid && g.data.generals[gid]) || null;
  const genName = (g, gid) => (genData(g, gid) || { name: 'Tướng giữ thành' }).name;
  const armyName = (g, a) => (a ? genName(g, a.gen) : 'đạo quân');
  const uyOf = (g, gid) => (genData(g, gid) || Battle.OFFICER).uy;
  const muuOf = (g, gid) => (genData(g, gid) || Battle.OFFICER).muu;
  const isLord = (g, gid) => !!(genData(g, gid) && genData(g, gid).lord);
  const log = (g, s) => g.log.push(s);
  const chron = (g, s) => { if (s) g.chronicle.push({ s: g.season, t: s }); };
  const ownTowns = (g, fid) => g.data.towns.map((t) => t.id).filter((tid) => g.towns[tid].owner === fid);
  const armiesOf = (g, fid) => Object.values(g.armies).filter((a) => a.fid === fid);
  // allies only count for the player (the spike's one alliance: Ngô)
  const hostile = (g, fid, owner) => owner !== fid && !(fid === g.me && g.allies[owner]) && !(owner === g.me && g.allies[fid]);
  function cal(g, s) {
    const c = g.data.calendar, i = c.season + s - 1;
    return c.names[i % 4] + ' ' + (c.year + Math.floor(i / 4));
  }
  const seedFrom = (g) => (Math.floor(rnd(g) * 4294967296) >>> 0) || 1;

  // ---------------------------------------------------------------- new game
  function newGame(data, seed) {
    if (!data || !Array.isArray(data.towns) || !data.start || !data.generals) throw new Error('V2.newGame: needs data/scenario/huainan.json');
    const s = seed >>> 0, st = data.start;
    const rumor = (data.cards || []).find((c) => c.effect === 'rumor');
    const g = {
      v: 2, scenario: data.id, seed: s, rs: s || 1, season: 1, me: data.me, over: null,
      res: clone(st.res), warn: { luong: false, uy: false }, income: null,
      gens: {}, towns: {}, armies: {}, captives: [], allies: {}, angry: {}, vanguard: null,
      rumor: rumor ? rumor.params.no : 0.5,
      cards: [], queue: [], pending: null, lastBattle: null, battleNo: 0, taken: [],
      report: null, flash: null, log: [], moves: [], fought: [], chronicle: [],
      data: null,
    };
    for (const [id, x] of Object.entries(data.generals)) g.gens[id] = { fid: x.fid, loyal: x.loyal, dead: false, free: false };
    for (const t of data.towns) {
      const x = st.towns[t.id];
      if (!x) throw new Error('V2.newGame: no start for town ' + t.id);
      g.towns[t.id] = { owner: x.owner, gar: clone(x.gar || {}), walls: x.walls || 0, dan: x.dan || 0, gov: x.gov || null, task: null, farm: false, market: false, taxFree: 0 };
    }
    for (const a of st.armies) g.armies[a.id] = { id: a.id, fid: a.fid, gen: a.gen || null, arm: a.arm, at: a.at, units: clone(a.units), order: null, besieging: null };
    g.data = data;
    g.cards = seasonCards(g);
    chron(g, st.chronicle);
    return g;
  }

  // ---------------------------------------------------------------- perception (freeze A "Thấy quân")
  // a faction's eyes: its towns and its armies
  function eyes(g, fid) {
    const out = [];
    for (const tid of ownTowns(g, fid)) out.push(posOf(g, tid));
    for (const a of armiesOf(g, fid)) out.push(posOf(g, a.at));
    return out;
  }
  const isNear = (g, fid, tid) => eyes(g, fid).some((e) => dist(e, posOf(g, tid)) < NEAR);
  // one fixed factor per (game, season, viewer, thing), from a hash: the same all season, no draw from the game's RNG
  function factor(g, fid, key, spread) {
    const h = hash32(g.seed + '|' + g.season + '|' + fid + '|' + key);
    return 1 - spread + (h / 4294967296) * 2 * spread;
  }
  function approx(units, f) {
    const u = {};
    for (const k of Object.keys(units || {})) u[k] = r100((units[k] || 0) * f);
    return u;
  }
  // an army's men as `fid` knows them: its own exact, near ±20 %, far unknown (null) unless someone must guess
  function seenUnits(g, fid, a, guess) {
    if (a.fid === fid) return a.units;
    if (isNear(g, fid, a.at)) return approx(a.units, factor(g, fid, 'army:' + a.id, SPREAD));
    return guess ? approx(a.units, factor(g, fid, 'guess:' + a.id, GUESS)) : null;
  }
  // a town's garrison: exact for its owner, else ±20 % (a town does not move; its walls are counted from outside)
  function seenGar(g, fid, tid) {
    const t = g.towns[tid];
    return t.owner === fid ? t.gar : approx(t.gar, factor(g, fid, 'town:' + tid, SPREAD));
  }
  // who holds a town (garrison and the owner's armies inside), the truth and as `fid` sees it
  const defenders = (g, tid) => total(g.towns[tid].gar) + Object.values(g.armies).filter((a) => a.fid === g.towns[tid].owner && a.at === tid && !a.besieging).reduce((s, a) => s + total(a.units), 0);
  const seenDefenders = (g, fid, tid) => total(seenGar(g, fid, tid)) + Object.values(g.armies).filter((a) => a.fid === g.towns[tid].owner && a.at === tid && !a.besieging).reduce((s, a) => s + total(seenUnits(g, fid, a, true)), 0);

  // ---------------------------------------------------------------- the view
  // a general's card: ours (and captives in our hands) in full, the others only who they are
  const knows = (g, gid) => !!g.gens[gid] && (g.gens[gid].fid === g.me || g.captives.indexOf(gid) !== -1);
  function genCard(g, gid) {
    const d = genData(g, gid), s = g.gens[gid];
    if (!d) return null;
    const c = { id: gid, name: d.name, fid: s ? s.fid : d.fid, seal: d.seal };
    if (!knows(g, gid)) return c;
    return Object.assign(c, { cls: d.cls, uy: d.uy, tai: d.tai, muu: d.muu, dung: d.dung, kien: d.kien, loyal: s.loyal, trait: d.trait, traitText: d.traitText });
  }
  function view(g) {
    const me = g.me;
    const towns = g.data.towns.map((d) => {
      const t = g.towns[d.id], own = t.owner === me;
      return {
        id: d.id, name: d.name, owner: t.owner, walls: t.walls, river: !!d.river,
        gar: full(seenGar(g, me, d.id)), garApprox: !own,
        task: own && t.task ? { key: t.task.key, name: g.data.tasks[t.task.key].name, left: t.task.left } : null,
        gov: t.gov ? genCard(g, t.gov) : null,
      };
    });
    const armies = Object.values(g.armies).map((a) => {
      const u = seenUnits(g, me, a, false);
      return {
        id: a.id, fid: a.fid, arm: a.arm, at: a.at, besieging: a.besieging || null, gen: a.gen ? genCard(g, a.gen) : null,
        units: u ? full(u) : null,
        arms: Object.keys(a.units).filter((k) => a.units[k] > 0),
        seen: a.fid === me ? 'own' : u ? 'near' : 'far',
        order: a.fid === me && a.order ? { intent: a.order.intent, target: { kind: a.order.target.kind, id: a.order.target.id } } : null,
      };
    });
    const gens = {};
    for (const gid of Object.keys(g.data.generals)) gens[gid] = genCard(g, gid);
    return {
      season: g.season, calendar: cal(g, g.season), me, over: g.over ? { win: g.over.win, why: g.over.why } : null,
      res: { luong: g.res.luong, tien: g.res.tien, uy: g.res.uy }, income: g.income ? clone(g.income) : null, warn: clone(g.warn),
      towns, armies,
      cards: g.cards.map(cardView),
      gens,
      report: g.report ? clone(g.report) : null,
      pending: !!g.pending, flash: g.flash ? clone(g.flash) : null, moves: clone(g.moves || []),
    };
  }
  function cardView(c) {
    const o = { id: c.id, kind: c.kind, who: c.who };
    if (c.gen) o.gen = c.gen;
    return Object.assign(o, { title: c.title, text: c.text, yes: clone(c.yes), no: clone(c.no), urgent: !!c.urgent });
  }

  // ---------------------------------------------------------------- targets and orders
  const reachOf = (a) => (a.arm === 'fleet' ? REACH.fleet : (a.units.ky || 0) > total(a.units) * 0.5 ? REACH.fast : REACH.land);
  // legal targets this season, the intent read from the target: our or allied land = move, an enemy army = attack,
  // an enemy town = ask (the caller asks "attack now or besiege"). Boats keep to their river (Huai and Yangtze apart).
  function targets(g, armyId) {
    const a = g.armies[armyId];
    if (!a) throw new Error('V2.targets: no army ' + armyId);
    const p = posOf(g, a.at), riv = riverOf(g, a.at), r = reachOf(a) + 0.5, out = [];
    for (const d of g.data.towns) {
      if (a.arm === 'fleet' && (!d.river || d.river !== riv)) continue;
      const dd = dist(p, d.xz), h = hostile(g, a.fid, g.towns[d.id].owner);
      if (dd > r || (a.at === d.id && !h)) continue;
      out.push({ kind: 'town', id: d.id, intent: h ? 'ask' : 'move', d: Math.round(dd), km: Math.round(dd * 3), seasons: 1 });
    }
    for (const b of Object.values(g.armies)) {
      if (!hostile(g, a.fid, b.fid)) continue;
      if (a.arm === 'fleet' && (b.arm !== 'fleet' || riverOf(g, b.at) !== riv)) continue;
      const dd = dist(p, posOf(g, b.at));
      if (dd <= r) out.push({ kind: 'army', id: b.id, intent: 'attack', d: Math.round(dd), km: Math.round(dd * 3), seasons: 1 });
    }
    return out;
  }
  // the order an army would take: { intent, target } or { why } when it cannot
  function orderFor(g, armyId, target, intent) {
    const a = g.armies[armyId];
    if (!a || a.fid !== g.me) return { why: armyId + ' is not an army of ours' };
    if (!target) return { order: null };
    const t = targets(g, armyId).find((x) => x.kind === target.kind && x.id === target.id);
    if (!t) return { why: target.kind + ' ' + target.id + ' is not in reach of ' + armyId };
    let it = t.intent;
    if (it === 'ask') {
      if (intent !== 'attack' && intent !== 'siege') return { why: "an enemy town needs intent 'attack' or 'siege'" };
      it = intent;
    } else if (intent && intent !== it) return { why: target.kind + ' ' + target.id + ' takes ' + it + ', not ' + intent };
    return { order: { intent: it, target: { kind: t.kind, id: t.id } }, t };
  }
  function busy(g, who) {
    if (g.pending) throw new Error(who + ': a battle is pending');
    if (g.over) throw new Error(who + ': the game is over');
  }
  // at most one order an army: a new one replaces the old; null clears it (the army holds)
  function order(g0, armyId, target, intent) {
    busy(g0, 'V2.order');
    const o = orderFor(g0, armyId, target, intent);
    if (o.why) throw new Error('V2.order: ' + o.why);
    const g = copy(g0);
    g.armies[armyId].order = o.order;
    return g;
  }

  // ---------------------------------------------------------------- town work
  function taskCheck(g, tid, key) {
    const T = g.data.tasks[key], t = g.towns[tid], d = place(g, tid);
    if (!T) return { ok: false, rule: true, why: 'Không có việc này.' };
    if (t.owner !== g.me) return { ok: false, rule: true, why: 'Không phải thành ta.' };
    if (t.task && !t.task.fresh) return { ok: false, rule: true, why: g.data.tasks[t.task.key].name + ' đang làm, còn ' + t.task.left + ' mùa.' };
    if (T.river && !d.river) return { ok: false, rule: true, why: 'Chỉ thành ven sông.' };
    const done = T.done || {};
    if (done.walls && t.walls >= MAX_WALLS) return { ok: false, rule: true, why: 'Lũy đã cao nhất (' + MAX_WALLS + ').' };
    if (done.farm && t.farm) return { ok: false, rule: true, why: 'Đã khai ruộng.' };
    if (done.market && t.market) return { ok: false, rule: true, why: 'Đã có chợ.' };
    if (done.dan && t.dan < done.dan * 2) return { ok: false, rule: true, why: 'Dân không đủ để mộ.' };
    const refund = t.task && t.task.fresh ? g.data.tasks[t.task.key].cost : {};
    for (const [k, v] of Object.entries(T.cost)) {
      if (g.res[k] + (refund[k] || 0) < v) return { ok: false, rule: false, why: 'Thiếu ' + RES_NAME[k] + ': cần ' + fmt(v) + '.' };
    }
    return { ok: true, rule: false, why: null };
  }
  // an enemy army could reach the town this season (seen as the player sees it: a far army's arms, not its men)
  function threatened(g, tid) {
    const p = posOf(g, tid), riv = riverOf(g, tid);
    return Object.values(g.armies).some((a) => {
      if (!hostile(g, g.me, a.fid)) return false;
      const r = a.arm === 'fleet' ? (riv && riverOf(g, a.at) === riv ? REACH.fleet : -1) : REACH.fast;
      return dist(p, posOf(g, a.at)) <= r + 0.5;
    });
  }
  // 2–3 tasks by context: a town an enemy can reach walls up and recruits; a rear town farms and trades; a river town
  // without boats builds them. The rest stay under "more" (freeze B, owner 29/9).
  function suggest(g, tid, all) {
    const t = g.towns[tid], d = place(g, tid);
    if (t.owner !== g.me || (t.task && !t.task.fresh)) return [];
    const front = threatened(g, tid);
    const boats = (t.gar.thuy || 0) > 0 || armiesOf(g, g.me).some((a) => a.at === tid && a.arm === 'fleet');
    const want = (front ? ['luy', 'mo_bo'] : ['ruong', 'cho']).concat(d.river && !boats ? ['mo_thuy'] : []);
    const spare = front ? ['mo_cung', 'ruong', 'mo_ky', 'cho'] : ['mo_bo', 'luy', 'mo_cung', 'mo_ky'];
    const can = (k) => { const x = all.find((y) => y.key === k); return !!x && !x.rule; };
    const out = want.filter(can).slice(0, 3);
    for (const k of spare) if (out.length < 2 && can(k) && out.indexOf(k) === -1) out.push(k);
    return out;
  }
  function tasks(g, tid) {
    const t = g.towns[tid];
    if (!t) throw new Error('V2.tasks: no town ' + tid);
    const all = Object.entries(g.data.tasks).map(([key, T]) => {
      const c = taskCheck(g, tid, key);
      return { key, name: T.name, seasons: T.seasons, cost: clone(T.cost), text: T.text, ok: c.ok, why: c.why, rule: c.rule };
    });
    const suggested = suggest(g, tid, all);
    for (const x of all) delete x.rule;
    return { suggested, all, current: t.owner === g.me && t.task ? { key: t.task.key, name: g.data.tasks[t.task.key].name, left: t.task.left, fresh: !!t.task.fresh } : null };
  }
  // at most one task a town; paid up front; a pick changed in the same season is refunded; work under way stays
  function setTask(g0, tid, key) {
    busy(g0, 'V2.setTask');
    const t0 = g0.towns[tid];
    if (!t0 || t0.owner !== g0.me) throw new Error('V2.setTask: ' + tid + ' is not a town of ours');
    if (t0.task && !t0.task.fresh) throw new Error('V2.setTask: work under way in ' + tid + ' cannot change');
    if (key) { const c = taskCheck(g0, tid, key); if (!c.ok) throw new Error('V2.setTask: ' + key + ' in ' + tid + ': ' + c.why); }
    const g = copy(g0), t = g.towns[tid];
    if (t.task && t.task.fresh) for (const [k, v] of Object.entries(g.data.tasks[t.task.key].cost)) g.res[k] += v;
    t.task = null;
    if (!key) return g;
    const T = g.data.tasks[key];
    for (const [k, v] of Object.entries(T.cost)) g.res[k] -= v;
    t.task = { key, left: T.seasons, fresh: true };
    return g;
  }
  // men between a town's garrison and an army of ours standing in it (n > 0: town → army); free, not an order
  function transfer(g0, tid, armyId, arm, n) {
    busy(g0, 'V2.transfer');
    const t0 = g0.towns[tid], a0 = g0.armies[armyId];
    if (!t0 || t0.owner !== g0.me) throw new Error('V2.transfer: ' + tid + ' is not a town of ours');
    if (!a0 || a0.fid !== g0.me || a0.at !== tid) throw new Error('V2.transfer: ' + armyId + ' is not an army of ours in ' + tid);
    if (ARMS.indexOf(arm) === -1) throw new Error('V2.transfer: no arm ' + arm);
    if (arm === 'thuy' && a0.arm !== 'fleet' && n > 0) throw new Error('V2.transfer: boats only join a fleet');
    const g = copy(g0), t = g.towns[tid], a = g.armies[armyId];
    n = Math.round(Number(n) || 0);
    if (n > 0) {
      n = Math.min(n, t.gar[arm] || 0);
      t.gar[arm] = (t.gar[arm] || 0) - n; a.units[arm] = (a.units[arm] || 0) + n;
    } else if (n < 0) {
      n = Math.max(0, Math.min(-n, a.units[arm] || 0, total(a.units) - KEEP)); // an army keeps a core
      a.units[arm] = (a.units[arm] || 0) - n; t.gar[arm] = (t.gar[arm] || 0) + n;
    }
    return g;
  }

  // ---------------------------------------------------------------- cards: a queue; unanswered at the season's end = "no"
  function seasonCards(g) {
    const out = [];
    for (const c of g.data.cards || []) {
      const w = c.when || {};
      if (w.captive) {
        for (const gid of g.captives) {
          const d = genData(g, gid), s = g.gens[gid], p = c.params || {};
          if (!d || !s) continue;
          const o = { name: d.name, cls: d.cls, muu: d.muu, dung: d.dung, loyal: s.loyal, pct: Math.round((s.loyal >= p.loyalHigh ? p.pHigh : p.pLow) * 100) };
          out.push(makeCard(c, c.id + '_' + gid, gid, o));
        }
        continue;
      }
      if (w.season != null && g.season !== w.season) continue;
      if (w.from != null && g.season < w.from) continue;
      let o = {};
      if (w.gen) {
        const s = g.gens[w.gen];
        if (!s || s.dead || s.fid !== g.me || (w.loyalBelow != null && s.loyal >= w.loyalBelow)) continue;
        o = { loyal: s.loyal, name: genName(g, w.gen) };
      }
      out.push(makeCard(c, c.repeat ? c.id + '_' + g.season : c.id, c.gen || null, o));
    }
    return out;
  }
  function makeCard(c, id, gen, o) {
    const x = { id, src: c.id, kind: c.kind, who: c.who, title: fill(c.title, o), text: fill(c.text, o), yes: { label: fill(c.yes.label, o), fx: fill(c.yes.fx, o) }, no: { label: fill(c.no.label, o), fx: fill(c.no.fx, o) }, urgent: !!c.urgent };
    if (gen) x.gen = gen;
    return x;
  }
  // what each kind of card does (the card's numbers are data: params)
  const CARD_FX = {
    rumor(g, c, p, yes, d) {
      g.rumor = yes ? p.yes : p.no;
      if (yes) g.res.uy += p.uy;
      chron(g, d.chronicle && d.chronicle[yes ? 'yes' : 'no']);
    },
    alliance(g, c, p, yes, d) {
      if (!yes) return;
      g.allies[p.fid] = { boats: p.boats || 0 };
      chron(g, d.chronicle && d.chronicle.yes);
    },
    submit(g, c, p, yes, d) {
      if (!yes) { g.res.uy += p.uyNo || 0; return; }
      const t = g.towns[p.town];
      if (!t || t.owner === g.me) return;
      t.owner = g.me; t.taxFree = g.season + p.taxFree; t.task = null;
      g.res.luong += p.luong || 0;
      const s = c.gen && g.gens[c.gen];
      if (s) { s.fid = g.me; s.loyal = p.loyal; }
      g.flash = { ok: true, text: p.flash };
      chron(g, d.chronicle && d.chronicle.yes);
    },
    vanguard(g, c, p, yes) {
      const s = g.gens[c.gen];
      if (!s) return;
      if (!yes) { s.loyal += p.no; return; }
      s.loyal = Math.min(100, s.loyal + p.yes);
      const a = armiesOf(g, g.me).find((x) => x.gen === c.gen);
      g.vanguard = a ? { army: a.id, broken: p.broken } : null;
    },
    demand(g, c, p, yes, d) {
      if (!yes) return;
      const t = g.towns[p.town];
      if (g.res.uy >= p.uy && t && t.owner === p.from) {
        t.owner = g.me; t.task = null;
        g.flash = { ok: true, text: p.flash };
        chron(g, d.chronicle && d.chronicle.yes);
      } else g.flash = { ok: false, text: p.fail };
      delete g.allies[p.angers];
      g.angry[p.angers] = true;
    },
    appease(g, c, p, yes) {
      const s = g.gens[c.gen];
      if (!s) return;
      if (!yes) { s.loyal += p.no; return; }
      s.loyal = Math.min(100, s.loyal + p.yes);
      const free = (tid) => g.towns[tid] && g.towns[tid].owner === g.me && !g.towns[tid].gov;
      const tid = free(p.town) ? p.town : ownTowns(g, g.me).find(free);
      if (tid) g.towns[tid].gov = c.gen;
    },
    captive(g, c, p, yes) {
      const gid = c.gen, s = g.gens[gid], name = genName(g, gid);
      g.captives = g.captives.filter((x) => x !== gid);
      if (!s) return;
      if (!yes) { g.res.uy += p.uyFree; s.free = true; chron(g, 'Thả ' + name + ' về.'); return; }
      if (rnd(g) < (s.loyal >= p.loyalHigh ? p.pHigh : p.pLow)) {
        s.fid = g.me; s.loyal = p.loyalNew;
        g.flash = { ok: true, text: name + ' quy hàng ta.' };
        chron(g, name + ' quy hàng.');
      } else {
        s.dead = true;
        g.flash = { ok: false, text: name + ' không hàng, bị chém.' };
        chron(g, name + ' không hàng, bị chém.');
      }
    },
  };
  function applyCard(g, c, yes) {
    g.cards = g.cards.filter((x) => x.id !== c.id);
    const d = (g.data.cards || []).find((x) => x.id === c.src);
    if (d && CARD_FX[d.effect]) CARD_FX[d.effect](g, c, d.params || {}, yes, d);
  }
  function answer(g0, cardId, yes) {
    busy(g0, 'V2.answer');
    const g = copy(g0);
    g.flash = null;
    const c = g.cards.find((x) => x.id === cardId);
    if (c) applyCard(g, c, !!yes);
    return g;
  }

  // ---------------------------------------------------------------- battles: who fights whom
  // a general as the battle reads him (Battle.genOf): five stats, Trung, the lord, trait effect ids
  function battleGen(g, gid) {
    const d = genData(g, gid), s = g.gens[gid];
    if (!d || !s || s.dead) return null;
    return { id: gid, name: d.name, uy: d.uy, tai: d.tai, muu: d.muu, dung: d.dung, kien: d.kien, loyal: s.loyal, lord: !!d.lord, traits: (d.traits || []).filter((t) => Battle.TRAITS[t]) };
  }
  // an ally's boats join our attacks by a river while the ally still has an army (the spike's Ngô alliance)
  function allyBoats(g) {
    let n = 0;
    for (const [fid, x] of Object.entries(g.allies)) if (x && x.boats && armiesOf(g, fid).length) n += x.boats;
    return n;
  }
  // the battle's plan (a BattleDescriptor v2 without its result): the truth when `eye` is null, else as `eye` sees
  // the defender (the forecast). Several armies on one target are one battle; the general with the most Uy leads.
  function planFor(g, ids, target, eye) {
    const as = ids.map((i) => g.armies[i]).filter(Boolean);
    if (!as.length || !target) return null;
    const fid = as[0].fid, units = {};
    for (const a of as) addUnits(units, a.units);
    const lead = as.slice().sort((x, y) => uyOf(g, y.gen) - uyOf(g, x.gen))[0];
    let site, siege = false, walls = 0, town = null, dfid, dGen = null, holding = false, guessed = false;
    const dUnits = {}, dArmies = [];
    if (target.kind === 'town') {
      const t = g.towns[target.id];
      if (!t || !hostile(g, fid, t.owner)) return null;
      site = target.id; town = site; dfid = t.owner; walls = t.walls; siege = walls > 0; dGen = t.gov;
      addUnits(dUnits, eye ? seenGar(g, eye, site) : t.gar);
    } else {
      const e = g.armies[target.id];
      if (!e || !hostile(g, fid, e.fid)) return null;
      site = e.at; dfid = e.fid;
      const t = g.towns[site];
      if (t.owner === e.fid && !e.besieging) { town = site; walls = t.walls; siege = walls > 0; dGen = t.gov; addUnits(dUnits, eye ? seenGar(g, eye, site) : t.gar); }
    }
    // the defender's armies standing there fight too (in the field only the army attacked)
    for (const e of Object.values(g.armies)) {
      if (e.fid !== dfid || e.at !== site) continue;
      if (town ? e.besieging : e.id !== target.id) continue;
      if (town && e.order && e.order.intent === 'attack') continue; // it marched out this season
      dArmies.push(e.id);
      if (eye && e.fid !== eye && !isNear(g, eye, e.at)) guessed = true;
      addUnits(dUnits, eye ? seenUnits(g, eye, e, true) : e.units);
      if (!e.order) holding = true; // no order = Giữ: drawn up and waiting
      if (!dGen || uyOf(g, e.gen) > uyOf(g, dGen)) dGen = e.gen;
    }
    const d = place(g, site);
    const plan = {
      site, from: as[0].at !== site ? as[0].at : null, terrain: d.terrain, river: !!d.river,
      siege, walls: siege ? walls : 0, lanes: d.lanes.slice(),
      attacker: { fid, gen: battleGen(g, lead.gen), units, armies: as.map((a) => a.id) },
      defender: { fid: dfid, gen: battleGen(g, dGen), units: dUnits, holding, armies: dArmies, town },
    };
    const boats = fid === g.me && d.river ? allyBoats(g) : 0;
    if (boats) { plan.attacker.units = Object.assign({}, units, { thuy: (units.thuy || 0) + boats }); plan.ally = boats; }
    if (guessed) plan.guess = true;
    return plan;
  }

  // ---------------------------------------------------------------- the general's forecast (freeze A "Tướng")
  const forecastKey = (g, ids, target) => [g.seed, g.season, target.kind + ':' + target.id, ids.slice().sort().join('+')].join('|');
  // Battle.forecast on the battle as the player sees it (the enemy through perception, never the truth); the analyst
  // is the attacking general with the most Mưu. The player gets the label, both strengths, the losses he expects and
  // two reasons; `more` has the rest. Never a probability.
  function forecast(g, armyIds, target) {
    const ids = [].concat(armyIds || []);
    if (!ids.length) throw new Error('V2.forecast: no army');
    for (const id of ids) if (!g.armies[id] || g.armies[id].fid !== g.me) throw new Error('V2.forecast: ' + id + ' is not an army of ours');
    if (!target || !ids.every((id) => targets(g, id).some((t) => t.kind === target.kind && t.id === target.id && t.intent !== 'move'))) return null;
    const plan = planFor(g, ids, target, g.me);
    if (!plan) return null;
    const analyst = ids.map((i) => g.armies[i].gen).filter(Boolean).sort((x, y) => muuOf(g, y) - muuOf(g, x))[0];
    const f = Battle.forecast(plan, battleGen(g, analyst) || Battle.OFFICER, { key: forecastKey(g, ids, target) });
    const reasons = f.reasons.map((r) => ({ side: r.side, why: r.why, pct: r.pct }));
    if (plan.ally) reasons.unshift({ side: 'A', why: 'thuyền đồng minh trợ chiến +' + fmt(plan.ally), pct: 0 });
    if (plan.guess) reasons.unshift({ side: 'D', why: 'quân địch ở xa: số quân chỉ là đoán', pct: 0 });
    const more = reasons.slice(0, 6);
    return {
      label: f.label, sa: f.sa, sd: f.sd, est: { la: f.est.la, ld: f.est.ld },
      reasons: more.slice(0, 2).map((r) => Object.assign({}, r)),
      more: { reasons: more, lanes: f.lanes.slice(), analyst: { id: f.analyst.id, name: f.analyst.name, muu: f.analyst.muu } },
    };
  }

  // ---------------------------------------------------------------- the season's end
  // freeze B order: cards → AI → marches, sieges → battles → siege → town work → income, upkeep → Trung → floors → win
  function endSeason(g0) {
    if (g0.pending) throw new Error('V2.endSeason: a battle is pending (V2.battleTurn or V2.autoBattle)');
    if (g0.over) return copy(g0);
    const must = g0.cards.find((c) => c.urgent);
    if (must) throw new Error('V2.endSeason: card ' + must.id + ' must be answered first');
    const g = copy(g0);
    g.log = []; g.moves = []; g.fought = []; g.queue = []; g.taken = []; g.report = null; g.lastBattle = null;
    for (const c of g.cards.slice()) applyCard(g, c, false); // unanswered cards take their "no"
    g.flash = null;
    aiOrders(g);
    // the vanguard promise: an army that was promised the first blow and neither attacks nor besieges
    const van = g.vanguard && g.armies[g.vanguard.army];
    if (van && !(van.order && (van.order.intent === 'attack' || van.order.intent === 'siege')) && g.gens[van.gen]) {
      g.gens[van.gen].loyal += g.vanguard.broken;
      log(g, '!' + armyName(g, van) + ' giận vì không được đánh trước: Trung ' + (g.vanguard.broken < 0 ? '−' + -g.vanguard.broken : '+' + g.vanguard.broken) + '.');
    }
    // our orders: marches and sieges now; attacks on one target are one battle, fought in order
    const groups = {}, keys = [];
    for (const a of armiesOf(g, g.me)) {
      if (!a.order) continue;
      if (a.order.intent !== 'attack') { march(g, a, true); continue; }
      const t = a.order.target, k = t.kind + ':' + t.id;
      if (!groups[k]) { groups[k] = { fid: g.me, ids: [], target: clone(t) }; keys.push(k); }
      groups[k].ids.push(a.id);
    }
    for (const k of keys) queueAttack(g, groups[k]);
    // the AI's attacks: on us the player fights them; between others they resolve on their own
    for (const a of Object.values(g.armies)) if (a.fid !== g.me && a.order && a.order.intent === 'attack') queueAttack(g, { fid: a.fid, ids: [a.id], target: clone(a.order.target) });
    return next(g);
  }
  function queueAttack(g, q) {
    const t = q.target, site = t.kind === 'town' ? t.id : g.armies[t.id] && g.armies[t.id].at;
    for (const i of q.ids) g.moves.push({ id: i, from: g.armies[i].at, to: site || null, attack: true });
    g.queue.push(q);
  }
  // a move or a siege order carried out (the season's end and the preview share it)
  function march(g, a, say) {
    const o = a.order, tid = o.target.id, t = g.towns[tid];
    if (o.intent === 'move' && hostile(g, a.fid, t.owner)) { if (say) log(g, armyName(g, a) + ' không vào được ' + townName(g, tid) + '.'); return; }
    if (say) g.moves.push({ id: a.id, from: a.at, to: tid });
    a.at = tid;
    a.besieging = o.intent === 'siege' && hostile(g, a.fid, t.owner) ? tid : null;
    if (say) log(g, armyName(g, a) + (a.besieging ? ' vây ' : ' tới ') + townName(g, tid) + '.');
  }
  // the next battle of the season (plans are drawn when the battle starts, so earlier battles count), else the end
  function next(g) {
    while (g.queue.length && !g.over) {
      const q = g.queue.shift();
      const ids = q.ids.filter((i) => g.armies[i] && g.armies[i].fid === q.fid);
      if (!ids.length) continue;
      if (q.target.kind === 'army' && !g.armies[q.target.id]) { log(g, ids.map((i) => armyName(g, g.armies[i])).join(', ') + ': tới nơi thì địch đã đi.'); continue; }
      const plan = planFor(g, ids, q.target, null);
      if (!plan) { if (q.fid === g.me) log(g, ids.map((i) => armyName(g, g.armies[i])).join(', ') + ': đích không còn là của địch.'); continue; }
      plan.seed = seedFrom(g);
      const b = Battle.create(plan);
      const me = plan.attacker.fid === g.me ? 'A' : plan.defender.fid === g.me ? 'D' : null;
      if (me) { g.battleNo += 1; g.pending = { id: g.battleNo, plan, b, me, orders: null }; return g; }
      settle(g, plan, Battle.simulate(b), null); // AI against AI: both sides on their own orders
    }
    g.queue = [];
    g.pending = null;
    return finishSeason(g);
  }
  // a finished battle on the map: survivors back to armies and garrisons, towns change hands, captives, Uy
  function settle(g, plan, b, me) {
    const winA = b.over.win === 'A', site = plan.site, tn = plan.defender.town, mine = g.me;
    const left = (side) => { const u = {}; for (const w of b.wings) if (w.side === side) u[w.arm] = (u[w.arm] || 0) + Math.max(0, Math.round(w.routed ? w.men * 0.5 : w.men)); return u; };
    const A = left('A'), D = left('D');
    if (plan.ally) { const was = plan.attacker.units.thuy; A.thuy = Math.max(0, Math.round(((A.thuy || 0) * (was - plan.ally)) / Math.max(1, was))); }
    // survivors shared back by each army's part of each arm
    const share = (armyIds, pool, before, extra) => {
      for (const k of Object.keys(before)) {
        const was = before[k] || 0;
        if (!was) continue;
        const keep = Math.min(1, (pool[k] || 0) / was);
        for (const i of armyIds) { const a = g.armies[i]; if (a && a.units[k]) a.units[k] = Math.round(a.units[k] * keep); }
        if (extra && extra[k]) extra[k] = Math.round(extra[k] * keep);
      }
    };
    const aBefore = {};
    for (const i of plan.attacker.armies) if (g.armies[i]) addUnits(aBefore, g.armies[i].units);
    share(plan.attacker.armies, A, aBefore);
    const town = tn ? g.towns[tn] : null;
    const dBefore = clone(town ? town.gar : {});
    for (const i of plan.defender.armies) if (g.armies[i]) addUnits(dBefore, g.armies[i].units);
    share(plan.defender.armies, D, dBefore, town ? town.gar : null);
    // the battle's line first, then what follows from it (captures, retreats)
    const nameA = short(g, plan.attacker.fid), nameD = short(g, plan.defender.fid), where = townName(g, site);
    const lossA = Battle.lossOf(b, 'A'), lossD = Battle.lossOf(b, 'D');
    const txt = (winA ? nameA + ' thắng ' + nameD + ' ở ' + where : nameA + ' không thắng được ' + nameD + ' ở ' + where) + '. Thương vong: ' + nameA + ' ' + fmt(lossA) + ', ' + nameD + ' ' + fmt(lossD) + '.';
    const bad = (plan.attacker.fid === mine && !winA) || (plan.defender.fid === mine && winA);
    log(g, (bad ? '!' : '') + txt);
    chron(g, txt);
    if (winA) {
      if (town) {
        const gov = town.gov;
        g.taken.push({ town: tn, from: town.owner, to: plan.attacker.fid });
        town.owner = plan.attacker.fid; town.walls = Math.max(0, town.walls - 1); town.task = null; town.gov = null; town.taxFree = 0;
        town.gar = { bo: r100(total(A) * TAKE.gar) };
        for (const i of plan.attacker.armies) {
          const a = g.armies[i];
          if (!a) continue;
          for (const k of Object.keys(a.units)) a.units[k] = Math.round(a.units[k] * TAKE.army);
          a.at = tn; a.besieging = null;
        }
        if (gov && plan.attacker.fid === mine && g.gens[gov] && !g.gens[gov].dead) g.captives.push(gov);
      }
      for (const i of plan.defender.armies) retreat(g, i, site, plan.attacker.fid === mine);
    } else {
      for (const i of plan.attacker.armies) { const a = g.armies[i]; if (a && total(a.units) < RETREAT) retreat(g, i, site, plan.defender.fid === mine); }
    }
    for (const i of plan.attacker.armies.concat(plan.defender.armies)) { const a = g.armies[i]; if (a && total(a.units) < DISBAND) retreat(g, i, site, false); }
    if (plan.attacker.fid === mine) g.res.uy += winA ? UY.win : UY.lose;
    if (plan.defender.fid === mine) g.res.uy += winA ? UY.lost : UY.held;
    if (me) {
      g.fought.push({ site, win: b.over.win, me, la: lossA, ld: lossD });
      g.lastBattle = { plan: clone(plan), b: clone(b), me, outcome: Battle.outcome(b) };
    }
  }
  // a beaten army falls back to its side's nearest town, or breaks (its general taken if we broke it)
  function retreat(g, id, site, capture) {
    const a = g.armies[id];
    if (!a) return;
    const here = posOf(g, site);
    const home = ownTowns(g, a.fid).filter((t) => t !== site).sort((x, y) => dist(posOf(g, x), here) - dist(posOf(g, y), here))[0];
    const lord = isLord(g, a.gen);
    if (home && lord && total(a.units) < GUARD) a.units = { bo: GUARD }; // the lord's guard gets him out
    if (home && total(a.units) >= RETREAT) {
      g.moves.push({ id, from: a.at, to: home, retreat: true });
      a.at = home; a.besieging = null; a.order = null;
      log(g, armyName(g, a) + ' rút về ' + townName(g, home) + '.');
      return;
    }
    if (home) addUnits(g.towns[home].gar, a.units);
    delete g.armies[id];
    if (lord && a.fid === g.me) {
      g.over = { win: false, why: fill(g.data.texts.lordFell, { name: genName(g, a.gen), site: townName(g, site) }) };
      return;
    }
    const taken = capture && a.gen && g.gens[a.gen] && !g.gens[a.gen].dead;
    if (taken) g.captives.push(a.gen);
    log(g, (a.fid === g.me ? '!' : '') + 'Đạo quân ' + armyName(g, a) + (home ? ' tan, nhập đồn ' + townName(g, home) : ' tan') + (taken ? ', tướng bị bắt.' : '.'));
  }

  // ---------------------------------------------------------------- the pending battle (fought by the player, turn by turn)
  // what the general proposes for our live wings: the engine's own orders (Battle.autoOrders)
  function proposal(b, side) {
    const x = Battle.autoOrders(b, side), out = {};
    for (const w of x.wings) if (w.side === side && !w.gone) out[w.id] = w.order;
    return out;
  }
  function battle(g) {
    if (!g.pending) return null;
    const P = g.pending;
    return { plan: clone(P.plan), b: clone(P.b), me: P.me, proposed: P.b.over ? {} : proposal(P.b, P.me), orders: P.orders ? clone(P.orders) : null, id: P.id };
  }
  // the battle that just ended (its last state and outcome), for the screen after it
  function lastBattle(g) {
    const L = g.lastBattle;
    return L ? { plan: clone(L.plan), b: clone(L.b), me: L.me, proposed: {}, outcome: clone(L.outcome) } : null;
  }
  // one turn: our wings take the proposal unless overridden, the other side its own orders
  function battleTurn(g0, overrides) {
    if (!g0.pending) throw new Error('V2.battleTurn: no battle');
    const P0 = g0.pending, me = P0.me, foe = me === 'A' ? 'D' : 'A';
    const mine = proposal(P0.b, me);
    for (const [id, o] of Object.entries(overrides || {})) {
      if (!(id in mine)) throw new Error('V2.battleTurn: ' + id + ' is not a live wing of ours');
      if (Battle.legalOrders(P0.b, id).indexOf(o) === -1) throw new Error('V2.battleTurn: ' + id + ' cannot ' + o);
      if (o === 'hoa') for (const k of Object.keys(mine)) if (k !== id && mine[k] === 'hoa') mine[k] = 'giu'; // one fire a battle: the one we chose
      mine[id] = o;
    }
    const g = copy(g0), P = g.pending;
    const theirs = proposal(P.b, foe);
    const b = Battle.resolve(Battle.orders(Battle.orders(P.b, me, mine), foe, theirs));
    P.orders = { [me]: mine, [foe]: theirs };
    return afterTurn(g, b);
  }
  // the rest of the battle on the proposals (the player skips it)
  function autoBattle(g0) {
    if (!g0.pending) throw new Error('V2.autoBattle: no battle');
    const g = copy(g0);
    return afterTurn(g, Battle.simulate(g.pending.b));
  }
  function afterTurn(g, b) {
    const P = g.pending;
    if (!b.over) { P.b = b; return g; }
    g.pending = null;
    settle(g, P.plan, b, P.me);
    return next(g);
  }

  // ---------------------------------------------------------------- AI (Tào, Ngô, hào tộc)
  // Each side reads the others as it sees them (perception), never the truth: `seenDefenders` for the towns it weighs.
  const AI = {
    // Tào: the recall (history) first, then Trương Liêu strikes a besieger or the player's weakest town in reach
    strike(g, fid, p) {
      for (const a of armiesOf(g, fid)) {
        if (p.recall && g.season === p.recall.season && a.gen === p.recall.gen && rnd(g) < g.rumor) {
          g.moves.push({ id: a.id, from: a.at, to: null, leave: true });
          delete g.armies[a.id];
          log(g, p.recall.text);
          chron(g, p.recall.chronicle);
          continue;
        }
        const bes = armiesOf(g, g.me).find((x) => x.besieging === a.at);
        if (bes) { a.order = { intent: 'attack', target: { kind: 'army', id: bes.id } }; continue; }
        const r = reachOf(a) + 0.5, seen = {};
        const inReach = ownTowns(g, g.me).filter((t) => dist(posOf(g, t), posOf(g, a.at)) <= r);
        for (const t of inReach) seen[t] = seenDefenders(g, fid, t);
        const weakest = inReach.sort((x, y) => seen[x] - seen[y])[0];
        if (weakest && seen[weakest] < total(a.units) * p.strike) a.order = { intent: 'attack', target: { kind: 'town', id: weakest } };
      }
    },
    // Ngô: sails west in its season unless allied; allied (or 35 %) it takes its town from the hào tộc; angry, it retakes it
    river(g, fid, p) {
      const a = armiesOf(g, fid)[0], t = g.towns[p.target];
      if (!a || !t) return;
      if (p.leave && g.season === p.leave.season && !g.allies[fid]) {
        g.moves.push({ id: a.id, from: a.at, to: null, leave: true });
        delete g.armies[a.id];
        log(g, p.leave.text);
        return;
      }
      if (t.owner !== g.me && t.owner !== fid && (g.allies[fid] || rnd(g) < p.chance)) a.order = { intent: 'attack', target: { kind: 'town', id: p.target } };
      else if (t.owner === g.me && g.angry[fid]) a.order = { intent: 'attack', target: { kind: 'town', id: p.target } };
    },
    hold() {},
  };
  function aiOrders(g) {
    for (const [fid, p] of Object.entries(g.data.ai || {})) if (fid !== g.me && AI[p.style]) AI[p.style](g, fid, p);
  }

  // ---------------------------------------------------------------- after the battles: siege, work, income, Trung, floors
  // the siege step: once a town a season, whoever besieges it; below 30 % of the besiegers the gates open
  function siegeStep(g, say) {
    const me = g.me, by = {};
    for (const a of armiesOf(g, me)) if (a.besieging) (by[a.besieging] = by[a.besieging] || []).push(a.id);
    for (const [tid, ids] of Object.entries(by)) {
      const t = g.towns[tid];
      if (!hostile(g, me, t.owner)) { for (const i of ids) g.armies[i].besieging = null; continue; }
      for (const k of Object.keys(t.gar)) t.gar[k] = Math.round(t.gar[k] * SIEGE.gar);
      t.walls = Math.max(0, t.walls - 1);
      t.dan = Math.round(t.dan * SIEGE.dan);
      const men = ids.reduce((s, i) => s + total(g.armies[i].units), 0);
      if (defenders(g, tid) < men * SIEGE.open) {
        const gov = t.gov, was = t.owner;
        g.taken.push({ town: tid, from: was, to: me, siege: true });
        t.owner = me; t.gar = { bo: r100(men * SIEGE.keep) }; t.gov = null; t.task = null; t.taxFree = 0;
        for (const i of ids) g.armies[i].besieging = null;
        g.res.uy += UY.opened;
        if (gov && g.gens[gov] && !g.gens[gov].dead) g.captives.push(gov);
        for (const e of armiesOf(g, was).filter((x) => x.at === tid)) retreat(g, e.id, tid, true);
        if (say) { log(g, townName(g, tid) + ' mở cổng hàng sau khi bị vây.'); chron(g, townName(g, tid) + ' hàng sau khi bị vây.'); }
      } else if (say) log(g, townName(g, tid) + ' bị vây: đồn còn ' + fmt(defenders(g, tid)) + ', lũy còn ' + t.walls + '.');
    }
  }
  function townWork(g, say) {
    for (const d of g.data.towns) {
      const t = g.towns[d.id];
      if (t.owner !== g.me) {
        t.task = null;
        const ai = g.data.ai && g.data.ai[t.owner];
        if (ai && ai.growth) t.gar.bo = (t.gar.bo || 0) + ai.growth;
        continue;
      }
      if (!t.task) continue;
      const T = g.data.tasks[t.task.key], done = T.done || {};
      t.task.fresh = false;
      t.task.left -= 1;
      if (t.task.left > 0) { if (say) log(g, d.name + ': ' + T.name.toLowerCase() + ', còn ' + t.task.left + ' mùa.'); continue; }
      if (done.add) addUnits(t.gar, done.add);
      if (done.dan) t.dan -= done.dan;
      if (done.walls) t.walls = Math.min(MAX_WALLS, t.walls + done.walls);
      if (done.farm) t.farm = true;
      if (done.market) t.market = true;
      if (say) log(g, d.name + ': xong ' + T.name.toLowerCase() + '.');
      t.task = null;
    }
  }
  // a season's grain and coin from our towns, and the grain our men eat
  function economy(g) {
    const me = g.me;
    let luong = 0, tien = 0, up = 0;
    for (const tid of ownTowns(g, me)) {
      const t = g.towns[tid], free = t.taxFree && g.season < t.taxFree;
      luong += free ? 0 : t.dan * GRAIN * (t.farm ? FARM : 1);
      tien += (free ? 0 : t.dan * COIN) + (t.market ? MARKET : 0);
    }
    for (const a of armiesOf(g, me)) for (const k of ARMS) up += (a.units[k] || 0) * UPKEEP[k];
    for (const tid of ownTowns(g, me)) up += total(g.towns[tid].gar) * GARRISON;
    return { luong: Math.round(luong), tien: Math.round(tien), up: Math.round(up) };
  }
  // an army left standing in a town its side lost this season (taken while it was away fighting) falls back; with no
  // town of its own it leaves Hoài Nam. Not in the spike, where it stood inside the enemy's walls for good. A guest in
  // another side's town (Ngô's fleet at the hào tộc's Lịch Dương) is not stranded.
  function strandStep(g) {
    for (const a of Object.values(g.armies)) {
      if (a.besieging || !hostile(g, a.fid, g.towns[a.at].owner)) continue;
      if (!(g.taken || []).some((x) => x.town === a.at && x.from === a.fid)) continue;
      if (ownTowns(g, a.fid).length) { retreat(g, a.id, a.at, false); continue; }
      g.moves.push({ id: a.id, from: a.at, to: null, leave: true });
      delete g.armies[a.id];
      log(g, (a.fid === g.me ? '!' : '') + armyName(g, a) + ' rời Hoài Nam.');
    }
  }
  function finishSeason(g) {
    const me = g.me;
    strandStep(g);
    siegeStep(g, true);
    townWork(g, true);
    const inc = economy(g);
    g.res.luong += inc.luong - inc.up;
    g.res.tien += inc.tien;
    g.income = inc;
    log(g, 'Thu ' + fmt(inc.luong) + ' lương, ' + fmt(inc.tien) + ' tiền. Nuôi quân ' + fmt(inc.up) + ' lương.');
    // Trung: under 30 a general walks out with his army
    for (const [gid, s] of Object.entries(g.gens)) {
      if (s.fid !== me || s.dead || s.loyal >= LEAVE || isLord(g, gid)) continue;
      const a = armiesOf(g, me).find((x) => x.gen === gid);
      if (!a) continue;
      delete g.armies[a.id];
      s.fid = g.data.rebels || 'local';
      for (const t of Object.values(g.towns)) if (t.gov === gid) t.gov = null;
      log(g, '!' + genName(g, gid) + ' bỏ đi, mang theo ' + fmt(total(a.units)) + ' quân.');
      chron(g, genName(g, gid) + ' bỏ ta.');
    }
    // floors: one season of warning, then the fall
    const T = g.data.texts;
    for (const k of ['luong', 'uy']) {
      const low = k === 'luong' ? g.res.luong < 0 : g.res.uy <= 0;
      if (low && g.warn[k]) g.over = g.over || { win: false, why: k === 'luong' ? T.famine : T.revolt };
      else if (low) {
        g.warn[k] = true;
        if (k === 'luong') for (const a of armiesOf(g, me)) for (const u of Object.keys(a.units)) a.units[u] = Math.round(a.units[u] * DESERT);
        log(g, '!' + (k === 'luong' ? T.famineWarn : T.revoltWarn));
      } else g.warn[k] = false;
    }
    const own = ownTowns(g, me);
    if (!g.over && own.length === g.data.towns.length) g.over = { win: true, why: T.win };
    if (!g.over && !own.length) g.over = { win: false, why: T.lostAll };
    if (g.over) chron(g, g.over.why);
    // taken: every town that changed hands this season (the owners are on the map for all to see), in the order it fell
    const taken = g.taken.map((x) => ({ town: x.town, from: x.from, to: x.to, siege: !!x.siege }));
    g.report = { season: cal(g, g.season), lines: g.log.slice(), fought: clone(g.fought), income: clone(inc), towns: own.length, taken };
    g.season += 1;
    for (const a of Object.values(g.armies)) a.order = null;
    g.vanguard = null;
    g.cards = g.over ? [] : seasonCards(g);
    return g;
  }

  // ---------------------------------------------------------------- preview (freeze A "Hiện hệ quả")
  // The season's end as far as it is certain, with the same steps the real one runs: our marches and sieges, the
  // siege step, town work, income and upkeep. Battles, the AI and unanswered cards are not in it.
  function project(g0) {
    const g = copy(g0);
    g.log = []; g.moves = [];
    for (const a of armiesOf(g, g.me)) if (a.order && a.order.intent !== 'attack') march(g, a, false);
    siegeStep(g, false);
    townWork(g, false);
    const inc = economy(g);
    return { luong: g.res.luong + inc.luong - inc.up, tien: g.res.tien + inc.tien, uy: g.res.uy, income: inc };
  }
  // seasons of siege until the gates open, from the garrison and the armies inside as the player sees them
  function fallIn(g, tid, men) {
    const t = g.towns[tid];
    let gar = total(seenGar(g, g.me, tid)), inside = 0;
    for (const e of Object.values(g.armies)) {
      if (e.fid !== t.owner || e.at !== tid || e.besieging) continue;
      const u = seenUnits(g, g.me, e, false);
      if (!u) return null;
      inside += total(u);
    }
    for (let n = 1; n <= 8; n++) { gar *= SIEGE.gar; if (gar + inside < men * SIEGE.open) return n; }
    return null;
  }
  function preview(g, act) {
    if (!act || (act.type !== 'order' && act.type !== 'task')) throw new Error("V2.preview: act.type is 'order' or 'task'");
    const before = { luong: g.res.luong, tien: g.res.tien, uy: g.res.uy };
    const res = (after) => ({ luong: [before.luong, after.luong], tien: [before.tien, after.tien], uy: [before.uy, after.uy] });
    const money = (after) => 'Lương ' + fmt(before.luong) + ' → ' + fmt(after.luong) + ' · Tiền ' + fmt(before.tien) + ' → ' + fmt(after.tien);
    let h, seasons = 1, fall = null;
    const lines = [];
    if (act.type === 'order') {
      const o = orderFor(g, act.army, act.target, act.intent);
      if (o.why) { const p = project(g); return { seasons: 0, res: res(p), lines: [money(p)], ok: false, why: o.why }; }
      h = copy(g);
      h.armies[act.army].order = o.order;
      const a = h.armies[act.army], tgt = o.order ? o.order.target : null;
      const where = !tgt ? '' : tgt.kind === 'town' ? townName(g, tgt.id) : armyName(g, g.armies[tgt.id]);
      if (!o.order) { seasons = 0; lines.push('Giữ: đứng yên; bị đánh ngoài đồng thì dàn trận chờ sẵn, thủ +15%.'); }
      else if (o.order.intent === 'move') lines.push('Tới ' + where + ' sau 1 mùa.');
      else if (o.order.intent === 'attack') lines.push('Đánh ' + where + ' cuối mùa này: thắng Uy +' + UY.win + ', thua Uy ' + fmt(UY.lose) + '.');
      else {
        const men = armiesOf(h, g.me).filter((x) => x.id === a.id || x.besieging === tgt.id || (x.order && x.order.intent === 'siege' && x.order.target.id === tgt.id)).reduce((s, x) => s + total(x.units), 0);
        fall = fallIn(g, tgt.id, men);
        lines.push('Vây ' + where + ': mỗi mùa đồn −20%, lũy −1; thủ dưới 30% quân vây thì mở cổng.');
        lines.push(fall ? 'Ước mở cổng sau ' + fall + ' mùa vây.' : 'Quân vây chưa đủ để thành mở cổng.');
      }
    } else {
      const c = act.key ? taskCheck(g, act.town, act.key) : { ok: true };
      const t = g.towns[act.town];
      if (!c.ok || !t || t.owner !== g.me) { const p = project(g); return { seasons: 0, res: res(p), lines: [money(p)], ok: false, why: c.why || 'Không phải thành ta.' }; }
      h = setTask(g, act.town, act.key || null);
      if (act.key) {
        const T = g.data.tasks[act.key];
        seasons = T.seasons;
        lines.push('Xong sau ' + T.seasons + ' mùa: ' + T.text + '.');
        lines.push('Trả trước ' + Object.entries(T.cost).map(([k, v]) => fmt(v) + ' ' + RES_NAME[k]).join(', ') + '.');
      } else seasons = 0;
    }
    const after = project(h);
    lines.unshift(money(after) + (!seasons ? '' : act.type === 'order' ? ' · tới nơi sau ' + seasons + ' mùa' : ' · xong sau ' + seasons + ' mùa'));
    const out = { seasons, res: res(after), lines, ok: true };
    if (fall !== null || (act.type === 'order' && act.intent === 'siege')) out.fall = fall;
    return out;
  }

  return {
    RULES, ARMS,
    newGame, view, targets, preview, order, tasks, setTask, transfer, answer, forecast, endSeason,
    battle, battleTurn, autoBattle, lastBattle,
    cal: (g) => cal(g, g.season), fmt,
    // for tests and the balance report, not for the UI: the true plan and the one the player reads
    internal: {
      plan: (g, ids, target) => planFor(g, [].concat(ids), target, null),
      seenPlan: (g, ids, target) => planFor(g, [].concat(ids), target, g.me),
      forecastKey, economy, project, reachOf, seenUnits, seenGar, defenders, battleGen, proposal, hash32,
    },
  };
});
