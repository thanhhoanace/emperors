// Shared loader so tests, the balance report and the server read the same data.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const Engine = require(path.join(ROOT, 'src/engine/perception.js'))(
  require(path.join(ROOT, 'src/engine/attach-219.js'))(
    require(path.join(ROOT, 'src/engine/engine.js'))
  )
);

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export const world = readJson('data/world.json');
world.gatesPack = readJson('data/scenario/gates.json');
world.charactersPack = readJson('data/scenario/characters.json');
world.intelRules = readJson('data/scenario/intel-rules.json');

export const personas = Object.fromEntries(
  world.factions.map((f) => [f.id, readJson(`data/personas/${f.id}.json`)])
);
export const newGame = (seed) => Engine.createGame(world, personas, seed);
