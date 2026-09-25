# dat.city: how it renders and loads (teardown of the shipped bundle)

Source: the production bundle of https://dat.city (Astro + Vite, 22 minified chunks), read after pretty-printing, plus three headless runs against a local mirror. Minified names are mapped back to three.js classes through the export table of `config.*.js`. Code quotes are short and shown in de-minified form. Nothing here is copied into our project. It is an explanation of the *techniques*.

Files: `scratchpad/datcity/js/*` (raw), `scratchpad/pretty/*` (prettier output), `scratchpad/research/importmap.json` (alias → three class per chunk), `scratchpad/mirror/` (local mirror used for the headless run).

## TL;DR: why it looks good and stays light

- **The world is generated in the browser from about 32 KB of JSON** embedded in `index.html`: districts, positions, routes and land polygons. There are no models, no texture downloads for the 3D world, and no heightmaps. Per-district data (5–59 KB JSON each, about 150 KB gzip for all 65) streams in afterwards, two requests at a time, and the city builds even when a request fails.
- **A few dozen unit primitives, instanced everywhere.** Every tower is kit-bashed from shared unit boxes, cylinders, chamfers, domes, "shards" and so on. Each is one `InstancedMesh` per primitive × material, with per-instance colour. Trees, cars, lamps, city blocks, mountains, piers and clouds are all instanced too. Pools are pre-allocated with `count = 0` and grow as content arrives. three skips `count === 0` draws. There is **no frustum culling** (`frustumCulled = false` everywhere): the fully built world is submitted every frame, about 760–830 calls and 2.8–3.1 M triangles at "high" (shadow frames: about 1,000–1,090 calls and 4.5–4.9 M).
- **Detail lives in shaders, not triangles.** Windows are procedural in world units with `fwidth` fade, so they cost 0 extra vertices. Fake AO is a height ramp on walls and a baked vertex-colour gradient. Night light is a "cove wash" in `emissive`. The water is one plane with a big procedural shader. The sky is one sphere with a gradient shader. Canopies have 20 triangles.
- **Flat-shaded `MeshStandardMaterial` + vertex/instance colours, a bright saturated palette, a 25° telephoto camera, DOF that scales with zoom, mipmap bloom, SMAA + MSAA and a light vignette.** This is where the "toy diorama" look comes from.
- **Aggressive runtime scaling:** four quality tiers, coarse-pointer devices start at "medium", and an automatic downgrade after two consecutive 100-frame windows over 31 ms (36 ms on "medium"). Shadows render every other frame, and the shadow frustum follows the focus point and fades out when zoomed out.
- **Perceived speed:** a tiny "wire" boot scene draws on the first frame while the ~580 KB gzip app chunk downloads. After that, a reveal ring expands from the focus district, gated by how far the builder has actually got. The build runs in time-sliced generators (≤ 5 ms/frame). Returning visitors get a 2.2× faster ring.

---

## 1. Renderer setup

Main renderer (`data-city.*.js`, fn `Pl`):

```js
D = new WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false });
D.outputColorSpace = SRGBColorSpace;
D.toneMapping = ACESFilmicToneMapping;
D.toneMappingExposure = 1.08;          // then driven per time of day (0.98–1.08; 1.28 in data view)
D.info.autoReset = false;              // info.reset() right before the frame's render → stats = 1 frame
```

- **No logarithmic depth.** Instead, the camera uses `near = 4, far = max(3400, distanceMax*3.2)` with FOV 25°, which keeps depth precision fine. Z-fighting between flat layers is avoided with an explicit Y-layer table (`config`: `water 0, road .07, roadLane .12, plaza .05, buildingBase .02, contactShadow .035, selection .16, islandTop 3.1`) plus `polygonOffset(-2,-2)` on overlay materials (urban-fabric detail, island overlays).
- **Antialiasing** comes from the post chain: the composer is created with `multisampling` per tier (8/4/0), plus an SMAA effect. `antialias:false` on the context, because the canvas itself is never drawn to directly when post is on.
- **Pixel ratio:** `setPixelRatio(Math.min(devicePixelRatio, tier.dpr))`, with tier dpr = 2 / 1.1 / 1 / 0.85 (see §2). Note: "high" is only 1.1, so even on a retina laptop the default is roughly 1× resolution. The boot renderer caps at `min(2, dpr)`.
- **Tone mapping caveat:** three applies `renderer.toneMapping` only when rendering to the screen (verified in the r180 code: `b.toneMapped && (rt===null || rt.isXRRenderTarget) && (tm = r.toneMapping)`). With post-processing on (every tier except "low"), the scene renders into a HalfFloat target and the pmndrs `EffectMaterial` has `toneMapped:false`, so **ACES is effectively off in the post path**. A `ToneMappingEffect(ACES)` is added only with `?tonemap=1`. The palette is authored for "linear → sRGB, clipped", and bloom (threshold 0.74) takes care of the highlights.
- **Shadows** (`Oe()` applies a tier):

