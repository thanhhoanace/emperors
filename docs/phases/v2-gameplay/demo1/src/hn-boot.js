// Demo 1 (phase v2-gameplay): boot the phase-1 world (src/world, unchanged) inside a canvas the page owns, with the
// baked map carried as one PNG (hn-map.png, gzip bytes packed 3 per pixel) instead of assets/map/*.bin.gz.
//   await HNBoot.start({ canvas, width, height, dpr, mapPng: url }) → WorldRuntime
// Needs window.HN_DATA = { world, cities, meta, water, index } (hn-data.js) and the world scripts loaded before.
(function () {
  const B = (window.HNBoot = {});
  const PREFIX = 'hn:map/';
  let bytes = null;

  // PNG → the packed byte stream, exactly (opaque pixels, no colour conversion)
  async function unpack(url, index) {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    const rgba = g.getImageData(0, 0, bmp.width, bmp.height).data, n = bmp.width * bmp.height, out = new Uint8Array(n * 3);
    for (let i = 0, j = 0; i < n; i++, j += 4) { out[i * 3] = rgba[j]; out[i * 3 + 1] = rgba[j + 1]; out[i * 3 + 2] = rgba[j + 2]; }
    if (index.w !== bmp.width || index.h !== bmp.height) throw new Error('hn-map.png size ' + bmp.width + '×' + bmp.height + ' ≠ index');
    return out;
  }

  // the world's loader asks fetch() for assets/map files: answer hn:map/<name> from the packed bytes and HN_DATA
  function installFetch() {
    if (B.fetchInstalled) return;
    const real = window.fetch.bind(window), D = window.HN_DATA;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : input && input.url;
      if (!url || url.indexOf(PREFIX) !== 0) return real(input, init);
      const name = url.slice(PREFIX.length);
      if (name === 'meta.json') return Promise.resolve(new Response(JSON.stringify(D.meta)));
      if (name === 'water.json') return Promise.resolve(new Response(JSON.stringify(D.water)));
      const f = D.index.files[name];
      if (!f) return Promise.reject(new Error('hn-map: no ' + name));
      return Promise.resolve(new Response(bytes.subarray(f[0], f[0] + f[1])));
    };
    B.fetchInstalled = true;
  }

  // K.setup appends its own canvas to <body>; here the page gives the canvas
  function patchSetup() {
    if (K.__hnPatched) return;
    const orig = K.setup;
    K.setup = function (w, h, opts = {}) {
      if (!B.canvas) return orig(w, h, opts);
      const renderer = new THREE.WebGLRenderer({ canvas: B.canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(opts.dpr || 1);
      renderer.setSize(w, h, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1.0;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(opts.fov || 30, w / h, 1, 2000);
      return { renderer, scene, camera };
    };
    K.__hnPatched = true;
  }

  B.start = async function (o) {
    const D = window.HN_DATA;
    B.canvas = o.canvas;
    const t0 = performance.now();
    if (!bytes) bytes = await unpack(o.mapPng, D.index);
    const tUnpack = performance.now() - t0;
    installFetch(); patchSetup();
    // fine tiles only round the seats the demo visits (Huai Nan and its neighbours); the rest of the core is coarse
    const rt = await WorldRuntime.create({ world: D.world, cities: D.cities, width: o.width, height: o.height, dpr: o.dpr || 1, base: PREFIX, tileRadius: o.tileRadius ?? 64, hamlets: false }); // the demo draws villages at its own scale
    rt.stats.unpackMs = Math.round(tUnpack);
    rt.stats.bootMs = Math.round(performance.now() - t0);
    return rt;
  };
})();
