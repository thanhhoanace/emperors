/* Perception layer: truth → DecisionContext. Attach onto the UMD engine.
 * projectPerception is pure. Observations update once per turn, before any decision.
 * DecisionContext has no RNG seed and no bandValues.
 * It is the internal MOCK/UI context. Faction ids inside it are not an LLM-safe projection.
 */
'use strict';

const DEFAULT_RULES = {
  bands: { weakMax: 25000, mediumMax: 45000, strongMax: 90000 },
  aliases: {},
  knownByDefault: ['cao_cao', 'liu_bei', 'sun_quan'],
  prior: {
    id: 'wu_jing_pressure',
    holders: ['li_shimin', 'zhu_yuanzhang'],
    when: { alive: ['guan_yu'], owner: { jing_nan: 'liu_bei', jiang: 'sun_quan', jing: 'cao_cao' } },
    bias: { attack: 1.35 },
    focus: ['jing_nan', 'jing'],
  },
};
const BAND_VALUES = { unknown: 32000, weak: 18000, medium: 35000, strong: 65000, very_strong: 130000 };

function rulesOf(g) {
  return Object.assign({}, DEFAULT_RULES, (g.def && g.def.intelRules) || {}, g.def && g.def.world && g.def.world.intelRules);
}

function bandOf(troops, rules) {
  const b = (rules && rules.bands) || DEFAULT_RULES.bands;
  if (troops == null || !Number.isFinite(troops)) return 'unknown';
  if (troops < b.weakMax) return 'weak';
  if (troops < b.mediumMax) return 'medium';
  if (troops < b.strongMax) return 'strong';
  return 'very_strong';
}

function bandValue(band) {
  return BAND_VALUES[band] != null ? BAND_VALUES[band] : BAND_VALUES.unknown;
}

const COMMANDER_NAMES = {
  cao_ren: 'Tào Nhân',
  cao_pi: 'Tào Phi',
  zhang_he: 'Trương Hợp',
  xiahou_dun: 'Hạ Hầu Đôn',
  zhang_liao: 'Trương Liêu',
  zang_ba: 'Tạng Bá',
  li_dian: 'Lý Điển',
  guan_yu: 'Quan Vũ',
  wei_yan: 'Ngụy Diên',
  lu_meng: 'Lã Mông',
  gongsun_kang: 'Công Tôn Khang',
  yong_kai: 'Ung Khải',
  shi_xie: 'Sĩ Nhiếp',
};

function localTroopCount(g, pid) {
  const pv = g.state.provinces[pid];
  if (!pv) return null;
  if (pv.owner === 'neutral') return pv.garrison || 0;
  const fid = pv.owner;
  const f = g.state.factions[fid];
  if (!f || !f.alive) return 0;
  let n = 0;
  for (const id of g.def.provinceIds) if (g.state.provinces[id].owner === fid) n += 1;
  if (!n) return 0;
  const seatBonus = (g.def.rules.combat && g.def.rules.combat.seatBonus) || 1;
  return Math.min(f.troops, (f.troops / n) * (f.seat === pid ? seatBonus : 1));
}

function commanderName(g, pid, observer, rules) {
  const cid = (g.state.governors && g.state.governors[pid]) || null;
  if (!cid) return null;
  if (g.def.F && g.def.F[cid]) return publicLabel(g, observer, cid, rules);
  return COMMANDER_NAMES[cid] || cid;
}

function adjacentFactions(g, a, b) {
  if (a === b) return false;
  const ownedA = g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === a);
  for (const pid of ownedA) {
    for (const n of g.def.P[pid].neighbors) {
      if (g.state.provinces[n].owner === b) return true;
    }
  }
  return false;
}

function publicLabel(g, observer, target, rules) {
  const alias = (rules.aliases || {})[target] || {};
  const known3k = rules.knownByDefault || [];
  if (observer === target) return alias.trueName || alias.publicLabel || target;
  if (known3k.indexOf(target) !== -1) return alias.trueName || alias.publicLabel || target;
  const claim = ((g.state.intelLog || {}).claims || {})[target];
  if (claim) return alias.publicLabel || claim;
  return alias.publicLabel || alias.trueName || target;
}

function claimedIdentity(g, target) {
  return ((g.state.intelLog || {}).claims || {})[target] || null;
}

function ensureIntelLog(g) {
  if (!g.state.intelLog) g.state.intelLog = { lastSeen: {}, claims: {}, provinces: {} };
  if (!g.state.intelLog.lastSeen) g.state.intelLog.lastSeen = {};
  if (!g.state.intelLog.claims) g.state.intelLog.claims = {};
  if (!g.state.intelLog.provinces) g.state.intelLog.provinces = {};
  return g.state.intelLog;
}

function observeProvinces(g, turn) {
  const log = ensureIntelLog(g);
  const rules = rulesOf(g);
  const seenTurn = turn || g.state.turn;
  const ids = (g.def.order || []).filter((id) => g.state.factions[id] && g.state.factions[id].alive);
  for (const obs of ids) {
    if (!log.provinces[obs]) log.provinces[obs] = {};
    const mine = g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === obs);
    const seen = new Set(mine);
    for (const pid of mine) for (const n of g.def.P[pid].neighbors) seen.add(n);
    for (const pid of seen) {
      const pv = g.state.provinces[pid];
      log.provinces[obs][pid] = {
        troopBand: bandOf(localTroopCount(g, pid), rules),
        commander: commanderName(g, pid, obs, rules),
        fortLevel: pv.fort,
        turn: seenTurn,
      };
    }
  }
}

