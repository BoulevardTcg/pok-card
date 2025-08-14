import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AccessoiresPage.module.css';

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
    name: "Étui Charizard Premium",
    price: 34.99,
    image: "/public/img/pokémon.png",
    category: "Étuis & Protections",
    subcategory: "Étui",
    stock: 25,
    isPopular: true,
    description: "Étui premium avec design Charizard",
    tcgCompatible: ["Pokémon", "One Piece", "Yu-Gi-Oh!", "Magic"]
  },
  {
    id: 2,
    name: "Étui Straw Hat Pirates",
    price: 39.99,
    image: "/public/img/onepiece.png",
    category: "Étuis & Protections",
    subcategory: "Étui",
    stock: 22,
    description: "Étui officiel One Piece Straw Hat Pirates",
    tcgCompatible: ["One Piece", "Pokémon", "Yu-Gi-Oh!"]
  },
  {
    id: 3,
    name: "Binder Collection Pokémon",
    price: 24.99,
    image: "/public/img/pokémon.png",
    category: "Étuis & Protections",
    subcategory: "Binder",
    stock: 31,
    description: "Binder de collection avec pages protectrices",
    tcgCompatible: ["Pokémon", "One Piece", "Yu-Gi-Oh!", "Magic", "Dragon Ball"]
  },
  {
    id: 4,
    name: "Sleeves Ultra Pro Premium",
    price: 9.99,
    image: "/public/img/pokémon.png",
    category: "Étuis & Protections",
    subcategory: "Sleeves",
    stock: 150,
    isPopular: true,
    description: "Sleeves ultra protection pour cartes",
    tcgCompatible: ["Tous TCG"]
  },

  // Sleeves & Binders
  {
    id: 5,
    name: "Sleeves Dragon Shield",
    price: 12.99,
    image: "/public/img/pokémon.png",
    category: "Sleeves & Binders",
    subcategory: "Sleeves",
    stock: 89,
    description: "Sleeves Dragon Shield ultra résistants",
    tcgCompatible: ["Tous TCG"]
  },
  {
    id: 6,
    name: "Binder Ultra Pro Premium",
    price: 29.99,
    image: "/public/img/pokémon.png",
    category: "Sleeves & Binders",
    subcategory: "Binder",
    stock: 18,
    description: "Binder Ultra Pro avec anneaux métalliques",
    tcgCompatible: ["Tous TCG"]
  },
  {
    id: 7,
    name: "Pages Binder 9 Pochettes",
    price: 4.99,
    image: "/public/img/pokémon.png",
    category: "Sleeves & Binders",
    subcategory: "Pages",
    stock: 200,
    description: "Pages de 9 pochettes pour binder",
    tcgCompatible: ["Tous TCG"]
  },

  // Displays & Présentoirs
  {
    id: 8,
    name: "Display Pikachu LED Premium",
    price: 89.99,
    originalPrice: 119.99,
    image: "/public/img/pokémon.png",
    category: "Displays & Présentoirs",
    subcategory: "Display",
    stock: 12,
    isNew: true,
    isSale: true,
    isPopular: true,
    description: "Présentoir LED premium avec éclairage intégré pour cartes Pokémon",
    tcgCompatible: ["Pokémon", "One Piece", "Yu-Gi-Oh!"]
  },
  {
    id: 9,
    name: "Display Luffy Gear 5 LED",
    price: 94.99,
    originalPrice: 129.99,
    image: "/public/img/onepiece.png",
    category: "Displays & Présentoirs",
    subcategory: "Display",
    stock: 8,
    isNew: true,
    isSale: true,
    description: "Présentoir LED spécial One Piece avec effet Gear 5",
    tcgCompatible: ["One Piece", "Pokémon"]
  },
  {
    id: 10,
    name: "Support Cartes LED Universel",
    price: 39.99,
    image: "/public/img/pokémon.png",
    category: "Displays & Présentoirs",
    subcategory: "Support",
    stock: 25,
    isPopular: true,
    description: "Support LED universel pour tous types de cartes",
    tcgCompatible: ["Tous TCG"]
  },

  // Accessoires de Jeu
  {
    id: 11,
    name: "Dés TCG Premium",
    price: 19.99,
    image: "/public/img/pokémon.png",
    category: "Accessoires de Jeu",
    subcategory: "Dés",
    stock: 45,
    description: "Set de dés premium pour TCG",
    tcgCompatible: ["Tous TCG"]
  },
  {
    id: 12,
    name: "Tapis de Jeu One Piece",
    price: 44.99,
    image: "/public/img/onepiece.png",
    category: "Accessoires de Jeu",
    subcategory: "Tapis",
    stock: 12,
    description: "Tapis de jeu officiel One Piece",
    tcgCompatible: ["One Piece", "Pokémon", "Yu-Gi-Oh!"]
  },
  {
    id: 13,
    name: "Organisateur Cartes",
    price: 14.99,
    image: "/public/img/pokémon.png",
    category: "Accessoires de Jeu",
    subcategory: "Organisateur",
    stock: 67,
    description: "Organisateur pratique pour cartes",
    tcgCompatible: ["Tous TCG"]
  },
  {
    id: 14,
    name: "Compteur de Points",
    price: 8.99,
    image: "/public/img/pokémon.png",
    category: "Accessoires de Jeu",
    subcategory: "Compteur",
    stock: 34,
    description: "Compteur de points pour parties de cartes",
    tcgCompatible: ["Tous TCG"]
  }
];

