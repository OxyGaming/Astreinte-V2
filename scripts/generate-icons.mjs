/**
 * Génère les icônes PNG PWA avec le bouclier Lucide en ambre (#fbbf24)
 * sur fond bleu brand (#1e3a8a), via sharp (inclus dans Next.js).
 */

import sharp from '../node_modules/sharp/lib/index.js';
import { writeFileSync } from 'fs';

/**
 * Construit le SVG source pour une taille donnée.
 * Le bouclier (Lucide path, viewBox 24×24) est mis à l'échelle et centré.
 */
function buildSVG(size) {
  // Taille cible du bouclier : ~62% de l'icône
  const shieldTarget = Math.round(size * 0.62);
  const scale = shieldTarget / 24;
  // Centrage : le path Lucide est centré en (12,12) dans la viewBox 24×24
  const cx = size / 2 - 12 * scale;
  const cy = size / 2 - 12 * scale;
  // Rayon des coins (arrondi app-store style)
  const rx = Math.round(size * 0.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Fond bleu brand -->
  <rect width="${size}" height="${size}" rx="${rx}" fill="#1e3a8a"/>
  <!-- Bouclier Lucide, couleur ambre-400 -->
  <g transform="translate(${cx.toFixed(2)}, ${cy.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="#fbbf24"
    />
  </g>
</svg>`;
}

async function generate(size, outPath) {
  const svg = buildSVG(size);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}  (${size}×${size})`);
}

await generate(192, 'public/icon-192.png');
await generate(512, 'public/icon-512.png');
