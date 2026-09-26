// World runtime: the approved round-8 world (all-China Albers map, 20 seats, Han cities, terrain, water, dressing)
// assembled once, with a camera that can move between the campaign view, a province and a city, and markers for
// generals and armies. Presentation only: it reads data/world.json and cities.json, and takes owners from the caller
// (engine state); it never decides what happens in the game.
//
//   const rt = await WorldRuntime.create({ world, cities, width, height, dpr });
//   rt.focusProvince('jing'); rt.focusCity('jing'); rt.campaign(); rt.render();
//   views: rt.viewCampaign(), rt.viewOverview(), rt.viewProvince(id), rt.viewCity(id), rt.viewLook(from, to), rt.viewFollow(pts, u)
//   rt.prepare(view) builds the level of detail a view needs (call before animating to it); rt.setView(view) places the camera.
(function () {
  const WR = (window.WorldRuntime = {});
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  // Han Great Wall (rammed loess), approximate line from Liaodong to the Yumen pass (round 8)
  const WALL = [[122.5, 41.8], [120.0, 41.9], [117.5, 41.5], [115.0, 41.2], [113.0, 40.9], [111.0, 41.0], [109.0, 41.2], [107.5, 41.3], [106.5, 40.2], [105.8, 38.9], [104.5, 37.5], [103.4, 37.35], [103.15, 37.85], [102.95, 38.25], [102.3, 38.45], [101.0, 38.75], [99.0, 39.6], [97.5, 40.1], [95.5, 40.35], [93.8, 40.35], [92.6, 40.3]];
  // Look of each camera mode (the round-8 shots: whole country, region, close)
  const MODES = {
    far: { border: 0.9, borderW: 0.9, tint: 0.22, canopyBorder: 1, lens: { range: 500, maxBlur: 1.5, band: [0.5, 0.5], vignette: 0.2, contrast: 1.06, saturation: 1.0, ao: 0, atmos: 0.0012, fall: 0.05 } },
    near: { border: 0.75, borderW: 0.25, tint: 0.06, canopyBorder: 1, lens: { range: 220, maxBlur: 2, band: [0.5, 0.5], vignette: 0.22, contrast: 1.06, saturation: 1.0, ao: 0, atmos: 0.003, fall: 0.05 } },
    city: { border: 0.8, borderW: 0.05, tint: 0.0, canopyBorder: 0, lens: { range: 30, maxBlur: 3.5, band: [0.5, 0.3], vignette: 0.24, contrast: 1.08, saturation: 0.95, ao: 1.0, aoR: 0.12, atmos: 0.012, fall: 0.3 } },
  };
  const FAR_DIST = 350; // beyond this camera distance the whole-country level of detail is used

  WR.create = async function (o) {
    const T0 = performance.now();
    const W = o.width || 1440, H = o.height || 900, world = o.world, cityDefs = o.cities;
    // Scale C streaming: fetch the fine 128-unit tiles near the 20 seats (where the camera goes); the rest of the core
    // comes from the coarse grid.
    let seatXZ = null;
    const baked = await Terrain.loadBaked(o.base || '/assets/map/', {
      tiles: (box, meta) => {
        seatXZ = seatXZ || world.provinces.map((p) => [meta.cities[p.id].x, meta.cities[p.id].z]);
        const R = o.tileRadius ?? 64;
        return seatXZ.some(([x, z]) => Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.z0 - z, 0, z - box.z1)) < R);
      },
    });
    const loadMs = performance.now() - T0;
    const MC = baked.meta.cities, PROV = {}, NEI = {};
    for (const p of world.provinces) { PROV[p.id] = [MC[p.id].x, MC[p.id].z]; NEI[p.id] = p.neighbors; }
    const FCOL = {}; for (const f of world.factions) FCOL[f.id] = new THREE.Color(f.color);
    let owners = {};
    for (const f of world.factions) for (const p of f.start.provinces) owners[p] = f.id;
    if (o.owners) owners = Object.assign({}, o.owners);

    const sunDir = new THREE.Vector3(-0.5, 0.5, -0.3).normalize(); // one sun: baked light and shadows depend on it
    const { renderer, scene, camera } = K.setup(W, H, { dpr: o.dpr || 1, fov: 34, exposure: 0.95 });
    renderer.shadowMap.enabled = true;
    K.seed(21);

    // ---------------------------------------------------------------- terrain
    const terr = Terrain.createReal({ baked, provinces: PROV, neighbors: NEI, wild: 40, cities: MC, sun: sunDir, wall: WALL, canopy: 0.42 });
    const applyOwners = () => terr.setOwners((pid) => (owners[pid] ? FCOL[owners[pid]] : null), (pid) => owners[pid]);
    applyOwners();
    const grass = Terrain.detailTexture(512);
    const ground = Terrain.groundMaterial(terr, grass, false), canopy = Terrain.canopyMaterial(terr, null);
    const gu = ground.userData.uniforms, cu = canopy.userData.uniforms;
    for (const u of [gu, cu]) { u.uSnowLine.value = 16.5; u.uSnowWest.value = 0; u.uWaterLine.value = 0.03; }
    gu.uFieldK.value = 4; gu.uDetailK.value = 1.7; gu.uSoft.value = 1;
    gu.uOutArid.value.set(-375, -395, -345, -365);
    gu.uEdgeFog.value = cu.uEdgeFog.value = 1; cu.uCrownK.value = 3;
    const far = Terrain.meshes(terr, { ground, canopy }, { step: 3, chinaStep: 6 });
    scene.add(far.ground, far.canopy, far.outer); if (far.china) scene.add(far.china);
    const lodSets = { far: { ground: far.ground, canopy: far.canopy } };

    // ---------------------------------------------------------------- sky, water
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { sun: { value: sunDir }, zen: { value: new THREE.Color(0x5f86b5) }, hor: { value: new THREE.Color(0xd6d8cf) }, glow: { value: new THREE.Color(0xffe2b0) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vD; uniform vec3 sun, zen, hor, glow;
        void main(){ float h = clamp(vD.y, -0.2, 1.0); vec3 col = mix(hor, zen, pow(max(h,0.0), 0.5));
          float s = max(dot(normalize(vD), sun), 0.0); col += glow * (pow(s, 6.0) * 0.5 + pow(s, 300.0) * 2.5);
          if (h < 0.0) col = hor; gl_FragColor = vec4(col, 1.0); }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); scene.add(sky);
    const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat.clone()));
    const env = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02).texture;
    const waterNormals = Terrain.waterNormalTexture(256); waterNormals.repeat.set(160, 160);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), Terrain.waterMaterial(terr, waterNormals, env));
    sea.renderOrder = 2; sea.material.userData.uniforms.uEdgeFog.value = 1; scene.add(sea);
    const rn = Terrain.waterNormalTexture(256); rn.repeat.set(1, 1);
    // far views lift narrow rivers above the coarse ground; close views keep them in their channels
    const waterFar = Terrain.waterBodies(terr, rn, env, { lift: true }), waterNear = Terrain.waterBodies(terr, rn, env, { lift: false });
    for (const w of [waterFar, waterNear]) { scene.add(w.rivers); if (w.lakes) scene.add(w.lakes); }
    const surfAt = (x, z) => { let best = 1e9, y = 0.3; for (const rv of baked.water.rivers) for (const p of rv.pts) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; y = p[2]; } } return y; };

    // ---------------------------------------------------------------- flags (faction standards)
    for (const m of Object.values(CityKit.mats)) if (!Array.isArray(m)) Terrain.receiveBaked(m, terr, 0.8);
    for (const m of CityKit.mats.cloth) Terrain.receiveBaked(m, terr, 0.8);
    const flagCache = {};
    // a faction's standard in its colour and glyph; a neutral garrison (no faction) flies a plain grey one
    const flagMat = (fid) => {
      if (!flagCache[fid]) {
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const g = cv.getContext('2d');
        g.fillStyle = FCOL[fid] ? '#' + FCOL[fid].getHexString() : '#8c8578'; g.fillRect(0, 0, 64, 96); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 84, 64, 12);
        g.font = '700 42px "Noto Serif CJK SC","Noto Serif SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fid === 'qin_shihuang' ? '#26221c' : '#fff';
        if (K.FACTIONS[fid]) g.fillText(K.FACTIONS[fid].glyph, 32, 44);
        const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
        flagCache[fid] = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 });
      }
      return flagCache[fid];
    };
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b3129, roughness: 0.8 });
    // a group of standards, merged per faction: [{ fid, x, y, z, h, s }]
    const bannerGroup = (list) => {
      const grp = new THREE.Group(), by = {};
      for (const b of list) if (b.fid) (by[b.fid] = by[b.fid] || []).push(b);
      for (const [fid, L] of Object.entries(by)) {
        const poles = [], cloths = [];
        for (const { x, y, z, h, s } of L) {
          poles.push(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, h, 4).translate(x, y + h / 2, z));
          const g = new THREE.PlaneGeometry(0.45 * s, 0.7 * s, 4, 1), p = g.attributes.position;
          for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / s + 0.2) * 9) * 0.04 * s);
          cloths.push(g.translate(x + 0.24 * s, y + h - 0.38 * s, z));
        }
        const pole = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(poles), poleMat), cloth = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(cloths), flagMat(fid));
        pole.castShadow = cloth.castShadow = true; grp.add(pole, cloth);
      }
      return grp;
    };

    // ---------------------------------------------------------------- cities: every seat in the light version, full on demand
    const cities = {}, boats = new CityKit.Bag(), smoke = [];
    const mooring = (c, e, full) => {
      const want = e.type === 'ships' ? e.n : full ? 7 : 3, cand = [];
      let sx = e.x, sz = e.z;
      if (e.type === 'ships') for (let r = 0, found = false; r < 6 && !found; r += 0.25) for (let k = 0; k < 24 && !found; k++) { const x = e.x + Math.cos(k * 0.2618) * r, z = e.z + Math.sin(k * 0.2618) * r; if (terr.riverSD(x, z) < -0.45) { sx = x; sz = z; found = true; } }
      for (let k = 0; k < 600 && cand.length < want; k++) {
        const a = K.rr(0, 6.283), d = K.rr(c.r * 0.6, c.r * 1.9);
        const x = e.type === 'ships' ? sx + K.rr(-1.5, 1.5) : c.x + Math.cos(a) * d, z = e.type === 'ships' ? sz + K.rr(-1.5, 1.5) : c.z + Math.sin(a) * d;
        if (e.dir && Math.cos(a) * e.dir[0] + Math.sin(a) * e.dir[1] < 0.5) continue;
        if (terr.riverSD(x, z) > -0.35 || cand.some(([u, v]) => Math.hypot(u - x, v - z) < 0.45)) continue;
        cand.push([x, z]);
      }
      return cand.map(([x, z]) => [e.type === 'ships' ? HanCity.warship(0.75) : HanCity.boat(K.rr(0.28, 0.4)), new THREE.Matrix4().makeRotationY(K.rr(0, 3.14)).setPosition(x, surfAt(x, z) + 0.01, z)]);
    };
    const liteRoots = [], liteSink = CityKit.sink();
    const citySeed = (pid) => [...pid].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7); // same light city in both builds
    for (const p of world.provinces) {
      const pid = p.id, c = MC[pid];
      // light cities share one merged set of meshes (~50 draw calls for all 20, as in round 8)
      K.seed(citySeed(pid));
      const root = HanCity.build(scene, { def: cityDefs[pid], x: c.x, y: c.y, z: c.z, scale: c.scale, lod: 'lite', sink: liteSink, groundAt: terr.h, wetAt: terr.riverSD });
      const A = root.userData.anchors, groves = [];
      for (const e of A.extras) {
        if (e.type === 'grove') for (let k = 0; k < e.w * e.d * (e.sparse ? 14 : 40); k++) groves.push([e.x + K.rr(-0.5, 0.5) * e.w, e.z + K.rr(-0.5, 0.5) * e.d, 0.9, e.y]);
        if (e.type === 'smoke') smoke.push([e.x, c.y + 0.35, e.z]);
        if (e.type === 'harbour' || e.type === 'ships') for (const [b, m] of mooring(c, e, false)) boats.merge(b, m);
      }
      const palace = A.palace ? [A.palace.x, A.palace.y, A.palace.z] : [c.x, c.y + 0.5, c.z];
      cities[pid] = { pid, name: p.city, c, lite: null, full: null, groves, palace, gates: A.gates, labels: A.labels };
      liteRoots.push(root);
    }
    const liteAll = CityKit.flush(liteSink, scene);
    // up close one city gives way to its full version: the others then come from light copies merged per city
    // (built once, on the first city view; culled per city)
    const ensureLiteSolo = () => {
      if (liteSolo) return;
      liteSolo = true;
      for (const p of world.provinces) {
        const c = MC[p.id], sk = CityKit.sink();
        K.seed(citySeed(p.id));
        const r = HanCity.build(scene, { def: cityDefs[p.id], x: c.x, y: c.y, z: c.z, scale: c.scale, lod: 'lite', sink: sk, groundAt: terr.h, wetAt: terr.riverSD });
        scene.remove(r);
        cities[p.id].lite = CityKit.flush(sk, scene); cities[p.id].lite.visible = false;
      }
    };
    let liteSolo = false;
    const boatMeshes = new THREE.Group(); boats.meshes(boatMeshes); scene.add(boatMeshes);
    const moatGeo = HanCity.moatGeometry(liteRoots);
    if (moatGeo) { const moat = new THREE.Mesh(moatGeo, waterNear.rivers.material); moat.renderOrder = 3; scene.add(moat); }
    let standards = null; // one great standard over each city, in its owner's colour
    const buildStandards = () => {
      if (standards) { scene.remove(standards); standards.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); } // rebuilt every turn: free the old one
      standards = bannerGroup(Object.values(cities).map((ci) => ({ fid: owners[ci.pid], x: ci.palace[0], y: ci.palace[1] - 0.3, z: ci.palace[2], h: 1.3, s: 0.75 })));
      scene.add(standards);
    };
    buildStandards();
    // the full city: walls, gates with standards, houses, its boats; replaces the light one while the camera is close
    const ensureFullCity = (pid) => {
      const ci = cities[pid];
      if (ci.full) return ci.full;
      const c = ci.c, grp = new THREE.Group();
      const root = HanCity.build(scene, { def: cityDefs[pid], x: c.x, y: c.y, z: c.z, scale: c.scale, lod: 'full', groundAt: terr.h, wetAt: terr.riverSD });
      scene.remove(root); grp.add(root);
      const A = root.userData.anchors, fid = owners[pid], bl = [];
      for (const g of A.gates) for (const sd of [-1, 1]) { const tx = -g.nz, tz = g.nx, off = g.w * 0.62; bl.push({ fid, x: g.x + tx * off * sd, y: g.top, z: g.z + tz * off * sd, h: 0.42, s: 0.24 }); }
      grp.add(bannerGroup(bl));
      const bag = new CityKit.Bag();
      for (const e of A.extras) if (e.type === 'harbour' || e.type === 'ships') for (const [b, m] of mooring(c, e, true)) bag.merge(b, m);
      const bm = new THREE.Group(); bag.meshes(bm); grp.add(bm);
      ci.full = { group: grp, owner: fid };
      grp.visible = false; scene.add(grp);
      return ci.full;
    };

    // ---------------------------------------------------------------- dressing
    scene.add(...Flora.hamlets(terr, { scale: 0.38 }), Flora.greatWall(terr, { scale: 0.45, color: 0xa08e70, towerEvery: 12 }));
    const br = Flora.bridges(terr, { wet: (x, z) => terr.riverSD(x, z) < 0, deck: (a, b) => Math.max(terr.h(a[0], a[1]), terr.h(b[0], b[1])) + 0.02, scale: 0.35, maxLen: 1.3 });
    if (br) scene.add(br);
    if (smoke.length) scene.add(Flora.clouds(smoke.flatMap(([x, y, z]) => [[x, y + 0.2, z, 0.5, 0.5], [x + 0.25, y + 0.55, z - 0.1, 0.8, 0.35], [x + 0.6, y + 0.9, z - 0.2, 1.1, 0.2]]), { color: 0x6b645c }));
    let borderClouds = null;
    if (terr.land) {
      const cl = [], CO = terr.CO;
      for (let k = 0; k < 4000 && cl.length < 26; k++) {
        const x = K.rr(CO.x0, CO.x0 + CO.w), z = K.rr(CO.z0, CO.z0 + CO.d);
        if (terr.landAt(x, z).china > 0.2 || ![[70, 0], [-70, 0], [0, 70], [0, -70]].some(([a, b]) => terr.landAt(x + a, z + b).china > 0.6)) continue;
        cl.push([x, K.rr(45, 70), z, K.rr(160, 280), 0.5]);
      }
      borderClouds = Flora.clouds(cl); scene.add(borderClouds);
    }
    // lone trees round a focus (the canopy shell carries the woods further out); tree budget as in decisions/0005
    const treeSets = {};
    const avoid = (x, z) => Object.values(MC).some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 0.9);
    const ensureTrees = (key, cx, cz, R, cityPid) => {
      if (treeSets[key]) return treeSets[key];
      let sp = cityPid ? 0.19 : 0.22, cover = 0, nS = 0;
      for (let a = -R; a <= R; a += 1) for (let b = -R; b <= R; b += 1) if (a * a + b * b < R * R) { nS++; cover += terr.forestAt(cx + a, cz + b) > 0.3 ? 1 : 0; }
      const est = ((cover / Math.max(1, nS)) * Math.PI * R * R) / (sp * sp);
      if (est > 14000) sp *= Math.sqrt(est / 14000);
      const grp = new THREE.Group();
      grp.add(...Flora.trees(terr, { cx, cz, R, scale: 0.24, spacing: sp, minForest: 0.3, lone: cityPid ? 1500 : 0, loneR: R, minH: 0.2, avoid, extra: cityPid ? cities[cityPid].groves : [] }));
      grp.visible = false; scene.add(grp);
      return (treeSets[key] = grp);
    };

    // ---------------------------------------------------------------- light, lens
    scene.add(new THREE.HemisphereLight(0xc6d6e8, 0x5a5238, 0.72));
    const sun = new THREE.DirectionalLight(0xffe4bf, 2.5);
    sun.shadow.mapSize.set(o.shadowMap || 4096, o.shadowMap || 4096); sun.shadow.bias = -0.0002;
    scene.add(sun, sun.target);
    const lens = K.lens(renderer, scene, camera, { focus: 100, range: 30, maxBlur: 3.5, ao: 1.0, aoRadius: 0.12, atmos: { density: 0.012, falloff: 0.3, color: 0xbac8cf, sunColor: 0xf6d7a0, sunDir } });
    const LU = lens.uniforms, blurK = renderer.getDrawingBufferSize(new THREE.Vector2()).y / 900;

    // ---------------------------------------------------------------- views
    const orbit = (t, D, az, el) => [t[0] + D * Math.cos(el) * Math.sin(az), t[1] + D * Math.sin(el), t[2] + D * Math.cos(el) * Math.cos(az)];
    const seatPt = (pid) => { const c = MC[pid]; return [c.x, c.y, c.z]; };
    const rt = { renderer, scene, camera, terr, MC, cities, world, sunDir, stats: { loadMs } };
    // keep the camera above the ground and its line of sight clear of ridges (raise it until the target shows)
    const clearSight = (cam, t, margin) => {
      cam = cam.slice();
      cam[1] = Math.max(cam[1], terr.h(cam[0], cam[2]) + margin);
      for (let k = 1; k < 10; k++) {
        const f = k / 10, x = cam[0] + (t[0] - cam[0]) * f, z = cam[2] + (t[2] - cam[2]) * f, y = cam[1] + (t[1] - cam[1]) * f, need = terr.h(x, z) + margin * 0.5 - y;
        if (need > 0) cam[1] += need / (1 - f);
      }
      return cam;
    };
    const cell = (x) => Math.round(x / 24); // level-of-detail sets are cached per camera cell
    // op.auto: turn round the target to the side with the clearest view (no ridge between the camera and the subject)
    const pickOrbit = (t, D, az, el, margin, auto) => {
      if (!auto) return clearSight(orbit(t, D, az, el), t, margin);
      let best = null;
      for (const d of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
        const c0 = orbit(t, D, az + d, el), c = clearSight(c0, t, margin), cost = c[1] - c0[1] + Math.abs(d) * D * 0.08;
        if (!best || cost < best.cost) best = { c, cost };
      }
      return best.c;
    };
    rt.viewOverview = () => ({ name: 'overview', target: [-330, 0, -150], cam: [-310, 1300, 1030], fov: 36, mode: 'far', clouds: true });
    // the campaign view between events: the 20 provinces of the Han core, from the south
    rt.viewCampaign = () => ({ name: 'campaign', target: [-45, 0, 25], cam: [-35, 430, 560], fov: 36, mode: 'far' });
    rt.viewProvince = (pid, op = {}) => {
      const t = seatPt(pid), cam = pickOrbit(t, op.d ?? 70, op.az ?? 0.35, op.el ?? 0.78, 4, op.auto);
      return { name: 'province:' + pid, target: t, cam, fov: 34, mode: 'near', lod: [PROV[pid]], key: 'p:' + pid, trees: [{ key: 'p:' + pid, x: t[0], z: t[2], R: 30 }] };
    };
    rt.viewCity = (pid, op = {}) => {
      const c = MC[pid], t = op.target || [c.x, c.y + 0.25, c.z], D = op.d ?? 3 + c.r * 2.5, cam = pickOrbit(t, D, op.az ?? 0.55, op.el ?? 0.6, 1.5, op.auto);
      // fine ground round the city and under the camera (the foreground), as the round-8 close shots
      return { name: 'city:' + pid, target: t, cam, fov: 30, mode: 'city', city: pid, D, lod: [[c.x, c.z], [cam[0], cam[2]]], key: 'c:' + pid + '@' + cell(cam[0]) + ',' + cell(cam[2]),
        trees: [{ key: 'c:' + pid, x: c.x, z: c.z, R: 22, city: pid }] };
    };
    // standing behind `from`, looking across to `to` (gate shots such as "tianshui_toward_changan")
    rt.viewLook = (from, to, op = {}) => {
      const a = seatPt(from), b = seatPt(to), dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      const t = [a[0] + dx * 0.6, (a[1] + b[1]) / 2, a[2] + dz * 0.6], back = op.back ?? Math.max(30, L * 0.55);
      const cam = clearSight([a[0] - ux * back, a[1] + (op.h ?? Math.max(28, L * 0.45)), a[2] - uz * back], t, 4);
      return { name: 'look:' + from + '>' + to, target: t, cam, fov: 34, mode: 'near', lod: [PROV[from], PROV[to]], key: 'l:' + from + '>' + to, trees: [] };
    };
    // following an army along a path (u in 0..1): from behind and above, on the line of the whole march (steady, no swing
    // at every bend of the road); the level of detail covers both ends of the march
    rt.viewFollow = (pts, u, op = {}) => {
      const p = rt.pointAlong(pts, u), a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
      const D = op.d ?? 34, ux = dx / L, uz = dz / L, cam = clearSight([p[0] - ux * D * 0.62 - uz * D * 0.22, p[1] + D * 0.8, p[2] - uz * D * 0.62 + ux * D * 0.22], p, 4);
      const n = Math.max(1, Math.round(L / 35)), lod = Array.from({ length: n + 1 }, (_, k) => { const q = rt.pointAlong(pts, k / n); return [q[0], q[2]]; });
      return { name: 'follow', target: p, cam, fov: 34, mode: 'near', lod, key: 'm:' + cell(a[0]) + ',' + cell(a[2]) + '>' + cell(b[0]) + ',' + cell(b[2]), trees: [] };
    };
    // in-between views: target straight, camera offset turned and scaled logarithmically (no swoop through the ground)
    rt.lerpView = (a, b, e) => {
      const ta = V3(a.target), tb = V3(b.target), oa = V3(a.cam).sub(ta), ob = V3(b.cam).sub(tb);
      const la = oa.length(), lb = ob.length(), len = Math.exp(Math.log(la) + (Math.log(lb) - Math.log(la)) * e);
      const dir = oa.normalize().lerp(ob.normalize(), e).normalize(), t = ta.lerp(tb, e), cam = t.clone().addScaledVector(dir, len);
      const mode = len > FAR_DIST ? 'far' : e < 0.5 && a.mode !== 'far' ? a.mode : b.mode;
      const src = mode === b.mode ? b : a;
      return { name: e < 1 ? 'between' : b.name, target: t.toArray(), cam: cam.toArray(), fov: a.fov + (b.fov - a.fov) * e, mode, lod: src.lod, key: src.key, trees: src.trees, city: src.city, D: src.D, clouds: (e < 0.5 ? a : b).clouds };
    };

    // ---------------------------------------------------------------- level of detail and the current view
    // Built on demand, kept while recently used: near ground sets, tree sets, full cities. The caps keep the GPU
    // buffers under decisions/0005 (≤ 150 MB); whatever the current view shows is never dropped.
    const freeMeshes = (o) => o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); if (m.isInstancedMesh) m.dispose(); } });
    const inUse = (kind, k) => !!current && (kind === 'near' ? current.key === k : kind === 'city' ? current.city === k : (current.trees || []).some((t) => t.key === k));
    const cache = (kind, keep, drop) => {
      const order = [];
      return (k) => {
        const i = order.indexOf(k); if (i >= 0) order.splice(i, 1); order.push(k);
        while (order.length > keep) { const old = order.find((x) => x !== k && !inUse(kind, x)); if (!old) break; order.splice(order.indexOf(old), 1); drop(old); }
      };
    };
    const touchNear = cache('near', 4, (k) => { const o = lodSets[k]; for (const x of [o.ground, o.canopy]) { scene.remove(x); x.geometry.dispose(); } delete lodSets[k]; });
    const touchTrees = cache('trees', 4, (k) => { scene.remove(treeSets[k]); freeMeshes(treeSets[k]); delete treeSets[k]; });
    const touchCity = cache('city', 2, (pid) => { const ci = cities[pid]; if (ci.full) { scene.remove(ci.full.group); freeMeshes(ci.full.group); ci.full = null; } });
    // near sets: fine ground within `near` of each focus point, coarser out to `mid`; the all-China mesh and horizon ring
    // are shared with the far set
    const nearSet = (key, pts, city) => {
      if (!lodSets[key]) {
        const m = Terrain.meshes(terr, { ground, canopy }, { focus: pts, near: city ? 20 : 18, mid: city ? 110 : 90, surfaceOnly: true });
        m.ground.visible = m.canopy.visible = false; m.ground.receiveShadow = true;
        scene.add(m.ground, m.canopy);
        lodSets[key] = m;
      }
      touchNear(key);
      return lodSets[key];
    };
    rt.prepare = (v) => {
      if (v.mode === 'far' || !v.key) return;
      nearSet(v.key, v.lod, v.city);
      if (v.city) { ensureLiteSolo(); ensureFullCity(v.city); touchCity(v.city); }
      for (const t of v.trees || []) { ensureTrees(t.key, t.x, t.z, t.R, t.city); touchTrees(t.key); }
    };
    let current = null;
    rt.setView = (v) => {
      rt.prepare(v);
      const mode = MODES[v.mode], dist = Math.hypot(v.cam[0] - v.target[0], v.cam[1] - v.target[1], v.cam[2] - v.target[2]);
      for (const [k, s] of Object.entries(lodSets)) s.ground.visible = s.canopy.visible = k === (v.mode === 'far' ? 'far' : v.key);
      for (const w of [waterFar, waterNear]) { const on = w === (v.mode === 'far' ? waterFar : waterNear); w.rivers.visible = on; if (w.lakes) w.lakes.visible = on; }
      if (borderClouds) borderClouds.visible = !!v.clouds; // the haze beyond the border of China belongs to the whole-country view
      const cityMode = v.mode === 'city' && !!v.city;
      liteAll.visible = !cityMode; standards.visible = !cityMode; // up close the city flies its gate banners instead
      for (const ci of Object.values(cities)) { const full = cityMode && v.city === ci.pid; if (ci.lite) ci.lite.visible = cityMode && !full; if (ci.full) ci.full.group.visible = full; }
      const treesOn = new Set(v.mode === 'far' ? [] : (v.trees || []).map((t) => t.key));
      for (const [k, g] of Object.entries(treeSets)) g.visible = treesOn.has(k);
      gu.uBorder.value = cu.uBorder.value = mode.border; gu.uBorderW.value = cu.uBorderW.value = mode.borderW; gu.uTint.value = mode.tint; cu.uTint.value = v.mode === 'far' ? mode.tint * 0.8 : 0; cu.uCanopyBorder.value = mode.canopyBorder; // on the campaign view forests carry the owner wash too
      camera.fov = v.fov; camera.position.set(...v.cam); camera.lookAt(...v.target);
      camera.far = v.mode === 'far' ? 6000 : 3000; camera.near = v.mode === 'city' ? Math.max(0.05, dist * 0.004) : dist * 0.02;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(); sky.position.copy(camera.position);
      const tgt = V3(v.target); sun.position.copy(tgt).addScaledVector(sunDir, 150); sun.target.position.copy(tgt); sun.target.updateMatrixWorld();
      sun.castShadow = v.mode !== 'far';
      const ss = v.mode === 'city' ? Math.max(8, dist * 0.75) : 40;
      Object.assign(sun.shadow.camera, { left: -ss, right: ss, top: ss, bottom: -ss, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.normalBias = v.mode === 'city' ? 0.03 : 0.1;
      const L = mode.lens;
      LU.focus.value = dist; LU.range.value = v.mode === 'city' ? dist * 1.6 : L.range; LU.maxBlur.value = L.maxBlur * blurK; LU.band.value.set(...L.band);
      LU.vignette.value = L.vignette; LU.contrast.value = L.contrast; LU.saturation.value = L.saturation; LU.aoStrength.value = L.ao; LU.aoRadius.value = L.aoR || 0.4;
      LU.atmos.value = L.atmos; LU.atmosFall.value = L.fall; LU.near.value = camera.near; LU.far.value = camera.far;
      LU.projScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      current = v;
    };
    rt.view = () => current;
    rt.focusProvince = (pid, op) => rt.setView(rt.viewProvince(pid, op));
    rt.focusCity = (pid, op) => rt.setView(rt.viewCity(pid, op));
    rt.campaign = () => rt.setView(rt.viewCampaign());
    rt.render = () => lens.render();

    // ---------------------------------------------------------------- places and paths
    rt.seatOf = (pid) => seatPt(pid);
    rt.palaceOf = (pid) => cities[pid].palace.slice();
    rt.ground = (x, z) => terr.h(x, z);
    // a march follows the baked road between neighbouring seats (march.md); without one, a straight line over the ground
    rt.pathBetween = (from, to) => {
      const r = terr.roads.find((q) => (q.a === from && q.b === to) || (q.a === to && q.b === from));
      let pts = r ? (r.a === from ? r.pts : r.pts.slice().reverse()) : null;
      if (!pts) { const a = PROV[from], b = PROV[to]; pts = Array.from({ length: 41 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 40, a[1] + ((b[1] - a[1]) * i) / 40]); }
      return pts.map(([x, z]) => [x, terr.h(x, z), z]);
    };
    rt.pointAlong = (pts, u) => {
      if (!pts._len) { pts._len = [0]; for (let k = 1; k < pts.length; k++) pts._len.push(pts._len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][2] - pts[k - 1][2])); }
      const L = pts._len, d = Math.max(0, Math.min(1, u)) * L[L.length - 1];
      let k = 1; while (k < L.length - 1 && L[k] < d) k++;
      const s = (d - L[k - 1]) / Math.max(1e-6, L[k] - L[k - 1]), a = pts[k - 1], b = pts[k], x = a[0] + (b[0] - a[0]) * s, z = a[2] + (b[2] - a[2]) * s;
      return [x, terr.h(x, z), z];
    };
    rt.project = (p) => { const v = V3(p).project(camera); return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, visible: v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1 }; };
    rt.size = { width: W, height: H };

    // ---------------------------------------------------------------- owners (from the engine's state, never decided here)
    rt.owners = () => Object.assign({}, owners);
    rt.setOwners = (next) => {
      owners = Object.assign({}, next); applyOwners(); buildStandards();
      for (const ci of Object.values(cities)) if (ci.full && ci.full.owner !== owners[ci.pid]) { scene.remove(ci.full.group); freeMeshes(ci.full.group); ci.full = null; }
      if (current) rt.setView(current);
    };
    // the player's legal attack targets and the chosen one, hatched on the terrain (presentation only; from the menu)
    rt.setFrontier = (pids, pick) => { const set = new Set(pids || []); return terr.setHighlight ? terr.setHighlight((pid) => (pid === pick ? 1 : set.has(pid) ? 0.6 : 0)) : false; };

    // ---------------------------------------------------------------- markers: generals and armies
    const FIG = {
      body: new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.85 }), skin: new THREE.MeshStandardMaterial({ color: 0xd2a67d, roughness: 0.8 }),
      horse: new THREE.MeshStandardMaterial({ color: 0x5b4331, roughness: 0.9 }), bronze: new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5, metalness: 0.4 }),
    };
    for (const m of Object.values(FIG)) Terrain.receiveBaked(m, terr, 0.8);
    const capeMat = {}; const cape = (fid) => (capeMat[fid] = capeMat[fid] || Terrain.receiveBaked(new THREE.MeshStandardMaterial({ color: FCOL[fid] || 0x888888, roughness: 0.8 }), terr, 0.8));
    // a mounted general, drawn larger than life like every campaign map (≈ the height of a city gate), with a great standard
    // built once per faction; every marker is a clone sharing its geometry (no GPU buffers per event)
    const generalTpl = {};
    const general = (fid) => (generalTpl[fid] = generalTpl[fid] || buildGeneral(fid)).clone();
    const buildGeneral = (fid) => {
      const g = new THREE.Group(), add = (geo, mat, x, y, z, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.castShadow = true; g.add(m); return m; };
      add(new THREE.CapsuleGeometry(0.11, 0.34, 4, 8), FIG.horse, 0, 0.34, 0, 0, Math.PI / 2);
      for (const [x, z] of [[-0.14, -0.07], [-0.14, 0.07], [0.14, -0.07], [0.14, 0.07]]) add(new THREE.CylinderGeometry(0.025, 0.02, 0.26, 5), FIG.horse, x, 0.13, z);
      add(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 6), FIG.horse, 0.25, 0.47, 0, 0, -0.6); // neck
      add(new THREE.BoxGeometry(0.14, 0.07, 0.08), FIG.horse, 0.33, 0.55, 0); // head
      add(new THREE.CylinderGeometry(0.07, 0.09, 0.24, 7), FIG.bronze, -0.02, 0.6, 0); // armoured rider
      add(new THREE.SphereGeometry(0.055, 8, 6), FIG.skin, -0.02, 0.77, 0);
      add(new THREE.ConeGeometry(0.06, 0.09, 8), FIG.bronze, -0.02, 0.84, 0); // helmet
      add(new THREE.PlaneGeometry(0.22, 0.28), cape(fid), -0.1, 0.6, 0, Math.PI / 2).material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 4), poleMat, -0.12, 0.95, 0.1); // standard pole
      const flag = add(new THREE.PlaneGeometry(0.36, 0.54, 3, 1), flagMat(fid), -0.12 + 0.19, 1.3, 0.1);
      flag.material = flagMat(fid);
      g.userData.fid = fid;
      return g;
    };
    const soldier = THREE.BufferGeometryUtils.mergeBufferGeometries([Flora.colored(new THREE.BoxGeometry(0.13, 0.24, 0.09).translate(0, 0.2, 0), 0xffffff), Flora.colored(new THREE.BoxGeometry(0.08, 0.08, 0.08).translate(0, 0.37, 0), 0xd9b08a), Flora.colored(new THREE.BoxGeometry(0.015, 0.62, 0.015).translate(0.08, 0.34, 0), 0x5c4a36)]);
    const soldierMat = Terrain.receiveBaked(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), terr, 0.8);
    // a column of soldiers in the faction's colour behind the general (local frame: marching toward +x)
    const column = (fid, cols = 5, rows = 12, sp = 0.14) => {
      const n = cols * rows, men = new THREE.InstancedMesh(soldier, soldierMat, n), m4 = new THREE.Matrix4(), col = (FCOL[fid] || new THREE.Color(0x8c8578)).clone().lerp(new THREE.Color(0x3a3530), 0.3);
      men.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      let k = 0; for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { men.setMatrixAt(k, m4.makeTranslation(-0.45 - i * sp + K.rr(-0.02, 0.02), 0, (j - (cols - 1) / 2) * sp + K.rr(-0.02, 0.02)).multiply(new THREE.Matrix4().makeScale(0.5, 0.5, 0.5))); men.setColorAt(k++, col); }
      men.castShadow = true; men.frustumCulled = false;
      return men;
    };
    const markers = new THREE.Group(); scene.add(markers);
    // army: general + column, placed on the ground at p facing along (dx, dz); scale grows with the camera distance
    rt.addArmy = (fid, withColumn = true) => {
      const g = new THREE.Group(); g.add(general(fid)); if (withColumn) g.add(column(fid)); g.visible = false; markers.add(g);
      g.userData.place = (p, dir, s = 1) => { g.position.set(p[0], rt.ground(p[0], p[2]), p[2]); g.rotation.y = Math.atan2(-dir[1], dir[0]); g.scale.setScalar(s); g.visible = true; };
      return g;
    };
    // a standard planted over a city (a result shown, not an owner changed)
    rt.addStandard = (fid) => { const g = bannerGroup([{ fid, x: 0, y: 0, z: 0, h: 1.7, s: 1.0 }]); g.traverse((o) => { if (o.isMesh) o.userData.ownGeo = true; }); g.visible = false; markers.add(g); return g; };
    // battle dust at a point
    let dustTpl = null; // one set of sprites and one texture, cloned per battle
    rt.addDust = () => { dustTpl = dustTpl || Flora.clouds([[0, 0.6, 0, 3.2, 0.55], [0.8, 0.9, 0.4, 2.4, 0.45], [-0.7, 0.8, -0.3, 2.8, 0.5]], { color: 0x9a8a70 }); const g = dustTpl.clone(); g.visible = false; markers.add(g); return g; };
    // removing a marker frees what it alone owns (its soldiers' instance buffers, a planted standard's geometry)
    rt.removeMarker = (m) => {
      if (!m) return;
      if (m.parent) m.parent.remove(m);
      m.traverse((o) => { if (o.isInstancedMesh) o.dispose(); else if (o.isMesh && o.userData.ownGeo) o.geometry.dispose(); });
    };
    rt.clearMarkers = () => { while (markers.children.length) rt.removeMarker(markers.children[0]); };

    // ---------------------------------------------------------------- measure
    rt.measure = () => { renderer.info.autoReset = false; renderer.info.reset(); const f0 = performance.now(); lens.render(); renderer.getContext().finish(); const s = K.stats(renderer, scene, { frameMs: performance.now() - f0 }); renderer.info.autoReset = true; return s; };
    rt.stats.buildMs = performance.now() - T0; rt.stats.terrainMs = terr.buildMs; rt.stats.tiles = baked.tilesLoaded;
    rt.setView(rt.viewCampaign());
    return rt;
  };
})();
