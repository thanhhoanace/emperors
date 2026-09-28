// Open a page as a phone (or desktop) and sample, every 15 s, the GPU memory the page asks WebGL for (gpu-hook.js tallies
// buffers, textures, renderbuffers and canvases), the JS heap and the page's own stats. Growth over time is the crash signal.
//   xvfb-run -a node tools/phone-probe/probe.mjs <url> <out-prefix> [phone|desktop] [seconds]   (PW/PH env: phone viewport, default 390×844)
// Writes <out-prefix>.json and a screenshot. Software GPU (SwiftShader): memory and call counts are real, frame times are not.
import { createRequire } from 'module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const puppeteer = require('puppeteer'), fs = require('fs');
const [, , url, out, mode = 'phone', secs = '180'] = process.argv;
const hook = fs.readFileSync(new URL('./gpu-hook.js', import.meta.url), 'utf8');
const b = await puppeteer.launch({ headless: false, executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', protocolTimeout: 1800000,
  args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', ...(process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY] : []), '--window-size=1400,1000', '--enable-precise-memory-info'] });
const log = [], samples = [];
try {
  const p = await b.newPage();
  p.on('console', (m) => log.push(m.type() + ': ' + m.text()));
  p.on('pageerror', (e) => log.push('pageerror: ' + e.message));
  if (mode === 'phone') {
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1');
    await p.setViewport({ width: +(process.env.PW || 390), height: +(process.env.PH || 844), deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  } else await p.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(hook);
  const cdp = await p.target().createCDPSession(); await cdp.send('Performance.enable');
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
  for (let t = 0; t <= +secs; t += 15) {
    await new Promise((r) => setTimeout(r, t ? 15000 : 3000));
    const m = await cdp.send('Performance.getMetrics'); const M = Object.fromEntries(m.metrics.map((x) => [x.name, x.value]));
    const s = await p.evaluate(() => {
      const d = window.__datCity, st = d && d.getStats ? d.getStats() : window.__stats || null, ls = d && d.getLoadingState ? d.getLoadingState() : null;
      const cv = [...document.querySelectorAll('canvas')].map((c) => [c.width, c.height]);
      const fb = cv.reduce((s, [w, h]) => s + w * h * 8, 0);
      const g = window.__gpu || {};
      return { coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio, stats: st, loading: ls && { progress: ls.progress, built: ls.built, total: ls.total, ring: ls.ringRadius, settled: ls.settled, phase: ls.phase }, canvases: cv, gpuMB: +((g.bytes + fb) / 1048576).toFixed(1), gpuPeakMB: +((g.peak + fb) / 1048576).toFixed(1), bufMB: +(g.buf / 1048576).toFixed(1), texMB: +(g.tex / 1048576).toFixed(1), rbMB: +(g.rb / 1048576).toFixed(1), fbMB: +(fb / 1048576).toFixed(1), contexts: g.contexts, big: (g.big || []).slice(-6) };
    });
    const row = { t: Math.round((Date.now() - t0) / 1000), jsHeapMB: +(M.JSHeapUsedSize / 1048576).toFixed(1), nodes: M.Nodes, ...s };
    samples.push(row); console.log(JSON.stringify(row));
  }
  await p.screenshot({ path: out + '.png' });
} catch (e) { log.push('probe error: ' + e.message); } finally {
  fs.writeFileSync(out + '.json', JSON.stringify({ samples, log: log.slice(-40) }, null, 1));
  console.log(log.filter((l) => /dat.city|error|quality|context|lost/i.test(l)).slice(-15).join('\n'));
  await b.close();
}
