// GameController (src/world/game-controller.js): the playable loop around the real engine, without a browser.
// Checks that every order goes through Engine.fillDecisions + Engine.resolveTurn, that the menu only offers what the
// engine accepts, that the controller itself never changes game state, that whole games can be played to the end, and
// that the player-facing model knows other factions only through Engine.projectPerception (docs/product/perception.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ROOT, Engine, world, personas } from './load.mjs';

const require = createRequire(import.meta.url);
const GC = require(path.join(ROOT, 'src/world/game-controller.js'));
const EMPERORS = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che'];
const make = (seed = 219, E = Engine) => GC.create({ Engine: E, world, personas, seed });
const BAND_RANK = { weak: 0, unknown: 1, medium: 2, strong: 3, very_strong: 4 };
// field names that would carry another faction's hidden truth into the UI model
const SECRET_KEYS = ['troops', 'prestige', 'grain', 'loyalty', 'defenders', 'ratio', 'commit', 'power', 'type', 'doctrine', 'persona', 'weights', 'traits', 'prior', 'name', 'garrison', 'seat', 'pacts'];

// the engine as game.html composes it: engine.js → attach-219.js → perception.js as classic scripts, each attaching
// itself onto EmperorsEngine (no module, no manual attach)
function browserEngine() {
  const win = { console };
  win.self = win.window = win;
  vm.createContext(win);
  for (const f of ['src/engine/engine.js', 'src/engine/attach-219.js', 'src/engine/perception.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), win, { filename: f });
  return win.EmperorsEngine;
}
// the UI model with the player's own realm taken out: what is left is all about other factions
function othersPart(view, fid) {
  const v = JSON.parse(JSON.stringify(view));
  delete v.status.player;
  v.status.factions = v.status.factions.filter((f) => f.fid !== fid);
  if (v.options) { delete v.options.fortify; delete v.options.internal; for (const t of v.options.attack) delete t.via; }
  return v;
}
function keysDeep(x, out = new Set()) {
  if (Array.isArray(x)) for (const y of x) keysDeep(y, out);
  else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) { out.add(k); keysDeep(y, out); }
  return out;
}

// spy on the engine calls the controller makes
function spy(names) {
  const calls = Object.fromEntries(names.map((n) => [n, []])), orig = {};
  for (const n of names) { orig[n] = Engine[n]; Engine[n] = function (...a) { calls[n].push(a); return orig[n].apply(this, a); }; }
  return { calls, restore: () => { for (const n of names) Engine[n] = orig[n]; } };
}
// one order from the menu: attack the best-looking target if any, else internal
function autoOrder(ctrl, k) {
  const op = ctrl.options();
  const kinds = ['attack', 'internal', 'fortify', 'diplomacy', 'stratagem'], kind = kinds[k % kinds.length];
  if (kind === 'attack' && op.attack.length) { const t = op.attack.slice().sort((a, b) => BAND_RANK[a.troopBand] - BAND_RANK[b.troopBand])[0]; return ctrl.decision('attack', { target: t.pid, betray: t.pact }); }
  if (kind === 'fortify') return ctrl.decision('fortify', { target: op.fortify[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.annex.length) return ctrl.decision('diplomacy', { sub: 'annex', target: op.diplomacy.annex[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.pact.length) return ctrl.decision('diplomacy', { sub: 'pact', target: op.diplomacy.pact[0].fid });
  if (kind === 'stratagem') return ctrl.decision('stratagem', { sub: 'burn', target: op.stratagem.targets[0].fid });
  return ctrl.decision('internal');
}

test('the four displaced emperors are playable, nobody else', () => {
  const ctrl = make();
  assert.deepEqual(ctrl.playable.slice().sort(), EMPERORS.slice().sort());
  assert.throws(() => ctrl.start('cao_cao'));
  for (const fid of EMPERORS) {
    const s = ctrl.start(fid);
    assert.equal(s.player.fid, fid);
    assert.equal(s.turn, 1);
    assert.deepEqual(s.player.provinces.map((p) => p.pid), Engine.owned(ctrl.game, fid));
    const op = ctrl.options();
    assert.deepEqual(Object.keys(op.available).sort(), Object.keys(Engine.ACTIONS).sort(), 'the five engine actions');
    assert.deepEqual(op.attack.map((t) => t.pid), Engine.frontier(ctrl.game, fid), 'attack targets = engine frontier');
    for (const t of op.attack) assert.ok(t.via.length > 0 && t.via.every((v) => ctrl.game.state.provinces[v.pid].owner === fid), 'each target borders the realm');
  }
});

test('a turn: player order + MOCK agents through fillDecisions, resolved by resolveTurn, RuntimeEvent v1 out', () => {
  const ctrl = make(7);
  ctrl.start('li_shimin');
  const op = ctrl.options(), t = op.attack[0];
  const d = ctrl.decision('attack', { target: t.pid, betray: t.pact });
  assert.equal(ctrl.validate(d), null);
  const s = spy(['fillDecisions', 'resolveTurn']);
  let entry;
  try { entry = ctrl.resolve(d); } finally { s.restore(); }
  assert.equal(s.calls.fillDecisions.length, 1);
  assert.equal(s.calls.fillDecisions[0][1], 'li_shimin');
  assert.equal(s.calls.fillDecisions[0][2], d);
  assert.equal(s.calls.resolveTurn.length, 1);
  const alive = Engine.aliveIds(ctrl.game);
  assert.deepEqual(entry.decisions.map((x) => x.fid).sort(), alive.slice().sort(), 'one decision per living faction');
  const mine = entry.decisions.find((x) => x.fid === 'li_shimin');
  assert.equal(mine.action, 'attack'); assert.equal(mine.target, t.pid);
  for (const x of entry.decisions.filter((x) => x.fid !== 'li_shimin')) assert.ok(Engine.ACTIONS[x.action], 'AI decision for ' + x.fid);
  assert.ok(entry.events.length > 0);
  for (const ev of entry.events) { assert.equal(ev.v, 1); assert.ok(Engine.EVENT_KINDS.includes(ev.kind), ev.kind); assert.equal(ev.defender, undefined); }
  assert.ok(entry.events.some((e) => e.kind === 'gate' && e.id === 'opening'), 'intro gates fire on the first turn');
  assert.ok(entry.events.some((e) => e.kind === 'attack' && e.fid === 'li_shimin' && e.to === t.pid), 'the player attack is resolved');
  assert.equal(ctrl.status().turn, 2);
  // owners come straight from engine state
  for (const [pid, p] of Object.entries(ctrl.game.state.provinces)) assert.equal(ctrl.owners()[pid], p.owner === 'neutral' ? undefined : p.owner);
});

test('guards: one turn at a time, invalid orders never reach the engine', () => {
  const ctrl = make(11);
  ctrl.start('qin_shihuang');
  const before = JSON.stringify(ctrl.game.state);
  const notFrontier = world.provinces.find((p) => !ctrl.options().attack.some((t) => t.pid === p.id) && p.id !== 'longxi').id;
  for (const bad of [ctrl.decision('attack', { target: notFrontier }), ctrl.decision('stratagem', { sub: 'poison', target: 'cao_cao' }), ctrl.decision('fortify', { target: 'yu' }), null]) {
    assert.ok(ctrl.validate(bad));
    assert.throws(() => ctrl.resolve(bad));
  }
  assert.equal(JSON.stringify(ctrl.game.state), before, 'state untouched by rejected orders');
  const s = spy(['fillDecisions', 'resolveTurn']);
  ctrl.resolve(ctrl.decision('internal'));
  assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /already/, 'no second resolve before playback finishes');
  ctrl.finish();
  ctrl.resolve(ctrl.decision('internal'));
  s.restore();
  assert.equal(s.calls.resolveTurn.length, 2);
  assert.equal(ctrl.history.length, 2);
  assert.deepEqual(ctrl.history.map((h) => h.turn), [1, 2]);
});

test('an allied province can only be attacked with betray, as the engine requires', () => {
  const ctrl = make(3);
  ctrl.start('li_shimin');
  const G = ctrl.game, t = ctrl.options().attack.find((x) => x.owner !== 'neutral');
  // a pact set the way the engine records one (both sides, until a turn)
  G.state.factions.li_shimin.pacts[t.owner] = 6; G.state.factions[t.owner].pacts.li_shimin = 6;
  const op = ctrl.options().attack.find((x) => x.pid === t.pid);
  assert.equal(op.pact, true);
  assert.ok(ctrl.validate(ctrl.decision('attack', { target: t.pid })));
  assert.equal(ctrl.validate(ctrl.decision('attack', { target: t.pid, betray: true })), null);
  assert.ok(!ctrl.options().diplomacy.pact.some((x) => x.fid === t.owner), 'no second pact with an ally');
});

test('whole games: every emperor plays turns until the engine ends the game', () => {
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(100 + i);
    ctrl.start(fid);
    let k = 0;
    while (!ctrl.status().over && k < 60) {
      const alive = ctrl.status().player.alive;
      const entry = ctrl.resolve(alive ? autoOrder(ctrl, k) : null);
      assert.equal(JSON.stringify(entry.events), entry.frozen);
      ctrl.finish();
      k++;
    }
    const s = ctrl.status();
    assert.ok(s.over, fid + ' game ended');
    assert.ok(s.winner && Engine.aliveIds(ctrl.game).includes(s.winner.fid));
    assert.equal(ctrl.options(), null, 'no orders after the end');
    assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /over/);
    assert.ok(ctrl.history.at(-1).events.some((e) => e.kind === 'win'));
    assert.ok(k <= world.rules.maxTurns);
  }
});

test('same seed and same orders replay the same game', () => {
  const run = () => { const c = make(42); c.start('liu_che'); const out = []; for (let k = 0; k < 6; k++) { const e = c.resolve(autoOrder(c, k)); c.finish(); out.push(e.frozen); } return out; };
  assert.deepEqual(run(), run());
});

test('game.html composes the engine like Node: engine → attach-219 → perception, intel rules loaded, no second attach', () => {
  const html = fs.readFileSync(path.join(ROOT, 'game.html'), 'utf8');
  const at = (f) => html.indexOf(`<script src="${f}"></script>`);
  assert.ok(at('src/engine/engine.js') > 0 && at('src/engine/engine.js') < at('src/engine/attach-219.js') && at('src/engine/attach-219.js') < at('src/engine/perception.js'), 'script order');
  assert.ok(at('src/engine/perception.js') < at('src/world/game-controller.js'), 'perception attached before the controller exists');
  assert.match(html, /data\/scenario\/intel-rules\.json/);
  assert.match(html, /world\.intelRules = intelRules/);
  assert.match(html, /const Engine = window\.EmperorsEngine;/);
  assert.doesNotMatch(html, /attach\(window\.EmperorsEngine\)|EmperorsPerception\(|EmperorsAttach219\(/, 'no manual composition on top of the auto-attach');
  for (const f of ['game.html', 'src/world/game-controller.js', 'src/world/player-ui.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(src, /decideLegacy|\.ranking\(|attackOf|defenseOf|\.decide\(/, f + ': no legacy AI, no truth ranking, no combat estimate');
  }
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/world/player-ui.js'), 'utf8'), /ctrl\.game|\.state\.factions|personas/, 'PlayerUI never reads the game');

  // the same composition run as browser scripts plays the same game as the Node loader, through perception
  const B = browserEngine();
  assert.equal(typeof B.projectPerception, 'function');
  assert.equal(typeof B.decideFromContext, 'function');
  assert.throws(() => B.decide(B.createGame(world, personas, 1), 'cao_cao'), /DecisionContext|projectPerception/, 'decide only takes a DecisionContext');
  const run = (E) => { const c = make(77, E); c.start('zhu_yuanzhang'); const out = []; for (let k = 0; k < 8 && !c.status().over; k++) { const e = c.resolve(c.status().player.alive ? autoOrder(c, k) : null); c.finish(); out.push(e.frozen, JSON.stringify(c.view())); } return out.concat(JSON.stringify(c.game.state)); };
  assert.deepEqual(run(B), run(Engine), 'browser composition = Node composition (nothing wrapped twice)');
});

test('the UI model reads other factions only through the player DecisionContext', () => {
  const ctrl = make(5);
  ctrl.start('li_shimin');
  const spyP = spy(['projectPerception', 'decideLegacy']);
  let v;
  try { v = ctrl.view(); ctrl.resolve(ctrl.decision('internal')); ctrl.finish(); } finally { spyP.restore(); }
  assert.ok(spyP.calls.projectPerception.length >= 1);
  assert.ok(spyP.calls.projectPerception.every((a) => a[0] === ctrl.game && a[1] === 'li_shimin'), 'the player view projects only the player');
  assert.equal(spyP.calls.decideLegacy.length, 0, 'no legacy (truth) AI in the loop');
  const ctx = Engine.projectPerception(ctrl.game, 'li_shimin');
  v = ctrl.view();
  for (const f of v.status.factions.filter((x) => !x.me)) {
    const x = ctx.others[f.fid];
    assert.deepEqual(Object.keys(f).sort(), ['adjacent', 'alive', 'claimedIdentity', 'fid', 'label', 'lastAction', 'lastSeenTurn', 'provinces', 'troopBand']);
    assert.deepEqual([f.label, f.alive, f.troopBand, f.provinces, f.adjacent], [x.publicLabel, x.alive, x.troopBand, x.provinces, x.adjacent]);
  }
});

test('no exact enemy troops, prestige, defenders or ratio anywhere in status/options, over many turns', () => {
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(300 + i);
    ctrl.start(fid);
    for (let k = 0; k < 12 && !ctrl.status().over; k++) {
      const v = othersPart(ctrl.view(), fid), json = JSON.stringify(v), keys = keysDeep(v);
      for (const key of SECRET_KEYS) assert.ok(!keys.has(key), `${fid} turn ${k + 1}: no "${key}" about other factions`);
      for (const [id, f] of Object.entries(ctrl.game.state.factions)) {
        if (id === fid) continue;
        if (f.troops >= 1000) assert.ok(!json.includes(String(f.troops)) && !json.includes(Math.round(f.troops).toLocaleString('vi-VN')), `${fid}: exact troops of ${id} absent`);
        if (id !== fid && world.factions.find((x) => x.id === id).type === 'time_displaced') assert.ok(!json.includes(personas[id].name), `${fid}: true name of ${id} hidden`);
      }
      assert.ok(!json.includes('time_displaced'));
      if (v.options) {
        for (const t of v.options.attack) { assert.ok(t.troopBand in BAND_RANK); assert.equal(t.defenders, undefined); assert.equal(t.ratio, undefined); }
        for (const t of v.options.stratagem.targets) { assert.ok(t.troopBand in BAND_RANK); assert.equal(t.troops, undefined); }
      }
      const alive = ctrl.status().player.alive;
      ctrl.resolve(alive ? autoOrder(ctrl, k) : null); ctrl.finish();
    }
  }
});

test('hidden emperors show their public label; the three warlords their names; the player sees itself', () => {
  const ctrl = make(9);
  ctrl.start('li_shimin');
  const ctx = Engine.projectPerception(ctrl.game, 'li_shimin'), rows = Object.fromEntries(ctrl.status().factions.map((f) => [f.fid, f]));
  assert.equal(rows.qin_shihuang.label, world.intelRules.aliases.qin_shihuang.publicLabel);
  assert.equal(rows.qin_shihuang.label, ctx.others.qin_shihuang.publicLabel);
  assert.notEqual(rows.qin_shihuang.label, personas.qin_shihuang.name);
  for (const x of ['zhu_yuanzhang', 'liu_che']) assert.equal(rows[x].label, world.intelRules.aliases[x].publicLabel);
  for (const x of ['cao_cao', 'liu_bei', 'sun_quan']) assert.equal(rows[x].label, personas[x].name);
  assert.equal(rows.li_shimin.label, personas.li_shimin.name);
  assert.equal(ctrl.status().player.name, personas.li_shimin.name);
  // targets and pacts carry the same labels
  const op = ctrl.options();
  for (const t of op.stratagem.targets) assert.equal(t.label, ctx.others[t.fid].publicLabel);
  for (const t of op.attack) assert.equal(t.ownerLabel, t.owner === 'neutral' ? world.neutral.name : ctx.others[t.owner].publicLabel);
  const G = ctrl.game; G.state.factions.li_shimin.pacts.qin_shihuang = 6; G.state.factions.qin_shihuang.pacts.li_shimin = 6;
  assert.deepEqual(ctrl.status().player.pacts, [{ fid: 'qin_shihuang', label: 'Chúa Lũng Tây', until: 6 }]);
});

test('own realm stays exact; ranking uses public province counts, not hidden strength', () => {
  const ctrl = make(13);
  ctrl.start('liu_che');
  for (let k = 0; k < 6; k++) { ctrl.resolve(autoOrder(ctrl, k)); ctrl.finish(); }
  const G = ctrl.game, me = G.state.factions.liu_che, s = ctrl.status();
  if (!me.alive) return;
  assert.deepEqual([s.player.troops, s.player.grain, s.player.loyalty, s.player.prestige, s.player.seat], [me.troops, me.grain, me.loyalty, me.prestige, me.seat]);
  assert.deepEqual(s.player.provinces.map((p) => [p.pid, p.fort, p.seat]), Engine.owned(G, 'liu_che').map((pid) => [pid, G.state.provinces[pid].fort, pid === me.seat]));
  assert.equal(s.player.income, Engine.income(G, 'liu_che'));
  assert.equal(s.player.upkeep, Engine.upkeep(G, 'liu_che'));
  const own = s.factions.find((f) => f.me);
  assert.deepEqual([own.troops, own.prestige, own.provinces], [me.troops, me.prestige, Engine.owned(G, 'liu_che').length]);
  const alive = s.factions.filter((f) => f.alive);
  for (let i = 1; i < alive.length; i++) assert.ok(alive[i - 1].provinces >= alive[i].provinces, 'sorted by public province count');
  for (const f of s.factions) assert.equal(f.provinces, Engine.owned(G, f.fid).length, 'province counts are the public map');
});

test('attack targets: owner band, public adjacency; the player may pick where the army sets out', () => {
  const ctrl = make(21);
  ctrl.start('qin_shihuang');
  const ctx = Engine.projectPerception(ctrl.game, 'qin_shihuang'), op = ctrl.options();
  for (const t of op.attack) {
    assert.equal(t.troopBand, t.owner === 'neutral' ? 'unknown' : ctx.others[t.owner].troopBand);
    assert.deepEqual(t.via.map((v) => v.pid), ctx.world.neighbors[t.pid].filter((n) => ctx.world.owners[n] === 'qin_shihuang'));
  }
  const t = op.attack.find((x) => x.owner !== 'neutral') || op.attack[0], from = t.via[t.via.length - 1].pid;
  const d = ctrl.decision('attack', { target: t.pid, from, betray: t.pact });
  assert.equal(d.from, from);
  assert.equal(ctrl.validate(d), null);
  const notMine = world.provinces.find((p) => !t.via.some((v) => v.pid === p.id)).id;
  assert.ok(ctrl.validate(ctrl.decision('attack', { target: t.pid, from: notMine, betray: t.pact })), 'origin must border the target');
  const entry = ctrl.resolve(d);
  const ev = entry.events.find((e) => e.kind === 'attack' && e.fid === 'qin_shihuang');
  if (ev) assert.equal(ev.from, from, 'the engine marched from the chosen province');
});
