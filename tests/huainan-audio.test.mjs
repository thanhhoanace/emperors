// Sound for v2 (src/world/huainan-audio.js, docs/design/v2-polish.md job 8): the parts that need no browser. Scales and seasons,
// the generated music (a bar is a pure function of mood, season, seed and bar number), the game's events → cues, the synth
// buffers (pitch, envelope, seamless loops, levels), the analyser, and the engine's graph on a fake AudioContext (every cue
// schedules, moods crossfade and revert, mute, the phone path). What it sounds like is measured in the browser:
// tests/e2e/audio-measure.mjs renders every cue and mood offline and holds the levels to the mix targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './load.mjs';

const require = createRequire(import.meta.url);
const A = require(path.join(ROOT, 'src/world/huainan-audio.js'));
const Y = A.synth;
const SR = 44100;
const fixture = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-fixtures', n + '.json'), 'utf8'));
const pc = (m) => ((m % 12) + 12) % 12;
const modePcs = (S) => A.MODES[S.mode].map((s) => pc(S.tonic + s));
const VOICES = ['pluck', 'qin', 'glass', 'flute', 'taiko', 'ka', 'gong', 'horn'];
const PITCHED = { pluck: [40, 96], qin: [33, 72], glass: [60, 100], flute: [55, 96], gong: [30, 80], horn: [40, 70] };
const rmsOf = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
const dbOf = (v) => 20 * Math.log10(Math.max(1e-9, v));

// ---------------------------------------------------------------- numbers, scales, seasons
test('scales: five notes per mode, degrees run across octaves, A440', () => {
  assert.equal(A.hz(69), 440); assert.ok(Math.abs(A.hz(57) - 220) < 1e-9);
  for (const [name, m] of Object.entries(A.MODES)) {
    assert.equal(m.length, 5, name); assert.equal(m[0], 0, name);
    assert.deepEqual([...m].sort((a, b) => a - b), m, name + ' ascending'); assert.ok(m.every((s) => s >= 0 && s < 12), name);
    assert.ok(m.every((s, i) => i === 0 || s - m[i - 1] <= 3), name + ' has no gap wider than a minor third: a pentatonic'); // the gap to the octave is checked next
    assert.ok(12 - m[4] <= 3, name);
  }
  for (const id of A.SEASON_IDS) {
    const S = A.SEASONS[id];
    assert.equal(A.midi(S, 0), S.tonic); assert.equal(A.midi(S, 5), S.tonic + 12); assert.equal(A.midi(S, -5), S.tonic - 12); assert.equal(A.midi(S, 10), S.tonic + 24);
    for (let d = -10; d <= 14; d++) assert.ok(modePcs(S).includes(pc(A.midi(S, d))), id + ' degree ' + d);
    assert.equal(A.midi(S, 3) - S.tonic, A.MODES[S.mode][3], 'degree 3 is the fifth in every mode (7 semitones) or its neighbour');
  }
});

test('seasons: four distinct keys and tempos, parsed from the calendar text', () => {
  assert.deepEqual(A.SEASON_IDS, ['xuan', 'ha', 'thu', 'dong']);
  const S = A.SEASONS;
  assert.ok(S.xuan.bpm > S.ha.bpm && S.ha.bpm > S.thu.bpm && S.thu.bpm > S.dong.bpm, 'spring is quickest, winter slowest');
  assert.equal(new Set(A.SEASON_IDS.map((i) => S[i].tonic + S[i].mode)).size, 4, 'four different (tonic, mode) pairs');
  assert.equal(S.thu.mode, 'yu'); assert.equal(S.xuan.mode, 'gong'); // autumn minor, spring major
  assert.equal(A.parseSeason('Thu 219').id, 'thu'); assert.equal(A.parseSeason('Thu 219').year, 219);
  assert.equal(A.parseSeason('Xuân 220').id, 'xuan'); assert.equal(A.parseSeason('Hạ 219').id, 'ha'); assert.equal(A.parseSeason('Đông 219').id, 'dong');
  assert.equal(A.parseSeason('dong').id, 'dong'); assert.equal(A.parseSeason('  HA  ').id, 'ha');
  assert.equal(A.parseSeason('Mùa lạ 3'), null); assert.equal(A.parseSeason(null), null); assert.equal(A.parseSeason(undefined), null); assert.equal(A.parseSeason(''), null);
});

test('rng and hash: seeded, repeatable, spread', () => {
  const a = A.rng(7), b = A.rng(7), c = A.rng(8);
  const xa = Array.from({ length: 50 }, a), xb = Array.from({ length: 50 }, b), xc = Array.from({ length: 50 }, c);
  assert.deepEqual(xa, xb); assert.notDeepEqual(xa, xc); assert.ok(xa.every((v) => v >= 0 && v < 1));
  const mean = Array.from({ length: 4000 }, A.rng(3)).reduce((s, v) => s + v, 0) / 4000; assert.ok(Math.abs(mean - 0.5) < 0.03);
  assert.equal(A.hash('a', 1), A.hash('a', 1)); assert.notEqual(A.hash('a', 1), A.hash('a', 2)); assert.notEqual(A.hash('ab', 'c'), A.hash('a', 'bc'));
  assert.ok(A.hash() > 0);
});

