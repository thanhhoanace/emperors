// Shared loader so tests, the balance report and the server read the same data.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const Engine = require(path.join(ROOT, 'src/engine/engine.js'));
export const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/world.json'), 'utf8'));
export const personas = Object.fromEntries(
  world.factions.map((f) => [f.id, JSON.parse(fs.readFileSync(path.join(ROOT, `data/personas/${f.id}.json`), 'utf8'))])
);
export const newGame = (seed) => Engine.createGame(world, personas, seed);
