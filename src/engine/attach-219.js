/* Attach 219 gates + RuntimeEvent v1 onto the UMD engine without replacing it. */
'use strict';

const RUNTIME_VERSION = 1;
const MAX_TENSION_GATES_PER_TURN = 1;
const DEAL_CLAUSES = ['truce', 'alliance', 'joint_war', 'grain', 'passage', 'withdraw', 'recognize', 'break'];
const EVENT_KINDS = [
  'attack', 'pact', 'deal_accept', 'deal_counter', 'deal_refuse', 'deal_break',
  'annex', 'internal', 'fortify', 'stratagem', 'revolt', 'event', 'gate',
  'succession', 'realm_fall', 'fall', 'win',
];
const NEUTRAL = 'neutral';

function isEmperor(g, fid) {
  return (g.def.emperorIds || []).indexOf(fid) !== -1;
}

function owned(g, fid) {
  return g.def.provinceIds.filter((pid) => g.state.provinces[pid].owner === fid);
}

function charAlive(g, cid) {
  if (!cid) return false;
  if ((g.state.deadChars || []).indexOf(cid) !== -1) return false;
  const gov = g.state.governors || {};
  for (const pid of Object.keys(gov)) if (gov[pid] === cid) return true;
  return ((g.def.charactersPack && g.def.charactersPack.heirsOffMap) || []).indexOf(cid) !== -1;
}

function governorOf(g, pid) {
  return (g.state.governors || {})[pid] || null;
}

function guestProtected(g, attacker, owner) {
  const until = (g.def.rules && g.def.rules.guestTruceTurns) || 0;
  if (!until || g.state.turn > until) return false;
  if (!isEmperor(g, owner) || isEmperor(g, attacker)) return false;
  if (owned(g, owner).length !== 1) return false;
  return !((g.state.guestBroken || {})[owner] || {})[attacker];
}

function matchPred(g, pred) {
  if (!pred || typeof pred !== 'object') return true;
  if (pred.or) return Array.isArray(pred.or) && pred.or.some((p) => matchPred(g, p));
  if (pred.and) return Array.isArray(pred.and) && pred.and.every((p) => matchPred(g, p));
  for (const k of Object.keys(pred).filter((x) => x !== 'or' && x !== 'and')) {
    const v = pred[k];
    if (k === 'turn') { if (g.state.turn !== v) return false; }
    else if (k === 'turnLte') { if (g.state.turn > v) return false; }
    else if (k === 'turnGte') { if (g.state.turn < v) return false; }
    else if (k === 'owner') {
      for (const pid of Object.keys(v)) {
        if (!g.state.provinces[pid] || g.state.provinces[pid].owner !== v[pid]) return false;
      }
    } else if (k === 'ownerNot') {
      for (const pid of Object.keys(v)) {
        if (g.state.provinces[pid] && g.state.provinces[pid].owner === v[pid]) return false;
      }
    } else if (k === 'alive') {
      const list = Array.isArray(v) ? v : [v];
      if (!list.every((cid) => charAlive(g, cid))) return false;
    } else if (k === 'emperorProvincesGte') {
      if (!(g.def.emperorIds || []).some((id) => g.state.factions[id] && g.state.factions[id].alive && owned(g, id).length >= v)) return false;
    } else if (k === 'emperorOwnsAny') {
      const ids = Array.isArray(v) ? v : [v];
      if (!ids.some((pid) => g.state.provinces[pid] && isEmperor(g, g.state.provinces[pid].owner))) return false;
    } else if (k === 'qinAttackedCao') {
      if (!!g.state.qinAttackedCao !== !!v) return false;
    } else return false;
  }
  return true;
}

function gatePhase(gate) {
  if (gate.phase) return gate.phase;
  if (gate.id === 'opening' || gate.id === 'guest_arrival') return 'intro';
  return 'post_turn';
}

function gatePriority(gate) {
  if (typeof gate.priority === 'number') return gate.priority;
  const order = { opening: 0, guest_arrival: 1, fan_xiang_stalemate: 10, hanzhong_pressure: 20, wu_looks_at_jing: 30, huai_scavenge: 40, ye_exposed: 50, chang_an_gate: 60, coalition_hegemon: 90 };
  return order[gate.id] != null ? order[gate.id] : 50;
}

function emitGate(g, gate, events) {
  if (!g.state.firedGates) g.state.firedGates = [];
  if (g.state.firedGates.indexOf(gate.id) !== -1) return false;
  g.state.firedGates.push(gate.id);
  const emit = gate.emit || {};
  events.push({ kind: 'gate', id: gate.id, fid: null, actors: gate.actors || [], shot: gate.shot || null, tone: 'neutral', text: emit.text || gate.id });
  return true;
}

function scheduleGates(g, events, phase) {
  const pack = g.def.gatesPack;
  if (!pack || !pack.gates) return;
  const pending = pack.gates
    .filter((gate) => gatePhase(gate) === phase)
    .filter((gate) => (g.state.firedGates || []).indexOf(gate.id) === -1)
    .filter((gate) => matchPred(g, gate.when))
    .sort((a, b) => gatePriority(a) - gatePriority(b) || String(a.id).localeCompare(b.id));
  if (phase === 'intro') {
    pending.forEach((gate) => emitGate(g, gate, events));
    return;
  }
  let n = 0;
  for (const gate of pending) {
    if (n >= MAX_TENSION_GATES_PER_TURN) break;
    if (emitGate(g, gate, events)) n += 1;
  }
}

