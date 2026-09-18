import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox','--disable-setuid-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__sliceReady === true, { timeout: 120000 });
await new Promise(r => setTimeout(r, 2600));

async function clickCity(name) {
  const p = await page.evaluate(n => window.__slice.projectCity(n), name);
  await page.mouse.click(p.x, p.y);
  await new Promise(r => setTimeout(r, 280));
}

const before = await page.evaluate(() => window.__slice.getState());
await clickCity('Xiangyang');
await clickCity('Chengdu');
const armed = await page.evaluate(() => window.__slice.getState());
if (!armed.targetChosen) throw new Error('Chengdu target was not armed by real canvas clicks');

await page.click('#endTurn');
await page.waitForFunction(() => window.__slice.lastResult?.moved === true, { timeout: 10000 });
await new Promise(r => setTimeout(r, 900));
const after = await page.evaluate(() => window.__slice.getState());

const dist = Math.hypot(after.liuBei.x - before.liuBei.x, after.liuBei.z - before.liuBei.z);
if (dist < 25) throw new Error(`Liu Bei did not march far enough: ${dist}`);
for (const k of ['Troops','Grain','Territory','Morale','Prestige']) {
  if (after.stats[k] === before.stats[k]) throw new Error(`${k} did not update`);
}
if (after.turn !== 2) throw new Error(`Expected turn 2, got ${after.turn}`);
if (pageErrors.length) throw new Error('Browser errors: ' + pageErrors.join(' | '));

await page.screenshot({ path: 'slice-qa.png', fullPage: false });
console.log(JSON.stringify({ ok:true, dist:Number(dist.toFixed(2)), before, after }, null, 2));
await browser.close();
