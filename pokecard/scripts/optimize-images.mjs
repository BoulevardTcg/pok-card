/**
 * Optimise les images de CONTENU du dossier public/ :
 *   - redimensionne celles qui dépassent MAX_WIDTH,
 *   - recompresse en place (mêmes URLs → aucun changement de code côté composants),
 *   - génère une variante .webp à côté de chaque image.
 *
 * IMPORTANT : on n'touche PAS aux textures du shader holographique
 * (public/img/*.png|jpg : cosmos, rainbow, galaxy, glitter, illusion, etc.),
 * volontairement non listées ci-dessous.
 *
 * Usage : npm run optimize:images
 */
import sharp from 'sharp';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Dossiers/fichiers de contenu à optimiser (relatifs à public/).
const TARGET_DIRS = ['actualiter', 'carte_accueil', join('img', 'products')];
const TARGET_ROOT_FILES = ['pokémon.png', 'onepiece.png', 'displayop.jpeg', 'displayvoltage.jpg'];

const MAX_WIDTH = 1400; // largeur max raisonnable pour des visuels web
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const RASTER = new Set(['.png', '.jpg', '.jpeg']);

let totalBefore = 0;
let totalAfter = 0;
let totalWebp = 0;
let count = 0;

async function collect(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collect(full)));
    else if (RASTER.has(extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

function basePipeline(input, meta) {
  const needsResize = meta.width && meta.width > MAX_WIDTH;
  return needsResize
    ? sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true })
    : sharp(input);
}

async function optimize(file) {
  const ext = extname(file).toLowerCase();
  const before = (await stat(file)).size;

  // Lecture en mémoire AVANT toute écriture : sharp ne garde jamais le fichier
  // ouvert pendant qu'on le réécrit (sinon échec "unable to open for write" sous Windows).
  const input = await readFile(file);
  const meta = await sharp(input).metadata();

  // Recompression en place (même format → même URL).
  let buffer;
  if (ext === '.png') {
    buffer = await basePipeline(input, meta)
      .png({ compressionLevel: 9, effort: 8, palette: true, quality: 90 })
      .toBuffer();
  } else {
    buffer = await basePipeline(input, meta)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  }
  // N'écrase que si l'on gagne effectivement des octets.
  if (buffer.length < before) {
    await writeFile(file, buffer);
  }
  const after = Math.min(buffer.length, before);

  // Variante WebP à côté (mp.png -> mp.webp), seulement si plus légère.
  const webpPath = join(dirname(file), `${basename(file, extname(file))}.webp`);
  const webpBuf = await basePipeline(input, meta).webp({ quality: WEBP_QUALITY }).toBuffer();
  let webpWritten = 0;
  if (webpBuf.length < after) {
    await writeFile(webpPath, webpBuf);
    webpWritten = webpBuf.length;
  }

  totalBefore += before;
  totalAfter += after;
  totalWebp += webpWritten;
  count += 1;

  const pct = (((before - after) / before) * 100).toFixed(0);
  const webpLabel = webpWritten ? `+ webp ${(webpWritten / 1024).toFixed(0)}KB` : '(webp ignoré)';
  console.log(
    `  ${file.replace(PUBLIC_DIR, '').replace(/\\/g, '/')}  ` +
      `${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (-${pct}%)  ${webpLabel}`
  );
}

async function main() {
  const files = [];
  for (const d of TARGET_DIRS) files.push(...(await collect(join(PUBLIC_DIR, d))));
  for (const f of TARGET_ROOT_FILES) files.push(join(PUBLIC_DIR, f));

  console.log(`[images] Optimisation de ${files.length} fichiers de contenu...`);
  for (const f of files) {
    try {
      await optimize(f);
    } catch (err) {
      console.warn(`  ! ignoré ${f} : ${err.message}`);
    }
  }

  const kb = (n) => (n / 1024).toFixed(0);
  console.log(
    `\n[images] ${count} images : ${kb(totalBefore)}KB -> ${kb(totalAfter)}KB ` +
      `(-${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}% en place) ; ` +
      `variantes webp : ${kb(totalWebp)}KB.`
  );
}

main();
