// Renders the brand assets in this folder to PNG.
// Usage (from the repository root, after `npm install` in pipeline/): node brand/render.js
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(new URL('../pipeline/package.json', import.meta.url));
const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url));

const assets = [{ page: 'avatar.html', out: 'avatar.png', width: 800, height: 800 }];

const browser = await chromium.launch();
try {
  for (const { page: file, out, width, height } of assets) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(pathToFileURL(path.join(dir, file)).href);
    await page.waitForSelector('body[data-ready]', { state: 'attached' });
    await page.screenshot({ path: path.join(dir, out) });
    console.log(`brand/${out} (${width}x${height})`);
    await page.close();
  }
} finally {
  await browser.close();
}
