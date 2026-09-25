/* Perception layer: truth → DecisionContext. Attach onto the UMD engine. */
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
  observeFactions(g);
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
      lastAction = (of.last && of.last.action) || (seen && seen.action) || null;
      lastSeenTurn = g.state.turn;
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
    seed: g.state.seed,
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

function attach(Engine) {
  EngineRef = Engine;
  Engine.bandOf = function (troops, rules) { return bandOf(troops, rules || DEFAULT_RULES); };
  Engine.observeFactions = observeFactions;
  Engine.projectPerception = function (g, fid) { return projectPerception(g, fid); };
  Engine.INTEL_DEFAULTS = DEFAULT_RULES;

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

  const decideCtx = Engine.decideFromContext || function (ctx) { return Engine.decide(ctx); };

  Engine.decide = function (context) {
    if (context && context.def && context.state) {
      throw new Error('decide() no longer accepts the full game; use projectPerception(game, fid) first');
    }
    if (!context || context.v !== 1 || !context.self) {
      throw new Error('decide() requires a DecisionContext from projectPerception(game, fid)');
    }
    if (Object.prototype.hasOwnProperty.call(context, 'bandValues')) {
      throw new Error('DecisionContext must not include bandValues');
    }
    return decideCtx(context);
  };

  Engine.decideAll = function (g) {
    return Engine.aliveIds(g).map((fid) => {
      const ctx = Engine.projectPerception(g, fid);
      const d = decideCtx(ctx);
      g.state.seed = ctx.seed;
      g.state.factions[fid].last = d;
      return d;
    });
  };

  const resolveTurn = Engine.resolveTurn;
  Engine.resolveTurn = function (g, decisions) {
    const result = resolveTurn(g, decisions);
    observeFactions(g);
    return result;
  };

  Engine.fillDecisions = function (g, playerFid, playerDecision) {
    return Engine.aliveIds(g).map((id) => {
      if (id === playerFid && playerDecision) {
        const d = Object.assign({}, playerDecision, { fid: playerFid });
        if (!d.label && Engine.ACTIONS[d.action]) {
          d.label = Engine.ACTIONS[d.action].label;
          d.icon = Engine.ACTIONS[d.action].icon;
        }
        g.state.factions[id].last = d;
        return d;
      }
      const ctx = Engine.projectPerception(g, id);
      const d = decideCtx(ctx);
      g.state.seed = ctx.seed;
      g.state.factions[id].last = d;
      return d;
    });
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
