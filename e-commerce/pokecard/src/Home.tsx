import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';
import Footer from './Footer';
import { listProducts } from './api';
import type { Product } from './cartContext';

interface HomeProps {
  search: string;
}

export function Home({ search }: HomeProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Charger les produits depuis l'API
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const response = await listProducts({ limit: 12 }) as { products: Product[] };
        setProducts(response.products);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    
    // Simuler un appel API
    setTimeout(() => {
      alert('Inscription réussie ! Vous recevrez bientôt votre code de réduction de 10%.');
      setEmail('');
      setIsLoading(false);
    }, 1000);
  };

  // Fonction pour filtrer les produits selon la recherche
  const filterProducts = (products: Product[]) => {
    if (!search) return products;
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return 'Prix sur demande';
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const filteredProducts = filterProducts(products);

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section - Simplifiée */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              ⭐ Collection Premium
            </div>
            
            <h1 className={styles.heroTitle}>
              L'univers des{" "}
              <span className={styles.heroHighlight}>cartes TCG</span>
              <br />
              de collection
            </h1>
            
            <p className={styles.heroDescription}>
              Découvrez notre sélection premium de cartes Pokémon, One Piece, 
              Dragon Ball et bien plus. Authentiques, certifiées et livrées avec soin.
            </p>

            {/* Features */}
            <div className={styles.heroFeatures}>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>🛡️</div>
                <span>Cartes authentiques</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>⚡</div>
                <span>Livraison rapide</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>⭐</div>
                <span>Garantie qualité</span>
              </div>
            </div>

            {/* CTAs */}
            <div className={styles.heroCTAs}>
              <button 
                className={styles.heroCTA}
                onClick={() => navigate('/produits')}
              >
                Explorer le catalogue
                <span className={styles.ctaArrow}>→</span>
              </button>
            </div>

            {/* Stats */}
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>{products.length}+</div>
                <div className={styles.statLabel}>Produits disponibles</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>98%</div>
                <div className={styles.statLabel}>Clients satisfaits</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>24h</div>
                <div className={styles.statLabel}>Livraison express</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Produits - Basée sur les données de la base */}
      {!loadingProducts && filteredProducts.length > 0 && (
        <section className={styles.productsSection}>
          <div className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionBadge}>
                  🔥 Nos Produits
                </div>
                <h2 className={styles.sectionHeading}>
                  Découvrez notre collection
                </h2>
                <p className={styles.sectionDescription}>
                  Une sélection de produits authentiques et certifiés pour votre collection.
                </p>
              </div>
              
              <button 
                className={styles.seeAllButton}
                onClick={() => navigate('/produits')}
              >
                Voir tous les produits
                <span className={styles.buttonArrow}>→</span>
              </button>
            </div>

            <div className={styles.productsGrid}>
              {filteredProducts.slice(0, 8).map((product) => (
                <div 
                  key={product.id} 
                  className={styles.productCard}
                  onClick={() => product.slug && navigate(`/produit/${product.slug}`)}
                >
                  <div className={styles.productImageContainer}>
                    {product.image ? (
                      <img 
                        src={product.image.url} 
                        alt={product.image.altText || product.name} 
                        className={styles.productImage}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.placeholderImage}>Pas d'image</div>
                    )}
                    {product.outOfStock && (
                      <div className={styles.outOfStockBadge}>Rupture de stock</div>
                    )}
                  </div>
                  
                  <div className={styles.productInfo}>
                    <div className={styles.productCategory}>{product.category}</div>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.description && (
                      <p className={styles.productDescription}>
                        {product.description.length > 80 
                          ? product.description.substring(0, 80) + '...' 
                          : product.description}
                      </p>
                    )}
                    <div className={styles.productPrice}>
                      {product.minPriceCents !== null && (
                        <span className={styles.currentPrice}>
                          À partir de {formatPrice(product.minPriceCents)}€
                        </span>
                      )}
                    </div>
                    <button 
                      className={styles.addToCartButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.slug) {
                          navigate(`/produit/${product.slug}`);
                        }
                      }}
                      disabled={product.outOfStock}
                    >
                      {product.outOfStock ? 'Rupture de stock' : 'Voir le produit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Section - Simplifiée */}
      <section className={styles.newsletterSection}>
        <div className={styles.newsletterContainer}>
          <div className={styles.newsletterContent}>
            <div className={styles.newsletterHeader}>
              <div className={styles.newsletterBadge}>🎁 Offre exclusive</div>
              
              <h2 className={styles.newsletterTitle}>
                Ne ratez aucune{" "}
                <span className={styles.newsletterHighlight}>nouveauté</span>
              </h2>
              
              <p className={styles.newsletterDescription}>
                Inscrivez-vous à notre newsletter et recevez un code de réduction de 10% 
                ainsi que les dernières actualités TCG en avant-première.
              </p>
            </div>

            {/* Newsletter form */}
            <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.newsletterInput}
                required
              />
              <button 
                type="submit" 
                className={styles.newsletterButton}
                disabled={isLoading}
              >
                {isLoading ? "Inscription..." : "S'inscrire"}
              </button>
            </form>

            <p className={styles.newsletterDisclaimer}>
              En vous inscrivant, vous acceptez de recevoir nos emails marketing. 
              Vous pouvez vous désabonner à tout moment.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
