const S = require('./rules.js');
function policy(g) {
  const me = g.player, F = g.fac[me], mine = S.own(g, me);
  let best = null;
  const froms = F.exile ? ['exile'] : mine;
  for (const p of froms) {
    const avail = p === 'exile' ? F.exile.troops : g.prov[p].troops;
    const nbs = p === 'exile' ? [F.exile.near].concat(S.PD[F.exile.near].nb) : S.PD[p].nb;
    for (const q of nbs) {
      if (S.canAttack(g, me, p, q)) continue;
      const o = g.prov[q].owner;
      if (o !== 'neutral' && S.truceBlocks(g, me, o, q)) continue;
      const commit = p === 'exile' ? avail : Math.max(1, Math.round(avail * 0.7));
      const e = S.estimate(g, me, p, q, commit);
      const rank = { 'Chắc thắng': 3, 'Có lợi': 2, 'Ngang': 1, 'Bất lợi': 0, 'Mù': -1 }[e.label];
      if (rank >= 2 && (!best || rank > best.rank)) best = { from: p, to: q, commit, rank };
    }
  }
  let order = { type: 'internal' };
  if (best) order = { type: 'attack', from: best.from, to: best.to, commit: best.commit };
  else {
    const nAdj = []; mine.forEach(p => S.PD[p].nb.forEach(q => { if (g.prov[q].owner === 'neutral') nAdj.push(q); }));
    const unk = []; mine.forEach(p => S.PD[p].nb.forEach(q => { if (g.prov[q].owner !== me && S.intel(g, me, q).level === 'seen') unk.push(q); }));
    if (nAdj.length && Math.random() < 0.5) order = { type: 'annex', target: nAdj[0] };
    else if (unk.length && Math.random() < 0.25) order = { type: 'scout', target: unk[0] };
  }
  let side = null;
  const threat = (p) => { let t = 0; S.PD[p].nb.forEach(q => { const o = g.prov[q].owner; if (o !== me && o !== 'neutral' && !S.allied(g, me, o)) t += g.prov[q].troops; }); return t; };
  const ranked = mine.slice().sort((a, b) => threat(b) - g.prov[b].troops - (threat(a) - g.prov[a].troops));
  for (const p of ranked) {
    const opts = S.sideOptions(g, me, p).filter(o => !o.why), k = (x) => opts.find(o => o.kind === x || o.kind.startsWith(x));
    const hot = threat(p) > g.prov[p].troops * 1.2 && g.turn >= 6;
    const pick = k('trade:') || (hot && g.prov[p].fort < 2 && k('fortify')) || (me === 'liu_che' && k('rimrec:')) || (g.prov[p].tier < 2 && k('cultivate')) || k('recruit') || k('rimrec:') || k('cultivate') || k('fortify');
    if (pick) { side = { kind: pick.kind, p }; break; }
  }
  return { order, side };
}
const N = Number(process.argv[2]) || 200;
for (const fid of ['qin_shihuang', 'li_shimin', 'zhu_yuanzhang', 'liu_che']) {
  let win = 0, dead = 0, exiled = 0, turns = 0, maxP = 0, flips = 0, turnsPlayed = 0, battles = 0, early = 0;
  for (let s = 1; s <= N; s++) {
    let g = S.newGame(fid, s * 7919);
    while (!g.over) {
      const pl = policy(g); const before = {}; Object.keys(S.PD).forEach(p => before[p] = g.prov[p].owner);
      const r = S.resolve(g, pl.order, pl.side); g = r.g; turnsPlayed++;
      battles += r.report.battles.length;
      Object.keys(S.PD).forEach(p => { if (before[p] !== g.prov[p].owner) flips++; });
      if (g.fac[fid].exile) exiled++;
      maxP = Math.max(maxP, S.own(g, fid).length);
    }
    if (g.over.win) win++; else if (!g.fac[fid].alive) { dead++; if (g.turn <= 17) early++; }
    turns += g.turn - 1;
  }
  console.log(fid.padEnd(14), 'win', (100 * win / N).toFixed(0) + '%', 'dead', (100 * dead / N).toFixed(0) + '%', 'dead≤16', (100*early/N).toFixed(0)+'%', 'avg turns', (turns / N).toFixed(1), 'flips/turn', (flips / turnsPlayed).toFixed(2), 'player battles/turn', (battles / turnsPlayed).toFixed(2), 'exile-turns', exiled);
}
