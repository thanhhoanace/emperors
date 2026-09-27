// Player-side report: plays N seeded games per emperor through GameController (the same loop game.html runs) with a
// fixed human-like policy, and prints what a player would live through: how long they survive, how often they win,
// what they see each turn (shots, envoys, world news, opaque lines), how volatile the map is. Complements tests/sim.mjs
// (AI-only balance). Usage: node tests/playthrough.mjs [seeds=30] [reasonable|turtle|hothead] [sampleSeed]
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, Engine, world, personas } from './load.mjs';

const require = createRequire(import.meta.url);
const GC = require(path.join(ROOT, 'src/world/game-controller.js'));
const EMPERORS = ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che'];
const RANK = { weak: 0, unknown: 1, medium: 2, strong: 3, very_strong: 4 };
const SEEDS = Number(process.argv[2]) || 30;
const POLICY_NAME = process.argv[3] || 'reasonable';
const SAMPLE_SEED = Number(process.argv[4]) || 1;

// the player's own army as the band words the menu uses for everyone else (data/scenario/intel-rules.json thresholds
// are not read here on purpose: this is a rough player's rule of thumb, not the engine's)
const ownBand = (troops) => (troops < 25000 ? 0 : troops < 45000 ? 2 : troops < 90000 ? 3 : 4);
const weakest = (op) => op.attack.filter((t) => !t.pact).sort((a, b) => RANK[a.intel.troopBand] - RANK[b.intel.troopBand])[0];
const POLICIES = {
  // eat first, hit a neighbour that looks weaker than you, take neutrals, otherwise build
  reasonable(ctrl, s, op) {
    const P = s.player;
    if (P.grain < P.upkeep * 2) return ctrl.decision('internal');
    const t = weakest(op);
    if (t && RANK[t.intel.troopBand] < ownBand(P.troops)) return ctrl.decision('attack', { target: t.pid });
    if (op.diplomacy.annex.length && P.prestige >= 60) return ctrl.decision('diplomacy', { sub: 'annex', target: op.diplomacy.annex[0].pid });
    if (P.loyalty < 50) return ctrl.decision('internal');
    if (s.turn % 3 === 0 && op.fortify.length) return ctrl.decision('fortify', { target: (op.fortify.find((f) => f.seat) || op.fortify[0]).pid });
    return ctrl.decision('internal');
  },
  // never attacks: builds, fortifies, takes neutrals by envoy
  turtle(ctrl, s, op) {
    const P = s.player;
    if (P.grain < P.upkeep * 2) return ctrl.decision('internal');
    if (op.diplomacy.annex.length && P.prestige >= 60) return ctrl.decision('diplomacy', { sub: 'annex', target: op.diplomacy.annex[0].pid });
    if (s.turn % 2 === 0 && op.fortify.length) return ctrl.decision('fortify', { target: (op.fortify.find((f) => f.seat) || op.fortify[0]).pid });
    return ctrl.decision('internal');
  },
  // attacks whenever it can
  hothead(ctrl, s, op) {
    const P = s.player;
    if (P.grain < P.upkeep) return ctrl.decision('internal');
    const t = weakest(op);
    return t ? ctrl.decision('attack', { target: t.pid }) : ctrl.decision('internal');
  },
};
const policy = POLICIES[POLICY_NAME];
if (!policy) throw new Error('policy: ' + Object.keys(POLICIES).join(' | '));

