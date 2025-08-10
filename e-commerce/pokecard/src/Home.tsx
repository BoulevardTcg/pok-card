import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

const products = [
  {
    id: '1',
    name: 'Display Épée & Bouclier – Voltage Éclatant',
    price: '149€',
    image: 'https://assets.pokemon.com/assets/cms2/img/cards/web/SM9/SM9_FR_1.png',
  },
  {
    id: '2',
    name: 'Booster Écarlate & Violet – 151',
    price: '6€',
    image: 'https://assets.pokemon.com/assets/cms2/img/cards/web/SV1/SV1_FR_1.png',
  },
  {
    id: '3',
    name: 'Elite Trainer Box Écarlate & Violet',
    price: '59€',
    image: 'https://assets.pokemon.com/assets/cms2/img/cards/web/SV2/SV2_FR_1.png',
  },
];

const avantages = [
  { icon: '🔒', title: 'Produits officiels scellés' },
  { icon: '✨', title: 'Exclusivités rares' },
  { icon: '⚡', title: 'Livraison rapide' },
];

const categories = [
  {
    id: 'pokemon',
    name: 'Pokémon',
    image: '../public/pokémon.png',
  },
  {
    id: 'onepiece',
    name: 'One Piece',
    image: '../public/onepiece.png',
  },
];

interface HomeProps {
  search: string;
}

export function Home({ search }: HomeProps) {
  const navigate = useNavigate();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <section className={styles.hero}>
        <div className={styles.heroBg}></div>
        <div className={styles.heroContent}>
          <h1>PokéCard</h1>
          <p>Cartes Pokémon & One Piece à collectionner</p>
          <div className={styles.heroSearchWrapper}>
            <input
              className={styles.heroSearch}
              type="text"
              placeholder="Rechercher un produit, une série, une extension..."
              value={search}
              readOnly
              style={{ cursor: 'not-allowed', background: '#f3f6fa' }}
            />
            <button className={styles.heroSearchBtn} disabled>Rechercher</button>
          </div>
        </div>
      </section>
      <section className={styles.categories}>
        {categories.map(cat => (
          <div key={cat.id} className={styles.categoryCard} onClick={() => navigate(`/${cat.id}`)}>
            <img src={cat.image} alt={cat.name} className={styles.categoryImg} />
          </div>
        ))}
      </section>

    
      {/* Section Précommandes */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2><span>PRODUITS EN </span><span className={styles.highlight}>PRÉCOMMANDES</span></h2>
          <button className={styles.seeAllBtn}>Voir tout</button>
        </div>
        <div className={styles.cardRow}>
          <div className={styles.productCard}>
            <img src="../public/displayvoltage.jpg" alt="Display Pokémon Préco" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Display</div>
              <div className={styles.productName}>DISPLAY ÉPÉE & BOUCLIER – VOLTAGE ÉCLATANT</div>
              <div className={styles.productPrice}>149,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="../public/displayop.jpeg" alt="Display One Piece Préco" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Display</div>
              <div className={styles.productName}>DISPLAY ONE PIECE – ROMANCE DAWN</div>
              <div className={styles.productPrice}>129,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://assets.pokemon.com/assets/cms2/img/cards/web/SV1/SV1_FR_1.png" alt="Booster Pokémon 151" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Booster</div>
              <div className={styles.productName}>BOOSTER ÉCARLATE & VIOLET – 151</div>
              <div className={styles.productPrice}>6,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://www.onepiece-cardgame.com/images/products/paramountwar/paramountwar_pack.png" alt="Booster One Piece Paramount" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Booster</div>
              <div className={styles.productName}>BOOSTER ONE PIECE – PARAMOUNT WAR</div>
              <div className={styles.productPrice}>7,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Nouveautés */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2><span>DERNIÈRES </span><span className={styles.highlight}>NOUVEAUTÉS</span></h2>
          <button className={styles.seeAllBtn}>Voir tout</button>
        </div>
        <div className={styles.cardRow}>
          <div className={styles.productCard}>
            <img src="https://assets.pokemon.com/assets/cms2/img/cards/web/SV2/SV2_FR_1.png" alt="Elite Trainer Box Pokémon" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Coffret</div>
              <div className={styles.productName}>ELITE TRAINER BOX ÉCARLATE & VIOLET</div>
              <div className={styles.productPrice}>59,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://www.onepiece-cardgame.com/images/products/starterdeck/strawhatcrew.png" alt="Starter Deck One Piece" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Starter Deck</div>
              <div className={styles.productName}>STARTER DECK ONE PIECE – STRAW HAT CREW</div>
              <div className={styles.productPrice}>19,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://assets.pokemon.com/assets/cms2/img/cards/web/SM9/SM9_FR_1.png" alt="Display Pokémon Préco" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Display</div>
              <div className={styles.productName}>DISPLAY ÉPÉE & BOUCLIER – VOLTAGE ÉCLATANT</div>
              <div className={styles.productPrice}>149,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://www.onepiece-cardgame.com/images/products/romancedawn/romancedawn_box.png" alt="Display One Piece Préco" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Display</div>
              <div className={styles.productName}>DISPLAY ONE PIECE – ROMANCE DAWN</div>
              <div className={styles.productPrice}>129,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Best scellé */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2><span>BEST </span><span className={styles.highlight}>SCELLÉ</span></h2>
          <button className={styles.seeAllBtn}>Voir tout</button>
        </div>
        <div className={styles.cardRow}>
          <div className={styles.productCard}>
            <img src="https://assets.pokemon.com/assets/cms2/img/cards/web/SV1/SV1_FR_1.png" alt="Booster Pokémon 151" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Booster</div>
              <div className={styles.productName}>BOOSTER ÉCARLATE & VIOLET – 151</div>
              <div className={styles.productPrice}>6,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://www.onepiece-cardgame.com/images/products/paramountwar/paramountwar_pack.png" alt="Booster One Piece Paramount" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Booster</div>
              <div className={styles.productName}>BOOSTER ONE PIECE – PARAMOUNT WAR</div>
              <div className={styles.productPrice}>7,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://assets.pokemon.com/assets/cms2/img/cards/web/SV2/SV2_FR_1.png" alt="Elite Trainer Box Pokémon" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>Pokémon, Coffret</div>
              <div className={styles.productName}>ELITE TRAINER BOX ÉCARLATE & VIOLET</div>
              <div className={styles.productPrice}>59,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
          <div className={styles.productCard}>
            <img src="https://www.onepiece-cardgame.com/images/products/starterdeck/strawhatcrew.png" alt="Starter Deck One Piece" />
            <div className={styles.productInfo}>
              <div className={styles.productCategory}>One Piece, Starter Deck</div>
              <div className={styles.productName}>STARTER DECK ONE PIECE – STRAW HAT CREW</div>
              <div className={styles.productPrice}>19,00€</div>
              <button className={styles.addToCartBtn}>Ajouter au panier</button>
            </div>
          </div>
        </div>
      </section>
      <motion.section className={styles.advantages} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.5 }}>
        <h3>Pourquoi choisir PokéCard ?</h3>
        <div className={styles.advGrid}>
          {avantages.map((a) => (
            <div key={a.title} className={styles.advItem}>
              <span className={styles.advIcon}>{a.icon}</span>
              <span>{a.title}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
    
  );
} 