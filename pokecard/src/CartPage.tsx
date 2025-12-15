import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './cartContext';
import styles from './CartPage.module.css';
import { createCheckoutSession, getVariantsStock, validatePromoCode } from './api';
import type { CartItem } from './cartContext';

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalCents } = useContext(CartContext);
  const navigate = useNavigate();
  const totalCents = getTotalCents();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [cartItemsWithStock, setCartItemsWithStock] = useState<CartItem[]>(cart);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  // Rafraîchir le stock des articles du panier
  useEffect(() => {
    async function refreshStock() {
      if (cart.length === 0) {
        setCartItemsWithStock([]);
        setStockErrors({});
        return;
      }

      setRefreshingStock(true);
      try {
        const variantIds = cart.map(item => item.variantId);
        const stockMap = await getVariantsStock(variantIds);
        const errors: Record<string, string> = {};
        const updatedCart: CartItem[] = [];

        cart.forEach(item => {
          const currentStock = stockMap[item.variantId];
          
          if (!currentStock) {
            errors[item.variantId] = 'Ce produit n\'est plus disponible';
            return;
          }

          if (currentStock.stock <= 0) {
            errors[item.variantId] = 'Rupture de stock';
          } else if (currentStock.stock < item.quantity) {
            errors[item.variantId] = `Stock insuffisant (${currentStock.stock} disponible${currentStock.stock > 1 ? 's' : ''})`;
          }

          const updatedItem: CartItem = {
            ...item,
            stock: currentStock.stock,
            priceCents: currentStock.priceCents
          };
          
          updatedCart.push(updatedItem);
        });

        setCartItemsWithStock(updatedCart);
        setStockErrors(errors);
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du stock:', error);
        setCartItemsWithStock(cart);
      } finally {
        setRefreshingStock(false);
      }
    }

    refreshStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  async function handleCheckout() {
    if (cart.length === 0) return;
    
    if (Object.keys(stockErrors).length > 0) {
      const hasRupture = Object.values(stockErrors).some(msg => msg.includes('Rupture'));
      const hasInsuffisant = Object.values(stockErrors).some(msg => msg.includes('Stock insuffisant'));
      
      if (hasRupture) {
        setEmailError('Impossible de procéder au paiement : certains articles sont en rupture de stock.');
        return;
      }
      if (hasInsuffisant) {
        setEmailError('Les quantités ont été ajustées selon le stock disponible.');
        return;
      }
    }
    
    if (!email || !email.includes('@')) {
      setEmailError('Veuillez entrer une adresse email valide');
      return;
    }
    
    setEmailError('');
    setLoading(true);
    try {
      const items = cartItemsWithStock.map(item => ({
        variantId: item.variantId,
        quantity: Math.min(item.quantity, item.stock)
      })).filter(item => item.quantity > 0);
      
      if (items.length === 0) {
        setEmailError('Aucun article disponible dans votre panier.');
        setLoading(false);
        return;
      }
      
      const session = await createCheckoutSession(items, email || undefined, appliedPromo || undefined);
      const url = (session as any).url;
      
      if (url) {
        window.location.href = url;
      } else {
        setEmailError('Session de paiement créée, mais aucune URL retournée.');
        setLoading(false);
      }
    } catch (e: any) {
      console.error('Erreur checkout:', e);
      let errorMsg = 'Erreur lors de la création du paiement';
      
      if (e?.status === 409 || e?.message?.includes('Stock insuffisant')) {
        errorMsg = 'Stock insuffisant pour certains articles. Veuillez vérifier votre panier.';
      } else {
        errorMsg = e?.response?.data?.error || e?.message || errorMsg;
      }
      
      setEmailError(errorMsg);
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛒</div>
            <h2 className={styles.emptyTitle}>Votre panier est vide</h2>
            <p className={styles.emptyText}>Découvrez nos collections premium</p>
            <button
              onClick={() => navigate('/produits')}
              className={styles.emptyButton}
            >
              Explorer le catalogue
              <span className={styles.arrow}>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Panier</h1>

        {refreshingStock && (
          <div className={styles.refreshingStock}>
            🔄 Vérification du stock en cours...
          </div>
        )}

        <div className={styles.content}>
          {/* Liste des articles */}
          <div className={styles.itemsList}>
            {cartItemsWithStock.map(item => {
              const stockError = stockErrors[item.variantId];
              const isOutOfStock = item.stock <= 0;
              const hasInsufficientStock = item.stock < item.quantity;
              
              return (
                <div 
                  key={item.variantId} 
                  className={`${styles.cartItem} ${stockError ? styles.hasError : ''}`}
                >
                  {/* Image */}
                  <div className={styles.imageContainer}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className={styles.image} />
                    ) : (
                      <div className={styles.placeholderImage}>Pas d'image</div>
                    )}
                  </div>

                  {/* Détails */}
                  <div className={styles.details}>
                    <div className={styles.headerRow}>
                      <div>
                        <h3 className={styles.productName}>{item.productName}</h3>
                        {item.variantName !== 'Standard' && (
                          <p className={styles.variantName}>Variante : {item.variantName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className={styles.removeButton}
                        aria-label="Retirer du panier"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Quantité et prix */}
                    <div className={styles.quantityRow}>
                      <div className={styles.quantityControls}>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className={styles.quantityButton}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuer la quantité"
                        >
                          −
                        </button>
                        <span className={styles.quantityValue}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className={styles.quantityButton}
                          disabled={item.stock <= item.quantity}
                          aria-label="Augmenter la quantité"
                        >
                          +
                        </button>
                      </div>
                      <div className={styles.priceRow}>
                        <p className={styles.itemPrice}>
                          {formatPrice(item.priceCents * item.quantity)}€
                        </p>
                        {item.quantity > 1 && (
                          <p className={styles.unitPrice}>
                            {formatPrice(item.priceCents)}€ l'unité
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock info */}
                    <div className={styles.stockRow}>
                      <span className={`${styles.stockInfo} ${isOutOfStock ? styles.outOfStock : hasInsufficientStock ? styles.lowStock : ''}`}>
                        Stock : {item.stock > 0 ? `${item.stock} disponible${item.stock > 1 ? 's' : ''}` : 'Rupture'}
                      </span>
                      {stockError && (
                        <div className={styles.stockError}>
                          ⚠️ {stockError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résumé de commande */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Résumé</h2>
              
              <div className={styles.summaryDetails}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Sous-total</span>
                  <span className={styles.summaryValue}>{formatPrice(totalCents)}€</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Livraison</span>
                  <span className={`${styles.summaryValue} ${totalCents >= 5000 ? styles.free : ''}`}>
                    {totalCents >= 5000 ? 'Gratuite' : 'À calculer'}
                  </span>
                </div>
                {totalCents < 5000 && (
                  <p className={styles.freeShippingHint}>
                    Ajoutez {formatPrice(5000 - totalCents)}€ pour la livraison gratuite
                  </p>
                )}
                {promoDiscount > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Réduction</span>
                    <span className={styles.summaryValue} style={{ color: '#10b981' }}>
                      -{formatPrice(promoDiscount)}€
                    </span>
                  </div>
                )}
                <div className={styles.summaryTotal}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>
                    {formatPrice(Math.max(0, totalCents - promoDiscount))}€
                  </span>
                </div>
              </div>

              {/* Code promo */}
              <div className={styles.promoSection}>
                {appliedPromo ? (
                  <div className={styles.promoApplied}>
                    <span>Code appliqué: <strong>{appliedPromo}</strong></span>
                    <button
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoDiscount(0);
                        setPromoCode('');
                      }}
                      className={styles.removePromoButton}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className={styles.promoInputGroup}>
                    <input
                      type="text"
                      placeholder="Code promo"
                      value={promoCode}
                      onChange={e => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      className={`${styles.promoInput} ${promoError ? styles.hasError : ''}`}
                    />
                    <button
                      onClick={async () => {
                        if (!promoCode.trim()) {
                          setPromoError('Veuillez entrer un code promo');
                          return;
                        }
                        try {
                          const result = await validatePromoCode(promoCode, totalCents);
                          if (result.valid) {
                            setPromoDiscount(result.discountCents);
                            setAppliedPromo(promoCode);
                            setPromoError('');
                            // Note: le compteur d'utilisation est incrémenté côté backend lors du checkout
                          } else {
                            setPromoError('Code promo invalide');
                          }
                        } catch (err: any) {
                          setPromoError(err.message || 'Code promo invalide');
                        }
                      }}
                      className={styles.applyPromoButton}
                    >
                      Appliquer
                    </button>
                  </div>
                )}
                {promoError && (
                  <div className={styles.promoError}>{promoError}</div>
                )}
              </div>

              <div className={styles.emailSection}>
                <input
                  type="email"
                  placeholder="Email (pour la confirmation)"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`${styles.emailInput} ${emailError ? styles.hasError : ''}`}
                />
                {emailError && (
                  <div className={styles.emailError}>
                    {emailError}
                  </div>
                )}
              </div>

              <button
                className={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading ? '⏳ Redirection...' : '💳 Passer la commande'}
                <span className={styles.arrow}>→</span>
              </button>

              <button 
                className={styles.continueButton}
                onClick={() => navigate('/produits')}
              >
                Continuer les achats
              </button>

              <button 
                className={styles.clearButton}
                onClick={clearCart}
              >
                Vider le panier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