```js
D.shadowMap.type = PCFSoftShadowMap;
D.shadowMap.enabled = !dataView && !!tier.shadows;   // only ultra/high
D.shadowMap.autoUpdate = false;
...
// render loop:
D.shadowMap.enabled && frame % 2 === 0 && (D.shadowMap.needsUpdate = true);   // shadows at half rate
```

  The sun (`DirectionalLight`) has a 2048² map by default (slider 512–4096, snapped to 256), `bias -6e-4` and `normalBias 0.9`. **Fitting:** the light is re-positioned every frame at `focus + sunDir*420`, targeting the focus point. The ortho frustum half-size is `max(190, cameraDistance*1.15)`, `far = max(980, 420 + r*1.6)` (r = that half-size), and `normalBias` scales with `r/190`. Shadow **intensity fades to 0** between `distanceOverview*1.25` and `max(that+160, distanceMax*0.95)` (`light.shadow.intensity`, an r15x+ feature), and `castShadow` switches off when the fade reaches 0. The result is that shadows exist only around what you are looking at, and the overview has none.
- **Environment map:** only the glass material gets one. It is a procedural "room" (a box with emissive panels, like `RoomEnvironment`) run through `PMREMGenerator.fromScene(room, 0.035)`. It is **deferred with `requestIdleCallback(…, {timeout:500})`** and faded in over 700 ms. `scene.environment` is never set.

## 2. Quality tiers

Preset table (`config.*.js`, `$y`, imported as `Ya`):

| tier | dpr cap | bloom | DOF | tiltShift | SMAA | shadows | AO (N8AO) | MSAA |
|---|---|---|---|---|---|---|---|---|
| ultra | 2 | ✓ | ✓ | – | ✓ | ✓ | ✓ | 8 |
| high | 1.1 | ✓ | ✓ | – | ✓ | ✓ | – | 4 |
| medium | 1 | ✓ | – | – | – | – | – | 0 |
| low | 0.85 | – | – | – | – | – | – | 0 |

`fi(tier, shadowMapSize, overrides)` merges: post defaults (`bloomIntensity .92, bloomThreshold .74, bloomSmoothing .22, bloomRadius .72, dofBokehMin 1.6, dofBokehMax 8, dofHeight 500, dofFocusScale 1.15, dofRangeFar 1.5, dofRangeNear 2, vignetteDarkness .3, vignetteOffset .26, aoRadius 8, aoIntensity 1.35`), then `fakeAoHeight 10, fakeAoStrength .5, nightWashHeight 9, nightWashStrength .7`, then the tier row, then user overrides. Every flag can be forced from the URL (`?bloom=0&dof=1&msaa=2…`), and a debug panel exposes sliders for all of them. The panel also has a "Copy water params" button, a sign of how the look was tuned.

Other tier-dependent budgets:
- `maxCars`: low 520 / medium 950 / high+ 1350.
- **Touch devices:** `quality = opts.quality || (matchMedia("(pointer: coarse)").matches ? "medium" : "high")`. Nobody starts on "ultra" automatically.
- **"lite" mode:** `{ lite: pointer:coarse || quality==="low" }` is passed to ambient systems. It roughly halves their counts, e.g. gulls `lite ? 60 : 130`, other ambient fleets `90/170`, `8/14`, `6/12`, `24/42`, `220/420`.
- **Data view** (the dark "data" mode) forces `{dof:false, tiltShift:false, shadows:false, ao:false}`.

**Auto-downgrade** (`Fe(frameMs)`, called with the JS time from the start of the rAF callback to after `render()`):

```js
ema = ema*0.92 + ms*0.08;                      // shown in stats as frameMs
if (!manager.isSettled) { reset; return; }     // never judge while the city is still building
if (!armedAt) { armedAt = now + 4000; return; }// 4 s grace after settling
samples.push(ms); if (samples.length < 110) return;
if (userLockedTier) return;
samples.splice(0,10);                          // drop the first 10 → average of 100
bad = (avg > 31 && (tier=="ultra"||tier=="high")) || (avg > 36 && tier=="medium");
if (bad && !strike) { strike = true; clear; return; }   // needs TWO bad windows in a row
if (!bad) { strike = false; clear; return; }
setTier(ultra→high→medium→low); console.info("[dat.city] frame average … auto quality high -> medium …");
```

It only ever steps down, one tier at a time, and never after the user picks a tier.

## 3. How buildings, props, cars and trees are built

**Instancing everywhere, with pre-allocated pools.** The standard helper:

```js
function pool(geo, mat, capacity) {
  const m = new InstancedMesh(geo, mat, Math.max(1, capacity));
  m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(DynamicDrawUsage);
  return m;
}
```

`frustumCulled = false` is used on essentially **every** instanced mesh. There is no per-chunk culling: the whole world is submitted every frame. Measured on the fully built world at "high": about 760–830 calls and 2.8–3.1 M triangles on normal frames, and about 1,000–1,090 calls and 4.5–4.9 M triangles on shadow frames (§9). The approach relies on desktop GPUs handling that many *instanced* low-poly triangles cheaply; what keeps the CPU side small is pooling, not culling. Instances are hidden by writing a zero-scale matrix. Gulls, for example, use scale→0 beyond 320 units from the camera, with a 70-unit fade band. Things spawn with `makeScale(1e-4)` and "grow" over 620–700 ms.

