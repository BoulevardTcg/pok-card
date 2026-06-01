// Configuration centrale du site pour le SEO (canonical, Open Graph, JSON-LD).
// Surchargée en production via VITE_SITE_URL si défini.

export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://boulevardtcg.com').replace(
  /\/$/,
  ''
);

export const SITE_NAME = 'BoulevardTCG';

export const SITE_DESCRIPTION =
  'BoulevardTCG, votre boutique TCG par des passionnés : produits scellés et cartes à collectionner Pokémon, One Piece, Magic, Yu-Gi-Oh! et Lorcana.';

// Image de partage par défaut (Open Graph / Twitter). 1200x630 recommandé.
export const SITE_OG_IMAGE = '/carte_accueil/dracaufeu.png';

export const SITE_LOCALE = 'fr_FR';

// Construit une URL absolue à partir d'un chemin relatif.
export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
