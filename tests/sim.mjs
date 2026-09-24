// Balance report: plays N seeded games headless and prints who wins and how fast.
// Usage: npm run sim -- 500
import { Engine, newGame } from './load.mjs';

const N = Number(process.argv[2] || 300);
const wins = {};
const kinds = {};
const lengths = [];
for (let seed = 1; seed <= N; seed++) {
  const g = newGame(seed);
  while (!g.state.over) Engine.playTurn(g);
  const w = g.state.winner;
  wins[w.fid] = (wins[w.fid] || 0) + 1;
  kinds[w.kind] = (kinds[w.kind] || 0) + 1;
  lengths.push(g.state.turn);
}
lengths.sort((a, b) => a - b);
const pct = (n) => ((100 * n) / N).toFixed(1) + '%';
console.log(`games: ${N}`);
console.log('winners:', Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
console.log('kinds:', Object.entries(kinds).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
console.log(`turns: min ${lengths[0]} · median ${lengths[N >> 1]} · p90 ${lengths[Math.floor(N * 0.9)]} · max ${lengths[N - 1]}`);
