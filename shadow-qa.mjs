import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'shadow-qa-output');
const BASE_URL = 'http://localhost:3000/';

const CAMERA_POSITIONS = [
  { name: 'overview-north', position: { x: 0, y: 200, z: -150 }, target: { x: 0, y: 0, z: 0 } },
  { name: 'overview-south', position: { x: 0, y: 200, z: 150 }, target: { x: 0, y: 0, z: 0 } },
  { name: 'qinling-close', position: { x: 45, y: 80, z: -30 }, target: { x: 45, y: 0, z: -30 } },
  { name: 'luoyang-citadel', position: { x: 0, y: 50, z: -15 }, target: { x: 0, y: 0, z: -15 } },
  { name: 'low-angle-north', position: { x: 0, y: 30, z: -80 }, target: { x: 0, y: 0, z: 0 } },
  { name: 'yangtze-river', position: { x: 60, y: 60, z: 30 }, target: { x: 60, y: 0, z: 30 } },
];

async function runShadowQA() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--use-gl=angle']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  
  page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

  console.log('Loading page...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  
  // Wait for scene to be ready with longer timeout
  await page.waitForFunction(() => window.renderer && window.scene && window.camera && window.controls, { timeout: 120000 });
  
  console.log('Scene loaded');
  await new Promise(r => setTimeout(r, 5000));

  const results = [];

  for (const cam of CAMERA_POSITIONS) {
    console.log(`\nCapturing: ${cam.name}...`);
    
    try {
      await page.evaluate((pos) => {
        if (!window.camera || !window.controls) return false;
        window.camera.position.set(pos.position.x, pos.position.y, pos.position.z);
        window.controls.target.set(pos.target.x, pos.target.y, pos.target.z);
        window.controls.update();
        return true;
      }, cam);

      await new Promise(r => setTimeout(r, 500));

      const screenshotPath = path.join(OUTPUT_DIR, `${cam.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      
      const analysis = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'No canvas found' };
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h).data;
        
        const samples = {
          center: { x: w * 0.5, y: h * 0.5 },
        };
        
        const results = {};
        for (const [name, pos] of Object.entries(samples)) {
          const i = (Math.floor(pos.y) * w + Math.floor(pos.x)) * 4;
          results[name] = { luminance: 0.299 * imgData[i] + 0.587 * imgData[i+1] + 0.114 * imgData[i+2] };
        }
        
        const darkPixels = [];
        for (let y = 0; y < h; y += 50) {
          for (let x = 0; x < w; x += 50) {
            const i = (y * w + x) * 4;
            const lum = 0.299 * imgData[i] + 0.587 * imgData[i+1] + 0.114 * imgData[i+2];
            if (lum < 30 && imgData[i+3] > 200) darkPixels.push({ x, y, luminance: lum });
          }
        }
        return { samples: results, darkPixelCount: darkPixels.length };
      });

      results.push({ name: cam.name, screenshot: screenshotPath, analysis });
      console.log(`  Dark pixels: ${analysis.darkPixelCount}, Center luminance: ${analysis.samples.center?.luminance?.toFixed(1)}`);

    } catch (err) {
      console.error(`  Error capturing ${cam.name}:`, err.message);
      results.push({ name: cam.name, error: err.message });
    }
  }

  const reportPath = path.join(OUTPUT_DIR, 'shadow-qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  const totalDark = results.reduce((sum, r) => sum + (r.analysis?.darkPixelCount || 0), 0);
  console.log(`\n=== SHADOW QA SUMMARY ===`);
  console.log(`Total positions tested: ${results.length}`);
  console.log(`Total dark pixels detected: ${totalDark}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  await browser.close();
  return results;
}

runShadowQA().catch(console.error);
