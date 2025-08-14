import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './CardsPage.module.css';

interface Card {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  tcg: string;
  rarity: string;
  stock: number;
  isNew?: boolean;
  isSale?: boolean;
  isFoil?: boolean;
}

const allCards: Card[] = [
  // Pokémon
  {
    id: 1,
    name: "Charizard VMAX",
    price: 89.99,
    originalPrice: 129.99,
    image: "/public/img/pokémon.png",
    tcg: "Pokémon",
    rarity: "Ultra Rare",
    stock: 15,
    isNew: true,
    isSale: true,
    isFoil: true
  },
  {
    id: 2,
    name: "Pikachu V",
    price: 24.99,
    image: "/public/img/pokémon.png",
    tcg: "Pokémon",
    rarity: "Rare",
    stock: 42,
    isFoil: true
  },
  // One Piece
  {
    id: 3,
    name: "Luffy Gear 5",
    price: 34.99,
    image: "/public/img/onepiece.png",
    tcg: "One Piece",
    rarity: "Super Rare",
    stock: 28,
    isNew: true
  },
  {
    id: 4,
    name: "Zoro Roronoa",
    price: 29.99,
    image: "/public/img/onepiece.png",
    tcg: "One Piece",
    rarity: "Rare",
    stock: 25
  },
  // Yu-Gi-Oh!
  {
    id: 5,
    name: "Blue-Eyes White Dragon",
    price: 44.99,
    image: "/public/img/pokémon.png", // Placeholder
    tcg: "Yu-Gi-Oh!",
    rarity: "Ultra Rare",
    stock: 19,
    isFoil: true
  },
  // Magic
  {
    id: 6,
    name: "Black Lotus",
    price: 299.99,
    image: "/public/img/pokémon.png", // Placeholder
    tcg: "Magic: The Gathering",
    rarity: "Mythic Rare",
    stock: 3,
    isFoil: true
  },
  // Dragon Ball
  {
    id: 7,
    name: "Goku Ultra Instinct",
    price: 44.99,
    image: "/public/img/pokémon.png", // Placeholder
    tcg: "Dragon Ball Super",
    rarity: "Super Rare",
    stock: 19
  },
  // Digimon
  {
    id: 8,
    name: "Agumon",
    price: 19.99,
    image: "/public/img/pokémon.png", // Placeholder
    tcg: "Digimon",
    rarity: "Rare",
    stock: 35
  }
];

const tcgs = ['Tous', 'Pokémon', 'One Piece', 'Yu-Gi-Oh!', 'Magic: The Gathering', 'Dragon Ball Super', 'Digimon'];
const rarities = ['Toutes', 'Commune', 'Peu Commune', 'Rare', 'Super Rare', 'Ultra Rare', 'Mythic Rare'];

