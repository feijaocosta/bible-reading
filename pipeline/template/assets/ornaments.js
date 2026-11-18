// Procedural SVG ornaments used by the artwork template: lace doily and filigree flourish.
// Everything is deterministic, so the same input always renders the same image.
const TAU = Math.PI * 2;
const f = (n) => n.toFixed(2);

// Catmull-Rom spline through points -> smooth cubic bezier path.
function smoothPath(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function spiral(cx, cy, r0, a0, turns, dir, shrink = 0.86, steps = 90) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + dir * t * turns * TAU;
    const r = r0 * (1 - shrink * t);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function leaf(x, y, angle, len, width) {
  const w = width, L = len;
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})" d="M0 0 C${f(w)} ${f(-L * 0.3)} ${f(w * 0.6)} ${f(-L * 0.8)} 0 ${f(-L)} C${f(-w * 0.6)} ${f(-L * 0.8)} ${f(-w)} ${f(-L * 0.3)} 0 0Z M0 0 L0 ${f(-L * 0.75)}"/>`;
}

// One half of a symmetric flourish, extending to +x from the origin.
function flourishHalf(L) {
  const R = L * 0.13;
  const end = [L - R, -L * 0.06];
  const stem = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    stem.push([u * end[0], end[1] * (3 * u * u - 2 * u ** 3) - L * 0.05 * Math.sin(Math.PI * u) ** 2]);
  }
  const main = stem.concat(spiral(end[0], end[1] + R, R, -Math.PI / 2, 1.35, 1).slice(1));
  // Secondary curl branching upward.
  const bu = 0.52, b = stem[Math.round(bu * 30)];
  const R2 = L * 0.075;
  const branch = [[b[0] - L * 0.08, b[1] + L * 0.01], b, ...spiral(b[0] + L * 0.06, b[1] - R2 - L * 0.012, R2, Math.PI * 0.75, 1.2, 1).slice(0)];
  // Small inner curl under the stem.
  const c = stem[Math.round(0.3 * 30)];
  const R3 = L * 0.045;
  const curl3 = [[c[0] - L * 0.05, c[1] - L * 0.005], c, ...spiral(c[0] + L * 0.03, c[1] + R3 + L * 0.01, R3, -Math.PI * 0.75, 1.15, -1)];
  return [
    `<path d="${smoothPath(main)}"/>`,
    `<path d="${smoothPath(branch)}"/>`,
    `<path d="${smoothPath(curl3)}"/>`,
    leaf(stem[18][0], stem[18][1], 60, L * 0.09, L * 0.03),
    leaf(stem[8][0], stem[8][1], -120, L * 0.07, L * 0.025),
    leaf(stem[24][0], stem[24][1], 140, L * 0.06, L * 0.02),
    `<circle cx="${f(L * 1.0)}" cy="${f(-L * 0.06 + R)}" r="${f(L * 0.008)}" class="fill"/>`,
  ].join('');
}

function rosette(cx, cy, r, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    s += `<ellipse transform="translate(${f(cx)} ${f(cy)}) rotate(${f(a)})" cx="0" cy="${f(-r * 0.55)}" rx="${f(r * 0.2)}" ry="${f(r * 0.45)}"/>`;
  }
  return s + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.16)}" class="fill"/>`;
}

function petal(r1, r2, a, w) {
  const p = (r, ang) => [r * Math.cos(ang), r * Math.sin(ang)];
  const b = p(r1, a), t = p(r2, a), m = (r1 + r2) / 2;
  const l = p(m, a - w), rr = p(m, a + w);
  return `M${f(b[0])} ${f(b[1])} Q${f(l[0])} ${f(l[1])} ${f(t[0])} ${f(t[1])} Q${f(rr[0])} ${f(rr[1])} ${f(b[0])} ${f(b[1])}Z`;
}