const categories = [
  'Tous',
  'Étuis & Protections',
  'Sleeves & Binders', 
  'Displays & Présentoirs',
  'Accessoires de Jeu'
];

const subcategories = {
  'Étuis & Protections': ['Tous', 'Étui', 'Binder', 'Sleeves'],
  'Sleeves & Binders': ['Tous', 'Sleeves', 'Binder', 'Pages'],
  'Displays & Présentoirs': ['Tous', 'Display', 'Support'],
  'Accessoires de Jeu': ['Tous', 'Dés', 'Tapis', 'Organisateur', 'Compteur']
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

  const filteredAccessoires = allAccessoires.filter(accessoire => {
    const categoryMatch = selectedCategory === 'Tous' || accessoire.category === selectedCategory;
    const subcategoryMatch = selectedSubcategory === 'Tous' || accessoire.subcategory === selectedSubcategory;
    const newMatch = !showNewOnly || accessoire.isNew;
    const saleMatch = !showSaleOnly || accessoire.isSale;
    const popularMatch = !showPopularOnly || accessoire.isPopular;
    
    return categoryMatch && subcategoryMatch && newMatch && saleMatch && popularMatch;
  });

  const sortedAccessoires = [...filteredAccessoires].sort((a, b) => {
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
      case 'Étuis & Protections': return '🛡️';
      case 'Sleeves & Binders': return '📁';
      case 'Displays & Présentoirs': return '🖼️';
      case 'Accessoires de Jeu': return '🎲';
      default: return '🛡️';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'Étuis & Protections': return '#10b981';
      case 'Sleeves & Binders': return '#06b6d4';
      case 'Displays & Présentoirs': return '#f59e0b';
      case 'Accessoires de Jeu': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  return (
    <div className={styles.container}>
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

      <div className={styles.accessoiresGrid}>
        {sortedAccessoires.map(accessoire => (
          <div key={accessoire.id} className={styles.accessoireCard}>
            <div className={styles.accessoireImage}>
              <img src={accessoire.image} alt={accessoire.name} />
              {accessoire.isNew && <span className={styles.newBadge}>Nouveau</span>}
              {accessoire.isSale && <span className={styles.saleBadge}>Promo</span>}
              {accessoire.isPopular && <span className={styles.popularBadge}>Populaire</span>}
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
                    {accessoire.tcgCompatible.map(tcg => (
                      <span key={tcg} className={styles.tcgTag}>{tcg}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className={styles.priceContainer}>
                {accessoire.originalPrice && (
                  <span className={styles.originalPrice}>{accessoire.originalPrice}€</span>
                )}
                <span className={styles.price}>{accessoire.price}€</span>
              </div>
              
              <div className={styles.stockInfo}>
                <span className={styles.stock}>Stock: {accessoire.stock}</span>
              </div>
              
              <button 
                className={styles.viewAccessoireButton}
                onClick={() => navigate(`/produit/${accessoire.id}`)}
              >
                Voir l'accessoire
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedAccessoires.length === 0 && (
        <div className={styles.noAccessoires}>
          <p>Aucun accessoire trouvé avec ces critères.</p>
        </div>
      )}
    </div>
  );
}