// ---------------------------------------------------------------- the sequencer
test('bars are well formed for every mood, season and bar', () => {
  for (const mood of ['calm', 'tension', 'battle', 'victory', 'defeat'])
    for (const sid of A.SEASON_IDS)
      for (let n = 0; n < 40; n++) {
        const bp = A.bar(mood, sid, 219, n, 0.6);
        assert.ok(bp.bpm > 30 && bp.bpm < 150, mood + ' bpm'); assert.ok(Math.abs(bp.sec - 240 / bp.bpm) < 1e-9);
        assert.ok(bp.ev.length <= 40, `${mood}/${sid}/${n}: ${bp.ev.length} events`);
        for (const e of bp.ev) {
          const at = `${mood}/${sid}/${n} ${JSON.stringify(e)}`;
          assert.ok(VOICES.includes(e.v), at); assert.ok(e.b >= -0.2 && e.b < 4, at); assert.ok(e.d > 0 && e.d <= 8, at); assert.ok(e.g > 0 && e.g <= 1.001, at);
          if (PITCHED[e.v]) { assert.ok(Number.isInteger(e.n), at); assert.ok(e.n >= PITCHED[e.v][0] && e.n <= PITCHED[e.v][1], at + ' out of range'); } else assert.equal(e.n, undefined, at);
        }
      }
  assert.deepEqual(A.bar('off', 'thu', 1, 0).ev, []);
});

test('every pitched note of every mood belongs to its mode', () => {
  const key = { calm: (S) => S, tension: (S) => Object.assign({}, S, { mode: 'yu' }), battle: (S) => Object.assign({}, S, { mode: 'yu' }), victory: () => A.SEASONS.xuan, defeat: () => A.SEASONS.thu };
  for (const mood of Object.keys(key))
    for (const sid of A.SEASON_IDS) {
      const K = key[mood](A.SEASONS[sid]), ok = modePcs(K);
      for (let n = 0; n < 48; n++) for (const e of A.bar(mood, sid, 77, n, 0.5).ev) if (e.n != null) assert.ok(ok.includes(pc(e.n)), `${mood}/${sid}/${n} ${e.v} ${e.n} not in ${K.mode} on ${K.tonic}`);
    }
});

test('calm music: repeatable by seed, different between seeds and seasons, phrased, with room to breathe', () => {
  const sig = (mood, sid, seed, n) => JSON.stringify(A.bar(mood, sid, seed, n, 0.5).ev);
  for (const sid of A.SEASON_IDS) {
    assert.equal(sig('calm', sid, 5, 9), sig('calm', sid, 5, 9), 'a bar is the same when asked again');
    const bars = Array.from({ length: 32 }, (_, n) => sig('calm', sid, 5, n)), other = Array.from({ length: 32 }, (_, n) => sig('calm', sid, 6, n));
    assert.ok(new Set(bars).size >= 14, sid + ': ' + new Set(bars).size + ' distinct bars of 32');
    assert.ok(bars.filter((b, i) => b !== other[i]).length >= 20, sid + ': another seed is another piece');
    const empty = bars.filter((b) => b === '[]').length, all = Array.from({ length: 32 }, (_, n) => A.bar('calm', sid, 5, n).ev.length);
    assert.ok(empty <= 10, sid + ': ' + empty + ' silent bars of 32'); assert.ok(Math.max(...all) <= 24, sid + ' busiest bar');
    const notes = all.reduce((s, x) => s + x, 0) / 32; assert.ok(notes >= 1.5 && notes <= 14, sid + ' notes per bar ' + notes);
  }
  const seasonSig = A.SEASON_IDS.map((sid) => sig('calm', sid, 5, 0)); assert.equal(new Set(seasonSig).size, 4);
  // it never settles into a loop: no run of eight bars repeats within 96 bars
  const long = Array.from({ length: 96 }, (_, n) => sig('calm', 'thu', 5, n)), key = (i) => long.slice(i, i + 8).join('|'), seen = new Set();
  for (let i = 0; i + 8 <= 96; i++) { assert.ok(!seen.has(key(i)), 'a passage of eight bars comes back at ' + i); seen.add(key(i)); }
});

test('calm phrases end on the tonic or the fifth', () => {
  for (const sid of A.SEASON_IDS) {
    const S = A.SEASONS[sid], home = [pc(S.tonic), pc(S.tonic + A.MODES[S.mode][3])]; let seen = 0;
    for (let p = 0; p < 40; p++) for (const e of A.bar('calm', sid, 31, p * 4 + 3).ev) if (e.v === 'pluck' && e.b === 2 && e.d === 2) { seen++; assert.ok(home.includes(pc(e.n)), `${sid} phrase ${p} ends on ${e.n}`); }
    assert.ok(seen >= 20, sid + ': cadences found ' + seen);
  }
});

test('the moods differ the way they should', () => {
  const count = (mood, v, sid = 'thu') => { let c = 0; for (let n = 0; n < 16; n++) c += A.bar(mood, sid, 219, n, 0.6).ev.filter((e) => e.v === v).length; return c; };
  assert.equal(count('calm', 'taiko'), 0); assert.equal(count('calm', 'ka'), 0); assert.equal(count('defeat', 'taiko') <= 2, true);
  assert.ok(count('battle', 'taiko') > 60, 'battle is built on drums'); assert.ok(count('battle', 'ka') > 20); assert.ok(count('tension', 'taiko') >= 16 && count('tension', 'taiko') < count('battle', 'taiko'), 'tension is a heartbeat, quieter than battle');
  assert.ok(A.bpm('battle', 'thu', 0.5) > A.bpm('tension', 'thu', 0.5), 'battle is quicker'); assert.ok(A.bpm('tension', 'thu', 1) > A.bpm('tension', 'thu', 0), 'a hotter tension quickens'); assert.ok(A.bpm('defeat', 'thu') < A.bpm('calm', 'xuan'));
  // the battle's fourth bar is a fill: more drum hits than its first three
  const hits = (n) => A.bar('battle', 'thu', 219, n, 0.6).ev.filter((e) => e.v === 'taiko').length; assert.ok(hits(3) > hits(0) - 1 && hits(7) >= hits(4));
  // victory opens with a gong, drums and a horn call a fifth apart; it ends up an easy bed
  const v0 = A.bar('victory', 'thu', 1, 0).ev, hornN = v0.filter((e) => e.v === 'horn').map((e) => e.n);
  assert.ok(v0.some((e) => e.v === 'gong') && v0.some((e) => e.v === 'taiko') && hornN.length === 2 && hornN[1] - hornN[0] === 7, 'a horn call up a fifth');
  assert.equal(A.bar('victory', 'thu', 1, 3).ev.filter((e) => e.v === 'pluck').length, 3, 'a chord to finish'); assert.ok(A.bar('victory', 'thu', 1, 9).ev.every((e) => e.v !== 'taiko'));
  // defeat opens with a low gong and a falling line on the low string
  const d0 = A.bar('defeat', 'thu', 1, 0).ev; assert.ok(d0.some((e) => e.v === 'gong' && e.x.size === 'low')); assert.ok(d0.some((e) => e.v === 'qin'));
  const line = [0, 1, 2, 3].flatMap((n) => A.bar('defeat', 'thu', 1, n).ev.filter((e) => e.v === 'qin').map((e) => e.n)); assert.ok(line[line.length - 1] < line[0], 'the low line falls');
});

