/* Perception layer: truth → DecisionContext. Attach onto the UMD engine.
 * projectPerception is pure. Observations update once per turn, before any decision.
 * DecisionContext has no RNG seed and no bandValues.
 */
'use strict';

const DEFAULT_RULES = {
  bands: { weakMax: 25000, mediumMax: 45000, strongMax: 90000 },
  aliases: {},
  knownByDefault: ['cao_cao', 'liu_bei', 'sun_quan'],
  prior: {
    id: 'wu_jing_pressure',
    holders: ['li_shimin', 'zhu_yuanzhang'],
    when: { alive: ['guan_yu'], owner: { jing_nan: 'liu_bei', jiang: 'sun_quan' } },
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
  if (!g.state.intelLog) g.state.intelLog = { lastSeen: {}, claims: {} };
  if (!g.state.intelLog.lastSeen) g.state.intelLog.lastSeen = {};
  if (!g.state.intelLog.claims) g.state.intelLog.claims = {};
  return g.state.intelLog;
}

function observeFactions(g) {
  const log = ensureIntelLog(g);
  const turn = g.state.turn;
  const ids = (g.def.order || []).filter((id) => g.state.factions[id] && g.state.factions[id].alive);
  for (const obs of ids) {
    if (!log.lastSeen[obs]) log.lastSeen[obs] = {};
    for (const other of ids) {
      if (other === obs) continue;
      if (!adjacentFactions(g, obs, other)) continue;
      const f = g.state.factions[other];
      log.lastSeen[obs][other] = {
        troops: f.troops,
        action: (f.last && f.last.action) || null,
        turn,
        province: f.seat,
      };
    }
  }
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
      troopBand = bandOf(seen.troops, rules);
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
  const attackTargets = Array.from(new Set(frontier)).filter((pid) => g.state.provinces[pid].owner !== fid);
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
    },
    world: { owners, neighbors, strategic, emperorAt: g.state.emperorAt, cities, publicLabels },
    others,
    legal: {
      actions: Object.keys(EngineRef.ACTIONS),
      attackTargets,
      annexTargets: attackTargets.filter((pid) => g.state.provinces[pid].owner === 'neutral'),
      pactTargets: g.def.order.filter((id) => id !== fid && g.state.factions[id].alive && !(f.pacts[id] && f.pacts[id] >= g.state.turn)),
      fortifyTargets: owned.slice(),
    },
    prior: priorFor(g, fid, rules),
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
    const ownerN = owner === 'neutral' ? 1 : Math.max(1, (ctx.others[owner] && ctx.others[owner].provinces) || 1);
    const defPool = owner === 'neutral' ? bandValue('weak') : estimatedTroops(ctx, owner) / ownerN;
    const ratio = atkPower / Math.max(1, defPool);
    let score = ratio * (owner === 'neutral' ? 1.25 : 1) * (ctx.world.strategic[pid] ? 1.15 : 1) * (ctx.world.emperorAt === pid ? 1.2 : 1);
    if (T.vengeance && f.grudge && owner === f.grudge.fid && ctx.turn - f.grudge.turn <= 3) score *= 3;
    if (leader && leader !== fid && owner === leader) score *= 1.4;
    if (ctx.prior && ctx.prior.status === 'active' && (ctx.prior.focus || []).indexOf(pid) !== -1) {
      score *= (ctx.prior.bias && ctx.prior.bias.attack) || 1.35;
    }
    if (!best || score > best.score) best = { pid, ratio, score, betray: pact };
  }
  if (!best || best.ratio < minRatio) w.attack = 0;
  else if (best.ratio < 1) w.attack *= 0.3;
  else if (best.ratio > 2.2) w.attack *= 4;
  else if (best.ratio > 1.5) w.attack *= 2.5;
  if (late) w.attack *= 1.4;
  if (best && leader && leader !== fid && ctx.world.owners[best.pid] === leader) w.attack *= 1.2;
  if (ctx.prior && ctx.prior.status === 'active' && ctx.prior.bias && ctx.prior.bias.attack) w.attack *= ctx.prior.bias.attack;
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
    observeFactions(g);
    return result;
  };

  Engine.fillDecisions = function (g, playerFid, playerDecision) {
    const ids = Engine.aliveIds(g);
    const contexts = collectContexts(g, ids);
    return commitDecisions(g, ids, contexts, playerFid, playerDecision);
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