function observeFactions(g, turn) {
  const log = ensureIntelLog(g);
  const rules = rulesOf(g);
  const seenTurn = turn || g.state.turn;
  const ids = (g.def.order || []).filter((id) => g.state.factions[id] && g.state.factions[id].alive);
  for (const obs of ids) {
    if (!log.lastSeen[obs]) log.lastSeen[obs] = {};
    for (const other of ids) {
      if (other === obs) continue;
      if (!adjacentFactions(g, obs, other)) continue;
      const f = g.state.factions[other];
      log.lastSeen[obs][other] = {
        troopBand: bandOf(f.troops, rules),
        action: (f.last && f.last.action) || null,
        turn: seenTurn,
        province: f.seat,
      };
    }
  }
  observeProvinces(g, seenTurn);
}

let EngineRef = null;

function priorFor(g, fid, rules) {
  const spec = rules.prior;
  if (!spec || !spec.holders || spec.holders.indexOf(fid) === -1) return null;
  const pred = EngineRef && EngineRef.matchPred ? EngineRef.matchPred : g.def.matchPred;
  const ok = typeof pred === 'function' ? pred(g, spec.when) : false;
  return {
    id: spec.id,
    status: ok ? 'active' : 'obsolete',
    bias: spec.bias || { attack: 1.35 },
    focus: spec.focus || [],
  };
}

function buildProvinceIntel(g, fid, rules) {
  const out = {};
  const mine = new Set(g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === fid));
  const adjacent = new Set();
  for (const pid of mine) for (const n of g.def.P[pid].neighbors) if (!mine.has(n)) adjacent.add(n);
  const memory = (g.state.intelLog.provinces && g.state.intelLog.provinces[fid]) || {};
  for (const pid of g.def.provinceIds) {
    const pv = g.state.provinces[pid];
    const base = { owner: pv.owner, city: g.def.P[pid].city };
    if (mine.has(pid)) {
      out[pid] = Object.assign(base, {
        troopBand: bandOf(localTroopCount(g, pid), rules),
        commander: commanderName(g, pid, fid, rules),
        fortLevel: pv.fort,
        lastSeenTurn: g.state.turn,
        source: 'own',
      });
    } else if (adjacent.has(pid)) {
      out[pid] = Object.assign(base, {
        troopBand: bandOf(localTroopCount(g, pid), rules),
        commander: commanderName(g, pid, fid, rules),
        fortLevel: pv.fort,
        lastSeenTurn: g.state.turn,
        source: 'adjacent',
      });
    } else if (memory[pid]) {
      const mem = memory[pid];
      out[pid] = Object.assign(base, {
        troopBand: mem.troopBand || 'unknown',
        commander: mem.commander != null ? mem.commander : null,
        fortLevel: mem.fortLevel != null ? mem.fortLevel : null,
        lastSeenTurn: mem.turn != null ? mem.turn : null,
        source: 'memory',
      });
    } else {
      out[pid] = Object.assign(base, {
        troopBand: 'unknown',
        commander: null,
        fortLevel: null,
        lastSeenTurn: null,
        source: 'unknown',
      });
    }
  }
  return out;
}

function activePactEdges(g) {
  const edges = [];
  const seen = new Set();
  const turn = g.state.turn;
  for (const a of g.def.order) {
    const fa = g.state.factions[a];
    if (!fa || !fa.alive) continue;
    for (const b of Object.keys(fa.pacts || {})) {
      const until = fa.pacts[b];
      if (!(until >= turn)) continue;
      const fb = g.state.factions[b];
      if (!fb || !fb.alive) continue;
      const pair = [a, b].sort();
      const key = pair.join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: pair[0], b: pair[1], untilTurn: until, remainingTurns: until - turn });
    }
  }
  edges.sort((x, y) => (x.a + x.b).localeCompare(y.a + y.b));
  return edges;
}

function pactMembers(g, fid, edges) {
  const adj = {};
  for (const id of g.def.order) adj[id] = [];
  for (const e of edges) {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  }
  const seen = new Set();
  const stack = [fid];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    for (const n of adj[cur] || []) if (!seen.has(n)) stack.push(n);
  }
  return Array.from(seen);
}

function provinceCountOf(g, fid) {
  let n = 0;
  for (const pid of g.def.provinceIds) if (g.state.provinces[pid].owner === fid) n += 1;
  return n;
}

function blocBordersObserver(g, observer, members) {
  const mine = new Set();
  for (const pid of g.def.provinceIds) if (g.state.provinces[pid].owner === observer) mine.add(pid);
  const set = new Set(members);
  for (const pid of g.def.provinceIds) {
    if (!set.has(g.state.provinces[pid].owner)) continue;
    for (const n of g.def.P[pid].neighbors) if (mine.has(n)) return true;
  }
  return false;
}

