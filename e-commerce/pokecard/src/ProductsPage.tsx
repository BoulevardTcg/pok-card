import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ProductsPage.module.css';

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

const allProducts: Product[] = [
  // Peluches & Figurines
  {
    id: 1,
    name: "Peluche Mewtwo Géante",
    price: 49.99,
    image: "/public/img/pokémon.png",
    category: "Peluches & Figurines",
    subcategory: "Peluche",
    stock: 8,
    description: "Peluche géante Mewtwo officielle Pokémon"
  },
  {
    id: 2,
    name: "Peluche Zoro Roronoa",
    price: 54.99,
    image: "/public/img/onepiece.png",
    category: "Peluches & Figurines",
    subcategory: "Peluche",
    stock: 15,
    description: "Peluche officielle Zoro One Piece"
  },
  {
    id: 3,
    name: "Figurine Pikachu Collection",
    price: 29.99,
    image: "/public/img/pokémon.png",
    category: "Peluches & Figurines",
    subcategory: "Figurine",
    stock: 18,
    description: "Figurine Pikachu de collection"
  },
  {
    id: 4,
    name: "Peluche Eevee Collection",
    price: 29.99,
    image: "/public/img/pokémon.png",
    category: "Peluches & Figurines",
    subcategory: "Peluche",
    stock: 18,
    description: "Peluche Eevee officielle Pokémon"
  },
  {
    id: 5,
    name: "Figurine Luffy Gear 5",
    price: 39.99,
    image: "/public/img/onepiece.png",
    category: "Peluches & Figurines",
    subcategory: "Figurine",
    stock: 12,
    description: "Figurine Luffy Gear 5 de collection"
  },

  // Vêtements & Goodies
  {
    id: 6,
    name: "T-shirt Charizard",
    price: 24.99,
    image: "/public/img/pokémon.png",
    category: "Vêtements & Goodies",
    subcategory: "T-shirt",
    stock: 35,
    description: "T-shirt officiel avec design Charizard"
  },
  {
    id: 7,
    name: "Poster Luffy Gear 5",
    price: 19.99,
    image: "/public/img/onepiece.png",
    category: "Vêtements & Goodies",
    subcategory: "Poster",
    stock: 28,
    description: "Poster officiel Luffy Gear 5"
  },
  {
    id: 8,
    name: "Casquette Pokémon",
    price: 29.99,
    image: "/public/img/pokémon.png",
    category: "Vêtements & Goodies",
    subcategory: "Casquette",
    stock: 20,
    description: "Casquette officielle Pokémon"
  },
  {
    id: 9,
    name: "Mug Collection One Piece",
    price: 14.99,
    image: "/public/img/onepiece.png",
    category: "Vêtements & Goodies",
    subcategory: "Mug",
    stock: 42,
    description: "Mug de collection One Piece"
  },
  {
    id: 10,
    name: "Hoodie Pikachu",
    price: 44.99,
    image: "/public/img/pokémon.png",
    category: "Vêtements & Goodies",
    subcategory: "Hoodie",
    stock: 15,
    description: "Hoodie officiel avec design Pikachu"
  },

  // Posters & Décos
  {
    id: 11,
    name: "Poster Charizard VMAX",
    price: 12.99,
    image: "/public/img/pokémon.png",
    category: "Posters & Décos",
    subcategory: "Poster",
    stock: 25,
    description: "Poster Charizard VMAX haute qualité"
  },
  {
    id: 12,
    name: "Sticker Pack Pokémon",
    price: 8.99,
    image: "/public/img/pokémon.png",
    category: "Posters & Décos",
    subcategory: "Stickers",
    stock: 50,
    description: "Pack de stickers Pokémon officiels"
  },
  {
    id: 13,
    name: "Bannière One Piece",
    price: 34.99,
    image: "/public/img/onepiece.png",
    category: "Posters & Décos",
    subcategory: "Bannière",
    stock: 8,
    description: "Bannière One Piece pour chambre"
  }
];

const categories = [
  'Tous',
  'Peluches & Figurines',
  'Vêtements & Goodies',
  'Posters & Décos'
];

const subcategories = {
  'Peluches & Figurines': ['Tous', 'Peluche', 'Figurine'],
  'Vêtements & Goodies': ['Tous', 'T-shirt', 'Hoodie', 'Casquette', 'Mug'],
  'Posters & Décos': ['Tous', 'Poster', 'Stickers', 'Bannière']
};

export function ProductsPage() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [selectedCategory, setSelectedCategory] = useState(category || 'Tous');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('name');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [showPopularOnly, setShowPopularOnly] = useState(false);

  const filteredProducts = allProducts.filter(product => {
    const categoryMatch = selectedCategory === 'Tous' || product.category === selectedCategory;
    const subcategoryMatch = selectedSubcategory === 'Tous' || product.subcategory === selectedSubcategory;
    const newMatch = !showNewOnly || product.isNew;
    const saleMatch = !showSaleOnly || product.isSale;
    const popularMatch = !showPopularOnly || product.isPopular;
    
    return categoryMatch && subcategoryMatch && newMatch && saleMatch && popularMatch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'stock':
        return b.stock - a.stock;
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Displays & Présentoirs': return '🖼️';
      case 'Étuis & Protections': return '🛡️';
      case 'Peluches & Figurines': return '🧸';
      case 'Accessoires TCG': return '🎲';
      case 'Vêtements & Goodies': return '👕';
      default: return '🎁';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'Displays & Présentoirs': return '#06b6d4';
      case 'Étuis & Protections': return '#10b981';
      case 'Peluches & Figurines': return '#f59e0b';
      case 'Accessoires TCG': return '#8b5cf6';
      case 'Vêtements & Goodies': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Produits Dérivés</h1>
        <p className={styles.subtitle}>
          Découvrez notre collection de produits dérivés : peluches, figurines, vêtements et décorations
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
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {selectedCategory !== 'Tous' && subcategories[selectedCategory as keyof typeof subcategories] && (
            <div className={styles.filterGroup}>
              <label>Sous-catégorie :</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className={styles.filterSelect}
              >
                {subcategories[selectedCategory as keyof typeof subcategories].map(subcat => (
                  <option key={subcat} value={subcat}>{subcat}</option>
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

      <div className={styles.productsGrid}>
        {sortedProducts.map(product => (
          <div key={product.id} className={styles.productCard}>
            <div className={styles.productImage}>
              <img src={product.image} alt={product.name} />
              {product.isNew && <span className={styles.newBadge}>Nouveau</span>}
              {product.isSale && <span className={styles.saleBadge}>Promo</span>}
              {product.isPopular && <span className={styles.popularBadge}>Populaire</span>}
            </div>
            
            <div className={styles.productInfo}>
              <div className={styles.categoryHeader}>
                <span 
                  className={styles.categoryIcon}
                  style={{ color: getCategoryColor(product.category) }}
                >
                  {getCategoryIcon(product.category)}
                </span>
                <span 
                  className={styles.categoryName}
                  style={{ color: getCategoryColor(product.category) }}
                >
                  {product.category}
                </span>
              </div>
              
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.productDescription}>{product.description}</p>
              
              <div className={styles.subcategoryInfo}>
                <span className={styles.subcategory}>{product.subcategory}</span>
              </div>
              
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
                onClick={() => navigate(`/produit/${product.id}`)}
              >
                Voir le produit
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedProducts.length === 0 && (
        <div className={styles.noProducts}>
          <p>Aucun produit trouvé avec ces critères.</p>
        </div>
      )}
    </div>
  );
}
