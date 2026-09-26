// GameController (src/world/game-controller.js): the playable loop around the real engine, without a browser.
// Gameplay contract v1.1 (docs/product/GAMEPLAY-CONTRACT-v1.1.md): one prepared envelope per turn
// (preparePlayerTurn → answerReaction → resolvePrepared), the player's menus from the DecisionContext (province intel,
// guest protection, pacts, pressure), and everything the player sees of a turn from the TurnObservation — never from
// the raw RuntimeEvents, which stay in the history for replay/debug.
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
const HIDDEN = (fid) => EMPERORS.filter((x) => x !== fid);
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// field names that would carry another faction's hidden truth into the UI model
const SECRET_KEYS = ['troops', 'prestige', 'grain', 'loyalty', 'defenders', 'ratio', 'commit', 'power', 'type', 'doctrine', 'persona', 'weights', 'traits', 'prior', 'name', 'garrison', 'seat', 'winChance']; // pacts are public (world.pacts)

// spy on engine entry points (the controller calls them through the Engine object)
function spy(names, E = Engine) {
  const calls = Object.fromEntries(names.map((n) => [n, []])), orig = {};
  for (const n of names) { orig[n] = E[n]; E[n] = function (...a) { calls[n].push(a); return orig[n].apply(this, a); }; }
  return { calls, restore: () => { for (const n of names) E[n] = orig[n]; } };
}
// deterministic fixture: some AI decisions are replaced after the engine made them, before the envelope is sealed
// (preparePlayerTurn reads Engine.fillDecisions)
function withAiDecisions(patch, fn) {
  const orig = Engine.fillDecisions;
  Engine.fillDecisions = function (g, playerFid, playerDecision) {
    const out = orig.apply(this, arguments);
    return out.map((d) => (patch(d, g, playerFid) || d));
  };
  try { return fn(); } finally { Engine.fillDecisions = orig; }
}
const offerFrom = (froms) => (d, g, pf) => (froms.includes(d.fid) ? Object.assign({}, d, { action: 'diplomacy', sub: 'pact', target: pf, targetKind: 'faction', from: null, label: Engine.ACTIONS.diplomacy.label }) : null);
// the engine as game.html composes it: classic scripts, each attaching itself onto EmperorsEngine
function browserEngine() {
  const win = { console };
  win.self = win.window = win;
  vm.createContext(win);
  for (const f of ['src/engine/engine.js', 'src/engine/attach-219.js', 'src/engine/perception.js']) vm.runInContext(src(f), win, { filename: f });
  return win.EmperorsEngine;
}
// one order from the menu
function autoOrder(ctrl, k) {
  const op = ctrl.options();
  const kinds = ['attack', 'internal', 'fortify', 'diplomacy', 'stratagem'], kind = kinds[k % kinds.length];
  if (kind === 'attack' && op.attack.length) { const t = op.attack.slice().sort((a, b) => BAND_RANK[a.intel.troopBand] - BAND_RANK[b.intel.troopBand])[0]; return ctrl.decision('attack', { target: t.pid, betray: t.pact }); }
  if (kind === 'fortify') return ctrl.decision('fortify', { target: op.fortify[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.annex.length) return ctrl.decision('diplomacy', { sub: 'annex', target: op.diplomacy.annex[0].pid });
  if (kind === 'diplomacy' && op.diplomacy.pact.length) return ctrl.decision('diplomacy', { sub: 'pact', target: op.diplomacy.pact[0].fid });
  if (kind === 'stratagem') return ctrl.decision('stratagem', { sub: 'burn', target: op.stratagem.targets[0].fid });
  return ctrl.decision('internal');
}
const play = (ctrl, k, answer = (r) => (r.from.length % 2 ? 'accept' : 'reject')) => { const e = ctrl.resolve(ctrl.status().player.alive ? autoOrder(ctrl, k) : null, answer); ctrl.finish(); return e; };
// every string the playable UI can show for a turn
function playableText(ctrl, entry) {
  const P = entry.presentation, out = [JSON.stringify(ctrl.view())];
  for (const it of P.items) out.push(it.title, it.text, it.kicker, ...(it.actors || []).map((a) => a.name), it.badge && it.badge.text);
  if (P.news) out.push(P.news.title, ...P.news.items.map((n) => n.title + ' ' + n.text));
  if (P.win) out.push(P.win.text, P.win.label);
  return out.filter(Boolean).join('\n');
}
const numForms = (n) => [String(Math.round(n)), Math.round(n).toLocaleString('vi-VN')];
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

// ------------------------------------------------------------------ composition and the menu
test('the four displaced emperors are playable, nobody else; attack targets = legal targets', () => {
  const ctrl = make();
  assert.deepEqual(ctrl.playable.slice().sort(), EMPERORS.slice().sort());
  assert.throws(() => ctrl.start('cao_cao'));
  for (const fid of EMPERORS) {
    const s = ctrl.start(fid);
    assert.equal(s.player.fid, fid);
    assert.equal(s.turn, 1);
    const op = ctrl.options(), ctx = Engine.projectPerception(ctrl.game, fid);
    assert.deepEqual(Object.keys(op.available).sort(), Object.keys(Engine.ACTIONS).sort(), 'the five engine actions');
    assert.deepEqual(op.attack.map((t) => t.pid).sort(), ctx.legal.attackTargets.slice().sort(), 'attack targets = DecisionContext legal targets');
    for (const t of op.attack) assert.ok(t.via.length > 0 && t.via.every((v) => ctrl.game.state.provinces[v.pid].owner === fid), 'each target borders the realm');
  }
});

test('game.html composes the engine like Node; the controller uses the v1.1 turn API', () => {
  const html = src('game.html');
  const at = (f) => html.indexOf(`<script src="${f}"></script>`);
  assert.ok(at('src/engine/engine.js') > 0 && at('src/engine/engine.js') < at('src/engine/attach-219.js') && at('src/engine/attach-219.js') < at('src/engine/perception.js'), 'script order');
  assert.ok(at('src/engine/perception.js') < at('src/world/game-controller.js'));
  assert.match(html, /world\.intelRules = intelRules/);
  assert.match(html, /const Engine = window\.EmperorsEngine;/);
  assert.doesNotMatch(html, /attach\(window\.EmperorsEngine\)|EmperorsPerception\(|EmperorsAttach219\(/);
  const gc = src('src/world/game-controller.js'), pui = src('src/world/player-ui.js');
  for (const [f, s] of [['game.html', html], ['game-controller.js', gc], ['player-ui.js', pui]]) {
    assert.doesNotMatch(s, /decideLegacy|\.ranking\(|attackOf|defenseOf|\.decide\(|bandValue|guestProtectionStatus|emperorIds|warlordIds|E\.frontier|Engine\.frontier/, f + ': no truth path, no knowledge rule of its own');
  }
  assert.doesNotMatch(gc, /E\.fillDecisions|E\.resolveTurn\(/, 'playable turns go through preparePlayerTurn / resolvePrepared');
  assert.match(gc, /E\.preparePlayerTurn\(/); assert.match(gc, /E\.answerReaction\(/); assert.match(gc, /E\.resolvePrepared\(/); assert.match(gc, /E\.projectTurnObservation\(/);
  assert.doesNotMatch(pui, /ctrl\.game|\.state\.|personas|\.events\b|ownerName/, 'PlayerUI never reads the game, raw events or the old field');
  const B = browserEngine();
  const run = (E) => { const c = make(77, E); c.start('zhu_yuanzhang'); const out = []; for (let k = 0; k < 8 && !c.status().over; k++) { const e = c.resolve(c.status().player.alive ? autoOrder(c, k) : null, 'reject'); c.finish(); out.push(e.frozen, JSON.stringify(e.observation), JSON.stringify(c.view())); } return out.concat(JSON.stringify(c.game.state)); };
  assert.deepEqual(run(B), run(Engine), 'browser composition = Node composition');
});

// ------------------------------------------------------------------ 1–5: one envelope per turn, reactions
test('1. preparePlayerTurn runs exactly once per submitted turn; answers never regenerate decisions', () => {
  const ctrl = make(31);
  ctrl.start('li_shimin');
  const s = spy(['preparePlayerTurn', 'fillDecisions', 'answerReaction', 'resolvePrepared', 'resolveTurn', 'projectTurnObservation']);
  try {
    withAiDecisions(offerFrom(['qin_shihuang']), () => {
      ctrl.prepare(ctrl.decision('internal'));
      assert.equal(s.calls.preparePlayerTurn.length, 1);
      ctrl.answer(ctrl.unanswered()[0].id, 'accept');
      assert.equal(s.calls.preparePlayerTurn.length, 1, 'answering does not prepare again');
      ctrl.commit(); ctrl.finish();
    });
    assert.equal(s.calls.preparePlayerTurn.length, 1);
    assert.equal(s.calls.answerReaction.length, 1);
    assert.equal(s.calls.resolvePrepared.length, 1);
    assert.equal(s.calls.resolveTurn.length, 1, 'resolvePrepared resolves once');
    assert.equal(s.calls.projectTurnObservation.length, 1);
    assert.equal(s.calls.projectTurnObservation[0][1], 'li_shimin');
    // a turn without offers: still exactly one prepare, one fillDecisions (inside it)
    const f0 = s.calls.fillDecisions.length;
    ctrl.resolve(ctrl.decision('internal')); ctrl.finish();
    assert.equal(s.calls.preparePlayerTurn.length, 2);
    assert.equal(s.calls.fillDecisions.length - f0, 1);
  } finally { s.restore(); }
  ctrl.prepare(ctrl.decision('internal'));
  assert.throws(() => ctrl.prepare(ctrl.decision('internal')), /already/, 'no second prepare in the same turn');
});

test('2. an incoming pact is reaction state before anything resolves', () => {
  const ctrl = make(32);
  ctrl.start('li_shimin');
  const turn = ctrl.game.state.turn;
  withAiDecisions(offerFrom(['qin_shihuang']), () => ctrl.prepare(ctrl.decision('internal')));
  const r = ctrl.reactions();
  assert.equal(r.length, 1);
  assert.equal(r[0].from, 'qin_shihuang');
  assert.equal(r[0].fromLabel, Engine.projectPerception(ctrl.game, 'li_shimin').world.publicLabels.qin_shihuang);
  assert.equal(r[0].fromLabel, 'Chúa Lũng Tây');
  assert.equal(r[0].turns, world.rules.pact.turns);
  assert.equal(ctrl.game.state.turn, turn, 'not resolved yet');
  assert.equal(ctrl.history.length, 0);
  assert.equal(ctrl.busy, true, 'the main action is committed; the menu stays locked');
  assert.equal(ctrl.pendingTurn.decision.action, 'internal');
  assert.throws(() => ctrl.commit(), /pending/, 'no resolve while an offer is unanswered');
  assert.equal(ctrl.game.state.turn, turn);
  assert.throws(() => ctrl.answer('pact:1:cao_cao:li_shimin', 'accept'), 'an id not in the envelope is refused');
  // several offers: sorted by id, only as many as the player has pact slots; the rest are never actionable
  const c2 = make(33); c2.start('li_shimin');
  withAiDecisions(offerFrom(['qin_shihuang', 'zhu_yuanzhang', 'liu_che']), () => c2.prepare(c2.decision('internal')));
  const env = c2.pendingTurn.envelope;
  assert.deepEqual(c2.reactions().map((x) => x.id), env.pendingReactions.map((x) => x.id));
  assert.deepEqual(c2.reactions().map((x) => x.from), ['liu_che', 'qin_shihuang']);
  assert.equal(env.declinedOffers.length, 1);
  assert.throws(() => c2.answer(env.declinedOffers[0].id, 'accept'), 'a pact_full offer cannot be accepted');
});

for (const answer of ['accept', 'reject']) {
  test(`${answer === 'accept' ? 3 : 4}. ${answer} resolves the SAME envelope and decisions`, () => {
    const ctrl = make(answer === 'accept' ? 41 : 42);
    ctrl.start('li_shimin');
    const s = spy(['resolvePrepared']);
    let entry, env, before;
    try {
      withAiDecisions(offerFrom(['qin_shihuang']), () => ctrl.prepare(ctrl.decision('internal')));
      env = ctrl.pendingTurn.envelope; before = JSON.stringify(env.decisions);
      ctrl.answer(ctrl.unanswered()[0].id, answer);
      entry = ctrl.commit(); ctrl.finish();
    } finally { s.restore(); }
    assert.equal(s.calls.resolvePrepared[0][1], env, 'resolvePrepared got the prepared envelope');
    assert.equal(entry.envelope, env);
    assert.equal(JSON.stringify(entry.decisions), before, 'decisions unchanged from prepare');
    assert.equal(entry.answers[env.pendingReactions[0].id], answer);
    const pact = ctrl.game.state.factions.li_shimin.pacts.qin_shihuang;
    const seen = entry.visibleEvents.find((v) => v.kind === 'pact' && v.actorId === 'qin_shihuang');
    const shown = entry.presentation.items.find((it) => it.kind === 'pact');
    if (answer === 'accept') {
      assert.equal(pact, entry.turn + world.rules.pact.turns, 'pact until turn + rules.pact.turns');
      assert.equal(seen.textKey, 'pact_signed');
      assert.equal(shown.text, `Chúa Lũng Tây và Lý Thế Dân lập minh ước (đến lượt ${pact}).`);
      assert.deepEqual(ctrl.status().player.pacts, [{ fid: 'qin_shihuang', label: 'Chúa Lũng Tây', untilTurn: pact, remainingTurns: pact - ctrl.game.state.turn }]);
    } else {
      assert.ok(!(pact >= ctrl.game.state.turn), 'no pact after reject');
      assert.equal(seen.textKey, 'pact_refused');
      assert.equal(shown.text, 'Minh ước Chúa Lũng Tây đề nghị không thành.');
      assert.deepEqual(ctrl.status().player.pacts, []);
    }
  });
}

test('5. the controller never writes player/session data into game.state', () => {
  const ctrl = make(35);
  ctrl.start('li_shimin');
  const clean = (st) => { assert.equal(st.playerFid, undefined); assert.equal(st.reactionAnswers, undefined); assert.doesNotMatch(JSON.stringify(st), /playerFid|reactionAnswers|pendingTurn|envelope/); };
  withAiDecisions(offerFrom(['qin_shihuang']), () => ctrl.prepare(ctrl.decision('internal')));
  clean(ctrl.game.state);
  ctrl.answer(ctrl.unanswered()[0].id, 'accept');
  clean(ctrl.game.state);
  ctrl.commit(); ctrl.finish();
  clean(ctrl.game.state);
  assert.equal(ctrl.game._reaction, undefined);
  for (let k = 0; k < 6; k++) play(ctrl, k);
  clean(ctrl.game.state);
});

// ------------------------------------------------------------------ 6–11: guest status, legal targets, province intel
test('6. guest status comes from self.guestProtection', () => {
  const ctrl = make(36);
  ctrl.start('qin_shihuang');
  const gp = Engine.projectPerception(ctrl.game, 'qin_shihuang').self.guestProtection, G = ctrl.status().player.guest;
  assert.equal(G.active, gp.active); assert.equal(G.remainingTurns, gp.remainingTurns);
  assert.deepEqual(G.protectedFrom.map((x) => x.fid), gp.protectedFrom);
  assert.deepEqual(G.protectedFrom.map((x) => x.label).sort(), ['Lưu Bị', 'Tào Tháo', 'Tôn Quyền']);
  assert.deepEqual(G.brokenAgainst, []);
  assert.equal(G.ended, null);
  // the engine's own record of a broken truce shows as such
  ctrl.game.state.guestBroken = { qin_shihuang: { cao_cao: true } };
  const B = ctrl.status().player.guest;
  assert.deepEqual(B.brokenAgainst.map((x) => x.label), ['Tào Tháo']);
  assert.ok(!B.protectedFrom.some((x) => x.fid === 'cao_cao'));
  // two provinces: protection ends although the calendar still runs; nothing pretends it is active
  const second = Engine.projectPerception(ctrl.game, 'qin_shihuang').legal.attackTargets.find((p) => ctrl.game.state.provinces[p].owner !== 'neutral');
  ctrl.game.state.provinces[second].owner = 'qin_shihuang';
  const E2 = ctrl.status().player.guest;
  assert.equal(E2.active, false); assert.ok(E2.remainingTurns > 0); assert.equal(E2.ended, 'expanded'); assert.deepEqual(E2.protectedFrom, []);
});

test('7. a province the engine protects is not attackable in the menu', () => {
  const ctrl = make(37);
  ctrl.start('li_shimin');
  const all = ctrl.options().attack.map((t) => t.pid), shielded = 'cao_cao';
  const orig = Engine.guestProtected;
  Engine.guestProtected = (g, attacker, owner) => (attacker === 'li_shimin' && owner === shielded) || orig(g, attacker, owner);
  try {
    const legal = Engine.projectPerception(ctrl.game, 'li_shimin').legal.attackTargets, op = ctrl.options();
    assert.ok(all.some((p) => ctrl.game.state.provinces[p].owner === shielded), 'the frontier touches the protected owner');
    assert.deepEqual(op.attack.map((t) => t.pid).sort(), legal.slice().sort());
    assert.ok(!op.attack.some((t) => t.owner === shielded), 'no protected province offered');
    const p = all.find((x) => ctrl.game.state.provinces[x].owner === shielded);
    assert.ok(ctrl.validate(ctrl.decision('attack', { target: p })), 'and refused if forced');
  } finally { Engine.guestProtected = orig; }
});

test('8. attack targets carry province intel, not the owner faction band', () => {
  let differs = 0;
  for (const fid of EMPERORS) {
    const ctrl = make(38); ctrl.start(fid);
    const ctx = Engine.projectPerception(ctrl.game, fid);
    for (const t of ctrl.options().attack) {
      const I = ctx.provinceIntel[t.pid];
      assert.deepEqual(t.intel, { troopBand: I.troopBand, commander: I.commander, fortLevel: I.fortLevel, lastSeenTurn: I.lastSeenTurn, source: I.source });
      assert.deepEqual(Object.keys(t).sort(), ['city', 'claimedIdentity', 'intel', 'owner', 'ownerLabel', 'pact', 'pid', 'via']);
      assert.equal(t.intel.source, 'adjacent');
      if (t.owner !== 'neutral' && t.intel.troopBand !== ctx.others[t.owner].troopBand) differs++;
    }
  }
  assert.ok(differs > 0, 'a province band differs from its faction band somewhere (Tào: weak garrisons, very strong faction)');
});

test('9–11. memory intel is stale, unknown is ?, fort 0 is not unknown', () => {
  const ctrl = make(39);
  ctrl.start('liu_che');
  const G = ctrl.game;
  // a province seen on turn 3 and out of reach now, recorded the way the engine records it
  G.state.intelLog.provinces.liu_che = G.state.intelLog.provinces.liu_che || {};
  G.state.intelLog.provinces.liu_che.jing = { troopBand: 'strong', commander: 'Tào Nhân', fortLevel: 2, turn: 3 };
  const far = ctrl.options().far.find((x) => x.pid === 'jing');
  assert.deepEqual(far.intel, { troopBand: 'strong', commander: 'Tào Nhân', fortLevel: 2, lastSeenTurn: 3, source: 'memory' });
  const wm = GC.intelWords(far.intel);
  assert.equal(wm.troops, 'Quân: Mạnh'); assert.equal(wm.fresh, 'Tin cũ: lượt 3'); assert.equal(wm.commander, 'Tào Nhân'); assert.equal(wm.fort, '2');
  // never seen: unknown, no commander, no fort
  const unk = ctrl.provinceCard('jiao');
  assert.deepEqual(unk.intel, { troopBand: 'unknown', commander: null, fortLevel: null, lastSeenTurn: null, source: 'unknown' });
  const wu = GC.intelWords(unk.intel);
  assert.deepEqual([wu.troops, wu.commander, wu.fort, wu.fresh], ['Quân: Chưa rõ', '?', '?', 'Tin: chưa có']);
  const jiaoOwner = G.state.provinces.jiao.owner;
  assert.equal(unk.ownerLabel, jiaoOwner === 'neutral' ? world.neutral.name : Engine.projectPerception(G, 'liu_che').world.publicLabels[jiaoOwner], 'the owner is still the public map');
  // adjacent, wall seen at level 0: "0", not "?"
  const adj = ctrl.options().attack.find((t) => t.intel.fortLevel === 0);
  assert.equal(adj.intel.fortLevel, 0);
  assert.equal(GC.intelWords(adj.intel).fort, '0');
  assert.equal(GC.intelWords(adj.intel).fresh, 'Tin: hiện tại');
  assert.equal(GC.intelWords({ troopBand: 'weak', commander: null, fortLevel: null, lastSeenTurn: 2, source: 'memory' }).fort, '?');
});

// ------------------------------------------------------------------ 12–17: the turn as the player sees it
test('12. playable log, cards and news are built from the TurnObservation only', () => {
  const ctrl = make(44);
  ctrl.start('zhu_yuanzhang');
  for (let k = 0; k < 5; k++) {
    const e = play(ctrl, k);
    const look = { player: 'zhu_yuanzhang', cities: Object.fromEntries(world.provinces.map((p) => [p.id, p.city])), seat: ctrl.game.state.factions.zhu_yuanzhang.seat, decision: e.decision, stratagems: Object.fromEntries(ctrl.stratagems.map((s) => [s.id, s.label])) };
    assert.deepEqual(e.presentation, GC.presentationOf(e.observation, look), 'presentation = f(observation)');
    assert.equal(e.presentation.items.length, e.visibleEvents.length);
    assert.equal(e.presentation.news ? e.presentation.news.items.length : 0, e.publicNews.length);
    assert.equal(JSON.stringify(e.events), e.frozen, 'raw events kept, untouched');
    for (const it of e.presentation.items) assert.equal(it.safe, true);
    assert.ok(e.presentation.shots.length <= 2, 'at most the own result and one hostile reaction get a shot');
  }
  // the browser loop plays presentation.shots and logs presentation items; it never touches entry.events
  const bind = GC.bind.toString();
  assert.doesNotMatch(bind, /\.events\b/);
  assert.match(bind, /presentation/);
});

test('13–14. hidden true names, enemy troops and enemy losses never reach playable text', () => {
  let rawNames = 0, rawNumbers = 0;
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(500 + i);
    ctrl.start(fid);
    for (let k = 0; k < 16 && !ctrl.status().over; k++) {
      const e = play(ctrl, k), text = playableText(ctrl, e), raw = JSON.stringify(e.events);
      for (const h of HIDDEN(fid)) {
        if (raw.includes(personas[h].name)) rawNames++;
        assert.ok(!text.includes(personas[h].name), `${fid} turn ${e.turn}: true name of ${h} absent from playable text`);
      }
      for (const ev of e.events.filter((x) => x.kind === 'attack')) {
        const secret = [];
        if (ev.fid !== fid) secret.push(ev.commit, ev.attLoss);
        if (ev.defenderFid !== fid) secret.push(ev.defLoss);
        for (const n of secret.filter((x) => x != null && x >= 1000)) { rawNumbers++; for (const f of numForms(n)) assert.ok(!text.includes(f), `${fid} turn ${e.turn}: enemy number ${f} absent`); }
      }
      for (const [id, f] of Object.entries(ctrl.game.state.factions)) if (id !== fid && f.troops >= 1000) for (const s of numForms(f.troops)) assert.ok(!text.includes(s), `${fid}: exact troops of ${id} absent`);
    }
  }
  assert.ok(rawNames > 0 && rawNumbers > 0, 'the raw events did carry names and numbers (the test is not vacuous)');
});

test('15. a distant battle the player did not observe creates no playable item', () => {
  const ctrl = make(45);
  ctrl.start('liu_che');
  const G = ctrl.game, st = G.state, P = G.def.P;
  const mine = new Set(Engine.owned(G, 'liu_che')), near = new Set([...mine].flatMap((p) => P[p].neighbors).concat([...mine]));
  // a Tôn → Lưu attack far from Hán Vũ Đế
  let pair = null;
  for (const a of Engine.owned(G, 'sun_quan')) for (const b of P[a].neighbors) if (!pair && st.provinces[b].owner === 'liu_bei' && !near.has(a) && !near.has(b)) pair = [a, b];
  assert.ok(pair, 'a distant pair exists');
  const entry = withAiDecisions((d) => (d.fid === 'sun_quan' ? Object.assign({}, d, { action: 'attack', target: pair[1], targetKind: 'province', from: pair[0], betray: true, sub: null }) : null), () => ctrl.resolve(ctrl.decision('internal'), 'reject'));
  ctrl.finish();
  const rawAttack = entry.events.find((e) => e.kind === 'attack' && e.fid === 'sun_quan' && e.to === pair[1]);
  assert.ok(rawAttack, 'the battle happened in the truth');
  const city = P[pair[1]].city, changed = st.provinces[pair[1]].owner !== 'liu_bei';
  assert.ok(!entry.visibleEvents.some((v) => v.to === pair[1] || v.prov === pair[1]));
  assert.ok(!entry.presentation.items.some((it) => it.to === pair[1] || it.prov === pair[1] || it.text.includes(city)), 'no shot, no log line');
  const news = entry.presentation.news ? entry.presentation.news.items : [];
  assert.equal(news.filter((n) => n.text.includes(city)).length, changed ? 1 : 0, 'only the public consequence (owner change), never the battle');
  assert.doesNotMatch(JSON.stringify(entry.presentation), /trận|hiddenBattles|ở xa/, 'no count or mention of hidden battles');
});

test('16. an owner change becomes one safe line in the single world-news card', () => {
  const ctrl = make(46);
  ctrl.start('li_shimin');
  let found = null;
  for (let k = 0; k < 24 && !found && !ctrl.status().over; k++) {
    const before = ctrl.owners(), e = play(ctrl, k), after = ctrl.owners();
    const changed = world.provinces.filter((p) => (before[p.id] || 'neutral') !== (after[p.id] || 'neutral'));
    if (changed.length) found = { e, changed, after };
  }
  assert.ok(found, 'some province changed hands');
  const { e, changed, after } = found, ctx = Engine.projectPerception(ctrl.game, 'li_shimin');
  const own = e.presentation.news.items.filter((n) => n.kind === 'ownership');
  assert.equal(own.length, changed.length, 'one line per province, no battle narration');
  for (const p of changed) {
    const label = after[p.id] ? (after[p.id] === 'li_shimin' ? personas.li_shimin.name : ctx.world.publicLabels[after[p.id]]) : 'Trung lập';
    assert.ok(own.some((n) => n.text === `${p.city} nay thuộc ${label}.`), p.id);
  }
  assert.equal(e.presentation.news.title, 'Thiên hạ');
  assert.ok(!Array.isArray(e.presentation.news), 'one card per turn');
});

test('17. an accepted pact reaches the world news under public labels', () => {
  const ctrl = make(47);
  ctrl.start('li_shimin');
  const e = withAiDecisions(offerFrom(['qin_shihuang']), () => ctrl.resolve(ctrl.decision('internal'), 'accept'));
  ctrl.finish();
  const n = e.presentation.news.items.find((x) => x.kind === 'pact');
  assert.ok(n.text.startsWith('Chúa Lũng Tây và Lý Thế Dân công bố minh ước'), n.text);
  assert.ok(!playableText(ctrl, e).includes('Tần Thủy Hoàng'));
  assert.ok(JSON.stringify(e.events).includes('Tần Thủy Hoàng'), 'the raw event names him');
});

test('18. the demo path still plays RuntimeEvent truth; the playable path plays safe items', () => {
  const demo = src('src/world/demo.js');
  assert.match(demo, /presenter\.playAll\(events,/);
  assert.match(demo, /events = r\.result\.events/);
  assert.match(src('game.html'), /if \(DEMO\) return WorldDemo\.run/);
  assert.match(GC.bind.toString(), /presenter\.playAll\(P\.shots,/);
});

test('19. neutral annex rows carry ownerLabel', () => {
  const ctrl = make(49);
  ctrl.start('li_shimin');
  const annex = ctrl.options().diplomacy.annex;
  assert.ok(annex.length > 0);
  for (const x of annex) { assert.equal(x.ownerLabel, world.neutral.name); assert.equal(x.ownerName, undefined); assert.ok(x.intel); }
  assert.match(src('src/world/player-ui.js'), /D\.annex\.map\(\(x\) => row\([^\n]*x\.ownerLabel/);
});

test('20. own realm stays exact; ranking uses public province counts', () => {
  const ctrl = make(13);
  ctrl.start('liu_che');
  for (let k = 0; k < 6; k++) play(ctrl, k);
  const G = ctrl.game, me = G.state.factions.liu_che, s = ctrl.status();
  if (!me.alive) return;
  assert.deepEqual([s.player.troops, s.player.grain, s.player.loyalty, s.player.prestige, s.player.seat], [me.troops, me.grain, me.loyalty, me.prestige, me.seat]);
  assert.deepEqual(s.player.provinces.map((p) => [p.pid, p.fort, p.seat]), Engine.owned(G, 'liu_che').map((pid) => [pid, G.state.provinces[pid].fort, pid === me.seat]));
  assert.equal(s.player.income, Engine.income(G, 'liu_che'));
  assert.equal(s.player.upkeep, Engine.upkeep(G, 'liu_che'));
  const own = s.factions.find((f) => f.me);
  assert.deepEqual([own.troops, own.prestige, own.provinces], [me.troops, me.prestige, Engine.owned(G, 'liu_che').length]);
  const alive = s.factions.filter((f) => f.alive);
  for (let i = 1; i < alive.length; i++) assert.ok(alive[i - 1].provinces >= alive[i].provinces);
  for (const k of Object.keys(GC.STAT_HELP)) assert.ok(GC.STAT_HELP[k].length > 20, 'stat help for ' + k);
});

// ------------------------------------------------------------------ boundary, pressure, whole games
test('other factions only through the DecisionContext: no truth keys or exact values, over many turns', () => {
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(300 + i);
    ctrl.start(fid);
    for (let k = 0; k < 12 && !ctrl.status().over; k++) {
      const v = othersPart(ctrl.view(), fid), json = JSON.stringify(v), keys = keysDeep(v);
      for (const key of SECRET_KEYS) assert.ok(!keys.has(key), `${fid} turn ${k + 1}: no "${key}" about other factions`);
      for (const [id, f] of Object.entries(ctrl.game.state.factions)) {
        if (id === fid) continue;
        if (f.troops >= 1000) assert.ok(!json.includes(String(f.troops)) && !json.includes(Math.round(f.troops).toLocaleString('vi-VN')), `${fid}: exact troops of ${id} absent`);
        if (EMPERORS.includes(id)) assert.ok(!json.includes(personas[id].name), `${fid}: true name of ${id} hidden`);
      }
      assert.ok(!json.includes('time_displaced'));
      play(ctrl, k);
    }
  }
});

test('pressure and public pacts come straight from the DecisionContext', () => {
  const ctrl = make(51);
  ctrl.start('li_shimin');
  const G = ctrl.game;
  G.state.factions.cao_cao.pacts.sun_quan = 7; G.state.factions.sun_quan.pacts.cao_cao = 7; // a public pact, as the engine records it
  const ctx = Engine.projectPerception(G, 'li_shimin'), s = ctrl.status();
  assert.deepEqual(s.world.pressure.map((x) => [x.fid, x.level]), Object.keys(ctx.diplomaticPressure).filter((x) => ctx.others[x].alive).map((x) => [x, ctx.diplomaticPressure[x]]));
  assert.deepEqual(s.world.pacts, ctx.world.pacts.map((e) => ({ a: e.a, aLabel: ctx.world.publicLabels[e.a], b: e.b, bLabel: ctx.world.publicLabels[e.b], untilTurn: e.untilTurn, remainingTurns: e.remainingTurns })));
  assert.equal(s.world.pressure.find((x) => x.fid === 'cao_cao').level, 'high', 'a bloc of ≥4 provinces with a pact on the border');
  for (const x of ctrl.options().diplomacy.pact) assert.equal(x.pressure, ctx.diplomaticPressure[x.fid]);
});

test('an allied province can only be attacked with betray, as the engine requires', () => {
  const ctrl = make(3);
  ctrl.start('li_shimin');
  const G = ctrl.game, t = ctrl.options().attack.find((x) => x.owner !== 'neutral');
  G.state.factions.li_shimin.pacts[t.owner] = 6; G.state.factions[t.owner].pacts.li_shimin = 6;
  const op = ctrl.options().attack.find((x) => x.pid === t.pid);
  assert.equal(op.pact, true);
  assert.ok(ctrl.validate(ctrl.decision('attack', { target: t.pid })));
  assert.equal(ctrl.validate(ctrl.decision('attack', { target: t.pid, betray: true })), null);
  assert.ok(!ctrl.options().diplomacy.pact.some((x) => x.fid === t.owner), 'no second pact with an ally');
});

test('guards: invalid orders never reach the engine; the controller never answers for the player', () => {
  const ctrl = make(11);
  ctrl.start('qin_shihuang');
  const before = JSON.stringify(ctrl.game.state);
  const notLegal = world.provinces.find((p) => !ctrl.options().attack.some((t) => t.pid === p.id) && p.id !== 'longxi').id;
  const s = spy(['preparePlayerTurn']);
  try {
    for (const bad of [ctrl.decision('attack', { target: notLegal }), ctrl.decision('stratagem', { sub: 'poison', target: 'cao_cao' }), ctrl.decision('fortify', { target: 'yu' }), null]) {
      assert.ok(ctrl.validate(bad));
      assert.throws(() => ctrl.resolve(bad));
    }
    assert.equal(s.calls.preparePlayerTurn.length, 0, 'nothing prepared for a rejected order');
  } finally { s.restore(); }
  assert.equal(JSON.stringify(ctrl.game.state), before);
  assert.equal(ctrl.busy, false);
  withAiDecisions(offerFrom(['li_shimin']), () => assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /pending/, 'an offer without an answer policy stops before resolve'));
  assert.equal(ctrl.game.state.turn, 1);
  for (const r of ctrl.unanswered()) ctrl.answer(r.id, 'reject');
  ctrl.commit(); ctrl.finish();
  assert.equal(ctrl.game.state.turn, 2);
});

test('whole games: every emperor plays until the engine ends the game', () => {
  for (const [i, fid] of EMPERORS.entries()) {
    const ctrl = make(100 + i);
    ctrl.start(fid);
    let k = 0;
    while (!ctrl.status().over && k < 60) { const e = play(ctrl, k); assert.equal(JSON.stringify(e.events), e.frozen); k++; }
    const s = ctrl.status();
    assert.ok(s.over, fid + ' game ended');
    assert.ok(s.winner && Engine.aliveIds(ctrl.game).includes(s.winner.fid));
    assert.equal(ctrl.options(), null);
    assert.throws(() => ctrl.resolve(ctrl.decision('internal')), /over/);
    const last = ctrl.history.at(-1).presentation;
    assert.ok(last.win && last.win.text.endsWith('định thiên hạ.'), 'the end from public news');
    assert.ok(k <= world.rules.maxTurns);
  }
});

test('same seed, same orders, same answers: same game', () => {
  const run = () => { const c = make(42); c.start('liu_che'); const out = []; for (let k = 0; k < 6; k++) out.push(play(c, k).frozen); return out; };
  assert.deepEqual(run(), run());
});