// ---------------------------------------------------------------- the game's events → what to play
test('handlers map to cues: taps are soft, an end of season is a drum roll', () => {
  const cue = (name, ...args) => A.actCues(name, args).map((c) => c.cue + (c.o && c.o.k ? ':' + c.o.k : ''));
  assert.deepEqual(cue('onEndSeason'), ['endSeason']); assert.deepEqual(cue('onSelect', { kind: 'army', id: 'a1' }), ['select:army']); assert.deepEqual(cue('onSelect', { kind: 'town', id: 't' }), ['select:town']);
  assert.deepEqual(cue('onSelect', null), [], 'a tap on the ground stays quiet'); assert.deepEqual(cue('onConfirmOrder', { type: 'order' }), ['confirm:order']); assert.deepEqual(cue('onConfirmOrder', { type: 'task' }), ['confirm:task']);
  assert.deepEqual(cue('onAnswer', 'c', true), ['confirm:card']); assert.deepEqual(cue('onAnswer', 'c', false), ['cancel:card']); assert.deepEqual(cue('onTask', 't', null), ['cancel']); assert.deepEqual(cue('onTask', 't', 'wall'), ['tap']);
  for (const n of ['onTarget', 'onForecast', 'onPartner', 'onBattleOrder', 'onWingSelect', 'onOverview', 'onBattleDone', 'onBeatDone', 'onReportDone', 'onWatch']) assert.deepEqual(cue(n, {}), ['tap'], n);
  for (const n of ['onCancel', 'onClearOrder']) assert.deepEqual(cue(n, 'a1'), ['cancel'], n);
  assert.deepEqual(cue('onBattleTurn', {}), ['drum']); assert.deepEqual(cue('onAutoBattle'), ['drum']); assert.deepEqual(cue('onGoalDone'), ['confirm:begin']); assert.deepEqual(cue('onAgain'), ['confirm:begin']);
  assert.deepEqual(cue('onSkip'), ['skip']); assert.deepEqual(cue('onMute', true), [], 'muting makes no sound'); assert.deepEqual(cue('onMute', false), ['tap']); assert.deepEqual(cue('onFoo'), []); assert.deepEqual(A.actCues('onSelect'), []);
  for (const n of ['onEndSeason', 'onSelect', 'onTarget', 'onConfirmOrder', 'onCancel', 'onTask', 'onAnswer', 'onBattleTurn', 'onGoalDone', 'onSkip'])
    for (const c of A.actCues(n, [{ kind: 'army', type: 'order' }, true])) assert.ok(A.CUES.includes(c.cue), c.cue + ' is a cue');
});

test('a battle turn sounds like its log: arrows, then steel, in the engine order, spaced out', () => {
  const t3 = fixture('battle-turn3'), over = fixture('battle-over');
  const first = A.turnCues(t3), names = first.map((c) => c.cue);
  const melees = t3.b.log[t3.b.log.length - 1].ev.filter((e) => e.kind === 'melee'), charged = melees.some((e) => e.charge && (e.armA === 'ky' || e.armD === 'ky'));
  assert.deepEqual(names, charged ? ['charge', 'clash'] : ['clash'], 'the last turn of turn3 is a melee: ' + JSON.stringify(names));
  const last = A.turnCues(over).map((c) => c.cue); assert.deepEqual(last, ['volley', 'clash', 'rout'], 'arrows, melee, a rout');
  const cues = A.turnCues(over); for (let i = 1; i < cues.length; i++) assert.ok(cues[i].at > cues[i - 1].at + 0.5, 'spaced'); assert.ok(A.turnSec(cues) > cues[cues.length - 1].at);
  const ev = (evs) => A.turnCues({ b: { log: [{ ev: evs }] } }).map((c) => c.cue);
  assert.deepEqual(ev([]), []); assert.deepEqual(A.turnCues(null), []); assert.deepEqual(A.turnCues({ b: { log: [] } }), []);
  assert.deepEqual(ev([{ kind: 'melee', charge: true, armA: 'ky', armD: 'bo' }, { kind: 'melee', charge: false }]), ['charge', 'clash']);
  assert.deepEqual(ev([{ kind: 'breach', wall: true }, { kind: 'fire' }, { kind: 'volley' }]), ['volley', 'fire', 'breach'], 'always in the order the engine resolves them');
  assert.ok(A.turnCues({ b: { log: [{ ev: [{ kind: 'melee' }, { kind: 'melee' }, { kind: 'melee' }, { kind: 'melee' }] }] } })[0].o.n > A.turnCues({ b: { log: [{ ev: [{ kind: 'melee' }] }] } })[0].o.n, 'more melee, more clash');
});

