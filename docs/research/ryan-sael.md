# Ryan Sael: his projects and what he says about how he builds

Agent reports, 2026-09-28, kept as written (static reading of the sites; X posts read through api.fxtwitter.com). Synthesis and recommendations: [`graphics-refs.md`](graphics-refs.md). Raw downloads were in the session scratchpad and are not in the repo.

## Part 1. The sael.net projects (code teardown)


16 pages fetched (dat.city skipped); files in `scratchpad/ryan/sites/<slug>/`. No site code run. **[V]** = read in code, **[I]** = inference.

**Views correction** (sael.net `data-views`): 3.2M is **The Plane of Focus**, not data-center (78k). Ranking: plane-of-focus 3.22M, token-town 220k, dat.city 115k, airace 86k, data-center 78k, cube-graph 47k, paris-inception 35k, interior 34k, ai-museum 34k, final-boss 32k, model-monsters 24k, ai-office 15k, a-muse-ment 9k, swarm-floor 8k, prismatic 3k, sky 2.9k, terraform 1.7k.

## (a) Per project

**"L" = the shared "ONE HTML LAB" template [V].** Each page is one HTML file with one inline, minified ES module. An importmap loads **three@0.183.2** from jsdelivr, using the *unminified* build. three.module.js + three.core.js measured 2.06 MB raw / 406 KB gzipped, plus about 29 KB gzipped of addons (estimated). Renderer: `WebGLRenderer({antialias:false, stencil:false, powerPreference:'high-performance'})`.

There are **no binary assets** anywhere: no glTF, Draco, KTX2, HDR/EXR, wasm, Gaussian splats, physics, WebGPU or TSL. External files are Google Fonts, one JPG (ai-museum) and, on the AI-data pages, `airace.lol/race.json` (191 KB raw / 93 KB gzipped).

