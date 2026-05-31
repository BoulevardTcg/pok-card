import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Seo } from './components/Seo';
import styles from './AccessoiresPage.module.css';
import { listProducts, getImageUrl } from './api';
import { NotifyModal } from './components/NotifyModal';
import type { Product as ProductType } from './cartContext';
import { navigateToProduct } from './utils/productMatching.ts';
import { handleImageError } from './utils/imageFallback';

interface Accessoire {
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
  tcgCompatible?: string[];
}

const allAccessoires: Accessoire[] = [
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
    tcgCompatible: ['Pokémon', 'One Piece', 'Yu-Gi-Oh!', 'Magic'],
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
    tcgCompatible: ['One Piece', 'Pokémon', 'Yu-Gi-Oh!'],
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
    tcgCompatible: ['Pokémon', 'One Piece', 'Yu-Gi-Oh!', 'Magic', 'Dragon Ball'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['One Piece', 'Pokémon', 'Yu-Gi-Oh!'],
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
    tcgCompatible: ['Tous TCG'],
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
    tcgCompatible: ['Tous TCG'],
  },
];

const categories = [
  'Tous',
  'Étuis & Protections',
  'Sleeves & Binders',
  'Displays & Présentoirs',
  'Accessoires de Jeu',
];

const subcategories = {
  'Étuis & Protections': ['Tous', 'Étui', 'Binder', 'Sleeves'],
  'Sleeves & Binders': ['Tous', 'Sleeves', 'Binder', 'Pages'],
  'Displays & Présentoirs': ['Tous', 'Display', 'Support'],
  'Accessoires de Jeu': ['Tous', 'Dés', 'Tapis', 'Organisateur', 'Compteur'],
};

