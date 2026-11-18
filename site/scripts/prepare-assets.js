// Prepares static assets for the app from the shared brand code in pipeline/template/assets:
//  - copies the fonts the app uses (to src/lib/assets/fonts, so Vite bundles them with the right base path);
//  - draws the watercolor backgrounds as SVG files, with the same kit as the video artwork.
// Runs before `vite dev` and `vite build`; the output (src/lib/assets/fonts, static/art) is git-ignored.
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const ASSETS = here('../../pipeline/template/assets/');
const STATIC = here('../static/');
const FONT_DIR = here('../src/lib/assets/fonts/');

// ---------- Fonts ----------
const FONTS = ['MrDafoe-Regular.ttf', 'JosefinSans-Bold.ttf', 'PinyonScript-Regular.ttf', 'Fraunces-Italic.woff2', 'Jost-Regular.ttf', 'OFL.txt', 'FONTS.md'];
mkdirSync(FONT_DIR, { recursive: true });
for (const f of FONTS) copyFileSync(`${ASSETS}fonts/${f}`, `${FONT_DIR}${f}`);

// ---------- Watercolor kit ----------
// ornaments.js and watercolor.js are browser scripts that share globals; run them in one VM context.
const kit = vm.createContext({ Math, String, Number, Array });
vm.runInContext(`${readFileSync(`${ASSETS}ornaments.js`, 'utf8')}
${readFileSync(`${ASSETS}watercolor.js`, 'utf8')}
var seed = 1;
var rnd = function () { return (seed = (seed * 16807) % 2147483647) / 2147483647; };
var closed = function (pts) { return smoothPath(pts) + 'Z'; };
var reseed = function (s) { seed = s; };`, kit);
const run = (code) => vm.runInContext(code, kit);

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${run('defs')}${body}</svg>\n`;

// Page header: a watercolor wash that fades into the paper, with a flower sprig on the right.
function header(w, h, seedValue, { flowers = true } = {}) {
  run(`reseed(${seedValue})`);
  return svg(w, h, run(`'<g filter="url(#wash)">'
    + '<path d="' + closed([[-60,-60],[${w + 60},-60],[${w + 60},${h - 70}],[${w * 0.85},${h - 25}],[${w / 2},${h + 5}],[${w * 0.22},${h - 30}],[-60,${h - 55}]]) + '" fill="' + C.blush + '" opacity=".92"/>'
    + '<path d="' + blob(${w * 0.3}, ${h * 0.45}, ${w * 0.45}, ${h * 0.4}) + '" fill="' + C.rose + '" opacity=".5"/>'
    + '<path d="' + blob(${w * 0.1}, 30, ${w * 0.32}, 90) + '" fill="' + C.blue + '" opacity=".45"/>'
    + '<path d="' + blob(${w * 0.85}, 50, ${w * 0.3}, 90) + '" fill="' + C.peach + '" opacity=".6"/>'
    + '<path d="' + blob(${w * 0.82}, ${h - 50}, ${w * 0.24}, 60) + '" fill="' + C.sage + '" opacity=".45"/>'
    + '</g>'
    ${flowers ? `+ flower(${w - 38}, 30, 34, C.peach, 6) + flower(${w - 72}, 62, 22, C.blue, 5, 20, '#3F4F6B') + wleaf(${w - 90}, 44, 34, 170, C.sage)` : ''}`));
}

// Round wash used behind a narrator's initial (several variants, picked by name).
function avatar(seedValue, main, a, b) {
  run(`reseed(${seedValue})`);
  return svg(120, 120, run(`'<g filter="url(#wash)">'
    + '<rect x="-30" y="-30" width="180" height="180" fill="' + C.${main} + '"/>'
    + '<path d="' + blob(30, 30, 55, 45) + '" fill="' + C.${a} + '" opacity=".6"/>'
    + '<path d="' + blob(95, 95, 55, 45) + '" fill="' + C.${b} + '" opacity=".6"/>'
    + '</g>'`));
}

mkdirSync(`${STATIC}art`, { recursive: true });
writeFileSync(`${STATIC}art/hero.svg`, header(390, 250, 31));
writeFileSync(`${STATIC}art/header.svg`, header(390, 210, 44));
writeFileSync(`${STATIC}art/header-plain.svg`, header(390, 190, 57, { flowers: false }));
const AVATARS = [['rose', 'blue', 'sage'], ['peach', 'rose', 'blue'], ['sage', 'peach', 'rose'], ['blue', 'peach', 'sage'], ['blush', 'sage', 'blue']];
AVATARS.forEach(([m, a, b], i) => writeFileSync(`${STATIC}art/avatar-${i}.svg`, avatar(70 + i * 13, m, a, b)));

console.log(`Assets ready: ${FONTS.length} font files, ${3 + AVATARS.length} watercolor SVGs.`);
