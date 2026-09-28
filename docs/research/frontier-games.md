# Frontier Games catalog: references for our graphics

Agent report, 2026-09-28, kept as written. Catalog: github.com/theolundqvist/frontier-games (127 games made by Claude Opus 5.5 and GPT-6 Astra). Synthesis: [`graphics-refs.md`](graphics-refs.md). Cloned repos were read in the session scratchpad and are not in this repo; only MIT-licensed code may be reused.


Source: `/home/user/theolundqvist/frontier-games/data/games.yaml` (127 games, 59 films). There is no platform field. Mobile or desktop notes sit in free-text `controls` ("Desktop only", "Touch, best on a phone in portrait"). `ratings.yaml` holds a model-rated visuals score. Clones are in `refs/<name>/`.
Tags: **[code]** = I checked it in the source. **[claim]** = the README, brief or catalog says it and I did not check it.

## (a) Shortlist

| Entry | Model | Genre | Engine | Mobile | Source / license | Why it matters |
|---|---|---|---|---|---|---|
| Voxel Musou | Opus 5.5 | Three Kingdoms musou, 300 soldiers | three r186, ES modules, no build | "desktop GPU recommended", no touch [code] | repo **MIT** | Our era. Instanced crowd, DoF and bloom |
| Operation Tidewater (+ Chrono City, Fall Line) | Opus 5.5 | Voxel war diorama on a plinth | three r186 + pmndrs postprocessing | Desktop 1080p target, no touch [code] | repo, **no license** | Closest to dat.city: tabletop slab, tilt-shift, living units |
| The Free Game | GPT-6 Astra | 3D tabletop village builder | Godot 4.7 web export | "mobile … needs dedicated work" [claim] | **MIT code, CC BY art** | Strategy on a diorama. Sim/view split, fixed-step clock |
| Tidewater (dgreenheck) | Opus 5.5 | Island fishing | Custom WebGPU/WGSL (ported from three) | Desktop, M5 Pro target | repo **MIT** | Visuals 9. LOD, impostors, code-baked textures |
| Slide Rush | Opus 5.5 | Waterslide racer | three 0.186, PWA | **Mobile-first** [code] | repo, **no license** | The only three.js entry with real mobile tiers |
| Sprout Quest | Opus 5.5 | Mobile RPG | Canvas 2D + sprites rendered in Blender | **Phone** [code] | repo, **no license** | Blender driven by script, then a 1.6 MB atlas |
| Turbo Kart Rally | Opus 5.5 | Kart racer | three, no build | Desktop [claim] | repo **MIT** | Every mesh, texture and sound in code. 5 sub-agents under an ARCHITECTURE contract |
| Gogh Strike | GPT-6 Astra | 6v6 FPS | three + GLBs from Blender scripts | "touch not implemented" [claim] | repo **MIT** | Blender pipeline to GLB, but a 36 MB download |
| Wilderland / Fogbound Frontier | Astra / Opus | RTS | **Canvas 2D** (the catalog says WebGL for Wilderland) [code] | Mouse | page / gist | Fog of war on an offscreen canvas |
| Catan-style board | GPT-6 Astra | Board strategy, AI players | three | Watch-only | none | Animated pieces on a board, like our turn map |
| Lagoon Tree Village, Kaiju Sim | Opus 5.5 | Procedural world / city | three WebGL2 / TSL | Desktop | none | Visuals 9 and 8, built from concept art over 3.5–7 h agent runs [claim] |

Eight entries mention touch. None is a strategy game or a diorama. Every high-visual 3D entry is desktop-only.

## (b) Cloned repos

**overnight-builds** (minified bundles + `briefs/`, no license)
- The tabletop recipe, in `briefs/tidewater-model-readme.md` [claim]:
  - noise voxel volume, face-culled, with per-vertex AO;
  - per-voxel colour jitter computed in the shader;
  - static buildings merged into one draw call;
  - bloom "only for truly hot sources".
- DPR is capped at **1**. The shadow map uses `autoUpdate=false` and refreshes every other frame during the tour (`tidewater/assets/index-*.js`) [code].
- The performance guard steps down with cooldowns [code]:
  - AO off below 55 fps;
  - render scale down to 0.72 below 47 fps;
  - MSAA 4→2→0 below 42 fps;
  - restores above 58.5 fps. `?fixedres` pins full quality.
- Tilt-shift uses pmndrs `TiltShiftEffect` at half resolution, behind `?tilt` [code]. Fall Line uses dynamic DPR from 0.6 to 1.5 [code].
- The process was the key. The brief gave a `look` tool that returns screenshots, fps, worst 1% frame time and draw calls. The model ran passes that each fixed "the three weakest things a viewer would notice first" (`briefs/tidewater-prompt-as-sent.md` L49–58) [code].

**voxel-musou** (MIT)
- `src/crowd/view.js`: each soldier is a small bone hierarchy. Each body part is **one InstancedMesh shared by all soldiers**, with `instanceColor` and a per-instance `aHit` flash. `count` is repacked every frame to the frustum-visible soldiers only [code].
- LOD keeps the same matrices at three levels [code]:
  - full voxels up to 8 m (about 4.9k tris);
  - re-voxelised at twice the size up to 28 m (about 1.2k tris);
  - then plain boxes.
