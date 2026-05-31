/**
 * Génère public/sitemap.xml en combinant les pages statiques publiques
 * et les fiches produit récupérées depuis l'API.
 *
 * Usage :
 *   SITE_URL=https://boulevardtcg.com API_URL=https://api.boulevardtcg.com/api \
 *     node scripts/generate-sitemap.mjs
 *
 * Sans API_URL ou si l'API est injoignable, seules les pages statiques sont écrites
 * (le build ne casse pas).
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE_URL = (process.env.SITE_URL ?? 'https://boulevardtcg.com').replace(/\/$/, '');
const API_URL = process.env.API_URL ?? '';

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
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/products?limit=1000`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const products = Array.isArray(json) ? json : (json.data ?? []);
    return products
      .filter((p) => p?.slug)
      .map((p) => ({
        path: `/produit/${p.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined,
      }));
  } catch (err) {
    console.warn(`[sitemap] Produits ignorés (API injoignable) : ${err.message}`);
    return [];
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