function diplomaticPressure(g, observer) {
  const edges = activePactEdges(g);
  const out = {};
  const self = g.state.factions[observer];
  for (const id of g.def.order) {
    if (id === observer) continue;
    const f = g.state.factions[id];
    if (!f || !f.alive) { out[id] = 'none'; continue; }
    const members = pactMembers(g, id, edges);
    if (members.indexOf(observer) !== -1) { out[id] = 'none'; continue; }
    const borders = blocBordersObserver(g, observer, members);
    let size = 0;
    for (const m of members) size += provinceCountOf(g, m);
    let links = 0;
    for (const e of edges) if (members.indexOf(e.a) !== -1 && members.indexOf(e.b) !== -1) links += 1;
    const grudge = !!(self && self.grudge && self.grudge.fid === id && g.state.turn - self.grudge.turn <= 3);
    if (grudge && borders) out[id] = 'high';
    else if (grudge) out[id] = 'watch';
    else if (borders && links > 0 && size >= 4) out[id] = 'high';
    else if (borders && links > 0) out[id] = 'watch';
    else out[id] = 'none';
  }
  return out;
}

function reactionId(turn, from, to) {
  return 'pact:' + turn + ':' + from + ':' + to;
}

function pactCountOf(g, fid) {
  const f = g.state.factions[fid];
  if (!f) return 0;
  return Object.keys(f.pacts || {}).filter((o) => f.pacts[o] >= g.state.turn).length;
}

function listPactOffers(g, playerFid, decisions) {
  const turns = g.def.rules.pact.turns;
  const max = g.def.rules.pact.max;
  const out = [];
  const seen = new Set();
  for (const d of decisions || []) {
    if (!d || d.fid === playerFid || d.action !== 'diplomacy' || d.target !== playerFid) continue;
    if (d.sub && d.sub !== 'pact') continue;
    const from = g.state.factions[d.fid];
    const to = g.state.factions[playerFid];
    if (!from || !to || !from.alive || !to.alive) continue;
    if (from.pacts && from.pacts[playerFid] >= g.state.turn) continue;
    if (pactCountOf(g, d.fid) >= max) continue;
    const id = reactionId(g.state.turn, d.fid, playerFid);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, kind: 'pact_offer', from: d.fid, to: playerFid, turns });
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

function splitPlayerOffers(g, playerFid, decisions) {
  const max = g.def.rules.pact.max;
  const offers = listPactOffers(g, playerFid, decisions);
  const slots = Math.max(0, max - pactCountOf(g, playerFid));
  return {
    pendingReactions: offers.slice(0, slots),
    declinedOffers: offers.slice(slots).map((o) => Object.assign({ reason: 'pact_full' }, o)),
  };
}

function pendingReactions(g, playerFid, decisions) {
  return splitPlayerOffers(g, playerFid, decisions).pendingReactions;
}

function turnEnvelope(g, playerFid, decisions) {
  const split = splitPlayerOffers(g, playerFid, decisions);
  return {
    v: 1,
    playerFid,
    turn: g.state.turn,
    decisions: (decisions || []).slice(),
    pendingReactions: split.pendingReactions,
    declinedOffers: split.declinedOffers,
    answers: {},
  };
}

function isEnvelopeOffer(envelope, id) {
  if (!envelope || typeof id !== 'string' || !Array.isArray(envelope.decisions)) return false;
  for (const d of envelope.decisions) {
    if (!d || d.fid === envelope.playerFid) continue;
    if (d.action !== 'diplomacy' || d.target !== envelope.playerFid) continue;
    if (d.sub && d.sub !== 'pact') continue;
    if (reactionId(envelope.turn, d.fid, envelope.playerFid) === id) return true;
  }
  return false;
}

function answerReaction(envelope, id, answer) {
  if (!envelope || envelope.v !== 1 || !Array.isArray(envelope.pendingReactions)) {
    throw new Error('answerReaction requires a turn envelope from preparePlayerTurn');
  }
  if (answer !== 'accept' && answer !== 'reject') throw new Error('reaction answer must be accept or reject');
  if ((envelope.declinedOffers || []).some((r) => r.id === id)) {
    throw new Error('reaction id is not a pending offer on this turn');
  }
  if (!envelope.pendingReactions.some((r) => r.id === id) || !isEnvelopeOffer(envelope, id)) {
    throw new Error('reaction id is not a pending offer on this turn');
  }
  if (!envelope.answers) envelope.answers = {};
  envelope.answers[id] = answer;
  return envelope;
}

function selfGuest(g, fid) {
  const ids = g.def.emperorIds;
  if (!ids || ids.indexOf(fid) === -1) return null;
  if (!EngineRef.guestProtectionStatus) return null;
  return EngineRef.guestProtectionStatus(g, fid);
}