export function CardsPage() {
  const navigate = useNavigate();
  const { tcg } = useParams<{ tcg: string }>();
  const [selectedTcg, setSelectedTcg] = useState(tcg || 'Tous');
  const [selectedRarity, setSelectedRarity] = useState('Toutes');
  const [sortBy, setSortBy] = useState('name');
  const [showFoilOnly, setShowFoilOnly] = useState(false);

  const filteredCards = allCards.filter(card => {
    const tcgMatch = selectedTcg === 'Tous' || card.tcg === selectedTcg;
    const rarityMatch = selectedRarity === 'Toutes' || card.rarity === selectedRarity;
    const foilMatch = !showFoilOnly || card.isFoil;
    return tcgMatch && rarityMatch && foilMatch;
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'stock':
        return b.stock - a.stock;
      case 'tcg':
        return a.tcg.localeCompare(b.tcg);
      default:
        return 0;
    }
  });

  const getTcgIcon = (tcgName: string) => {
    switch (tcgName) {
      case 'Pokémon': return '⚡';
      case 'One Piece': return '🏴‍☠️';
      case 'Yu-Gi-Oh!': return '🐉';
      case 'Magic: The Gathering': return '✨';
      case 'Dragon Ball Super': return '🐉';
      case 'Digimon': return '🦖';
      default: return '🃏';
    }
  };

  const getTcgColors = (tcgName: string) => {
    switch (tcgName) {
      case 'Pokémon': 
        return {
          primary: '#f59e0b',
          secondary: '#d97706',
          gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
          hover: 'linear-gradient(135deg, #d97706, #b45309)'
        };
      case 'One Piece': 
        return {
          primary: '#ef4444',
          secondary: '#dc2626',
          gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
          hover: 'linear-gradient(135deg, #dc2626, #b91c1c)'
        };
      case 'Yu-Gi-Oh!': 
        return {
          primary: '#3b82f6',
          secondary: '#1d4ed8',
          gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          hover: 'linear-gradient(135deg, #1d4ed8, #1e40af)'
        };
      case 'Magic: The Gathering': 
        return {
          primary: '#8b5cf6',
          secondary: '#7c3aed',
          gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          hover: 'linear-gradient(135deg, #7c3aed, #6d28d9)'
        };
      case 'Dragon Ball Super': 
        return {
          primary: '#06b6d4',
          secondary: '#0891b2',
          gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          hover: 'linear-gradient(135deg, #0891b2, #0e7490)'
        };
      case 'Digimon': 
        return {
          primary: '#10b981',
          secondary: '#059669',
          gradient: 'linear-gradient(135deg, #10b981, #059669)',
          hover: 'linear-gradient(135deg, #059669, #047857)'
        };
      default: 
        return {
          primary: '#94a3b8',
          secondary: '#64748b',
          gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
          hover: 'linear-gradient(135deg, #64748b, #475569)'
        };
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Commune': return '#94a3b8';
      case 'Peu Commune': return '#06b6d4';
      case 'Rare': return '#10b981';
      case 'Super Rare': return '#f59e0b';
      case 'Ultra Rare': return '#ef4444';
      case 'Mythic Rare': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cartes à Collectionner</h1>
        <p className={styles.subtitle}>
          Découvrez notre collection de cartes rares et populaires de tous les TCG
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>TCG :</label>
            <select
              value={selectedTcg}
              onChange={(e) => setSelectedTcg(e.target.value)}
              className={styles.filterSelect}
            >
              {tcgs.map(tcg => (
                <option key={tcg} value={tcg}>{tcg}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Rareté :</label>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className={styles.filterSelect}
            >
              {rarities.map(rarity => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>
              <input
                type="checkbox"
                checked={showFoilOnly}
                onChange={(e) => setShowFoilOnly(e.target.checked)}
                className={styles.checkbox}
              />
              Cartes Foil uniquement
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
            <option value="tcg">TCG</option>
            <option value="price">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="stock">Stock</option>
          </select>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {sortedCards.map(card => (
          <div key={card.id} className={styles.cardItem}>
            <div className={styles.cardImage}>
              <img src={card.image} alt={card.name} />
              {card.isNew && <span className={styles.newBadge}>Nouveau</span>}
              {card.isSale && <span className={styles.saleBadge}>Promo</span>}
              {card.isFoil && <span className={styles.foilBadge}>Foil</span>}
            </div>
            
            <div className={styles.cardInfo}>
              <div className={styles.cardHeader}>
                <span 
                  className={styles.tcgIcon}
                  style={{ color: getTcgColors(card.tcg).primary }}
                >
                  {getTcgIcon(card.tcg)}
                </span>
                <span 
                  className={styles.tcgName}
                  style={{ color: getTcgColors(card.tcg).primary }}
                >
                  {card.tcg}
                </span>
              </div>
              
              <h3 className={styles.cardName}>{card.name}</h3>
              
              <div className={styles.rarityContainer}>
                <span 
                  className={styles.rarity}
                  style={{ color: getRarityColor(card.rarity) }}
                >
                  {card.rarity}
                </span>
              </div>
              
              <div className={styles.priceContainer}>
                {card.originalPrice && (
                  <span className={styles.originalPrice}>{card.originalPrice}€</span>
                )}
                <span className={styles.price}>{card.price}€</span>
              </div>
              
              <div className={styles.stockInfo}>
                <span className={styles.stock}>Stock: {card.stock}</span>
              </div>
              
              <button 
                className={styles.viewCardButton}
                style={{ 
                  background: getTcgColors(card.tcg).gradient,
                  '--hover-gradient': getTcgColors(card.tcg).hover
                } as React.CSSProperties}
                onClick={() => navigate(`/produit/${card.id}`)}
              >
                Voir la carte
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedCards.length === 0 && (
        <div className={styles.noCards}>
          <p>Aucune carte trouvée avec ces critères.</p>
        </div>
      )}
    </div>
  );
}