function normalizeEvent(g, raw) {
  if (raw && raw.v === RUNTIME_VERSION && raw.defender === undefined) return raw;
  const ev = { v: RUNTIME_VERSION, kind: raw.kind, text: raw.text || '', tone: raw.tone || 'neutral' };
  if (raw.id) ev.id = raw.id;
  if (raw.fid != null) ev.fid = raw.fid;
  if (raw.ok != null) ev.ok = raw.ok;
  if (raw.clauses) ev.clauses = raw.clauses;
  if (raw.shot) ev.shot = raw.shot;
  if (raw.actors) ev.actors = raw.actors;
  if (raw.by) ev.by = raw.by;
  if (raw.killers) ev.killers = raw.killers;
  if (raw.shares) ev.shares = raw.shares;
  if (raw.level != null) ev.level = raw.level;
  if (raw.attLoss != null) ev.attLoss = raw.attLoss;
  if (raw.defLoss != null) ev.defLoss = raw.defLoss;
  if (raw.from) ev.from = raw.from;
  if (raw.to) ev.to = raw.to;
  if (raw.prov) ev.prov = raw.prov;
  if (raw.other) ev.other = raw.other;
  if (raw.win != null) ev.win = raw.win;
  if (raw.kind === 'attack') {
    ev.from = raw.from;
    ev.to = raw.to;
    ev.win = raw.win;
    ev.defenderFid = raw.defenderFid || raw.defender || NEUTRAL;
    ev.defenderChar = raw.defenderChar || governorOf(g, raw.to);
    ev.actorChar = raw.actorChar || governorOf(g, raw.from);
    ev.other = ev.defenderFid;
  } else if (raw.kind === 'pact' || String(raw.kind).indexOf('deal_') === 0) {
    ev.other = raw.other;
    ev.clauses = raw.clauses || (raw.kind === 'pact' ? ['truce'] : raw.clauses);
  }
  return ev;
}

function enrichDef(g) {
  const world = g.def.world;
  if (!g.def.gatesPack) g.def.gatesPack = world.gatesPack || { gates: [] };
  if (!g.def.charactersPack) g.def.charactersPack = world.charactersPack || { governors: {}, succession: { emperors: {}, threeKingdoms: {} } };
  if (!g.def.emperorIds) g.def.emperorIds = world.factions.filter((f) => f.type === 'time_displaced').map((f) => f.id);
  if (!g.def.warlordIds) g.def.warlordIds = world.factions.filter((f) => f.type === 'historical_warlord').map((f) => f.id);
}

function enrichState(g) {
  const st = g.state;
  if (!st.firedGates) st.firedGates = [];
  if (!st.deadChars) st.deadChars = [];
  if (!st.guestBroken) st.guestBroken = {};
  if (!st.qinAttackedCao) st.qinAttackedCao = false;
  if (!st.governors) st.governors = Object.assign({}, (g.def.charactersPack && g.def.charactersPack.governors) || {});
  if (!st.generation) {
    st.generation = {};
    (g.def.order || []).forEach((id) => { st.generation[id] = 1; });
  }
}

function attach(Engine) {
  Engine.EVENT_KINDS = EVENT_KINDS;
  Engine.DEAL_CLAUSES = DEAL_CLAUSES;
  Engine.RUNTIME_VERSION = RUNTIME_VERSION;
  Engine.MAX_TENSION_GATES_PER_TURN = MAX_TENSION_GATES_PER_TURN;
  Engine.matchPred = matchPred;
  Engine.normalizeEvent = normalizeEvent;
  Engine.governorOf = governorOf;
  Engine.guestProtected = guestProtected;

  const createGame = Engine.createGame;
  Engine.createGame = function (world, personas, seed) {
    const g = createGame(world, personas, seed);
    enrichDef(g);
    enrichState(g);
    return g;
  };

  const restoreGame = Engine.restoreGame;
  Engine.restoreGame = function (world, personas, state) {
    const g = restoreGame(world, personas, state);
    enrichDef(g);
    enrichState(g);
    return g;
  };

  const resolveTurn = Engine.resolveTurn;
  Engine.resolveTurn = function (g, decisions) {
    enrichDef(g);
    enrichState(g);
    const intro = [];
    if (!(g.state.firedGates || []).length) scheduleGates(g, intro, 'intro');
    const turnBefore = g.state.turn;
    const result = resolveTurn(g, decisions);
    const tension = [];
    if (turnBefore > 1) scheduleGates(g, tension, 'post_turn');
    const merged = intro.concat(result.events || [], tension);
    result.rawEvents = result.events;
    result.events = merged.map((e) => normalizeEvent(g, e));
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
        return d;
      }
      return Engine.decide(g, id);
    });
  };

  return Engine;
}

if (typeof module === 'object' && module.exports) module.exports = attach;
