// Siege prototype (docs/design/prototypes/siege): scene, light, lens, camera presets. Throwaway design code.
// Golden hour, autumn 219: a low sun from the west-south-west, warm haze, long shadows; the lens from src/world/kit.js
// (depth of field, ambient occlusion, aerial perspective).
//   const sg = await SG.start({ canvas, width, height, dpr, shot, interactive })
//   sg.view(name) · sg.labels() → [{ text, kind, x, y, visible }] · sg.stats() · sg.render()
(function () {
  const SG = (window.SG = {});
  const T = THREE;
  const FACTION = { zhu_yuanzhang: 0xb3262e, cao_cao: 0x4d6a3a, sun_quan: 0xd9772a, local: 0x8a7a55 };

  // a warm evening sky: deep blue overhead, peach and gold toward the low sun, a few streaks of cloud
  const skyMaterial = (sunDir) => new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vD; uniform vec3 uSun; ${SGN.GLSL}
      void main(){ vec3 d = normalize(vD); float h = clamp(d.y, -.1, 1.), s = max(dot(d, normalize(uSun)), 0.);
        vec3 zen = vec3(.1, .2, .42), hor = vec3(.84, .68, .52), warm = vec3(1.2, .58, .26);
        vec3 c = mix(hor, zen, pow(max(h, 0.), .45));
        c = mix(c, warm, pow(s, 2.2) * .85 * (1. - smoothstep(.02, .45, h)));
        c += vec3(1.4, .9, .5) * pow(s, 60.) + vec3(4., 3., 2.) * pow(s, 900.);
        float cl = smoothstep(.55, .8, fbm2(d.xz / max(d.y, .06) * 1.4 + 3.)) * smoothstep(.02, .18, d.y) * (1. - smoothstep(.4, .7, d.y));
        c = mix(c, mix(vec3(.95, .72, .58), vec3(1.1, .75, .45), pow(s, 2.)), cl * .55);
        if (d.y < 0.) c = hor * .8;
        gl_FragColor = vec4(c, 1.); }`,
  });

  SG.start = async function (o) {
    const W = o.width, H = o.height, t0 = performance.now();
    T.ColorManagement.legacyMode = false;
    const renderer = new T.WebGLRenderer({ canvas: o.canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(o.dpr || 1); renderer.setSize(W, H, false);
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, W / H, 1, 16000);
    const sunDir = new T.Vector3(-0.82, 0.36, 0.3).normalize(), sunColor = new T.Color(1.0, 0.72, 0.46);

    // sky and environment (the same gradient, prefiltered)
    const sky = new T.Mesh(new T.SphereGeometry(15000, 48, 24), skyMaterial(sunDir)); scene.add(sky);
    const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), skyMaterial(sunDir)));
    const pm = new T.PMREMGenerator(renderer), env = pm.fromScene(es, 0.03).texture; pm.dispose();

    // light: a low warm sun with long shadows, a cool sky fill
    const sun = new T.DirectionalLight(sunColor, 2.35); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target, new T.HemisphereLight(new T.Color(0.5, 0.6, 0.8), new T.Color(0.3, 0.24, 0.16), 0.42));

    // the land, the city, the armies, the fire
    const L = SGN.land(), tLand = performance.now();
    const HM = HNModels.create({ recv: (m) => m, renderer, colors: FACTION });
    scene.add(SGN.terrain(L, env)); const water = SGN.water(L, env); scene.add(water);
    const rocks = SGN.rocks(L, env); scene.add(rocks);
    const city = SGS.city(L, HM, env); scene.add(city.group);
    const tops = []; // pines on the pillars' tops and clinging to their ledges
    for (const [x, y, z, R, H] of rocks.userData.pillars) {
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + x, r = R * 0.45 * (i ? 1 : 0); tops.push([x + Math.cos(a) * r, z + Math.sin(a) * r, 3, 8 + (i % 2) * 4, y + H * 0.97]); }
      for (let i = 0; i < 7; i++) { const v = 0.2 + ((i * 0.37 + x * 0.01) % 0.6), a = i * 2.4 + z * 0.01, r = R * (1.12 - 0.34 * v) * 1.02; tops.push([x + Math.cos(a) * r, z + Math.sin(a) * r, i % 3 ? 3 : 1, 5 + (i % 3) * 2, y + H * v]); }
    }
    const trees = SGN.trees(L, env, { dir: sunDir, color: sunColor }, city.trees.map(([x, z, sp, h]) => [x, z, sp, h]).concat(tops)); scene.add(trees);
    const army = SGS.armies(L, HM, city); scene.add(army.group);
    const fx = SGS.fx(L, city, army); scene.add(fx.group);
    const tBuild = performance.now();

    // the lens: depth of field round the target, occlusion in the creases, warm haze with distance
    const lens = K.lens(renderer, scene, camera, { focus: 300, range: 300, maxBlur: 3, ao: 0.8, aoRadius: 2, vignette: 0.28, contrast: 1.06, saturation: 1.06,
      atmos: { density: 0.00017, falloff: 0.005, color: 0xa7a8ad, sunColor: 0xe0a070, sunDir } });
    const LU = lens.uniforms, blurK = renderer.getDrawingBufferSize(new T.Vector2()).y / 900;
    LU.band.value.set(0.5, 0.5);

    // camera presets
    const HC = L.HC;
    const VIEWS = {
      siege: { target: [4, 14, HC + 6], cam: [-78, 74, HC + 205], fov: 40, shadow: [0, HC, 330], ao: 1.6 },
      overview: { target: [260, 0, 40], cam: [-420, 1250, 2150], fov: 36, shadow: [250, 0, 1500], ao: 8 },
      bagong: { target: [940, 60, -210], cam: [480, 210, 330], fov: 38, shadow: [900, -200, 700], ao: 4 },
      field: { target: [10, 10, HC + 110], cam: [-80, 34, HC + 345], fov: 42, shadow: [0, HC + 200, 380], ao: 1.4 },
    };
    let current = null;
    const setView = (name) => {
      const v = VIEWS[name] || VIEWS.siege; current = name;
      camera.fov = v.fov; camera.aspect = W / H; camera.position.set(...v.cam); camera.lookAt(...v.target); camera.near = 1.5; camera.far = 16000; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      if (controls) { controls.target.set(...v.target); controls.update(); }
      aim(v);
    };
    const aim = (v) => {
      const tgt = controls ? controls.target : new T.Vector3(...v.target), dist = camera.position.distanceTo(tgt);
      const [sx, sz, ext] = v.shadow || [tgt.x, tgt.z, Math.max(200, dist * 0.8)];
      sun.position.set(sx, 0, sz).addScaledVector(sunDir, 3000); sun.target.position.set(sx, 0, sz); sun.target.updateMatrixWorld();
      Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 100, far: 6000 }); sun.shadow.camera.updateProjectionMatrix();
      LU.focus.value = dist; LU.range.value = Math.max(120, dist * 1.2); LU.maxBlur.value = 2.6 * blurK;
      LU.aoStrength.value = 0.85; LU.aoRadius.value = v.ao || Math.max(1.5, dist * 0.006);
      LU.near.value = camera.near; LU.far.value = camera.far;
      LU.projScale.value = renderer.getDrawingBufferSize(new T.Vector2()).y / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2));
      sky.position.copy(camera.position);
    };
    let controls = null;
    if (o.interactive && T.OrbitControls) {
      controls = new T.OrbitControls(camera, o.eventTarget || o.canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.45; controls.minDistance = 25; controls.maxDistance = 4200;
      controls.addEventListener('change', () => aim(VIEWS[current] ? { ...VIEWS[current], shadow: null } : {}));
    }
    setView(o.shot || 'siege');

    // labels: places and the three lanes of the siege, projected to the screen
    const LABELS = [
      { text: 'Thọ Xuân (Tào Ngụy giữ)', kind: 'city', p: [0, 45, -60] },
      { text: 'Sông Hoài', kind: 'place', p: [180, 0, L.huaiZ(180)] },
      { text: 'Sông Phì', kind: 'place', p: [L.feiX(600), 0, 600] },
      { text: 'Núi Bát Công', kind: 'place', p: [960, 150, -260] },
      { text: 'Doanh trại Chu Nguyên Chương', kind: 'place', p: [L.CAMP[0], 30, L.CAMP[1]] },
      { text: 'Cổng Nam: xe húc, thang mây', kind: 'lane', p: [0, 24, HC + 60] },
      { text: 'Tường Đông: tháp tên, thang', kind: 'lane', p: [HC + 80, 30, 0] },
      { text: 'Cửa kênh sông Phì: thuyền', kind: 'lane', p: [L.feiX(20) + 30, 16, 20] },
      { text: 'Máy bắn đá', kind: 'thing', p: [0, 18, HC + 250] },
    ];
    const v3 = new T.Vector3();
    const labels = () => LABELS.map((l) => { v3.set(...l.p).project(camera); return { text: l.text, kind: l.kind, x: (v3.x + 1) * 0.5 * W, y: (1 - v3.y) * 0.5 * H, visible: v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 }; });

    let time = 0;
    const render = (dt = 0) => {
      time += dt; trees.userData.U.uTime.value = time; water.userData.U.uTime.value = time; fx.tick(time);
      if (controls) controls.update();
      lens.render();
    };
    const stats = () => { const s = K.stats(renderer, scene); return Object.assign(s, { buildMs: Math.round(tBuild - t0), landMs: Math.round(tLand - t0), trees: trees.userData.count, soldiers: army.count, pillars: rocks.userData.pillars.length }); };
    const measure = () => { renderer.info.autoReset = false; renderer.info.reset(); const f0 = performance.now(); lens.render(); renderer.getContext().finish(); const s = K.stats(renderer, scene, { frameMs: performance.now() - f0 }); renderer.info.autoReset = true; return Object.assign(s, { trees: trees.userData.count, soldiers: army.count, buildMs: Math.round(tBuild - t0) }); };
    return { renderer, scene, camera, view: setView, views: Object.keys(VIEWS), labels, render, stats, measure, controls, land: L };
  };
})();
