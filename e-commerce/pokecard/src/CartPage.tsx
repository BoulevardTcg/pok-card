import { useContext, useState, useEffect } from 'react';
import { CartContext } from './cartContext';
import styles from './CartPage.module.css';
import { createCheckoutSession, getVariantsStock } from './api';
import type { CartItem } from './cartContext';

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalCents } = useContext(CartContext);
  const totalCents = getTotalCents();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [cartItemsWithStock, setCartItemsWithStock] = useState<CartItem[]>(cart);

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
            // Variant n'existe plus
            errors[item.variantId] = 'Ce produit n\'est plus disponible';
            return;
          }

          if (currentStock.stock <= 0) {
            errors[item.variantId] = 'Rupture de stock';
          } else if (currentStock.stock < item.quantity) {
            errors[item.variantId] = `Stock insuffisant (${currentStock.stock} disponible${currentStock.stock > 1 ? 's' : ''})`;
          }

          // Mettre à jour le stock et le prix dans le panier
          // On garde la quantité actuelle mais on affiche le stock réel
          const updatedItem: CartItem = {
            ...item,
            stock: currentStock.stock,
            priceCents: currentStock.priceCents
            // On garde item.quantity même si elle est supérieure au stock
            // L'utilisateur devra l'ajuster manuellement ou on l'ajustera avant le checkout
          };
          
          updatedCart.push(updatedItem);
        });

        setCartItemsWithStock(updatedCart);
        setStockErrors(errors);
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du stock:', error);
        // En cas d'erreur, utiliser le panier actuel
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
    
    // Vérifier s'il y a des erreurs de stock
    if (Object.keys(stockErrors).length > 0) {
      const hasRupture = Object.values(stockErrors).some(msg => msg.includes('Rupture'));
      const hasInsuffisant = Object.values(stockErrors).some(msg => msg.includes('Stock insuffisant'));
      
      if (hasRupture) {
        setEmailError('Impossible de procéder au paiement : certains articles sont en rupture de stock. Veuillez les retirer de votre panier.');
        return;
      }
      if (hasInsuffisant) {
        setEmailError('Les quantités ont été ajustées selon le stock disponible. Veuillez vérifier votre panier.');
        return;
      }
    }
    
    // Validation de l'email
    if (!email || !email.includes('@')) {
      setEmailError('Veuillez entrer une adresse email valide');
      return;
    }
    
    setEmailError('');
    setLoading(true);
    try {
      // Ajuster les quantités selon le stock disponible avant le checkout
      const items = cartItemsWithStock.map(item => ({
        variantId: item.variantId,
        quantity: Math.min(item.quantity, item.stock) // Ne pas dépasser le stock disponible
      })).filter(item => item.quantity > 0); // Retirer les articles en rupture de stock
      
      if (items.length === 0) {
        setEmailError('Aucun article disponible dans votre panier. Veuillez vérifier le stock.');
        setLoading(false);
        return;
      }
      
      const session = await createCheckoutSession(items, email || undefined);
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
      
      // Gérer les erreurs de stock spécifiques
      if (e?.status === 409 || e?.message?.includes('Stock insuffisant') || e?.message?.includes('OUT_OF_STOCK')) {
        errorMsg = 'Stock insuffisant pour certains articles. Veuillez vérifier votre panier et réessayer.';
        // Rafraîchir le stock après une erreur
        const variantIds = cart.map(item => item.variantId);
        const stockMap = await getVariantsStock(variantIds);
        const errors: Record<string, string> = {};
        
        cart.forEach(item => {
          const currentStock = stockMap[item.variantId];
          if (!currentStock || currentStock.stock <= 0) {
            errors[item.variantId] = 'Rupture de stock';
          } else if (currentStock.stock < item.quantity) {
            errors[item.variantId] = `Stock insuffisant (${currentStock.stock} disponible${currentStock.stock > 1 ? 's' : ''})`;
            updateQuantity(item.variantId, currentStock.stock);
          }
        });
        setStockErrors(errors);
      } else {
        errorMsg = e?.response?.data?.error || e?.message || errorMsg;
      }
      
      setEmailError(errorMsg);
      setLoading(false);
    }
  }

  return (
    <div className={styles.cartWrapper}>
      <h1>Votre panier</h1>
      {cart.length === 0 ? (
        <div className={styles.empty}>Votre panier est vide.</div>
      ) : (
        <>
          {refreshingStock && (
            <div className={styles.refreshingStock}>
              🔄 Vérification du stock en cours...
            </div>
          )}
          <div className={styles.cartList}>
            {cartItemsWithStock.map(item => {
              const stockError = stockErrors[item.variantId];
              const isOutOfStock = item.stock <= 0;
              const hasInsufficientStock = item.stock < item.quantity;
              
              return (
                <div 
                  key={item.variantId} 
                  className={styles.cartItem}
                  style={{
                    borderColor: stockError ? 'rgba(239, 68, 68, 0.5)' : undefined,
                    background: stockError ? 'rgba(239, 68, 68, 0.05)' : undefined
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} />
                  ) : (
                    <div className={styles.placeholderImage}>Pas d'image</div>
                  )}
                  <div className={styles.info}>
                    <div className={styles.name}>{item.productName}</div>
                    {item.variantName !== 'Standard' && (
                      <div className={styles.variantName}>Variante : {item.variantName}</div>
                    )}
                    <div className={styles.price}>{formatPrice(item.priceCents)}€</div>
                    <div className={styles.qty}>
                      <label>Quantité :</label>
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={e => updateQuantity(item.variantId, Math.max(1, Math.min(item.stock, Number(e.target.value))))}
                        disabled={isOutOfStock}
                      />
                      <span 
                        className={styles.stockInfo}
                        style={{
                          color: isOutOfStock ? '#ef4444' : hasInsufficientStock ? '#f59e0b' : undefined,
                          fontWeight: stockError ? 600 : undefined
                        }}
                      >
                        Stock disponible : {item.stock > 0 ? item.stock : 'Rupture'}
                      </span>
                      {stockError && (
                        <div className={styles.stockError}>
                          ⚠️ {stockError}
                        </div>
                      )}
                    </div>
                    <div className={styles.itemTotal}>
                      Sous-total : {formatPrice(item.priceCents * item.quantity)}€
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeFromCart(item.variantId)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.checkoutBox}>
            <div className={styles.total}>
              Total TTC : <b>{formatPrice(totalCents)}€</b>
            </div>
            <div>
              <input
                type="email"
                placeholder="Email (pour la confirmation de commande)"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                className={styles.emailInput}
                style={{
                  borderColor: emailError ? 'rgba(239, 68, 68, 0.5)' : undefined
                }}
              />
              {emailError && (
                <div className={styles.emailError}>
                  {emailError}
                </div>
              )}
            </div>
            <button
              className={styles.validateBtn}
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
            >
              {loading ? '⏳ Redirection vers le paiement...' : '💳 Procéder au paiement'}
            </button>
            <button className={styles.secondaryBtn} onClick={clearCart}>
              Vider le panier
            </button>
          </div>
        </>
      )}
    </div>
  );
}