const report = {};
const samples = {};
for (const fid of EMPERORS) {
  const A = (report[fid] = {
    games: 0, wins: 0, dead: 0, deathTurn: [], length: 0, turns: 0, shots: [0, 0, 0], newsEmpty: 0, envoys: 0, envoyTurns: 0,
    attacks: 0, attackWins: 0, weakAttacks: 0, weakLosses: 0, hitTurns: 0, seatHit: 0, opaque: 0, churn: 0, yuFlips: 0,
    firstGain: [], expandTurn: [], twoByT8: 0, provT8: [], provT16: [], maxProv: [], lostProvince: 0, rankEnd: [], alive48: 0, winners: {},
  });
  for (let seed = 1; seed <= SEEDS; seed++) {
    const ctrl = GC.create({ Engine, world, personas, seed });
    ctrl.start(fid);
    A.games++;
    let prev = 1, first = null, expand = null, max = 1, lost = false, deadAt = null;
    const lines = [];
    while (!ctrl.status().over) {
      const s = ctrl.status(), op = ctrl.options();
      const d = s.player.alive && op ? policy(ctrl, s, op) : null;
      const e = ctrl.resolve(d, () => 'accept'); // every envoy accepted: the most eventful answer
      ctrl.finish();
      if (!s.player.alive) continue; // spectating after death is not "playing"
      const V = e.observation.visibleEvents, N = e.observation.publicNews, P = e.presentation;
      A.turns++;
      A.shots[Math.min(2, P.shots.length)]++;
      if (!N.length) A.newsEmpty++;
      const env = Object.keys(e.answers).length; A.envoys += env; if (env) A.envoyTurns++;
      A.churn += N.filter((n) => n.kind === 'ownership').length;
      A.yuFlips += N.filter((n) => n.kind === 'ownership' && n.prov === 'yu').length;
      A.opaque += V.filter((v) => (v.textKey === 'own_event' || v.textKey === 'target_event') && !v.prov).length;
      if (V.some((v) => v.textKey === 'province_attacked')) A.hitTurns++;
      if (V.some((v) => v.textKey === 'province_attacked' && v.to === s.player.seat)) A.seatHit++;
      if (d && d.action === 'attack') {
        A.attacks++;
        const won = V.some((v) => v.textKey === 'own_attack_win');
        if (won) A.attackWins++;
        const t = op.attack.find((x) => x.pid === d.target);
        if (t && t.intel.troopBand === 'weak') { A.weakAttacks++; if (V.some((v) => v.textKey === 'own_attack_loss')) A.weakLosses++; }
      }
      const s2 = ctrl.status(), prov = s2.player.provinces.length;
      if (prov > prev && first == null) { first = e.turn; A.firstGain.push(e.turn); }
      if (prov >= 2 && expand == null) { expand = e.turn; A.expandTurn.push(e.turn); }
      if (prov < prev) lost = true;
      max = Math.max(max, prov); prev = prov;
      if (e.turn === 8) { A.provT8.push(prov); if (prov >= 2) A.twoByT8++; }
      if (e.turn === 16) A.provT16.push(prov);
      if (!s2.player.alive && deadAt == null) deadAt = e.turn;
      if (seed === SAMPLE_SEED && e.turn <= 12) {
        lines.push(`L${e.turn} ${e.calendar.season} ${e.calendar.year} · lệnh ${d ? d.action + (d.target ? ' → ' + d.target : '') : '-'}`);
        lines.push(`   thấy: ${P.items.map((i) => i.text).join(' / ') || '(không có gì)'}`);
        lines.push(`   tin:  ${P.news ? P.news.items.map((n) => n.text).join(' / ') : '(trống)'}`);
        lines.push(`   sau lượt: quân ${Math.round(s2.player.troops)} · lương ${Math.round(s2.player.grain)} · châu ${prov}${s2.player.alive ? '' : ' · DIỆT VONG'}`);
      }
    }
    const end = ctrl.status();
    A.length += end.turn;
    if (end.winner) { A.winners[end.winner.fid] = (A.winners[end.winner.fid] || 0) + 1; if (end.winner.fid === fid) A.wins++; }
    if (!end.player.alive) { A.dead++; A.deathTurn.push(deadAt || end.turn); } else if (end.turn >= end.maxTurns) A.alive48++;
    A.maxProv.push(max);
    if (lost) A.lostProvince++;
    A.rankEnd.push(end.factions.findIndex((f) => f.fid === fid) + 1);
    if (seed === SAMPLE_SEED) samples[fid] = lines;
  }
}

const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '-');
console.log(`policy ${POLICY_NAME} · ${SEEDS} seeds per emperor`);
for (const fid of EMPERORS) {
  const A = report[fid];
  console.log(`\n== ${fid} ==`);
  console.log(`win ${pct(A.wins, A.games)} · dead ${pct(A.dead, A.games)} (death turn avg ${avg(A.deathTurn)}) · alive at the last turn ${pct(A.alive48, A.games)} · end rank avg ${avg(A.rankEnd)} of 7 · game length avg ${(A.length / A.games).toFixed(1)}`);
  console.log(`turns played ${A.turns} · shots per turn 0/1/2: ${pct(A.shots[0], A.turns)}/${pct(A.shots[1], A.turns)}/${pct(A.shots[2], A.turns)} · world news empty ${pct(A.newsEmpty, A.turns)} · envoy cards ${A.envoys} (${pct(A.envoyTurns, A.turns)} of turns)`);
  console.log(`attacks ${A.attacks}, won ${pct(A.attackWins, A.attacks)} · attacks on a "weak" province ${A.weakAttacks}, lost ${pct(A.weakLosses, A.weakAttacks)} · attacked in ${pct(A.hitTurns, A.turns)} of turns (own seat ${pct(A.seatHit, A.turns)})`);
  console.log(`first province gained: turn ${avg(A.firstGain)} (${A.firstGain.length}/${A.games} games) · 2 provinces by turn 8: ${pct(A.twoByT8, A.games)} · provinces at turn 8 / 16: ${avg(A.provT8)} / ${avg(A.provT16)} · most held ${avg(A.maxProv)} · lost a province ${pct(A.lostProvince, A.games)}`);
  console.log(`map changes per turn ${(A.churn / Math.max(1, A.turns)).toFixed(2)} · Hứa Xương changed hands ${(A.yuFlips / A.games).toFixed(1)} times per game · opaque "Biến cố trong nước" lines ${(A.opaque / A.games).toFixed(1)} per game · winners ${JSON.stringify(A.winners)}`);
}
console.log(`\n== what the player reads, seed ${SAMPLE_SEED}, first 12 turns ==`);
for (const fid of EMPERORS) { console.log(`\n-- ${fid}`); for (const l of samples[fid] || []) console.log(l); }
