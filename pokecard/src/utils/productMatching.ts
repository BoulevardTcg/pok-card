import { listProducts } from '../api';
import type { Product as ProductType } from '../cartContext';

// Fonction utilitaire pour normaliser les noms de produits
export function normalizeProductName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction utilitaire pour trouver un produit correspondant dans une liste
export function findMatchingProduct(
  productName: string,
  apiProducts: ProductType[]
): ProductType | undefined {
  const normalizedName = normalizeProductName(productName);

  // Recherche exacte ou partielle
  let match = apiProducts.find((p) => {
    const normalizedPName = normalizeProductName(p.name);
    return (
      normalizedPName === normalizedName ||
      normalizedPName.includes(normalizedName) ||
      normalizedName.includes(normalizedPName)
    );
  });

  // Si pas de match, recherche par mots-clés
  if (!match) {
    const keywords = normalizedName.split(' ').filter((w) => w.length > 3);
    match = apiProducts.find((p) => {
      const normalizedPName = normalizeProductName(p.name);
      return keywords.some((keyword) => normalizedPName.includes(keyword));
    });
  }

  return match;
}

// Fonction utilitaire pour naviguer vers un produit (avec fallback recherche API)
export async function navigateToProduct(
  productName: string,
  apiProducts: ProductType[],
  navigate: (path: string) => void
): Promise<void> {
  // Rechercher dans les produits déjà chargés
  const matchingProduct = findMatchingProduct(productName, apiProducts);

  if (matchingProduct?.slug) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/produit/${matchingProduct.slug}`);
    return;
  }

  // Si pas trouvé, rechercher via l'API
  try {
    const response = (await listProducts({ search: productName, limit: 20 })) as {
      products: ProductType[];
    };
    const normalizedName = normalizeProductName(productName);
    const found = response.products?.find((p: ProductType) => {
      const normalizedPName = normalizeProductName(p.name);
      return (
        normalizedPName === normalizedName ||
        normalizedPName.includes(normalizedName) ||
        normalizedName.includes(normalizedPName)
      );
    });

    if (found?.slug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`/produit/${found.slug}`);
      return;
    }
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
  }

  // Fallback : recherche par URL
  navigate(`/?search=${encodeURIComponent(productName)}`);
}
