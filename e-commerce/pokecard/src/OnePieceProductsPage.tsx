import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './OnePieceProductsPage.module.css';

interface OnePieceProduct {
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

const onePieceProducts: OnePieceProduct[] = [
  {
    id: 1,
    name: "Display Luffy Gear 5 LED",
    price: 94.99,
    originalPrice: 129.99,
    image: "/public/img/onepiece.png",
    category: "Display",
    stock: 8,
    isNew: true,
    isSale: true
  },
  {
    id: 2,
    name: "Étui Straw Hat Pirates",
    price: 39.99,
    image: "/public/img/onepiece.png",
    category: "Étui",
    stock: 22
  },
  {
    id: 3,
    name: "Peluche Zoro Roronoa",
    price: 54.99,
    image: "/public/img/onepiece.png",
    category: "Peluche",
    stock: 15
  },
  {
    id: 4,
    name: "Binder Collection One Piece",
    price: 29.99,
    image: "/public/img/onepiece.png",
    category: "Accessoire",
    stock: 28
  },
  {
    id: 5,
    name: "Display Équipage du Chapeau de Paille",
    price: 79.99,
    image: "/public/img/onepiece.png",
    category: "Display",
    stock: 12
  },
  {
    id: 6,
    name: "Étui Marine Premium",
    price: 24.99,
    image: "/public/img/onepiece.png",
    category: "Étui",
    stock: 35
  },
  {
    id: 7,
    name: "Peluche Nami Collection",
    price: 34.99,
    image: "/public/img/onepiece.png",
    category: "Peluche",
    stock: 20
  },
  {
    id: 8,
    name: "Support Cartes Pirate",
    price: 44.99,
    image: "/public/img/onepiece.png",
    category: "Accessoire",
    stock: 18
  },
  {
    id: 9,
    name: "Display Thriller Bark",
    price: 89.99,
    image: "/public/img/onepiece.png",
    category: "Display",
    stock: 6
  },
  {
    id: 10,
    name: "Étui Yonko Edition",
    price: 49.99,
    image: "/public/img/onepiece.png",
    category: "Étui",
    stock: 14
  }
];

const categories = ['Tous', 'Display', 'Étui', 'Peluche', 'Accessoire'];

export function OnePieceProductsPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('name');

  const filteredProducts = onePieceProducts.filter(product => 
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
        <h1 className={styles.title}>Produits One Piece</h1>
        <p className={styles.subtitle}>
          Découvrez notre collection de produits dérivés One Piece : displays, étuis, peluches et accessoires
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
