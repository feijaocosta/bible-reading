// Renders the HTML artwork template to a 1920x1080 PNG with headless Chromium.
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { partLabel } from './books.js';

const TEMPLATE = fileURLToPath(new URL('../template/artwork.html', import.meta.url));
export const ARTWORK_SIZE = { width: 1920, height: 1080 };

export async function renderArtwork(reading, outPath, { timeoutMs = 30_000 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: ARTWORK_SIZE, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const artwork = {
      book: reading.book,
      partLabel: partLabel(reading),
      testamentLabel: reading.testamentLabel,
      narrator: reading.narrator,
    };
    await page.addInitScript((data) => { window.ARTWORK = data; }, artwork);
    await page.goto(pathToFileURL(TEMPLATE).href);

    await page.waitForSelector('body[data-ready], body[data-error]', { state: 'attached', timeout: timeoutMs });
    const error = await page.getAttribute('body', 'data-error');
    if (error) throw new Error(`Artwork template failed: ${error}`);
    if (pageErrors.length) throw new Error(`Artwork template script error: ${pageErrors.join('; ')}`);

    await page.screenshot({ path: outPath, type: 'png' });
    return outPath;
  } finally {
    await browser.close();
  }
}
