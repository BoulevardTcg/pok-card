/**
 * @deprecated Ce composant est déprécié et remplacé par FeaturedCards.tsx
 * FeaturedCards offre un design orienté investissement avec grades et tendances de prix.
 * Ce fichier peut être supprimé lors du prochain nettoyage.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProducts } from '../../api';
import type { Product as ProductType } from '../../cartContext';
import styles from './LatestProductsCarousel.module.css';

export default function LatestProductsCarousel() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLatestProducts();
  }, []);

  async function loadLatestProducts() {
    setLoading(true);
    try {
      const response = (await listProducts({
        limit: 20,
      })) as { products: ProductType[] };

      // Filtrer les accessoires et prendre les 8 derniers
      const filtered = response.products.filter((p) => p.category !== 'Accessoires').slice(0, 8);

      setProducts(filtered);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (cents: number | null) => {
    if (!cents) return 'N/A';
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, products.length - 4);
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const maxIndex = Math.max(0, products.length - 4);
      return prev <= 0 ? maxIndex : prev - 1;
    });
  };

  const goToSlide = (index: number) => {
    const maxIndex = Math.max(0, products.length - 4);
    setCurrentIndex(Math.min(index, maxIndex));
  };

  if (loading) {
    return (
      <div className={styles.carouselSection}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Derniers articles</h2>
            <div className={styles.divider}></div>
          </div>
          <div className={styles.loading}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={styles.carouselSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Derniers articles</h2>
            <div className={styles.divider}></div>
            <p className={styles.description}>
              Découvrez nos dernières arrivées, sélectionnées avec soin pour votre collection
            </p>
          </div>
          <button onClick={() => navigate('/')} className={styles.seeAllButton}>
            Voir tout
            <span className={styles.arrow}>→</span>
          </button>
        </div>

        <div className={styles.carouselWrapper}>
          <button onClick={prevSlide} className={styles.navButton} aria-label="Précédent">
            ←
          </button>

          <div className={styles.carousel} ref={carouselRef}>
            <div
              className={styles.carouselTrack}
              style={{
                transform: `translateX(-${currentIndex * (100 / 4)}%)`,
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className={styles.productCard}
                  onClick={() => {
                    if (product.slug) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      navigate(`/produit/${product.slug}`);
                    }
                  }}
                >
                  <div className={styles.imageContainer}>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].altText || product.name}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.placeholderImage}>Pas d'image</div>
                    )}
                    {product.minPriceCents && product.originalPriceCents && (
                      <div className={styles.discountBadge}>
                        -
                        {Math.round(
                          ((product.originalPriceCents - product.minPriceCents) /
                            product.originalPriceCents) *
                            100
                        )}
                        %
                      </div>
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <div className={styles.productCategory}>{product.category}</div>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <div className={styles.productPrice}>
                      <span className={styles.currentPrice}>
                        {formatPrice(product.minPriceCents)}€
                      </span>
                      {product.originalPriceCents && (
                        <span className={styles.originalPrice}>
                          {formatPrice(product.originalPriceCents)}€
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextSlide} className={styles.navButton} aria-label="Suivant">
            →
          </button>
        </div>

        <div className={styles.dots}>
          {Array.from({ length: Math.ceil(products.length / 4) }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`${styles.dot} ${currentIndex === index ? styles.active : ''}`}
              aria-label={`Aller à la slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
