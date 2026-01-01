import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './CategorySpecificPage.module.css';
import { listProducts } from './api';
import type { Product as ProductType } from './cartContext';
import { navigateToProduct } from './utils/productMatching';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory: string;
  stock: number;
  isNew?: boolean;
  isSale?: boolean;
  isPopular?: boolean;
  description: string;
}

// Données des produits (mise à jour selon la nouvelle organisation)
const allProducts: Product[] = [
  // Accessoires TCG
  // Étuis & Protections
  {
    id: 1,
    name: 'Étui Charizard Premium',
    price: 34.99,
    image: '/public/img/pokémon.png',
    category: 'Étuis & Protections',
    subcategory: 'Étui',
    stock: 25,
    isPopular: true,
    description: 'Étui premium avec design Charizard',
  },
  {
    id: 2,
    name: 'Étui Straw Hat Pirates',
    price: 39.99,
    image: '/public/img/onepiece.png',
    category: 'Étuis & Protections',
    subcategory: 'Étui',
    stock: 22,
    description: 'Étui officiel One Piece Straw Hat Pirates',
  },
  {
    id: 3,
    name: 'Binder Collection Pokémon',
    price: 24.99,
    image: '/public/img/pokémon.png',
    category: 'Étuis & Protections',
    subcategory: 'Binder',
    stock: 31,
    description: 'Binder de collection avec pages protectrices',
  },
  {
    id: 4,
    name: 'Sleeves Ultra Pro Premium',
    price: 9.99,
    image: '/public/img/pokémon.png',
    category: 'Étuis & Protections',
    subcategory: 'Sleeves',
    stock: 150,
    isPopular: true,
    description: 'Sleeves ultra protection pour cartes',
  },

  // Sleeves & Binders
  {
    id: 5,
    name: 'Sleeves Dragon Shield',
    price: 12.99,
    image: '/public/img/pokémon.png',
    category: 'Sleeves & Binders',
    subcategory: 'Sleeves',
    stock: 89,
    description: 'Sleeves Dragon Shield ultra résistants',
  },
  {
    id: 6,
    name: 'Binder Ultra Pro Premium',
    price: 29.99,
    image: '/public/img/pokémon.png',
    category: 'Sleeves & Binders',
    subcategory: 'Binder',
    stock: 18,
    description: 'Binder Ultra Pro avec anneaux métalliques',
  },
  {
    id: 7,
    name: 'Pages Binder 9 Pochettes',
    price: 4.99,
    image: '/public/img/pokémon.png',
    category: 'Sleeves & Binders',
    subcategory: 'Pages',
    stock: 200,
    description: 'Pages de 9 pochettes pour binder',
  },

  // Displays & Présentoirs
  // Les displays sont maintenant chargés depuis l'API (produits de la base de données)

  // Accessoires de Jeu
  {
    id: 11,
    name: 'Dés TCG Premium',
    price: 19.99,
    image: '/public/img/pokémon.png',
    category: 'Accessoires de Jeu',
    subcategory: 'Dés',
    stock: 45,
    description: 'Set de dés premium pour TCG',
  },
  {
    id: 12,
    name: 'Tapis de Jeu One Piece',
    price: 44.99,
    image: '/public/img/onepiece.png',
    category: 'Accessoires de Jeu',
    subcategory: 'Tapis',
    stock: 12,
    description: 'Tapis de jeu officiel One Piece',
  },
  {
    id: 13,
    name: 'Organisateur Cartes',
    price: 14.99,
    image: '/public/img/pokémon.png',
    category: 'Accessoires de Jeu',
    subcategory: 'Organisateur',
    stock: 67,
    description: 'Organisateur pratique pour cartes',
  },
  {
    id: 14,
    name: 'Compteur de Points',
    price: 8.99,
    image: '/public/img/pokémon.png',
    category: 'Accessoires de Jeu',
    subcategory: 'Compteur',
    stock: 34,
    description: 'Compteur de points pour parties de cartes',
  },

  // Produits Dérivés
  // Peluches & Figurines
  {
    id: 15,
    name: 'Peluche Mewtwo Géante',
    price: 49.99,
    image: '/public/img/pokémon.png',
    category: 'Peluches & Figurines',
    subcategory: 'Peluche',
    stock: 8,
    description: 'Peluche géante Mewtwo officielle Pokémon',
  },
  {
    id: 16,
    name: 'Peluche Zoro Roronoa',
    price: 54.99,
    image: '/public/img/onepiece.png',
    category: 'Peluches & Figurines',
    subcategory: 'Peluche',
    stock: 15,
    description: 'Peluche officielle Zoro One Piece',
  },
  {
    id: 17,
    name: 'Figurine Pikachu Collection',
    price: 29.99,
    image: '/public/img/pokémon.png',
    category: 'Peluches & Figurines',
    subcategory: 'Figurine',
    stock: 18,
    description: 'Figurine Pikachu de collection',
  },
  {
    id: 18,
    name: 'Peluche Eevee Collection',
    price: 29.99,
    image: '/public/img/pokémon.png',
    category: 'Peluches & Figurines',
    subcategory: 'Peluche',
    stock: 18,
    description: 'Peluche Eevee officielle Pokémon',
  },
  {
    id: 19,
    name: 'Figurine Luffy Gear 5',
    price: 39.99,
    image: '/public/img/onepiece.png',
    category: 'Peluches & Figurines',
    subcategory: 'Figurine',
    stock: 12,
    description: 'Figurine Luffy Gear 5 de collection',
  },

  // Vêtements & Goodies
  {
    id: 20,
    name: 'T-shirt Charizard',
    price: 24.99,
    image: '/public/img/pokémon.png',
    category: 'Vêtements & Goodies',
    subcategory: 'T-shirt',
    stock: 35,
    description: 'T-shirt officiel avec design Charizard',
  },
  {
    id: 21,
    name: 'Poster Luffy Gear 5',
    price: 19.99,
    image: '/public/img/onepiece.png',
    category: 'Vêtements & Goodies',
    subcategory: 'Poster',
    stock: 28,
    description: 'Poster officiel Luffy Gear 5',
  },
  {
    id: 22,
    name: 'Casquette Pokémon',
    price: 29.99,
    image: '/public/img/pokémon.png',
    category: 'Vêtements & Goodies',
    subcategory: 'Casquette',
    stock: 20,
    description: 'Casquette officielle Pokémon',
  },
  {
    id: 23,
    name: 'Mug Collection One Piece',
    price: 14.99,
    image: '/public/img/onepiece.png',
    category: 'Vêtements & Goodies',
    subcategory: 'Mug',
    stock: 42,
    description: 'Mug de collection One Piece',
  },
  {
    id: 24,
    name: 'Hoodie Pikachu',
    price: 44.99,
    image: '/public/img/pokémon.png',
    category: 'Vêtements & Goodies',
    subcategory: 'Hoodie',
    stock: 15,
    description: 'Hoodie officiel avec design Pikachu',
  },

  // Posters & Décos
  {
    id: 25,
    name: 'Poster Charizard VMAX',
    price: 12.99,
    image: '/public/img/pokémon.png',
    category: 'Posters & Décos',
    subcategory: 'Poster',
    stock: 25,
    description: 'Poster Charizard VMAX haute qualité',
  },
  {
    id: 26,
    name: 'Sticker Pack Pokémon',
    price: 8.99,
    image: '/public/img/pokémon.png',
    category: 'Posters & Décos',
    subcategory: 'Stickers',
    stock: 50,
    description: 'Pack de stickers Pokémon officiels',
  },
  {
    id: 27,
    name: 'Bannière One Piece',
    price: 34.99,
    image: '/public/img/onepiece.png',
    category: 'Posters & Décos',
    subcategory: 'Bannière',
    stock: 8,
    description: 'Bannière One Piece pour chambre',
  },
];