- **Towers** (`buildings.*.js`): a shared-assets singleton (`initBuildingsShared(renderer)`) holds unit geometries: box, 14-sided cylinder, roof, mast, tip sphere, dome, 8-sided chamfered prism (`ExtrudeGeometry` from a Shape), shard, crown, slope, lattice (merged boxes), tank, sleeve, pane, strip, and a lofted "shell". It also holds 6 shared materials: `concrete` Standard (rough .85), `glass` Standard (rough .14, metal .92, envMap), `window` and `drumWindow` Basic (additive, canvas texture, `toneMapped:false`), `neon` Basic, and `mast`. **Per district**, about 21 pooled `InstancedMesh` (one per primitive×material: `concrete, glass, cylinders, roofs, domes, neon, masts, tips, chamfer, chamferGlass, shards, crowns, slopeGlass, lattice, tanks, cylWindows, neonCyl, windowPanes, windowStrips, shells, cylGlass`), plus 2 data-bar meshes and an invisible pick mesh. Capacities are computed up front (`concrete: towers*78 + decor*6 + …`, `windowPanes: towers*96 …`). Towers are recipes made of `part(pool, dx, y, dz, sx, sy, sz, color)` calls: a stacked body with setbacks, glass bands, neon trims, rooftop clutter (parapet, helipad with neon H, water tanks, AC boxes, lattice antenna with a red tip). Style depends on the district theme (`civic: modern/arc-gate/corporate-glass/art-deco`, …). There are at most 20 towers per district (`rM.detail = 20`). Per-district colour jitter: `baseColor * (0.95+rand*0.09) * districtTint`.
- **City blocks** (the dense low-rise "urban fabric", `props.*.js` `Ee`): **2 InstancedMeshes for the entire world** (unit box + chamfered box) with capacity `64 + urbanMainlands*9600`. The unit box carries a **baked vertex-colour gradient** `lerp(0.8, 1.0, y)` (darker at the foot = baked AO). One `onBeforeCompile` patch adds:
  - **procedural windows** in world units (`vBlockScale` from `length(instanceMatrix[i].xyz)`, seed from `instanceMatrix[3].xz`), with margins, a taller ground floor, per-floor random lit density and **`fwidth` fade** "before it aliases at overview distances";
  - **daytime contact shade (fake AO):** `diffuse *= 1 - pow(1 - h/uContactHeight, 1.7) * strength` on vertical faces. The code comment reads: "reads as ambient occlusion where walls meet the ground, with zero per-frame cost and no AO pass". It is disabled when real AO (N8AO) is on;
  - **night "cove" wash:** warm emissive `vec3(1,.72,.42) * pow(1-h/9,2)` climbing the base of the walls, "as if lit from sources hidden at ground level";
  - lit windows added to `totalEmissiveRadiance`, scaled by the time-of-day `windowGlow`.
- **Towers get the same fake AO/wash** through `onBeforeCompile` on the shared concrete/glass materials. They also get a **radial reveal mask** (used for loading and for the data-view wipe) and a **"holo" hologram look** (fresnel + scanlines every 3 units, quantised to 5 levels, tinted by a 128² nearest-district accent `DataTexture`). Every patch sets `customProgramCacheKey`, so each variant compiles exactly once and is shared across all districts.
- **Night windows on towers** are additive textured quads (a 256² canvas texture of random lit panes, warm and cool). Their material is set `visible = windowGlow > 0.015`, so they cost nothing in daytime.
- **Urban fabric ground** (streets, sidewalks, plazas per mainland) is built by a **generator function** (`function* Xr(...)`) into **one merged, vertex-coloured, flat-shaded mesh per mainland** (`MeshStandardMaterial({vertexColors, flatShading, roughness:.94})`). A second "detail" mesh, transparent with `polygonOffset -2`, fades in only when `cameraDistance < 300` (`setFabricDetailLod(clamp((300-d)/90))`). This is the only real geometry LOD in the city; traffic lights use the same LOD value.
- **Islands** (`islands.*.js`): each island is a hand-rolled triangle list of concentric **rings**: `top` (grass), `cliff`, `cliffLow`, `shore` (sand) and **7 underwater skirt rings** that go down to −10.9 and become rounder with depth. Colours are baked per vertex (grass mixes grassA/B/C by a hash noise, sand → wet sand → underwater teal → deep). It is flat-shaded Standard with no textures. The skirts show through the transparent water and produce the "diorama reef" look.
- **Trees** (`props.*.js` `ze`): canopy `IcosahedronGeometry(1,0)` squashed to 0.86 (**20 triangles**), trunk a 5-sided cylinder; boreal = 3 stacked 6-sided cones merged + a 5-sided trunk. That makes 4 InstancedMeshes for **all** trees, with per-instance colour from 5-colour palettes, `flatShading`, rough .9–.95 and `castShadow`. Capacity `districts*50 + … + urbanMainlands*9500`. `excludeWhere(predicate)` removes trees under roads by zero-scaling them. Palms and beach clutter are separate pools.
- **Mountains** (`props` `Ze`): 3 procedurally generated peak meshes (14×14 grid, 3 overlapping lobes + sine noise; vertex colours by height: grass → rock → snow), **instanced**, 12 each. Placement on a mainland is rejection-sampled away from districts, roads and custom buildings, and each massif gets a **ring of 130–240 boreal trees around its foot**.
- **Cars** (`traffic.*.js`): per vehicle variant, 4 InstancedMeshes (body: Standard with instance colour; trim: vertex-coloured Standard whose emissive is multiplied by `vColor` so the head and tail lights glow; headlight ground "splat": additive ShaderMaterial; light "beam": additive fresnel ShaderMaterial). Capacity 320 per variant. They drive along a link graph with gaps and waiting. The glow materials are hidden in daytime (`visible = glow > 0.01`). Both glow shaders guard against NaN (`if (!(alpha > 0.004)) discard;`) because "a stray NaN … in the additive HDR buffer that bloom mip-blurs" blacks out the frame.
- **Clouds**: a single `InstancedBufferGeometry` of camera-facing quads (billboarded in the vertex shader with `uCamRight/uCamUp`, drifting with `mod(x + t*drift, span)`). The texture is a 2×2 atlas of cloud puffs generated on the CPU into a 512² `DataTexture`, with **baked top-lit shading in the R channel**. There are 16 clusters × 2–3 puffs.
- **Contact shadows** under props: an instanced quad with a 64² radial-gradient `CanvasTexture` (`rgba(10,20,35,.42)→0`).
- **Other instanced ambient life:** boats with foam collars, planes and helicopters, drones, gulls (vertex-shader wing flap `sin(t*5.5 + phase) * |z|`), fish, kelp sway, a rocket launch, fireworks.