test('results, towns and marches', () => {
  const over = fixture('battle-over');
  assert.equal(A.resultMood(over), 'victory'); assert.equal(A.resultMood(Object.assign({}, over, { me: 'D' })), 'defeat');
  assert.equal(A.resultMood({ me: 'A', outcome: { win: 'draw' } }), 'calm'); assert.equal(A.resultMood(null), 'calm'); assert.equal(A.resultMood({ me: 'A' }), 'calm');
  const b = (t, me) => A.beatCues(t, me).map((c) => c.cue).join(',');
  assert.equal(b({ town: 'x', from: 'cao_cao', to: 'zhu' }, 'zhu'), 'flag,cheer,gong'); assert.equal(b({ town: 'x', from: 'zhu', to: 'cao_cao' }, 'zhu'), 'flag,gong'); assert.equal(b({ town: 'x', from: 'sun', to: 'cao_cao' }, 'zhu'), 'flag'); assert.equal(b(null, 'zhu'), '');
  const V = (armies) => ({ me: 'zhu', armies });
  assert.deepEqual(A.playbackCues(V([])), []); assert.deepEqual(A.playbackCues(null), []); assert.deepEqual(A.playbackCues(V([{ fid: 'zhu', arm: 'land', order: null }])), [], 'no orders, no march');
  assert.deepEqual(A.playbackCues(V([{ fid: 'cao', arm: 'land', order: { intent: 'attack' } }])), [], 'only ours');
  assert.deepEqual(A.playbackCues(V([{ fid: 'zhu', arm: 'land', order: { intent: 'move' } }])).map((c) => c.cue), ['march']);
  assert.deepEqual(A.playbackCues(V([{ fid: 'zhu', arm: 'land', order: { intent: 'attack' } }, { fid: 'zhu', arm: 'fleet', order: { intent: 'move' } }])).map((c) => c.cue), ['march', 'oars', 'horse']);
  assert.deepEqual(A.playbackCues(V([{ fid: 'zhu', arm: 'fleet', order: { intent: 'move' } }])).map((c) => c.cue), ['oars']);
});

test('ambience by season: winter wind, spring birds, summer cicadas, autumn crickets; the battle covers the nature', () => {
  const s = (id, mood, din) => A.ambSpec(id, mood || 'calm', din || 0);
  assert.ok(s('xuan').birds > 0.8 && !s('xuan').cicada && !s('xuan').cricket); assert.ok(s('ha').cicada > 0.6 && s('ha').birds < 0.5); assert.ok(s('thu').cricket > 0.6 && s('thu').crow > 0); assert.ok(s('dong').gale > 0.4 && !s('dong').birds && !s('dong').cicada);
  for (const id of A.SEASON_IDS) for (const k of A.LAYERS) { assert.ok(s(id)[k] >= 0 && s(id)[k] <= 1, id + k); assert.ok(s(id, 'battle')[k] <= s(id)[k] + 1e-9, 'quieter under a battle'); }
  assert.equal(s('thu', 'calm', 5).din, 1); assert.equal(s('thu', 'calm', -1).din, 0); assert.equal(s('thu', 'calm', 0.4).din, 0.4);
  assert.deepEqual(A.LAYERS.slice().sort(), Object.keys(s('thu')).sort());
});

// ---------------------------------------------------------------- the synth buffers
const pluckAt = (m, kind) => Y.pluck(A.hz(m), SR, Object.assign({ dur: 0.7 }, kind || { damp: 0.7, t60: 2 }));
const bestCents = (x, f) => { let best = 0, bc = 0; for (let c = -50; c <= 50; c += 2) { const p = A.tone(x.subarray(1500, 20000), SR, f * Math.pow(2, c / 1200)); if (p > best) { best = p; bc = c; } } return bc; };

test('plucked strings ring at the pitch asked for, decay, and start soft', () => {
  for (const m of [45, 52, 57, 64, 69, 76, 84]) {
    const x = pluckAt(m), f = A.hz(m);
    assert.ok(Math.abs(bestCents(x, f)) <= 4, `midi ${m} is ${bestCents(x, f)} cents off`);
    assert.ok(x.every(Number.isFinite)); assert.ok(A.analyze(x, SR).peak <= 0.91);
    assert.ok(rmsOf(x, 0, 6000) > 4 * rmsOf(x, x.length - 6000, x.length - 100) && x[0] === 0, 'it decays, from silence');
  }
  const long = Y.pluck(110, SR, { damp: 0.55, t60: 3.6, dur: 3 }), short = Y.pluck(110, SR, { damp: 0.8, t60: 1, dur: 3 });
  assert.ok(rmsOf(long, 2 * SR, 3 * SR - 2000) > 2 * rmsOf(short, 2 * SR, 3 * SR - 2000), 't60 sets the ring');
  const dark = A.analyze(Y.pluck(220, SR, { damp: 0.55, tone: 0.2, dur: 1 }), SR), bright = A.analyze(Y.pluck(220, SR, { damp: 0.9, tone: 0.9, dur: 1 }), SR); assert.ok(bright.centroid > dark.centroid * 1.5, 'brightness is settable');
  assert.deepEqual(Array.from(Y.pluck(220, SR, { seed: 5, dur: 0.1 })), Array.from(Y.pluck(220, SR, { seed: 5, dur: 0.1 })), 'the same every time'); assert.notDeepEqual(Array.from(Y.pluck(220, SR, { seed: 5, dur: 0.1 })), Array.from(Y.pluck(220, SR, { seed: 6, dur: 0.1 })));
});