export function AccessoiresPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [selectedCategory, setSelectedCategory] = useState(category || 'Tous');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('name');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [apiProducts, setApiProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
  }>({
    isOpen: false,
    productId: '',
    productName: '',
  });

  // Charger les produits depuis l'API
  useEffect(() => {
    async function loadApiProducts() {
      try {
        const response = (await listProducts({
          category: 'Accessoires',
          limit: 200,
        })) as { products: ProductType[] };
        setApiProducts(response.products);
      } catch {
        // Ignorer les erreurs
      } finally {
        setLoading(false);
      }
    }
    loadApiProducts();
  }, []);

  // Fonction pour trouver un produit API correspondant à un accessoire statique
  // Filtrer les accessoires statiques
  const filteredAccessoires = allAccessoires.filter((accessoire) => {
    const categoryMatch = selectedCategory === 'Tous' || accessoire.category === selectedCategory;
    const subcategoryMatch =
      selectedSubcategory === 'Tous' || accessoire.subcategory === selectedSubcategory;
    const newMatch = !showNewOnly || accessoire.isNew;
    const saleMatch = !showSaleOnly || accessoire.isSale;
    const popularMatch = !showPopularOnly || accessoire.isPopular;

    return categoryMatch && subcategoryMatch && newMatch && saleMatch && popularMatch;
  });

  // Filtrer les produits API qui correspondent aux critères
  const filteredApiProducts = apiProducts.filter((apiProduct) => {
    // Si on filtre par "Displays & Présentoirs", chercher les produits dont le nom contient "Display"
    if (selectedCategory === 'Displays & Présentoirs') {
      const nameLower = apiProduct.name.toLowerCase();
      const isDisplay =
        nameLower.includes('display') ||
        nameLower.includes('présentoir') ||
        nameLower.includes('support');

      if (selectedSubcategory === 'Display') {
        return isDisplay && nameLower.includes('display');
      } else if (selectedSubcategory === 'Support') {
        return isDisplay && nameLower.includes('support');
      } else if (selectedSubcategory === 'Tous') {
        return isDisplay;
      }
      return false;
    }

    // Pour les autres catégories, on affiche les produits API si la catégorie correspond
    if (selectedCategory !== 'Tous') {
      // Mapping des catégories statiques vers les catégories API
      const categoryMap: { [key: string]: string[] } = {
        'Étuis & Protections': ['Accessoires'],
        'Sleeves & Binders': ['Accessoires'],
        'Accessoires de Jeu': ['Accessoires'],
      };

      const mappedCategories = categoryMap[selectedCategory] || [];
      return mappedCategories.includes(apiProduct.category);
    }

    return true;
  });

  // Combiner les accessoires statiques et les produits API
  const allProducts = [
    ...filteredAccessoires.map((acc) => ({ type: 'static' as const, data: acc })),
    ...filteredApiProducts.map((prod) => ({ type: 'api' as const, data: prod })),
  ];

  const sortedProducts = [...allProducts].sort((a, b) => {
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
        case 'category':
          return a.data.category.localeCompare(b.data.category);
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
        case 'category':
          return a.data.category.localeCompare(b.data.category);
        default:
          return 0;
      }
    } else {
      // Mélanger static et API
      return a.type === 'static' ? -1 : 1;
    }
  });

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Étuis & Protections':
        return '🛡️';
      case 'Sleeves & Binders':
        return '📁';
      case 'Displays & Présentoirs':
        return '🖼️';
      case 'Accessoires de Jeu':
        return '🎲';
      default:
        return '🛡️';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'Étuis & Protections':
        return '#10b981';
      case 'Sleeves & Binders':
        return '#06b6d4';
      case 'Displays & Présentoirs':
        return '#f59e0b';
      case 'Accessoires de Jeu':
        return '#8b5cf6';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div className={styles.container}>
      <Seo
        title="Accessoires TCG"
        description="Accessoires pour cartes à collectionner : sleeves, classeurs, deck boxes, playmats et plus. Protégez, organisez et jouez avec BoulevardTCG."
        canonical="/accessoires"
      />
      <div className={styles.header}>
        <h1 className={styles.title}>Accessoires TCG</h1>
        <p className={styles.subtitle}>
          Tout l'équipement essentiel pour protéger, organiser et jouer avec vos cartes
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Catégorie :</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('Tous');
              }}
              className={styles.filterSelect}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory !== 'Tous' &&
            subcategories[selectedCategory as keyof typeof subcategories] && (
              <div className={styles.filterGroup}>
                <label>Sous-catégorie :</label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className={styles.filterSelect}
                >
                  {subcategories[selectedCategory as keyof typeof subcategories].map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
            <option value="category">Catégorie</option>
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
          {sortedProducts.length > 0 ? (
            <div className={styles.accessoiresGrid}>
              {sortedProducts.map((item) => {
                if (item.type === 'static') {
                  const accessoire = item.data;
                  return (
                    <div key={`static-${accessoire.id}`} className={styles.accessoireCard}>
                      <div className={styles.accessoireImage}>
                        <img
                          src={accessoire.image}
                          alt={accessoire.name}
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                        />
                        {accessoire.isNew && <span className={styles.newBadge}>Nouveau</span>}
                        {accessoire.isSale && <span className={styles.saleBadge}>Promo</span>}
                        {accessoire.isPopular && (
                          <span className={styles.popularBadge}>Populaire</span>
                        )}
                      </div>

                      <div className={styles.accessoireInfo}>
                        <div className={styles.categoryHeader}>
                          <span
                            className={styles.categoryIcon}
                            style={{ color: getCategoryColor(accessoire.category) }}
                          >
                            {getCategoryIcon(accessoire.category)}
                          </span>
                          <span
                            className={styles.categoryName}
                            style={{ color: getCategoryColor(accessoire.category) }}
                          >
                            {accessoire.category}
                          </span>
                        </div>

                        <h3 className={styles.accessoireName}>{accessoire.name}</h3>
                        <p className={styles.accessoireDescription}>{accessoire.description}</p>

                        <div className={styles.subcategoryInfo}>
                          <span className={styles.subcategory}>{accessoire.subcategory}</span>
                        </div>

                        {accessoire.tcgCompatible && (
                          <div className={styles.tcgCompatible}>
                            <span className={styles.tcgLabel}>Compatible :</span>
                            <div className={styles.tcgList}>
                              {accessoire.tcgCompatible.map((tcg) => (
                                <span key={tcg} className={styles.tcgTag}>
                                  {tcg}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={styles.priceContainer}>
                          {accessoire.originalPrice && (
                            <span className={styles.originalPrice}>
                              {accessoire.originalPrice}€
                            </span>
                          )}
                          <span className={styles.price}>{accessoire.price}€</span>
                        </div>

                        <div className={styles.stockInfo}>
                          <span className={styles.stock}>Stock: {accessoire.stock}</span>
                        </div>

                        <button
                          className={styles.viewAccessoireButton}
                          onClick={() => navigateToProduct(accessoire.name, apiProducts, navigate)}
                        >
                          Voir l'accessoire
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Produit API
                  const product = item.data;
                  const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
                  const maxStock = Math.max(...product.variants.map((v) => v.stock));
                  const isOutOfStock = maxStock <= 0;

                  return (
                    <div key={`api-${product.id}`} className={styles.accessoireCard}>
                      <div className={styles.accessoireImage}>
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={getImageUrl(product.images[0].url)}
                            alt={product.images[0].altText || product.name}
                          />
                        ) : (
                          <div className={styles.placeholderImage}>Pas d'image</div>
                        )}
                        {isOutOfStock && (
                          <span className={styles.outOfStockBanner}>Rupture de stock</span>
                        )}
                      </div>

                      <div className={styles.accessoireInfo}>
                        <div className={styles.categoryHeader}>
                          <span
                            className={styles.categoryIcon}
                            style={{ color: getCategoryColor('Displays & Présentoirs') }}
                          >
                            🖼️
                          </span>
                          <span
                            className={styles.categoryName}
                            style={{ color: getCategoryColor('Displays & Présentoirs') }}
                          >
                            {product.category}
                          </span>
                        </div>

                        <h3 className={styles.accessoireName}>{product.name}</h3>
                        {product.description && (
                          <p className={styles.accessoireDescription}>
                            {product.description.length > 100
                              ? product.description.substring(0, 100) + '...'
                              : product.description}
                          </p>
                        )}

                        <div className={styles.priceContainer}>
                          {product.minPriceCents !== null && (
                            <span className={styles.price}>
                              À partir de {formatPrice(product.minPriceCents)}€
                            </span>
                          )}
                        </div>

                        <div className={styles.stockInfo}>
                          <span className={styles.stock}>
                            Stock: {isOutOfStock ? 'Rupture' : maxStock}
                          </span>
                        </div>

                        {isOutOfStock ? (
                          <button
                            className={styles.notifyButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Pour les accessoires, on utilise l'ID du produit API s'il existe
                              const productId = product.id || `accessoire-${accessoire.id}`;
                              setNotifyModal({
                                isOpen: true,
                                productId:
                                  typeof productId === 'string' ? productId : String(productId),
                                productName: product.name,
                              });
                            }}
                          >
                            Me prévenir
                          </button>
                        ) : (
                          <button
                            className={styles.viewAccessoireButton}
                            onClick={() => {
                              if (product.slug) {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate(`/produit/${product.slug}`);
                              }
                            }}
                            disabled={!product.slug}
                          >
                            Voir le produit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className={styles.noAccessoires}>
              <p>Aucun accessoire trouvé avec ces critères.</p>
            </div>
          )}
        </>
      )}

      {/* Notify Modal */}
      <NotifyModal
        isOpen={notifyModal.isOpen}
        onClose={() => setNotifyModal({ ...notifyModal, isOpen: false })}
        productId={notifyModal.productId}
        productName={notifyModal.productName}
      />
    </div>
  );
}