**Draw-call aim.** There is no explicit budget in the code, but the structure is about 20 draw calls per district for towers (empty pools draw nothing), 2 for all city blocks, 4 for all trees, 3 for mountains, about 4 per car variant, 1 each for water, sky and clouds, plus 1 merged mesh per island or mainland. Measured at "high", **including** the shadow and post passes: about 440–490 calls/frame with only the focus area built, and about 760–830 calls (normal frames) or about 1,000–1,090 (shadow frames) with the whole world built (§9).

## 4. Loading and streaming

Order of events:

1. **HTML (59 KB)** embeds the full city config as JSON (`<script id="city-config">`, 32 KB): 65 districts `{id,x,z,radius,seed,theme,accent,dataUrl,…}`, `mainlandShapes` (polygons), `routes`, `bridges`. The loading chip already cycles fun messages from first paint ("streaming districts…", "raising tiny towers…", "planting tiny trees…"); they are cosmetic.
2. The **entry module** (4.7 KB) immediately creates a **separate small renderer** (`antialias:true`) that draws a "wire-3d" boot scene: an additive `Points` dot grid over the world bounds with a ripple from the focus district, plus the reveal ring, auto-rotating. After 1 frame and at least 60 ms (at most 120 ms) it `import()`s the app chunk (`city-app` + `data-city` + three + post + feature modules, **≈ 580 KB gzip / 1.9 MB raw**; brotli on the wire; `_astro` files `max-age=14400`). The boot scene keeps animating while that downloads. The app starts after at least 4 boot frames and 260 ms, and at the latest after 650 ms plus the download. On the first real frame (`onFirstFrame`), the boot canvas gets a CSS `is-hiding` fade and is disposed 260 ms later.
3. **World build**, `manager.start(focusId)`: the focus district is built and popped synchronously. All other entries are queued **sorted by distance from the focus**, and their data fetches are staggered (`setTimeout(fetchData, 240 + i*200)`). Fetch concurrency is 2 (`jr = 2`), the timeout 5 s (`AbortController`), with `cache: "force-cache"` for versioned URLs and `"no-cache"` otherwise. **If a fetch fails or is slow, a seeded synthetic dataset (`bt()`) is used**, so geometry never waits on the network.
4. **Per-frame time budget** (`Ln()`): at most **5 ms** of build work per frame (`performance.now() - start < 5`), at most one heavy item per frame (`qr = 1`), and a 120 ms delay before the queue starts. Heavy work is written as **generators** (`function* decorate(...)`, `function* Xr(...)` for the urban fabric, `yield "decor-mountains"` every 8 placement attempts, `yield "finish:pools"`, …) and stepped with `while (!it.done && performance.now() < deadline) it.next()` (4.5 ms slices). Any step over 24 ms is logged to `window.__pumpStalls`. `?fastbuild=1` raises the budget to 200 ms and 64 items for testing.
5. **Pop-in:** a built island first appears as `scale(0.6, 0.01, 0.6)` and eases to full size over 700 ms. Trees then "grow" (`growRange`, 620 ms), and buildings rise.
6. **Reveal ring:** a ring expands from the focus at 120 u/s (×2.2 for a "warm" visitor: `localStorage["dat-city:warm:v1"]`, 1-week TTL). **It never outruns the builder**: `radius = min(radius + speed*dt, max(radius, loadedRadius))`, where `loadedRadius` is reported by the build queue. As the ring passes each district it triggers `popIsland`.
7. **Loading look:** the world starts in the dark "data view" palette (bg `#02080E`). Inside the ring, real geometry shows with a hologram band (`holoHold = 1`). Once the focus district has popped (or after 2.4 s), the sky/fog/light palette crossfades to day over 1.8 s. When the ring completes, the mask is removed and the holo fades over 1.5 s.
8. Late, on-demand work: glass envMap on idle, story atlases (`.webp` sprite sheets per district, loaded only for built districts), race-stage and story chunks via dynamic `import()` when opened.

