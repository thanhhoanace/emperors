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
  const ARM_TEXT = { bo: 'bộ', cung: 'cung', ky: 'kỵ', thuy: 'thủy' };
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
  // yielding a battle before its first turn (a hopeless one): a town given up costs more Uy than one lost fighting, a
  // field battle or an attack called off a little less than one lost; the men are kept (29/9)
  const UY = { win: 4, lose: -6, lost: -8, held: 5, opened: 3, yieldTown: -10, yieldField: -5 };
  const LEAVE = 30; // Trung below this: the general walks out with his army
  const DESERT = 0.9; // a season below zero grain: a tenth of the men run
  const HOPE = { days: 6 }; // a battle is hopeless when no way of ours wins or draws on any of these other days
  const RULES = { REACH, NEAR, SPREAD, GUESS, UPKEEP, GARRISON, GRAIN, COIN, FARM, MARKET, MAX_WALLS, SIEGE, TAKE, RETREAT, DISBAND, GUARD, KEEP, UY, LEAVE, DESERT, HOPE };

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
      report: null, flash: null, log: [], moves: [], fought: [], seen: [], sieges: [], done: [], chronicle: [], sight: null, recalled: null,
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
  // the towns the player watches now (near his towns and armies); g.sight keeps the ones he watched when the season began
  const sightOf = (g) => g.data.towns.map((t) => t.id).filter((tid) => isNear(g, g.me, tid));
  // whether the player sees what happens at a town this season: near it now, or near it when the season began
  const watched = (g, tid) => !!tid && ((g.sight && g.sight.indexOf(tid) !== -1) || isNear(g, g.me, tid));
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
      pending: !!g.pending, flash: g.flash ? clone(g.flash) : null, moves: seenMoves(g),
      alerts: g.over || g.pending ? [] : alerts(g),
    };
  }
  // the season's marches the player saw: his own, and the others' that began or ended near him (a far army's march
  // is not his to know; the army itself stays on the map, flag and arms, where it now stands)
  function seenMoves(g) {
    return (g.moves || []).filter((m) => m.fid === g.me || watched(g, m.from) || watched(g, m.to)).map((m) => clone(m));
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
  // without boats builds them. The rest stay under "more" (freeze B, owner 29/9). A front town where an army of ours
  // stands recruits first: the new men join that army (29/9)
  function suggest(g, tid, all) {
    const t = g.towns[tid], d = place(g, tid);
    if (t.owner !== g.me || (t.task && !t.task.fresh)) return [];
    const front = threatened(g, tid);
    const boats = (t.gar.thuy || 0) > 0 || armiesOf(g, g.me).some((a) => a.at === tid && a.arm === 'fleet');
    const camp = armiesOf(g, g.me).some((a) => a.at === tid && a.arm === 'land' && !a.besieging);
    const want = (front ? (camp ? ['mo_bo', 'luy'] : ['luy', 'mo_bo']) : ['ruong', 'cho']).concat(d.river && !boats ? ['mo_thuy'] : []);
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
      // a card about a town only while the town is still whose the card says (Lã Mông's: Lịch Dương still the hào tộc's)
      if (w.owner && Object.entries(w.owner).some(([tid, fid]) => !g.towns[tid] || g.towns[tid].owner !== fid)) continue;
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
    // an alliance with an end in history (params.until: the season it breaks, e.g. Tôn Quyền bowing to Tào in spring
    // 220), so an ally's town does not stay out of reach for good (29/9: Ngô at Lịch Dương was a dead end)
    alliance(g, c, p, yes, d) {
      if (!yes) return;
      g.allies[p.fid] = { boats: p.boats || 0, until: p.until || null };
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
    g.seen = []; g.sieges = []; g.done = [];
    g.sight = sightOf(g); // what the player watched as the season began: a march that starts there is his to see
    for (const c of g.cards.slice()) applyCard(g, c, false); // unanswered cards take their "no"
    g.flash = null;
    // an alliance ends when its history says (Tôn Quyền bows to Tào): the ally's towns are anyone's to take again
    for (const [fid, x] of Object.entries(g.allies)) {
      if (!x || !x.until || g.season < x.until) continue;
      delete g.allies[fid];
      const t = fill((g.data.texts || {}).allianceEnd || 'Minh ước với {name} hết.', { name: short(g, fid) });
      log(g, '!' + t);
      chron(g, t);
    }
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
    for (const i of q.ids) g.moves.push({ id: i, fid: q.fid, from: g.armies[i].at, to: site || null, attack: true });
    g.queue.push(q);
  }
  // a move or a siege order carried out (the season's end and the preview share it)
  function march(g, a, say) {
    const o = a.order, tid = o.target.id, t = g.towns[tid];
    if (o.intent === 'move' && hostile(g, a.fid, t.owner)) { if (say) log(g, armyName(g, a) + ' không vào được ' + townName(g, tid) + '.'); return; }
    const siege = o.intent === 'siege' && hostile(g, a.fid, t.owner);
    if (say) g.moves.push(Object.assign({ id: a.id, fid: a.fid, from: a.at, to: tid }, siege ? { siege: true } : {}));
    a.at = tid;
    a.besieging = siege ? tid : null;
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
      // a battle of ours waits for the player, unless we have no wing on the field (an empty town falls at once)
      if (me && Battle.live(b, me).length) {
        g.battleNo += 1;
        g.pending = { id: g.battleNo, plan, b, me, orders: null, hopeless: false };
        g.pending.hopeless = hopeless(g, g.pending);
        return g;
      }
      settle(g, plan, Battle.simulate(b), me); // AI against AI (or an empty town of ours): on their own orders
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
    // the battle's line first, then what follows from it (captures, retreats). Ours in full; the others' only as the
    // player saw it: near him who won, far only a town changing hands (that is on the map for all), never their losses
    const nameA = short(g, plan.attacker.fid), nameD = short(g, plan.defender.fid), where = townName(g, site);
    const lossA = Battle.lossOf(b, 'A'), lossD = Battle.lossOf(b, 'D');
    const txt = (winA ? nameA + ' thắng ' + nameD + ' ở ' + where : nameA + ' không thắng được ' + nameD + ' ở ' + where) + '. Thương vong: ' + nameA + ' ' + fmt(lossA) + ', ' + nameD + ' ' + fmt(lossD) + '.';
    const ours = plan.attacker.fid === mine || plan.defender.fid === mine;
    const bad = (plan.attacker.fid === mine && !winA) || (plan.defender.fid === mine && winA);
    if (ours) log(g, (bad ? '!' : '') + txt);
    else if (watched(g, site)) log(g, (winA ? nameA + ' thắng ' + nameD : nameA + ' không thắng được ' + nameD) + ' ở ' + where + '.');
    else if (winA && town) log(g, where + ' về tay ' + nameA + '.');
    if (ours || watched(g, site)) g.seen.push({ site, a: plan.attacker.fid, d: plan.defender.fid, win: b.over.win, me: me || null });
    chron(g, txt);
    if (winA) {
      if (town) takeTown(g, tn, plan.attacker.fid, plan.attacker.armies, total(A), false);
      for (const i of plan.defender.armies) retreat(g, i, site, plan.attacker.fid === mine);
    } else {
      for (const i of plan.attacker.armies) {
        const a = g.armies[i];
        if (!a) continue;
        if (total(a.units) < RETREAT) retreat(g, i, site, plan.defender.fid === mine);
        else if (!a.besieging && hostile(g, a.fid, g.towns[a.at].owner)) fallBack(g, a); // it came from outside Hoài Nam: back it goes
      }
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
    const seen = a.fid === g.me || watched(g, site) || watched(g, home);
    if (home && total(a.units) >= RETREAT) {
      g.moves.push({ id, fid: a.fid, from: a.at, to: home, retreat: true });
      a.at = home; a.besieging = null; a.order = null;
      if (seen) log(g, armyName(g, a) + ' rút về ' + townName(g, home) + '.');
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
    if (seen || taken) log(g, (a.fid === g.me ? '!' : '') + 'Đạo quân ' + armyName(g, a) + (home ? ' tan, nhập đồn ' + townName(g, home) : ' tan') + (taken ? ', tướng bị bắt.' : '.'));
  }
  // an army standing in a town not its side's (it lost the town, or came from outside and failed): to its side's
  // nearest town, and with none left out of Hoài Nam
  function fallBack(g, a) {
    if (ownTowns(g, a.fid).length) { retreat(g, a.id, a.at, false); return; }
    g.moves.push({ id: a.id, fid: a.fid, from: a.at, to: null, leave: true });
    delete g.armies[a.id];
    log(g, (a.fid === g.me ? '!' : '') + armyName(g, a) + ' rời Hoài Nam.');
  }
  // a town taken, by storm (a battle won), by a siege that opened its gates, or given up: the new owner garrisons it
  // with a part of the men who took it; the governor is taken if the player took the town
  function takeTown(g, tid, fid, armyIds, men, how) {
    const town = g.towns[tid], gov = town.gov;
    g.taken.push({ town: tid, from: town.owner, to: fid, siege: how === 'siege' });
    if (how === 'yield') g.taken[g.taken.length - 1].yielded = true;
    town.owner = fid; town.task = null; town.gov = null; town.taxFree = 0;
    if (how === 'siege') town.gar = { bo: r100(men * SIEGE.keep) };
    else {
      if (how !== 'yield') town.walls = Math.max(0, town.walls - 1);
      town.gar = { bo: r100(men * TAKE.gar) };
      for (const i of armyIds) {
        const a = g.armies[i];
        if (!a) continue;
        for (const k of Object.keys(a.units)) a.units[k] = Math.round(a.units[k] * TAKE.army);
        a.at = tid; a.besieging = null;
      }
    }
    for (const i of armyIds) if (g.armies[i]) g.armies[i].besieging = null;
    if (gov && fid === g.me && how !== 'yield' && g.gens[gov] && !g.gens[gov].dead) g.captives.push(gov);
    return gov;
  }

  // ---------------------------------------------------------------- the pending battle (fought by the player, turn by turn)
  // what the general proposes for our live wings: the engine's own orders (Battle.autoOrders)
  function proposal(b, side) {
    const x = Battle.autoOrders(b, side), out = {};
    for (const w of x.wings) if (w.side === side && !w.gone) out[w.id] = w.order;
    return out;
  }
  // what the player is shown of a battle: the board both sides see (every wing's men, morale and place, the wind),
  // not the day's hidden fortune (luck), the dice (rs, the plan's seed) or the enemy general's stats (his name only)
  function forPlayer(plan0, b0, me) {
    const plan = clone(plan0), b = clone(b0), foe = me === 'A' ? 'D' : 'A', side = foe === 'A' ? 'attacker' : 'defender';
    const brief = (x) => (x ? { id: x.id, name: x.name, lord: !!x.lord, traits: (x.traits || []).slice() } : x);
    delete plan.seed; delete b.rs; delete b.luck;
    plan[side].gen = brief(plan[side].gen);
    b[foe].gen = brief(b[foe].gen);
    return { plan, b };
  }
  // V2.battle(g) → null | { plan, b, me, proposed, orders, id, hopeless, withdraw: null | { lines } }
  //   hopeless: no way of ours wins or draws (below); withdraw: before the first turn the player may yield, at the cost
  //   the lines say (V2.withdraw)
  function battle(g) {
    if (!g.pending) return null;
    const P = g.pending, x = forPlayer(P.plan, P.b, P.me);
    return {
      plan: x.plan, b: x.b, me: P.me, proposed: P.b.over ? {} : proposal(P.b, P.me), orders: P.orders ? clone(P.orders) : null, id: P.id,
      hopeless: !!P.hopeless, withdraw: canWithdraw(P) ? { lines: withdrawal(g, P, false).lines } : null,
    };
  }
  // the battle that just ended (its last state and outcome), for the screen after it
  function lastBattle(g) {
    const L = g.lastBattle;
    if (!L) return null;
    const x = forPlayer(L.plan, L.b, L.me);
    return { plan: x.plan, b: x.b, me: L.me, proposed: {}, outcome: clone(L.outcome) };
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
    if (!b.over) { P.b = b; P.hopeless = hopeless(g, P); return g; }
    g.pending = null;
    settle(g, P.plan, b, P.me);
    return next(g);
  }

  // ---------------------------------------------------------------- hopeless battles and yielding (29/9)
  // The owner played a defence of 500 men against five wings turn by turn. A battle is hopeless when, on the board both
  // sides see (never this day's hidden fortune or dice), none of three ways of ours (the general's proposals, hold
  // everywhere, all forward) wins or draws on any of HOPE.days other days (fortune and dice from a hash of the battle)
  // against the other side's own orders.
  const WAYS = {
    hold: () => 'giu',
    press: (legal) => (legal.indexOf('xung') !== -1 ? 'xung' : legal.indexOf('ban') !== -1 ? 'ban' : 'tien'),
  };
  function hopeless(g, P) {
    const b0 = P.b, me = P.me, foe = me === 'A' ? 'D' : 'A';
    if (b0.over) return false;
    if (!Battle.live(b0, me).length) return true;
    const key = g.seed + '|hope|' + P.id + '|' + b0.turn;
    for (let d = 0; d < HOPE.days; d++) {
      const day = clone(b0);
      day.rs = hash32(key + '|' + d) || 1;
      day.luck = { A: 0.85 + (0.3 * hash32(key + '|A|' + d)) / 4294967296, D: 0.85 + (0.3 * hash32(key + '|D|' + d)) / 4294967296 };
      for (const way of ['auto', 'hold', 'press']) {
        let b = day;
        for (let k = 0; !b.over && k <= Battle.MAX_TURN; k++) {
          let mine = proposal(b, me);
          if (way !== 'auto') { const m = {}; for (const id of Object.keys(mine)) m[id] = WAYS[way](Battle.legalOrders(b, id)); mine = m; }
          b = Battle.resolve(Battle.orders(Battle.orders(b, me, mine), foe, proposal(b, foe)));
        }
        if (b.over.win === me || b.over.win === 'draw') return false;
      }
    }
    return true;
  }
  const canWithdraw = (P) => !!P && !P.b.over && P.b.turn === 1 && !P.b.log.length;
  // what yielding costs, and (act) doing it: an attack called off (the armies stay where they stood, Uy −5); a field
  // battle refused (our armies fall back to our nearest town, a siege lifted, Uy −5); a town given up (the enemy walks
  // in, walls whole; our garrison and armies there fall back to our nearest town, the governor with them, Uy −10)
  function withdrawal(g, P, act) {
    const plan = P.plan, lines = [], site = plan.site, where = townName(g, site);
    const ours = (P.me === 'A' ? plan.attacker.armies : plan.defender.armies).filter((i) => g.armies[i]);
    const home = (from) => ownTowns(g, g.me).filter((t) => t !== from).sort((x, y) => dist(posOf(g, x), posOf(g, from)) - dist(posOf(g, y), posOf(g, from)))[0];
    let uy;
    if (P.me === 'A') {
      uy = UY.yieldField;
      lines.push('Rút lệnh đánh ' + (plan.defender.town ? where : 'ở ' + where) + ': quân đứng lại chỗ cũ, không mất người.');
    } else if (plan.defender.town) {
      uy = UY.yieldTown;
      const to = home(site), men = total(g.towns[site].gar) + ours.reduce((s, i) => s + total(g.armies[i].units), 0);
      lines.push('Bỏ ' + where + ' không đánh: ' + (to ? fmt(men) + ' quân rút về ' + townName(g, to) : fmt(men) + ' quân tan, không còn thành để về') + '.');
      if (act) {
        const gar = clone(g.towns[site].gar);
        takeTown(g, site, plan.attacker.fid, plan.attacker.armies, total(plan.attacker.units) - (plan.ally || 0), 'yield');
        if (to) addUnits(g.towns[to].gar, gar);
        for (const i of ours) retreat(g, i, site, false);
      }
    } else {
      uy = UY.yieldField;
      lines.push('Không nhận trận ở ' + where + ': quân lui về thành gần nhất' + (ours.some((i) => g.armies[i].besieging) ? ', bỏ vây' : '') + '.');
      if (act) for (const i of ours) retreat(g, i, site, false);
    }
    lines.push('Uy ' + fmt(uy) + (P.me === 'D' && plan.defender.town ? ' (mất thành khi đánh thua: ' + fmt(UY.lost) + ')' : ' (đánh thua: ' + fmt(P.me === 'A' ? UY.lose : UY.lost) + ')') + '.');
    if (act) {
      g.res.uy += uy;
      log(g, '!' + lines.join(' '));
      chron(g, lines[0]);
      g.seen.push({ site, a: plan.attacker.fid, d: plan.defender.fid, win: P.me === 'A' ? 'D' : 'A', me: P.me, yielded: true });
    }
    return { lines, uy };
  }
  // V2.withdraw(g): yield the pending battle before its first turn, at the cost V2.battle(g).withdraw says
  function withdraw(g0) {
    if (!g0.pending) throw new Error('V2.withdraw: no battle');
    if (!canWithdraw(g0.pending)) throw new Error('V2.withdraw: only before the first turn');
    const g = copy(g0), P = g.pending;
    g.pending = null;
    withdrawal(g, P, true);
    return next(g);
  }

  // ---------------------------------------------------------------- AI (Tào, Ngô, hào tộc)
  // Each side reads the others as it sees them (perception), never the truth: `seenDefenders` for the towns it weighs.
  const AI = {
    // Tào: the recall (history) first, then Trương Liêu strikes a besieger or the player's weakest town in reach
    strike(g, fid, p) {
      for (const a of armiesOf(g, fid)) {
        if (p.recall && g.season === p.recall.season && a.gen === p.recall.gen && rnd(g) < g.rumor) {
          g.moves.push({ id: a.id, fid: a.fid, from: a.at, to: null, leave: true });
          g.recalled = { id: a.id, gen: a.gen, at: a.at };
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
      // back from Phàn Thành (history, 29/9): the recalled army returns in its season with fresh men. Its side still
      // holds a town here: it comes into the one nearest where it left and strikes from the season after. The town it
      // left fell to the player meanwhile: it marches on it at once, from outside; beaten, it goes home.
      const back = p.recall && p.recall.back;
      if (back && g.season === back.season && g.recalled && !g.armies[g.recalled.id]) {
        const was = posOf(g, g.recalled.at), R = g.recalled;
        const home = ownTowns(g, fid).sort((x, y) => dist(posOf(g, x), was) - dist(posOf(g, y), was))[0];
        const at = home || (g.towns[R.at].owner === g.me ? R.at : null);
        if (at) {
          g.armies[R.id] = { id: R.id, fid, gen: R.gen, arm: 'land', at, units: clone(back.units), order: home ? null : { intent: 'attack', target: { kind: 'town', id: at } }, besieging: null };
          g.moves.push({ id: R.id, fid, from: null, to: at, arrive: true });
          const t = fill(home ? back.text : back.strike || back.text, { town: townName(g, at) });
          log(g, '!' + t);
          chron(g, t);
        }
        g.recalled = null;
      }
    },
    // Ngô: sails west in its season (allied, when the alliance ends); allied (or 35 %) it takes its town from the hào
    // tộc; angry, it retakes it
    river(g, fid, p) {
      const a = armiesOf(g, fid)[0], t = g.towns[p.target];
      if (!a || !t) return;
      // it sails in its season, or, allied then, the season the alliance ends (Ngô's war is in Kinh Châu either way)
      if (p.leave && g.season >= p.leave.season && !g.allies[fid]) {
        g.moves.push({ id: a.id, fid: a.fid, from: a.at, to: null, leave: true });
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
  // the siege step: once a town a season, whoever besieges it; its walls down and its defenders below 30 % of the
  // besiegers, the gates open (29/9: the walls first, so a walled town is a siege of seasons, not one of a single season)
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
      const fresh = ids.some((i) => (g.moves || []).some((m) => m.id === i && m.siege && m.to === tid));
      const open = t.walls <= 0 && defenders(g, tid) < men * SIEGE.open;
      if (say) g.sieges.push({ town: tid, by: me, armies: ids.slice(), fresh, walls: t.walls, open });
      if (open) {
        const was = t.owner;
        takeTown(g, tid, me, ids, men, 'siege');
        g.res.uy += UY.opened;
        for (const e of armiesOf(g, was).filter((x) => x.at === tid)) retreat(g, e.id, tid, true);
        if (say) { log(g, townName(g, tid) + ' mở cổng hàng sau khi bị vây.'); chron(g, townName(g, tid) + ' hàng sau khi bị vây.'); }
      } else if (say) log(g, townName(g, tid) + ' bị vây: đồn còn ~' + fmt(r100(seenDefenders(g, me, tid))) + ', lũy còn ' + t.walls + '.');
    }
  }
  // new men from a town's recruiting (29/9): into the army of ours standing in the town (foot, bows and horse into
  // the largest land army, boats into a fleet), so a staging town feeds its army without a transfer; none there,
  // into the garrison
  function recruit(g, tid, add) {
    const here = armiesOf(g, g.me).filter((a) => a.at === tid && !a.besieging).sort((x, y) => total(y.units) - total(x.units));
    for (const [k, n] of Object.entries(add)) {
      const a = here.find((x) => (k === 'thuy' ? x.arm === 'fleet' : x.arm === 'land'));
      addUnits(a ? a.units : g.towns[tid].gar, { [k]: n });
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
      if (done.add) recruit(g, d.id, done.add);
      if (done.dan) t.dan -= done.dan;
      if (done.walls) t.walls = Math.min(MAX_WALLS, t.walls + done.walls);
      if (done.farm) t.farm = true;
      if (done.market) t.market = true;
      if (say) { log(g, d.name + ': xong ' + T.name.toLowerCase() + '.'); g.done.push({ town: d.id, key: t.task.key }); }
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
      fallBack(g, a);
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
      g.moves.push({ id: a.id, fid: me, from: a.at, to: null, leave: true });
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
    // the recap and the map's playback, all of it what the player saw: taken, every town that changed hands (the owners
    // are on the map for all), in the order it fell; done, the work finished in our towns; sieges, ours this season
    // (fresh: begun now; open: the gates opened); battles, ours and the others' near us (no losses of theirs)
    const taken = g.taken.map((x) => Object.assign({ town: x.town, from: x.from, to: x.to, siege: !!x.siege }, x.yielded ? { yielded: true } : {}));
    g.report = {
      season: cal(g, g.season), lines: g.log.slice(), fought: clone(g.fought), income: clone(inc), towns: own.length, taken,
      done: clone(g.done), sieges: clone(g.sieges), battles: clone(g.seen),
    };
    g.season += 1;
    for (const a of Object.values(g.armies)) a.order = null;
    g.vanguard = null;
    g.cards = g.over ? [] : seasonCards(g);
    // the outlook for the season that begins, with its way out (D9): a warning the player reads before it bites
    if (!g.over) for (const x of alerts(g)) {
      const said = x.key === 'luong' ? T.famineWarn : T.revoltWarn; // the floor's own line is already in the recap
      if (!(x.level === 'floor' && g.log.some((l) => l.slice(1) === said))) g.report.lines.push('!' + x.text);
      if (x.fix.length) g.report.lines.push('Cách cứu: ' + x.fix[0]);
    }
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
  // seasons of siege until the gates open (the walls down, then the defenders below 30 %), from the garrison and the
  // armies inside as the player sees them
  function fallIn(g, tid, men) {
    const t = g.towns[tid];
    let gar = total(seenGar(g, g.me, tid)), inside = 0, walls = t.walls;
    for (const e of Object.values(g.armies)) {
      if (e.fid !== t.owner || e.at !== tid || e.besieging) continue;
      const u = seenUnits(g, g.me, e, false);
      if (!u) return null;
      inside += total(u);
    }
    for (let n = 1; n <= 8; n++) { gar *= SIEGE.gar; walls -= 1; if (walls <= 0 && gar + inside < men * SIEGE.open) return n; }
    return null;
  }
  // ---------------------------------------------------------------- alerts (GPT D9: a warning shows a way out)
  // The grain and Uy outlook from what the player knows: his own towns, men and work and the orders given so far; no
  // battles, no AI, no cards. 'soon': the grain runs out at the end of this season or the next at this rate, or Uy is
  // near 0; 'floor': warned last season, one more at the floor and the game is lost. Each alert names the ways out
  // that are legal now, with their numbers (fix), or says plainly that none is in time.
  //   → [{ key: 'luong'|'uy', level: 'soon'|'floor', text, fix: [string] }]
  function alerts(g) {
    const out = [], p = project(g), net = p.income.luong - p.income.up;
    if (g.warn.luong || p.luong < 0 || p.luong + net < 0) {
      const need = p.luong < 0 ? -p.luong : g.warn.luong ? 0 : -(p.luong + net);
      const f = grainFixes(g, need, p.luong < 0);
      let text;
      if (g.warn.luong) text = p.luong < 0 ? 'Kho lương âm lần hai: cuối mùa này còn âm (' + fmt(p.luong) + ') là binh biến.' : 'Kho lương vừa âm: mùa này đã đủ lương (' + fmt(p.luong) + ' cuối mùa), giữ vậy là qua.';
      else if (p.luong < 0) text = 'Cuối mùa này kho lương âm (' + fmt(p.luong) + '): một phần mười quân sẽ bỏ trốn, mùa sau còn âm là binh biến.';
      else text = 'Lương chỉ đủ tới cuối mùa sau: thu ' + fmt(p.income.luong) + ', nuôi quân ' + fmt(p.income.up) + ' mỗi mùa.';
      if (g.warn.luong && p.luong < 0 && !f.enough) text += ' Không còn cách nào đủ lương kịp cuối mùa này' + (f.take ? ', trừ lấy thêm một thành ngay mùa này.' : '.');
      if (!(g.warn.luong && p.luong >= 0)) out.push({ key: 'luong', level: g.warn.luong ? 'floor' : 'soon', text, fix: f.lines });
    }
    if (g.warn.uy || p.uy <= 10) {
      const fix = [];
      for (const c of g.cards) if (c.kind === 'captive' && /Uy \+\d+/.test(c.no.fx)) fix.push('Thả ' + genName(g, c.gen) + ' về: ' + c.no.fx + '.');
      fix.push('Thắng một trận: Uy +' + UY.win + '; vây cho một thành mở cổng: Uy +' + UY.opened + '; giữ được thành bị đánh: Uy +' + UY.held + '.');
      const text = g.warn.uy ? (p.uy <= 0 ? 'Uy ở đáy lần hai: cuối mùa này còn 0 là dân nổi loạn.' : 'Uy vừa chạm đáy: mùa này đã lên lại (' + p.uy + '), giữ vậy là qua.') : p.uy <= 0 ? 'Cuối mùa này Uy về 0: dân bất phục, mùa sau còn 0 là nổi loạn.' : 'Uy còn ' + p.uy + ': về 0 là dân bất phục.';
      if (!(g.warn.uy && p.uy > 0)) out.push({ key: 'uy', level: g.warn.uy ? 'floor' : 'soon', text, fix });
    }
    return out;
  }
  // ways to find `need` grain: men from an army into the garrison of the town it stands in (a garrison eats 0,05 a
  // man, horse in the field 0,2), a fresh task's grain back, then the slower ones (fields). `now`: only what counts
  // at the end of this season. → { lines, enough, take }
  function grainFixes(g, need, now) {
    const lines = [];
    let got = 0;
    for (const a of armiesOf(g, g.me)) {
      const t = g.towns[a.at];
      if (a.besieging || t.owner !== g.me || (a.order && a.order.intent !== 'move')) continue;
      let room = total(a.units) - KEEP;
      const parts = [];
      let save = 0;
      for (const k of ARMS.slice().sort((x, y) => UPKEEP[y] - UPKEEP[x])) {
        if (room <= 0 || got + save >= need) break;
        const per = UPKEEP[k] - GARRISON, n = Math.min(a.units[k] || 0, room, Math.ceil((need - got - save) / per / 100) * 100);
        if (n <= 0) continue;
        parts.push(fmt(n) + ' ' + ARM_TEXT[k]); save += n * per; room -= n;
      }
      if (!parts.length) continue;
      got += save;
      lines.push('Cho ' + parts.join(', ') + ' của ' + armyName(g, a) + ' vào đồn ' + townName(g, a.at) + ': nuôi quân −' + fmt(save) + ' lương mỗi mùa.');
    }
    for (const tid of ownTowns(g, g.me)) {
      const t = g.towns[tid];
      if (!t.task || !t.task.fresh) continue;
      const back = g.data.tasks[t.task.key].cost.luong || 0;
      if (!back) continue;
      got += back;
      lines.push('Bỏ việc ' + g.data.tasks[t.task.key].name.toLowerCase() + ' ở ' + townName(g, tid) + ': hoàn ' + fmt(back) + ' lương.');
    }
    if (!now || got < need) {
      const farm = ownTowns(g, g.me).filter((tid) => !g.towns[tid].farm && !g.towns[tid].task && !(g.towns[tid].taxFree && g.season < g.towns[tid].taxFree)).sort((x, y) => g.towns[y].dan - g.towns[x].dan)[0];
      if (farm && !now) lines.push('Khai ruộng ở ' + townName(g, farm) + ': sau ' + g.data.tasks.ruong.seasons + ' mùa thu thêm ' + fmt(g.towns[farm].dan * GRAIN * (FARM - 1)) + ' lương mỗi mùa.');
    }
    const take = armiesOf(g, g.me).some((a) => targets(g, a.id).some((t) => t.intent === 'ask'));
    if (take && got < need) lines.push('Lấy thêm một thành ngay mùa này: thu của thành đó tính luôn cuối mùa.');
    return { lines: lines.slice(0, 3), enough: got >= need, take };
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
        // the owner, 29/9: a weak town that opens the same season must say so plainly, first
        if (fall === 1) lines.push('Thủ ' + where + ' quá yếu trước quân vây: mở cổng ngay cuối mùa này, không đánh (Uy +' + UY.opened + ').');
        lines.push('Vây ' + where + ': mỗi mùa đồn −20%, lũy −1; lũy sụp hết và thủ dưới 30% quân vây thì mở cổng.');
        if (fall !== 1) lines.push(fall ? 'Ước mở cổng sau ' + fall + ' mùa vây.' : 'Quân vây chưa đủ để thành mở cổng.');
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

  // ---------------------------------------------------------------- the general's plan for the season (V2.advise)
  // What a sound general proposes this season, from what the player sees and nothing more: the enemy as the View shows
  // him (near ±20 %, far a guess), the forecast (V2.forecast), the siege estimate and the season's projection; never
  // the truth of another side, its AI or its dice. The watch mode plays on it; "Đề xuất" shows it to a new player. Each
  // army gets an order (target null: hold, and a siege under way goes on) and each town without work under way may get
  // a task, each with one short line saying why.
  //   V2.advise(g) → [{ type: 'order', army, target: { kind, id } | null, intent, why } | { type: 'task', town, key, why }]
  //   V2.adviseCards(g) → [{ card, yes, why }] for the cards in the queue, in the order to answer them
  const RANK = {};
  Battle.LABELS.forEach(([, l], i) => { RANK[l] = Battle.LABELS.length - 1 - i; }); // Thắng lớn 4 … Thua lớn 0
  const DANGER = 0.35; // an enemy's odds on one of our towns, as our general reads them, from which he guards it
  // an enemy army's men as the player's general reads them (near: the View's ±20 %; far: his guess)
  const guessMen = (g, a) => total(seenUnits(g, g.me, a, true));
  // the reach of an army as its flag and arms show it: boats on their river, horse fast, foot slow
  const seenReach = (a) => (a.arm === 'fleet' ? REACH.fleet : (a.units.ky || 0) > 0 ? REACH.fast : REACH.land);
  function reachers(g, tid) {
    const p = posOf(g, tid), riv = riverOf(g, tid);
    return Object.values(g.armies).filter((a) => hostile(g, g.me, a.fid) && !(a.arm === 'fleet' && (!riv || riverOf(g, a.at) !== riv)) && dist(p, posOf(g, a.at)) <= seenReach(a) + 0.5);
  }
  // an enemy army's attack on our town as our general reads it: its odds on the battle as he sees it (its men through
  // perception, ours as they are), from a few days' simulation
  function threatOf(g, tid, e, memo) {
    let w = g;
    if (!g.armies[e.id]) { w = copy(g); w.armies[e.id] = clone(e); } // an army the player remembers coming (history)
    const plan = planFor(w, [e.id], { kind: 'town', id: tid }, null);
    if (!plan) return 0;
    plan.attacker.units = full(seenUnits(w, g.me, w.armies[e.id], true));
    const key = [g.seed, g.season, 'threat', tid, e.id, JSON.stringify(plan.defender.units)].join('|');
    if (!(key in memo)) memo[key] = Battle.odds(plan, { key, runs: 8 }).win;
    return memo[key];
  }
  function danger(g, tid, memo, ghosts) {
    let p = 0, who = null;
    const more = (ghosts || []).filter((e) => e.at === tid);
    for (const e of reachers(g, tid).concat(more)) { const x = threatOf(g, tid, e, memo || {}); if (x > p) { p = x; who = e; } }
    return { p, who };
  }
  // the transmigrant's memory (a history card's `back`): an enemy he knows comes back this season to a town of ours
  function ghostsOf(g) {
    const out = [];
    for (const c of g.data.cards || []) {
      const b = c.params && c.params.back;
      if (!b || b.season !== g.season || !g.towns[b.town] || g.towns[b.town].owner !== g.me) continue;
      if (Object.values(g.armies).some((a) => a.gen === b.gen)) continue; // he never left, or is back already
      out.push({ id: '~' + b.gen, fid: b.fid, gen: b.gen, arm: 'land', at: b.town, units: clone(b.units), order: null, besieging: null, memory: true });
    }
    return out;
  }
  const menOf = (g, ids) => ids.reduce((s, i) => s + total(g.armies[i].units), 0);
  const nearestFoe = (g, tid) => g.data.towns.map((t) => t.id).filter((x) => hostile(g, g.me, g.towns[x].owner)).sort((x, y) => dist(posOf(g, x), posOf(g, tid)) - dist(posOf(g, y), posOf(g, tid)))[0];

  function advise(g0) {
    if (!g0 || g0.pending || g0.over) return [];
    const me = g0.me, memo = {}, fmemo = {}, ghosts = ghostsOf(g0);
    const dz = (g, tid) => danger(g, tid, memo, ghosts);
    const comes = (d) => armyName(g0, d.who) + (d.who.memory ? ' trở lại mùa này, như ta nhớ' : ' đánh tới được');
    let h = copy(g0);
    for (const a of armiesOf(h, me)) a.order = null;
    for (const tid of ownTowns(h, me)) if (h.towns[tid].task && h.towns[tid].task.fresh) h = setTask(h, tid, null);
    const out = [], free = {}, why = {};
    for (const a of armiesOf(h, me)) free[a.id] = true;
    const leaving = {}; // armies given an order that takes them out of the town they stand in
    const give = (id, target, intent, line) => {
      out.push({ type: 'order', army: id, target, intent, why: line });
      delete free[id];
      if (target && !(target.kind === 'town' && target.id === h.armies[id].at && intent === 'move')) leaving[id] = true;
      h = order(h, id, target, target && target.kind === 'town' && intent !== 'move' ? intent : undefined);
    };
    // an army whose going would open the town of ours it stands in to an enemy in reach stays: "Giữ" with the reason
    const xmemo = {};
    // (going at the very enemy that threatens it, or at the town he stands in, is not leaving it open)
    const exposes = (id, tg) => {
      const a = h.armies[id], key = id + '|' + Object.keys(leaving).sort().join(',');
      if (!(key in xmemo)) {
        let d = { p: 0, who: null };
        if (!a.besieging && h.towns[a.at].owner === me && !threatened[a.at]) {
          const t = copy(h);
          for (const x of armiesOf(t, me)) if (x.at === a.at && (leaving[x.id] || x.id === id)) delete t.armies[x.id];
          d = dz(t, a.at);
        }
        xmemo[key] = d;
      }
      const d = xmemo[key];
      if (d.p < DANGER) return false;
      if (tg && d.who && !d.who.memory && (tg.kind === 'army' ? tg.id === d.who.id : tg.id === d.who.at)) return false;
      why[id] = 'Giữ ' + townName(h, a.at) + ': đi thì ' + comes(d) + '.';
      return true;
    };
    const tname = (t) => (t.kind === 'town' ? townName(h, t.id) : armyName(h, h.armies[t.id]));
    const inReach = (id, t) => targets(h, id).some((x) => x.kind === t.kind && x.id === t.id);
    const fc = (ids, t) => { const k = ids.slice().sort().join('+') + '>' + t.kind + ':' + t.id; if (!(k in fmemo)) fmemo[k] = forecast(h, ids, t); return fmemo[k]; };
    const vanguard = h.vanguard && h.armies[h.vanguard.army] ? h.vanguard.army : null;
    // a race the history cards set: a town the remembered enemy comes back to, still the enemy's, is worth taking first
    const race = {};
    for (const c of g0.data.cards || []) {
      const b = c.params && c.params.back;
      if (b && b.season > h.season && h.towns[b.town] && hostile(h, me, h.towns[b.town].owner) && !Object.values(h.armies).some((a) => a.gen === b.gen)) race[b.town] = b;
    }

    // the best strike the free armies have: a weak town that opens this season, a battle the general reads as won, a
    // siege that opens within three seasons (its army safe from a sally). Scores: 100 / 70–90 / 36–52
    function bestStrike() {
      const ids = Object.keys(free);
      const cands = {};
      for (const id of ids) for (const t of targets(h, id)) if (t.intent !== 'move') cands[t.kind + ':' + t.id] = { kind: t.kind, id: t.id };
      let best = null;
      const take = (x) => { if (!best || x.score > best.score) best = x; };
      for (const t of Object.values(cands)) {
        const group = ids.filter((id) => inReach(id, t) && !exposes(id, t));
        if (!group.length) continue;
        const bonus = (vanguard && group.indexOf(vanguard) !== -1 ? 5 : 0) + (t.kind === 'town' && race[t.id] ? 65 : 0);
        if (t.kind === 'town') {
          const already = armiesOf(h, me).filter((a) => a.besieging === t.id).map((a) => a.id);
          // the besiegers sit outside the walls: only armies that outnumber any army inside, which may sally
          const inside = Object.values(h.armies).filter((e) => e.at === t.id && e.fid === h.towns[t.id].owner && !e.besieging);
          const need = Math.max.apply(null, [0].concat(inside.map((e) => guessMen(h, e) * 1.3)));
          const sg = group.filter((i) => total(h.armies[i].units) >= need);
          const sb = (vanguard && sg.indexOf(vanguard) !== -1 ? 5 : 0) + (race[t.id] ? 65 : 0);
          if (sg.length) {
            const fall = fallIn(h, t.id, menOf(h, sg) + menOf(h, already));
            if (fall && fall <= 3) take({ score: (fall === 1 ? 100 : 60 - 8 * fall) + sb, t, group: sg, intent: 'siege', line: fall === 1 ? 'Vây ' + townName(h, t.id) + ': thủ yếu, mở cổng ngay cuối mùa này, không phải đánh.' : 'Vây ' + townName(h, t.id) + ': đồn đói dần, lũy −1 mỗi mùa; ước mở cổng sau ' + fall + ' mùa.' });
            // an army inside that our besiegers outnumber: the siege draws it out to fight in the open
            else if (inside.length) take({ score: 45 + sb, t, group: sg, intent: 'siege', line: 'Vây ' + townName(h, t.id) + ': dụ ' + armyName(h, inside[0]) + ' ra đánh ngoài thành; lũy −1, đồn −20% mỗi mùa.' });
            // a storm not yet good: a siege first brings the walls down and starves the garrison
            const f0 = fc(group, t);
            if (f0 && RANK[f0.label] >= RANK['Thua'] && RANK[f0.label] < RANK['Thắng'] && h.towns[t.id].walls > 0) take({ score: 30 + sb, t, group: sg, intent: 'siege', line: 'Vây ' + townName(h, t.id) + ' trước: lũy −1, đồn −20% mỗi mùa, rồi mới đánh (tướng đoán đánh ngay: ' + f0.label + ').' });
          }
        }
        const f = fc(group, t);
        if (f && RANK[f.label] >= RANK['Thắng']) take({ score: 70 + 5 * RANK[f.label] + bonus, t, group, intent: 'attack', line: 'Đánh ' + tname(t) + ': tướng đoán ' + f.label + ' (ta ' + fmt(f.sa) + ', địch ' + fmt(f.sd) + ').' });
      }
      return best;
    }
    // hold what we have: a town an enemy can take this season gets an army that turns it (moved only where leaving
    // does not open the town it stands in)
    const threatened = {};
    for (const tid of ownTowns(h, me)) { const d = dz(h, tid); if (d.p >= DANGER) threatened[tid] = d; }
    function guard() {
      for (const tid of Object.keys(threatened).sort((x, y) => h.towns[y].dan - h.towns[x].dan)) {
        const d = threatened[tid];
        if (h.towns[tid].owner !== me) continue;
        const here = armiesOf(h, me).filter((a) => a.at === tid && !a.besieging && (free[a.id] || (a.order && a.order.intent === 'move' && a.order.target.id === tid)));
        if (here.length) { for (const a of here) if (free[a.id]) { why[a.id] = 'Giữ ' + townName(h, tid) + ': ' + comes(d) + '.'; delete free[a.id]; } continue; }
        if (dz(h, tid).p < DANGER) continue; // an army already sent there
        const helpers = armiesOf(h, me).filter((a) => free[a.id] && inReach(a.id, { kind: 'town', id: tid })).sort((x, y) => total(y.units) - total(x.units));
        for (const a of helpers) {
          const t = copy(h);
          t.armies[a.id].at = tid; t.armies[a.id].besieging = null;
          const left = !a.besieging && t.towns[a.at] && t.towns[a.at].owner === me && a.at !== tid ? dz(t, a.at).p : 0;
          if (dz(t, tid).p < DANGER && left < DANGER) { give(a.id, { kind: 'town', id: tid }, 'move', 'Về giữ ' + townName(h, tid) + ': ' + comes(d) + ', đồn không đủ.'); break; }
        }
      }
    }
    // guarding first, unless a storm read as won takes a town worth more than any town at risk
    const first = bestStrike();
    const risk = Math.max.apply(null, [0].concat(Object.keys(threatened).map((tid) => h.towns[tid].dan)));
    if (first && first.intent === 'attack' && first.score >= 80 && first.t.kind === 'town' && h.towns[first.t.id].dan > risk) for (const id of first.group) give(id, first.t, first.intent, first.line);
    guard();
    for (let round = 0; round < 4 && Object.keys(free).length; round++) {
      const s = bestStrike();
      if (!s) break;
      for (const id of s.group) give(id, s.t, s.intent, s.line);
    }
    // a siege under way that still stands: hold it (no order)
    for (const a of armiesOf(h, me)) {
      if (!free[a.id] || !a.besieging) continue;
      const fall = fallIn(h, a.besieging, menOf(h, armiesOf(h, me).filter((x) => x.besieging === a.besieging).map((x) => x.id)));
      why[a.id] = 'Giữ vòng vây ' + townName(h, a.besieging) + (fall ? ': ước mở cổng sau ' + fall + ' mùa.' : ': chờ đồn đói, lũy sụt.');
      delete free[a.id];
    }
    // the rest close in: to our (or an ally's) town nearest the nearest enemy town, when that is nearer than here
    for (const id of Object.keys(free)) {
      const a = h.armies[id];
      if (threatened[a.at] && h.towns[a.at].owner === me) { why[id] = 'Giữ ' + townName(h, a.at) + ': địch đánh tới được.'; continue; }
      if (exposes(id, null)) continue;
      const foe = nearestFoe(h, a.at);
      if (!foe) continue;
      const step = targets(h, id).filter((t) => t.kind === 'town' && t.intent === 'move').sort((x, y) => dist(posOf(h, x.id), posOf(h, foe)) - dist(posOf(h, y.id), posOf(h, foe)))[0];
      if (step && dist(posOf(h, step.id), posOf(h, foe)) < dist(posOf(h, a.at), posOf(h, foe)) - 1) give(id, { kind: 'town', id: step.id }, 'move', 'Tiến về ' + townName(h, step.id) + ', áp sát ' + townName(h, foe) + '.');
    }
    for (const a of armiesOf(h, me)) {
      if (out.some((x) => x.army === a.id)) continue;
      out.push({ type: 'order', army: a.id, target: null, intent: 'hold', why: why[a.id] || 'Giữ ' + townName(h, a.at) + ': chưa có đích đáng đánh; không lệnh thì thủ +15% nếu bị đánh.' });
    }

    // town work, with the purse and the grain in mind: fields while grain is short; walls and foot where an enemy can
    // strike; recruits where our army stands (they join it) while the next objective reads worse than a win; fields and
    // a market behind the line. Never a recruit that leaves the grain below a season's upkeep.
    const short = () => { const p = project(h); return p.luong + (p.income.luong - p.income.up) < p.income.up * 0.5; };
    const main = armiesOf(h, me).filter((a) => a.arm === 'land').sort((x, y) => total(y.units) - total(x.units))[0];
    const goal = main && nearestFoe(h, main.at);
    let weak = false;
    if (main && goal) {
      const all = armiesOf(h, me).filter((a) => inReach(a.id, { kind: 'town', id: goal }) || a.at === main.at).map((a) => a.id);
      const inRange = all.filter((id) => inReach(id, { kind: 'town', id: goal }));
      const f = inRange.length ? fc(inRange, { kind: 'town', id: goal }) : null;
      weak = !f || RANK[f.label] < RANK['Thắng'];
    }
    for (const tid of ownTowns(h, me).sort((x, y) => h.towns[y].dan - h.towns[x].dan)) {
      const t = h.towns[tid];
      if (t.task) continue;
      const low = short(), front = !!threatened[tid] || reachers(h, tid).length > 0;
      const camp = main && main.at === tid && !main.besieging && !(main.order && main.order.intent !== 'move');
      const all = tasks(h, tid).all;
      const can = (k) => { const x = all.find((y) => y.key === k); return !!x && x.ok; };
      const wants = [];
      const farm = !t.farm && !(t.taxFree && h.season < t.taxFree);
      if (low && farm) wants.push(['ruong', 'Khai ruộng: lương thu ở ' + townName(h, tid) + ' +25%, kho đang mỏng.']);
      if (threatened[tid] && t.walls < 3) wants.push(['luy', 'Đắp lũy: ' + townName(h, tid) + ' giáp địch.']);
      if (threatened[tid] && total(t.gar) < 2000 && !camp) wants.push(['mo_bo', 'Mộ bộ binh: đồn ' + townName(h, tid) + ' mỏng, địch đánh tới được.']);
      if (camp && weak && goal) {
        // foot for walls, some bows behind them; horse only for a town without walls
        const u = main.units, k = h.towns[goal].walls ? ((u.cung || 0) < total(u) * 0.2 ? 'mo_cung' : 'mo_bo') : h.res.tien >= 900 ? 'mo_ky' : 'mo_bo';
        wants.push([k, 'Mộ quân vào đạo ' + armyName(h, main) + ': chưa đủ sức lấy ' + townName(h, goal) + '.']);
        wants.push(['mo_bo', 'Mộ bộ binh vào đạo ' + armyName(h, main) + ': chưa đủ sức lấy ' + townName(h, goal) + '.']);
      }
      if (farm) wants.push(['ruong', 'Khai ruộng: lương thu ở ' + townName(h, tid) + ' +25%.']);
      if (!t.market) wants.push(['cho', 'Dựng chợ: thêm ' + fmt(MARKET) + ' tiền mỗi mùa.']);
      if (front && t.walls < 3) wants.push(['luy', 'Đắp lũy: ' + townName(h, tid) + ' ở tiền tuyến.']);
      for (const [k, line] of wants) {
        if (!can(k)) continue;
        const trial = setTask(h, tid, k), p = project(trial);
        if (g0.data.tasks[k].cost.luong && p.luong < p.income.up) continue;
        h = trial;
        out.push({ type: 'task', town: tid, key: k, why: line });
        break;
      }
    }
    return out;
  }

  // the cards, as the general would answer them (the watch mode; a hint for a new player), from the card's own words
  // and the board as the player sees it; answered one after the other (the vanguard last: it hangs on the season's plan)
  function adviseCards(g0) {
    const out = [];
    if (!g0 || g0.pending || g0.over) return out;
    let g = g0;
    const order0 = g0.cards.slice();
    const effect = (c) => ((g.data.cards || []).find((x) => x.id === c.src) || {}).effect;
    order0.sort((x, y) => (effect(x) === 'vanguard' ? 1 : 0) - (effect(y) === 'vanguard' ? 1 : 0));
    for (const c of order0) {
      const d = (g.data.cards || []).find((x) => x.id === c.src) || {}, p = d.params || {};
      let yes = false, why = '';
      switch (d.effect) {
        case 'rumor': yes = g.res.uy + (p.uy || 0) > 20; why = yes ? 'Tung tin: Trương Liêu đi thì Thọ Xuân trống lưng.' : 'Uy đã mỏng, không đổi lấy tin đồn.'; break;
        case 'alliance': yes = false; why = 'Lịch Dương là đất Hoài Nam; thuyền Ngô sắp phải về tây.'; break;
        case 'submit': yes = g.res.luong + (p.luong || 0) >= 0; why = yes ? townName(g, p.town) + ' về ta không mất một người.' : 'Kho lương không kham nổi.'; break;
        case 'vanguard': {
          const a = armiesOf(g, g.me).find((x) => x.gen === c.gen);
          yes = !!a && advise(g).some((x) => x.type === 'order' && x.army === a.id && (x.intent === 'attack' || x.intent === 'siege'));
          why = yes ? 'Mùa này đạo của ông có trận để đánh.' : 'Mùa này chưa có trận cho ông; hứa rồi không cho đánh thì mất lòng hơn.';
          break;
        }
        case 'demand': { const t = g.towns[p.town]; yes = g.res.uy >= p.uy && !!t && t.owner === p.from; why = yes ? 'Uy đủ ' + p.uy + ': ' + townName(g, p.town) + ' hàng không cần đánh.' : 'Uy chưa tới ' + p.uy + ': đòi mà không được còn mất lòng Ngô.'; break; }
        case 'appease': yes = true; why = 'Giữ lòng tướng: ông bỏ đi thì mất cả đạo quân.'; break;
        case 'captive': {
          const s = g.gens[c.gen], pct = s && s.loyal >= p.loyalHigh ? p.pHigh : p.pLow;
          yes = pct >= 0.5; why = yes ? 'Nhiều phần ông theo ta.' : 'Ông khó theo; thả về được Uy +' + p.uyFree + '.';
          break;
        }
        default: yes = false;
      }
      out.push({ card: c.id, yes, why });
      g = answer(g, c.id, yes);
    }
    return out;
  }

  return {
    RULES, ARMS,
    newGame, view, targets, preview, order, tasks, setTask, transfer, answer, forecast, endSeason,
    battle, battleTurn, autoBattle, lastBattle, withdraw, advise, adviseCards,
    cal: (g) => cal(g, g.season), fmt,
    // for tests and the balance report, not for the UI: the true plan and the one the player reads
    internal: {
      plan: (g, ids, target) => planFor(g, [].concat(ids), target, null),
      seenPlan: (g, ids, target) => planFor(g, [].concat(ids), target, g.me),
      forecastKey, economy, project, reachOf, seenUnits, seenGar, defenders, battleGen, proposal, hash32, alerts, hopeless, danger, fallIn,
    },
  };
});
