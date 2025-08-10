import { useContext, useState } from 'react';
import { CartContext } from './cartContext';
import styles from './CartPage.module.css';
import { createCheckoutSession } from './api';

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useContext(CartContext);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  async function handleCheckout() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const items = cart.map(i => ({ id: i.id, quantity: i.quantity }))
      const session = await createCheckoutSession(items, email || undefined)
      const url = (session as any).url
      if (url) {
        window.location.href = url
      } else {
        // Fallback: some providers return id only; usually Stripe returns url
        alert('Session de paiement créée, mais aucune URL retournée.')
      }
    } catch (e) {
      alert('Erreur lors de la création du paiement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.cartWrapper}>
      <h1>Votre panier</h1>
      {cart.length === 0 ? (
        <div className={styles.empty}>Votre panier est vide.</div>
      ) : (
        <>
          <div className={styles.cartList}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <img src={item.image} alt={item.name} />
                <div className={styles.info}>
                  <div className={styles.name}>{item.name}</div>
                  <div className={styles.price}>{item.price}€</div>
                  <div className={styles.qty}>
                    <label>Quantité :</label>
                    <input
                      type="number"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={e => updateQuantity(item.id, Math.max(1, Math.min(item.stock, Number(e.target.value))))}
                    />
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.checkoutBox}>
            <div className={styles.total}>Total : <b>{total}€</b></div>
            <input type="email" placeholder="Email (reçu)" value={email} onChange={e => setEmail(e.target.value)} />
            <button className={styles.validateBtn} onClick={handleCheckout} disabled={loading || cart.length === 0}>{loading ? 'Redirection...' : 'Payer avec carte'}</button>
            <button className={styles.secondaryBtn} onClick={clearCart}>Vider le panier</button>
          </div>
        </>
      )}
    </div>
  );
} 