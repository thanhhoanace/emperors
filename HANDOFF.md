# TAM QUOC LOAN NHAP - HANDOFF

**Project:** Three Kingdoms multi-agent simulation  
**Location:** `/Users/hoannt1/1-Projects/2.claw/emperors/`  
**Last Updated:** 2026-06-15  
**Current Focus:** Visual map restyle toward a Civ-like 3D strategy map  
**Status:** Ready for another worker to continue visual polish

---

## Current State

The app is a single-page Three.js frontend backed by a Node/Express/WebSocket simulation server.

- `index.html` contains the 3D scene, map data, visual layer, UI, and WebSocket client.
- `scripts/server.js` runs the live tick simulation and serves static files.
- Local CC0 assets now live under `assets/`.
- Main browser target should be `http://localhost:3000/`. Avoid `file://` because asset loading can fail or behave differently.

Recent visual work changed the map from crude procedural props toward local asset/procedural terrain:

- Added local asset manifest and loader:
  - `assets/manifest.json`
  - `assets/models/nature/`
  - `assets/models/roads/`
  - `assets/textures/terrain/`
  - `assets/textures/water/`
  - `assets/SOURCE.md`
- Imported `GLTFLoader` and `SkeletonUtils.clone` in `index.html`.
- Added `AssetManager` with model/texture cache and fallback behavior.
- Changed terrain textures to local SVG textures.
- Changed trees/brush/bamboo to local GLB clones.
- Reduced tree scale after user feedback because trees were larger than citadels.
- Expanded map scale to reduce density:
  - `MAP_SCALE = 30`
  - `FEATURE_SCALE = 16`
- Increased terrain relief:
  - `TERRAIN_HEIGHT_MULT = 1.75`
- Replaced standalone mountain rock assets with procedural mountain ranges:
  - `MOUNTAINS` path data now drives clusters of multiple cone peaks.
  - Each range has ridge underlay and snow caps.
  - This was done because Kenney rock assets looked like isolated props, not Civ-like terrain ranges.
- Reduced fog and increased terrain color saturation.
- Adjusted lighting so mountains read better without returning to heavy shadow artifacts.
- Lowered citadel wall/tower proportions and fixed battlement coordinate placement because wall segments were showing as large rectangular placeholder blocks.

---

## Important User Feedback

The user is judging this visually in the browser. Main complaints so far:

1. Mountain assets looked ugly and did not represent mountain ranges.
2. Map density was too high.
3. Trees were too large compared with citadels.
4. Terrain colors were too washed out.
5. Rectangular blocks near routes/citadels looked like unfinished placeholders.
6. The target style is at least close to Civilization VI: readable terrain bands, clear mountain ranges, smaller forest clusters, visible roads/rivers, saturated map colors.

The last direct ask before this handoff was to update documentation so another worker can continue.

---

## Key Files

```text
emperors/
├── index.html
├── scripts/
│   ├── server.js
│   └── simulation.js
├── assets/
│   ├── manifest.json
│   ├── SOURCE.md
│   ├── licenses/
│   ├── models/
│   └── textures/
├── images/
│   ├── image.png
│   ├── image copy.png
│   ├── image copy 2.png
│   ├── image copy 3.png
│   ├── image copy 4.png
│   └── image copy 5.png
├── package.json
├── DESIGN-DOCUMENT.md
└── HANDOFF.md
```

`images/` contains the visual references the user wants to approximate. They are Civ-like terrain/map references. Treat them as visual guidance only; do not copy proprietary assets.

---

## How To Run

```bash
cd /Users/hoannt1/1-Projects/2.claw/emperors
npm start
```

Open:

```text
http://localhost:3000/
```

Use hard refresh after visual changes:

```text
Cmd+Shift+R
```

Browser cache has repeatedly caused stale visuals.

---

## Validation Commands

There is no `make verify` target in this repo as of 2026-06-15.

Use these checks after frontend edits:

```bash
node --input-type=module - <<'NODE'
const fs = await import('node:fs/promises');
const html = await fs.readFile('index.html', 'utf8');
const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(m => m[1]);
await fs.writeFile('/tmp/emperors-index-check.mjs', scripts.join('\n'));
NODE
node --check /tmp/emperors-index-check.mjs
```

