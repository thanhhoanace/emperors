/**
 * Tam Quốc Loạn Nhập — local server.
 *
 * The game runs fully in the browser (GitHub Pages has no backend), so this
 * server only does two things:
 *   1. serve the repo as static files (http://localhost:3000)
 *   2. POST /api/turn — play one turn server-side with the same engine.
 *      Today the agents are the MOCK decision rules in src/engine/engine.js.
 *      This is the seam where LLM agents plug in later (see docs/architecture.md).
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const Engine = require(path.join(ROOT, 'src/engine/engine.js'));
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/world.json'), 'utf8'));
const personas = Object.fromEntries(
  world.factions.map((f) => [f.id, JSON.parse(fs.readFileSync(path.join(ROOT, `data/personas/${f.id}.json`), 'utf8'))])
);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(ROOT, { dotfiles: 'ignore', index: 'index.html' }));

// Body: { seed } to start a game, or { state } to continue one.
// Reply: { mode, decisions, result, state }
app.post('/api/turn', (req, res) => {
  try {
    const { seed, state } = req.body || {};
    const game = state ? Engine.restoreGame(world, personas, state) : Engine.createGame(world, personas, Number(seed) || Date.now());
    if (game.state.over) return res.status(409).json({ error: 'game is over', winner: game.state.winner });
    const decisions = Engine.decideAll(game);
    const result = Engine.resolveTurn(game, decisions);
    res.json({ mode: 'mock', decisions, result, state: game.state });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Tam Quốc Loạn Nhập → http://localhost:${PORT}`));