test('percussion and metal have the envelopes of what they are', () => {
  const tail = (x, from, to) => dbOf(rmsOf(x, Math.round(from * SR), Math.round(to * SR))) - dbOf(A.analyze(x, SR).peak);
  const taiko = Y.taiko(SR, { size: 'big' }), small = Y.taiko(SR, { size: 'small' }), ka = Y.ka(SR), wood = Y.wood(SR, { f: 520 }), gong = Y.gong(110, SR, { dur: 4.6 }), clang = Y.clang(SR, { f: 1400 }), bell = Y.glass(1046, SR);
  assert.ok(tail(taiko, 0.6, 0.8) < -30, 'a drum is over in under a second'); assert.ok(A.analyze(taiko, SR).centroid < 300, 'a big drum is low'); assert.ok(A.analyze(small, SR).centroid > A.analyze(taiko, SR).centroid);
  assert.ok(tail(ka, 0.2, 0.27) < -25); assert.ok(A.analyze(ka, SR).centroid > 300);
  assert.ok(tail(wood, 0.1, 0.19) < -30 && A.analyze(wood, SR).peak < 0.91, 'a tap is a knock, gone in a tenth of a second');
  assert.ok(tail(gong, 1.0, 1.4) > -30 && tail(gong, 3.5, 4) < -18, 'a gong blooms and rings for seconds'); assert.ok(A.analyze(gong, SR).centroid < 600);
  assert.ok(tail(clang, 0.25, 0.4) < -18 && tail(clang, 0.02, 0.06) > -18, 'steel rings a moment'); assert.ok(A.analyze(clang, SR).centroid > 1500);
  assert.ok(tail(bell, 1.5, 2.0) < -6 && A.analyze(bell, SR).centroid > 900);
  for (const x of [taiko, small, ka, wood, gong, clang, bell, Y.thud(SR), Y.snap(SR), Y.foot(SR), Y.hoof(SR), Y.rubble(SR), Y.sweep(SR, {})]) { assert.ok(x.every(Number.isFinite)); const a = A.analyze(x, SR); assert.ok(a.peak <= 0.96 && a.peak > 0.5, 'normalised: ' + a.peak); assert.ok(a.dcMax < 1e-3, 'no DC: ' + a.dcMax); assert.ok(Math.abs(x[0]) < 0.05 && Math.abs(x[x.length - 1]) < 0.01, 'starts and ends at silence'); }
  assert.notDeepEqual(Array.from(Y.foot(SR, { seed: 37 }).slice(0, 200)), Array.from(Y.foot(SR, { seed: 48 }).slice(0, 200)), 'each footfall variant differs');
});

test('loops are seamless and every texture is level and finite', () => {
  const seam = (x) => { const n = x.length, d = Math.abs(x[0] - x[n - 1]); let m = 0; for (let i = 1; i < n; i++) m += Math.abs(x[i] - x[i - 1]); return d / (m / (n - 1)); };
  const loops = { wind: Y.wind(SR, { dur: 3, mono: true }), gale: Y.wind(SR, { dur: 3, gale: true, mono: true }), water: Y.water(SR, { dur: 3, mono: true }), fire: Y.fire(SR, { dur: 3 }), crowd: Y.crowd(SR, { dur: 3, mono: true }), cicada: Y.cicada(SR), cricket: Y.cricket(SR) };
  for (const [k, x] of Object.entries(loops)) { const a = A.analyze(x, SR); assert.ok(x.every(Number.isFinite), k); assert.ok(seam(x) < 6, `${k}: the loop point is ${seam(x).toFixed(1)}× a normal step`); assert.ok(a.peak > 0.4 && a.peak < 0.9, `${k} peak ${a.peak}`); assert.ok(a.dcMax < 2e-3, `${k} DC ${a.dcMax}`); }
  const st = Y.wind(SR, { dur: 2 }); assert.equal(st.length, 2); assert.notDeepEqual(Array.from(st[0].slice(0, 100)), Array.from(st[1].slice(0, 100)), 'stereo wind is decorrelated');
  const spec = (x) => A.analyze(x, SR).bands;
  assert.ok(spec(loops.wind).lowmid > spec(loops.wind).high + 15, 'wind is low'); assert.ok(spec(loops.cicada).himid > spec(loops.cicada).lowmid + 30 && spec(loops.cricket).himid > spec(loops.cricket).mid + 30, 'insects are up at 4 kHz');
  assert.ok(A.analyze(loops.gale, SR).centroid > A.analyze(loops.wind, SR).centroid, 'the winter gale whistles');
});

test('voices, birds and crowds', () => {
  const cheer = Y.cheer(SR, { voices: 3, dur: 2 }), horn = Y.horn(110, SR, { dur: 2 }), room = Y.ir(SR, { sec: 1 });
  assert.equal(cheer.length, 2); assert.ok(cheer.every((c) => c.every(Number.isFinite))); assert.ok(A.analyze(cheer, SR).peak <= 0.91); assert.ok(A.analyze(cheer, SR).bands.lowmid > A.analyze(cheer, SR).bands.high + 15, 'a cheer is in the voice band');
  assert.ok(horn.every(Number.isFinite) && A.analyze(horn, SR).peak <= 0.9); assert.ok(A.tone(horn.subarray(20000, 60000), SR, 110) > A.tone(horn.subarray(20000, 60000), SR, 155), 'the horn sounds its note');
  assert.ok(horn[0] === 0 && Math.abs(horn[horn.length - 1]) < 0.01);
  const h0 = rmsOf(horn, 0, 3000), h1 = rmsOf(horn, 40000, 46000); assert.ok(h1 > 4 * h0, 'a horn swells in');
  assert.ok(room[0].every(Number.isFinite) && rmsOf(room[0], 0, 4410) > 8 * rmsOf(room[0], 30000, 44100), 'a room decays'); assert.notDeepEqual(Array.from(room[0].slice(0, 300)), Array.from(room[1].slice(0, 300)));
  for (const kind of ['tweet', 'trill', 'whistle', 'coo', 'caw']) { const b = Y.bird(SR, kind, 3), a = A.analyze(b, SR); assert.ok(b.every(Number.isFinite), kind); assert.ok(a.peak <= 0.81 && a.peak > 0.5, kind); assert.ok(b.length / SR < 2 && Math.abs(b[b.length - 1]) < 0.01, kind + ' is short and ends clean'); }
  assert.ok(A.analyze(Y.bird(SR, 'trill', 3), SR).centroid > 2500 && A.analyze(Y.bird(SR, 'coo', 3), SR).centroid < 1200, 'sparrow-high, dove-low');
});

