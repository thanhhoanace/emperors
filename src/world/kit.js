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

  K.setup = function (w, h, opts = {}) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(opts.dpr || 1);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  K.lens = function (renderer, scene, camera, o = {}) {
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
        maxBlur: { value: (o.maxBlur || 7) * (size.y / 900) },
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
        aoStrength: { value: o.ao ?? 0 },
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
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `
        #include <packing>
        varying vec2 vUv;
        uniform sampler2D tColor, tDepth; uniform float near, far, focus, range, maxBlur, tilt, vignette, focusR, grayAmt, contrast, saturation, aoStrength, aoRadius, projScale; uniform vec2 band, res, focusXZ;
        uniform mat4 projInv, camWorld;
        vec3 worldAt(vec2 uv){
          float d = texture2D(tDepth, uv).x;
          vec4 v = projInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
          v /= v.w;
          return (camWorld * v).xyz;
        }
        uniform float atmos, atmosFall; uniform vec3 atmosCol, atmosSun, sunDirW, camPos;
        vec3 aerial(vec3 col, vec2 uv){
          if (atmos <= 0.0 || texture2D(tDepth, uv).x > 0.9999) return col;
          vec3 wp = worldAt(uv); vec3 ray = wp - camPos; float dist = length(ray);
          float y0 = max(camPos.y, 0.0), y1 = max(wp.y, 0.0), k = atmosFall;
          float avg = abs(y1 - y0) < 0.05 ? exp(-k * y0) : (exp(-k * y0) - exp(-k * y1)) / (k * (y1 - y0));
          float f = 1.0 - exp(-atmos * dist * avg);
          float sd = pow(max(dot(ray / dist, sunDirW), 0.0), 6.0);
          return mix(col, mix(atmosCol, atmosSun, sd * 0.6), f);
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
          for (int i = 0; i < 40; i++) {
            float fi = float(i);
            float rr = sqrt((fi + 0.5) / 40.0) * r;
            float a = fi * 2.39996;
            vec2 uv = vUv + vec2(cos(a), sin(a)) * rr / res;
            float w = smoothstep(0.0, 1.0, coc(uv) + 0.15);
            acc += texture2D(tColor, uv).rgb * w; wsum += w;
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
          col = mix(vec3(lg), col, saturation);
          col = max((col - 0.18) * contrast + 0.18, 0.0);
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
      render() {
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(qs, qc);
      },
    };
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