## 5. Post-processing (`post.*.js`)

It is the **pmndrs `postprocessing` v6.39.1** library (license header in the bundle) plus **N8AO** (`N8AOPostPass`: blue-noise, Poisson denoise, `setQualityMode("Medium")`, `halfRes = true`). The UI labels this "GTAO". The composer:

```js
composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
composer.addPass(new RenderPass(scene, camera));
if (ao)  composer.addPass(n8ao /* aoRadius 8, distanceFalloff 8, intensity 1.35, halfRes */);
effects = [
  heightFog?,                    // custom HeightFogEffect (exp. height fog from depth); present but not enabled in the city
  smaa && new SMAAEffect(),
  bloom && new BloomEffect({ intensity:.92, luminanceThreshold:.74, luminanceSmoothing:.22, mipmapBlur:true, radius:.72 }),
  dof ? new DepthOfFieldEffect(camera, { bokehScale, height: 500 })   // CoC at 500 px height
      : tiltShift && new TiltShiftEffect({ focusArea:.56, feather:.24 }),   // disabled in every tier
  look?,                         // LookEffect (balance/lift/gain/contrast/sat/grain) + optional LUT (not used in the city)
  new VignetteEffect({ darkness:.3, offset:.26 }),
  dither && DitherEffect,        // ±1/255 hash noise against banding
];
composer.addPass(new EffectPass(camera, ...effects));   // ONE merged fullscreen pass
composer.multisampling = clamp(tier.msaaSamples, 0, gl.maxSamples);
```

- The chain is **rebuilt only when a JSON signature of the settings changes**, so tier switches and tuning are cheap.
- `hasPost` is false on "low", which then renders straight to the canvas (with ACES).
- **DOF / "focus"**: world-space focus. Each frame, `focusDistance = cameraDist * dofFocusScale (1.15)`, `focusRange = lerp(dist*farScale, dist*nearScale, zoomT)`, `bokehScale = lerp(bokehMin, bokehMax, zoomT)`, where `zoomT = 1 - (dist - 46)/(680 - 46)`. **The closer you zoom, the stronger the blur**: the overview is sharp and close-ups read like a macro photo of a model. Separate presets exist for district focus, for each rocket camera angle and for vehicle chase cameras. Tilt-shift exists but is off in every tier: the author moved from tilt-shift to depth-based DOF, the same lesson we recorded.
- **"Greyed/blurred surroundings":** there is no desaturation shader. The blur is the DOF above. The "grey/dark" look is **data view**: a whole-world palette swap (sky, fog, lights and water to dark navy, preset `pe`), buildings replaced by data bars, a dotted floor, and ambient systems hidden. The change is animated by a **radial wipe**: all materials share an `onBeforeCompile` mask (`distance(worldXZ, center)` vs `radius ± feather` → `discard`), and the ring grows over 2.8 s. During loading, the not-yet-revealed world is drawn in the dark data palette with a holo effect, which is what looks "greyed out" in screenshots.

## 6. Lighting and atmosphere (`post.*.js` `Wa`)

- **Lights:** `HemisphereLight(#F3FDFF, #8FB3A4, 1.7)`, `AmbientLight(white, .66)` and one `DirectionalLight(#FFF4CF, 3.1)` (the shadow caster). There are **no point lights** in the city (night light is emissive + bloom + wash shaders).
- **Day/night:** four keyframes (`dawn t=0, day .25, sunset .5, night .75`). Each keyframe holds sky top/high/horizon/ground, sun colour/intensity/azimuth/elevation, hemi and ambient colours/intensities, fog colour/near/far, exposure, stars, `windowGlow`, `accentGlow`, water deep/shallow/sparkle and cloud colour/opacity. They are interpolated with smoothstep (colours lerped, azimuth unwrapped). **The full cycle takes 220 s in auto mode.** Listeners push `windowGlow` into window, wash, lamp and car-light uniforms. A "show night mix" darkens the scene during fireworks and rocket launches.
- **Sky:** a `SphereGeometry(1700,32,18)` BackSide ShaderMaterial that **follows the camera** (`sky.position.copy(camera.position)`, `renderOrder -10`, `depthWrite:false`, `fog:false`). It has a 4-colour vertical gradient, a sun glow `pow(d,26)*.55 + pow(d,5)*.16`, a sun disc, and hashed-grid twinkling stars at night.
- **Fog:** linear `THREE.Fog` (day `#D9F3F4`, near 660, far 2050). **Fog distances are multiplied by `clamp(cameraDistance/430, 1, 3.4)`**, so the overview is not washed out while close views keep haze. The water shader applies the same fog uniforms itself.
- **Water** (`trails.*.js` `ke`): one plane with a `ShaderMaterial` (highp, transparent). Its inputs are:
  - a **shore distance-field mask** painted on a 1024/2048 canvas: island polygons are inflated in about 24 steps with `globalCompositeOperation = "lighten"`, blurred by a 2× downscale-upscale, then the land is filled white;
  - a **procedural tileable 512² normal map** (4-octave value noise → normals, mipmapped), sampled 3× with domain warp and a 36°-rotated lattice to kill tiling;
  - shallow turquoise absorption from the mask, bathymetry and reef tone, ridged-sine caustics, a swell, drifting cloud shadows, fresnel sky reflection, two-scale sun glitter that fades with distance, and shore foam plus breaking waves;
  - bioluminescence at night, and alpha that is clear in the shallows (seabed skirts show through) and 0.95 in deep water (hides seams).
  All pattern strengths fade with view distance. The source comments are unusually explicit about avoiding tiling, aliasing and mediump precision.