```bash
node --input-type=module - <<'NODE'
import fs from 'node:fs/promises';
import path from 'node:path';
const manifest = JSON.parse(await fs.readFile('assets/manifest.json', 'utf8'));
const missing = [];
for (const section of ['models', 'textures']) {
  for (const [id, entry] of Object.entries(manifest[section] || {})) {
    try { await fs.access(path.join(process.cwd(), entry.path)); }
    catch { missing.push(`${section}.${id}: ${entry.path}`); }
  }
}
if (missing.length) {
  console.error('missing assets:\n' + missing.join('\n'));
  process.exit(1);
}
console.log(`manifest ok: ${Object.keys(manifest.models || {}).length} models, ${Object.keys(manifest.textures || {}).length} textures`);
NODE
```

```bash
curl -I --max-time 3 http://localhost:3000/
curl -I --max-time 3 http://localhost:3000/assets/manifest.json
```

Manual browser checks:

- Open `http://localhost:3000/`.
- Hard refresh.
- Zoom in/out around Thuc Dao, Qinling, Daba, Wushan, Luoyang, Chengdu.
- Confirm trees are smaller than citadels.
- Confirm mountains read as continuous ranges, not standalone rocks.
- Confirm rectangular wall blocks are less prominent.
- Confirm roads/rivers remain visible.
- Confirm console has no `404`, GLTF parse error, or syntax error.

---

## Known Limitations

- The current mountain range implementation is procedural cone geometry. It is better than isolated rock props but still not as rich as Civ VI terrain.
- Citadels are still procedural. There is no bundled high-quality Chinese citadel/city GLB yet.
- Trees are GLB clones, not instanced meshes, so keep counts conservative.
- The selected blue rectangle seen in user screenshots is the browser comment overlay, not app rendering.
- In-app Browser automation tools were not exposed in the last working turn, so visual verification was limited to local HTTP/static checks plus user screenshots.
- Harness commands are inconsistent in this folder:
  - `ezh-status` was not available in PATH from `emperors/`.
  - `make verify` has no target.
  - Related harness helper files appear under sibling `../claw-infra/`, not directly in this project.

---

## Asset Policy

Current local assets are CC0 from Kenney. See `assets/SOURCE.md`.

Do not use or extract assets from Civilization or any commercial game.

Recommended next asset direction:

- Keep Kenney for quick legal fallback.
- Consider Quaternius CC0 stylized nature/building packs for a better Civ-like low-poly look.
- If replacing assets, prefer `.glb`/`.gltf` directly.
- If a pack only provides `.fbx`/`.obj`, convert to `.glb` in a repeatable step and document it.
- Always add source/license notes to `assets/SOURCE.md` and a local license file under `assets/licenses/`.

---

## Suggested Next Worker Tasks

1. **Visual QA pass in browser**
   - Use the current screenshot feedback as acceptance criteria.
   - Focus around Thuc Dao, Qinling, Chengdu, Luoyang.

2. **Improve mountain ranges**
   - Current procedural peaks should be tuned for Civ-like ridges.
   - Add more natural silhouettes: varied peak count, flatter foothills, ridge shoulder color, snow only on high ranges.
   - Keep ranges driven by `MOUNTAINS`; do not place independent rock props.

3. **Replace citadel placeholder geometry**
   - Procedural citadels are still visually crude.
   - Either source CC0 Chinese/Asian architecture GLBs or create better local procedural pagoda/city clusters.
   - Avoid tall rectangular wall slabs.

4. **Improve roads and rivers**
   - Roads are visible but still broad/ribbon-like.
   - Rivers need better shore blending and should sit naturally in terrain channels.

5. **Tune labels and density**
   - Map scale is larger now, but labels can still overlap.
   - Consider distance-based label visibility or priority tiers.

6. **Performance check**
   - Tree GLB clone count is intentionally conservative.
   - If adding more assets, measure FPS by zooming out and panning.

---

## Do Not Change Without Need

- Simulation schema and server protocol.
- `PROVINCES`, `RIVERS`, `MOUNTAINS`, `CITADELS`, faction ids, and gameplay fields unless the task explicitly asks for data changes.
- The app is intentionally still a single `index.html` for now. Do not introduce a bundler unless the user approves a larger refactor.

