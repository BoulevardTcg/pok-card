import type { Product } from '../cartContext';

// Enum pour les catégories de jeu
export enum GameCategory {
  POKEMON = 'pokemon',
  RIFTBOUND = 'riftbound',
  ONE_PIECE = 'op',
}

// Enum pour les types de produits
export enum ProductType {
  ETB = 'etb',
  BOOSTER = 'booster',
  DISPLAY = 'display',
  UPC = 'upc',
  COFFRET = 'coffret',
  OTHER = 'other',
}

// Enum pour la disponibilité
export enum Availability {
  IN_STOCK = 'in-stock',
  OUT_OF_STOCK = 'out-of-stock',
}

// Mapping pour l'affichage des catégories
export const categoryLabels: Record<GameCategory, string> = {
  [GameCategory.POKEMON]: 'Pokémon',
  [GameCategory.RIFTBOUND]: 'Riftbound',
  [GameCategory.ONE_PIECE]: 'One Piece',
};

// Mapping pour l'affichage des types de produits
export const productTypeLabels: Record<ProductType, string> = {
  [ProductType.ETB]: 'ETB',
  [ProductType.BOOSTER]: 'Booster',
  [ProductType.DISPLAY]: 'Display',
  [ProductType.UPC]: 'UPC',
  [ProductType.COFFRET]: 'Coffret',
  [ProductType.OTHER]: 'Autre',
};

// Mapping pour l'affichage de la disponibilité
export const availabilityLabels: Record<Availability, string> = {
  [Availability.IN_STOCK]: 'En stock',
  [Availability.OUT_OF_STOCK]: 'Épuisé',
};

/**
 * Détermine la catégorie de jeu à partir du produit
 */
export function getGameCategory(product: Product): GameCategory | null {
  const category = product.category?.toLowerCase() || '';
  const name = product.name.toLowerCase();

  if (
    category === 'pokémon' ||
    category === 'pokemon' ||
    name.includes('pokemon') ||
    name.includes('pokémon')
  ) {
    return GameCategory.POKEMON;
  }
  if (category === 'riftbound' || name.includes('riftbound')) {
    return GameCategory.RIFTBOUND;
  }
  if (
    category === 'one piece' ||
    category === 'onepiece' ||
    category === 'op' ||
    name.includes('one piece')
  ) {
    return GameCategory.ONE_PIECE;
  }

  return null;
}

/**
 * Détermine le type de produit à partir du produit
 */
export function getProductType(product: Product): ProductType {
  const category = product.category?.toLowerCase() || '';
  const name = product.name.toLowerCase();

  if (category.includes('display') || name.includes('display')) {
    return ProductType.DISPLAY;
  }
  if (
    category.includes('etb') ||
    name.includes('elite trainer') ||
    name.includes('coffret dresseur') ||
    name.includes('etb')
  ) {
    return ProductType.ETB;
  }
  if (category.includes('upc') || name.includes('ultra premium')) {
    return ProductType.UPC;
  }
  if (category.includes('booster') || name.includes('booster')) {
    return ProductType.BOOSTER;
  }
  if (category.includes('coffret') || name.includes('coffret')) {
    return ProductType.COFFRET;
  }

  return ProductType.OTHER;
}

/**
 * Filtre les produits selon les catégories de jeu sélectionnées
 * Logique: OR au sein de la même catégorie (si plusieurs catégories sélectionnées, produit doit correspondre à l'une d'elles)
 */
export function filterByGameCategories(
  products: Product[],
  selectedCategories: GameCategory[]
): Product[] {
  if (selectedCategories.length === 0) {
    return products;
  }

  return products.filter((product) => {
    const productCategory = getGameCategory(product);
    return productCategory && selectedCategories.includes(productCategory);
  });
}

/**
 * Filtre les produits selon les types de produits sélectionnés
 * Logique: OR au sein du même type (si plusieurs types sélectionnés, produit doit correspondre à l'un d'eux)
 */
export function filterByProductTypes(products: Product[], selectedTypes: ProductType[]): Product[] {
  if (selectedTypes.length === 0) {
    return products;
  }

  return products.filter((product) => {
    const productType = getProductType(product);
    return selectedTypes.includes(productType);
  });
}

/**
 * Parse les catégories depuis une string (query param)
 */
export function parseCategoriesFromString(categoriesStr: string | null): GameCategory[] {
  if (!categoriesStr) return [];
  return categoriesStr.split(',').filter((c): c is GameCategory => {
    return Object.values(GameCategory).includes(c as GameCategory);
  });
}

/**
 * Parse les types depuis une string (query param)
 */
