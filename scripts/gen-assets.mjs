import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';

const PEACH = '#f7f0eb';
const DARK  = '#3a3835';

// The logo mark in local coordinate space (centered at origin).
// Outer circle r=62, inner arc as specified, dot at (33,-50).
const CRESCENT = 'M 0,-62 A 62,62 0 1,0 43.84,43.84 A 40,40 0 1,1 0,-62 Z';

function markGroup(scale, stroke, strokeWidth) {
  // strokeWidth is in local units; compensate for the scale applied by the <g>
  const lw = strokeWidth / scale;
  return `
  <g transform="scale(${scale})">
    <path d="${CRESCENT}"
          fill="none" stroke="${stroke}"
          stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="33" cy="-50" r="${5.5 / scale * (1 / 1)}" fill="${stroke}"/>
  </g>`;
}

function render(svg, outPath) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  const png   = resvg.render();
  writeFileSync(outPath, png.asPng());
  console.log('wrote', outPath);
}

// ── Icon 1024×1024 (peach bg, dark mark) ────────────────────────────────────
render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${PEACH}"/>
  <g transform="translate(512,512)">
    ${markGroup(4.0, DARK, 5)}
  </g>
</svg>`, 'assets/icon.png');

// ── Adaptive icon 1024×1024 (transparent bg, dark mark — Android adds bg) ──
render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <g transform="translate(512,512)">
    ${markGroup(3.2, DARK, 5)}
  </g>
</svg>`, 'assets/adaptive-icon.png');

// ── Splash 1242×2436 (dark bg, peach mark + wordmark) ───────────────────────
// Mark sits at ~42% height; wordmark sits 60px below the mark's bottom edge.
const markScale  = 4.2;
const markCY     = 1000;
const markBottom = markCY + 62 * markScale; // bottom of crescent in canvas coords

render(`<svg xmlns="http://www.w3.org/2000/svg" width="1242" height="2436">
  <rect width="1242" height="2436" fill="${DARK}"/>
  <g transform="translate(621,${markCY})">
    ${markGroup(markScale, PEACH, 5)}
  </g>
  <text
    x="621" y="${markBottom + 56}"
    font-family="Georgia, serif"
    font-size="38"
    letter-spacing="14"
    fill="${PEACH}"
    text-anchor="middle">RITUAL TRACKER</text>
</svg>`, 'assets/splash-icon.png');

// ── Favicon 48×48 (peach bg, dark mark) ────────────────────────────────────
render(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
  <rect width="48" height="48" fill="${PEACH}"/>
  <g transform="translate(24,24)">
    ${markGroup(0.27, DARK, 7)}
  </g>
</svg>`, 'assets/favicon.png');