- Box proxies cast the shadows. `onBeforeRender` sets their drawRange to 0, so they cost nothing in the main pass (L384–391) [code].
- `src/core/voxel.js` `boxesGeometry()`: coloured boxes are merged into vertex-colour geometry, with no textures or GLBs [code].
- `src/post/post.js`, the post chain [code]:
  - HDR 4× MSAA scene target with a depth texture;
  - haze;
  - half-res square-bokeh DoF focused on the hero;
  - bloom above 1.5 HDR;
  - Lottes tone curve.
- The grade is **tuned to numbers measured from the concept image**: luma mean ≈0.36, p5 ≤0.08, p95 ≥0.78, saturation ≈0.33 (L20–23) [code].
- Quality tier: frames over 20 ms for 2 s step MSAA 4→2→0, and it never steps back up. There is no DPR call, so the ratio stays at 1 [code].
- Shaders are compiled behind the loading card into the real target. Before that, a crowd shown for the first time stalled the battle (L273–279) [code].

**tidewater** (MIT)
- `src/world/vegetation/InstanceLOD.js`: the near set is refilled only after the camera moves. The vertex shader makes the exact near/far split [code].
- `Impostors.js`: octahedral impostors are baked at startup [code].
- `src/materials/LODFade.js`: a Bayer 4×4 screen-door crossfade, so LOD changes never pop [code].
- `src/world/village/TextureBaker.js` and `terrain/TerrainBake.js`: textures, AO and splat maps are generated in code. `Buildings.js` builds parametric buildings [code].
- The README claims dynamic resolution. In the code the render scale is **manual only** (`src/App.js` L704), and the canvas ignores DPR (`src/engine/Engine.js`) [code].

**slide-rush** (no license, read only)
- `src/core/quality.js`: low, medium and high presets that set max and min DPR, shadow map size (512/1024/2048), decor density and particles. Auto mode picks medium on touch, caps DPR at 1.5 and adapts it between 0.85 and 1.5 from a 60-frame average [code].
- `src/core/storage.js`: touch is detected by `(pointer: coarse)` or `ontouchstart`, and **shadows are off by default on mobile** [code].
- `src/render/Crowd.js`: 13 primitive humanoids in about 6 draw calls, with MeshToon and **instanced blob shadows** [code].
- Post is one optional pass, **off by default**. `visibilitychange` pauses the game. There is **no context-loss handler** [code].

**sprout-quest** (no license, read only)
- `art/lib.py` and `build.sh`: headless Blender builds models from code, with toon materials and inverted-hull outlines. A fixed 30° orthographic camera renders them, and the output is packed into `public/assets/atlas-*.webp` [code].
- Mobile shell: DPR capped at 2 (`src/main.ts:24`), `touch-action:none`, safe-area insets, a PWA manifest, audio unlocked on the first tap, and a `visibilitychange` pause [code].
- The loop: a human plays on a phone and reports, and an exported play report goes back to the model for balance tuning [claim].

## (c) Takeaways for our game (three r146, classic scripts, phones)

1. **The dat.city look comes from technique, not assets.** The ingredients are vertex-colour geometry built in code, per-vertex AO, a restrained palette, bloom only on HDR hot spots, and haze with distance. Tilt-shift or DoF is a separate optional pass.
2. **None of the beautiful entries runs on phones.** Copy Slide Rush's pattern: DPR ≤1–1.5, touch means the medium tier, blob shadows under figurines, post off by default. Also add a `webglcontextlost` handler; no entry has one.
3. **Instance figurines by body part or by unit type, and repack `count` every frame.** Build LOD by re-voxelising coarser, and cast shadows from box proxies. r146 supports all of this: `InstancedMesh.count`, `instanceColor`, and `samples` on render targets. Use `BufferGeometryUtils.mergeBufferGeometries` (renamed `mergeGeometries` in r151). Check that r146's shadow pass skips `onBeforeRender` before copying the proxy trick.
4. **Degrade in steps with cooldowns.** Drop AO or DoF first, then render scale, then MSAA. On phones, never step back up. Use a URL flag (`?hq`) to pin quality for clips.
5. **Pre-compile shaders behind the loading screen, into the real target.** Otherwise a unit type seen for the first time stalls the battle.
6. **Hold the look to numbers.** Measure luma and saturation stats from the approved render in `docs/design/prototypes/` and tune the grade to them. Add a `look`-style capture of screenshots, fps, worst 1% frame time and draw calls to verify.
7. **Bake rich art offline.** Scripted Blender can produce a WebP figurine atlas or small GLBs. Watch the download size (Gogh Strike is 36 MB). For a fixed-pitch map camera, sprites or impostors make a cheap phone LOD.
8. **Only MIT code can be reused:** Voxel Musou, Tidewater, Turbo Kart, Gogh Strike, and The Free Game code (its art is CC BY and needs credit). Overnight-builds, Slide Rush and Sprout Quest are ideas only.
