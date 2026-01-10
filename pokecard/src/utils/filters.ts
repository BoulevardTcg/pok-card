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
