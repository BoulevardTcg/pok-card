/**
 * Génère public/sitemap.xml en combinant les pages statiques publiques
 * et les fiches produit récupérées depuis l'API.
 *
 * Usage :
 *   SITE_URL=https://boulevardtcg.com API_URL=https://api.boulevardtcg.com/api \
 *     node scripts/generate-sitemap.mjs
 *
 * En l'absence de SITE_URL / API_URL, le script réutilise VITE_SITE_URL /
 * VITE_API_URL (déjà définis dans le build front, ex. sur Vercel) — donc rien
 * à configurer en plus en pratique.
 *
 * Sans aucune URL d'API ou si l'API est injoignable, seules les pages statiques
 * sont écrites (le build ne casse pas).
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Réutilise les variables déjà présentes dans l'environnement de build du
// frontend (Vercel : VITE_API_URL est déjà défini pour que le site appelle
// l'API). On accepte aussi SITE_URL / API_URL si on veut surcharger.
const SITE_URL = (
  process.env.SITE_URL ??
  process.env.VITE_SITE_URL ??
  'https://boulevardtcg.com'
).replace(/\/$/, '');
const API_URL = process.env.API_URL ?? process.env.VITE_API_URL ?? '';

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/produits', changefreq: 'daily', priority: '0.9' },
  { path: '/cartes', changefreq: 'daily', priority: '0.8' },
  { path: '/accessoires', changefreq: 'weekly', priority: '0.7' },
  { path: '/protections', changefreq: 'weekly', priority: '0.7' },
  { path: '/trade', changefreq: 'weekly', priority: '0.6' },
  { path: '/actualites', changefreq: 'weekly', priority: '0.6' },
  { path: '/concours', changefreq: 'weekly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.4' },
  { path: '/cgv', changefreq: 'yearly', priority: '0.2' },
  { path: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.2' },
];

function urlEntry({ path, changefreq, priority, lastmod }) {
  const loc = `${SITE_URL}${path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function fetchProductRoutes() {
  if (!API_URL) return [];
  const base = API_URL.replace(/\/$/, '');
  // L'API plafonne `limit` à 48 → on pagine jusqu'à épuisement.
  const limit = 48;
  const collected = [];

  const pushProduct = (p) => {
    if (!p?.slug) return;
    collected.push({
      path: `/produit/${p.slug}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined,
    });
  };

  try {
    let page = 1;
    let pages = 1;
    do {
      const res = await fetch(`${base}/products?limit=${limit}&page=${page}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // L'API renvoie { products, pagination }. Fallbacks au cas où.
      const products = json.products ?? json.data ?? (Array.isArray(json) ? json : []);
      products.forEach(pushProduct);
      pages = json.pagination?.pages ?? 1;
      page += 1;
    } while (page <= pages);
    return collected;
  } catch (err) {
    console.warn(`[sitemap] Produits ignorés (API injoignable) : ${err.message}`);
    // On garde ce qui a déjà été collecté avant l'erreur éventuelle.
    return collected;
  }
}

async function main() {
  const productRoutes = await fetchProductRoutes();
  const routes = [...STATIC_ROUTES, ...productRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(urlEntry).join('\n')}
</urlset>
`;

  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml');
  await writeFile(out, xml, 'utf8');
  console.log(`[sitemap] ${routes.length} URL écrites dans public/sitemap.xml`);
}

main();
