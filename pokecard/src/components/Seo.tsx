import { useLocation } from 'react-router-dom';
import { SITE_NAME, SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_LOCALE, absoluteUrl } from '../lib/site';

interface SeoProps {
  /** Titre de la page (sans le suffixe " | BoulevardTCG", ajouté automatiquement). */
  title?: string;
  /** Méta description (~150-160 caractères). */
  description?: string;
  /** Chemin canonique. Par défaut : la route courante. */
  canonical?: string;
  /** Image de partage (chemin relatif ou URL absolue). */
  image?: string;
  /** Type Open Graph. */
  type?: 'website' | 'article' | 'product';
  /** Empêche l'indexation (pages privées, panier, admin...). */
  noindex?: boolean;
  /** Données structurées JSON-LD (objet ou tableau d'objets schema.org). */
  jsonLd?: object | object[];
}

/**
 * Composant SEO centralisé.
 * S'appuie sur le hoisting natif des balises <title>/<meta>/<link> de React 19 :
 * ces balises sont automatiquement déplacées dans <head>.
 */
export function Seo({
  title,
  description = SITE_DESCRIPTION,
  canonical,
  image = SITE_OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
}: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Le Boulevard Prestige du TCG`;
  const canonicalUrl = absoluteUrl(canonical ?? pathname);
  const imageUrl = absoluteUrl(image);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Données structurées */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