## 7. Camera (`camera.*.js` + main loop)

- There are **no OrbitControls**. A small rig stores `{target(x,z), distance, yaw, lookAtY}` plus goals, and damps toward them with `k = 1 - exp(-dt*9)`. **Pitch is derived from distance:** `pitch = lerp(0.40, 0.66 rad, smoothstep(0, .55, zoomT))`, i.e. about 23° when close and 38° when far. When close, the look-at point rises (`lookAtYNear 7`) so you look *at* towers, not at their feet.
- **Config:** `fov 25, near 4, far 3400, distanceMin 46, distanceMax 680 (≥ bounds*2.4), distanceSoftMax 640, distanceOverview 430, distanceDistrict 150, panBounds 380 (bounds-30), yawDefault 45°`.
- **Input:** drag to pan, with pan speed scaled to screen height and distance (`2*dist*tan(fov/2)/height`, divided by `sin(pitch)`). **Zoom toward the cursor** raycasts the ground plane and pulls the target 60% toward the hit. Rotation snaps in 45° steps (`rotateBy`), and `rotateRaw` rotates freely. There is edge-of-screen panning (48 px band) and WASD/QE keys.
- **Fly-to:** `flyTo({x,z,distance,yaw,lookAtY, durationMs:1250})` with easing, used for district focus.
- **Idle auto-orbit:** after 10 s without input, it rotates at `orbitSpeed 0.04 rad/s` (around the focused district's pivot if one is open).
- **Follow cams:** random follow of a car, promo car, boat, plane, blimp or cruise ship. The offset is per kind (`car [16,6], boat [23,7.5], plane [34,11.5]…`), heading is smoothed `1-exp(-dt*1.8)`, the look-ahead point is 5 u in front, and position lerps `1-exp(-dt*3.2)`. There are drivable modes (flight, heli, car "character", boat), each with a chase cam and its own FOV (42–58), plus rocket-launch camera angles with per-shot DOF presets. The FOV change is smoothed (`fov += Δ*min(1,dt*5)`).
- **Labels** are DOM buttons in an overlay layer, projected each frame and priority-sorted by distance from screen centre, with overlap rejection. They are not WebGL sprites.

## 8. Other things that explain the look and the speed

- **Zero downloaded textures for the world.** Every texture is generated: window atlases (canvas 256² and 168×64), cloud atlas (DataTexture 512²), water normal map (DataTexture 512²), shore mask (canvas), contact-shadow and car-light gradients (canvas), holo accent map (128² DataTexture), SMAA and blue-noise (embedded). The only images are UI and per-district story atlases (webp).
- **Palette:** saturated "toy" colours on flat-shaded low-poly geometry. Grass `#4FBD63/#7AD77F/#3BA255`, sand `#F0E0B0`, cliff `#9B9DA4`, blocks `#B7BCC4`, asphalt `#565C6B`, water `#0F9BC4 → #62ECF2`, fog `#D9F3F4`, day sky `#1283DD → #C9F3FC`. Colour variety comes from per-instance colour with small multiplicative jitter (`×(0.95…1.04)` plus a slight district tint), not from textures.
- **No outlines.** Separation comes from flat shading, the hemisphere light, bloom on neon and windows, and DOF.
- **AO tricks:** baked vertex-colour gradients on unit boxes, a shader contact shade by height, radial-gradient blob shadows under props, underwater skirt colour gradients, and optional N8AO at half resolution on ultra only. When N8AO is on, the fake contact shade is switched off (`setRealAoActive`) to avoid doubling.
- **Shadow tricks:** a focus-following frustum sized to camera distance, fade-out when zoomed out, updates at half rate, and none on medium/low or touch devices.
- **Shader-variant hygiene:** every `onBeforeCompile` sets `customProgramCacheKey`. Uniform objects are shared module-level singletons (`{value}` objects referenced from many materials), so one assignment updates every material.
- **Robustness:** NaN guards in additive shaders, `mod()`-bounded time in `fract()` for mobile mediump, mask UVs computed in the vertex shader to avoid precision wedges on mobile, and a synthetic-data fallback.
- **Dev tooling baked in:** `window.__datCity.getStats()` (quality, frameMs, drawCalls, triangles, geometries, textures), `getLoadingState()`, `getRenderSettings()`, `updateRenderSettings()`, `setRenderQuality()`, `window.__pumpStalls`, `?doffocus=1` HUD, `?debugmask`, `?fastbuild=1`, `?stress`, per-feature kill switches (`?nightwash=0`, `?nightcars=0`, `?holo=0`…), and debug sliders with "copy params" buttons.
- **The author's public bio** (X profile HTML, the only readable part; posts need login): "AAA quality slop only … gamifying world stats at dat.city … 3D web + product design. Three.js, Unity, Unreal." Nitter mirrors were unreachable or blocked, so there is no tech thread to cite.

## 9. Measurements (headless Chromium + SwiftShader, 1280×720, DPR 1, local mirror)

The site itself could not be opened in headless Chrome: the proxy's TLS certificate was not trusted by Chrome, and I did not work around it. Instead I mirrored `index.html`, the 22 JS chunks, the CSS and the 65 district JSONs, and served them from `127.0.0.1`.

| moment | tier | draw calls | triangles | geometries | textures |
|---|---|---|---|---|---|
| boot + focus district (t≈17 s) | high | 390 | 175 k | 292 | 32 |
| focus area built, ring ≈ 36–170 u (t≈40–140 s) | high | 436–473 | 382–414 k | 330–345 | 44 |
| after `setRenderQuality('high')` | high | 484 | 426 k | 347 | 44 |
| `?fastbuild=1`, whole world built, normal frame | high | 756–828 | 2.8–3.1 M | 322–341 | 44–47 |
| `?fastbuild=1`, whole world built, **shadow frame** | high | 1,005–1,089 | 4.5–4.9 M | 316 | 44 |

The counts alternate frame by frame, which confirms the half-rate shadow map: every second frame adds about 280 calls and about 1.8 M triangles for the shadow pass. Calls include the post passes (RenderPass + 1 EffectPass + bloom mip chain + DOF internals + SMAA). In SwiftShader the JS-side frame time was 40–500 ms. Without `fastbuild`, the time-sliced builder (5 ms/frame) advanced very slowly (ring radius 36 → 170 in 140 s). That is the design working as intended: build progress is tied to frames, not wall-clock time. A real GPU at 60 fps gives it about 300 ms of build work per second.

**Where the triangles go** (full build, scene traversal of visible objects with `count > 0`, instanced triangles × instances; 3.38 M in total, of which the renderer drew 2.98 M after culling the non-instanced meshes):

| group | objects | instances | triangles | share |
|---|---|---|---|---|
| unnamed instanced prop pools (trees, boreal, palms, city blocks, lamps, traffic lights, mountains…) | 35 | 63,214 | 2.13 M | 63% |
| island ring meshes (vertex-coloured, incl. underwater skirts) | 76 | – | 354 k | 10% |
| tower part pools (`buildings:*`, ~21 per district) | 436 | 24,555 | 302 k | 9% |
| urban-fabric merged ground (roads/plazas per mainland) | 9 | – | 169 k | 5% |
| bridges | 17 | – | 78 k | 2% |
| marina piers (1 pool) | 1 | 922 | 77 k | 2% |
| water plane | 1 | – | 38 k | 1% |
| cars (6 variants, 320 each) | ~6 | ~1,700 | ~85 k | 3% |

Takeaway: 436 tower pools hold 24.5 k parts at about 12 triangles each (boxes). The heavy part is the sheer *count* of cheap instanced props: 63 k instances drawn in only 35 calls.

Screenshots:
- `research/datcity.jpg` shows the fully built city at "high": turquoise shelf water with sand and reef, palms and piers, a grid of instanced city blocks with procedural windows, kit-bashed towers with glass bands, and DOF blur on the near corner.
- `research/datcity-midload*.jpg` show the loading state: the focus districts are revealed with the holo band, the rest of the world is still in the dark data palette, and a low-poly instanced mountain in the foreground is DOF-blurred.

**Corrections to our ADR 0005 guesses about dat.city:** (a) it does *not* rely on camera stops or on hiding the world. It draws the whole world every frame, with no frustum culling on instanced meshes: about 2.8–3.1 M triangles and 760–830 calls when fully built, and 4.5–4.9 M and about 1,050 on shadow frames. It gets away with this through very few *distinct* meshes and materials, instancing, shadows every other frame, and quality tiers, not through a small triangle count. Its triangle load (2.8–3.1 M, and 4.5–4.9 M with shadows) is 2–4× our round-5 map (1.2 M), so our ≤ 1.5 M overview budget is conservative, not unrealistic. What matters more is draw calls, material count, and the per-instance triangle cost. (b) The "grey" is the data-view palette and the loading/hologram state, and the blur is zoom-dependent DOF. (c) The download is not tiny: ≈580 KB gzip of JS, of which three.js is 180 KB and post-processing 165 KB. Only the *world data* is tiny (32 KB inline + ≈150 KB gzip streamed).

---

## What to adopt for a three.js r146 strategy map

Prioritised. r146 notes: use `renderer.outputEncoding = sRGBEncoding` + `ColorManagement.legacyMode = false` instead of `outputColorSpace`. `BufferGeometryUtils.mergeBufferGeometries` (not `mergeGeometries`) and `examples/js/postprocessing/*` are still available as classic scripts in r146 (removed in r148). `light.shadow.intensity` does not exist in r146: fade shadows through a shader uniform or by switching `castShadow`.

1. **Pool by primitive, not by object.** Build each walled city, village or army from ~10–20 shared unit geometries (box, chamfer, cylinder, roof prism, tower cap, wall segment, gate) × a handful of shared materials, each as one pre-allocated `InstancedMesh` with `count = 0`, `DynamicDrawUsage` and `setColorAt` for faction/wood/stone tint. One pool set per region is enough. Empty pools draw nothing. This replaces "full vs lite city LOD" as the main cost lever. Keep our own per-chunk bounds and `frustumCulled` for the heavy pools (forests, 740-triangle trees). dat.city skips culling only because its instances have 12–40 triangles.
2. **Move detail from triangles into `onBeforeCompile`**, with `customProgramCacheKey` and shared `{value}` uniform singletons: procedural windows, roof tiles or brick courses in *world units* (derive scale from `instanceMatrix` column lengths, seed from `instanceMatrix[3].xz`), each fading by `fwidth` (our lesson already); a wall-base contact shade `pow(1-h/H,1.7)` (fake AO, no pass); a night "lantern wash" emissive at wall feet. Also bake a 0.8→1.0 vertex-colour gradient into unit boxes.
3. **Adopt the tier table + auto-downgrade verbatim in spirit:** ultra/high/medium/low with dpr caps 2/1.1/1/0.85; bloom on ≥ medium; DOF, SMAA, MSAA 4 and shadows on ≥ high; AO only on ultra; `pointer:coarse` → medium. Downgrade after **two** consecutive 100-frame windows averaging > 31 ms, only after the world has settled plus a 4 s grace, never after a manual pick. Expose `window.__game.getStats()` for `render.mjs`.
4. **Time-slice the world build with generators:** `function* buildRegion()` yielding between steps, driven by `while (!it.done && performance.now() < deadline) it.next()` with a ≤ 5 ms/frame budget. Queue regions by distance from the opening focus. Log steps over 24 ms. Add a `?fastbuild=1` switch for tests. This spreads our "5–8 s terrain build" over frames so the page never freezes. The build-time bake of heightfield and masks is still worth doing.
5. **Reveal gated by build progress:** show the opening province immediately, then expand a reveal ring (or a fog-of-war wipe) whose radius is `min(radius+speed*dt, loadedRadius)`, popping each region in with a 700 ms scale ease. A radial `discard` mask in the shared shader patch doubles as the transition for "strategy view ↔ realistic view". Remember warm visits in `localStorage` to speed it up.
6. **Focus-fitted, half-rate shadows:** `shadowMap.autoUpdate = false`, `needsUpdate` every 2nd frame (or only when the camera or sun moves). Place the sun at `focus + sunDir*R` with ortho half-size `max(190, camDist*1.15)` in our units, scale `normalBias` with it, and disable shadows past the overview distance. No shadows on medium/low.
7. **Zoom-driven DOF instead of tilt-shift:** world-space focus at `camDist*1.15`, and bokeh and range interpolated by `zoomT`, so the overview is sharp and close-ups are soft. Run it at low CoC resolution (≈500 px height), on high tiers only. With r146, use a small custom CoC + blur pass or `BokehPass`. Keep everything in **one merged fullscreen pass** (bloom composite + vignette + dither) to save bandwidth.
8. **Telephoto rig, no OrbitControls:** FOV 25°, near 4, pitch derived from distance (≈23° close → 38° far), look-at lifted when close, exponential damping `1-exp(-dt*9)`, zoom-to-cursor via ground raycast, 45° rotate snaps, `flyTo` for turn narration, idle auto-orbit, and chase cams with smoothed heading for armies. This suits "watch and record clips".
9. **Distance-scaled linear fog + a camera-following gradient sky dome:** multiply fog near/far by `clamp(dist/430,1,3.4)` (in our scale) so the overview is not washed out, and keep a 4-colour sky shader with sun glow. Drive everything from a small **keyframed time-of-day table** (dawn/day/sunset/night: sky, sun, hemi, ambient, fog, exposure, windowGlow) that is smoothstep-interpolated. A turn could map to a time of day.
10. **Generated textures only:** a canvas-painted **shore/river distance field** (polygons inflated in steps with `"lighten"` + downscale blur) feeding a single water shader (turquoise shallows, foam band, glitter fading with distance, fresnel sky); a procedural 512² tileable normal map sampled with domain warp plus a rotated lattice to kill tiling; canvas window atlases; a baked-shading cloud atlas on instanced billboards.
11. **Extreme low-poly flora and terrain props:** 20-triangle icosahedron canopies, 5- or 6-sided trunks and cones, flat shading, per-instance palette colour with ±5% jitter, zero-scale hiding for exclusion (trees under roads and walls), and ring-planting trees around mountain feet. Mountains become instanced multi-lobe massifs with vertex-coloured bands. Chain several instanced massifs along a ridge polyline to get the *ranges* the owner asks for (dat.city places isolated clumps). Keep trees smaller than city walls.
12. **Emissive night instead of lights:** no point lights. Additive window quads that are `visible` only when `windowGlow > 0.015`, NaN-guarded additive shaders, and bloom with threshold ≈0.74 on ≥ medium tiers.
13. **Boot scene + inline world config:** inline the small world JSON in `index.html`. Draw a cheap boot view (dot grid / map outline) with a tiny renderer on the first frame while the heavy scripts load, then crossfade. Fetch secondary data 2 at a time with timeouts and a seeded fallback so geometry never waits on the network.
14. **Z-fighting discipline:** keep a single Y-layer table for flat layers (water, road, lane, plaza, selection, contact shadow) plus `polygonOffset(-2,-2)` for overlay meshes. Show fine ground detail only below a camera distance and fade it with opacity.