// Circular lace doily centered at (cx, cy) with outer radius R.
function doily(cx, cy, R, hollow = false) {
  const parts = [];
  const ring = (r, n, fn) => { for (let i = 0; i < n; i++) parts.push(fn((i / n) * TAU, i, r)); };
  // Outer scallops with eyelets.
  const n1 = 56;
  let d = '';
  for (let i = 0; i < n1; i++) {
    const a1 = (i / n1) * TAU, a2 = ((i + 1) / n1) * TAU;
    const r = R * 0.95, sr = r * Math.sin(Math.PI / n1);
    const p1 = [r * Math.cos(a1), r * Math.sin(a1)], p2 = [r * Math.cos(a2), r * Math.sin(a2)];
    d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])} A${f(sr)} ${f(sr)} 0 0 1 ${f(p2[0])} ${f(p2[1])} `;
  }
  parts.push(`<path d="${d}Z"/>`);
  ring(R * 0.955, n1, (a) => `<circle cx="${f(R * 0.955 * Math.cos(a + Math.PI / n1))}" cy="${f(R * 0.955 * Math.sin(a + Math.PI / n1))}" r="${f(R * 0.014)}"/>`);
  parts.push(`<circle r="${f(R * 0.9)}"/><circle r="${f(R * 0.88)}" class="dots"/>`);
  // Net of small arches.
  const n2 = 72;
  d = '';
  for (let i = 0; i < n2; i++) {
    const a1 = (i / n2) * TAU, a2 = ((i + 1) / n2) * TAU, r = R * 0.86;
    const p1 = [r * Math.cos(a1), r * Math.sin(a1)], p2 = [r * Math.cos(a2), r * Math.sin(a2)];
    const pm = [R * 0.8 * Math.cos((a1 + a2) / 2), R * 0.8 * Math.sin((a1 + a2) / 2)];
    d += `M${f(p1[0])} ${f(p1[1])} Q${f(pm[0])} ${f(pm[1])} ${f(p2[0])} ${f(p2[1])} `;
  }
  parts.push(`<path d="${d}"/>`);
  // Large petals with veins.
  const n3 = 24;
  ring(0, n3, (a) => `<path d="${petal(R * 0.5, R * 0.78, a, 0.11)}"/><path d="${petal(R * 0.55, R * 0.72, a, 0.05)}"/>`);
  ring(R * 0.74, n3, (a) => { const b = a + Math.PI / n3; return `<circle cx="${f(R * 0.72 * Math.cos(b))}" cy="${f(R * 0.72 * Math.sin(b))}" r="${f(R * 0.01)}" class="fill"/>`; });
  parts.push(`<circle r="${f(R * 0.48)}"/>`);
  // Inner scallop ring.
  const n4 = 32;
  d = '';
  for (let i = 0; i < n4; i++) {
    const a1 = (i / n4) * TAU, a2 = ((i + 1) / n4) * TAU, r = R * 0.45, sr = r * Math.sin(Math.PI / n4);
    const p1 = [r * Math.cos(a1), r * Math.sin(a1)], p2 = [r * Math.cos(a2), r * Math.sin(a2)];
    d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])} A${f(sr)} ${f(sr)} 0 0 0 ${f(p2[0])} ${f(p2[1])} `;
  }
  parts.push(`<path d="${d}Z"/>`);
  if (hollow) return `<g transform="translate(${f(cx)} ${f(cy)})">${parts.join('')}</g>`;
  // Inner rosette.
  ring(0, 12, (a) => `<path d="${petal(R * 0.13, R * 0.38, a, 0.2)}"/>`);
  ring(0, 12, (a) => `<path d="${petal(R * 0.15, R * 0.3, a + Math.PI / 12, 0.12)}"/>`);
  parts.push(`<circle r="${f(R * 0.1)}"/><circle r="${f(R * 0.04)}" class="fill"/>`);
  return `<g transform="translate(${f(cx)} ${f(cy)})">${parts.join('')}</g>`;
}