// Informations des catégories mises à jour
const categoryInfo = {
  // Accessoires TCG
  etuis: {
    title: 'Étuis & Protections',
    icon: '🛡️',
    color: '#10b981',
    description: 'Protégez vos cartes avec nos étuis et binders premium',
  },
  sleeves: {
    title: 'Sleeves & Binders',
    icon: '📁',
    color: '#06b6d4',
    description: 'Organisez et protégez vos cartes avec nos sleeves et binders',
  },
  displays: {
    title: 'Displays & Présentoirs',
    icon: '🖼️',
    color: '#f59e0b',
    description: 'Découvrez nos présentoirs LED et supports pour cartes',
  },
  jeu: {
    title: 'Accessoires de Jeu',
    icon: '🎲',
    color: '#8b5cf6',
    description: 'Tous les accessoires essentiels pour vos parties de cartes',
  },

  // Produits Dérivés
  figurines: {
    title: 'Peluches & Figurines',
    icon: '🧸',
    color: '#f59e0b',
    description: 'Peluches et figurines officielles de vos personnages préférés',
  },
  goodies: {
    title: 'Vêtements & Goodies',
    icon: '👕',
    color: '#ef4444',
    description: 'Vêtements et objets de collection officiels',
  },
  decos: {
    title: 'Posters & Décos',
    icon: '🖼️',
    color: '#06b6d4',
    description: 'Décorez votre espace avec nos posters et accessoires décoratifs',
  },
};

