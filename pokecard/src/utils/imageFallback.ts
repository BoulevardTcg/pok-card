import type { SyntheticEvent } from 'react';

/**
 * Chemin du placeholder statique servi depuis public/img/products/.
 * Utilisé comme valeur par défaut lorsqu'un produit n'a pas d'image.
 */
export const PLACEHOLDER_IMAGE = '/img/products/placeholder.png';

/**
 * Ultime filet de sécurité : un SVG inline encodé en data URI.
 * Contrairement à un fichier statique, un data URI ne peut JAMAIS renvoyer 404.
 * Utilisé en dernier recours pour garantir qu'aucune boucle onError n'est possible.
 */
export const PLACEHOLDER_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" role="img" aria-label="Image indisponible">' +
      '<rect width="200" height="280" rx="12" fill="#2a2a2a"/>' +
      '<text x="50%" y="50%" fill="#888" font-family="sans-serif" font-size="48" text-anchor="middle" dominant-baseline="middle">?</text>' +
      '</svg>'
  );

/**
 * Handler onError partagé pour toutes les <img> de l'application.
 *
 * Garantit qu'une image cassée ne peut JAMAIS provoquer de boucle infinie
 * de requêtes vers l'origine (problème observé le 2026-04-24 : 1,2M requêtes
 * sur placeholder.png à cause d'un fallback qui se redéclenchait à l'infini).
 *
 * Stratégie de double fallback :
 *   1. Image initiale KO  → on tente /img/products/placeholder.png
 *   2. placeholder KO     → on bascule sur un data URI inline (jamais 404)
 *   3. data URI           → onerror désactivé, on s'arrête.
 *
 * À chaque étape, `onerror` est mis à null pour couper toute récursivité
 * même si un navigateur exotique réinterprète l'assignation de `src`.
 */
export function handleImageError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;

  // Étape 3 : déjà sur le data URI → rien à faire, on coupe l'handler.
  if (img.src.startsWith('data:')) {
    img.onerror = null;
    return;
  }

  // Étape 2 : placeholder.png a lui-même échoué → bascule inviolable.
  if (img.src.endsWith(PLACEHOLDER_IMAGE)) {
    img.onerror = null;
    img.src = PLACEHOLDER_DATA_URI;
    return;
  }

  // Étape 1 : image produit KO → essai du placeholder statique.
  img.src = PLACEHOLDER_IMAGE;
}
