// Round-4 map dressing: individual trees near the camera focus, hamlets, the Great Wall, bridges, clouds.
// Everything is instanced or merged into a handful of draw calls (docs/decisions/0005).
(function () {
  const F = (window.Flora = {});
  const BGU = THREE.BufferGeometryUtils;
  const { clamp, sstep } = Terrain.util;
  const { vnoise } = Terrain.noise;
  const rr = Terrain.rr, rnd = Terrain.rnd;

  function colored(geo, hex, bottomDark = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position, n = p.count, a = new Float32Array(n * 3), c = new THREE.Color(hex);
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
    for (let i = 0; i < n; i++) { const k = 1 - bottomDark * (1 - (p.getY(i) - y0) / Math.max(1e-4, y1 - y0)); a.set([c.r * k, c.g * k, c.b * k], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (g.attributes.uv) g.deleteAttribute('uv');
    return g;
  }
  function lumpy(geo, amt, s) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + amt * (vnoise(x * 4 + s, z * 4 + y * 3) - 0.5); p.setXYZ(i, x * k, y * k, z * k); } geo.computeVertexNormals(); return geo; }
  F.colored = colored;

  // ~50-triangle trees: broadleaf (two lumpy crowns) and conifer (two cones). Sized like the canopy shell.
  const broadGeo = () => BGU.mergeBufferGeometries([
    colored(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 4).translate(0, 0.2, 0), 0x4a3826),
    colored(lumpy(new THREE.IcosahedronGeometry(0.34, 0), 0.5, 1).translate(0, 0.62, 0), 0x2b4520, 0.45),
    colored(lumpy(new THREE.IcosahedronGeometry(0.25, 0), 0.5, 2).translate(0.14, 0.86, 0.06), 0x3a5a28, 0.35),
  ]);
  const pineGeo = () => BGU.mergeBufferGeometries([
    colored(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 4).translate(0, 0.15, 0), 0x4a3826),
    colored(new THREE.ConeGeometry(0.3, 0.6, 6).translate(0, 0.52, 0), 0x1d3522, 0.4),
    colored(new THREE.ConeGeometry(0.21, 0.5, 6).translate(0, 0.86, 0), 0x25432a, 0.3),
  ]);
  // Split instances into ~48-unit cells, each its own InstancedMesh with a bounding sphere around its
  // instances, so the camera AND the shadow pass skip cells out of view (three r146 does not cull per instance).
  F.chunk = function (geo, mat, list, cell = 48) {
    const cells = new Map();
    for (const it of list) { const k = Math.floor(it.m.elements[12] / cell) + ':' + Math.floor(it.m.elements[14] / cell); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(it); }
    const out = [];
    for (const items of cells.values()) {
      const g = geo.clone();
      const im = new THREE.InstancedMesh(g, mat, items.length);
      const box = new THREE.Box3(), p = new THREE.Vector3();
      items.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c) { if (!im.instanceColor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3); im.setColorAt(i, it.c); } box.expandByPoint(p.setFromMatrixPosition(it.m)); });
      g.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); g.boundingSphere.radius += 3;
      im.frustumCulled = true; // r146 turns culling off for InstancedMesh; our per-cell sphere makes it safe
      im.castShadow = im.receiveShadow = true;
      out.push(im);
    }
    return out;
  };
  const inst = (geo, n, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); m.count = 0; return m; };
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
  const put = (m, x, y, z, yaw, sx, sy, tint) => { _m.compose(_v.set(x, y, z), _q.setFromAxisAngle(_y, yaw), _s.set(sx, sy, sx)); m.setMatrixAt(m.count, _m); m.setColorAt(m.count, tint); m.count++; };

  // Trees inside the focus disc replace the canopy shell there; a few lone trees everywhere break up open land.
  F.trees = function (terr, o) {
    const mat = Terrain.receiveBaked(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), terr);
    const lists = { broad: [], pine: [] };
    const place = (x, z, f) => {
      const g = terr.h(x, z); if (g < 0.4) return;
      const lift = terr.canopyLift(x, z), h = lift > 0 ? g + lift * 0.55 : g; // trees rise out of the canopy
      const conifer = h > 5 || terr.region(x, z).loess > 0.4 ? rnd() < 0.8 : rnd() < 0.15;
      const s = rr(0.8, 1.2) * (0.75 + 0.35 * f);
      const tint = _c.setHSL(0.2 + rr(-0.05, 0.06), rr(0.15, 0.4), rr(0.62, 0.95));
      if (o.season && !conifer && rnd() < 0.6 * o.season) tint.setHSL(rr(0.05, 0.12), 0.6, rr(0.75, 1));
      (conifer ? lists.pine : lists.broad).push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.05, z), new THREE.Quaternion().setFromAxisAngle(_y, rnd() * 6.28), new THREE.Vector3(s, s * rr(0.9, 1.25), s)), c: tint.clone() });
    };
    if (o.R) {
      const sp = 0.5;
      for (let x = o.cx - o.R; x < o.cx + o.R; x += sp) for (let z = o.cz - o.R; z < o.cz + o.R; z += sp) {
        const jx = x + rr(-0.2, 0.2), jz = z + rr(-0.2, 0.2); if (Math.hypot(jx - o.cx, jz - o.cz) > o.R) continue;
        const f = terr.forestAt(jx, jz); if (rnd() > f * 1.1) continue;
        place(jx, jz, f);
      }
    }
    // lone trees: along field edges, roads and villages (TW3K scatters them everywhere)
    const G = terr.G;
    for (let k = 0, n = 0; k < 300000 && n < (o.lone || 5000); k++) {
      const x = rr(G.x0 + 2, G.x0 + G.w - 2), z = rr(G.z0 + 2, G.z0 + G.d - 2);
      if (o.R && Math.hypot(x - o.cx, z - o.cz) < o.R) continue;
      const f = terr.forestAt(x, z), fl = terr.fieldAt(x, z), rd = terr.roadD(x, z);
      if (f > 0.1 || terr.h(x, z) < 0.45 || terr.riverSD(x, z) < 0.8 || rd < 0.6) continue;
      const want = (fl > 0.2 && fl < 0.8 ? 0.35 : 0.06) + (rd < 1.8 ? 0.3 : 0) + (terr.region(x, z).loess > 0.5 ? -0.05 : 0);
      if (rnd() > want) continue;
      place(x, z, 0.6); n++;
    }
    return [...F.chunk(broadGeo(), mat, lists.broad, 80), ...F.chunk(pineGeo(), mat, lists.pine, 80)];
  };

  // Hamlets: clusters of small courtyard houses using the city kit's roofs at lite detail.
  F.hamlets = function (terr) {
    // ~70-triangle farmhouse in ONE vertex-coloured material (one draw call per cell):
    // plastered box + a 2x1-segment curved roof from the city kit
    const TONE = { plaster: 0xd4ccbb, roof: 0x3f4247, ridge: 0x303236, wood: 0x4a2e20 };
    const house = (w, d, hgt, rh) => {
      const roof = CityKit.hipRoof(w, d, rh, { segU: 2, segS: 1 });
      const parts = [colored(new THREE.BoxGeometry(w, hgt, d).translate(0, hgt / 2, 0), TONE.plaster)];
      for (const [k, list] of Object.entries(roof.parts)) for (const g of list) parts.push(colored(g.clone().translate(0, hgt, 0), TONE[k] || TONE.roof));
      return BGU.mergeBufferGeometries(parts);
    };
    CityKit.setDetail('lite');
    const houseA = house(0.7, 0.45, 0.3, 0.2), houseB = house(0.55, 0.4, 0.26, 0.17);
    CityKit.setDetail('full');
    const houseMat = Terrain.receiveBaked(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), terr);
    const LA = [], LB = [];
    for (const hm of terr.hamlets) {
      const yaw0 = Math.round(rr(-2, 2)) * (Math.PI / 2) + rr(-0.15, 0.15);
      for (let k = 0; k < hm.n; k++) {
        const a = rnd() * 6.28, r = rr(0.3, 2.2), x = hm.x + Math.cos(a) * r, z = hm.z + Math.sin(a) * r;
        if (terr.riverSD(x, z) < 0.6) continue;
        (rnd() < 0.5 ? LA : LB).push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, terr.h(x, z) - 0.02, z), new THREE.Quaternion().setFromAxisAngle(_y, yaw0 + (rnd() < 0.3 ? Math.PI / 2 : 0)), new THREE.Vector3(1, 1, 1)) });
      }
    }
    return [...F.chunk(houseA, houseMat, LA, 80), ...F.chunk(houseB, houseMat, LB, 80)];
  };

  // The Great Wall follows the Yan ridge: rammed-earth/brick ribbon with watchtowers.
  F.greatWall = function (terr) {
    const line = Terrain.spline(Terrain.geo.WALL.map(([x, z]) => [x * terr.S, z * terr.S]), 0.25);
    const parts = [];
    const wallMat = Terrain.receiveBaked(new THREE.MeshStandardMaterial({ color: 0x8b8173, roughness: 0.95 }), terr);
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
      const x = (ax + bx) / 2, z = (az + bz) / 2, y = Math.max(terr.h(ax, az), terr.h(bx, bz), 0.3);
      parts.push(new THREE.BoxGeometry(0.34, 0.5, len + 0.04).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.1, z), new THREE.Quaternion().setFromAxisAngle(_y, yaw), new THREE.Vector3(1, 1, 1))));
      if (i % 14 === 0) parts.push(new THREE.BoxGeometry(0.62, 0.95, 0.62).translate(x, y + 0.3, z));
    }
    const mesh = new THREE.Mesh(BGU.mergeBufferGeometries(parts), wallMat);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };

  // Wooden bridges where roads cross water.
  F.bridges = function (terr) {
    const parts = [];
    for (const r of terr.roads) {
      let run = [];
      const flush = () => {
        if (run.length > 1) {
          const [ax, az] = run[0], [bx, bz] = run[run.length - 1];
          const ex = (bx - ax) / (Math.hypot(bx - ax, bz - az) || 1), ez = (bz - az) / (Math.hypot(bx - ax, bz - az) || 1);
          const a2 = [ax - ex * 0.6, az - ez * 0.6], b2 = [bx + ex * 0.6, bz + ez * 0.6];
          const len = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]), yaw = Math.atan2(ex, ez);
          const m = new THREE.Matrix4().compose(new THREE.Vector3((a2[0] + b2[0]) / 2, 0.42, (a2[1] + b2[1]) / 2), new THREE.Quaternion().setFromAxisAngle(_y, yaw), new THREE.Vector3(1, 1, 1));
          parts.push(new THREE.BoxGeometry(0.55, 0.08, len).applyMatrix4(m));
          for (let t = -len / 2; t <= len / 2; t += 0.9) for (const e of [-0.24, 0.24]) parts.push(new THREE.BoxGeometry(0.06, 0.8, 0.06).translate(e, 0.05, t).applyMatrix4(m));
        }
        run = [];
      };
      for (let k = 0; k < r.pts.length; k++) { const [x, z] = r.pts[k]; if (terr.h(x, z) < 0.25) run.push([x, z]); else flush(); }
      flush();
    }
    if (!parts.length) return null;
    const mesh = new THREE.Mesh(BGU.mergeBufferGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.85 }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };

  // Soft cloud sprites: a band at the map edge and wisps around the high ranges.
  F.clouds = function (list, o = {}) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = 128 + (Math.random() - 0.5) * 120, y = 140 + (Math.random() - 0.5) * 50, r = 30 + Math.random() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const grp = new THREE.Group();
    for (const [x, y, z, s, op] of list) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op ?? 0.8, color: o.color ?? 0xffffff, fog: false }));
      sp.position.set(x, y, z); sp.scale.set(s, s * 0.45, 1); grp.add(sp);
    }
    return grp;
  };
})();