| Project (views) | Engine | Geometry | Own JS raw/gz, assets | Post | Tiers / phones | Notable |
|---|---|---|---|---|---|---|
| plane-of-focus (3.2M) | L | procedural; RoundedBox merged per material | 91/35 KB | L chain | L; <900px: FOV +8, view offset | A second camera renders the "photo" with a thin-lens circle of confusion (`lensBlur`, `photoRes`). fov 30 |
| token-town (220k) | L (earlier variant) | procedural; 14 InstancedMesh (trees, lit windows, light-pool decals) | 154/88 KB | GTAO + bloom + DOF (no settings object) | DPR ≤1.5; if fps <40 over 2 s, DPR −0.25 (floor 1) | Emissive windows (#ffd9a0 ×3.2) feed the bloom. Material cache Map; per-material `sat`/`lift` uniforms |
| airace.lol (86k) | three **r180** (min build); unminified multi-file ES modules | procedural flat-shaded Standard; `mergeStatic` per material; instanced trees and smoke | ~279/94 KB + race.json | RenderPass → GTAO → BokehPass → bloom → MacroDOF (tilt-shift, off by default) → Output | **Phones get no composer at all.** DPR ≤1.5 on phones, ≤1.25 on desktop. Probes 120 frames: if >40 are slow, drops GTAO, then DPR 1 | RoomEnvironment PMREM. Day-cycle table interpolates sky, fog, hemisphere, sun, exposure and bloom. Separate portrait camera presets. 30 fps pacing when idle |
| data-center (78k) | L | procedural + instanced racks; seeded mulberry32 | 99/38 KB | L + planar floor reflection (half-res, mipmapped) | L | 10 fake point lights (below). Shadows re-render only on change. HDR clamped to 5 before bloom. fov 32 |
| cube-graph (47k) | L (earlier variant) | procedural; 15 InstancedMesh | 47/19 KB | as token-town | as token-town | Graph search runs in a Blob Worker (logic only) |
| paris-inception (35k) | three **r170** packed as base64 `data:` modules | procedural city, merged | 2.0 MB HTML / 512 KB gz | RenderPass → GTAO → custom DOF → bloom → Output → FXAA | DPR forced ≤1 by a runtime shim; <700px only moves the camera | Whole city bent in the vertex shader via onBeforeCompile. GTAO `renderOverride` swaps in deformed-normal materials |
| interior (34k) | L | procedural room; 26 CanvasTextures (painted wood/stone/fabric) | 151/58 KB | L + SMAA | L | Ortho overlay scene; 236×132 camera for thumbnails |
| ai-museum (34k) | L | procedural + ConvexGeometry; SVGLoader logos | 229/110 KB + one 2048 JPG (three.js earth texture) | L | L | fov 50; lighting presets per room |
| final-boss (32k) | L | procedural, heavy flatShading, 12 InstancedMesh | 102/43 KB | L | L | — |
| model-monsters (24k) | L | procedural creatures, vertexColors, DecalGeometry | 190/91 KB | L | L | Daylight palette: sky #79b7ec |
| ai-office (15k) | L | procedural | 158/92 KB | L without reflection | L | — |
| a-muse-ment (9k) | L | procedural fur-crowd InstancedBufferGeometry | 170/65 KB | L + SMAA | Auto-tier drops the **crowd** first | Manual Frustum culling |
| swarm-floor (8k) | three r160 (CDN) | instanced robots | 49/18 KB | none (native MSAA) | DPR shim ≤1 | Isometric OrthographicCamera |
| prismatic (3k) | three r160 bundled inline | procedural; instanced ray segments | 733/192 KB (app itself 67 KB) | Hand-rolled: MSAA RT → bright pass → half-res gaussian → composite with a *tilted* focus plane | FX need WebGL2; DPR shim ≤1; renders only when something changed | PMREM built from an emissive "softbox" scene |
| sky (2.9k) | raw WebGL1 full-screen shader, not 3D | — | 42/16 KB | — | — | — |
| terraform (1.7k) | three r160 (CDN) | procedural planet ShaderMaterial | 39/14 KB | none | `isSmall` (<700px): grid 320 instead of 512 | — |

## (b) House recipe (L pages [V])

1. **All geometry is built in code.**
   - RoundedBoxGeometry with a small bevel (0.04–0.09, 2–4 segments) so every edge catches a highlight.
   - A small kit (`box/cyl/sph/tor/geo/flush`) collects geometry per material and calls `mergeGeometries`, so each material costs one draw call.
   - InstancedMesh for anything repeated; a seeded PRNG for variation.
   - No models from 3D tools.
2. **Materials**: MeshStandard/Physical, some flatShading. Code injected with `onBeforeCompile` adds:
   - **up to 10 fake point lights**: a uniform array, diffuse only, quadratic falloff. Cheaper than real PointLights and no extra shadows.
   - a **saturation boost** per material (`sat` 1.10–1.26).
3. **Lighting**:
   - Low-intensity hemisphere light.
   - Warm key DirectionalLight (0xFFC0xx) with a 2048 PCF shadow and a tight ortho frustum.
   - Cool rim light and faint warm fill.
   - Environment map from PMREM of a procedural gradient-sky sphere (verified in data-center; every L page calls PMREM).
   - ACES tone mapping, exposure about 0.92–1.06.
4. **Atmosphere**: FogExp2 in a slightly lighter shade of the background. Backgrounds are mostly dark navy (#10151f, #171d2a) so emissive surfaces pop.
5. **Telephoto camera**: FOV 30–32, which flattens perspective like a macro photo of a model. The walk-through pages use 50.
6. **Post-processing**, all three.js addons (not pmndrs):
   1. HalfFloat MSAA render target (4×, or 2× when DPR ≥1.5)
   2. **GTAO at half resolution** (12 samples plus Poisson denoise; emissive and overlay objects hidden from the AO pass)
   3. **UnrealBloom at half resolution**, threshold 1.0–1.7 on HDR, so only emissive surfaces glow
   4. **Custom DOF** (details below)
   5. OutputPass
7. **The DOF is the key to the "toy" look.**
   - It reuses GTAO's depth texture.
   - Focus follows the distance to the orbit target.
   - The sharp band is max(3, 0.3 × distance) wide.
   - Near and far blur strengths differ.
   - It gathers at half resolution along a golden-angle spiral, with maxCoc 13 px.
8. **Tooling** [V hooks; I workflow]:
   - `window.__step(t)`, `__loop`, `__capture` (webp), `__shot` (POSTs to localhost:8792).
   - `__dbg` reports draw calls and triangles.
   - A hidden tuning panel exports every look parameter as JSON.
   - Looks like deterministic frame stepping for recording `loop.mp4` and visual QA.

**Over time**: early-September pages use r160/r170, lighter post, DPR ≤1; dat.city and airace use r180 (dat.city with pmndrs + N8AO); late-September pages use the r183 L template with his own passes.

## (c) Phones

- **No project checks `pointer:coarse` or the userAgent, and none detects GPU or memory [V].** Phone handling is CSS breakpoints (900/760/700 px), FOV and framing changes, and hiding the thumbnail deck under 900 px or on data-saver.
- **L pages run the full pipeline on phones.** Two things protect them [V]:
  - **Pixel budget**: DPR = clamp(min(dpr, 1.5, √(2.5M / (w·h))), 0.75, 1.5). A phone gets 1.5; a 1080p desktop gets about 1.1.
  - **Frame-rate governor**: checks every 1.6 s. After warm-up, if fps stays under 74% of its best for two windows *and* under 50, it steps down in this order:
    1. DPR −0.25 (down to 0.75)
    2. reflection off
    3. MSAA off
    4. AO off
  - The governor ignores hidden tabs. Only data-center re-renders shadows on change; the other L pages re-render them every frame.
- **airace is the only project with an explicit phone path** [V]:
  - `mobile() = innerWidth ≤ 860 || portrait` removes the whole composer. The code comment says: "no AO, blur or bloom passes on a battery".
  - Rebuilding the field is spread over frames (4 vehicles per frame) to avoid stalls.
  - 30 fps pacing when nothing is moving.
- Older pages cap `devicePixelRatio` at 1 through a runtime shim.
- [I] On mid-range phones the L chain (MSAA + GTAO + bloom + DOF at DPR 1.5) will probably trigger the governor within seconds. Downgrading only when fps falls below 74% of its own best means a phone that is slow from the first frame may never step down. For a phone-first game, airace's pattern is the safer copy: base look = baked colours + fog + telephoto camera, with post-processing only as a desktop extra.


## Part 2. Public statements (X posts, CV, one article)


Almost everything below comes from his own X posts. I read them through api.fxtwitter.com. Tweet links are `x.com/RyanSael/status/<id>`, shown here as `/<id>`. Raw text is in `tweets_all.txt` and `threads.txt`. "(none found)" means keyword searches came back empty. It does not prove he never said it.

## Tools and workflow
- X bio: "3D web + product design. Three.js, Unity, Unreal." His CV (ryansael.com) lists Three.js since 2016, plus Unity, Blender and Maya from VR work in 2015–16.
- When people ask whether he uses Blender: "no everything just code, @threejs" (/2102788142827004092, 2026-09-23). Also "just code, threejs" (/2104505281149644931, 09-28) and "I made one with threejs instead of blender" (/2096960554044981328, 09-07).
- Delivery: "it's just html with cdn so I asked claude to deploy this to cf pages … why would you need a repo if you can just view source, that's the entire code really." (/2102781474810503280, 09-23)
- The one full prompt he has published (logistics sim, /2095783842624020712, 09-04): "Deliver exactly artifacts/index.html … A pinned HTTPS ES-module CDN import is allowed … no backend, build step, package manager, API key, binary model, external texture, external audio file, base64 payload … Generate all visible scene assets procedurally from geometry, canvas, CSS, WebGL, or Web Audio." The prompt uses a reference image as the "visual target", with the instruction "do not embed the reference image".
- He says context matters more than the prompt. "it lives inside a folder with other 3d projects i had done before, so it read all the context and similar styles … if it had zero context, probably won't achieve the same quality." (/2102947930210738537, 09-24) Also: "sharing a prompt wont help much. Unless I give away my hard drive too" (/2102948156115939588), "I asked it to read trough files in my previous projects … set to max effort" (/2102643812745245037, 09-23) and "I didnt use any /skills here" (/2102778695220171205).
- The prompt he showed for a-muse-ment is a screenshot (`prompt_amusement.png`, /2104380961400197534, 09-28): reference images plus "can we have this interactive web based on this image pls. match the vibe as close as possible. make it lit. has to be really good :) as per usual".
- Other process notes:
  - He used "chatgpt image 2.0 for visual direction" (/2047312045603946622, 04-23).
  - He set up "a dedicated variants debug scene so I can review them" (/2072714645761359987, 07-02).
  - "When I throw some screenshots or telling it to do browser check, it can fully understand the visual context" (/2073620840269455668, 07-05).
  - London "took a few weeks to build" (/2096601216805650548).
  - Some builds are not one-shot: "been iterating because few things are awfful initially" (/2102789365978341620).

## Rendering techniques
- "Every single building is procedural. Made in threejs" (/2074066638765473989, 07-06). He also mentions "Procedural placement" of car parks and marinas (/2074307107017695723) and procedural buildings "with a bit more of controls bind to datasets" (/2068858221562134867).
- Night lighting: "reversing the GTAO shader and using it as illuminate color at night (without any physical lights) makes the night cycle look 10x better" (/2074060633293856898, 07-06).
- From the logistics prompt: "Use instancing and spatial bucketing so motion remains smooth."
- He teased "guess how many tris in this renderer?" (/2080580244361109575, 07-24) but gave no answer.
- (none found) on baking, textures, glTF, WebGPU, splats or post-processing.

## Performance and mobile
- The perf block of the logistics prompt: "Prioritize smooth rendering: cap device pixel ratio, avoid per-frame allocations, reuse geometry/materials, keep particle and instance counts bounded, handle resize correctly, and pause expensive work when the page is hidden. Respect prefers-reduced-motion." The same prompt asks for layouts that are "responsive down to 390×844" and have "pointer and touch support".
- On dat.city: "It optimised this entire #threejs city to run at high FPS on an ultrawide, an iPad, and an old iPhone. Zero lag on anything." (/2073412860324327854, 07-04) Earlier models, he says, gave him "low fps at complex 3d" (/2073997903740469379).
- "It still loads in about 3-5 seconds in the browser." (/2080212469558247756, 07-23)
- His goals for pages: "it needs to load really fast. it should be lightweight." He criticised a copycat page that "took a while to load because it was stuffed with too much" (/2104371800243405161, 09-28).
- "Works on mobile with great fps so far." (vibejam game, /2044052241040966111, 04-14)
- Crash reports from other people:
  - @ArtemR on a Pixel 10 Pro XL saw a "weird white blob", then "need a device with WebGL". Ryan replied: "that's too bad. it's working fine on safari, small iphones. will have a look" (/2102950123978596795, 09-24).
  - @_data_ asked "Is it expected that these all crash on Android" (/2102852040926040541, on the data-center post). I found no public reply.
  - One user asked for "mobile optimisation" and another said it "opened perfectly on mobile".
- (none found) on any quality toggle or low/high settings. The visible text on sael.net/data-center shows none either.

## AI usage
- For the data center page: "1 hour 53 minutes in one shot, $38.99 API cost … 202 calls and 119M input tokens, almost all read from cache … Without caching … about $486 … It also read my earlier projects on disk to match the style" (/2102740041621762166, 09-23).
- The lens lab took 1h26m and cost $25.66 (/2102591147927654847). The AI museum was a one-shot at $29.78, and fixes brought it to $78.19 in total (/2103021886045348073).
- Models he has named: Claude Fable 5/5.1, Opus 5/5.5 (in Claude Code), GPT-6 Astra, Grok 4.5 ("about 6 prompts", /2076006291319988631), GLM 5.3 Flash and DeepSeek. "Claude Code and Grok consistently had the best output" (/2092566972995412344). On Codex: "barely using codex these days" (/2104484935465840798, 09-28).
- AI 3D generators (Meshy, Tripo, Hunyuan and similar): none found. He says the assets are code or procedural.
- On accuracy: "these 3d interactive lessons can still produce inaccurate results right now, so they really need input from experts". He says an open-source repo is coming (/2104371800243405161).

## Sources
- **Reached:**
  - api.fxtwitter.com: profile, timeline (about 54 recent tweets, then empty pages), from:/to: search and threads.
  - ryansael.com, sael.net, /data-center and /token-town, read through WebFetch. None of the sael.net pages has a note on how it was made.
  - One secondary article, runtimewire.com (Ryan Merket, 2026-09-23). It only paraphrases: he "read files from his previous projects and set it to maximum effort".
- **Unreachable:**
  - nitter.net: connection reset.
  - xcancel.com: HTTP 451, service suspended.
  - r.jina.ai and api.vxtwitter.com: 403, blocked by a Cloudflare challenge.
- **Nothing specific found:** Hacker News, Reddit, Product Hunt, podcasts, YouTube.
