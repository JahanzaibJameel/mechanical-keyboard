// Generates public/opengraph-image.png: a 1200x630 social card.
//
// Rendered by screenshotting brand-styled HTML in Chromium rather than by
// hand-rasterising pixels, because the card needs real type. The typeface is the
// self-hosted Geist that next/font/google already emits into .next/static/media,
// so the card matches the site instead of falling back to a system font.
//
// Dev-only asset generator. Not part of `npm run build` or CI: the committed PNG
// is the artefact. Re-run with `node scripts/generate-og-image.mjs` after a
// production build.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WIDTH = 1200;
const HEIGHT = 630;
const OUTPUT_DIR = "public";
const OUTPUT_FILE = join(OUTPUT_DIR, "opengraph-image.png");
const MEDIA_DIR = join(".next", "static", "media");

// Prefer the heaviest self-hosted face, which is the latin subset of Geist Sans.
function loadBrandFont() {
  let candidates;
  try {
    candidates = readdirSync(MEDIA_DIR)
      .filter((name) => name.endsWith(".woff2"))
      .map((name) => ({ name, size: readFileSync(join(MEDIA_DIR, name)).length }))
      .sort((a, b) => b.size - a.size);
  } catch {
    throw new Error(
      `No self-hosted fonts in ${MEDIA_DIR}. Run \`npm run build\` first so next/font emits them.`,
    );
  }

  if (candidates.length === 0) {
    throw new Error(`No .woff2 files in ${MEDIA_DIR}.`);
  }

  const chosen = candidates[0];
  const data = readFileSync(join(MEDIA_DIR, chosen.name)).toString("base64");

  return { family: chosen.name, dataUri: `data:font/woff2;base64,${data}` };
}

const { dataUri } = loadBrandFont();

// Top-down 75% board, matching the fallback artwork and the configurator palette.
function keyboardSvg() {
  const COLS = 15;
  const ROWS = 5;
  const cellW = 46;
  const cellH = 40;
  const gap = 6;
  const padX = 34;
  const padY = 30;
  const gridW = COLS * cellW + (COLS - 1) * gap;
  const gridH = ROWS * cellH + (ROWS - 1) * gap;
  const caseW = gridW + padX * 2;
  const caseH = gridH + padY * 2;

  const isAccent = (row, col) =>
    (row === 0 && col === 0) || (row === ROWS - 1 && (col === 5 || col === 6)) || (row === ROWS - 2 && col === COLS - 1);

  const keys = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = padX + col * (cellW + gap);
      const y = padY + row * (cellH + gap);
      keys.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="5" ` +
          `fill="${isAccent(row, col) ? "#e8c547" : "#4f4f53"}"/>` +
          `<rect x="${x + 4}" y="${y + 2}" width="${cellW - 8}" height="4" rx="2" ` +
          `fill="${isAccent(row, col) ? "#f0d264" : "#5c5c61"}"/>`,
      );
    }
  }

  return `<svg width="${caseW}" height="${caseH}" viewBox="0 0 ${caseW} ${caseH}" xmlns="http://www.w3.org/2000/svg" role="presentation">
    <rect x="0" y="0" width="${caseW}" height="${caseH}" rx="20" fill="#232327"/>
    <rect x="18" y="5" width="${caseW - 36}" height="5" rx="2.5" fill="#34343a"/>
    <rect x="${padX - 14}" y="${padY - 14}" width="${gridW + 28}" height="${gridH + 28}" rx="8" fill="#131315"/>
    ${keys.join("")}
  </svg>`;
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face {
    font-family: "Brand";
    src: url("${dataUri}") format("woff2");
    font-weight: 100 900;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    background: #080808;
    color: #f5f5f5;
    font-family: "Brand", system-ui, sans-serif;
    display: flex;
    align-items: center;
    gap: 44px;
    padding: 0 72px;
    position: relative;
  }
  .glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(900px 480px at 78% 46%, rgba(232,197,71,0.10), transparent 70%);
  }
  .copy { position: relative; flex: 1 1 auto; }
  .eyebrow {
    font-size: 15px; letter-spacing: 0.42em; text-transform: uppercase;
    color: rgba(245,245,245,0.55); font-weight: 500;
  }
  h1 {
    font-size: 82px; line-height: 1.02; font-weight: 600;
    letter-spacing: -0.02em; margin-top: 18px;
  }
  .rule { width: 72px; height: 4px; background: #e8c547; border-radius: 2px; margin: 26px 0 22px; }
  p.lede {
    font-size: 22px; line-height: 1.45; color: rgba(245,245,245,0.72);
    max-width: 30rem;
  }
  .specs {
    position: absolute; left: 72px; bottom: 44px;
    display: flex; gap: 34px;
    font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba(245,245,245,0.42);
  }
  .art {
    position: relative; flex: 0 0 auto;
    transform: rotate(-11deg) scale(0.70);
    transform-origin: center;
  }
</style></head>
<body>
  <div class="glow"></div>
  <div class="copy">
    <div class="eyebrow">NØR 75</div>
    <h1>Precision<br>in motion.</h1>
    <div class="rule"></div>
    <p class="lede">A 75% wireless mechanical keyboard in CNC aluminium with PBT double-shot keycaps.</p>
  </div>
  <div class="art">${keyboardSvg()}</div>
  <div class="specs"><span>1000 Hz</span><span>2.4 GHz</span><span>4000 mAh</span><span>75%</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});

await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: OUTPUT_FILE });

await browser.close();

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, readFileSync(OUTPUT_FILE));

const { size } = await import("node:fs").then((fs) => fs.statSync(OUTPUT_FILE));
console.log(`wrote ${OUTPUT_FILE}  ${size} bytes  ${WIDTH}x${HEIGHT}`);