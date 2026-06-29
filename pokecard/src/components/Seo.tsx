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
 * Sérialise un objet JSON-LD pour une insertion sûre dans un <script>.
 * `JSON.stringify` n'échappe pas `<`, `>`, `&` ni les séparateurs de ligne
 * Unicode (U+2028 / U+2029) : un `</script>` présent dans une donnée
 * (nom/description produit…) pourrait sinon clôturer la balise et injecter
 * du HTML arbitraire (XSS). On remplace ces caractères par leur échappement
 * `\uXXXX`, qui reste du JSON valide.
 */
function serializeJsonLd(data: object | object[]): string {
  const LS = String.fromCharCode(0x2028); // U+2028 LINE SEPARATOR
  const PS = String.fromCharCode(0x2029); // U+2029 PARAGRAPH SEPARATOR
  const ESCAPES: Record<string, string> = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    [LS]: '\\u2028',
    [PS]: '\\u2029',
  };
  const pattern = new RegExp(`[<>&${LS}${PS}]`, 'g');
  return JSON.stringify(data).replace(pattern, (char) => ESCAPES[char]);
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
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
    </>
  );
}
