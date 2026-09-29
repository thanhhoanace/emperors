// Shared toy-diorama kit for the three design mock renders (three r146, global THREE).
(function () {
  const K = (window.K = {});
  THREE.ColorManagement.legacyMode = false; // hex colors are sRGB
  let seed = 7;
  K.seed = (s) => (seed = s);
  K.r = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  K.rr = (a, b) => a + (b - a) * K.r();

  K.FACTIONS = {
    qin_shihuang: { name: 'Tần Thủy Hoàng', glyph: '秦', color: 0xc9a227, roof: 0x2b2722 },
    li_shimin: { name: 'Lý Thế Dân', glyph: '唐', color: 0x3b6fd8, roof: 0x2f5fb8 },
    zhu_yuanzhang: { name: 'Chu Nguyên Chương', glyph: '明', color: 0xb3262e, roof: 0xa82a2f },
    liu_che: { name: 'Lưu Triệt', glyph: '漢', color: 0x7c4dcc, roof: 0x6a45b0 },
    cao_cao: { name: 'Tào Tháo', glyph: '魏', color: 0x44593a, roof: 0x3b4d33 },
    liu_bei: { name: 'Lưu Bị', glyph: '蜀', color: 0x3fae5a, roof: 0x49b561 },
    sun_quan: { name: 'Tôn Quyền', glyph: '吳', color: 0xe07b24, roof: 0xd0701f },
  };

  // opts.quality (a Quality tier, see quality.js) sets the pixel ratio unless opts.dpr says otherwise, and the shadows:
  // none on `low`, plain PCF on `mid`, soft on `high` (and when no tier is given, as before).
  K.setup = function (w, h, opts = {}) {
    const q = opts.quality || null;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(opts.dpr || (q && q.dpr) || 1);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = !q || q.shadow > 0;
    renderer.shadowMap.type = q && q.tier === 'mid' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.userData = Object.assign(renderer.userData || {}, { quality: q });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 1.0;
    document.body.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 30, w / h, 1, 2000);
    return { renderer, scene, camera };
  };

  K.gradient = function (top, bottom) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  };

  K.lights = function (scene, o = {}) {
    const hemi = new THREE.HemisphereLight(o.sky || 0xfff4e0, o.ground || 0x8a7a60, o.hemi || 0.85);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(o.sun || 0xfff0d6, o.sunI || 2.1);
    sun.position.set(...(o.dir || [-60, 110, 50]));
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const s = o.shadowSize || 140;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 500 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.4;
    sun.shadow.radius = 3;
    if (o.target) sun.target.position.set(...o.target);
    scene.add(sun, sun.target);
    return { hemi, sun };
  };

  const matCache = {};
  K.mat = function (color, o = {}) {
    const key = color + JSON.stringify(o);
    if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.82, metalness: o.metal ?? 0, flatShading: o.flat ?? true, emissive: o.emissive || 0, transparent: !!o.opacity, opacity: o.opacity ?? 1 });
    return matCache[key];
  };

  K.mesh = function (geo, color, o) {
    const m = new THREE.Mesh(geo, K.mat(color, o));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  K.box = (w, h, d, color, o) => K.mesh(new THREE.BoxGeometry(w, h, d), color, o);

  // Chinese hip roof: a shallow flared eave frustum under a steeper cap.
  K.roof = function (w, d, h, color) {
    const g = new THREE.Group();
    const R = Math.SQRT1_2; // radius of a unit square
    const eave = K.mesh(new THREE.CylinderGeometry(R * 0.8, R * 1.0, 0.35, 4, 1).rotateY(Math.PI / 4), color);
    eave.scale.set(w, h * 0.9, d);
    eave.position.y = h * 0.16;
    const cap = K.mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.78, 0.65, 4, 1).rotateY(Math.PI / 4), color);
    cap.scale.set(w, h, d);
    cap.position.y = h * 0.16 + h * 0.48;
    const ridge = K.box(Math.max(0.3, w - d * 0.75) + 0.3, h * 0.1, 0.16, 0x2a2622);
    ridge.position.y = h * 0.16 + h * 0.8;
    g.add(eave, cap, ridge);
    return g;
  };

  K.hall = function (w, d, h, roofColor, o = {}) {
    const g = new THREE.Group();
    const base = K.box(w + 0.6, 0.35, d + 0.6, o.base || 0xd8cdb8);
    base.position.y = 0.175;
    const body = K.box(w, h, d, o.wall || 0xf3ead8);
    body.position.y = 0.35 + h / 2;
    const band = K.box(w + 0.02, h * 0.28, d + 0.02, o.pillar || 0xa2412e);
    band.position.y = 0.35 + h * 0.22;
    const roof = K.roof(w * 1.35, d * 1.45, Math.max(1.1, h * 0.8), roofColor);
    roof.position.y = 0.35 + h;
    g.add(base, body, band, roof);
    g.userData.height = 0.35 + h + Math.max(1.1, h * 0.8) * 1.2;
    return g;
  };

  K.pagoda = function (tiers, roofColor, o = {}) {
    const g = new THREE.Group();
    let y = 0;
    const base = K.box(4.2, 0.5, 4.2, 0xd8cdb8);
    base.position.y = 0.25;
    g.add(base);
    y = 0.5;
    for (let i = 0; i < tiers; i++) {
      const s = 3 - i * (1.6 / Math.max(1, tiers));
      const hgt = 1.25;
      const body = K.box(s, hgt, s, i % 2 ? 0xf3ead8 : 0xe9dcc2);
      body.position.y = y + hgt / 2;
      const roof = K.roof(s * 1.55, s * 1.55, 0.9, roofColor);
      roof.position.y = y + hgt;
      g.add(body, roof);
      y += hgt + 0.55;
    }
    const spire = K.mesh(new THREE.ConeGeometry(0.18, 1.6, 6), o.spire || 0xd6b04a, { rough: 0.4, metal: 0.4 });
    spire.position.y = y + 0.6;
    g.add(spire);
    g.userData.height = y + 1.4;
    return g;
  };

  K.flagTex = {};
  K.flag = function (fid, h = 5) {
    const f = K.FACTIONS[fid];
    if (!K.flagTex[fid]) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 192;
      const g = c.getContext('2d');
      g.fillStyle = '#' + f.color.toString(16).padStart(6, '0');
      g.fillRect(0, 0, 128, 192);
      g.fillStyle = 'rgba(255,255,255,.92)';
      g.font = '700 92px "Noto Serif CJK SC","Noto Serif SC","Songti SC",serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(f.glyph, 64, 92);
      const t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      K.flagTex[fid] = t;
    }
    const grp = new THREE.Group();
    const pole = K.mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 5), 0x4a3526);
    pole.position.y = h / 2;
    const geo = new THREE.PlaneGeometry(1.4, 2.1, 6, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) + 0.7) * 3) * 0.12);
    geo.computeVertexNormals();
    const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: K.flagTex[fid], side: THREE.DoubleSide, roughness: 0.9 }));
    cloth.castShadow = true;
    cloth.position.set(0.72, h - 1.1, 0);
    grp.add(pole, cloth);
    return grp;
  };

  // Voxel people, instanced per body part so crowds stay cheap.
  K.Crowd = class {
    constructor(scene, cap = 2000) {
      const mk = (geo, color) => {
        const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), cap);
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
        m.castShadow = true;
        m.receiveShadow = true;
        m.count = 0;
        m.userData.base = color;
        scene.add(m);
        return m;
      };
      this.legs = mk(new THREE.BoxGeometry(0.36, 0.42, 0.24).translate(0, 0.21, 0));
      this.body = mk(new THREE.BoxGeometry(0.46, 0.5, 0.3).translate(0, 0.67, 0));
      this.head = mk(new THREE.BoxGeometry(0.3, 0.3, 0.3).translate(0, 1.07, 0));
      this.hat = mk(new THREE.BoxGeometry(0.34, 0.12, 0.34).translate(0, 1.26, 0));
      this.spear = mk(new THREE.BoxGeometry(0.05, 1.7, 0.05).translate(0.3, 0.95, 0));
      this.n = 0;
      this.m = new THREE.Matrix4();
      this.q = new THREE.Quaternion();
      this.c = new THREE.Color();
    }
    add(x, y, z, o = {}) {
      const s = o.scale || 1;
      const q = this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw || 0);
      this.m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
      const i = this.n++;
      const set = (mesh, color) => {
        mesh.setMatrixAt(i, this.m);
        mesh.setColorAt(i, this.c.set(color));
        mesh.count = this.n;
      };
      set(this.legs, o.legs || 0x3b342c);
      set(this.body, o.body || 0x8a8f96);
      set(this.head, o.skin || 0xf0c9a0);
      set(this.hat, o.hat || o.body || 0x333333);
      if (o.spear) set(this.spear, 0x6b5a45);
      else {
        this.m.makeScale(0, 0, 0);
        this.spear.setMatrixAt(i, this.m);
        this.spear.setColorAt(i, this.c.set(0));
        this.spear.count = this.n;
      }
    }
    // Gray everything outside a circle (Ryan's focus treatment).
    focus(cx, cz, radius, amount = 0.85) {
      for (const mesh of [this.legs, this.body, this.head, this.hat, this.spear]) {
        const p = new THREE.Vector3();
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, this.m);
          p.setFromMatrixPosition(this.m);
          if (Math.hypot(p.x - cx, p.z - cz) > radius) {
            mesh.getColorAt(i, this.c);
            const l = this.c.r * 0.3 + this.c.g * 0.59 + this.c.b * 0.11;
            this.c.lerp(new THREE.Color(l * 0.92, l * 0.92, l * 0.92), amount);
            mesh.setColorAt(i, this.c);
          }
        }
        mesh.instanceColor.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    done() {
      for (const mesh of [this.legs, this.body, this.head, this.hat, this.spear]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  };

  K.soldiers = function (crowd, fid, cx, y, cz, cols, rows, o = {}) {
    const f = K.FACTIONS[fid];
    const gap = o.gap || 0.8;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = cx + (c - (cols - 1) / 2) * gap;
        const z = cz + (r - (rows - 1) / 2) * gap;
        crowd.add(x, typeof y === 'function' ? y(x, z) : y, z, { body: f.color, hat: 0x2c2a27, spear: true, yaw: o.yaw || 0, scale: o.scale || 1 });
      }
  };

  // Instanced trees: cones (conifer) and blobs (broadleaf).
  K.Forest = class {
    constructor(scene, cap = 4000) {
      const mk = (geo) => {
        const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), cap);
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
        m.castShadow = true;
        m.receiveShadow = true;
        m.count = 0;
        scene.add(m);
        return m;
      };
      this.cone = mk(new THREE.ConeGeometry(0.9, 2.6, 6).translate(0, 1.6, 0));
      this.blob = mk(new THREE.IcosahedronGeometry(1.05, 0).translate(0, 1.5, 0));
      this.trunk = mk(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 5).translate(0, 0.35, 0));
      this.m = new THREE.Matrix4();
      this.c = new THREE.Color();
    }
    add(x, y, z, kind, s = 1, color) {
      const mesh = kind === 'cone' ? this.cone : this.blob;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), K.r() * 6.28);
      this.m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * K.rr(0.85, 1.2), s));
      const i = mesh.count++;
      mesh.setMatrixAt(i, this.m);
      mesh.setColorAt(i, this.c.set(color || (kind === 'cone' ? 0x3f7a4a : 0x79a857)));
      const j = this.trunk.count++;
      this.trunk.setMatrixAt(j, this.m);
      this.trunk.setColorAt(j, this.c.set(0x6d5238));
    }
    focus(cx, cz, radius, amount = 0.85) {
      K.Crowd.prototype.focus.call({ legs: this.cone, body: this.blob, head: this.trunk, hat: { count: 0, instanceColor: {}, instanceMatrix: {} }, spear: { count: 0, instanceColor: {}, instanceMatrix: {} }, m: this.m, c: this.c }, cx, cz, radius, amount);
    }
    done() {
      for (const m of [this.cone, this.blob, this.trunk]) {
        m.instanceMatrix.needsUpdate = true;
        m.instanceColor.needsUpdate = true;
      }
    }
  };

  // Desaturate every plain mesh outside the focus circle (clones materials).
  K.grayOutside = function (root, cx, cz, radius, amount = 0.85, skip) {
    const p = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || (skip && skip(o))) return;
      o.getWorldPosition(p);
      if (Math.hypot(p.x - cx, p.z - cz) <= radius) return;
      const m = o.material.clone();
      if (m.color) {
        const c = m.color;
        const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
        c.lerp(new THREE.Color(l * 0.93, l * 0.93, l * 0.93), amount);
      }
      if (m.map) m.color.setScalar(0.75);
      o.material = m;
    });
  };

  K.ribbon = function (points, width, color, yOf, o = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const n = o.segments || 160;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nx = -tan.z;
      const nz = tan.x;
      const w = width * (o.taper ? 0.55 + 0.45 * t : 1);
      for (const s of [-1, 1]) {
        const x = p.x + nx * w * 0.5 * s;
        const z = p.z + nz * w * 0.5 * s;
        pos.push(x, yOf(x, z) + (o.lift ?? 0.08), z);
      }
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    m.userData.curve = curve;
    return m;
  };

  K.cloud = function (scale = 1) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(K.r() * 3);
    for (let i = 0; i < n; i++) {
      const b = K.mesh(new THREE.IcosahedronGeometry(K.rr(1.6, 2.6), 1), 0xffffff, { rough: 1 });
      b.position.set((i - n / 2) * 1.7 + K.rr(-0.4, 0.4), K.rr(-0.2, 0.8), K.rr(-0.8, 0.8));
      b.scale.y = 0.72;
      g.add(b);
    }
    g.scale.setScalar(scale);
    return g;
  };

  // Lens pass: depth-of-field by depth + a tilt-shift band, then tone map.
  // o.quality (a Quality tier) with ssao false keeps the AO strength at 0, with dof false the blur at 0; the shader
  // skips both loops at 0. Pages that drive the uniforms afterwards read lens.quality for the same caps.
  K.lens = function (renderer, scene, camera, o = {}) {
    const q = o.quality || null;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    rt.depthTexture = new THREE.DepthTexture(size.x, size.y);
    rt.depthTexture.type = THREE.UnsignedIntType;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: rt.texture },
        tDepth: { value: rt.depthTexture },
        near: { value: camera.near },
        far: { value: camera.far },
        focus: { value: o.focus || 100 },
        range: { value: o.range || 30 },
        maxBlur: { value: (q && !q.dof ? 0 : o.maxBlur || 7) * (size.y / 900) },
        band: { value: new THREE.Vector2(o.bandCenter ?? 0.5, o.bandWidth ?? 0.22) },
        tilt: { value: o.tilt ?? 1 },
        res: { value: size },
        vignette: { value: o.vignette ?? 0.18 },
        projInv: { value: camera.projectionMatrixInverse },
        camWorld: { value: camera.matrixWorld },
        focusXZ: { value: new THREE.Vector2(...(o.focusXZ || [0, 0])) },
        focusR: { value: o.focusR || 0 },
        grayAmt: { value: o.gray ?? 0 },
        contrast: { value: o.contrast ?? 1.0 },
        aoStrength: { value: q && !q.ssao ? 0 : (o.ao ?? 0) },
        aoRadius: { value: o.aoRadius ?? 0.4 },
        projScale: { value: size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) },
        saturation: { value: o.saturation ?? 1.0 },
        // aerial perspective: haze thickens with distance and in low ground, warms toward the sun
        atmos: { value: o.atmos ? o.atmos.density : 0 },
        atmosFall: { value: o.atmos ? o.atmos.falloff ?? 0.12 : 0.12 },
        atmosCol: { value: new THREE.Color(o.atmos ? o.atmos.color ?? 0xb9c7cf : 0xb9c7cf) },
        atmosSun: { value: new THREE.Color(o.atmos ? o.atmos.sunColor ?? 0xf3d9a6 : 0xf3d9a6) },
        sunDirW: { value: o.atmos && o.atmos.sunDir ? o.atmos.sunDir.clone().normalize() : new THREE.Vector3(0, 1, 0) },
        camPos: { value: camera.position },
        // the season's grade and ground mist (K.wx.grade): identity by default, and nothing else writes them, so a page's
        // per-view saturation / contrast stay its own. Mist lies in the low ground: density, e-folding height, base height
        gradeMul: { value: new THREE.Vector3(1, 1, 1) }, gradeLift: { value: new THREE.Vector3(0, 0, 0) }, gradeSat: { value: 1 }, gradeCon: { value: 1 },
        mist: { value: 0 }, mistH: { value: 1 }, mistBase: { value: 0 }, mistCol: { value: new THREE.Color(0xdde3e2) },
        mistNoise: { value: new THREE.Vector3(0, 0, 0) }, // x: banks a world unit (0: an even layer), yz: drift
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tColor, tDepth; uniform float near, far, focus, range, maxBlur, tilt, vignette, focusR, grayAmt, contrast, saturation, aoStrength, aoRadius, projScale; uniform vec2 band, res, focusXZ;
        uniform vec3 gradeMul, gradeLift; uniform float gradeSat, gradeCon;
        uniform mat4 projInv, camWorld;
        vec3 worldAt(vec2 uv){
          float d = texture2D(tDepth, uv).x;
          vec4 v = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
          v /= v.w;
          return (camWorld * v).xyz;
        }
        uniform float atmos, atmosFall; uniform vec3 atmosCol, atmosSun, sunDirW, camPos;
        uniform float mist, mistH, mistBase; uniform vec3 mistCol, mistNoise;
        float lh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        float lvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(lh(i), lh(i + vec2(1., 0.)), f.x), mix(lh(i + vec2(0., 1.)), lh(i + vec2(1., 1.)), f.x), f.y); }
        // the mean of exp(-k·y) along a ray from height y0 to y1 (both above 0)
        float fogAvg(float y0, float y1, float k){ return abs(y1 - y0) < 0.05 / k ? exp(-k * y0) : (exp(-k * y0) - exp(-k * y1)) / (k * (y1 - y0)); }
        vec3 aerial(vec3 col, vec2 uv){
          if ((atmos <= 0.0 && mist <= 0.0) || texture2D(tDepth, uv).x > 0.9999) return col;
          vec3 wp = worldAt(uv); vec3 ray = wp - camPos; float dist = length(ray);
          if (atmos > 0.0) {
            float y0 = max(camPos.y, 0.0), y1 = max(wp.y, 0.0), k = atmosFall;
            float avg = abs(y1 - y0) < 0.05 ? exp(-k * y0) : (exp(-k * y0) - exp(-k * y1)) / (k * (y1 - y0));
            float f = 1.0 - exp(-atmos * dist * avg);
            float sd = pow(max(dot(ray / dist, sunDirW), 0.0), 6.0);
            col = mix(col, mix(atmosCol, atmosSun, sd * 0.6), f);
          }
          if (mist > 0.0) { // a morning mist in the valleys: thick at the ground, gone a few e-folds up (hills stand out of it),
            // lying in banks over the fields (a noise where the ray meets the ground)
            float banks = 1.0;
            if (mistNoise.x > 0.0) { vec2 mp = wp.xz * mistNoise.x + mistNoise.yz; banks = 0.15 + 1.7 * smoothstep(0.38, 0.82, lvn(mp) * 0.65 + lvn(mp * 2.3 + 7.1) * 0.35); }
            float f = 1.0 - exp(-mist * banks * dist * fogAvg(max(camPos.y - mistBase, 0.0), max(wp.y - mistBase, 0.0), 1.0 / mistH));
            col = mix(col, mistCol, f * 0.92);
          }
          return col;
        }
        vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
        float ssao(vec2 uv){
          if (texture2D(tDepth, uv).x > 0.9999) return 1.0;
          vec3 p = vpos(uv);
          vec3 n = normalize(cross(dFdx(p), dFdy(p)));
          if (n.z < 0.0) n = -n;
          float rpx = clamp(aoRadius * projScale / max(0.1, -p.z), 2.0, 48.0);
          float rot = fract(sin(dot(uv * res, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
          float occ = 0.0;
          for (int i = 0; i < 20; i++) {
            float fi = float(i);
            float a = fi * 2.39996 + rot;
            vec2 suv = uv + vec2(cos(a), sin(a)) * sqrt((fi + 0.5) / 20.0) * rpx / res;
            vec3 v = vpos(suv) - p;
            float dist = length(v);
            occ += max(0.0, dot(n, v / max(dist, 1e-4)) - 0.1) * (1.0 - smoothstep(aoRadius * 0.6, aoRadius * 2.0, dist));
          }
          return clamp(1.0 - aoStrength * occ / 20.0, 0.0, 1.0);
        }
        float coc(vec2 uv){
          float d = texture2D(tDepth, uv).x;
          float z = -perspectiveDepthToViewZ(d, near, far);
          float dz = clamp(abs(z - focus) / range, 0.0, 1.0);
          float ty = clamp((abs(uv.y - band.x) - band.y) / 0.35, 0.0, 1.0) * tilt;
          return max(dz, ty);
        }
        void main(){
          float c = coc(vUv);
          float r = c * maxBlur;
          vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.0;
          if (r > 0.0) { // in focus, or no DOF on this tier: every tap would land on this pixel, so skip them
            for (int i = 0; i < 40; i++) {
              float fi = float(i);
              float rr = sqrt((fi + 0.5) / 40.0) * r;
              float a = fi * 2.39996;
              vec2 uv = vUv + vec2(cos(a), sin(a)) * rr / res;
              float w = smoothstep(0.0, 1.0, coc(uv) + 0.15);
              acc += texture2D(tColor, uv).rgb * w; wsum += w;
            }
          }
          vec3 col = acc / wsum;
          if (aoStrength > 0.0) col *= ssao(vUv);
          col = aerial(col, vUv);
          if (grayAmt > 0.0) {
            vec3 wp = worldAt(vUv);
            float out_ = smoothstep(focusR, focusR + 8.0, length(wp.xz - focusXZ));
            if (texture2D(tDepth, vUv).x > 0.9999) out_ = 1.0;
            float l = dot(col, vec3(0.3, 0.59, 0.11));
            col = mix(col, vec3(l) * vec3(0.8, 0.79, 0.77), out_ * grayAmt);
          }
          float lg = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lg), col, saturation * gradeSat);
          col = max((col - 0.18) * contrast * gradeCon + 0.18, 0.0);
          col = col * gradeMul + gradeLift;
          float v = smoothstep(0.95, 0.25, distance(vUv, vec2(0.5)));
          col *= mix(1.0 - vignette, 1.0, v);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
      depthWrite: false,
      depthTest: false,
      extensions: { derivatives: true },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const qs = new THREE.Scene();
    qs.add(quad);
    const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return {
      uniforms: mat.uniforms,
      quality: q,
      render() {
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(qs, qc);
      },
    };
  };

  // ---------------------------------------------------------------- seasons and weather (docs/design/v2-polish.md, job 4)
  // One season for the whole page. Its state is a handful of shared uniforms that every seasonal material reads: the
  // map's ground, forests and rivers (terrain.js, terrain-real.js), everything that takes the map's baked light
  // (Terrain.receiveBaked: the model kit, the cities, the villages) and the 1 m scenes (nature.js). A change of season
  // changes numbers, never shader programs. The names are the calendar's (view.calendar 'Thu 219'): Xuân, Hạ, Thu, Đông.
  //   K.wx.index('Thu 219') → 2 · K.wx.name('winter') → 'Đông' · K.wx.U: the shared uniforms
  //   K.wx.patch(material, { scale, foliage, snow }): snow on what faces up, wet in the rain, seasonal leaves (opt-in)
  //   K.wx.particles(kind, { count, seed }): 'rain' | 'snow' | 'leaves' | 'petals' → { mesh, U, place(camera, box, t) }
  //   K.wx.grade(lens, g): the season's grade and ground mist on a K.lens
  const WX = (K.wx = {});
  WX.NAMES = ['Xuân', 'Hạ', 'Thu', 'Đông'];
  const WX_ALIAS = { xuan: 0, spring: 0, ha: 1, summer: 1, thu: 2, autumn: 2, fall: 2, dong: 3, winter: 3 };
  // a season from a name, an English word, a calendar line or an index; -1 when none
  WX.index = (s) => {
    if (typeof s === 'number') return s >= 0 && s < 4 ? Math.floor(s) : -1;
    const w = String(s || '').trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
    return Object.prototype.hasOwnProperty.call(WX_ALIAS, w) ? WX_ALIAS[w] : -1;
  };
  WX.name = (s) => WX.NAMES[WX.index(s)] || null;
  WX.weights = (i) => [0, 1, 2, 3].map((k) => (k === i ? 1 : 0));
  // uSeasonW: weights of spring, summer, autumn, winter (sum 1; autumn, the approved look, until a page sets one).
  // uSnow: snow cover, uWet: rain on the ground, uWxTime: seconds for the weather.
  WX.U = { uSeasonW: { value: new THREE.Vector4(0, 0, 1, 0) }, uSnow: { value: 0 }, uWet: { value: 0 }, uWxTime: { value: 0 } };
  WX.GLSL_HEAD = `
    varying vec4 vWxO; varying vec3 vWxP; varying vec3 vWxN;
    uniform vec4 uSeasonW; uniform float uSnow, uWet, uWxScale;
    float wxH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float wxN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(wxH(i), wxH(i + vec2(1., 0.)), f.x), mix(wxH(i + vec2(0., 1.)), wxH(i + vec2(1., 1.)), f.x), f.y); }
    float wxSnowK = 0., wxLeaf = 0.;`;
  // after <color_fragment>: diffuseColor is the surface's own colour (linear). uWxScale: world units → about one tree
  WX.GLSL_COLOR = `
    #ifdef WX_FOLIAGE
    { // leaves: the kit paints them summer green; the season recolours green-dominant colours, the darkest (pines) stay
      vec3 c = diffuseColor.rgb;
      float leaf = smoothstep(1.45, 1.9, c.g / max(max(c.r, c.b), 1e-4)) * (1. - smoothstep(.32, .5, c.b / max(c.g, 1e-4)));
      if (leaf > .001) {
        float con = 1. - smoothstep(.012, .02, c.g);
        // one colour a tree: its instance, or (a merged model) a smooth noise over the ground
        float id = vWxO.w > .5 ? wxH(floor(vWxO.xz * uWxScale * 7.3) + .5) : wxN(vWxP.xz * uWxScale * 1.3 + 7.);
        float lv = clamp(dot(c, vec3(.2126, .7152, .0722)) / .045, .35, 1.8);
        vec3 spring = mix(vec3(.05, .14, .012), vec3(.1, .21, .02), id) * lv;
        spring = mix(spring, (id > .86 ? vec3(.74, .7, .64) : vec3(.8, .42, .48)) * (.55 + .45 * lv), step(.74, id)); // blossom: peach, plum
        vec3 autumn = (id < .28 ? vec3(.34, .05, .014) : id < .52 ? vec3(.46, .16, .014) : id < .8 ? vec3(.5, .31, .024) : vec3(.12, .13, .014)) * lv;
        vec3 winter = mix(vec3(.03, .024, .022), vec3(.05, .04, .034), id) * lv; // bare crowns: twigs, grey-brown
        vec3 s = uSeasonW.x * spring + uSeasonW.y * c + uSeasonW.z * autumn + uSeasonW.w * winter;
        s = mix(s, c * (1. - .25 * uSeasonW.w), con);
        diffuseColor.rgb = mix(c, s, leaf); wxLeaf = leaf * (1. - con);
      }
    }
    #endif
    #ifndef WX_NOSNOW
    if (uSnow > .001) { // snow settles on what faces up, in drifts; it comes in patches as the cover grows
      vec2 q = vWxP.xz * uWxScale;
      float n = wxN(q * 2.3) * .6 + wxN(q * 7.1 + 3.) * .4;
      wxSnowK = clamp((smoothstep(.2, .7, normalize(vWxN).y) * (.4 + .6 * n) - (1. - uSnow)) * 4., 0., 1.) * (1. - .7 * wxLeaf); // bare twigs hold little
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.7, .74, .82), wxSnowK);
    }
    #endif
    diffuseColor.rgb *= 1. - uWet * .3 * (1. - wxSnowK); // rain darkens what it wets`;
  WX.GLSL_ROUGH = `
    roughnessFactor = mix(roughnessFactor, roughnessFactor * .5, uWet * (1. - wxSnowK));
    roughnessFactor = mix(roughnessFactor, .9, wxSnowK);`;
  WX.VERT = `
    { vec4 wxP = vec4(transformed, 1.); vec3 wxN = objectNormal; vec4 wxO = vec4(0., 0., 0., 1.); float wxI = 0.;
    #ifdef USE_INSTANCING
      wxP = instanceMatrix * wxP; wxN = mat3(instanceMatrix) * wxN; wxO = instanceMatrix * wxO; wxI = 1.;
    #endif
      vWxP = (modelMatrix * wxP).xyz; vWxN = normalize(mat3(modelMatrix) * wxN); vWxO = vec4((modelMatrix * wxO).xyz, wxI); }`;
  // A lit material (standard, Lambert, Phong) takes the season: o.scale (world units a tree is tall, inverted: the map's
  // kit ≈ 3, metres ≈ 0.08), o.foliage (recolour the kit's leaves), o.snow false (never snowed on: the army figures).
  // It chains the material's own onBeforeCompile, keeps its cache key apart, and is applied once.
  WX.patch = function (mat, o = {}) {
    if (!mat || mat.userData.wx || !(mat.isMeshStandardMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) return mat;
    const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey, scale = { value: o.scale || 1 };
    mat.userData.wx = { scale: scale.value };
    const defs = {}; if (o.foliage) defs.WX_FOLIAGE = ''; if (o.snow === false) defs.WX_NOSNOW = '';
    if (Object.keys(defs).length) mat.defines = Object.assign({}, mat.defines, defs);
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      Object.assign(sh.uniforms, WX.U); sh.uniforms.uWxScale = scale;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec4 vWxO; varying vec3 vWxP; varying vec3 vWxN;').replace('#include <project_vertex>', '#include <project_vertex>\n' + WX.VERT);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WX.GLSL_HEAD).replace('#include <color_fragment>', '#include <color_fragment>\n' + WX.GLSL_COLOR)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + WX.GLSL_ROUGH);
    };
    mat.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|wx'; };
    return mat;
  };
  // a twin of a patched material with other season options (same look otherwise): e.g. the leaves of a model kit whose
  // one material also dresses the soldiers. The twin chains the original's onBeforeCompile (built once for both).
  WX.twin = function (mat, o = {}) {
    const t = mat.clone();
    t.onBeforeCompile = mat.onBeforeCompile; t.customProgramCacheKey = mat.customProgramCacheKey;
    const defs = Object.assign({}, mat.defines); delete defs.WX_FOLIAGE; delete defs.WX_NOSNOW;
    if (o.foliage) defs.WX_FOLIAGE = ''; if (o.snow === false) defs.WX_NOSNOW = '';
    t.defines = defs; t.userData = Object.assign({}, mat.userData, { twinOf: mat });
    return t;
  };

  // Weather: one draw call per kind, every particle moved in the vertex shader (nothing per frame on the CPU but a few
  // uniforms). Particles live in a cube of side `box` round a centre the page puts in front of the camera; they are
  // anchored to the world (they drift past as the camera moves) and wrap round the cube, faded near its faces.
  // kinds: rain (streaks along the fall), snow (soft flakes), leaves (tumbling, autumn colours), petals (spring).
  const WX_KINDS = {
    rain: { fall: [0.06, -1.25, 0.03], size: 0.0016, len: 0.045, color: 0xc6d2dc, opacity: 0.3, define: 'WX_RAIN' },
    snow: { fall: [0.02, -0.11, 0.012], size: 0.0065, color: 0xffffff, opacity: 0.9, define: 'WX_SNOW', sway: 0.018 },
    leaves: { fall: [0.07, -0.06, 0.025], size: 0.0065, color: 0xffffff, opacity: 0.95, define: 'WX_LEAF', sway: 0.03 },
    petals: { fall: [0.05, -0.04, 0.02], size: 0.006, color: 0xffffff, opacity: 0.9, define: 'WX_PETAL', sway: 0.025 },
  };
  WX.particles = function (kind, o = {}) {
    const K0 = WX_KINDS[kind] || WX_KINDS.snow, n = Math.max(1, o.count || 1000);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    let sd = o.seed || 17; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const seed = new Float32Array(n * 4); for (let i = 0; i < seed.length; i++) seed[i] = rnd();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = n;
    const U = {
      uTime: WX.U.uWxTime, uCenter: { value: new THREE.Vector3() }, uBox: { value: 1 }, uAmount: { value: 1 },
      uFall: { value: new THREE.Vector3(...K0.fall) }, uWind: { value: new THREE.Vector3(0, 0, 0) }, uSize: { value: K0.size }, uLen: { value: K0.len || 0 },
      uColor: { value: new THREE.Color(K0.color) }, uOpacity: { value: K0.opacity }, uSway: { value: K0.sway || 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, defines: { [K0.define]: '' },
      vertexShader: `attribute vec4 aSeed; uniform float uTime, uBox, uAmount, uSize, uLen, uSway; uniform vec3 uCenter, uFall, uWind;
        varying vec2 vUv; varying float vA; varying vec3 vTint;
        void main(){
          vUv = vec2(position.x + .5, position.y);
          float sp = .75 + .5 * fract(aSeed.w * 7.13), on = step(aSeed.w, uAmount);
          // in box units: a start in the cube, the fall and the wind, the cube's centre subtracted so it is anchored to the world
          vec3 u = aSeed.xyz + (uFall * sp + uWind) * uTime - uCenter / uBox;
          u.xz += uSway * vec2(sin(uTime * 1.3 + aSeed.x * 40.), cos(uTime * 1.1 + aSeed.y * 40.));
          vec3 rel = (fract(u) - .5) * uBox, wp = uCenter + rel;
          float edge = max(max(abs(rel.x), abs(rel.y)), abs(rel.z)) / (.5 * uBox);
          vA = on * (1. - smoothstep(.7, 1., edge)) * smoothstep(.06, .2, length(wp - cameraPosition) / uBox); // none right at the lens
          vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vTint = vec3(1.);
        #ifdef WX_RAIN
          vec3 d = normalize(uFall * sp + uWind), side = normalize(cross(d, cameraPosition - wp));
          vec3 pos = wp + side * position.x * uSize * uBox + d * (position.y - .5) * uLen * uBox * sp;
        #else
          float a = aSeed.x * 6.283 + uTime * (.5 + 2. * aSeed.y);
          vec2 cn = vec2(position.x, position.y - .5);
          #if defined(WX_LEAF) || defined(WX_PETAL)
            cn.x *= .2 + .8 * abs(sin(uTime * (1.6 + aSeed.z * 2.) + aSeed.z * 30.)); // turning over as it falls
          #endif
          cn = vec2(cn.x * cos(a) - cn.y * sin(a), cn.x * sin(a) + cn.y * cos(a));
          vec3 pos = wp + (camR * cn.x + camU * cn.y) * uSize * uBox * (.65 + .7 * aSeed.z);
          #ifdef WX_LEAF
            float h = fract(aSeed.w * 13.7); // gold, orange, red, brown
            vTint = h < .3 ? vec3(.62, .36, .05) : h < .55 ? vec3(.6, .18, .03) : h < .8 ? vec3(.45, .06, .02) : vec3(.28, .15, .06);
          #endif
          #ifdef WX_PETAL
            vTint = fract(aSeed.w * 13.7) < .6 ? vec3(.95, .62, .7) : vec3(.95, .92, .88);
          #endif
        #endif
          gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.);
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying float vA; varying vec3 vTint;
        void main(){
          vec2 c = vUv * 2. - 1.; float a;
        #ifdef WX_RAIN
          a = (1. - abs(c.x)) * smoothstep(0., .35, vUv.y) * smoothstep(1., .6, vUv.y);
        #elif defined(WX_LEAF)
          float w = .62 * (1. - c.y * c.y); a = 1. - smoothstep(w * .75, w + .02, abs(c.x));
        #else
          a = 1. - smoothstep(.25, 1., length(c));
        #endif
          a *= vA * uOpacity; if (a < .01) discard;
          vec3 col = uColor * vTint;
        #ifdef WX_LEAF
          col *= .78 + .22 * smoothstep(.0, .14, abs(c.x)); // the midrib
        #endif
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 9;
    const fwd = new THREE.Vector3();
    return {
      mesh, U, count: n, kind,
      // the cube in front of the camera: side `box` (world units), its centre `ahead` sides along the view
      place(camera, box, ahead = 0.55) { camera.getWorldDirection(fwd); U.uBox.value = box; U.uCenter.value.copy(camera.position).addScaledVector(fwd, box * ahead); },
      dispose() { g.dispose(); mat.dispose(); },
    };
  };
  // the season's grade on a K.lens: { mul: [r, g, b], lift: [r, g, b], sat, con, mist, mistH, mistBase, mistCol,
  // mistScale (banks of mist a world unit, 0: an even layer), mistDrift: [x, z] }
  WX.grade = function (lens, g = {}) {
    const L = lens && lens.uniforms; if (!L || !L.gradeMul) return;
    L.gradeMul.value.set(...(g.mul || [1, 1, 1])); L.gradeLift.value.set(...(g.lift || [0, 0, 0]));
    L.gradeSat.value = g.sat ?? 1; L.gradeCon.value = g.con ?? 1;
    L.mist.value = g.mist || 0; L.mistH.value = g.mistH || 1; L.mistBase.value = g.mistBase || 0;
    if (L.mistNoise) L.mistNoise.value.set(g.mistScale || 0, ...(g.mistDrift || [0, 0]));
    if (g.mistCol !== undefined) L.mistCol.value.set(g.mistCol);
  };

  // Weight of a rendered frame: draw calls, triangles, GPU buffer bytes, timings.
  K.stats = function (renderer, scene, extra = {}) {
    const seen = new Set();
    let bytes = 0, meshes = 0, instances = 0;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      if (o.isInstancedMesh) { instances += o.count; bytes += o.instanceMatrix.array.byteLength + (o.instanceColor ? o.instanceColor.array.byteLength : 0); }
      const g = o.geometry;
      if (seen.has(g)) return;
      seen.add(g);
      for (const a of Object.values(g.attributes)) bytes += a.array.byteLength;
      if (g.index) bytes += g.index.array.byteLength;
    });
    const i = renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: (i.programs || []).length, meshes, instances, bufferMB: +(bytes / 1048576).toFixed(1), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, Math.round(v)])) };
  };

  // Screen position of a world point, for the UI overlay positions report.
  K.project = function (camera, w, h, x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: Math.round((v.x + 1) * 0.5 * w), y: Math.round((1 - v.y) * 0.5 * h) };
  };
})();