function projectPerception(g, fid) {
  const rules = rulesOf(g);
  ensureIntelLog(g);
  const f = g.state.factions[fid];
  const F = g.def.F[fid];
  const owned = g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === fid);
  const owners = {}, neighbors = {}, strategic = {}, cities = {}, publicLabels = {};
  for (const pid of g.def.provinceIds) {
    owners[pid] = g.state.provinces[pid].owner;
    neighbors[pid] = g.def.P[pid].neighbors.slice();
    strategic[pid] = !!g.def.P[pid].strategic;
    cities[pid] = g.def.P[pid].city;
  }
  for (const id of g.def.order) publicLabels[id] = publicLabel(g, fid, id, rules);

  const others = {};
  for (const id of g.def.order) {
    if (id === fid) continue;
    const of = g.state.factions[id];
    const adj = adjacentFactions(g, fid, id);
    const seen = ((g.state.intelLog.lastSeen[fid] || {})[id]) || null;
    let troopBand = 'unknown', lastAction = null, lastSeenTurn = null;
    if (adj && of && of.alive) {
      troopBand = bandOf(of.troops, rules);
      lastAction = seen ? seen.action : null;
      lastSeenTurn = seen ? seen.turn : null;
    } else if (seen) {
      troopBand = seen.troopBand || bandOf(seen.troops, rules);
      lastAction = seen.action || null;
      lastSeenTurn = seen.turn;
    }
    others[id] = {
      publicLabel: publicLabels[id],
      claimedIdentity: claimedIdentity(g, id),
      alive: !!(of && of.alive),
      troopBand,
      lastAction,
      lastSeenTurn,
      adjacent: adj,
      provinces: g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === id).length,
    };
  }

  const mine = new Set(owned);
  const frontier = [];
  for (const pid of owned) for (const n of g.def.P[pid].neighbors) if (!mine.has(n)) frontier.push(n);
  const attackTargets = Array.from(new Set(frontier)).filter((pid) => {
    const owner = g.state.provinces[pid].owner;
    if (owner === fid) return false;
    return !(EngineRef.guestProtected && EngineRef.guestProtected(g, fid, owner));
  });
  const R = g.def.rules;

  return {
    v: 1,
    fid,
    turn: g.state.turn,
    calendar: EngineRef.calendar(g, g.state.turn),
    self: {
      troops: f.troops, grain: f.grain, loyalty: f.loyalty, prestige: f.prestige,
      seat: f.seat, provinces: owned.slice(), pacts: Object.assign({}, f.pacts),
      last: f.last ? { action: f.last.action, target: f.last.target } : null,
      grudge: f.grudge ? { fid: f.grudge.fid, turn: f.grudge.turn } : null,
      weights: Object.assign({}, F.weights), traits: Object.assign({}, F.traits),
      name: F.persona.name, short: F.persona.short, quotes: F.persona.quotes,
      homeCity: g.def.P[f.seat].city,
      guestProtection: selfGuest(g, fid),
    },
    world: { owners, neighbors, strategic, emperorAt: g.state.emperorAt, cities, publicLabels, pacts: activePactEdges(g) },
    others,
    diplomaticPressure: diplomaticPressure(g, fid),
    legal: {
      actions: Object.keys(EngineRef.ACTIONS),
      attackTargets,
      annexTargets: attackTargets.filter((pid) => g.state.provinces[pid].owner === 'neutral'),
      pactTargets: g.def.order.filter((id) => id !== fid && g.state.factions[id].alive && !(f.pacts[id] && f.pacts[id] >= g.state.turn)),
      fortifyTargets: owned.slice(),
    },
    prior: priorFor(g, fid, rules),
    provinceIntel: buildProvinceIntel(g, fid, rules),
    rules: {
      lateWarTurn: R.lateWarTurn, pactMax: R.pact.max, pactTurns: R.pact.turns,
      coalitionAt: R.coalitionAt, fortMax: R.combat.fortMax,
      commitBase: R.combat.commitBase, commitAggression: R.combat.commitAggression,
    },
  };
}