export function CategorySpecificPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [sortBy, setSortBy] = useState('name');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [showPopularOnly] = useState(false);
  const [apiProducts, setApiProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les produits depuis l'API
  useEffect(() => {
    async function loadApiProducts() {
      try {
        // Pour la catégorie displays, charger tous les produits (car certains sont dans "Display", d'autres dans "Accessoires")
        if (category === 'displays') {
          // Charger tous les produits sans filtre de catégorie pour trouver tous les displays
          const response = (await listProducts({
            limit: 500,
          })) as { products: ProductType[] };
          setApiProducts(response.products);
        } else {
          // Pour les autres catégories, charger tous les produits
          const response = (await listProducts({
            limit: 200,
          })) as { products: ProductType[] };
          setApiProducts(response.products);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des produits API:', error);
      } finally {
        setLoading(false);
      }
    }
    loadApiProducts();
  }, [category]);

  const categoryData = categoryInfo[category as keyof typeof categoryInfo];

  if (!categoryData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Catégorie non trouvée</h1>
          <p>Cette catégorie n'existe pas.</p>
          <p>Paramètre reçu: "{category}"</p>
          <p>Catégories disponibles: {Object.keys(categoryInfo).join(', ')}</p>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Filtrer les produits statiques
  const filteredStaticProducts = allProducts.filter((product) => {
    const categoryMatch = product.category === categoryData.title;
    const newMatch = !showNewOnly || product.isNew;
    const saleMatch = !showSaleOnly || product.isSale;
    const popularMatch = !showPopularOnly || product.isPopular;

    return categoryMatch && newMatch && saleMatch && popularMatch;
  });

  // Filtrer les produits API selon la catégorie
  const filteredApiProducts = apiProducts.filter((apiProduct) => {
    // Pour la catégorie "displays", afficher TOUS les produits (pas seulement ceux avec "display" dans le nom)
    if (category === 'displays') {
      // Retourner true pour tous les produits
      return true;
    }

    // Pour les autres catégories, filtrer par catégorie API
    const categoryMap: { [key: string]: string[] } = {
      etuis: ['Accessoires'],
      sleeves: ['Accessoires'],
      jeu: ['Accessoires'],
    };

    const mappedCategories = categoryMap[category as string] || [];
    return mappedCategories.includes(apiProduct.category);
  });

  // Combiner les produits statiques et API
  const allCombinedProducts = [
    ...filteredStaticProducts.map((p) => ({ type: 'static' as const, data: p })),
    ...filteredApiProducts.map((p) => ({ type: 'api' as const, data: p })),
  ];

  const sortedProducts = [...allCombinedProducts].sort((a, b) => {
    if (a.type === 'static' && b.type === 'static') {
      switch (sortBy) {
        case 'price':
          return a.data.price - b.data.price;
        case 'price-desc':
          return b.data.price - a.data.price;
        case 'name':
          return a.data.name.localeCompare(b.data.name);
        case 'stock':
          return b.data.stock - a.data.stock;
        case 'subcategory':
          return a.data.subcategory.localeCompare(b.data.subcategory);
        default:
          return 0;
      }
    } else if (a.type === 'api' && b.type === 'api') {
      const aPrice = a.data.minPriceCents || 0;
      const bPrice = b.data.minPriceCents || 0;
      switch (sortBy) {
        case 'price':
          return aPrice - bPrice;
        case 'price-desc':
          return bPrice - aPrice;
        case 'name':
          return a.data.name.localeCompare(b.data.name);
        case 'stock': {
          const aStock = Math.max(...a.data.variants.map((v) => v.stock));
          const bStock = Math.max(...b.data.variants.map((v) => v.stock));
          return bStock - aStock;
        }
        case 'subcategory':
          return a.data.category.localeCompare(b.data.category);
        default:
          return 0;
      }
    } else {
      // Mélanger static et API - mettre les statiques en premier
      return a.type === 'static' ? -1 : 1;
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ borderColor: categoryData.color }}>
        <div className={styles.categoryIcon} style={{ color: categoryData.color }}>
          {categoryData.icon}
        </div>
        <div className={styles.categoryInfo}>
          <h1 className={styles.title} style={{ color: categoryData.color }}>
            {categoryData.title}
          </h1>
          <p className={styles.description}>{categoryData.description}</p>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.checkboxes}>
            <label>
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => setShowNewOnly(e.target.checked)}
                className={styles.checkbox}
              />
              Nouveautés uniquement
            </label>
            <label>
              <input
                type="checkbox"
                checked={showSaleOnly}
                onChange={(e) => setShowSaleOnly(e.target.checked)}
                className={styles.checkbox}
              />
              Promotions uniquement
            </label>
            <label>
              <input
                type="checkbox"
                checked={showPopularOnly}
                onChange={(e) => setShowPopularOnly(e.target.checked)}
                className={styles.checkbox}
              />
              Populaires uniquement
            </label>
          </div>
        </div>

        <div className={styles.sorting}>
          <label htmlFor="sort">Trier par :</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="name">Nom</option>
            <option value="subcategory">Sous-catégorie</option>
            <option value="price">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="stock">Stock</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Chargement des produits...</div>
      ) : (
        <>
          <div className={styles.productsGrid}>
            {sortedProducts.map((item) => {
              if (item.type === 'static') {
                const product = item.data;
                return (
                  <div key={`static-${product.id}`} className={styles.productCard}>
                    <div className={styles.productImage}>
                      <img src={product.image} alt={product.name} />
                      {product.isNew && <span className={styles.newBadge}>Nouveau</span>}
                      {product.isSale && <span className={styles.saleBadge}>Promo</span>}
                      {product.isPopular && <span className={styles.popularBadge}>Populaire</span>}
                    </div>

                    <div className={styles.productInfo}>
                      <div className={styles.subcategoryInfo}>
                        <span className={styles.subcategory}>{product.subcategory}</span>
                      </div>

                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productDescription}>{product.description}</p>

                      <div className={styles.priceContainer}>
                        {product.originalPrice && (
                          <span className={styles.originalPrice}>{product.originalPrice}€</span>
                        )}
                        <span className={styles.price}>{product.price}€</span>
                      </div>

                      <div className={styles.stockInfo}>
                        <span className={styles.stock}>Stock: {product.stock}</span>
                      </div>

                      <button
                        className={styles.viewProductButton}
                        onClick={() => navigateToProduct(product.name, apiProducts, navigate)}
                      >
                        Voir le produit
                      </button>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          {sortedProducts.length === 0 && !loading && (
            <div className={styles.noProducts}>
              <p>Aucun produit trouvé dans cette catégorie.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