export function parseTypesFromString(typesStr: string | null): ProductType[] {
  if (!typesStr) return [];
  return typesStr.split(',').filter((t): t is ProductType => {
    return Object.values(ProductType).includes(t as ProductType);
  });
}

/**
 * Convertit un tableau de catégories en string pour l'URL
 */
export function categoriesToString(categories: GameCategory[]): string {
  return categories.join(',');
}

/**
 * Convertit un tableau de types en string pour l'URL
 */
export function typesToString(types: ProductType[]): string {
  return types.join(',');
}

/**
 * Filtre les produits selon la disponibilité sélectionnée
 */
export function filterByAvailability(
  products: Product[],
  selectedAvailability: Availability[]
): Product[] {
  if (selectedAvailability.length === 0) {
    return products;
  }

  return products.filter((product) => {
    const isInStock = !product.outOfStock && product.variants.some((v) => v.stock > 0);

    if (selectedAvailability.includes(Availability.IN_STOCK) && isInStock) {
      return true;
    }
    if (selectedAvailability.includes(Availability.OUT_OF_STOCK) && !isInStock) {
      return true;
    }

    return false;
  });
}

/**
 * Parse la disponibilité depuis une string (query param)
 */
export function parseAvailabilityFromString(availabilityStr: string | null): Availability[] {
  if (!availabilityStr) return [];
  return availabilityStr.split(',').filter((a): a is Availability => {
    return Object.values(Availability).includes(a as Availability);
  });
}

/**
 * Convertit un tableau de disponibilités en string pour l'URL
 */
export function availabilityToString(availability: Availability[]): string {
  return availability.join(',');
}

/**
 * Filtre les produits selon une plage de prix (en centimes)
 */
export function filterByPriceRange(
  products: Product[],
  minPriceCents: number | null,
  maxPriceCents: number | null
): Product[] {
  if (minPriceCents === null && maxPriceCents === null) {
    return products;
  }

  return products.filter((product) => {
    const productPrice = product.minPriceCents;
    // Si le produit n'a pas de prix, on l'exclut du filtre
    if (productPrice === null || productPrice === undefined) return false;

    // Vérifier le minimum
    if (minPriceCents !== null && productPrice < minPriceCents) {
      return false;
    }
    
    // Vérifier le maximum (si défini)
    if (maxPriceCents !== null && productPrice > maxPriceCents) {
      return false;
    }

    return true;
  });
}

/**
 * Filtre les produits selon les langues sélectionnées
 */
export function filterByLanguages(products: Product[], selectedLanguages: string[]): Product[] {
  if (selectedLanguages.length === 0) {
    return products;
  }

  return products.filter((product) => {
    if (!product.variants || product.variants.length === 0) return false;
    return product.variants.some((variant) => {
      const variantLang = (variant.language || '').toLowerCase().trim();
      return selectedLanguages.some((lang) => {
        const langLower = lang.toLowerCase().trim();
        // Mapping des codes de langue
        if (langLower === 'fr') {
          return variantLang === 'fr' || variantLang === 'français' || variantLang === 'french' || variantLang === 'francais';
        }
        if (langLower === 'en') {
          return variantLang === 'en' || variantLang === 'anglais' || variantLang === 'english';
        }
        if (langLower === 'jp') {
          return variantLang === 'jp' || variantLang === 'japonais' || variantLang === 'japanese';
        }
        return variantLang === langLower;
      });
    });
  });
}

/**
 * Parse une plage de prix depuis une string (query param) "min-max"
 */
export function parsePriceRangeFromString(priceRangeStr: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!priceRangeStr) return { min: null, max: null };
  const parts = priceRangeStr.split('-');
  if (parts.length !== 2) return { min: null, max: null };
  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1], 10);
  if (isNaN(min) || isNaN(max)) return { min: null, max: null };
  return { min: min * 100, max: max * 100 }; // Convertir en centimes
}

/**
 * Convertit une plage de prix en string pour l'URL "min-max" (en euros)
 */
export function priceRangeToString(minPriceCents: number | null, maxPriceCents: number | null): string {
  if (minPriceCents === null && maxPriceCents === null) return '';
  const min = minPriceCents !== null ? Math.floor(minPriceCents / 100) : 0;
  const max = maxPriceCents !== null ? Math.floor(maxPriceCents / 100) : 500;
  return `${min}-${max}`;
}

/**
 * Parse les langues depuis une string (query param)
 */
export function parseLanguagesFromString(languagesStr: string | null): string[] {
  if (!languagesStr) return [];
  return languagesStr.split(',');
}

/**
 * Convertit un tableau de langues en string pour l'URL
 */
export function languagesToString(languages: string[]): string {
  return languages.join(',');
}
