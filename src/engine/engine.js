/*
 * Tam Quốc Loạn Nhập — turn engine.
 *
 * Pure and deterministic: every random roll comes from state.seed, so a game
 * replays exactly from its seed. No DOM, no network. Loaded as a classic
 * <script> in the browser (window.EmperorsEngine) and with require() in Node
 * (tests, server).
 *
 * Numbers live in data/world.json, voices live in data/personas/*.json.
 * This file only holds the rules that combine them. See docs/product/rules.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EmperorsEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ACTIONS = {
    attack: { label: 'Tấn công', icon: '⚔' },
    diplomacy: { label: 'Ngoại giao', icon: '🕊' },
    internal: { label: 'Nội chính', icon: '🏛' },
    stratagem: { label: 'Mưu kế', icon: '🎭' },
    fortify: { label: 'Củng cố', icon: '🛡' },
  };
  const NEUTRAL = 'neutral';
  const STRATAGEMS = ['discord', 'burn', 'defect'];
  const STRATAGEM_NAMES = { discord: 'ly gián', burn: 'đốt lương', defect: 'chiêu hàng tướng' };

  // ---------------------------------------------------------------- helpers

  // mulberry32 over state.seed
  function rand(st) {
    st.seed = (st.seed + 0x6d2b79f5) >>> 0;
    let t = st.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const between = (st, a, b) => a + (b - a) * rand(st);
  const pick = (st, arr) => arr[Math.floor(rand(st) * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = Math.round;
  const fmt = (n) => round(n).toLocaleString('vi-VN');

  function weighted(st, weights) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = rand(st) * total;
    for (const [k, w] of entries) {
      roll -= w;
      if (roll <= 0) return k;
    }
    return entries[entries.length - 1][0];
  }

  // ------------------------------------------------------------ definitions

  function index(world, personas) {
    const P = {};
    for (const p of world.provinces) P[p.id] = p;
    const F = {};
    for (const f of world.factions) {
      const persona = personas[f.id];
      if (!persona) throw new Error(`missing persona for ${f.id}`);
      F[f.id] = { ...f, persona };
    }
    return { world, rules: world.rules, P, F, order: world.factions.map((f) => f.id), provinceIds: world.provinces.map((p) => p.id) };
  }

  function initialState(def, seed) {
    const st = {
      seed: seed >>> 0 || 1,
      turn: 1,
      over: false,
      winner: null,
      emperorAt: def.world.emperor.province,
      provinces: {},
      factions: {},
    };
    for (const id of def.provinceIds) {
      st.provinces[id] = { owner: NEUTRAL, fort: 0, garrison: def.world.neutral.garrison[id] || 12000 };
    }
    for (const id of def.order) {
      const s = def.F[id].start;
      st.factions[id] = {
        troops: s.troops,
        grain: s.grain,
        loyalty: s.loyalty,
        prestige: s.prestige,
        seat: s.seat,
        alive: true,
        pacts: {},
        grudge: null,
        last: null,
      };
      for (const pid of s.provinces) {
        st.provinces[pid].owner = id;
        st.provinces[pid].garrison = 0;
      }
    }
    return st;
  }

  function createGame(world, personas, seed) {
    const def = index(world, personas);
    return { def, state: initialState(def, seed) };
  }

  // Rebuild a game around a serialized state (server round-trips, replays).
  function restoreGame(world, personas, state) {
    return { def: index(world, personas), state: JSON.parse(JSON.stringify(state)) };
  }

  // ---------------------------------------------------------------- queries

  function owned(g, fid) {
    return g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === fid);
  }

  function frontier(g, fid) {
    const mine = new Set(owned(g, fid));
    const out = new Set();
    for (const pid of mine) for (const n of g.def.P[pid].neighbors) if (!mine.has(n)) out.add(n);
    return g.def.provinceIds.filter((pid) => out.has(pid));
  }

  function hasPact(g, a, b) {
    const f = g.state.factions[a];
    return !!(f && f.pacts[b] && f.pacts[b] >= g.state.turn);
  }

  function pactCount(g, fid) {
    return Object.keys(g.state.factions[fid].pacts).filter((o) => hasPact(g, fid, o)).length;
  }

  function aliveIds(g) {
    return g.def.order.filter((id) => g.state.factions[id].alive);
  }

  // Faction holding a clear lead (the coalition target), if any.
  function leaderOf(g) {
    let top = null;
    let n = g.def.rules.coalitionAt - 1;
    for (const id of aliveIds(g)) {
      const k = owned(g, id).length;
      if (k > n) {
        n = k;
        top = id;
      }
    }
    return top;
  }

  const morale = (f) => 0.75 + (0.5 * f.loyalty) / 100;

  function income(g, fid) {
    const E = g.def.rules.economy;
    const f = g.state.factions[fid];
    let sum = 0;
    for (const pid of owned(g, fid)) {
      const P = g.def.P[pid];
      sum += P.fertility * P.population * E.incomePerFertilityPop + E.incomeBasePerProvince;
    }
    return sum * (0.6 + (0.4 * f.loyalty) / 100) * (g.def.F[fid].traits.knowledge || 1);
  }

  // Soft cap: recruitment slows as the army approaches what the land can feed.
  function troopCap(g, fid) {
    let pop = 0;
    for (const pid of owned(g, fid)) pop += g.def.P[pid].population;
    return pop * g.def.rules.economy.troopsPerPop * (g.def.F[fid].traits.knowledge || 1);
  }

  function recruits(g, fid, minRoom = 0) {
    const E = g.def.rules.economy;
    const f = g.state.factions[fid];
    let pop = 0;
    for (const pid of owned(g, fid)) pop += g.def.P[pid].population;
    const T = g.def.F[fid].traits;
    const room = clamp(1 - f.troops / Math.max(1, troopCap(g, fid)), minRoom, 1);
    return pop * E.recruitPerPop * (0.6 + (0.4 * f.loyalty) / 100) * T.recruit * (T.knowledge || 1) * room;
  }

  function upkeep(g, fid) {
    return g.state.factions[fid].troops * g.def.rules.economy.upkeepPerTroop * (g.def.F[fid].traits.upkeep || 1);
  }

  function defenseOf(g, pid) {
    const C = g.def.rules.combat;
    const pv = g.state.provinces[pid];
    const P = g.def.P[pid];
    const fortMul = 1 + C.fortBonus * pv.fort;
    if (pv.owner === NEUTRAL) return { troops: pv.garrison, power: pv.garrison * P.defense * fortMul };
    const f = g.state.factions[pv.owner];
    const T = g.def.F[pv.owner].traits;
    const n = owned(g, pv.owner).length;
    const troops = Math.min(f.troops, (f.troops / n) * (f.seat === pid ? C.seatBonus : 1));
    let mul = P.defense * fortMul * T.defense * morale(f);
    if (P.river && T.riverDefense) mul *= T.riverDefense;
    return { troops, power: troops * mul };
  }

  function attackOf(g, fid, pid) {
    const C = g.def.rules.combat;
    const f = g.state.factions[fid];
    const T = g.def.F[fid].traits;
    const P = g.def.P[pid];
    const late = g.state.turn > g.def.rules.lateWarTurn ? C.lateCommitBonus || 0 : 0;
    const commit = f.troops * clamp(C.commitBase + C.commitAggression * T.aggression + late, 0.3, 0.8);
    let mul = T.attack * morale(f);
    if (T.cavalry && P.terrain === 'plains') mul *= T.cavalry;
    if (T.northPenalty && P.north) mul *= T.northPenalty;
    return { commit, power: commit * mul };
  }

  // Strongest faction pressing on fid's borders, as a troops ratio.
  function threatOf(g, fid) {
    const me = g.state.factions[fid];
    let worst = null;
    let ratio = 0;
    for (const pid of frontier(g, fid)) {
      const o = g.state.provinces[pid].owner;
      if (o === NEUTRAL || hasPact(g, fid, o)) continue;
      const r = g.state.factions[o].troops / Math.max(1, me.troops);
      if (r > ratio) {
        ratio = r;
        worst = o;
      }
    }
    return { fid: worst, ratio };
  }

  function originFor(g, fid, target) {
    const f = g.state.factions[fid];
    const adj = g.def.P[target].neighbors.filter((n) => g.state.provinces[n].owner === fid);
    if (!adj.length) return null;
    return adj.includes(f.seat) ? f.seat : adj[0];
  }

  function validAttackFrom(g, fid, from, target) {
    if (!from || !target) return false;
    const pv = g.state.provinces[from];
    const P = g.def.P[target];
    if (!pv || !P || pv.owner !== fid) return false;
    return P.neighbors.indexOf(from) !== -1;
  }

  function attackOrigin(g, d) {
    if (d && validAttackFrom(g, d.fid, d.from, d.target)) return d.from;
    return originFor(g, d.fid, d.target);
  }

  function calendar(g, turn) {
    const t = (turn || g.state.turn) - 1;
    const seasons = g.def.world.meta.seasons || ['Xuân', 'Hạ', 'Thu', 'Đông'];
    const startName = (g.def.world.meta && g.def.world.meta.startSeason) || seasons[0];
    const startIdx = Math.max(0, seasons.indexOf(startName));
    const idx = startIdx + t;
    return { year: g.def.world.meta.startYear + Math.floor(idx / seasons.length), season: seasons[idx % seasons.length] };
  }

  // Display name of a target: a province shows its city, a faction its ruler.
  function nameOf(g, kind, id) {
    if (kind === 'province') return g.def.P[id].city;
    if (id === NEUTRAL) return g.def.world.neutral.name;
    return g.def.F[id].persona.name;
  }

  // --------------------------------------------------------------- decisions

  function voice(g, fid, action, targetName) {
    const st = g.state;
    const persona = g.def.F[fid].persona;
    const home = g.def.P[st.factions[fid].seat].city;
    return pick(st, persona.quotes[action]).replace(/\{t\}/g, targetName || home).replace(/\{home\}/g, home);
  }

  // Mock agent: persona weights bent by the situation. Swap this for an LLM
  // call later; resolveTurn only needs the returned shape.
  function decide(g, fid) {
    const st = g.state;
    const F = g.def.F[fid];
    const T = F.traits;
    const f = st.factions[fid];
    const R = g.def.rules;
    const w = { ...F.weights };

    // Late war turns everyone bolder; a runaway leader draws a coalition.
    const late = st.turn > R.lateWarTurn;
    const leader = leaderOf(g);
    const minRatio = late ? 0.7 : 0.8;

    // attack target
    let best = null;
    for (const pid of frontier(g, fid)) {
      const owner = st.provinces[pid].owner;
      if (g.def.guestProtected && g.def.guestProtected(g, fid, owner)) continue;
      const pact = owner !== NEUTRAL && hasPact(g, fid, owner);
      if (pact && !(T.betrayal && rand(st) < T.betrayal)) continue;
      const atk = attackOf(g, fid, pid);
      const dfn = defenseOf(g, pid);
      const ratio = atk.power / Math.max(1, dfn.power);
      let score = ratio * (owner === NEUTRAL ? 1.25 : 1) * (g.def.P[pid].strategic ? 1.15 : 1) * (st.emperorAt === pid ? 1.2 : 1);
      if (T.vengeance && f.grudge && owner === f.grudge.fid && st.turn - f.grudge.turn <= 3) score *= 3;
      if (leader && leader !== fid && owner === leader) score *= 1.4;
      if (!best || score > best.score) best = { pid, ratio, score, betray: pact };
    }
    if (!best || best.ratio < minRatio) w.attack = 0;
    else if (best.ratio < 1) w.attack *= 0.3;
    else if (best.ratio > 2.2) w.attack *= 4;
    else if (best.ratio > 1.5) w.attack *= 2.5;
    if (late) w.attack *= 1.4;
    if (best && leader && leader !== fid && st.provinces[best.pid].owner === leader) w.attack *= 1.2;
    if (best && T.vengeance && f.grudge && st.provinces[best.pid].owner === f.grudge.fid && st.turn - f.grudge.turn <= 3) w.attack *= 3;

    // economy pressure
    if (f.grain < upkeep(g, fid) * 3) w.internal *= 2.2;
    if (f.loyalty < 45) w.internal *= 1.8;

    // threat
    const threat = threatOf(g, fid);
    if (threat.ratio > 1.2) {
      w.fortify *= 1.8;
      w.diplomacy *= 1.4;
      w.stratagem *= 1.3;
    }
    const mine = owned(g, fid);
    if (mine.every((pid) => st.provinces[pid].fort >= R.combat.fortMax)) w.fortify *= 0.15;

    // diplomacy
    const myPacts = pactCount(g, fid);
    const neutralAdj = frontier(g, fid).filter((pid) => st.provinces[pid].owner === NEUTRAL);
    const others = aliveIds(g).filter((id) => id !== fid && !hasPact(g, fid, id) && pactCount(g, id) < R.pact.max);
    if (myPacts >= R.pact.max && !neutralAdj.length) w.diplomacy = 0;
    if (neutralAdj.length && f.prestige > 70) w.diplomacy *= 1.3;
    if (!others.length && !neutralAdj.length) w.diplomacy = 0;

    // stratagem needs a rival
    const rival = threat.fid || others.slice().sort((a, b) => st.factions[b].troops - st.factions[a].troops)[0] || null;
    if (!rival) w.stratagem = 0;

    const action = weighted(st, w);
    const d = { fid, action, label: ACTIONS[action].label, icon: ACTIONS[action].icon, sub: null, target: null, targetKind: null, from: null, betray: false };

    if (action === 'attack') {
      d.target = best.pid;
      d.targetKind = 'province';
      d.from = originFor(g, fid, best.pid);
      d.betray = best.betray;
    } else if (action === 'diplomacy') {
      if (neutralAdj.length && (rand(st) < 0.5 || !others.length)) {
        d.sub = 'annex';
        d.target = pick(st, neutralAdj);
        d.targetKind = 'province';
      } else {
        const adjacentFactions = new Set(frontier(g, fid).map((pid) => st.provinces[pid].owner).filter((o) => o !== NEUTRAL && !hasPact(g, fid, o)));
        const pool = others.filter((id) => adjacentFactions.has(id));
        d.sub = 'pact';
        d.target = (pool.length ? pool : others).slice().sort((a, b) => st.factions[b].troops - st.factions[a].troops)[0];
        d.targetKind = 'faction';
      }
    } else if (action === 'stratagem') {
      d.sub = pick(st, ['discord', 'burn', 'defect']);
      d.target = rival;
      d.targetKind = 'faction';
    } else if (action === 'fortify') {
      let target = f.seat;
      let worst = -1;
      for (const pid of mine) {
        if (st.provinces[pid].fort >= R.combat.fortMax) continue;
        let pressure = 0;
        for (const n of g.def.P[pid].neighbors) {
          const o = st.provinces[n].owner;
          if (o !== NEUTRAL && o !== fid && !hasPact(g, fid, o)) pressure += st.factions[o].troops;
        }
        if (pressure > worst) {
          worst = pressure;
          target = pid;
        }
      }
      d.target = target;
      d.targetKind = 'province';
    } else {
      d.target = f.seat;
      d.targetKind = 'province';
    }

    const targetName = d.target ? nameOf(g, d.targetKind, d.target) : null;
    d.targetName = targetName;
    d.quote = voice(g, fid, action, d.targetKind === 'faction' ? g.def.F[d.target].persona.name : targetName);
    f.last = d;
    return d;
  }

  function decideAll(g) {
    return aliveIds(g).map((fid) => decide(g, fid));
  }

  // --------------------------------------------------------------- resolution

  function snapshot(g) {
    const out = {};
    for (const id of g.def.order) {
      const f = g.state.factions[id];
      out[id] = { troops: f.troops, grain: f.grain, loyalty: f.loyalty, prestige: f.prestige, provinces: owned(g, id).length, alive: f.alive };
    }
    return out;
  }

  function moveSeat(g, fid) {
    const left = owned(g, fid);
    if (!left.length) return;
    left.sort((a, b) => g.def.P[b].population - g.def.P[a].population);
    g.state.factions[fid].seat = left[0];
  }

  function eliminate(g, fid, byFid, events) {
    const st = g.state;
    const f = st.factions[fid];
    const persona = g.def.F[fid].persona;
    f.alive = false;
    if (byFid && byFid !== NEUTRAL) st.factions[byFid].troops += f.troops * g.def.rules.combat.captureAbsorb;
    f.troops = 0;
    f.pacts = {};
    for (const id of g.def.order) delete st.factions[id].pacts[fid];
    events.push({ kind: 'fall', fid, by: byFid, tone: 'bad', text: `${persona.name} diệt vong. “${persona.fall}”` });
  }

  function resolveFortify(g, d, events) {
    const st = g.state;
    const f = st.factions[d.fid];
    const pv = st.provinces[d.target];
    const name = g.def.F[d.fid].persona.name;
    if (!pv || pv.owner !== d.fid) return;
    const step = g.def.F[d.fid].traits.fortifyStep || 1;
    pv.fort = Math.min(g.def.rules.combat.fortMax, pv.fort + step);
    f.troops *= 1.03;
    f.loyalty += 3;
    events.push({ kind: 'fortify', fid: d.fid, prov: d.target, level: pv.fort, tone: 'neutral', text: `${name} củng cố ${g.def.P[d.target].city} — thành lũy cấp ${pv.fort}.` });
  }

  function resolveInternal(g, d, events) {
    const st = g.state;
    const E = g.def.rules.economy;
    const F = g.def.F[d.fid];
    const f = st.factions[d.fid];
    // income() and recruits() already carry the emperors' knowledge multiplier
    const grain = income(g, d.fid) * E.internalGrainShare;
    const troops = recruits(g, d.fid, 0.3) * E.internalRecruitMul;
    const loyalty = between(st, 6, 10) * F.traits.loyaltyGain;
    f.grain += grain;
    f.troops += troops;
    f.loyalty += loyalty;
    f.prestige += 1;
    events.push({ kind: 'internal', fid: d.fid, prov: f.seat, tone: 'good', text: `${F.persona.name} ${F.persona.reform}: +${fmt(grain)} lương, +${fmt(troops)} binh, dân tâm +${round(loyalty)}.` });
  }

  function resolveDiplomacy(g, d, events) {
    const st = g.state;
    const R = g.def.rules;
    const F = g.def.F[d.fid];
    const f = st.factions[d.fid];
    const name = F.persona.name;
    if (d.sub === 'annex') {
      const pv = st.provinces[d.target];
      const city = g.def.P[d.target].city;
      if (pv.owner !== NEUTRAL || !originFor(g, d.fid, d.target)) return;
      const chance = clamp(0.25 + (f.prestige - 60) / 100 + F.traits.diplomacy, 0.1, 0.75);
      if (rand(st) < chance) {
        f.troops += pv.garrison * 0.5;
        pv.owner = d.fid;
        pv.garrison = 0;
        pv.fort = 0;
        f.prestige += 4;
        if (st.emperorAt === d.target) f.prestige += 6;
        events.push({ kind: 'annex', fid: d.fid, prov: d.target, ok: true, tone: 'good', text: `${city} mở cổng quy thuận ${name}. Quân trấn thủ nhập vào đội ngũ.` });
      } else {
        f.prestige -= 1;
        events.push({ kind: 'annex', fid: d.fid, prov: d.target, ok: false, tone: 'neutral', text: `${city} đóng cổng, từ chối sứ giả của ${name}.` });
      }
      return;
    }
    const other = st.factions[d.target];
    if (!other || !other.alive || hasPact(g, d.fid, d.target)) return;
    if (pactCount(g, d.fid) >= R.pact.max || pactCount(g, d.target) >= R.pact.max) {
      events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: false, tone: 'neutral', text: `${g.def.F[d.target].persona.name} đã đủ minh hữu, không tiếp sứ giả của ${name}.` });
      return;
    }
    const O = g.def.F[d.target];
    if (g.state.playerFid && d.target === g.state.playerFid && d.fid !== g.state.playerFid) {
      const id = 'pact:' + st.turn + ':' + d.fid + ':' + d.target;
      const rec = (g.state.reactionAnswers || {})[id];
      const answer = rec && typeof rec === 'object' ? rec.answer : rec;
      if (answer === 'accept') {
        const until = st.turn + R.pact.turns;
        f.pacts[d.target] = until;
        other.pacts[d.fid] = until;
        f.prestige += 3;
        other.prestige += 2;
        events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: true, until, turns: R.pact.turns, tone: 'good', text: `${name} và ${O.persona.name} kết minh ${R.pact.turns} lượt.` });
        return;
      }
      if (answer === 'reject') {
        events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: false, code: 'rejected', turns: R.pact.turns, tone: 'neutral', text: `${O.persona.name} từ chối minh ước của ${name}.` });
        return;
      }
      events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: false, code: 'unanswered', tone: 'neutral', text: `${name} chờ trả lời minh ước.` });
      return;
    }
    const bully = other.troops > f.troops * 2 ? 0.1 : 0;
    const chance = clamp(0.35 + (0.3 * f.prestige) / 100 + F.traits.diplomacy + O.traits.openness - bully, 0.1, 0.85);
    if (rand(st) < chance) {
      const until = st.turn + R.pact.turns;
      f.pacts[d.target] = until;
      other.pacts[d.fid] = until;
      f.prestige += 3;
      other.prestige += 2;
      events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: true, until, turns: R.pact.turns, tone: 'good', text: `${name} và ${O.persona.name} kết minh ${R.pact.turns} lượt.` });
    } else {
      f.prestige -= 2;
      events.push({ kind: 'pact', fid: d.fid, other: d.target, ok: false, tone: 'neutral', text: `${O.persona.name} khước từ sứ giả của ${name}.` });
    }
  }

  function resolveStratagem(g, d, events) {
    const st = g.state;
    const F = g.def.F[d.fid];
    const f = st.factions[d.fid];
    const t = st.factions[d.target];
    if (!t || !t.alive) return;
    const Tg = g.def.F[d.target];
    const chance = clamp(0.45 + (f.prestige - t.prestige) / 250 + F.traits.stratagem + Tg.traits.stratagemVulnerability, 0.15, 0.85);
    const kind = STRATAGEM_NAMES[d.sub];
    if (rand(st) < chance) {
      let effect = '';
      if (d.sub === 'discord') {
        const loss = between(st, 10, 15);
        t.loyalty -= loss;
        effect = `dân tâm ${Tg.persona.short} −${round(loss)}`;
      } else if (d.sub === 'burn') {
        const loss = t.grain * 0.28;
        t.grain -= loss;
        effect = `−${fmt(loss)} lương`;
      } else {
        const n = t.troops * 0.08;
        t.troops -= n;
        f.troops += n * 0.6;
        effect = `${fmt(n * 0.6)} quân ${Tg.persona.short} trở giáo`;
      }
      f.prestige += 2;
      events.push({ kind: 'stratagem', fid: d.fid, other: d.target, prov: t.seat, ok: true, tone: 'good', text: `Kế ${kind} của ${F.persona.name} thành công: ${effect}.` });
    } else {
      f.prestige -= 4;
      t.prestige += 2;
      events.push({ kind: 'stratagem', fid: d.fid, other: d.target, prov: t.seat, ok: false, tone: 'bad', text: `Kế ${kind} của ${F.persona.name} bị ${Tg.persona.name} phát giác.` });
    }
  }

  function resolveAttack(g, d, events) {
    const st = g.state;
    const R = g.def.rules;
    const C = R.combat;
    const F = g.def.F[d.fid];
    const f = st.factions[d.fid];
    const pv = st.provinces[d.target];
    const P = g.def.P[d.target];
    const name = F.persona.name;
    if (!f.alive || pv.owner === d.fid) return;
    const from = attackOrigin(g, d);
    if (!from) {
      events.push({ kind: 'event', fid: d.fid, tone: 'neutral', text: `Đường tiến quân của ${name} tới ${P.city} bị cắt, đại quân quay về.` });
      return;
    }
    const defender = pv.owner;
    if (defender !== NEUTRAL && g.def.guestProtected && g.def.guestProtected(g, d.fid, defender)) {
      events.push({
        kind: 'event',
        code: 'guest_truce',
        fid: d.fid,
        other: defender,
        from,
        to: d.target,
        ok: false,
        tone: 'neutral',
        text: `${name} dừng quân — đình chiến khách còn hiệu lực tại ${P.city}.`,
      });
      return;
    }
    if (defender !== NEUTRAL && hasPact(g, d.fid, defender)) {
      if (!d.betray) {
        events.push({ kind: 'event', fid: d.fid, tone: 'neutral', text: `${name} hủy binh — ${g.def.F[defender].persona.name} vừa là minh hữu.` });
        return;
      }
      delete f.pacts[defender];
      delete st.factions[defender].pacts[d.fid];
      f.prestige -= 6;
      events.push({ kind: 'event', fid: d.fid, other: defender, tone: 'bad', text: `${name} bội minh, trở mặt với ${g.def.F[defender].persona.name}!` });
    }
    if (defender !== NEUTRAL && g.def.noteGuestAttack) g.def.noteGuestAttack(g, d.fid, defender);

    const atk = attackOf(g, d.fid, d.target);
    const dfn = defenseOf(g, d.target);
    const s = C.randomSpread;
    const atkRoll = atk.power * between(st, 1 - s, 1 + s);
    const defRoll = Math.max(1, dfn.power * between(st, 1 - s, 1 + s));
    const win = atkRoll > defRoll;
    const defName = nameOf(g, 'faction', defender);
    const t = defender === NEUTRAL ? null : st.factions[defender];
    const ev = { kind: 'attack', fid: d.fid, from, to: d.target, defender, win, commit: round(atk.commit), tone: win ? 'good' : 'bad' };

    if (win) {
      const attLoss = atk.commit * clamp(0.08 + (0.25 * defRoll) / atkRoll, 0.08, 0.35);
      const defLoss = dfn.troops * 0.55;
      f.troops -= attLoss;
      f.troops += defLoss * (C.surrender || 0); // hàng binh
      if (t) t.troops = Math.max(0, t.troops - defLoss);
      const wasSeat = t && t.seat === d.target;
      pv.owner = d.fid;
      pv.fort = 0;
      pv.garrison = 0;
      f.prestige += 4 + (P.strategic ? 2 : 0);
      f.loyalty -= 2;
      ev.attLoss = round(attLoss);
      ev.defLoss = round(defLoss);
      ev.text = `${name} xuất ${fmt(atk.commit)} quân đánh ${P.city}. ${defender === NEUTRAL ? 'Quân trấn thủ' : defName} thất thủ — ${P.city} về tay ${F.persona.short}.`;
      events.push(ev);
      if (st.emperorAt === d.target) {
        f.prestige += 8;
        events.push({ kind: 'event', fid: d.fid, prov: d.target, tone: 'good', text: `${name} đón được ${g.def.world.emperor.name} — danh chính ngôn thuận.` });
      }
      if (t) {
        t.prestige -= 3 + (wasSeat ? 6 : 0);
        t.loyalty -= 4;
        if (g.def.F[defender].traits.vengeance) t.grudge = { fid: d.fid, turn: st.turn };
        if (!owned(g, defender).length) eliminate(g, defender, d.fid, events);
        else if (wasSeat) {
          moveSeat(g, defender);
          events.push({ kind: 'event', fid: defender, prov: t.seat, tone: 'bad', text: `${defName} mất thủ phủ, dời về ${g.def.P[t.seat].city}.` });
        }
      }
    } else {
      const attLoss = atk.commit * clamp(0.2 + (0.2 * defRoll) / atkRoll, 0.2, 0.45);
      const defLoss = dfn.troops * clamp((0.1 * atkRoll) / defRoll, 0.03, 0.2);
      f.troops -= attLoss;
      if (t) {
        t.troops = Math.max(0, t.troops - defLoss);
        t.prestige += 2;
      } else pv.garrison = Math.max(2000, pv.garrison - defLoss);
      f.prestige -= 3;
      ev.attLoss = round(attLoss);
      ev.defLoss = round(defLoss);
      ev.text = `${name} đánh ${P.city} nhưng bị ${defender === NEUTRAL ? 'quân trấn thủ' : defName} đẩy lui, tổn thất ${fmt(attLoss)} quân.`;
      events.push(ev);
    }
  }

  function applyEffect(f, effect) {
    if (effect.troops) f.troops *= 1 + effect.troops;
    if (effect.grain) f.grain *= 1 + effect.grain;
    if (effect.loyalty) f.loyalty += effect.loyalty;
    if (effect.prestige) f.prestige += effect.prestige;
  }

  function upkeepPhase(g, events) {
    const st = g.state;
    const R = g.def.rules;
    for (const fid of aliveIds(g)) {
      const F = g.def.F[fid];
      const f = st.factions[fid];
      const name = F.persona.name;
      f.grain += income(g, fid) - upkeep(g, fid);
      f.troops += recruits(g, fid);
      if (f.grain < 0) {
        f.grain = 0;
        f.troops *= 0.88;
        f.loyalty -= R.loyalty.famineLoss;
        events.push({ kind: 'event', fid, tone: 'bad', text: `Kho lương ${F.persona.short} cạn — quân đói bỏ trốn, dân oán thán.` });
      }
      f.loyalty += F.traits.loyaltyDrift;
      if (owned(g, fid).includes(st.emperorAt)) f.prestige += R.emperorPrestigePerTurn;

      const mine = owned(g, fid);
      if (f.loyalty < R.loyalty.revoltBelow && mine.length > 1 && rand(st) < (R.loyalty.revoltBelow - f.loyalty) / 50) {
        const pool = mine.filter((pid) => pid !== f.seat);
        const pid = pick(st, pool);
        st.provinces[pid].owner = NEUTRAL;
        st.provinces[pid].garrison = R.neutralRevoltGarrison;
        st.provinces[pid].fort = 0;
        f.troops *= 0.92;
        f.prestige -= 3;
        f.loyalty += 6;
        events.push({ kind: 'revolt', fid, prov: pid, tone: 'bad', text: `Dân ${g.def.P[pid].city} nổi dậy, thoát khỏi ${name}.` });
      }

      for (const ev of F.events || []) {
        if (st.turn >= (ev.minTurn || 1) && rand(st) < ev.chance) {
          applyEffect(f, ev.effect);
          events.push({ kind: 'event', fid, tone: 'bad', text: F.persona.events[ev.id] || `${name} gặp biến cố.` });
        }
      }

      for (const [o, until] of Object.entries(f.pacts)) if (until < st.turn + 1) delete f.pacts[o];
      f.troops = Math.max(0, f.troops);
      f.grain = Math.max(0, f.grain);
      f.loyalty = clamp(f.loyalty, 0, 100);
      f.prestige = clamp(f.prestige, 0, 100);
      if (f.grudge && st.turn - f.grudge.turn > 3) f.grudge = null;
    }
  }

  function victoryCheck(g, events) {
    const st = g.state;
    const R = g.def.rules;
    const alive = aliveIds(g);
    let winner = null;
    let kind = null;
    for (const fid of alive) {
      if (owned(g, fid).length >= R.unifyProvinces) {
        winner = fid;
        kind = 'unify';
      }
    }
    if (!winner && alive.length === 1) {
      winner = alive[0];
      kind = 'last';
    }
    if (!winner && st.turn >= R.maxTurns) {
      winner = alive.slice().sort((a, b) => owned(g, b).length - owned(g, a).length || st.factions[b].prestige - st.factions[a].prestige)[0];
      kind = 'hegemon';
    }
    if (winner) {
      const persona = g.def.F[winner].persona;
      st.over = true;
      st.winner = { fid: winner, kind };
      const headline = kind === 'hegemon' ? `${persona.name} xưng bá thiên hạ!` : `${persona.name} thống nhất thiên hạ!`;
      events.push({ kind: 'win', fid: winner, tone: 'good', headline, text: `${headline} “${persona.victory}”` });
    }
  }

  function deltas(g, before) {
    const after = snapshot(g);
    const out = [];
    for (const id of g.def.order) {
      const a = before[id];
      const b = after[id];
      if (!a.alive) continue;
      out.push({
        fid: id,
        troops: round(b.troops - a.troops),
        grain: round(b.grain - a.grain),
        loyalty: round(b.loyalty - a.loyalty),
        prestige: round(b.prestige - a.prestige),
        provinces: b.provinces - a.provinces,
      });
    }
    return out;
  }

  // Resolve one full turn from every living faction's decision.
  // Order: fortify → internal → diplomacy → stratagem → attacks (strongest first) → upkeep → victory.
  function resolveTurn(g, decisions) {
    const st = g.state;
    if (st.over) return { turn: st.turn, events: [], deltas: [], winner: st.winner };
    const turn = st.turn;
    const before = snapshot(g);
    const events = [];
    const live = decisions.filter((d) => st.factions[d.fid] && st.factions[d.fid].alive);
    const of = (a) => live.filter((d) => d.action === a);

    of('fortify').forEach((d) => resolveFortify(g, d, events));
    of('internal').forEach((d) => resolveInternal(g, d, events));
    of('diplomacy').forEach((d) => resolveDiplomacy(g, d, events));
    of('stratagem').forEach((d) => resolveStratagem(g, d, events));
    of('attack')
      .map((d) => ({ d, p: attackOf(g, d.fid, d.target).power }))
      .sort((a, b) => b.p - a.p)
      .forEach(({ d }) => resolveAttack(g, d, events));
    upkeepPhase(g, events);
    for (const f of Object.values(st.factions)) {
      f.loyalty = clamp(f.loyalty, 0, 100);
      f.prestige = clamp(f.prestige, 0, 100);
    }
    victoryCheck(g, events);

    const result = { turn, calendar: calendar(g, turn), events, deltas: deltas(g, before), winner: st.winner };
    if (!st.over) st.turn += 1;
    return result;
  }

  // Convenience for tests, the server and fast-forward.
  function playTurn(g) {
    return resolveTurn(g, decideAll(g));
  }

  // UI-facing ranking: alive first, then prestige (the brief sorts by Uy tín).
  function ranking(g) {
    return g.def.order
      .map((id) => ({ id, ...g.state.factions[id], provinces: owned(g, id) }))
      .sort((a, b) => b.alive - a.alive || b.prestige - a.prestige);
  }

  return {
    ACTIONS,
    NEUTRAL,
    STRATAGEMS,
    STRATAGEM_NAMES,
    createGame,
    restoreGame,
    decide,
    decideAll,
    resolveTurn,
    playTurn,
    ranking,
    owned,
    frontier,
    hasPact,
    aliveIds,
    calendar,
    originFor,
    validAttackFrom,
    attackOrigin,
    attackOf,
    defenseOf,
    income,
    upkeep,
    fmt,
  };
});
