// Headless check that the game boots: load the page, click "Start Governing",
// wait for the welcome dialog and fail on any console error, uncaught exception
// or failed request. Saves a screenshot to smoke-test.png.
//
// Usage: node deploy/smoke-test.mjs <url | dist-dir>     (default: dist)
// Needs Playwright: npm i --no-save playwright && npx playwright install chromium
// SMOKE_THREE_FILE=<path to three.module.js> serves Three.js locally instead of
// the CDN (only for sandboxes that block cdn.jsdelivr.net).
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const target = process.argv[2] || 'dist';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

let url = target, server;
if (!/^https?:\/\//.test(target)) {
  // Serve the folder the way the Nginx config does: try_files $uri $uri/ /index.html
  const root = resolve(target);
  server = createServer((req, res) => {
    let file = join(root, new URL(req.url, 'http://x').pathname);
    try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); statSync(file); }
    catch { file = join(root, 'index.html'); }
    if (!file.startsWith(root + sep)) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/`;
}

const browser = await chromium.launch({
  // CI machines have no GPU: render WebGL in software
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
page.on('pageerror', e => problems.push(`uncaught exception: ${e.message}`));
page.on('requestfailed', r => problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
if (process.env.SMOKE_THREE_FILE) {
  const body = readFileSync(process.env.SMOKE_THREE_FILE);
  await page.route(THREE_URL, r => r.fulfill({ status: 200, contentType: 'text/javascript', body }));
}

const t0 = Date.now();
const step = msg => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);
try {
  step(`loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  const title = await page.title();
  if (!/cityhood/i.test(title)) problems.push(`unexpected page title: "${title}"`);
  step('page loaded, waiting for the title screen');
  // software WebGL on CI machines is slow: startup renders every build-menu thumbnail
  await page.locator('#tStart').click({ timeout: 180_000 });         // "Start Governing"
  step('clicked "Start Governing"');
  await page.getByText('Welcome to office').waitFor({ timeout: 60_000 });
  step('welcome dialog shown, letting a few in-game days run');
  await page.waitForTimeout(5_000);
  const canvas = await page.locator('canvas').first().boundingBox();
  if (!canvas || canvas.width < 100) problems.push('game canvas is missing');
} catch (e) {
  problems.push(e.message.split('\n')[0]);
} finally {
  await page.screenshot({ path: 'smoke-test.png', timeout: 60_000 })
    .catch(e => console.warn(`screenshot failed: ${e.message.split('\n')[0]}`));
  await browser.close();
  server?.close();
}

if (problems.length) {
  console.error(`FAILED (${problems.length} problem${problems.length > 1 ? 's' : ''}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('OK: game started with no console errors (screenshot: smoke-test.png)');