function ctxRand(rng) {
  rng.seed = (rng.seed + 0x6d2b79f5) >>> 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ctxPick = (rng, arr) => arr[Math.floor(ctxRand(rng) * arr.length)];
function ctxWeighted(rng, weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = ctxRand(rng) * total;
  for (const [k, w] of entries) {
    roll -= w;
    if (roll <= 0) return k;
  }
  return entries[entries.length - 1][0];
}
function estimatedTroops(ctx, fid) {
  if (fid === ctx.fid) return ctx.self.troops;
  const o = ctx.others[fid];
  if (!o || !o.alive) return 0;
  return bandValue(o.troopBand);
}
function hasPactCtx(ctx, other) {
  return !!(ctx.self.pacts[other] && ctx.self.pacts[other] >= ctx.turn);
}
function leaderOfContext(ctx) {
  const counts = {};
  for (const pid of Object.keys(ctx.world.owners)) {
    const o = ctx.world.owners[pid];
    if (o && o !== 'neutral') counts[o] = (counts[o] || 0) + 1;
  }
  let top = null;
  let n = (ctx.rules.coalitionAt || 4) - 1;
  for (const id of Object.keys(counts)) {
    if (counts[id] > n) { n = counts[id]; top = id; }
  }
  return top;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function decideFromContext(ctx, rng) {
  if (!rng || !Number.isFinite(rng.seed)) throw new Error('decide requires a private rng {seed}, not DecisionContext.seed');
  if (Object.prototype.hasOwnProperty.call(ctx, 'seed')) throw new Error('DecisionContext must not include seed');
  const ACTIONS = EngineRef.ACTIONS;
  const STRATAGEMS = EngineRef.STRATAGEMS || ['discord', 'burn', 'defect'];
  const fid = ctx.fid;
  const T = ctx.self.traits;
  const f = ctx.self;
  const R = ctx.rules;
  const w = Object.assign({}, f.weights);
  const late = ctx.turn > R.lateWarTurn;
  const leader = leaderOfContext(ctx);
  const minRatio = late ? 0.7 : 0.8;
  const moraleMul = 0.75 + (0.5 * f.loyalty) / 100;
  let best = null;
  for (const pid of ctx.legal.attackTargets) {
    const owner = ctx.world.owners[pid];
    const pact = owner !== 'neutral' && hasPactCtx(ctx, owner);
    if (pact && !(T.betrayal && ctxRand(rng) < T.betrayal)) continue;
    const commit = f.troops * clamp((R.commitBase || 0.45) + (R.commitAggression || 0.2) * (T.aggression || 0.5), 0.3, 0.8);
    const atkPower = commit * (T.attack || 1) * moraleMul;
    const intel = ctx.provinceIntel && ctx.provinceIntel[pid];
    const ownerN = owner === 'neutral' ? 1 : Math.max(1, (ctx.others[owner] && ctx.others[owner].provinces) || 1);
    const defPool = intel && intel.troopBand && intel.troopBand !== 'unknown'
      ? bandValue(intel.troopBand)
      : (owner === 'neutral' ? bandValue('weak') : estimatedTroops(ctx, owner) / ownerN);
    const ratio = atkPower / Math.max(1, defPool);
    let score = ratio * (owner === 'neutral' ? 1.25 : 1) * (ctx.world.strategic[pid] ? 1.15 : 1) * (ctx.world.emperorAt === pid ? 1.2 : 1);
    if (T.vengeance && f.grudge && owner === f.grudge.fid && ctx.turn - f.grudge.turn <= 3) score *= 3;
    if (leader && leader !== fid && owner === leader) score *= 1.4;
    if (ctx.prior && ctx.prior.status === 'active' && (ctx.prior.focus || []).indexOf(pid) !== -1) {
      score *= (ctx.prior.bias && ctx.prior.bias.attack) || 1.35;
    }
    if (owner !== 'neutral' && ctx.diplomaticPressure && ctx.diplomaticPressure[owner] === 'high') score *= 1.08;
    if (!best || score > best.score) best = { pid, ratio, score, betray: pact };
  }
  if (!best || best.ratio < minRatio) w.attack = 0;
  else if (best.ratio < 1) w.attack *= 0.3;
  else if (best.ratio > 2.2) w.attack *= 4;
  else if (best.ratio > 1.5) w.attack *= 2.5;
  if (late) w.attack *= 1.4;
  if (best && leader && leader !== fid && ctx.world.owners[best.pid] === leader) w.attack *= 1.2;
  const upkeepEst = f.troops * 0.3 * (T.upkeep || 1);
  if (f.grain < upkeepEst * 3) w.internal *= 2.2;
  if (f.loyalty < 45) w.internal *= 1.8;
  let threatFid = null, threatRatio = 0;
  for (const id of Object.keys(ctx.others)) {
    const o = ctx.others[id];
    if (!o.alive || !o.adjacent || hasPactCtx(ctx, id)) continue;
    const r = estimatedTroops(ctx, id) / Math.max(1, f.troops);
    if (r > threatRatio) { threatRatio = r; threatFid = id; }
  }
  if (threatRatio > 1.2) { w.fortify *= 1.8; w.diplomacy *= 1.4; w.stratagem *= 1.3; }
  let pressureHigh = false;
  let pressureWatch = false;
  for (const id of Object.keys(ctx.diplomaticPressure || {})) {
    if (ctx.diplomaticPressure[id] === 'high') pressureHigh = true;
    else if (ctx.diplomaticPressure[id] === 'watch') pressureWatch = true;
  }
  if (pressureHigh) { w.fortify *= 1.12; w.diplomacy *= 1.08; w.stratagem *= 1.08; }
  else if (pressureWatch) w.fortify *= 1.05;
  const myPacts = Object.keys(f.pacts).filter((o) => hasPactCtx(ctx, o)).length;
  const neutralAdj = ctx.legal.annexTargets;
  const others = ctx.legal.pactTargets.filter((id) => ctx.others[id] && ctx.others[id].alive);
  if (myPacts >= R.pactMax && !neutralAdj.length) w.diplomacy = 0;
  if (neutralAdj.length && f.prestige > 70) w.diplomacy *= 1.3;
  if (!others.length && !neutralAdj.length) w.diplomacy = 0;
  const rival = threatFid || others.slice().sort((a, b) => estimatedTroops(ctx, b) - estimatedTroops(ctx, a))[0] || null;
  if (!rival) w.stratagem = 0;
  const action = ctxWeighted(rng, w);
  const d = { fid, action, label: ACTIONS[action].label, icon: ACTIONS[action].icon, sub: null, target: null, targetKind: null, from: null, betray: false };
  if (action === 'attack') {
    d.target = best.pid;
    d.targetKind = 'province';
    const adjFrom = (ctx.world.neighbors[best.pid] || []).filter((n) => ctx.world.owners[n] === fid);
    d.from = adjFrom.indexOf(f.seat) !== -1 ? f.seat : adjFrom[0] || null;
    d.betray = best.betray;
  } else if (action === 'diplomacy') {
    if (neutralAdj.length && (ctxRand(rng) < 0.5 || !others.length)) {
      d.sub = 'annex'; d.target = ctxPick(rng, neutralAdj); d.targetKind = 'province';
    } else {
      const adjF = new Set(ctx.legal.attackTargets.map((pid) => ctx.world.owners[pid]).filter((o) => o !== 'neutral' && !hasPactCtx(ctx, o)));
      const pool = others.filter((id) => adjF.has(id));
      d.sub = 'pact';
      d.target = (pool.length ? pool : others).slice().sort((a, b) => estimatedTroops(ctx, b) - estimatedTroops(ctx, a))[0];
      d.targetKind = 'faction';
    }
  } else if (action === 'stratagem') {
    d.sub = ctxPick(rng, STRATAGEMS);
    d.target = rival;
    d.targetKind = 'faction';
  } else if (action === 'fortify') {
    let target = f.seat, worst = -1;
    for (const pid of ctx.legal.fortifyTargets) {
      let pressure = 0;
      for (const n of ctx.world.neighbors[pid] || []) {
        const o = ctx.world.owners[n];
        if (o !== 'neutral' && o !== fid && !hasPactCtx(ctx, o)) pressure += estimatedTroops(ctx, o);
      }
      if (pressure > worst) { worst = pressure; target = pid; }
    }
    d.target = target; d.targetKind = 'province';
  } else {
    d.target = f.seat; d.targetKind = 'province';
  }
  const targetName = d.targetKind === 'faction'
    ? ((ctx.others[d.target] && ctx.others[d.target].publicLabel) || d.target)
    : ((ctx.world.cities && ctx.world.cities[d.target]) || d.target);
  d.targetName = targetName;
  const quotes = f.quotes[action];
  d.quote = ctxPick(rng, quotes).replace(/\{t\}/g, targetName || f.homeCity).replace(/\{home\}/g, f.homeCity);
  return d;
}

function ownersSnapshot(g) {
  const owners = {};
  for (const pid of g.def.provinceIds) owners[pid] = g.state.provinces[pid].owner;
  return { owners, turn: g.state.turn };
}

function labelOf(g, observer, fid, rules) {
  if (!fid || fid === 'neutral') return 'Trung lập';
  return publicLabel(g, observer, fid, rules);
}

const PUBLIC_GATES = { opening: true, guest_arrival: true };

function newsKey(n) {
  return [n.kind, n.id || '', n.prov || '', n.actorId || '', n.otherId || '', n.ownerId || '', n.textKey || ''].join('|');
}

function defenderOfEvent(ev) {
  return ev.defenderFid || ev.defender || null;
}

function observeBattle(g, observer, ev, rules) {
  const defender = defenderOfEvent(ev);
  const attacker = ev.fid;
  const truce = ev.code === 'guest_truce';
  if (attacker === observer) {
    const visible = {
      kind: truce ? 'guest_truce' : 'attack',
      role: 'attacker',
      actorId: observer,
      actorLabel: labelOf(g, observer, observer, rules),
      to: ev.to || null,
      titleKey: truce ? 'guest_truce' : 'own_attack',
      textKey: truce ? 'guest_truce' : (ev.win ? 'own_attack_win' : 'own_attack_loss'),
    };
    if (ev.from) visible.from = ev.from;
    if (defender && defender !== 'neutral') {
      visible.otherId = defender;
      visible.otherLabel = labelOf(g, observer, defender, rules);
    } else {
      visible.otherLabel = 'Trung lập';
    }
    if (truce) visible.outcome = 'fail';
    else {
      visible.outcome = ev.win ? 'win' : 'loss';
      if (ev.attLoss != null) visible.ownLoss = ev.attLoss;
    }
    return { visible };
  }
  if (defender === observer) {
    const visible = {
      kind: truce ? 'guest_truce' : 'attack',
      role: 'defender',
      actorId: attacker || null,
      actorLabel: attacker ? labelOf(g, observer, attacker, rules) : null,
      otherId: observer,
      otherLabel: labelOf(g, observer, observer, rules),
      to: ev.to || null,
      titleKey: truce ? 'guest_truce' : 'province_attacked',
      textKey: truce ? 'guest_truce' : 'province_attacked',
    };
    if (truce) visible.outcome = 'ok';
    else {
      visible.outcome = ev.win ? 'loss' : 'win';
      if (ev.defLoss != null) visible.ownLoss = ev.defLoss;
    }
    return { visible };
  }
  return {};
}

function observePact(g, observer, ev, rules) {
  const accepted = !!ev.ok;
  const news = [];
  if (accepted) {
    news.push({
      kind: 'pact',
      actorId: ev.fid || null,
      actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
      otherId: ev.other || null,
      otherLabel: ev.other ? labelOf(g, observer, ev.other, rules) : null,
      untilTurn: ev.until != null ? ev.until : null,
      accepted: true,
      titleKey: 'pact_public',
      textKey: 'pact_public',
    });
  }
  const party = ev.fid === observer || ev.other === observer;
  if (!party) return news.length ? { news } : {};
  const visible = {
    kind: 'pact',
    role: ev.fid === observer ? 'self' : 'target',
    actorId: ev.fid || null,
    actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
    otherId: ev.other || null,
    otherLabel: ev.other ? labelOf(g, observer, ev.other, rules) : null,
    outcome: accepted ? 'ok' : 'fail',
    titleKey: accepted ? 'pact_signed' : 'pact_refused',
    textKey: accepted ? 'pact_signed' : 'pact_refused',
  };
  if (ev.until != null) visible.untilTurn = ev.until;
  return { visible, news };
}

function touchesObserver(observer, ev) {
  if (!observer) return false;
  return ev.fid === observer || ev.other === observer || ev.by === observer
    || ev.defenderFid === observer || ev.defender === observer;
}

function classifyObservation(g, observer, ev, rules) {
  const kind = ev.kind;
  if (kind === 'gate') {
    if (PUBLIC_GATES[ev.id]) {
      return { news: [{ kind: 'gate', id: ev.id, titleKey: 'gate_' + ev.id, textKey: 'gate_' + ev.id }] };
    }
    return {};
  }
  if (kind === 'attack' || (kind === 'event' && ev.code === 'guest_truce')) return observeBattle(g, observer, ev, rules);
  if (kind === 'pact' || (typeof kind === 'string' && kind.indexOf('deal_') === 0)) return observePact(g, observer, ev, rules);
  if (kind === 'fall' || kind === 'realm_fall') {
    return { news: [{
      kind: 'fall',
      actorId: ev.fid || null,
      actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
      titleKey: 'faction_destroyed',
      textKey: 'faction_destroyed',
    }] };
  }
  if (kind === 'succession') {
    return { news: [{
      kind: 'succession',
      actorId: ev.fid || null,
      actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
      titleKey: 'succession',
      textKey: 'succession',
    }] };
  }
  if (kind === 'win') {
    return { news: [{
      kind: 'win',
      actorId: ev.fid || null,
      actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
      titleKey: 'win',
      textKey: 'win',
    }] };
  }
  if (!touchesObserver(observer, ev)) return {};
  const visible = {
    kind,
    role: ev.other === observer && ev.fid !== observer ? 'target' : 'self',
    actorId: ev.fid || null,
    actorLabel: ev.fid ? labelOf(g, observer, ev.fid, rules) : null,
    titleKey: (ev.fid === observer ? 'own_' : 'target_') + kind,
    textKey: (ev.fid === observer ? 'own_' : 'target_') + kind,
  };
  if (ev.other) {
    visible.otherId = ev.other;
    visible.otherLabel = labelOf(g, observer, ev.other, rules);
  }
  if (ev.prov) visible.prov = ev.prov;
  if (ev.sub) visible.sub = ev.sub;
  if (ev.ok != null) visible.outcome = ev.ok ? 'ok' : 'fail';
  if (ev.code) visible.code = ev.code;
  return { visible };
}

function projectTurnObservation(g, observer, turnResult, beforeSnapshot) {
  const rules = rulesOf(g);
  const events = (turnResult && turnResult.events) || [];
  const visibleEvents = [];
  const publicNews = [];
  const seen = new Set();
  const pushNews = (n) => {
    const k = newsKey(n);
    if (seen.has(k)) return;
    seen.add(k);
    publicNews.push(n);
  };
  for (const ev of events) {
    const part = classifyObservation(g, observer, ev, rules);
    if (part.visible) visibleEvents.push(part.visible);
    if (part.news) for (const n of part.news) pushNews(n);
  }
  const before = beforeSnapshot && beforeSnapshot.owners;
  if (before) {
    for (const pid of g.def.provinceIds) {
      const prev = before[pid];
      const now = g.state.provinces[pid].owner;
      if (prev != null && prev !== now) {
        pushNews({
          kind: 'ownership',
          prov: pid,
          city: g.def.P[pid].city,
          ownerId: now === 'neutral' ? null : now,
          ownerLabel: labelOf(g, observer, now, rules),
          titleKey: 'ownership_changed',
          textKey: 'ownership_changed',
        });
      }
    }
  }
  return { visibleEvents, publicNews };
}

function collectContexts(g, order) {
  observeFactions(g);
  const ids = order || EngineRef.aliveIds(g);
  return ids.map((fid) => projectPerception(g, fid));
}

function attach(Engine) {
  EngineRef = Engine;
  Engine.bandOf = function (troops, rules) { return bandOf(troops, rules || DEFAULT_RULES); };
  Engine.bandValue = bandValue;
  Engine.observeFactions = observeFactions;
  Engine.observeProvinces = observeProvinces;
  Engine.ownersSnapshot = ownersSnapshot;
  Engine.projectTurnObservation = projectTurnObservation;
  Engine.pendingReactions = pendingReactions;
  Engine.turnEnvelope = turnEnvelope;
  Engine.answerReaction = answerReaction;
  Engine.projectPerception = function (g, fid) { return projectPerception(g, fid); };
  Engine.collectContexts = collectContexts;
  Engine.decideFromContext = decideFromContext;
  Engine.INTEL_DEFAULTS = DEFAULT_RULES;
  if (!Engine.STRATAGEMS) Engine.STRATAGEMS = ['discord', 'burn', 'defect'];

  const legacyDecide = Engine.decide;
  Engine.decideLegacy = function (g, fid) { return legacyDecide(g, fid); };

  const createGame = Engine.createGame;
  Engine.createGame = function (world, personas, seed) {
    const g = createGame(world, personas, seed);
    if (world.intelRules) g.def.intelRules = world.intelRules;
    if (Engine.matchPred) g.def.matchPred = Engine.matchPred;
    ensureIntelLog(g);
    return g;
  };

  const restoreGame = Engine.restoreGame;
  Engine.restoreGame = function (world, personas, state) {
    const g = restoreGame(world, personas, state);
    if (world.intelRules) g.def.intelRules = world.intelRules;
    if (Engine.matchPred) g.def.matchPred = Engine.matchPred;
    ensureIntelLog(g);
    return g;
  };

  Engine.decide = function (context, rng) {
    if (context && context.def && context.state) {
      throw new Error('decide() no longer accepts the full game; use projectPerception(game, fid) first');
    }
    if (!context || context.v !== 1 || !context.self) {
      throw new Error('decide() requires a DecisionContext from projectPerception(game, fid)');
    }
    if (Object.prototype.hasOwnProperty.call(context, 'bandValues')) {
      throw new Error('DecisionContext must not include bandValues');
    }
    if (Object.prototype.hasOwnProperty.call(context, 'seed')) {
      throw new Error('DecisionContext must not include seed');
    }
    return decideFromContext(context, rng);
  };

  function commitDecisions(g, ids, contexts, playerFid, playerDecision) {
    const decisions = ids.map((id, i) => {
      if (id === playerFid && playerDecision) {
        const d = Object.assign({}, playerDecision, { fid: playerFid });
        if (!d.label && Engine.ACTIONS[d.action]) {
          d.label = Engine.ACTIONS[d.action].label;
          d.icon = Engine.ACTIONS[d.action].icon;
        }
        return d;
      }
      return decideFromContext(contexts[i], g.state);
    });
    for (const d of decisions) g.state.factions[d.fid].last = d;
    return decisions;
  }

  Engine.decideAll = function (g) {
    const ids = Engine.aliveIds(g);
    const contexts = collectContexts(g, ids);
    return commitDecisions(g, ids, contexts, null, null);
  };

  const resolveTurn = Engine.resolveTurn;
  Engine.resolveTurn = function (g, decisions) {
    const result = resolveTurn(g, decisions);
    if (result && result.blocked) return result;
    const seenTurn = result && result.turn != null ? result.turn : g.state.turn;
    observeFactions(g, seenTurn);
    return result;
  };

  Engine.fillDecisions = function (g, playerFid, playerDecision) {
    const ids = Engine.aliveIds(g);
    const contexts = collectContexts(g, ids);
    return commitDecisions(g, ids, contexts, playerFid, playerDecision);
  };

  Engine.preparePlayerTurn = function (g, playerFid, playerDecision) {
    return turnEnvelope(g, playerFid, Engine.fillDecisions(g, playerFid, playerDecision));
  };

  Engine.resolvePrepared = function (g, envelope) {
    if (!envelope || envelope.v !== 1 || !Array.isArray(envelope.decisions)) {
      throw new Error('resolvePrepared requires a turn envelope');
    }
    if (envelope.turn !== g.state.turn) throw new Error('stale turn envelope');
    if (!envelope.playerFid || !g.state.factions[envelope.playerFid]) {
      throw new Error('turn envelope has no player faction');
    }
    const split = splitPlayerOffers(g, envelope.playerFid, envelope.decisions);
    const answers = envelope.answers || {};
    const pending = split.pendingReactions.filter((r) => answers[r.id] !== 'accept' && answers[r.id] !== 'reject');
    if (pending.length) {
      return { turn: g.state.turn, blocked: true, pendingReactions: pending, events: [], deltas: [], winner: g.state.winner || null };
    }
    const managed = {};
    const kept = {};
    for (const r of split.pendingReactions) {
      managed[r.id] = true;
      kept[r.id] = answers[r.id];
    }
    const declined = {};
    for (const r of split.declinedOffers) declined[r.id] = r.reason || 'pact_full';
    g._reaction = { playerFid: envelope.playerFid, answers: kept, managed, declined };
    try {
      return Engine.resolveTurn(g, envelope.decisions);
    } finally {
      delete g._reaction;
    }
  };

  Engine.playTurn = function (g) {
    return Engine.resolveTurn(g, Engine.decideAll(g));
  };

  return Engine;
}

if (typeof module === 'object' && module.exports) module.exports = attach;
else {
  var root = typeof self !== 'undefined' ? self : this;
  root.EmperorsPerception = attach;
  if (root.EmperorsEngine) root.EmperorsEngine = attach(root.EmperorsEngine);
}