// ---------------------------------------------------------------- the analyser
test('the analyser reads levels, DC, clipping, bands and pitch classes', () => {
  const sine = (f, a, n = SR) => Float32Array.from({ length: n }, (_, i) => a * Math.sin(2 * Math.PI * f * i / SR));
  const s = A.analyze(sine(1000, 0.5), SR);
  assert.ok(Math.abs(s.peakDb + 6.02) < 0.05, s.peakDb); assert.ok(Math.abs(s.rmsDb + 9.03) < 0.1, s.rmsDb); assert.ok(Math.abs(s.crest - 3.01) < 0.15); assert.equal(s.clip, 0); assert.ok(s.dcMax < 1e-3);
  assert.ok(s.bands.mid > s.bands.low + 30 && s.bands.mid > s.bands.himid + 30, 'a 1 kHz tone is in the mid band'); assert.ok(Math.abs(s.centroid - 1000) < 60);
  assert.ok(Math.abs(s.bands.mid - s.rmsDb) < 0.7, 'band powers add up to the level');
  assert.ok(Math.abs(A.analyze(new Float32Array(SR).fill(0.1), SR).dc[0] - 0.1) < 1e-6); assert.equal(A.analyze(Float32Array.from({ length: 1000 }, (_, i) => (i % 2 ? 1 : -1)), SR).clip, 1000);
  const st = A.analyze([sine(440, 0.3), sine(440, 0.1)], SR); assert.equal(st.dc.length, 2); assert.ok(st.peak > 0.29);
  const c = A.chroma(sine(440, 0.5, SR * 2), SR); assert.ok(c[9] > 0.9, 'A is pitch class 9: ' + c[9]); const c2 = A.chroma(sine(261.63, 0.5, SR * 2), SR); assert.ok(c2[0] > 0.9);
  assert.ok(A.tone(sine(440, 0.5), SR, 440) > 0.49 && A.tone(sine(440, 0.5), SR, 660) < 0.01);
  const sil = A.analyze(new Float32Array(SR * 2), SR); assert.equal(sil.silent, 1); assert.equal(sil.peak, 0);
  const burst = new Float32Array(SR * 4); burst.set(sine(500, 0.5, SR), SR); assert.ok(Math.abs(A.analyze(burst, SR).silent - 0.75) < 0.1, 'three quarters silent'); assert.ok(A.analyze(burst, SR).rmsActiveDb > A.analyze(burst, SR).rmsDb + 4);
});

