import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PokemonProductsPage.module.css';

interface PokemonProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  stock: number;
  isNew?: boolean;
  isSale?: boolean;
}

const pokemonProducts: PokemonProduct[] = [
  {
    id: 1,
    name: "Display Pikachu LED",
    price: 89.99,
    originalPrice: 119.99,
    image: "/public/img/pokémon.png",
    category: "Display",
    stock: 12,
    isNew: true,
    isSale: true
  },
  {
    id: 2,
    name: "Étui Charizard Premium",
    price: 34.99,
    image: "/public/img/pokémon.png",
    category: "Étui",
    stock: 25
  },
  {
    id: 3,
    name: "Peluche Mewtwo Géante",
    price: 49.99,
    image: "/public/img/pokémon.png",
    category: "Peluche",
    stock: 8
  },
  {
    id: 4,
    name: "Binder Collection Pokémon",
    price: 24.99,
    image: "/public/img/pokémon.png",
    category: "Accessoire",
    stock: 31
  },
  {
    id: 5,
    name: "Display Évolutions",
    price: 69.99,
    image: "/public/img/pokémon.png",
    category: "Display",
    stock: 15
  },
  {
    id: 6,
    name: "Étui Élite Trainer",
    price: 19.99,
    image: "/public/img/pokémon.png",
    category: "Étui",
    stock: 42
  },
  {
    id: 7,
    name: "Peluche Eevee Collection",
    price: 29.99,
    image: "/public/img/pokémon.png",
    category: "Peluche",
    stock: 18
  },
  {
    id: 8,
    name: "Support Cartes LED",
    price: 39.99,
    image: "/public/img/pokémon.png",
    category: "Accessoire",
    stock: 22
  }
];

const categories = ['Tous', 'Display', 'Étui', 'Peluche', 'Accessoire'];

export function PokemonProductsPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('name');

  const filteredProducts = pokemonProducts.filter(product => 
    selectedCategory === 'Tous' || product.category === selectedCategory
  );

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
      default:
        return 0;
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Produits Pokémon</h1>
        <p className={styles.subtitle}>
          Découvrez notre collection de produits dérivés Pokémon : displays, étuis, peluches et accessoires
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.categories}>
          {categories.map(category => (
            <button
              key={category}
              className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
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
            </div>
            
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.productCategory}>{product.category}</p>
              
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
                className={styles.addToCartButton}
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
          <p>Aucun produit trouvé dans cette catégorie.</p>
        </div>
      )}
    </div>
  );
}
