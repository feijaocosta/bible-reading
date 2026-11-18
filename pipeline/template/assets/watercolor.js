// Shared watercolor drawing kit (palette, SVG filters, wash blobs, flowers, leaves).
// Used by the video artwork and the brand assets. Pages must define `rnd()` (seeded random) and
// load ornaments.js (smoothPath, TAU) before calling these functions.

const C = { rose: '#D7777B', blush: '#EBA79C', peach: '#F0BE98', blue: '#8EA8C6', ochre: '#D8A653', sage: '#9DB394', sageLight: '#B4C4A8', leaf: '#7E9A79', berry: '#A9464E', petalLight: '#F3CFC4' };

const defs = `<defs>
  <filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="4" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="90" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="9" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .9 0 0 0 .35" result="m"/>
    <feComposite in="d" in2="m" operator="in" result="mottled"/>
    <feGaussianBlur in="mottled" stdDeviation="5"/>
  </filter>
  <filter id="wc" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="3" seed="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="16" result="d"/>
    <feGaussianBlur in="d" stdDeviation="1.1"/>
  </filter>
  <filter id="stain" x="-50%" y="-50%" width="200%" height="200%">
    <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="5" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="50" result="d"/>
    <feGaussianBlur in="d" stdDeviation="8"/>
  </filter>
  <filter id="ink">
    <feTurbulence type="fractalNoise" baseFrequency=".9 .02" numOctaves="2" seed="8" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.5"/>
  </filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .2  0 0 0 .16 0"/>
  </filter>
  <radialGradient id="age" cx="62%" cy="48%" r="75%">
    <stop offset="0" stop-color="#F5E9CE"/><stop offset=".6" stop-color="#EBD7B0"/><stop offset="1" stop-color="#D3B381"/>
  </radialGradient>
</defs>`;

function blob(cx, cy, rx, ry, k = 14, jitter = .22) {
  const pts = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU, j = 1 + (rnd() - .5) * jitter * 2;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return closed(pts.concat([pts[0], pts[1]]));
}
// ---------- Watercolor botanicals ----------
const petalPath = (len, w) => `M0 0 C${w} ${-len * .25} ${w * .9} ${-len * .85} 0 ${-len} C${-w * .9} ${-len * .85} ${-w} ${-len * .25} 0 0Z`;
function flower(cx, cy, r, color, n = 5, rot = 0, center = '#7A3E3E') {
  let fills = '', edges = '', dots = '';
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * 360 + (rnd() - .5) * 16, L = r * (.85 + rnd() * .3);
    const t = `translate(${cx} ${cy}) rotate(${a})`;
    fills += `<path transform="${t}" d="${petalPath(L, L * .45)}" fill="${color}" opacity="${.5 + rnd() * .2}"/>`;
    fills += `<path transform="${t}" d="${petalPath(L * .55, L * .2)}" fill="${color}" opacity=".45"/>`;
    edges += `<path transform="${t}" d="${petalPath(L, L * .45)}" fill="none" stroke="${color}" stroke-width="2.5" opacity=".55"/>`;
  }
  for (let i = 0; i < 10; i++) {
    const a = rnd() * TAU, d = r * .08 + rnd() * r * .14;
    dots += `<circle cx="${cx + Math.cos(a) * d}" cy="${cy + Math.sin(a) * d}" r="${1.8 + rnd() * 2.6}" fill="${center}" opacity=".8"/>`;
  }
  return `<g filter="url(#wc)">${fills}${edges}</g>${dots}`;
}
function wleaf(x, y, len, angle, color) {
  const w = len * .28, t = `translate(${x} ${y}) rotate(${angle})`;
  return `<g filter="url(#wc)"><path transform="${t}" d="M0 0 C${len * .3} ${-w} ${len * .75} ${-w} ${len} 0 C${len * .75} ${w * .8} ${len * .3} ${w * .8} 0 0Z" fill="${color}" opacity=".6"/>
    <path transform="${t}" d="M${len * .05} 0 Q${len * .5} ${-w * .15} ${len * .92} 0" stroke="${C.leaf}" stroke-width="1.4" fill="none" opacity=".7"/></g>`;
}
const bud = (x, y, r, color) => `<g filter="url(#wc)"><ellipse cx="${x}" cy="${y}" rx="${r * .7}" ry="${r}" fill="${color}" opacity=".75"/></g>`;
const stem = (pts, w = 2) => `<path d="${smoothPath(pts)}" stroke="#6F7F62" stroke-width="${w}" fill="none" opacity=".6" stroke-linecap="round" filter="url(#wc)"/>`;