// ---------------------------------------------------------------- the engine on a fake AudioContext
function fakeCtx(sr = 44100) {
  const log = { nodes: [], starts: 0, stops: 0, connects: 0, params: [] };
  const param = (v = 0) => { const p = { value: v, calls: [] }; for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues']) p[m] = (...a) => { p.calls.push([m, ...a]); return p; }; log.params.push(p); return p; };
  const node = (kind, extra) => { const n = Object.assign({ kind, connect(d) { log.connects++; return d; }, disconnect() {} }, extra); log.nodes.push(n); return n; };
  const ctx = {
    sampleRate: sr, currentTime: 0, state: 'running', destination: node('dest'),
    createGain: () => node('gain', { gain: param(1) }),
    createOscillator: () => node('osc', { frequency: param(440), detune: param(0), type: 'sine', start() { log.starts++; }, stop() { log.stops++; }, setPeriodicWave() {}, onended: null }),
    createBufferSource: () => node('src', { buffer: null, loop: false, playbackRate: param(1), start() { log.starts++; }, stop() { log.stops++; } }),
    createBiquadFilter: () => node('biquad', { type: 'lowpass', frequency: param(350), Q: param(1) }),
    createDynamicsCompressor: () => node('comp', { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createWaveShaper: () => node('shaper', { curve: null, oversample: 'none' }), createDelay: () => node('delay', { delayTime: param() }), createConvolver: () => node('conv', { buffer: null }),
    createStereoPanner: () => node('pan', { pan: param() }), createPeriodicWave: () => ({}),
    createBuffer: (ch, len, rate) => { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, duration: len / rate, getChannelData: (i) => d[i] }; },
  };
  return { ctx, log };
}

test('the engine builds a master chain and one convolver (none on the phone path)', () => {
  const full = fakeCtx(), lite = fakeCtx();
  const E = A.create(full.ctx, { offline: true, seed: 3 }), L = A.create(lite.ctx, { offline: true, lite: true, seed: 3 });
  const kinds = (log) => log.nodes.map((n) => n.kind);
  assert.equal(kinds(full.log).filter((k) => k === 'conv').length, 1); assert.equal(kinds(lite.log).filter((k) => k === 'conv').length, 0, 'a phone gets combs, not a convolver');
  assert.equal(kinds(full.log).filter((k) => k === 'comp').length, 2, 'a compressor and a limiter'); assert.equal(kinds(full.log).filter((k) => k === 'shaper').length, 1);
  assert.ok(kinds(lite.log).filter((k) => k === 'delay').length >= 4);
  assert.equal(E.master.gain.value, 1); assert.equal(A.create(fakeCtx().ctx, { offline: true, muted: true }).master.gain.value, 0, 'starts silent when muted');
  assert.equal(E.mood(), 'off'); assert.equal(L.season(), 'thu');
});

test('every cue schedules sound; an unknown cue is refused', () => {
  const { ctx, log } = fakeCtx(), E = A.create(ctx, { offline: true, seed: 9 });
  assert.deepEqual(E.cueNames.slice().sort(), A.CUES.slice().sort(), 'the engine has exactly the cues the module lists'); assert.equal(new Set(A.CUES).size, A.CUES.length);
  for (const name of A.CUES) { const before = log.starts; assert.equal(E.cue(name, { t: 1 }), true, name); assert.ok(log.starts > before || name === 'defeat', name + ' scheduled nothing'); }
  assert.equal(E.cue('nope', { t: 1 }), false); assert.equal(E.cue('tap'), true, 'no time given: now');
  for (const lite of [false, true]) { const c = fakeCtx(), L = A.create(c.ctx, { offline: true, lite }); for (const name of A.CUES) L.cue(name, { t: 0.5, n: 6, dur: 2, k: 'small', season: 'dong' }); assert.ok(c.log.starts > 60, 'lite=' + lite); }
  const more = fakeCtx(), M = A.create(more.ctx, { offline: true }), less = fakeCtx(), Ls = A.create(less.ctx, { offline: true, lite: true });
  M.cue('volley', { t: 0, n: 3 }); Ls.cue('volley', { t: 0, n: 3 }); assert.ok(more.log.starts > less.log.starts, 'a phone plays fewer voices');
  const m2 = fakeCtx(), M2 = A.create(m2.ctx, { offline: true }), c1 = m2.log.starts; M2.cue('clash', { t: 0, n: 2 }); const a2 = m2.log.starts - c1; M2.cue('clash', { t: 0, n: 10 }); assert.ok(m2.log.starts - c1 - a2 > a2, 'a bigger melee is more hits');
});

test('moods crossfade, seasons change the music, holds revert, mute and skip work', () => {
  const { ctx, log } = fakeCtx(), E = A.create(ctx, { offline: true, seed: 11 });
  E.setSeason('thu', { t: 0 }); E.setMood('calm', { t: 0 }); assert.equal(E.mood(), 'calm'); E.tick(20); const calmStarts = log.starts; assert.ok(calmStarts > 30, 'a bar of notes and a drone were scheduled');
  const bus = log.nodes.filter((n) => n.kind === 'gain' && n.gain.calls.some((c) => c[0] === 'setTargetAtTime' && c[1] === 1 && c[3] > 0));
  assert.ok(bus.length >= 1, 'the scene bus fades in');
  E.setMood('battle', { t: 20 }); assert.equal(E.mood(), 'battle'); assert.ok(log.nodes.some((n) => n.kind === 'gain' && n.gain.calls.some((c) => c[0] === 'setTargetAtTime' && c[1] === 0 && c[2] === 20)), 'the calm scene fades out at the change');
  E.tick(40); assert.ok(log.starts > calmStarts + 60, 'battle is busy: drums and a riff');
  // a hold: the battle comes back to what it was
  const H = fakeCtx(), F = A.create(H.ctx, { offline: true, seed: 11 }); F.setMood('tension', { t: 0 }); F.tick(4); F.setMood('battle', { t: 4, hold: 8 }); assert.equal(F.mood(), 'battle'); F.tick(10); assert.equal(F.mood(), 'battle', 'still held'); F.tick(30); assert.equal(F.mood(), 'tension', 'then back');
  F.setMood('battle', { t: 30, hold: 5 }); F.setMood('battle', { t: 33, hold: 5 }); F.tick(37); assert.equal(F.mood(), 'battle', 'a second hold extends the first'); F.tick(50); assert.equal(F.mood(), 'tension');
  F.setMood('victory', { t: 50 }); F.tick(60); assert.equal(F.mood(), 'victory', 'a mood set without a hold stays');
  // a season change in calm re-keys the music; in other moods it waits
  const S = fakeCtx(), G = A.create(S.ctx, { offline: true }); G.setSeason('xuan', { t: 0 }); G.setMood('calm', { t: 0 }); const scenes = () => S.log.nodes.filter((n) => n.kind === 'osc' && n.type === 'triangle').length;
  const n0 = scenes(); G.setSeason('dong', { t: 10 }); assert.ok(scenes() > n0, 'a new drone for the new key'); assert.equal(G.season(), 'dong'); G.setMood('battle', { t: 12 }); const n1 = scenes(); G.setSeason('ha', { t: 14 }); assert.equal(scenes(), n1, 'battle keeps its key'); assert.equal(G.season(), 'ha');
  assert.equal(G.setSeason('nope'), undefined); assert.equal(G.season(), 'ha');
  // off stops the music; the ticks after it schedule nothing
  const O = fakeCtx(), P = A.create(O.ctx, { offline: true }); P.setMood('calm', { t: 0 }); P.tick(10); P.setMood('off', { t: 10 }); const s0 = O.log.starts; P.setAmbience({}, { t: 10 }); P.tick(30); assert.equal(O.log.starts, s0, 'silence stays silent'); assert.equal(P.mood(), 'off');
  // mute ramps the master; skip replaces the scene bus
  P.setMuted(true); const mp = P.master.gain.calls.filter((c) => c[0] === 'setTargetAtTime').pop(); assert.equal(mp[1], 0); P.setMuted(false); assert.equal(P.master.gain.calls.filter((c) => c[0] === 'setTargetAtTime').pop()[1], 1);
  const before = O.log.nodes.length; P.skip(); assert.ok(O.log.nodes.length > before, 'a fresh scene bus'); assert.doesNotThrow(() => P.cue('clash', { t: 1 }));
});

test('the ambience follows the season and the din, and a hold on the din lets go', () => {
  const { ctx, log } = fakeCtx(), E = A.create(ctx, { offline: true, seed: 2 });
  E.setSeason('xuan', { t: 0 }); E.setMood('off', { t: 0 }); E.tick(20); const loops = log.nodes.filter((n) => n.kind === 'src' && n.loop).length, birds = log.nodes.filter((n) => n.kind === 'src' && !n.loop).length;
  assert.ok(loops >= 2, 'wind and water loop'); assert.ok(birds >= 4, 'spring birds are scheduled: ' + birds);
  const d = fakeCtx(), D = A.create(d.ctx, { offline: true, seed: 2 }); D.setSeason('dong', { t: 0 }); D.setMood('off', { t: 0 }); D.tick(30); assert.equal(d.log.nodes.filter((n) => n.kind === 'src' && !n.loop).length <= 3, true, 'winter has no birds (a crow at most)');
  const before = d.log.nodes.filter((n) => n.kind === 'src' && n.loop).length; D.setDin(0.8, { t: 30, hold: 6 }); assert.ok(d.log.nodes.filter((n) => n.kind === 'src' && n.loop).length > before, 'the din loop starts'); D.tick(40); D.tick(80, 80);
});

test('the live wrapper needs no browser: state is remembered, cues are dropped until a context exists', () => {
  assert.equal(A.cue('tap'), false, 'no context, no sound'); assert.equal(A.ready(), false);
  assert.equal(A.mood('calm'), true); assert.equal(A.mood('nonsense'), false); assert.equal(A.season('Đông 219').id, 'dong'); assert.equal(A.season('???'), null);
  A.din(0.5); assert.equal(A.state().din, 0.5); assert.equal(A.state().season, 'dong'); assert.equal(A.state().mood, 'calm');
  A.mood('battle', { hold: 5 }); assert.equal(A.state().mood, 'calm', 'a held mood is not the wanted one');
  assert.equal(A.start(), false, 'no AudioContext in Node: the sound stays off without an error');
  assert.equal(A.muted(), false); let seen = []; A.onMute((m) => seen.push(m)); A.mute(true); A.mute(true); A.mute(false); assert.deepEqual(seen, [true, false]); assert.equal(A.muted(), false);
  assert.doesNotThrow(() => { A.skip(); A.scripted('battle', true); A.scripted('battle', false); });
});

test('wire: HuaiNanPlay events drive the mood (a stub emitter)', async () => {
  const L = {}, P = { on: (t, f) => { (L[t] = L[t] || []).push(f); }, emit: (t, d) => (L[t] || []).forEach((f) => f(d)) };
  assert.equal(A.wire(P), true); assert.equal(A.wire({}), false);
  for (const t of ['act', 'season', 'battle', 'turn', 'result', 'beat', 'report', 'over', 'lock', 'skip', 'mute']) assert.ok(L[t] && L[t].length, 'listens to ' + t);
  P.emit('season', { view: { calendar: 'Xuân 220' } }); assert.equal(A.state().season, 'xuan'); assert.equal(A.state().mood, 'calm');
  P.emit('battle', { bt: {} }); assert.equal(A.state().mood, 'tension');
  A.scripted('battle', true); P.emit('turn', { after: fixture('battle-over'), over: true }); P.emit('result', { lb: fixture('battle-over') }); await new Promise((r) => setTimeout(r, 450)); assert.equal(A.state().mood, 'victory', 'the result sets the mood after the turn'); A.scripted('battle', false);
  P.emit('act', { name: 'onBattleDone', args: [] }); assert.equal(A.state().mood, 'calm'); assert.equal(A.state().din, 0);
  P.emit('over', { win: false, why: '' }); assert.equal(A.state().mood, 'defeat'); P.emit('over', { win: true }); assert.equal(A.state().mood, 'victory');
  P.emit('lock', true); assert.equal(A.state().locked, true); P.emit('lock', false); assert.equal(A.state().locked, false);
  P.emit('mute', true); assert.equal(A.muted(), true); P.emit('mute', false); assert.equal(A.muted(), false);
  for (const t of ['act', 'beat', 'report', 'skip']) assert.doesNotThrow(() => P.emit(t, t === 'act' ? { name: 'onSelect', args: [{ kind: 'army' }] } : t === 'beat' ? { town: 'x', from: 'a', to: 'b' } : undefined), t);
  assert.doesNotThrow(() => P.emit('act', null)); assert.doesNotThrow(() => P.emit('turn', undefined)); assert.doesNotThrow(() => P.emit('result', undefined));
});

// ---------------------------------------------------------------- house rules
test('the module keeps the house rules: code-made sound only, no Math.random, a classic script', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/world/huainan-audio.js'), 'utf8');
  assert.ok(!/Math\.random/.test(src), 'seeded generators only'); assert.ok(!/\bfetch\s*\(|XMLHttpRequest|decodeAudioData|new Audio\(|\.(mp3|wav|ogg|m4a|flac)\b/i.test(src), 'no sample files, no downloads');
  assert.ok(!/^\s*(import|export)\s/m.test(src), 'no ES modules in the page'); assert.ok(!/https?:\/\//.test(src.replace(/docs\/design[^\n]*/g, '')), 'no outside addresses');
  const html = fs.readFileSync(path.join(ROOT, 'v2.html'), 'utf8'), play = html.indexOf('huainan-play.js'), audio = html.indexOf('huainan-audio.js'), marker = html.indexOf('v2 polish');
  assert.ok(audio > play && audio > marker, 'v2.html loads the sound after the controller, at the polish marker');
});
